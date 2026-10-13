/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import qrCodeIcon from "./icons/send.svg?inline";
import i18next from "i18next";
import { createSignal } from "solid-js";
import { addI18nObserver } from "#i18n/config-browser-chrome.ts";
import { config } from "../designs/configs.ts";
import { Show } from "solid-js";

export function QRCodePageActionButton() {
  const [tooltip, setTooltip] = createSignal(
    i18next.t("qrcode-generate-page-action"),
  );

  addI18nObserver(() => {
    setTooltip(i18next.t("qrcode-generate-page-action"));
  });

  const togglePanel = (e?: Event) => {
    e?.preventDefault();
    e?.stopPropagation();
    // deno-lint-ignore no-explicit-any
    const panel = document?.getElementById("qrcode-panel") as any;
    const anchor = document?.getElementById("QRCodeGeneratePageAction");
    if (panel && anchor) {
      if (panel.state === "open" || panel.state === "showing") {
        panel.hidePopup();
      } else {
        panel.openPopup(anchor, "bottomright topright", 0, 0, false, false);
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
    <Show when={!config().uiCustomization.qrCode.disableButton}>
      <xul:hbox
        id="QRCodeGeneratePageAction"
        class="urlbar-page-action"
        style={{
          "list-style-image": `url("${qrCodeIcon}")`,
        }}
        title={tooltip()}
        role="button"
        tabindex="0"
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-label={tooltip()}
        popup="qrcode-panel"
        onClick={togglePanel}
        onKeyDown={handleKeyDown}
      >
        <xul:image
          id="QRCodeGeneratePageAction-image"
          class="urlbar-icon"
          role="presentation"
          aria-hidden="true"
        />
      </xul:hbox>
    </Show>
  );
}
