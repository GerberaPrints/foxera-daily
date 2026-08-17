#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gritfell_social_fetch.py — PC-side SOCIAL FETCH cho GritFell.   v1 (17/08/2026)
Bo sung cho gritfell_fetch.py. Sinh ra ../gritfell-social-fetch.json

VI SAO CAN: heartbeat cua cloud doi HAI file — gritfell-live-fetch.json (da xong)
VA gritfell-social-fetch.json. Sandbox cloud bi chan reddit.com, youtube.com,
suggestqueries.google.com, trends.google.com (curl HTTP 000 ca 4). May ban thi khong.

BON NGUON (khong can API key, khong can dang nhap):
 1. REDDIT   — /r/<sub>/top.json?t=week  -> nhu cau chua duoc dap ung + than phien
 2. YOUTUBE  — RSS theo channel_id       -> chu de kenh outdoor dang lam
 3. G-SUGGEST— autocomplete              -> nguoi ta THUC SU go gi vao o tim kiem
 4. G-TRENDS — RSS trending US           -> nen chung, loc thu cong

=== NGUYEN TAC (giong gritfell_fetch.py) ===
 · PC chi LAY DU LIEU THO. Khong tu ket luan, khong tu cham diem.
   Cloud doc file nay roi moi doc nghia theo P_SCORE_V2 / DEMAND_SENSOR_MAP.
 · IN BANG CHAN DOAN — nguon nao hong, hong vi gi, hien ngay ra man hinh.
 · CHAN BAO CAO GIA: nguon nao lay khong duoc thi ghi ro trong JSON o "errors",
   KHONG im lang bo qua. "Khong lay duoc" != "khong co du lieu".

Stdlib-only. Chay sau gritfell_fetch.py trong cung .bat.
KHONG dung file cua job khac (Etsy / Gerbera / GenusFaith).
"""
import json, ssl, sys, os, time, gzip, socket, re
import urllib.request, urllib.error
from datetime import datetime, timezone, timedelta

BANGKOK = timezone(timedelta(hours=7))
TIMEOUT = 15
SCHEMA_VERSION = "1.0"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(HERE, "..", "gritfell-social-fetch.json")
LOG  = os.path.join(HERE, "social_log.txt")

# Reddit YEU CAU User-Agent mo ta that, KHONG duoc gia trinh duyet -> hay bi 429.
UA_REDDIT = {"User-Agent": "GritFell-MarketResearch/1.0 (outdoor apparel market research)",
             "Accept": "application/json", "Accept-Encoding": "gzip, deflate"}
UA_WEB = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "close",
}

# ── 1. REDDIT — 12 sub theo 4 sub-niche cua GritFell ──
SUBS = {
    "SN1_waterfowl": ["waterfowl", "duckhunting"],
    "SN2_freshwater": ["bassfishing", "Fishing", "Fishing_Gear"],
    "SN3_inshore":   ["SaltwaterFishing", "Fishing_Gear"],
    "SN4_big_game":  ["Hunting", "bowhunting", "elkhunting", "Hunting_Gear"],
    "dogs":          ["gundogs"],          # ao chong tray cho cho — nhu cau manh nhat 14/08
}

# ── 2. YOUTUBE — handle kenh; script tu tim channel_id roi doc RSS ──
YT_HANDLES = ["MeatEater", "TheHuntingPublic", "SaltStrong", "GooganSquad", "onXmaps"]

# ── 3. GOOGLE SUGGEST — nguoi ta go gi that su ──
SUGGEST_SEEDS = [
    "duck hunting hat", "hunting gift for", "fishing gift for him",
    "embroidered hunting", "camo trucker hat", "deer hunting shirt",
    "waterfowl gear", "flounder gigging", "teal season",
    "hunting koozie", "fishing koozie", "hunting journal",
    "duck hunting decor", "bass fishing gift", "inshore fishing shirt",
    "hunting dog vest", "gun dog gear", "hunting beanie",
]

TRENDS_RSS = "https://trends.google.com/trending/rss?geo=US"

# ── SSL: dung bo CA cua Mozilla, KHONG dung kho Windows (bai hoc 17/08) ──
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
    if isinstance(e, urllib.error.HTTPError):
        why = {403: "chan bot", 404: "khong ton tai", 429: "bi rate-limit (cham lai)",
               503: "server tu choi tam thoi"}.get(e.code, "")
        return f"HTTP {e.code}", why
    if isinstance(e, urllib.error.URLError):
        s = str(e.reason)
        if "SSL" in s.upper() or "CERTIFICATE" in s.upper():
            return "SSL", "loi chung chi tren may"
        if "timed out" in s.lower():
            return "TIMEOUT", f"qua {TIMEOUT}s"
        if "getaddrinfo" in s or "known" in s:
            return "DNS", "khong phan giai duoc ten mien"
        if "Tunnel" in s or "proxy" in s.lower():
            return "PROXY", "bi proxy/VPN chan"
        return "URLERR", s[:60]
    return type(e).__name__.upper()[:12], str(e)[:60]


def fetch(url, hdrs=None, tries=2):
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
                time.sleep(4)
    raise last


# ─────────────────────────── CAC NGUON ───────────────────────────

def get_reddit(sub, limit=15):
    """Top tuan cua 1 sub. Tra ve list bai — title/score/comments/flair."""
    url = f"https://www.reddit.com/r/{sub}/top.json?t=week&limit={limit}"
    d = json.loads(fetch(url, UA_REDDIT))
    out = []
    for c in (d.get("data", {}).get("children") or []):
        p = c.get("data", {})
        if p.get("stickied"):
            continue
        out.append({
            "title": p.get("title"),
            "score": p.get("score"),
            "num_comments": p.get("num_comments"),
            "flair": p.get("link_flair_text"),
            "created_utc": p.get("created_utc"),
            "permalink": "https://reddit.com" + (p.get("permalink") or ""),
            "selftext_head": (p.get("selftext") or "")[:400],
        })
    return out


def get_youtube(handle, limit=10):
    """Tim channel_id tu trang @handle roi doc RSS. Tra ve (list_video, channel_id)."""
    page = fetch(f"https://www.youtube.com/@{handle}")
    m = re.search(r'"(?:channelId|externalId)":"(UC[\w-]{22})"', page)
    if not m:
        raise RuntimeError("khong tim thay channelId trong trang kenh")
    cid = m.group(1)
    xml = fetch(f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}")
    vids = []
    for entry in re.findall(r"<entry>(.*?)</entry>", xml, re.S)[:limit]:
        t = re.search(r"<title>(.*?)</title>", entry, re.S)
        p = re.search(r"<published>(.*?)</published>", entry, re.S)
        v = re.search(r"<yt:videoId>(.*?)</yt:videoId>", entry, re.S)
        vids.append({"title": (t.group(1) if t else "").strip(),
                     "published": (p.group(1) if p else "").strip(),
                     "url": f"https://youtu.be/{v.group(1)}" if v else None})
    return vids, cid


def get_suggest(seed):
    """Google autocomplete — nguoi ta go tiep gi sau cum tu nay."""
    from urllib.parse import quote_plus
    url = ("https://suggestqueries.google.com/complete/search"
           f"?client=firefox&hl=en&gl=us&q={quote_plus(seed)}")
    d = json.loads(fetch(url))
    return d[1] if isinstance(d, list) and len(d) > 1 else []


def get_trends():
    xml = fetch(TRENDS_RSS)
    return [t.strip() for t in re.findall(r"<title>(.*?)</title>", xml, re.S)][1:31]


# ─────────────────────────── MAIN ───────────────────────────

def main():
    now = datetime.now(BANGKOK)
    res = {"schema_version": SCHEMA_VERSION, "producer": "DESKTOP",
           "date": now.strftime("%Y-%m-%d"), "fetched_at": now.isoformat(),
           "reddit": {}, "youtube": {}, "suggest": {}, "trends": [], "errors": []}
    ok = {"reddit": 0, "youtube": 0, "suggest": 0, "trends": 0}
    tot = {"reddit": sum(len(v) for v in SUBS.values()), "youtube": len(YT_HANDLES),
           "suggest": len(SUGGEST_SEEDS), "trends": 1}

    print("=" * 64)
    print(f"GRITFELL SOCIAL FETCH v{SCHEMA_VERSION} — {now.strftime('%d/%m/%Y %H:%M')}")
    _ctx()
    print(f"CA SOURCE: {_CA_SRC}")
    print("=" * 64)
    print(f"{'NGUON':<26} {'KET QUA':<12} GHI CHU")
    print("-" * 64)

    # 1. REDDIT
    seen_sub = set()
    for niche, subs in SUBS.items():
        for sub in subs:
            if sub in seen_sub:
                continue
            seen_sub.add(sub)
            try:
                posts = get_reddit(sub)
                res["reddit"][sub] = {"sub_niche": niche, "posts": posts}
                ok["reddit"] += 1
                print(f"{('r/' + sub)[:26]:<26} {'OK':<12} {len(posts)} bai")
            except Exception as e:
                code, why = classify(e)
                res["errors"].append({"kind": "reddit", "sub": sub, "code": code, "err": why or str(e)[:120]})
                print(f"{('r/' + sub)[:26]:<26} {code:<12} {why}")
            time.sleep(2.0)          # Reddit rat de 429 -> di cham

    print("-" * 64)
    # 2. YOUTUBE
    for h in YT_HANDLES:
        try:
            vids, cid = get_youtube(h)
            res["youtube"][h] = {"channel_id": cid, "videos": vids}
            ok["youtube"] += 1
            print(f"{('@' + h)[:26]:<26} {'OK':<12} {len(vids)} video")
        except Exception as e:
            code, why = classify(e)
            if isinstance(e, RuntimeError):
                code, why = "NO-CHANNEL", "handle sai hoac kenh doi ten"
            res["errors"].append({"kind": "youtube", "handle": h, "code": code, "err": why or str(e)[:120]})
            print(f"{('@' + h)[:26]:<26} {code:<12} {why}")
        time.sleep(1.2)

    print("-" * 64)
    # 3. GOOGLE SUGGEST
    for s in SUGGEST_SEEDS:
        try:
            sug = get_suggest(s)
            res["suggest"][s] = sug
            ok["suggest"] += 1
            print(f"{s[:26]:<26} {'OK':<12} {len(sug)} goi y")
        except Exception as e:
            code, why = classify(e)
            res["errors"].append({"kind": "suggest", "seed": s, "code": code, "err": why or str(e)[:120]})
            print(f"{s[:26]:<26} {code:<12} {why}")
        time.sleep(0.8)

    print("-" * 64)
    # 4. GOOGLE TRENDS
    try:
        res["trends"] = get_trends()
        ok["trends"] = 1
        print(f"{'Google Trends US':<26} {'OK':<12} {len(res['trends'])} tu khoa")
    except Exception as e:
        code, why = classify(e)
        res["errors"].append({"kind": "trends", "code": code, "err": why or str(e)[:120]})
        print(f"{'Google Trends US':<26} {code:<12} {why}")

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)

    line = (f"{now.isoformat()} | reddit {ok['reddit']}/{tot['reddit']} | "
            f"youtube {ok['youtube']}/{tot['youtube']} | suggest {ok['suggest']}/{tot['suggest']} | "
            f"trends {ok['trends']}/1 | errors {len(res['errors'])}")
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")

    print("=" * 64)
    print(line)

    codes = [e.get("code", "") for e in res["errors"]]
    if codes:
        top = max(set(codes), key=codes.count)
        print("-" * 64)
        print(f"LOI PHO BIEN NHAT: {top} ({codes.count(top)}/{len(codes)})")
        print("HUONG SUA: " + {
            "HTTP 429":  "Reddit chan vi goi qua nhanh. Doi 10 phut roi chay lai;\n"
                         "  neu lap lai thi tang time.sleep(2.0) trong phan Reddit len 4.0.",
            "HTTP 403":  "Reddit/YouTube chan User-Agent. Bao lai cho tro ly.",
            "NO-CHANNEL":"Handle YouTube sai hoac kenh doi ten. Mo youtube.com/@<handle>\n"
                         "  kiem tra roi sua danh sach YT_HANDLES trong file nay.",
            "SSL":       "python -m pip install certifi  roi chay lai.",
            "PROXY":     "Tat VPN roi chay lai.",
            "DNS":       "Kiem DNS may (thu 8.8.8.8).",
        }.get(top, "Gui nguyen bang tren cho tro ly."))

    # LUON exit 0: social la nguon BO SUNG. Hong social khong duoc lam
    # hong ca .bat va khong duoc chan push cua gritfell-live-fetch.json.
    print("\n[social_fetch] DONE (social la nguon bo sung — khong chan push)")
    sys.exit(0)


if __name__ == "__main__":
    main()
