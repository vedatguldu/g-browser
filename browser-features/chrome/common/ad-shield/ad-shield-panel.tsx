/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import i18next from "i18next";
import { createSignal } from "solid-js";
import { addI18nObserver } from "#i18n/config-browser-chrome.ts";
import { isAdShieldActive, toggleAdShield } from "./index.ts";

export function AdShieldPanel() {
  const [title, setTitle] = createSignal(
    i18next.t("adshield-title", {
      defaultValue: "AdShield Gizlilik Kalkanı",
    }),
  );

  addI18nObserver(() => {
    setTitle(
      i18next.t("adshield-title", {
        defaultValue: "AdShield Gizlilik Kalkanı",
      }),
    );
  });

  const onPopupShowing = () => {
    document?.getElementById("AdShieldPageAction")?.setAttribute("aria-expanded", "true");
  };

  const onPopupHiding = () => {
    const anchor = document?.getElementById("AdShieldPageAction");
    if (anchor) {
      anchor.setAttribute("aria-expanded", "false");
      anchor.focus();
    }
  };

  const handlePanelKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      // deno-lint-ignore no-explicit-any
      const panel = document?.getElementById("adshield-panel") as any;
      panel?.hidePopup?.();
    }
  };

  const handleToggleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      toggleAdShield();
    }
  };

  return (
    <xul:panel
      id="adshield-panel"
      type="arrow"
      role="dialog"
      aria-labelledby="adshield-title-label"
      position="bottomright topright"
      onPopupShowing={onPopupShowing}
      onPopupHiding={onPopupHiding}
      onKeyDown={handlePanelKeyDown}
    >
      <xul:vbox class="adshield-box">
        <xul:hbox class="adshield-header">
          <xul:label id="adshield-title-label" class="adshield-title">
            {title()}
          </xul:label>
          <xul:label
            class="adshield-status-badge"
            data-active={isAdShieldActive() ? "true" : "false"}
            role="status"
          >
            {isAdShieldActive() ? "Aktif" : "Devre Dışı"}
          </xul:label>
        </xul:hbox>

        <xul:toolbarseparator class="adshield-separator" />

        <xul:description class="adshield-description">
          Bu sayfadaki reklamlar, üçüncü taraf takipçiler ve izleme parametreleri tarayıcı çekirdeğinde engellenmektedir.
        </xul:description>

        <xul:vbox class="adshield-features-list">
          <xul:label class="adshield-feature-item">
            ✓ Reklam ve Banner Engelleme
          </xul:label>
          <xul:label class="adshield-feature-item">
            ✓ Çerez ve Parmak İzi İzolasyonu
          </xul:label>
          <xul:label class="adshield-feature-item">
            ✓ Kripto Madenci Koruması
          </xul:label>
          <xul:label class="adshield-feature-item">
            ✓ URL İzleme Parametresi Temizleme
          </xul:label>
        </xul:vbox>

        <button
          class="adshield-toggle-btn"
          tabindex="0"
          role="button"
          aria-pressed={isAdShieldActive() ? "true" : "false"}
          data-active={isAdShieldActive() ? "true" : "false"}
          onClick={() => toggleAdShield()}
          onKeyDown={handleToggleKeyDown}
        >
          {isAdShieldActive()
            ? "Korumayı Duraklat"
            : "Korumayı Etkinleştir"}
        </button>
      </xul:vbox>
    </xul:panel>
  );
}
