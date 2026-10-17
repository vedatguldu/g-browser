/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { noraComponent, NoraComponentBase } from "#features-chrome/utils/base";

@noraComponent(import.meta.hot)
export default class BrandEnforcer extends NoraComponentBase {
  init() {
    const doc = typeof document !== "undefined" ? document : null;
    if (!doc) return;

    const sanitizeTitle = () => {
      try {
        const root = doc.documentElement;
        if (root) {
          root.setAttribute("titlemodifier", "G-Browser");
          root.setAttribute("titlemenuseparator", " — ");
          root.setAttribute("titlepreface", "");
        }

        let currentTitle = doc.title;
        if (currentTitle && (currentTitle.includes("Ablaze") || currentTitle.includes("Floorp"))) {
          let cleanTitle = currentTitle
            .replace(/\s*[—\-]\s*Ablaze\s+Floorp/gi, " — G-Browser")
            .replace(/\s*[—\-]\s*Floorp/gi, " — G-Browser")
            .replace(/Ablaze\s+Floorp/gi, "G-Browser")
            .replace(/Floorp/gi, "G-Browser");

          if (cleanTitle !== currentTitle) {
            doc.title = cleanTitle;
          }
        }
      } catch (_e) {
        // Fallback silently
      }
    };

    // Sanitize immediately
    sanitizeTitle();

    // Observe document <title> changes
    const titleEl = doc.querySelector("title");
    if (titleEl) {
      const observer = new MutationObserver(() => sanitizeTitle());
      observer.observe(titleEl, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }

    // Hook tab selection
    try {
      const gBrowser = (globalThis as unknown as { gBrowser?: { tabContainer?: EventTarget } }).gBrowser;
      gBrowser?.tabContainer?.addEventListener("TabSelect", () => {
        setTimeout(sanitizeTitle, 20);
        setTimeout(sanitizeTitle, 100);
      });
    } catch (_e) {
      // Ignored if gBrowser not ready
    }
  }
}
