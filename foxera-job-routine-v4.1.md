# EraCloset JOB Daily Research — ROUTINE v4.1 (LỖI ĐO LƯỜNG THỨ 8: MỘT LISTING CHIẾM NHIỀU SLOT · KHOẢNG CÁCH 2 CỬA LÀ THUỘC TÍNH CỦA CẶP PHÔI×NGHỀ · KHUNG QUÀ ĐỔI CẢ SLOT ORGANIC)

> Đọc SAU v3.3 → v3.4 → v3.5 → v3.6 → v3.7 → v3.8 → v3.9 → v4.0. Ưu tiên khi mâu thuẫn: **v4.1 > v4.0 > v3.9 > v3.8 > v3.7 > v3.6 > v3.5 > v3.4 > v3.3 > trigger prompt**.
> v4.1 GIỮ toàn bộ luật 1–59. THÊM luật 60–62. Phạm vi hẹp: **chỉ những thứ mà dữ liệu live 02/08 chứng minh là sai hoặc viết quá rộng.**
>
> **Lý do ra đời (02/08/2026, run sáng 05:04 BKK, Chủ Nhật — rotation thường):** run này áp **đúng khuôn mà v4.0 luật 59 mục 4 vừa đặt ra** ("một phôi × hai cửa × ≥2 slug mỗi cửa, cùng phiên") lên phôi thứ hai là **TOTE**. Kết quả: (a) khuôn cho ra kết luận **NGƯỢC HẲN** apron ⇒ luật 59 viết quá rộng và phải siết; (b) lộ ra **lỗi đo lường thứ 8** — nặng, phá thêm luật 32 và luật 50; (c) giải thích được mâu thuẫn biểu kiến giữa anchor Nurse Tote $30,00 của v3.9 và dữ liệu hôm nay, và biến nó thành một cơ chế dùng được.

---

## LUẬT 60 ⭐⭐ — MỘT LISTING CÓ THỂ CHIẾM **≥2 SLOT TRÊN CÙNG MỘT PAGE 1**, VÀ HAI SLOT ĐÓ CÓ THỂ MANG **BADGE KHÁC NHAU** (lỗi đo lường thứ 8)

v4.0 quan sát (b) mới ngờ "cụm listing trùng title, khác ID, rải nhiều slug". Hôm nay hiện tượng lộ ở dạng **mạnh hơn nhiều và trong cùng một trang**.

**Bằng chứng 02/08, live 200, cùng phiên:**

| Slug | Listing | Slot | Giá | rv | Badge |
|---|---|---|---|---|---|
| `custom_tote_bag` | *"Custom Embroidered Tote Bag, Personalized Gift, Bachelorette Party Bags, Teacher, Mom, Embroidery, Needlepoint, Mahjong"* | **#3** | $19,59 | 60,3k | **Ad** |
| `custom_tote_bag` | **CÙNG title, CÙNG giá, CÙNG rv** | **#7** | $19,59 | 60,3k | **ORGANIC** |
| `custom_barber_apron` | *"Custom Logo Embroidered Canvas Apron \| Personalized Chef Name Work Apron …"* | **#2** | $26,25 | 14 | **Ad** |
| `custom_barber_apron` | **CÙNG title, CÙNG giá, CÙNG rv** | **#6** | $26,25 | 14 | Ad |

**→ Ba hệ quả BẮT BUỘC, tất cả đều siết luật đã có:**

1. 🚨 **Luật 32 mất chân thứ hai.** Luật 54 (v3.9) đã lấy đi chân "rv cao". Nay lấy nốt phần lớn chân "organic": **cùng một listing có thể vừa Ad vừa organic trên cùng một trang**. ⇒ "organic" không phải trạng thái của listing, thậm chí không phải trạng thái của (listing × slug) — mà là **trạng thái của MỘT SLOT**. Từ nay ghi `ad` phải kèm **slot index**, và một listing thấy cả 2 badge trên cùng trang thì ghi `ad: "mixed-same-page"`.
2. 🚨 **Luật 50 mục "organic ở ≥2 slug" phải kiểm trùng trước khi tính.** Hai lần organic của cùng một listing **không phải hai bằng chứng**. Trước khi tuyên một ứng viên "organic ≥2 slug", phải đối chiếu **title + giá + rv**; trùng cả ba ⇒ **đếm là MỘT**.
3. 🚨 **Mọi phép đếm "n/8 organic" và "n/8 là Ad" trong toàn bộ metrics 14/07–01/08 đang ĐẾM TRÙNG** và phải đọc là "n/8 **slot**", không phải "n listing". Không xoá lịch sử; đọc lại nhãn. Điều này **củng cố thêm** luật 33 (cấm kết luận thị trường từ tỉ lệ badge).

**Quy trình từ nay:** mỗi market-scan, trước khi ghi metrics, chạy một bước **dedupe theo (title, giá, rv)** và ghi cả hai con số: `slots_organic` và `listings_organic_unique`.

## LUẬT 61 ⭐ — KHOẢNG CÁCH GENERIC↔NGHỀ LÀ THUỘC TÍNH CỦA **CẶP (PHÔI × NGHỀ)**, KHÔNG PHẢI CỦA KHUNG (siết luật 59)

Luật 59 phát biểu: *"cửa generic của bất kỳ phôi nào cũng bị lớp $6–17 nuốt; lớp thêu chỉ giữ giá trong khung NGHỀ."* Câu đó **đúng với apron** và **sai với tote** — chứng minh trong cùng một phiên, bằng đúng khuôn mà luật 59 đề ra.

| Phôi | Cửa GENERIC — organic trần | Cửa NGHỀ — organic trần | Hướng |
|---|---|---|---|
| **APRON** (01/08, 3+3 slug) | **$17,00** (1 điểm duy nhất) | **$58,00** (5 điểm, 4/5 ≥ $23,57) | NGHỀ **cao hơn 3,4×** |
| **TOTE** (02/08, 3+3 slug) | **$32,00** (thấy organic ở 2 slug) · thêm $19,59 | teacher **$24,15** · nurse **0 điểm organic thêu** trên 16 slot | **GENERIC CAO HƠN** |

**→ Phát biểu đúng:** không tồn tại quy luật một chiều "cửa nghề luôn dày hơn". Cái đo được là **độ chênh của một cặp cụ thể**, và **dấu của độ chênh cũng phải đo, không được suy**.

**Hệ quả bắt buộc:**
1. **Luật 59 hạ phạm vi:** phát biểu của nó chỉ còn hiệu lực cho **apron × nghề tóc**, là nơi nó được đo. Cấm dùng nó làm tiên đề cho phôi mới.
2. Ưu tiên ② của luật 46 (**apron**) **giữ nguyên** — lý do của v4.0 (chênh 2 cửa lớn nhất đã đo) **vẫn đứng**, và hôm nay còn được củng cố: apron 3,4× vẫn là kỷ lục, tote thậm chí âm.
3. 🚨 **Tote bị hạ khỏi vị trí "ứng viên phôi số 2"** mà luật 43 và v3.9 ngầm gán. Xem mục `rejected` bên dưới.
4. Mỗi phôi mới **bắt buộc** đo bằng khuôn luật 59 mục 4 **trước khi** được xếp hạng — và phải ghi **dấu** của độ chênh, không chỉ độ lớn.

## LUẬT 62 — KHUNG QUÀ vs KHUNG SẢN PHẨM ĐỔI **KHẢ NĂNG CÓ SLOT ORGANIC**, KHÔNG CHỈ ĐỔI MẶT BẰNG GIÁ (siết luật 42)

Luật 42 nói người mua QUÀ trả giá cao hơn. Đúng, nhưng thiếu nửa quan trọng hơn.

**Cùng phôi TOTE, cùng nghề NURSE, hai khung:**

| Khung | Slug | Kết quả |
|---|---|---|
| **QUÀ** (31/07) | `nurse_graduation_gifts` · `personalized_nurse_graduation_gift` · `rn_graduation_gift` | Nurse Tote EMB **$30,00 ORGANIC ở cả 3 slug** |
| **SẢN PHẨM** (02/08) | `nurse_tote_bag` · `nurse_bag` | **0/16 slot organic là hàng thêu.** Band cao ($20,00–42,00; 6/8 ≥ $20) nhưng **100% Ad** |

**→ Phát biểu:** khung SẢN PHẨM của một cặp phôi×nghề có thể **hoàn toàn bị mua đứt bằng Ad** trong khi khung QUÀ của **đúng cặp đó** vẫn còn slot organic. Band giá cao ở đây **không** phải tín hiệu tốt — nó là giá mà người ta **phải trả Ad để giữ**, tức đúng định nghĩa commodity của luật 32.

**Hệ quả bắt buộc:**
1. **Nurse tote: CHỈ vào bằng cửa QUÀ.** Cấm mở SKU / cấm chấm điểm ngách từ slug product-framed (`nurse_tote_bag`, `nurse_bag`).
2. Mọi cặp phôi×nghề từ nay phải quét **cả hai khung** trước khi kết luận — **thiếu một khung thì không được chấm /40** (nối vào luật 34).
3. Khi một khung cho band cao mà **0 organic**, ghi thẳng `verdict: "Ad-bought band — KHÔNG phải cầu organic"`, không được ghi "band khoẻ".

## BỔ SUNG `rejected` — MỤC 11: TOTE LÀ PHÔI ỨNG VIÊN SỐ 2

Trạng thái cũ: luật 43 xếp tote $22–42 ngay dưới apron; v3.5 luật 40③ gọi tote là *"cửa tốt nhất"*; v3.9 nâng Nurse Tote $30,00 lên "anchor đạt chuẩn".

Bác bỏ 02/08 bằng 6 slug live 200 cùng phiên, **4 lý do độc lập**:
1. **Dấu của độ chênh 2 cửa là ÂM** (luật 61) — ngược hẳn apron, tức tote không có chỗ cho cá nhân hoá sâu tạo giá.
2. **Cửa sản phẩm nurse 0/16 slot organic thêu** (luật 62) ⇒ trượt luật 44 điều 2 **bằng dữ liệu**.
3. **Cửa generic bị lớp $0,08–$5 nuốt**: `personalized_tote_bag` có organic ở **$0,08 · $0,99 · $8,82 · $8,99** — organic trần chỉ **$8,99**. Đây là mức giá mà luật 31 còn không cho phép gọi là thêu.
4. **Không có lực kéo head-term:** eRank Q1 2026 — "bag" #122/200, "tote bag" và "apron" **không** trong top 200 (luật 8: lịch sử, tham khảo; luật 52: đừng đọc thành "không cầu" — nhưng đủ để nói tote **phải sống bằng long-tail nghề + khung quà**, không có gió head-term đẩy).

**Phần GIỮ LẠI (không bác bỏ):** **teacher tote organic $22,00 (333) và $24,15 (667)** — đo 28/07 và đo lại 02/08 **cùng slug, cùng listing, giá y nguyên, vẫn organic sau 5 ngày**. Đây là **2 điểm đo hợp lệ nhất theo luật 30 + luật 50** mà dự án có về tote. Nhưng $22–24 là **bậc giá thấp**, không phải trụ doanh thu ⇒ tote xuống **hàng kèm / bundle**, ngang bậc mũ-cap của luật 46.

**Action:** không mở SKU tote chủ lực. Tote chỉ còn 2 đường: (a) hàng kèm trong bundle; (b) cửa QUÀ mốc tốt nghiệp × nghề, và chỉ khi đã có COGS.

## VIỆC v4.0 GIAO — KẾT QUẢ

**`listing/4484934713` (apron tốt nghiệp $31,25) — KHÔNG MỞ ĐƯỢC.** 2 query WebSearch theo title chính xác đều không trả URL ⇒ dừng theo luật 57 mục 2. Đường vòng trang SHOP (luật 57 mục 3) **cũng bế tắc**: cần tên shop, mà tên shop chỉ có ở trang listing hoặc trang shop — vòng tròn. **Ghi nhận đây là giới hạn cấu trúc mới:** listing không index được **và** chưa biết tên shop ⇒ **không có đường nào từ cloud**. Việc này thuộc scheduled task LOCAL (v3.5 mục D).
**Thay bằng:** quét 2 slug đã nằm sẵn trong ledger ở trạng thái `never`: `cosmetology_graduation_gift` · `barber_school_graduation_gift`. Cùng giao điểm 3 trục, và là **slug** nên chắc chắn mở được bằng query chung.

## TIẾN ĐỘ LUẬT 44 CHO APRON × NGHỀ TÓC (ưu tiên ② — gần đủ nhất toàn dự án)

| Điều kiện luật 44 | Trạng thái 02/08 |
|---|---|
| ① title listing-ready | ✅ |
| ② band neo ≥2 listing ORGANIC | ✅ **ĐÃ THOẢ** — 6 điểm organic trên **4 slug**: $14,94 · $23,57 · **$25,20 (mới, `custom_barber_apron`)** · $27,30 · $31,25 · $58,00. **5/6 ≥ $23,57** |
| ③ dòng biên lợi nhuận | ❌ **CHƯA CÓ COGS** (luật 35) |

⛔️ **Còn đúng 1/3 điều kiện.** Cấm ghi "scale". **Đây là lần đầu một ngách của dự án chỉ còn thiếu COGS** — biến việc xin COGS từ "việc nền" thành **việc chặn đường duy nhất**.

## SELF-CHECK BỔ SUNG

(rr) mọi market-scan có bước **dedupe (title, giá, rv)** và ghi cả `slots_organic` lẫn `listings_organic_unique` (luật 60) · (ss) không tuyên "organic ≥2 slug" trước khi kiểm trùng · (tt) mọi `ad` đều kèm slot index; thấy cả 2 badge cùng trang → `ad: "mixed-same-page"` · (uu) không dùng luật 59 làm tiên đề cho phôi chưa đo (luật 61) · (vv) mọi cặp phôi×nghề được chấm /40 đã quét **cả khung quà lẫn khung sản phẩm** (luật 62) · (ww) band cao + 0 organic → ghi `Ad-bought band`, cấm ghi "band khoẻ".
