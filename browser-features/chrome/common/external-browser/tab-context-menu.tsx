/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { render } from "@nora/solid-xul";
import i18next from "i18next";
import { addI18nObserver } from "#i18n/config-browser-chrome.ts";
import { externalBrowserService } from "./external-browser-service.ts";
import type { ExternalBrowser } from "./types.ts";

const MENU_ID = "context_openInExternalBrowser";
const MENU_POPUP_ID = "context_openInExternalBrowser_popup";
const MARKER_ID = "context_moveTabOptions";

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
    console.warn("[ExternalBrowserTabContextMenu] announce status message failed:", err);
  }
}

/**
 * Tab context menu for opening current tab in external browser
 */
export class ExternalBrowserTabContextMenu {
  private cachedBrowsers: ExternalBrowser[] = [];

  constructor() {
    const parentElem = document?.getElementById("tabContextMenu");
    if (!parentElem) {
      console.error(
        "[ExternalBrowserTabContextMenu] #tabContextMenu not found; skip menu injection.",
      );
      return;
    }

    const marker = document?.getElementById(MARKER_ID);

    try {
      render(() => this.menu(), parentElem, {
        marker: marker?.parentElement === parentElem ? marker : undefined,
      });
    } catch (error) {
      const reason = error instanceof Error ? error : new Error(String(error));
      console.error(
        "[ExternalBrowserTabContextMenu] Failed to render context menu status message.",
        reason,
      );
      return;
    }

    // Load browsers on init
    this.loadBrowsers();

    addI18nObserver(() => {
      this.updateLabels();
    });
  }

  private async loadBrowsers(): Promise<void> {
    try {
      this.cachedBrowsers = await externalBrowserService.getInstalledBrowsers();
    } catch (error) {
      console.error(
        "[ExternalBrowserTabContextMenu] Failed to load browsers status message:",
        error,
      );
      this.cachedBrowsers = [];
    }
  }

  private updateLabels(): void {
    const menuElem = document?.getElementById(MENU_ID);
    if (menuElem) {
      menuElem.setAttribute("label", t("externalBrowser.menu.openTabIn"));
    }
  }

  private menu() {
    return (
      <xul:menu
        id={MENU_ID}
        label={t("externalBrowser.menu.openTabIn")}
        data-floorp-context-menu-key="floorp.external-browser.open-tab"
      >
        <xul:menupopup
          id={MENU_POPUP_ID}
          onPopupShowing={() => this.populateMenu()}
        />
      </xul:menu>
    );
  }

  private populateMenu(): void {
    const popup = document?.getElementById(MENU_POPUP_ID) as XULElement | null;
    if (!popup) {
      return;
    }

    // Clear existing items
    while (popup.firstChild) {
      popup.removeChild(popup.firstChild);
    }

    // Refresh browsers list in background for subsequent openings
    void this.loadBrowsers();

    // Get the URL of the context tab
    const contextTab = globalThis.TabContextMenu.contextTab;
    const browser = globalThis.gBrowser.getBrowserForTab(contextTab);
    const url = browser?.currentURI?.spec || "";

    if (!url || url === "about:blank" || url === "about:newtab") {
      const emptyItem = this.createMenuItem(
        t("externalBrowser.menu.noValidUrl"),
        true,
      );
      if (emptyItem) {
        popup.appendChild(emptyItem);
      }
      return;
    }

    if (this.cachedBrowsers.length === 0) {
      const emptyItem = this.createMenuItem(
        t("externalBrowser.menu.noBrowsers"),
        true,
      );
      if (emptyItem) {
        popup.appendChild(emptyItem);
      }
      return;
    }

    // Add "Open in default browser" option
    const defaultItem = this.createMenuItem(
      t("externalBrowser.menu.defaultBrowser"),
      false,
      () => this.openInBrowser(url),
      "floorp.external-browser.tab.default",
    );
    if (defaultItem) {
      popup.appendChild(defaultItem);
    }

    // Add separator
    const separator = document?.createXULElement?.("menuseparator");
    if (separator) {
      separator.setAttribute(
        "data-floorp-context-menu-key",
        "floorp.external-browser.tab.separator",
      );
      popup.appendChild(separator);
    }

    // Add each detected browser
    for (const browserInfo of this.cachedBrowsers) {
      const menuItem = this.createMenuItem(
        browserInfo.name,
        false,
        () => this.openInBrowser(url, browserInfo.id),
        `floorp.external-browser.tab.browser.${
          encodeURIComponent(String(browserInfo.id))
        }`,
      );
      if (menuItem) {
        popup.appendChild(menuItem);
      }
    }
  }

  private createMenuItem(
    label: string,
    disabled: boolean,
    onClick?: () => void,
    contextMenuKey?: string,
  ): XULElement | null {
    const menuitem = document?.createXULElement?.("menuitem") as
      | XULElement
      | undefined;
    if (!menuitem) {
      return null;
    }
    menuitem.setAttribute("label", label);
    if (label) {
      const firstChar = label.trim().charAt(0).toUpperCase();
      if (/^[A-Z0-9]$/.test(firstChar)) {
        menuitem.setAttribute("accesskey", firstChar);
      }
    }
    if (contextMenuKey) {
      menuitem.setAttribute("data-floorp-context-menu-key", contextMenuKey);
    }
    if (disabled) {
      menuitem.setAttribute("disabled", "true");
    }
    if (onClick) {
      menuitem.addEventListener("command", onClick);
    }
    return menuitem;
  }

  private async openInBrowser(url: string, browserId?: string): Promise<void> {
    try {
      const result = browserId
        ? await externalBrowserService.openUrl(url, browserId)
        : await externalBrowserService.openInDefaultBrowser(url);

      if (!result.success) {
        console.error(
          "[ExternalBrowserTabContextMenu] Failed to open URL:",
          result.error,
        );
        announceA11y(t("externalBrowser.menu.launchFailed"));
      }
    } catch (error) {
      console.error(
        "[ExternalBrowserTabContextMenu] Error opening URL status message:",
        error,
      );
      announceA11y(t("externalBrowser.menu.launchFailed"));
    }
  }
}
