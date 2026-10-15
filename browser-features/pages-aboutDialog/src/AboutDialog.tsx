import { useEffect, useState, useRef, useMemo } from "preact/hooks";
import { useTranslation } from "react-i18next";

// deno-lint-ignore no-explicit-any
declare const ChromeUtils: any;
// deno-lint-ignore no-explicit-any
declare const Services: any;
// deno-lint-ignore no-explicit-any
declare const Ci: any;
// deno-lint-ignore no-explicit-any
declare const Cc: any;
// deno-lint-ignore no-explicit-any
declare const openHelpLink: any;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function openExternalUrl(url: string) {
  try {
    const win = Services.wm.getMostRecentWindow("navigator:browser");
    if (win) {
      try {
        win.openUILinkIn(url, "tab", { inBackground: false });
      } catch {
        win.gBrowser.addTab(url, {
          triggeringPrincipal:
            Services.scriptSecurityManager.getSystemPrincipal(),
        });
        win.gBrowser.selectedTab = win.gBrowser.tabs[win.gBrowser.tabs.length - 1];
      }
      win.focus();
    }
  } catch {
    // fallback: do nothing if no browser window
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type UpdatePanel =
  | "idle"
  | "checking"
  | "checkFailed"
  | "upToDate"
  | "available"
  | "downloading"
  | "applying"
  | "readyToRestart"
  | "restarting"
  | "policyDisabled"
  | "downloadFailed"
  | "noUpdater";

interface UpdateStatus {
  panel: UpdatePanel;
  downloadProgress?: string;
  availableVersion?: string;
}

// ─── Update status → human-readable text ──────────────────────────────────────

function updateLabel(
  status: UpdateStatus,
  t: (key: string, opts?: Record<string, unknown>) => string,
): { text: string; busy?: boolean } {
  switch (status.panel) {
    case "checking":
      return { text: t("aboutDialog.update.checking"), busy: true };
    case "checkFailed":
      return { text: t("aboutDialog.update.checkFailed") };
    case "upToDate":
      return { text: t("aboutDialog.update.upToDate") };
    case "downloading":
      return {
        text: t("aboutDialog.update.downloading", {
          progress: status.downloadProgress ?? "",
        }),
        busy: true,
      };
    case "applying":
      return { text: t("aboutDialog.update.applying"), busy: true };
    case "readyToRestart":
      return { text: t("aboutDialog.update.readyToRestart") };
    case "restarting":
      return { text: t("aboutDialog.update.restarting"), busy: true };
    case "policyDisabled":
      return { text: t("aboutDialog.update.policyDisabled") };
    case "downloadFailed":
      return { text: t("aboutDialog.update.downloadFailed") };
    case "noUpdater":
      return { text: t("aboutDialog.update.noUpdater") };
    default:
      return { text: "" };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AboutDialog() {
  const { t, i18n } = useTranslation();

  const [distroAbout, setDistroAbout] = useState("");
  const [distroId, setDistroId] = useState("");
  const [version, setVersion] = useState("");
  const [isNightly, setIsNightly] = useState(false);
  const [isEsr, setIsEsr] = useState(false);
  const [releaseNotesUrl, setReleaseNotesUrl] = useState("");
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    panel: "noUpdater",
  });

  // deno-lint-ignore no-explicit-any
  const appUpdaterRef = useRef<any>(null);
  const actionButtonRef = useRef<HTMLButtonElement>(null);

  const AppConstants = useMemo(() => {
    try {
      const { AppConstants } = ChromeUtils.importESModule(
        "resource://gre/modules/AppConstants.sys.mjs",
      );
      return AppConstants;
    } catch {
      return {
        MOZ_UPDATER: false,
        IS_ESR: false,
        MOZ_APP_VERSION_DISPLAY: "unknown",
      };
    }
  }, []);

  // ── Initialise ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") globalThis.close();
    };
    globalThis.addEventListener("keydown", onKeydown);

    try {
      const defaults = Services.prefs.getDefaultBranch(null);
      const dId = defaults.getCharPref("distribution.id", "");
      if (dId) {
        const dAbout = defaults.getStringPref("distribution.about", "");
        const dVersion = defaults.getCharPref("distribution.version", "");
        if (dAbout) setDistroAbout(dAbout);
        if (!dId.startsWith("mozilla-") || dAbout)
          setDistroId(dVersion ? `${dId} — ${dVersion}` : dId);
      }

      const rawVersion = Services.appinfo.version;
      setVersion(AppConstants.MOZ_APP_VERSION_DISPLAY);
      if (/a\d+$/.test(rawVersion)) setIsNightly(true);
      if (AppConstants.IS_ESR) setIsEsr(true);

      if (
        Services.prefs.getPrefType("app.releaseNotesURL.aboutDialog") !==
        Services.prefs.PREF_INVALID
      ) {
        const url = Services.urlFormatter.formatURLPref(
          "app.releaseNotesURL.aboutDialog",
        );
        if (url !== "about:blank") setReleaseNotesUrl(url);
      }

      if (!AppConstants.MOZ_UPDATER) return;

      const { AppUpdater } = ChromeUtils.importESModule(
        "resource://gre/modules/AppUpdater.sys.mjs",
      );
      const { DownloadUtils } = ChromeUtils.importESModule(
        "resource://gre/modules/DownloadUtils.sys.mjs",
      );
      const updater = new AppUpdater();
      appUpdaterRef.current = updater;

      // deno-lint-ignore no-explicit-any
      const onUpdate = (status: any, ...args: any[]) => {
        switch (status) {
          case AppUpdater.STATUS.UPDATE_DISABLED_BY_POLICY:
            setUpdateStatus({ panel: "policyDisabled" });
            break;
          case AppUpdater.STATUS.READY_FOR_RESTART:
            setUpdateStatus({ panel: "readyToRestart" });
            break;
          case AppUpdater.STATUS.DOWNLOADING: {
            const [progress = 0] = args;
            const max = updater.update?.selectedPatch?.size ?? -1;
            setUpdateStatus({
              panel: "downloading",
              downloadProgress: DownloadUtils.getTransferTotal(progress, max),
            });
            break;
          }
          case AppUpdater.STATUS.STAGING:
            setUpdateStatus({ panel: "applying" });
            break;
          case AppUpdater.STATUS.CHECKING:
            setUpdateStatus({ panel: "checking" });
            break;
          case AppUpdater.STATUS.CHECKING_FAILED:
            setUpdateStatus({ panel: "checkFailed" });
            break;
          case AppUpdater.STATUS.NO_UPDATES_FOUND:
            setUpdateStatus({ panel: "upToDate" });
            break;
          case AppUpdater.STATUS.DOWNLOAD_AND_INSTALL:
            setUpdateStatus({
              panel: "available",
              availableVersion: updater.update?.displayVersion,
            });
            break;
          case AppUpdater.STATUS.DOWNLOAD_FAILED:
            setUpdateStatus({ panel: "downloadFailed" });
            break;
          case AppUpdater.STATUS.NEVER_CHECKED:
            setUpdateStatus({ panel: "idle" });
            break;
          default:
            setUpdateStatus({ panel: "noUpdater" });
        }
      };

      updater.addListener(onUpdate);
      updater.check();
      return () => {
        updater.removeListener(onUpdate);
        updater.stop();
        globalThis.removeEventListener("keydown", onKeydown);
      };
    } catch (e) {
      console.warn("[AboutDialog] Failed to initialize AppUpdater status message:", e);
    }
    return () => globalThis.removeEventListener("keydown", onKeydown);
  }, [AppConstants]);

  useEffect(() => {
    actionButtonRef.current?.focus();
  }, [updateStatus.panel]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const checkForUpdates = () => appUpdaterRef.current?.check();
  const downloadUpdate = () => appUpdaterRef.current?.allowUpdateDownload();

  const restartToUpdate = () => {
    const aus = Cc["@mozilla.org/updates/update-service;1"].getService(
      Ci.nsIApplicationUpdateService,
    );
    if (aus.currentState !== Ci.nsIApplicationUpdateService.STATE_PENDING)
      return;

    setUpdateStatus({ panel: "restarting" });

    const cancelQuit = Cc["@mozilla.org/supports-PRBool;1"].createInstance(
      Ci.nsISupportsPRBool,
    );
    Services.obs.notifyObservers(
      cancelQuit,
      "quit-application-requested",
      "restart",
    );
    if (cancelQuit.data) {
      setUpdateStatus({ panel: "readyToRestart" });
      return;
    }

    if (Services.appinfo.inSafeMode) {
      Services.startup.restartInSafeMode(Ci.nsIAppStartup.eAttemptQuit);
      return;
    }
    if (
      !Services.startup.quit(
        Ci.nsIAppStartup.eAttemptQuit | Ci.nsIAppStartup.eRestart,
      )
    )
      setUpdateStatus({ panel: "readyToRestart" });
  };

  // ── Update UI ───────────────────────────────────────────────────────────────

  const renderUpdateSection = () => {
    if (updateStatus.panel === "idle")
      return (
        <button
          type="button"
          ref={actionButtonRef}
          class="ad-btn ad-btn-primary"
          onClick={checkForUpdates}
        >
          {t("aboutDialog.update.idle")}
        </button>
      );

    if (updateStatus.panel === "available")
      return (
        <button
          type="button"
          ref={actionButtonRef}
          class="ad-btn ad-btn-primary"
          onClick={downloadUpdate}
        >
          {t("aboutDialog.update.available", {
            version: updateStatus.availableVersion
              ? ` (${updateStatus.availableVersion})`
              : "",
          })}
        </button>
      );

    if (updateStatus.panel === "readyToRestart")
      return (
        <button
          type="button"
          ref={actionButtonRef}
          class="ad-btn ad-btn-primary"
          onClick={restartToUpdate}
        >
          {t("aboutDialog.update.restartToApply")}
        </button>
      );

    if (
      updateStatus.panel === "checkFailed" ||
      updateStatus.panel === "downloadFailed"
    )
      return (
        <div class="ad-error-col">
          <span role="alert" class="ad-status-err">
            {updateLabel(updateStatus, t).text}
          </span>
          <button
            type="button"
            ref={actionButtonRef}
            class="ad-btn ad-btn-ghost"
            onClick={checkForUpdates}
          >
            {t("aboutDialog.update.tryAgain")}
          </button>
        </div>
      );

    const { text, busy } = updateLabel(updateStatus, t);
    if (!text) return null;
    return (
      <div class="ad-update-row" role="status" aria-live="polite" aria-busy={busy}>
        {busy && <div class="ad-spinner" />}
        <span
          class={
            updateStatus.panel === "upToDate"
              ? "ad-status-ok"
              : "ad-status-text"
          }
        >
          {text}
        </span>
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const channelBadge = isNightly
    ? t("aboutDialog.channel.nightly")
    : isEsr
      ? t("aboutDialog.channel.esr")
      : null;

  return (
    <main class="ad" role="dialog" aria-label={t("aboutDialog.ariaLabel")}>
      <span id="opensInNewWindow" class="sr-only">
        {t("aboutDialog.opensInNewWindow", { defaultValue: "opens in new window" })}
      </span>
      {/* ── Two-column body ── */}
      <div class="ad-body">
        {/* ── Left: Brand + Update ── */}
        <div class="ad-left">
          <img
            src="chrome://branding/content/about-logo@2x.png"
            class="ad-logo"
            alt=""
            aria-hidden="true"
          />
          <h1 class="ad-name">G-Browser</h1>
          <div class="ad-version">
            {t("aboutDialog.version")} {version || "…"}
            {channelBadge && (
              <span class="ad-badge">{channelBadge}</span>
            )}
          </div>
          <div class="ad-update-area" aria-live="polite" aria-atomic="true">
            {renderUpdateSection()}
          </div>
        </div>

        {/* ── Right: Community + Support ── */}
        <div class="ad-right">
          <section>
            <h2 class="ad-section-title">{t("aboutDialog.community.title")}</h2>
            <div class="ad-community-row">
              <a
                href="https://github.com/vedatguldu/g-browser"
                target="_blank"
                rel="noopener noreferrer"
                class="ad-community-item"
                aria-describedby="opensInNewWindow"
                aria-label={`GitHub (${t("aboutDialog.opensExternal", { defaultValue: "opens external link" })})`}
                onClick={(e) => {
                  e.preventDefault();
                  openExternalUrl("https://github.com/vedatguldu/g-browser");
                }}
              >
                <span class="ad-community-icon">
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
                </span>
                GitHub
              </a>
              <a
                href="https://vedatguldu.com"
                target="_blank"
                rel="noopener noreferrer"
                class="ad-community-item"
                aria-describedby="opensInNewWindow"
                aria-label={`Web (${t("aboutDialog.opensExternal", { defaultValue: "opens external link" })})`}
                onClick={(e) => {
                  e.preventDefault();
                  openExternalUrl("https://vedatguldu.com");
                }}
              >
                <span class="ad-community-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style={{ width: 16, height: 16 }}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                </span>
                Web
              </a>
              <a
                href="https://x.com/vedatguldu"
                target="_blank"
                rel="noopener noreferrer"
                class="ad-community-item"
                aria-describedby="opensInNewWindow"
                aria-label={`X (${t("aboutDialog.opensExternal", { defaultValue: "opens external link" })})`}
                onClick={(e) => {
                  e.preventDefault();
                  openExternalUrl("https://x.com/vedatguldu");
                }}
              >
                <span class="ad-community-icon">
                  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z" /></svg>
                </span>
                X
              </a>
              <a
                href="https://www.linkedin.com/in/vedat-g%C3%BCld%C3%BC"
                target="_blank"
                rel="noopener noreferrer"
                class="ad-community-item"
                aria-describedby="opensInNewWindow"
                aria-label={`LinkedIn (${t("aboutDialog.opensExternal", { defaultValue: "opens external link" })})`}
                onClick={(e) => {
                  e.preventDefault();
                  openExternalUrl("https://www.linkedin.com/in/vedat-g%C3%BCld%C3%BC");
                }}
              >
                <span class="ad-community-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" style={{ width: 16, height: 16 }}><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.62 1.62 0 1 0 0-3.24 1.62 1.62 0 0 0 0 3.24m1.4 9.74v-8.37H5.06v8.37z"/></svg>
                </span>
                LinkedIn
              </a>
              <a
                href="https://www.youtube.com/@vedat-guldu"
                target="_blank"
                rel="noopener noreferrer"
                class="ad-community-item"
                aria-describedby="opensInNewWindow"
                aria-label={`YouTube (${t("aboutDialog.opensExternal", { defaultValue: "opens external link" })})`}
                onClick={(e) => {
                  e.preventDefault();
                  openExternalUrl("https://www.youtube.com/@vedat-guldu");
                }}
              >
                <span class="ad-community-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" style={{ width: 16, height: 16 }}><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </span>
                YouTube
              </a>
            </div>
          </section>

          <section>
            <h2 class="ad-section-title">{t("aboutDialog.help.title")}</h2>
            <div class="ad-help-row">
              <button
                type="button"
                class="ad-help-link"
                onClick={(e) => {
                  e.preventDefault();
                  if (typeof openHelpLink === "function") {
                    openHelpLink("firefox-help");
                  }
                }}
                data-l10n-id="aboutdialog-help-user"
              >
                {t("aboutDialog.links.help")}
              </button>
              <a
                href="https://vedatguldu.github.io/g-browser/support.html"
                target="_blank"
                rel="noopener noreferrer"
                class="ad-help-link"
                aria-describedby="opensInNewWindow"
                aria-label={`${t("aboutDialog.help.support")} (${t("aboutDialog.opensExternal", { defaultValue: "opens external link" })})`}
                onClick={(e) => {
                  e.preventDefault();
                  openExternalUrl("https://vedatguldu.github.io/g-browser/support.html");
                }}
              >
                {t("aboutDialog.help.support")}
              </a>
            </div>
          </section>

          <section>
            <h2 class="ad-section-title">{t("aboutDialog.sponsor.title")}</h2>
            <a
              href="https://github.com/sponsors/vedatguldu"
              target="_blank"
              rel="noopener noreferrer"
              class="ad-btn ad-btn-outline"
              aria-describedby="opensInNewWindow"
              aria-label={`${t("aboutDialog.sponsor.button")} (${t("aboutDialog.opensExternal", { defaultValue: "opens external link" })})`}
              onClick={(e) => {
                e.preventDefault();
                openExternalUrl("https://github.com/sponsors/vedatguldu");
              }}
            >
              {t("aboutDialog.sponsor.button")}
            </a>
          </section>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer class="ad-footer">
        {(distroAbout || distroId) && (
          <div class="ad-footer-distro">
            {distroAbout && <span style={{ fontWeight: 600 }}>{distroAbout}</span>}
            {distroAbout && distroId && " — "}
            {distroId && <span>{distroId}</span>}
          </div>
        )}
        {releaseNotesUrl && (
          <a
            href={releaseNotesUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-describedby="opensInNewWindow"
            aria-label={`${t("aboutDialog.links.releaseNotes")} (${t("aboutDialog.opensExternal", { defaultValue: "opens external link" })})`}
            onClick={(e) => {
              e.preventDefault();
              openExternalUrl(releaseNotesUrl!);
            }}
            data-l10n-id="releaseNotes-link"
          >
            {t("aboutDialog.links.releaseNotes")}
          </a>
        )}
        <a
          href="about:license"
          target="_blank"
          rel="noopener noreferrer"
          aria-describedby="opensInNewWindow"
          aria-label={`${t("aboutDialog.links.licensing")} (${t("aboutDialog.opensExternal", { defaultValue: "opens external link" })})`}
          onClick={(e) => {
            e.preventDefault();
            openExternalUrl("about:license");
          }}
          data-l10n-id="bottomLinks-license"
        >
          {t("aboutDialog.links.licensing")}
        </a>
        <a
          href="https://vedatguldu.com/gizlilik-politikasi"
          target="_blank"
          rel="noopener noreferrer"
          aria-describedby="opensInNewWindow"
          aria-label={`${t("aboutDialog.links.privacy")} (${t("aboutDialog.opensExternal", { defaultValue: "opens external link" })})`}
          onClick={(e) => {
            e.preventDefault();
            openExternalUrl("https://vedatguldu.com/gizlilik-politikasi");
          }}
          data-l10n-id="bottom-links-privacy"
        >
          {t("aboutDialog.links.privacy")}
        </a>
        <a
          href="https://vedatguldu.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-describedby="opensInNewWindow"
          aria-label={`${t("aboutDialog.links.terms")} (${t("aboutDialog.opensExternal", { defaultValue: "opens external link" })})`}
          onClick={(e) => {
            e.preventDefault();
            openExternalUrl("https://vedatguldu.com");
          }}
          data-l10n-id="bottom-links-terms"
        >
          {t("aboutDialog.links.terms")}
        </a>
        <p class="ad-tm">{t("aboutDialog.trademark")}</p>
      </footer>
    </main>
  );
}
