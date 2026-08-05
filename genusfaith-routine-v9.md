> # 🔴🔴 CHẶN ĐẦU — ĐỌC THEO THỨ TỰ NÀY 🔴🔴
> **1.** `cat SYSTEM-v2.md` (luật S1–S11) → **2.** file này (`genusfaith-routine-v9.md`) → **3.** `genusfaith-routine-v8.md` (luật 1–12) → **4.** trigger prompt.
> Ưu tiên khi mâu thuẫn: **SYSTEM-v2 > v9 > v8 > trigger prompt.**
> v9 **GIỮ TOÀN BỘ** luật 1–12 và cấu trúc 8 khối B1–B8 của v8.1. v9 chỉ **THÊM** luật 13–24 và **SỬA** 3 chỗ được nêu đích danh ở mục "ĐÍNH CHÍNH".

<!-- ═══════════════════════════════════════════════════════════════
     BẢN v9.0 — 05/08/2026 — SHOPIFY FEED + COVERAGE LEDGER + HEALTH KPI

     LÝ DO RA ĐỜI: phiên rà soát toàn dự án 05/08/2026 (do user yêu cầu,
     có đối chiếu chéo với dự án Etsy: foxera-routine-v5, foxera-job-routine
     v3.3→v4.2, SYSTEM v1/v2, local-verify/, etsy-multibot-gas-v1).

     PHÁT HIỆN BUỘC PHẢI SỬA SPEC — cả bốn đều là lỗi ĐO LƯỜNG GỐC, cùng
     một họ với 3 lỗi mà bot Job phát hiện ngày 28/07:

     (1) 4/6 đối thủ trực diện là Shopify và MỞ CÔNG KHAI /products.json.
         Suốt 22 ngày GenusFaith đọc HTML bằng mắt, đếm tay, và cãi nhau
         với chính mình về "lưới nói In Stock hay Sold Out" — trong khi
         nguồn cấp variant, có created_at chính xác tới giây, nằm ngay đó.
     (2) Trục variant của Feratia/Afroyla/Catholight là CHẤT LIỆU, và
         variant ĐẦU TIÊN của họ là VEGAN. Mọi so sánh giá từ 14/07 tới nay
         đã so DA THẬT của ta với DA VEGAN của họ. Đây là S3 ở dạng nặng
         nhất: nhãn chất liệu nói dối ở tầng variant, nơi mắt không thấy.
     (3) Khẳng định "Catholight In-Stock 24 SKU ZERO sold out" — trụ cột
         của ý tưởng in-stock-collection-shopify và của mọi so sánh
         "mô hình cung đối lập với Albuquerque" — SAI cả hai đầu:
         feed cho 20 product và 5 product có variant hết hàng.
     (4) GenusFaith là bot DUY NHẤT trong 4 bot KHÔNG có luồng desktop,
         KHÔNG có coverage ledger, KHÔNG có health KPI, KHÔNG có
         routine_version trong metrics.

     NGUYÊN TẮC CỦA BẢN NÀY: bot đang tiêu phần lớn ngân sách vào việc
     ĐỌC LẠI thứ máy có thể đọc chính xác hơn, và tiêu quá ít vào thứ chỉ
     người mới làm được (đọc review, chấm cổng, quyết định art). v9 chuyển
     việc đếm cho máy, để bot làm việc suy xét.
     ═══════════════════════════════════════════════════════════════ -->

---

# PHẦN A — ĐÍNH CHÍNH (làm trước mọi thứ khác)

Ba khẳng định dưới đây đã đi vào state và đã được dùng làm tiền đề. Chúng SAI. Ngày đầu tiên chạy v9 phải mở B7 bằng khối 🚨 ĐÍNH CHÍNH và ghi cả ba vào `rejected`.

### Đ1 — "Catholight In-Stock 24 SKU, ZERO sold out"
- Ghi nhận từ 20/07, `last_confirmed` 05/08, dùng làm bằng chứng cho *"mô hình cung đối lập với thin-batch Albuquerque"*.
- **Đo bằng feed 05/08:** collection `ready-to-ship-leather-bag` có **20 product**, trong đó **5 product có variant hết hàng** (Sacred Elegance SMALL · Holy Nativity SMALL · Testament of Grace SMALL · Our Lady's Eternal Glow SMALL · Timeless Faith TOP-GRAIN).
- **Sai ở đâu:** con số 24 đến từ việc đếm thẻ trên lưới HTML (đếm cả biến thể hiển thị); con số 0-sold-out đến từ việc lưới chỉ ẩn nhãn sold-out khi *ít nhất một* variant còn hàng.
- **Hệ quả lan truyền:** ý tưởng `in-stock-collection-shopify` mất trụ cột; mọi câu so sánh "Catholight cung khoẻ / Albuquerque cung yếu" phải rút lại.

### Đ2 — "PDP là nguồn có thẩm quyền, lưới thì không" (viết ngày 05/08)
- Đúng một nửa. Feed cho thấy đơn vị tồn kho thật là **VARIANT**, không phải PDP cũng không phải lưới. PDP hiện Sold Out khi *variant đang chọn* hết hàng; lưới hiện In Stock khi *bất kỳ variant nào* còn hàng. Hai bề mặt trả lời hai câu hỏi khác nhau, và **không bề mặt nào trả lời câu hỏi ta đang hỏi**.
- **Luật thay thế:** xem luật 15.

### Đ3 — mọi so sánh giá với Feratia / Afroyla / Catholight từ 14/07 tới 05/08
- Feed 05/08: variant đầu tiên của **26/26** product Feratia là `Premium Vegan Leather`; Catholight là `VEGANIQUE LEATHER`; Afroyla là `Premium Vegan Leather`. Bậc da thật của họ là variant RIÊNG, giá cao hơn (Feratia Top-Grain neo $229.95).
- **Hệ quả:** câu "Feratia bán ví $19.98 còn LW- của ta $44.95 = cao gấp 2,2 lần" là **so sai đơn vị**. Phải viết lại thành: ví VEGAN của họ $19.98 · bậc da thật của họ chưa đo · LW- da thật của ta $44.95.
- Đây là bằng chứng trực tiếp cho **S3** và phải được ghi vào `rejected` bằng đúng chữ "so sai đơn vị chất liệu".

---

# PHẦN B — LUẬT MỚI 13–24

## 13) 🥇 NGUỒN CẤP SẢN PHẨM (PRODUCT FEED) LÀ TIER A CAO NHẤT — ĐỌC TRƯỚC MỌI HTML

Đối thủ chạy Shopify thì `/{store}/products.json?limit=250&page=N` là **công khai, không cần đăng nhập, không phải scrape**. Đã xác minh 05/08 bằng WebFetch:

| Brand | Đường dẫn | Trạng thái 05/08 |
|---|---|---|
| Feratia | `feratia.com/products.json` | ✅ đọc được |
| Catholight | `catholight.com/collections/ready-to-ship-leather-bag/products.json` | ✅ (root products.json lỗi — dùng đường collection) |
| Afroyla | `afroyla.com/products.json` | ✅ |
| West Coast Catholic | `westcoastcatholic.co/products.json` | ✅ |
| Venxara | `venxara.com/products.json` | chưa test |
| Blessac | `blessac.com/products.json` | ⛔ robots ConnectTimeout (đã trong blocked_sources) |

**Thứ tự bắt buộc mỗi ngày:** feed TRƯỚC → HTML SAU. HTML chỉ còn dùng cho thứ feed không có (badge khan hàng, copy quảng cáo, coupon, review, claim vận chuyển).

**Feed cho gì mà HTML không cho:**
- `created_at` → **ngày ra mắt chính xác tới giây**. Xoá vĩnh viễn câu "lần đầu ghi nhận, chưa chắc mới".
- `available` **cấp variant** → tồn kho thật.
- `price` / `compare_at_price` cấp variant → hết mơ hồ grid-vs-PDP.
- `product_type` → **bản đồ định dạng đo được**, thay cho việc đếm tay.
- variant titles → **trục chất liệu / trục size** (xem luật 16).

⚠️ Feed phân trang. `limit=250` KHÔNG trả hết — Feratia trả 26 ở trang 1. Phải cuộn `&page=N` tới khi rỗng. Không cuộn = báo cáo thiếu catalog mà tưởng là đủ.

**Feed KHÔNG cho:** review, ngày review, traffic, doanh số, badge khan hàng, coupon, claim ship. Những thứ đó vẫn phải đọc HTML — và đó mới là chỗ đáng tiêu ngân sách đọc.

## 14) 🔴 `created_at` LÀ TRỌNG TÀI CỦA MỌI CÂU "MỚI"

Cấm dùng chữ **mới / vừa ra / vừa mở dòng** cho bất kỳ SP nào của brand có feed đọc được, trừ khi `created_at` nằm trong **14 ngày** gần nhất. Ghi kèm `created_at` + `age_days` mỗi lần nói.
- Brand không có feed (Blessac) → giữ nguyên luật cũ "lần đầu ghi nhận, chưa chắc mới".
- **Áp dụng ngay:** mẫu "Adora" của Feratia mà B4 ngày 05/08 gọi là "ghi nhận lần đầu" có `created_at` = **29/05/2026** → **68 ngày tuổi, KHÔNG mới**. Sửa lại trong state.
- Ngược lại, `created_at` còn phát hiện được thứ mắt không thấy: SP mới nhất trong In-Stock của Catholight là **24/01/2026** → **Catholight KHÔNG đưa SP mới nào vào dòng In-Stock hơn 6 tháng**. Đây là tín hiệu cấu trúc mà 22 ngày đọc lưới HTML chưa từng lộ ra.

## 15) 🔴 ĐƠN VỊ TỒN KHO LÀ **VARIANT**, KHÔNG PHẢI SKU, KHÔNG PHẢI PDP, KHÔNG PHẢI LƯỚI

Mọi ghi chép OOS phải ở cấp variant với 3 mức: `in_stock` (mọi variant còn) · `partial` (một số variant hết) · `sold_out` (mọi variant hết).
- **Chỉ `sold_out` mới được đếm là "SP hết hàng".** `partial` là chuyện khác hẳn và thường chỉ là hết 1 size.
- Cấm câu "N/M SKU sold out" nếu chưa phân biệt được 3 mức.
- `oos_watch` trong state phải thêm trường `oos_level` và `variants_oos`.
- Đối chiếu bắt buộc: nếu feed và HTML mâu thuẫn → **feed thắng**, và ghi 1 dòng vào `source_conflicts` để theo dõi bề mặt nào hay nói dối.

## 16) 🔴 TRỤC VARIANT PHẢI ĐƯỢC PHÂN LOẠI TRƯỚC KHI SO GIÁ (S3 cấp variant)

Mỗi brand phải mang nhãn `variant_axis`: **material** · **size** · **single** · **mixed**.
- Feratia / Afroyla = **material** (`Premium Vegan Leather` ↔ `Top-Grain Leather`)
- Catholight = **mixed** (SMALL/MEDIUM trên toàn bộ 20 SP, cộng VEGANIQUE/TOP-GRAIN trên 4 SP)

**LUẬT CỨNG:** khi trục là `material` hoặc `mixed`, **cấm so giá GenusFaith (da thật) với `price_min` của họ.** `price_min` là bậc VEGAN. Phải hoặc (a) so với variant top-grain của họ, hoặc (b) viết rõ hai bậc song song và **không** rút ra kết luận "ta đắt gấp N lần".

Mỗi báo cáo có so giá phải mang 1 dòng: `Bậc chất liệu: ta = da thật · <brand> = <tên variant> ($X) / <tên variant> ($Y)`.

Đây cũng mở ra một luận điểm định vị chưa từng dùng: **ba đối thủ trực diện đều mặc định bán VEGAN và bán da thật như hàng nâng cấp.** Nếu GenusFaith mặc định là da thật thì đó là điểm khác biệt có thể nói thẳng — nhưng phải **verify phôi của chính ta trước** (câu hỏi mở #3 COGS bao gồm cả việc xác nhận chất liệu). Chưa verify thì là HYPOTHESIS, cấm đưa vào copy.

## 17) 📒 COVERAGE LEDGER (nhập từ luật 23 bot Job)

State thêm khối `coverage`: `{"<đơn vị>": "YYYY-MM-DD" | "never"}`. Đơn vị = brand × bề mặt (`feratia:feed`, `feratia:pdp-eucharist`, `catholight:reviews`, `etsy:supermini`, `suggest:catholic bible cover`, …).

- Mỗi run **phải** cập nhật ledger và **phải giải trình** trong B7: hôm nay quét cái gì, **vì lý do gì theo ledger**.
- Thứ tự ưu tiên chọn mục tiêu: **(1)** giá trị `never` (cao nhất) · **(2)** quá hạn TTL · **(3)** có sự kiện nóng.
- **Cổng khe trống:** cấm câu "chưa ai làm X / khe trống" nếu đơn vị liên quan chưa có NGÀY trong ledger. Vắng mặt trong ledger ≠ vắng mặt trên thị trường. (Siết chặt luật 3 của v8.)

## 18) 🩺 HEALTH KPI + CẢNH BÁO CHỦ ĐỘNG (nhập từ luật 13 bot Etsy)

`genusfaith-daily.json` thêm khoá cấp cao `health`:
```
"health": {"feed_age_days": N, "days_since_live_number": N,
           "fetch_blocked_streak": N, "blocks_written": N,
           "status": "ok|degraded|stale", "note": "..."}
```
- `ok` = có ≥1 số feed hôm nay · `degraded` = chỉ HTML/snippet · `stale` = `feed_age_days ≥ 7`.
- **Tự bắn PushNotification** (1 lần/đợt, không spam) khi `feed_age_days ≥ 7` **hoặc** `fetch_blocked_streak ≥ 5`. Đây là điều kiện "routine không làm đúng chức năng cốt lõi" → phải báo, không im lặng.
- GAS đọc `health.status` cho tin health-check buổi sáng.

## 19) 🧾 `routine_version` + `carry_forward_unresolved` TRONG METRICS

Mỗi dòng `genusfaith-metrics.jsonl` thêm:
- `"routine_version": "v9.0"` — để sau này truy được kết luận nào sinh ra dưới bộ luật nào. Không có trường này thì mọi đợt đại tu đo lường đều không truy vết ngược được.
- `"carry_forward_unresolved": [...]` — việc dở mang sang phiên sau, mỗi mục có `{item, since, why_blocked, replacement}`. Hiện đang có 5 câu hỏi mở nằm rải trong state mà không ai đếm ngày một cách hệ thống.

## 20) 📊 QUOTA CHÚ Ý + CHỐNG LẠM PHÁT (nhập luật 14 + 39 bot Etsy)

- **Không chủ đề nào chiếm >30% dung lượng báo cáo trong 1 tuần.** Rà mỗi Chủ Nhật. *(Kiểm 29/07–05/08: bible cover đã chạm ~35% — quá hạn mức, tuần tới phải giảm.)*
- **Mỗi luận điểm chỉ được làm headline ĐÚNG 1 LẦN.** Ngày sau hạ xuống 1 dòng `carry (mốc dd/mm)`. Headline mỗi ngày phải là tín hiệu **khác loại** với hôm trước.
- Trần 3 ý 🟢/ngày giữ nguyên (luật 6 v8).

## 21) ⭐ WATCHLIST CHÍNH = ĐƠN VỊ GIỮ GIÁ CAO MÀ KHÔNG GIẢM GIÁ (thi hành S4)

S4 đã có trong SYSTEM-v2 từ 28/07 nhưng **GenusFaith chưa từng dùng**. Thi hành:
- Mỗi ngày phải nêu ≥1 đơn vị **không chạy coupon / không giảm giá sâu mà vẫn giữ giá ở nửa trên của band**. Đó là tín hiệu personalization sâu hoặc thẩm mỹ đẹp — mạnh hơn review count rất nhiều.
- Ứng viên sẵn có chưa được khai thác: **Manna Covers** ($70–95, không thấy coupon) · **Be A Heart** ($46.95–47.99) · **My Saint My Hero** · **House of Joppa**. Đối lập: cụm Albuquerque sống bằng SUMMER26 -50/-60% = hành vi commodity.
- Feed cho phép đo việc này bằng máy: `compare_at_price == price` hoặc `compare_at_price == None` → **không neo giá ảo**.

## 22) 🗓 NHỊP MỚI: 3 TẦNG, VÀ REVIEW-MINER ĐƯỢC ƯU TIÊN HƠN TREND SWEEP

Metrics 02/08 đã tự ghi vào `rejected` rằng trend sweep cho **0 ứng viên qua cổng trong 4 ngày liên tiếp** trong khi review-miner cho 6 phát hiện dùng được trong 2 ngày. Đề xuất đó chưa bao giờ được thi hành. v9 thi hành:

| Tầng | Nhịp | Nội dung |
|---|---|---|
| **Máy** | hằng ngày, tự động | Feed 5 brand → diff → thay toàn bộ việc đếm SKU/giá/tồn kho bằng tay |
| **Canh gác** | hằng ngày | **2 target review-miner** (tăng từ 1) + 2 suggest + 1 vệ tinh theo thứ |
| **Cấu trúc** | Thứ Bảy | Quét rộng ≥12 đơn vị/1 phiên theo 4 trục (brand · định dạng · khung mua · đối chứng). Đầu ra là **BẢNG XẾP HẠNG**, không phải văn xuôi |

Trend sweep hạ xuống **2 ngày/lần**, đúng như metrics đã đề xuất. Lý do gốc ghi rõ để không ai hồi sinh: **nút thắt của GenusFaith là PHÔI, không phải Ý TƯỞNG** — trend sweep liên tục chết ở cổng 1.

## 23) 🔗 HỢP ĐỒNG LUỒNG DESKTOP

- File: `genusfaith-live-fetch.json` ở gốc repo, sinh bởi `genusfaith-local-fetch/genusfaith_fetch.py`, chạy **04:00 BKK** trên máy user (trước cloud routine 04:30).
- Bước 3 của routine thêm: `cat genusfaith-live-fetch.json`.
  - `date` là hôm nay → dùng làm tier A, `health.feed_age_days = 0`.
  - Cũ hơn → dùng làm carry, ghi rõ mốc, **và nhắc user chạy lại script**.
  - Vắng file → `health.status = degraded`, chạy tiếp bằng HTML, **không được im lặng**.
- Hai luồng **không gọi nhau**, chỉ đọc/ghi file trong cùng repo → hỏng luồng này không sập luồng kia.
- ⚠️ Cloud sandbox **không** gọi được `products.json` bằng `curl`/`python` (egress block, HTTP 000) nhưng **WebFetch thì được**. Nên khi chưa có luồng desktop, cloud vẫn tự đọc feed bằng WebFetch — chậm hơn, ít trường hơn, nhưng không mất nguồn.

## 24) 🧷 SELF-CHECK TRƯỚC PUSH — BỔ SUNG 8 MỤC

Nối tiếp self-check a–h của SYSTEM-v2:

| | Kiểm |
|---|---|
| i | Mọi câu "mới" đều kèm `created_at` + `age_days` (luật 14) |
| j | Mọi ghi chép OOS ở cấp variant với `oos_level` (luật 15) |
| k | Mọi so giá với brand trục material/mixed đều có dòng "Bậc chất liệu" (luật 16) |
| l | B7 có giải trình chọn mục tiêu theo coverage ledger (luật 17) |
| m | `health` có trong daily.json và `routine_version` có trong metrics (luật 18, 19) |
| n | Có ≥1 đơn vị organic-giá-cao trong báo cáo (luật 21) |
| o | Không chủ đề nào >30% dung lượng tuần (luật 20) |
| p | Feed đã cuộn hết trang (`hit_page_cap` = false) hoặc đã ghi cảnh báo SÀN |

---

# PHẦN C — SỬA CẤU TRÚC KHỐI (giữ 8 khối, không thêm khối)

⛔ **RÀNG BUỘC KỸ THUẬT:** GAS v3 hiện chỉ có `fxSendBlock1..8`. **TUYỆT ĐỐI KHÔNG tạo B9/B10** cho tới khi GAS v4 (auto-detect khối) được cài. Mọi cơ chế mới phải **gấp vào khối có sẵn** — cùng cách bot Job gấp Trend→Design Arbitrage vào B5.

Phân bổ mới:
- **B4 tin 1** thêm mục `📦 FEED DIFF` — SP mới (kèm `created_at`), SP biến mất, đổi giá, lật tồn kho. Đây là chỗ ở của luật 13–15.
- **B7 tin 1** thêm `📒 Ledger hôm nay` (1–2 dòng giải trình) và `🏷 Bậc chất liệu` (bảng 1 dòng/brand).
- **B7 tin 2** thêm `⭐ Organic giá cao` (luật 21) và `🩺 Health` (luật 18).
- **B8** thêm `📁 carry_forward_unresolved` — danh sách việc dở kèm số ngày.

---

# PHẦN D — VIỆC PHẢI LÀM NGAY TRONG RUN ĐẦU TIÊN CHẠY v9

1. Mở B7 bằng 🚨 **ĐÍNH CHÍNH** ba mục Đ1/Đ2/Đ3, ghi cả ba vào `rejected`.
2. Sửa state: `feratia:adora` = 68 ngày tuổi, KHÔNG mới · `catholight:instock` = 20 SP / 5 partial · thêm `variant_axis` cho 4 brand.
3. Hạ `in-stock-collection-shopify` xuống 🔴 kèm lý do "mất trụ cột bằng chứng, không phải bị bỏ quên".
4. Khởi tạo `coverage` với mọi đơn vị đã từng quét (lấy `last_checked` sẵn có) và `"never"` cho phần còn lại.
5. Khởi tạo `health` và `routine_version: "v9.0"`.
6. Nhắc user 5 câu hỏi mở kèm SỐ NGÀY, ở đầu B1 chứ không cuối B8.

---

# PHẦN E — CÒN NỢ (ghi ra để không tự nhận là đã đủ)

- **Review + ngày review vẫn không lấy được từ cloud** (S11). Feed không có review. Đây vẫn là hạng mục hạ tầng giá trị nhất còn lại, và cần browser thật trên máy user.
- **Blessac không có feed** → riêng brand này vẫn phải đọc HTML, và mọi kết luận về Blessac có độ tin cậy thấp hơn 4 brand kia. Phải ghi rõ mỗi lần nhắc.
- **Chưa verify chất liệu phôi của CHÍNH GenusFaith.** Luận điểm "ta da thật, họ vegan" là HYPOTHESIS cho tới khi user xác nhận. Cấm đưa vào copy/ads.
- **Chưa có COGS** → theo S6, mọi đề xuất vẫn chỉ được gọi là **thăm dò**.
- Venxara chưa test feed.
