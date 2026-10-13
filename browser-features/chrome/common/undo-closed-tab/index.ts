/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { noraComponent, NoraComponentBase } from "../../utils/base.ts";
import { createRootHMR } from "@nora/solid-xul";
import { addI18nObserver } from "#i18n/config-browser-chrome.ts";
import { StyleElement } from "./styleElem.tsx";
import { BrowserActionUtils } from "../../utils/browser-action.tsx";
import i18next from "i18next";
import { createSignal } from "solid-js";

const { CustomizableUI } = ChromeUtils.importESModule(
  "moz-src:///browser/components/customizableui/CustomizableUI.sys.mjs",
);

declare global {
  interface Window {
    undoCloseTab: () => void;
  }
}

type UndoClosedTabTexts = {
  buttonLabel: string;
  tooltipText: string;
};

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
    console.warn("[UndoClosedTab] announce status message failed:", err);
  }
}

const isMac = typeof Services !== "undefined" && Services.appinfo?.OS === "Darwin";
const defaultShortcut = isMac ? "(⌘⇧T)" : "(Ctrl+Shift+T)";

const defaultTexts: UndoClosedTabTexts = {
  buttonLabel: "Undo Closed Tab",
  tooltipText: `Reopen the last closed tab ${defaultShortcut}`,
};

const BROWSER_WINDOW_TYPE = "navigator:browser";

function triggerUndoClosedTabForActiveWindow(): void {
  try {
    const browserWindow = Services.wm.getMostRecentWindow(
      BROWSER_WINDOW_TYPE,
    ) as Window | null;

    (
      globalThis as unknown as {
        SessionWindowUI: { undoCloseTab: (w: Window | null) => void };
      }
    ).SessionWindowUI.undoCloseTab(browserWindow);

    const restoredTab = (browserWindow as unknown as { gBrowser?: { selectedTab?: { label?: string } } })?.gBrowser?.selectedTab;
    const tabTitle = restoredTab?.label || i18next.t("undo-closed-tab.tab_label", { defaultValue: "Tab" });
    announceA11y(
      i18next.t("undo-closed-tab.restored", {
        defaultValue: `Restored closed tab: ${tabTitle}`,
        title: tabTitle,
      }),
    );
  } catch (error) {
    console.error("[undo-closed-tab] Failed to trigger undoCloseTab status message:", error);
  }
}

@noraComponent(import.meta.hot)
export default class UndoClosedTab extends NoraComponentBase {
  init() {
    BrowserActionUtils.createToolbarClickActionButton(
      "undo-closed-tab",
      null,
      triggerUndoClosedTabForActiveWindow,
      StyleElement(),
      CustomizableUI.AREA_NAVBAR,
      3,
      (aNode: XULElement) => {
        const tooltip = document?.createXULElement("tooltip") as XULElement;
        tooltip.id = "undo-closed-tab-tooltip";
        tooltip.setAttribute("hasbeenopened", "false");

        document?.getElementById("mainPopupSet")?.appendChild(tooltip);

        aNode.setAttribute("tooltip", "undo-closed-tab-tooltip");

        createRootHMR(
          () => {
            const getTexts = (): UndoClosedTabTexts => ({
              buttonLabel: i18next.t("undo-closed-tab.label", {
                defaultValue: "Undo Closed Tab",
              }),
              tooltipText: i18next.t("undo-closed-tab.tooltiptext", {
                shortcut: defaultShortcut,
                defaultValue: `Reopen the last closed tab ${defaultShortcut}`,
              }),
            });

            const [texts, setTexts] =
              createSignal<UndoClosedTabTexts>(getTexts());

            const applyTexts = (t: UndoClosedTabTexts) => {
              aNode.setAttribute("role", "button");
              aNode.setAttribute("label", t.buttonLabel);
              aNode.setAttribute("aria-label", t.buttonLabel);
              tooltip.setAttribute("label", t.tooltipText);
            };

            applyTexts(texts());

            addI18nObserver(() => {
              const updated = getTexts();
              setTexts(updated);
              applyTexts(updated);
            });
          },
          import.meta.hot,
        );
      },
    );
  }
}
