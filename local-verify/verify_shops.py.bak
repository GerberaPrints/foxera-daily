#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LOCAL-VERIFY SHOPS v9 — MAT NHIN SAN cua he thong FoxEra
=========================================================
v9 (13/08/2026) — VA LOI FAIL-OPEN. Doc phan nay truoc khi sua tiep.

SU CO DA XAY RA (bang chung 13/08): ban v8 bao 141 shop song / 20 chet.
Quet live doi chung 161/161 shop cho ket qua that: 91 song / 69 chet.
=> v8 SAI 51/160 shop (32%), bo sot 50 cai chet, trong do co
   E5 AURELOOMS (415 don) va E3 Loomelody (337 don).

NGUYEN NHAN GOC (da kiem chung: 50/50 ca bao sai deu parse duoc 0 truong):
    v8 dong 100-104:
        if "currently not selling" in low:  -> not_selling
        if "taking a short break" in low:   -> on_break
        rec["status"] = "active"            # <-- MAC DINH
    "active" la gia tri MAC DINH khi khong khop 2 mau tren. Khi trang chua
    render xong (goto dung domcontentloaded + sleep cung 2500ms), HTML chua
    co cau "currently not selling" -> roi thang vao "active".
    Trang rong va shop dang chet cho ra CUNG mot ket qua.

NGUYEN TAC v9: KHONG BAO GIO MAC DINH "active".
    Moi trang thai phai co BANG CHUNG DUONG. Khong du bang chung -> "unknown".
    Theo Luat 43: unknown => hanh dong la "quet lai", TUYET DOI khong phai
    "giu nhip listing". Khong biet KHAC voi khoe.

CAC LOI KHAC DA VA:
  #2 v8 `return` ngay khi thay not_selling -> vut mat so Sales.
     Trang shop DA KHOA VAN hien "N Sales" (AURELOOMS 415, Zyvorexa 2).
     Day la du lieu quy nhat cho Khoi 11. v9 luon parse so truoc khi tra ve.
  #3 regex review `\(([\d,]+)\)\s*</span>` khop BAT KY so trong ngoac nao
     tren trang. v9 uu tien JSON-LD reviewCount, bo mau long.
  #4 regex listing `([\d,]+)\s+items?</` khop ca bo dem danh muc ben sidebar.
     v9 dung mau neo + kiem tinh hop ly.
  #5 lich su ghi khoa "d" thay vi "date", va bo truong khi None -> khong phan
     biet duoc "trang khong hien" voi "khong doc duoc". v9 ghi du, giu null.
  #6 rating: v8 co the bat trung ratingValue cua MOT listing thay vi cua shop
     (bang chung E26: v8 doc 3.5, thuc te 2.4). v9 chi nhan aggregateRating.
  #7 merge_daily GHI DE foxera-accounts-daily.json — file nay tu V6 do Cloud
     so huu qua Drive handoff. Hai nguoi ghi mot file = tranh chap.
     v9 ghi ra foxera-shops-desktop.json rieng; Cloud la nguoi merge.

CHAY:  python local-verify/verify_shops.py              # quet toan bo
       python local-verify/verify_shops.py E135 E42     # vai ma
       python local-verify/verify_shops.py --auto       # khong nguoi truc
       python local-verify/verify_shops.py --selftest   # chay test, KHONG mo browser
"""
import asyncio, json, random, re, sys
from datetime import date
from pathlib import Path

AUTO      = "--auto" in sys.argv
SELFTEST  = "--selftest" in sys.argv
DEBUG_DIR = None  # set trong main()

ROOT      = Path(__file__).resolve().parent.parent
HERE      = Path(__file__).resolve().parent
ROSTER    = ROOT / "foxera-accounts.json"
REGISTRY  = ROOT / "foxera-store-registry.json"
OUT       = HERE / "foxera-shops-live.json"
DESKTOP_OUT = HERE / "foxera-shops-desktop.json"   # v9: KHONG dung accounts-daily nua
PROFILE   = HERE / ".pw-profile"
REVIEWS_FOR = {"E29", "E4", "E257", "E193"}
REVIEWS_OUT = HERE / "foxera-reviews.json"

# ---------------------------------------------------------------- classify --

# Trang Etsy that LUON co cac moc nay. Khong co = trang chua render / bi chan.
RENDER_MARKERS = ("etsy", "</html>")
# Bang chung DUONG cho "trang shop da render du"
SHOP_PAGE_MARKERS = (
    "is currently not selling on etsy",
    "taking a short break",
    "shop-home",            # id/class khung shop
    'data-shop-id',
    '"@type":"onlinestore"',
    "sales</span>", " sales",
    "no items listed at this time",
    "itemlist",
)
BOTWALL_MARKERS = ("captcha", "datadome", "verify you are a human",
                   "unusual activity", "px-captcha", "are you a robot")

MIN_HTML = 20000   # trang Etsy that luon lon hon nhieu; nguong nay bat trang rong


def classify(html, http_status=None):
    """Tra (status, evidence, quote).

    status in: active | not_selling | on_break | not_found | blocked | unknown
    KHONG BAO GIO tra 'active' neu khong co bang chung duong.
    """
    if http_status == 404:
        return "not_found", "http 404", None
    if not html:
        return "unknown", "html rong", None
    low = html.lower()

    # 1) bot-wall (kiem truoc, vi trang wall cung ngan)
    if any(m in low for m in BOTWALL_MARKERS) and "is currently not selling" not in low:
        hit = next(m for m in BOTWALL_MARKERS if m in low)
        return "blocked", f"botwall marker: {hit}", None

    # 2) GUARD RENDER — day la chot chan v8 thieu
    if len(html) < MIN_HTML or not all(m in low for m in RENDER_MARKERS):
        return "unknown", f"trang chua render du (len={len(html)})", None
    if not any(m in low for m in SHOP_PAGE_MARKERS):
        return "unknown", "khong thay moc nao cua trang shop", None

    # 3) bang chung AM (shop khong ban duoc) — co cau nguyen van
    m = re.search(r'([A-Za-z0-9_\-]{2,40})\s+is currently not selling on Etsy', html, re.I)
    if m or "is currently not selling on etsy" in low:
        quote = m.group(0) if m else "is currently not selling on Etsy"
        return "not_selling", "cau trang thai nguyen van", quote
    if "taking a short break" in low:
        return "on_break", "cau nghi phep nguyen van", "taking a short break"

    # 4) bang chung DUONG (storefront mo) — phai co it nhat 1
    positives = []
    if re.search(r'[\d,]+\s*Sales\b', html, re.I):           positives.append("co dong Sales")
    if "no items listed at this time" in low:                positives.append("co cau 'No items listed'")
    if re.search(r'data-shop-id|"@type"\s*:\s*"OnlineStore"', html, re.I): positives.append("markup shop")
    if re.search(r'/listing/\d+', html):                     positives.append("co link /listing/")
    if not positives:
        return "unknown", "khong co bang chung duong nao cho storefront mo", None
    return "active", " + ".join(positives), None


# ------------------------------------------------------------------ parse ---

def _int(s):
    try: return int(re.sub(r"[^\d]", "", s))
    except Exception: return None


def parse_numbers(html):
    """Parse so cong khai. Chay cho CA shop song LAN shop da khoa (loi #2)."""
    out = {"sales": None, "rating": None, "reviews": None, "listings": None}

    # SALES — Etsy hien "N Sales" ngay duoi ten shop, ke ca khi shop da khoa.
    m = re.search(r'>\s*([\d,]+)\s*Sales\s*<', html, re.I) or \
        re.search(r'\b([\d,]+)\s+Sales\b', html)
    if m:
        v = _int(m.group(1))
        if v is not None and v < 10_000_000: out["sales"] = v

    # RATING — CHI nhan aggregateRating cua shop. (loi #6)
    m = re.search(r'"aggregateRating"\s*:\s*\{[^}]*?"ratingValue"\s*:\s*"?([\d.]+)', html, re.S)
    if m:
        try:
            v = round(float(m.group(1)), 2)
            if 0 < v <= 5: out["rating"] = v
        except ValueError: pass

    # REVIEWS — JSON-LD truoc; bo han mau long \(N\)</span> cua v8 (loi #3)
    m = re.search(r'"aggregateRating"\s*:\s*\{[^}]*?"reviewCount"\s*:\s*"?([\d,]+)', html, re.S) or \
        re.search(r'"reviewCount"\s*:\s*"?([\d,]+)', html)
    if m:
        v = _int(m.group(1))
        if v is not None and v < 1_000_000: out["reviews"] = v

    # LISTINGS — mau neo, co kiem tinh hop ly (loi #4)
    for pat in (r'([\d,]+)\s+items?\s*</(?:span|h2|div)>',
                r'"numberOfItems"\s*:\s*"?([\d,]+)',
                r'>\s*([\d,]+)\s+items\s*<'):
        m = re.search(pat, html, re.I)
        if m:
            v = _int(m.group(1))
            if v is not None and 0 <= v <= 100_000:
                out["listings"] = v; break
    if "no items listed at this time" in html.lower() and out["listings"] is None:
        out["listings"] = 0
    return out


def extract_reviews(html, cap=20):
    out = []
    for m in re.finditer(r'"reviewBody"\s*:\s*"((?:[^"\\]|\\.){10,600}?)"', html):
        try:    t = m.group(1).encode("utf-8").decode("unicode_escape").strip()
        except Exception: t = m.group(1).strip()
        if t and t not in out: out.append(t[:400])
        if len(out) >= cap: return out
    return out


# ---------------------------------------------------------------- targets ---

def load_targets():
    seen, out = set(), []
    def add(code, shop, url=None):
        if not shop: return
        code = code.upper()
        if code in seen: return
        seen.add(code)
        out.append({"code": code, "shop": shop, "url": url or f"https://www.etsy.com/shop/{shop}"})
    try:
        for a in json.loads(ROSTER.read_text(encoding="utf-8"))["accounts"]:
            add(a["code"], a.get("shop"), a.get("url"))
    except Exception as e:
        print("roster skip:", e)
    try:
        r = json.loads(REGISTRY.read_text(encoding="utf-8"))
        for sec in ("live", "sus_with_sales", "sus_new"):   # v9: them sus_new
            for x in r.get(sec, []):
                add(x["code"], x.get("shop"))
        for code, v in (r.get("store_links_extra") or {}).items():
            add(code, v.get("shop"), v.get("url"))
    except Exception as e:
        print("registry skip:", e)
    return out


# ----------------------------------------------------------------- scrape ---

async def scrape_shop(page, acc):
    rec = {"code": acc["code"], "shop": acc["shop"], "url": acc["url"]}
    html, http_status = "", None
    try:
        resp = await page.goto(acc["url"], wait_until="domcontentloaded", timeout=45000)
        http_status = resp.status if resp else None
        # v9: cho co BANG CHUNG thay vi sleep cung (nguyen nhan goc loi #1)
        try:
            await page.wait_for_function(
                """() => {
                    const t = document.body ? document.body.innerText : '';
                    return t.includes('currently not selling')
                        || t.includes('taking a short break')
                        || /\\d[\\d,]*\\s*Sales/.test(t)
                        || t.includes('No items listed at this time')
                        || document.querySelector('a[href*="/listing/"]') !== null;
                }""", timeout=15000)
        except Exception:
            # het gio cho -> KHONG doan; de classify() tra unknown
            await page.wait_for_timeout(1500)
        html = await page.content()
    except Exception as e:
        rec.update(status="unknown", evidence=f"exception: {type(e).__name__}",
                   sales=None, rating=None, reviews=None, listings=None)
        return rec

    status, evidence, quote = classify(html, http_status)

    if status == "blocked" and not AUTO:
        print(">>> BOT-WALL tai", acc["code"], "— giai tay trong cua so Chrome roi bam Enter...")
        input()
        await page.wait_for_timeout(1500)
        html = await page.content()
        status, evidence, quote = classify(html, http_status)

    rec["status"]   = status
    rec["evidence"] = evidence
    if quote: rec["quote"] = quote
    rec["http_status"] = http_status
    # v9 loi #2: parse so cho MOI trang thai co trang that, ke ca not_selling
    rec.update(parse_numbers(html) if status in ("active", "not_selling", "on_break")
               else {"sales": None, "rating": None, "reviews": None, "listings": None})

    if status == "unknown" and DEBUG_DIR:
        try:
            (DEBUG_DIR / f"{acc['code']}_{acc['shop']}.html").write_text(html, encoding="utf-8")
            rec["debug_html"] = True
        except Exception: pass

    if acc["code"] in REVIEWS_FOR and status == "active":
        rv = extract_reviews(html)
        if rv: rec["recent_reviews"] = rv
    return rec


# ------------------------------------------------------------------- test ---

def selftest():
    """Bo test bat DUNG con bug da gay su co 13/08. Chay: --selftest"""
    ok = fail = 0
    def chk(name, got, want):
        nonlocal ok, fail
        if got == want: ok += 1;   print(f"  [OK] {name}")
        else:           fail += 1; print(f"  [FAIL] {name}: nhan {got!r}, can {want!r}")

    print("== REGRESSION: trang chua render KHONG duoc thanh 'active' ==")
    chk("html rong",            classify("")[0],                      "unknown")
    chk("shell HTML ngan",      classify("<html><body></body></html>")[0], "unknown")
    chk("dai nhung khong moc",  classify("<html>etsy</html>" + "x"*30000)[0], "unknown")
    chk("HTTP 404",             classify("<html>etsy</html>"+"x"*30000, 404)[0], "not_found")

    pad = "x"*30000
    dead = f'<html><body>AURELOOMS is currently not selling on Etsy <span>415 Sales</span>{pad}</body></html>'
    chk("shop chet -> not_selling", classify(dead)[0], "not_selling")
    chk("shop chet VAN lay duoc Sales (loi #2)", parse_numbers(dead)["sales"], 415)

    live_ = ('<html><body>etsy <a href="/listing/123/x">i</a>'
             '<span>707 Sales</span>'
             '<script>{"aggregateRating":{"ratingValue":"4.1","reviewCount":"101"}}</script>'
             '<span>697 items</span>' + pad + '</body></html>')
    chk("shop song -> active",  classify(live_)[0], "active")
    n = parse_numbers(live_)
    chk("sales",    n["sales"],    707)
    chk("rating (khong lam tron nua sao)", n["rating"], 4.1)
    chk("reviews",  n["reviews"],  101)
    chk("listings", n["listings"], 697)

    wall = "<html>etsy datadome captcha</html>" + pad
    chk("bot-wall -> blocked", classify(wall)[0], "blocked")

    noitem = '<html><body>etsy data-shop-id="1" No items listed at this time' + pad + '</body></html>'
    chk("shop mo nhung 0 hang -> active", classify(noitem)[0], "active")
    chk("listings = 0",                   parse_numbers(noitem)["listings"], 0)

    print("\n== Regex long cua v8 KHONG con bat nham ==")
    trap = ('<html><body>etsy <a href="/listing/9/x">i</a><span>0 Sales</span>'
            '<span>Sweatshirts (48)</span><span>Danh muc 999 items</span>' + pad + '</body></html>')
    n2 = parse_numbers(trap)
    chk("khong lay (48) lam reviews", n2["reviews"], None)
    chk("sales doc dung 0",           n2["sales"],   0)

    print(f"\n{ok} pass / {fail} fail")
    return 1 if fail else 0


# ------------------------------------------------------------------- main ---

async def main():
    global DEBUG_DIR
    from playwright.async_api import async_playwright
    DEBUG_DIR = HERE / "debug-html"; DEBUG_DIR.mkdir(exist_ok=True)

    targets = load_targets()
    only = {c.upper() for c in sys.argv[1:] if not c.startswith("--")}
    if only: targets = [a for a in targets if a["code"] in only]
    print(f"Quet {len(targets)} shop (roster + registry)...")

    results = []
    async with async_playwright() as pw:
        args = ["--disable-blink-features=AutomationControlled"]
        try:
            ctx = await pw.chromium.launch_persistent_context(str(PROFILE), headless=False,
                    channel="chrome", args=args, locale="en-US",
                    viewport={"width":1280,"height":850})
        except Exception:
            print("(Khong thay Chrome — dung Chromium)")
            ctx = await pw.chromium.launch_persistent_context(str(PROFILE), headless=False,
                    args=args, locale="en-US", viewport={"width":1280,"height":850})
        await ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined})")
        page = ctx.pages[0] if ctx.pages else await ctx.new_page()
        try:
            await page.goto("https://www.etsy.com/", wait_until="domcontentloaded", timeout=45000)
            await page.wait_for_timeout(2500)
            if classify(await page.content())[0] == "blocked" and not AUTO:
                print(">>> Bot-wall ngay trang chu — giai tay roi bam Enter..."); input()
        except Exception as e:
            print("warm-up skip:", e)

        for i, acc in enumerate(targets, 1):
            rec = await scrape_shop(page, acc)
            results.append(rec)
            print(f"[{i}/{len(targets)}] {acc['code']:6s} {acc['shop']:24s} {rec['status']:12s} "
                  f"sales={rec.get('sales')} rating={rec.get('rating')} listings={rec.get('listings')}"
                  + ("" if rec['status'] != 'unknown' else f"  <-- {rec.get('evidence')}"))
            try:
                await page.wait_for_timeout(random.randint(3500, 6500))
            except Exception:
                print(">>> Cua so Chrome da dong — dung, luu phan da co."); break
        try: await ctx.close()
        except Exception: pass

    # ---- gop voi lan quet truoc ----
    old = {}
    if OUT.exists():
        try:
            for r in json.loads(OUT.read_text(encoding="utf-8")).get("shops", []):
                old[r["code"]] = r
        except Exception: pass

    today = date.today().isoformat()
    flips = []
    for r in results:
        prev = old.get(r["code"])
        if prev and prev.get("status") and prev["status"] != r["status"]:
            r["prev_status"]  = prev["status"]
            r["prev_checked"] = prev.get("verified_at")
            # v9: doi trang thai CHUA duoc coi la that cho toi lan quet thu 2 khop.
            # (13/08: v8 bao 6 shop "reopen", kiem live 0/6 dung)
            r["status_confirmed"] = (prev.get("prev_status") == prev.get("status") == r["status"])
            flips.append((r["code"], prev["status"], r["status"]))
        else:
            r["status_confirmed"] = True
        old[r["code"]] = {**r, "verified_at": today}

    if flips:
        print("\n!!! DOI TRANG THAI (chua xac nhan, can lan quet thu 2):")
        for c, a, b in flips: print(f"    {c}: {a} -> {b}")

    unknowns = [r for r in results if r["status"] == "unknown"]
    payload = {
        "project": "foxera", "verified_at": today, "scanner_version": "v9",
        "provenance": "live_local_browser",
        "counts": {s: sum(1 for r in old.values() if r.get("status") == s)
                   for s in ("active","not_selling","on_break","not_found","blocked","unknown")},
        "quality": {
            "unknown_count": len(unknowns),
            "unknown_codes": [r["code"] for r in unknowns],
            "note": ("unknown = KHONG DU BANG CHUNG, khong phai 'khoe'. Hanh dong = quet lai. "
                     "HTML da luu o local-verify/debug-html/ de xem tai sao."),
        },
        "shops": sorted(old.values(), key=lambda x: x["code"]),
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    # v9 loi #5: khoa 'date', va GIU null de phan biet "trang khong hien" vs "khong doc duoc"
    with open(HERE / "foxera-shops-history.jsonl", "a", encoding="utf-8") as hf:
        for r in results:
            hf.write(json.dumps({
                "date": today, "code": r["code"], "status": r["status"],
                "sales": r.get("sales"), "rating": r.get("rating"),
                "reviews": r.get("reviews"), "listings": r.get("listings"),
                "evidence": r.get("evidence"),
            }, ensure_ascii=False) + "\n")

    rvout = {s["code"]: {"shop": s.get("shop"), "date": s.get("verified_at"),
                         "reviews": s.get("recent_reviews", [])}
             for s in old.values() if s.get("recent_reviews")}
    if rvout:
        REVIEWS_OUT.write_text(json.dumps({"updated": today, "scope": sorted(REVIEWS_FOR),
                               "shops": rvout}, ensure_ascii=False, indent=2), encoding="utf-8")

    # v9 loi #7: KHONG ghi de foxera-accounts-daily.json (Cloud so huu qua Drive handoff)
    DESKTOP_OUT.write_text(json.dumps({
        "date": today, "scanner_version": "v9", "provenance": "live_local_browser",
        "note": "Desktop CHI ghi file nay. Cloud doc va merge vao foxera-accounts-daily.json. "
                "v8 ghi de accounts-daily -> 2 nguoi ghi 1 file, da bo.",
        "shops": [{k: r.get(k) for k in ("code","shop","status","sales","rating",
                                          "reviews","listings","status_confirmed","evidence")}
                  for r in old.values()],
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    c = payload["counts"]
    print(f"\n=== KET QUA === song {c['active']} · khong ban duoc {c['not_selling']} · "
          f"nghi {c['on_break']} · chan {c['blocked']} · KHONG RO {c['unknown']}")
    if unknowns:
        print(f"!!! {len(unknowns)} shop KHONG RO — KHONG duoc doc la 'dang khoe'. "
              f"Xem HTML o {DEBUG_DIR.name}/ roi quet lai.")
    print(f"Da ghi {OUT.name} + {DESKTOP_OUT.name}. Roi: git add -A && git commit && git push")


if __name__ == "__main__":
    if SELFTEST:
        sys.exit(selftest())
    asyncio.run(main())
