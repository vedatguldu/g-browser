/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { BrowserActionUtils } from "#features-chrome/utils/browser-action";
import iconStyle from "./icon.css?inline";
import { addI18nObserver } from "#i18n/config-browser-chrome.ts";
import i18next from "i18next";

import type { TCustomizableUI } from "@types-gecko/CustomizableUI";

const { CustomizableUI } = ChromeUtils.importESModule(
  "moz-src:///browser/components/customizableui/CustomizableUI.sys.mjs",
) as { CustomizableUI: typeof TCustomizableUI };

function announceA11y(text: string): void {
  try {
    const doc = globalThis.document;
    if (!doc) return;
    let announcer = doc.getElementById("floorp-a11y-live-announcer");
    if (!announcer) {
      announcer = doc.createElement("div");
      announcer.id = "floorp-a11y-live-announcer";
      announcer.setAttribute("role", "status");
      announcer.setAttribute("aria-live", "polite");
      announcer.setAttribute("aria-atomic", "true");
      (announcer as HTMLElement).style.cssText =
        "position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important;";
      (doc.body ?? doc.documentElement)?.appendChild(announcer);
    }
    announcer.textContent = "";
    globalThis.setTimeout(() => {
      if (announcer) {
        announcer.textContent = text;
      }
    }, 50);
  } catch (err) {
    console.warn("[ReverseSidebarPosition] announce status message failed:", err);
  }
}

export class ReverseSidebarPosition {
  private StyleElement = () => {
    return <style>{iconStyle}</style>;
  };
  private updateButtonState: (() => void) | null = null;

  constructor() {
    BrowserActionUtils.createToolbarClickActionButton(
      "sidebar-reverse-position-toolbar",
      "sidebar-reverse-position-toolbar",
      () => {
        try {
          globalThis.SidebarController?.reversePosition?.();
          const isRight = typeof Services !== "undefined"
            ? Services.prefs?.getBoolPref("sidebar.position_start", true) === false
            : false;
          const announcement = isRight
            ? i18next.t("reverseSidebar.movedRight", {
                defaultValue: "Sidebar moved to right side",
              })
            : i18next.t("reverseSidebar.movedLeft", {
                defaultValue: "Sidebar moved to left side",
              });
          announceA11y(announcement);
          this.updateButtonState?.();
        } catch (error) {
          console.error(
            "[reverse-sidebar-position] Failed to reverse position status message:",
            error,
          );
        }
      },
      this.StyleElement(),
      CustomizableUI.AREA_NAVBAR,
      1,
      (aNode: XULElement) => {
        const updateLabels = () => {
          const isRight = typeof Services !== "undefined"
            ? Services.prefs?.getBoolPref("sidebar.position_start", true) === false
            : false;
          const label = isRight
            ? i18next.t("reverseSidebar.moveToLeft", {
                defaultValue: "Move sidebar to left",
              })
            : i18next.t("reverseSidebar.moveToRight", {
                defaultValue: "Move sidebar to right",
              });
          const tooltip = i18next.t("reverseSidebar.tooltiptext", {
            defaultValue: "Move sidebar to the other side of the window",
          });
          aNode.setAttribute("role", "button");
          aNode.setAttribute("aria-pressed", isRight ? "true" : "false");
          aNode.setAttribute("label", label);
          aNode.setAttribute("aria-label", label);
          aNode.setAttribute("tooltiptext", tooltip);
        };

        this.updateButtonState = updateLabels;
        updateLabels();
        addI18nObserver(updateLabels);

        // Sidebar button placement check
        if (!CustomizableUI.getPlacementOfWidget("sidebar-button")) {
          CustomizableUI.addWidgetToArea(
            "sidebar-button",
            CustomizableUI.AREA_NAVBAR,
          );
        }
      },
    );
  }
}
