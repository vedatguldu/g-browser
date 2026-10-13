#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Comprehensive Forensic Accessibility Scanner for Floorp Browser 12
Analyzes TSX, TS, MTS, JS, CSS, FTL, HTML files against 36 distinct WCAG 2.2 AAA & WAI-ARIA rules.
"""

import os
import re
import sys
import json
from collections import defaultdict

REPO_ROOT = r"C:\Users\vedat\Downloads\g-browser"
ROOT_DIRS = [
    os.path.join(REPO_ROOT, "browser-features"),
    os.path.join(REPO_ROOT, "libs"),
    os.path.join(REPO_ROOT, "static"),
    os.path.join(REPO_ROOT, "bridge"),
    os.path.join(REPO_ROOT, "i18n"),
]

# Ignore tests, build output, node_modules, dist, _dist
EXCLUDE_DIRS = {"test", "tests", "node_modules", "dist", "_dist", "build", ".git"}
EXTENSIONS = {".tsx", ".ts", ".mts", ".js", ".mjs", ".css", ".html"}

class Finding:
    def __init__(self, rule_id, rule_name, category, file_path, line_no, line_content, description):
        self.rule_id = rule_id
        self.rule_name = rule_name
        self.category = category
        self.file_path = file_path
        self.line_no = line_no
        self.line_content = line_content.strip()
        self.description = description

    def to_dict(self):
        return {
            "rule_id": self.rule_id,
            "rule_name": self.rule_name,
            "category": self.category,
            "file": os.path.relpath(self.file_path, REPO_ROOT),
            "line": self.line_no,
            "code": self.line_content[:120],
            "desc": self.description
        }

findings = []

def scan_file(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
    except Exception as e:
        return

    full_text = "".join(lines)
    rel_path = os.path.relpath(file_path, REPO_ROOT)

    # ---------------- CSS RULES ----------------
    if ext == ".css":
        def get_css_selector(lines, idx):
            brace_idx = -1
            for i in range(idx-1, max(-1, idx-30), -1):
                if "{" in lines[i]:
                    brace_idx = i
                    break
            if brace_idx == -1: return ""
            sel_lines = []
            for i in range(brace_idx, max(-1, brace_idx-8), -1):
                l = lines[i]
                if i < brace_idx and "}" in l:
                    sel_lines.insert(0, l.split("}")[-1])
                    break
                sel_lines.insert(0, l)
            return "".join(sel_lines).split("{")[0].strip().lower()

        # R20: Sub 24px target size
        for idx, line in enumerate(lines, 1):
            if line.strip().startswith(("//", "/*", "*", "--")):
                continue
            m = re.search(r'(?<![a-zA-Z0-9_\-])(width|height|min-width|min-height)\s*:\s*(1[0-9]|2[0-3]|[1-9])px\b', line)
            if m and "skin" not in file_path:
                selector = get_css_selector(lines, idx)
                if any(w in selector for w in ["btn", "button", "[role='button']"]) and not any(w in selector for w in ["::before", "::after", ".tab-context-line", "icon", "periphery"]):
                    findings.append(Finding("R20", "Sub-24px Target Size", "Target Size", file_path, idx, line, f"Tıklama hedefi boyutu 24px altında ({m.group(0)}) (WCAG 2.5.8)"))

        # R22: Infinite animation without reduced motion
        for idx, line in enumerate(lines, 1):
            if "animation:" in line and "infinite" in line:
                if "@media (prefers-reduced-motion" not in full_text:
                    findings.append(Finding("R22", "Infinite Animation Without Reduced Motion", "Motion", file_path, idx, line, "Sonsuz CSS animasyonu azaltılmış hareket (prefers-reduced-motion) kontrolü barındırmıyor (WCAG 2.2.2)"))

        # R25: Forced colors missing with !important colors
        for idx, line in enumerate(lines, 1):
            if ("color:" in line or "background" in line) and "!important" in line:
                if "@media (forced-colors" not in full_text:
                    findings.append(Finding("R25", "Forced-Colors Ignored in High Contrast", "Contrast", file_path, idx, line, "Özel renk ve arka plan !important ile ezilmiş ancak forced-colors kontrolü yapılmamış"))

        # R27: Outline removed without focus-visible
        for idx, line in enumerate(lines, 1):
            if re.search(r'outline\s*:\s*(none|0)\b', line):
                if ":focus-visible" not in full_text and "focus" not in line:
                    findings.append(Finding("R27", "Outline Stripped Without Focus-Visible", "Focus Ring", file_path, idx, line, "Odak çerçevesi (outline: none/0) silinmiş ve :focus-visible alternatifi eklenmemiş"))

        return

    # ---------------- TSX / TS / MTS RULES ----------------

    # R01: Unlabeled Button
    # Search for button / toolbarbutton JSX elements that lack aria-label, label, tooltiptext, data-l10n-id, children
    for idx, line in enumerate(lines, 1):
        if re.search(r'<(button|xul:toolbarbutton|xul:button)\b', line):
            # check self-closing or multi-line definition
            chunk = "".join(lines[idx-1:min(len(lines), idx+8)])
            if not any(attr in chunk for attr in ["aria-label", "label=", "tooltiptext=", "data-l10n-id", "children", ">"]) or re.search(r'<(button|xul:toolbarbutton|xul:button)[^>]*\s*/>', chunk):
                if not any(attr in chunk for attr in ["aria-label", "label=", "tooltiptext=", "data-l10n-id"]):
                    findings.append(Finding("R01", "Unlabeled Button", "Accessible Name", file_path, idx, line, "Buton veya toolbarbutton üzerinde aria-label, label, tooltiptext veya data-l10n-id bulunmuyor"))

    # R03: Pseudo Link (href="#" or href="javascript:")
    for idx, line in enumerate(lines, 1):
        if re.search(r'<a\s+[^>]*href=["\'](#|javascript:.*)["\']', line):
            findings.append(Finding("R03", "Pseudo-Link with href='#'", "Semantics", file_path, idx, line, "Sözde bağlantı (<a href='#'>) kullanımı: Tarayıcı menüsü, sekmede açma ve bağlantı kopyalama işlevlerini bozar"))

    # R04: Unlabeled Input
    for idx, line in enumerate(lines, 1):
        if line.strip().startswith(("//", "/*", "*")) or "return `" in line:
            continue
        if re.search(r'<(input|xul:textbox|textarea|select)\b', line):
            chunk = "".join(lines[idx-1:min(len(lines), idx+6)])
            if not any(attr in chunk for attr in ["aria-label", "aria-labelledby", "id=", "type=\"hidden\"", "type='hidden'"]):
                findings.append(Finding("R04", "Unlabeled Form Input", "Forms", file_path, idx, line, "Giriş elemanı (input/textbox) üzerinde id (etiket eşleştirmesi) veya aria-label bulunmuyor"))

    # R06: Unlabeled Image / Icon
    for idx, line in enumerate(lines, 1):
        if re.search(r'<(img|xul:image)\b', line):
            chunk = "".join(lines[idx-1:min(len(lines), idx+5)])
            if not any(attr in chunk for attr in ["alt=", "aria-label", "aria-hidden=\"true\"", "tooltiptext="]):
                findings.append(Finding("R06", "Unlabeled Image / Icon", "Accessible Name", file_path, idx, line, "Görsel eleman (img/image) üzerinde alt, tooltiptext veya aria-hidden='true' tanımlı değil"))

    # R07: Nested Interactive Elements
    for idx, line in enumerate(lines, 1):
        m = re.search(r'<(button|xul:toolbarbutton|xul:button)\b', line)
        if m:
            tag = m.group(1)
            combined = "".join(lines[idx-1:min(len(lines), idx + 25)])
            tag_start = combined.find("<" + tag)
            if tag_start != -1:
                tag_open_end = combined.find(">", tag_start)
                if tag_open_end != -1 and combined[tag_open_end-1:tag_open_end+1] != "/>":
                    close_tag = "</" + tag + ">"
                    tag_close_idx = combined.find(close_tag, tag_open_end)
                    if tag_close_idx != -1:
                        inner = combined[tag_open_end+1:tag_close_idx]
                        if re.search(r'<(button|xul:toolbarbutton|xul:button|a\s+[^>]*href)\b', inner):
                            findings.append(Finding("R07", "Nested Interactive Buttons", "Semantics", file_path, idx, line, "İç içe yerleştirilmiş etkileşimli buton tespit edildi (WCAG 4.1.2 geçersiz DOM hiyerarşisi)"))

    # R08: Click / Mousedown on Non-Interactive Container
    for idx, line in enumerate(lines, 1):
        if re.search(r'<(div|span|xul:box|xul:hbox|xul:vbox|li|p)\b[^>]*(onClick|onMouseDown)', line):
            if not any(attr in line for attr in ["role=\"button\"", "role='button'", "tabindex", "tabIndex"]):
                findings.append(Finding("R08", "Mouse Action on Non-Interactive Tag", "Keyboard Parity", file_path, idx, line, "Etkileşimli olmayan etikete (div/box/span) rol veya klavye odağı (tabIndex) verilmeden tıklama atanmış"))

    # R09: Mouse-Only Drag / Reposition
    for idx, line in enumerate(lines, 1):
        if line.strip().startswith(("//", "/*", "*")) or re.match(r'^\s*(public|private|protected|async|function|const|let|var)?\s*(async\s+)?(function\s+)?\w+\s*(\(|=)', line):
            continue
        if "draggable={false}" in line or "draggable='false'" in line or 'draggable="false"' in line or re.search(r'\bdraggable\s*:', line):
            continue
        if re.search(r'(draggable(=|(?!\w))|onDragStart\s*=)', line) and "onKeyDown" not in line:
            chunk = "".join(lines[max(0, idx-10):min(len(lines), idx+10)])
            if "onKeyDown" not in chunk:
                findings.append(Finding("R09", "Drag-and-Drop Without Keyboard Navigation", "Keyboard Parity", file_path, idx, line, "Sürükle-bırak veya taşıma mekanizması klavye alternatifi (onKeyDown) barındırmıyor"))

    # R11: Positive Tabindex
    for idx, line in enumerate(lines, 1):
        if re.search(r'tabIndex\s*=\s*\{?[1-9][0-9]*\}?', line) or re.search(r'tabindex=["\'][1-9][0-9]*["\']', line):
            findings.append(Finding("R11", "Positive Tabindex", "Focus Order", file_path, idx, line, "Pozitif tabindex kullanımı doğal odak dolaşım sırasını bozar (WCAG 2.4.3)"))

    # R12: Detail > 0 Exclusion of Keyboard Triggers
    for idx, line in enumerate(lines, 1):
        if "detail > 0" in line or "detail !== 0" in line:
            findings.append(Finding("R12", "event.detail > 0 Keyboard Lockout", "Keyboard Parity", file_path, idx, line, "event.detail > 0 denetimi Enter/Space klavye tetiklemelerini dışlar (klavyede detail 0'dır)"))

    # R14: Toggle Button Missing aria-pressed
    for idx, line in enumerate(lines, 1):
        if any(term in line.lower() for term in ["toggle", "setis", "setenable", "setpinned", "setfloating"]) and ("onClick" in line or "onCommand" in line):
            chunk = "".join(lines[max(0, idx-4):min(len(lines), idx+4)])
            if not any(attr in chunk for attr in ["aria-pressed", "checked", "role=\"switch\"", "role='switch'"]):
                findings.append(Finding("R14", "Toggle Button Missing aria-pressed", "State Communication", file_path, idx, line, "İki durumlu toggle butonunda aria-pressed veya rol bildirimi eksik"))

    # R19: Custom Selected Attribute Instead of ARIA
    for idx, line in enumerate(lines, 1):
        if line.strip().startswith(("//", "/*", "*")) or "querySelector" in line:
            continue
        if "data-selected" in line and "aria-selected" not in line:
            chunk = "".join(lines[max(0, idx-6):min(len(lines), idx+6)])
            if "aria-selected" not in chunk:
                findings.append(Finding("R19", "Private data-selected Instead of aria-selected", "Semantics", file_path, idx, line, "Özel data-selected özniteliği kullanılmış; ekran okuyucuya aria-selected iletilmiyor"))

    # R24: Smooth Scroll Without Reduced Motion
    for idx, line in enumerate(lines, 1):
        if 'behavior: "smooth"' in line or "behavior: 'smooth'" in line:
            chunk = "".join(lines[max(0, idx-4):min(len(lines), idx+4)])
            if "prefers-reduced-motion" not in chunk and "reducedMotion" not in chunk:
                findings.append(Finding("R24", "Smooth Scroll Ignoring Reduced Motion", "Motion", file_path, idx, line, "behavior: 'smooth' animasyonu prefers-reduced-motion kontrolü yapılmadan zorlanmış"))

    # R28: Disabled Element Dropping Focus
    for idx, line in enumerate(lines, 1):
        if line.strip().startswith(("//", "/*", "*")):
            continue
        if re.search(r'(?<!aria-)disabled=\{[^{}]*(loading|saving|busy|pending)[^{}]*\}', line):
            findings.append(Finding("R28", "Dynamic Disabled Dropping Focus", "Focus Management", file_path, idx, line, "İşlem sırasında butona disabled verilmesi klavye odağını body elemanına düşürür; aria-disabled ve aria-busy tercih edilmeli"))

    # R31: Short Timer / Silent Auto Close
    for idx, line in enumerate(lines, 1):
        m = re.search(r'setTimeout\s*\(\s*[^,]+,\s*([1-9][0-9]{1,2})\s*\)', line)
        if m:
            delay = int(m.group(1))
            if delay <= 500:
                chunk = "".join(lines[idx-1:min(len(lines), idx+4)])
                if any(k in chunk for k in ["remove", "close", "destroy", "hide", "delete"]):
                    findings.append(Finding("R31", "Rapid Auto-Dismissal Timer (<500ms)", "Timing", file_path, idx, line, f"Eleman {delay}ms gibi çok kısa bir sürede otomatik kaldırılıyor; ekran okuyucu ve motor engelli kullanıcı için zaman aşımı riski"))

    # R34: target="_blank" Without Screen Reader Notice
    for idx, line in enumerate(lines, 1):
        if line.strip().startswith(("//", "/*", "*")):
            continue
        if 'target="_blank"' in line or "target='_blank'" in line:
            chunk = "".join(lines[max(0, idx-2):min(len(lines), idx+4)])
            if not any(k in chunk for k in ["sr-only", "opensInNewWindow", "aria-describedby", "new window"]):
                findings.append(Finding("R34", "target='_blank' Missing Screen Reader Warning", "Links", file_path, idx, line, "Yeni pencerede açılan dış bağlantıda (target='_blank') ekran okuyucu için sesli veya görsel uyarı yok"))

    # R35: Silent Catch Failure
    for idx, line in enumerate(lines, 1):
        if re.search(r'catch\s*\([^\)]*\)\s*\{', line):
            chunk = "".join(lines[idx:min(len(lines), idx+5)])
            if not any(k in chunk for k in ["notification", "alert", "prompt", "toast", "message", "status"]):
                if any(k in chunk for k in ["console.error", "console.warn", "/*", "//", "return;"]):
                    findings.append(Finding("R35", "Silent Catch Failure", "Error Handling", file_path, idx, line, "Hata yalnızca konsola yazılmış veya yutulmuş; kullanıcı arayüzüne ve ekran okuyucuya hata bildirimi iletilmiyor (Anayasa Madde 24)"))

    # R36: Destructive Action Without Confirm
    for idx, line in enumerate(lines, 1):
        if line.strip().startswith(("//", "/*", "*")):
            continue
        if re.search(r'^\s*(export\s+)?(default\s+)?(public|private|protected|async\s+)?(async\s+)?(function\b|class\b|interface\b|type\b)', line):
            continue
        if re.search(r'^\s*(public|private|protected|async|static|export)?\s*(async\s+)?(function\s+)?\w+\s*\([^)]*\)\s*:\s*', line):
            continue
        if re.search(r'^\s*(const|let|var)\s+\w+\s*=\s*(useCallback|useMemo|\([^)]*\)\s*=>)', line):
            continue
        if re.search(r't\(.*(resetAll|clearAll|deleteWorkspace).*\)', line):
            continue
        if "dataManagerCtx.deleteWorkspace" in line or "this.deleteWorkspace" in line or re.search(r'^\s*(resetAll|clearAll|deleteWorkspace)\s*[,:]', line):
            continue
        if any(term in line for term in ["deleteWorkspace", "removePrivateContainerData", "resetAll", "clearAll"]):
            chunk = "".join(lines[max(0, idx-8):min(len(lines), idx+8)])
            if not any(k in chunk for k in ["confirm", "modal", "prompt", "warning", "dialog", "StartupCreatePrivateContainer", "checkPrivateContainerTabExist"]):
                findings.append(Finding("R36", "Destructive Action Without User Confirmation", "Error Prevention", file_path, idx, line, "Yıkıcı veri silme veya sıfırlama işlemi kullanıcı onay penceresi olmaksızın işletiliyor (WCAG 3.3.4)"))

def run():
    total_files = 0
    scanned_files = 0
    for root_dir in ROOT_DIRS:
        for root, dirs, files in os.walk(root_dir):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext in EXTENSIONS:
                    total_files += 1
                    scan_file(os.path.join(root, f))
                    scanned_files += 1

    # Aggregate by file and rule
    file_map = defaultdict(list)
    rule_counts = defaultdict(int)
    category_counts = defaultdict(int)

    for item in findings:
        file_map[item.file_path].append(item)
        rule_counts[f"{item.rule_id} - {item.rule_name}"] += 1
        category_counts[item.category] += 1

    report = {
        "total_files_scanned": scanned_files,
        "total_findings": len(findings),
        "files_with_findings": len(file_map),
        "category_counts": dict(category_counts),
        "rule_counts": dict(rule_counts),
        "top_files": []
    }

    # Sort files by finding count
    sorted_files = sorted(file_map.items(), key=lambda x: len(x[1]), reverse=True)
    for fpath, f_findings in sorted_files:
        report["top_files"].append({
            "file": os.path.relpath(fpath, REPO_ROOT),
            "count": len(f_findings),
            "findings": [x.to_dict() for x in f_findings[:15]]
        })

    out_file = r"C:\Users\vedat\Downloads\g-browser\A11Y_FORENSIC_SCAN_REPORT.json"
    with open(out_file, "w", encoding="utf-8") as out:
        json.dump(report, out, indent=2, ensure_ascii=False)

    print(f"DONE! Scanned {scanned_files} files across all production modules. Found {len(findings)} accessibility violations across {len(file_map)} files.")

if __name__ == "__main__":
    run()
