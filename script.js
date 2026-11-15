/* Interactions: theme toggle, mobile menu, active nav, scroll reveal. */
(function () {
  "use strict";

  var root = document.documentElement;
  var toggle = document.getElementById("themeToggle");
  var menuBtn = document.getElementById("menuBtn");
  var navLinks = document.getElementById("navLinks");

  /* ---- theme ---- */
  function syncToggle() {
    if (!toggle) return;
    var dark = root.dataset.theme === "dark";
    toggle.setAttribute("aria-pressed", String(dark));
    toggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#141419" : "#ffc83d");
  }
  syncToggle();

  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("sd-theme", next); } catch (e) {}
      syncToggle();
    });
  }

  /* ---- mobile menu ---- */
  function closeMenu() {
    if (!navLinks || !menuBtn) return;
    navLinks.classList.remove("is-open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-label", "Open menu");
  }

  if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", function () {
      var open = navLinks.classList.toggle("is-open");
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    navLinks.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });

    document.addEventListener("click", function (e) {
      if (!navLinks.classList.contains("is-open")) return;
      if (e.target.closest(".nav")) return;
      closeMenu();
    });
  }

  /* ---- active nav link ---- */
  var sections = ["projects", "certifications", "know-me", "connect"]
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  var links = Array.prototype.slice.call(document.querySelectorAll(".nav-links a"));

  if ("IntersectionObserver" in window && sections.length) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (link) {
          var active = link.getAttribute("href") === "#" + entry.target.id;
          link.classList.toggle("is-active", active);
          if (active) link.setAttribute("aria-current", "true");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    sections.forEach(function (s) { navObserver.observe(s); });
  }

  // Keep the nav unhighlighted while the hero is on screen.
  function clearNavOnHero() {
    if (window.scrollY > 240) return;
    links.forEach(function (link) {
      link.classList.remove("is-active");
      link.removeAttribute("aria-current");
    });
  }
  window.addEventListener("scroll", clearNavOnHero, { passive: true });
  clearNavOnHero();

  /* ---- reveal on scroll ---- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  if ("IntersectionObserver" in window &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var siblings = Array.prototype.slice.call(el.parentElement.children);
        var index = Math.max(0, siblings.indexOf(el) % 6);
        el.style.transitionDelay = (index * 70) + "ms";
        el.classList.add("is-visible");
        obs.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    revealEls.forEach(function (el) {
      // Anything already on screen appears immediately; only animate what scrolls in.
      if (el.getBoundingClientRect().top < window.innerHeight) {
        el.classList.add("is-visible");
      } else {
        revealObserver.observe(el);
      }
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }


  /* ---- learning path rail (Know me) ---- */
  (function initTrail() {
    var rail = document.querySelector(".trail");
    if (!rail) return;

    var tabs = Array.prototype.slice.call(rail.querySelectorAll(".trail-step"));
    var fill = rail.querySelector(".trail-fill");
    var panel = rail.querySelector(".trail-panel");
    if (!tabs.length || !fill || !panel) return;

    var labelEl = panel.querySelector("[data-panel-label]");
    var bodyEl = panel.querySelector("[data-panel-body]");
    var chipsEl = panel.querySelector("[data-panel-chips]");
    var linkEl = panel.querySelector("[data-panel-link]");
    var active = 0;

    var DATA = [
      {
        label: "01 / school",
        body: "Ryan International School in Greater Noida for the 10th, then Jai Hind Public School in New Delhi for the 12th.",
        chips: ["Greater Noida", "New Delhi"],
        link: null
      },
      {
        label: "02 / degree",
        body: "B.Tech in Computer Science & Engineering at Dr. A.P.J. Abdul Kalam Technical University, Lucknow — still in progress.",
        chips: ["CSE", "Lucknow", "In progress"],
        link: null
      },
      {
        label: "03 / self-taught",
        body: "Python, TensorFlow, PyTorch and Scikit-learn, learned outside the syllabus: data preprocessing, feature engineering, honest model comparison and evaluation.",
        chips: ["Python", "TensorFlow", "PyTorch", "Scikit-learn", "Pandas"],
        link: { href: "#toolbox", text: "Open the toolbox" }
      },
      {
        label: "04 / credentials",
        body: "Nineteen certificates across cloud, security, GenAI, ML and data — Coforge, Microsoft and the Raspberry Pi Foundation. Every one is on file as a PDF.",
        chips: ["Cloud", "Security", "GenAI", "ML"],
        link: { href: "#certifications", text: "Open the certificates" }
      },
      {
        label: "05 / industry",
        body: "Two months on the Amadeus travel-booking project at Coforge: 200+ test cases executed on the Booking Module, 50 defects logged, 98% resolved before release.",
        chips: ["Functional testing", "Regression", "Defect logging"],
        link: null
      },
      {
        label: "06 / now",
        body: "Six builds shipped and open source: a Socratic tutor, a realtime chess room, a weather dashboard, a spaced-repetition study app, a travel journal with private accounts and a small arcade game.",
        chips: ["EdTech", "Realtime", "Weather", "Study", "Arcade"],
        link: { href: "#projects", text: "See the six builds" }
      }
    ];

    var railEl = rail.querySelector(".trail-rail");
    var track = rail.querySelector(".trail-track");
    var items = tabs.map(function (tab) { return tab.parentNode; });

    /* dot centres, measured from the rail's own box (offset* ignores scrolling) */
    function nodeCentre(item, vertical) {
      return vertical ? item.offsetTop + 27.5 : item.offsetLeft + 23.5;
    }

    function placeFill() {
      var accent = getComputedStyle(tabs[active]).getPropertyValue("--accent").trim();
      fill.style.background = accent || "";
      if (!railEl) return;

      var vertical = window.matchMedia("(max-width: 860px)").matches;
      var scroll = track && !vertical ? track.scrollLeft : 0;
      var start = nodeCentre(items[0], vertical) - scroll;
      var end = nodeCentre(items[items.length - 1], vertical) - scroll;
      var pos = nodeCentre(items[active], vertical) - scroll;

      railEl.style.setProperty("--rail-start", start + "px");
      railEl.style.setProperty("--rail-end", end + "px");
      railEl.style.setProperty("--rail-pos", pos + "px");
    }

    function select(index) {
      active = index;
      tabs.forEach(function (tab, i) {
        tab.setAttribute("aria-selected", i === index ? "true" : "false");
        tab.tabIndex = i === index ? 0 : -1;
      });

      var data = DATA[index];
      if (!data) return;
      if (labelEl) labelEl.textContent = "> " + data.label;
      if (bodyEl) bodyEl.textContent = data.body;
      if (chipsEl) {
        chipsEl.textContent = "";
        data.chips.forEach(function (chip) {
          var el = document.createElement("span");
          el.textContent = chip;
          chipsEl.appendChild(el);
        });
      }
      if (linkEl) {
        if (data.link) {
          linkEl.textContent = data.link.text + " \u2197";
          linkEl.setAttribute("href", data.link.href);
          linkEl.classList.remove("is-hidden");
        } else {
          linkEl.classList.add("is-hidden");
        }
      }
      panel.setAttribute("aria-labelledby", tabs[index].id);
      placeFill();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(i); });
      tab.addEventListener("focus", function () { select(i); });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % tabs.length;
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = tabs.length - 1;
        if (next === null) return;
        e.preventDefault();
        tabs[next].focus();
      });
    });

    window.addEventListener("resize", placeFill);
    window.addEventListener("load", placeFill);
    if (track) track.addEventListener("scroll", placeFill, { passive: true });
    if (window.ResizeObserver && railEl) new ResizeObserver(placeFill).observe(railEl);
    select(0);
  })();

  /* ---- toolbox caption ---- */
  (function initToolbox() {
    var card = document.getElementById("toolbox");
    if (!card) return;

    var nameEl = card.querySelector("[data-tool-name]");
    var noteEl = card.querySelector("[data-tool-note]");
    var chips = Array.prototype.slice.call(card.querySelectorAll(".tag"));
    if (!nameEl || !noteEl || !chips.length) return;

    var baseName = nameEl.textContent;
    var baseNote = noteEl.textContent;

    function show(chip) {
      nameEl.textContent = "> " + chip.getAttribute("data-tool");
      noteEl.textContent = chip.getAttribute("data-note") || "";
    }

    function reset() {
      nameEl.textContent = baseName;
      noteEl.textContent = baseNote;
    }

    chips.forEach(function (chip) {
      chip.addEventListener("mouseenter", function () { show(chip); });
      chip.addEventListener("focus", function () { show(chip); });
      chip.addEventListener("mouseleave", reset);
      chip.addEventListener("blur", reset);
      /* touch: the first tap focuses instead of hovering, so mirror it */
      chip.addEventListener("touchstart", function () { show(chip); }, { passive: true });
    });
  })();

  /* ---- year ---- */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
