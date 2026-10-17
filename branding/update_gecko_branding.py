#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Synchronizes Gecko-level branding and application identity files for G-Browser:
- application.ini (root & browser/)
- brand.properties (window title prefix/suffix, brand names)
- brand.dtd
- brand.ftl (Fluent localization)
- firefox-branding.js (clearing upstream Floorp welcome/override URLs)
- browserIcon.ftl
- updater.ini
Applies to _dist/package/floorp as well as installed paths (%LOCALAPPDATA%/Programs/G-Browser and Floorp).
"""

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACKAGE_DIR = ROOT / "_dist" / "package" / "floorp"

APPLICATION_INI_CONTENT = """; This file defines application identity for G-Browser.
[App]
Vendor=G-Browser
Name=G-Browser
RemotingName=gbrowser
CodeName=G-Browser
Version=157.0
Profile=Floorp
BuildID=20261006221306
ID={ec8030f7-c20a-464f-9b0e-13a3a9e97384}

[Gecko]
MinVersion=157.0
MaxVersion=157.0

[XRE]
EnableProfileMigrator=1

[AppUpdate]
URL=https://%NORA_UPDATE_HOST%update.xml
"""

BRAND_PROPERTIES_CONTENT = """brandShorterName=G-Browser
brandShortName=G-Browser
brandFullName=G-Browser
vendorShortName=G-Browser
mainWindow.titlemodifier=G-Browser
mainWindow.titlemodifiermenuseparator= — 
mainWindow.titlepreface=
"""

BRAND_DTD_CONTENT = """<!-- This Source Code Form is subject to the terms of the Mozilla Public
   - License, v. 2.0. If a copy of the MPL was not distributed with this
   - file, You can obtain one at http://mozilla.org/MPL/2.0/. -->

<!ENTITY  brandShorterName      "G-Browser">
<!ENTITY  brandShortName        "G-Browser">
<!ENTITY  brandFullName         "G-Browser">
<!ENTITY  vendorShortName       "G-Browser">
<!ENTITY  trademarkInfo.part1   "G-Browser is developed by Vedat Güldü.">
<!ENTITY  mainWindow.titlemodifier "G-Browser">
<!ENTITY  mainWindow.titlemodifiermenuseparator " — ">
<!ENTITY  mainWindow.titlepreface "">
"""

BRAND_FTL_CONTENT = """-brand-shorter-name = G-Browser
-brand-short-name = G-Browser
-brand-shortcut-name = G-Browser
-brand-full-name = G-Browser
-brand-product-name = G-Browser
-vendor-short-name = G-Browser
trademarkInfo = G-Browser is developed by Vedat Güldü.
"""

UPDATER_INI_CONTENT = """; This file is in the UTF-8 encoding
[Strings]
Title=G-Browser Güncellemesi
Info=G-Browser güncellemeleri yüklüyor ve birkaç saniye içinde açılacak…
MozillaMaintenanceDescription=G-Browser güncelleme servisi güvenli ve hızlı sürüm güncellemeleri sağlar.

[PostUpdateWin]
ExeRelPath=uninstall\\helper.exe
ExeArg=/PostUpdate
"""

FIREFOX_BRANDING_JS_CONTENT = """/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// G-Browser branding-specific preferences
pref("startup.homepage_override_url", "");
pref("startup.homepage_welcome_url", "");
pref("startup.homepage_welcome_url.additional", "");
pref("app.update.interval", 86400);
pref("app.update.promptWaitTime", 691200);
pref("app.update.url.manual", "https://github.com/vedatguldu/g-browser");
pref("app.update.url.details", "https://vedatguldu.github.io/g-browser/release-notes.html");
pref("app.releaseNotesURL", "https://vedatguldu.github.io/g-browser/release-notes.html");
pref("app.releaseNotesURL.aboutDialog", "https://vedatguldu.github.io/g-browser/release-notes.html");
pref("app.update.checkInstallTime.days", 63);
pref("app.update.badgeWaitTime", 345600);
pref("devtools.selfxss.count", 0);
"""


def apply_branding_to_directory(target_dir: Path):
    if not target_dir.exists():
        return

    # 1. application.ini (root & browser/)
    for sub in ["application.ini", "browser/application.ini"]:
        p = target_dir / sub
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(APPLICATION_INI_CONTENT, encoding="utf-8")

    # 2. brand.properties
    for sub in [
        "browser/chrome/en-US/locale/branding/brand.properties",
        "chrome/en-US/locale/branding/brand.properties",
    ]:
        p = target_dir / sub
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(BRAND_PROPERTIES_CONTENT, encoding="utf-8")

    # 3. brand.dtd
    for sub in [
        "browser/chrome/en-US/locale/branding/brand.dtd",
        "chrome/en-US/locale/branding/brand.dtd",
    ]:
        p = target_dir / sub
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(BRAND_DTD_CONTENT, encoding="utf-8")

    # 4. brand.ftl
    for sub in [
        "browser/localization/en-US/branding/brand.ftl",
        "localization/en-US/branding/brand.ftl",
    ]:
        p = target_dir / sub
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(BRAND_FTL_CONTENT, encoding="utf-8")

    # 5. updater.ini
    p_updater = target_dir / "updater.ini"
    p_updater.write_text(UPDATER_INI_CONTENT, encoding="utf-8")

    # 6. firefox-branding.js
    p_brand_js = target_dir / "browser" / "defaults" / "preferences" / "firefox-branding.js"
    p_brand_js.parent.mkdir(parents=True, exist_ok=True)
    p_brand_js.write_text(FIREFOX_BRANDING_JS_CONTENT, encoding="utf-8")

    # 7. browserIcon.ftl cleanup
    b_icon = target_dir / "browser" / "localization" / "en-US" / "browser" / "preferences" / "browserIcon.ftl"
    if b_icon.exists():
        content = b_icon.read_text(encoding="utf-8")
        content = content.replace("Floorp", "G-Browser").replace("G-Browserle", "Mor")
        b_icon.write_text(content, encoding="utf-8")

    # 8. chrome.manifest
    root_manifest = target_dir / "chrome.manifest"
    manifest_lines = [
        "manifest chrome/chrome.manifest",
        "manifest components/components.manifest",
        "manifest browser/chrome.manifest",
        "manifest noraneko-devdir/noraneko.manifest",
        "locale branding en-US browser/chrome/en-US/locale/branding/",
        "content branding browser/chrome/browser/content/branding/ contentaccessible=yes",
    ]
    root_manifest.write_text("\n".join(manifest_lines) + "\n", encoding="utf-8")

    # 9. browser.xhtml window title & appmenu branding
    p_browser_xhtml = target_dir / "browser" / "chrome" / "browser" / "content" / "browser" / "browser.xhtml"
    if p_browser_xhtml.exists():
        xhtml_content = p_browser_xhtml.read_text(encoding="utf-8")
        modified = False

        # Ensure titlemodifier is set on root window element
        if 'titlemodifier="G-Browser"' not in xhtml_content:
            xhtml_content = xhtml_content.replace(
                '<html id="main-window"',
                '<html id="main-window" titlemodifier="G-Browser" titlemenuseparator=" — " titlepreface=""',
                1
            )
            modified = True

        # Ensure PanelUI-menu-button has explicit G-Browser label and aria-label
        if 'id="PanelUI-menu-button"' in xhtml_content and 'aria-label="G-Browser Menüsü"' not in xhtml_content:
            xhtml_content = xhtml_content.replace(
                'id="PanelUI-menu-button" class="toolbarbutton-1" delegatesanchor="true" badged="true" consumeanchor="PanelUI-button" data-l10n-id="appmenu-menu-button-closed2"',
                'id="PanelUI-menu-button" class="toolbarbutton-1" delegatesanchor="true" badged="true" consumeanchor="PanelUI-button" data-l10n-id="appmenu-menu-button-closed2" aria-label="G-Browser Menüsü" label="G-Browser Menüsü" tooltiptext="Uygulama menüsünü aç"',
                1
            )
            modified = True

        if modified:
            p_browser_xhtml.write_text(xhtml_content, encoding="utf-8")
            print(f"  Patched browser.xhtml window title and menu attributes: {p_browser_xhtml}")


def purge_startup_caches():
    """Purges Gecko startupCache so compiled XUL/FTL/DTD files are cleanly reloaded."""
    import shutil
    cache_roots = [
        Path(os.path.expandvars(r"%LOCALAPPDATA%\Floorp\Profiles")),
        Path(os.path.expandvars(r"%LOCALAPPDATA%\G-Browser\Profiles")),
        Path(os.path.expandvars(r"%APPDATA%\Floorp\Profiles")),
        Path(os.path.expandvars(r"%APPDATA%\G-Browser\Profiles")),
    ]

    for root in cache_roots:
        if not root.exists():
            continue
        for profile_dir in root.iterdir():
            if not profile_dir.is_dir():
                continue
            startup_cache = profile_dir / "startupCache"
            if startup_cache.exists():
                try:
                    shutil.rmtree(startup_cache, ignore_errors=True)
                    print(f"  Purged startupCache: {startup_cache}")
                except Exception as e:
                    print(f"  Failed to purge {startup_cache}: {e}")
            for extra in profile_dir.glob(".startup-*"):
                try:
                    extra.unlink(missing_ok=True)
                except Exception:
                    pass


def sync_gecko_branding():
    targets = [
        PACKAGE_DIR,
        Path(os.path.expandvars(r"%LOCALAPPDATA%\Programs\G-Browser")),
        Path(os.path.expandvars(r"%LOCALAPPDATA%\Programs\Floorp")),
    ]

    for t in targets:
        if t.exists():
            apply_branding_to_directory(t)
            print(f"  Branding synchronized: {t}")

    purge_startup_caches()


if __name__ == "__main__":
    print("[branding] Synchronizing Gecko branding files across package and installed directories...")
    sync_gecko_branding()
    print("[branding] Gecko branding sync completed.")
