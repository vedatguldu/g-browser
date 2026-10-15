#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Update brand names and titles across all internal browser pages:
- pages-welcome, pages-settings, pages-newtab, pages-notes, pages-aboutDialog
- All 29 locale JSON files with proper Turkish case/suffix inflection
- i18n initialization files (productName: "G-Browser")
- HTML index titles
"""

import os
import re
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

TURKISH_REPLACEMENTS = [
    ("Floorp'un", "G-Browser'ın"),
    ("Floorp’un", "G-Browser'ın"),
    ("Floorp'u", "G-Browser'ı"),
    ("Floorp’u", "G-Browser'ı"),
    ("Floorp'a", "G-Browser'a"),
    ("Floorp’a", "G-Browser'a"),
    ("Floorp'ta", "G-Browser'da"),
    ("Floorp’ta", "G-Browser'da"),
    ("Floorp'tan", "G-Browser'dan"),
    ("Floorp’tan", "G-Browser'dan"),
    ("Floorp'la", "G-Browser'la"),
    ("Floorp’la", "G-Browser'la"),
    ("blog.floorp.app", "blog.gbrowser.app"),
    ("docs.floorp.app", "docs.gbrowser.app"),
    ("floorp.app", "gbrowser.app"),
    ("Floorp", "G-Browser"),
]

GENERAL_REPLACEMENTS = [
    ("Floorp's", "G-Browser's"),
    ("Floorp’s", "G-Browser’s"),
    ("blog.floorp.app", "blog.gbrowser.app"),
    ("docs.floorp.app", "docs.gbrowser.app"),
    ("floorp.app", "gbrowser.app"),
    ("Floorp", "G-Browser"),
]


def update_json_file(file_path: Path):
    with open(file_path, "r", encoding="utf-8") as f:
        text = f.read()

    is_tr = file_path.stem == "tr-TR"
    replacements = TURKISH_REPLACEMENTS if is_tr else GENERAL_REPLACEMENTS

    modified = text
    for src, dst in replacements:
        modified = modified.replace(src, dst)

    if modified != text:
        # Validate that it remains valid JSON
        try:
            parsed = json.loads(modified)
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(parsed, f, ensure_ascii=False, indent=2)
                f.write("\n")
            return True
        except Exception as e:
            print(f"Error parsing JSON in {file_path}: {e}")
            return False
    return False


def update_all_locales():
    locales_dirs = list((ROOT / "browser-features").glob("pages-*/src/lib/i18n/locales"))
    updated_count = 0
    total_count = 0

    for ldir in locales_dirs:
        for json_file in ldir.glob("*.json"):
            total_count += 1
            if update_json_file(json_file):
                updated_count += 1

    print(f"Updated {updated_count} of {total_count} locale JSON files across internal pages.")


def update_i18n_ts_files():
    i18n_files = [
        ROOT / "browser-features" / "pages-settings" / "src" / "lib" / "i18n" / "i18n.ts",
        ROOT / "browser-features" / "pages-welcome" / "src" / "lib" / "i18n" / "i18n.ts",
        ROOT / "browser-features" / "pages-newtab" / "src" / "lib" / "i18n" / "i18n.ts",
    ]
    for fp in i18n_files:
        if fp.is_file():
            content = fp.read_text(encoding="utf-8")
            if 'productName: "Floorp"' in content:
                content = content.replace('productName: "Floorp"', 'productName: "G-Browser"')
                fp.write_text(content, encoding="utf-8")
                print(f"Updated productName in {fp.relative_to(ROOT)}")


def update_html_titles():
    html_targets = [
        (ROOT / "browser-features" / "pages-welcome" / "index.html", "<title>Welcome to Floorp</title>", "<title>Welcome to G-Browser</title>"),
        (ROOT / "browser-features" / "pages-newtab" / "index.html", "<title>Floorp Start</title>", "<title>G-Browser Start</title>"),
        (ROOT / "browser-features" / "pages-notes" / "index.html", "<title>Floorp Notes</title>", "<title>G-Browser Notes</title>"),
    ]
    for fp, old_val, new_val in html_targets:
        if fp.is_file():
            content = fp.read_text(encoding="utf-8")
            if old_val in content:
                content = content.replace(old_val, new_val)
                fp.write_text(content, encoding="utf-8")
                print(f"Updated HTML title in {fp.relative_to(ROOT)}")


def update_welcome_components():
    whatsnew = ROOT / "browser-features" / "pages-welcome" / "src" / "app" / "whatsnew" / "page.tsx"
    if whatsnew.is_file():
        content = whatsnew.read_text(encoding="utf-8")
        content = content.replace('defaultValue: "Floorp – What\'s New"', 'defaultValue: "G-Browser – What\'s New"')
        content = content.replace("https://github.com/Floorp-Projects/Floorp", "https://github.com/vedatguldu/g-browser")
        whatsnew.write_text(content, encoding="utf-8")
        print("Updated whatsnew component.")

    finish = ROOT / "browser-features" / "pages-welcome" / "src" / "app" / "finish" / "page.tsx"
    if finish.is_file():
        content = finish.read_text(encoding="utf-8")
        content = content.replace("https://github.com/Floorp-Projects/Floorp", "https://github.com/vedatguldu/g-browser")
        finish.write_text(content, encoding="utf-8")
        print("Updated finish component.")


if __name__ == "__main__":
    update_all_locales()
    update_i18n_ts_files()
    update_html_titles()
    update_welcome_components()
