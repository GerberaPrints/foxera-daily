# GritFell Daily Updater — QUY TRÌNH v5.2 (Trend/Viral + Decisions)
**Lập 24/07/2026.** v5.2 = v5 + 5 nâng cấp sau retro 10 ngày chạy (15→24/07). GAS v2 GIỮ NGUYÊN (vẫn B1–B7, không thêm khối).

## Thay đổi so v5/v5.1

| # | Nâng cấp | Chi tiết |
|---|---|---|
| 1 | **Trend/Viral Radar** (nằm trong B7, đổi tên khối thành "Ads, Hook & Trend Radar") | Feasibility test 24/07: TikTok/IG/Reddit/YouTube/GoogleNewsRSS **BỊ CHẶN** fetch trong phiên scheduled — KHÔNG thử fetch lại hằng ngày. Bắt viral qua 3 đường MỞ ĐƯỢC: (a) **Google Trends RSS** `https://trends.google.com/trending/rss?geo=US` (test OK 24/07) — quét item outdoor-related; (b) **editorial secondary coverage** — báo outdoor đưa tin record catch/viral moment trong 24-48h (fieldandstream.com ✅ test OK, outdoorlife.com ✅ test OK; themeateater.com / wideopenspaces.com / gearjunkie.com CHƯA test — thử dần, ghi kết quả vào metrics note); (c) **WebSearch snippet** ("viral <loài> video", "record <loài> 2026") — nhãn snippet, không nhận đã xem video. + (d) **manual snapshot** người dán (file dưới). |
| 2 | **Manual social/ads snapshot** | File `gritfell-social-snapshot.md` — người mở Meta Ad Library + lướt IG/TikTok ~1 lần/tuần, dán theo template. Bot dùng snapshot ≤8 ngày với nhãn `manual snapshot dd/mm`. Đây là fix DUY NHẤT cho điểm mù "chưa từng thấy ad thật". |
| 3 | **Ledger CHỜ DUYỆT** | File `gritfell-decisions.json`. Bot render mục "⏳ CHỜ DUYỆT" cuối B1 mỗi ngày (kèm đếm ngược kill_date) — đề xuất không còn bốc hơi trong Telegram. Bot chỉ ADD/re-score, người quyết. Seeded: OPENER-CAPSULE-2026 (4/5, kill 07/08). |
| 4 | **Lịch rotation homepage cố định** (11 brand + DECOY phủ đủ mỗi tuần, 2-3 site/ngày + brand đang nóng check thêm) | T2: Huk+BURLEBO (kèm sweep giá tuần) · T3: Poncho+Marsh Wear · T4: Duck Camp+AFTCO · T5: Drake+Free Fly · T6: Howler+Tom Beckbe · T7: SITKA+DECOY+săn new entrants · CN: Etsy/gift/Megan sweep |
| 5 | **Nguồn cá dày hơn** | 2 nguồn Gulf tuần (giữ) + khi cả 2 stale ≥3 ngày thì lấy tín hiệu loài từ editorial (Outdoor Life/F&S fishing — daily) thay vì carry chay. |

## Lịch editorial (Trend Radar — mỗi ngày Trends RSS + ≥1 site theo thứ)
T2: outdoorlife.com/fishing · T3: fieldandstream.com/hunting · T4: themeateater.com (test) · T5: wideopenspaces.com (test) · T6: fieldandstream.com/fishing + outdoorlife.com/hunting · T7: gearjunkie.com (test) · CN: WebSearch viral sweep.

## Kỷ luật viral (bổ sung điều 15)
Views/likes CHỈ ghi khi thấy số thật (snippet/manual snapshot) kèm nguồn. Không suy ra "đang viral" từ 1 tag page. Tín hiệu TikTok/IG luôn nhãn snippet hoặc manual — KHÔNG BAO GIỜ nhãn live. Viral chỉ thành đề xuất design khi qua brand filter (01 §8) — viral ≠ hợp brand.

## Ghi chú
- Shopify MCP trong session = store Gerbera Prints, KHÔNG phải GritFell → vòng lặp số bán nội bộ CHƯA nối được (08 §2 vẫn missing). Muốn nối: cấp read-only access store GritFell (việc của người).
- Namespace ghi file mở rộng: gritfell-daily.json + gritfell-metrics.jsonl + gritfell-decisions.json (khi có thay đổi). social-snapshot.md là file NGƯỜI ghi, bot chỉ đọc.

## v5.2.1 (24/07) — Vòng lặp DATA NỘI BỘ qua Shopify MCP

**Trạng thái:** connector Shopify đã ngắt khỏi Gerbera Prints (24/07) — chờ người authorize lại và chọn store GritFell (1 lần, qua OAuth). Sau đó bot tự chạy.

**Bước 3e mỗi run (có guard an toàn):**
1. Gọi `get-shop-info`. Nếu store KHÔNG phải GritFell (gritfell.com) hoặc connector chưa auth → mục nội bộ trong B1 ghi 1 dòng ⛔️ "Shopify chưa nối store GritFell — cần người authorize connector" rồi BỎ QUA, KHÔNG gọi switch-shop trong phiên scheduled (switch revoke token, cần người bấm OAuth → sẽ làm chết connector đến khi người can thiệp).
2. Nếu đúng GritFell → chạy ShopifyQL (read-only):
   - `FROM sales SHOW total_sales, orders, average_order_value SINCE -7d UNTIL today`
   - `FROM sales SHOW gross_sales, orders GROUP BY product_title ORDER BY gross_sales DESC LIMIT 10 SINCE -7d UNTIL today`
   - Thứ 2 thêm: `FROM sales SHOW total_sales, orders, average_order_value SINCE -30d UNTIL today` + `FROM sessions SHOW sessions, conversion_rate SINCE -7d UNTIL today` (nếu plan cho phép)
3. Render mục "🏪 NỘI BỘ (7 ngày)" cuối B1: top 3-5 SP theo doanh thu + AOV + orders — ĐỐI CHIẾU với đề xuất đang chạy (vd: lane dove có SP nào đang bán không? đề xuất capsule có khớp cái khách đang mua?). Nhãn evidence: INTERNAL_OBSERVED.
4. APPEND 1 dòng `gritfell-internal.jsonl`: {"date":"YYYY-MM-DD","window":"7d","total_sales":...,"orders":...,"aov":...,"top_products":[{"title":...,"gross_sales":...,"orders":...}]} — file này vào namespace bot (file thứ 4).
5. KỶ LUẬT: số nội bộ KHÔNG đưa vào Telegram dạng số tuyệt đối nếu nhạy cảm? → MẶC ĐỊNH đưa (nhóm Telegram là nội bộ của người). Không dùng số nội bộ để bịa velocity thị trường — nội bộ chỉ đối chiếu đề xuất.
