#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gpfinish.py — lam not 2 viec con lai, co kiem chung tung buoc.  v1.0 (21/08/2026)

    cd /d C:\\Users\\Admin\\foxera-daily
    python gpfinish.py

VIEC A — cai watch.json v3 (8 muc) roi commit + push.
VIEC B — va tgSelfTest, SINH RA FILE MOI de paste (khong tu doi production).

VI SAO DUNG SCRIPT THAY VI SUA TAY:
  Chuoi  'var j = gp_loadJson_();'  xuat hien HAI lan trong file:
     dong 342  -> trong tgSelfTest        <- CAN SUA
     dong 640  -> trong buildBlockCompetitor_  <- TUYET DOI KHONG DUOC DUNG
  Sua tay bang Ctrl+F rat de dinh nham cho thu hai, va nham thi B9 (Ads doi
  thu) vo hieu ma khong bao loi. Script nay xac dinh bien ham tgSelfTest bang
  cach dem ngoac, chi thay the BEN TRONG pham vi do.

KHONG TU DONG: quyen Permissions cua 5 task cloud — chi sua duoc tren giao dien.
"""
import os, sys, json, shutil, subprocess, difflib, io

REPO = r"C:\Users\Admin\foxera-daily"
DL   = os.path.join(os.path.expanduser("~"), "Downloads")
GASF = os.path.join("gas-gerbera", "Gerbera telegram ads advisor.js")

OK, WARN, ERR = "[OK]  ", "[!]   ", "[LOI] "

def run(cmd, check=False):
    p = subprocess.run(cmd, shell=True, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    out = (p.stdout or "") + (p.stderr or "")
    if check and p.returncode != 0:
        print(ERR + cmd); print(out.strip()); sys.exit(1)
    return p.returncode, out.strip()

def braces_balanced(txt):
    """Dem ngoac ngoai chuoi va comment — du de bat loi cat nham."""
    d = 0; i = 0; n = len(txt)
    while i < n:
        c = txt[i]
        if c == "/" and i+1 < n and txt[i+1] == "/":
            i = txt.find("\n", i);  i = n if i < 0 else i;  continue
        if c == "/" and i+1 < n and txt[i+1] == "*":
            i = txt.find("*/", i);  i = n if i < 0 else i+2;  continue
        if c in "'\"":
            q = c; i += 1
            while i < n and txt[i] != q:
                if txt[i] == "\\": i += 1
                i += 1
            i += 1; continue
        if c == "{": d += 1
        elif c == "}": d -= 1
        i += 1
    return d == 0

def fn_range(txt, name):
    """Tra ve (start, end) cua 'function <name>(' bang cach dem ngoac."""
    key = "function " + name
    s = txt.find(key)
    if s < 0: return None
    i = txt.find("{", s)
    if i < 0: return None
    d = 0
    while i < len(txt):
        if txt[i] == "{": d += 1
        elif txt[i] == "}":
            d -= 1
            if d == 0: return (s, i+1)
        i += 1
    return None

# ════════════════════════ VIEC A ════════════════════════
def viec_a():
    print("=" * 66); print(" VIEC A — watch.json v3"); print("=" * 66)
    src = os.path.join(DL, "gpwatch3.json")
    dst = os.path.join("_pcfetch", "watch.json")
    if not os.path.exists(src):
        print(ERR + "khong thay " + src)
        print("      Kiem ten file trong Downloads (trinh duyet hay them '(1)').")
        return False
    try:
        w = json.load(io.open(src, encoding="utf-8"))
    except Exception as e:
        print(ERR + "gpwatch3.json khong phai JSON hop le: %s" % e); return False
    if not isinstance(w, list) or len(w) != 8:
        print(ERR + "mong doi 8 muc, doc duoc %s" % (len(w) if isinstance(w, list) else "?"))
        return False
    print(OK + "gpwatch3.json hop le — %d muc" % len(w))
    for it in w: print("        - " + str(it.get("file")))

    if os.path.exists(dst):
        old = json.load(io.open(dst, encoding="utf-8"))
        if old == w:
            print(OK + "watch.json da la ban v3 — bo qua buoc chep."); return True
        shutil.copy2(dst, dst + ".bak")
        print(OK + "sao luu ban cu -> watch.json.bak")
    shutil.copy2(src, dst)
    print(OK + "da chep vao " + dst)

    run('git add _pcfetch/watch.json')
    rc, out = run('git commit -m "watch v3: them foxera-daily + foxera-accounts-daily (2 file truoc nay khong ai giam sat)"')
    print(("      " + out.splitlines()[0]) if out else "")
    rc, out = run("git pull --rebase origin main")
    if rc != 0:
        print(ERR + "pull that bai — cay lam viec dang ban:"); print(out); return False
    rc, out = run("git push origin HEAD:main")
    if rc != 0:
        print(ERR + "push that bai:"); print(out); return False
    print(OK + "da push len repo")
    return True

# ════════════════════════ VIEC B ════════════════════════
BLOCK_B = """  // -- v3.9.1 (21/08/2026) — doi canh bao GIA lay canh bao THAT ------------
  // gerbera-ads.json da khai tu 18/07/2026: task 'gerbera-ads-report-daily'
  // bi xoa khi gop vao 'gerbera-trend-research', B9 chuyen sang market.json.
  // 7 nhip dang chay KHONG goi gp_loadJson_() (chi gpSendAll/gpDailyRun goi,
  // ca hai da go khoi trigger) nen file chet khong gay hai. Nhung self-test
  // van doc no roi in "cu N ngay" suot hon 30 ngay = canh bao gia.
  // Canh bao gia lap moi ngay lam nguoi ta quen mat bo qua, den hom co canh
  // bao THAT cung bo qua luon — da xay ra: email Growth Hub bao dung 15 ngay
  // lien ma khong ai doc. Nen: 1 dong trung tinh, het.
  L.push('B3 \\u00b7 gerbera-ads.json: \\u23f9 da khai tu 18/07/2026 \\u2014 bo qua CO CHU DICH');

  // Va kiem thu that su quan trong ma self-test truoc nay KHONG he dung toi.
  // gerbera-market.json la nguon cua 4 nhip: 08:30 / 09:00 / 09:45 / 10:00.
  // No dung o 2026-08-03 suot 18 ngay, 4 nhip phat lai ban cu moi sang, ma
  // self-test khong he mot loi. Do moi la cho dang canh bao.
  var m = gp_loadMarketJson_();
  var mAge = (m.age_days == null) ? null : m.age_days;
  L.push('B3 \\u00b7 gerbera-market.json (nguon 4 nhip): ' + m.status +
         (m.date ? ' \\u00b7 date=' + m.date + ' (cu ' + mAge + 'd)' : '') +
         (m.keys && m.keys.length ? ' \\u00b7 khoi: ' + m.keys.join(',') : ''));
  if (mAge != null && mAge >= 2)
    L.push('     \\ud83d\\udea8 CU ' + mAge + ' NGAY \\u2014 4 nhip dang phat lai ban cu. ' +
           'Task cloud [Gerbera-Trend] Research chua push duoc len repo.');
  else if (mAge === 1)
    L.push('     \\u2139 cu 1 ngay = binh thuong neu chay self-test truoc nhip 08:30');
"""

def viec_b():
    print(); print("=" * 66); print(" VIEC B — va tgSelfTest"); print("=" * 66)
    if not os.path.exists(GASF):
        print(ERR + "khong thay " + GASF)
        print("      Chay 'clasp pull' trong gas-gerbera truoc."); return False
    txt = io.open(GASF, encoding="utf-8").read()

    if "gp_loadMarketJson_();" in txt and "da khai tu 18/07/2026" in txt:
        print(OK + "file da duoc va tu truoc — bo qua."); return True

    tot = txt.count("var j = gp_loadJson_();")
    print(OK + "'var j = gp_loadJson_();' xuat hien %d lan trong file" % tot)
    if tot != 2:
        print(WARN + "mong doi 2 lan. File co the da doi — dung lai cho an toan."); return False

    rng = fn_range(txt, "tgSelfTest")
    if not rng:
        print(ERR + "khong xac dinh duoc pham vi ham tgSelfTest."); return False
    s, e = rng
    body = txt[s:e]
    print(OK + "pham vi tgSelfTest: ky tu %d..%d (%d dong)" % (s, e, body.count("\n")))
    if body.count("var j = gp_loadJson_();") != 1:
        print(ERR + "trong tgSelfTest phai co dung 1 lan, dem duoc %d."
              % body.count("var j = gp_loadJson_();")); return False

    i = body.find("  var j = gp_loadJson_();")
    if i < 0:
        print(ERR + "khong khop thut dau dong (2 dau cach)."); return False
    # Neo cuoi khoi A: dong cuoi cung la dong chua 'j.orphan.join('.
    # KHONG neo bang chuoi tieng Viet co dau — de sai do encoding.
    k = body.find("j.orphan.join(", i)
    if k < 0:
        print(ERR + "khong tim thay dong cuoi cua khoi A (j.orphan.join)."); return False
    j = body.find("\n", k) + 1
    if j <= 0:
        print(ERR + "khoi A khong ket thuc bang xuong dong."); return False
    old_block = body[i:j]
    print(OK + "khoi A: %d dong" % old_block.count("\n"))

    new_body = body[:i] + BLOCK_B + body[j:]
    new_txt  = txt[:s] + new_body + txt[e:]

    # --- kiem chung ---
    checks = []
    checks.append(("ngoac { } can bang", braces_balanced(new_txt)))
    checks.append(("buildBlockCompetitor_ KHONG bi dung toi",
                   new_txt.count("var j = gp_loadJson_();") == 1
                   and fn_range(new_txt, "buildBlockCompetitor_") is not None))
    checks.append(("gp_loadJson_() van con dinh nghia",
                   "function gp_loadJson_()" in new_txt))
    checks.append(("GP_RAW_URL van con", "GP_RAW_URL" in new_txt))
    checks.append(("da them gp_loadMarketJson_()", "gp_loadMarketJson_();" in new_body))
    ok = True
    print(); print("  KIEM CHUNG:")
    for name, res in checks:
        print(("        %s %s" % (OK if res else ERR, name)))
        ok = ok and res
    if not ok:
        print(ERR + "co muc khong dat — KHONG ghi file."); return False

    out = "PATCHED_Gerbera_telegram_ads_advisor.js"
    io.open(out, "w", encoding="utf-8", newline="\n").write(new_txt)
    print(); print(OK + "da ghi: %s" % os.path.abspath(out))

    dif = list(difflib.unified_diff(txt.splitlines(), new_txt.splitlines(),
               "truoc", "sau", n=2, lineterm=""))
    io.open("PATCH_DIFF.txt", "w", encoding="utf-8").write("\n".join(dif))
    print(OK + "diff de doi chieu: %s (%d dong)" % (os.path.abspath("PATCH_DIFF.txt"), len(dif)))
    return True

def main():
    if os.path.isdir(REPO): os.chdir(REPO)
    print("Thu muc lam viec:", os.getcwd()); print()
    a = viec_a()
    b = viec_b()
    print(); print("=" * 66); print(" CON LAI — script KHONG lam duoc"); print("=" * 66)
    if b:
        print(" 1. Mo Apps Script -> Gerberaprints CRM")
        print("    -> file 'Gerbera telegram ads advisor.gs'")
        print("    -> Ctrl+A roi Ctrl+V bang noi dung file")
        print("       PATCHED_Gerbera_telegram_ads_advisor.js")
        print("    -> Ctrl+S. KHONG can chay gpInstallTriggers.")
        print("    (Muon xem doi gi truoc: mo PATCH_DIFF.txt)")
        print()
    print(" 2. Permissions cua 5 task cloud: 'Manually approve' -> tu dong.")
    print("    Chi sua duoc tren giao dien claude.ai -> Scheduled -> tung task.")
    print("    Day la thu duy nhat con giu 4 bao cao + 5 file velocity o 2026-08-03.")
    print("=" * 66)

if __name__ == "__main__":
    main()
