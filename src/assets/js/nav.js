/* ==========================================================================
   Lumen — interactions
   - mobile sidebar toggle
   - dark / light theme toggle (persisted to localStorage)
   - reading progress bar (scroll-based)
   - keyboard navigation (j/k next/prev paragraph, t toggle theme)
   - annotation index live search
   ========================================================================== */
(function () {
  "use strict";

  /* ---- Mobile sidebar ---- */
  var toggle = document.querySelector("[data-nav-toggle]");
  var shell = document.querySelector(".shell");
  var scrim = document.querySelector("[data-nav-scrim]");

  function closeNav() {
    if (!shell) return;
    shell.classList.remove("nav-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }

  if (toggle && shell) {
    toggle.addEventListener("click", function () {
      var isOpen = shell.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    if (scrim) scrim.addEventListener("click", closeNav);
    shell.querySelectorAll(".sidebar a").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
  }

  /* ---- Theme toggle ---- */
  var themeBtn = document.querySelector("[data-theme-toggle]");
  var root = document.documentElement;

  function setTheme(theme) {
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
    try { localStorage.setItem("cw6-theme", theme); } catch (e) {}
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var isDark = root.getAttribute("data-theme") === "dark";
      setTheme(isDark ? "light" : "dark");
    });
  }

  /* ---- Reading progress bar ---- */
  var progressFill = document.querySelector("[data-reading-progress]");
  var main = document.querySelector(".main");

  function updateProgress() {
    if (!progressFill || !main) return;
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressFill.style.width = Math.min(100, Math.max(0, pct)) + "%";
  }

  if (progressFill) {
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          updateProgress();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
    updateProgress();
  }

  /* ---- Keyboard navigation on paragraph pages ----
     j / →  : next paragraph
     k / ←  : previous paragraph
     t      : toggle theme */
  var prevLink = document.querySelector('.chapter-nav a:not(.chapter-nav__next)[href]');
  var nextLink = document.querySelector('.chapter-nav__next[href]');

  function isTyping(e) {
    var t = e.target;
    return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
  }

  document.addEventListener("keydown", function (e) {
    if (isTyping(e)) return;
    var key = e.key.toLowerCase();
    if (key === "j" || (key === "arrowright" && !e.shiftKey)) {
      if (nextLink) { window.location.href = nextLink.getAttribute("href"); }
    } else if (key === "k" || (key === "arrowleft" && !e.shiftKey)) {
      if (prevLink) { window.location.href = prevLink.getAttribute("href"); }
    } else if (key === "t") {
      if (themeBtn) { themeBtn.click(); e.preventDefault(); }
    }
  });

  /* ---- Annotation index live search ---- */
  var filterInput = document.querySelector("[data-annot-filter]");
  var entries = document.querySelectorAll(".annot-entry");
  var countEl = document.querySelector("[data-annot-count]");
  var total = entries.length;

  if (filterInput) {
    filterInput.addEventListener("input", function () {
      var q = filterInput.value.trim().toLowerCase();
      var shown = 0;
      entries.forEach(function (entry) {
        var haystack = (entry.getAttribute("data-search") || "").toLowerCase();
        var match = q === "" || haystack.indexOf(q) !== -1;
        entry.hidden = !match;
        if (match) shown++;
      });
      if (countEl) {
        if (q === "") {
          countEl.textContent = "Menampilkan " + total + " dari " + total + " anotasi.";
        } else {
          countEl.textContent = "Menampilkan " + shown + " dari " + total + " anotasi untuk \"" + q + "\".";
        }
      }
    });
  }

})();
