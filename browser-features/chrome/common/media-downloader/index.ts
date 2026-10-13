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
import { extractMediaFromDocument, type MediaItem } from "./media-detector.ts";
import style from "./style.css?inline";

const [mediaItems, setMediaItems] = createSignal<MediaItem[]>([]);
export const detectedMediaItems = mediaItems;

export function scanCurrentTabMedia(): void {
  try {
    const gBrowser = (globalThis as unknown as { gBrowser?: { selectedBrowser?: { contentDocument?: Document } } }).gBrowser;
    const doc = gBrowser?.selectedBrowser?.contentDocument;
    if (doc) {
      const items = extractMediaFromDocument(doc);
      setMediaItems(items);
    }
  } catch {
    // Cross-process fallback
  }
}

@noraComponent(import.meta.hot)
export default class MediaDownloader extends NoraComponentBase {
  init(): void {
    // Attach local stylesheet to browser window
    const styleEl = document?.createElement("style");
    if (styleEl) {
      styleEl.textContent = style;
      document?.head?.appendChild(styleEl);
    }

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

  private setupTabListeners(): void {
    try {
      const gBrowser = (globalThis as unknown as { gBrowser?: { tabContainer?: Element } }).gBrowser;
      if (!gBrowser?.tabContainer) return;

      gBrowser.tabContainer.addEventListener("TabSelect", () => {
        scanCurrentTabMedia();
      });

      // Periodic check while page media might be lazy-loaded
      setTimeout(() => scanCurrentTabMedia(), 1500);
    } catch {
      // Safe fallback
    }
  }
}
