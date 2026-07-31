# EraCloset JOB Daily Research — ROUTINE v4.0 (PROVENANCE CHỈ TỪ WEBSEARCH · SPREAD LÀ THUỘC TÍNH CỦA MA TRẬN · KHÔNG PHÔI NÀO BIÊN DÀY TỰ THÂN)

> Đọc SAU v3.3 → v3.4 → v3.5 → v3.6 → v3.7 → v3.8 → v3.9. Ưu tiên khi mâu thuẫn: **v4.0 > v3.9 > v3.8 > v3.7 > v3.6 > v3.5 > v3.4 > v3.3 > trigger prompt**.
> v4.0 GIỮ toàn bộ luật 1–56. THÊM luật 57–59. Phạm vi hẹp: **chỉ những thứ mà dữ liệu live 01/08 chứng minh là sai hoặc thiếu.**
>
> **Lý do ra đời (01/08/2026, run sáng 05:06 BKK, Thứ Bảy — rotation thường):** run này quét **song song 2 cửa của CÙNG một phôi** (apron generic vs apron × nghề) trong cùng một phiên để có đối chứng sạch. Kết quả (a) siết lại ưu tiên ② của luật 46 và sửa dòng apron của luật 43 ở **cả hai đầu**; (b) tìm ra giới hạn của cơ chế provenance mà luật 53 viết hôm qua chưa bao phủ; (c) tìm ra nguyên nhân thật của spread giá mà luật 55 quy nhầm cho phôi.

---

## LUẬT 57 ⭐ — PROVENANCE **CHỈ ĐƯỢC CẤP BỞI WEBSEARCH**. OUTPUT CỦA WEBFETCH KHÔNG CẤP PROVENANCE

Luật 53 (v3.9) phát biểu đúng cơ chế nhưng để hở một trường hợp mà hôm nay đốt 2 lượt fetch.

**Bằng chứng 01/08, cùng phiên:**

| Bước | Hành động | Kết quả |
|---|---|---|
| 1 | WebFetch `market/embroidered_aprons` → output trả về **URL đầy đủ** của `listing/1813495682` | 200 |
| 2 | WebFetch `listing/1813495682` (URL vừa nằm trong output bước 1) | ❌ **PROVENANCE_REQUIRED** |
| 3 | WebFetch `listing/4490084831` (URL vừa nằm trong output của market khác) | ❌ **PROVENANCE_REQUIRED** |
| 4 | WebSearch `"Custom Embroidered Apron" "Personalized Chef, Baker, Barista Gift" etsy` → search trả đúng URL đó | — |
| 5 | WebFetch `listing/1813495682` lần 2 | ✅ **200 ngay lần 1** |

**→ Phát biểu đúng:** provenance là **thuộc tính do WebSearch cấp**, không phải "URL đã xuất hiện ở đâu đó trong hội thoại". WebFetch đọc được URL không có nghĩa là mở được URL đó.

**Hệ quả bắt buộc:**
1. Muốn mở một trang listing thì phải **WebSearch đúng title của nó** trước — không phải search slug cha, không phải lấy URL từ trang market.
2. 🚨 **Có listing cloud KHÔNG BAO GIỜ mở được**: nếu WebSearch không index listing đó. Ca hôm nay: `listing/4490084831` (Nurse Tote $30,00 — chính là việc số 1 mà v3.9 giao cho phiên này), **3 query khác nhau, WebSearch không trả URL** ⇒ bỏ sau 2 lần thử theo luật 53 mục 2.
3. **Đường vòng bắt buộc khi listing không index được:** đi qua **trang SHOP** (luật 47 bảng: trang shop ra tên shop, năm mở, shop sales, danh mục). Tìm tên shop bằng WebSearch theo title, rồi search `etsy.com/shop/<ten>`.
4. Query hiệu quả nhất để mở khoá **cả chùm slug** vẫn là query chung (hôm nay `"etsy market embroidered apron personalized name"` mở 8 slug apron cùng lúc). Query để mở **một listing** phải là **title chính xác trong ngoặc kép**.

## LUẬT 58 — SPREAD GIÁ LÀ THUỘC TÍNH CỦA **MA TRẬN BIẾN THỂ**, KHÔNG PHẢI CỦA PHÔI (siết luật 55, sửa một lý do của luật 43)

Luật 55 chứng minh list view hiển thị giá "from" của biến thể rẻ nhất. Hôm nay lộ ra spread **đến từ đâu**.

**Cùng phôi apron, cùng ngày 01/08, hai trang listing:**

| Listing | Shop | Dải giá thật | Spread | Cấu trúc biến thể |
|---|---|---|---|---|
| `listing/1813495682` | FormadesignCo | **$17,00–$37,00** | **2,18×** | size + style |
| `listing/770246715` | PLACE4PRINT | **$32,95** | **1,00×** | **một biến thể duy nhất** |

**→ Hệ quả:**
1. Câu *"apron = 1 SKU không ma trận size"* của **luật 43** — được dùng làm **một trong hai lý do** cho ưu tiên ② — **chỉ đúng với một phần listing apron**. Nó là **lựa chọn của người bán**, không phải thuộc tính của phôi.
2. Lợi thế vận hành 1-SKU **vẫn còn**, vì nhà **tự chọn được** cách dựng biến thể. Nhưng phải ghi đúng nguồn gốc, và **không được dùng nó để suy ra rằng thị trường apron là thị trường 1-SKU**.
3. Khi ghi `price_source: "list-from"`, **spread tiềm ẩn không đoán được** — có thể 1,00× có thể 2,18×. ⇒ **cấm** ước lượng giá bán thật từ list view kể cả bằng hệ số.

## LUẬT 59 ⭐⭐ — **KHÔNG PHÔI NÀO CÓ BIÊN DÀY TỰ THÂN. BIÊN NẰM Ở KHUNG ĐẶT QUANH PHÔI.** (siết luật 43 + luật 45 + ưu tiên ② của luật 46)

Luật 45 (cửa NGHỀ vs cửa THẨM MỸ) đã lặp 4 lần trên **motif**. Hôm nay lặp **lần thứ 5**, và lần đầu áp lên **PHÔI** — với thiết kế đối chứng sạch: cùng phôi, cùng phiên, khác đúng một biến là **khung**.

| Cửa | Slug (mỗi cửa 3 slug, live 200 cùng phiên) | Band list-from | **Điểm ORGANIC** | Cấu trúc page 1 |
|---|---|---|---|---|
| **GENERIC** (bếp/chef/barista) | `custom_embroidered_apron` · `personalized_embroidered_apron` · `embroidered_aprons` | $7,85–43,34 | **$17,00 — DUY NHẤT 1 điểm** | 5–6/8 slot là Ad; đáy $7,85/$7,92/$9,96 nuốt page 1 |
| **NGHỀ** (salon) | `salon_aprons` · `hairdresser_apron` · `personalized_apron_for_hair_cutting` | $7,85–58,00 | **$14,94 · $23,57 · $27,30 · $31,25 · $58,00** (5 điểm, 4/5 ≥ $23,57) | trần page 1 **$58,00 VÀ organic**; lớp $7,85 có mặt nhưng không thống trị |

**Chênh trần organic: $17,00 → $58,00 = 3,4×. Cùng phôi. Cùng ngày.**

**→ Phát biểu:** *"phôi X biên dày"* là một câu **không có nghĩa** nếu không kèm khung. Cửa generic của bất kỳ phôi nào cũng bị lớp $6–17 của CONTEXT mục 1 nuốt; **lớp thêu chỉ giữ giá trong khung NGHỀ**.

**Hệ quả bắt buộc:**
1. **Ưu tiên ② của luật 46 GIỮ NGUYÊN vị trí nhưng ĐỔI LÝ DO.** Không còn là *"apron có band cao nhất"* (sai — band generic thấp hơn tưởng) mà là *"apron là phôi có khoảng cách organic giữa hai cửa lớn nhất đã đo (3,4×)"* — tức là chỗ mà **cá nhân hoá sâu + cách kể chuyện** tạo ra tiền, đúng sở trường nhà.
2. **CẤM** mở SKU apron ở cửa generic (kitchen / chef / barista / baker / "gift for mom"). Chỉ vào bằng **nghề**.
3. **Sửa dòng apron của luật 43 (sai cả hai đầu):**
   - Bảng cũ: `apron $17–45,50`
   - ❌ đáy thật là **$7,85** (không phải $17,00) — và $7,85 có mặt ở **4/6 slug**, kể cả slug nghề.
   - ❌ trần thật là **$58,00** (không phải $45,50).
   - Con số $17,00 của bảng cũ thực ra là **giá "from"** của `listing/1813495682`, dải thật $17,00–37,00.
   - **Bảng phôi hiện hành:** `scrub cap $10–20 · mũ $11,52–15,12 · APRON-generic $7,85–43,34 (organic trần $17) · APRON-nghề $14,94–58,00 (organic trần $58) · tote $22–42 · crewneck $25–43 · QZ $30,05–40,42`
   - ⚠️ **Toàn bộ bảng là giá "from" list view.** Chỉ dùng **xếp hạng tương đối giữa phôi**, tuyệt đối không dùng tính biên. Các dòng tote/crewneck/scrub cap/mũ **chưa** verify bằng trang listing ⇒ **giả định là chúng cũng sai** cho tới khi verify.
4. **Bài học phương pháp — thiết kế đối chứng.** Bảng phôi đã bị sửa 2 lần trong 3 ngày (v3.8 sửa QZ, v4.0 sửa apron), cùng một nguyên nhân gốc: **dựng bảng từ list view, một slug một phôi**. Cách quét hôm nay (một phôi × hai cửa × ba slug mỗi cửa, cùng phiên) là **khuôn mẫu nên lặp lại** cho mọi phôi còn lại.

## ỨNG VIÊN MỞ RA HÔM NAY — APRON × MỐC TỐT NGHIỆP NGHỀ

`listing/4484934713` — *"Personalized Custom Barber Beautician Hair Stylist Salon Cosmetology School **Graduate** Apron Gift"* — **$31,25 · ORGANIC · 138 (shop rv)** tại `hairdresser_apron`.

Giao của **ba trục** dự án đang theo riêng lẻ: ① mốc sự nghiệp × ② phôi apron × luật 45 cửa NGHỀ.

Điểm mấu chốt: **apron KHÔNG phải đồ mặc** ⇒ **không vướng** lệnh cấm của luật 48 (nghỉ hưu = vật kỷ niệm) và luật 52 (mốc tốt nghiệp: đồ mặc chỉ 2–3/8 slot, trần thuộc trang sức) — mà vẫn ăn được lực mua của mốc tốt nghiệp. Nó là **đồ nghề**, và mốc tốt nghiệp nghề chính là lúc người ta mua đồ nghề đầu tiên.

⛔️ **Trạng thái: 🔍 THĂM DÒ MẠNH — CHƯA phải đề xuất.** Thiếu 2/3 điều kiện luật 44:
- ✅ title listing-ready
- ❌ band neo vào ≥2 listing ORGANIC: $31,25 / $27,30 / $58,00 đều **mới 1 slug** ⇒ chưa qua cửa luật 50
- ❌ dòng biên lợi nhuận: **chưa có COGS** (luật 35) ⇒ **cấm** ghi "scale"

⚠️ **Ô này KHÔNG trống** (luật 20): **PLACE4PRINT** — Cypress TX, **9 năm trên Etsy, 17k shop sales**, đã hệ thống hoá apron thêu × nghề tóc. Nếu vào, vào bằng **nghề × cá nhân hoá sâu × khung mốc sự nghiệp**, không vào bằng giá.

## QUAN SÁT MỞ (chưa đủ thành luật)

**(a) Cả 2 ứng viên organic-≥2-slug của dự án đều là hàng KHÔNG-phải-áo.** Nurse Tote $30,00 (organic 3 slug, 31/07) và Hairstylist Apron $14,94 (organic 3/3 slug, 01/08). Chưa lặp lần 3 ⇒ **chưa ghi thành luật**, chỉ theo dõi.

**(b) Cụm listing trùng title + trùng giá, khác listing ID.** *"Custom Apron with Embroidered Name … Gift For Mom"* $7,85 dưới **2 ID**: `4495815266` (1,1k) và `4466909097` (1,2k). Nếu là chiến thuật rải listing để phủ nhiều slug thì **mọi phép đếm "số listing page 1" của dự án đang đếm trùng**. Chưa xác định — phải mở cả hai.

**(c) "6,3k shop rv" là ô làm tròn phổ biến.** FormadesignCo (Miami, apron) trùng số với Wildsongoods (nurse QZ), hai shop không liên quan. ⇒ nghi vấn *"Teacher Est-Year misattribution"* (v3.8 luật 50) **yếu thêm một bậc** nhưng **chưa được gỡ**: vẫn cấm dùng làm bằng chứng band tới khi mở trang listing.

## SELF-CHECK BỔ SUNG

(ll) mọi trang listing đều được mở bằng **WebSearch theo title chính xác**, không lấy URL từ output WebFetch (luật 57) · (mm) listing không index được thì đi **đường vòng trang SHOP**, không retry (luật 57 mục 2–3) · (nn) không suy giá bán thật từ list view kể cả bằng hệ số (luật 58) · (oo) mọi phát biểu "phôi X biên dày" đều kèm **khung** (luật 59) · (pp) không mở SKU apron ở cửa generic · (qq) mỗi phôi mới đo theo khuôn **một phôi × hai cửa × ≥2 slug mỗi cửa, cùng phiên**.
