# ETSY BOT BLUEPRINT v1.0 — Tổng hợp cải tiến 05/08/2026 & khuôn nhân bản
> Tài liệu chuẩn để NHÂN BẢN hệ bot Etsy (FoxEra) sang dự án khác (GenusFaith · GritFell · Gerbera · FoxJob · dự án mới).
> Hệ = 3 tầng: **CLOUD** (research 04:30, ghi JSON, push GitHub) · **DESKTOP** (mắt thật: Playwright quét Etsy + git push) · **GS** (Apps Script: đọc raw GitHub → Telegram + Hub vận hành đơn).
> Nguyên tắc gốc: 2 tầng không gọi nhau trực tiếp — hợp đồng là FILE JSON trong cùng repo; hỏng 1 tầng không sập tầng kia.

---

## PHẦN A — NHỮNG GÌ ĐÃ SỬA/NÂNG CẤP HÔM NAY (inventory)

### A1. Tầng CLOUD (routine v5.1 — foxera-routine-v5.1.md)
| # | Cải tiến | Luật |
|---|---|---|
| 1 | **SỬA METHOD đo cầu Meta**: cấm so `search_interests.audience_size` ("global") với estimate US — 2 hệ đo khác nhau (bằng chứng: Pickleball global 1.03M < US-reach 15.25M). Thước chuẩn = `estimate_audience_size` REACH, US 18-65, so hàng-ngang. Interest disambiguation (Cats=nhạc, Back-to-School=phim, Nurse=nursery, Dog=band) phải gắn ⚠️ hoặc bỏ. | **L27** |
| 2 | **Baseline cầu US** `<project>-meta-us-baseline.json`: map interest_id + us_reach + verified_at; mỗi run gọi lại estimate theo id (không search lại tên), tính Δ ▲/▼/▬; thêm ≤2 id/ngày từ `next_to_add`. Thư viện dùng chung: `meta-interest-library.json` (11 niche + no_clean log). | **L28** |
| 3 | **Cầu nối B8**: Cloud PHẢI gieo 3–8 URL `etsy.com/listing/<id>` THẬT (tầng snippet) vào khối B8 mỗi ngày — vì Desktop `verify_listings.py` tự nhặt URL từ chính daily.json. Không gieo = Desktop không có đích = số live mãi cũ. Đã chứng minh chạy: 05/08 gieo 5 URL → Desktop quét 5/5 live. | **L29** |
| 4 | **Rào push git-proxy**: 403 "not in authorized repository set" = lỗi môi trường, KHÔNG phải PAT. Không retry spam; commit local + xuất git bundle/file + notify 1 lần kèm cách fix (thêm repo vào authorized sources). Fallback vận hành: Cloud dựng file → Desktop push. | **L30** |
| 5 | Health object mở rộng: `method_fix`, `us_baseline_file`; anchor >7 ngày hạ "lịch sử"; metrics.jsonl mỗi ngày đúng 1 dòng (đè dòng cùng ngày, không nhân đôi). | L13/L8 |
| 6 | **Điểm hụt hôm nay cần nhớ**: run tương tác đã bỏ qua Luật 20 (sinh `<project>-accounts-daily.json`) → bản tin Accounts phải chạy thuần action Hub. Routine 04:30 PHẢI sinh đủ CẢ daily.json market + accounts-daily.json. | L20 |

### A2. Tầng DESKTOP (local-verify)
| # | Cải tiến / bài học |
|---|---|
| 1 | `verify_listings.py` ĐÃ CHỨNG MINH end-to-end (5/5 listing live, ghi foxera-live.json, tự commit). Chạy CN hằng tuần; giữa tuần chạy tay khi Cloud gieo cụm mới. |
| 2 | **Khoá locale TRƯỚC khi quét**: Chromium profile phải Region=United States · Currency=USD (bài 05/08: listing 4353297211 trả giá VND → price=None; review count vẫn đúng, giá thì mất). Script đã tự cảnh báo — làm theo hướng dẫn nó in ra rồi quét lại. |
| 3 | Quy tắc git ở Desktop: luôn `git pull` TRƯỚC khi push (tránh đụng pc-fetch 06:45); `git add <tên file cụ thể>` — KHÔNG `git add -A` (bài commit nhầm foxera-update.bundle); không gõ nguyên chữ mẫu `<thư mục>`/`/đường-dẫn/` trong lệnh. |
| 4 | Desktop là MẮT DUY NHẤT (browser thật) cho: listing rv, giá, shop sales/rating/listings (`verify_shops.py`), vì Cloud bị PROVENANCE_REQUIRED và GAS bị Etsy 429 vĩnh viễn. |

### A3. Tầng GS (Apps Script — 3 file)
| File | Version | Sửa gì |
|---|---|---|
| Etsy - Daily Market Research | **v4** | ① Thêm fxSendBlock8/9/10 + trigger 07:45/08:00/08:15 (B8/B9/B10 trước đây CHƯA TỪNG lên Telegram); ② cờ `FX_WARNED` — cảnh báo stale 1 lần/ngày (hết cảnh báo kép 05:45+06:00); ③ cờ `FX_HEADER_SENT` — block đầu tiên thấy data tươi tự gửi header (hết header mồ côi khi file tươi giữa chuỗi); ④ token đọc Script Property `PT_TOKEN`/`PT_CHAT` trước, fallback hằng số. |
| AccountsTelegram | **v5.4** | ① `accTg_splitPart_` cắt mục quá 3900 theo ranh giới dòng (trước đây 1 mục dài → Telegram 400 → MẤT TIN im lặng; hàm chunk cũ là dead code đã xoá); ② `accTg_send_` retry 429 (đọc retry_after) + backoff 5xx + fallback plain-text; ③ `accTg_sign_` — Δ âm in '-3' thay vì '+-3' (listing giảm do delist). |
| Hub (Order Tracking) | **patch v2.32.5-p1** (file MỚI, không đè file chính 3330 dòng) | Override `etsyUspsSync` trigger-safe: `getUi()` bọc try/catch (nguyên nhân trigger 4h lỗi 100% — getUi throw trong headless; bài đã fix cho 17track v2.16.2 nhưng USPS bị sót). Kèm `etsyUspsCheck()` chẩn đoán headless-safe. **Quyết định vận hành: dùng 17track trả phí (phủ mọi carrier) → USPS API thừa → XÓA trigger etsyUspsSync** (nếu ai chạy lại etsyInstallTriggers nó tự cài lại — xóa lại, patch chống crash). |
| Hub — TODO trong FILE CHÍNH (phiên Hub xử) | | (a) `sellerTop` đếm đơn toàn-lịch-sử kể cả người ĐÃ NGHỈ → che account vô chủ khỏi ⏳ CHỜ PHÂN CÔNG; sửa: cửa sổ 90d + loại SELLER_LEFT. (b) HAI thang Likert cùng tồn tại: Hub 90/75/55/30 ≠ Luật 21 (80/60/40/25 + trừ-band) → chọn 1 (đề xuất Hub thắng theo 'một đồng hồ'), sửa văn bản còn lại. |

---

## PHẦN B — 12 NGUYÊN TẮC NHÂN BẢN (rút từ toàn bộ bài học, áp cho MỌI dự án)

1. **MỘT ĐỒNG HỒ**: mỗi quyết định có đúng 1 nguồn chân lý (action = Hub rule-engine; số sàn = Desktop browser; đề xuất Cloud = tham khảo, stale >26h thì bỏ). Không trộn 2 nhịp data.
2. **CHỐT CHẶN STALE**: GAS so `data.date` với hôm nay (TZ Bangkok); cũ → 1 cảnh báo/ngày (cờ property), KHÔNG đăng bản cũ đội lốt mới. Header dùng cờ riêng để không mồ côi.
3. **PHÂN TẦNG PROVENANCE mọi con số**: live (browser thật) / snippet (search) / mốc dd/mm (carry) / tham khảo SEO / v-meta (audience). Số >7 ngày tự hạ "lịch sử".
4. **VELOCITY = HIỆU COUNTER giữa 2 lần quét** (sales_t − sales_t-1), không phải cảm giác; cần ≥2 mốc mới có Δ, ≥3 ngày mới kết luận xu hướng.
5. **MẪU SỐ TRƯỚC, PHÁN QUYẾT SAU** (bài design-age cohort): sell-through chỉ tính trên design ≥30d; tỷ lệ sống chỉ so trên cohort first-sale. Không so bảng gộp có account 0 đơn.
6. **TRIGGER-SAFE**: mọi hàm gắn time-trigger phải bọc `try{ui=getUi()}catch{ui=null}`, dùng Logger khi headless, LockService khi ghi sheet. (2 lần dính: 17track v2.16.2, USPS hôm nay.)
7. **TELEGRAM KHÔNG MẤT TIN**: cắt theo ranh giới dòng ≤3900 (không cắt giữa thẻ HTML), retry 429 theo retry_after, 5xx backoff, HTML hỏng → fallback plain-text.
8. **HỢP ĐỒNG API GIỮA FILE GS**: file phụ gọi hàm public (`accScorecardJSON()`), KHÔNG parse sheet; phân loại trên field chuẩn (`regStatus`), KHÔNG regex chuỗi thô (`shopStatus`) — bài '0 SUS NEW'. Namespace prefix riêng từng file (etsy-/accTg-/fx-), override chỉ khi CÓ CHỦ ĐÍCH + ghi rõ điều kiện xoá.
9. **MERGE ORDER dữ liệu sàn**: registry user (chân lý SUS) > live-json (browser) > GAS fetch; fetch lỗi KHÔNG được đè record tốt cũ (bài E1/E26); wave = diff 2 lần quét liên tiếp (anti-flap), tách "chết mới" vs "cửa kháng cáo đóng".
10. **ĐO CẦU META đúng hệ**: chỉ estimate REACH US so hàng-ngang; search_interests chỉ để lấy id; disambiguation phải loại; audience ≠ doanh số.
11. **SECRETS**: token/key vào Script Properties (PT_TOKEN, TG_BOT_TOKEN, TRELLO_*, TRACK17_TOKEN), KHÔNG hard-code; file text đã gửi ra ngoài chứa token = coi như lộ → rotate.
12. **TỰ CHỨNG MINH TRƯỚC KHI NHÂN BẢN**: mỗi tầng có hàm test không-gửi (`fxTestRead`, `accTgTest`, `etsyUspsCheck`) — chạy đủ 3 và xanh rồi mới clone sang dự án mới.

---

## PHẦN C — CHECKLIST NHÂN BẢN CHO 1 DỰ ÁN MỚI `<proj>` (~1 buổi)

### C1. Repo (dùng chung foxera-daily hoặc repo riêng)
- [ ] Tạo `<proj>-daily.json` (khung `{date, locale, health, blocks{B1..B10}}`) + `<proj>-metrics.jsonl` + `<proj>-meta-us-baseline.json` (copy cấu trúc foxera, thay interest theo niche từ `meta-interest-library.json`, thiếu thì search id mới theo L27).
- [ ] Routine cloud: copy `foxera-routine-v5.1.md` chain (v4→v5→v5.1) đổi tên file/slug; brand-KB riêng của dự án (bắt buộc — bot phải bám ADN dự án, không nói chung chung).
- [ ] Scheduled task 04:30 BKK; **thêm repo vào authorized sources** của task (không thì dính L30 — Cloud không push được, phải push tay).

### C2. Desktop
- [ ] Thêm `<proj>: "<proj>-daily.json"` vào dict `PROJECTS` trong `local-verify/verify_listings.py` (gerbera/genusfaith/gritfell/foxjob đã có sẵn).
- [ ] Chromium profile khoá Region US · Currency USD (kiểm bằng 1 lần quét: giá phải ra USD).
- [ ] Lịch CN 09:00: `git pull && python local-verify/verify_listings.py <proj> && git push`.
- [ ] Chạy thử 1 lần NGAY sau khi Cloud gieo B8 đầu tiên — xác nhận `<proj>-live.json` ra số.

### C3. GS (project Apps Script riêng cho dự án, hoặc thêm file vào project chung)
- [ ] Copy `Etsy_Daily_Market_Research_v4.gs` → đổi: `RAW_URL` (trỏ `<proj>-daily.json`), tên header 🦊, Script Properties `PT_TOKEN`/`PT_CHAT` (bot + group riêng). GIỮ NGUYÊN: stale-gate, cờ 1-lần/ngày, 10 block, chunk/retry/fallback.
- [ ] Nếu dự án có hệ account: copy `AccountsTelegram_v5.4.gs` + Hub scorecard (cần `accScorecardJSON` phía Hub của dự án); set `TG_BOT_TOKEN`/`TG_CHAT_ACCOUNTS`.
- [ ] Chạy `installDailyTriggers` (11 trigger: health 05:45 + B1..B10). KHÔNG cài trigger USPS nếu dùng 17track trả phí.
- [ ] Test 3 bước: `fxTestRead` (FRESH + đủ B1:..B10:) → `accTgTest` (không tin nào VƯỢT 3900) → gửi thử 1 khối vào group test.

### C4. Nghiệm thu (ngày đầu tiên chạy thật)
- [ ] 04:30 Cloud push (kiểm raw GitHub date = hôm nay) → 05:45 không cảnh báo → 06:00–08:15 đủ 10 khối, 1 header.
- [ ] Trang Kích hoạt: 0% lỗi toàn bộ trigger.
- [ ] B8 có 3–8 URL listing thật; CN Desktop quét ra `<proj>-live.json`; sáng hôm sau anchor lên tầng "live", health `ok`.

---

## PHẦN D — VIỆC CÒN MỞ CỦA FOXERA (theo dõi)
1. Thêm `GerberaPrints/foxera-daily` vào authorized sources của scheduled task 04:30 → Cloud tự push, hết cảnh báo stale mỗi sáng + hết push tay.
2. Routine 04:30 sinh lại `foxera-accounts-daily.json` mỗi run (L20) — hôm nay bị hụt.
3. Phiên Hub vá 2 mục trong file chính: sellerTop 90d + thống nhất thang Likert; xong thì XÓA `Etsy - Hub Patch.gs`.
4. Rotate PT_TOKEN (đã lộ trong file text) → điền Script Property; kiểm `TG_BOT_TOKEN` có dùng chung token không.
5. Desktop: khoá USD rồi quét lại listing 4353297211 (Ghost Cat 8051 rv — winner cụm, đang thiếu giá).
6. Mở rộng baseline US: thêm dần Grandparents, Coffee/Autumn, Romance, National Parks, Coastal, Fishing, Hiking (theo `next_to_add`).
