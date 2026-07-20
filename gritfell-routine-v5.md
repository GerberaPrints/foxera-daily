# GritFell Daily Updater — QUY TRÌNH v5 (Handoff-powered)
**Lập 20/07/2026.** v5 = v4 + hợp nhất bộ **GritFell Claude Desktop Handoff v1.0** (thư mục `gritfell-handoff/` trong repo — bot ĐỌC mỗi lần chạy, nên prompt gọn mà tri thức sâu).

## Thay đổi lớn so với v4

| # | Thay đổi | Nguồn |
|---|---|---|
| 1 | **Định vị lại brand center**: accessible-premium outdoor LIFESTYLE identity — fishing + hunting + waterfowl + camp/trail/mountain + birding + quiet place. KHÔNG chỉ fishing+hunting. Persona kép: **Tom** (wearer 45–65) + **Megan** (gift buyer). | 01_MASTER_CONTEXT (INTERNAL_LOCKED) |
| 2 | **Bộ đối thủ 3 tier mới**: T1 BURLEBO · Poncho · Marsh Wear · Duck Camp · AFTCO · Huk — T2 Howler · Free Fly · Drake — T3 SITKA · Tom Beckbe. (Thay list cũ Pelagic/Salt Life/Mossy Oak/Realtree/GameGuard/King's Camo — chỉ còn tham chiếu phụ.) | 02_MARKET_INTEL |
| 3 | **Nhãn bằng chứng 7 loại** (INTERNAL_LOCKED / INTERNAL_OBSERVED / INTERNAL_HYPOTHESIS / OBSERVED_CURRENT / INFERRED / STALE_RISK / UNVERIFIED) + **điểm evidence 0–11**; khuyến nghị SP cần ≥6. Hợp nhất với provenance 4 tầng cũ. | 04_ARCHITECTURE |
| 4 | **Lịch freshness theo loại data**: creative = hằng ngày · giá/promo/shipping/SP mới/bestseller = tuần (thứ 2 sweep) · claims/material/review = tháng (ngày 1) · market report/positioning = quý. Bot tự biết hôm nay quét gì. | 04_ARCHITECTURE |
| 5 | **Kỷ luật cơ hội**: mọi ý 🟢 phải đủ DATA + PRECEDENT + DIFFERENTIATION, kèm brand-filter PASS/REJECT/REVIEW, opportunity score 1–5, kill criteria. Thiếu bằng chứng → ghi "insufficient evidence", KHÔNG bịa ý tưởng tự tin. | 04 + 05 |
| 6 | **Brand filter cứng khi gợi ý design/hook**: từ chối patriotic/RWB/1776 core, Western/Texana mặc định, pun-heavy, cute whimsy, fake technical claims, camo-imitation. Sub-niche phải CỤ THỂ ("drake mallard banking into flooded timber", không phải "duck"). | 01 §8 |
| 7 | **Cổng duyệt người**: đổi giá core, đổi offer permanent (B2G1), claim kỹ thuật, cause-product, chi ads → bot chỉ ĐỀ XUẤT + gắn nhãn "CẦN NGƯỜI DUYỆT", không tự kết luận thành việc phải làm. | 08 §6 |
| 8 | **Baseline giá-vị thế 20/07/2026** ghi vào B6 + metrics (bảng dưới) — nền delta cho velocity tuần. | 02 §4 + 07_SOURCE_REGISTRY |
| 9 | **Metrics jsonl** thêm `evidence_label` + `observed_at` từng anchor. | 06_DATA_SCHEMA |

## Bản đồ khối B1–B7 (GAS v2 giữ nguyên — không cần sửa GAS)

| Khối | Nội dung v5 |
|---|---|
| B1 | Keyword & lịch mùa vụ (cá + săn + camp/trail/national park + **lịch GIFT**: Father's Day, Christmas, opener-gift Aug-Sep) + change-log hôm nay |
| B2 | Deep-Dive 1-2 cơ hội: DATA+PRECEDENT+DIFFERENTIATION, dòng "Cạnh tranh:", opportunity score, kill criteria |
| B3 | Idea Bank (kho): 6 lane sáng tạo khoá — waterfowl-in-flight, naturalist species, tonal place, mountain/place identity, pursuit ritual, dog+hunter — + lane chưa khai thác (object/gear hero, big-game action) |
| B4 | Format SP mới nổi + **học selling/offer** (cart ladder Poncho, threshold gift, bundle system) — không chỉ format vải |
| B5 | Niche/sub-niche mới (đúng luật sub-niche cụ thể) + góc Megan/gift |
| B6 | Evergreen: species map + lịch mùa + **bảng giá-vị thế 11 brand** (chỉ đổi khi biến động mạnh) |
| B7 | Ads & Hook radar (freshness DAILY): Meta Ad Library public theo brand T1/T2, trích hook→angle→proof→CTA→visual grammar (trích ngắn, không chép nguyên văn dài) |

## Baseline giá-vị thế (OBSERVED_CURRENT 20/07/2026 — re-check hằng tuần)

GritFell $34 hat / $39 short / $55 button (B2G1, ship $75+) · Huk polo $50–55 (ship $150+) · BURLEBO polo $59, button $64/$74 · Marsh Wear polo $59 (sale chọn lọc $39.99, ship $100+) · AFTCO polo $59–69 (ship $99+) · Howler ~$85 · Free Fly ~$78–88 (ship $150+) · Poncho ~$89.95–99.95 (free ship + gift ladder) · Duck Camp shirt $99–109 (15% first order $50+) · Tom Beckbe hat ~$45–53 · SITKA premium technical.
→ Kết luận sống: GritFell rẻ hơn BURLEBO ~$9 trước promo; nguy cơ B2G1 vĩnh viễn làm brand "rẻ" thay vì "ý nghĩa" — test ladder thay thế (control B2G1 vs unlock-hat vs pursuit bundle vs threshold gift) = việc CẦN NGƯỜI DUYỆT.

## Nhịp trong ngày (không đổi)
05:30 research → 06:45 GAS health-check → 07:00–08:30 gửi B1→B7.

## Prompt v5
Nằm trong scheduled task "🎣 GritFell · ALL-IN-ONE v5 (Handoff) · 05:30". Điểm khác cấu trúc so với v4: bước 3c bot **đọc `gritfell-handoff/01` + `02` (bắt buộc), 03/08 khi cần** ngay sau khi clone — tri thức nền nằm trong repo, không phình prompt. Toàn bộ kỷ luật dữ liệu 14 điều, luật git namespace, self-check, run-summary của v4 GIỮ NGUYÊN.
