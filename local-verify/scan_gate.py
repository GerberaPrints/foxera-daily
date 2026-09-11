# -*- coding: utf-8 -*-
"""
scan_gate.py - CONG CHAN sau khi verify_shops.py chay.  11/09/2026

Ly do ton tai: 11/09 ban quet tra ve 0 shop song / 161, toan blocked+unknown.
Do la Etsy chan bot, KHONG phai 161 shop cung chet. Script cu van exit 0 nen
run_daily_scan.bat commit va push nguyen so rac len main.

Quy tac chan - fail loud, khong doan:
  - khong doc duoc file, hoac khong co shop nao  -> chan
  - so shop 'active' = 0                        -> chan
  - blocked + unknown > 30% tong                -> chan
exit 0 = so lieu dung duoc. exit 1 = KHONG duoc commit/push.
"""
import json, os, sys

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), "foxera-shops-live.json")

try:
    shops = json.load(open(P, encoding="utf-8")).get("shops", [])
except Exception as e:
    print("[gate] CHAN - khong doc duoc foxera-shops-live.json: %s" % e)
    sys.exit(1)

n = len(shops)
if n == 0:
    print("[gate] CHAN - file khong co shop nao.")
    sys.exit(1)

active = sum(1 for s in shops if s.get("status") == "active")
bad    = sum(1 for s in shops if s.get("status") in ("blocked", "unknown"))
print("[gate] tong %d | active %d | blocked+unknown %d (%.0f%%)" % (n, active, bad, 100.0*bad/n))

if active == 0:
    print("[gate] CHAN - 0 shop song tren %d. Gan nhu chac chan la bi chan bot," % n)
    print("       khong phai toan bo shop chet. Giai captcha tay 1 lan roi quet lai:")
    print("       python local-verify\\verify_shops.py      <- KHONG co --auto")
    sys.exit(1)

if bad > n * 0.3:
    print("[gate] CHAN - %d/%d shop khong doc duoc, qua nguong 30%%." % (bad, n))
    print("       So lieu nay khong dung de ket luan. Giai captcha tay roi quet lai.")
    sys.exit(1)

print("[gate] OK - so lieu dung duoc.")
sys.exit(0)
