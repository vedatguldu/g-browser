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
"""

BRAND_DTD_CONTENT = """<!-- This Source Code Form is subject to the terms of the Mozilla Public
   - License, v. 2.0. If a copy of the MPL was not distributed with this
   - file, You can obtain one at http://mozilla.org/MPL/2.0/. -->

<!ENTITY  brandShorterName      "G-Browser">
<!ENTITY  brandShortName        "G-Browser">
<!ENTITY  brandFullName         "G-Browser">
<!ENTITY  vendorShortName       "G-Browser">
<!ENTITY  trademarkInfo.part1   "G-Browser is developed by Vedat Güldü.">
"""

BRAND_FTL_CONTENT = """-brand-shorter-name = G-Browser
-brand-short-name = G-Browser
-brand-shortcut-name = G-Browser
-brand-full-name = G-Browser
-brand-product-name = G-Browser
-vendor-short-name = G-Browser
trademarkInfo = G-Browser is developed by Vedat Güldü.
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
pref("app.update.url.details", "https://github.com/vedatguldu/g-browser/releases");
pref("app.releaseNotesURL", "https://github.com/vedatguldu/g-browser/releases");
pref("app.releaseNotesURL.aboutDialog", "https://github.com/vedatguldu/g-browser/releases");
pref("app.update.checkInstallTime.days", 63);
pref("app.update.badgeWaitTime", 345600);
pref("devtools.selfxss.count", 0);
"""


def sync_gecko_branding():
    if not PACKAGE_DIR.exists():
        print(f"Package directory not found: {PACKAGE_DIR}")
        return

    # 1. application.ini (root & browser/)
    app_ini_targets = [
        PACKAGE_DIR / "application.ini",
        PACKAGE_DIR / "browser" / "application.ini",
    ]
    for target in app_ini_targets:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(APPLICATION_INI_CONTENT, encoding="utf-8")
        print(f"  Synchronized: {target.relative_to(ROOT)}")

    # 2. brand.properties
    brand_prop = PACKAGE_DIR / "browser" / "chrome" / "en-US" / "locale" / "branding" / "brand.properties"
    brand_prop.parent.mkdir(parents=True, exist_ok=True)
    brand_prop.write_text(BRAND_PROPERTIES_CONTENT, encoding="utf-8")
    print(f"  Synchronized: {brand_prop.relative_to(ROOT)}")

    # 3. brand.dtd
    brand_dtd = PACKAGE_DIR / "browser" / "chrome" / "en-US" / "locale" / "branding" / "brand.dtd"
    brand_dtd.parent.mkdir(parents=True, exist_ok=True)
    brand_dtd.write_text(BRAND_DTD_CONTENT, encoding="utf-8")
    print(f"  Synchronized: {brand_dtd.relative_to(ROOT)}")

    # 4. brand.ftl
    brand_ftl = PACKAGE_DIR / "browser" / "localization" / "en-US" / "branding" / "brand.ftl"
    brand_ftl.parent.mkdir(parents=True, exist_ok=True)
    brand_ftl.write_text(BRAND_FTL_CONTENT, encoding="utf-8")
    print(f"  Synchronized: {brand_ftl.relative_to(ROOT)}")

    # 5. firefox-branding.js
    branding_js = PACKAGE_DIR / "browser" / "defaults" / "preferences" / "firefox-branding.js"
    branding_js.parent.mkdir(parents=True, exist_ok=True)
    branding_js.write_text(FIREFOX_BRANDING_JS_CONTENT, encoding="utf-8")
    print(f"  Synchronized: {branding_js.relative_to(ROOT)}")

    # 6. browserIcon.ftl
    browser_icon_ftl = PACKAGE_DIR / "browser" / "localization" / "en-US" / "browser" / "preferences" / "browserIcon.ftl"
    if browser_icon_ftl.exists():
        content = browser_icon_ftl.read_text(encoding="utf-8")
        content = content.replace("Floorp", "G-Browser")
        browser_icon_ftl.write_text(content, encoding="utf-8")
        print(f"  Synchronized: {browser_icon_ftl.relative_to(ROOT)}")


if __name__ == "__main__":
    print("[branding] Synchronizing Gecko branding files...")
    sync_gecko_branding()
    print("[branding] Gecko branding sync completed.")
