# FoxEra Daily Intelligence — KIẾN TRÚC HỆ THỐNG **SYSTEM v2** (ADDENDUM cho SYSTEM.md)

**Lập 28/07/2026.** Đọc SAU `SYSTEM.md`. v2 GIỮ TOÀN BỘ v1 (sơ đồ 3 tầng · bản đồ namespace · luật cứng git · 13 kỷ luật dữ liệu · chuỗi health-check · checklist thêm bot). Khi mâu thuẫn: **SYSTEM-v2 > SYSTEM v1**.

> Theo đúng SYSTEM v1 §5.10 — *"Mọi lỗi mới → ghi vào routine-vN+1 của bot đó **và** cân nhắc nâng SYSTEM này (bài học là tài sản chung)"* — file này nâng những bài học có tính **phổ quát** lên tầng hệ thống. Bài học riêng của từng brand vẫn nằm ở routine-vN của brand đó.

**Nguồn gốc:** audit 14 ngày bot Job (28/07/2026) phát hiện 3 lỗi ĐO LƯỜNG GỐC làm hỏng phần lớn kết luận, và 1 phiên sweep 17 market cho thấy 4/9 giả thuyết chiến lược sai. Quét chéo `foxera-metrics.jsonl` · `genusfaith-metrics.jsonl` · `gerbera-metrics.jsonl` · `gritfell-metrics.jsonl` ngày 28/07 xác nhận **các lỗ hổng dưới đây không phải của riêng bot Job**.

---

## S1 — VELOCITY KHÔNG ĐO ĐƯỢC Ở THANG k

Review/rating count là **tồn tích luỹ nhiều năm**, hiển thị **làm tròn**. Một listing 13.1k rv tăng 60 review/tuần vẫn hiện "13.1k". Chỉ ~1–5% người mua để lại review, độ trễ 2–4 tuần. **Đo 2–5 ngày ở thang k = đo tiếng ồn, không phải đo thị trường.**

- Chỉ kết luận velocity cho đơn vị **< 500 review**, và vẫn cần ≥3 điểm đo.
- ≥1k review → **nhịp đo HÀNG TUẦN**; khi không đổi phải ghi đúng chữ *"dưới ngưỡng phân giải hiển thị — không kết luận"*.
- **CẤM** các chữ: "▬ đứng", "nguội", "khai tử", "demand chậm", "đã bão hoà" khi chỉ dựa trên số thang k đứng yên vài ngày.
- Bot Job đã phải HUỶ 3 kết luận vì lỗi này. *(Áp cho mọi bot dùng review count làm tín hiệu: FoxEra Etsy · GenusFaith · Gerbera · GritFell.)*

## S2 — % GIẢM GIÁ KHÔNG PHẢI BẰNG CHỨNG CHIẾN TRANH GIÁ

`$49.99→$20`, `$98.58→$37.46`, `$87.58→$34.16` là **kịch giá neo ảo gần như phổ cập** trên Etsy/Amazon/Shopify. Nó nói về *chiến thuật hiển thị của người bán*, không nói gì về áp lực cạnh tranh.

- Chỉ ghi **GIÁ CUỐI** vào metrics. Giá gốc chỉ để tham khảo, **cấm** dùng biên độ % làm luận điểm.
- **Cấm** cụm "price war / sập giá / chiết khấu hoá / đạp giá" trừ khi có **≥2 điểm đo GIÁ CUỐI của CÙNG một đơn vị** cho thấy giảm thật theo thời gian.
- Phân biệt cho đúng: **giá cuối quan sát được vẫn là dữ liệu thật**; cái sai là suy ra "thị trường đang đánh nhau". Viết *"band quan sát $X–Y"*, không viết *"band đang sập"*.

## S3 — NHÃN KỸ THUẬT / VẬT LIỆU TRONG TITLE NÓI DỐI Ở **CẢ HAI ĐẦU** GIÁ

Bài học Job 28/07, hai chiều ngược nhau trong cùng một ngày:
- **Đầu thấp:** title "Embroidered" bán $9.99–13.88 → gần như chắc chắn là DTG nhồi keyword. Dùng chúng để tính band thêu = **tự làm nhiễm luận điểm cốt lõi của chính mình**.
- **Đầu cao:** scrub cap $35–39.99 title/ngữ cảnh gợi thêu → thực tế là **in ảnh / vẽ tay**.

→ Luật: mọi nhãn kỹ thuật chưa mở đơn vị để xác minh đều là `[nhãn?]`. Kết luận về **band giá theo kỹ thuật** chỉ được dựa trên đơn vị đã verify hoặc có mô tả rõ. *(Áp cho mọi bot so sánh "cùng kỹ thuật/chất liệu": thêu vs in, da thật vs PU, gỗ vs acrylic…)*

## S4 — TIÊU CHÍ CHỌN NGÁCH: **ORGANIC + GIÁ CAO**, KHÔNG PHẢI REVIEW TO ⭐

Quy luật rút từ toàn bộ dữ liệu Job (và là **lỗ hổng lớn ở cả 4 bot** — cụm "organic / no-Ad" gần như không xuất hiện trong metrics của bot nào):

> **Đơn vị giữ giá cao mà KHÔNG chạy Ad = personalization sâu hoặc thẩm mỹ đẹp. Phụ thuộc Ad ≈ hàng commodity.**

Bằng chứng Job (organic, không Ad): $62.90 · $45.50 · $43.34 · $42.59 · $36.00 · $34.50 · $32.00 · $30.00 — trong khi toàn bộ lớp $4–20 gần như 100% chạy Ad.

- Watchlist chính của mỗi bot từ nay = **đơn vị KHÔNG Ad, giá ở nửa trên của band brand mình**.
- Đây là tín hiệu chất lượng **mạnh hơn review count rất nhiều**: review nói về quá khứ tích luỹ, "giữ giá mà không mua vị trí" nói về **hôm nay**.

## S5 — TỈ LỆ AD BADGE TRÊN PAGE 1 KHÔNG PHẢI DỮ LIỆU THỊ TRƯỜNG

"8/8 slot đều Ad" là trang mà sàn trả cho **một bot lạnh** — không lịch sử duyệt, không cookie, không tín hiệu cá nhân hoá. Người mua thật thấy trang khác.
→ **Cấm** kết luận "thị trường đốt Ad nặng / Ad-war" từ tỉ lệ badge. Ad badge chỉ dùng ở **cấp đơn vị** (cái này có Ad hay không — theo S4), không dùng ở **cấp thị trường**.

## S6 — 🔴 KHÔNG CÓ BIÊN LỢI NHUẬN THÌ KHÔNG ĐƯỢC ĐỀ XUẤT *(lỗ hổng phổ quát nhất)*

Quét ngày 28/07: **0/4 bot** từng viết một dòng nào về giá vốn, biên, hay contribution. Tất cả đang khuyên "vào ngách X ở band $Y" mà chưa bao giờ hỏi **còn lại bao nhiêu**.

Mỗi đề xuất phải kèm 1 dòng:
```
giá quan sát $X − (phôi/nguồn hàng + gia công + fulfillment) − phí sàn % − chi phí ads = contribution
```
- Chưa có COGS thật → **chỉ được ghi "thăm dò"**, tuyệt đối không ghi "scale", và phải **nhắc user gửi số** trong mục CẦN CHÚ Ý.
- Ví dụ vì sao sống còn (Job 28/07): cùng band giá, **crewneck và apron còn $11–26 nhưng quarter-zip gần như hoà vốn** trước khi tính Ad. Nếu không có dòng này, bot sẽ hồn nhiên đẩy brand vào đúng cái phôi không có lãi.

## S7 — KHUNG MUA LÀ MỘT BIẾN GIÁ ĐỘC LẬP (gift-framed vs product-framed)

Cùng một đối tượng, **slug/khung "quà tặng" cho mặt bằng giá cao hơn hẳn** slug "sản phẩm":
- `nursing_school_graduation_gift` → jacket thêu **$62.90** (trần cao nhất toàn dự án Job) · page 1 còn có cốc $79.
- `nurse_christmas_gift` → QZ thêu $34.84 và là **đơn vị thêu DUY NHẤT** page 1.
- `teacher_retirement_gift` → page 1 **chủ yếu không phải áo**: tranh khung $49.95, thớt $20, tranh nước $39.99.

→ Mỗi đối tượng trong watch-list phải có **cả hai loại khung** trong coverage ledger. Người mua QUÀ và người mua CHO MÌNH là **hai thị trường khác nhau về giá** — không được gộp. *(GenusFaith vốn đã sống ở khung quà; FoxEra Etsy, Gerbera, GritFell gần như chưa quét khung này — đây là mỏ chưa đào.)*

## S8 — GIẢ THUYẾT BỊ BÁC BỎ LÀ ĐẦU RA HẠNG NHẤT

Mỗi lần quét rộng phải có mục **"giả thuyết bị dữ liệu bác bỏ hôm nay"**, ghi vào field `rejected` trong metrics để **không hồi sinh**. Giả thuyết chết tiết kiệm tiền phôi thật — nó có giá trị ngang giả thuyết sống, và phải được viết ra thay vì âm thầm bỏ qua.
Bot Job hiện có 5 mục `rejected`. *(Bổ sung cho luật 11 SYSTEM v1 về đính chính: đính chính sửa cái đã nói SAI; `rejected` chặn cái sắp làm SAI.)*

## S9 — NHỊP: CANH GÁC HẰNG NGÀY + QUÉT RỘNG HẰNG TUẦN

Rotation 2–3 đơn vị/ngày là để **canh gác**; nó không bao giờ lộ ra **cấu trúc**. Mỗi tuần chọn 1 ngày quét **≥12 đơn vị trong cùng một phiên**, chia theo 4 trục để so chéo được:
1. **Đối tượng** (cùng sản phẩm, khác tệp) · 2. **Sản phẩm/phôi** (cùng tệp, khác vật) · 3. **Khung mua** (S7) · 4. **Đối chứng** (1 đơn vị đã quét trước).

Đầu ra ngày quét rộng = **bảng xếp hạng cơ hội**, KHÔNG phải văn xuôi. Một phiên rộng của bot Job lộ ra thứ mà 14 ngày đào sâu không lộ: **phôi nào giữ giá** (apron $17–45.50 > tote $22–42 > crewneck $25–43 > QZ $26–37 > mũ $11–20).

## S10 — NGÀY KHÔNG CÓ NGUỒN LIVE → BÁO CÁO NGẮN

Định dạng "phải đủ N khối" đang **ép bot sản xuất kết luận từ dữ liệu trống**. Ngày 0 fetch 200: khối đầu viết 3 dòng (⛔️ nguồn chặn · việc xếp cho run bù · 1 tín hiệu tươi từ WebSearch nếu có), các khối còn lại "⏸ Không đổi" + 1 dòng cần-chú-ý. **Ngắn là ĐÚNG, không phải lỗi.** *(Siết chặt luật 13 SYSTEM v1.)*

## S11 — HAI VIỆC MÔI TRƯỜNG CLOUD KHÔNG LÀM ĐƯỢC (đừng thử lại mỗi ngày)

Đã test và thất bại 28/07, ghi lại để mọi bot khỏi tốn quota:
1. **Ngày tháng review của từng đơn vị** — Etsy render bằng JS; fetch listing chỉ trả về tổng review của shop, không có review count riêng, không có ngày nào.
2. **Tên shop ở list view** — sàn ẩn; 3 ngày liên tiếp không cập nhật được shop dossier.

→ Cả hai là việc của **scheduled task LOCAL trên máy user** (có JS, không bị PROVENANCE gate). Đây là nâng cấp hạ tầng **giá trị nhất còn lại** cho toàn hệ: có nó thì *"23 review trong 30 ngày qua"* thay thế hoàn toàn trò đo review vài ngày (S1), và nội dung review của đối thủ trở thành **nguyên liệu định vị** (lỗi QC/size/ship) chứ không chỉ là số.

---

## SELF-CHECK CHUNG BỔ SUNG (thêm vào SYSTEM v1 §4.1)

Trước push, mọi bot kiểm thêm:

| | Kiểm |
|---|---|
| a | Không có verdict velocity cho đơn vị ≥1k review (S1) |
| b | Không có chữ "price war/sập giá" nếu chưa đủ 2 điểm đo giá cuối (S2) |
| c | Mọi nhãn kỹ thuật chưa verify đều mang dấu `?` (S3) |
| d | Watchlist có ít nhất vài đơn vị **organic giá cao** (S4) |
| e | Không kết luận thị trường từ tỉ lệ Ad badge (S5) |
| f | **Mọi đề xuất có dòng biên, hoặc bị hạ xuống "thăm dò"** (S6) |
| g | Ngày quét rộng có mục `rejected` (S8) |
| h | Ngày 0 nguồn live → báo cáo ngắn, không nống chữ (S10) |

## SỔ NGUỒN BÀI HỌC (bổ sung §6 SYSTEM v1)
- `foxera-job-routine-v3.5.md` — đại tu đo lường (luật 29–40): 3 lỗi gốc + stop-list + trục organic.
- `foxera-job-routine-v3.6.md` — sweep sâu-rộng (luật 41–46): khung mua, so phôi, đầu ra triển-khai-được, `rejected`.
- `foxera-routine-v5.md` — luật 17/18 (CẦN CHÚ Ý cuối khối · nhãn độ sớm trend) + B10 trend-to-design arbitrage.
