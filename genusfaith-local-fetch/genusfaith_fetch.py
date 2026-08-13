#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
genusfaith_fetch.py — PC-side FETCH cho GenusFaith (phụ kiện da devotional Công giáo).
Vai: FETCH (PC quét) · cloud MERGE · GAS/report HIỂN THỊ.
Chạy bằng Task Scheduler 04:00 Bangkok (trước routine cloud 04:30 để cloud đọc số cùng ngày).
Stdlib-only — KHÔNG cần pip install.

Output: ../genusfaith-live-fetch.json (gốc repo) + genusfaith-local-fetch/fetch_log.txt.
KHÔNG đụng file của job khác. KHÔNG `git add -A`.

Trung thực: brand fail → KHÔNG có key trong brands{}, có mục trong errors[].
Không bịa số. Giá không parse được → None.
"""
import json, re, ssl, sys, os, io, time, urllib.request, urllib.error
from collections import Counter
from datetime import datetime, timezone, timedelta

BANGKOK = timezone(timedelta(hours=7))
UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Accept": "application/json,text/plain,*/*",
}
TIMEOUT = 25
SCHEMA_VERSION = "1.0"
OUT_NAME = "genusfaith-live-fetch.json"
NEW_WINDOW_DAYS = 14
MAX_PAGES = 12          # trần an toàn phân trang (250 SP/trang → tối đa 3000 SP/brand)
PAGE_SLEEP = 1.5        # nghỉ giữa 2 trang, đừng đấm liên tục vào shop người ta

# ── TARGETS ─────────────────────────────────────────────────────────────────
# role: "direct"    = đối thủ trực diện (phụ kiện da devotional)
#       "lifestyle" = brand Công giáo lifestyle, đọc để biết bối cảnh giá/định dạng
# known_blocked: brand đã xác nhận CHẶN — vẫn thử, fail thì ghi errors, KHÔNG fail job.
# Trạng thái kiểm chứng tay 05/08/2026 (xem SETUP.md).
TARGETS = {
    "feratia": {
        "id": "feratia",
        "label": "Feratia",
        "url": "https://feratia.com/products.json?limit=250",
        "role": "direct",
        "known_blocked": False,
    },
    "catholight": {
        # root products.json LỖI (05/08/2026) → dùng URL collection, đọc được.
        # => products_total của brand này là của RIÊNG collection, không phải toàn store.
        "id": "catholight",
        "label": "Catholight (collection: ready-to-ship-leather-bag)",
        "url": "https://catholight.com/collections/ready-to-ship-leather-bag/products.json?limit=250",
        "role": "direct",
        "known_blocked": False,
    },
    "blessac": {
        # robots.txt ConnectTimeout 05/08/2026 → known-blocked, giữ trong danh sách để phát hiện khi mở lại.
        "id": "blessac",
        "label": "Blessac",
        "url": "https://blessac.com/products.json?limit=250",
        "role": "direct",
        "known_blocked": False,   # 12/08/2026: doc duoc 403 SP, 2 trang, 0 loi. Chan la o sandbox cloud, khong phai Blessac.
    },
    "afroyla": {
        "id": "afroyla",
        "label": "Afroyla",
        "url": "https://afroyla.com/products.json?limit=250",
        "role": "direct",
        "known_blocked": False,
    },
    "westcoastcatholic": {
        "id": "westcoastcatholic",
        "label": "West Coast Catholic",
        "url": "https://westcoastcatholic.co/products.json?limit=250",
        "role": "lifestyle",
        "known_blocked": False,
    },
    "venxara": {
        # CHƯA TEST tính tới 05/08/2026 — fail thì ghi errors, không fail job.
        "id": "venxara",
        "label": "Venxara",
        "url": "https://venxara.com/products.json?limit=250",
        "role": "lifestyle",
        "known_blocked": False,
    },
    "genusfaith": {
        # CHINH TA. Them 12/08/2026.
        # Suot 22 ngay bot doc 6 doi thu ma chua bao gio doc feed cua chinh minh.
        # role "own" de cloud tach khoi phan doi thu khi so sanh gia.
        # !! Neu domain that KHONG phai genusfaith.com thi sua URL nay.
        "id": "genusfaith",
        "label": "GenusFaith (CHINH TA)",
        "url": "https://genusfaith.com/products.json?limit=250",
        "role": "own",
        "known_blocked": False,
    },
}

# ── TLS: thang 3 bậc (certifi → system → unverified) ────────────────────────
def _build_contexts():
    ctxs = []
    try:
        import certifi  # tuỳ chọn; không có cũng chạy
        ctxs.append(("certifi", ssl.create_default_context(cafile=certifi.where())))
    except Exception:
        pass
    ctxs.append(("system", ssl.create_default_context()))
    ctxs.append(("unverified", ssl._create_unverified_context()))
    return ctxs

_CTXS = _build_contexts()
TLS_USED = {}  # url -> mode


def http_get(url, retries=1):
    """Trả (text, err). Lỗi cert → tụt bậc TLS ngay; lỗi khác → thoát vòng context."""
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
                continue
            except urllib.error.HTTPError as e:
                last = "HTTPError %s: %s" % (e.code, e.reason)
                break
            except urllib.error.URLError as e:
                if isinstance(getattr(e, "reason", None), ssl.SSLCertVerificationError):
                    last = "SSLCertVerificationError(%s): %s" % (mode, e.reason)
                    continue
                last = "%s: %s" % (type(e).__name__, e)
                break
            except Exception as e:
                last = "%s: %s" % (type(e).__name__, e)
                break
        time.sleep(2)
    return None, last


def parse_json_tolerant(text):
    """Parse chuẩn; nếu JSON bị cắt giữa chừng → raw_decode cuộn từng object products[]."""
    try:
        return json.loads(text), True
    except Exception:
        pass
    dec = json.JSONDecoder()
    i = text.find('"products"')
    if i < 0:
        return None, False
    i = text.find('[', i)
    if i < 0:
        return None, False
    out, pos = [], i + 1
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


# ── Phân trang ──────────────────────────────────────────────────────────────
# Shopify products.json phân trang bằng &page=N (250 SP/trang). limit=250 MỘT MÌNH
# chỉ trả trang 1 — Feratia trả 26 SP trong khi /collections/all có 13 trang.
def page_url(url, page):
    return "%s%spage=%d" % (url, "&" if "?" in url else "?", page)


def fetch_all_pages(url):
    """Cuộn page=1,2,... tới khi products[] RỖNG hoặc chạm MAX_PAGES.
    Trả (products, meta, fatal_err). fatal_err chỉ khác None khi TRANG 1 fail.
    Trang 2+ fail → giữ phần đã đọc, ghi vào meta['page_errors'] (đọc thiếu còn hơn mất trắng)."""
    products, seen = [], set()
    meta = {"pages_fetched": 0, "hit_page_cap": False, "truncated": False, "page_errors": []}

    for page in range(1, MAX_PAGES + 1):
        purl = page_url(url, page)
        text, err = http_get(purl)
        if err:
            if page == 1:
                return None, meta, err
            meta["page_errors"].append({"page": page, "url": purl, "error": err})
            break

        data, clean = parse_json_tolerant(text)
        if not data:
            if page == 1:
                return None, meta, "unparseable JSON"
            meta["page_errors"].append({"page": page, "url": purl, "error": "unparseable JSON"})
            break
        if not clean:
            meta["truncated"] = True

        batch = data.get("products") or []
        if not batch:
            break  # hết hàng — điều kiện dừng bình thường (trang rỗng KHÔNG tính vào pages_fetched)
        meta["pages_fetched"] = page

        # Dedupe: vài store phớt lờ &page và trả mãi trang 1. Không trang nào thêm
        # SP mới → dừng, nếu không sẽ nhân bản catalog tới tận trần.
        added = 0
        for p in batch:
            key = p.get("id") or p.get("handle")
            if key in seen:
                continue
            seen.add(key)
            products.append(p)
            added += 1
        if added == 0:
            meta["page_errors"].append({"page": page, "url": purl,
                                        "error": "trang khong them SP moi (store co the phot lo &page) -> dung som"})
            break

        if not clean:
            break  # JSON trang này bị cắt → biên không tin được, đừng sang trang sau
        if page == MAX_PAGES:
            meta["hit_page_cap"] = True
        else:
            time.sleep(PAGE_SLEEP)

    return products, meta, None


# ── Phân loại TRỤC VARIANT ──────────────────────────────────────────────────
# Dữ liệu thật: Feratia/Afroyla dùng variant làm trục CHẤT LIỆU, Catholight dùng trục
# KÍCH THƯỚC ("SMALL"/"MEDIUM") và MỘT SỐ product trộn thêm chất liệu → trục HỖN HỢP.
_SIZE_RE = re.compile(r"^(x?s|small|m|medium|l|large|x?l|compact)$", re.I)
# \bpu\b có ranh giới từ — nếu để "pu" trần thì "Purple"/"Pouch Purple" dính oan.
_MATERIAL_RE = re.compile(r"leather|vegan|grain|canvas|suede|faux|veganique|\bpu\b", re.I)


def classify_variant_axis(titles):
    """-> 'material' | 'size' | 'single' | 'mixed'. Thứ tự luật: size → material → single → mixed."""
    ts = [t.strip() for t in (titles or []) if t and t.strip()]
    if not ts:
        return "single"
    if all(_SIZE_RE.match(t) for t in ts):
        return "size"
    if all(_MATERIAL_RE.search(t) for t in ts):
        return "material"
    if len(ts) == 1 or all(t.lower() == "default title" for t in ts):
        return "single"
    return "mixed"


# ── Helper ──────────────────────────────────────────────────────────────────
def price_float(x):
    """Giá Shopify là string. Cho phép 0.0 hợp lệ (SP free/gift). Không parse được → None."""
    if x in (None, ""):
        return None
    try:
        return float(x)
    except Exception:
        return None


def compare_float(x):
    """compare_at_price: 0 / "0.00" nghĩa là KHÔNG có giá gạch → None."""
    v = price_float(x)
    if v is None or v == 0.0:
        return None
    return v


def parse_dt(s):
    """Parse ISO Shopify ('2026-07-30T10:23:45-05:00'). Hỏng → None."""
    if not s or not isinstance(s, str):
        return None
    t = s.strip().replace("Z", "+00:00")
    try:
        d = datetime.fromisoformat(t)
    except Exception:
        try:
            d = datetime.strptime(t[:19], "%Y-%m-%dT%H:%M:%S")
        except Exception:
            return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return d


def median(nums):
    xs = sorted(nums)
    n = len(xs)
    if n == 0:
        return None
    if n % 2:
        return xs[n // 2]
    return round((xs[n // 2 - 1] + xs[n // 2]) / 2.0, 2)


# ── Trích xuất product ──────────────────────────────────────────────────────
def extract_product(p, now):
    """Trả dict product đã chuẩn hoá + trường phái sinh. Không bịa: thiếu → None."""
    notes = []
    variants = []
    for v in (p.get("variants") or []):
        pr = price_float(v.get("price"))
        if pr is None and v.get("price") not in (None, ""):
            notes.append("price khong parse duoc (co the non-USD/format la): %r" % (v.get("price"),))
        variants.append({
            "title": v.get("title"),
            "price": pr,
            "compare_at_price": compare_float(v.get("compare_at_price")),
            "available": bool(v.get("available")) if v.get("available") is not None else None,
            "sku": v.get("sku"),
        })

    prices = [v["price"] for v in variants if v["price"] is not None]
    compares = [v["compare_at_price"] for v in variants if v["compare_at_price"] is not None]

    total = len(variants)
    avail = sum(1 for v in variants if v["available"] is True)
    oos = sum(1 for v in variants if v["available"] is False)

    if total == 0:
        oos_level = None
    elif avail == 0:
        oos_level = "sold_out"
    elif oos == 0:
        oos_level = "in_stock"
    else:
        oos_level = "partial"

    created = parse_dt(p.get("created_at"))
    age_days = (now - created).days if created else None
    is_new = (age_days is not None and 0 <= age_days <= NEW_WINDOW_DAYS)

    # TRỤC CHẤT LIỆU / SIZE — trường quan trọng nhất:
    # Feratia/Afroyla dùng variant làm trục CHẤT LIỆU ("Premium Vegan Leather" vs "Top-Grain Leather"),
    # Catholight dùng trục SIZE ("SMALL"/"MEDIUM"). Giữ nguyên title, không đoán, không chuẩn hoá.
    material_variants = [v["title"] for v in variants if v["title"]]

    out = {
        "title": p.get("title"),
        "handle": p.get("handle"),
        "product_type": p.get("product_type") or "",
        "created_at": p.get("created_at"),
        "published_at": p.get("published_at"),
        "updated_at": p.get("updated_at"),
        "tags": p.get("tags") or [],
        "variants": variants,
        "price_min": min(prices) if prices else None,
        "price_max": max(prices) if prices else None,
        "compare_at_max": max(compares) if compares else None,
        "variants_total": total,
        "variants_available": avail,
        "variants_oos": oos,
        "oos_level": oos_level,
        "material_variants": material_variants,
        "variant_axis": classify_variant_axis(material_variants),
        "base_variant": material_variants[0] if material_variants else None,  # variant ĐẦU TIÊN = bậc giá hiển thị
        "age_days": age_days,
        "is_new_14d": is_new,
    }
    if not prices:
        notes.append("khong co gia hop le trong variants -> price_min/max = None")
    if created is None:
        notes.append("created_at thieu/khong parse duoc -> age_days = None")
    if notes:
        out["notes"] = notes
    return out


# ── Rollup brand ────────────────────────────────────────────────────────────
def rollup(products, meta=None):
    types = {}
    band_src = {}   # product_type -> [giá variant]
    axis = []
    new14 = []
    sold_out = partial = 0
    axis_kinds = Counter()
    base_titles = Counter()
    base_prices = {}   # title variant đầu -> [giá]

    for pr in products:
        axis_kinds[pr["variant_axis"]] += 1
        if pr["base_variant"]:
            base_titles[pr["base_variant"]] += 1
            v0 = pr["variants"][0]
            if v0["price"] is not None:
                base_prices.setdefault(pr["base_variant"], []).append(v0["price"])
        pt = pr["product_type"] or "(no type)"
        types[pt] = types.get(pt, 0) + 1
        band_src.setdefault(pt, [])
        for v in pr["variants"]:
            if v["price"] is not None:
                band_src[pt].append(v["price"])
            if v["title"] and v["title"] not in axis:
                axis.append(v["title"])
        if pr["oos_level"] == "sold_out":
            sold_out += 1
        elif pr["oos_level"] == "partial":
            partial += 1
        if pr["is_new_14d"]:
            new14.append({"title": pr["title"], "handle": pr["handle"],
                          "created_at": pr["created_at"], "age_days": pr["age_days"]})

    price_bands = {}
    for pt, xs in band_src.items():
        if xs:
            price_bands[pt] = {"min": min(xs), "max": max(xs),
                               "median": median(xs), "n_variants": len(xs)}
        else:
            price_bands[pt] = {"min": None, "max": None, "median": None, "n_variants": 0,
                               "note": "khong co gia hop le"}

    new14.sort(key=lambda x: x.get("created_at") or "", reverse=True)

    # ⚠ base_variant_note — ĐỌC TRƯỚC KHI SO GIÁ.
    # Bậc giá hiển thị của một brand là bậc của variant ĐẦU TIÊN. Ở Feratia variant đầu là
    # "Premium Vegan Leather", ở Catholight là "VEGANIQUE LEATHER" → mọi so sánh giá từ trước
    # tới nay đã đem DA THẬT của GenusFaith so với DA VEGAN của đối thủ. Sai vế.
    n_base = sum(base_titles.values())
    top_base = base_titles.most_common(1)[0] if base_titles else None
    base_note = {
        "counts": dict(base_titles.most_common()),
        "dominant": top_base[0] if top_base else None,
        "dominant_count": top_base[1] if top_base else 0,
        "products_with_variants": n_base,
        "dominant_share": ("%d/%d" % (top_base[1], n_base)) if top_base else None,
        "median_price_by_base_variant": {t: median(xs) for t, xs in sorted(base_prices.items())},
        "WARNING": ("Gia hien thi cua brand = gia VARIANT DAU TIEN, khong phai gia dong cao cap. "
                    "Truoc khi so gia voi GenusFaith (da that), phai kiem tra 'dominant' o day la "
                    "chat lieu gi — neu la vegan/PU thi DANG SO SAI VE. Muon so cung hang, lay "
                    "variant top-grain trong products[].variants thay vi price_min."),
    }
    if top_base and _MATERIAL_RE.search(top_base[0]) and re.search(r"vegan|faux|\bpu\b", top_base[0], re.I):
        base_note["MISMATCH_RISK"] = ("Variant dau tien pho bien nhat la DA VEGAN/PU (%s, %s). "
                                      "price_min cua brand nay KHONG so sanh duoc truc tiep voi da that." %
                                      (top_base[0], base_note["dominant_share"]))

    out = {
        "products_total": len(products),
        "sold_out_count": sold_out,
        "partial_count": partial,
        "new_14d": new14,
        "product_types": dict(sorted(types.items(), key=lambda kv: (-kv[1], kv[0]))),
        "price_bands": price_bands,
        "material_axis": axis,
        "variant_axis_dominant": axis_kinds.most_common(1)[0][0] if axis_kinds else None,
        "variant_axis_breakdown": dict(axis_kinds.most_common()),
        "base_variant_note": base_note,
    }

    if meta:
        out["pages_fetched"] = meta.get("pages_fetched", 0)
        out["hit_page_cap"] = bool(meta.get("hit_page_cap"))
        if out["hit_page_cap"]:
            out["page_cap_note"] = ("catalog co the con nua - products_total la SAN, khong phai tong "
                                    "(cham tran MAX_PAGES=%d)" % MAX_PAGES)
        if meta.get("page_errors"):
            out["page_errors"] = meta["page_errors"]
            out["partial_pages_note"] = ("mot so trang loi giua chung - products_total la SAN, khong phai tong")
    return out


# ── DIFF so với lần chạy trước ──────────────────────────────────────────────
def compute_changes(prev, cur_brands):
    """prev = dict JSON lần trước (hoặc None). Chỉ diff brand có mặt ở CẢ HAI lần
    (brand vắng mặt lần này = fetch fail, không phải 'bị gỡ' → không báo removed)."""
    ch = {"new_products": [], "removed_products": [], "price_changes": [], "stock_flips": []}
    if not prev:
        ch["note"] = "khong co ban truoc (%s) -> chua co diff" % OUT_NAME
        return ch

    prev_brands = (prev.get("brands") or {})
    ch["compared_against"] = prev.get("fetched_at") or prev.get("date")
    compared = []

    for bid, cur in cur_brands.items():
        old = prev_brands.get(bid)
        if not old:
            continue
        compared.append(bid)
        old_map = {p.get("handle"): p for p in (old.get("products") or []) if p.get("handle")}
        cur_map = {p.get("handle"): p for p in (cur.get("products") or []) if p.get("handle")}

        for h, p in cur_map.items():
            if h not in old_map:
                ch["new_products"].append({"brand": bid, "handle": h, "title": p.get("title"),
                                           "created_at": p.get("created_at"),
                                           "price_min": p.get("price_min")})
        for h, p in old_map.items():
            if h not in cur_map:
                ch["removed_products"].append({"brand": bid, "handle": h, "title": p.get("title")})

        for h, p in cur_map.items():
            o = old_map.get(h)
            if not o:
                continue
            a, b = o.get("price_min"), p.get("price_min")
            if a is not None and b is not None and a != b:
                ch["price_changes"].append({"brand": bid, "handle": h, "title": p.get("title"),
                                            "old": a, "new": b, "delta": round(b - a, 2)})
            oa, ob = o.get("oos_level"), p.get("oos_level")
            if oa and ob and oa != ob:
                ch["stock_flips"].append({"brand": bid, "handle": h, "title": p.get("title"),
                                          "old": oa, "new": ob})

    ch["brands_compared"] = compared
    return ch


def main():
    now = datetime.now(BANGKOK)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.abspath(os.path.join(script_dir, ".."))
    dest = os.path.join(repo_root, OUT_NAME)

    # đọc bản trước (để diff) TRƯỚC khi ghi đè
    prev = None
    if os.path.exists(dest):
        try:
            with io.open(dest, "r", encoding="utf-8") as f:
                prev = json.load(f)
        except Exception:
            prev = None

    brands, errors = {}, []

    for bid, t in TARGETS.items():
        raw, meta, err = fetch_all_pages(t["url"])
        if err:
            errors.append({"brand": bid, "label": t["label"], "url": t["url"],
                           "role": t["role"], "known_blocked": t["known_blocked"],
                           "error": err})
            continue
        if not raw:
            errors.append({"brand": bid, "label": t["label"], "url": t["url"],
                           "role": t["role"], "known_blocked": t["known_blocked"],
                           "error": "feed doc duoc nhung products[] rong"})
            continue
        for pe in meta.get("page_errors", []):
            errors.append({"brand": bid, "label": t["label"], "url": pe["url"],
                           "role": t["role"], "known_blocked": t["known_blocked"],
                           "error": "page %d: %s" % (pe["page"], pe["error"]),
                           "partial": True})

        prods = [extract_product(p, now) for p in raw]
        entry = {
            "id": t["id"], "label": t["label"], "url": t["url"], "role": t["role"],
            "known_blocked": t["known_blocked"],
            "truncated": meta["truncated"],
            "read_count": len(prods),
            "tls_mode": TLS_USED.get(page_url(t["url"], 1)),
            "products": prods,
        }
        entry.update(rollup(prods, meta))
        if bid == "catholight":
            entry["scope_note"] = ("URL collection (root products.json loi 05/08/2026) — "
                                   "products_total la cua RIENG collection ready-to-ship-leather-bag, "
                                   "KHONG phai toan store.")
        brands[bid] = entry

    changes = compute_changes(prev, brands)
    tls_warnings = sorted(u for u, m in TLS_USED.items() if m == "unverified")

    out = {
        "schema_version": SCHEMA_VERSION,
        "source": "genusfaith_fetch.py",
        "date": now.strftime("%Y-%m-%d"),
        "fetched_at": now.isoformat(),
        "locale_note": ("US/USD theo market mac dinh cua tung shop (products.json khong tra currency). "
                        "May quet o VN. Gia khong parse duoc -> None + note trong product."),
        "provenance": "live_local_http_feed",
        "brands": brands,
        "changes": changes,
        "errors": errors,
        "tls_warnings": tls_warnings,
    }
    if tls_warnings:
        out["tls_note"] = ("Cac URL nay fetch voi TLS unverified (root store may cu, chua co certifi) — "
                           "du lieu gia cong khai, rui ro thap, nen `pip install certifi` de het canh bao.")

    with io.open(dest, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

    ok = len(brands)
    line = ("%s | brands %d/%d | products %d | pages %d%s | new14d %d | errors %d | "
            "changes new %d / removed %d / price %d / stock %d" % (
        now.isoformat(), ok, len(TARGETS),
        sum(b["products_total"] for b in brands.values()),
        sum(b.get("pages_fetched", 0) for b in brands.values()),
        " CAP!" if any(b.get("hit_page_cap") for b in brands.values()) else "",
        sum(len(b["new_14d"]) for b in brands.values()),
        len(errors),
        len(changes["new_products"]), len(changes["removed_products"]),
        len(changes["price_changes"]), len(changes["stock_flips"])))
    with io.open(os.path.join(script_dir, "fetch_log.txt"), "a", encoding="utf-8") as f:
        f.write(line + "\n")
    print(line)
    for bid, b in brands.items():
        bn = b["base_variant_note"]
        print("  %-18s %3d SP | %d trang%s | truc=%s | variant dau: %s (%s)" % (
            bid, b["products_total"], b.get("pages_fetched", 0),
            " [CHAM TRAN]" if b.get("hit_page_cap") else "",
            b["variant_axis_dominant"], bn["dominant"], bn["dominant_share"]))
        if "MISMATCH_RISK" in bn:
            print("     !! %s" % bn["MISMATCH_RISK"])
    for e in errors:
        print("  ERR %s%s: %s" % (e["brand"], " (known-blocked)" if e["known_blocked"] else "", e["error"]))

    # exit 1 CHI khi 0 brand nao doc duoc -> .bat khong push, cloud carry so cu
    if ok == 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
