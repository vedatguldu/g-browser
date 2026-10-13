/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { For, createSignal } from "solid-js";
import i18next from "i18next";
import { addI18nObserver } from "#i18n/config-browser-chrome.ts";
import { panelSidebarData } from "../data/data";
import { PanelSidebarButton } from "./sidebar-panel-button";
import { showPanelSidebarAddModal } from "./panel-sidebar-modal";
import type { CPanelSidebar } from "./panel-sidebar";
import { WorkspacesPanels } from "../../workspaces/toolbar/workspaces-panels.tsx";

export function SidebarSelectbox(props: { ctx: CPanelSidebar }) {
  const getTranslations = () => ({
    add: i18next.t("panelSidebar.buttons.add", { defaultValue: "Add web panel" }),
    addons: i18next.t("panelSidebar.buttons.addons", { defaultValue: "Add-ons" }),
    passwords: i18next.t("panelSidebar.buttons.passwords", { defaultValue: "Passwords" }),
    preferences: i18next.t("panelSidebar.buttons.preferences", { defaultValue: "Settings" }),
  });

  const [labels, setLabels] = createSignal(getTranslations());

  addI18nObserver(() => {
    setLabels(getTranslations());
  });

  return (
    <xul:vbox
      id="panel-sidebar-select-box"
      class="webpanel-box chromeclass-extrachrome chromeclass-directories instant customization-target"
    >
      <WorkspacesPanels />
      <For each={panelSidebarData()}>
        {(panel) => <PanelSidebarButton panel={panel} ctx={props.ctx} />}
      </For>
      <xul:toolbarbutton
        id="panel-sidebar-add"
        class="panel-sidebar-panel"
        label={labels().add}
        tooltiptext={labels().add}
        aria-label={labels().add}
        onCommand={() => {
          showPanelSidebarAddModal();
        }}
      />
      <xul:spacer flex="1" />
      <xul:vbox id="panel-sidebar-bottomButtonBox">
        <xul:toolbarbutton
          class="panel-sidebar-panel"
          label={labels().addons}
          tooltiptext={labels().addons}
          aria-label={labels().addons}
          onCommand={() =>
            globalThis.BrowserAddonUI.openAddonsMgr("addons://list/extension")}
          id="panel-sidebar-addons-icon"
        />
        <xul:toolbarbutton
          class="panel-sidebar-panel"
          label={labels().passwords}
          tooltiptext={labels().passwords}
          aria-label={labels().passwords}
          onCommand={() =>
            globalThis.gBrowser.addTrustedTab("about:logins", {
              inBackground: false,
            })}
          id="panel-sidebar-passwords-icon"
        />
        <xul:toolbarbutton
          class="panel-sidebar-panel"
          label={labels().preferences}
          tooltiptext={labels().preferences}
          aria-label={labels().preferences}
          onCommand={() => globalThis.openPreferences()}
          id="panel-sidebar-preferences-icon"
        />
      </xul:vbox>
    </xul:vbox>
  );
}
