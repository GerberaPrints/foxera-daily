# EraCloset JOB Daily Research — ROUTINE v3.7 (ĐÍNH CHÍNH KỸ THUẬT + PHÔI KỶ NIỆM)

> Đọc SAU v3.3 → v3.4 → v3.5 → v3.6. Ưu tiên khi mâu thuẫn: **v3.7 > v3.6 > v3.5 > v3.4 > v3.3 > trigger prompt**.
> v3.7 GIỮ toàn bộ luật 1–46. THÊM luật 47–49. Phạm vi hẹp, chỉ sửa 3 thứ mà dữ liệu live 29/07 chứng minh là sai hoặc thiếu.
>
> **Lý do ra đời (29/07/2026, run phụ 11:30 BKK):** run sáng gate 0/3, run bù thông 5/5. Dữ liệu live của run bù (a) đảo một kết luận nền về ngách ưu tiên ①, (b) chứng minh một ghi chú kỹ thuật của v3.6 viết quá rộng và đã gây thiệt hại 5 ngày, (c) mở một phôi có giá verify cao nhất toàn dự án.

---

## LUẬT 47 — ĐÍNH CHÍNH GHI CHÚ KỸ THUẬT v3.6: TÊN SHOP **LẤY ĐƯỢC**, CHỈ LÀ KHÔNG LẤY TỪ LIST VIEW

v3.6 mục "2 thứ cloud không làm được" ghi: *"Tên shop ở list view — Etsy ẩn; 3 ngày liên tiếp không cập nhật được shop dossier"*. Câu đó **đúng về list view nhưng bị đọc thành "cloud không lấy được tên shop"**, và hệ quả là bot **bỏ hẳn việc dựng shop dossier trong 5 ngày** (10 shop đứng yên từ 26/07).

**Phát biểu đúng:**

| Thứ cần lấy | Từ trang MARKET (list view) | Từ trang LISTING | Từ trang SHOP |
|---|---|---|---|
| Tên shop | ❌ ẩn | ✅ **lấy được** | ✅ |
| (shop sales), năm mở shop, danh mục | ❌ | một phần | ✅ **lấy được** |
| Production method (verify [EMB] thật) | ❌ chỉ đọc được title | ✅ **đọc mô tả được** | — |
| (listing rv) tách khỏi (shop rv) | ✅ | ✅ | — |
| **Ngày tháng review** | ❌ | ❌ **JS, vẫn thua** | ❌ |
| **Ad/organic badge** | ✅ **chỉ ở đây** | ❌ | ❌ |

**Bằng chứng 29/07:** mở `etsy.com/listing/1045960731` → ra shop **GrandviewThreads** + xác minh chữ "embroidered" trong mô tả; mở `etsy.com/shop/GrandviewThreads` → ra **15,440 (shop sales)**, 3.4k (shop rv), **on Etsy since 2020**, Star Seller, Lancaster PA, danh mục đầy đủ.

**→ QUY TRÌNH BẮT BUỘC TỪ NAY:** mỗi phiên, sau khi market-scan, **mở thêm 1–2 trang LISTING của anchor đáng chú ý nhất** (ưu tiên anchor organic > $28 theo luật 32, và mọi anchor sắp được dùng làm bằng chứng band). Việc này làm được **hai thứ cùng lúc** mà list view không làm được: **verify production method** (gỡ nhãn `[EMB-title]` → `[EMB]`) và **dựng shop dossier**.

⚠️ Đánh đổi phải nhớ: **Ad/organic chỉ thấy ở list view**. Anchor chỉ mở trang listing thì **ad status = unknown**, và theo luật 32 **chưa đủ tư cách vào watchlist organic**. Muốn đủ cả hai thì phải quét **cả hai trang**.

**Phần v3.6 vẫn ĐÚNG, không đụng vào:** ngày tháng review render bằng JS, cloud **không** lấy được — vẫn là việc của **scheduled task LOCAL trên máy user** (v3.5 mục D). Đừng thử lại mỗi ngày.

## LUẬT 48 — NGHỈ HƯU (VÀ CÁC MỐC "CHIA TAY") LÀ CATEGORY **VẬT KỶ NIỆM**, KHÔNG PHẢI CATEGORY ÁO

Hai slug độc lập, hai nghề khác nhau, cùng một cấu trúc page 1 — **không listing nào là quần áo**:

- `teacher_retirement_gift` (live 28/07): tranh khung $49.95 · thớt $20 · tranh nước $39.99.
- `nurse_retirement_gift` (live 29/07): tranh khung chữ ký **$49.95** (3.5k, Ad) · chân dung màu nước **$39.20** (3.1k, Ad) · thớt khắc **$20.00** (9.5k, Ad) · đèn ngủ **$21.20** (536, Ad) · poster chữ ký **$24.99** (1.3k, **organic**) · cốc **$23.99** (815, **organic**) · ornament $13.87 (5.4k) · nến $9.99 (6.3k). **0/8 là quần áo.**

**→ Hệ quả cho luật 46①:** trục **mốc sự nghiệp vẫn đúng**, nhưng phải **tách đôi theo mốc**, vì mỗi mốc mua một loại vật khác nhau:

| Mốc | Vật người ta thực sự mua | Bằng chứng giá (live) |
|---|---|---|
| **Tốt nghiệp / năm đầu / thăng cấp** | **ĐỒ MẶC được** (mặc đi làm, khoe vai trò mới) | EMB Medical Jacket **$62.90** (10.1k) · Est-year $31.45 organic (6.3k) |
| **Nghỉ hưu / chia tay / tri ân** | **VẬT KỶ NIỆM** (bày, giữ, ký tên) | band $9.99–49.95, organic $23.99–24.99; hàng dệt kỷ niệm: **chăn thêu $97.00** |

**CẤM** từ nay: đề xuất sweatshirt/QZ/crewneck cho slug khung "retirement/farewell/leaving". Cửa của nhà ở mốc nghỉ hưu là **hàng dệt kỷ niệm thêu** (chăn/throw, khăn, hộp quà có tên), không phải đồ mặc.

## LUẬT 49 — PHÔI "DỆT KỶ NIỆM" LÀ BẬC GIÁ RIÊNG, VÀ PHẢI QUA CỔNG COGS TRƯỚC KHI ĐƯỢC MỪNG

Đo 29/07 (live 200, verify [EMB] trong mô tả): **chăn thêu (throw blanket) $97.00**, 108 (listing rv), shop GrandviewThreads.

Đặt cạnh bảng phôi luật 43: `scrub cap $10–20 · mũ $11.52–15.12 · apron $17–45.50 · tote $22–42 · crewneck $25–43 · QZ $26–37` → **chăn ở một bậc khác hẳn**, ~2.1× phôi đắt nhất từng đo, và vượt cả anchor cao nhất cũ ($62.90).

**Nhưng KHÔNG được đọc $97 thành "biên dày".** Ba cảnh báo bắt buộc ghi kèm mỗi lần nhắc phôi này:

1. **Số mũi thêu lớn** — diện tích thêu trên chăn lớn hơn ngực trái áo nhiều lần; đơn giá thêu tính theo 1k mũi ⇒ **$97 hoàn toàn có thể là phôi biên MỎNG**, ngược hẳn apron. Đây đúng là loại quyết định mà **luật 35 cấm ra khi chưa có COGS**.
2. **Phôi + cước nặng** — chăn đắt hơn áo và cước cao hơn; contribution thật chưa biết.
3. **Vòng quay chậm** — 108 rv trên một listing sống nhiều năm ⇒ **hàng giá cao bán chậm**, mô hình dòng tiền khác hẳn áo. Đừng lấy nhịp kỳ vọng của áo áp vào.

**→ Trạng thái:** `QUAN SÁT / THĂM DÒ`. Chưa đạt luật 44 (mới 1 listing nên **chưa neo được vào ≥2 listing organic**; ad status unknown; chưa có dòng biên). Nâng lên "đề xuất" chỉ khi có đủ: market-scan slug chăn (dựng band + Ad/organic) **và** báo giá phôi + thêu thật từ nhà cung cấp.

⚠️ **Ô này đã có người mạnh đứng:** GrandviewThreads — thêu thật, 15.4k sales, trên Etsy từ 2020, Star Seller, đã hệ thống hoá mô hình *"một phôi dệt kỷ niệm × nhiều dịp"*. Theo luật 20 **cấm** gọi đây là cửa trống. Nếu vào, vào bằng **nghề × cá nhân hoá sâu**, không vào bằng giá.

## BỔ SUNG CHO LUẬT 45 — QUY LUẬT "CỬA NGHỀ vs CỬA THẨM MỸ" (đã lặp 3 lần)

| Lần | Slug thẩm mỹ | Kết quả |
|---|---|---|
| 28/07 | `coquette_nurse` | 6/8 print $6.00–16.95; EMB tốt nhất chỉ $23.99 |
| 28/07 | `maestra_shirt` | 7/8 print $6.44–18.45; lớp thêu **1 listing** $36.00 organic |
| 29/07 | `literary_girl_style` | print war $5.92–16.99; listing "Embroidered" duy nhất **$7.19** → luật 31 loại |

**Quy luật:** *slug THẨM MỸ hút lớp print $6–17 và gần như không có tầng thêu; slug NGHỀ mới là nơi lớp thêu giữ giá.*
**→ Luôn vào bằng cửa NGHỀ, phủ thẩm mỹ lên trên. Không bao giờ mở SKU đứng riêng theo cửa thẩm mỹ.**
Bằng chứng ủng hộ cách dùng đúng (29/07): *Personalized Teacher **Side Bow** Cut-Out Sweatshirt* **$28.19 (1.4k rv, organic)** — motif nơ đặt **trên** ngách nghề đã có giá. Đây **không** phải hồi sinh mục coquette đã rejected, mà là đúng `action` đã ghi trong chính mục đó.

## SELF-CHECK BỔ SUNG
(u) mỗi phiên có mở ≥1 trang LISTING để verify production method + dossier (luật 47) · (v) anchor chỉ có từ trang listing thì ghi rõ `ad: unknown` và **không** vào watchlist luật 32 · (w) không đề xuất đồ mặc cho slug khung retirement/farewell (luật 48) · (x) mỗi lần nhắc phôi chăn/dệt kỷ niệm đều kèm 3 cảnh báo COGS (luật 49) · (y) không mở SKU theo cửa thẩm mỹ đứng riêng.
