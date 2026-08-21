# -*- coding: utf-8 -*-
"""
gpverify.py — KIEM TRA CHUOI CLOUD -> REPO da thong chua.

Chay:  python gpverify.py           (kiem theo ngay hom nay)
       python gpverify.py 2026-08-22 (kiem theo mot ngay cu the)

Khac selfcheck.py:
  selfcheck.py = suc khoe vai FETCH (PC quet duoc khong)
  gpverify.py  = suc khoe vai MERGE (cloud ghi duoc len repo khong)

Script CHI DOC. Khong commit, khong push, khong sua gi.
"""
import os, sys, json, subprocess, datetime

REPO = r"C:\Users\Admin\foxera-daily"

# file bao cao -> job sinh ra no
REPORTS = [
    ("gerbera-market.json",        "[Gerbera-Trend] Research",        "07:15"),
    ("foxera-daily.json",          "Etsy FoxEra Daily Research",      "02:00"),
    ("foxera-accounts-daily.json", "Etsy FoxEra Daily Research",      "02:00"),
    ("genusfaith-daily.json",      "[Genus-Research] Devotional",     "04:30"),
    ("gritfell-daily.json",        "GritFell Daily Research v6.0",    "05:30"),
    ("foxera-job.json",            "FoxEra Job",                      "-"),
]
VELOCITY = ["gerbera-metrics.jsonl","foxera-metrics.jsonl","genusfaith-metrics.jsonl",
            "gritfell-metrics.jsonl","gritfell-internal.jsonl","foxera-job-metrics.jsonl"]
JUNK = ["PUSHTEST.txt","SCHED-TEST.txt","_pcfetch/watch.json.bak"]

C_OK, C_WARN, C_BAD = "OK ", "CU ", "CHET"

def git(*a, check=False):
    r = subprocess.run(["git"]+list(a), cwd=REPO, capture_output=True,
                       text=True, encoding="utf-8", errors="replace")
    if check and r.returncode:
        print("git that bai:", " ".join(a)); print(r.stderr); sys.exit(1)
    return r

def blob(path):
    r = git("show", "origin/main:"+path)
    return r.stdout if r.returncode == 0 else None

def date_in(txt, jsonl=False):
    if txt is None: return None
    try:
        if jsonl:
            ls = [l for l in txt.splitlines() if l.strip()]
            return json.loads(ls[-1]).get("date") if ls else None
        return json.loads(txt).get("date")
    except Exception:
        return None

# ---------- bat dau ----------
if not os.path.isdir(REPO):
    print("[X] Khong thay repo:", REPO); sys.exit(1)

today = datetime.date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else datetime.date.today()

print("="*66)
print(" gpverify.py — chuoi CLOUD -> REPO   | moc kiem: %s" % today)
print("="*66)

print("\n[1/5] Dong bo repo...")
git("fetch", "-q", "origin", "main", check=True)
head = git("rev-parse", "--short", "origin/main").stdout.strip()
print("      origin/main = %s" % head)

# ---------- 2. bao cao ----------
print("\n[2/5] BAN TIN — cloud co ghi duoc hom nay khong?")
print("      %-30s %-12s %-6s %s" % ("FILE","date","tuoi","JOB"))
print("      " + "-"*74)
fresh = stale = 0
for f, job, gio in REPORTS:
    d = date_in(blob(f))
    if d is None:
        print("      %-30s %-12s %-6s %s" % (f, "KHONG DOC", "?", job)); stale += 1; continue
    age = (today - datetime.date.fromisoformat(d)).days
    tag = C_OK if age <= 0 else (C_WARN if age == 1 else C_BAD)
    if age <= 0: fresh += 1
    else: stale += 1
    print("      %-30s %-12s %-6s %s  %s" % (f, d, "%+dd" % -age, job, tag))

# ---------- 3. velocity ----------
print("\n[3/5] VELOCITY — lich su co bi dong bang khong?")
vfresh = vstale = 0
for f in VELOCITY:
    b = blob(f)
    if b is None: print("      %-30s (khong co)" % f); continue
    n = len([l for l in b.splitlines() if l.strip()])
    d = date_in(b, jsonl=True)
    age = (today - datetime.date.fromisoformat(d)).days if d else None
    tag = C_OK if (age is not None and age <= 0) else C_BAD
    if tag == C_OK: vfresh += 1
    else: vstale += 1
    print("      %-30s %-12s %3d dong  %s" % (f, str(d), n, tag))

# ---------- 4. ha tang ----------
print("\n[4/5] HA TANG")
wf = blob(".github/workflows/auto-merge-claude.yml")
print("      workflow auto-merge          : %s" % ("CO (%d byte)" % len(wf.encode()) if wf else "KHONG"))
tree = git("ls-tree","-r","--name-only","origin/main").stdout.split()
found_junk = [j for j in JUNK if j in tree]
print("      file rac con sot             : %s" % (", ".join(found_junk) if found_junk else "khong"))
sched = "SCHED-TEST.txt" in tree
print("      SCHED-TEST.txt (phep thu)    : %s" % ("CO -> scheduled task PUSH DUOC" if sched else "chua co"))

# ---------- 5. ket luan ----------
print("\n[5/5] KET LUAN — 3 MUC")
print("      " + "-"*74)
m2 = date_in(blob("gerbera-market.json"))
m2_ok = m2 and (today - datetime.date.fromisoformat(m2)).days <= 0
m3_ok = (stale == 0)
print("      Muc 1  Khong mat ban tin    : kiem TAY — mo hoi thoai, co 2 file dinh kem?")
print("      Muc 2  Cloud tu push        : %s" % ("DAT ✔" if m2_ok else "CHUA — phai chay gpday.py"))
print("      Muc 3  Ca 5 job song        : %s" % ("DAT ✔" if m3_ok else "CHUA — %d ban tin con cu" % stale))
print("      " + "-"*74)
print("      Ban tin tuoi: %d/%d   |   velocity tuoi: %d/%d" % (fresh,len(REPORTS),vfresh,len(VELOCITY)))

print("\nVIEC TAY KHONG SCRIPT NAO THAY DUOC:")
print("  a) Mo hoi thoai Claude — push hong thi PHAI co 2 file dinh kem (Muc 1).")
print("  b) Chay tgSelfTest trong Apps Script — dong B3 phai la date=%s, KHONG co 'CU N NGAY'." % today)
print("  c) Mo Telegram group 'GP - Report Ads Daily' — 4 nhip sang nay co noi dung MOI khong?")
print("  d) LUAT 8.3: chi ghi 'da fix' khi HAI ngay lien tiep cung xanh.")
