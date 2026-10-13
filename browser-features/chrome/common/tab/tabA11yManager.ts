/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import i18next from "i18next";

export class TabA11yManager {
  private container: Element | null = null;
  private prevMutedStates = new WeakMap<Element, boolean>();

  constructor() {
    this.init();
  }

  private init(): void {
    const gBrowser = (globalThis as unknown as {
      gBrowser?: { tabContainer?: Element; tabs?: Element[] };
    }).gBrowser;
    if (!gBrowser?.tabContainer) {
      return;
    }

    this.container = gBrowser.tabContainer;
    this.container.addEventListener(
      "TabAttrModified",
      this.handleTabAttrModified,
    );
    this.container.addEventListener("TabOpen", this.handleTabOpen);

    // Initial update for already open tabs
    if (Array.isArray(gBrowser.tabs)) {
      for (const tab of gBrowser.tabs) {
        this.updateTabA11y(tab);
      }
    }
  }

  public destroy(): void {
    if (this.container) {
      this.container.removeEventListener(
        "TabAttrModified",
        this.handleTabAttrModified,
      );
      this.container.removeEventListener("TabOpen", this.handleTabOpen);
      this.container = null;
    }
  }

  private handleTabOpen = (event: Event): void => {
    const tab = event.target as Element;
    if (tab) {
      this.updateTabA11y(tab);
    }
  };

  private handleTabAttrModified = (event: Event): void => {
    const tab = event.target as Element;
    if (!tab) return;

    this.checkMuteAnnouncement(tab);
    this.updateTabA11y(tab);
  };

  private checkMuteAnnouncement(tab: Element): void {
    const isMuted = tab.hasAttribute("muted");
    const wasMuted = this.prevMutedStates.get(tab);

    if (wasMuted !== undefined && wasMuted !== isMuted) {
      const msg = isMuted
        ? i18next.t("tabA11y.mutedAnnouncement", {
            defaultValue: "Tab audio muted",
          })
        : i18next.t("tabA11y.unmutedAnnouncement", {
            defaultValue: "Tab audio unmuted",
          });
      this.announce(msg);
    }
    this.prevMutedStates.set(tab, isMuted);
  }

  private updateTabA11y(tab: Element): void {
    const badges: string[] = [];

    if (tab.hasAttribute("discarded") || tab.hasAttribute("pending")) {
      badges.push(
        i18next.t("tabA11y.sleeping", {
          defaultValue: "Sleeping tab (reloads when selected)",
        }),
      );
    }
    if (tab.getAttribute("historydisabled") === "true") {
      badges.push(
        i18next.t("tabA11y.privateContainer", {
          defaultValue: "Private container tab (history not recorded)",
        }),
      );
    }
    if (tab.hasAttribute("soundplaying")) {
      badges.push(
        i18next.t("tabA11y.audioPlaying", {
          defaultValue: "Audio playing",
        }),
      );
    }
    if (tab.hasAttribute("muted")) {
      badges.push(
        i18next.t("tabA11y.audioMuted", {
          defaultValue: "Audio muted",
        }),
      );
    }
    if (tab.hasAttribute("sharing")) {
      badges.push(
        i18next.t("tabA11y.sharingActive", {
          defaultValue: "Device sharing active",
        }),
      );
    }

    if (badges.length > 0) {
      tab.setAttribute("aria-description", badges.join(", "));
    } else if (tab.hasAttribute("aria-description")) {
      tab.removeAttribute("aria-description");
    }
  }

  private announce(msg: string): void {
    try {
      const doc = document;
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
        doc.documentElement.appendChild(announcer);
      }
      announcer.textContent = "";
      setTimeout(() => {
        if (announcer) {
          announcer.textContent = msg;
        }
      }, 50);
    } catch (e) {
      console.error("[TabA11yManager] Announcement error status message:", e);
    }
  }
}
