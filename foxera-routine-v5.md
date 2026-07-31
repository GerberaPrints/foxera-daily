# FoxEra Daily Research — ROUTINE v5 (ADDENDUM cho v4)
> Bot ĐỌC file này SAU khi đọc `foxera-routine-v4.md`. v5 GIỮ TOÀN BỘ v4 (luật 1–16, nguồn A–D, khối B1..B9). v5 chỉ THÊM: **luật 17 (CẦN CHÚ Ý cuối mỗi khối)** + **luật 18 (độ sớm tín hiệu)** + **Khối B10 — Trend-to-Design Arbitrage**. Khi mâu thuẫn: **v5 > v4 > trigger prompt**.
>
> **Lý do ra đời v5 (28/07/2026):** user quan sát các nền tảng khác đang "lấy trend TikTok → đẩy sang FB/Google/sàn". Audit cho thấy 2 điểm mù:
> (1) Routine đang bắt trend ở tầng **listicle/aggregator** — mà khi một SP đã lọt "Top 15 TikTok products 2026" thì **cửa sổ arbitrage đã đóng**. Cần bắt tín hiệu **TRƯỚC** listicle.
> (2) Routine mới chỉ nghĩ theo **trend → product** (sai sân với FoxEra: đua tốc độ/giá với dropshipper). Sân đúng là **trend → DESIGN**: lấy *aesthetic/cảm xúc* đang lên rồi diễn đạt bằng ADN thêu + personalization — thứ dropshipper không copy nhanh được.

---

## LUẬT 17 — "CẦN CHÚ Ý" BẮT BUỘC CUỐI MỖI KHỐI (áp cho B1..B10, kể cả khối ⏸)

Mỗi khối, sau `👉 Chốt:` và trước `🔗 Nguồn:`, PHẢI có mục tổng hợp:

```
📌 <b>CẦN CHÚ Ý:</b>
• <i>Số liệu:</i> {tầng provenance của MỌI số trong khối — live / snippet / mốc dd/mm / tham khảo SEO / v-meta; nếu khối không có số → ghi "định tính, không số"}
• <i>Rủi ro:</i> {guardrail IP/TM, cảnh báo hiểu sai, giới hạn dữ liệu — nếu không có → "không có cờ"}
• <i>Việc cần làm:</i> {1–2 hành động cụ thể, có chủ thể}
```

Quy tắc:
- Khối `⏸ Không đổi` VẪN phải có `📌 CẦN CHÚ Ý` (rút gọn 1–2 gạch) — KHÔNG được bỏ trống.
- `CẦN CHÚ Ý` là **tóm tắt**, KHÔNG lặp nguyên văn thân khối; nhân sự đọc riêng phần này phải hiểu được rủi ro + việc cần làm mà không đọc phần trên.
- KHÔNG bịa số ở đây. Nếu khối dùng số cũ → phải ghi rõ "lịch sử, mốc dd/mm" trong gạch *Số liệu*.
- Mục này nằm TRONG cùng tin HTML của khối (vẫn giữ giới hạn <3900 ký tự).

## LUẬT 18 — ĐỘ SỚM TÍN HIỆU (signal earliness) — chống "bắt trend lúc đã tàn"

Mọi tín hiệu trend từ nay PHẢI gắn 1 nhãn độ sớm:
- `🌱 EARLY` — nguồn **not-yet-trending / dự báo nền tảng** (Pinterest Predicts, Etsy Trend Report, TikTok Creative Center rising) → cửa sổ build còn rộng. **ƯU TIÊN CAO NHẤT.**
- `📈 RISING` — đã có listing/slug/hashtag thành hình nhưng chưa bão hoà; còn khe cho bản thêu/personalize.
- `🔥 PEAK` — đã lên listicle "top products", nhiều seller, giá bắt đầu đua → **CHỈ vào nếu có góc khác biệt rõ**, không vào bằng SP generic.
- `🪦 CLOSED` — listicle nhắc lại nhiều lần, retail lớn đã ôm → KHÔNG đề xuất build mới, chỉ ghi để tránh.

Hệ quả: **listicle "Top N TikTok/Etsy products" KHÔNG được dùng làm nguồn phát hiện trend**, chỉ dùng để xác nhận một trend đã sang `🔥/🪦`. Nguồn phát hiện phải là sơ cấp/nền tảng.

---

## KHỐI B10 — TREND-TO-DESIGN ARBITRAGE (MỚI, chạy mỗi ngày)

**Mục tiêu:** biến aesthetic đang lên thành **ý tưởng thêu build được**, thay vì chạy theo món hàng viral.

**Nguồn phát hiện (ưu tiên giảm dần):**
1. **Pinterest Predicts / Pinterest Trends** — `business.pinterest.com/pinterest-predicts/` (nền tảng tự công bố search-growth, khung "not-yet-trending" = 🌱 EARLY, giá trị nhất).
2. **Etsy Seller Handbook Trend Report** — theme Etsy tự đặt tên (World of Whimsy, Dear Diary, Gothic Romance, Botanical Bride…).
3. **v-news** báo/case-study có số (luật 16).
4. TikTok discover/hashtag = `v-discover`, chỉ định hướng.
5. ❌ CẤM dùng listicle aggregator làm nguồn phát hiện (luật 18).

**Mỗi ngày chọn 2–3 aesthetic**, mỗi cái chấm **4 CỔNG** (gate) trước khi đề xuất:

| Cổng | Câu hỏi | Đạt = ✅ |
|---|---|---|
| **G1 THÊU ĐƯỢC** | Silhouette có nhận diện khi thu nhỏ, ≤5 màu chỉ, không cần gradient? | ✅/⚠️/❌ |
| **G2 PERSONALIZE** | Có chỗ gắn tên/năm/nghề/thú cưng tự nhiên? | ✅/⚠️/❌ |
| **G3 BẬC PHỤ KIỆN** | Ra được ở tầng **không lo size** (patch/cap/tote/beanie/bandana/bookmark)? | ✅/⚠️/❌ |
| **G4 IP SẠCH** | Không chạm brand/nhân vật/lyrics; tên collection qua được TESS? | ✅/⚠️/❌ |

**Chốt cổng:** 4✅ = BUILD NGAY · 3✅ = SMALL-TEST · ≤2✅ = chỉ ghi radar, KHÔNG build.

> **Vì sao G3 quan trọng:** nguồn ngành 2026 ghi nhận trên TikTok Shop **fashion accessories thắng full apparel** (ít rủi ro size/return) và tiêu chí số một là *visually demonstrable* — đúng thế mạnh video "texture-in-motion" của thêu (Brand KB mục 6). ⇒ **Sweatshirt = ván Etsy; phụ kiện thêu = ván TikTok/FB/Google.** B10 luôn đẩy ý tưởng xuống bậc phụ kiện trước.

**Đầu ra bắt buộc mỗi aesthetic:**
- 1 dòng VIBE + emoji + nhãn độ sớm (luật 18) + nguồn.
- Bảng 4 cổng (dạng gạch, có ✅/⚠️/❌) + chốt cổng.
- 🎯 **1 ý tưởng phụ kiện listing-ready**: Title theo cấu trúc KB `[Core Product]+[Subject]+[Personalization]+[Recipient/Occasion]` + 3 tag phân vai + 1 dòng personalization.
- 🎬 **1 angle video 5–15s texture-in-motion** (dùng chung cho TikTok/Reels/FB ads) — mô tả cảnh, KHÔNG chép clip đối thủ.
- ⚠️ Guardrail IP nếu chạm (luật 4d v3 + KB mục 8).
- Kết khối: `👉 Chốt:` → `📌 CẦN CHÚ Ý:` (luật 17) → `🔗 Nguồn:`.

**Ngày yên:** `⏸ <b>Khối 10 — Trend-to-Design Arbitrage</b>\nKhông đổi so với hôm qua (dd/mm).` + vẫn có `📌 CẦN CHÚ Ý` rút gọn.

**Chống lạm phát (nối luật 14):** một aesthetic chỉ được làm *trọng tâm B10* **1 lần**; ngày sau hạ 1 dòng "carry (mốc dd/mm)" và phải thay aesthetic mới. Nếu hết tín hiệu mới → đào tiếp danh sách Pinterest Predicts chưa dùng, KHÔNG lặp lại cái cũ to dần.

---

## KHO PINTEREST PREDICTS 2026 (đã map sang ADN FoxEra — dùng dần, mốc 28/07/2026)
> Nguồn sơ cấp: <https://business.pinterest.com/pinterest-predicts/> · % = **Pinterest tự công bố** (platform search data), khung *dự báo/not-yet-trending* ⇒ tầng **🌱 EARLY, chỉ số định hướng — KHÔNG phải số bán đã kiểm chứng**.

| Trend | Số Pinterest công bố | Map vào FoxEra |
|---|---|---|
| **Brooched** | maximalist accessories +105% · men's suit brooch +90% · family heirloom jewelry +45% | **PATCH/PIN tier** — trúng bậc entry của product ladder; mở tệp **NAM** (hobby-dad B6 đang bỏ ngỏ) |
| **Vamp Romantic** | dark romantic makeup +160% · goth coffin nails +180% | Hội tụ với **Gothic Romance (Etsy tự đặt tên, KB mục 5)** + **Gothmas** → skeleton/raven/black-cat |
| **Poetcore** | poetcore +75% · satchel +85% · capes +65% | **Book Lover core** + bookmark vải / book sleeve; librarian raven, dachshund reading |
| **Wilderkind** | animal-inspired outfit +90% · deer aesthetic +55% | **Toàn bộ dàn nhân vật** (goose/frog/cat/raccoon/fox/bear/highland cow) |
| **Mystic Outlands** | Scottish Highlands +465% · Faroe +95% | National Parks/outdoor heritage (KB mở rộng) + **highland cow** đã có trong cast |
| **Pen Pals** | snail mail gifts +110% · cute stamps +105% | **National Park Postage** collection (KB) — thêu tem/dấu bưu điện; bookmark, journal sleeve |
| **Throwback Kid** | nostalgia toys +225% · upcycled baby clothes +95% | baby sweatshirt + gift set bà-cháu (Intergenerational KB) |
| **Laced Up** | lace bandana +150% · lace belt +55% | **pet bandana** + viền ren thêu; Botanical Bride |
| **Cool Blue** | glacier aesthetic +35% · frosted makeup +150% | bảng màu chỉ mùa đông; nối Gothmas/coastal |

---

## CẬP NHẬT BƯỚC GHI/PUSH (đè lên v4 mục F)
- JSON `blocks` GIỮ ĐỦ **"B1".."B10"** (đừng rớt B10) + khoá `health`.
- SELF-CHECK trước push, thêm 2 mục: (a) **mọi khối B1..B10 có `📌 CẦN CHÚ Ý`**; (b) **mọi tín hiệu trend có nhãn độ sớm** (🌱/📈/🔥/🪦).
- Metrics jsonl: thêm niche B10 dạng `{"niche":"trend_to_design_<slug>","metric":"gate_score","signal":"pinterest_predicts_<trend>_earliness_EARLY_gates_4","anchors":[]}`.
- Bước 10 KẾT: nêu rõ **B7 + B9 + B10 + health status**.

---

## LUẬT 19 — CẦU NỐI LOCAL-VERIFY (thêm 29/07/2026, kiến trúc 2 luồng)

Hệ chạy 2 LUỒNG tách biệt, hợp đồng = file JSON trong cùng repo (xem `local-verify/README.md`):
- **Luồng CLOUD** (routine này, 04:30): snippet + Meta interest + trend → daily.json → push.
- **Luồng DESKTOP** (Python `local-verify/verify_listings.py`, CN hằng tuần trên máy user): mở listing Etsy bằng browser thật → ghi `local-verify/foxera-live.json`.

Bổ sung BƯỚC 3 (sau khi clone): `cat /tmp/fxrepo/local-verify/foxera-live.json` (nếu tồn tại).
- `verified_at ≤ 7 ngày` → dùng `reviews_listing`/`price` làm anchor tầng **"live (local-verify dd/mm)"** — đây là tầng (a) kỷ luật #10; `anchor_age_days` = số ngày từ `verified_at`; health có thể lên `ok`.
- `verified_at > 7 ngày` hoặc file vắng → như cũ (anchor "lịch sử"), ghi rõ "local-verify chưa chạy N ngày".
- Chỉ nhận record `status == "live"`; record captcha/error KHÔNG được đếm. KHÔNG bịa số.
- Velocity: so `reviews_listing` giữa 2 lần local-verify liên tiếp (▲ +N/tuần) — đây là nguồn velocity THẬT duy nhất của hệ.

---

## LUẬT 20 — ACCOUNT SCORING DAILY (thêm 31/07/2026 — chấm điểm ~200 store, đẩy Group riêng)

Mỗi run 04:30, NGOÀI foxera-daily.json, PHẢI sinh thêm **foxera-accounts-daily.json**:

1. ĐỌC: `foxera-accounts.json` (roster + rubric) · `local-verify/foxera-shops-live.json` (nếu có, tầng live khi verified_at ≤7 ngày) · số nội bộ nếu có trong repo/Sheet-export.
2. CHẤM ĐIỂM /100 theo rubric trong roster (status 30 · rating 25 · velocity 20 · listing/pricing 15 · loss 10). Thiếu dữ liệu → dùng mức "unknown" của rubric, KHÔNG bịa.
3. XẾP TIER: A ≥60 (đang chạy) · B 30-59 (dormant/theo dõi) · C <30 hoặc suspended.
4. GHI blocks B1/B2/B3 (HTML Telegram <3900 ký tự, chuẩn luật 17 CẦN CHÚ Ý):
   - B1 = tier A: mỗi store 2-3 dòng (điểm, Δ so hôm qua, 1 dòng XỬ LÝ). Kèm tin phụ "cờ định giá" nếu có.
   - B2 = tier B: gom gọn, chỉ nêu chi tiết store CÓ BIẾN ĐỘNG (điểm ±5, rating ±0.1, trạng thái đổi).
   - B3 = tier C: mặc định 1 dòng "0 shop mới đình chỉ ✅". CÓ shop mới rơi vào C → 🔴 ALERT chi tiết + PushNotification cho user.
5. GHI mảng "scores" đầy đủ mọi account (machine-readable, làm mốc so Δ ngày sau) + "summary".
6. VELOCITY/Δ: so scores hôm nay vs foxera-accounts-daily.json hôm trước (đọc trước khi ghi đè). Shop tier A rớt ≥10đ hoặc rating giảm ≥0.1 → nêu đầu B1.
7. Khi roster mở rộng (~200 account): B1 giữ chi tiết tối đa 15 store điểm cao nhất + mọi store có alert; B2/B3 gom nhóm + đếm; mỗi tin <3900 ký tự, tối đa ~10 tin.
8. shops-live.json verified_at >7 ngày → hạ tầng dữ liệu xuống "mốc dd/mm" trong CẦN CHÚ Ý + nhắc user chạy `python local-verify/verify_shops.py`.
9. GIT: `git add -A` đã bao gồm file này (bước 8 v4). GAS multibot đọc qua project FOXACC (xem hướng dẫn trong etsy-multibot-gas-v1.gs / README).

### LUẬT 20b — NGUỒN VELOCITY TỪ GOOGLE SHEET (31/07/2026)
Sheet CRM: 1axz9lV0q21574wF_8A2TN5wn7U0bkNKyBCjVjiZRItc (tab Orders, mỗi đơn gắn mã E<code>-<shop>). Nếu Drive MCP CÓ trong run: đọc Orders, đếm đơn/store 7 ngày gần nhất → điểm velocity THẬT + cập nhật summary. Drive MCP VẮNG (run headless không auth) → dùng velocity của foxera-accounts-daily.json hôm trước, ghi "velocity carry (mốc dd/mm)" trong CẦN CHÚ Ý — KHÔNG treo, KHÔNG bịa.
