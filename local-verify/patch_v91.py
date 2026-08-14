# -*- coding: utf-8 -*-
"""
VA v9 -> v9.1  ·  14/08/2026
Sua load_targets(): muc 'sus_new' trong registry co cau truc KHAC
    live / sus_with_sales : {"code": "E85", "shop": "NOVIXRA"}
    sus_new              : {"owner": "...", "codes": [...], "shops": {"E238": "..."}}
v9 goi x["code"] tren sus_new -> KeyError -> try bao qua rong -> mat luon
store_links_extra (E5, E3, E22...). Hau qua: quet full thieu ~38 shop.

Chay 1 lan, dat file nay CUNG THU MUC voi verify_shops.py:
    cd /d C:\\Users\\Admin\\foxera-daily\\local-verify
    python patch_v91.py
"""
import io, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, 'verify_shops.py')

if not os.path.exists(P):
    print('KHONG THAY verify_shops.py trong', HERE)
    print('Dat patch_v91.py cung thu muc voi verify_shops.py roi chay lai.')
    sys.exit(1)

s = io.open(P, encoding='utf-8').read()

OLD = '''        for sec in ("live", "sus_with_sales", "sus_new"):   # v9: them sus_new
            for x in r.get(sec, []):
                add(x["code"], x.get("shop"))'''

NEW = '''        # v9.1: moi muc mot try rieng — mot muc hong KHONG duoc giet cac muc con lai
        for sec in ("live", "sus_with_sales"):
            for x in r.get(sec, []):
                if isinstance(x, dict) and x.get("code"):
                    add(x["code"], x.get("shop"))
        for g in r.get("sus_new", []):   # sus_new gom theo chu: {codes:[], shops:{ma:ten}}
            if not isinstance(g, dict):
                continue
            for c, sh in (g.get("shops") or {}).items():
                add(c, sh)'''

if 'v9.1' in s:
    print('File da la v9.1 roi — khong lam gi.')
    sys.exit(0)

if OLD not in s:
    print('KHONG TIM THAY doan can va.')
    print('File hien tai co the khong phai ban v9 goc tai tu Drive.')
    sys.exit(1)

io.open(P + '.bak', 'w', encoding='utf-8').write(s)
io.open(P, 'w', encoding='utf-8').write(s.replace(OLD, NEW))
print('DA VA -> v9.1')
print('Ban cu luu tai: verify_shops.py.bak')
print()
print('Kiem lai bang:  python verify_shops.py --selftest   (phai ra 16 pass / 0 fail)')
