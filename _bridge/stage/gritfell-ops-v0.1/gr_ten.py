#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
gr_ten.py — CONG TEN + CAP SKU THEO SERIES cho GritFell (port tu km_ten.py Kinmireva).   v0.1.0 (10/10/2026)

    py -3.11 gr_ten.py --kiem "Whitetail Pursuit"          -> ten sach + ly do truot (neu co)
    py -3.11 gr_ten.py --cap TS-C                          -> SKU ke tiep cua series, doc gr-sku-counter.json (tu gr_shop --quet)
    py -3.11 gr_ten.py --tu-kiem

Ham he thong goi (giu chu ky on dinh de gr_upload v0.2 dung):
    kiem_ten(ten)            -> (ten_sach, [ly_do])    ly_do rong = dung duoc
    design_name(title)       -> ten design khong co tu SEO/phoi (Playbook 08/10 muc 6)
    chuan_hoa(title)         -> chuoi so trung
    cap_sku(series, da_dung) -> "TS-C0041"             da_dung = set SKU that tren store, BAT BUOC
    ngo_tm(ten) / quet_tm_file(ten_files)

KHAC KINMIREVA (co y):
 - SKU dang {LOAI}-{SERIES}{4 so}: TS-C, MH-A, LH-A, PM-A, BT-A, SS-A (mu: CHUA BIET prefix — hoi nguoi).
 - Bo dem KHONG co hang so khoi dau. Moc = max THAT trong gr-sku-counter.json (gr_shop --quet). Thieu file -> SystemExit.
 - CAM_TM theo nganh san/cau: Realtree, Mossy Oak, Ducks Unlimited, NWTF, B.A.S.S., roster doi thu (cartridge tm_block),
   huy hieu quan chung, Great Seal, ten doi/truong, ten vuon quoc gia. NGO_TM: khuon "[X] Life", "EST/SINCE + nam", "Henry".
 - design_name() bo: t-shirt/tee/hoodie/polo/sun hoodie/with face cover/gift/hunting/fishing/men's/graphic/outdoor.
Stdlib-only.
"""
import io, json, os, re, sys, unicodedata

VER = "0.1.0"
HOME = os.path.dirname(os.path.abspath(__file__))
COUNTER = os.path.join(HOME, "gr-sku-counter.json")
SERIES_HOP_LE = {"TS-C", "MH-A", "LH-A", "PM-A", "BT-A", "SS-A"}        # mu chua ro -> them khi nguoi chot
RE_SKU = re.compile(r"^([A-Z]{2})-([A-Z])(\d{4})$")

TU_PHOI = set("""t-shirt tshirt tee shirt hoodie hoodies sun face cover polo button swim short shorts hat cap rope
graphic men's mens unisex apparel outdoor gift gifts hunting fishing heritage""".split())
TU_RONG = set("""new old redesign design clone copy final ver mockup front back left chest sleeve aop camo pattern
front_only front_back left_chest 2d""".split())

CAM_TM = [
    (r"\brealtree\b", "hoa van camo co chu"), (r"mossy\s*oak", "hoa van camo co chu"),
    (r"ducks?\s*unlimited|\bDU\b", "to chuc co nhan hieu"), (r"\bnwtf\b|national\s*wild\s*turkey", "to chuc co nhan hieu"),
    (r"b\.?a\.?s\.?s\.?\b|bassmaster", "nhan hieu giai dau"), (r"\bpheasants?\s*forever\b", "to chuc co nhan hieu"),
    (r"u\.?s\.?\s*(army|navy|air\s*force|marine)|\busmc\b", "huy hieu quan chung"),
    (r"great\s*seal", "con dau quoc gia"), (r"smokey\s*bear", "nhan hieu USFS"),
    (r"\b(sitka|kuiu|first\s*lite|banded|drake\s*waterfowl|duck\s*camp|marsh\s*wear|burlebo|huntdad|hunthide|aftco|huk|howler|tom\s*beckbe|free\s*fly|yeti|orvis|remington|winchester|browning|rapala|bass\s*pro|cabela)\b", "thuong hieu / doi thu"),
    (r"\b(yellowstone|yosemite|glacier|smoky\s*mountains|everglades)\s*(national\s*park)?\b", "ten vuon quoc gia (nhan hieu NPS)"),
    (r"disney|pixar|marvel|nintendo|pokemon", "IP giai tri"),
]
NGO_TM = [
    (r"\b(est\.?|established|since)\s*['’]?\d{2,4}\b", "EST/SINCE + nam — goc vu khoa Google Ads"),
    (r"\bhenry\b", "nhan vat sang lap hu cau — vu Google Ads"),
    (r"\b(hunt|fish|duck|deer|buck|lake|camp)\s*(life|mode)\b", "khuon [X] LIFE — vung dong nhom 025"),
    (r"\b(reel|rod)\s*cool\s*(dad|papa)\b", "cum pho bien nhom 025"),
    (r"\bgame\s*day\b", "nhan hieu"), (r"\badventure\s*awaits\b", "cum cuc pho bien"),
    (r"\b1776\b|\bpatriot\b|\bmerica\b", "lane flag/patriot — DNA GritFell cam"),
]


def _bo_dau(s):
    return "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn")


def chuan_hoa(title):
    s = _bo_dau(title or "").lower()
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return " ".join(t for t in s.split() if t not in TU_PHOI and len(t) > 1)


def design_name(title):
    """'TS-C0033 - Whitetail Pursuit T-shirt · FRONT_ONLY' -> 'Whitetail Pursuit'. Khong doan them chu nao."""
    s = " ".join((title or "").split())
    s = re.sub(r"^[A-Z]{2}-[A-Z]\d{4}\s*[-–:]?\s*", "", s)          # bo SKU dau
    s = re.sub(r"^\[2D\]\s*", "", s)                                 # bo prefix engine
    s = re.sub(r"\s*[·|]\s*[A-Z_]{3,}\s*⚑?\s*$", "", s)             # bo ' · FRONT_ONLY ⚑'
    s = s.strip(' "\'')
    def _phoi(w):
        lw = w.lower()
        if lw.endswith("'s"): lw = lw[:-2]
        return lw in TU_PHOI or lw.rstrip("s") in TU_PHOI or lw in TU_RONG
    words = [w for w in s.split() if not _phoi(w)]
    out = " ".join(words).strip(" -–")
    return re.sub(r"\s+", " ", out)


def ngo_tm(ten):
    t = (ten or "").lower(); hits = []
    for rx, why in CAM_TM:
        if re.search(rx, t, re.I): hits.append(("CAM", rx, why))
    for rx, why in NGO_TM:
        if re.search(rx, t, re.I): hits.append(("NGO", rx, why))
    return hits


def quet_tm_file(ten_files):
    """Ten file dinh kem van giu chuoi cam du ten card da sua (vu rename-bypass 25/08 Kinmireva)."""
    out = []
    for f in ten_files or []:
        for loai, rx, why in ngo_tm(re.sub(r"[_\-.]+", " ", f)):
            if loai == "CAM": out.append((f, rx, why))
    return out


def kiem_ten(ten_goc):
    ten = design_name(ten_goc)
    ly_do = []
    if not ten:
        return ten, ["chua co ten design (chi co ma/phoi)"]
    if len(ten.split()) > 6:
        ly_do.append("ten > 6 tu (%d) — DNA: <=4 tu, khong dau cham than" % len(ten.split()))
    if "!" in ten_goc:
        ly_do.append("co dau '!' — DNA GritFell: earned not loud")
    for loai, rx, why in ngo_tm(ten):
        ly_do.append(("CAM TM: " if loai == "CAM" else "NGO TM (nguoi xem): ") + why)
    return ten, ly_do


def doc_dem():
    if not os.path.isfile(COUNTER):
        raise SystemExit("THIEU %s — chay gr_shop.py --quet truoc. KHONG cap SKU mu (S6)." % COUNTER)
    with io.open(COUNTER, encoding="utf-8") as f:
        d = json.load(f)
    return d.get("series", {}), d.get("quet_luc", "?")


def cap_sku(series, da_dung):
    """SKU ke tiep. da_dung = set SKU that tren store (BAT BUOC, rong -> loi)."""
    series = series.upper()
    if series not in SERIES_HOP_LE:
        raise SystemExit("series %r khong trong %s — neu la dong moi, nguoi them vao SERIES_HOP_LE" % (series, sorted(SERIES_HOP_LE)))
    if not da_dung:
        raise RuntimeError("cap_sku: da_dung rong — KHONG cap SKU mu. Nap tu gr-catalog.json truoc.")
    cao = 0
    for s in da_dung:
        m = RE_SKU.match(s)
        if m and "%s-%s" % (m.group(1), m.group(2)) == series:
            cao = max(cao, int(m.group(3)))
    moc, _ = doc_dem()
    n = max(cao, int(moc.get(series, 0)))
    while True:
        n += 1
        if n > 9999:
            raise SystemExit("series %s da het 4 so — can nguoi mo series moi" % series)
        sku = "%s%04d" % (series, n)
        if sku not in da_dung:
            return sku


def nap_sku_da_co():
    p = os.path.join(HOME, "gr-catalog.json")
    if not os.path.isfile(p):
        raise SystemExit("THIEU gr-catalog.json — chay gr_shop.py --quet truoc.")
    with io.open(p, encoding="utf-8") as f:
        c = json.load(f)
    return {v["sku"].strip() for p in c["products"] for v in p["variants"]["nodes"] if (v.get("sku") or "").strip()}


def tu_kiem():
    fails = []
    def ck(n, c, info=""):
        print("  %s %s %s" % ("PASS" if c else "FAIL", n, info))
        if not c: fails.append(n)
    ck("design_name bo SKU+phoi+layout", design_name("TS-C0033 - Whitetail Pursuit T-shirt · FRONT_ONLY ⚑") == "Whitetail Pursuit", repr(design_name("TS-C0033 - Whitetail Pursuit T-shirt · FRONT_ONLY ⚑")))
    ck("design_name bo [2D]", design_name("[2D] First Fish Lift · LEFT_CHEST") == "First Fish Lift", repr(design_name("[2D] First Fish Lift · LEFT_CHEST")))
    ck("design_name giu ten thuong", design_name("Wave Sun Hoodie") == "Wave", repr(design_name("Wave Sun Hoodie")))
    ck("chuan_hoa bo phoi", chuan_hoa("Deer Anatomy T-shirt") == "deer anatomy")
    t, ly = kiem_ten("Realtree Buck Camo T-shirt"); ck("kiem_ten bat Realtree", any("CAM TM" in x for x in ly), str(ly))
    t, ly = kiem_ten("Deer Camp EST 1962 Hoodie"); ck("kiem_ten ngo EST+nam", any("EST" in x for x in ly), str(ly))
    t, ly = kiem_ten("Whitetail Pursuit T-shirt"); ck("ten sach qua", ly == [], str(ly))
    ck("quet_tm_file bat ten file", quet_tm_file(["mossy_oak_ref.png", "ok.png"]) != [])
    # cap_sku voi counter gia
    global COUNTER
    old = COUNTER; COUNTER = os.path.join(HOME, "_tk_counter.json")
    with io.open(COUNTER, "w", encoding="utf-8") as f: json.dump({"series": {"TS-C": 38}}, f)
    try:
        ck("cap_sku lay max(store, file)", cap_sku("TS-C", {"TS-C0040", "TS-C0041"}) == "TS-C0042")
        ck("cap_sku nhay qua so da dung", cap_sku("TS-C", {"TS-C0039"}) == "TS-C0040")
        try: cap_sku("TS-C", set()); ck("cap_sku rong -> loi", False)
        except RuntimeError: ck("cap_sku da_dung rong -> RuntimeError", True)
        try: cap_sku("ZZ-Z", {"x"}); ck("series la -> loi", False)
        except SystemExit: ck("series la -> SystemExit", True)
    finally:
        os.remove(COUNTER); COUNTER = old
    print("===== gr_ten v%s tu-kiem: PASS %d/%d — %s =====" % (VER, 12 - len(fails), 12, "SACH" if not fails else "TRUOT " + ",".join(fails)))
    return 1 if fails else 0


def main(argv):
    if "--tu-kiem" in argv: return tu_kiem()
    if "--kiem" in argv:
        t, ly = kiem_ten(" ".join(argv[argv.index("--kiem") + 1:]))
        print("ten sach:", t); print("ly do:", ly or "OK"); return 0 if not ly else 1
    if "--cap" in argv:
        s = argv[argv.index("--cap") + 1]
        print(cap_sku(s, nap_sku_da_co())); return 0
    print(__doc__); return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
