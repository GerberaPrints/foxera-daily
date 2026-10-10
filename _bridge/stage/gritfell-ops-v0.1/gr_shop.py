#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
gr_shop.py — SHOPIFY ADMIN API cho GritFell, chay TU MAY bang token rieng.   v0.1.0 (10/10/2026)
Dat tai D:\GritFell. Chay bang GR-*.bat.

    py -3.11 gr_shop.py --kiem        xac nhan store = bdaheu-zf (SAI STORE -> SystemExit, khong lam gi them)
    py -3.11 gr_shop.py --quet        quet toan bo san pham+variant -> gr-catalog.json + gr-sku-counter.json
    py -3.11 gr_shop.py --audit       soat listing: vendor, alt text, trung title, body trung, tag nguoc lane
    py -3.11 gr_shop.py --don [30]    don theo SKU N ngay -> gr-orders-<ngay>.json (can read_orders)
    py -3.11 gr_shop.py --tu-kiem     tu kiem bang du lieu gia, khong goi mang

VI SAO CO FILE NAY: connector Shopify trong chat tro sai store 24 ngay (Kinmireva/GenusFaith), mot phien
tu dong nao cung khong doc/ghi duoc GritFell. GerberaPrints giai quyet bang token rieng tren may — lam y het.

LUAT:
 - Token nam o D:\GritFell\.keys\shopify_token.txt (hoac bien moi truong GR_SHOPIFY_TOKEN). KHONG o repo.
 - Moi lenh deu kiem identity store TRUOC (shop.myshopifyDomain == bdaheu-zf.myshopify.com). Sai -> dung.
 - v0.1 CHI DOC. Khong co mutation nao trong file nay.
 - Khong lay duoc -> bao loi ro, khong ghi file rong (S4/S6). Ghi file: .tmp roi os.replace.
 - Bo dem SKU = max THAT tren store theo tung series, khong phai hang so (vu 25/08 Kinmireva).
Stdlib-only. Python 3.8+.
"""
import io, json, os, re, sys, time, hashlib, collections
import urllib.request, urllib.error
from datetime import datetime, timezone, timedelta

VER = "0.1.0"
TZ = timezone(timedelta(hours=7))
HOME = os.path.dirname(os.path.abspath(__file__))
SHOP = "bdaheu-zf.myshopify.com"
API = "2025-07"
TOKEN_FILE = os.path.join(HOME, ".keys", "shopify_token.txt")
CATALOG = os.path.join(HOME, "gr-catalog.json")
COUNTER = os.path.join(HOME, "gr-sku-counter.json")
RE_SKU = re.compile(r"^([A-Z]{2})-([A-Z])(\d{4})$")       # TS-C0040 -> (TS, C, 0040)
VENDOR_DUNG = "Gritfell"

for _s in (sys.stdout, sys.stderr):
    try: _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception: pass


def now():
    return datetime.now(TZ).strftime("%Y-%m-%dT%H:%M:%S%z")


def ghi_json(path, obj):
    tmp = path + ".tmp"
    with io.open(tmp, "w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)
    with io.open(path, encoding="utf-8") as f:
        json.load(f)                                     # S7: cho may parse lai


def token():
    t = os.environ.get("GR_SHOPIFY_TOKEN", "").strip()
    if not t and os.path.isfile(TOKEN_FILE):
        with io.open(TOKEN_FILE, encoding="utf-8-sig") as f:
            t = f.read().strip()
    if not t:
        raise SystemExit("THIEU TOKEN: tao %s (1 dong shpat_...) hoac bien GR_SHOPIFY_TOKEN. "
                         "Custom app can scope: read_products, read_orders (them write_products o v0.2)." % TOKEN_FILE)
    if not t.startswith("shpat_"):
        raise SystemExit("TOKEN khong dung dang shpat_... (doc tu %s)" % TOKEN_FILE)
    return t


def gql(query, variables=None, _tok=None):
    """POST GraphQL. 429 -> doi Retry-After roi thu lai 1 lan. Loi khac -> raise."""
    tok = _tok or token()
    url = "https://%s/admin/api/%s/graphql.json" % (SHOP, API)
    body = json.dumps({"query": query, "variables": variables or {}}).encode("utf-8")
    for lan in range(2):
        req = urllib.request.Request(url, data=body, method="POST", headers={
            "Content-Type": "application/json", "X-Shopify-Access-Token": tok,
            "User-Agent": "GritFell-gr_shop/%s" % VER})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                d = json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429 and lan == 0:
                time.sleep(float(e.headers.get("Retry-After", "2")) + 0.5); continue
            raise SystemExit("HTTP %d tu Shopify: %s" % (e.code, e.read()[:300]))
        if d.get("errors"):
            raise SystemExit("GraphQL errors: %s" % json.dumps(d["errors"])[:500])
        return d["data"]
    raise SystemExit("Shopify 429 hai lan lien tiep")


def kiem_identity(_tok=None):
    d = gql("{ shop { name myshopifyDomain currencyCode ianaTimezone } }", _tok=_tok)["shop"]
    if d["myshopifyDomain"] != SHOP:
        raise SystemExit("SAI STORE: token tro %s (%s), can %s. KHONG LAM GI THEM." % (d["myshopifyDomain"], d["name"], SHOP))
    return d


# ────────────────────────── QUET ──────────────────────────
Q_PRODUCTS = """
query($after: String) {
  products(first: 100, after: $after, sortKey: CREATED_AT) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id title handle status vendor productType tags createdAt publishedAt updatedAt
      descriptionHtml
      options { name values }
      featuredImage { altText }
      images(first: 20) { nodes { altText } }
      variants(first: 100) { nodes { sku price title } }
      metafields(first: 10, namespace: "gritfell") { nodes { key value } }
    }
  }
}"""


def quet(_tok=None):
    kiem_identity(_tok)
    prods, after = [], None
    while True:
        d = gql(Q_PRODUCTS, {"after": after}, _tok=_tok)["products"]
        prods += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        after = d["pageInfo"]["endCursor"]
    return prods


def phan_tich(prods):
    """Bo dem theo series + audit. Thuan tuy, test duoc khong can mang."""
    counter = collections.defaultdict(int)          # "TS-C" -> max so
    skus = set(); sai_dang = []
    for p in prods:
        for v in p["variants"]["nodes"]:
            s = (v.get("sku") or "").strip()
            if not s: continue
            skus.add(s)
            m = RE_SKU.match(s)
            if not m:
                sai_dang.append((p["title"], s)); continue
            key = "%s-%s" % (m.group(1), m.group(2))
            counter[key] = max(counter[key], int(m.group(3)))
    titles = collections.Counter(p["title"] for p in prods)
    trung_title = sorted(t for t, c in titles.items() if c > 1)
    body = collections.defaultdict(list)
    for p in prods:
        h = hashlib.sha256((p.get("descriptionHtml") or "").strip().encode("utf-8")).hexdigest()[:10]
        body[h].append(p["title"])
    body_trung = {h: v for h, v in body.items() if len(v) > 1}
    vendor_sai = [p["title"] for p in prods if (p.get("vendor") or "") != VENDOR_DUNG]
    alt_thieu = [p["title"] for p in prods if any(not (i.get("altText") or "").strip() for i in p["images"]["nodes"])]
    khong_sku = [p["title"] for p in prods if not any((v.get("sku") or "").strip() for v in p["variants"]["nodes"])]
    camo = [p["title"] for p in prods if "camo" in p["title"].lower()]
    mf_thieu = [p["title"] for p in prods if not any(m["key"] == "design_code" for m in p["metafields"]["nodes"])]
    return {
        "so_sp": len(prods), "so_sku": len(skus),
        "bo_dem_theo_series": dict(sorted(counter.items())),
        "sku_sai_dang": sai_dang[:50],
        "trung_title": trung_title,
        "body_trung": {h: v for h, v in list(body_trung.items())[:20]},
        "vendor_khac_%s" % VENDOR_DUNG: {"so": len(vendor_sai), "vi_du": vendor_sai[:10]},
        "alt_text_thieu": {"so": len(alt_thieu), "vi_du": alt_thieu[:10]},
        "khong_sku": {"so": len(khong_sku), "vi_du": khong_sku[:10]},
        "ten_co_camo": {"so": len(camo), "vi_du": camo[:20]},
        "thieu_metafield_design_code": {"so": len(mf_thieu)},
        "theo_type": dict(collections.Counter(p["productType"] for p in prods)),
        "theo_status": dict(collections.Counter(p["status"] for p in prods)),
    }


def lenh_quet():
    prods = quet()
    ghi_json(CATALOG, {"shop": SHOP, "quet_luc": now(), "so_sp": len(prods), "products": prods})
    pt = phan_tich(prods)
    ghi_json(COUNTER, {"shop": SHOP, "quet_luc": now(), "nguon": "max(sku) that tren store, moi series",
                       "series": pt["bo_dem_theo_series"], "so_sku": pt["so_sku"]})
    print("[gr_shop] quet %d SP, %d SKU -> %s" % (len(prods), pt["so_sku"], CATALOG))
    print("[gr_shop] bo dem series:", json.dumps(pt["bo_dem_theo_series"]))
    return 0


def lenh_audit():
    if not os.path.isfile(CATALOG):
        raise SystemExit("CHUA CO gr-catalog.json — chay --quet truoc.")
    with io.open(CATALOG, encoding="utf-8") as f:
        c = json.load(f)
    pt = phan_tich(c["products"])
    out = os.path.join(HOME, "gr-audit-%s.json" % datetime.now(TZ).strftime("%Y-%m-%d"))
    ghi_json(out, {"shop": SHOP, "catalog_quet_luc": c["quet_luc"], "audit_luc": now(), "ket_qua": pt})
    print(json.dumps({k: v for k, v in pt.items() if k not in ("body_trung",)}, ensure_ascii=False, indent=1))
    print("[gr_shop] audit ->", out)
    return 0


# ────────────────────────── DON HANG ──────────────────────────
Q_ORDERS = """
query($after: String, $q: String) {
  orders(first: 100, after: $after, query: $q, sortKey: CREATED_AT, reverse: true) {
    pageInfo { hasNextPage endCursor }
    nodes {
      name createdAt displayFinancialStatus displayFulfillmentStatus
      currentTotalPriceSet { shopMoney { amount } }
      lineItems(first: 50) { nodes { sku title quantity originalUnitPriceSet { shopMoney { amount } } } }
    }
  }
}"""


def lenh_don(ngay=30):
    kiem_identity()
    since = (datetime.now(TZ) - timedelta(days=int(ngay))).strftime("%Y-%m-%d")
    q = "created_at:>=%s" % since
    orders, after = [], None
    while True:
        d = gql(Q_ORDERS, {"after": after, "q": q})["orders"]
        orders += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]: break
        after = d["pageInfo"]["endCursor"]
    theo_sku = collections.defaultdict(lambda: {"don": 0, "sl": 0, "doanh_thu": 0.0, "title": ""})
    for o in orders:
        for li in o["lineItems"]["nodes"]:
            k = li.get("sku") or ("(khong-sku) " + li["title"])
            t = theo_sku[k]; t["don"] += 1; t["sl"] += li["quantity"]; t["title"] = li["title"]
            t["doanh_thu"] += float(li["originalUnitPriceSet"]["shopMoney"]["amount"]) * li["quantity"]
    theo_series = collections.defaultdict(lambda: {"don": 0, "sl": 0})
    for k, v in theo_sku.items():
        m = RE_SKU.match(k)
        s = "%s-%s" % (m.group(1), m.group(2)) if m else "khac"
        theo_series[s]["don"] += v["don"]; theo_series[s]["sl"] += v["sl"]
    out = os.path.join(HOME, "gr-orders-%s.json" % datetime.now(TZ).strftime("%Y-%m-%d"))
    rep = {"shop": SHOP, "cua_so_ngay": int(ngay), "tu_ngay": since, "doc_luc": now(),
           "so_don": len(orders), "theo_series": dict(theo_series),
           "theo_sku": dict(sorted(theo_sku.items(), key=lambda kv: -kv[1]["sl"])),
           "ghi_chu": "doanh_thu = gia goc x so luong, chua tru giam gia/hoan. Cua so >60 ngay can scope read_all_orders."}
    ghi_json(out, rep)
    print("[gr_shop] %d don trong %d ngay -> %s" % (len(orders), int(ngay), out))
    print("[gr_shop] theo series:", json.dumps(dict(theo_series)))
    return 0


# ────────────────────────── TU KIEM ──────────────────────────
def tu_kiem():
    fails = []
    def ck(n, c, info=""):
        print("  %s %s %s" % ("PASS" if c else "FAIL", n, info))
        if not c: fails.append(n)
    P = lambda t, skus, vendor="Gritfell", alt="x", body="b", mf=True: {
        "title": t, "handle": t.lower().replace(" ", "-"), "status": "ACTIVE", "vendor": vendor,
        "productType": "T-Shirt", "tags": ["hunting"], "descriptionHtml": body,
        "images": {"nodes": [{"altText": alt}]}, "variants": {"nodes": [{"sku": s, "price": "29.00"} for s in skus]},
        "metafields": {"nodes": [{"key": "design_code", "value": "C0001"}] if mf else []}}
    prods = [P("Whitetail Pursuit T-shirt", ["TS-C0033", "TS-C0033"]), P("First Cast New Year T-shirt", ["TS-C0040"], vendor="New Arrival", alt=None),
             P("Wave Sun Hoodie", ["LH-A0025"], body="b2"), P("First Run Marker T-shirt", ["TS-C0005"]), P("First Run Marker T-shirt", ["TS-C0015"], mf=False),
             P("Camo Thing", ["XYZ"], body="b2")]
    pt = phan_tich(prods)
    ck("bo dem TS-C = 40", pt["bo_dem_theo_series"].get("TS-C") == 40, str(pt["bo_dem_theo_series"]))
    ck("bo dem LH-A = 25", pt["bo_dem_theo_series"].get("LH-A") == 25)
    ck("sku sai dang bat XYZ", pt["sku_sai_dang"] == [("Camo Thing", "XYZ")])
    ck("trung title First Run Marker", pt["trung_title"] == ["First Run Marker T-shirt"])
    ck("vendor khac Gritfell = 1", pt["vendor_khac_Gritfell"]["so"] == 1)
    ck("alt thieu = 1", pt["alt_text_thieu"]["so"] == 1)
    ck("body trung: nhom 'b' 4 SP, 'b2' 2 SP", sorted(len(v) for v in pt["body_trung"].values()) == [2, 4])
    ck("ten co camo = 1", pt["ten_co_camo"]["so"] == 1)
    ck("thieu metafield = 1", pt["thieu_metafield_design_code"]["so"] == 1)
    ck("RE_SKU chap nhan TS-C0040, tu choi TSC0040", bool(RE_SKU.match("TS-C0040")) and not RE_SKU.match("TSC0040"))
    print("===== gr_shop v%s tu-kiem: PASS %d/%d — %s =====" % (VER, 10 - len(fails), 10, "SACH" if not fails else "TRUOT " + ",".join(fails)))
    return 1 if fails else 0


def main(argv):
    if "--tu-kiem" in argv: return tu_kiem()
    if "--kiem" in argv:
        d = kiem_identity(); print("[gr_shop] OK store:", json.dumps(d)); return 0
    if "--quet" in argv: return lenh_quet()
    if "--audit" in argv: return lenh_audit()
    if "--don" in argv:
        i = argv.index("--don"); n = argv[i + 1] if i + 1 < len(argv) and argv[i + 1].isdigit() else "30"
        return lenh_don(n)
    print(__doc__); return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
