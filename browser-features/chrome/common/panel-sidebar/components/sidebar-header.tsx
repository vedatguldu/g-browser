/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Show } from "solid-js";
import i18next from "i18next";
import {
  isFloating,
  selectedPanelId,
  setIsFloating,
} from "../data/data";
import { PanelNavigator } from "../panel-navigator";
import type { CPanelSidebar } from "./panel-sidebar";

export function SidebarHeader(props: { ctx: CPanelSidebar }) {
  const gPanelSidebar = props.ctx;
  (PanelNavigator as { gPanelSidebar: CPanelSidebar }).gPanelSidebar =
    gPanelSidebar;
  return (
    <xul:box
      id="panel-sidebar-header"
      align="center"
      role="toolbar"
      aria-label={i18next.t("panelSidebar.header.toolbar", {
        defaultValue: "Panel sidebar controls",
      })}
    >
      <Show
        when={gPanelSidebar.getPanelData(selectedPanelId() ?? "")?.type ===
          "web"}
      >
        <xul:toolbarbutton
          id="panel-sidebar-back"
          class="panel-sidebar-actions toolbarbutton-1 chromeclass-toolbar-additional"
          label={i18next.t("panelSidebar.header.back", {
            defaultValue: "Back",
          })}
          tooltiptext={i18next.t("panelSidebar.header.back", {
            defaultValue: "Back",
          })}
          aria-label={i18next.t("panelSidebar.header.back", {
            defaultValue: "Back",
          })}
          onCommand={() => PanelNavigator.back(selectedPanelId() ?? "")}
        />
        <xul:toolbarbutton
          id="panel-sidebar-forward"
          class="panel-sidebar-actions"
          label={i18next.t("panelSidebar.header.forward", {
            defaultValue: "Forward",
          })}
          tooltiptext={i18next.t("panelSidebar.header.forward", {
            defaultValue: "Forward",
          })}
          aria-label={i18next.t("panelSidebar.header.forward", {
            defaultValue: "Forward",
          })}
          onCommand={() => PanelNavigator.forward(selectedPanelId() ?? "")}
        />
        <xul:toolbarbutton
          id="panel-sidebar-reload"
          class="panel-sidebar-actions"
          label={i18next.t("panelSidebar.header.reload", {
            defaultValue: "Reload",
          })}
          tooltiptext={i18next.t("panelSidebar.header.reload", {
            defaultValue: "Reload",
          })}
          aria-label={i18next.t("panelSidebar.header.reload", {
            defaultValue: "Reload",
          })}
          onCommand={() => PanelNavigator.reload(selectedPanelId() ?? "")}
        />
        <xul:toolbarbutton
          id="panel-sidebar-go-index"
          class="panel-sidebar-actions"
          label={i18next.t("panelSidebar.header.goIndex", {
            defaultValue: "Go to initial page",
          })}
          tooltiptext={i18next.t("panelSidebar.header.goIndex", {
            defaultValue: "Go to initial page",
          })}
          aria-label={i18next.t("panelSidebar.header.goIndex", {
            defaultValue: "Go to initial page",
          })}
          onCommand={() => PanelNavigator.goIndexPage(selectedPanelId() ?? "")}
        />
      </Show>
      <xul:spacer flex="1" />
      <xul:toolbarbutton
        id="panel-sidebar-float"
        class="panel-sidebar-actions"
        label={isFloating()
          ? i18next.t("panelSidebar.header.unfloat", {
            defaultValue: "Dock panel",
          })
          : i18next.t("panelSidebar.header.float", {
            defaultValue: "Float panel",
          })}
        tooltiptext={isFloating()
          ? i18next.t("panelSidebar.header.unfloat", {
            defaultValue: "Dock panel",
          })
          : i18next.t("panelSidebar.header.float", {
            defaultValue: "Float panel",
          })}
        aria-label={isFloating()
          ? i18next.t("panelSidebar.header.unfloat", {
            defaultValue: "Dock panel",
          })
          : i18next.t("panelSidebar.header.float", {
            defaultValue: "Float panel",
          })}
        aria-pressed={isFloating() ? "true" : "false"}
        onCommand={() => setIsFloating(!isFloating())}
      />
      <Show
        when={gPanelSidebar.getPanelData(selectedPanelId() ?? "")?.type ===
          "web"}
      >
        <xul:toolbarbutton
          id="panel-sidebar-open-in-main-window"
          class="panel-sidebar-actions"
          label={i18next.t("panelSidebar.header.openInMainWindow", {
            defaultValue: "Open in main window",
          })}
          tooltiptext={i18next.t("panelSidebar.header.openInMainWindow", {
            defaultValue: "Open in main window",
          })}
          aria-label={i18next.t("panelSidebar.header.openInMainWindow", {
            defaultValue: "Open in main window",
          })}
          onCommand={() =>
            gPanelSidebar.openInMainWindow(selectedPanelId() ?? "")}
        />
      </Show>
      <xul:toolbarbutton
        id="panel-sidebar-close"
        class="panel-sidebar-actions"
        label={i18next.t("panelSidebar.header.close", {
          defaultValue: "Close panel",
        })}
        tooltiptext={i18next.t("panelSidebar.header.close", {
          defaultValue: "Close panel",
        })}
        aria-label={i18next.t("panelSidebar.header.close", {
          defaultValue: "Close panel",
        })}
        onCommand={() => gPanelSidebar.closePanel()}
      />
    </xul:box>
  );
}
