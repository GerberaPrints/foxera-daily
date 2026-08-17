#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
pcfetch.py — BO MAY FETCH DUNG CHUNG cho moi du an FoxEra.   v1.0 (17/08/2026)

    python _pcfetch\\pcfetch.py <ten_du_an>

Doc cau hinh tu  _pcfetch/projects/<ten_du_an>.json  roi:
  1. quet products.json cua cac shop Shopify        -> <ten>-live-fetch.json
  2. doc trang chinh sach (co danh sach duong du phong)
  3. quet social: Reddit / YouTube / Google Suggest / Google Trends
                                                     -> <ten>-social-fetch.json
Khong sua file cua du an khac. Chi ghi 2 file dau ra cua chinh no + log rieng.

=== VI SAO GOP THANH MOT FILE DUNG CHUNG ===
Truoc do moi du an co mot ban sao script rieng (gritfell_fetch.py,
genusfaith_fetch.py, gerbera_fetch.py). Sua mot loi phai sua 3 cho, va thuc te
la 2 cho bi bo quen -> Gerbera chet 5 ngay khong ai biet. Mot bo may + nhieu
file cau hinh thi sua mot lan an ca he thong.

=== BA NGUYEN TAC (dung tu 14/08, da tra gia de co) ===
 1. PC chi LAY DU LIEU THO. Khong ket luan, khong cham diem. Cloud doc roi moi
    dien giai theo P_SCORE_V2 / DEMAND_SENSOR_MAP.
 2. IN BANG CHAN DOAN. Nguon nao hong, hong vi gi, hien ngay ra man hinh.
    Task Scheduler chi cho ma 0x1 vo nghia.
 3. CAM BAO CAO GIA. Nguon lay khong duoc thi ghi vao "errors" trong JSON.
    "Khong lay duoc" != "khong co du lieu"  (luat SOURCE_FAILURE_NOT_ABSENCE).

Stdlib-only. Python 3.8+.
"""
import json, ssl, sys, os, time, gzip, re
import urllib.request, urllib.error
from datetime import datetime, timezone, timedelta

VERSION = "1.0"
TZ = timezone(timedelta(hours=7))          # gio may (Bangkok/Hanoi)
TIMEOUT = 15

HERE = os.path.dirname(os.path.abspath(__file__))     # <repo>/_pcfetch
ROOT = os.path.dirname(HERE)                          # <repo>   <- tu suy ra, KHONG hardcode
LOGDIR = os.path.join(HERE, "logs")

UA_WEB = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "close",
}
UA_APP = {"User-Agent": "FoxEra-MarketResearch/1.0 (market research)",
          "Accept": "application/json", "Accept-Encoding": "gzip, deflate"}

# Shopify KHONG bat buoc dat chinh sach o /policies/. 404 o duong chinh ->
# thu lan luot cac duong duoi tren CUNG ten mien. (Hunthide dung /pages/.)
POLICY_FALLBACKS = {
    "shipping": ["/policies/shipping-policy", "/pages/shipping-policy", "/pages/shipping",
                 "/pages/shipping-returns", "/pages/shipping-and-returns",
                 "/pages/shipping-info", "/pages/faq"],
    "refund":   ["/policies/refund-policy", "/pages/refund-policy", "/pages/returns",
                 "/pages/return-policy", "/pages/returns-exchanges",
                 "/pages/shipping-returns", "/pages/faq"],
}

# ── SSL: dung bo CA cua Mozilla. urllib tren Windows dung kho chung chi he thong
#    va bo do THIEU nhieu CA trung gian -> 16/17 domain fail hom 17/08. certifi
#    phai duoc truyen VAO tay, cai dat khong thoi la vo dung.
_CA_SRC = "kho he thong Windows"
def _ctx():
    global _CA_SRC
    try:
        import certifi
        _CA_SRC = "certifi " + getattr(certifi, "__version__", "")
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        return ssl.create_default_context()


def _read(resp):
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
    return raw.decode(resp.headers.get_content_charset() or "utf-8", errors="replace")


def classify(e):
    """Doi exception thanh (ma_ngan, giai_thich_tieng_viet) de in ra bang."""
    if isinstance(e, urllib.error.HTTPError):
        why = {401: "can dang nhap", 403: "chan bot", 404: "khong ton tai",
               429: "bi rate-limit (cham lai)", 500: "loi phia server",
               503: "server tu choi tam thoi"}.get(e.code, "")
        return "HTTP %d" % e.code, why
    if isinstance(e, urllib.error.URLError):
        s = str(e.reason)
        if "SSL" in s.upper() or "CERTIFICATE" in s.upper():
            return "SSL", "loi chung chi tren may"
        if "timed out" in s.lower():
            return "TIMEOUT", "qua %ds" % TIMEOUT
        if "getaddrinfo" in s or "known" in s:
            return "DNS", "khong phan giai duoc ten mien"
        if "Tunnel" in s or "proxy" in s.lower():
            return "PROXY", "bi proxy/VPN chan"
        return "URLERR", s[:60]
    return type(e).__name__.upper()[:12], str(e)[:60]


def fetch(url, hdrs=None, tries=2, pause=4):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=hdrs or UA_WEB)
            with urllib.request.urlopen(req, timeout=TIMEOUT, context=_ctx()) as r:
                return _read(r)
        except Exception as e:
            last = e
            code, _ = classify(e)
            if code not in ("TIMEOUT", "HTTP 429", "HTTP 503"):
                break
            if i < tries - 1:
                time.sleep(pause)
    raise last


# ══════════════════════════ NGUON 1: SHOPIFY FEED ══════════════════════════

def get_feed(url):
    d = json.loads(fetch(url))
    prods = d.get("products") or []
    out = []
    for p in prods:
        v = (p.get("variants") or [{}])[0]
        out.append({"title": p.get("title"), "handle": p.get("handle"),
                    "type": p.get("product_type"), "tags": p.get("tags"),
                    "price": v.get("price"), "published_at": p.get("published_at")})
    return out


# ══════════════════════════ NGUON 2: TRANG CHINH SACH ══════════════════════

def policy_kind(url):
    u = url.lower()
    return "refund" if ("refund" in u or "return" in u) else "shipping"


def get_policy(url):
    """Tra ve (cau_van, ghi_chu). Thu duong chinh roi den cac duong du phong."""
    from urllib.parse import urlsplit
    parts = urlsplit(url)
    base = parts.scheme + "://" + parts.netloc
    kind = policy_kind(url)
    tries = [parts.path] + [p for p in POLICY_FALLBACKS[kind] if p != parts.path]
    last = None
    for i, path in enumerate(tries):
        try:
            html = fetch(base + path, tries=1)
            txt = re.sub(r"<script.*?</script>|<style.*?</style>", " ", html, flags=re.S | re.I)
            txt = re.sub(r"<[^>]+>", " ", txt)
            txt = re.sub(r"&(nbsp|amp|lt|gt|quot|#39);", " ", txt)
            txt = re.sub(r"\s+", " ", txt).strip()
            keys = ("business day", "ship", "return", "refund", "process", "deliver",
                    "exchange", "restocking", "days")
            sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", txt)
                     if 20 < len(s) < 300 and any(k in s.lower() for k in keys)]
            if sents:
                note = "" if i == 0 else "(dung %s)" % path.strip("/")
                return sents[:8], note
            last = RuntimeError("trang tai duoc nhung khong co cau nao dang ke")
        except Exception as e:
            last = e
            time.sleep(0.3)
    raise last


# ══════════════════════════ NGUON 3: REDDIT ════════════════════════════════
# Reddit chan khach vang lai theo NHIP, va tra 403 lan 429 lan lon nhau.
# Bang chung 17/08: cung mot duong, r/waterfowl OK con r/duckhunting 403,
# chay lai 30 phut sau thi nguoc lai. -> Khong duoc coi 403 la "chan vinh vien".
_TOKEN = {"v": None, "tried": False}
_BEST = {"route": None}


def _reddit_token():
    """OAuth neu co REDDIT_CLIENT_ID/SECRET. Day la duong DUY NHAT on dinh.
    Dang ky: reddit.com/prefs/apps -> create app -> loai 'script'."""
    if _TOKEN["tried"]:
        return _TOKEN["v"]
    _TOKEN["tried"] = True
    cid = os.environ.get("REDDIT_CLIENT_ID", "").strip()
    sec = os.environ.get("REDDIT_CLIENT_SECRET", "").strip()
    if not cid or not sec:
        return None
    import base64
    from urllib.parse import urlencode
    auth = base64.b64encode(("%s:%s" % (cid, sec)).encode()).decode()
    req = urllib.request.Request(
        "https://www.reddit.com/api/v1/access_token",
        data=urlencode({"grant_type": "client_credentials"}).encode(),
        headers={"Authorization": "Basic " + auth, "User-Agent": UA_APP["User-Agent"],
                 "Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=_ctx()) as r:
            _TOKEN["v"] = json.loads(_read(r)).get("access_token")
    except Exception:
        _TOKEN["v"] = None
    return _TOKEN["v"]


def _posts_from_json(d):
    out = []
    for c in (d.get("data", {}).get("children") or []):
        p = c.get("data", {})
        if p.get("stickied"):
            continue
        out.append({"title": p.get("title"), "score": p.get("score"),
                    "num_comments": p.get("num_comments"), "flair": p.get("link_flair_text"),
                    "created_utc": p.get("created_utc"),
                    "permalink": "https://reddit.com" + (p.get("permalink") or ""),
                    "selftext_head": (p.get("selftext") or "")[:400]})
    return out


_ENT = {"amp": "&", "lt": "<", "gt": ">", "quot": '"', "#39": "'"}


def _posts_from_rss(xml):
    """RSS KHONG co score/num_comments -> de None, TUYET DOI khong dat 0.
    0 se bi doc thanh 'bai nay khong ai quan tam' — sai hoan toan."""
    out = []
    for e in re.findall(r"<entry>(.*?)</entry>", xml, re.S):
        t = re.search(r"<title>(.*?)</title>", e, re.S)
        if not t:
            continue
        l = re.search(r'<link[^>]*href="([^"]+)"', e)
        title = re.sub(r"&(amp|lt|gt|quot|#39);", lambda m: _ENT[m.group(1)], t.group(1).strip())
        out.append({"title": title, "score": None, "num_comments": None, "flair": None,
                    "created_utc": None, "permalink": l.group(1) if l else None,
                    "selftext_head": ""})
    return out


def _reddit_routes(sub, sort, limit):
    r = []
    tok = _reddit_token()
    if tok:
        r.append(("R0-oauth", "https://oauth.reddit.com/r/%s/%s?t=week&limit=%d" % (sub, sort, limit),
                  {"Authorization": "bearer " + tok, "User-Agent": UA_APP["User-Agent"]}, "json"))
    r += [
        # RSS dau tien: 17/08 day la duong duy nhat con song khi khong co OAuth.
        ("R2-rss", "https://www.reddit.com/r/%s/%s/.rss?t=week&limit=%d" % (sub, sort, limit), UA_WEB, "rss"),
        ("R1-old", "https://old.reddit.com/r/%s/%s.json?t=week&limit=%d" % (sub, sort, limit), UA_WEB, "json"),
        ("R3-api", "https://api.reddit.com/r/%s/%s?t=week&limit=%d" % (sub, sort, limit), UA_WEB, "json"),
    ]
    if _BEST["route"]:
        r.sort(key=lambda x: 0 if x[0] == _BEST["route"] else 1)
    return r


def get_reddit(sub, limit=15):
    """Tra ve (posts, ten_duong). Thu top-tuan truoc, rong thi thu hot.

    Sub it nguoi (vd r/gundogs) co the KHONG co bai nao trong top-tuan —
    do la 'sub tram', khong phai loi. Roi xuong 'hot' de van lay duoc tin hieu.
    """
    last = None
    for sort in ("top", "hot"):
        # 3 vong: thu ngay, lui 20s, lui 45s. Rate-limit cua Reddit tinh theo phut.
        for attempt, backoff in enumerate((0, 20, 45)):
            if backoff:
                time.sleep(backoff)
            for name, url, hdrs, kind in _reddit_routes(sub, sort, limit):
                try:
                    body = fetch(url, hdrs, tries=1)
                    posts = _posts_from_json(json.loads(body)) if kind == "json" else _posts_from_rss(body)
                    if posts:
                        _BEST["route"] = name
                        return posts, name + ("" if sort == "top" else "/hot")
                    last = RuntimeError("0 bai o %s" % sort)
                except Exception as e:
                    last = e
                    if isinstance(e, urllib.error.HTTPError) and e.code == 404:
                        raise                      # sub khong ton tai — lui vo ich
                time.sleep(0.8)
                if attempt > 0:
                    break                          # vong lui: chi thu duong tot nhat
            if isinstance(last, RuntimeError):
                break                              # rong that -> chuyen sang 'hot'
    raise last if last else RuntimeError("khong co duong nao")


# ══════════════════════════ NGUON 4: YOUTUBE / SUGGEST / TRENDS ════════════

def get_youtube(handle, limit=10):
    page = fetch("https://www.youtube.com/@%s" % handle)
    m = re.search(r'"(?:channelId|externalId)":"(UC[\w-]{22})"', page)
    if not m:
        raise RuntimeError("khong tim thay channelId trong trang kenh")
    cid = m.group(1)
    xml = fetch("https://www.youtube.com/feeds/videos.xml?channel_id=%s" % cid)
    vids = []
    for e in re.findall(r"<entry>(.*?)</entry>", xml, re.S)[:limit]:
        t = re.search(r"<title>(.*?)</title>", e, re.S)
        p = re.search(r"<published>(.*?)</published>", e, re.S)
        v = re.search(r"<yt:videoId>(.*?)</yt:videoId>", e, re.S)
        vids.append({"title": (t.group(1) if t else "").strip(),
                     "published": (p.group(1) if p else "").strip(),
                     "url": "https://youtu.be/" + v.group(1) if v else None})
    return vids, cid


def get_suggest(seed, gl="us"):
    from urllib.parse import quote_plus
    d = json.loads(fetch("https://suggestqueries.google.com/complete/search"
                         "?client=firefox&hl=en&gl=%s&q=%s" % (gl, quote_plus(seed))))
    return d[1] if isinstance(d, list) and len(d) > 1 else []


def get_trends(geo="US"):
    xml = fetch("https://trends.google.com/trending/rss?geo=%s" % geo)
    return [t.strip() for t in re.findall(r"<title>(.*?)</title>", xml, re.S)][1:31]


# ══════════════════════════ IN BANG ════════════════════════════════════════

def row(name, verdict, note=""):
    print("%-26s %-12s %s" % (str(name)[:26], str(verdict)[:12], note))


def rule(ch="-"):
    print(ch * 64)


# ══════════════════════════ CHAY ═══════════════════════════════════════════

def load_cfg(project):
    p = os.path.join(HERE, "projects", project + ".json")
    if not os.path.exists(p):
        have = sorted(f[:-5] for f in os.listdir(os.path.join(HERE, "projects"))
                      if f.endswith(".json") and not f.startswith("_"))
        print("KHONG co cau hinh cho du an '%s'." % project)
        print("Dang co: %s" % (", ".join(have) or "(chua co cai nao)"))
        print("Tao moi: chep _pcfetch\\projects\\_TEMPLATE.json thanh <ten>.json roi sua.")
        sys.exit(2)
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def run_live(cfg, now):
    res = {"schema_version": VERSION, "producer": "DESKTOP", "project": cfg["project"],
           "date": now.strftime("%Y-%m-%d"), "fetched_at": now.isoformat(),
           "feeds": {}, "policies": {}, "errors": []}
    feeds = cfg.get("feeds") or {}
    pols = cfg.get("policies") or {}
    ok_f = ok_p = 0
    tot_p = sum(len(v) for v in pols.values())

    rule("="); print("%s PC FETCH v%s — %s" % (cfg["project"].upper(), VERSION,
                                               now.strftime("%d/%m/%Y %H:%M")))
    _ctx(); print("CA SOURCE: %s" % _CA_SRC); rule("=")
    row("BRAND", "KET QUA", "GHI CHU"); rule()

    for brand, url in feeds.items():
        try:
            prods = get_feed(url)
            res["feeds"][brand] = {"count_returned": len(prods), "products": prods}
            ok_f += 1
            row(brand, "OK", "%d sp" % len(prods))
        except Exception as e:
            code, why = classify(e)
            res["errors"].append({"kind": "feed", "brand": brand, "code": code,
                                  "err": why or str(e)[:120]})
            row(brand, code, why)
        time.sleep(0.4)

    if pols:
        rule()
        for brand, urls in pols.items():
            for u in urls:
                label = "%s/%s" % (brand, u.rstrip("/").rsplit("/", 1)[-1])
                try:
                    sents, note = get_policy(u)
                    res["policies"].setdefault(brand, {})[u] = sents
                    ok_p += 1
                    row(label, "OK", "%d cau %s" % (len(sents), note))
                except Exception as e:
                    code, why = classify(e)
                    res["errors"].append({"kind": "policy", "brand": brand, "url": u,
                                          "code": code, "err": why or str(e)[:120]})
                    row(label, code, why)
                time.sleep(0.4)

    out = os.path.join(ROOT, cfg["out_live"])
    with open(out, "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)
    line = ("%s | feeds %d/%d | policies %d/%d | errors %d"
            % (now.isoformat(), ok_f, len(feeds), ok_p, tot_p, len(res["errors"])))
    rule("="); print(line)
    return line, ok_f, len(feeds), res["errors"]


def run_social(cfg, now):
    s = cfg.get("social") or {}
    if not s.get("enabled"):
        return None, []
    subs = s.get("subs") or {}
    yts = s.get("youtube") or []
    seeds = s.get("suggest_seeds") or []
    geo = s.get("trends_geo") or "US"

    res = {"schema_version": VERSION, "producer": "DESKTOP", "project": cfg["project"],
           "date": now.strftime("%Y-%m-%d"), "fetched_at": now.isoformat(),
           "reddit": {}, "youtube": {}, "suggest": {}, "trends": [], "errors": []}
    ok = {"reddit": 0, "youtube": 0, "suggest": 0, "trends": 0}
    seen, order = set(), []
    for niche, lst in subs.items():
        for sub in lst:
            if sub not in seen:
                seen.add(sub); order.append((niche, sub))

    print(); rule("=")
    print("%s SOCIAL FETCH v%s — %s" % (cfg["project"].upper(), VERSION,
                                        now.strftime("%d/%m/%Y %H:%M")))
    rule("="); row("NGUON", "KET QUA", "GHI CHU"); rule()

    for niche, sub in order:
        try:
            posts, route = get_reddit(sub)
            res["reddit"][sub] = {"sub_niche": niche, "route": route, "posts": posts}
            ok["reddit"] += 1
            row("r/" + sub, "OK " + route.split("/")[0], "%d bai%s"
                % (len(posts), " (hot)" if "/hot" in route else ""))
        except Exception as e:
            code, why = classify(e)
            res["errors"].append({"kind": "reddit", "sub": sub, "code": code,
                                  "err": why or str(e)[:120]})
            row("r/" + sub, code, why or str(e)[:40])
        time.sleep(4.0)          # Reddit chan theo nhip -> di cham

    if yts:
        rule()
    for h in yts:
        try:
            vids, cid = get_youtube(h)
            res["youtube"][h] = {"channel_id": cid, "videos": vids}
            ok["youtube"] += 1
            row("@" + h, "OK", "%d video" % len(vids))
        except Exception as e:
            code, why = classify(e)
            if isinstance(e, RuntimeError):
                code, why = "NO-CHANNEL", "handle sai hoac kenh doi ten"
            res["errors"].append({"kind": "youtube", "handle": h, "code": code,
                                  "err": why or str(e)[:120]})
            row("@" + h, code, why)
        time.sleep(1.2)

    if seeds:
        rule()
    for sd in seeds:
        try:
            sug = get_suggest(sd)
            res["suggest"][sd] = sug
            ok["suggest"] += 1
            row(sd, "OK", "%d goi y" % len(sug))
        except Exception as e:
            code, why = classify(e)
            res["errors"].append({"kind": "suggest", "seed": sd, "code": code,
                                  "err": why or str(e)[:120]})
            row(sd, code, why)
        time.sleep(0.8)

    rule()
    try:
        res["trends"] = get_trends(geo)
        ok["trends"] = 1
        row("Google Trends " + geo, "OK", "%d tu khoa" % len(res["trends"]))
    except Exception as e:
        code, why = classify(e)
        res["errors"].append({"kind": "trends", "code": code, "err": why or str(e)[:120]})
        row("Google Trends " + geo, code, why)

    out = os.path.join(ROOT, cfg["out_social"])
    with open(out, "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)
    line = ("%s | reddit %d/%d | youtube %d/%d | suggest %d/%d | trends %d/1 | errors %d"
            % (now.isoformat(), ok["reddit"], len(order), ok["youtube"], len(yts),
               ok["suggest"], len(seeds), ok["trends"], len(res["errors"])))
    rule("="); print(line)
    return line, res["errors"]


HINTS = {
    "SSL": "python -m pip install certifi   roi chay lai.",
    "PROXY": "Tat VPN roi chay lai.",
    "DNS": "Kiem DNS may (thu 8.8.8.8).",
    "HTTP 429": ("Reddit chan vi goi qua nhanh. Cach dut diem la dang ky app:\n"
                 "  reddit.com/prefs/apps -> create app -> loai 'script'\n"
                 "  setx REDDIT_CLIENT_ID xxxx\n  setx REDDIT_CLIENT_SECRET yyyy\n"
                 "  dong Command Prompt, mo lai, chay lai -> bang ra 'OK R0-oauth'"),
    "HTTP 403": ("Reddit chan ca 4 duong cong khai. Lam giong muc HTTP 429:\n"
                 "  dang ky app o reddit.com/prefs/apps roi setx 2 bien moi truong."),
    "NO-CHANNEL": "Kenh YouTube doi handle. Mo youtube.com/@<handle> kiem roi sua config.",
    "HTTP 404": "Duong dan sai hoac shop da doi. Kiem lai trong file cau hinh.",
}


def main():
    if len(sys.argv) < 2:
        print("Dung:  python _pcfetch\\pcfetch.py <ten_du_an>")
        sys.exit(2)
    project = sys.argv[1].strip().lower()
    cfg = load_cfg(project)
    cfg.setdefault("project", project)
    cfg.setdefault("out_live", project + "-live-fetch.json")
    cfg.setdefault("out_social", project + "-social-fetch.json")
    os.makedirs(LOGDIR, exist_ok=True)
    now = datetime.now(TZ)

    live_line, ok_f, tot_f, errs_live = run_live(cfg, now)
    with open(os.path.join(LOGDIR, project + "_log.txt"), "a", encoding="utf-8") as f:
        f.write(live_line + "\n")

    social_line, errs_social = None, []
    try:
        social_line, errs_social = run_social(cfg, now)
    except Exception as e:
        # Social KHONG BAO GIO duoc lam sap ca lan chay. No la nguon bo sung.
        print("SOCIAL loi ngoai du kien: %s" % e)
    if social_line:
        with open(os.path.join(LOGDIR, project + "_social_log.txt"), "a", encoding="utf-8") as f:
            f.write(social_line + "\n")

    allerr = errs_live + errs_social
    codes = [e.get("code", "") for e in allerr]
    if codes:
        top = max(set(codes), key=codes.count)
        rule(); print("LOI PHO BIEN NHAT: %s (%d/%d)" % (top, codes.count(top), len(codes)))
        # Huong sua PHAI khop voi nguon that su hong. Loi cu: 1 shop bi 403 ma
        # in ra huong dan dang ky app Reddit -> nguoi doc di sua nham cho.
        kinds = set(e.get("kind") for e in allerr if e.get("code") == top)
        hint = HINTS.get(top, "Gui nguyen bang tren cho tro ly.")
        if top in ("HTTP 403", "HTTP 429") and kinds != {"reddit"}:
            hint = ("Ten mien nay chan bot. Xem cot dau bang de biet nguon nao: "
                    + ", ".join(sorted(k for k in kinds if k)) + ".\n"
                    "  Neu la feed/policy cua mot shop -> shop do bat Cloudflare, "
                    "bo shop do ra khoi config hoac chap nhan thieu.")
        print("HUONG SUA: " + hint)

    # Exit 1 CHI khi nguon BAT BUOC chet sach. Social hong -> van 0, de .bat
    # van push duoc so SKU. Mat social con hon mat ca hai.
    if tot_f and ok_f == 0:
        print("\n[%s] FETCH FAIL TOAN BO — khong co feed nao lay duoc." % project)
        sys.exit(1)
    print("\n[%s] DONE" % project)
    sys.exit(0)


if __name__ == "__main__":
    main()
