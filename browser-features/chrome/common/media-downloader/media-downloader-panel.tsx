/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import i18next from "i18next";
import { For, Show, createSignal } from "solid-js";
import { addI18nObserver } from "#i18n/config-browser-chrome.ts";
import { detectedMediaItems, scanCurrentTabMedia } from "./index.ts";
import { downloadMediaItem, copyMediaUrlToClipboard, type MediaItem } from "./media-detector.ts";

export function MediaDownloaderPanel() {
  const [panelTitle, setPanelTitle] = createSignal(
    i18next.t("media-downloader-title", {
      defaultValue: "İndirilebilir Medyalar",
    }),
  );
  const [downloadSuccessId, setDownloadSuccessId] = createSignal<string | null>(null);

  addI18nObserver(() => {
    setPanelTitle(
      i18next.t("media-downloader-title", {
        defaultValue: "İndirilebilir Medyalar",
      }),
    );
  });

  const onPopupShowing = () => {
    document?.getElementById("MediaDownloaderPageAction")?.setAttribute("aria-expanded", "true");
    scanCurrentTabMedia();
  };

  const onPopupHiding = () => {
    const anchor = document?.getElementById("MediaDownloaderPageAction");
    if (anchor) {
      anchor.setAttribute("aria-expanded", "false");
      anchor.focus();
    }
  };

  const handlePanelKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      // deno-lint-ignore no-explicit-any
      const panel = document?.getElementById("media-downloader-panel") as any;
      panel?.hidePopup?.();
    }
  };

  const handleDownload = async (item: MediaItem) => {
    setDownloadSuccessId(item.id);
    await downloadMediaItem(item);
    setTimeout(() => {
      setDownloadSuccessId(null);
    }, 2000);
  };

  const handleButtonKeyDown = (e: KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      action();
    }
  };

  return (
    <xul:panel
      id="media-downloader-panel"
      type="arrow"
      role="dialog"
      aria-labelledby="media-panel-title-label"
      position="bottomright topright"
      onPopupShowing={onPopupShowing}
      onPopupHiding={onPopupHiding}
      onKeyDown={handlePanelKeyDown}
    >
      <xul:vbox class="media-panel-box">
        <xul:hbox class="media-panel-header">
          <xul:label id="media-panel-title-label" class="media-panel-title">
            {panelTitle()}
          </xul:label>
          <xul:label class="media-panel-count" role="status">
            {detectedMediaItems().length} Öğe
          </xul:label>
        </xul:hbox>

        <xul:toolbarseparator class="media-panel-separator" />

        <Show
          when={detectedMediaItems().length > 0}
          fallback={
            <div class="media-empty-state" role="status" tabindex="0">
              Bu sayfada indirilebilir video veya ses akışı tespit edilmedi. Sayfada bir video oynatmayı deneyebilirsiniz.
            </div>
          }
        >
          <div class="media-panel-list" role="list">
            <For each={detectedMediaItems()}>
              {(item) => (
                <div class="media-panel-item" role="listitem">
                  <div class="media-item-info">
                    <span class="media-item-title" title={item.title}>
                      {item.title}
                    </span>
                    <div class="media-item-meta">
                      <span class="media-format-pill">{item.format}</span>
                      <span>{item.type === "video" ? "Video" : item.type === "stream" ? "Akış" : "Ses"}</span>
                    </div>
                  </div>
                  <div class="media-item-actions">
                    <button
                      class="media-btn-copy"
                      tabindex="0"
                      role="button"
                      onClick={() => copyMediaUrlToClipboard(item.url)}
                      onKeyDown={(e) => handleButtonKeyDown(e, () => copyMediaUrlToClipboard(item.url))}
                      title="Bağlantıyı Kopyala"
                      aria-label={`${item.title} bağlantısını kopyala`}
                    >
                      Kopyala
                    </button>
                    <button
                      class="media-btn-download"
                      tabindex="0"
                      role="button"
                      onClick={() => handleDownload(item)}
                      onKeyDown={(e) => handleButtonKeyDown(e, () => handleDownload(item))}
                      aria-label={`${item.title} indir`}
                    >
                      {downloadSuccessId() === item.id ? "Başlatıldı ✓" : "İndir"}
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </xul:vbox>
    </xul:panel>
  );
}
