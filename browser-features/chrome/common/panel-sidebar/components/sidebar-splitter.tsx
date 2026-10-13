/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import i18next from "i18next";

export function SidebarSplitter(props: { onResizeEnd: () => void }) {
  const handleKeyDown = (e: KeyboardEvent) => {
    const box = document?.getElementById("panel-sidebar-box");
    if (!box) return;

    const step = e.shiftKey ? 50 : 10;
    const currentWidth = box.getBoundingClientRect().width;
    let newWidth = currentWidth;

    if (e.key === "ArrowLeft") {
      newWidth = Math.max(200, currentWidth - step);
    } else if (e.key === "ArrowRight") {
      newWidth = Math.min(window.innerWidth - 100, currentWidth + step);
    } else if (e.key === "Home") {
      newWidth = 225;
    } else if (e.key === "End") {
      newWidth = 600;
    } else {
      return;
    }

    e.preventDefault();
    box.style.width = `${newWidth}px`;
    props.onResizeEnd();
  };

  return (
    <xul:splitter
      id="panel-sidebar-splitter"
      class="chromeclass-extrachrome"
      tabindex="0"
      role="separator"
      aria-orientation="vertical"
      aria-label={i18next.t("panelSidebar.splitter.label", {
        defaultValue: "Panel sidebar resize splitter",
      })}
      onKeyDown={handleKeyDown}
      onCommand={props.onResizeEnd}
    />
  );
}
