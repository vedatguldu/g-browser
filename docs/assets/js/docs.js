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
})();
