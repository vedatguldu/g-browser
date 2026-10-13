/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createEffect, onCleanup } from "solid-js";
import { MULTIROW_TABBAR_BASE_CSS } from "./multirow-tabbar-css.ts";
import { getTabsToolbar, resolveTabsContainer } from "./dom-utils.ts";
import { PinnedTabController } from "./pinned-tab-controller.ts";
import { TabDragDropManager } from "./tab-drag-drop-manager.ts";
import { config } from "../../designs/configs.ts";

// deno-lint-ignore no-explicit-any
declare function makeURI(uri: string): any;
declare const window: Window & {
  getComputedStyle(element: Element): CSSStyleDeclaration;
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
    console.warn("[MultirowTabbar] announce status message failed:", err);
  }
}

export class MultirowTabbarClass {
  private readonly pinnedTabs = new PinnedTabController(resolveTabsContainer);
  private readonly dragDropManager = new TabDragDropManager(
    resolveTabsContainer,
    this.pinnedTabs,
  );
  private styleElement: HTMLStyleElement | null = null;
  // deno-lint-ignore no-explicit-any
  private agentSheetUri: any = null;
  private isEnabled = false;

  constructor() {
    this.setupReactiveMultirow();
  }

  private setupReactiveMultirow(): void {
    const arrowScrollbox = resolveTabsContainer();
    if (!arrowScrollbox) {
      return;
    }

    createEffect(() => {
      const isMultirowStyle = config().tabbar.tabbarStyle === "multirow";

      if (isMultirowStyle && !this.isEnabled) {
        // Enable multirow tabbar
        this.enableMultiRowTabs(arrowScrollbox);
      } else if (!isMultirowStyle && this.isEnabled) {
        // Disable multirow tabbar
        this.disableMultiRowTabs();
      }

      // Update max rows CSS if multirow is enabled
      if (isMultirowStyle) {
        const multiRowConfig = config().tabbar.multiRowTabBar;
        const maxRowEnabled = multiRowConfig.maxRowEnabled ?? false;
        const maxRows = multiRowConfig.maxRow ?? 3;
        this.updateMaxRowsCSS(arrowScrollbox, maxRowEnabled, maxRows);
      }
    });

    onCleanup(() => {
      this.cleanup();
    });
  }

  private enableMultiRowTabs(arrowScrollbox: XULElement): void {
    getTabsToolbar()?.setAttribute("multibar", "true");
    this.injectCSS(arrowScrollbox);
    this.dragDropManager.install(arrowScrollbox);
    window?.addEventListener("keydown", this.handleKeyDown, true);
    this.isEnabled = true;
  }

  private disableMultiRowTabs(): void {
    getTabsToolbar()?.removeAttribute("multibar");
    window?.removeEventListener("keydown", this.handleKeyDown, true);

    // Remove injected style
    if (this.styleElement && this.styleElement.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
      this.styleElement = null;
    }

    // Uninstall drag drop manager
    this.dragDropManager.uninstall();

    // Unregister pinned tabs
    this.pinnedTabs.unregister();

    // Remove agent sheet
    if (this.agentSheetUri) {
      try {
        const sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(
          Ci.nsIStyleSheetService,
        );
        if (sss.sheetRegistered(this.agentSheetUri, sss.AGENT_SHEET!)) {
          sss.unregisterSheet(this.agentSheetUri, sss.AGENT_SHEET!);
        }
        this.agentSheetUri = null;
      } catch (e) {
        console.error("Failed to unregister sheet status message:", e);
      }
    }

    this.isEnabled = false;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const isMoveCommand = (e.ctrlKey || e.metaKey) && e.shiftKey;
    if (!isMoveCommand && (e.altKey || e.ctrlKey || e.metaKey)) return;

    const focused = document?.activeElement;
    const currentTab = focused?.closest?.(".tabbrowser-tab") as HTMLElement | null;
    if (!currentTab) return;

    const tabsToolbar = getTabsToolbar();
    if (!tabsToolbar || tabsToolbar.getAttribute("multibar") !== "true") return;

    const allTabs = Array.from(
      document.querySelectorAll<HTMLElement>("#tabbrowser-tabs .tabbrowser-tab:not([hidden])"),
    );
    if (allTabs.length <= 1) return;

    const currentRect = currentTab.getBoundingClientRect();
    const currentCenter = currentRect.left + currentRect.width / 2;

    let bestTab: HTMLElement | null = null;
    let bestDist = Infinity;

    if (e.key === "ArrowDown") {
      let minRowTop = Infinity;
      const belowTabs: HTMLElement[] = [];
      for (const tab of allTabs) {
        const rect = tab.getBoundingClientRect();
        if (rect.top >= currentRect.bottom - 2) {
          if (rect.top < minRowTop) {
            minRowTop = rect.top;
          }
          belowTabs.push(tab);
        }
      }
      for (const tab of belowTabs) {
        const rect = tab.getBoundingClientRect();
        if (Math.abs(rect.top - minRowTop) <= 10) {
          const center = rect.left + rect.width / 2;
          const dist = Math.abs(center - currentCenter);
          if (dist < bestDist) {
            bestDist = dist;
            bestTab = tab;
          }
        }
      }
    } else if (e.key === "ArrowUp") {
      let maxRowBottom = -Infinity;
      const aboveTabs: HTMLElement[] = [];
      for (const tab of allTabs) {
        const rect = tab.getBoundingClientRect();
        if (rect.bottom <= currentRect.top + 2) {
          if (rect.bottom > maxRowBottom) {
            maxRowBottom = rect.bottom;
          }
          aboveTabs.push(tab);
        }
      }
      for (const tab of aboveTabs) {
        const rect = tab.getBoundingClientRect();
        if (Math.abs(rect.bottom - maxRowBottom) <= 10) {
          const center = rect.left + rect.width / 2;
          const dist = Math.abs(center - currentCenter);
          if (dist < bestDist) {
            bestDist = dist;
            bestTab = tab;
          }
        }
      }
    }

    if (bestTab) {
      e.preventDefault();
      e.stopPropagation();
      // deno-lint-ignore no-explicit-any
      const gBrowser = (window as any).gBrowser;
      if (isMoveCommand) {
        if (gBrowser) {
          const allTabsList = Array.from(gBrowser.tabs as HTMLElement[]);
          const targetIndex = allTabsList.indexOf(bestTab);
          if (targetIndex >= 0) {
            gBrowser.moveTabTo(currentTab, targetIndex);
            currentTab.focus();
            const dir = e.key === "ArrowUp" ? "üst" : "alt";
            announceA11y(`Sekme ${dir} satıra taşındı. Yeni sıra: ${targetIndex + 1}`);
          }
        }
        return;
      }
      bestTab.focus();
      if (gBrowser && !e.shiftKey) {
        gBrowser.selectedTab = bestTab;
      }
    }
  };

  private updateMaxRowsCSS(
    _arrowScrollbox: XULElement,
    maxRowEnabled: boolean,
    maxRows: number,
  ): void {
    if (this.agentSheetUri) {
      try {
        const sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(
          Ci.nsIStyleSheetService,
        );
        if (sss.sheetRegistered(this.agentSheetUri, sss.AGENT_SHEET!)) {
          sss.unregisterSheet(this.agentSheetUri, sss.AGENT_SHEET!);
        }
      } catch (e) {
        console.error("Failed to unregister sheet status message:", e);
      }
    }

    const css = this.generateMaxRowsCSS(maxRowEnabled, maxRows);
    const sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(
      Ci.nsIStyleSheetService,
    );
    this.agentSheetUri = makeURI(
      "data:text/css;charset=UTF=8," + encodeURIComponent(css),
    );
    sss.loadAndRegisterSheet(this.agentSheetUri, sss.AGENT_SHEET!);
  }

  private generateMaxRowsCSS(maxRowEnabled: boolean, maxRows: number): string {
    let css = MULTIROW_TABBAR_BASE_CSS;

    css += `
      scrollbar, #tab-scrollbox-resizer {-moz-window-dragging: no-drag !important}

      #tabbrowser-tabs > arrowscrollbox {
        overflow: visible;
        display: block;`;

    if (maxRowEnabled && maxRows > 0) {
      const tabElement = document?.querySelector(".tabbrowser-tab");
      const tabHeight = tabElement?.clientHeight || 33;
      const maxHeight = tabHeight * maxRows;
      css += `
        max-height: ${maxHeight}px;
        overflow-y: auto;`;
    }

    css += `
      }
    `;

    return css;
  }

  private cleanup(): void {
    // HMR/dispose path: ensure the drag-drop manager's monkey-patches and
    // capture-phase listeners are torn down. Without this, hot-updating the
    // tabbar leaves stale drop-method overrides and duplicate capture-phase
    // listeners on `gBrowser.tabContainer`, which is the root cause of "old
    // behavior persists after edit" symptoms.
    if (this.isEnabled) {
      try {
        this.disableMultiRowTabs();
      } catch (e) {
        console.error(
          "[MultirowTabbar] Failed to disable multi-row tabs during cleanup status message:",
          e,
        );
      }
    }
    if (this.agentSheetUri) {
      try {
        const sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(
          Ci.nsIStyleSheetService,
        );
        if (sss.sheetRegistered(this.agentSheetUri, sss.AGENT_SHEET!)) {
          sss.unregisterSheet(this.agentSheetUri, sss.AGENT_SHEET!);
        }
      } catch (e) {
        console.error("Failed to cleanup sheet status message:", e);
      }
    }
  }

  private injectCSS(arrowScrollbox: XULElement): void {
    if (!document || !window) return;

    this.pinnedTabs.register();
    const style = document.createElement("style");
    const scrollboxStyle = `
        .scrollbox-clip {
            overflow: visible;
            display: block}

        scrollbox {
            display: flex;
            flex-wrap: wrap;
            min-height: var(--tab-min-height);
        }

        scrollbox > slot {
            flex-wrap: wrap;
        }

	    .arrowscrollbox-overflow-start-indicator,
	    .arrowscrollbox-overflow-end-indicator {position: fixed !important}

	    .scrollbutton-up, .scrollbutton-down, spacer,
        #scrollbutton-up, #scrollbutton-down {display: none !important}
	    `;

    style.innerHTML = scrollboxStyle;
    arrowScrollbox?.shadowRoot?.appendChild(style);
    this.styleElement = style;
  }
}
