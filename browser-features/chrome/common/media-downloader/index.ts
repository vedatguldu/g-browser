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
import { MediaDownloaderPageActionButton } from "./media-downloader-button.tsx";
import { MediaDownloaderPanel } from "./media-downloader-panel.tsx";
import {
  startMediaObserver,
  stopMediaObserver,
  getMediaItemsForActiveTab,
  clearMediaForTab,
  addMediaUpdateListener,
  type MediaItem,
} from "./media-detector.ts";
import style from "./style.css?inline";

const [mediaItems, setMediaItems] = createSignal<MediaItem[]>([]);
export const detectedMediaItems = mediaItems;

export function scanCurrentTabMedia(): void {
  if (!Services.prefs.getBoolPref("floorp.mediadownloader.enabled", true)) {
    setMediaItems([]);
    return;
  }
  // The detector mutates its per-tab list in place; pass a fresh array so the
  // Solid signal sees a new value and the panel re-renders.
  setMediaItems([...getMediaItemsForActiveTab()]);
}

@noraComponent(import.meta.hot)
export default class MediaDownloader extends NoraComponentBase {
  private removeUpdateListener: (() => void) | null = null;

  init(): void {
    // Attach local stylesheet to browser window
    const styleEl = document?.createElement("style");
    if (styleEl) {
      styleEl.textContent = style;
      document?.head?.appendChild(styleEl);
    }

    // Start native HTTP media stream observer
    startMediaObserver();

    // Listen for media stream detections
    this.removeUpdateListener = addMediaUpdateListener(() => {
      scanCurrentTabMedia();
    });

    // Mount panel to mainPopupSet
    const mainPopupSet = document?.getElementById("mainPopupSet");
    if (mainPopupSet) {
      render(MediaDownloaderPanel, mainPopupSet, {
        hotCtx: import.meta.hot,
      });
    }

    // Mount page action button next to star-button-box
    const owner = getOwner();
    globalThis.SessionStore?.promiseInitialized?.then(() => {
      const exec = () => {
        const starButtonBox = document?.getElementById("star-button-box");
        if (starButtonBox && starButtonBox.parentElement) {
          render(MediaDownloaderPageActionButton, starButtonBox.parentElement, {
            marker: starButtonBox,
            hotCtx: import.meta.hot,
          });
        }
      };
      if (owner) runWithOwner(owner, exec);
      else createRoot(exec);
    });

    // Setup tab listeners to rescan on tab change and document load
    this.setupTabListeners();
  }

  destroy(): void {
    if (this.removeUpdateListener) {
      this.removeUpdateListener();
      this.removeUpdateListener = null;
    }
    stopMediaObserver();
  }

  private setupTabListeners(): void {
    // deno-lint-ignore no-explicit-any
    const gBrowser = (globalThis as any).gBrowser;
    if (!gBrowser?.tabContainer) {
      console.warn("[MediaDownloader] gBrowser.tabContainer unavailable; tab listeners not installed");
      return;
    }

    const onTabSelect = () => {
      if (!Services.prefs.getBoolPref("floorp.mediadownloader.auto_scan", true)) return;
      scanCurrentTabMedia();
    };
    gBrowser.tabContainer.addEventListener("TabSelect", onTabSelect);

    // A new top-level page means the previous page's media is gone.
    const progressListener = {
      onLocationChange: (
        browser: { browserId?: number },
        webProgress: { isTopLevel?: boolean },
        _request: unknown,
        _location: unknown,
        flags: number,
      ) => {
        if (!webProgress?.isTopLevel) return;
        if (flags & Ci.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT) return;
        if (browser?.browserId) clearMediaForTab(browser.browserId);
        scanCurrentTabMedia();
      },
    };
    gBrowser.addTabsProgressListener(progressListener);

    globalThis.addEventListener(
      "unload",
      () => {
        gBrowser.tabContainer?.removeEventListener("TabSelect", onTabSelect);
        gBrowser.removeTabsProgressListener?.(progressListener);
        this.destroy();
      },
      { once: true },
    );

    scanCurrentTabMedia();
  }
}
