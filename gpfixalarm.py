# -*- coding: utf-8 -*-
"""
gpfixalarm.py — GO CANH BAO GIA trong _pcfetch/watch.json.

PHAT HIEN 22/08/2026: gritfell-daily.json va genusfaith-daily.json dung o
2026-08-03 KHONG PHAI vi hong. Hai job do DA CHUYEN SANG GOOGLE DRIVE:

  · GritFell v6.0 (gom gon 14/08): "DRIVE — BAT BUOC, LAM TRUOC, DAY LA DUONG SONG"
    va "Drive XONG moi coi la run THANH CONG". GitHub push: "duoc phep fail,
    KHONG push notification khi fail".
  · Genus-Research v9.1-drive: ghi len folder GenusFaith_Briefs, ten file
    genusfaith-daily-YYYY-MM-DD.json, GAS v4.4 doc thang tu Drive.
    Nguyen van trong prompt: "403 = BINH THUONG, KHONG retry, KHONG coi la loi".

=> File trong repo dung im la DUNG THIET KE. Bao "CHET 19 ngay" la BAO DONG GIA,
   va no da duoc lap lai moi sang suot 19 ngay.

CHI foxera-job.json (job EraCloset) la HONG THAT — van push GitHub, va truoc
22/08 khong co buoc giao file khi push loi. Prompt do da duoc sua 22/08.

Script CHI sua truong vi_sao/sua cua 2 muc. Khong dung file nao khac.
Chay:  python gpfixalarm.py
"""
import os, sys, json, subprocess

REPO  = r"C:\Users\Admin\foxera-daily"
REL   = "_pcfetch/watch.json"
WATCH = os.path.join(REPO, "_pcfetch", "watch.json")

DRIVE = {
 "gritfell-daily.json": (
   "⚠️ KHONG PHAI CANH BAO. GritFell v6.0 (14/08) da chuyen sang GOOGLE DRIVE: "
   "'DRIVE — BAT BUOC, LAM TRUOC, DAY LA DUONG SONG'; GitHub push 'duoc phep fail'. "
   "File nay dung im trong repo la DUNG THIET KE.",
   "KHONG can lam gi voi file repo nay. Muon kiem GritFell that su co ra ban tin khong "
   "thi xem nhom Telegram 'GritFell - Daily Market Research' hoac folder Drive cua no — "
   "KHONG xem file nay."),
 "genusfaith-daily.json": (
   "⚠️ KHONG PHAI CANH BAO. Genus-Research v9.1-drive da chuyen sang GOOGLE DRIVE "
   "(folder GenusFaith_Briefs, ten file genusfaith-daily-YYYY-MM-DD.json, GAS v4.4 doc "
   "thang tu Drive). Prompt ghi ro: '403 = BINH THUONG, KHONG retry, KHONG coi la loi'. "
   "File nay dung im trong repo la DUNG THIET KE.",
   "KHONG can lam gi voi file repo nay. Muon kiem thi xem folder Drive GenusFaith_Briefs "
   "co file genusfaith-daily-<hom nay>.json khong — KHONG xem file nay."),
}
JOB = ("foxera-job.json",
   "Ban tin FoxEra Job (EraCloset). DAY LA MUC HONG THAT — job nay VAN push GitHub, "
   "khac hai muc gritfell/genusfaith da chuyen Drive.",
   "Prompt task da duoc sua 22/08/2026: push loi -> BAT BUOC SendUserFile 2 file truoc, "
   "roi moi PushNotification. Tu 23/08 tro di, push hong thi user van nhan duoc file — "
   "chep vao repo roi chay 'python gpday.py'. Neu 23/08 van khong nhan duoc file thi ban "
   "va prompt do hong, bao Claude.")

def die(m): print("\n[X] DUNG LAI: " + m); sys.exit(1)

def git(*a, check=True):
    r = subprocess.run(["git"]+list(a), cwd=REPO, capture_output=True,
                       text=True, encoding="utf-8", errors="replace")
    if check and r.returncode:
        print(r.stdout); print(r.stderr); die("git " + " ".join(a))
    return r

if not os.path.isfile(WATCH): die("khong thay " + WATCH)
w = json.load(open(WATCH, encoding="utf-8"))
if not isinstance(w, list): die("watch.json khong phai list")
n0 = len(w)

changed = []
for it in w:
    f = it.get("file")
    if f in DRIVE:
        vs, su = DRIVE[f]
        if it.get("vi_sao") != vs or it.get("sua") != su:
            it["vi_sao"], it["sua"] = vs, su
            changed.append(f)
    elif f == JOB[0]:
        if it.get("vi_sao") != JOB[1] or it.get("sua") != JOB[2]:
            it["vi_sao"], it["sua"] = JOB[1], JOB[2]
            changed.append(f)

if changed:
    json.dump(w, open(WATCH, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("Da sua %d muc tren dia:" % len(changed))
    for f in changed: print("   -", f)
else:
    print("File tren dia da dung roi.")

w2 = json.load(open(WATCH, encoding="utf-8"))
if len(w2) != n0: die("so muc bi doi: %d -> %d" % (n0, len(w2)))
print("[v] Kiem lai: %d muc, cau truc nguyen ven" % len(w2))

# so voi ban TRONG GIT, khong so trong RAM
git("fetch", "-q", "origin", "main")
in_git = git("show", "origin/main:" + REL, check=False)
def needs_fix(txt):
    try: arr = json.loads(txt)
    except Exception: return True
    for it in arr:
        if it.get("file") in DRIVE and "KHONG PHAI CANH BAO" not in it.get("vi_sao",""):
            return True
    return False
if in_git.returncode == 0 and not needs_fix(in_git.stdout):
    print("\nBan tren repo cung da dung. Khong can commit."); sys.exit(0)
if not git("status", "--porcelain", "--", REL).stdout.strip():
    die("git khong thay thay doi nhung ban tren repo van sai — mau thuan, dung lai")

print("\n--- commit ---")
git("add", REL)
git("-c", "commit.gpgsign=false", "commit", "-m",
    "watch.json: gritfell + genusfaith da chuyen Drive, khong phai su co")
print("commit", git("rev-parse", "--short", "HEAD").stdout.strip())

print("\n--- pull --rebase --autostash ---")
r = git("pull", "--rebase", "--autostash", "origin", "main", check=False)
print((r.stdout + r.stderr).strip())
if r.returncode: die("pull that bai")

print("\n--- push ---")
r = git("push", "origin", "HEAD:main", check=False)
print((r.stdout + r.stderr).strip())
if r.returncode: die("push that bai")

git("fetch", "-q", "origin", "main")
final = git("show", "origin/main:" + REL).stdout
print("\n" + "="*62)
if needs_fix(final):
    print(" [X] Tren repo VAN sai — bao cho Claude.")
else:
    print(" XONG. Tu lan selfcheck.py toi, Watchdog se KHONG con bao")
    print(" gritfell-daily / genusfaith-daily la su co nua.")
    print(" Chi con foxera-job.json la muc hong that can theo doi.")
print("="*62)
