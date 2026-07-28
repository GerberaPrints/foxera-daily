# EraCloset JOB Daily Research — ROUTINE v3.6 (DEEP+WIDE SWEEP + ĐẦU RA TRIỂN KHAI ĐƯỢC)

> Đọc SAU v3.3 → v3.4 → v3.5. Ưu tiên khi mâu thuẫn: **v3.6 > v3.5 > v3.4 > v3.3 > trigger prompt**.
> v3.6 GIỮ toàn bộ luật 1–40. THÊM luật 41–46 + 2 kỹ thuật quét mới + bảng ưu tiên ngách ĐÃ HIỆU CHỈNH bằng 17 market live ngày 28/07/2026.
>
> **Lý do ra đời:** user yêu cầu "báo cáo dữ liệu sâu, rộng để TRIỂN KHAI". Sweep 17 market trong 1 ngày cho thấy: (a) chiều RỘNG (nhiều slug cùng lúc) sinh ra insight mà chiều SÂU (1 slug nhiều ngày) không bao giờ sinh ra được; (b) 4/9 giả thuyết chiến lược của chính bot bị chính dữ liệu bác bỏ khi quét rộng; (c) báo cáo cũ dừng ở "nên vào ngách nào" mà không nói được "list cái gì, giá bao nhiêu, biên còn bao nhiêu" — tức là chưa triển khai được.

---

## LUẬT 41 — MỖI TUẦN 1 LẦN "DEEP+WIDE SWEEP" (≥12 market/ngày)

Rotation hằng ngày 2–3 market (luật 23) là để **canh gác**. Nó KHÔNG phát hiện được cấu trúc thị trường. Mỗi tuần chọn 1 ngày (mặc định **thứ Ba**) quét **≥12 market trong cùng một phiên**, chia theo 4 trục để so sánh chéo được:
1. **Trục NGHỀ** (cùng sản phẩm, khác nghề) — lộ nghề nào chịu giá cao.
2. **Trục SẢN PHẨM** (cùng nghề, khác phôi) — lộ phôi nào giữ giá. *(28/07: apron $45.50 > tote $24 > mũ $15 cho cùng tệp.)*
3. **Trục KHUNG MUA** (slug "gift" vs slug "shirt") — xem luật 42.
4. **Trục ĐỐI CHỨNG** (1 slug đã quét trước đó) — để biết mình đang so với cái gì.

Đầu ra bắt buộc của ngày sweep: **bảng cơ hội xếp hạng** (market · listing đáng chú ý · giá · rv · Ad/organic · 1 dòng đọc), KHÔNG phải 7 khối văn xuôi.

## LUẬT 42 — QUÉT SLUG "GIFT-FRAMED", KHÔNG CHỈ SLUG "PRODUCT-FRAMED"

Phát hiện 28/07: cùng một nghề, slug **khung quà tặng** cho mặt bằng giá cao hơn hẳn slug **khung sản phẩm**.
- `nursing_school_graduation_gift` → EMB jacket **$62.90** (10.1k rv) — cao nhất toàn dự án; page 1 còn có cốc Owala $79.
- `nurse_christmas_gift` → EMB QZ **$34.84**, và là **EMB apparel DUY NHẤT** page 1.
- `teacher_retirement_gift` → page 1 chủ yếu **không phải áo** (tranh khung $49.95, thớt $20, tranh nước $39.99) — category chấp nhận $20–50 cho vật kỷ niệm.
→ Quy tắc: mỗi nghề trong watch-list phải có **cả 2 loại slug** trong coverage ledger. Người mua quà và người mua cho mình là **hai thị trường khác nhau về giá**, không được gộp.

## LUẬT 43 — SO PHÔI TRƯỚC KHI SO NGÁCH

Trước khi kết luận "ngách X đáng vào", phải biết **phôi nào trong ngách đó giữ giá**. Đo 28/07 cho cùng tệp nghề:
`apron EMB $17–45.50` · `tote EMB $22–42` · `crewneck EMB $25–43` · `QZ EMB $26–37` · `scrub cap EMB $10–20` · `mũ lưỡi trai EMB $11.52–15.12`.
→ Kết luận nền: **apron và crewneck là hai phôi biên dày nhất**; **QZ là phôi đắt nhất và ăn hết biên ở band $34**; **mũ/cap là bậc thang giá thấp, không phải trụ doanh thu**.

## LUẬT 44 — MỖI NGÁCH ĐỀ XUẤT PHẢI KÈM 3 THỨ MỚI ĐƯỢC COI LÀ "TRIỂN KHAI ĐƯỢC"

Không đủ 3 thứ này thì chỉ được ghi "quan sát", không được ghi "đề xuất":
1. **Title listing-ready** theo cấu trúc `[Technique]+[Core Product]+[Occupation]+[Personalization]+[Occasion]` — viết bằng ngôn ngữ đã thấy trên page 1 của chính slug đó.
2. **Band giá mục tiêu**, neo vào ≥2 listing organic quan sát được (không neo vào listing Ad).
3. **Dòng biên lợi nhuận** theo luật 35 (hoặc ghi rõ "chờ COGS" + ước lượng khoảng).

## LUẬT 45 — GHI NHẬN GIẢ THUYẾT BỊ BÁC BỎ (không âm thầm bỏ qua)

Mỗi sweep phải có mục **"giả thuyết bị dữ liệu bác bỏ hôm nay"**. Giả thuyết chết là đầu ra có giá trị ngang giả thuyết sống — nó tiết kiệm tiền thật. Ghi vào metrics field `rejected` để không hồi sinh.
Đã bác bỏ 28/07:
- ✗ **Ornament thêu là cửa trống** — `personalized_nurse_ornament` page 1 **không có sản phẩm thêu/gỗ nào**, toàn ceramic/acrylic $3.50–17.99, trần category ~$18 → hàng thêu $20+ bơi ngược. LOẠI.
- ✗ **Coquette/bow sẵn sàng thu hoạch ở tầng premium** — `coquette_nurse` 6/8 là print $6.00–16.95 (rv 18.1k/10.5k/5.7k); bản EMB tốt nhất chỉ $23.99. Cầu có, **tầng giá thêu chưa được chứng minh trên Etsy**; $55 TikTok là ngoại lệ 1 điểm. → Dùng coquette làm **lớp thẩm mỹ phủ lên ngách đã có giá cao**, KHÔNG mở SKU coquette đứng riêng đấu print $6.
- ✗ **Mũ thêu × nghề là bậc phụ kiện ngon** — scrub cap **thêu** $10–19.99; những cái $35–39.99 là **in ảnh/vẽ tay** không phải thêu; mũ lưỡi trai thêu bị xả $11.52–15.12. Chỉ vintage nurse cap $32 (109 rv organic) giữ giá nhưng quá hẹp. → Hạ xuống hàng kèm.
- △ **"Đơn team là đại dương xanh"** — ĐÚNG về cơ chế (3 slug team: `team_sweatshirts_for_work`, `nurse_team_shirts`, `dental_office_shirts` — **không listing nào có MOQ/báo giá/danh sách tên**), nhưng SAI nếu định vị là "xưởng thêu logo": `custom_logo_embroidered_sweatshirt` đã rất đông (EMB Logo Hoodie $36.21/13.8k · Business Logo $25.48/10.2k · Company Logo QZ "Team Uniform" $18.35/857 organic). Mặt bằng team hiện tại là **áo in $4.44–17.79**.
  → Định vị đúng: **"chương trình QUÀ TẶNG cho cả phòng ban"** (thiết kế riêng theo nghề + danh sách tên từng người + hộp quà), KHÔNG phải "đồng phục logo". Người quyết định là **trưởng nhóm mua quà Giáng sinh**, không phải phòng mua hàng. Phải nói thẳng đối chứng giá: 12 × $32 = $384 vs 12 áo in × $8 = $96.

## LUẬT 46 — BẢNG ƯU TIÊN NGÁCH (hiệu chỉnh 28/07, thay bảng luật 40)

| # | Ngách | Bằng chứng giá (live 28/07) | Trạng thái |
|---|---|---|---|
| ① | **Mốc sự nghiệp** (tốt nghiệp · nghỉ hưu · năm đầu · thăng cấp) | EMB Medical Jacket **$62.90** (10.1k) · Nurse tote **$30.00** organic (644) · EMB retirement tote $28.38 organic (404) · Est-year $31.45 organic (6.3k) | **ƯU TIÊN 1** — trần cao nhất, ít nhạy giá nhất, không phụ thuộc mùa |
| ② | **Vật dụng nghề — APRON trước, tote sau** | Logo apron **$45.50** (501) · linen apron $43.34 organic (322) · pet apron $39.94 (2k) · stylist apron $32.24 (654) · teacher tote $22–24 organic | **ƯU TIÊN 2** — biên dày nhất, 1 SKU không size |
| ③ | **Q4 Christmas EMB** | '90s Vibe teacher **$42.59** organic (1.5k) · Caduceus nurse QZ $34.50 organic (56.1k) · nurse gift QZ $34.84 (11.5k) · đối chứng teacher ngày thường $26.90 → **mùa nâng trần +$6–16** | **ƯU TIÊN 3** — cửa hẹp, artwork T8, list 15/9–01/10 |
| ④ | **Bản sắc / ngôn ngữ** | Maestra EMB **$36.00** organic (220) giữa 7 listing print $6.44–18.45 (rv 17.5k/15k/12.9k/11.6k/8k) — **lớp thêu chỉ 1 listing** | **ƯU TIÊN 4** — ngách EMB mỏng nhất đo được |
| ⑤ | **Chương trình quà theo nhóm** (Shopify) | 3 slug team, 0 listing có cơ chế báo giá số lượng | **XÂY SONG SONG** — mùa T10–T12, phải sống trước tháng 10 |

⚠️ Đính chính giả định cũ: **Maestra KHÔNG phải "chưa ai đụng"** — rất đông ở tầng print. Cái trống là **tầng thêu**. Đây là mẫu hình luật 32 rõ nhất: cầu đã được lớp print chứng minh, lớp thêu bỏ ngỏ.

## KỸ THUẬT: 2 THỨ CLOUD KHÔNG LÀM ĐƯỢC (đừng thử lại mỗi ngày)
1. **Ngày tháng review** — Etsy render bằng JS. Test 28/07 listing `1607898769`: chỉ trả shop total 10,559, không có listing rv, không có ngày nào.
2. **Tên shop ở list view** — Etsy ẩn; 3 ngày liên tiếp không cập nhật được shop dossier.
→ Cả hai đều là việc của **scheduled task LOCAL trên máy user** (v3.5 mục D). Bot cloud chỉ ghi nhận, không lặp lại nỗ lực.

## SELF-CHECK BỔ SUNG
(p) ngày sweep có bảng cơ hội xếp hạng, không phải văn xuôi · (q) mỗi nghề trong ledger có cả slug gift-framed lẫn product-framed · (r) mọi "đề xuất" có đủ 3 thứ của luật 44 · (s) sweep có mục "giả thuyết bị bác bỏ" · (t) không hồi sinh mục trong `rejected`.
