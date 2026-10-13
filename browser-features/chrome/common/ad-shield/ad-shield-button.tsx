/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import shieldIcon from "./icons/shield.svg?inline";
import i18next from "i18next";
import { createSignal } from "solid-js";
import { addI18nObserver } from "#i18n/config-browser-chrome.ts";
import { isAdShieldActive } from "./index.ts";

export function AdShieldPageActionButton() {
  const [tooltip, setTooltip] = createSignal(
    i18next.t("adshield-tooltip", {
      defaultValue: "AdShield: Reklam ve İzleyici Kalkanı",
    }),
  );

  addI18nObserver(() => {
    setTooltip(
      i18next.t("adshield-tooltip", {
        defaultValue: "AdShield: Reklam ve İzleyici Kalkanı",
      }),
    );
  });

  const togglePanel = (e?: Event) => {
    e?.preventDefault();
    e?.stopPropagation();
    // deno-lint-ignore no-explicit-any
    const panel = document?.getElementById("adshield-panel") as any;
    const anchor = document?.getElementById("AdShieldPageAction");
    if (panel && anchor) {
      if (panel.state === "open" || panel.state === "showing") {
        panel.hidePopup();
      } else {
        panel.openPopup(anchor, "bottomright topright", 0, 0, false, false);
        setTimeout(() => {
          const btn = panel.querySelector(".adshield-toggle-btn") as HTMLElement | null;
          btn?.focus();
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
    <xul:hbox
      id="AdShieldPageAction"
      class="urlbar-page-action"
      style={{
        "list-style-image": `url("${shieldIcon}")`,
      }}
      data-active={isAdShieldActive() ? "true" : "false"}
      title={tooltip()}
      role="button"
      tabindex="0"
      aria-haspopup="dialog"
      aria-expanded="false"
      aria-label={tooltip()}
      popup="adshield-panel"
      onClick={togglePanel}
      onKeyDown={handleKeyDown}
    >
      <xul:image
        id="AdShieldPageAction-image"
        class="urlbar-icon"
        role="presentation"
        aria-hidden="true"
      />
    </xul:hbox>
  );
}
