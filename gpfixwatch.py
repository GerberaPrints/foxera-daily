# -*- coding: utf-8 -*-
"""
gpfixwatch.py v2 — sua CHAN DOAN SAI trong _pcfetch/watch.json.

Van de: truong "sua" cua 6 muc dang ghi "cap quyen repo cho task cloud" va
"Permissions dang la 'Manually approve' -> doi sang tu dong".
CA HAI DEU SAI — da kiem chung 21/08/2026:
  · job_config cua ca 14 task cloud KHONG co truong sources/repo nao
  · permission_mode cua ca 14 task VON DA la "auto"
  · GitHub App da cai voi Contents:write ma phien Cowork VAN 403
Chan doan sai bi selfcheck.py chep sang health.json moi lan chay, roi Watchdog
doc health.json va phat lai MOI SANG -> dan nguoi doc di sai huong.

v2 sua 2 loi cua v1:
  · pull --rebase chet vi working tree dirty  -> commit TRUOC, roi pull --autostash
  · chay lai lan 2 thoat som khong commit      -> so voi ban trong git, khong so trong RAM

Script CHI sua truong "sua" cua _pcfetch/watch.json. Khong dung file nao khac.
Chay:  python gpfixwatch.py
"""
import os, sys, json, subprocess

REPO  = r"C:\Users\Admin\foxera-daily"
REL   = "_pcfetch/watch.json"
WATCH = os.path.join(REPO, "_pcfetch", "watch.json")

BAD = ["cap quyen repo cho task cloud", "Manually approve", "Permissions cua task cloud",
       "Khai repo", "vao sources cua task cloud"]

FIX_CLOUD = (
 "Phien cloud Cowork KHONG push duoc: git proxy tra 403 'not in this session's authorized "
 "repository set' va GO PAT ra, tu tiem credential rieng. KIEM CHUNG 21/08/2026: "
 "(a) job_config cua ca 14 task cloud KHONG co truong sources/repo nao de khai; "
 "(b) permission_mode cua chung VON DA la 'auto', khong he o che do duyet tay; "
 "(c) GitHub App Claude da cai voi Contents:write ma phien Cowork van 403 -> HAI TANG khac nhau. "
 "DUONG DANG CHAY: phien claude.ai/code push duoc vao main (chung minh boi commit 2399f3d). "
 "XU LY HANG NGAY: mo phien cua task cloud (nut 'Open session' trong thong bao), "
 "lay 2 file dinh kem, chay 'python gpday.py'. "
 "DUNG cap lai PAT — vo ich.")

def die(m):
    print("\n[X] DUNG LAI: " + m); sys.exit(1)

def git(*a, check=True):
    r = subprocess.run(["git"]+list(a), cwd=REPO, capture_output=True,
                       text=True, encoding="utf-8", errors="replace")
    if check and r.returncode:
        print(r.stdout); print(r.stderr); die("git " + " ".join(a))
    return r

if not os.path.isfile(WATCH): die("khong thay " + WATCH)

def has_bad(txt):
    return any(b in txt for b in BAD)

# ---------- 1. sua file tren dia (neu can) ----------
w = json.load(open(WATCH, encoding="utf-8"))
if not isinstance(w, list): die("watch.json khong phai list")

changed = []
for it in w:
    if has_bad(it.get("sua", "")):
        it["sua"] = FIX_CLOUD
        changed.append(it["file"])

if changed:
    json.dump(w, open(WATCH, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("Da sua %d muc tren dia:" % len(changed))
    for f in changed: print("   -", f)
else:
    print("File tren dia da sach (khong con cau sai).")

# ---------- 2. kiem lai ----------
w2 = json.load(open(WATCH, encoding="utf-8"))
if len(w2) != len(w): die("so muc bi doi")
if any(has_bad(x.get("sua","")) for x in w2): die("van con cau sai sau khi ghi")
print("[v] Kiem lai: %d muc, khong con cau sai" % len(w2))

# ---------- 3. so voi ban TRONG GIT, khong so trong RAM ----------
# (day la cho v1 sai: chay lan 2 se thoat som ma chua bao gio commit)
git("fetch", "-q", "origin", "main")
in_git = git("show", "origin/main:" + REL, check=False)
if in_git.returncode == 0 and not has_bad(in_git.stdout):
    print("\nBan tren repo cung da sach roi. Khong can commit."); sys.exit(0)

if not git("status", "--porcelain", "--", REL).stdout.strip():
    print("\nGit khong thay watch.json thay doi — nhung ban tren repo van con cau sai.")
    die("mau thuan, dung lai de nguoi kiem")

# ---------- 4. commit TRUOC, roi moi pull ----------
# working tree con file khac dang dirty (health.json, logs) -> phai --autostash
print("\n--- commit ---")
git("add", REL)
git("-c", "commit.gpgsign=false", "commit", "-m",
    "watch.json: sua chan doan sai ve quyen push cloud")
print("commit", git("rev-parse", "--short", "HEAD").stdout.strip())

print("\n--- pull --rebase --autostash ---")
r = git("pull", "--rebase", "--autostash", "origin", "main", check=False)
print((r.stdout + r.stderr).strip())
if r.returncode: die("pull that bai — xem thong bao tren")

print("\n--- push ---")
r = git("push", "origin", "HEAD:main", check=False)
print((r.stdout + r.stderr).strip())
if r.returncode: die("push that bai")

# ---------- 5. xac minh tren remote ----------
git("fetch", "-q", "origin", "main")
final = git("show", "origin/main:" + REL).stdout
print("\n" + "="*60)
if has_bad(final):
    print(" [X] Tren repo VAN con cau sai — bao cho Claude.")
else:
    n = len(json.loads(final))
    print(" XONG. watch.json tren repo: %d muc, khong con cau sai." % n)
    print(" Lan selfcheck.py toi se ghi chan doan DUNG vao health.json,")
    print(" va Watchdog sang mai khong con khuyen 'cap lai PAT'.")
print("="*60)
