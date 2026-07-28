# EraCloset JOB Daily Research — ROUTINE v3.5 (ĐẠI TU ĐO LƯỜNG + ĐỔI Ô CỜ)

> Đọc SAU `foxera-job-routine-v3.3.md` và `v3.4.md`. Khi mâu thuẫn: **v3.5 > v3.4 > v3.3 > trigger prompt**.
> v3.5 GIỮ: namespace 2 file, 7 khối B1..B7, nhãn review, nhãn technique, coverage ledger, shop dossier, 📌 CẦN CHÚ Ý.
> v3.5 **HUỶ hoặc SIẾT** một số luật cũ vì chúng đã sinh ra kết luận sai suốt 14 ngày. Đọc kỹ mục A trước khi chạy.
>
> **Lý do ra đời (28/07/2026):** audit 14 ngày do user thực hiện phát hiện 3 lỗi ĐO LƯỜNG GỐC làm hỏng phần lớn kết luận, cộng 8 điểm mù nội dung. Không phải chỉnh sửa nhỏ — đây là đổi *thứ được đo* và đổi *ô cờ đang đứng*.

---

## A) BA LỖI GỐC — LUẬT SỬA (29–31)

**Luật 29 — CẤM KẾT LUẬN VELOCITY TỪ rv THANG k.**
`listing rv` là tồn tích luỹ nhiều năm, hiển thị làm tròn ở thang k. Một listing 13.1k rv tăng 60 review/tuần vẫn hiện "13.1k". Cộng thêm: chỉ ~1–5% người mua để lại review, độ trễ 2–4 tuần. **Đo 3 ngày ở thang k = đo tiếng ồn.**
- Chỉ được kết luận velocity cho listing **< 500 (listing rv)**, và vẫn cần ≥3 điểm đo.
- Listing ≥ 1k rv: chuyển sang **nhịp đo HÀNG TUẦN**, và khi không đổi thì ghi đúng chữ: *"dưới ngưỡng phân giải hiển thị — KHÔNG kết luận"*, **cấm** viết "▬ đứng", "nguội", "demand chậm", "khai tử".
- 🚨 Ba kết luận sau bị HUỶ theo luật này: "goose print đã nguội" (347▬) · "Scrub Life Goose khai tử" (79▬ 5 ngày) · "hairstylist demand tempo chậm" (cụm đứng 2 ngày).

**Luật 30 — DISCOUNT % KHÔNG PHẢI BẰNG CHỨNG PRICE WAR.**
`$49.99→$20`, `$98.58→$37.46`, `$87.58→$34.16` là **kịch giá neo ảo gần như phổ cập trên Etsy**, không phải chiến tranh giá.
- Chỉ ghi **GIÁ CUỐI** vào metrics làm dữ liệu. Giá gốc chỉ ghi tham khảo, **cấm** dùng biên độ % làm luận điểm.
- **Cấm dùng cụm "price war" / "sập giá" / "chiết khấu hoá"** trừ khi có **≥2 điểm đo GIÁ CUỐI của CÙNG một listing** cho thấy giảm thật theo thời gian.
- Phân biệt cho đúng: *giá cuối quan sát được vẫn là dữ liệu thật* (một listing bán $9.34 thì mức giá đó có thật) — cái sai là suy ra "thị trường đang đánh nhau" hay "band đang sụp". Ghi "band quan sát $X–Y", không ghi "band đang sập".
- 🚨 Đánh dấu lại là CHƯA CHỨNG MINH: esthetician EMB "chiết khấu hoá" · "goose-nurse giá sập" · "work bestie đóng cửa" · "veterinary price war".

**Luật 31 — [EMB-title] KHÔNG ĐƯỢC CHẠM VÀO KẾT LUẬN BAND EMB.**
Listing title "Embroidered" bán $9.99–13.88 gần như chắc chắn là DTG nhồi keyword hoặc thêu 1 màu diện tích nhỏ từ chuỗi cung ứng khác.
- Mọi listing **title EMB nhưng giá < $21** → nhãn `[EMB-title?]` và **loại khỏi mọi tính toán band EMB**; chỉ được nhắc như "nghi nhãn sai".
- Kết luận về band EMB chỉ dựa trên: listing đã verify production method, HOẶC listing ≥ $21 có mô tả thêu rõ.

## B) ĐỔI THỨ ĐO (32–37)

**Luật 32 — WATCHLIST CHÍNH = LISTING KHÔNG AD, GIÁ > $28.** *(quy luật ẩn rút ra từ chính data 14 ngày)*
Lọc mọi listing giữ giá cao mà KHÔNG chạy Ad: Caduceus Bennett QZ $34.50/56.1k · Multicolor Name Crewneck $34.85/9.6k · Teacher Est-Year $31.45/6.3k · '90s Vibe teacher $42.59/1.5k · Silly Goose Hair Stylist $30.00/521 · Personalized Teacher Christmas $29.15/548 · Esthetician Personalized $35.99/50. Toàn bộ lớp $6–20 thì gần như 100% chạy Ad.
→ **Quy luật: organic + $29–43 = personalization sâu hoặc thẩm mỹ đẹp; phụ thuộc Ad ≈ hàng commodity.** Đây là tín hiệu chất lượng mạnh hơn rv rất nhiều.
→ B7 từ nay theo dõi **danh sách organic-cao-giá** làm trục chính; page 1 Ad-driven chỉ đọc lướt.

**Luật 33 — TỈ LỆ AD BADGE KHÔNG PHẢI DỮ LIỆU THỊ TRƯỜNG.**
"8/8 slot đều Ad" là trang Etsy trả cho một bot lạnh, không lịch sử duyệt, không cookie. Người mua thật thấy trang khác. **Cấm** kết luận "thị trường đốt Ad nặng" / "Ad-war" từ tỉ lệ badge. Ad badge chỉ dùng ở cấp **listing lẻ** (theo luật 32: có Ad hay không), không dùng ở cấp **thị trường**.

**Luật 34 — MỖI NGÁCH PHẢI CÓ ÍT NHẤT 1 TÍN HIỆU CẦU.**
14 ngày qua ~100% dữ liệu là CUNG (listing đối thủ page 1). Từ nay mỗi ngách được kết luận phải kèm ≥1 tín hiệu CẦU: eRank keyword/CTR · Etsy Seller Handbook · sold count nền tảng (TikTok Shop) · dòng chảy review (mục E) · Meta audience size. Không có → ghi thẳng **"chỉ có dữ liệu CUNG, chưa đo được CẦU"** và KHÔNG được chấm /40.

**Luật 35 — KHÔNG CÓ DÒNG BIÊN LỢI NHUẬN THÌ KHÔNG ĐƯỢC ĐỀ XUẤT SCALE.**
Mỗi ngách đề xuất phải có 1 dòng: `giá quan sát $X − (phôi + mũi thêu ước tính + fulfillment) − phí Etsy 12–15% − ads = contribution còn lại`.
⚠️ **BLOCKER HIỆN TẠI:** dự án CHƯA có số COGS thật (giá phôi crewneck heavyweight/QZ/tote, đơn giá thêu theo 1k mũi, phí fulfillment US). Cho tới khi user cung cấp, mọi đề xuất chỉ được dừng ở mức **"thăm dò / artwork"**, KHÔNG được ghi "scale". Bot phải nhắc thiếu số này trong 📌 CẦN CHÚ Ý của khối B2 mỗi lần chấm điểm.

**Luật 36 — ĐO MỨC ĐỘ TẬP TRUNG (cross-market operator).**
Ghi nhận khi một listing/shop xuất hiện page 1 ở **≥2 slug** (đã thấy: Jerzees QZ 6.3k ở 2 nơi; QZ 294–297rv $36.67 ở 3 slug). Nếu ≥3 slug → gắn cờ `cross-market operator` trong shop dossier. Nếu 3–4 shop giữ page 1 của ≥6 nghề thì **bản đồ cạnh tranh phải vẽ lại** — báo động trong 📌 CẦN CHÚ Ý.

**Luật 37 — NGÀY KHÔNG CÓ NGUỒN LIVE → BÁO CÁO NGẮN.**
Cấm sinh 7 khối chữ từ không có gì (định dạng cũ đang **ép bot sản xuất kết luận từ dữ liệu trống**). Ngày 0 fetch 200: B1 viết đúng 3 dòng (⛔️ nguồn chặn · việc xếp cho run bù · 1 tín hiệu tươi từ WebSearch nếu có), B2..B7 đều "⏸ Không đổi" + 📌 CẦN CHÚ Ý một dòng. Ngắn là ĐÚNG, không phải lỗi.

## C) ĐỔI Ô CỜ (38–40)

**Luật 38 — STOP-LIST (không nghiên cứu nữa; chạm phải thì ghi "đã dừng theo v3.5"):**
`goose` mọi nghề · `career sweatshirt` generic · `work bestie` generic · `social worker` (print war, page 1 không EMB) · `esthetician EMB` · đối đầu `SLP QZ` · và **mốc gate 01/08** (B2S 2026 cho design MỚI đã lỡ — eRank cho thấy CTR "back to school shirt" đỉnh từ **tháng 6**; mốc 01/08 là do bot tự đặt và đã hút hết chú ý suốt 10 báo cáo).

**Luật 39 — QUOTA CHÚ Ý (chống bẫy tín hiệu dễ thấy).**
Không ngách nào được chiếm **>30% dung lượng báo cáo trong 1 tuần**. Bài học goose: chiếm 60–70% dung lượng 10 ngày trong khi theo đúng tiêu chí của chính bot thì nó đã là **đại dương đỏ** (print commoditize đa kênh, EMB đã có lớp established 1.2k/989/411 rv, YouTube đã broadcast niche, listing chết ~5/tuần, cụm chữ chính dính TM). **Dễ thấy = đã đông.**

**Luật 40 — Ô CỜ MỚI (thứ tự ưu tiên nghiên cứu hằng ngày).**
> **Thẩm mỹ đẹp (coquette / bow / floral / vintage / cottagecore) × NGHỀ × CỘT MỐC, trên ĐỒ VẬT QUÀ TẶNG + ĐƠN TEAM, band $30–45, mục tiêu ORGANIC không Ad.**

Thứ tự theo độ chắc và theo lead-time:

**① Q4 (gấp nhất — deadline thật).** nurse Christmas EMB 36/40 · teacher Christmas EMB: lớp EMB **mỏng và giữ $31–43** (trần $42.59 organic) giữa lớp print — cấu trúc ngược hẳn work-bestie/career. Artwork T8, list 15/9–01/10.

**② ĐƠN TEAM / PHÒNG BAN (trần cao nhất, gần như vô hình với đối thủ).** Bằng chứng rải khắp: Custom Teacher/Team 3.2k · Admin Team 871 · Nurse Gingerbread Team 234 · Chenille Team 212 · dental "office team name" · SLP "name+title+dept". **Verify 28/07 (live 200):** page 1 slug `team_sweatshirts_for_work` **KHÔNG có một dòng nào về bulk / MOQ / báo giá / phòng ban** — toàn listing đơn chiếc có ô nhập tên. Tức là **cầu có, cơ chế thì chưa ai xây**. Một đơn 12 áo × $32 = AOV $384. Đây là lời giải cho vấn đề kinh tế đã biết của nhà (FB ROAS <1, repeat thấp): **quote flow + mockup + bảng giá bậc thang + upload danh sách tên, chạy trên Shopify** (Etsy về cấu trúc không làm được báo giá số lượng). Có doanh thu lặp (nhân sự mới, năm sau). Mùa đơn team đỉnh **T10–T12** → xây song song với ①, không đợi.

**③ ĐỒ VẬT QUÀ TẶNG THÊU, KHÔNG PHẢI ÁO — nhưng CHỌN LOẠI, đừng gộp.** Lợi thế vận hành: áo = ma trận size × màu (XS–5X × 14 màu); tote/apron/patch = **1 SKU**.
- ✅ **TOTE là cửa tốt nhất (verify 28/07 live 200, `teacher_tote_bag`):** EMB tote organic **$22.00/333rv** và **$24.15/667rv** (không Ad) · EMB tote Ad $41.96/1.8k · EMB icons $22.00. Band EMB tote **$22–42**, có slot organic — đúng ô cờ luật 32.
- ⚠️ **ORNAMENT là bẫy, KHÔNG phải cửa trống (verify 28/07 live 200, `personalized_nurse_ornament`):** page 1 **không có một sản phẩm thêu/gỗ nào**; toàn ceramic/acrylic **$3.50–17.99** (organic ở $3.50 · $5.99 · $16.73 · $17.99). Kỳ vọng giá của category này **trần ~$18** — đưa hàng thêu $20+ vào là bơi ngược. 🚨 Đính chính ghi chú cũ "ornament/hanging chưa ai chiếm": có người chiếm, chỉ là **khác vật liệu và khác band giá**.
- Chưa đo: apron (barber 251), badge reel, bandana.

**④ MILESTONE & BẢN SẮC, KHÔNG PHẢI CÂU ĐÙA.** Est-year (verified $31.45 organic, 6.3k) · new-grad/class-of · first year · nghỉ hưu · thăng cấp. Góc chưa ai đụng: **"Maestra" tiếng Tây Ban Nha** ($38 · 104 sold TikTok Shop) — tệp cô giáo Latina/song ngữ, đối thủ EN-only không nghĩ tới. **Quà cột mốc ít nhạy giá; câu đùa hết hạn theo tháng.**

**Tín hiệu bị đánh giá thấp nhất — COQUETTE/BOW, nâng lên trục chính:** xuất hiện độc lập ở nurse (5.5k) · SLP (1.6k) · teacher Christmas (5.7k) · hairstylist side-bow (1.4k) · TikTok bow&stethoscope **$55 = giá cao nhất verified ngoài Etsy**, và được **Etsy Seller Handbook SS2026 gọi tên trực tiếp** ("World of Whimsy", "Soft Stitch Era"). Nguồn sơ cấp + chéo nghề + chéo kênh + trần giá cao nhất — chồng bằng chứng **mạnh hơn goose ở mọi mặt**.

## D) DÒNG CHẢY REVIEW — PHẢI CHUYỂN SANG MÁY USER

Đề xuất "đọc ngày tháng 20 review gần nhất để có tốc độ bán thật" là **đúng về nguyên lý và là thứ thay thế hoàn toàn trò đo rv 3 ngày** — nhưng **đã TEST 28/07 và KHÔNG chạy được từ cloud**: Etsy render review bằng JS; WebFetch listing `1607898769` trả về **shop total (10,559) nhưng KHÔNG có listing rv và KHÔNG có một dòng ngày review nào** (bonus: listing đó hiện UNAVAILABLE — shop đang nghỉ; thêm 1 case stale index).
→ **Giải pháp: scheduled task LOCAL trên máy user** (không bị PROVENANCE, có JS). Prompt gợi ý, chạy 1–2 lần/tuần:
> "Mở 8–10 URL Etsy trong watchlist organic-cao-giá của /tmp/jobrepo/foxera-job-metrics.jsonl. Với mỗi listing: (1) tab 'Reviews for this item' → đếm số review trong 30 ngày gần nhất + ngày review mới nhất; (2) listing rv vs shop rv; (3) listed date nếu có; (4) đọc 10 review gần nhất tìm than phiền QC/size/ship; (5) giá cuối + production method. Ghi vào foxera-job-metrics.jsonl dòng hôm nay với reverified_live=true. Commit + push. Locale US/USD."
Khi có dữ liệu này: **"23 review trong 30 ngày qua"** thay thế toàn bộ trò đo rv 3 ngày, và nội dung review trở thành **nguyên liệu định vị** (lỗi QC/size/ship của đối thủ), không phải số liệu.
Cho tới lúc đó, bot cloud **luôn ghi listed date khi thấy** (đã bắt được 1 lần 31/03/2026 rồi bỏ) để tính rv/tháng kể từ ngày list.

## E) SELF-CHECK BỔ SUNG (thêm vào luật 14 + v3.4)
(j) không có chữ "price war/sập giá" nếu chưa đủ 2 điểm đo giá cuối (luật 30) · (k) không có verdict velocity cho listing ≥1k rv (luật 29) · (l) mọi ngách được chấm /40 đều có ≥1 tín hiệu CẦU (luật 34) · (m) mọi đề xuất scale đều có dòng margin, hoặc hạ xuống "thăm dò" (luật 35) · (n) không ngách nào >30% dung lượng (luật 39) · (o) không nghiên cứu mục trong stop-list (luật 38).
