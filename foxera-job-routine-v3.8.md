# EraCloset JOB Daily Research — ROUTINE v3.8 (LỖI ĐO LƯỜNG THỨ TƯ + ĐÓNG HỒ SƠ PHÔI CHĂN)

> Đọc SAU v3.3 → v3.4 → v3.5 → v3.6 → v3.7. Ưu tiên khi mâu thuẫn: **v3.8 > v3.7 > v3.6 > v3.5 > v3.4 > v3.3 > trigger prompt**.
> v3.8 GIỮ toàn bộ luật 1–49. THÊM luật 50–52. Phạm vi hẹp: chỉ sửa những thứ mà dữ liệu live 30/07 chứng minh là sai.
>
> **Lý do ra đời (30/07/2026, run phụ 11:30 BKK):** run sáng 05:05 gate 0/6 và **tự chẩn đoán sai cơ chế gate**; run bù retry được 7/7 URL Etsy. Ba kết quả buộc phải sửa spec: (a) cơ chế gate hiểu sai suốt 3 ngày làm mất 3 phiên đo; (b) phôi chăn mà v3.7 luật 49 vừa mở hôm qua bị chính dữ liệu bác bỏ sau 24 giờ; (c) phát hiện **lỗi đo lường thứ tư** — số trong list view đổi theo slug — ngang hạng 3 lỗi gốc của v3.5.

---

## LUẬT 50 ⭐ — SỐ TRONG LIST VIEW ĐỔI THEO SLUG. GIÁ, rv VÀ Ad/organic ĐỀU KHÔNG PHẢI SỰ THẬT CỦA LISTING

Đây là **lỗi đo lường thứ tư** của dự án, cùng hạng với luật 29/30/31.

**Bằng chứng, cùng ngày 30/07/2026, cùng một phiên (nên không giải thích được bằng thời gian):**

| Listing | Slug | Giá | rv | Badge |
|---|---|---|---|---|
| Jerzees Nurse QZ (6.3k rv) | `nurse_grad_gift` | **$31.45** | 6.3k | **ORGANIC** |
| Jerzees Nurse QZ (6.3k rv) | `rn_graduation_gift` | **$29.60** | 6.3k | **Ad** |
| Jerzees Nurse QZ (6.3k rv) | `embroidered_nurse_sweatshirt` | **$29.60** | 6.3k | **Ad** |
| Embroidered Scrub Life Goose | `nurse_grad_gift` | $13.88 | **83** | **ORGANIC** |
| Embroidered Scrub Life Goose | `embroidered_nurse_sweatshirt` | $13.88 | **79** | **Ad** |

**Ba hệ quả BẮT BUỘC:**

1. **Ad/organic từ list view là thuộc tính của LẦN HIỂN THỊ, không phải của listing.** Luật 32 (watchlist chính = organic + >$28) đang dựng trên nền này. Từ nay mỗi ứng viên watchlist phải **thấy organic ở ≥2 slug**, hoặc ghi `ad: surface-only` và **không** được dùng làm bằng chứng "organic giữ giá cao".
2. **Mọi delta rv qua ngày chỉ hợp lệ nếu đo ở CÙNG một slug.** 79 vs 83 trong cùng một phiên là **tiếng ồn thuần** — nếu hai số đó rơi vào hai ngày khác nhau, bot cũ sẽ đọc thành "+4 review, đang nóng lên". Ghi slug nguồn cạnh mỗi số rv.
3. **Mọi so sánh giá cuối qua ngày cũng phải CÙNG slug.** Điều này **siết luật 30**: "≥2 điểm đo giá cuối của cùng một listing" giờ phải đọc là "**≥2 điểm đo cùng listing VÀ cùng slug**".

**Ca đã bị luật này chặn ngay hôm nay:** EMB Medical Jacket $62.90 (28/07, `nursing_school_graduation_gift`) → $51.80 (30/07, `rn_graduation_gift`) trông như giảm $11.10 và trông như đã thoả luật 30 — **nhưng hai slug khác nhau ⇒ không đủ tư cách kết luận**. Phải đo lại cùng slug.

**Anchor phải hạ xuống UNCERTAIN vì luật này:**
- 🚨 **"Teacher Est-Year $31.45 / 6.3k / organic"** — trùng khít **cả giá lẫn rv** với Jerzees Nurse QZ. Có thể trùng hợp (6.3k là số làm tròn), có thể là **misattribution**. Anchor này **đang được luật 46① dùng làm bằng chứng** ⇒ cấm dùng làm bằng chứng band cho tới khi mở trang listing (luật 47).
- 🚨 **"Navy Nurse Mockneck $56.99 organic"** (CONTEXT mục 2) — hôm nay **có badge Ad** tại `embroidered_nurse_sweatshirt` ⇒ rơi khỏi watchlist luật 32; vẫn là trần band EMB.

## LUẬT 51 — CƠ CHẾ GATE: TIMEOUT XIN QUYỀN, KHÔNG PHẢI KHUNG GIỜ. GẶP GATE THÌ **RETRY 3–4 LẦN/URL**

v3.5 luật 19 (two-phase + run bù 11:30) và ghi chú "gate theo giờ" của các run 27–30/07 đều **chẩn đoán sai**. Lỗi thật trả về là `permission request was not answered in time` = **TIMEOUT** của một cuộc đua xin quyền; phiên scheduled không có người ngồi xem nên hay timeout, **nhưng thử lại thì thông**.

**Bằng chứng 30/07:** `nurse_grad_gift` chặn 05:15 → **200 lúc 11:35**. `embroidered_retirement_blanket` chặn 05:05, 05:06 **và** 11:31 → **200 ở lần thử thứ 4**. Cùng URL, cùng phút, kết quả khác nhau. Retry cho **7/7 URL Etsy** đều thông.

**→ QUY TRÌNH TỪ NAY:**
1. Gặp gate: **retry cùng URL 3–4 lần**, xen kẽ với URL khác (fetch song song nhiều URL rồi retry cái nào fail).
2. **KHÔNG bỏ phiên sáng** và **không** coi 05:00 chỉ là "phiên xếp việc". Luật 19 vẫn giữ run bù 11:30 làm **lưới an toàn**, nhưng nó không còn là nơi duy nhất được đo.
3. Chỉ được ghi "GATE" vào metrics sau khi **đã retry ≥3 lần**.
4. **Phân biệt hai loại lỗi:** `permission … not answered in time` = timeout, **retry được**; `ROBOTS_DISALLOWED` = chặn thật, **đừng thử lại**. Đã xác nhận `amazon.com/dp/*` thuộc loại thứ hai — khớp luật 6.
5. Luật 37 (ngày 0 fetch live → báo cáo ngắn) **chỉ được áp dụng sau khi đã retry đủ**, không được dùng làm cửa thoát sớm.

## LUẬT 52 — MỐC SỰ NGHIỆP: TÁCH BA, KHÔNG PHẢI TÁCH ĐÔI (siết luật 48)

Luật 48 chia đôi *tốt nghiệp = đồ mặc* vs *nghỉ hưu = vật kỷ niệm*. Phần đối lập **đúng**, nhưng nửa "tốt nghiệp" **viết quá rộng**.

Đo 30/07, hai slug gift-framed độc lập:

| Slug | Đồ mặc / 8 | Band đồ mặc | **Trần page 1** |
|---|---|---|---|
| `nurse_grad_gift` | **2/8** | QZ $31.45 | **trang sức $48.00** |
| `rn_graduation_gift` | **3/8** | jacket $51.80 · tote $30.00 · QZ $29.60 | **trang sức $60.95** |
| `nurse_retirement_gift` (29/07) | **0/8** | — | tranh khung $49.95 |

**Phát biểu đúng:** mốc tốt nghiệp là sân của **VẬT CÁ NHÂN HOÁ**, trong đó đồ mặc là **một lát** (2–3/8) giữ được $29.60–51.80, còn **trần giá thuộc về TRANG SỨC**.

**Đối chứng CẦU độc lập:** eRank *Top Etsy Searches Q1 2026* — **5/20 head term là trang sức/đồ kim khí nhỏ** (jewelry · necklace · earrings · ring · keychain). CUNG và CẦU khớp nhau ⇒ tín hiệu mạnh hơn từng cái đứng riêng.
⚠️ Nhưng **cấm** đọc eRank thành "nghề không có cầu": đó là **head term**, ngách nghề sống ở long tail. Và dữ liệu là Q1 2026 ⇒ luật 8 "lịch sử, tham khảo".

**→ Hệ quả triển khai:** ở mốc tốt nghiệp, đồ mặc thêu của nhà **không cạnh tranh với áo khác** — nó cạnh tranh với **một sợi dây chuyền $29.90–60.95**. Lập luận bán phải là *"mặc được đi làm mỗi ngày, khoe vai trò mới"*, **không** phải *"rẻ hơn"*. Luật 46① (mốc sự nghiệp = ưu tiên 1) **giữ nguyên**, nhưng định vị đổi.

## SỬA LUẬT 43 (bảng phôi) — đo lại 30/07

- ❌ **XOÁ dòng chăn/dệt kỷ niệm** — xem mục dưới.
- 🔧 **QZ: $26–37 → $30.05–40.42.** `quarter_zip_nurse` live 200: $30.05 · $34.40 · $34.50 · $34.79 · $34.84 · $39.88 · $40.42. **4/8 slot đứng trên $34** ⇒ kết luận cũ *"QZ ăn hết biên ở band $34"* **cần xem lại**, QZ đáng xin COGS hơn đã tưởng.
- ✅ **Band EMB nurse $21.19–56.99** (loại $13.88 theo luật 31) — **khớp** band nền EMB $21–57 của CONTEXT, giữ nguyên 7 ngày.
- ✅ **Tote thêm 1 điểm ngoài slug teacher:** nurse tote EMB **$30.00** (602 rv) ở `rn_graduation_gift` — cao hơn band tote teacher $22–24 organic.
- ✅ **APRON vẫn là phôi biên dày nhất** ($17–45.50, 1 SKU không ma trận size) → giữ ưu tiên ②.
- Bảng hiện hành: `scrub cap $10–20 · mũ $11.52–15.12 · apron $17–45.50 · tote $22–42 · crewneck $25–43 · QZ $30.05–40.42`.

## BỔ SUNG `rejected` — MỤC 8: PHÔI CHĂN THÊU (mở 29/07 bởi luật 49, bác bỏ 30/07)

`market/embroidered_retirement_blanket` FIRST SCAN live 200 — band giá cuối **$21.69–97.00**, **0/5 organic**.

Bốn lý do độc lập, tất cả từ Etsy live:
1. **Trượt luật 44 bằng DỮ LIỆU, không phải vì thiếu dữ liệu** — 0 listing organic ⇒ không có gì để neo band.
2. **Tầng thêu = 1 shop, 1 mức giá, 8 review verify.** `listing/1212738181` = $97.00 · GrandviewThreads · **8 (listing rv)** · [EMB] verified · **listed 14/07/2026**. Không phải một bậc giá của thị trường, là cái đuôi mỏng của một người bán.
3. **Dung lượng category đứng ở $21.69 với 7.3k rv**; listing thứ ba verify là **PRINT $19.96** (NordicBlueprint, listed 30/06/2026). Hai listing $39.99–56.82 là **WOVEN**, không phải thêu. ⇒ khuôn giống hệt ornament: tiền của category thấp hơn điểm giá thêu rất xa.
4. **3 cảnh báo COGS của luật 49 vẫn nguyên** (diện tích mũi thêu lớn nhất từng gặp · phôi + cước nặng · 8 rv/16 ngày = vòng quay chậm).

🚨 **Đính chính số của chính bot (29/07):** ghi chăn $97 có *"108 (listing rv)"*. List view hiện **3.4k** cạnh nó — đúng bằng **shop rv của GrandviewThreads** (luật 2). Con số 108 **không đứng được**.
🚨 **Tự đính chính run sáng 30/07:** cảnh báo *"có sàn đại trà Walmart bên dưới"* **không đứng được** — `walmart.com/ip/12828709659` trả **"Not Available", 0 rating**, seller Muchenggift ⇒ không đọc được giá, không chứng minh được lớp đại trà đang bán. Kết luận bác bỏ **không cần đến nó**.

**Action:** đóng hồ sơ phôi chăn, không quét lại trừ khi user yêu cầu. **COGS cần xin giờ là APRON + CREWNECK + QZ**, không phải chăn. Không hồi sinh (luật 45).

## BỔ SUNG LUẬT 45 — "CỬA NGHỀ vs CỬA THẨM MỸ" đã lặp lần thứ 4

| Lần | Slug thẩm mỹ | Kết quả |
|---|---|---|
| 28/07 | `coquette_nurse` | 6/8 print $6.00–16.95; EMB tốt nhất $23.99 |
| 28/07 | `maestra_shirt` | 7/8 print $6.44–18.45; lớp thêu 1 listing $36.00 organic |
| 29/07 | `literary_girl_style` | print war $5.92–16.99; "Embroidered" duy nhất $7.19 → luật 31 loại |
| **30/07** | **coquette trong `nail_tech_shirt`** | **Nail Tech Coquette Shirt $8.99 (275 rv, Ad)** — lại đúng lớp print $6–17 |

⚠️ **Ca xung đột nguồn phải nhớ:** Printify *Etsy trends 2026* (live 200) gọi **"Literary girl"** là style 2026 — nhưng slug đó đã bị bác bỏ bằng Etsy live 29/07. **Luật 45 không hồi sinh + luật 26 cấm dùng aggregator làm nguồn PHÁT HIỆN** ⇒ giữ 🪦 CLOSED. Ba style mới (Châteaucore · old-money romance · MIDImalism) **chưa có một điểm đo Etsy nào** ⇒ chỉ là tên gọi, **không mở SKU**; muốn theo thì việc đầu tiên là đặt slug vào ledger và quét.

## SELF-CHECK BỔ SUNG

(z) mọi số rv/giá/badge trong metrics đều ghi **slug nguồn** (luật 50) · (aa) mọi ứng viên watchlist luật 32 đã kiểm organic ở **≥2 slug**, hoặc gắn `ad: surface-only` · (bb) mọi so sánh qua ngày (giá cuối hoặc rv) đều **cùng listing VÀ cùng slug** · (cc) chưa retry ≥3 lần thì **không** được ghi "GATE" và **không** được viện luật 37 · (dd) không đề xuất phôi chăn/dệt kỷ niệm nữa · (ee) ở mốc tốt nghiệp, mọi lập luận bán đều so với **trang sức**, không so với áo.
