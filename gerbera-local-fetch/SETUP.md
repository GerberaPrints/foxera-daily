# Gerbera PC-side Fetch — Cài 1 lần (~10 phút)

Vai trò (LUẬT 8.5 — chia 3 vai): **PC = FETCH** (nơi không bị chặn) · **Cloud routine 07:15 = MERGE + gác chất lượng** · **GAS = HIỂN THỊ Telegram**.

PC quét feed/collections T1 lúc **06:45 Bangkok** → push `gerbera-live-fetch.json` lên repo → routine cloud 07:15 thấy file tươi (<24h) thì dùng làm nguồn LIVE, hết cảnh carry-forward vì PROVENANCE_REQUIRED. PC tắt → cloud tự carry, bản tin không gãy.

## Bước 1 — Clone repo (nếu máy chưa có)

```bat
git clone "https://x-access-token:<PAT>@github.com/GerberaPrints/foxera-daily.git" C:\gerbera\foxera-daily
```

(`<PAT>` = fine-grained PAT Contents: Read and write — cùng token trong task cloud. Nếu máy đã có repo FoxEra thì dùng luôn thư mục đó, chỉ cần sửa đường dẫn trong `.bat`.)

## Bước 2 — Test tay 1 lần

```bat
cd /d C:\gerbera\foxera-daily
python gerbera-local-fetch\gerbera_fetch.py
```

Kỳ vọng in ra: `feeds 6/6 | anchors 3/3 | collections 6/6 | errors 0` và sinh file `gerbera-live-fetch.json` ở gốc repo. (Cần Python 3.8+ trong PATH — stdlib only, không cần pip.)

## Bước 3 — Đăng ký Task Scheduler

1. Task Scheduler → Create Task (không phải Basic).
2. General: "Gerbera PC Fetch" · Run whether user is logged on or not (tuỳ chọn).
3. Triggers: **Daily 06:45** + thêm trigger **At log on** (chạy bù khi máy tắt giờ đó).
4. Actions: Start a program → `C:\gerbera\foxera-daily\gerbera-local-fetch\run_gerbera_fetch.bat`.
5. Settings: tick **"Run task as soon as possible after a scheduled start is missed"**.

## File output — hợp đồng với cloud (schema 1.0)

`gerbera-live-fetch.json` (gốc repo):

- `date` / `fetched_at` — cloud chỉ dùng khi <24h, cũ hơn thì bỏ qua và carry.
- `feeds{brand}` — limit=5 mỗi brand: title, type, price min/max, compare_at, created/published (phát hiện drop 48h), variants_unavailable + sold_out_level (LUẬT 3 variant/product).
- `anchors{brand}` — **mode price** dòng core polo từ collection 250 SKU (LUẬT 2 — đây mới là anchor, không phải feed).
- `collections{brand}` — title/handle/updated_at/products_count cho B11 (cloud áp LUẬT 8.3 "2 lần liên tiếp" trước khi tin updated_at).
- `errors[]` — lỗi lẻ từng URL; py vẫn exit 0, cloud tự carry phần thiếu.

## Quy tắc an toàn repo (5 job song song)

- `.bat` CHỈ `git add` đúng 2 đường dẫn: `gerbera-live-fetch.json` + `gerbera-local-fetch/fetch_log.txt`. KHÔNG `git add -A`.
- Luôn `git pull --rebase` trước push. KHÔNG BAO GIỜ `--force`.
- Fail toàn bộ (0 nguồn nào đọc được) → không push, cloud carry — đây là hành vi đúng, không phải bug.

## Mở rộng sau (chưa làm ở v1.0)

- Đọc blog handle thật của T1 (atom 404 → cần dò handle bằng browser).
- Đọc 10–20 review mới nhất listing Etsy/Amazon (cần browser thật, không phải urllib).
- Meta Ad Library qua Claude in Chrome (phiên interactive tuần, không thuộc script này).
