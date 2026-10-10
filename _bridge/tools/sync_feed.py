#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
sync_feed.py — chep <repo>/<brand>-live-fetch.json -> <ideas_home>/signals/<brand>/   v1.0.0 (10/10/2026)

    py -3.11 _bridge\tools\sync_feed.py gritfell [ideas_home]

VI SAO: idea_check gritfell 10/10 bao "shopify_feed gritfell-live-fetch.json cu 10 ngay" trong khi
_pcfetch push ban moi len repo moi 04:30. Engine chong trung voi 167 SP cu -> sot 20 SKU moi (17 tee).
File nay chi lam MOT viec: neu ban trong repo MOI HON (theo 'fetched_at' trong JSON, khong theo mtime)
thi ghi .tmp roi os.replace. Khong moi hon -> khong dong vao. In truoc/sau de nguoi doc.
Stdlib-only. Exit 0 = dong bo/khong can; 1 = loi doc; 2 = sai tham so.
"""
import io, json, os, shutil, sys

def fetched_at(p):
    try:
        with io.open(p, encoding="utf-8") as f:
            return json.load(f).get("fetched_at") or ""
    except FileNotFoundError:
        return None
    except Exception as ex:
        return "LOI:%s" % ex

def main():
    if len(sys.argv) < 2:
        print("Dung: sync_feed.py <brand> [ideas_home]"); return 2
    brand = sys.argv[1]
    here = os.path.dirname(os.path.abspath(__file__))
    repo = os.path.dirname(os.path.dirname(here))
    ideas = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("FOXERA_IDEAS_HOME", r"D:\FoxEra\ideas")
    src = os.path.join(repo, "%s-live-fetch.json" % brand)
    dst_dir = os.path.join(ideas, "signals", brand)
    dst = os.path.join(dst_dir, "%s-live-fetch.json" % brand)
    fa_src, fa_dst = fetched_at(src), fetched_at(dst)
    print("repo   :", src, "| fetched_at =", fa_src)
    print("signals:", dst, "| fetched_at =", fa_dst)
    if fa_src is None or str(fa_src).startswith("LOI"):
        print("KHONG DOC DUOC nguon trong repo -> khong chep (S4)"); return 1
    if not os.path.isdir(dst_dir):
        print("KHONG CO thu muc signals:", dst_dir, "-> dung lai, khong tu tao (S6)"); return 1
    if fa_dst and not str(fa_dst).startswith("LOI") and fa_dst >= fa_src:
        print("signals da moi bang/hon repo -> khong dong vao"); return 0
    tmp = dst + ".tmp"
    shutil.copy2(src, tmp); os.replace(tmp, dst)
    print("DA CHEP:", fa_dst, "->", fetched_at(dst), "| bytes", os.path.getsize(dst))
    return 0

if __name__ == "__main__":
    sys.exit(main())
