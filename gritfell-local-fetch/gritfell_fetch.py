#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gritfell_fetch.py — PC-side FETCH cho GritFell market intelligence.  v2 (17/08/2026)
Vai (LUAT 8.5 — chia 3 vai): PC = FETCH · Cloud 05:30 = MERGE · GAS = HIEN THI.

VI SAO CAN: phien cloud bi proxy chan khi mo store doi thu (403 Forbidden),
nen nhanh cloud dem SKU sai va khong verify duoc gia. May ban KHONG bi chan.

=== v2 SUA GI (sau khi v1 chay ra feeds 1/13, policies 0/5, errors 17) ===
 1. IN BANG CHAN DOAN ra man hinh — tung brand, loi gi, ma HTTP bao nhieu.
    v1 chi ghi loi vao JSON nen khong biet hong vi dau.
 2. HEADER GIONG TRINH DUYET THAT (Accept / Accept-Language / Accept-Encoding).
    Nhieu store dung Cloudflare, tu choi UA tran.
 3. Tu giai nen GZIP (di kem Accept-Encoding).
 4. THU LAI 2 lan, cach nhau 2s va 5s.
 5. PHAN LOAI LOI ro rang: 403 chan bot · 404 sai URL · DNS · SSL · timeout.
 6. Neu loi SSL: thu lai 1 lan khong verify CHI DE CHAN DOAN (khong dung du lieu),
    de biet co phai loi certificate tren may hay khong.

Chay bang Task Scheduler ~04:30 Bangkok (truoc routine cloud 05:30).
Stdlib-only, KHONG can pip install.

Output: ../gritfell-live-fetch.json (goc repo) + fetch_log.txt
KHONG dung file cua job khac (Etsy / Gerbera / GenusFaith).
"""
import json, ssl, sys, os, time, gzip, io, socket, re
import urllib.request, urllib.error
from datetime import datetime, timezone, timedelta

BANGKOK = timezone(timedelta(hours=7))
TIMEOUT = 15
SCHEMA_VERSION = "2.2"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(HERE, "..", "gritfell-live-fetch.json")
LOG  = os.path.join(HERE, "fetch_log.txt")

# Header gia lap trinh duyet that — quan trong voi store dung Cloudflare
HDRS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"),
    "Accept": "application/json, text/html, application/xhtml+xml, */*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Cache-Control": "no-cache",
    "Connection": "close",
}

# ── (TUY CHON) Ghi THANG vao Google Drive -> nhanh Desktop thanh du phong THAT ──
# Can cai "Google Drive for desktop". Cai xong, mo File Explorer tim folder
# "GritFell - Daily Handoff", copy duong dan, dan vao day (giu chu r o dau).
# Vi du:  DRIVE_DIR = r"G:\My Drive\GritFell\GritFell - Daily Handoff"
# De rong "" thi bo qua buoc nay — script van chay, chi push GitHub nhu cu.
DRIVE_DIR = ""

# ── Store doi thu (Shopify products.json). limit=5 = phat hien DROP 48h + sold-out ──
FEEDS = {
    "GritFell":        "https://gritfell.com/products.json?limit=250",   # cua minh -> dem SKU CHINH XAC
    "Duck Camp":       "https://duckcamp.com/products.json?limit=5",
    "Marsh Wear":      "https://marshwearclothing.com/products.json?limit=5",
    "Tom Beckbe":      "https://tombeckbe.com/products.json?limit=5",
    "Howler Brothers": "https://howlerbros.com/products.json?limit=5",
    "AFTCO":           "https://aftco.com/products.json?limit=5",
    "Drake Waterfowl": "https://drakewaterfowl.com/products.json?limit=5",
    "Free Fly":        "https://freeflyapparel.com/products.json?limit=5",
    "BURLEBO":         "https://burlebo.com/products.json?limit=5",
    "DECOY Apparel":   "https://decoyapparelco.com/products.json?limit=5",
    "Hunthide":        "https://hunthide.com/products.json?limit=5",
    "Huntdad":         "https://huntdad.com/products.json?limit=5",
    "Terrabound":      "https://terraboundoutdoor.com/products.json?limit=5",
}

# Trang chinh sach -> cham F-SCORE (cloud KHONG mo duoc)
POLICIES = {
    "GritFell":  ["https://gritfell.com/policies/shipping-policy",
                  "https://gritfell.com/policies/refund-policy"],
    "Duck Camp": ["https://duckcamp.com/policies/refund-policy"],
    "Hunthide":  ["https://hunthide.com/policies/shipping-policy"],
    "Huntdad":   ["https://huntdad.com/policies/shipping-policy"],
}

# Shopify KHONG bat buoc dat chinh sach o /policies/. Nhieu shop dung /pages/.
# 404 o duong dan chinh -> thu lan luot cac duong duoi day tren CUNG ten mien.
POLICY_FALLBACKS = {
    "shipping": ["/policies/shipping-policy", "/pages/shipping-policy", "/pages/shipping",
                 "/pages/shipping-returns", "/pages/shipping-and-returns",
                 "/pages/shipping-info", "/pages/faq"],
    "refund":   ["/policies/refund-policy", "/pages/refund-policy", "/pages/returns",
                 "/pages/return-policy", "/pages/returns-exchanges",
                 "/pages/shipping-returns", "/pages/faq"],
}

def policy_kind(url):
    u = url.lower()
    if "refund" in u or "return" in u:
        return "refund"
    return "shipping"

def fetch_policy(url):
    """Thu duong dan chinh; 404 thi thu cac duong thay the tren cung domain.
    Tra ve (text, url_thuc_te)."""
    from urllib.parse import urlsplit
    p = urlsplit(url)
    base = f"{p.scheme}://{p.netloc}"
    tried, first_err = [], None
    for path in [p.path] + [x for x in POLICY_FALLBACKS[policy_kind(url)] if x != p.path]:
        u = base + path
        if u in tried:
            continue
        tried.append(u)
        try:
            return fetch(u)[0], u
        except Exception as e:
            if first_err is None:
                first_err = e
            code, _ = classify(e)
            if code != "HTTP 404":     # loi khac 404 -> khong phai van de duong dan
                raise
            time.sleep(0.6)
    raise first_err


POLICY_HINTS = ["business day", "business days", "made to order", "print on demand",
                "free return", "satisfaction guarantee", "defective", "restocking",
                "return address", "exchange"]


# ─────────────────────────── TANG MANG ───────────────────────────

# CA SOURCE — quan trong.
# Python tren Windows dung KHO CHUNG CHI CUA WINDOWS (khong phai certifi).
# May cu / Windows Server tat auto-update root -> thieu root moi (vd ISRG Root X1
# cua Let's Encrypt, ma phan lon store Shopify dang dung) -> SSL fail hang loat.
# Cach sua dung: bao Python dung thang bo CA cua Mozilla qua goi `certifi`.
_CA_SRC = "kho he thong Windows"
def _ctx():
    global _CA_SRC
    try:
        import certifi
        _CA_SRC = "certifi " + getattr(certifi, "__version__", "")
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        return ssl.create_default_context()

_HAS_CERTIFI = None
def has_certifi():
    global _HAS_CERTIFI
    if _HAS_CERTIFI is None:
        try:
            import certifi  # noqa: F401
            _HAS_CERTIFI = True
        except Exception:
            _HAS_CERTIFI = False
    return _HAS_CERTIFI


def _read(resp):
    """Doc body, tu giai nen gzip/deflate."""
    raw = resp.read()
    enc = (resp.headers.get("Content-Encoding") or "").lower()
    if "gzip" in enc:
        raw = gzip.decompress(raw)
    elif "deflate" in enc:
        import zlib
        try:
            raw = zlib.decompress(raw)
        except zlib.error:
            raw = zlib.decompress(raw, -zlib.MAX_WBITS)
    charset = resp.headers.get_content_charset() or "utf-8"
    return raw.decode(charset, errors="replace")


def classify(e):
    """Doi exception thanh (ma_ngan, mo_ta_de_hieu)."""
    if isinstance(e, urllib.error.HTTPError):
        code = e.code
        why = {403: "chan bot (Cloudflare/WAF)",
               404: "sai URL hoac khong phai Shopify",
               401: "can dang nhap",
               406: "tu choi Accept header",
               429: "bi rate-limit",
               503: "Cloudflare challenge"}.get(code, "")
        return f"HTTP {code}", why
    if isinstance(e, urllib.error.URLError):
        r = e.reason
        s = str(r)
        if isinstance(r, ssl.SSLError) or "CERTIFICATE_VERIFY_FAILED" in s or "SSL" in s.upper():
            return "SSL", "loi chung chi / TLS tren may"
        if isinstance(r, socket.timeout) or "timed out" in s.lower():
            return "TIMEOUT", f"qua {TIMEOUT}s khong tra loi"
        if "getaddrinfo" in s or "Name or service" in s or "known" in s:
            return "DNS", "khong phan giai duoc ten mien"
        if "Tunnel connection failed" in s or "proxy" in s.lower():
            return "PROXY", "bi proxy/VPN chan"
        if "refused" in s.lower():
            return "REFUSED", "server tu choi ket noi"
        return "URLERR", s[:70]
    if isinstance(e, socket.timeout):
        return "TIMEOUT", f"qua {TIMEOUT}s khong tra loi"
    return type(e).__name__.upper()[:12], str(e)[:70]


def fetch(url, tries=2):
    """Tra ve (text, note). Loi thi raise exception cuoi cung."""
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=HDRS)
            with urllib.request.urlopen(req, timeout=TIMEOUT, context=_ctx()) as r:
                return _read(r), ""
        except Exception as e:
            last = e
            code, _ = classify(e)
            # CHI thu lai voi loi TAM THOI. 403/404/DNS/SSL thu lai cung vay -> bo ngay.
            # (quan trong: 18 request x 3 lan thu x timeout se lam task chay hang chuc phut)
            if code not in ("TIMEOUT", "HTTP 429", "HTTP 503", "REFUSED"):
                break
            if i < tries - 1:
                time.sleep([2, 4][i])
    # CHAN DOAN: neu la loi SSL, thu 1 lan khong verify — CHI de biet nguyen nhan,
    # KHONG dung du lieu lay duoc theo duong nay.
    code, _ = classify(last)
    if code == "SSL":
        try:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            req = urllib.request.Request(url, headers=HDRS)
            with urllib.request.urlopen(req, timeout=TIMEOUT, context=ctx) as r:
                _read(r)
            raise RuntimeError("SSL_BUT_INSECURE_OK")   # -> loi certificate tren may
        except RuntimeError:
            raise
        except Exception:
            pass
    raise last


def parse_feed(txt):
    d = json.loads(txt)
    prods = d.get("products", []) or []
    out = []
    for p in prods[:250]:
        variants = p.get("variants", []) or []
        prices = []
        for v in variants:
            try:
                prices.append(float(v.get("price") or 0))
            except (TypeError, ValueError):
                pass
        unavail = sum(1 for v in variants if not v.get("available", True))
        out.append({
            "title": p.get("title"), "handle": p.get("handle"),
            "type": p.get("product_type"),
            "created_at": p.get("created_at"), "published_at": p.get("published_at"),
            "price_min": min(prices) if prices else None,
            "price_max": max(prices) if prices else None,
            "variants_total": len(variants), "variants_unavailable": unavail,
            "sold_out_level": ("HIGH" if variants and unavail / len(variants) >= 0.5
                               else "MED" if variants and unavail / len(variants) >= 0.33
                               else "LOW"),
        })
    return {"count_returned": len(out), "products": out}


def scrape_policy(txt):
    plain = re.sub(r"<script.*?</script>|<style.*?</style>", " ", txt, flags=re.S | re.I)
    plain = re.sub(r"<[^>]+>", " ", plain)
    plain = re.sub(r"\s+", " ", plain)
    hits = []
    for sent in re.split(r"(?<=[.!?])\s+", plain):
        s = sent.strip()
        if 20 < len(s) < 400 and any(k in s.lower() for k in POLICY_HINTS):
            hits.append(s)
        if len(hits) >= 25:
            break
    return hits


# ─────────────────────────── GHI DRIVE ───────────────────────────

def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def write_drive_block(res, now):
    if not os.path.isdir(DRIVE_DIR):
        raise RuntimeError(f"khong thay folder Drive: {DRIVE_DIR}")
    feeds = res["feeds"]
    gf = feeds.get("GritFell", {})
    rows = [f"{esc(b)[:18]:<18} {v['count_returned']:>3} sp"
            for b, v in sorted(feeds.items()) if b != "GritFell"]
    err_brands = sorted({e["brand"] for e in res["errors"] if e.get("kind") == "feed"})
    body = (
        f"🖥️ <b>KHỐI 2 — ĐẾM THẬT TỪ MÁY</b> — {now.strftime('%d/%m %H:%M')}\n"
        f"<i>Nhánh Desktop. Cloud bị proxy chặn nên KHÔNG đếm được — đây là số đếm thật, "
        f"không phải suy luận.</i>\n\n"
        f"<b>GritFell (của mình):</b> <b>{gf.get('count_returned', 0)}</b> SKU đang published\n\n"
        f"<b>Đối thủ — số SP trả về trên feed:</b>\n<code>{esc(chr(10).join(rows))}</code>\n")
    if err_brands:
        body += f"\n⚠️ Không lấy được: {esc(', '.join(err_brands))}\n"
    pol = res.get("policies", {})
    if pol:
        body += (f"\n<b>Trang chính sách đã lấy nguyên văn:</b> "
                 f"{esc(', '.join(sorted(pol)))} → cloud tự chấm F-score.\n")
    body += ("📌 <b>CẦN CHÚ Ý:</b>\n"
             f"• Số SKU GritFell = <b>{gf.get('count_returned', 0)}</b>. Lệch với số cloud báo "
             "thì <b>tin số này</b> — cloud không mở được store.\n"
             f"• Feed lấy được {len(feeds)}/{len(FEEDS)} brand"
             + (f", thiếu {len(err_brands)}" if err_brands else "") + ".\n"
             "👉 <b>Chốt:</b> Nhánh Desktop sống, số đếm hôm nay là số thật.\n"
             f"🔗 <b>Nguồn:</b> products.json từng brand, quét từ máy lúc "
             f"{now.strftime('%H:%M %d/%m')}.")
    out = {"date": now.strftime("%Y-%m-%d"), "locale": "US/USD",
           "producer": "DESKTOP", "blocks": {"B2": [body[:3900]]}}
    with open(os.path.join(DRIVE_DIR,
              f"gritfell-daily-desktop-{now.strftime('%Y-%m-%d')}.json"),
              "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    ok_f = len(feeds)
    with open(os.path.join(DRIVE_DIR,
              f"heartbeat-desktop-{now.strftime('%Y-%m-%d')}.txt"),
              "w", encoding="utf-8") as f:
        f.write(f"GRITFELL DESKTOP HEARTBEAT — {now.isoformat()}\n"
                f"STATUS TONG: {'OK' if ok_f else 'FAIL'}\n"
                f"feeds {ok_f}/{len(FEEDS)} | errors {len(res['errors'])}\n")


# ─────────────────────────── MAIN ───────────────────────────

def main():
    now = datetime.now(BANGKOK)
    res = {"schema_version": SCHEMA_VERSION, "producer": "DESKTOP",
           "date": now.strftime("%Y-%m-%d"), "fetched_at": now.isoformat(),
           "feeds": {}, "policies": {}, "errors": []}
    report, ok_f, ok_p, ssl_hint = [], 0, 0, False

    print("=" * 62)
    print(f"GRITFELL PC FETCH v{SCHEMA_VERSION} — {now.strftime('%d/%m/%Y %H:%M')}")
    _ctx()   # xac dinh nguon CA truoc khi in
    print(f"CA SOURCE: {_CA_SRC}" + ("" if has_certifi()
          else "   <-- NEN CAI: python -m pip install certifi"))
    print("=" * 62)
    print(f"{'BRAND':<18} {'KET QUA':<12} GHI CHU")
    print("-" * 62)

    for brand, url in FEEDS.items():
        try:
            txt, _ = fetch(url)
            res["feeds"][brand] = parse_feed(txt)
            ok_f += 1
            n = res["feeds"][brand]["count_returned"]
            print(f"{brand:<18} {'OK':<12} {n} sp")
            report.append((brand, "OK", f"{n} sp"))
        except Exception as e:
            if str(e) == "SSL_BUT_INSECURE_OK":
                code, why = "SSL-CERT", "khong verify thi OK -> loi cert tren MAY"
                ssl_hint = True
            else:
                code, why = classify(e)
            res["errors"].append({"kind": "feed", "brand": brand, "url": url,
                                  "code": code, "err": why or str(e)[:150]})
            print(f"{brand:<18} {code:<12} {why}")
            report.append((brand, code, why))
        time.sleep(1.2)

    print("-" * 62)
    for brand, urls in POLICIES.items():
        got = {}
        for u in urls:
            tag = f"{brand}/{u.rsplit('/', 1)[-1]}"
            try:
                txt, real = fetch_policy(u)
                got[real] = scrape_policy(txt)
                ok_p += 1
                note = f"{len(got[real])} cau"
                if real != u:
                    note += f"  (dung {real.split(chr(47), 3)[-1]})"
                print(f"{tag[:18]:<18} {'OK':<12} {note}")
            except Exception as e:
                if str(e) == "SSL_BUT_INSECURE_OK":
                    code, why = "SSL-CERT", "loi cert tren MAY"
                    ssl_hint = True
                else:
                    code, why = classify(e)
                res["errors"].append({"kind": "policy", "brand": brand, "url": u,
                                      "code": code, "err": why or str(e)[:150]})
                extra = " (da thu ca /pages/...)" if code == "HTTP 404" else ""
                print(f"{tag[:18]:<18} {code:<12} {why}{extra}")
            time.sleep(1.2)
        if got:
            res["policies"][brand] = got

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)

    if DRIVE_DIR:
        try:
            write_drive_block(res, now)
            print(f"\n[DRIVE] OK -> {DRIVE_DIR}")
        except Exception as e:
            res["errors"].append({"kind": "drive", "err": str(e)[:200]})
            print(f"\n[DRIVE] FAIL: {e}")

    n_pol = sum(len(v) for v in POLICIES.values())
    line = (f"{now.isoformat()} | feeds {ok_f}/{len(FEEDS)} | "
            f"policies {ok_p}/{n_pol} | errors {len(res['errors'])}")
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")

    print("=" * 62)
    print(line)

    # ── Goi y sua, dua tren dang loi pho bien nhat ──
    codes = [e.get("code", "") for e in res["errors"]]
    if codes:
        top = max(set(codes), key=codes.count)
        print("-" * 62)
        print(f"LOI PHO BIEN NHAT: {top} ({codes.count(top)}/{len(codes)} request)")
        tip = {
            "SSL-CERT": ("Kho chung chi goc cua WINDOWS thieu root moi (thuong la ISRG Root X1\n"
                         "  cua Let's Encrypt — phan lon store Shopify dung root nay).\n"
                         "  SUA:  python -m pip install certifi     roi chay lai script.\n"
                         "  (Script se tu dung bo CA cua Mozilla thay kho Windows.)"
                         if not has_certifi() else
                         "Da co certifi ma van loi SSL => nhieu kha nang phan mem diet virus\n"
                         "  hoac firewall dang CHAN GIUA HTTPS (Kaspersky/Bitdefender/ESET:\n"
                         "  tinh nang 'Encrypted connection scanning'). Tat tinh nang do roi thu lai."),
            "SSL":      "Loi TLS. Thuong do phan mem diet virus/firewall chan giua HTTPS.\n"
                        "  Thu:  python -m pip install certifi   roi chay lai.",
            "PROXY":    "May dang di qua proxy/VPN. Tat VPN roi chay lai.",
            "HTTP 403": "Store chan bot. Bao lai cho tro ly de doi cach lay du lieu brand do.",
            "DNS":      "Khong phan giai duoc ten mien. Kiem DNS may (thu doi sang 8.8.8.8).",
            "TIMEOUT":  "Mang cham hoac bi chan ngam. Thu lai luc khac.",
            "HTTP 404": "URL sai hoac store khong dung Shopify. Bao lai cho tro ly de sua danh sach.",
        }.get(top, "Gui nguyen bang tren cho tro ly de chan doan.")
        print("HUONG SUA: " + tip)
        if ssl_hint:
            print("\n*** QUAN TRONG: co request bao 'khong verify thi OK'.")
            print("    => Loi nam o KHO CHUNG CHI TREN MAY, khong phai o cac store.")
            if not has_certifi():
                print("    Chua cai certifi. Chay 2 lenh nay roi thu lai:")
                print("        python -m pip install certifi")
                print("        python gritfell-local-fetch\\gritfell_fetch.py")
            else:
                print("    Da co certifi ma van loi => kiem phan mem diet virus dang quet HTTPS.")

    if ok_f == 0:
        print("\n[gritfell_fetch] FAIL toan bo - khong push")
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
