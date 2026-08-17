#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
selfcheck.py — TU KIEM TRA va TU VA LOI cho _pcfetch.   v1.0 (17/08/2026)

    python _pcfetch\\selfcheck.py            (kiem het moi du an)
    python _pcfetch\\selfcheck.py gritfell   (chi mot du an)

Chay SAU pcfetch.py. Doc dau ra cua lan chay vua roi, cham suc khoe, tu va
nhung loi CO THE va an toan, va ghi ro thu gi CAN NGUOI.

=========================== TRIET LY ===========================
"Tu fix" khong duoc phep im lang. Hom 17/08 he thong nay bi cat hai lan boi
chinh co che tu dong: .bat tu don dep len chinh no roi in "DONE", va git push
tra 0 trong khi pull da fail. Nen o day chia 3 TANG theo muc an toan:

TANG 1 — TU KHOI PHUC NGAY TRONG LUC CHAY (da nam trong pcfetch.py)
  · retry + lui thoi gian khi 429/503/timeout
  · Reddit: thu 4 duong, nho duong nao song, top -> hot
  · Policy: 404 o /policies/ -> thu 7 duong /pages/
  · CA certifi thay kho chung chi Windows
  Dac diem: khong doi cau hinh, khong de lai dau vet, chay lai la lai lam.

TANG 2 — TU VA CAU HINH (file nay)  ⚠️ CHI KHI DA KIEM CHUNG
  Chi va khi tim duoc duong thay the va DA THU duong do tra ve du lieu that.
  Moi lan va deu: sao luu config cu, ghi vao selfheal.log, in ra man hinh.
  Khong bao gio xoa du lieu — sub loi bi chuyen sang muc "subs_quarantine"
  kem ly do va ngay, de nguoi doc lai duoc va hoan tac duoc.

TANG 3 — CAM TU SUA, PHAI BAO NGUOI
  · Reddit 403/429 dai dang  -> can dang ky app OAuth (viec cua nguoi)
  · Etsy PROVENANCE_REQUIRED -> can browser that, khong phai urllib
  · git push bi tu choi      -> lien quan PAT/secret
  · Task Scheduler 0x8007... -> file bi di chuyen, nguoi phai quyet dinh
  Nhung thu nay ghi vao health.json muc "need_human". Tu doan o day = nguy hiem.
================================================================

Dau ra:  _pcfetch/health.json          (may doc)
         _pcfetch/logs/selfheal.log    (nguoi doc, chi ghi khi CO va)
Ma thoat: 0 = khong co gi can nguoi · 1 = co viec can nguoi
"""
import json, os, sys, re, time, shutil, difflib
from datetime import datetime, timezone, timedelta

VERSION = "1.0"
TZ = timezone(timedelta(hours=7))
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PROJDIR = os.path.join(HERE, "projects")
LOGDIR = os.path.join(HERE, "logs")

sys.path.insert(0, HERE)
import pcfetch as E          # dung lai fetch/classify/get_feed cua bo may


# ─────────────────── TANG 2: cac phep va an toan ───────────────────

def heal_collection_slug(url):
    """Feed dang /collections/<slug>/products.json bi 404 hoac tra 0 san pham.

    Cach va: doc collections.json THAT cua chinh ten mien do -> lay danh sach
    handle co that -> chon handle giong slug cu nhat -> THU no -> chi khi tra ve
    >0 san pham moi chap nhan. Khong doan, khong thay bang thu chua kiem.

    Tra ve url moi, hoac None neu khong tim duoc duong nao that su chay.
    """
    m = re.match(r"(https?://[^/]+)/collections/([^/]+)/products\.json(.*)$", url)
    if not m:
        return None
    base, slug, tail = m.group(1), m.group(2), m.group(3)
    try:
        cols = json.loads(E.fetch(base + "/collections.json?limit=250"))
    except Exception:
        return None
    handles = [c.get("handle") for c in (cols.get("collections") or
                                         cols.get("smart_collections") or []) if c.get("handle")]
    if not handles:
        return None
    # xep theo do giong slug cu, thu 3 ung vien dau
    ranked = sorted(handles, key=lambda h: difflib.SequenceMatcher(None, slug, h).ratio(),
                    reverse=True)[:3]
    for h in ranked:
        cand = "%s/collections/%s/products.json%s" % (base, h, tail or "?limit=250")
        try:
            prods = E.get_feed(cand)       # get_feed da tu bao loi neu 0 san pham
            if prods:
                return cand
        except Exception:
            pass
        time.sleep(0.5)
    return None


def backup(path):
    b = path + ".bak"
    shutil.copy2(path, b)
    return b


def log_heal(lines):
    os.makedirs(LOGDIR, exist_ok=True)
    with open(os.path.join(LOGDIR, "selfheal.log"), "a", encoding="utf-8") as f:
        for l in lines:
            f.write(l + "\n")


# ─────────────────── cham suc khoe mot du an ───────────────────

NEED_HUMAN_CODES = {
    "HTTP 403": "bi chan bot — neu la Reddit thi can dang ky app OAuth",
    "HTTP 429": "bi rate-limit lien tuc — can dang ky app OAuth",
    "HTTP 401": "can dang nhap / thieu credential",
    "SSL":      "loi chung chi tren may — python -m pip install certifi",
    "PROXY":    "VPN/proxy dang chan",
    "DNS":      "may khong phan giai duoc ten mien",
}


def check_project(project, today, do_heal=True):
    cfgp = os.path.join(PROJDIR, project + ".json")
    with open(cfgp, encoding="utf-8") as f:
        cfg = json.load(f)

    # "active": false = store DANG XAY, chua mo ban. Bo qua, KHONG bao dong.
    # Neu khong co co nay thi watchdog se bao "thieu live-fetch.json" moi sang
    # cho mot store chua ton tai — va bao dong sai moi ngay thi nguoi ta thoi doc
    # bao dong, den hom co chuyen that cung bo qua luon. Chay TAY van duoc.
    if cfg.get("active") is False:
        return {"project": project, "status": "CHUA_MO", "checks": [],
                "healed": [], "need_human": [],
                "note": cfg.get("_ly_do_chua_mo", "danh dau active:false")}
    live_p = os.path.join(ROOT, cfg.get("out_live", project + "-live-fetch.json"))
    soc_p = os.path.join(ROOT, cfg.get("out_social", project + "-social-fetch.json"))

    rep = {"project": project, "checks": [], "healed": [], "need_human": [], "status": "OK"}

    def fail(msg, human=None):
        rep["checks"].append("FAIL " + msg)
        rep["status"] = "FAIL"
        if human:
            rep["need_human"].append(human)

    # 1. File dau ra co ton tai va co PHAI CUA HOM NAY
    live = None
    if not os.path.exists(live_p):
        fail("khong co %s" % os.path.basename(live_p),
             "%s: chua bao gio sinh duoc file live-fetch. Chay thu tay: "
             "_pcfetch\\run_pc_fetch.bat %s" % (project, project))
    else:
        with open(live_p, encoding="utf-8") as f:
            live = json.load(f)
        d = live.get("date")
        if d != today:
            # DAY LA LOI DA GIET GERBERA 5 NGAY MA KHONG AI BIET:
            # file van con do, van doc duoc, chi la CU. Phai bao that to.
            fail("live-fetch cu: %s (hom nay %s)" % (d, today),
                 "%s: du lieu dung o %s, task khong chay hoac chay fail. "
                 "Kiem: schtasks /Query /TN \"FoxEra PC Fetch - %s\" /V /FO LIST "
                 "| findstr \"Last Result\"" % (project, d, project))
        else:
            rep["checks"].append("OK live-fetch = hom nay")

    # 2. Ty le feed lay duoc
    if live:
        nfeed = len(cfg.get("feeds") or {})
        ok = len(live.get("feeds") or {})
        rep["feeds"] = "%d/%d" % (ok, nfeed)
        if nfeed and ok == 0:
            fail("0/%d feed" % nfeed, "%s: khong feed nao lay duoc — kiem mang/VPN" % project)
        elif nfeed and ok < nfeed:
            rep["checks"].append("CANH BAO feed %d/%d" % (ok, nfeed))
        else:
            rep["checks"].append("OK feed %d/%d" % (ok, nfeed))

    # 3. Social: file co, va co PHAI hom nay
    # errs gop CA HAI nguon. Gan gia tri o day, TRUOC moi nhanh dieu kien —
    # ban dau no nam trong nhanh else nen khi social thieu file thi vong lap
    # duoi no vo tinh doc bien chua gan. Loi kieu do lam selfcheck chet giua
    # duong, va mot cong cu canh bao ma tu chet thi te hon la khong co.
    errs = list((live.get("errors") if live else []) or [])
    if (cfg.get("social") or {}).get("enabled"):
        if not os.path.exists(soc_p):
            fail("khong co %s" % os.path.basename(soc_p))
        else:
            with open(soc_p, encoding="utf-8") as f:
                soc = json.load(f)
            if soc.get("date") != today:
                fail("social-fetch cu: %s" % soc.get("date"))
            nsub = sum(len(v) for v in ((cfg["social"].get("subs")) or {}).values())
            oks = len(soc.get("reddit") or {})
            rep["reddit"] = "%d/%d" % (oks, nsub)
            if nsub and oks == 0:
                rep["checks"].append("CANH BAO reddit 0/%d" % nsub)
                rep["need_human"].append(
                    "%s: Reddit chan sach. Dut diem: reddit.com/prefs/apps -> create app "
                    "loai 'script' -> setx REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET" % project)
            errs += (soc.get("errors") or [])

    # 4. Doc tung loi -> phan tang
    changed = False
    quarantine = []
    for e in errs:
        code, kind = e.get("code", ""), e.get("kind", "")
        # --- TANG 2: feed collection sai slug -> tu tim slug that
        if do_heal and kind == "feed" and code in ("HTTP 404", "0-DULIEU"):
            brand = e.get("brand")
            old = (cfg.get("feeds") or {}).get(brand)
            if old and "/collections/" in old:
                new = heal_collection_slug(old)
                if new:
                    cfg["feeds"][brand] = new
                    changed = True
                    rep["healed"].append("feed '%s': %s -> %s" % (brand, old, new))
                    continue
            rep["need_human"].append(
                "%s: feed '%s' loi %s va khong tim duoc duong thay the. URL: %s"
                % (project, brand, code, old))
        # --- TANG 2: sub Reddit khong ton tai -> cach ly, KHONG xoa
        elif do_heal and kind == "reddit" and code == "HTTP 404":
            quarantine.append(e.get("sub"))
        # --- TANG 3: cam tu sua
        elif code in NEED_HUMAN_CODES and kind != "reddit":
            rep["need_human"].append("%s: %s '%s' — %s"
                                     % (project, code,
                                        e.get("brand") or e.get("sub") or e.get("name") or "?",
                                        NEED_HUMAN_CODES[code]))

    if quarantine:
        subs = (cfg.get("social") or {}).get("subs") or {}
        q = cfg["social"].setdefault("subs_quarantine", {})
        for sub in quarantine:
            for niche, lst in subs.items():
                if sub in lst:
                    lst.remove(sub)
                    q[sub] = {"tu_niche": niche, "ly_do": "HTTP 404 — sub khong ton tai",
                              "ngay": today}
                    changed = True
                    rep["healed"].append("sub 'r/%s': cach ly (404, khong xoa)" % sub)
        # niche rong thi bo di cho bang sach
        for niche in [k for k, v in subs.items() if not v]:
            subs.pop(niche)

    if changed:
        b = backup(cfgp)
        with open(cfgp, "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
        stamp = datetime.now(TZ).isoformat()
        log_heal(["%s  [%s]  ban luu: %s" % (stamp, project, os.path.basename(b))]
                 + ["    " + h for h in rep["healed"]]
                 + ["    -> co hieu luc TU LAN CHAY SAU"])
    return rep


# ─────────────────── chay ───────────────────

def main():
    only = sys.argv[1].strip().lower() if len(sys.argv) > 1 else None
    today = datetime.now(TZ).strftime("%Y-%m-%d")
    projects = sorted(f[:-5] for f in os.listdir(PROJDIR)
                      if f.endswith(".json") and not f.startswith("_"))
    if only:
        projects = [p for p in projects if p == only] or [only]

    print("=" * 64)
    print("SELFCHECK v%s — %s" % (VERSION, datetime.now(TZ).strftime("%d/%m/%Y %H:%M")))
    print("=" * 64)
    print("%-16s %-8s %-9s %-9s %s" % ("DU AN", "TRANG", "FEED", "REDDIT", "GHI CHU"))
    print("-" * 64)

    reps, need = [], []
    for p in projects:
        try:
            r = check_project(p, today)
        except FileNotFoundError:
            print("%-16s %-8s %s" % (p, "?", "khong co file cau hinh"))
            continue
        reps.append(r)
        need += r["need_human"]
        if r["status"] == "CHUA_MO":
            print("%-16s %-8s %-9s %-9s %s" % (p, "chua mo", "-", "-",
                                               r.get("note", "")[:24]))
            continue
        note = "; ".join(c for c in r["checks"] if not c.startswith("OK")) or "sach"
        print("%-16s %-8s %-9s %-9s %s" % (p, r["status"], r.get("feeds", "-"),
                                           r.get("reddit", "-"), note[:24]))
        for h in r["healed"]:
            print("   TU VA: " + h)

    health = {"schema_version": VERSION, "checked_at": datetime.now(TZ).isoformat(),
              "date": today, "projects": reps,
              "need_human": need,
              "overall": "NEED_HUMAN" if need else
                         ("FAIL" if any(r["status"] == "FAIL" for r in reps) else "OK"),
              "chua_mo": [r["project"] for r in reps if r["status"] == "CHUA_MO"]}
    with open(os.path.join(HERE, "health.json"), "w", encoding="utf-8") as f:
        json.dump(health, f, ensure_ascii=False, indent=1)

    print("-" * 64)
    healed_n = sum(len(r["healed"]) for r in reps)
    print("TONG: %s | tu va %d cho | can nguoi %d viec"
          % (health["overall"], healed_n, len(need)))
    if healed_n:
        print("Cac cho tu va CO HIEU LUC TU LAN CHAY SAU (config da doi, da sao luu .bak).")
    if need:
        print("-" * 64)
        print("CAN NGUOI LAM — khong tu sua duoc, va co tinh khong tu doan:")
        for i, n in enumerate(need, 1):
            print("  %d. %s" % (i, n))
    print("=" * 64)
    sys.exit(1 if need else 0)


if __name__ == "__main__":
    main()
