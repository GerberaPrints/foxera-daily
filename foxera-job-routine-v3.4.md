# FoxEra JOB Daily Research — ROUTINE v3.4 (ADDENDUM cho v3.3)

> Bot ĐỌC file này SAU khi đọc `foxera-job-routine-v3.3.md`. v3.4 GIỮ TOÀN BỘ v3.3 (luật 1–24, bước 1–10, 7 khối B1..B7).
> v3.4 chỉ THÊM: **luật 25** (📌 CẦN CHÚ Ý cuối mỗi khối) + **luật 26** (độ sớm tín hiệu trend) + **luật 27** (Trend→Design Arbitrage — NẰM TRONG B5) + **luật 28** (product ladder hai sân).
> Khi mâu thuẫn: **v3.4 > v3.3 > trigger prompt**.
>
> **Lý do ra đời v3.4 (28/07/2026):** user quan sát các nền tảng khác đang "lấy trend TikTok → đẩy sang FB/Google/sàn" và muốn khai thác luồng đó. Audit cho thấy 2 điểm mù:
> (1) B5 hiện chỉ bắt trend ở mức "đang nóng", nguồn phần lớn là **listicle/aggregator** — mà khi một SP đã lọt "Top N TikTok products 2026" thì **cửa sổ arbitrage đã đóng**. Phải bắt tín hiệu **TRƯỚC** listicle.
> (2) Routine mới nghĩ theo **trend → product** — sai sân với FoxEra (đua tốc độ nguồn hàng + giá với dropship gadget/beauty/home). Sân đúng là **trend → DESIGN**: lấy *aesthetic/cảm xúc* đang lên rồi diễn đạt bằng ADN thêu + personalization — thứ dropshipper không copy nhanh được.
>
> ⛔️ **RÀNG BUỘC KỸ THUẬT KHÔNG ĐƯỢC PHÁ:** GAS v2.1 chỉ có sender `fxSendBlock1..7`. **TUYỆT ĐỐI KHÔNG tạo B8/B9/B10** cho namespace JOB (orphan-check sẽ báo động và tin sẽ KHÔNG BAO GIỜ lên Telegram). Vì vậy Trend→Design Arbitrage được **gấp vào B5**, không tách khối. (Khác với namespace FoxEra Etsy — bên đó GAS có nhiều sender hơn nên B10 tách riêng theo `foxera-routine-v5.md`.)

---

## LUẬT 25 — "CẦN CHÚ Ý" BẮT BUỘC CUỐI MỖI KHỐI (áp cho B1..B7, kể cả khối ⏸ Không đổi)

Mỗi khối, sau `👉 Chốt:` hoặc ngay trước nó, PHẢI có mục tổng hợp:

```
📌 <b>CẦN CHÚ Ý:</b>
• <i>Số liệu:</i> {tầng provenance của MỌI số trong khối — live 200 / snippet / mốc dd/mm / tham khảo SEO; khối không có số → ghi "định tính, không số"}
• <i>Rủi ro:</i> {guardrail IP/TM, cảnh báo hiểu sai, giới hạn dữ liệu — không có → "không có cờ"}
• <i>Việc cần làm:</i> {1–2 hành động cụ thể, có chủ thể và mốc thời gian}
```

Cho phép viết gọn thành 1 đoạn 3 ý nếu khối ngắn, nhưng **không được bỏ**. Khối `⏸ Không đổi` vẫn phải có (ghi rõ "không số" + "không có cờ" + việc cần làm là gì, kể cả "không có").

Lý do: `👉 Chốt` là *kết luận*, còn `📌 CẦN CHÚ Ý` là *thứ user cần nhớ khi đọc lướt trên Telegram* — hai chức năng khác nhau, không thay thế nhau.

## LUẬT 26 — NHÃN ĐỘ SỚM CHO MỌI TÍN HIỆU TREND

Mọi tín hiệu trend trong B1/B4/B5/B7 phải gắn 1 nhãn:

- 🌱 **EARLY** — mới xuất hiện ở nguồn trade/creator/niche, chưa có listicle, chưa có lớp bán đại trà. **Giá trị arbitrage cao nhất.**
- 📈 **RISING** — đã có ≥2 kênh bán thật (Etsy + TikTok Shop/Walmart/Amazon), giá còn giữ band, entrant đang vào.
- 🔥 **PEAK** — page 1 kín Ad, chiết khấu 40–70%, listicle đã đưa tin. Vào lúc này = đua giá.
- 🪦 **CLOSED** — band đã sập dưới ngưỡng kỹ thuật (EMB bán giá print), hoặc trend đã nguội. Chỉ ghi nhận, không vào.

**CẤM dùng listicle aggregator ("Top 15 TikTok products", "viral gifts 2026"…) làm nguồn PHÁT HIỆN trend** — chỉ được dùng để XÁC NHẬN rằng trend đã 🔥PEAK (tức là đã muộn). Nguồn phát hiện hợp lệ: nguồn trade (Printful/embroidery industry blog), TikTok Shop keyword page (số sold thật), Etsy slug mới tách, v-news có số.

## LUẬT 27 — TREND → DESIGN ARBITRAGE (nằm TRONG B5, không tách khối)

Mỗi ngày B5 lấy **2–3 aesthetic/motif đang lên** và cho qua **4 CỔNG**, ghi rõ đạt/không từng cổng:

1. **Thêu được?** — silhouette đọc được khi thu nhỏ · ≤5 màu chỉ · satin/tatami/puff khả thi · không hứa chi tiết không làm được.
2. **Personalize được?** — có chỗ gắn tên/chữ/năm ở sleeve, collar, ngực trái?
3. **Bậc phụ kiện (không size)?** — có thể ra bản hat/patch-hat/tote/beanie/bandana không? (không rủi ro size/return = lợi thế trên TikTok/FB).
4. **Sạch IP?** — không nhân vật bản quyền, không parody nhãn TM, không logo trường/bệnh viện/đội.

**Output bắt buộc của B5 mỗi ngày:** (a) 1 ý tưởng **phụ kiện thêu listing-ready** (title + personalization + band giá tham chiếu) HOẶC nêu rõ "hôm nay không tín hiệu nào qua đủ 4 cổng"; (b) 1 **angle video 5–15s "texture-in-motion"** cho TikTok/FB (quay cận mũi chỉ / nghiêng sáng để thấy nổi khối — thứ ảnh tĩnh và print không thể hiện được).

**Quy trình bắt buộc (giữ từ luật 24):** social/trade sớm → đặt slug Etsy tương ứng vào coverage ledger → **chờ Etsy velocity xác nhận bằng tiền** → mới đề xuất production. KHÔNG đề xuất production chỉ từ social. Trần 3 ý 🟢/ngày (luật 13) vẫn áp.

**Loại vĩnh viễn khỏi radar:** hướng "bê nguyên SẢN PHẨM trend TikTok sang FB/Google/sàn". Sân đó thắng bằng tốc độ nguồn hàng + giá (gadget/beauty/home-organization), không phải bằng thương hiệu thêu — vào đó là bỏ moat để đua ở nơi nhà không có lợi thế cấu trúc.

## LUẬT 28 — PRODUCT LADDER HAI SÂN

- **Sweatshirt / quarter-zip = ván ETSY** (band EMB $21–57; buyer tìm quà personalized, chấp nhận chờ).
- **Phụ kiện thêu (washed dad hat, patch-hat, tote, beanie, bandana, patch bundle) = ván TIKTOK/FB** (không size, "visually demonstrable", giá vào cửa thấp).

Bằng chứng nền (đo 28/07/2026, TikTok Shop live 200 USD): patch-**HAT** có cầu thật — mustache trucker 636 sold · $18 · horsing-around 95 · $22 · aztec western 35 · $35 · Chattahoochee *embroidered patches* 19 · $35 · duck leather-patch 26 · $32 → **band $18–40, tập trung $22–35**. NGƯỢC LẠI patch **RỜI** gần như không có cầu (name patch $17.99–18.99 chỉ 3–22 sold; patch rẻ $1.50–3.00 chỉ 3–17 sold). Đọc: người mua TikTok trả tiền cho **vật đội/mang được ngay**, không trả cho miếng vá phải tự gắn.
→ Khi đề xuất bậc phụ kiện: ưu tiên **hat** trước, patch rời chỉ làm bundle kèm, KHÔNG làm SKU chủ lực.

## GHI CHÚ NGUỒN & CÔNG CỤ (v3.4)

- **Meta Ads MCP** (`mcp__MCP_Facebook_Ads__*`) hiện **CẦN RE-AUTH** — phiên scheduled không chạy được OAuth. Khi user đã re-auth trong claude.ai connector settings: dùng `search_interests` → `audience_size`, và `estimate_audience_size` với `geo_locations.countries:["US"]` để chấm **cầu US thật** cho cổng số 3, thay vì suy từ hype. Chưa có → ghi "Meta MCP offline, chấm định tính" và **không treo chờ**.
- **Nguồn trade đã test 28/07 (fetch 200):** `printful.com/blog/embroidery-trends` (danh mục kỹ thuật 2026: micro/hidden embroidery, minimalist line, puff 3D, monogram/chữ ký số hoá, bề mặt mới mũ–túi). Dùng làm **danh mục kỹ thuật để phối**, KHÔNG phải bằng chứng cầu (luật 7).
- **TikTok Shop keyword page** (`shop.tiktok.com/us/k/<slug>`) — thi thoảng fetch 200, cho **số sold nền tảng** (không phải Etsy rv, phải ghi rõ). Đây là nguồn phát hiện hợp lệ theo luật 26.

## SELF-CHECK BỔ SUNG (thêm vào luật 14)

Trước push kiểm thêm: (f) **mỗi khối B1..B7 có `📌 CẦN CHÚ Ý:`** (luật 25); (g) mọi tín hiệu trend có nhãn 🌱/📈/🔥/🪦 (luật 26); (h) B5 có output 4-cổng + ý phụ kiện/angle video hoặc câu "không tín hiệu nào qua đủ 4 cổng" (luật 27); (i) **blocks vẫn đúng B1..B7, KHÔNG có B8+** (ràng buộc GAS).
