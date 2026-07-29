# LOCAL-VERIFY — luồng DESKTOP (hợp đồng dữ liệu giữa 2 luồng)

## Kiến trúc 2 luồng (chốt 29/07/2026)

```
┌─ LUỒNG CLOUD (đã chạy ổn — scheduled task 04:30 BKK) ──────────────────┐
│  WebSearch snippet · Meta interest-size (global) · trend blogs          │
│  → viết <project>-daily.json (B1..B10 + health) → git push              │
│  → GAS multibot đọc raw → post Telegram                                 │
│  ĐỌC THÊM: local-verify/<project>-live.json (nếu verified_at ≤ 7 ngày) │
│            → nâng anchor "snippet" lên "LIVE", reset anchor_age = 0     │
└─────────────────────────────────────────────────────────────────────────┘
┌─ LUỒNG DESKTOP (máy bạn — thứ cloud KHÔNG làm được) ───────────────────┐
│  python local-verify/verify_listings.py all   (CN hằng tuần ~09:00)     │
│  Chromium THẬT mở listing Etsy → parse JSON-LD: reviews_listing, price  │
│  → ghi local-verify/<project>-live.json → git commit + push             │
└─────────────────────────────────────────────────────────────────────────┘
        Hợp đồng = file JSON trong CÙNG repo. Hai luồng không gọi nhau
        trực tiếp, chỉ đọc/ghi file → hỏng 1 luồng không sập luồng kia.
```

## Phân công: việc nào ở đâu

| Việc | Cloud | Desktop |
|---|---|---|
| WebSearch snippet, trend blogs, Pinterest Predicts | ✅ | – |
| Meta interest-size (global) | ✅ | – |
| Meta audience US (estimate) | ✅ (khi Pipeboard mở slot) | – |
| Viết report B1..B10, push, Telegram (GAS) | ✅ | – |
| **Mở listing Etsy/Amazon thật → (listing rv), giá** | ❌ chặn vĩnh viễn | ✅ script này |
| Extension (eRank, EtsyHunt), Chrome MCP, file local | ❌ | ✅ |

## Cài đặt (1 lần, trên máy bạn)

```bash
pip install playwright
python -m playwright install chromium
```

## Chạy

```bash
cd <thư-mục-repo-foxera-daily>
git pull
python local-verify/verify_listings.py foxera   # 1 project
python local-verify/verify_listings.py all      # cả 5
git push
```

Lên lịch CN hằng tuần 09:00 (Windows Task Scheduler / cron / local scheduled
task của app desktop) với đúng chuỗi lệnh trên. Browser sẽ bật cửa sổ thật
(headless bị Etsy chặn) — cứ để nó tự chạy ~2-3 phút.

## Định dạng đầu ra (hợp đồng cho luồng cloud)

`local-verify/<project>-live.json`:
```json
{
  "project": "foxera",
  "verified_at": "2026-08-03",
  "locale": "US/USD",
  "provenance": "live_local_browser",
  "live_count": 9,
  "listings": [
    {"listing_id": "4336064749", "url": "…", "status": "live",
     "title": "Grandma Est 2026 Sweatshirt…", "reviews_listing": 214,
     "price": 24.99, "currency": "USD"}
  ]
}
```

Quy tắc trung thực: `reviews_listing` lấy từ JSON-LD `aggregateRating.ratingCount`
= đúng nhãn **(listing rv)** theo kỷ luật #2. Gặp captcha/lỗi → ghi `status`
thật, KHÔNG bịa số. Luồng cloud chỉ dùng khi `verified_at ≤ 7 ngày` (kỷ luật #8).

## Việc còn lại phía cloud (đã ghi thành LUẬT 19 — xem foxera-routine-v5.md)

Bước 3 của routine cloud thêm: `cat local-verify/foxera-live.json` — nếu
`verified_at ≤ 7 ngày` thì dùng `reviews_listing/price` làm anchor tầng
"live (local-verify dd/mm)", reset `anchor_age_days` theo verified_at.
