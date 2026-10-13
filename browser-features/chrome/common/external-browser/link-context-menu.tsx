/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { render } from "@nora/solid-xul";
import i18next from "i18next";
import { addI18nObserver } from "#i18n/config-browser-chrome.ts";
import { ContextMenuUtils } from "#features-chrome/utils/context-menu.tsx";
import { externalBrowserService } from "./external-browser-service.ts";
import type { ExternalBrowser } from "./types.ts";

const MENU_ID = "context_openLinkInExternalBrowser";
const MENU_POPUP_ID = "context_openLinkInExternalBrowser_popup";
const LINK_OPEN_MENU_ID = "context-openlink";

type UnloadTarget = Pick<
  EventTarget,
  "addEventListener" | "removeEventListener"
>;

export type ExternalBrowserLinkContextMenuOptions = {
  unloadTarget?: UnloadTarget;
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
    console.warn("[ExternalBrowserLinkContextMenu] announce status message failed:", err);
  }
}

/**
 * Link context menu for opening links in external browser
 */
export class ExternalBrowserLinkContextMenu {
  private cachedBrowsers: ExternalBrowser[] = [];
  private observer: MutationObserver | null = null;
  private readonly contentContextMenu: XULElement | null = null;
  private readonly boundUpdateVisibility = () => this.updateVisibility();
  private readonly unloadTarget: UnloadTarget;
  private readonly boundCleanup = () => this.cleanup();

  constructor(options: ExternalBrowserLinkContextMenuOptions = {}) {
    this.unloadTarget = options.unloadTarget ?? globalThis;

    if (typeof document === "undefined") {
      return;
    }

    this.contentContextMenu = ContextMenuUtils.contentAreaContextMenu();
    if (!this.contentContextMenu) {
      console.error(
        "[ExternalBrowserLinkContextMenu] #contentAreaContextMenu not found; skip menu injection.",
      );
      return;
    }

    const marker = document?.getElementById(LINK_OPEN_MENU_ID) ?? undefined;

    try {
      render(() => this.menu(), this.contentContextMenu, {
        marker,
      });
    } catch (error) {
      const reason = error instanceof Error ? error : new Error(String(error));
      console.error(
        "[ExternalBrowserLinkContextMenu] Failed to render link context menu status message.",
        reason,
      );
      return;
    }

    // Load browsers on init
    this.loadBrowsers();

    this.updateVisibility();

    // Observe changes to the open link menu item to sync visibility
    const openLinkElement = document?.getElementById(LINK_OPEN_MENU_ID);
    if (openLinkElement) {
      this.observer = new MutationObserver(this.boundUpdateVisibility);
      this.observer.observe(openLinkElement, {
        attributes: true,
        attributeFilter: ["hidden", "disabled"],
      });
    }

    this.contentContextMenu.addEventListener(
      "popupshowing",
      this.boundUpdateVisibility,
    );

    this.unloadTarget.addEventListener(
      "unload",
      this.boundCleanup,
      { once: true },
    );

    addI18nObserver(() => {
      this.updateLabels();
    });
  }

  private cleanup(): void {
    this.unloadTarget.removeEventListener("unload", this.boundCleanup);
    this.observer?.disconnect();
    this.observer = null;
    this.contentContextMenu?.removeEventListener(
      "popupshowing",
      this.boundUpdateVisibility,
    );
  }

  private async loadBrowsers(): Promise<void> {
    try {
      this.cachedBrowsers = await externalBrowserService.getInstalledBrowsers();
    } catch (error) {
      console.error(
        "[ExternalBrowserLinkContextMenu] Failed to load browsers status message:",
        error,
      );
      this.cachedBrowsers = [];
    }
  }

  private updateLabels(): void {
    const menuElem = document?.getElementById(MENU_ID);
    if (menuElem) {
      menuElem.setAttribute("label", t("externalBrowser.menu.openLinkIn"));
    }
  }

  private updateVisibility(): void {
    const menu = document?.getElementById(MENU_ID) as XULElement | null;
    const openLink = document?.getElementById(LINK_OPEN_MENU_ID) as
      | XULElement
      | null;

    if (!menu) {
      return;
    }

    if (!openLink) {
      menu.hidden = true;
      return;
    }

    const hasLink = Boolean(globalThis.gContextMenu?.linkURL);
    const isOpenLinkHidden = Boolean(
      openLink.getAttribute("hidden") === "true" ||
        openLink.hasAttribute("hidden"),
    );

    const shouldHide = isOpenLinkHidden || !hasLink;
    menu.hidden = shouldHide;
  }

  private menu() {
    return (
      <xul:menu
        id={MENU_ID}
        label={t("externalBrowser.menu.openLinkIn")}
        data-floorp-context-menu-key="floorp.external-browser.open-link"
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

    // Get the link URL from context menu
    const url = globalThis.gContextMenu?.linkURL;

    if (!url) {
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
      "floorp.external-browser.link.default",
    );
    if (defaultItem) {
      popup.appendChild(defaultItem);
    }

    // Add separator
    const separator = document?.createXULElement?.("menuseparator");
    if (separator) {
      separator.setAttribute(
        "data-floorp-context-menu-key",
        "floorp.external-browser.link.separator",
      );
      popup.appendChild(separator);
    }

    // Add each detected browser
    for (const browserInfo of this.cachedBrowsers) {
      const menuItem = this.createMenuItem(
        browserInfo.name,
        false,
        () => this.openInBrowser(url, browserInfo.id),
        `floorp.external-browser.link.browser.${
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
          "[ExternalBrowserLinkContextMenu] Failed to open URL:",
          result.error,
        );
        announceA11y(t("externalBrowser.menu.launchFailed"));
      }
    } catch (error) {
      console.error(
        "[ExternalBrowserLinkContextMenu] Error opening URL status message:",
        error,
      );
      announceA11y(t("externalBrowser.menu.launchFailed"));
    }
  }
}
