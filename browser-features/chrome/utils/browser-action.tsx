// SPDX-License-Identifier: MPL-2.0

// NOTICE: Do not add toolbar buttons code here. Create new folder or file for new toolbar buttons.

import { render } from "@nora/solid-xul";
import { createRoot, getOwner, type JSXElement } from "solid-js";

const { CustomizableUI } = ChromeUtils.importESModule(
  "moz-src:///browser/components/customizableui/CustomizableUI.sys.mjs",
);

const DEFAULT_WIDGET_A11Y: Record<string, { label: string; tooltip: string }> = {
  "profile-manager-button": {
    label: "Profil Yöneticisi",
    tooltip: "G-Browser Profillerini Yönet",
  },
  "zen-mode-button": {
    label: "Zen Modu",
    tooltip: "Zen Modunu Aç/Kapat",
  },
  "undo-closed-tab": {
    label: "Kapatılan Sekmeyi Geri Aç",
    tooltip: "Son kapatılan sekmeyi tekrar aç (Ctrl+Shift+T)",
  },
  "sidebar-reverse-position-toolbar": {
    label: "Kenar Çubuğu Konumunu Değiştir",
    tooltip: "Kenar çubuğunu sol veya sağ tarafa taşı",
  },
  "workspaces-toolbar-button": {
    label: "Çalışma Alanları",
    tooltip: "Çalışma Alanlarını Yönet",
  },
};

// deno-lint-ignore no-namespace
export namespace BrowserActionUtils {
  export function createToolbarClickActionButton(
    widgetId: string,
    l10nId: string | null,
    onCommandFunc: () => void,
    styleElement: JSXElement | null = null,
    area: TCustomizableUIArea | null = CustomizableUI.AREA_NAVBAR,
    position: number | null = 0,
    onCreatedFunc: null | ((aNode: XULElement) => void) = null,
  ) {
    // Add style Element for toolbar button icon.
    // This render is runnning every open browser window.
    if (styleElement) {
      render(() => styleElement, document?.head, {
        marker: document?.head?.lastChild as Element,
      });
    }

    // Create toolbar button only once per profile. Subsequent window opens reuse
    // the existing widget and respect saved customization data.
    // custom type is temporary widget type. It will be changed to button type.
    const widget = CustomizableUI.getWidget(widgetId);
    if (widget && widget.type !== "custom") {
      return;
    }
    (async () => {
      let resolvedLabel: string | null = null;
      if (l10nId) {
        try {
          resolvedLabel = (await document?.l10n?.formatValue(l10nId)) ?? null;
        } catch {
          resolvedLabel = null;
        }
      }

      const fallback = DEFAULT_WIDGET_A11Y[widgetId];
      const finalLabel = resolvedLabel || fallback?.label || widgetId;
      const finalTooltip = resolvedLabel || fallback?.tooltip || finalLabel;

      CustomizableUI.createWidget({
        id: widgetId,
        type: "button",
        tooltiptext: finalTooltip,
        label: finalLabel,
        removable: true,
        onCommand: () => {
          onCommandFunc?.();
        },
        onCreated: (aNode: XULElement) => {
          aNode.setAttribute("role", "button");
          aNode.setAttribute("aria-label", finalLabel);
          aNode.setAttribute("label", finalLabel);
          aNode.setAttribute("tooltiptext", finalTooltip);
          onCreatedFunc?.(aNode);
        },
        defaultArea: area ?? undefined,
      });

      if (!area) {
        return;
      }

      try {
        await (CustomizableUI.readyPromise ?? Promise.resolve());
      } catch (error) {
        console.error(
          "Failed waiting for CustomizableUI readiness status message for",
          widgetId,
          error,
        );
        return;
      }

      const hasUserCustomized =
        typeof Services !== "undefined" &&
        Services.prefs?.prefHasUserValue?.("browser.uiCustomization.state");

      if (hasUserCustomized) {
        return;
      }

      if (position === null || position === undefined) {
        CustomizableUI.addWidgetToArea(widgetId, area);
      } else {
        CustomizableUI.addWidgetToArea(widgetId, area, position);
      }
    })();
  }

  export function createMenuToolbarButton(
    widgetId: string,
    l10nId: string,
    targetViewId: string,
    popupElement: JSXElement,
    onViewShowingFunc?: ((event: Event) => void) | null,
    onCreatedFunc?: ((aNode: XULElement) => void) | null,
    area: string = CustomizableUI.AREA_NAVBAR,
    styleElement: JSXElement | null = null,
    position: number | null = 0,
  ) {
    if (styleElement) {
      render(() => styleElement, document?.head, {
        marker: document?.head?.lastChild as Element,
      });
    }

    if (popupElement) {
      render(() => popupElement, document?.getElementById("mainPopupSet"), {
        marker: document?.getElementById("mainPopupSet")?.lastChild as Element,
      });
    }

    const widget = CustomizableUI.getWidget(widgetId);
    if (widget && widget.type !== "custom") {
      return;
    }

    const owner = getOwner();
    (async () => {
      let resolvedTooltip = "";
      let resolvedLabel = "";
      if (l10nId) {
        try {
          const val = await document?.l10n?.formatValue(l10nId);
          if (typeof val === "string") {
            resolvedTooltip = val;
            resolvedLabel = val;
          }
        } catch {
          // Fallback or ignore
        }
      }

      const fallback = DEFAULT_WIDGET_A11Y[widgetId];
      const finalLabel = resolvedLabel || fallback?.label || widgetId;
      const finalTooltip = resolvedTooltip || fallback?.tooltip || finalLabel;

      CustomizableUI.createWidget({
        id: widgetId,
        type: "view",
        viewId: targetViewId,
        tooltiptext: finalTooltip,
        label: finalLabel,
        removable: true,
        onCreated: (aNode: XULElement) => {
          aNode.setAttribute("role", "button");
          aNode.setAttribute("aria-label", finalLabel);
          aNode.setAttribute("label", finalLabel);
          aNode.setAttribute("tooltiptext", finalTooltip);
          createRoot(() => onCreatedFunc?.(aNode), owner);
        },
        onViewShowing: (event: Event) => {
          createRoot(() => onViewShowingFunc?.(event), owner);
        },
        defaultArea: area,
      });

      try {
        await (CustomizableUI.readyPromise ?? Promise.resolve());
      } catch (error) {
        console.error(
          "Failed waiting for CustomizableUI readiness status message for",
          widgetId,
          error,
        );
        return;
      }

      const hasUserCustomized =
        typeof Services !== "undefined" &&
        Services.prefs?.prefHasUserValue?.("browser.uiCustomization.state");

      if (hasUserCustomized) {
        return;
      }

      if (position === null || position === undefined) {
        CustomizableUI.addWidgetToArea(widgetId, area);
      } else {
        CustomizableUI.addWidgetToArea(widgetId, area, position);
      }
    })();
  }
}
