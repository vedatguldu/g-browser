#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Update brand names across all 29 aboutDialog locale files to G-Browser.
"""

import os
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOCALES_DIR = ROOT / "browser-features" / "pages-aboutDialog" / "src" / "lib" / "i18n" / "locales"


def update_locales():
    count = 0
    for file_path in LOCALES_DIR.glob("*.json"):
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        ad = data.get("aboutDialog", {})
        if not ad:
            continue

        # Update ariaLabel
        if "ariaLabel" in ad and "Floorp" in ad["ariaLabel"]:
            ad["ariaLabel"] = ad["ariaLabel"].replace("Floorp", "G-Browser")

        # Update links.help
        links = ad.get("links", {})
        if "help" in links and "Floorp" in links["help"]:
            links["help"] = links["help"].replace("Floorp", "G-Browser")

        # Update trademark
        if file_path.stem == "tr-TR":
            ad["trademark"] = "G-Browser, Vedat Güldü tarafından geliştirilen modern bir web tarayıcısıdır."
        else:
            ad["trademark"] = "G-Browser is a modern web browser developed by Vedat Güldü."

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        count += 1

    print(f"Updated {count} locale files to G-Browser.")


if __name__ == "__main__":
    update_locales()
