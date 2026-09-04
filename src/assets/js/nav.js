(function () {
  "use strict";

  var html = document.documentElement;
  var shell = document.querySelector(".shell");
  var toggle = document.querySelector("[data-nav-toggle]");
  var closeNavEls = document.querySelectorAll("[data-nav-close]");
  var searchLayer = document.querySelector("[data-search-layer]");
  var searchInput = document.querySelector("[data-search-input]");
  var searchResults = document.querySelector("[data-search-results]");
  var searchStatus = document.querySelector("[data-search-status]");
  var settingsLayer = document.querySelector("[data-settings-layer]");
  var searchData = null;
  var searchPromise = null;
  var searchDebounce = null;
  var lastFocusedBeforeDialog = null;

  function setNav(open) {
    if (!shell || !toggle) return;
    shell.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  // ---- Dialog helpers (search & settings) --------------------------------
  // Sederhana tapi lengkap: kunci scroll body, jebak fokus di dalam dialog
  // selagi terbuka (Tab tidak lolos ke halaman di belakangnya), dan
  // kembalikan fokus ke tombol pemicu saat ditutup.

  function trapFocus(container, event) {
    var focusable = container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openDialog(layer, focusTarget) {
    lastFocusedBeforeDialog = document.activeElement;
    layer.hidden = false;
    document.body.classList.add("modal-open");
    window.setTimeout(function () {
      if (focusTarget) focusTarget.focus();
    }, 30);
  }

  function closeDialog(layer) {
    layer.hidden = true;
    if (
      !document.querySelector(
        ".search-layer:not([hidden]), .settings-layer:not([hidden])",
      )
    ) {
      document.body.classList.remove("modal-open");
    }
    if (
      lastFocusedBeforeDialog &&
      typeof lastFocusedBeforeDialog.focus === "function"
    ) {
      lastFocusedBeforeDialog.focus();
    }
    lastFocusedBeforeDialog = null;
  }

  function openSearch() {
    if (!searchLayer) return;
    closeSettings();
    openDialog(searchLayer, searchInput);
    loadSearchData();
  }

  function closeSearch() {
    if (!searchLayer || searchLayer.hidden) return;
    closeDialog(searchLayer);
  }

  function openSettings() {
    if (!settingsLayer) return;
    closeSearch();
    openDialog(settingsLayer, settingsLayer.querySelector("button, input"));
  }

  function closeSettings() {
    if (!settingsLayer || settingsLayer.hidden) return;
    closeDialog(settingsLayer);
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>'"]/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      }[c];
    });
  }

  // Bungkus kecocokan query dengan <mark>, dengan asumsi `escaped` sudah
  // melalui escapeHtml (jadi aman disisipi tag tanpa risiko HTML injection).
  function highlight(escaped, query) {
    if (!query) return escaped;
    var idx = escaped.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escaped;
    return (
      escaped.slice(0, idx) +
      "<mark>" +
      escaped.slice(idx, idx + query.length) +
      "</mark>" +
      escaped.slice(idx + query.length)
    );
  }

  function loadSearchData() {
    if (searchData || searchPromise || !window.CW6_SEARCH_URL) return;
    searchPromise = fetch(window.CW6_SEARCH_URL, { credentials: "same-origin" })
      .then(function (r) {
        if (!r.ok) throw new Error("search unavailable");
        return r.json();
      })
      .then(function (data) {
        searchData = data;
        renderSearch(searchInput ? searchInput.value : "");
      })
      .catch(function () {
        if (searchStatus)
          searchStatus.textContent =
            "Pencarian belum tersedia. Build ulang situs untuk membuat search index.";
      });
  }

  function renderSearch(query) {
    if (!searchResults || !searchStatus) return;
    query = (query || "").trim();
    if (!searchData) {
      searchStatus.textContent = "Memuat indeks…";
      return;
    }
    if (!query) {
      searchStatus.textContent = "Cari istilah, frasa, atau nomor paragraf.";
      searchResults.innerHTML = "";
      return;
    }

    var q = query.toLowerCase();
    var results = [];
    for (var i = 0; i < searchData.length && results.length < 60; i++) {
      var item = searchData[i];
      // Ikut menelusuri isi anotasi (item.an), bukan cuma teks asli —
      // supaya paragraf bisa ketemu lewat kata-kata di catatanmu juga.
      var haystack = (
        item.n +
        " " +
        item.c +
        " " +
        item.h +
        " " +
        item.t +
        " " +
        (item.an || "")
      ).toLowerCase();
      if (haystack.indexOf(q) !== -1) results.push(item);
    }

    searchStatus.textContent =
      results.length +
      " hasil" +
      (results.length === 60 ? " (dibatasi 60)" : "");
    if (!results.length) {
      searchResults.innerHTML =
        '<div class="search-empty">Tidak ada paragraf yang cocok dengan <strong>' +
        escapeHtml(query) +
        "</strong>.</div>";
      return;
    }

    searchResults.innerHTML = results
      .map(function (item) {
        var matchedInAnnotation =
          item.an &&
          item.an.toLowerCase().indexOf(q) !== -1 &&
          item.t.toLowerCase().indexOf(q) === -1;
        var snippet = matchedInAnnotation ? item.an : item.t;
        return (
          '<a class="search-result" href="' +
          escapeHtml(item.u) +
          '">' +
          '<span class="search-result__num">§' +
          escapeHtml(item.n) +
          "</span>" +
          '<span><span class="search-result__chapter">' +
          escapeHtml(item.s + " · ") +
          escapeHtml(item.c) +
          "</span>" +
          '<span class="search-result__text">' +
          highlight(escapeHtml(snippet), query) +
          "</span></span>" +
          '<span class="search-result__anno">' +
          (item.a ? (matchedInAnnotation ? "COCOK DI CATATAN" : "NOTE") : "") +
          "</span>" +
          "</a>"
        );
      })
      .join("");
  }

  function applySavedSettings() {
    var theme = localStorage.getItem("cw6-theme") || "light";
    var font = localStorage.getItem("cw6-font") || "medium";
    var width = localStorage.getItem("cw6-width") || "medium";
    setTheme(theme, false);
    setFont(font, false);
    setWidth(width, false);
  }

  function notifyLayoutChanged() {
    document.dispatchEvent(new CustomEvent("cw6:layout-changed"));
  }

  function setTheme(theme, save) {
    if (["light", "sepia", "dark"].indexOf(theme) === -1) theme = "light";
    html.dataset.theme = theme;
    if (save !== false) localStorage.setItem("cw6-theme", theme);
    document.querySelectorAll("[data-theme-choice]").forEach(function (b) {
      b.classList.toggle("is-active", b.dataset.themeChoice === theme);
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta)
      meta.setAttribute(
        "content",
        theme === "dark"
          ? "#111316"
          : theme === "sepia"
            ? "#eee1c8"
            : "#f4f0e7",
      );
  }

  function setFont(font, save) {
    var values = { small: "0.92", medium: "1", large: "1.1" };
    if (!values[font]) font = "medium";
    html.style.setProperty("--ui-scale", values[font]);
    if (save !== false) localStorage.setItem("cw6-font", font);
    document.querySelectorAll("[data-font-size]").forEach(function (b) {
      b.classList.toggle("is-active", b.dataset.fontSize === font);
    });
    if (save !== false) notifyLayoutChanged();
  }

  function setWidth(width, save) {
    var values = { narrow: "650px", medium: "735px", wide: "860px" };
    if (!values[width]) width = "medium";
    html.style.setProperty("--reading", values[width]);
    if (save !== false) localStorage.setItem("cw6-width", width);
    document.querySelectorAll("[data-reading-width]").forEach(function (b) {
      b.classList.toggle("is-active", b.dataset.readingWidth === width);
    });
    if (save !== false) notifyLayoutChanged();
  }

  function initAnnotationFilter() {
    var input = document.querySelector("[data-annotation-filter]");
    var entries = Array.prototype.slice.call(
      document.querySelectorAll("[data-annotation-entry]"),
    );
    var groups = Array.prototype.slice.call(
      document.querySelectorAll("[data-annotation-group]"),
    );
    var empty = document.querySelector("[data-annotation-empty]");
    var count = document.querySelector("[data-annotation-count]");
    if (!input || !entries.length) return;
    input.addEventListener("input", function () {
      var q = input.value.toLowerCase().trim();
      var shown = 0;
      entries.forEach(function (entry) {
        var ok =
          !q ||
          (entry.dataset.searchText || "").toLowerCase().indexOf(q) !== -1;
        entry.hidden = !ok;
        if (ok) shown++;
      });
      // Sembunyikan juga kepala grup yang semua barisnya sudah terfilter.
      groups.forEach(function (group) {
        group.hidden = !group.querySelector(
          "[data-annotation-entry]:not([hidden])",
        );
      });
      if (empty) empty.classList.toggle("empty-state--hidden", shown !== 0);
      if (count)
        count.textContent =
          shown + " hasil" + (q ? " dari " + entries.length : "");
    });
  }

  function initChapterProgress() {
    var page = document.querySelector("[data-chapter-page]");
    if (!page) return;
    var paras = Array.prototype.slice.call(
      page.querySelectorAll("[data-paragraph]"),
    );
    var progress = document.querySelector("[data-reading-progress]");
    var current = document.querySelector("[data-current-para]");
    var percent = document.querySelector("[data-reading-percent]");
    if (!paras.length || !progress) return;

    function update() {
      var marker = window.scrollY + window.innerHeight * 0.28;
      var active = paras[0];
      for (var i = 0; i < paras.length; i++) {
        if (paras[i].offsetTop <= marker) active = paras[i];
        else break;
      }
      var ratio = Math.min(
        1,
        Math.max(
          0,
          (window.scrollY - page.offsetTop) /
            Math.max(1, page.offsetHeight - window.innerHeight),
        ),
      );
      progress.style.width = (ratio * 100).toFixed(1) + "%";
      if (current) current.textContent = "§" + active.dataset.paraNumber;
      if (percent) percent.textContent = Math.round(ratio * 100) + "%";
    }

    var resizeTimer = null;
    function scheduleUpdate() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(update, 100);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    // Ganti ukuran teks/lebar kolom lewat panel preferensi mengubah tinggi
    // halaman tanpa memicu "resize" — recompute manual saat itu terjadi.
    document.addEventListener("cw6:layout-changed", scheduleUpdate);
  }

  function initResume() {
    document.querySelectorAll("a[href*='/']").forEach(function (link) {
      link.addEventListener("click", function () {
        localStorage.setItem("cw6-last", link.href);
      });
    });
    var home = document.querySelector(".home-hero");
    if (!home) return;
    var last = localStorage.getItem("cw6-last");
    if (!last || last === window.location.href) return;
    var actions = home.querySelector(".hero-actions");
    if (!actions) return;
    var resume = document.createElement("a");
    resume.className = "button button--ghost";
    resume.href = last;
    resume.textContent = "Lanjutkan membaca →";
    actions.appendChild(resume);
  }

  function initFocusKeys() {
    var page = document.querySelector("[data-focus-page]");
    if (!page) return;
    document.addEventListener("keydown", function (e) {
      // Jangan sabotase Shift+panah (seleksi teks) atau kombinasi modifier lain,
      // dan jangan aktif kalau fokus lagi ada di elemen yang bisa diketik.
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      var tag = document.activeElement && document.activeElement.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (document.activeElement && document.activeElement.isContentEditable)
        return;
      if (e.key === "ArrowLeft" && page.dataset.prevUrl)
        window.location.href = page.dataset.prevUrl;
      if (e.key === "ArrowRight" && page.dataset.nextUrl)
        window.location.href = page.dataset.nextUrl;
    });
  }

  if (toggle)
    toggle.addEventListener("click", function () {
      setNav(!(shell && shell.classList.contains("nav-open")));
    });
  if (closeNavEls.length)
    closeNavEls.forEach(function (el) {
      el.addEventListener("click", function () {
        setNav(false);
      });
    });
  document.querySelectorAll("[data-search-open]").forEach(function (b) {
    b.addEventListener("click", openSearch);
  });
  document.querySelectorAll("[data-search-close]").forEach(function (b) {
    b.addEventListener("click", closeSearch);
  });
  document.querySelectorAll("[data-settings-open]").forEach(function (b) {
    b.addEventListener("click", openSettings);
  });
  document.querySelectorAll("[data-settings-close]").forEach(function (b) {
    b.addEventListener("click", closeSettings);
  });
  document.querySelectorAll(".sidebar a").forEach(function (a) {
    a.addEventListener("click", function () {
      setNav(false);
    });
  });
  if (searchInput)
    searchInput.addEventListener("input", function () {
      window.clearTimeout(searchDebounce);
      var value = searchInput.value;
      searchDebounce = window.setTimeout(function () {
        loadSearchData();
        renderSearch(value);
      }, 80);
    });

  document.querySelectorAll("[data-theme-choice]").forEach(function (b) {
    b.addEventListener("click", function () {
      setTheme(b.dataset.themeChoice);
    });
  });
  document.querySelectorAll("[data-font-size]").forEach(function (b) {
    b.addEventListener("click", function () {
      setFont(b.dataset.fontSize);
    });
  });
  document.querySelectorAll("[data-reading-width]").forEach(function (b) {
    b.addEventListener("click", function () {
      setWidth(b.dataset.readingWidth);
    });
  });

  if (searchLayer) {
    searchLayer.addEventListener("keydown", function (e) {
      if (e.key === "Tab")
        trapFocus(searchLayer.querySelector(".search-dialog"), e);
    });
  }
  if (settingsLayer) {
    settingsLayer.addEventListener("keydown", function (e) {
      if (e.key === "Tab")
        trapFocus(settingsLayer.querySelector(".settings-dialog"), e);
    });
  }

  document.addEventListener("keydown", function (e) {
    var tag = document.activeElement && document.activeElement.tagName;
    var typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    if (e.key === "Escape") {
      closeSearch();
      closeSettings();
      setNav(false);
    }
    if (
      !typing &&
      (e.key === "/" ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"))
    ) {
      e.preventDefault();
      openSearch();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === ",") {
      e.preventDefault();
      openSettings();
    }
  });

  applySavedSettings();
  initAnnotationFilter();
  initChapterProgress();
  initResume();
  initFocusKeys();
})();
