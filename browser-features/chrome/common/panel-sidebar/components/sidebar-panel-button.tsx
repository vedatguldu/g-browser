/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createResource, Suspense } from "solid-js";
import { getFaviconURLForPanel } from "../utils/favicon-getter";
import type { CPanelSidebar } from "./panel-sidebar";
import {
  isPanelSidebarVisible,
  panelSidebarData,
  selectedPanelId,
  setPanelSidebarData,
} from "../data/data";
import type { Panel } from "../utils/type";
import { isExtensionExist } from "../extension-panels";
import { getUserContextColor } from "../utils/userContextColor-getter";
import { setContextPanel } from "./sidebar-contextMenu";

function isTurkishLocale(): boolean {
  try {
    const req = Services?.locale?.requestedLocale || navigator?.language || "tr";
    return req.toLowerCase().startsWith("tr");
  } catch {
    return true;
  }
}

function getPanelAccessibleLabel(panel: Panel): string {
  const url = (panel.url || "").trim();
  const id = (panel.id || "").trim();
  const tr = isTurkishLocale();

  if (url === "floorp//bookmarks" || id === "default-panel-bookmarks" || id.includes("bookmarks")) {
    return tr ? "Yer İmleri" : "Bookmarks";
  }
  if (url === "floorp//history" || id === "default-panel-history" || id.includes("history")) {
    return tr ? "Geçmiş" : "History";
  }
  if (url === "floorp//downloads" || id === "default-panel-downloads" || id.includes("downloads")) {
    return tr ? "İndirilenler" : "Downloads";
  }
  if (url === "floorp//notes" || id === "default-panel-notes" || id.includes("notes")) {
    return tr ? "Notlar" : "Notes";
  }
  if (url.includes("translate.google.com") || id.includes("translate")) {
    return tr ? "Google Çeviri" : "Google Translate";
  }
  if (
    url.includes("docs.floorp.app") ||
    url.includes("vedatguldu.github.io/g-browser") ||
    url.includes("vedatguldu.com") ||
    id.includes("docs")
  ) {
    return tr ? "G-Browser Özellikler Rehberi ve Dokümantasyon" : "G-Browser Features Guide & Documentation";
  }
  if (panel.type === "extension" && panel.extensionId) {
    return tr ? `Eklenti Paneli: ${panel.extensionId}` : `Extension Panel: ${panel.extensionId}`;
  }
  if (url) {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  }
  return id || (tr ? "Kenar Çubuğu Paneli" : "Sidebar Panel");
}

export function PanelSidebarButton(props: {
  panel: Panel;
  ctx: CPanelSidebar;
}) {
  const gPanelSidebar = props.ctx;
  const accessibleName = () => getPanelAccessibleLabel(props.panel);
  const [faviconURL] = createResource(
    () => props.panel,
    async () => await getFaviconURLForPanel(props.panel),
  );

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer?.setData("text/floorp-panel-id", props.panel.id);
    (e.target as HTMLElement).classList.add("dragging");
  };

  const handleDragEnd = (e: DragEvent) => {
    (e.target as HTMLElement).classList.remove("dragging");
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).classList.add("drag-over");
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).classList.remove("drag-over");
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).classList.remove("drag-over");

    const sourceId = e.dataTransfer?.getData("text/floorp-panel-id");
    const targetId = props.panel.id;

    if (sourceId === targetId) return;

    const panels = [...panelSidebarData()];
    const sourceIndex = panels.findIndex((p) => p.id === sourceId);
    const targetIndex = panels.findIndex((p) => p.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const [movedPanel] = panels.splice(sourceIndex, 1);
    panels.splice(targetIndex, 0, movedPanel);

    setPanelSidebarData(panels);
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    setContextPanel(props.panel);

    const contextMenu = document?.getElementById(
      "webpanel-context",
    ) as unknown as XULPopupElement;
    if (contextMenu) {
      contextMenu.openPopupAtScreen(e.screenX, e.screenY, true);
    }
  };

  if (
    props.panel.type === "extension" &&
    !isExtensionExist(props.panel.extensionId as string)
  ) {
    return null;
  }

  const reorderPanel = (direction: "up" | "down") => {
    const panels = [...panelSidebarData()];
    const currentIndex = panels.findIndex((p) => p.id === props.panel.id);
    if (currentIndex === -1) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex >= 0 && targetIndex < panels.length) {
      const [moved] = panels.splice(currentIndex, 1);
      panels.splice(targetIndex, 0, moved);
      setPanelSidebarData(panels);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onKeyDown={(event: KeyboardEvent) => {
        if ((event.altKey || event.ctrlKey) && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
          event.preventDefault();
          event.stopPropagation();
          reorderPanel(event.key === "ArrowUp" ? "up" : "down");
        }
      }}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={handleContextMenu}
      class="panel-sidebar-button-wrapper"
    >
      <div
        id={props.panel.id}
        class={`${props.panel.type} panel-sidebar-panel`}
        data-checked={selectedPanelId() === props.panel.id}
        data-panel-id={props.panel.id}
        role="button"
        tabindex={0}
        aria-label={accessibleName()}
        title={accessibleName()}
        aria-expanded={selectedPanelId() === props.panel.id &&
          isPanelSidebarVisible()}
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            gPanelSidebar.changePanel(props.panel.id);
          } else if ((event.altKey || event.ctrlKey) && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
            event.preventDefault();
            event.stopPropagation();
            reorderPanel(event.key === "ArrowUp" ? "up" : "down");
          }
        }}
        onClick={() => {
          gPanelSidebar.changePanel(props.panel.id);
        }}
        style={{
          "border-right": props.panel.userContextId !== 0 &&
              props.panel.userContextId !== null &&
              props.panel.type === "web"
            ? `2px solid ${getUserContextColor(props.panel.userContextId ?? 0)}`
            : "none",
        }}
      >
        <Suspense fallback={<div aria-hidden="true">I</div>}>
          <img src={faviconURL()} width="16" height="16" alt="" aria-hidden="true" />
        </Suspense>
      </div>
    </div>
  );
}
