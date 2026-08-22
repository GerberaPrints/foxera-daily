# -*- coding: utf-8 -*-
"""
gpday.py v2 — day tay bat ky ban tin cloud nao len repo foxera-daily.

Chay:  python gpday.py            -> tu tim moi file bao cao trong Downloads
       python gpday.py gerbera    -> chi xu ly file cua gerbera

Tu dong:
 - tim file trong Downloads (ke ca khi Chrome bo dau gach ngang / them " (1)")
 - kiem tra JSON hop le + ngay ben trong KHONG cu hon file dang co tren repo
 - voi .jsonl: TU CHOI chay neu de len se lam mat dong du lieu
 - commit TRUOC, roi pull --rebase --autostash, roi push, roi FETCH LAI xac minh

v2 sua loi cua v1:
 - v1 chay `git pull --rebase` TRUOC khi commit -> chet vi working tree luon
   dirty (selfcheck.py ghi lai health.json + logs moi lan chay).
   v2: commit truoc, pull sau, va pull dung --autostash de tu cat/tra lai
   nhung file dirty khac.
 - v1 bao "Khong co gi bi thay doi tren repo" khi that bai — SAI, file da duoc
   chep vao repo roi. v2 noi dung trang thai.

KHONG dung --force. KHONG dung git add -A.
"""
import os, sys, json, glob, shutil, subprocess, datetime

REPO = r"C:\Users\Admin\foxera-daily"
DL   = os.path.join(os.path.expanduser("~"), "Downloads")

TARGETS = {
    "gerbera-market":          "json",
    "gerbera-metrics":         "jsonl",
    "genusfaith-daily":        "json",
    "genusfaith-metrics":      "jsonl",
    "gritfell-daily":          "json",
    "gritfell-metrics":        "jsonl",
    "gritfell-internal":       "jsonl",
    "foxera-job":              "json",
    "foxera-job-metrics":      "jsonl",
    "foxera-daily":            "json",
    "foxera-accounts-daily":   "json",
    "foxera-metrics":          "jsonl",
}

def die(m):
    print("\n[X] DUNG LAI: " + m)
    sys.exit(1)

def git(*a, check=True):
    r = subprocess.run(["git"] + list(a), cwd=REPO, capture_output=True,
                       text=True, encoding="utf-8", errors="replace")
    if check and r.returncode != 0:
        print(r.stdout); print(r.stderr)
        die("lenh that bai: git " + " ".join(a))
    return r

def find_dl(stem, ext):
    pats = [f"{stem}.{ext}", f"{stem.replace('-','')}.{ext}",
            f"{stem} (*).{ext}", f"{stem.replace('-','')} (*).{ext}"]
    hits = []
    for p in pats:
        hits += glob.glob(os.path.join(DL, p))
    hits = sorted(set(hits), key=os.path.getmtime, reverse=True)
    return hits[0] if hits else None

def date_of(path_or_text, kind, is_text=False):
    txt = path_or_text if is_text else open(path_or_text, encoding="utf-8").read()
    if kind == "jsonl":
        ls = [l for l in txt.splitlines() if l.strip()]
        return json.loads(ls[-1]).get("date") if ls else None
    return json.loads(txt).get("date")

only = (sys.argv[1].lower() if len(sys.argv) > 1 else None)
print("=" * 62); print(" gpday.py v2 — day ban tin cloud len repo"); print("=" * 62)
if not os.path.isdir(REPO): die("khong thay repo: " + REPO)

git("fetch", "-q", "origin", "main")

staged = []
for stem, kind in TARGETS.items():
    if only and only not in stem:
        continue
    src = find_dl(stem, kind)
    if not src:
        continue
    name = f"{stem}.{kind}"

    try:
        dnew = date_of(src, kind)
    except Exception as e:
        die(f"{os.path.basename(src)} khong doc duoc: {e}")
    if not dnew:
        die(f"{name}: khong tim thay truong 'date'.")

    cur = git("show", f"origin/main:{name}", check=False)
    dold = None
    if cur.returncode == 0:
        try: dold = date_of(cur.stdout, kind, is_text=True)
        except Exception: pass

    if dold and dnew < dold:
        die(f"{name}: file tai ve la {dnew}, CU HON ban tren repo ({dold}). "
            f"Co the ban tai nham file cu.")
    if dold and dnew == dold:
        print(f"[=] {name}: da la {dnew} tren repo — bo qua")
        continue

    if kind == "jsonl":
        new_lines = [l for l in open(src, encoding="utf-8").read().splitlines() if l.strip()]
        for i, l in enumerate(new_lines):
            try: json.loads(l)
            except Exception as e: die(f"{name} dong {i+1} hong: {e}")
        if cur.returncode == 0:
            old_lines = [l for l in cur.stdout.splitlines() if l.strip()]
            if old_lines != new_lines[:len(old_lines)]:
                die(f"{name}: ban tren repo KHONG phai tap con dau cua file moi "
                    f"({len(old_lines)} dong cu vs {len(new_lines)} dong moi). "
                    f"De len se MAT du lieu. Gui man hinh nay cho Claude.")
            print(f"[v] {name}: giu {len(old_lines)} dong cu, them {len(new_lines)-len(old_lines)} dong")

    shutil.copyfile(src, os.path.join(REPO, name))
    staged.append((name, dold, dnew))
    print(f"[v] {name}: {dold} -> {dnew}  (nguon: {os.path.basename(src)})")

if not staged:
    print("\nKhong co file nao moi hon ban tren repo. Khong lam gi.")
    sys.exit(0)

# ---------- COMMIT TRUOC (v1 sai o day: pull truoc -> chet vi dirty) ----------
names = [n for n, _, _ in staged]
print("\n--- git add + commit ---")
git("add", *names)
if not git("diff", "--cached", "--name-only").stdout.strip():
    die("git khong thay thay doi — file tren repo da giong het file tai ve.")

today = datetime.date.today().isoformat()
git("-c", "commit.gpgsign=false", "commit", "-m",
    f"cloud handoff {today}: " + ", ".join(names))
print("commit", git("rev-parse", "--short", "HEAD").stdout.strip())

# ---------- PULL SAU, co --autostash cho cac file dirty khac ----------
print("\n--- git pull --rebase --autostash ---")
r = git("pull", "--rebase", "--autostash", "origin", "main", check=False)
print((r.stdout + r.stderr).strip())
if r.returncode:
    die("pull that bai. LUU Y: 2 file DA duoc chep vao repo va DA commit local, "
        "chua push. Xu ly conflict roi chay lai.")

print("\n--- git push ---")
r = git("push", "origin", "HEAD:main", check=False)
print((r.stdout + r.stderr).strip())
if r.returncode:
    die("push that bai. LUU Y: 2 file DA commit local, chua len repo.")

# ---------- XAC MINH TREN REMOTE ----------
git("fetch", "-q", "origin", "main")
print("\n" + "=" * 62)
bad = 0
for name, _, dnew in staged:
    kind = "jsonl" if name.endswith(".jsonl") else "json"
    got = date_of(git("show", f"origin/main:{name}").stdout, kind, is_text=True)
    mark = "OK " if got == dnew else "SAI"
    if got != dnew: bad += 1
    print(f" {mark} {name:32} tren repo = {got}")
print("=" * 62)
if bad:
    print(" [X] Co file khong khop — bao cho Claude.")
else:
    print(" XONG. Buoc cuoi: chay tgSelfTest trong Apps Script de xac nhan.")
