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
SETUP_EXE = os.path.join(PROJECT_ROOT, "Floorp-Setup-x64.exe")
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

print("[3] Checking PE header of floorp.exe...")
floorp_exe = os.path.join(PACKAGE_DIR, "floorp.exe")
with open(floorp_exe, "r+b") as f:
    data = bytearray(f.read())
    pe_offset = int.from_bytes(data[0x3C:0x40], "little")
    magic = int.from_bytes(data[pe_offset+24:pe_offset+26], "little")
    subsystem_offset = pe_offset + 24 + (68 if magic == 0x20b else 68)
    cur_subsystem = int.from_bytes(data[subsystem_offset:subsystem_offset+2], "little")
    print(f"  Current Subsystem: {cur_subsystem} ({'GUI' if cur_subsystem==2 else 'CUI'})")
    if cur_subsystem != 2:
        data[subsystem_offset] = 2
        data[subsystem_offset+1] = 0
        f.seek(0)
        f.write(data)
        print("  Patched Subsystem to 2 (GUI) successfully!")

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

print("[5] Compiling Floorp-Setup-x64.exe with csc.exe...")
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
print(f"  Floorp-Setup-x64.exe compiled successfully: {setup_size_mb:.2f} MB")

# If in Downloads, also copy to Downloads folder if not already there
user_downloads_setup = os.path.join(os.path.expanduser("~"), "Downloads", "Floorp-Setup-x64.exe")
if os.path.abspath(SETUP_EXE) != os.path.abspath(user_downloads_setup):
    shutil.copy2(SETUP_EXE, user_downloads_setup)
    print(f"  Copied installer to: {user_downloads_setup}")

print("[6] Running silent install to update %LocalAppData%\\Programs\\Floorp...")
res_install = subprocess.run([SETUP_EXE, "/S"], capture_output=True)
print(f"  Silent install finished with exit code {res_install.returncode}")
print("ALL DONE!")
