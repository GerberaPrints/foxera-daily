#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LOCAL-VERIFY SHOPS — quét trạng thái công khai của các shop Etsy trong foxera-accounts.json
Chạy trên MÁY BẠN (desktop, browser thật) — cloud bị Etsy chặn (PROVENANCE_REQUIRED).

Cài (1 lần):  pip install playwright && python -m playwright install chromium
Chạy:         python local-verify/verify_shops.py            # quét toàn bộ roster
              python local-verify/verify_shops.py E29 E193   # chỉ quét vài mã
Sau khi chạy: git add local-verify/foxera-shops-live.json && git commit -m "shops-live $(date +%F)" && git push

Output: local-verify/foxera-shops-live.json
  { "verified_at": "YYYY-MM-DD", "shops": [ {code, shop, status, sales, rating, review_count, listing_count, on_sale} ] }
  status: "active" | "suspended" (trang bao 'currently not selling') | "error:<ly do>"

Khuyến nghị nhịp: FULL roster 1-2 lần/tuần (CN + T4). Tier A (đang chạy) có thể quét daily.
200 shop ~ 15-20 phút với delay an toàn 3-5s/shop.
"""
import asyncio, json, random, re, sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ROSTER = ROOT / "foxera-accounts.json"
OUT = Path(__file__).resolve().parent / "foxera-shops-live.json"

async def scrape_shop(page, acc):
    rec = {"code": acc["code"], "shop": acc["shop"], "url": acc["url"]}
    try:
        await page.goto(acc["url"], wait_until="domcontentloaded", timeout=45000)
        await page.wait_for_timeout(2500)
        html = await page.content()
        low = html.lower()
        if "currently not selling" in low or "this shop is taking a short break" in low:
            rec["status"] = "suspended" if "not selling" in low else "on_break"
            return rec
        if "captcha" in low and "sales" not in low:
            rec["status"] = "error:captcha"
            return rec
        rec["status"] = "active"
        m = re.search(r'([\d,.]+)\s*Sales', html, re.I)
        if m:
            rec["sales"] = int(re.sub(r"[^\d]", "", m.group(1)))
        m = re.search(r'aria-label="([\d.]+) out of 5 stars"', html) or \
            re.search(r'"ratingValue"\s*:\s*"?([\d.]+)', html)
        if m:
            rec["rating"] = float(m.group(1))
        m = re.search(r'\(([\d,]+)\)\s*</span>', html) or \
            re.search(r'"reviewCount"\s*:\s*"?([\d,]+)', html)
        if m:
            rec["review_count"] = int(re.sub(r"[^\d]", "", m.group(1)))
        m = re.search(r'([\d,]+)\s+items?</', html, re.I)
        if m:
            rec["listing_count"] = int(re.sub(r"[^\d]", "", m.group(1)))
        rec["on_sale"] = bool(re.search(r'(\d+)% off', html))
    except Exception as e:
        rec["status"] = f"error:{type(e).__name__}"
    return rec

async def main():
    from playwright.async_api import async_playwright
    roster = json.loads(ROSTER.read_text(encoding="utf-8"))["accounts"]
    only = {c.upper() for c in sys.argv[1:]}
    if only:
        roster = [a for a in roster if a["code"].upper() in only]
    print(f"Quét {len(roster)} shop...")
    results = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=False)  # headful giảm captcha
        ctx = await browser.new_context(locale="en-US")
        page = await ctx.new_page()
        for i, acc in enumerate(roster, 1):
            rec = await scrape_shop(page, acc)
            results.append(rec)
            print(f"[{i}/{len(roster)}] {acc['code']} {acc['shop']}: {rec.get('status')} "
                  f"sales={rec.get('sales','-')} rating={rec.get('rating','-')}")
            await page.wait_for_timeout(random.randint(3000, 5500))
        await browser.close()
    # merge: nếu chạy 1 phần, giữ record cũ của shop không quét
    old = {}
    if OUT.exists():
        try:
            for r in json.loads(OUT.read_text(encoding="utf-8")).get("shops", []):
                old[r["code"]] = r
        except Exception:
            pass
    for r in results:
        old[r["code"]] = {**r, "verified_at": date.today().isoformat()}
    payload = {"project": "foxera", "verified_at": date.today().isoformat(),
               "provenance": "live_local_browser", "shops": sorted(old.values(), key=lambda x: x["code"])}
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nĐã ghi {OUT} ({len(old)} shop). Nhớ git add/commit/push.")

if __name__ == "__main__":
    asyncio.run(main())
