import os
import sys
import shutil
import zipfile
import subprocess

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(PROJECT_ROOT, "_dist")
NORANEKO_DIR = os.path.join(DIST_DIR, "noraneko")
PACKAGE_DIR = os.path.join(DIST_DIR, "package", "floorp")
DEVDIR_IN_PACKAGE = os.path.join(PACKAGE_DIR, "noraneko-devdir")
APP_ZIP = os.path.join(DIST_DIR, "app.zip")
INSTALLER_CS = os.path.join(PROJECT_ROOT, "tools", "native", "installer.cs")
UNINSTALL_CS = os.path.join(PROJECT_ROOT, "tools", "native", "uninstall.cs")
KIT_ICO = os.path.join(PROJECT_ROOT, "tools", "native", "kit.ico")
SETUP_EXE = os.path.join(PROJECT_ROOT, "G-Browser-Setup-x64.exe")
CSC = r"C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
DENO_EXE = os.path.expanduser(r"~\.lmstudio\.internal\utils\deno.exe")

if "--build" in sys.argv:
    print("[0] Building production frontend bundles via Deno...")
    build_script = os.path.join(PROJECT_ROOT, "tools", "scripts", "build-prod.ts")
    res_b = subprocess.run([DENO_EXE, "run", "-A", build_script], cwd=PROJECT_ROOT)
    if res_b.returncode != 0:
        print("Frontend production build failed!")
        sys.exit(1)
    print("  Production bundles built successfully.")

print("[0.5] Generating and synchronizing G-Browser visual branding assets...")
brand_script = os.path.join(PROJECT_ROOT, "branding", "generate_branding.py")
res_brand = subprocess.run([sys.executable, brand_script], cwd=PROJECT_ROOT)
if res_brand.returncode != 0:
    print("Branding asset generation failed!")
    sys.exit(1)
print("  Branding assets synchronized.")

print("[1] Syncing built assets from _dist/noraneko to package noraneko-devdir...")
if not os.path.exists(DEVDIR_IN_PACKAGE):
    os.makedirs(DEVDIR_IN_PACKAGE, exist_ok=True)

# Copy directories from noraneko (symlink targets or folders)
for item in os.listdir(NORANEKO_DIR):
    src_item = os.path.join(NORANEKO_DIR, item)
    dst_item = os.path.join(DEVDIR_IN_PACKAGE, item)
    if os.path.isdir(src_item):
        if os.path.exists(dst_item):
            shutil.rmtree(dst_item)
        shutil.copytree(src_item, dst_item)
        print(f"  Copied dir: {item}")
    elif os.path.isfile(src_item):
        shutil.copy2(src_item, dst_item)
        print(f"  Copied file: {item}")

# Also copy manifest if needed
src_manifest = os.path.join(DIST_DIR, "noraneko.manifest")
if os.path.exists(src_manifest):
    shutil.copy2(src_manifest, os.path.join(DEVDIR_IN_PACKAGE, "noraneko.manifest"))

print("[1.5] Syncing default preferences (DoH, Privacy, AdShield, MediaDownloader)...")
pref_dir = os.path.join(PACKAGE_DIR, "browser", "defaults", "preferences")
os.makedirs(pref_dir, exist_ok=True)
with open(os.path.join(pref_dir, "zzz-floorp.js"), "w", encoding="utf-8") as f:
    f.write('''// Crucial Floorp runtime overrides loaded last
pref("security.allow_parent_unrestricted_js_loads", true);
pref("security.disallow_privileged_https_script_loads", false);
pref("nora.dev.allow_http_loader", false);
// GPU process stays disabled: it crashes on startup on this Windows setup
// (COM apartment assertion in ApartmentRegion.h). Compositing runs in-process.
pref("layers.gpu-process.enabled", false);
pref("browser.newtabpage.enabled", true);

// Startup: skip blocking first-run / release-notes pages
pref("browser.startup.homepage_override.mstone", "ignore");
pref("browser.tabs.remote.warmup.enabled", true);
pref("browser.slowStartup.notificationDisabled", true);
pref("floorp.releaseNotes.choiceConfirmed", true);
pref("floorp.releaseNotes.mode", "disabled");
pref("toolkit.telemetry.enabled", false);
pref("toolkit.telemetry.unified", false);
pref("browser.search.update", false);

// Secure DNS (DoH) & Network Acceleration
pref("network.trr.mode", 2);
pref("network.trr.uri", "https://cloudflare-dns.com/dns-query");
pref("network.trr.custom_uri", "https://cloudflare-dns.com/dns-query");
pref("network.trr.bootstrapAddress", "1.1.1.1");
pref("network.dns.echconfig.enabled", true);
pref("network.dns.use_https_rr_as_alpn", true);
pref("network.http.http3.enable", true);
pref("network.ssl_tokens_cache_enabled", true);
pref("network.tcp.keepalive.enabled", true);
pref("network.notify.IPv6", false);

// Native Tracking Protection, Total Cookie Protection & AdShield
pref("privacy.trackingprotection.enabled", true);
pref("privacy.trackingprotection.pbmode.enabled", true);
pref("privacy.trackingprotection.cryptomining.enabled", true);
pref("privacy.trackingprotection.fingerprinting.enabled", true);
pref("privacy.trackingprotection.socialtracking.enabled", true);
pref("network.cookie.cookieBehavior", 5);
pref("privacy.query_stripping.enabled", true);
pref("privacy.query_stripping.strip_list", "__hsfp __hssc __hstc __s _hsenc _openstat dclid fbclid gbraid gclid hsCtsTracking igshid mc_eid ml_subscriber mkt_tok msclkid oft_c oft_ck oft_d oft_id oft_ids oft_k oft_lk oft_sk oly_anon_id oly_enc_id rb_clickid s_cid twclid vero_conv vero_id wbraid wickedid yclid");
pref("floorp.adshield.enabled", true);
pref("floorp.mediadownloader.enabled", true);
pref("floorp.mediadownloader.auto_scan", true);
pref("floorp.mediadownloader.detect.video", true);
pref("floorp.mediadownloader.detect.audio", true);
pref("floorp.mediadownloader.detect.stream", true);
pref("floorp.mediadownloader.notify.detected", true);
''')

# Until our own update channel exists, block the upstream updater so it cannot
# replace this customized build with a stock upstream build. Enterprise policy is
# the supported mechanism; app.update.* prefs are not honoured by modern Firefox.
policy_dir = os.path.join(PACKAGE_DIR, "distribution")
os.makedirs(policy_dir, exist_ok=True)
with open(os.path.join(policy_dir, "policies.json"), "w", encoding="utf-8") as f:
    f.write('{\n  "policies": {\n    "DisableAppUpdate": true\n  }\n}\n')

print("[2] Compiling uninstall.exe from tools/native/uninstall.cs...")
uninstall_out = os.path.join(PACKAGE_DIR, "uninstall.exe")
csc_uninstall_cmd = [
    CSC,
    "/target:winexe",
    f"/out:{uninstall_out}",
    f"/win32icon:{KIT_ICO}",
    "/optimize+",
    "/platform:x64",
    UNINSTALL_CS
]
res_un = subprocess.run(csc_uninstall_cmd, capture_output=True)
if res_un.returncode != 0:
    print("CSC compilation of uninstall.exe failed!")
    print(res_un.stdout.decode('cp857', errors='replace'))
    sys.exit(1)
print(f"  uninstall.exe compiled successfully: {os.path.getsize(uninstall_out)} bytes")

print("[3] Ensuring g-browser.exe exists and checking PE headers...")
floorp_exe = os.path.join(PACKAGE_DIR, "floorp.exe")
gbrowser_exe = os.path.join(PACKAGE_DIR, "g-browser.exe")

# Always ensure g-browser.exe is synchronized with floorp.exe
shutil.copy2(floorp_exe, gbrowser_exe)
print("  Synchronized g-browser.exe from floorp.exe")

for target_exe in [floorp_exe, gbrowser_exe]:
    exe_name = os.path.basename(target_exe)
    with open(target_exe, "r+b") as f:
        data = bytearray(f.read())
        pe_offset = int.from_bytes(data[0x3C:0x40], "little")
        magic = int.from_bytes(data[pe_offset+24:pe_offset+26], "little")
        subsystem_offset = pe_offset + 24 + (68 if magic == 0x20b else 68)
        cur_subsystem = int.from_bytes(data[subsystem_offset:subsystem_offset+2], "little")
        print(f"  {exe_name} Subsystem: {cur_subsystem} ({'GUI' if cur_subsystem==2 else 'CUI'})")
        if cur_subsystem != 2:
            data[subsystem_offset] = 2
            data[subsystem_offset+1] = 0
            f.seek(0)
            f.write(data)
            print(f"  Patched {exe_name} Subsystem to 2 (GUI) successfully!")

print(f"[4] Creating {APP_ZIP} from {PACKAGE_DIR}...")
if os.path.exists(APP_ZIP):
    os.remove(APP_ZIP)
with zipfile.ZipFile(APP_ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
    for root, dirs, files in os.walk(PACKAGE_DIR):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, PACKAGE_DIR)
            zipf.write(full_path, rel_path)
zip_size_mb = os.path.getsize(APP_ZIP) / (1024 * 1024)
print(f"  app.zip created: {zip_size_mb:.2f} MB")

print(f"[5] Compiling {os.path.basename(SETUP_EXE)} with csc.exe...")
csc_cmd = [
    CSC,
    "/target:winexe",
    f"/out:{SETUP_EXE}",
    f"/win32icon:{KIT_ICO}",
    f"/resource:{APP_ZIP},app.zip",
    "/reference:System.IO.Compression.dll",
    "/reference:System.IO.Compression.FileSystem.dll",
    "/optimize+",
    "/platform:x64",
    INSTALLER_CS
]
res = subprocess.run(csc_cmd, capture_output=True)
if res.returncode != 0:
    print("CSC compilation failed!")
    print(res.stdout.decode('cp857', errors='replace'))
    print(res.stderr.decode('cp857', errors='replace'))
    sys.exit(1)

setup_size_mb = os.path.getsize(SETUP_EXE) / (1024 * 1024)
print(f"  {os.path.basename(SETUP_EXE)} compiled successfully: {setup_size_mb:.2f} MB")

# If in Downloads, also copy to Downloads folder if not already there
user_downloads_setup = os.path.join(os.path.expanduser("~"), "Downloads", os.path.basename(SETUP_EXE))
if os.path.abspath(SETUP_EXE) != os.path.abspath(user_downloads_setup):
    shutil.copy2(SETUP_EXE, user_downloads_setup)
    print(f"  Copied installer to: {user_downloads_setup}")

print("[6] Running silent install to update %LocalAppData%\\Programs\\G-Browser...")
res_install = subprocess.run([SETUP_EXE, "/S"], capture_output=True)
print(f"  Silent install finished with exit code {res_install.returncode}")
print("ALL DONE!")
