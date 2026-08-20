#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gp-redact-secrets.py — che bi mat trong ban SAO LUU code GAS truoc khi push len git.
                       v1.0 (20/08/2026)

    cd /d C:\\Users\\Admin\\foxera-daily
    python gp-redact-secrets.py gas-gerbera

VI SAO CAN: 20/08 GitHub Push Protection chan push vi 'Gerberaprints CRM.js' dong 27
chua Shopify Admin API token that (shpat_...). Day KHONG phai loi cua GitHub — day la
canh bao dung: credential song dang nam cung ma nguon.

CACH LAM: thay GIA TRI bi mat bang __REDACTED__, GIU NGUYEN ten bien va cau truc code.
Ban sao luu van du de doc/diff/khoi phuc logic, chi khong mang theo chia khoa.

⚠️ HE QUA BAT BUOC BIET: sau khi chay script nay, thu muc do KHONG con push nguoc len
Apps Script duoc nua. TUYET DOI KHONG chay 'clasp push' tu day — se ghi __REDACTED__
de len production va lam chet toan bo sync Shopify/Klaviyo.
Thu muc nay tu gio la CHI-DOC.

Sinh them SECRETS-MAP.md: ghi lai da che gi, o file/dong nao (khong ghi gia tri) —
de sau nay biet cho nao can dien lai neu phai khoi phuc.
"""
import os, re, sys, io

PATTERNS = [
    ("Shopify Admin API token",   re.compile(r"shpat_[A-Za-z0-9]{20,}")),
    ("Shopify storefront token",  re.compile(r"shpss_[A-Za-z0-9]{20,}")),
    ("Shopify custom app token",  re.compile(r"shpca_[A-Za-z0-9]{20,}")),
    ("Klaviyo private key",       re.compile(r"pk_[A-Fa-f0-9]{30,}")),
    ("Klaviyo webhook secret",    re.compile(r"whsec_[A-Za-z0-9]{16,}")),
    ("Telegram bot token",        re.compile(r"\b\d{8,12}:[A-Za-z0-9_-]{30,}")),
    ("Meta/FB access token",      re.compile(r"\bEAA[A-Za-z0-9]{60,}")),
    ("Google API key",            re.compile(r"\bAIza[0-9A-Za-z_\-]{35}\b")),
    ("Google OAuth refresh",      re.compile(r"\b1//[0-9A-Za-z_\-]{30,}")),
    ("Slack token",               re.compile(r"\bxox[abpsr]-[0-9A-Za-z\-]{10,}")),
    ("AWS access key",            re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("Airwallex client secret",   re.compile(r"\b[A-Za-z0-9_\-]{60,}\b(?=\s*['\"]\s*;?\s*(//.*)?$)")),
]
# Mau cuoi (Airwallex) rat rong -> chi ap dung khi dong co tu khoa nhay cam
LOOSE_LAST = len(PATTERNS) - 1
SENSITIVE_HINT = re.compile(r"(secret|token|api[_-]?key|password|passwd|credential|client[_-]?secret)", re.I)

def redact_text(txt, fname, report):
    lines = txt.split("\n")
    out = []
    for i, line in enumerate(lines, 1):
        new = line
        for idx, (label, rx) in enumerate(PATTERNS):
            if idx == LOOSE_LAST and not SENSITIVE_HINT.search(line):
                continue
            if rx.search(new):
                new = rx.sub("__REDACTED__", new)
                report.append((fname, i, label))
        out.append(new)
    return "\n".join(out)

def main():
    root = sys.argv[1] if len(sys.argv) > 1 else "gas-gerbera"
    if not os.path.isdir(root):
        print("Khong thay thu muc:", root); sys.exit(2)
    report, touched = [], 0
    for dirpath, _, files in os.walk(root):
        for fn in files:
            if not fn.lower().endswith((".js", ".gs", ".json", ".html")):
                continue
            p = os.path.join(dirpath, fn)
            try:
                with io.open(p, encoding="utf-8") as f:
                    txt = f.read()
            except Exception as e:
                print("  bo qua (doc loi):", p, e); continue
            before = len(report)
            new = redact_text(txt, os.path.relpath(p, root), report)
            if new != txt:
                with io.open(p, "w", encoding="utf-8", newline="") as f:
                    f.write(new)
                touched += 1
                print("  da che:", os.path.relpath(p, root),
                      "(%d cho)" % (len(report) - before))
    mp = os.path.join(root, "SECRETS-MAP.md")
    with io.open(mp, "w", encoding="utf-8") as f:
        f.write("# SECRETS-MAP — cho nao da bi che trong ban sao luu\n\n")
        f.write("Sinh boi `gp-redact-secrets.py` ngay 20/08/2026.\n\n")
        f.write("**Ban sao luu nay CHI-DOC.** Tuyet doi khong `clasp push` tu day:\n")
        f.write("se ghi `__REDACTED__` de len production.\n\n")
        f.write("Gia tri that chi ton tai o 2 noi: Apps Script (ban song) va\n")
        f.write("Script Properties. File nay chi ghi VI TRI, khong ghi gia tri.\n\n")
        if report:
            f.write("| File | Dong | Loai bi mat |\n|---|---|---|\n")
            for fn, ln, label in report:
                f.write("| `%s` | %d | %s |\n" % (fn, ln, label))
        else:
            f.write("_Khong tim thay bi mat nao khop mau._\n")
        f.write("\n## Viec nen lam tiep (khong gap, nhung nen)\n\n")
        f.write("Chuyen credential ra **Script Properties** roi doc luc runtime.\n")
        f.write("Codebase DA co san mau nay: `_CAPI.ACCESS_TOKEN` de rong va doc tu\n")
        f.write("Properties. Lam giong vay cho SHOPIFY_TOKEN va khoa Klaviyo thi\n")
        f.write("lan sau sao luu khong con vuong Push Protection nua.\n")
    print("\nDa che %d file, %d cho." % (touched, len(report)))
    print("Bao cao:", mp)
    if not report:
        print("CANH BAO: khong khop mau nao — kiem lai truoc khi push.")

if __name__ == "__main__":
    main()
