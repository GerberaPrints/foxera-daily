#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LOCAL-VERIFY v1 — luồng DESKTOP (chạy trên máy bạn, KHÔNG chạy được trên cloud)
================================================================================
Vì sao cần: cloud bị chặn WebFetch Etsy/Amazon vĩnh viễn (PROVENANCE_REQUIRED),
nên số (listing rv) / giá THẬT chỉ lấy được từ browser thật trên máy bạn.

Việc script làm (deterministic, không cần LLM):
  1. Đọc <project>-daily.json trong repo → tự nhặt mọi URL listing Etsy
     (khối B8 radar + các khối khác), tối đa MAX_LISTINGS cái.
  2. Mở từng listing bằng Playwright (Chromium THẬT, không headless) →
     parse JSON-LD của Etsy: ratingCount (= listing reviews), price, title.
  3. Ghi local-verify/<project>-live.json  {verified_at, listings:[...]}
  4. git commit + push → sáng hôm sau run CLOUD đọc file này và nâng anchor
     từ tầng "snippet" lên tầng "LIVE", reset anchor_age về 0.

Cài 1 lần (Windows/Mac/Linux):
    pip install playwright
    python -m playwright install chromium
Chạy tay:      python local-verify/verify_listings.py foxera
Chạy hết:      python local-verify/verify_listings.py all
Lên lịch:      Windows Task Scheduler / cron — CN hằng tuần 09:00, lệnh:
               cd <repo> && git pull && python local-verify/verify_listings.py all && git push
"""

import json, re, sys, time, random, subprocess, pathlib, datetime

REPO = pathlib.Path(__file__).resolve().parent.parent
MAX_LISTINGS = 12          # trần số listing mỗi project mỗi lần chạy
DELAY_RANGE = (4, 9)       # giây nghỉ ngẫu nhiên giữa 2 listing (lịch sự với Etsy)

PROJECTS = {
    "foxera":     "foxera-daily.json",
    "genusfaith": "genusfaith-daily.json",
    "gritfell":   "gritfell-daily.json",
    "gerbera":    "gerbera-market.json",
    "foxjob":     "foxera-job.json",
}

def extract_listing_urls(daily_path: pathlib.Path):
    """Nhặt URL listing Etsy từ toàn bộ blocks của daily.json (ưu tiên B8 trước)."""
    d = json.loads(daily_path.read_text(encoding="utf-8"))
    order = sorted(d.get("blocks", {}).keys(),
                   key=lambda k: (k != "B8", int(re.sub(r"\D", "", k) or 0)))  # B8 lên đầu
    seen, urls = set(), []
    for k in order:
        for msg in d["blocks"][k]:
            for m in re.finditer(r"https://www\.etsy\.com/listing/(\d+)[^\s\"'<]*", msg):
                lid = m.group(1)
                if lid not in seen:
                    seen.add(lid)
                    urls.append((lid, f"https://www.etsy.com/listing/{lid}"))
    return urls[:MAX_LISTINGS]

def parse_jsonld(html: str):
    """Etsy nhúng JSON-LD: aggregateRating.ratingCount = LISTING reviews (đúng nhãn), offers.price."""
    out = {}
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        try:
            data = json.loads(m.group(1))
        except Exception:
            continue
        items = data if isinstance(data, list) else [data]
        for it in items:
            if not isinstance(it, dict):
                continue
            if it.get("@type") == "Product":
                out["title"] = (it.get("name") or "")[:120]
                ar = it.get("aggregateRating") or {}
                if ar.get("ratingCount"):
                    out["reviews_listing"] = int(ar["ratingCount"])   # nhãn: (listing rv)
                off = it.get("offers") or {}
                if isinstance(off, dict):
                    p = off.get("price") or off.get("lowPrice")
                    if p: out["price"] = float(p)
                    out["currency"] = off.get("priceCurrency", "")
    return out

def verify_project(name: str, browser):
    daily = REPO / PROJECTS[name]
    if not daily.exists():
        print(f"[{name}] bỏ qua — không thấy {daily.name}"); return None
    urls = extract_listing_urls(daily)
    if not urls:
        print(f"[{name}] không có URL listing nào trong daily.json"); return None
    print(f"[{name}] verify {len(urls)} listing…")
    page = browser.new_page(locale="en-US")   # LOCALE: US (kỷ luật #1)
    results = []
    for lid, url in urls:
        row = {"listing_id": lid, "url": url}
        try:
            page.goto(url, timeout=45000, wait_until="domcontentloaded")
            time.sleep(2)
            html = page.content()
            if "captcha" in html.lower() and "listing" not in page.url:
                row["status"] = "captcha"      # ghi thật, KHÔNG bịa số
            else:
                info = parse_jsonld(html)
                if info.get("reviews_listing") is not None or info.get("price"):
                    row.update(info); row["status"] = "live"
                else:
                    row["status"] = "parsed_empty"  # trang mở được nhưng không thấy JSON-LD
        except Exception as e:
            row["status"] = f"error:{type(e).__name__}"
        results.append(row)
        print("   ", lid, row.get("status"), row.get("reviews_listing", "-"), row.get("price", "-"))
        time.sleep(random.uniform(*DELAY_RANGE))
    page.close()
    out = {
        "project": name,
        "verified_at": datetime.date.today().isoformat(),
        "locale": "US/USD",
        "provenance": "live_local_browser",       # tầng (a) theo kỷ luật #10
        "listings": results,
        "live_count": sum(1 for r in results if r["status"] == "live"),
    }
    out_path = REPO / "local-verify" / f"{name}-live.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[{name}] ghi {out_path.name}: {out['live_count']}/{len(results)} live")
    return out_path

def main():
    target = (sys.argv[1] if len(sys.argv) > 1 else "all").lower()
    names = list(PROJECTS) if target == "all" else [target]
    from playwright.sync_api import sync_playwright
    written = []
    with sync_playwright() as p:
        # headless=False: Etsy chặn headless — cần cửa sổ browser thật (điểm CHỈ desktop làm được)
        browser = p.chromium.launch(headless=False)
        for n in names:
            try:
                w = verify_project(n, browser)
                if w: written.append(w)
            except Exception as e:
                print(f"[{n}] FAIL: {e}")
        browser.close()
    if written:
        subprocess.run(["git", "-C", str(REPO), "add", "local-verify"], check=False)
        subprocess.run(["git", "-C", str(REPO), "commit", "-m",
                        f"local-verify {datetime.date.today().isoformat()}: "
                        + ", ".join(w.stem for w in written)], check=False)
        print("Đã commit. Chạy `git push` (hoặc để task tự push) để cloud đọc được sáng mai.")

if __name__ == "__main__":
    main()
