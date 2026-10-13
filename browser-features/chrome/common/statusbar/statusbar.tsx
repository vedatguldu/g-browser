/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { manager } from "./";
import statusbarUtilsStyle from "./statusbar-utils.css?inline";
import i18next from "i18next";
import { createSignal } from "solid-js";
import { addI18nObserver } from "#i18n/config-browser-chrome.ts";

export function StatusBarElem() {
  const getLocalizedName = () =>
    i18next.t("statusbar.toggle", { mark: "" }).trim() || "Status Bar";

  const [label, setLabel] = createSignal(getLocalizedName());

  addI18nObserver(() => {
    setLabel(getLocalizedName());
  });

  return (
    <>
      <xul:toolbar
        id="nora-statusbar"
        toolbarname={label()}
        role="toolbar"
        aria-label={label()}
        customizable="true"
        class={`browser-toolbar`}
        style={{
          display: manager.showStatusBar() ? "flex" : "none",
          alignItems: "center",
          width: "100%",
          borderTop: "1px solid var(--chrome-content-separator-color)",
          background: "var(--panel-sidebar-background-color)",
        }}
        mode="icons"
        context="toolbar-context-menu"
        accesskey="A"
      >
        <xul:hbox
          id="status-text"
          role="status"
          aria-live="polite"
          align="center"
          flex="1"
          class="status-text"
        />
      </xul:toolbar>
      <style class="nora-statusbar-utils" jsx>
        {statusbarUtilsStyle}
      </style>
    </>
  );
}
