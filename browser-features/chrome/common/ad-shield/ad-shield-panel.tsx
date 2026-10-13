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

  return (
    <xul:panel
      id="adshield-panel"
      type="arrow"
      role="dialog"
      aria-labelledby="adshield-title-label"
      position="bottomright topright"
    >
      <xul:vbox class="adshield-box">
        <xul:hbox class="adshield-header">
          <xul:label id="adshield-title-label" class="adshield-title">
            {title()}
          </xul:label>
          <xul:label
            class="adshield-status-badge"
            data-active={isAdShieldActive() ? "true" : "false"}
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
          data-active={isAdShieldActive() ? "true" : "false"}
          onClick={() => toggleAdShield()}
        >
          {isAdShieldActive()
            ? "Korumayı Duraklat"
            : "Korumayı Etkinleştir"}
        </button>
      </xul:vbox>
    </xul:panel>
  );
}
