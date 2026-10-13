/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import downloadIcon from "./icons/download.svg?inline";
import i18next from "i18next";
import { Show, createSignal } from "solid-js";
import { addI18nObserver } from "#i18n/config-browser-chrome.ts";
import { detectedMediaItems, scanCurrentTabMedia } from "./index.ts";

export function MediaDownloaderPageActionButton() {
  const [baseTooltip, setBaseTooltip] = createSignal(
    i18next.t("media-downloader-tooltip", {
      defaultValue: "Medya ve Video İndirici",
    }),
  );

  addI18nObserver(() => {
    setBaseTooltip(
      i18next.t("media-downloader-tooltip", {
        defaultValue: "Medya ve Video İndirici",
      }),
    );
  });

  const isEnabled = () => {
    try {
      const Services = (globalThis as unknown as { Services?: { prefs?: { getBoolPref?: (p: string, d?: boolean) => boolean } } }).Services;
      return Services?.prefs?.getBoolPref?.("floorp.mediadownloader.enabled", true) ?? true;
    } catch {
      return true;
    }
  };

  const showBadge = () => {
    try {
      const Services = (globalThis as unknown as { Services?: { prefs?: { getBoolPref?: (p: string, d?: boolean) => boolean } } }).Services;
      return Services?.prefs?.getBoolPref?.("floorp.mediadownloader.notify.detected", true) ?? true;
    } catch {
      return true;
    }
  };

  const count = () => detectedMediaItems().length;
  const tooltipText = () =>
    count() > 0 ? `${baseTooltip()} (${count()} medya bulundu)` : baseTooltip();

  const togglePanel = (e?: Event) => {
    e?.preventDefault();
    e?.stopPropagation();
    // deno-lint-ignore no-explicit-any
    const panel = document?.getElementById("media-downloader-panel") as any;
    const anchor = document?.getElementById("MediaDownloaderPageAction");
    if (panel && anchor) {
      if (panel.state === "open" || panel.state === "showing") {
        panel.hidePopup();
      } else {
        scanCurrentTabMedia();
        panel.openPopup(anchor, "bottomright topright", 0, 0, false, false);
        setTimeout(() => {
          const firstBtn = panel.querySelector(".media-btn-download, .media-btn-copy, [tabindex='0']") as HTMLElement | null;
          firstBtn?.focus();
        }, 80);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      togglePanel();
    }
  };

  return (
    <Show when={isEnabled()}>
      <xul:hbox
        id="MediaDownloaderPageAction"
        class="urlbar-page-action"
        style={{
          "list-style-image": `url("${downloadIcon}")`,
        }}
        data-found={count() > 0 ? "true" : "false"}
        title={tooltipText()}
        role="button"
        tabindex="0"
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-label={tooltipText()}
        popup="media-downloader-panel"
        onClick={togglePanel}
        onKeyDown={handleKeyDown}
      >
        <xul:image
          id="MediaDownloaderPageAction-image"
          class="urlbar-icon"
          role="presentation"
          aria-hidden="true"
        />
        <Show when={showBadge() && count() > 0}>
          <span class="media-downloader-badge" aria-hidden="true">
            {count()}
          </span>
        </Show>
      </xul:hbox>
    </Show>
  );
}
