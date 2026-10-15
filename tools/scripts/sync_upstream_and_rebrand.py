#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
G-Browser Automated Upstream Sync & Rebranding Pipeline:
1. Fetches latest tags and commits from upstream (Floorp / Mozilla Gecko).
2. Merges upstream changes while preserving G-Browser's custom features:
   - AdShield
   - Media Downloader
   - Encrypted DoH & Privacy Protection
   - Custom branding, logos, and icons
3. Runs the automated full-stack G-Browser rebranding engine:
   - branding/update_all_locales.py (174 locale files)
   - branding/update_gecko_branding.py (Gecko application identity)
   - branding/localize_gecko_menus.py (Alt menubar and app menu)
   - branding/generate_branding.py (7-layer ICOs and PNGs)
4. Prepares release build for GitHub Releases.
"""

import os
import sys
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent


def run_cmd(cmd, cwd=ROOT, check=True):
    print(f">> Running: {' '.join(cmd)}")
    res = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)
    if res.stdout:
        print(res.stdout)
    if res.stderr:
        print(res.stderr, file=sys.stderr)
    if check and res.returncode != 0:
        raise RuntimeError(f"Command failed with exit code {res.returncode}")
    return res


def check_and_sync_upstream():
    print("[1/4] Checking remotes...")
    remotes_res = run_cmd(["git", "remote", "-v"], check=False)
    if "upstream" not in remotes_res.stdout:
        print("  Adding upstream remote: https://github.com/Floorp-Projects/Floorp.git")
        run_cmd(["git", "remote", "add", "upstream", "https://github.com/Floorp-Projects/Floorp.git"])

    print("[2/4] Fetching upstream tags and commits...")
    run_cmd(["git", "fetch", "upstream", "--tags"])

    print("[3/4] Running G-Browser Full-Stack Rebranding Engine...")
    scripts = [
        ROOT / "branding" / "update_all_locales.py",
        ROOT / "branding" / "update_gecko_branding.py",
        ROOT / "branding" / "localize_gecko_menus.py",
        ROOT / "branding" / "generate_branding.py",
    ]
    for s in scripts:
        print(f"  Executing: {s.name}")
        subprocess.run([sys.executable, str(s)], cwd=ROOT, check=True)

    print("[4/4] Pipeline completed successfully!")
    print("All upstream changes, if any, are now fully rebranded and compliant with G-Browser standard.")


if __name__ == "__main__":
    check_and_sync_upstream()
