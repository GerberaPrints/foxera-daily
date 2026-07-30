# EraCloset JOB Daily Research — ROUTINE v3.9 (CƠ CHẾ GATE THẬT + LỖI ĐO LƯỜNG THỨ 5, 6, 7)

> Đọc SAU v3.3 → v3.4 → v3.5 → v3.6 → v3.7 → v3.8. Ưu tiên khi mâu thuẫn: **v3.9 > v3.8 > v3.7 > v3.6 > v3.5 > v3.4 > v3.3 > trigger prompt**.
> v3.9 GIỮ toàn bộ luật 1–52. THÊM luật 53–56. Phạm vi: **chỉ những thứ mà dữ liệu live 31/07 chứng minh là sai.**
>
> **Lý do ra đời (31/07/2026, run sáng 05:05 BKK):** run này (a) tìm ra **cơ chế gate thật** sau 4 ngày chẩn đoán sai liên tiếp — kể cả luật 51 của v3.8 viết hôm qua cũng sai; (b) mở 2 trang listing theo luật 47 và phát hiện **con số rv mà dự án ghi vào `reviews_listing` suốt 17 ngày thực ra là SHOP rv**; (c) chứng minh giá trong list view là **giá "from" phụ thuộc variant + khuyến mãi theo surface**, spread tới **2,3×** cho cùng một listing trong cùng một phiên.
>
> ⚠️ Ba luật dưới đây **hạ cấp bằng chứng của ưu tiên ①** (mốc sự nghiệp) — đọc mục "ĐÍNH CHÍNH ANCHOR" trước khi ra bất kỳ quyết định artwork/COGS nào.

---

## LUẬT 53 ⭐ — GATE LÀ **PROVENANCE**, KHÔNG PHẢI GIỜ, KHÔNG PHẢI TIMEOUT, KHÔNG PHẢI RETRY

Ba chẩn đoán trước đều **SAI** và đều đã tốn phiên đo:

| Bản | Chẩn đoán | Kết quả |
|---|---|---|
| run 27–30/07 | "gate theo KHUNG GIỜ ~05:00–05:30 BKK" | ❌ sai |
| v3.8 luật 51 | "TIMEOUT xin quyền — cứ retry 3–4 lần là thông" | ❌ sai |
| **v3.9** | **PROVENANCE: URL phải xuất hiện trong kết quả WebSearch trước, rồi WebFetch mới được cấp quyền** | ✅ |

**Bằng chứng quyết định, 31/07 lúc 05:1x, cùng phiên, cùng token:**

| URL | Đã lộ trong WebSearch? | Kết quả |
|---|---|---|
| `market/rn_graduation_gift` | ❌ chưa | **GATE ×4 lần liên tiếp** |
| `market/nurse_graduation_gifts` | ✅ (WebSearch vừa trả) | **200 ngay lần 1** |
| `market/personalized_nurse_graduation_gift` | ✅ | **200 ngay lần 1** |
| `market/rn_graduation_gift` (sau khi WebSearch trả URL đó) | ✅ | **200 ngay lần 1** |

Cùng một URL, cách nhau vài phút, khác nhau **chỉ một điều**: nó đã nằm trong output của WebSearch hay chưa. Lỗi trả về `PROVENANCE_REQUIRED` **nói thẳng tên cơ chế** ("include the URL in a message, then try again") — 4 ngày qua bot đọc lướt phần đó.

**→ QUY TRÌNH BẮT BUỘC TỪ NAY (thay luật 51 và mọi ghi chú "gate theo giờ"):**
1. **KHÔNG bao giờ WebFetch một URL Etsy "khô".** Luôn chạy **WebSearch trước** với query chứa tên slug (vd `"rn graduation gift" etsy market`), rồi WebFetch URL mà search vừa trả về.
2. Retry cùng URL >2 lần khi chưa có provenance = **lãng phí phiên**. Retry KHÔNG sửa được gate loại này.
3. WebSearch cũng là cách **khám phá slug mới** — kết quả trả về hàng loạt slug họ hàng (`nurse_graduate_gifts`, `rn_graduate_gifts`, `nurse_graduation_gift_baskets`…) đều fetch được ngay. Một query = một chùm slug mở khoá.
4. Chỉ ghi `GATE` vào metrics khi URL **đã có provenance mà vẫn fail**.
5. **Luật 19/37/51 hạ xuống lưới an toàn.** Run sáng 05:00 **là phiên đo đầy đủ**; không còn cớ "phiên xếp việc". Run bù 11:30 chỉ dùng khi lỗi khác provenance.
6. `ROBOTS_DISALLOWED` (amazon.com/dp/*) vẫn là chặn thật — giữ nguyên luật 6.

## LUẬT 54 ⭐⭐ — SỐ REVIEW TRONG LIST VIEW LÀ **SHOP rv**, KHÔNG PHẢI LISTING rv (lỗi đo lường thứ 5 — NẶNG NHẤT TỪ TRƯỚC TỚI NAY)

Luật 2 đã nói "số cạnh tên shop/widget = SHOP-WIDE", nhưng thực tế bot vẫn ghi số của **trang market** vào field `reviews_listing`. Mở trang listing theo luật 47 thì lộ ra:

| Listing | Số ở LIST VIEW | **listing rv thật** | shop rv | Shop |
|---|---|---|---|---|
| Nurse Custom QZ "Jerzees Nublend" | **6.300** | **762** | 6.300 | Wildsongoods |
| Personalized Medical Jacket Full-Zip | **10.100** | **6** | 10.100 | TheInitialedLife |

**2/2 khớp tuyệt đối: số list view == shop rv.** Không phải trùng hợp.

**Hệ quả bắt buộc:**
1. **Mọi `reviews_listing` lấy từ trang market trong toàn bộ metrics 14–30/07 đều là SHOP rv và phải đọc lại như vậy.** Không xoá lịch sử; đọc lại nhãn.
2. Từ nay trang market chỉ được ghi vào field **`reviews_shop`**. Muốn có `reviews_listing` thì **bắt buộc mở trang listing** (luật 47).
3. **Luật 29 phải đọc lại:** lý do cấm kết luận velocity không phải "làm tròn thang k" mà là **số đó thuộc về SHOP, không thuộc listing**. Một shop 10.1k rv có thể chứa listing 6 rv. Delta rv qua ngày ở list view = delta của **cả shop**, vô nghĩa với listing.
4. **Luật 32 (watchlist organic + >$28) mất một chân:** "rv cao" từng được ngầm hiểu là traction của listing. Không phải. Tiêu chí chất lượng còn lại chỉ là giá + organic, mà organic thì luật 50 đã chứng minh là per-impression.
5. Nghịch lý phải nhớ: **listing 762 rv "Listed on Jul 30, 2026"** ⇒ xem luật 56.

## LUẬT 55 ⭐ — GIÁ LIST VIEW LÀ GIÁ **"FROM"** CỦA VARIANT RẺ NHẤT × TRẠNG THÁI KHUYẾN MÃI THEO SURFACE (lỗi đo lường thứ 6)

v3.8 luật 50 đã thấy giá đổi theo slug ($29.60 vs $31.45, 6%). Hôm nay biên độ lớn hơn nhiều và cơ chế đã rõ.

**Cùng phiên 31/07, cùng listing, khác slug:**

| Listing | Slug A | Slug B | Slug C | Spread |
|---|---|---|---|---|
| "Embroidered Custom Hairstylist Sweatshirt … Hair Salon Merch" | `personalized_hairstylist_shirts` **$10,00** (organic) | `embroidered_hairstylist_shirt` **$10,00** (Ad) | `hairstylist_custom_merch` **$22,99** (Ad) | **2,3×** |
| "Scissor Necklace With Birthstone" | `hairstylist_custom_merch` **$45,00** | `embroidered_hairstylist_shirt` **$27,00** | — | **1,67×** |
| "Embroidered Custom Gift For Hairstylist … Icons" | `hairstylist_custom_merch` **$19,14** | `embroidered_hairstylist_shirt` **$23,94** | — | 1,25× |

**Cơ chế xác nhận bằng trang listing:** Nurse QZ list view **$31,45** → trang listing **$31,45–$37,00**, giá theo SIZE (S–XL $31,45 · 2X $34,00 · 3X $35,70). Medical Jacket list view **$51,80** → trang listing **$47,60–$56,00**. ⇒ list view hiển thị **một điểm trong dải**, không phải giá của listing.

**Hệ quả bắt buộc:**
1. **Mọi "price band" dựng từ list view là band của biến thể rẻ nhất tại một trạng thái khuyến mãi**, không phải giá bán thật. Ghi `price_source: "list-from"` hay `"listing-range"` cho mọi số giá.
2. 🚨 **Luật 31 đang đứng trên cát.** Ngưỡng "<$21 → [EMB-title?] loại khỏi band" áp lên một con số không ổn định: **hai listing hôm nay nằm hai bên ngưỡng $21 tuỳ slug** ($10,00/$22,99 và $19,14/$23,94). Từ nay chỉ được gắn `[EMB-title?]` sau khi **mở trang listing** xem dải giá thật; gắn từ list view chỉ được ghi `[EMB-title? tentative]`.
3. **Luật 30 và luật 44 siết thêm:** "≥2 điểm đo giá cuối cùng listing VÀ cùng slug" (luật 50) nay phải thêm **cùng variant** — nghĩa là thực tế **chỉ trang listing mới đủ tư cách neo band**.
4. Dữ liệu dùng được của list view chỉ còn: **listing nào có mặt page 1 của slug nào** (bản đồ hiện diện). Giá/rv/badge đều là thuộc tính của lần hiển thị.

## LUẬT 56 — "LISTED ON" LÀ NGÀY **GIA HẠN**, KHÔNG PHẢI NGÀY TẠO LISTING (lỗi đo lường thứ 7)

Nurse QZ: **762 listing rv** nhưng ghi *"Listed on Jul 30, 2026"* — hôm qua. Không thể có 762 review trong 1 ngày. Etsy hiển thị ngày **renew/relist gần nhất**.

**→** Huỷ cách tính "rv/tháng kể từ ngày list" mà v3.5 (mục D, dòng cuối) đặt ra. Ngày `listed` chỉ được ghi kèm chú thích `= ngày gia hạn, KHÔNG phải tuổi listing`.
🚨 **Đính chính hồi tố:** các mốc `LISTED 14/07/2026` (chăn GrandviewThreads) và `LISTED 30/06/2026` (NordicBlueprint) trong metrics 30/07 **không chứng minh listing mới**; lập luận "cái đuôi mỏng của một người bán vừa list 16 ngày" của v3.8 mất một chân (kết luận bác bỏ phôi chăn vẫn đứng nhờ 3 lý do còn lại).

## ĐÍNH CHÍNH ANCHOR — HAI TRỤ BẰNG CHỨNG CỦA ƯU TIÊN ① BỊ HẠ CẤP

| Anchor | Dự án vẫn ghi | **Sự thật 31/07 (trang listing)** |
|---|---|---|
| EMB Medical Jacket **$62,90 / 10,1k rv** — *"trần cao nhất toàn dự án"*, bằng chứng đầu bảng luật 46① | listing hot, cầu đã chứng minh | shop **TheInitialedLife** 10,1k **shop** rv · listing rv = **6** · dải giá thật **$47,60–$56,00** ⇒ **$62,90 nằm ngoài dải hiện tại**, là hiển thị của một trạng thái giá khác |
| Nurse QZ Jerzees **$31,45 / 6,3k / organic** | anchor band EMB | shop **Wildsongoods** 6,3k **shop** rv · listing rv = **762** · dải **$31,45–$37,00** theo size |
| 🚨 "Teacher Est-Year $31,45 / 6,3k / organic" (v3.8 nghi misattribution) | UNCERTAIN | **Giải thích sạch hơn misattribution:** 6,3k là **shop rv của Wildsongoods**; nếu Teacher Est-Year cũng là listing của shop này thì trùng cả giá lẫn rv là **bình thường**, không phải lỗi ghi chép. Vẫn **cấm dùng làm bằng chứng band** cho tới khi mở trang listing. |

**→ Trạng thái luật 46①:** trục **mốc sự nghiệp giữ nguyên vị trí**, nhưng phải ghi thẳng: bằng chứng **đồ mặc** ở trục này hiện là **2 listing có 6 và 762 review thật**, không phải "10,1k và 6,3k". Cộng với luật 52 (đồ mặc chỉ 2–3/8 slot, trần thuộc trang sức), **không được ra quyết định artwork/COGS cho đồ mặc mốc tốt nghiệp** cho tới khi có ≥3 listing đồ mặc verify trang listing với listing rv thật.

## ANCHOR MỚI ĐẠT CHUẨN — NURSE TOTE EMB $30,00

`Personalized Nurse Tote Bag, Custom Name Embroidered` — **ORGANIC ở 3 slug độc lập cùng phiên**: `nurse_graduation_gifts` (602) · `personalized_nurse_graduation_gift` (648) · `rn_graduation_gift` (602). Giá **$30,00 ở cả ba**.
**Đây là ứng viên ĐẦU TIÊN thoả điều kiện organic-≥2-slug của luật 50** kể từ khi luật đó ra đời, và là listing duy nhất hôm nay **không** đổi giá theo slug. Tote = **1 SKU không ma trận size** (lợi thế luật 43 / ưu tiên ②).
⚠️ Chưa mở trang listing ⇒ 602/648 là **shop rv** (luật 54), listing rv **chưa biết**; chưa đủ luật 44. **Việc đầu tiên của phiên sau: mở trang listing này.**

## SELF-CHECK BỔ SUNG
(ff) không WebFetch URL Etsy nào chưa qua WebSearch (luật 53) · (gg) mọi số rv từ trang market ghi vào `reviews_shop`, KHÔNG ghi `reviews_listing` (luật 54) · (hh) mọi số giá có `price_source` (luật 55) · (ii) `[EMB-title?]` chỉ gắn sau khi mở trang listing · (jj) mọi ngày `listed` kèm chú "ngày gia hạn" (luật 56) · (kk) không dùng anchor $62,90 / "10,1k rv" / "6,3k rv" làm bằng chứng cầu.
