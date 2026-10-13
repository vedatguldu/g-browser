/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createSignal, onCleanup } from "solid-js";
import type { JSX } from "solid-js";
import { createRootHMR, render } from "@nora/solid-xul";
import i18next from "i18next";
import { addI18nObserver } from "#i18n/config-browser-chrome.ts";

type ShowRebootPanelSubViewDeps = {
  showSubView: (
    viewId: string,
    anchor: Element | null,
  ) => void | Promise<void>;
  getAnchor: () => Element | null;
};

type ConfirmFn = (title: string, message: string) => boolean;

type RestartDeps = {
  quit: (flags: number) => void;
  forceQuit: number;
  restart: number;
  confirm?: ConfirmFn;
};

type RestartWithCacheClearDeps = {
  invalidateCachesOnRestart: () => void;
  quit: (flags: number) => void;
  restart: number;
  attemptQuit: number;
  confirm?: ConfirmFn;
};

type RestartInSafeModeDeps = {
  notifyObservers: (subject: nsISupports, topic: string) => void;
  subject: nsISupports;
  confirm?: ConfirmFn;
};

export class RebootPanelMenu {
  private isOpen = createSignal<boolean>(false);
  private isRendered = false;

  constructor() {
    if (!this.panelUIButton) return;

    createRootHMR(() => {
      const [, setIsOpen] = this.isOpen;
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "open"
          ) {
            const isOpened =
              this.panelUIButton?.getAttribute("open") === "true";
            setIsOpen(isOpened);

            if (isOpened && !this.isRendered) {
              this.renderPanel();
            }
          }
        });
      });

      observer.observe(this.panelUIButton!, {
        attributes: true,
      });

      onCleanup(() => observer.disconnect());
    }, import.meta.hot);
  }

  private get parentElement(): HTMLElement | null {
    return document?.querySelector(
      "#appMenu-mainView > .panel-subview-body",
    ) as HTMLElement | null;
  }

  private get beforeElement(): HTMLElement | null {
    return document?.getElementById(
      "appMenu-quit-button2",
    ) as HTMLElement | null;
  }

  private get panelUIButton(): HTMLElement | null {
    return document?.getElementById(
      "PanelUI-menu-button",
    ) as HTMLElement | null;
  }

  private renderPanel(): void {
    if (!this.parentElement || !this.beforeElement) return;

    this.isRendered = true;
    render(() => <RebootPanelMenu.Render />, this.parentElement, {
      marker: this.beforeElement,
    });
  }

  private static async showRebootPanelSubView(
    deps: ShowRebootPanelSubViewDeps = {
      showSubView: (viewId, anchor) =>
        globalThis.PanelUI.showSubView(viewId, anchor),
      getAnchor: () => document?.getElementById("appMenu-restart-button"),
    },
  ): Promise<void> {
    await deps.showSubView("PanelUI-reboot", deps.getAnchor());
  }

  private static confirmRestart(
    customConfirm?: ConfirmFn,
    skipIfNoCustomConfirm = false,
  ): boolean {
    if (customConfirm) {
      return customConfirm(
        i18next.t("reboot.menu.confirm-restart-title", {
          defaultValue: "Restart Browser",
        }),
        i18next.t("reboot.menu.confirm-restart-message", {
          defaultValue: "Are you sure you want to restart the browser now?",
        }),
      );
    }
    if (skipIfNoCustomConfirm) {
      return true;
    }
    const title = i18next.t("reboot.menu.confirm-restart-title", {
      defaultValue: "Restart Browser",
    });
    const message = i18next.t("reboot.menu.confirm-restart-message", {
      defaultValue: "Are you sure you want to restart the browser now?",
    });
    try {
      if (typeof Services !== "undefined" && Services.prompt?.confirm) {
        return Services.prompt.confirm(
          window as mozIDOMWindow,
          title,
          message,
        );
      }
    } catch (e) {
      console.warn("[RebootPanelMenu] Services.prompt.confirm failed:", e);
    }
    try {
      if (typeof globalThis.confirm === "function") {
        return globalThis.confirm(`${title}\n\n${message}`);
      }
    } catch (e) {
      console.warn("[RebootPanelMenu] globalThis.confirm failed status message:", e);
    }
    return true;
  }

  private static handleRestart(
    deps?: RestartDeps,
  ): void {
    const isCustomDeps = deps !== undefined;
    const actualDeps: RestartDeps = deps ?? {
      quit: (flags) => Services.startup.quit(flags),
      forceQuit: Services.startup.eForceQuit!,
      restart: Services.startup.eRestart!,
    };
    if (
      !RebootPanelMenu.confirmRestart(
        actualDeps.confirm,
        isCustomDeps && !actualDeps.confirm,
      )
    ) {
      return;
    }
    actualDeps.quit(actualDeps.forceQuit | actualDeps.restart);
  }

  private static handleRestartWithCacheClear(
    deps?: RestartWithCacheClearDeps,
  ): void {
    const isCustomDeps = deps !== undefined;
    const actualDeps: RestartWithCacheClearDeps = deps ?? {
      invalidateCachesOnRestart: () =>
        Services.appinfo.invalidateCachesOnRestart(),
      quit: (flags) => Services.startup.quit(flags),
      restart: Ci.nsIAppStartup.eRestart!,
      attemptQuit: Ci.nsIAppStartup.eAttemptQuit!,
    };
    if (
      !RebootPanelMenu.confirmRestart(
        actualDeps.confirm,
        isCustomDeps && !actualDeps.confirm,
      )
    ) {
      return;
    }
    actualDeps.invalidateCachesOnRestart();
    actualDeps.quit(actualDeps.restart | actualDeps.attemptQuit);
  }

  private static handleRestartInSafeMode(
    deps?: RestartInSafeModeDeps,
  ): void {
    const isCustomDeps = deps !== undefined;
    const actualDeps: RestartInSafeModeDeps = deps ?? {
      notifyObservers: (subject, topic) =>
        Services.obs.notifyObservers(subject, topic),
      subject: window as nsISupports,
    };
    if (
      !RebootPanelMenu.confirmRestart(
        actualDeps.confirm,
        isCustomDeps && !actualDeps.confirm,
      )
    ) {
      return;
    }
    actualDeps.notifyObservers(actualDeps.subject, "restart-in-safe-mode");
  }

  public static Render(): JSX.Element {
    const [translations, setTranslations] = createSignal({
      reboot: i18next.t("reboot.menu.title"),
      normalRestart: i18next.t("reboot.menu.normal-restart"),
      restartWithCacheClear: i18next.t("reboot.menu.restart-cache-clear"),
      restartInSafeMode: i18next.t("reboot.menu.restart-safe-mode"),
    });

    addI18nObserver(() => {
      setTranslations({
        reboot: i18next.t("reboot.menu.title"),
        normalRestart: i18next.t("reboot.menu.normal-restart"),
        restartWithCacheClear: i18next.t("reboot.menu.restart-cache-clear"),
        restartInSafeMode: i18next.t("reboot.menu.restart-safe-mode"),
      });
    });

    return (
      <>
        <xul:toolbarbutton
          id="appMenu-restart-button"
          class="subviewbutton subviewbutton-nav"
          label={translations().reboot}
          aria-haspopup="true"
          aria-controls="PanelUI-reboot"
          closemenu="none"
          onCommand={() => RebootPanelMenu.showRebootPanelSubView()}
        />
        <xul:panelview id="PanelUI-reboot" role="region" aria-label={translations().reboot}>
          <xul:vbox id="reboot-subview-body" class="panel-subview-body">
            <xul:toolbarbutton
              id="appMenu-restart-normal-button"
              class="subviewbutton"
              label={translations().normalRestart}
              onCommand={() => RebootPanelMenu.handleRestart()}
            />
            <xul:toolbarseparator />
            <xul:toolbarbutton
              id="appMenu-restart-cache-clear-button"
              class="subviewbutton"
              label={translations().restartWithCacheClear}
              onCommand={() => RebootPanelMenu.handleRestartWithCacheClear()}
            />
            <xul:toolbarbutton
              id="appMenu-restart-safe-mode-button"
              class="subviewbutton"
              label={translations().restartInSafeMode}
              onCommand={() => RebootPanelMenu.handleRestartInSafeMode()}
            />
          </xul:vbox>
        </xul:panelview>
      </>
    );
  }
}
