#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gerbera_fetch.py — PC-side FETCH cho GerberaPrints market intelligence.
Vai: FETCH (LUẬT 8.5 — chia 3 vai: PC fetch · cloud merge · GAS hiển thị).
Chạy bằng Task Scheduler ~06:45 Bangkok (trước routine cloud 07:15).
Stdlib-only, không cần pip install.

Output: ../gerbera-live-fetch.json (repo root) — routine cloud đọc file này
làm nguồn LIVE thay web_fetch (vốn bị PROVENANCE_REQUIRED trong phiên tự động).

KHÔNG đụng file của job khác. KHÔNG ghi gì ngoài gerbera-live-fetch.json + fetch_log.txt.
"""
import json, ssl, sys, os, io, time, urllib.request, urllib.error
from datetime import datetime, timezone, timedelta

BANGKOK = timezone(timedelta(hours=7))
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}
TIMEOUT = 25
SCHEMA_VERSION = "1.1"

# ── Nguồn quét ──────────────────────────────────────────────────────────────
# feed limit=N: CHỈ để phát hiện drop 48h + sold-out (LUẬT 2 — không dùng làm anchor)
FEEDS = {
    "Bogey Bros":   "https://bogeybros.co/products.json?limit=5",
    "Bad Birdie":   "https://badbirdiegolf.com/products.json?limit=5",
    "Swannies":     "https://swannies.co/products.json?limit=5",
    "Pins & Aces":  "https://pinsandaces.com/products.json?limit=3",   # feed dài, tolerant parse
    "Shank It":     "https://shankitgolf.com/products.json?limit=5",
    "U Suck":       "https://usuckatgolf.com/products.json?limit=5",
}
# collection core: để tính GIÁ ANCHOR = mode của dòng core (LUẬT 2)
ANCHOR_COLLECTIONS = {
    "Bogey Bros": "https://bogeybros.co/collections/shop/products.json?limit=250",
    "Bad Birdie": "https://badbirdiegolf.com/collections/mens-polos/products.json?limit=250",
    "Swannies":   "https://swannies.co/collections/polos/products.json?limit=250",
}
# collections.json: cho B11 (động tĩnh — collection mới/promotion). updated_at bị bump
# khi inventory đổi → cloud áp LUẬT 8.3 (2 lần liên tiếp), PC chỉ ghi raw.
COLLECTIONS = {
    "Bogey Bros":  "https://bogeybros.co/collections.json?limit=250",
    "Bad Birdie":  "https://badbirdiegolf.com/collections.json?limit=250",
    "Swannies":    "https://swannies.co/collections.json?limit=250",
    "Pins & Aces": "https://pinsandaces.com/collections.json?limit=250",
    "Shank It":    "https://shankitgolf.com/collections.json?limit=250",
    "U Suck":      "https://usuckatgolf.com/collections.json?limit=250",
}

# ── TLS contexts: thang 3 bậc (v1.1 — fix "certificate has expired" do root store may cu) ──
# 1) certifi (bo CA Mozilla, luon moi — `pip install certifi`)  2) system store  3) unverified (co canh bao)
def _build_contexts():
    ctxs = []
    try:
        import certifi
        c = ssl.create_default_context(cafile=certifi.where())
        ctxs.append(("certifi", c))
    except Exception:
        pass
    ctxs.append(("system", ssl.create_default_context()))
    u = ssl._create_unverified_context()
    ctxs.append(("unverified", u))
    return ctxs

_CTXS = _build_contexts()
TLS_USED = {}  # url -> mode ("certifi"/"system"/"unverified")

def http_get(url, retries=1):
    last = None
    for _ in range(retries + 1):
        for mode, ctx in _CTXS:
            try:
                req = urllib.request.Request(url, headers=UA)
                with urllib.request.urlopen(req, timeout=TIMEOUT, context=ctx) as r:
                    TLS_USED[url] = mode
                    return r.read().decode("utf-8", errors="replace"), None
            except ssl.SSLCertVerificationError as e:
                last = "SSLCertVerificationError(%s): %s" % (mode, e)
                continue  # thu bac tiep theo ngay, khong sleep
            except urllib.error.URLError as e:
                if isinstance(getattr(e, "reason", None), ssl.SSLCertVerificationError):
                    last = "SSLCertVerificationError(%s): %s" % (mode, e.reason)
                    continue
                last = "%s: %s" % (type(e).__name__, e)
                break  # loi khong phai cert -> khong can doi context
            except Exception as e:
                last = "%s: %s" % (type(e).__name__, e)
                break
        time.sleep(2)
    return None, last

def parse_json_tolerant(text):
    """Parse chuẩn; nếu JSON bị cắt (Pins & Aces) → raw_decode cuộn từng object."""
    try:
        return json.loads(text), True
    except Exception:
        pass
    dec = json.JSONDecoder()
    # tìm mảng products: [...] và cuộn từng object
    i = text.find('"products"')
    if i < 0:
        return None, False
    i = text.find('[', i)
    out = []
    pos = i + 1
    while True:
        while pos < len(text) and text[pos] in ' \r\n\t,':
            pos += 1
        if pos >= len(text) or text[pos] == ']':
            break
        try:
            obj, end = dec.raw_decode(text, pos)
            out.append(obj)
            pos = end
        except Exception:
            break
    return {"products": out, "_truncated": True}, False

def summarize_product(p):
    variants = p.get("variants") or []
    prices = []
    compare = []
    unavailable = []
    for v in variants:
        try:
            prices.append(float(v.get("price") or 0))
        except Exception:
            pass
        cap = v.get("compare_at_price")
        if cap not in (None, "", "0", "0.00"):
            try:
                compare.append(float(cap))
            except Exception:
                pass
        if v.get("available") is False:
            unavailable.append(str(v.get("title") or v.get("id")))
    n = len(variants)
    sold_out_level = None
    if n and len(unavailable) == n:
        sold_out_level = "product"
    elif unavailable:
        sold_out_level = "variant"
    return {
        "title": p.get("title"),
        "product_type": p.get("product_type"),
        "handle": p.get("handle"),
        "created_at": p.get("created_at"),
        "published_at": p.get("published_at"),
        "price_min": min(prices) if prices else None,
        "price_max": max(prices) if prices else None,
        "compare_at_max": max(compare) if compare else None,   # LUẬT 4: cloud tự so compare_at > price
        "variants_total": n,
        "variants_unavailable": unavailable,
        "sold_out_level": sold_out_level,
    }

def mode_price(products, type_hint="polo"):
    """Giá anchor = mode giá của SP khớp type_hint trong collection core (LUẬT 2)."""
    from collections import Counter
    c = Counter()
    for p in products:
        ptype = (p.get("product_type") or "").lower()
        title = (p.get("title") or "").lower()
        if type_hint not in ptype and type_hint not in title:
            continue
        for v in (p.get("variants") or []):
            try:
                c[float(v.get("price"))] += 1
            except Exception:
                pass
    if not c:  # fallback: mọi SP trong collection
        for p in products:
            for v in (p.get("variants") or []):
                try:
                    c[float(v.get("price"))] += 1
                except Exception:
                    pass
    if not c:
        return None, {}
    top = c.most_common()
    dist = {("%.2f" % k): v for k, v in top[:6]}
    return top[0][0], dist

def main():
    now = datetime.now(BANGKOK)
    out = {
        "schema_version": SCHEMA_VERSION,
        "source": "pc-local (gerbera_fetch.py, Task Scheduler)",
        "date": now.strftime("%Y-%m-%d"),
        "fetched_at": now.isoformat(),
        "locale_note": "US/USD (products.json shop default) — máy quét ở VN, giá feed theo market mặc định shop",
        "feeds": {},          # drop 48h + sold-out (LUẬT 2: không dùng làm anchor)
        "anchors": {},        # mode price dòng core (LUẬT 2: đây mới là anchor)
        "collections": {},    # cho B11 — cloud áp LUẬT 8.3 trước khi tin updated_at
        "errors": [],
        "tls_warnings": [],   # URL nào phải dùng unverified → cloud biết mức tin cậy
    }

    for brand, url in FEEDS.items():
        text, err = http_get(url)
        if err:
            out["errors"].append({"brand": brand, "url": url, "error": err})
            continue
        data, clean = parse_json_tolerant(text)
        if not data:
            out["errors"].append({"brand": brand, "url": url, "error": "unparseable JSON"})
            continue
        prods = data.get("products", [])
        out["feeds"][brand] = {
            "url": url,
            "truncated": not clean,
            "read_count": len(prods),
            "products": [summarize_product(p) for p in prods],
        }

    for brand, url in ANCHOR_COLLECTIONS.items():
        text, err = http_get(url)
        if err:
            out["errors"].append({"brand": brand, "url": url, "error": err})
            continue
        data, clean = parse_json_tolerant(text)
        prods = (data or {}).get("products", [])
        price, dist = mode_price(prods, "polo")
        out["anchors"][brand] = {
            "url": url,
            "sku_count": len(prods),
            "mode_price": price,
            "price_distribution": dist,
            "price_src": "core/collection products.json limit=250 (mode)",
        }

    for brand, url in COLLECTIONS.items():
        text, err = http_get(url)
        if err:
            out["errors"].append({"brand": brand, "url": url, "error": err})
            continue
        data, clean = parse_json_tolerant(text)
        cols = (data or {}).get("collections", [])
        out["collections"][brand] = [
            {
                "title": c.get("title"),
                "handle": c.get("handle"),
                "updated_at": c.get("updated_at"),
                "published_at": c.get("published_at"),
                "products_count": c.get("products_count"),
            }
            for c in cols
        ]

    out["tls_warnings"] = sorted(u for u, m in TLS_USED.items() if m == "unverified")
    if out["tls_warnings"]:
        out["tls_note"] = "Cac URL nay fetch voi TLS unverified (root store may cu, chua co certifi) — du lieu gia cong khai, rui ro thap, nhung nen `pip install certifi` de het canh bao."

    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    dest = os.path.join(repo_root, "gerbera-live-fetch.json")
    with io.open(dest, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

    ok_feeds = len(out["feeds"]); ok_anchor = len(out["anchors"]); ok_cols = len(out["collections"])
    line = "%s | feeds %d/%d | anchors %d/%d | collections %d/%d | errors %d" % (
        now.isoformat(), ok_feeds, len(FEEDS), ok_anchor, len(ANCHOR_COLLECTIONS),
        ok_cols, len(COLLECTIONS), len(out["errors"]))
    with io.open(os.path.join(os.path.dirname(__file__), "fetch_log.txt"), "a", encoding="utf-8") as f:
        f.write(line + "\n")
    print(line)
    # exit 0 kể cả khi có lỗi lẻ — carry là việc của cloud; chỉ fail khi KHÔNG fetch được gì
    if ok_feeds == 0 and ok_anchor == 0 and ok_cols == 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
