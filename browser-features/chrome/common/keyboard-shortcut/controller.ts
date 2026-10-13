/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { getConfig, isEnabled, isSafeErrorHandling } from "./config.ts";
import { getKeyboardShortcutAction } from "./actions.ts";
import type { ShortcutConfig } from "./type.ts";
import {
  isBarePrintableKeyEvent,
  isKeyboardShortcutTypingContext,
  isPrintableKeyValue,
  type KeyboardShortcutFocusStoreReader,
} from "./editable-focus.ts";

const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs",
);

export class KeyboardShortcutController {
  private eventListenersAttached = false;
  private isBypassMode = false;
  private pressedModifiers = {
    alt: false,
    ctrl: false,
    meta: false,
    shift: false,
  };

  private targetWindow: Window;
  private remoteFocusStore: KeyboardShortcutFocusStoreReader | null;

  public get isBypassModeActive(): boolean {
    return this.isBypassMode;
  }

  constructor(
    win: Window = globalThis as unknown as Window,
    remoteFocusStore: KeyboardShortcutFocusStoreReader | null = null,
    private readonly platform: string = AppConstants.platform,
  ) {
    this.targetWindow = win;
    this.remoteFocusStore = remoteFocusStore;
    this.init();
  }

  private init(): void {
    if (this.eventListenersAttached) return;

    this.targetWindow.addEventListener("keydown", this.handleKeyDown, true);
    this.targetWindow.addEventListener("keyup", this.handleKeyUp, true);
    this.targetWindow.addEventListener("blur", this.handleBlur, true);
    this.eventListenersAttached = true;
  }

  public destroy(): void {
    if (this.eventListenersAttached) {
      this.targetWindow.removeEventListener(
        "keydown",
        this.handleKeyDown,
        true,
      );
      this.targetWindow.removeEventListener("keyup", this.handleKeyUp, true);
      this.targetWindow.removeEventListener("blur", this.handleBlur, true);
      this.eventListenersAttached = false;
    }
    this.isBypassMode = false;
    this.resetState();
  }

  private resetState(): void {
    this.pressedModifiers = {
      alt: false,
      ctrl: false,
      meta: false,
      shift: false,
    };
  }

  private announceBypassState(active: boolean): void {
    try {
      const doc = this.targetWindow?.document;
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
      const msg = active
        ? "Floorp shortcuts suspended (Screen reader bypass mode active)"
        : "Floorp shortcuts restored";
      announcer.textContent = "";
      setTimeout(() => {
        if (announcer) {
          announcer.textContent = msg;
        }
      }, 50);
    } catch (err) {
      console.error("[KeyboardShortcutController] Failed to announce bypass state status message:", err);
    }
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!isEnabled()) return;
    if (event.repeat || event.isComposing) return;
    // Gecko reports Option as AltGraph on macOS, including Ctrl+Option and
    // Cmd+Option shortcuts. AltGr must still be reserved for text on other OSes.
    if (
      event.getModifierState?.("AltGraph") && this.platform !== "macosx"
    ) return;

    this.pressedModifiers = {
      alt: event.altKey,
      ctrl: event.ctrlKey,
      meta: event.metaKey,
      shift: event.shiftKey,
    };

    const code = event.code;

    // Synthetic events may lack a code; real key events always carry one.
    if (!code) return;

    // Toggle screen reader bypass mode with Ctrl+Alt+P (or Cmd+Alt+P on macOS)
    const isBypassToggle =
      (this.platform === "macosx" ? event.metaKey && event.altKey : event.ctrlKey && event.altKey) &&
      !event.shiftKey &&
      code === "KeyP";

    if (isBypassToggle) {
      this.isBypassMode = !this.isBypassMode;
      event.preventDefault();
      event.stopPropagation();
      this.announceBypassState(this.isBypassMode);
      return;
    }

    // In bypass mode, all Floorp custom shortcuts are suspended to allow screen reader passthrough
    if (this.isBypassMode) {
      return;
    }

    if (
      (isBarePrintableKeyEvent(event) ||
        (this.platform === "macosx" && event.altKey &&
          !event.ctrlKey && !event.metaKey &&
          (isPrintableKeyValue(event.key) || event.key === "Dead"))) &&
      isKeyboardShortcutTypingContext(
        this.targetWindow,
        this.remoteFocusStore,
      )
    ) {
      return;
    }

    // Ignore pure modifier key presses including CapsLock. Using startsWith keeps this concise
    // and handles location-specific variants like "AltLeft" / "AltRight".
    if (
      code.startsWith("Alt") ||
      code.startsWith("Control") ||
      code.startsWith("Meta") ||
      code.startsWith("Shift") ||
      code.startsWith("CapsLock")
    ) {
      return;
    }

    // Never intercept standard browser pane and AT navigation keys when un-modified:
    // F6 (cycle panes), Tab (focus navigation), Escape (dismiss popup/dialog)
    if (
      !event.altKey && !event.ctrlKey && !event.metaKey &&
      (code === "F6" || code === "Tab" || code === "Escape")
    ) {
      return;
    }

    if (this.checkAndExecuteShortcut(code)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    if (!isEnabled()) return;

    this.pressedModifiers = {
      alt: event.altKey,
      ctrl: event.ctrlKey,
      meta: event.metaKey,
      shift: event.shiftKey,
    };
  };

  private handleBlur = (): void => {
    // A key released after the browser loses focus does not deliver keyup to
    // this window. Discard the snapshot so a stale key cannot satisfy the
    // next shortcut after focus returns.
    this.resetState();
  };

  private checkAndExecuteShortcut(code: string): boolean {
    const config = getConfig();
    const shortcuts = config.shortcuts;

    for (const [_id, shortcut] of Object.entries(shortcuts)) {
      if (this.isShortcutMatch(shortcut, code)) {
        this.executeShortcut(shortcut);
        this.resetState();
        return true;
      }
    }

    return false;
  }

  private isShortcutMatch(
    shortcut: ShortcutConfig,
    currentCode: string,
  ): boolean {
    if (
      shortcut.modifiers.alt !== this.pressedModifiers.alt ||
      shortcut.modifiers.ctrl !== this.pressedModifiers.ctrl ||
      shortcut.modifiers.meta !== this.pressedModifiers.meta ||
      shortcut.modifiers.shift !== this.pressedModifiers.shift
    ) {
      return false;
    }

    let key = shortcut.key;
    if (/^[A-Z]$/.test(key)) {
      key = `Key${key}`;
    } else if (/^[0-9]$/.test(key)) {
      key = `Digit${key}`;
    }

    if (!key) return false;

    // Matching currentCode (the event's own code from this keydown) is
    // sufficient — no stale state is involved.
    return currentCode === key;
  }

  private executeShortcut(shortcut: ShortcutConfig): void {
    if (isSafeErrorHandling()) {
      // Experiment: ks_safe_error_handling (treatment)
      // Expanded try-catch covers both getAction() resolution and fn()
      // invocation so callers can always run cleanup.
      try {
        const fn = getKeyboardShortcutAction(shortcut.action);
        if (fn) {
          fn(this.targetWindow);
        }
      } catch (e) {
        console.error(
          `[keyboard-shortcut] Action "${shortcut.action}" failed status message:`,
          e,
        );
      }
    } else {
      // Control: original behaviour (try-catch only around fn call)
      const fn = getKeyboardShortcutAction(shortcut.action);
      if (fn) {
        try {
          fn(this.targetWindow);
        } catch (e) {
          console.error(
            `[keyboard-shortcut] Action "${shortcut.action}" failed status message:`,
            e,
          );
        }
      }
    }
  }
}
