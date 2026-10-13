/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { createSignal } from "solid-js";
import { Show } from "solid-js";
import { createRootHMR } from "@nora/solid-xul";
import shareModeStyle from "./share-mode.css?inline";
import i18next from "i18next";
import { addI18nObserver } from "#i18n/config-browser-chrome.ts";

export const [shareModeEnabled, setShareModeEnabled] = createRootHMR(
  () => createSignal(false),
  import.meta.hot,
);
export function ShareModeElement() {
  const getLocalizedLabel = () =>
    i18next.t("mouseGesture.actions.floorp-toggle-share-mode", {
      defaultValue: "Toggle Share Mode",
    });

  const [label, setLabel] = createSignal(getLocalizedLabel());

  addI18nObserver(() => {
    setLabel(getLocalizedLabel());
  });

  return (
    <>
      <xul:menuitem
        label={label()}
        type="checkbox"
        role="menuitemcheckbox"
        aria-checked={shareModeEnabled()}
        id="toggle_sharemode"
        data-floorp-context-menu-key="floorp.share-mode.toggle"
        checked={shareModeEnabled() || undefined}
        onCommand={() => setShareModeEnabled((prev) => !prev)}
        accesskey="S"
      />

      <Show when={shareModeEnabled()}>
        <style>{shareModeStyle}</style>
      </Show>
    </>
  );
}
