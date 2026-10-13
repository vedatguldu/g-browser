// SPDX-License-Identifier: MPL-2.0

// Shared type for modules loaded by the loader.
// Used as the common contract between loadEnabledModules and initializeModules.
interface LoaderModule {
  name: string;
  init?: () => Promise<void>;
  initBeforeSessionStoreInit?: () => Promise<void>;
  default?: new () => unknown;
}

import { initI18NForBrowserChrome } from "#i18n/config-browser-chrome.ts";
import { isWebPanelChildWindow } from "#features-chrome/common/panel-sidebar/utils/web-panel-context.ts";

import { MODULES, MODULES_KEYS } from "./modules.ts";
import {
  _registerModuleLoadState,
  _rejectOtherLoadStates,
} from "./modules-hooks.ts";

console.log("[noraneko] Initializing scripts...");

export default async function initScripts() {
  console.log("[noraneko] initScripts called");
  try {
    Services.prefs.setStringPref("nora.loader.initialized", String(Date.now()));
  } catch (e) {
    console.error("[noraneko] Failed to set loader initialized marker status message:", e);
  }

  // Import required modules and initialize i18n
  ChromeUtils.importESModule("resource://noraneko/modules/BrowserGlue.sys.mjs");
  const { NoranekoConstants } = ChromeUtils.importESModule(
    "resource://noraneko/modules/NoranekoConstants.sys.mjs",
  );
  initI18NForBrowserChrome();
  console.debug(
    `[noraneko-buildid2]\nuuid: ${NoranekoConstants.buildID2}\ndate: ${
      new Date(
        Number.parseInt(
          NoranekoConstants.buildID2.slice(0, 13).replace("-", ""),
          16,
        ),
      ).toISOString()
    }`,
  );

  setPrefFeatures(MODULES_KEYS);

  // Get enabled features from preferences
  const enabled_features = JSON.parse(
    Services.prefs.getStringPref("noraneko.features.enabled", "{}"),
  ) as typeof MODULES_KEYS;

  // Load enabled modules
  const modules = await loadEnabledModules(enabled_features);

  // Initialize modules after session is ready
  await initializeModules(modules);
}

function setPrefFeatures(all_features_keys: typeof MODULES_KEYS) {
  // Set up preferences for features
  const prefs = Services.prefs.getDefaultBranch(null as unknown as string);
  prefs.setStringPref(
    "noraneko.features.all",
    JSON.stringify(all_features_keys),
  );
  Services.prefs.lockPref("noraneko.features.all");

  prefs.setStringPref(
    "noraneko.features.enabled",
    JSON.stringify(all_features_keys),
  );
}

function normalizeModuleName(moduleName: string): string {
  return moduleName.replace(/^\.\//, "").replace(/\/index\.ts$/, "");
}

function isPanelSidebarModule(moduleName: string): boolean {
  return normalizeModuleName(moduleName) === "panel-sidebar";
}

async function loadEnabledModules(
  enabled_features: typeof MODULES_KEYS,
): Promise<LoaderModule[]> {
  const isWebPanelChild = isWebPanelChildWindow();

  const promises = Object.entries(MODULES).flatMap(
    ([categoryKey, categoryValue]) =>
      Object.keys(categoryValue)
        .filter((moduleName) => {
          if (
            !(categoryKey in enabled_features) ||
            !enabled_features[
              categoryKey as keyof typeof enabled_features
            ].includes(moduleName)
          ) {
            return false;
          }

          if (isWebPanelChild) {
            return categoryKey === "common" && isPanelSidebarModule(moduleName);
          }

          return true;
        })
        .map(async (moduleName): Promise<LoaderModule | null> => {
          try {
            const module = await categoryValue[moduleName]();
            return {
              name: moduleName,
              ...(module as Omit<LoaderModule, "name">),
            };
          } catch (e) {
            console.error(`[noraneko] Failed to load module ${moduleName} status message:`, e);
            return null;
          }
        }),
  );

  const results = await Promise.all(promises);
  return results.filter((m): m is LoaderModule => m !== null);
}

async function initializeModules(modules: LoaderModule[]) {
  const isWebPanelChild = isWebPanelChildWindow();

  for (const module of modules) {
    try {
      await module?.initBeforeSessionStoreInit?.();
    } catch (e) {
      console.error(
        `[noraneko] Failed to initBeforeSessionStoreInit module ${module.name} status message:`,
        e,
      );
    }
  }

  if (!isWebPanelChild) {
    // @ts-expect-error SessionStore type not defined
    await SessionStore.promiseInitialized;
    setupPageActionKeyboardAccessibility();
  }

  for (const module of modules) {
    try {
      if (module?.init) {
        await module.init();
      }
      if (module?.default) {
        new module.default();
      }
      _registerModuleLoadState(module.name, true);
    } catch (e) {
      console.error(`[noraneko] Failed to init module ${module.name} status message:`, e);
      _registerModuleLoadState(module.name, false);
    }
  }
  _registerModuleLoadState("__init_all__", true);
  await _rejectOtherLoadStates();
}

function setupPageActionKeyboardAccessibility(): void {
  try {
    const pageActions = document.getElementById("page-action-buttons");
    if (!pageActions) return;

    pageActions.addEventListener(
      "keydown",
      (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          const target = e.target as HTMLElement | null;
          if (!target) return;
          const btn = target.closest(
            ".urlbar-page-action, #reader-mode-button, #star-button-box, #star-button",
          ) as HTMLElement | null;

          if (btn) {
            if (
              btn.id === "reader-mode-button" ||
              btn.closest("#reader-mode-button")
            ) {
              e.preventDefault();
              e.stopPropagation();
              try {
                // deno-lint-ignore no-explicit-any
                const win = window as any;
                if (typeof win.AboutReaderListener?.toggleReaderMode === "function") {
                  win.AboutReaderListener.toggleReaderMode(e);
                } else if (
                  typeof win.gBrowser?.selectedBrowser?.messageManager
                    ?.sendAsyncMessage === "function"
                ) {
                  win.gBrowser.selectedBrowser.messageManager.sendAsyncMessage(
                    "Reader:Toggle",
                  );
                } else {
                  btn.click();
                }
              } catch {
                btn.click();
              }
            } else if (
              btn.id === "star-button-box" ||
              btn.id === "star-button" ||
              btn.closest("#star-button-box")
            ) {
              e.preventDefault();
              e.stopPropagation();
              btn.click();
            }
          }
        }
      },
      true,
    );
  } catch (err) {
    console.error("[noraneko] Failed to setup page action keyboard accessibility:", err);
  }
}
