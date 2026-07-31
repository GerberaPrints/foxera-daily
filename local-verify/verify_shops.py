#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LOCAL-VERIFY SHOPS v5 — MẮT NHÌN SÀN DUY NHẤT của hệ thống FoxEra
v3: chống bot-wall (Chrome thật + profile lưu cookie + ẩn webdriver);
gặp captcha thì DỪNG CHỜ bạn giải tay trong cửa sổ rồi bấm Enter — giải 1 lần, cookie nhớ.
(GAS bị Etsy chặn 429 · Cloud bị chặn PROVENANCE — chỉ browser thật trên MÁY BẠN quét được)

Nguồn danh sách: foxera-accounts.json + foxera-store-registry.json (live + sus_with_sales).
SUS NEW không có tên shop -> bỏ qua (không có URL để quét).

Cài (1 lần):  pip install playwright && python -m playwright install chromium
Chạy:         python local-verify/verify_shops.py            # quét toàn bộ
              python local-verify/verify_shops.py E135 E42   # chỉ vài mã
Sau khi chạy: git add -A && git commit -m "shops-live" && git push
  -> Hub (GAS) đọc foxera-accounts-daily.json qua raw URL, khỏi fetch Etsy.

Script tự làm 2 việc: (1) ghi local-verify/foxera-shops-live.json;
(2) MERGE sales/rating/reviews/listings/shopStatus/checkedAt vào foxera-accounts-daily.json.

Nhịp khuyến nghị: 6 store LIVE quét DAILY (chuông báo sweep); full 2 lần/tuần.
"""
import asyncio, json, random, re, sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ROSTER = ROOT / "foxera-accounts.json"
REGISTRY = ROOT / "foxera-store-registry.json"
DAILY = ROOT / "foxera-accounts-daily.json"
OUT = Path(__file__).resolve().parent / "foxera-shops-live.json"
PROFILE = Path(__file__).resolve().parent / ".pw-profile"   # cookie/captcha lưu ở đây giữa các lần chạy

def is_botwall(low):
    return ("captcha" in low or "datadome" in low or "verify you are a human" in low
            or "unusual activity" in low) and "sales" not in low

def load_targets():
    seen, out = set(), []
    def add(code, shop, url=None):
        code = code.upper()
        if code in seen or not shop: return
        seen.add(code)
        out.append({"code": code, "shop": shop, "url": url or f"https://www.etsy.com/shop/{shop}"})
    try:
        for a in json.loads(ROSTER.read_text(encoding="utf-8"))["accounts"]:
            add(a["code"], a.get("shop"), a.get("url"))
    except Exception as e:
        print("roster skip:", e)
    try:
        r = json.loads(REGISTRY.read_text(encoding="utf-8"))
        for sec in ("live", "sus_with_sales"):
            for x in r.get(sec, []):
                add(x["code"], x.get("shop"))
    except Exception as e:
        print("registry skip:", e)
    return out

async def scrape_shop(page, acc):
    rec = {"code": acc["code"], "shop": acc["shop"], "url": acc["url"]}
    try:
        await page.goto(acc["url"], wait_until="domcontentloaded", timeout=45000)
        await page.wait_for_timeout(2500)
        html = await page.content()
        low = html.lower()
        if is_botwall(low):
            print(">>> CAPTCHA/bot-wall tại", acc["code"], "— GIẢI TAY trong cửa sổ Chrome, xong quay lại đây bấm Enter...")
            input()
            await page.wait_for_timeout(1500)
            html = await page.content(); low = html.lower()
            if is_botwall(low):
                rec["status"] = "error:captcha"; return rec
        if "currently not selling" in low:
            rec["status"] = "not_selling"; return rec
        if "taking a short break" in low:
            rec["status"] = "on_break"; return rec
        rec["status"] = "active"
        m = re.search(r'([\d,.]+)\s*Sales', html, re.I)
        if m: rec["sales"] = int(re.sub(r"[^\d]", "", m.group(1)))
        # rating: ưu tiên aggregateRating JSON-LD (chuẩn shop), fallback aria-label — v5 fix vụ E29 4.1 bị đọc 4.0
        m = re.search(r'"aggregateRating"[^}]*?"ratingValue"\s*:\s*"?([\d.]+)', html, re.S) or \
            re.search(r'"ratingValue"\s*:\s*"?([\d.]+)', html) or \
            re.search(r'aria-label="([\d.]+) out of 5 stars"', html)
        if m: rec["rating"] = round(float(m.group(1)), 1)
        m = re.search(r'\(([\d,]+)\)\s*</span>', html) or \
            re.search(r'"reviewCount"\s*:\s*"?([\d,]+)', html)
        if m: rec["reviews"] = int(re.sub(r"[^\d]", "", m.group(1)))
        m = re.search(r'([\d,]+)\s+items?</', html, re.I)
        if m: rec["listings"] = int(re.sub(r"[^\d]", "", m.group(1)))
        rec["on_sale"] = bool(re.search(r'(\d+)% off', html))
    except Exception as e:
        rec["status"] = f"error:{type(e).__name__}"
    return rec

def merge_daily(shops):
    """Ghi số công khai vào foxera-accounts-daily.json để Hub đọc qua raw URL."""
    try:
        d = json.loads(DAILY.read_text(encoding="utf-8"))
    except Exception as e:
        print("KHÔNG merge được daily:", e); return
    by = {s["code"]: s for s in d.get("scores", [])}
    today = date.today().isoformat()
    for rec in shops:
        row = by.get(rec["code"])
        if not row:
            row = {"code": rec["code"], "shop": rec.get("shop"), "tier": "C" if rec.get("status") != "active" else "B"}
            d["scores"].append(row); by[rec["code"]] = row
        for k in ("sales", "rating", "reviews", "listings"):
            if k in rec: row[k] = rec[k]
        row["shopStatus"] = rec.get("status", "")
        row["checkedAt"] = rec.get("verified_at", today)
        row["fetch_provenance"] = "live_local_browser"
    d["shops_live_merged_at"] = today
    DAILY.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Đã merge {len(shops)} shop vào {DAILY.name}")

async def main():
    from playwright.async_api import async_playwright
    targets = load_targets()
    only = {c.upper() for c in sys.argv[1:]}
    if only:
        targets = [a for a in targets if a["code"] in only]
    print(f"Quét {len(targets)} shop (roster + registry)...")
    results = []
    async with async_playwright() as pw:
        # Chrome THẬT + profile bền (cookie/captcha nhớ giữa các lần) + ẩn dấu automation
        args = ["--disable-blink-features=AutomationControlled"]
        try:
            ctx = await pw.chromium.launch_persistent_context(str(PROFILE), headless=False,
                    channel="chrome", args=args, locale="en-US",
                    viewport={"width": 1280, "height": 850})
        except Exception:
            print("(Không thấy Chrome cài sẵn — dùng Chromium)")
            ctx = await pw.chromium.launch_persistent_context(str(PROFILE), headless=False,
                    args=args, locale="en-US", viewport={"width": 1280, "height": 850})
        await ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined})")
        page = ctx.pages[0] if ctx.pages else await ctx.new_page()
        # Khởi động ấm: vào trang chủ Etsy trước, nếu dính wall thì giải 1 lần tại đây
        try:
            await page.goto("https://www.etsy.com/", wait_until="domcontentloaded", timeout=45000)
            await page.wait_for_timeout(2500)
            if is_botwall((await page.content()).lower()):
                print(">>> Bot-wall ngay trang chủ — GIẢI TAY trong cửa sổ Chrome rồi bấm Enter...")
                input()
        except Exception as e:
            print("warm-up skip:", e)
        for i, acc in enumerate(targets, 1):
            rec = await scrape_shop(page, acc)
            results.append(rec)
            print(f"[{i}/{len(targets)}] {acc['code']} {acc['shop']}: {rec.get('status')} "
                  f"sales={rec.get('sales','-')} rating={rec.get('rating','-')}")
            if str(rec.get("status","")).startswith("error:TargetClosed"):
                print(">>> Cửa sổ Chrome đã bị ĐÓNG — dừng quét, lưu phần đã có. (Lần sau: đừng đóng cửa sổ; giải captcha xong quay lại đây bấm Enter)")
                break
            try:
                await page.wait_for_timeout(random.randint(3500, 6500))
            except Exception:
                print(">>> Cửa sổ Chrome đã bị ĐÓNG — dừng quét, lưu phần đã có.")
                break
        try:
            await ctx.close()
        except Exception:
            pass
    # merge với record cũ nếu quét 1 phần
    old = {}
    if OUT.exists():
        try:
            for r in json.loads(OUT.read_text(encoding="utf-8")).get("shops", []):
                old[r["code"]] = r
        except Exception:
            pass
    for r in results:
        prev = old.get(r["code"])
        if prev and prev.get("status") and prev.get("status") != r.get("status"):
            r["prev_status"] = prev.get("status"); r["prev_checked"] = prev.get("verified_at")
            print(f"  ⚠️ {r['code']} đổi status {prev.get('status')} -> {r.get('status')} (cần 2 lần liên tiếp mới tin)")
        old[r["code"]] = {**r, "verified_at": date.today().isoformat()}
    payload = {"project": "foxera", "verified_at": date.today().isoformat(),
               "provenance": "live_local_browser", "shops": sorted(old.values(), key=lambda x: x["code"])}
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    merge_daily(list(old.values()))
    print(f"\nĐã ghi {OUT.name} ({len(old)} shop). Nhớ: git add -A && git commit && git push")

if __name__ == "__main__":
    asyncio.run(main())
