/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { render } from "@nora/solid-xul";
import { createRoot, createSignal, getOwner, runWithOwner } from "solid-js";
import {
  noraComponent,
  NoraComponentBase,
} from "#features-chrome/utils/base.ts";
import { AdShieldPageActionButton } from "./ad-shield-button.tsx";
import { AdShieldPanel } from "./ad-shield-panel.tsx";
import { injectCosmeticFilters } from "./ad-rules.ts";
import style from "./style.css?inline";

const [isActive, setIsActive] = createSignal(true);
export const isAdShieldActive = isActive;

export function toggleAdShield(): void {
  const current = isActive();
  const next = !current;
  setIsActive(next);
  try {
    Services.prefs.setBoolPref("floorp.adshield.enabled", next);
    // Also toggle gecko tracking protection accordingly
    Services.prefs.setBoolPref("privacy.trackingprotection.enabled", next);
  } catch {
    // Best-effort pref write
  }
}

@noraComponent(import.meta.hot)
export default class AdShield extends NoraComponentBase {
  init(): void {
    try {
      const prefActive = Services.prefs.getBoolPref("floorp.adshield.enabled", true);
      setIsActive(prefActive);
    } catch {
      setIsActive(true);
    }

    // Attach local stylesheet to browser window
    const styleEl = document?.createElement("style");
    if (styleEl) {
      styleEl.textContent = style;
      document?.head?.appendChild(styleEl);
    }

    // Mount AdShield panel to mainPopupSet
    const mainPopupSet = document?.getElementById("mainPopupSet");
    if (mainPopupSet) {
      render(AdShieldPanel, mainPopupSet, {
        hotCtx: import.meta.hot,
      });
    }

    // Mount page action button to star-button-box parent
    const owner = getOwner();
    globalThis.SessionStore?.promiseInitialized?.then(() => {
      const exec = () => {
        const starButtonBox = document?.getElementById("star-button-box");
        if (starButtonBox && starButtonBox.parentElement) {
          render(AdShieldPageActionButton, starButtonBox.parentElement, {
            marker: starButtonBox,
            hotCtx: import.meta.hot,
          });
        }
      };
      if (owner) runWithOwner(owner, exec);
      else createRoot(exec);
    });

    // Content document filter observer
    this.setupContentFilterObserver();
  }

  private setupContentFilterObserver(): void {
    try {
      const gBrowser = (globalThis as unknown as { gBrowser?: { tabContainer?: Element; selectedBrowser?: { contentDocument?: Document } } }).gBrowser;
      if (!gBrowser?.tabContainer) return;

      const applyCurrentTabFilters = () => {
        if (!isActive()) return;
        try {
          const doc = gBrowser.selectedBrowser?.contentDocument;
          if (doc) injectCosmeticFilters(doc);
        } catch {
          // Cross-process content handled safely
        }
      };

      gBrowser.tabContainer.addEventListener("TabSelect", applyCurrentTabFilters);
      applyCurrentTabFilters();
    } catch {
      // Safe fallback
    }
  }
}
