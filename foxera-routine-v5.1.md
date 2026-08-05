# FoxEra Daily Research — ROUTINE v5.1 (ADDENDUM cho v5)
> Bot ĐỌC file này SAU v4 + v5. v5.1 GIỮ TOÀN BỘ v4+v5. Khi mâu thuẫn: **v5.1 > v5 > v4 > trigger prompt.**
> Lý do ra đời (05/08/2026): user yêu cầu review + sửa lỗi + nâng cấp data. Audit phát hiện 1 lỗi method + 1 điểm mù cầu nối 2 luồng + 1 rào push.

---

## LUẬT 27 — CHUẨN ĐO CẦU META (sửa lỗi ratio US/global) — BẮT BUỘC
**Sự thật kỹ thuật:** `search_interests.audience_size` (số "global") và `estimate_audience_size` (REACH) là **2 hệ đo KHÁC NHAU**, KHÔNG so tỷ lệ được.
Bằng chứng 05/08: Pickleball global-search = 1.03–1.21M nhưng US-reach = 14.0–16.5M → US > global là **vô lý** ⇒ `search_interests.audience_size` deprecated/unreliable.

Quy tắc:
1. **Thước cầu chuẩn = `estimate_audience_size`**, `optimization_goal=REACH`, `geo=US`, `age 18-65`, 1 interest trong `flexible_spec`. Các dòng trong bảng này so **hàng-ngang** với nhau được.
2. **CẤM** viết "US ≈ X% global" hay bất kỳ ratio nào giữa 2 hệ. `search_interests.audience_size` chỉ dùng để **lấy interest_id**, không trình như số cầu.
3. Mọi số REACH ghi kèm `verified_at` + nhãn "v-meta REACH US" (tầng live theo kỷ luật #10/luật 16).
4. Interest bị **disambiguation** (Cats=nhạc, Back-to-School=phim, Nurse=nursery, Dog=band) → gắn ⚠️ hoặc BỎ; ghi vào `no_clean_interest` trong baseline. KHÔNG dùng số disambig như tệp buyer sạch.

## LUẬT 28 — BASELINE CẦU US (`foxera-meta-us-baseline.json`) = data asset mới, diff mỗi ngày
- File chứa **interest-ID map** (8 niche seed 05/08) + `us_reach_*` + `global_search_*` (flag) + `verified_at` + `method`.
- **Bước RESEARCH thêm mỗi ngày:** đọc baseline → gọi lại `estimate_audience_size` cho từng `meta_id` → cập nhật `us_reach_*` + `last_run`, so **Δ vs ngày trước** (▲/▼/▬) → đưa vào B1/B9. KHÔNG search lại tên (đã có id) trừ khi thêm niche mới từ `next_ids_to_add`.
- Mở rộng dần: mỗi ngày thêm ≤2 interest từ `next_ids_to_add` (Grandparents, Coffee/Autumn, Romance, National Parks, Coastal, Running, Pilates) → bảng cầu ngày càng sâu rộng.
- Meta offline trong run → carry baseline cũ, ghi "Meta offline, carry (mốc dd/mm)". KHÔNG treo.

## LUẬT 29 — CẦU NỐI 2 LUỒNG QUA B8 (Cloud gieo đích → Desktop gặt)
Bối cảnh: `local-verify/verify_listings.py` **tự nhặt mọi `https://www.etsy.com/listing/<id>` trong daily.json (ưu tiên B8)**. Nếu Cloud không để URL listing nào → Desktop KHÔNG có đích → `foxera-live.json` mãi cũ.
Quy tắc:
1. Mỗi ngày, B8 PHẢI chứa **3–8 URL listing THẬT** (lấy từ WebSearch snippet, là listing có thật) của cụm đang nóng — nhãn rõ **tầng snippet, CHƯA verify rv**, KHÔNG bịa số.
2. Chỉ chèn `/listing/<id>` khi id đến từ kết quả search THẬT (không tự chế id). Không có id thật → dùng market link + ghi "chưa có đích listing hôm nay".
3. Desktop CN chạy `verify_listings.py foxera` → mở đúng các URL này → ghi `foxera-live.json` (listing rv thật) → Cloud hôm sau nâng anchor snippet→LIVE, reset anchor_age.
⇒ Hai luồng khớp qua FILE: Cloud = người phát hiện + gieo đích; Desktop = con mắt mở listing thật.

## LUẬT 30 — RÀO PUSH GIT-PROXY (môi trường Cloud)
Triệu chứng 05/08: `git push` → 403 "GerberaPrints/foxera-daily is not in this session's authorized repository set, so the proxy will not inject a credential". Đây **KHÔNG phải lỗi PAT** — là git-proxy của session chưa cho repo vào "authorized sources".
Quy tắc khi gặp:
1. KHÔNG spam retry, KHÔNG đổ lỗi PAT trong alert. Ghi rõ nguyên nhân proxy/authorized-set.
2. Vẫn `commit` local đầy đủ; xuất **git bundle** (`git bundle create foxera-update.bundle <range>`) + deliver file để user áp thủ công.
3. PushNotification 1 lần với hướng dẫn fix: *thêm GerberaPrints/foxera-daily vào authorized repository sources của scheduled task* (hoặc chạy push từ môi trường đã authorize).
4. Nếu môi trường scheduled-task THẬT đã authorize (lịch sử push chạy được) → rào này chỉ xuất hiện ở session interactive; vẫn giao file cho user.

## SELF-CHECK v5.1 (thêm vào self-check trước push)
- (c) B1/B9 KHÔNG còn câu ratio US/global; số cầu là REACH US có `verified_at`.
- (d) B8 có ≥3 URL `/listing/` thật (đích Desktop) HOẶC ghi rõ "chưa có đích".
- (e) `foxera-meta-us-baseline.json` `last_run` = hôm nay nếu Meta chạy; có Δ nếu ≥2 ngày.
- (f) Nếu push 403 proxy → có bundle + đã notify đúng nguyên nhân.

## BƯỚC GHI/PUSH (đè v5 mục cập nhật)
- `git add -A` gồm: foxera-daily.json · foxera-metrics.jsonl · foxera-meta-us-baseline.json · (routine files nếu sửa).
- Bước 10 KẾT: nêu B7 + B9 + B10 + **US-baseline last_run** + health + trạng thái push (ok / 403-proxy→bundle).
