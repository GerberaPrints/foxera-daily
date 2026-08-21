# -*- coding: utf-8 -*-
"""
gpday21.py — day tay ban tin 21/08 len repo + sua 1 loi trong GERBERA_GAS_REGISTRY.md

Chay:  python gpday21.py
Khong can tham so. Script tu tim file trong Downloads.

An toan:
 - KHONG bao gio de len gerbera-metrics.jsonl neu file local co dong la
 - KIEM TRA date ben trong file truoc khi chep
 - KHONG dung --force, KHONG dung git add -A
"""
import os, sys, json, glob, shutil, subprocess

REPO = r"C:\Users\Admin\foxera-daily"
DL   = os.path.join(os.path.expanduser("~"), "Downloads")
EXPECT_DATE = "2026-08-21"
SS_DEAD = "1sd8LENhX1fUrK7d42oHbNRTYsbaj7BEsNYTsQ0xouwM"
SS_LIVE = "1RkmhfOjJaqH8KcumjVuT86ij17J08ZlDyCB6SP5nwdo"

def die(msg):
    print("\n[X] DUNG LAI: " + msg)
    print("    Khong co gi bi thay doi.")
    sys.exit(1)

def ok(msg):  print("[v] " + msg)
def warn(msg):print("[!] " + msg)

def git(*args, check=True):
    r = subprocess.run(["git"] + list(args), cwd=REPO,
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    if check and r.returncode != 0:
        print(r.stdout); print(r.stderr)
        die("lenh git that bai: git " + " ".join(args))
    return r

def find_dl(stem, ext):
    """Tim file trong Downloads. Chrome hay bo dau gach ngang va them ' (1)'."""
    pats = [
        f"{stem}{ext}", f"{stem.replace('-','')}{ext}",
        f"{stem} (*){ext}", f"{stem.replace('-','')} (*){ext}",
    ]
    hits = []
    for p in pats:
        hits += glob.glob(os.path.join(DL, p))
    hits = sorted(set(hits), key=lambda f: os.path.getmtime(f), reverse=True)
    return hits[0] if hits else None

print("=" * 60)
print(" gpday21.py — day ban tin 21/08")
print("=" * 60)

if not os.path.isdir(REPO): die("khong thay thu muc repo: " + REPO)
if not os.path.isdir(DL):   die("khong thay thu muc Downloads: " + DL)

# ---------- 1. TIM FILE ----------
f_mkt = find_dl("gerbera-market", ".json")
f_mtr = find_dl("gerbera-metrics", ".jsonl")
if not f_mkt: die("khong tim thay gerbera-market.json trong " + DL)
if not f_mtr: die("khong tim thay gerbera-metrics.jsonl trong " + DL)
ok("tim thay: " + os.path.basename(f_mkt))
ok("tim thay: " + os.path.basename(f_mtr))

# ---------- 2. KIEM TRA NOI DUNG ----------
try:
    mkt = json.load(open(f_mkt, encoding="utf-8"))
except Exception as e:
    die("gerbera-market.json khong doc duoc: %s" % e)

if mkt.get("date") != EXPECT_DATE:
    die("gerbera-market.json co date=%r, dang cho %r. Co the ban tai nham file cu."
        % (mkt.get("date"), EXPECT_DATE))
nblk = len(mkt.get("blocks", {}))
if nblk != 11: die("gerbera-market.json chi co %d khoi, phai la 11." % nblk)
ok("gerbera-market.json: date=%s, %d khoi — HOP LE" % (EXPECT_DATE, nblk))

new_lines = [l for l in open(f_mtr, encoding="utf-8").read().splitlines() if l.strip()]
for i, l in enumerate(new_lines):
    try: json.loads(l)
    except Exception as e: die("gerbera-metrics.jsonl dong %d hong: %s" % (i + 1, e))
if json.loads(new_lines[-1]).get("date") != EXPECT_DATE:
    die("dong cuoi gerbera-metrics.jsonl khong phai %s" % EXPECT_DATE)
ok("gerbera-metrics.jsonl: %d dong, dong cuoi=%s — HOP LE" % (len(new_lines), EXPECT_DATE))

# ---------- 3. KIEM TRA KHONG MAT DU LIEU ----------
p_mtr = os.path.join(REPO, "gerbera-metrics.jsonl")
if os.path.exists(p_mtr):
    cur = [l for l in open(p_mtr, encoding="utf-8").read().splitlines() if l.strip()]
    if cur != new_lines[:len(cur)]:
        extra = [l for l in cur if l not in new_lines]
        die("file gerbera-metrics.jsonl tren may KHONG phai tap con dau cua file moi.\n"
            "    Co %d dong tren may khong co trong file moi -> de len se MAT du lieu.\n"
            "    Gui man hinh nay cho Claude, dung tu sua." % len(extra))
    ok("gerbera-metrics.jsonl: %d dong cu duoc giu nguyen, them %d dong moi"
       % (len(cur), len(new_lines) - len(cur)))

# ---------- 4. GIT PULL TRUOC ----------
print("\n--- git pull ---")
r = git("pull", "--rebase", "origin", "main"); print(r.stdout.strip() or r.stderr.strip())

# ---------- 5. CHEP FILE ----------
shutil.copyfile(f_mkt, os.path.join(REPO, "gerbera-market.json"))
shutil.copyfile(f_mtr, p_mtr)
ok("da chep 2 file vao repo")

# ---------- 6. SUA REGISTRY (spreadsheet ID chet) ----------
reg = os.path.join(REPO, "GERBERA_GAS_REGISTRY.md")
reg_fixed = False
if os.path.exists(reg):
    t = open(reg, encoding="utf-8").read()
    if SS_DEAD in t:
        t = t.replace(SS_DEAD, SS_LIVE)
        open(reg, "w", encoding="utf-8").write(t)
        reg_fixed = True
        ok("GERBERA_GAS_REGISTRY.md: sua Bang tinh CRM -> %s" % SS_LIVE)
    else:
        ok("GERBERA_GAS_REGISTRY.md: da dung san, khong can sua")

# ---------- 7. COMMIT + PUSH ----------
files = ["gerbera-market.json", "gerbera-metrics.jsonl"] + (["GERBERA_GAS_REGISTRY.md"] if reg_fixed else [])
git("add", *files)
st = git("diff", "--cached", "--name-only").stdout.strip()
if not st:
    die("git khong thay thay doi nao. Nghia la file trong repo DA giong het file tai ve.\n"
        "    Kiem tra lai: file trong Downloads co dung la ban 21/08 khong?")
print("\n--- se commit cac file sau ---"); print(st)

git("-c", "commit.gpgsign=false", "commit", "-m", "cloud handoff 2026-08-21: gerbera-market")
print("\n--- git push ---")
r = git("push", "origin", "HEAD:main", check=False)
print((r.stdout + r.stderr).strip())
if r.returncode != 0:
    die("push that bai — xem thong bao ngay tren.")

# ---------- 8. XAC MINH TREN REMOTE ----------
git("fetch", "-q", "origin", "main")
remote = git("show", "origin/main:gerbera-market.json").stdout
rdate = json.loads(remote).get("date")
print("\n" + "=" * 60)
if rdate == EXPECT_DATE:
    print(" XONG. gerbera-market.json tren repo = %s" % rdate)
    print(" Buoc cuoi: chay tgSelfTest trong Apps Script.")
    print(" Dong 'CU 18 NGAY' phai BIEN MAT.")
else:
    print(" [X] Push bao thanh cong nhung remote van la %s — bao cho Claude." % rdate)
print("=" * 60)
