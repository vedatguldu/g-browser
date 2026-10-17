// G-Browser Documentation - Interactive Client Script
(function () {
  // Theme Toggle logic
  const themeToggle = document.getElementById("themeToggle");
  const currentTheme = localStorage.getItem("gbrowser-theme") || 
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  document.documentElement.setAttribute("data-theme", currentTheme);
  updateThemeIcon(currentTheme);

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const active = document.documentElement.getAttribute("data-theme");
      const next = active === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("gbrowser-theme", next);
      updateThemeIcon(next);
    });
  }

  function updateThemeIcon(theme) {
    if (!themeToggle) return;
    themeToggle.innerHTML = theme === "dark" 
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
  }

  // Active Sidebar Item Detection
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const sidebarLinks = document.querySelectorAll(".sidebar-link");
  sidebarLinks.forEach(link => {
    const href = link.getAttribute("href");
    if (href && (href.endsWith(currentPath) || (currentPath === "index.html" && href.endsWith("/")))) {
      link.classList.add("active");
    }
  });

  // Table of Contents Scrollspy
  const headings = document.querySelectorAll(".content-wrapper h2, .content-wrapper h3");
  const tocLinks = document.querySelectorAll(".toc-link");

  if (headings.length && tocLinks.length) {
    window.addEventListener("scroll", () => {
      let currentId = "";
      headings.forEach(heading => {
        const top = heading.getBoundingClientRect().top;
        if (top <= 120) {
          currentId = heading.getAttribute("id");
        }
      });

      tocLinks.forEach(link => {
        link.classList.remove("active");
        if (currentId && link.getAttribute("href") === "#" + currentId) {
          link.classList.add("active");
        }
      });
    }, { passive: true });
  }

  // Bilingual Language Switcher Logic
  const langBtns = document.querySelectorAll(".lang-btn");
  const langLiveRegion = document.getElementById("langLiveRegion");

  function setLanguage(lang) {
    if (!lang || (lang !== "tr" && lang !== "en")) return;
    document.documentElement.setAttribute("lang", lang);
    localStorage.setItem("gbrowser-lang", lang);

    langBtns.forEach(btn => {
      const btnLang = btn.getAttribute("data-lang");
      const isSelected = btnLang === lang;
      btn.classList.toggle("active", isSelected);
      btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });

    if (langLiveRegion) {
      langLiveRegion.textContent = lang === "tr" 
        ? "Sayfa dili Türkçe olarak ayarlandı." 
        : "Page language switched to English.";
    }
  }

  if (langBtns.length) {
    const savedLang = localStorage.getItem("gbrowser-lang") || 
      (navigator.language && navigator.language.startsWith("tr") ? "tr" : "en");
    setLanguage(savedLang);

    langBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const targetLang = btn.getAttribute("data-lang");
        setLanguage(targetLang);
      });
    });
  }

  // Copy to Clipboard with Accessible Live Feedback
  const copyButtons = document.querySelectorAll(".btn-copy");
  const copyLiveRegion = document.getElementById("copyLiveRegion") || langLiveRegion;

  copyButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
      let textToCopy = "";
      const targetId = btn.getAttribute("data-copy-target");
      if (targetId) {
        const targetEl = document.getElementById(targetId);
        if (targetEl) textToCopy = targetEl.textContent.trim();
      } else {
        const sibling = btn.parentElement ? btn.parentElement.querySelector(".copy-text") : null;
        if (sibling) textToCopy = sibling.textContent.trim();
      }

      if (!textToCopy) return;

      try {
        await navigator.clipboard.writeText(textToCopy);
        const originalHtml = btn.innerHTML;
        const currentLang = document.documentElement.getAttribute("lang") || "tr";
        btn.innerHTML = currentLang === "tr" 
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Kopyalandı!`
          : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
        btn.setAttribute("aria-live", "polite");

        if (copyLiveRegion) {
          copyLiveRegion.textContent = currentLang === "tr" 
            ? "Metin panoya başarıyla kopyalandı." 
            : "Text copied to clipboard successfully.";
        }

        setTimeout(() => {
          btn.innerHTML = originalHtml;
        }, 2200);
      } catch (err) {
        console.error("Kopyalama başarısız:", err);
      }
    });
  });
})();

