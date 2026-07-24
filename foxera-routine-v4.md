# FoxEra Daily Research — ROUTINE v4 (bản nâng cấp: phá điểm mù + data sâu/rộng + social/viral radar)
> Bot ĐỌC file này mỗi sáng và LÀM THEO. v4 GIỮ toàn bộ kỷ luật v3 (luật 1–11) và THÊM luật 12–16 + nguồn dữ liệu mới + Khối B9. Khi mâu thuẫn, v4 thắng.
> Lý do ra đời v4 (bằng chứng từ chính lịch sử chạy 14→24/07): WebFetch Etsy/Amazon bị PROVENANCE_REQUIRED **5 ngày liên tiếp (20→24/07)**; anchor `back_to_school_teacher` đóng băng 2200/1300/1200 suốt **9 ngày**; note phình 421→887 ký tự trong khi anchor mới = 0. Kết luận: fetch chi tiết là **điểm mù cấu trúc của môi trường cloud**, không phải sự cố tạm. v4 ngừng "chờ fetch", chuyển sang nguồn số THẬT khác.

---

## A) KỶ LUẬT CŨ (v3, giữ nguyên — tóm tắt)
1. LOCALE US/USD chốt trước khi quét; ghi "locale":"US/USD".
2. NHÃN REVIEW bắt buộc: (listing rv)/(shop rv)/(shop sales). Không nhãn = không dùng.
3. KHÔNG kết luận "white space" chỉ từ số kết quả search.
4. Bỏ số overlay extension (IXSPY…) trừ khi ghi "bên thứ 3, tham khảo".
5. VELOCITY cần ≥3 ngày mới kết luận xu hướng.
6. AMAZON chặn headless → chỉ dùng link search/Best-Sellers bền.
7. Số trend-blog (insightagent/sellerapp/printify/alura…) = ĐỊNH HƯỚNG; số cứng chỉ khi ≥2 nguồn khớp hoặc nguồn sơ cấp.
8. TUỔI SỐ LIỆU: mỗi số kèm ngày verify; >7 ngày → "lịch sử, tham khảo".
9. FRESHNESS ENGINE = WebSearch (headless US) khi fetch chặn.
10. PHÂN TẦNG PROVENANCE: (a) live-fetch-200; (b) snippet; (c) carry mốc dd/mm; (d) trend-blog SEO.
11. SELF-CHECK trước push: đủ khối, mỗi khối ≥1 link nguồn, không khối rỗng vì lỗi.

## B) KỶ LUẬT MỚI v4 (12–16) — phá điểm mù

**Luật 12 — FETCH REALITY (hết ảo tưởng "mai fetch mở").**
PROVENANCE_REQUIRED là trạng thái MẶC ĐỊNH của môi trường scheduled-cloud này. Bot KHÔNG được viết "mai fetch mở", KHÔNG treo chờ WebFetch Etsy/Amazon để có số live. Quy trình: thử WebFetch 1 lần cho listing ưu tiên; nếu 200 → tầng "live" (hiếm, tận dụng); nếu chặn → BỎ QUA ngay, chuyển sang nguồn B/C dưới, KHÔNG lặp lại lời hứa. Số live thật đến từ **Meta interest-size** + **weekly local-verify**, KHÔNG từ WebFetch cloud.

**Luật 13 — HEALTH KPI + CẢNH BÁO CHỦ ĐỘNG.**
Mỗi ngày tính và GHI vào JSON top-level:
```
"health": {"days_since_live_number": N, "anchor_age_days": M, "fetch_blocked_streak": K, "status": "ok|degraded|stale"}
```
- `anchor_age_days ≥ 7` → TỰ ĐỘNG hạ MỌI anchor xuống nhãn "lịch sử" (luật 8) **và** gửi PushNotification: `<routine_summary>FoxEra: anchor đã {M} ngày chưa re-verify (quá 7) — mọi số đã hạ 'lịch sử'. Cần chạy local-verify để lấy số bán thật.</routine_summary>`
- `fetch_blocked_streak ≥ 5` → PushNotification 1 lần/đợt: `<routine_summary>FoxEra: WebFetch Etsy/Amazon chặn {K} ngày liên tiếp — routine đang chạy bằng Meta interest-size + snippet, chưa có số listing live. Cân nhắc local-verify tuần.</routine_summary>`
- status: ok nếu có ≥1 số live hôm nay; degraded nếu chỉ snippet+meta; stale nếu anchor_age≥7.
Đây là điều kiện "routine không làm đúng chức năng cốt lõi" → PHẢI báo, không im lặng.

**Luật 14 — ANTI-INFLATION (chống thổi phồng meta-trend).**
Mỗi luận điểm meta ("thêu là format cross-niche", "năm-số lặp"…) chỉ được làm HEADLINE **1 lần**. Ngày sau hạ xuống 1 dòng "carry (mốc dd/mm)". Headline mỗi ngày PHẢI là tín hiệu KHÁC LOẠI: mùa vụ / keyword mới / thay đổi giá / **viral social** / **audience-size Meta**. Cấm kể lại cùng insight to dần theo ngày.

**Luật 15 — DEMAND-EVIDENCE (slug ≠ cầu).**
Ưu tiên query bắt CON SỐ, không chỉ slug tồn tại. Mẫu query: `"<niche> etsy sold reviews 2026"`, `"<product> bestseller sales tiktok shop"`, `"<niche> 1000 sold"`. "Slug tồn tại trên Etsy" chỉ là bằng chứng CUNG, KHÔNG phải CẦU — phải ghi rõ và không dùng làm bằng chứng "đang hot".

**Luật 16 — SOCIAL PROVENANCE (phân tầng cho B9).**
- `v-news`: bài báo/case-study có SỐ (today.com, yahoo, businesswire, substack case-study…) → dùng được, trích số + link.
- `v-discover`: trang TikTok/hashtag/discover, "trend page" → ĐỊNH HƯỚNG, không phải số xác minh.
- `v-meta`: Meta interest `audience_size` → SỐ THẬT; ghi interest_id + rõ "global" hay "US" (US = dùng estimate_audience_size + geo). KHÔNG bịa view/like/share.

## C) NGUỒN DỮ LIỆU v4 (deep + wide)
**A. WebSearch** (freshness engine, headless US) — luôn chạy; dùng luật 15 (demand-evidence).
**B. Meta Ads MCP** (mcp__Facebook_Ads__*) — NGUỒN SỐ THẬT chính thay cho fetch chết:
   - `search_interests(query)` → audience_size_lower/upper + interest_id (global). Đo cầu tương đối các niche.
   - `estimate_audience_size(account_id="act_1635419550630846", targeting={age_min,age_max,geo_locations:{countries:["US"]},flexible_spec:[{interests:[{id}]}]})` → cỡ US thật.
   - `get_interest_suggestions` → tìm interest liền kề (mở rộng niche).
   - Baseline đo ngày 24/07 (global): Embroidery ~104–122M · Book Lovers ~1.71–2.01M · Pickleball ~1.03–1.21M. So ngày-qua-ngày để bắt niche đang phình.
   - ⚠️ MCP claude.ai có thể VẮNG trong run headless/cron. Nếu gọi lỗi → ghi "Meta MCP offline hôm nay" và degrade sang WebSearch, KHÔNG treo.
**C. WebFetch Etsy/Amazon** — OPTIONAL, chỉ tận dụng khi trả 200 (luật 12).
**D. Weekly local-verify** (mục E) — nguồn listing rv/shop sales THẬT.

## D) CÁC KHỐI B1..B9 (thêm B9)
Giữ B1..B8 như v3. **THÊM B9 — SOCIAL & VIRAL RADAR** (bắt trend đang nổi):
- Nội dung B9: (1) **Viral event đang chạy** trên TikTok/IG/FB/Pinterest có nguồn `v-news` (kèm số bán/định lượng + link) — vì sao liên quan ADN FoxEra + cách hoá thành design thêu (KHÔNG chép, học công thức). (2) **Hashtag/BookTok/aesthetic trend** (`v-discover`) đang lên. (3) **Meta interest audience_size** cho 3–5 niche watch (`v-meta`, số thật, ghi global/US). (4) 👉 Chốt: 1–2 hành động.
- Guardrail: viral thường gắn 1 shop/nhãn cụ thể → CHỈ học angle/format, tuyệt đối không sao chép design/nhãn; TM-safe (luật 9 v3).
- Nếu ngày yên: "⏸ Khối 9 — Social & Viral: Không đổi so với hôm qua (dd/mm)" — KHÔNG bỏ trống.
- Watch social cố định: pickle/pickleball · BookTok/romantasy · cozy-fall aesthetic · coquette · western/cowgirl · "tiktokmademebuyit" apparel · personalized/embroidered gift.

## E) WEEKLY LOCAL LIVE-VERIFY (lấy số listing THẬT — chạy trên máy user)
Vì WebFetch cloud chặn vĩnh viễn, số listing rv/shop sales thật cần chạy từ máy user (không bị PROVENANCE). Thiết lập 1 **scheduled task LOCAL** (trên app desktop), CN hằng tuần ~sáng, prompt gợi ý:
> "Mở 8–10 URL Etsy trong /tmp/fxrepo/foxera-daily.json khối Watch-list + B8 candidate. Với mỗi listing: đọc (listing rv) tab 'Reviews for this item', (shop rv), (shop sales), giá, ngày. Ghi đè anchors trong foxera-metrics.jsonl dòng CN với reverified_live=true. Commit+push. Locale US/USD."
Kết quả: mỗi tuần reset anchor_age về 0, health status = ok.

## F) SELF-CHECK + PUSH (giữ v3 + thêm health)
Trước push: đủ B1..B9, mỗi khối ≥1 "🔗 Nguồn:", JSON có "health", json.load OK, mỗi tin <3900 ký tự (giữ thẻ <a href>, escape &<> nội dung thường). Push: chỉ `git push`, kiểm ls-remote HEAD==local. Lỗi auth → PushNotification token. Kích hoạt cảnh báo health theo luật 13.

## G) VĂN PHONG (giữ v3)
Mỗi niche 1 dòng VIBE+emoji; mỗi khối kết "👉 Chốt:"; mỗi khối "🔗 Nguồn:"; KHÔNG bịa %; luôn nhãn review; TM-safe.

## H) CHI TIẾT TỪNG KHỐI (đầy đủ — nguồn chân lý, bootstrap trigger tham chiếu file này)
- **B1 Keyword & Sản phẩm + Mùa vụ:** velocity anchor so ngày trước (▲/▬/🆕/baseline); tín hiệu tươi hôm nay (tầng ghi rõ); lịch mùa (BTS→Halloween→Thanksgiving→Q4→1776 nền cả năm); "Top việc hôm nay" 4–5 gạch. ≥1 🔗 Nguồn (eRank/Seller Handbook + market slug).
- **B2 Deep-Dive (1–2 micro-niche):** MICRO-NICHE theo BUYER INTENT (vd "personalized preschool teacher ghost sweatshirt"), KHÔNG keyword rộng. Mỗi cái: dòng VIBE; tín hiệu (tầng); dòng "Cạnh tranh:"; khác biệt FoxEra (thêu-realism + character continuity + product-ladder); ⚠️ Guardrail IP; 🎯 Đề xuất listing-ready = Title [Core Product]+[Subject]+[Personalization]+[Recipient/Occasion] + tag PHÂN VAI (product/identity/occasion/style/long-tail) + 1 dòng personalization; 🔗 Nguồn.
- **B3 Idea Bank:** kho tham chiếu, "⏸ Không đổi" trừ khi biến động mạnh.
- **B4 SP mới nổi:** format shop nên mở theo KB (patch 8-inch, story cuff, texture-in-motion video 5–15s, wooden hanging, hoodie/tote/beanie…) — nêu vì sao hợp ADN thêu.
- **B5 Niche mới (làn sóng 2026):** 1776–2026 Semiquincentennial · National Parks · State-pride · Coastal/coastal-grandma · Gothmas · sub-medical (NICU wildflower)… mỗi cái buyer intent + nhân vật khả thi. ⚠️ Guardrail (TESS cho Americana).
- **B6 Evergreen Bank (21 niche):** 8 hobby-dad · 9 pet-dad · 4 calendar. "⏸ Không đổi".
- **B7 SP đang thắng để học:** 8–14 link BỀN, 2 nhóm 🛒 AMAZON + 🧵 ETSY, mỗi mục 1 dòng "học gì". CHỐNG BỊA LINK: ưu tiên `amazon.com/s?k=` / Best-Sellers category, `etsy.com/market/<slug>` / `search?q=`; chỉ chèn /dp/ASIN hoặc /listing/ID nếu WebFetch mở 200 thật. Số review kèm nhãn + ngày; không mở được → định tính, KHÔNG bịa số.
- **B8 Radar đối thủ + listing mới ≤7 ngày:** candidate snippet (URL nguyên văn từ search, tầng snippet); mai local-verify mở lấy anchor. KHÔNG tự nhận đọc số live.
- **B9 Social & Viral Radar:** xem mục D (v-news/v-discover/v-meta).
- **WATCH-LIST:** seasonal (halloween black cat, pet xmas ornament, fall dog, pet suncatcher, grandparents, back-to-school teacher coquette, halloween teacher, fall coffee) · hot (pickleball, matcha, run club, pilates, romantasy generic) · bổ sung (faith, mama, bachelorette, western/cowgirl, mental health, nurse, plant lady, gym humor, sober, retro 70s) · social (pickle sweatshirt, BookTok, cozy-fall, coquette, tiktokmademebuyit).
- **4c/4d bắt buộc mỗi deep-dive:** listing-ready idea + GUARDRAIL IP (Americana→TESS; nhân vật→tránh Disney/Nintendo/Marvel/NFL/logo trường; POD→production-partner + AI disclosure). Chạm guardrail → cờ ⚠️.
