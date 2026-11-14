/* ============================================================
   Soumil Deopuria — portfolio arcade
   Three hand-written canvas games: retro race, snake, breakout.
   No libraries. Best scores last for the visit and reset on reload.
   ============================================================ */
(function () {
  "use strict";

  var W = 480;
  var H = 360;
  var C = {
    ink: "#111114",
    paper: "#fffcf3",
    orange: "#ff7a33",
    blue: "#2f7bf5",
    yellow: "#ffc83d",
    mint: "#9defc9",
    steel: "#b9d1e8"
  };

  var activeStop = null;

  /* High scores are per page load: refreshing the page starts every game
     from zero, and nothing is written to storage. */
  function readBest() {
    return 0;
  }

  function writeBest() {}

  function roundRect(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function setupCanvas(cv) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * dpr;
    cv.height = H * dpr;
    var ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function showOverlay(root, title, text, label) {
    var ov = root.querySelector(".game-overlay");
    ov.querySelector("h3").textContent = title;
    ov.querySelector("p").textContent = text;
    ov.querySelector(".game-btn").textContent = label;
    ov.classList.remove("is-hidden");
  }

  function hideOverlay(root) {
    root.querySelector(".game-overlay").classList.add("is-hidden");
  }

  function wirePads(root, keys) {
    Array.prototype.forEach.call(root.querySelectorAll("[data-dir]"), function (btn) {
      var dir = btn.getAttribute("data-dir");
      var down = function (e) {
        if (e.cancelable) e.preventDefault();
        keys[dir] = true;
        btn.classList.add("is-down");
      };
      var up = function () {
        keys[dir] = false;
        btn.classList.remove("is-down");
      };
      btn.addEventListener("pointerdown", down);
      btn.addEventListener("pointerup", up);
      btn.addEventListener("pointerleave", up);
      btn.addEventListener("pointercancel", up);
    });
  }

  function bindKeys(keys, map) {
    var onDown = function (e) {
      var dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      keys[dir] = true;
    };
    var onUp = function (e) {
      var dir = map[e.key];
      if (dir) keys[dir] = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return function () {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      keys.left = keys.right = keys.up = keys.down = false;
    };
  }

  /* ------------------------------------------------------------------ *
   * 1. Retro Race — weave through traffic, distance is the score
   * ------------------------------------------------------------------ */

  function createRace(root) {
    var cv = root.querySelector(".game-canvas");
    var ctx = setupCanvas(cv);
    var scoreEl = root.querySelector("[data-score]");
    var bestEl = root.querySelector("[data-best]");
    var startBtn = root.querySelector(".game-btn");

    var ROAD_X = 112;
    var ROAD_W = 256;
    var LANE = 64;
    var KEYMAP = {
      ArrowLeft: "left", a: "left", A: "left",
      ArrowRight: "right", d: "right", D: "right"
    };

    var best = readBest("race");
    bestEl.textContent = best;

    var car, foes, dist, speed, spawnIn, dash, running, raf, last, over, keys, detach;

    keys = { left: false, right: false };

    function reset() {
      car = { x: W / 2 - 22, y: H - 96, w: 44, h: 72 };
      foes = [];
      dist = 0;
      speed = 240;
      spawnIn = 0.7;
      dash = 0;
      over = false;
      scoreEl.textContent = "0";
    }

    function carShape(x, y, w, h, color) {
      roundRect(ctx, x, y, w, h, 10);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.ink;
      ctx.stroke();

      roundRect(ctx, x + 7, y + 13, w - 14, 17, 5);
      ctx.fillStyle = "rgba(17,17,20,0.78)";
      ctx.fill();

      roundRect(ctx, x + 7, y + h - 26, w - 14, 13, 4);
      ctx.fillStyle = "rgba(17,17,20,0.32)";
      ctx.fill();
    }

    function draw() {
      ctx.fillStyle = "#123b2b";
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "#0d2b20";
      for (var r = -60 + dash; r < H; r += 80) {
        ctx.fillRect(ROAD_X - 28, r, 10, 46);
        ctx.fillRect(ROAD_X + ROAD_W + 18, r, 10, 46);
      }

      ctx.fillStyle = "#242430";
      ctx.fillRect(ROAD_X, 0, ROAD_W, H);

      ctx.fillStyle = C.paper;
      ctx.fillRect(ROAD_X - 4, 0, 4, H);
      ctx.fillRect(ROAD_X + ROAD_W, 0, 4, H);

      ctx.fillStyle = "rgba(255,252,243,0.72)";
      for (var i = 1; i < 4; i++) {
        var lx = ROAD_X + i * LANE - 2;
        for (var y = -60 + dash; y < H; y += 80) ctx.fillRect(lx, y, 4, 42);
      }

      for (var f = 0; f < foes.length; f++) {
        carShape(foes[f].x, foes[f].y, foes[f].w, foes[f].h, foes[f].color);
      }
      carShape(car.x, car.y, car.w, car.h, C.blue);
    }

    function overlaps(a, b) {
      return (
        a.x + 6 < b.x + b.w - 6 &&
        a.x + a.w - 6 > b.x + 6 &&
        a.y + 6 < b.y + b.h - 6 &&
        a.y + a.h - 6 > b.y + 6
      );
    }

    function update(dt) {
      speed = 240 + Math.min(320, dist / 26);
      dist += speed * dt * 0.13;
      dash = (dash + speed * dt * 0.32) % 80;

      if (keys.left) car.x -= 330 * dt;
      if (keys.right) car.x += 330 * dt;
      car.x = Math.max(ROAD_X + 4, Math.min(ROAD_X + ROAD_W - car.w - 4, car.x));

      spawnIn -= dt;
      if (spawnIn <= 0) {
        spawnIn = Math.max(0.34, 0.92 - dist / 900);
        var lane = Math.floor(Math.random() * 4);
        foes.push({
          x: ROAD_X + lane * LANE + (LANE - 44) / 2,
          y: -84,
          w: 44,
          h: 72,
          color: [C.orange, C.yellow, C.mint, C.steel][Math.floor(Math.random() * 4)],
          vy: speed * (0.5 + Math.random() * 0.3)
        });
      }

      for (var i = foes.length - 1; i >= 0; i--) {
        var f = foes[i];
        f.y += f.vy * dt;
        if (f.y > H + 90) {
          foes.splice(i, 1);
        } else if (overlaps(car, f)) {
          return crash();
        }
      }

      scoreEl.textContent = String(Math.floor(dist));
    }

    function loop(t) {
      if (!running) return;
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      update(dt);
      if (over) return;
      draw();
      raf = requestAnimationFrame(loop);
    }

    function detachNow() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (detach) {
        detach();
        detach = null;
      }
      if (activeStop === stop) activeStop = null;
    }

    function crash() {
      over = true;
      running = false;
      var score = Math.floor(dist);
      if (score > best) {
        best = score;
        writeBest("race", best);
        bestEl.textContent = best;
      }
      detachNow();
      showOverlay(root, "Crashed", "You covered " + score + " m this run.", "Race again");
    }

    function stop() {
      running = false;
      detachNow();
    }

    function start() {
      if (activeStop) activeStop();
      reset();
      hideOverlay(root);
      running = true;
      last = 0;
      detach = bindKeys(keys, KEYMAP);
      activeStop = stop;
      raf = requestAnimationFrame(loop);
    }

    wirePads(root, keys);
    startBtn.addEventListener("click", start);
    reset();
    draw();
    return { start: start };
  }

  /* ------------------------------------------------------------------ *
   * 2. Snake — eat apples, keep growing
   * ------------------------------------------------------------------ */

  function createSnake(root) {
    var cv = root.querySelector(".game-canvas");
    var ctx = setupCanvas(cv);
    var scoreEl = root.querySelector("[data-score]");
    var bestEl = root.querySelector("[data-best]");
    var startBtn = root.querySelector(".game-btn");

    var CELL = 24;
    var COLS = 20;
    var ROWS = 15;

    var DIRS = {
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 }
    };

    var best = readBest("snake");
    bestEl.textContent = best;

    var snake, dir, queued, apple, eaten, running, raf, last, acc, step, over, onKey, keys;

    keys = {};

    function reset() {
      snake = [
        { x: 9, y: 7 },
        { x: 8, y: 7 },
        { x: 7, y: 7 }
      ];
      dir = { x: 1, y: 0 };
      queued = [];
      eaten = 0;
      acc = 0;
      step = 0.15;
      over = false;
      scoreEl.textContent = "0";
      placeApple();
    }

    function placeApple() {
      var free = [];
      for (var x = 0; x < COLS; x++) {
        for (var y = 0; y < ROWS; y++) {
          var taken = snake.some(function (s) {
            return s.x === x && s.y === y;
          });
          if (!taken) free.push({ x: x, y: y });
        }
      }
      apple = free.length ? free[Math.floor(Math.random() * free.length)] : null;
    }

    function turn(name) {
      var d = DIRS[name];
      if (!d) return;
      var ref = queued.length ? queued[queued.length - 1] : dir;
      if (d.x === -ref.x && d.y === -ref.y) return;
      if (d.x === ref.x && d.y === ref.y) return;
      if (queued.length < 2) queued.push(d);
    }

    function draw() {
      ctx.fillStyle = "#14141a";
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "rgba(255,252,243,0.05)";
      for (var gx = 0; gx < COLS; gx++) {
        for (var gy = 0; gy < ROWS; gy++) {
          if ((gx + gy) % 2 === 0) ctx.fillRect(gx * CELL, gy * CELL, CELL, CELL);
        }
      }

      if (apple) {
        var ax = apple.x * CELL + CELL / 2;
        var ay = apple.y * CELL + CELL / 2;
        ctx.beginPath();
        ctx.arc(ax, ay, CELL * 0.34, 0, Math.PI * 2);
        ctx.fillStyle = C.orange;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = C.ink;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ax, ay - CELL * 0.34);
        ctx.lineTo(ax + 4, ay - CELL * 0.58);
        ctx.strokeStyle = C.mint;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      for (var i = snake.length - 1; i >= 0; i--) {
        var s = snake[i];
        roundRect(ctx, s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4, 7);
        ctx.fillStyle = i === 0 ? C.blue : i % 2 ? C.steel : C.mint;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = C.ink;
        ctx.stroke();
        if (i === 0) {
          ctx.fillStyle = C.paper;
          var ex = s.x * CELL + 2;
          var ey = s.y * CELL + 2;
          ctx.fillRect(ex + 5, ey + 6, 4, 4);
          ctx.fillRect(ex + CELL - 12, ey + 6, 4, 4);
        }
      }
    }

    function end() {
      over = true;
      running = false;
      var score = eaten * 10;
      if (score > best) {
        best = score;
        writeBest("snake", best);
        bestEl.textContent = best;
      }
      detachNow();
      showOverlay(root, "Game over", eaten + " apples eaten · " + score + " points.", "Play again");
    }

    function advance() {
      if (queued.length) dir = queued.shift();
      var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

      if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) return end();
      for (var i = 0; i < snake.length - 1; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) return end();
      }

      snake.unshift(head);
      if (apple && head.x === apple.x && head.y === apple.y) {
        eaten += 1;
        scoreEl.textContent = String(eaten * 10);
        step = Math.max(0.075, 0.15 - eaten * 0.003);
        placeApple();
      } else {
        snake.pop();
      }
    }

    function loop(t) {
      if (!running) return;
      var dt = last ? Math.min(0.1, (t - last) / 1000) : 0;
      last = t;
      acc += dt;
      while (acc >= step && !over) {
        acc -= step;
        advance();
      }
      if (over) return;
      draw();
      raf = requestAnimationFrame(loop);
    }

    function detachNow() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (onKey) {
        window.removeEventListener("keydown", onKey);
        onKey = null;
      }
      if (keys) wireKeysReset();
      if (activeStop === stop) activeStop = null;
    }

    function wireKeysReset() {
      ["left", "right", "up", "down"].forEach(function (k) {
        keys[k] = false;
      });
    }

    function keyName(key) {
      var map = {
        ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
        a: "left", d: "right", w: "up", s: "down",
        A: "left", D: "right", W: "up", S: "down"
      };
      return map[key] || null;
    }

    function stop() {
      running = false;
      detachNow();
    }

    function start() {
      if (activeStop) activeStop();
      reset();
      hideOverlay(root);
      running = true;
      last = 0;
      onKey = function (e) {
        var name = keyName(e.key);
        if (!name) return;
        e.preventDefault();
        turn(name);
      };
      window.addEventListener("keydown", onKey);
      activeStop = stop;
      raf = requestAnimationFrame(loop);
    }

    Array.prototype.forEach.call(root.querySelectorAll("[data-dir]"), function (btn) {
      btn.addEventListener("pointerdown", function (e) {
        if (e.cancelable) e.preventDefault();
        turn(btn.getAttribute("data-dir"));
      });
    });

    startBtn.addEventListener("click", start);
    reset();
    draw();
    return { start: start };
  }

  /* ------------------------------------------------------------------ *
   * 3. Brick Basher — breakout
   * ------------------------------------------------------------------ */

  function createBreakout(root) {
    var cv = root.querySelector(".game-canvas");
    var ctx = setupCanvas(cv);
    var scoreEl = root.querySelector("[data-score]");
    var bestEl = root.querySelector("[data-best]");
    var livesEl = root.querySelector("[data-lives]");
    var startBtn = root.querySelector(".game-btn");

    var KEYMAP = {
      ArrowLeft: "left", a: "left", A: "left",
      ArrowRight: "right", d: "right", D: "right"
    };

    var best = readBest("brick");
    bestEl.textContent = best;

    var paddle, ball, bricks, score, lives, level, running, raf, last, over, keys, detach, pointer;

    keys = { left: false, right: false };

    var ROWS = 4;
    var COLS = 8;
    var BW = 49;
    var BH = 16;
    var GAP = 6;
    var START_X = 23;
    var START_Y = 48;

    function buildBricks() {
      bricks = [];
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          bricks.push({
            x: START_X + c * (BW + GAP),
            y: START_Y + r * (BH + 7),
            row: r,
            alive: true
          });
        }
      }
    }

    function launch() {
      var angle = (-Math.PI / 2) + (Math.random() * 0.7 - 0.35);
      var sp = 260 + (level - 1) * 26;
      ball.x = paddle.x + paddle.w / 2;
      ball.y = paddle.y - 12;
      ball.vx = Math.cos(angle) * sp * 0.72;
      ball.vy = Math.sin(angle) * sp;
    }

    function resetBall() {
      paddle.x = W / 2 - paddle.w / 2;
      launch();
    }

    function reset() {
      paddle = { x: W / 2 - 42, y: H - 34, w: 84, h: 12 };
      ball = { x: W / 2, y: H - 60, vx: 0, vy: 0, r: 7 };
      score = 0;
      lives = 3;
      level = 1;
      over = false;
      buildBricks();
      resetBall();
      updateHud();
    }

    function updateHud() {
      scoreEl.textContent = String(score);
      if (livesEl) livesEl.textContent = String(lives);
    }

    function draw() {
      ctx.fillStyle = "#14141a";
      ctx.fillRect(0, 0, W, H);

      var colors = [C.yellow, C.orange, C.mint, C.blue];
      for (var i = 0; i < bricks.length; i++) {
        var b = bricks[i];
        if (!b.alive) continue;
        roundRect(ctx, b.x, b.y, BW, BH, 4);
        ctx.fillStyle = colors[b.row % colors.length];
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = C.ink;
        ctx.stroke();
      }

      roundRect(ctx, paddle.x, paddle.y, paddle.w, paddle.h, 6);
      ctx.fillStyle = C.paper;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = C.ink;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fillStyle = C.yellow;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = C.ink;
      ctx.stroke();
    }

    function update(dt) {
      if (keys.left) paddle.x -= 380 * dt;
      if (keys.right) paddle.x += 380 * dt;
      paddle.x = Math.max(6, Math.min(W - paddle.w - 6, paddle.x));

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x - ball.r < 6) {
        ball.x = 6 + ball.r;
        ball.vx *= -1;
      } else if (ball.x + ball.r > W - 6) {
        ball.x = W - 6 - ball.r;
        ball.vx *= -1;
      }
      if (ball.y - ball.r < 6) {
        ball.y = 6 + ball.r;
        ball.vy *= -1;
      }

      if (
        ball.vy > 0 &&
        ball.y + ball.r >= paddle.y &&
        ball.y - ball.r <= paddle.y + paddle.h &&
        ball.x >= paddle.x - 4 &&
        ball.x <= paddle.x + paddle.w + 4
      ) {
        var hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
        var sp = Math.min(460, Math.hypot(ball.vx, ball.vy) + 6);
        var angle = hit * 1.05;
        ball.y = paddle.y - ball.r - 1;
        ball.vx = Math.sin(angle) * sp;
        ball.vy = -Math.abs(Math.cos(angle) * sp);
      }

      for (var i = 0; i < bricks.length; i++) {
        var b = bricks[i];
        if (!b.alive) continue;
        if (
          ball.x + ball.r > b.x &&
          ball.x - ball.r < b.x + BW &&
          ball.y + ball.r > b.y &&
          ball.y - ball.r < b.y + BH
        ) {
          b.alive = false;
          score += 10;
          updateHud();
          if (Math.abs(ball.vy) > Math.abs(ball.vx)) {
            ball.vy *= -1;
          } else {
            ball.vx *= -1;
          }
          break;
        }
      }

      if (bricks.every(function (b) { return !b.alive; })) {
        level += 1;
        buildBricks();
        resetBall();
        return;
      }

      if (ball.y - ball.r > H) {
        lives -= 1;
        updateHud();
        if (lives <= 0) return end();
        resetBall();
      }
    }

    function end() {
      over = true;
      running = false;
      if (score > best) {
        best = score;
        writeBest("brick", best);
        bestEl.textContent = best;
      }
      detachNow();
      showOverlay(root, "Game over", score + " points · level " + level + ".", "Play again");
    }

    function loop(t) {
      if (!running) return;
      var dt = last ? Math.min(0.045, (t - last) / 1000) : 0;
      last = t;
      update(dt);
      if (over) return;
      draw();
      raf = requestAnimationFrame(loop);
    }

    function detachNow() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (detach) {
        detach();
        detach = null;
      }
      if (pointer) {
        cv.removeEventListener("pointermove", pointer);
        pointer = null;
      }
      if (activeStop === stop) activeStop = null;
    }

    function stop() {
      running = false;
      detachNow();
    }

    function start() {
      if (activeStop) activeStop();
      reset();
      hideOverlay(root);
      running = true;
      last = 0;
      detach = bindKeys(keys, KEYMAP);
      pointer = function (e) {
        var rect = cv.getBoundingClientRect();
        var x = ((e.clientX - rect.left) / rect.width) * W;
        paddle.x = Math.max(6, Math.min(W - paddle.w - 6, x - paddle.w / 2));
        if (!running) draw();
      };
      cv.addEventListener("pointermove", pointer);
      activeStop = stop;
      raf = requestAnimationFrame(loop);
    }

    wirePads(root, keys);
    startBtn.addEventListener("click", start);
    reset();
    draw();
    return { start: start };
  }

  /* ------------------------------------------------------------------ */

  var games = [
    { root: document.querySelector('[data-game="race"]'), make: createRace },
    { root: document.querySelector('[data-game="snake"]'), make: createSnake },
    { root: document.querySelector('[data-game="brick"]'), make: createBreakout }
  ];

  games.forEach(function (g) {
    if (g.root) g.make(g.root);
  });
})();
