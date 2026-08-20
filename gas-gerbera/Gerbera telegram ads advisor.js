/************************************************************************
 * GerberaPrints · DAILY ADS REPORT → TELEGRAM  ·  v3.9  (BẢN GỘP, FULL)
 * ----------------------------------------------------------------------
 * ⚠️ CÁCH DÙNG: paste ĐÈ TOÀN BỘ lên "Gerbera telegram ads advisor.gs".
 *    Đây là file .gs HOÀN CHỈNH, chạy được ngay. (Bản PATCH trước đó là
 *    hướng dẫn, KHÔNG phải file — nếu còn PATCH_v3_to_v3_1.gs trong project
 *    thì XOÁ nó đi, nó gây lỗi "Illegal return statement".)
 *    Sau khi paste: Run gpInstallTriggers (BẮT BUỘC — để tạo 2 trigger mới
 *    09:45/10:00; cài trigger là việc tay, paste code không tự tạo).
 *
 * ===== v3.9 (31/07/2026) — nhịp 6 & 7: B10 Video Trends · B11 Động tĩnh =====
 *  X) Task market (gerbera-trend-research) thêm 2 khối theo yêu cầu user 31/07:
 *     · B10 — Video Trends TikTok/IG (format trend để team quay lại + link dẫn chứng)
 *     · B11 — Động tĩnh đối thủ (SP/collection/blog/promotion mới)
 *     → 2 nhịp mới user chốt: 09:45 gpSlot6Video (B10) · 10:00 gpSlot7Moves (B11).
 *  Y) ⚠️ 09:30/09:45/10:00 cách nhau 15' < khuyến nghị 30' (nearMinute có cửa sổ
 *     ±15') → tin 3 nhịp cuối có thể đến LỆCH THỨ TỰ. CHẤP NHẬN ĐƯỢC: cả 3 cùng
 *     đọc 1 file market.json đã push xong từ ~07:45, jitter chỉ ảnh hưởng thứ tự
 *     hiển thị, KHÔNG ảnh hưởng dữ liệu (khác bài học v3.6-N — đó là race với
 *     file chưa push xong, nguy hiểm thật).
 *  Z) gp_buildDayHealth_ (09:30) chạy TRƯỚC nhịp 6/7 → 2 nhịp đó hiển thị
 *     "⏳ chưa tới giờ" thay vì bị hiểu nhầm là chết/chưa chạy. Known-list thêm
 *     B10/B11 → hết cảnh báo "khối LẠ chưa khai nhịp" từ 31/07.
 *     Bối cảnh cùng ngày (ngoài GAS, ghi để khỏi quên): PC-side fetch v1.1.1 đã
 *     chạy thật (feeds 6/6 · anchors 3/3 · collections 6/6), push
 *     gerbera-live-fetch.json lên repo lúc 06:45 hằng ngày — nguồn LIVE cho task
 *     market, GAS KHÔNG đọc file đó, chỉ đọc gerbera-market.json như cũ.
 *
 * ===== v3.8 (18/07/2026) — MẢNH CUỐI của phép gộp + nhịp 1d/3d =====
 *  U) 🔓 GỠ CHẶN GỘP: B9 xếp hạng hook bằng doanh thu TỪNG SKU — số đó đến từ
 *     Shopify MCP (Phần C task ads). Task trend bị CẤM MCP ⇒ xoá task ads là
 *     mất sạch. GIẢI: GAS đọc sheet 'SKU Raw Data' (A:Date B:Order# C:SKU
 *     D:Title E:Variant F:Price G:Qty — per line-item) → tự tính top SKU.
 *     ⇒ Task ads XOÁ ĐƯỢC mà không mất gì.
 *  V) 🔴 BẪY GROSS vs NET — không rơi vào:
 *     GP_ProductPL.gs dòng 59 ghi rõ "Gross Rev = size reference only";
 *     price×qty là GROSS TRƯỚC giảm giá, còn Shopify MCP trả NET.
 *     Baseline task ads: "discount ăn 26.2% gross". Tệ hơn: B2G1 thì món TẶNG
 *     vẫn mang price ⇒ gross THỔI PHỒNG đúng nhóm B2G1 — offer lõi của GP.
 *     Xếp hạng hook bằng gross = tự bơm điểm B2G1 rồi khuyên scale nhầm.
 *     → XẾP HẠNG BẰNG UNITS (Qty): sạch, miễn nhiễm giảm giá & B2G1.
 *       Gross chỉ để tham chiếu và LUÔN dán nhãn "gross, ≠ số Shopify".
 *  W) NHỊP 1 NGÀY / 3 NGÀY (user: "7 ngày là chỉ số dài hơi"):
 *     · Meta: thêm date_preset 'yesterday' + 'last_3d' cho account-level và
 *       ad-level → thấy ad ROAS 7d đẹp nhưng 3d đã sập.
 *     · Suy ra cửa sổ ngày 4–7 = (7d − 3d) bằng phép trừ, KHÔNG tốn call.
 *     · Store B2 + top SKU: 1d · 3d · 7d.
 *     ⚠️ 1 ngày là số CHƯA CHỐT (attribution settle ~72h) → dùng bắt xu hướng,
 *       KHÔNG dùng kết luận. Đã ghi vào prompt.
 *
 * ===== v3.7 (18/07/2026) — 5 NHỊP + sửa thước đo sai =====
 *  P) 🔴 PROMPT B1 SAI THƯỚC: ghi "FB hoà vốn ~1.0". SAI. Task ads ghi rõ:
 *     "Break-even ROAS ≈ 1/GrossMargin. Polo $54.95 COGS ~$17 → margin ~69%,
 *     BE ~1.45x". → Mọi ad ROAS 1.0–1.45 tôi đang coi là LÃI, thực tế LỖ.
 *     Báo cáo 18/07 nói "ROAS blended 2.44 nhìn chung ổn" — đo bằng thước sai.
 *  Q) Bổ sung BỐI CẢNH GP vào prompt B1 (trước nay GAS mù, chỉ task ads biết):
 *     · TRẦN SCALE NSFW: ~36% doanh thu là L3 = ORGANIC ONLY, paid chỉ kéo ~51%
 *       catalog → ROAS toàn store bị kéo xuống CƠ HỌC ⇒ MER mới là số đúng.
 *     · OFFER ECONOMICS: B2G1 = −$9.05/đơn ở CPA cold ~$68; bottom-funnel +$58.
 *       Thủ phạm lỗ là CPA CAO, không phải cơ chế offer.
 *  R) 5 NHỊP GIAO (user chọn): 07:00 Ads · 07:30 Store · 08:30 Thị trường ·
 *     09:00 Ý tưởng · 09:30 Đối thủ+Hệ thống. Mỗi nhịp 1 trigger độc lập —
 *     nhịp này chết KHÔNG kéo nhịp kia chết.
 *  S) Health xuyên execution: mỗi slot ghi kết quả vào Script Properties;
 *     slot 5 đọc lại để báo cáo. Trước đây B4 chỉ biết việc trong CÙNG 1 run —
 *     tách 5 slot thì cách đó vô dụng.
 *  T) Task gerbera-ads-report-daily bị XOÁ (gộp vào gerbera-trend-research).
 *     Phần A/B (MCP) đã bị GAS thay từ v3.4 — tốt hơn: hằng ngày thay vì chỉ
 *     thứ Hai, không dính quota Pipeboard. LUẬT 0 "ADS DAY" khai tử.
 *     B9 (đối thủ & hook) chuyển sang market.json.
 *
 * ===== v3.6 (18/07/2026) — sửa RACE CONDITION do v3.5 gây ra =====
 *  N) 🔴 LỖI CỦA v3.5: đặt gpMarketRun 07:30 — ĐUA với chính task đẩy data.
 *     Bằng chứng 18/07: task gerbera-trend-research chạy 07:19 → push
 *     gerbera-market.json lúc 07:28 (mất 9 phút). GAS đọc lúc 07:26 → vớ file
 *     HÔM QUA rồi tự cảnh báo "task 07:15 có thể đã fail" — ĐỔ OAN, task không
 *     hề fail, chỉ chưa push xong.
 *     Tệ hơn: nearMinute() của Apps Script có cửa sổ ±15 PHÚT → 07:30 nổ bất kỳ
 *     lúc nào 07:15–07:45. Margin 2 phút = vô nghĩa, sai thường xuyên hơn đúng.
 *     → v3.6: dời sang 08:30. Task start 07:15–07:23 + chạy 9–20' → push xong
 *       ~07:24–07:45. Trigger 08:30 (±15' → 08:15–08:45) ⇒ margin ≥ 30 phút.
 *     BÀI HỌC: khi 2 job nối nhau qua file, KHÔNG đặt lịch sát nhau — phải cộng
 *     THỜI GIAN CHẠY của job trước + cửa sổ jitter của CẢ HAI.
 *  O) Cảnh báo stale market đổi giọng: data cũ 1 ngày lúc 08:30 KHÔNG còn là
 *     "có thể fail" (vì đã qua giờ push chắc chắn) → nói thẳng là task fail.
 *
 * ===== v3.5 (17/07/2026) — MARKET + diệt lớp bug "bỏ rơi im lặng" =====
 *  K) 🔴 PHÁT HIỆN: gerbera-market.json (LUỒNG 1, task gerbera-trend-research,
 *     07:15) vẫn push ĐỀU mỗi ngày — 16 KB, B1/B2/B3, date=hôm nay — nhưng
 *     KHÔNG AI ĐỌC. Task đó ghi rõ cần mảng GX_MARKET.blocks trong GAS;
 *     mảng ấy CHƯA TỪNG TỒN TẠI. Đây ĐÚNG con bug mà header file v1 tự mô tả,
 *     chỉ là lặp lại lần hai (lần trước: gerbera-ads.json).
 *     → v3.5: gpMarketRun() đọc gerbera-market.json → báo cáo RIÊNG 07:30.
 *  L) 🛡️ DIỆT LỚP BUG: KHÔNG dùng danh sách khối cố định nữa. gpMarketRun gửi
 *     MỌI khối có trong JSON (sort theo key). Task thêm B4..B8 → GAS tự gửi,
 *     KHÔNG cần sửa code. Khối chưa khai tên vẫn gửi + gắn nhãn "chưa đặt tên".
 *     Trước đây: task thêm khối mà quên sửa GAS = khối biến mất, không ai biết.
 *  M) 🔴 B1 bị gửi dạng PLAIN: log 16:17 "can't parse entities: Unsupported
 *     start tag at byte offset 2238" → fallback cứu tin nhưng thẻ <b> hiện
 *     nguyên văn. Thủ phạm: LLM xuất thẻ Telegram không hỗ trợ (<br>,<p>,<li>)
 *     hoặc ký tự "<" trần (vd "CTR<2%"). → gp_sanitizeHtml_() dọn trước khi gửi.
 *
 * ===== v3.4 (17/07/2026) — RETRY =====
 *  I) 🔴 callLLM_ KHÔNG hề có retry. Lần chạy 15:34 dính "LLM API Overloaded"
 *     (HTTP 529 — lỗi TẠM THỜI phía Anthropic, không phải bug). Job chạy 07:00
 *     tự động, không ai canh → dính 1 cái là mất báo cáo cả ngày.
 *     Nghịch lý: gp_api_ (Telegram) đã có retry 4 lần từ đầu; callLLM_ thì không.
 *     → v3.4: retry 4 lần với backoff 0/3s/12s/30s cho 429 · 529 · 5xx.
 *       KHÔNG retry lỗi 4xx khác (sai key/model/payload) — retry vô nghĩa, chỉ
 *       tổ làm chậm và che lỗi thật.
 *  J) B4 ghi "Claude API: ❌ không gọi được" là SAI khi lỗi là Overloaded —
 *     API có được gọi, nó trả 529. Đổi nhãn cho trung thực.
 *
 * ===== v3.3 (17/07/2026) — dứt điểm B1 =====
 *  F) 🔴 NGUYÊN NHÂN THẬT: model TỰ BẬT thinking, đốt sạch max_tokens=5000
 *     rồi dừng TRƯỚC KHI viết được chữ nào.
 *     Bằng chứng: stop_reason=max_tokens · types=[thinking] · out=5000
 *     (đúng bằng max_tokens) · content=[{type:"thinking",thinking:""}].
 *     → v3.3 TẮT HẲN thinking (thinking:{type:'disabled'}) — chắc ăn hơn nâng
 *       trần, vì ngân sách thinking có thể co giãn theo max_tokens.
 *     → max_tokens 5000 → 16000 làm đệm.
 *  G) GP_BUILD — hằng số phiên bản, in ra ở MỌI chẩn đoán + khối B4.
 *     Lý do có nó: đã mất 3 vòng lặp vì không ai chứng minh được "code đang
 *     chạy có phải bản vừa sửa không". Giờ nhìn log là biết ngay.
 *  H) gpWhoAmI() — in giá trị runtime + SOURCE THẬT của callLLM_. Nếu file
 *     khác trong project khai trùng tên (GAS dùng chung global scope cho MỌI
 *     file, file nạp sau ghi đè im lặng) thì sẽ lộ ra ở đây.
 *
 * ===== v3.2 (17/07/2026) — 2 fix sau lần chạy thật đầu tiên =====
 *  D) 🔴 B1 hỏng: "LLM trả về rỗng/ngắn bất thường". Code cũ chỉ đọc
 *     body.content[0].text — nhưng content[] có thể chứa block KHÔNG phải
 *     text (thinking/tool_use) → .text = undefined → tưởng LLM hỏng.
 *     v3.2: gom MỌI block type='text'. Và thông báo lỗi giờ NÓI ĐƯỢC
 *     stop_reason / block types / in-out tokens / kích thước request
 *     thay vì câm như cũ. Thêm gpTestLLM() để đo trực tiếp.
 *  E) B2 ghi sai nhãn: "Ngày có đơn: 96/7" — vô nghĩa. 'Shopify B2C' là
 *     MỘT DÒNG MỘT ĐƠN, không phải một ngày → 96 là 96 ĐƠN. Đổi thành
 *     "Đơn hàng" + thêm AOV (thứ thật sự đáng nhìn: đơn giảm mà AOV tăng).
 *
 * ===== v3.1 (17/07/2026) =====
 *  A) TK 02 (687791113516625) GIỜ CHẠY GRITFELL → bỏ khỏi TG_META_ACCOUNTS.
 *  B) 🔴 Graph `filtering` CONTAIN 'GER' là so khớp CHUỖI CON THÔ → nuốt luôn
 *     "BurGER", "GinGER", "MerGER", "LaGER", "HamburGER". Với GritFell (cũng
 *     novelty apparel) campaign "Burger Lover Tee" bị tính thành chi Gerbera.
 *     FB_Ads_Daily.gs ĐÃ xử lý đúng bằng _fbaIsGP() (ranh giới từ) — v3 không dùng.
 *     v3.1: CONTAIN chỉ là lọc thô phía server; lọc THẬT bằng gp_isGP_() client-side.
 *     Account-level đổi sang lấy CAMPAIGN-level rồi tự cộng — vì số account-level
 *     Graph gộp sẵn thì KHÔNG bóc "Burger" ra được nữa.
 *  C) Cảnh báo "khối JSON B1,B2,B4 không được gửi" là CỐ Ý → hạ xuống ℹ️.
 *     Cảnh báo kêu mỗi ngày = bị ngó lơ = mất cảnh báo thật.
 *
 * ===== v3 (BẢN GỘP) — gộp 2 file, xoá cả hai bản cũ =====
 *   ① "Gerbera telegram ads advisor.gs" (CRM)  → file này thay thế
 *   ② "gerbera-telegram-gas-v1.gs" (Market Research) → xoá, NHỚ chạy
 *      gpRemoveTriggers() BÊN ĐÓ trước, không thì 5 trigger cũ vẫn bắn 10:00–10:45.
 *
 * ⚠️ FILE NÀY PHẢI NẰM TRONG PROJECT **Gerberaprints CRM**:
 *      • Script Properties là RIÊNG TỪNG PROJECT → FB_ADS_TOKEN chỉ có ở CRM.
 *      • Cần _fbaToken()/_fbaIsGP()/_fbaPickOne() (FB_Ads_Daily.gs) và
 *        _getSSActive() (CRM.gs) — GAS chia global scope trong CÙNG project.
 *      • B2 đọc sheet 'Shopify B2C' + '📊 Ad Spend' của CRM.
 *
 * ===== AI SỞ HỮU KHỐI NÀO (mỗi khối đúng 1 nguồn) =====
 *   B1 Ads GP             ← LIVE: Graph API (6 TK) + '🔍 Google Ads Daily' → Claude
 *   B2 Store GP & KQ      ← NATIVE: 'Shopify B2C' + '📊 Ad Spend' (tính trong code)
 *   B3 Ads đối thủ & Hook ← GitHub gerbera-ads.json (khối DUY NHẤT còn cần Cowork)
 *   B4 Hệ thống           ← TỰ SINH: sức khoẻ thật của 3 nguồn trên
 *
 * ===== LỊCH 07:00 =====
 *   Cowork push JSON 09:30 → lúc 07:00 JSON LUÔN là của HÔM QUA. Đó là ĐÚNG.
 *   Chỉ cảnh báo khi JSON cũ hơn hôm qua (age_days > 1).
 *
 * ===== BẢO MẬT: KHÔNG hardcode secret =====
 *   Project Settings → Script Properties: TELEGRAM_BOT_TOKEN (hoặc GP_TOKEN),
 *   TELEGRAM_CHAT_ID (hoặc GP_CHAT), ANTHROPIC_API_KEY. FB_ADS_TOKEN đã có sẵn.
 *
 * CÀI: 1) TZ = Bangkok  2) Run tgSelfTest  3) Run gpVerifyGerFilter
 *      4) Run gpSendAll  5) Run gpInstallTriggers
 ************************************************************************/

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

/** v3.3-G: in ở mọi chẩn đoán + B4. Hết cảnh đoán "code nào đang chạy". */
var GP_BUILD = 'v3.9 · 2026-07-31';

var GP_TZ    = 'Asia/Bangkok';
var GP_DELAY = 3500;
var GP_RAW_URL = 'https://raw.githubusercontent.com/GerberaPrints/foxera-daily/main/gerbera-ads.json';

/**
 * v3.5-K/L — LUỒNG 1 MARKET. Báo cáo RIÊNG, tách khỏi ads 07:00.
 * `names` CHỈ để đặt tiêu đề đẹp — KHÔNG phải bộ lọc. Khối nào có trong JSON
 * đều được gửi, kể cả khối chưa khai ở đây. Đó là điểm khác cốt lõi so với
 * GP_JSON_BLOCKS: task market thêm B4..B8 thì GAS tự gửi, khỏi sửa code.
 */
var GX_MARKET = {
  url: 'https://raw.githubusercontent.com/GerberaPrints/foxera-daily/main/gerbera-market.json',
  names: {
    B1: 'Keyword & Mùa vụ',        B2: 'Competitor Radar',
    B3: 'Social & Search Signals', B4: 'Niche Deep-Dive',
    B5: 'Idea Bank & Niche mới',   B6: 'Định dạng SP & SP đang thắng',
    B7: 'Evergreen Bank',          B8: 'Listing/ASIN Etsy & Amazon',
    B9: 'Ads đối thủ & Hook',
    B10: 'Video Trends TikTok/IG',   // v3.9-X
    B11: 'Động tĩnh đối thủ'          // v3.9-X
  }
};

/** Chỉ B3 còn lấy từ JSON. B1/B2/B4 tự chủ. */
var GP_JSON_BLOCKS = ['B3'];

/** v3.1-C: khối JSON đã CHỦ ĐỘNG thay bằng nguồn native → bỏ qua là ĐÚNG,
 *  không phải "bỏ rơi im lặng". Chỉ khối lạ ngoài 2 mảng này mới báo 🚨. */
var GP_JSON_SUPERSEDED = ['B1', 'B2', 'B4'];

/** v3.1-A: 02 đã chuyển sang GritFell (xác nhận 17/07/2026).
 *  Khi 02 chạy lại Gerbera: bỏ comment dòng dưới là xong. */
var TG_META_ACCOUNTS = {
  // '02': '687791113516625',   // ⛔ GritFell — KHÔNG phải Gerbera nữa
  '03': '3666317626944281',
  '04': '529798326149618',
  '05': '408509139005908',
  '08': '1635419550630846', // hay lỗi tracking → ROAS thường N/A
  '09': '441855108709735',
  '10': '1075322513569687'
};

var TG_GRAPH_VER  = 'v20.0';
var TG_GOOGLE_CID = '2946662893';

/** CRM THẬT (khớp CFG.SHEET_ID của GP_GoogleAds_Export). '1sd8LEN…' đã chết. */
var TG_SS_ID_FALLBACK = '1RkmhfOjJaqH8KcumjVuT86ij17J08ZlDyCB6SP5nwdo';

var TG_G_SHEET_CANDIDATES = ['🔍 Google Ads Daily', '🔍 Google Ads'];
var TG_G_DATA_ROW = 5;
var TG_G_COLS = { date: 0, camp: 1, campId: 2, cost: 3, impr: 4, clicks: 5,
                  ctr: 6, cpc: 7, conv: 8, convVal: 9, roas: 10, cur: 11 };

/** Sheet CRM cho B2 (layout đối chiếu _ctStoreRevByMonth / _dplLoadAdSpend). */
var GP_B2C_SHEET     = 'Shopify B2C';   // row 3+ · col A date · index 15 = Total Revenue
var GP_ADSPEND_SHEET = '📊 Ad Spend';   // row 3+ · A date · B FB · C Google · E Total
/** v3.8-U: per line-item. A:Date B:Order# C:SKU D:Title E:Variant F:Price G:Qty (từ GP_ProductPL.gs) */
var GP_SKURAW_SHEET  = 'SKU Raw Data';
var GP_SKU_COLS = { date: 0, order: 1, sku: 2, title: 3, variant: 4, price: 5, qty: 6 };
var GP_TOP_SKU_N     = 8;

var TG_TOP_ADS_PER_ACCT  = 6;
var TG_MAX_MSG           = 3900;
var TG_LLM_MODEL_DEFAULT = 'claude-sonnet-5';
var TG_LLM_MAX_TOKENS    = 16000;  // v3.3-F: 5000 KHÔNG đủ — thinking ăn sạch,
                                   // out=5000/stop_reason=max_tokens, 0 block text.
                                   // Đã tắt thinking bên dưới; 16000 là đệm.
var TG_BODY_MAX          = 320;

/** Priority order — khớp FBA.PURCHASE_TYPES. FIRST present wins, NEVER summed. */
var TG_PURCH_TYPES = ['offsite_conversion.fb_pixel_purchase', 'omni_purchase', 'purchase'];
var TG_ATC_TYPES   = ['offsite_conversion.fb_pixel_add_to_cart', 'omni_add_to_cart', 'add_to_cart'];
var TG_CO_TYPES    = ['offsite_conversion.fb_pixel_initiate_checkout', 'omni_initiated_checkout', 'initiate_checkout'];

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINTS
// ─────────────────────────────────────────────────────────────────────────────

function gpDailyRun() {
  try { gpSendAll(); }
  catch (e) {
    Logger.log('[gpDailyRun] ' + e.message);
    try { gp_send_('🚨 <b>GP Ads — lỗi toàn cục</b>\n<code>' +
                   gp_esc_(String(e && e.message ? e.message : e)) + '</code>', 'HTML'); } catch (e2) {}
  }
}

/** Xây TRƯỚC, gửi SAU — để B4 báo cáo được kết quả thật của B1–B3. */
function gpSendAll() {
  var ctx = { src: {}, errors: [] };

  var b1 = gp_safe_(function () { return buildBlockAds_(ctx); },        ctx, 'B1');
  var b2 = gp_safe_(function () { return buildBlockStore_(ctx); },      ctx, 'B2');
  var b3 = gp_safe_(function () { return buildBlockCompetitor_(ctx); }, ctx, 'B3');
  var b4 = buildBlockSystem_(ctx);

  gp_send_(buildHeader_(ctx), 'HTML'); Utilities.sleep(GP_DELAY);
  gp_emit_('B1', 'Ads GP',             b1);
  gp_emit_('B2', 'Store GP & Kết quả', b2);
  gp_emit_('B3', 'Ads đối thủ & Hook', b3);
  gp_emit_('B4', 'Hệ thống',           b4);
  Logger.log('DONE gpSendAll · errors=' + ctx.errors.length);
}

/** Chẩn đoán — KHÔNG gửi Telegram. */
function tgSelfTest() {
  var L = ['🔍 GP ADS REPORT — SELF TEST', 'build: ' + GP_BUILD, '────────────────────'];

  L.push('Project context:');
  L.push('  _fbaToken()   : ' + (typeof _fbaToken === 'function' ? '✅ có (đúng project CRM)' :
        '❌ KHÔNG có → file đang ở SAI PROJECT (phải là Gerberaprints CRM)'));
  L.push('  _fbaIsGP()    : ' + (typeof _fbaIsGP === 'function' ? '✅ có (dùng marker chung)' :
        '⚠ không có → gp_isGP_ dùng fallback [ger, gerberaprints]'));
  L.push('  _getSSActive(): ' + (typeof _getSSActive === 'function' ? '✅ có' : '❌ không có'));

  var ss = tgResolveSS_();
  L.push('', 'Spreadsheet:');
  if (ss.ss) {
    L.push('  ✅ ' + ss.ss.getName() + '  (' + ss.id + ', nguồn: ' + ss.source + ')');
    if (ss.source === 'TG_SS_ID_FALLBACK') L.push('  ⚠ dùng fallback → nhiều khả năng sai project');
  } else L.push('  ❌ ' + (ss.error || '?'));

  var token = null;
  L.push('', 'FB token:');
  try {
    token = tgToken_();
    L.push('  ✅ OK (...' + token.slice(-6) + ')');
    try {
      var d = (tgGraph_('/debug_token', { input_token: token }) || {}).data || {};
      var ok = (d.scopes || []).indexOf('ads_read') >= 0 || (d.scopes || []).indexOf('ads_management') >= 0;
      L.push('  ads_read: ' + (ok ? '✅' : '❌ THIẾU'));
    } catch (e) { L.push('  ⚠ debug_token: ' + e.message.substring(0, 70)); }
  } catch (e) { L.push('  ❌ ' + e.message); }

  if (token) {
    L.push('', 'Tài khoản Meta (phải là 6 TK — KHÔNG có 02):');
    Object.keys(TG_META_ACCOUNTS).forEach(function (k) {
      try {
        var i = tgGraph_('/act_' + TG_META_ACCOUNTS[k], { fields: 'name,currency,account_status', access_token: token });
        L.push('  ✅ ' + k + ' — ' + i.name + ' (' + i.currency + ')');
      } catch (e) { L.push('  ❌ ' + k + ' — ' + e.message.substring(0, 60)); }
      Utilities.sleep(200);
    });
  }

  var g = fetchGoogleSnapshot_();
  L.push('', 'B1 · Google sheet: ' + g.status +
         (g.last_date ? ' · mới nhất ' + g.last_date + ' (cũ ' + g.days_stale + 'd)' : '') +
         (g.campaigns_7d ? ' · ' + g.campaigns_7d.length + ' campaign' : ''));

  var s = gp_readStore_();
  L.push('B2 · Store: ' + s.status + (s.status === 'OK'
        ? ' · rev7d $' + Math.round(s.rev7) + ' · spend7d $' + Math.round(s.spend7) : ' · ' + (s.note || '')));

  var j = gp_loadJson_();
  L.push('B3 · GitHub JSON: ' + j.status + (j.date ? ' · date=' + j.date + ' (' + j.age_days + 'd)' : '') +
         (j.blocks_present ? ' · khối: ' + j.blocks_present.join(',') : ''));
  if (j.age_days === 1) L.push('     ℹ️ cũ 1 ngày = ĐÚNG (Cowork push 09:30, báo cáo chạy 07:00)');
  if (j.superseded && j.superseded.length)
    L.push('     ℹ️ bỏ qua ' + j.superseded.join(',') + ' — cố ý, đã có nguồn native');
  if (j.orphan && j.orphan.length)
    L.push('     🚨 khối LẠ chưa khai: ' + j.orphan.join(',') + ' → đang bị bỏ rơi im lặng');

  L.push('', 'Script Properties:');
  [['TELEGRAM_BOT_TOKEN', 'GP_TOKEN'], ['TELEGRAM_CHAT_ID', 'GP_CHAT'], ['ANTHROPIC_API_KEY', null]]
    .forEach(function (pair) {
      var p = PropertiesService.getScriptProperties();
      var v = p.getProperty(pair[0]) || (pair[1] ? p.getProperty(pair[1]) : null);
      L.push('  ' + (v ? '✅' : '❌') + ' ' + pair[0] + (pair[1] ? ' (hoặc ' + pair[1] + ')' : '') + (v ? '' : ' — THIẾU'));
    });

  var txt = L.join('\n');
  Logger.log(txt);
  return txt;
}

/** v3.1-B — kiểm chứng bộ lọc ranh giới từ. Chạy 1 lần sau khi cài. */
function gpVerifyGerFilter() {
  var cases = [
    ['GER_B2G1_PHONG_B461',      true],
    ['GerberaPrints Winner CBO', true],
    ['[GER] Testing',            true],
    ['GER',                      true],
    ['ger_sleeveless',           true],
    ['AZALEA-GER-01',            true],
    ['Burger Lover Tee',         false],
    ['Ginger Girl Shirt',        false],
    ['Merger Special',           false],
    ['Lager Beer Polo',          false],
    ['Hamburger Dad Hat',        false],
    ['Danger Zone Hoodie',       false],
    ['Tiger Golf Polo',          false],
    ['GRITFELL Q3 Scale',        false]
  ];
  var pass = 0, fail = 0, out = ['gp_isGP_() — kiểm chứng ranh giới từ:'];
  cases.forEach(function (c) {
    var got = gp_isGP_(c[0]), ok = (got === c[1]);
    ok ? pass++ : fail++;
    out.push('  ' + (ok ? '✅' : '❌ SAI') + '  ' + (c[1] ? 'GIỮ ' : 'LOẠI') +
             '  "' + c[0] + '"' + (ok ? '' : '  → got ' + got));
  });
  out.push('', '  ' + pass + ' pass / ' + fail + ' fail');
  out.push('  Marker: ' + (typeof _fbaCampaignMarkers === 'function'
            ? '[' + _fbaCampaignMarkers().join(', ') + '] (từ FB_Ads_Daily)'
            : '[ger, gerberaprints] (fallback)'));
  Logger.log(out.join('\n'));
  return out.join('\n');
}

/** v3.7-R + v3.9-X: 7 nhịp. atHour/nearMinute có cửa sổ ±15'.
 *  ⚠️ v3.9-Y: 09:30/09:45/10:00 cách nhau 15' < 30' → 3 nhịp cuối có thể đến
 *  lệch thứ tự. Chấp nhận được vì cùng đọc 1 file đã push từ ~07:45 (xem header). */
var GP_SLOTS = [
  { fn: 'gpSlot1Ads',    h: 7,  m: 0,  label: 'Ads GP (live)' },
  { fn: 'gpSlot2Store',  h: 7,  m: 30, label: 'Store & Kết quả (native)' },
  { fn: 'gpSlot3Market', h: 8,  m: 30, label: 'Thị trường & Đối thủ' },
  { fn: 'gpSlot4Ideas',  h: 9,  m: 0,  label: 'Ý tưởng & Sản phẩm' },
  { fn: 'gpSlot5Rival',  h: 9,  m: 30, label: 'Ads đối thủ + Hệ thống' },
  { fn: 'gpSlot6Video',  h: 9,  m: 45, label: 'Video Trends TikTok/IG' },   // v3.9-X
  { fn: 'gpSlot7Moves',  h: 10, m: 0,  label: 'Động tĩnh đối thủ' }          // v3.9-X
];

function gpInstallTriggers() {
  gpRemoveTriggers();
  GP_SLOTS.forEach(function (s) {
    ScriptApp.newTrigger(s.fn).timeBased().atHour(s.h).nearMinute(s.m)
      .everyDays(1).inTimezone(GP_TZ).create();
  });
  Logger.log('✅ ' + GP_SLOTS.length + ' trigger: ' +
    GP_SLOTS.map(function (s) { return s.fn + ' ' + s.h + ':' + (s.m < 10 ? '0' : '') + s.m; }).join(' · ') +
    ' (' + GP_TZ + '). Đã gỡ trigger cũ.');
}


function gpRemoveTriggers() {
  var dead = ['gpSendBlock1', 'gpSendBlock2', 'gpSendBlock3', 'gpSendBlock4',
              'gpHealthCheck', 'pushAdsAdviceToTelegram', 'gpDailyRun', 'gpMarketRun',
              'gpSlot1Ads', 'gpSlot2Store', 'gpSlot3Market', 'gpSlot4Ideas', 'gpSlot5Rival',
              'gpSlot6Video', 'gpSlot7Moves'];
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (dead.indexOf(t.getHandlerFunction()) >= 0) { ScriptApp.deleteTrigger(t); n++; }
  });
  Logger.log('Đã gỡ ' + n + ' trigger cũ.');
}

function testTelegramConnection() {
  gp_send_('✅ GP Ads Report ' + GP_BUILD + ' kết nối OK — ' +
    Utilities.formatDate(new Date(), GP_TZ, 'yyyy-MM-dd HH:mm'), null);
}

// ─────────────────────────────────────────────────────────────────────────────
// HEADER + EMIT
// ─────────────────────────────────────────────────────────────────────────────

function buildHeader_(ctx) {
  var d = Utilities.formatDate(new Date(), GP_TZ, 'EEE dd/MM/yyyy');
  return '⛳️ <b>GerberaPrints · Daily Ads Report</b>\n' + d +
    '\n<i>B1 Ads (live) · B2 Store (native) · B3 Đối thủ (JSON) · B4 Hệ thống.</i>' +
    '\n<i>Google = VND · Facebook = USD · Store = USD. Không trộn đơn vị.</i>' +
    '\n<i>⛔️ Mọi mục đều là ĐỀ XUẤT — bot không tự tắt/sửa/đổi ngân sách.</i>';
}

function gp_emit_(key, name, payload) {
  if (!payload || !payload.length) {
    gp_send_('⚠️ <b>' + key + ' — ' + name + '</b>: không có dữ liệu hôm nay.', 'HTML');
    Utilities.sleep(GP_DELAY);
    return;
  }
  for (var i = 0; i < payload.length; i++) {
    gp_send_(payload[i].text, payload[i].mode);
    Utilities.sleep(GP_DELAY);
  }
}

/** Lỗi 1 khối KHÔNG được giết cả báo cáo. */
function gp_safe_(fn, ctx, key) {
  try { return fn(); }
  catch (e) {
    var m = String(e && e.message ? e.message : e);
    ctx.errors.push(key + ': ' + m);
    Logger.log('[' + key + '] ' + m);
    return [{ text: '⚠️ <b>' + key + '</b> lỗi — xem khối B4.\n<code>' + gp_esc_(m.substring(0, 300)) + '</code>',
              mode: 'HTML' }];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// B1 — ADS (LIVE)
// ─────────────────────────────────────────────────────────────────────────────

function buildBlockAds_(ctx) {
  var snapshot = {
    generated_at: Utilities.formatDate(new Date(), GP_TZ, 'yyyy-MM-dd HH:mm'),
    meta:   fetchMetaSnapshot_(),
    google: fetchGoogleSnapshot_()
  };
  ctx.src.meta_accounts_ok = snapshot.meta.accounts.filter(function (a) { return !a.error; }).length;
  ctx.src.meta_accounts_err = snapshot.meta.accounts.filter(function (a) { return !!a.error; })
                                 .map(function (a) { return a.label + ': ' + a.error.substring(0, 60); });
  // v3.1-B: gom tên campaign brand khác đã bị loại — bằng chứng bộ lọc chạy đúng
  var dropped = [];
  snapshot.meta.accounts.forEach(function (a) {
    if (a.acct_7d && a.acct_7d.campaigns_dropped) {
      a.acct_7d.campaigns_dropped.forEach(function (n) {
        if (dropped.indexOf(n) < 0) dropped.push(n);
      });
    }
  });
  ctx.src.dropped = dropped;
  ctx.src.google = snapshot.google.status +
    (snapshot.google.last_date ? ' (' + snapshot.google.last_date + ', cũ ' + snapshot.google.days_stale + 'd)' : '');

  var report = callLLM_(snapshot);
  if (!report || report.length < 40) throw new Error('LLM trả về rỗng/ngắn bất thường.');
  ctx.src.llm = 'OK';

  return [{ text: '📊 <b>B1 — Ads GP</b> (dữ liệu live · 6 TK)\n\n' + gp_sanitizeHtml_(report), mode: 'HTML' }];
}

// ─────────────────────────────────────────────────────────────────────────────
// B2 — STORE (NATIVE, tính trong code — không qua LLM nên không thể bịa số)
// ─────────────────────────────────────────────────────────────────────────────

function gp_readStore_() {
  var ss = tgResolveSS_().ss;
  if (!ss) return { status: 'NO_SPREADSHEET' };

  var wB2C = ss.getSheetByName(GP_B2C_SHEET);
  var wSp  = ss.getSheetByName(GP_ADSPEND_SHEET);
  if (!wB2C) return { status: 'NO_B2C_SHEET', note: 'thiếu "' + GP_B2C_SHEET + '"' };

  var w7 = tgWindowKeys_(1, 7), wP = tgWindowKeys_(8, 14);
  var w1 = tgWindowKeys_(1, 1), w3 = tgWindowKeys_(1, 3);   // v3.8-W
  var rev7 = 0, revP = 0, ord7 = 0, ordP = 0;
  var rev1 = 0, ord1 = 0, rev3 = 0, ord3 = 0;

  if (wB2C.getLastRow() >= 3) {
    var bw = Math.min(27, wB2C.getMaxColumns());
    wB2C.getRange(3, 1, wB2C.getLastRow() - 2, bw).getValues().forEach(function (r) {
      var d = r[0];
      if (!(d instanceof Date) || isNaN(d.getTime())) return;
      var rev = parseFloat(r[15]) || 0;      // r[15] = Total Revenue
      if (rev <= 0) return;
      var k = tgDayKey_(d);
      if (w1[k]) { rev1 += rev; ord1++; }
      if (w3[k]) { rev3 += rev; ord3++; }
      if (w7[k])      { rev7 += rev; ord7++; }
      else if (wP[k]) { revP += rev; ordP++; }
    });
  }

  var spend7 = 0, spendP = 0, fb7 = 0, ga7 = 0, spend1 = 0, spend3 = 0;
  if (wSp && wSp.getLastRow() >= 3) {
    wSp.getRange(3, 1, wSp.getLastRow() - 2, 5).getValues().forEach(function (r) {
      var d = r[0];
      if (!(d instanceof Date) || isNaN(d.getTime())) return;
      var k = tgDayKey_(d);
      var fb = parseFloat(r[1]) || 0, ga = parseFloat(r[2]) || 0;   // B FB · C Google
      var tot = parseFloat(r[4]) || (fb + ga);                       // E Total
      if (w1[k]) spend1 += tot;
      if (w3[k]) spend3 += tot;
      if (w7[k])      { spend7 += tot; fb7 += fb; ga7 += ga; }
      else if (wP[k]) { spendP += tot; }
    });
  }

  return {
    status: 'OK', rev7: rev7, revPrev: revP, ord7: ord7, ordPrev: ordP,
    rev1: rev1, ord1: ord1, spend1: spend1, mer1: spend1 > 0 ? rev1 / spend1 : null,
    rev3: rev3, ord3: ord3, spend3: spend3, mer3: spend3 > 0 ? rev3 / spend3 : null,
    spend7: spend7, spendPrev: spendP, fb7: fb7, ga7: ga7,
    mer7: spend7 > 0 ? rev7 / spend7 : null,
    merPrev: spendP > 0 ? revP / spendP : null,
    has_spend_sheet: !!wSp
  };
}

function buildBlockStore_(ctx) {
  var s = gp_readStore_();
  ctx.src.store = s.status;
  if (s.status !== 'OK') return null;

  function pct(cur, prev) {
    if (!prev) return '—';
    var p = (cur - prev) / prev * 100;
    return (p >= 0 ? '▲ +' : '▼ ') + p.toFixed(0) + '%';
  }
  function usd(v) { return '$' + Math.round(v).toLocaleString('en-US'); }

  var band = s.mer7 === null ? '' : (s.mer7 >= 2 ? ' 🟢' : (s.mer7 >= 1 ? ' 🟡' : ' 🔴'));

  function mer(v) { return v === null ? 'n/a' : v.toFixed(2) + 'x'; }
  // v3.8-W: nhịp 1d/3d/7d — 7 ngày quá dài để bắt chuyển động
  var t = '🛒 <b>B2 — Store GP &amp; Kết quả</b>\n\n' +
    '<b>⏱ NHỊP</b>  <i>hôm qua · 3 ngày · 7 ngày</i>\n' +
    '<code>Doanh thu  ' + usd(s.rev1) + ' · ' + usd(s.rev3) + ' · ' + usd(s.rev7) + '</code>\n' +
    '<code>Đơn        ' + s.ord1 + ' · ' + s.ord3 + ' · ' + s.ord7 + '</code>\n' +
    '<code>Chi ads    ' + usd(s.spend1) + ' · ' + usd(s.spend3) + ' · ' + usd(s.spend7) + '</code>\n' +
    '<code>MER        ' + mer(s.mer1) + ' · ' + mer(s.mer3) + ' · ' + mer(s.mer7) + '</code>\n' +
    '<i>⚠️ Hôm qua = số CHƯA CHỐT (attribution settle ~72h) — bắt xu hướng, không kết luận.</i>\n\n' +
    '<b>📊 7 ngày vs 7 ngày trước</b>\n' +
    '<b>Doanh thu store</b>: ' + usd(s.rev7) + '  ' + pct(s.rev7, s.revPrev) +
      '  <i>(trước: ' + usd(s.revPrev) + ')</i>\n' +
    '<b>Đơn hàng</b>: ' + s.ord7 + '  ' + pct(s.ord7, s.ordPrev) +
      '  <i>(trước: ' + s.ordPrev + ')</i>\n' +
    '<b>AOV</b>: ' + (s.ord7 ? usd(s.rev7 / s.ord7) : 'n/a') +
      (s.ordPrev ? '  <i>(trước: ' + usd(s.revPrev / s.ordPrev) + ')</i>' : '') + '\n' +
    '<b>Chi quảng cáo</b>: ' + usd(s.spend7) + '  ' + pct(s.spend7, s.spendPrev) + '\n' +
    '   ├ Facebook: ' + usd(s.fb7) + '\n' +
    '   └ Google:   ' + usd(s.ga7) + '\n' +
    '<b>Blended MER</b>: ' + (s.mer7 === null ? 'n/a' : s.mer7.toFixed(2) + 'x') + band +
      '  ' + (s.merPrev ? '<i>(trước: ' + s.merPrev.toFixed(2) + 'x)</i>' : '') + '\n\n' +
    '<i>Nguồn: sheet "' + GP_B2C_SHEET + '" + "' + GP_ADSPEND_SHEET + '" (CRM). ' +
    'Tính trực tiếp trong code — không qua AI. MER = doanh thu store ÷ tổng chi ads ' +
    '(sàn UTM, khác ROAS nền tảng ở B1).</i>' +
    (s.has_spend_sheet ? '' : '\n⚠️ <i>Không thấy "' + GP_ADSPEND_SHEET + '" → chi ads = 0.</i>');

  return [{ text: t, mode: 'HTML' }];
}

// ─────────────────────────────────────────────────────────────────────────────
// B3 — ĐỐI THỦ & HOOK (nguồn DUY NHẤT còn phụ thuộc Cowork/GitHub)
// ─────────────────────────────────────────────────────────────────────────────

function gp_loadJson_() {
  try {
    var res = UrlFetchApp.fetch(GP_RAW_URL + '?t=' + Date.now(),
                { muteHttpExceptions: true, headers: { 'Cache-Control': 'no-cache' } });
    var code = res.getResponseCode();
    if (code === 404) return { status: 'NOT_FOUND',
      note: 'gerbera-ads.json không có trên repo — Cowork task chưa push hoặc sai tên file.' };
    if (code !== 200) return { status: 'HTTP_' + code };

    var d = JSON.parse(res.getContentText());
    var present = Object.keys(d.blocks || {});
    // v3.1-C: B1/B2/B4 bỏ qua là CỐ Ý → không phải orphan.
    var superseded = present.filter(function (k) { return GP_JSON_SUPERSEDED.indexOf(k) >= 0; });
    var orphan = present.filter(function (k) {
      return GP_JSON_BLOCKS.indexOf(k) < 0 && GP_JSON_SUPERSEDED.indexOf(k) < 0;
    });
    return {
      status: 'OK', data: d, date: d.date || null, locale: d.locale || null,
      age_days: d.date ? gp_ageDays_(d.date) : null,
      blocks_present: present, superseded: superseded, orphan: orphan
    };
  } catch (e) {
    return { status: 'READ_ERROR', note: String(e && e.message ? e.message : e) };
  }
}

function buildBlockCompetitor_(ctx) {
  var j = gp_loadJson_();
  ctx.src.json = j.status + (j.date ? ' (' + j.date + ', ' + j.age_days + 'd)' : '');
  ctx.src.json_full = j;
  if (j.status !== 'OK') return null;

  var arr = (j.data.blocks && j.data.blocks.B3) ? j.data.blocks.B3 : null;
  if (!arr || !arr.length) return null;

  var note = '\n\n<i>Nguồn: gerbera-ads.json ngày ' + j.date + ' (Cowork push 09:30). ' +
             'Báo cáo chạy 07:00 nên khối này luôn là dữ liệu ngày hôm trước — bình thường.</i>';

  return arr.map(function (t, i) {
    return { text: (i === 0 ? '🥊 <b>B3 — Ads đối thủ &amp; Hook</b>\n\n' : '') + t +
                   (i === arr.length - 1 ? note : ''), mode: 'HTML' };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// B4 — HỆ THỐNG (tự sinh)
// ─────────────────────────────────────────────────────────────────────────────

function buildBlockSystem_(ctx) {
  var L = ['🩺 <b>B4 — Hệ thống</b>  <i>' + GP_BUILD + '</i>\n'];
  var s = ctx.src;

  if (s.meta_accounts_ok !== undefined) {
    L.push('<b>Meta</b>: ' + s.meta_accounts_ok + '/6 TK đọc OK  <i>(02 đã chuyển GritFell)</i>' +
           (s.meta_accounts_err && s.meta_accounts_err.length
             ? '\n  ❌ ' + s.meta_accounts_err.map(gp_esc_).join('\n  ❌ ') : ''));
  } else L.push('<b>Meta</b>: ❌ không chạy được (xem B1)');

  L.push('<b>Google Ads sheet</b>: ' + gp_esc_(s.google || '❌ không đọc được'));
  L.push('<b>Store sheets</b>: ' + gp_esc_(s.store || '❌'));
  L.push('<b>Claude API</b>: ' + (s.llm || '❌ lỗi — xem "Lỗi khối" bên dưới'));
  L.push('<b>GitHub JSON</b>: ' + gp_esc_(s.json || '❌'));

  if (s.dropped && s.dropped.length) {
    L.push('\n<i>🛡️ Đã loại ' + s.dropped.length + ' campaign brand khác bị CONTAIN "GER" nuốt nhầm: ' +
           gp_esc_(s.dropped.slice(0, 5).join(' · ')) + (s.dropped.length > 5 ? ' …' : '') + '</i>');
  }

  var j = s.json_full || {};
  if (j.status === 'NOT_FOUND') {
    L.push('\n🚨 <b>Cowork task chưa từng push</b> — kiểm tra scheduled task + PAT ' +
           '(Contents: Read and write cho <code>GerberaPrints/foxera-daily</code>).');
  } else if (j.age_days !== null && j.age_days !== undefined && j.age_days > 1) {
    L.push('\n🚨 <b>JSON cũ ' + j.age_days + ' ngày</b> (' + j.date + ') — Cowork task 09:30 ' +
           'nhiều khả năng đã chết hoặc push fail. B3 đang là dữ liệu cũ.');
  }
  if (j.superseded && j.superseded.length) {
    L.push('\n<i>ℹ️ Bỏ qua ' + j.superseded.join(', ') + ' trong JSON — cố ý, đã thay bằng nguồn live/native.</i>');
  }
  if (j.orphan && j.orphan.length) {
    L.push('\n🚨 <b>Khối JSON LẠ chưa ai khai</b>: ' + j.orphan.join(', ') +
           ' — không nằm trong <code>GP_JSON_BLOCKS</code> lẫn <code>GP_JSON_SUPERSEDED</code> ' +
           '→ đang bị bỏ rơi im lặng. Thêm vào 1 trong 2 mảng.');
  }
  if (ctx.errors.length) {
    L.push('\n<b>Lỗi khối</b>:\n  • ' + ctx.errors.map(function (e) { return gp_esc_(e.substring(0, 200)); }).join('\n  • '));
  }
  if (!ctx.errors.length && j.status === 'OK' && s.llm === 'OK') L.push('\n✅ Cả 4 khối bình thường.');

  return [{ text: L.join('\n'), mode: 'HTML' }];
}

// ─────────────────────────────────────────────────────────────────────────────
// RESOLVERS
// ─────────────────────────────────────────────────────────────────────────────

function tgResolveSS_() {
  try {
    if (typeof _getSSActive === 'function') {
      var a = _getSSActive();
      if (a) return { ss: a, id: a.getId(), source: '_getSSActive()' };
    }
  } catch (e) {}
  try {
    var id = PropertiesService.getScriptProperties().getProperty('TARGET_SS_ID');
    if (id) return { ss: SpreadsheetApp.openById(id), id: id, source: 'TARGET_SS_ID' };
  } catch (e) {}
  try {
    return { ss: SpreadsheetApp.openById(TG_SS_ID_FALLBACK), id: TG_SS_ID_FALLBACK,
             source: 'TG_SS_ID_FALLBACK' };
  } catch (e) { return { ss: null, error: e.message }; }
}

function tgToken_() {
  try {
    if (typeof _fbaToken === 'function') {
      var t0 = _fbaToken();
      if (t0 && t0.trim()) return t0.trim();
    }
  } catch (e) {}
  var p = PropertiesService.getScriptProperties();
  var t = p.getProperty('FB_ADS_TOKEN');
  if (t && t.trim()) return t.trim();
  t = p.getProperty('FB_CAPI_TOKEN');
  if (t && t.trim()) return t.trim();
  throw new Error('Thiếu FB token (FB_ADS_TOKEN/FB_CAPI_TOKEN). Nếu self-test báo ' +
                  '_fbaToken() không có → file đang ở SAI PROJECT.');
}

function gp_token_() {
  var p = PropertiesService.getScriptProperties();
  var v = p.getProperty('TELEGRAM_BOT_TOKEN') || p.getProperty('GP_TOKEN');
  if (!v) throw new Error('Thiếu TELEGRAM_BOT_TOKEN (hoặc GP_TOKEN) — Project Settings → Script Properties.');
  return v;
}

function gp_chat_() {
  var p = PropertiesService.getScriptProperties();
  var v = p.getProperty('TELEGRAM_CHAT_ID') || p.getProperty('GP_CHAT');
  if (!v) throw new Error('Thiếu TELEGRAM_CHAT_ID (hoặc GP_CHAT) — Project Settings → Script Properties.');
  return v;
}

// ─────────────────────────────────────────────────────────────────────────────
// GRAPH + META
// ─────────────────────────────────────────────────────────────────────────────

function tgGraph_(path, params) {
  params = params || {};
  if (!params.access_token) params.access_token = tgToken_();
  var url = 'https://graph.facebook.com/' + TG_GRAPH_VER + path + '?' + toQuery_(params);
  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var body = JSON.parse(resp.getContentText() || '{}');
  if (resp.getResponseCode() !== 200 || body.error) {
    throw new Error('Graph ' + (body.error ? body.error.message : ('HTTP ' + resp.getResponseCode())));
  }
  return body;
}

function tgMinor_(v, cur) {
  var n = parseFloat(v);
  if (isNaN(n) || !n) return null;
  return (String(cur).toUpperCase() === 'VND') ? n : n / 100;
}

/**
 * v3.1-B — GER match theo RANH GIỚI TỪ. "Burger"/"Ginger"/"Merger" KHÔNG khớp;
 * "GER", "GER_B2G1", "[GER]", "GerberaPrints" thì khớp.
 * Tái dùng _fbaIsGP + _fbaCampaignMarkers của FB_Ads_Daily.gs → marker khai MỘT chỗ.
 */
function gp_isGP_(name) {
  try {
    if (typeof _fbaIsGP === 'function' && typeof _fbaCampaignMarkers === 'function') {
      return _fbaIsGP(name, _fbaCampaignMarkers());
    }
  } catch (e) {}
  var n = String(name || '').toLowerCase();
  var markers = ['ger', 'gerberaprints'];
  var isAlpha = function (c) { return c >= 'a' && c <= 'z'; };
  for (var mi = 0; mi < markers.length; mi++) {
    var m = markers[mi], start = 0, i;
    while ((i = n.indexOf(m, start)) >= 0) {
      var before = i > 0 ? n.charAt(i - 1) : '';
      var after  = (i + m.length < n.length) ? n.charAt(i + m.length) : '';
      if (!isAlpha(before) && !isAlpha(after)) return true;
      start = i + 1;
    }
  }
  return false;
}

/**
 * v3.1-B — Tổng account THẬT: lấy CAMPAIGN-level rồi tự cộng.
 * KHÔNG dùng level='account' vì Graph gộp sẵn số → "Burger Lover Tee" đã nằm
 * trong tổng và không bóc ra được. Campaign-level → thấy tên → lọc → cộng lại.
 */
function metaAccountTotals_(actId, token, datePreset, timeRange) {
  var params = {
    level: 'campaign',
    fields: 'campaign_name,spend,impressions,clicks,actions,action_values',
    filtering: JSON.stringify([{ field: 'campaign.name', operator: 'CONTAIN', value: 'GER' }]),
    action_attribution_windows: JSON.stringify(['7d_click', '1d_view']),
    limit: '500'
  };
  if (datePreset) params.date_preset = datePreset;
  if (timeRange)  params.time_range  = JSON.stringify(timeRange);

  var body = tgGraph_('/act_' + actId + '/insights', params);
  var t = { spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0,
            campaigns_counted: 0, campaigns_dropped: [] };

  (body.data || []).forEach(function (r) {
    var nm = r.campaign_name || '';
    if (!gp_isGP_(nm)) { t.campaigns_dropped.push(nm); return; }   // chặn Burger/Ginger
    t.campaigns_counted++;
    t.spend       += parseFloat(r.spend) || 0;
    t.impressions += parseInt(r.impressions) || 0;
    t.clicks      += parseInt(r.clicks) || 0;
    t.purchases   += tgPickOne_(r.actions, TG_PURCH_TYPES);
    t.revenue     += tgPickOne_(r.action_values, TG_PURCH_TYPES);
  });

  t.ctr     = t.impressions > 0 ? Math.round(t.clicks / t.impressions * 10000) / 100 : null;
  t.cpc     = t.clicks > 0 ? Math.round(t.spend / t.clicks * 100) / 100 : null;
  t.roas    = t.spend > 0 ? Math.round(t.revenue / t.spend * 100) / 100 : null;
  t.spend   = Math.round(t.spend * 100) / 100;
  t.revenue = Math.round(t.revenue * 100) / 100;
  return t;
}

function fetchMetaSnapshot_() {
  var token = tgToken_();
  var out = { accounts: [] };
  Object.keys(TG_META_ACCOUNTS).forEach(function (label) {
    var actId = TG_META_ACCOUNTS[label];
    var rec = { label: label, id: actId };
    try {
      var meta = tgGraph_('/act_' + actId, { fields: 'name,currency', access_token: token });
      rec.currency = meta.currency || 'USD';
      // v3.1-B: account-level = gộp campaign-level + lọc ranh giới từ. KHÔNG lọc status.
      // v3.8-W: 3 nhịp thời gian. 1d bắt xu hướng, 3d là tín hiệu chính, 7d là nền.
      rec.acct_1d   = metaAccountTotals_(actId, token, 'yesterday', null);
      rec.acct_3d   = metaAccountTotals_(actId, token, 'last_3d', null);
      rec.acct_7d   = metaAccountTotals_(actId, token, 'last_7d', null);
      rec.acct_prev = metaAccountTotals_(actId, token, null, prevWeekRange_());
      // Ngày 4–7 = 7d − 3d. Phép trừ, KHÔNG tốn thêm API call.
      rec.acct_d4_7 = tgSubWindow_(rec.acct_7d, rec.acct_3d);
      rec.campaigns = metaCampaigns_(actId, token, rec.currency);
      // Ad-level CHỈ ACTIVE. Lấy dư → lọc "Burger" → mới cắt top N.
      rec.ads = metaInsights_(actId, token, 'ad', 'last_7d', null, TG_TOP_ADS_PER_ACCT * 3, true)
                  .filter(function (a) { return gp_isGP_(a.camp || ''); })
                  .slice(0, TG_TOP_ADS_PER_ACCT);
      // v3.8-W: ghép 3d vào từng ad → lộ ad "7d đẹp nhưng 3d đã sập"
      var m3 = {};
      metaInsights_(actId, token, 'ad', 'last_3d', null, TG_TOP_ADS_PER_ACCT * 3, true)
        .forEach(function (a) { if (a.ad_id) m3[a.ad_id] = a; });
      rec.ads.forEach(function (a) {
        var b = m3[a.ad_id];
        a.spend_3d = b ? b.spend : 0;
        a.roas_3d  = b ? b.roas : null;
        a.ctr_3d   = b ? b.ctr : null;
      });
      var adIds = rec.ads.map(function (a) { return a.ad_id; }).filter(function (x) { return !!x; });
      rec.creatives = metaAdMeta_(adIds, token);
    } catch (e) {
      rec.error = String(e && e.message ? e.message : e);
    }
    out.accounts.push(rec);
    Utilities.sleep(400);
  });
  return out;
}

function metaInsights_(actId, token, level, datePreset, timeRange, limit, activeOnly) {
  var fields = (level === 'ad')
    ? 'ad_id,ad_name,adset_id,campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,frequency,purchase_roas,actions,action_values'
    : 'spend,impressions,clicks,ctr,cpc,purchase_roas,actions,action_values';
  var filters = [{ field: 'campaign.name', operator: 'CONTAIN', value: 'GER' }];
  if (activeOnly) filters.push({ field: 'ad.effective_status', operator: 'IN', value: ['ACTIVE'] });

  var params = {
    level: level, fields: fields, filtering: JSON.stringify(filters),
    action_attribution_windows: JSON.stringify(['7d_click', '1d_view'])
  };
  if (datePreset) params.date_preset = datePreset;
  if (timeRange)  params.time_range  = JSON.stringify(timeRange);
  if (level === 'ad') { params.sort = 'spend_descending'; params.limit = String(limit || 8); }

  var body;
  try { body = tgGraph_('/act_' + actId + '/insights', params); }
  catch (e) { throw new Error('Meta ' + actId + ' [' + level + '] ' + e.message); }
  var rows = (body.data || []).map(cleanInsightRow_);
  return (level === 'account') ? (rows[0] || {}) : rows;
}

function metaCampaigns_(actId, token, currency) {
  var body = tgGraph_('/act_' + actId + '/campaigns', {
    fields: 'id,name,effective_status,daily_budget,lifetime_budget',
    filtering: JSON.stringify([{ field: 'name', operator: 'CONTAIN', value: 'GER' }]),
    limit: '200', access_token: token
  });
  var active = [], paused = [];
  (body.data || []).forEach(function (c) {
    if (!gp_isGP_(c.name || '')) return;   // v3.1-B: chặn "Burger" lọt qua CONTAIN
    var budget = tgMinor_(c.daily_budget || c.lifetime_budget, currency);
    var rec = { id: c.id, name: c.name, status: c.effective_status,
                structure: budget ? 'CBO' : 'ABO', budget: budget,
                budget_type: c.daily_budget ? 'daily' : (c.lifetime_budget ? 'lifetime' : null) };
    if (c.effective_status === 'ACTIVE') active.push(rec);
    else paused.push({ name: c.name, status: c.effective_status });
  });
  return { active: active, paused_or_off: paused };
}

function metaAdMeta_(adIds, token) {
  var out = {};
  if (!adIds || !adIds.length) return out;
  for (var i = 0; i < adIds.length; i += 25) {
    var chunk = adIds.slice(i, i + 25);
    try {
      var body = tgGraph_('/', {
        ids: chunk.join(','),
        fields: 'id,name,effective_status,creative{id,name,body,title,call_to_action_type,object_story_spec,asset_feed_spec}',
        access_token: token
      });
      Object.keys(body).forEach(function (adId) {
        var a = body[adId] || {};
        var t = tgCreativeText_(a.creative);
        out[adId] = { name: a.name || '', status: a.effective_status || '',
                      body: t.body.substring(0, TG_BODY_MAX), title: t.title, cta: t.cta,
                      flags: tgCopyFlags_(t) };
      });
    } catch (e) { Logger.log('[metaAdMeta_] ' + e.message); }
    Utilities.sleep(250);
  }
  return out;
}

/** ĐIỂM MÙ: tên creative KHÁC caption; body hay rỗng khi text ở object_story_spec / asset_feed_spec (DCO). */
function tgCreativeText_(cr) {
  var res = { body: '', title: '', cta: '' };
  if (!cr) return res;
  res.body = cr.body || ''; res.title = cr.title || ''; res.cta = cr.call_to_action_type || '';
  var oss = cr.object_story_spec || {};
  var ld = oss.link_data || oss.video_data || oss.photo_data || {};
  if (!res.body)  res.body  = ld.message || ld.description || '';
  if (!res.title) res.title = ld.name || ld.title || '';
  if (!res.cta && ld.call_to_action && ld.call_to_action.type) res.cta = ld.call_to_action.type;
  var afs = cr.asset_feed_spec || {};
  function pluck(a) { return (a || []).map(function (x) { return x && x.text; })
                        .filter(function (x) { return !!x; }).join(' | '); }
  if (!res.body)  res.body  = pluck(afs.bodies);
  if (!res.title) res.title = pluck(afs.titles);
  if (!res.cta && afs.call_to_action_types && afs.call_to_action_types.length)
    res.cta = afs.call_to_action_types.join('/');
  res.body = String(res.body || '').trim();
  res.title = String(res.title || '').trim();
  res.cta = String(res.cta || '').trim();
  return res;
}

function tgCopyFlags_(t) {
  var f = [];
  if (!t.body)  f.push('BODY_EMPTY');
  if (!t.title) f.push('TITLE_EMPTY');
  if (!t.cta)   f.push('CTA_MISSING');
  var s = (t.body + ' ' + t.title);
  if (/(sh\*t|shit|f\*ck|fuck|bewb|boob|a\*s\b|damn)/i.test(s)) f.push('POLICY_RISK');
  if (/[a-z][!?.,][A-Z]/.test(s)) f.push('TYPO_SPACING');
  if (t.title && t.title.split(/\s+/).length > 12) f.push('TITLE_LONG');
  if (t.title && /(.{4,}?)\1/i.test(t.title.replace(/\s+/g, ' '))) f.push('TITLE_REPEAT');
  return f;
}

function cleanInsightRow_(r) {
  var o = { spend: num_(r.spend), impressions: num_(r.impressions), clicks: num_(r.clicks),
            ctr: num_(r.ctr), cpc: num_(r.cpc) };
  if (r.ad_name)       o.ad = r.ad_name;
  if (r.ad_id)         o.ad_id = r.ad_id;
  if (r.campaign_name) o.camp = r.campaign_name;
  if (r.campaign_id)   o.camp_id = r.campaign_id;
  if (r.frequency)     o.freq = num_(r.frequency);
  o.roas      = extractRoas_(r.purchase_roas);
  o.purchases = tgPickOne_(r.actions, TG_PURCH_TYPES);
  o.revenue   = tgPickOne_(r.action_values, TG_PURCH_TYPES);
  o.atc       = tgPickOne_(r.actions, TG_ATC_TYPES);
  o.checkout  = tgPickOne_(r.actions, TG_CO_TYPES);
  return o;
}

/** FIRST present theo priority — NEVER summed. */
function tgPickOne_(items, types) {
  if (!items || !items.length) return 0;
  try { if (typeof _fbaPickOne === 'function') return _fbaPickOne(items, types); } catch (e) {}
  for (var t = 0; t < types.length; t++)
    for (var i = 0; i < items.length; i++)
      if (items[i].action_type === types[t]) return parseFloat(items[i].value) || 0;
  return 0;
}

function extractRoas_(arr) {
  if (!arr || !arr.length) return null;
  var v = tgPickOne_(arr, TG_PURCH_TYPES);
  if (!v) { var n = parseFloat(arr[0].value); v = isNaN(n) ? 0 : n; }
  return v ? Math.round(v * 100) / 100 : null;
}

/** v3.8-W: cửa sổ ngày 4–7 = 7d − 3d. Không gọi API, chỉ trừ. */
function tgSubWindow_(big, small) {
  if (!big || !small) return null;
  var o = {
    spend:       Math.round((big.spend - small.spend) * 100) / 100,
    impressions: (big.impressions || 0) - (small.impressions || 0),
    clicks:      (big.clicks || 0) - (small.clicks || 0),
    purchases:   Math.round(((big.purchases || 0) - (small.purchases || 0)) * 100) / 100,
    revenue:     Math.round(((big.revenue || 0) - (small.revenue || 0)) * 100) / 100
  };
  o.ctr  = o.impressions > 0 ? Math.round(o.clicks / o.impressions * 10000) / 100 : null;
  o.cpc  = o.clicks > 0 ? Math.round(o.spend / o.clicks * 100) / 100 : null;
  o.roas = o.spend > 0 ? Math.round(o.revenue / o.spend * 100) / 100 : null;
  o.note = 'ngày 4–7 (suy ra: 7d − 3d)';
  return o;
}

function prevWeekRange_() {
  var d = new Date();
  return {
    since: Utilities.formatDate(new Date(d.getTime() - 14 * 864e5), GP_TZ, 'yyyy-MM-dd'),
    until: Utilities.formatDate(new Date(d.getTime() - 8 * 864e5), GP_TZ, 'yyyy-MM-dd')
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE SNAPSHOT
// ─────────────────────────────────────────────────────────────────────────────

function tgDayKey_(d) { return Utilities.formatDate(d, GP_TZ, 'yyyy-MM-dd'); }

function tgWindowKeys_(fromDaysAgo, toDaysAgo) {
  var now = new Date(), set = {};
  for (var n = fromDaysAgo; n <= toDaysAgo; n++)
    set[tgDayKey_(new Date(now.getTime() - n * 864e5))] = true;
  return set;
}

function gp_ageDays_(ymd) {
  return Math.round((new Date(tgDayKey_(new Date())) - new Date(ymd)) / 864e5);
}

function fetchGoogleSnapshot_() {
  var ssInfo = tgResolveSS_();
  if (!ssInfo.ss) return { customer_id: TG_GOOGLE_CID, status: 'SPREADSHEET_OPEN_FAILED',
                           note: ssInfo.error || '?' };

  var sheet = null, usedName = null;
  for (var i = 0; i < TG_G_SHEET_CANDIDATES.length; i++) {
    var sh = ssInfo.ss.getSheetByName(TG_G_SHEET_CANDIDATES[i]);
    if (sh) { sheet = sh; usedName = TG_G_SHEET_CANDIDATES[i]; break; }
  }
  if (!sheet) return { customer_id: TG_GOOGLE_CID, status: 'SHEET_NOT_FOUND',
    spreadsheet_id: ssInfo.id, tried: TG_G_SHEET_CANDIDATES,
    note: 'Mở đúng CRM nhưng không thấy tab Google Ads — GP_GoogleAds_Export (chạy TRONG ' +
          'Google Ads) có thể chưa chạy. BÁO RÕ, không suy đoán số.' };

  try {
    var last = sheet.getLastRow();
    if (last < TG_G_DATA_ROW) return { customer_id: TG_GOOGLE_CID, status: 'SHEET_EMPTY',
                                       source_sheet: usedName };
    var vals = sheet.getRange(TG_G_DATA_ROW, 1, last - TG_G_DATA_ROW + 1, 12).getValues();
    var C = TG_G_COLS, w7 = tgWindowKeys_(1, 7), wP = tgWindowKeys_(8, 14);
    var a7 = {}, aP = {}, currency = '', maxKey = '';

    vals.forEach(function (r) {
      var d = r[C.date];
      if (!(d instanceof Date)) return;
      var key = tgDayKey_(d);
      if (key > maxKey) maxKey = key;
      if (!currency) currency = String(r[C.cur] || '').toUpperCase();
      var camp = String(r[C.camp] || '').trim();
      if (!camp) return;
      var b = w7[key] ? a7 : (wP[key] ? aP : null);
      if (!b) return;
      var a = b[camp] || (b[camp] = { campaign: camp, campaign_id: String(r[C.campId] || ''),
                                      cost: 0, impressions: 0, clicks: 0, conv: 0, conv_value: 0 });
      a.cost        += num_(r[C.cost])    || 0;
      a.impressions += num_(r[C.impr])    || 0;
      a.clicks      += num_(r[C.clicks])  || 0;
      a.conv        += num_(r[C.conv])    || 0;
      a.conv_value  += num_(r[C.convVal]) || 0;
    });

    function fin(b) {
      return Object.keys(b).map(function (k) {
        var a = b[k];
        a.ctr  = a.impressions > 0 ? Math.round(a.clicks / a.impressions * 10000) / 100 : null;
        a.cpc  = a.clicks > 0 ? Math.round(a.cost / a.clicks) : null;
        a.cpa  = a.conv > 0 ? Math.round(a.cost / a.conv) : null;
        a.roas = a.cost > 0 ? Math.round(a.conv_value / a.cost * 100) / 100 : null;
        a.cost = Math.round(a.cost); a.conv_value = Math.round(a.conv_value);
        return a;
      }).sort(function (x, y) { return y.cost - x.cost; });
    }

    var c7 = fin(a7), cP = fin(aP);
    var stale = maxKey ? gp_ageDays_(maxKey) : null;

    return {
      customer_id: TG_GOOGLE_CID, status: c7.length ? 'OK' : 'NO_DATA_IN_WINDOW',
      spreadsheet_id: ssInfo.id, source_sheet: usedName, currency: currency || 'VND',
      last_date: maxKey || null, days_stale: stale, level: 'campaign',
      campaigns_7d: c7, campaigns_prev_7d: cP,
      totals_7d: {
        cost: c7.reduce(function (s, a) { return s + a.cost; }, 0),
        conv: c7.reduce(function (s, a) { return s + a.conv; }, 0),
        conv_value: c7.reduce(function (s, a) { return s + a.conv_value; }, 0)
      },
      limits: 'Nguồn là SHEET do Google Ads Script export (campaign-level), KHÔNG phải Google Ads ' +
              'API trực tiếp → KHÔNG có keyword, search terms, negative, PMax asset, RSA headline. ' +
              'Nêu rõ hạn chế; tuyệt đối không bịa.' +
              (stale !== null && stale > 2 ? ' ⚠️ Data cũ ' + stale + ' ngày — export có thể đã ngừng.' : '')
    };
  } catch (e) {
    return { customer_id: TG_GOOGLE_CID, status: 'READ_ERROR', source_sheet: usedName,
             note: String(e && e.message ? e.message : e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM
// ─────────────────────────────────────────────────────────────────────────────

function callLLM_(snapshot) {
  var apiKey = prop_('ANTHROPIC_API_KEY', true);
  var model  = prop_('LLM_MODEL', false) || TG_LLM_MODEL_DEFAULT;

  var payloadObj = {
    model: model,
    max_tokens: TG_LLM_MAX_TOKENS,
    system: llmSystemPrompt_(),
    // v3.3-F: model tự bật thinking → đốt hết max_tokens → chết trước khi viết
    // text. Tắt hẳn, chắc ăn hơn nâng trần (ngân sách thinking có thể co giãn
    // theo max_tokens). Nếu tham số này không hợp lệ, API trả 400 và thông báo
    // lỗi bên dưới sẽ in nguyên văn lý do — sai cũng sai rõ ràng, không câm.
    thinking: { type: 'disabled' },
    messages: [{ role: 'user', content:
      'Snapshot 7 ngày (Facebook USD, Google VND). Viết khối "B1 — Ads GP" tiếng Việt theo khung mục. ' +
      'CHỈ dựa trên số liệu dưới đây; không bịa ad/ID/keyword không có trong data.\n\n' +
      '```json\n' + JSON.stringify(snapshot) + '\n```' }]
  };
  var reqBytes = JSON.stringify(payloadObj).length;
  var payloadStr = JSON.stringify(payloadObj);

  // v3.4-I: chờ TRƯỚC mỗi lần thử. Tổng xấu nhất ~45s — dư sức trong hạn 6 phút
  // của GAS (fetchMetaSnapshot_ vốn đã ngốn ~75s).
  var waits = [0, 3000, 12000, 30000];
  var lastErr = '';

  for (var i = 0; i < waits.length; i++) {
    if (waits[i]) Utilities.sleep(waits[i]);

    var resp = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post', contentType: 'application/json',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      payload: payloadStr, muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    var raw  = resp.getContentText() || '{}';
    var body;
    try { body = JSON.parse(raw); } catch (e) { body = {}; }

    // Lỗi TẠM THỜI → thử lại. 529=Overloaded · 429=rate limit · 5xx=server.
    // KHÔNG retry 4xx khác: sai key/model/payload thì thử lại cũng vô nghĩa,
    // chỉ làm chậm và che nguyên nhân thật.
    if (code === 429 || code === 529 || code >= 500) {
      lastErr = 'HTTP ' + code + ' ' +
                ((body.error && (body.error.type || '')) + ' ' + (body.error && body.error.message || '')).trim();
      Logger.log('[callLLM_] lần ' + (i + 1) + '/' + waits.length + ' — ' + lastErr +
                 (i < waits.length - 1 ? ' → chờ ' + (waits[i + 1] / 1000) + 's rồi thử lại' : ' → hết lượt'));
      continue;
    }

    if (code !== 200 || body.error) {
      throw new Error('LLM API ' + (body.error ? body.error.message : ('HTTP ' + code)) +
                      ' (build=' + GP_BUILD + ')');
    }

    // v3.2-D: content[] có thể chứa block KHÔNG phải text (thinking/tool_use) →
    // body.content[0].text = undefined → rỗng. Gom MỌI block type='text'.
    var blocks = body.content || [];
    var txt = blocks.filter(function (b) { return b && b.type === 'text' && b.text; })
                    .map(function (b) { return b.text; }).join('\n').trim();

    if (!txt || txt.length < 40) {
      // Lỗi PHẢI nói được nguyên nhân — bản cũ chỉ báo "rỗng/ngắn bất thường" = vô dụng.
      throw new Error('LLM rỗng/ngắn — build=' + GP_BUILD + ' · model=' + model +
        ' · stop_reason=' + (body.stop_reason || '?') +
        ' · types=[' + (blocks.map(function (b) { return b && b.type; }).join(',') || 'rỗng') + ']' +
        ' · in=' + ((body.usage && body.usage.input_tokens) || '?') +
        ' · out=' + ((body.usage && body.usage.output_tokens) || '?') +
        ' · max_tokens=' + TG_LLM_MAX_TOKENS +
        ' · req=' + Math.round(reqBytes / 1024) + 'KB · raw=' + raw.substring(0, 300));
    }

    if (i > 0) Logger.log('[callLLM_] ✅ OK sau ' + (i + 1) + ' lần thử');
    return txt;
  }

  throw new Error('LLM API quá tải — đã thử ' + waits.length + ' lần trong ~45s vẫn không được. ' +
                  'Lỗi cuối: ' + lastErr + ' (build=' + GP_BUILD + '). Đây là sự cố TẠM THỜI phía ' +
                  'Anthropic, không phải lỗi cấu hình — chạy lại gpSendAll sau vài phút.');
}

function llmSystemPrompt_() {
  return [
    'Bạn là chuyên gia tối ưu quảng cáo cho GerberaPrints (POD apparel US).',
    'Viết khối B1 (Ads) cho báo cáo Telegram: Facebook 6 TK (USD) + Google Ads (VND).',
    'LƯU Ý: TK 02 đã chuyển sang chạy GritFell → KHÔNG còn trong data. Đừng nhắc tới 02.',
    '',
    '⚠️ ĐỊNH DẠNG BẮT BUỘC: Telegram HTML, TUYỆT ĐỐI KHÔNG dùng markdown (**, ##, |bảng|).',
    'Chỉ được dùng thẻ: <b> <i> <u> <code> <pre>. Emoji dùng thoải mái.',
    'KHÔNG dùng ký tự & < > trần (viết &amp; &lt; &gt;). Xuống dòng bằng \\n.',
    'Bảng → viết dạng danh sách dòng, KHÔNG dùng markdown table.',
    '',
    'CẤU TRÚC DATA:',
    '- meta.accounts[].acct_7d / acct_prev: tổng TK, đã gộp từ campaign-level và LỌC ranh giới từ',
    '  (spend, impressions, clicks, purchases, revenue, ctr%, cpc, roas, campaigns_counted,',
    '  campaigns_dropped[]). KHÔNG lọc status → là tổng chi THẬT. campaigns_dropped[] là campaign',
    '  brand khác bị Graph CONTAIN "GER" nuốt nhầm và ĐÃ bị loại — KHÔNG tính vào, đừng báo cáo.',
    '- meta.accounts[].acct_1d (hôm qua) · acct_3d (3 ngày) · acct_7d · acct_d4_7 (ngày 4–7, suy ra 7d−3d).',
    '  ⏱ ĐỌC NHỊP: 7 ngày là số NỀN, quá dài để bắt chuyển động. So acct_3d vs acct_d4_7 mới thấy',
    '  xu hướng THẬT. ROAS 3d << ROAS d4_7 ⇒ đang xấu đi NGAY, dù 7d vẫn đẹp — cảnh báo sớm.',
    '  ⚠️ acct_1d là số CHƯA CHỐT (attribution settle ~72h) → chỉ bắt xu hướng, TUYỆT ĐỐI không',
    '  dùng 1 ngày để kết luận tắt/scale.',
    '- meta.accounts[].ads[]: CHỈ ad ACTIVE, top theo chi. Mỗi ad có spend/roas/ctr (7d) VÀ',
    '  spend_3d/roas_3d/ctr_3d. Ad roas 7d > BE nhưng roas_3d < BE ⇒ ĐANG CHẾT, ưu tiên soi.',
    '- meta.accounts[].campaigns.active[]: campaign đang chạy + structure CBO/ABO + budget.',
    '- meta.accounts[].campaigns.paused_or_off[]: ĐÃ TẮT SẴN — TUYỆT ĐỐI KHÔNG đề xuất tắt lại.',
    '- meta.accounts[].creatives{ad_id}: body/title/cta THẬT + flags tự động.',
    '- google.campaigns_7d / campaigns_prev_7d: đã gộp theo campaign, VND, có ctr(%)/cpc/cpa/roas.',
    '',
    'NGUYÊN TẮC:',
    '- CHỈ đề xuất TẮT thứ đang ACTIVE. Mọi ad trong ads[] đã ACTIVE — an toàn để xét tắt.',
    '- Mỗi TK ghi ngắn "Đang chạy" / "Đã tắt sẵn (bỏ qua)".',
    '- 🔴 THƯỚC ĐO ĐÚNG — Break-even ROAS ≈ 1/GrossMargin, KHÔNG phải 1.0:',
    '  · Polo $54.95, COGS ~$17 → margin ~69% ⇒ BE ≈ 1.45x. ROAS 1.0–1.45 là LỖ, không phải hoà.',
    '  · Concept B2G1 (TK04): BE > 2.0 (3 polo, rev $110, COGS $46.50).',
    '  · Chỉ gọi là "ổn/lãi" khi ROAS > BE của đúng dòng SP đó.',
    '- 🔴 TRẦN SCALE NSFW — ROAS toàn store bị kéo xuống CƠ HỌC:',
    '  ~36% doanh thu là L3 (explicit/profanity: American Tatas, The Shocker, S-e-x Ed, Badonkadonk,',
    '  Duck You, Frank and Beans...) = ORGANIC ONLY, Meta không duyệt. Paid chỉ kéo được ~51% catalog',
    '  (L0/L1). ⇒ MER (B2, doanh thu store ÷ tổng chi) mới là số đúng để đánh giá sức khoẻ;',
    '  ROAS nền tảng luôn thấp hơn thực lực. KHÔNG đề xuất paid cho SKU L3.',
    '  (⚠️ Phân loại L3 do suy từ TÊN SKU, chỉ The Shocker + American Tatas được xác nhận đích danh.)',
    '- 🔴 OFFER ECONOMICS (đã tính sẵn, đừng tính lại):',
    '  B2G1 = −$9.05/đơn ở CPA cold ~$68; ở bottom-funnel (retarget/email, CPA≈0) = +$58/đơn.',
    '  "2nd item 40% off" = −$14.67/đơn → KHÔNG đề xuất. Thủ phạm lỗ là CPA CAO, KHÔNG phải cơ chế',
    '  offer ⇒ đẩy B2G1 xuống bottom-funnel; cold giữ offer nhưng giảm budget. Đừng khuyên "bỏ B2G1".',
    '- Mọi creative distance-reveal PHẢI có bản censored để Meta duyệt. L2 → test $20–30 trước.',
    '- roas=null = Not available (ad mới / chi nhỏ / độ trễ / tracking hỏng) — KHÔNG kết luận lỗ.',
    '  Chỉ 🔴 khi chi đủ lớn (>= 1.5x giá SP) VÀ ROAS thực đo < hoà vốn.',
    '- Phân biệt ad bằng ad_id + TK, KHÔNG chỉ tên (tên trùng ở nhiều TK).',
    '- CBO → KHÔNG chỉnh tiền cho 1 ad; winner = NHÂN BẢN, loser = TẮT ad. ABO → chỉnh trực tiếp.',
    '- TK08 hay mù tracking; TK ROAS toàn null → nghi tracking, KHÔNG tắt theo ROAS mù, chỉ xét CTR/CPC.',
    '- Cảnh báo over-scaling: tuần trước lãi, tuần này nhân đôi ngân sách làm ROAS tụt → hệ quả scale nhanh + learning.',
    '- Google: nguồn sheet export → KHÔNG có keyword/search term/PMax asset. status != OK → ghi rõ không có dữ liệu.',
    'CHỈ ĐỀ XUẤT, không tự ý sửa gì.',
    '',
    'FLAGS CREATIVE: BODY_EMPTY (primary text trống → mất chuyển đổi, ưu tiên cao) · TITLE_EMPTY ·',
    'CTA_MISSING · POLICY_RISK (nguy cơ bóp reach) · TYPO_SPACING ("Soon!Free") · TITLE_LONG/REPEAT.',
    '',
    'KHUNG MỤC (giữ đúng thứ tự, ngắn gọn, mọi ý kèm số):',
    '1. Tóm tắt nhanh (4–6 dòng): ROAS blended FB + Google, cảnh báo chính.',
    '2. Trạng thái: mỗi TK — đang chạy gì (CBO/ABO), đã tắt sẵn gì.',
    '3. 🔴 Tắt ngay: ad ACTIVE nên tắt — tên + ad_id + TK + chi + ROAS/CTR.',
    '4. 🟡 Cải tiến: chẩn đoán (CTR&lt;2% / freq&gt;2.5) + đề xuất hook/creative.',
    '5. 🟢 Scale: winner + cách nhân bản theo CBO/ABO.',
    '6. 📝 TEXT: body/title/CTA thật của top ad; gắn cờ; đề xuất viết lại.',
    '7. 🔍 Google Ads (VND): campaign siết/scale, 7d vs 7d trước, ghi rõ hạn chế nguồn.',
    'Sắp theo mức tác động. Thiếu data → ghi rõ, KHÔNG bịa số.'
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// TELEGRAM SENDER (HTML + fallback plain)
// ─────────────────────────────────────────────────────────────────────────────

function gp_api_(method, payload) {
  for (var a = 0; a < 4; a++) {
    var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + gp_token_() + '/' + method, {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify(payload), muteHttpExceptions: true
    });
    var d = JSON.parse(res.getContentText());
    if (d.ok) return d;
    if (d.error_code === 429 && d.parameters && d.parameters.retry_after) {
      Utilities.sleep((d.parameters.retry_after + 1) * 1000); continue;
    }
    Logger.log(method + ' ERR: ' + res.getContentText());
    return d;
  }
  return { ok: false };
}

/** Cắt theo RANH GIỚI DÒNG (không cắt giữa thẻ HTML). */
function gp_chunk_(html, max) {
  max = max || TG_MAX_MSG;
  if (html.length <= max) return [html];
  var lines = String(html).split('\n'), out = [], cur = '';
  for (var i = 0; i < lines.length; i++) {
    var ln = lines[i];
    if (ln.length > max) {
      if (cur) { out.push(cur); cur = ''; }
      for (var j = 0; j < ln.length; j += max) out.push(ln.substring(j, j + max));
      continue;
    }
    if ((cur + '\n' + ln).length > max) { out.push(cur); cur = ln; }
    else { cur = cur ? (cur + '\n' + ln) : ln; }
  }
  if (cur) out.push(cur);
  return out;
}

/** mode: 'HTML' | null. HTML hỏng → tự hạ xuống plain thay vì mất tin. */
function gp_send_(text, mode) {
  var parts = gp_chunk_(text, TG_MAX_MSG);
  for (var i = 0; i < parts.length; i++) {
    var payload = { chat_id: gp_chat_(), text: parts[i], disable_web_page_preview: true };
    if (mode === 'HTML') payload.parse_mode = 'HTML';
    var r = gp_api_('sendMessage', payload);
    if (!r.ok && mode === 'HTML') {
      Logger.log('HTML fail → plain. Preview: ' + parts[i].substring(0, 80));
      gp_api_('sendMessage', { chat_id: gp_chat_(), text: parts[i].replace(/<[^>]+>/g, ''),
                               disable_web_page_preview: true });
    }
    if (i < parts.length - 1) Utilities.sleep(1200);
  }
}

/**
 * v3.5-M — Telegram HTML CHỈ cho: b,strong,i,em,u,s,code,pre,a,tg-spoiler,blockquote.
 * LLM hay xuất <br>/<p>/<li>/<h3> hoặc "<" trần (vd "CTR<2%") → API trả 400
 * "can't parse entities" → gp_send_ rơi xuống plain → thẻ hiện nguyên văn.
 * Hàm này: đổi <br>/<li> thành xuống dòng/bullet, BỎ thẻ lạ, ESCAPE "<" trần,
 * rồi trả lại thẻ hợp lệ nguyên vẹn.
 */
function gp_sanitizeHtml_(s) {
  s = String(s == null ? '' : s)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div)>/gi, '\n')
        .replace(/<li[^>]*>/gi, '\n• ');
  var OK = 'b|strong|i|em|u|s|strike|del|code|pre|tg-spoiler|blockquote|a';
  var keep = [];
  // 1) cất thẻ hợp lệ vào placeholder
  s = s.replace(new RegExp('</?(?:' + OK + ')(?:\\s[^<>]*)?>', 'gi'), function (m) {
    keep.push(m); return '\u0001' + (keep.length - 1) + '\u0002';
  });
  // 2) thẻ còn lại = không hợp lệ → bỏ
  s = s.replace(/<\/?[a-zA-Z][^<>]*>/g, '');
  // 3) "<" ">" "&" trần còn sót → escape. ĐÂY là thủ phạm lỗi 400 byte 2238.
  s = s.replace(/&(?!(amp|lt|gt|quot|#\d+);)/g, '&amp;')
       .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // 4) trả thẻ hợp lệ về
  return s.replace(/\u0001(\d+)\u0002/g, function (m, i) { return keep[+i]; });
}

function gp_esc_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function prop_(key, required) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  if (required && !v) throw new Error('Thiếu Script Property: ' + key +
    ' — Project Settings → Script Properties (project standalone, không có UI prompt).');
  return v;
}

function num_(v) {
  if (v === null || v === undefined || v === '') return null;
  var n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? null : n;
}

function toQuery_(obj) {
  return Object.keys(obj).map(function (k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]);
  }).join('&');
}

function tgFindChatId2() {
  var token = gp_token_();
  var data = JSON.parse(UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getUpdates',
                        { muteHttpExceptions: true }).getContentText());
  (data.result || []).forEach(function (u) {
    var c = (u.message || u.channel_post || u.my_chat_member || {}).chat;
    if (c) Logger.log('chat_id=' + c.id.toFixed(0) + '  type=' + c.type +
                      '  name=' + (c.title || c.first_name || ''));
  });
}

/**
 * v3.2-D — CHẨN ĐOÁN B1. Chạy: Run → gpTestLLM → đọc "Nhật ký thực thi".
 * Đo 3 thứ: (1) API key/model có sống không, (2) snapshot to bao nhiêu,
 * (3) callLLM_ với data THẬT trả về gì. Không đoán — đo.
 */
function gpTestLLM() {
  var L = ['🔬 TEST CLAUDE API', 'build: ' + GP_BUILD];
  var apiKey = prop_('ANTHROPIC_API_KEY', true);
  var model  = prop_('LLM_MODEL', false) || TG_LLM_MODEL_DEFAULT;
  L.push('model: ' + model + ' · key: ...' + apiKey.slice(-6) +
         ' · max_tokens=' + TG_LLM_MAX_TOKENS +
         ' · thinking=' + (callLLM_.toString().indexOf("type: 'disabled'") >= 0 ? 'disabled' : '⚠️ CHƯA TẮT'));

  // 1) Ping nhỏ — tách bạch "key/model hỏng" khỏi "prompt quá to"
  try {
    var r = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post', contentType: 'application/json',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      payload: JSON.stringify({ model: model, max_tokens: 64,
        messages: [{ role: 'user', content: 'Trả lời đúng 1 câu: API OK.' }] }),
      muteHttpExceptions: true });
    L.push('ping HTTP ' + r.getResponseCode());
    L.push('ping raw: ' + r.getContentText().substring(0, 400));
  } catch (e) { L.push('ping lỗi: ' + e.message); }

  // 2) Snapshot thật — đo kích thước + đếm campaign PAUSED (nghi phình prompt)
  try {
    var snap = { generated_at: 'test', meta: fetchMetaSnapshot_(), google: fetchGoogleSnapshot_() };
    var size = JSON.stringify(snap).length;
    L.push('', 'snapshot: ' + Math.round(size / 1024) + ' KB (~' + Math.round(size / 3500) + 'K tokens)');
    var act = 0, pau = 0;
    snap.meta.accounts.forEach(function (a) {
      if (a.campaigns) {
        act += (a.campaigns.active || []).length;
        pau += (a.campaigns.paused_or_off || []).length;
      }
    });
    L.push('  campaign ACTIVE: ' + act + ' · PAUSED gửi kèm: ' + pau +
           (pau > 300 ? '  ⚠️ quá nhiều → phình prompt' : ''));

    // 3) Gọi thật
    try { L.push('  ✅ callLLM_ OK — ' + callLLM_(snap).length + ' ký tự'); }
    catch (e) { L.push('  ❌ ' + e.message); }
  } catch (e) { L.push('snapshot lỗi: ' + e.message); }

  Logger.log(L.join('\n'));
  return L.join('\n');
}

/**
 * v3.3-H — AI ĐANG THỰC SỰ CHẠY? In giá trị runtime + SOURCE THẬT của callLLM_.
 * GAS nạp MỌI file .gs vào CHUNG một global scope: nếu file khác khai trùng tên
 * biến/hàm, file nạp SAU ghi đè im lặng, không cảnh báo. Project này có 14 file.
 * callLLM_.toString() in mã nguồn thật đang nằm trong bộ nhớ — nếu nó KHÁC thứ
 * bạn thấy trong editor thì có file khác đang ghi đè.
 */
function gpWhoAmI() {
  var s = callLLM_.toString();
  var L = ['🕵️ CODE NÀO ĐANG CHẠY?', '────────────────────'];
  L.push('GP_BUILD             = ' + GP_BUILD + '   ← phải là v3.9');
  L.push('TG_LLM_MAX_TOKENS    = ' + TG_LLM_MAX_TOKENS + '   ← phải là 16000');
  L.push('TG_LLM_MODEL_DEFAULT = ' + TG_LLM_MODEL_DEFAULT);
  L.push('TG_MAX_MSG           = ' + TG_MAX_MSG + '   (Telegram, khác TG_LLM_MAX_TOKENS)');
  L.push('GP_SLOTS             = ' + GP_SLOTS.length + ' nhịp   ← phải là 7 (v3.9)');
  L.push('');
  L.push('callLLM_ có tắt thinking?  ' + (s.indexOf("type: 'disabled'") >= 0 ? '✅ CÓ (v3.3+)' : '❌ KHÔNG → đang chạy bản CŨ'));
  L.push('callLLM_ có filter text?   ' + (s.indexOf("=== 'text'") >= 0 ? '✅ CÓ (v3.2+)' : '❌ KHÔNG → bản cũ'));
  L.push('callLLM_ dài               ' + s.length + ' ký tự');
  L.push('');
  L.push('--- 300 ký tự đầu của callLLM_ đang chạy ---');
  L.push(s.substring(0, 300));
  Logger.log(L.join('\n'));
  return L.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// v3.5-K/L — BÁO CÁO MARKET (LUỒNG 1) · tách khỏi ads 07:00
// ─────────────────────────────────────────────────────────────────────────────

function gp_loadMarketJson_() {
  try {
    var res = UrlFetchApp.fetch(GX_MARKET.url + '?t=' + Date.now(),
                { muteHttpExceptions: true, headers: { 'Cache-Control': 'no-cache' } });
    var code = res.getResponseCode();
    if (code === 404) return { status: 'NOT_FOUND',
      note: 'gerbera-market.json không có trên repo — task gerbera-trend-research (07:15) chưa push.' };
    if (code !== 200) return { status: 'HTTP_' + code };
    var d = JSON.parse(res.getContentText());
    var keys = Object.keys(d.blocks || {}).sort();
    return { status: keys.length ? 'OK' : 'NO_BLOCKS', data: d, date: d.date || null,
             locale: d.locale || null, age_days: d.date ? gp_ageDays_(d.date) : null, keys: keys };
  } catch (e) { return { status: 'READ_ERROR', note: String(e && e.message ? e.message : e) }; }
}

/** Trigger cũ 07:30 — giữ hàm để không vỡ trigger cổ còn sót; đã bỏ khỏi lịch. */
function gpMarketRun() {
  try { gpSendMarket(); }
  catch (e) {
    Logger.log('[gpMarketRun] ' + e.message);
    try { gp_send_('🚨 <b>GP Market — lỗi</b>\n<code>' + gp_esc_(String(e && e.message ? e.message : e)) +
                   '</code>', 'HTML'); } catch (e2) {}
  }
}

/**
 * Gửi MỌI khối có trong gerbera-market.json — KHÔNG lọc theo danh sách cố định.
 * Task market thêm B4..B8 thì tự động xuất hiện, không cần đụng code này.
 */
function gpSendMarket() {
  var j = gp_loadMarketJson_();

  if (j.status !== 'OK') {
    gp_send_('🚨 <b>GP Market — không có dữ liệu</b>  <i>' + GP_BUILD + '</i>\n' +
             'status: <code>' + j.status + '</code>\n' + gp_esc_(j.note || '') +
             '\n\n<i>Nguồn: gerbera-market.json (task gerbera-trend-research, 07:15).</i>', 'HTML');
    Logger.log('gpSendMarket: ' + j.status);
    return;
  }

  // v3.6-O: chạy 08:30 → đã qua giờ push chắc chắn (~07:45). Cũ 1 ngày lúc này
  // KHÔNG còn là "có thể fail" mà là fail thật → nói thẳng, đừng nói nước đôi.
  var stale = (j.age_days !== null && j.age_days > 0)
    ? '\n🚨 <b>Data cũ ' + j.age_days + ' ngày</b> (' + j.date + ') — task gerbera-trend-research ' +
      '(07:15) KHÔNG push hôm nay. Kiểm tra scheduled task + PAT.' : '';

  gp_send_('🔭 <b>GerberaPrints · Market Intelligence</b>\n' +
           Utilities.formatDate(new Date(), GP_TZ, 'EEE dd/MM/yyyy') +
           '\n<i>Thị trường · đối thủ · keyword · ý tưởng. Niche: golf novelty US.</i>' +
           '\n<i>Dữ liệu ' + j.date + ' · ' + gp_esc_(j.locale || '?') + ' · ' + j.keys.length + ' khối.</i>' +
           '\n<i>⛔️ Mọi mục đều là ĐỀ XUẤT — không tự sửa gì.</i>' + stale, 'HTML');
  Utilities.sleep(GP_DELAY);

  var unnamed = [];
  j.keys.forEach(function (k) {
    var arr = j.data.blocks[k] || [];
    if (!arr.length) return;
    if (!GX_MARKET.names[k]) unnamed.push(k);
    for (var i = 0; i < arr.length; i++) {
      gp_send_(gp_sanitizeHtml_(arr[i]), 'HTML');
      Utilities.sleep(GP_DELAY);
    }
  });

  // Khối lạ VẪN được gửi (khác hẳn bug cũ) — chỉ nhắc đặt tên cho đẹp.
  if (unnamed.length) {
    gp_send_('<i>ℹ️ Khối ' + unnamed.join(', ') + ' chưa khai tên trong GX_MARKET.names — ' +
             'vẫn gửi đủ, chỉ thiếu tiêu đề. Thêm tên nếu muốn.</i>', 'HTML');
  }
  Logger.log('DONE gpSendMarket · ' + j.keys.length + ' khối: ' + j.keys.join(','));
}

/** Chẩn đoán luồng market — không gửi Telegram. */
function gpTestMarket() {
  var j = gp_loadMarketJson_();
  var L = ['🔭 TEST MARKET', 'build: ' + GP_BUILD, '────────────────────'];
  L.push('status: ' + j.status);
  if (j.date) L.push('date  : ' + j.date + ' (cũ ' + j.age_days + ' ngày)' +
                     (j.age_days > 0 ? '  ⚠️ task 07:15 có thể fail' : '  ✅ hôm nay'));
  if (j.locale) L.push('locale: ' + j.locale);
  if (j.keys) {
    L.push('khối  : ' + j.keys.length);
    j.keys.forEach(function (k) {
      var n = (j.data.blocks[k] || []).length;
      L.push('  ' + k + ' · ' + n + ' tin · ' + (GX_MARKET.names[k] || '⚠️ chưa khai tên (vẫn gửi)'));
    });
  }
  if (j.note) L.push('note: ' + j.note);
  Logger.log(L.join('\n'));
  return L.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// v3.7-R/S + v3.9-X — 7 NHỊP GIAO. Mỗi nhịp 1 execution độc lập.
// ─────────────────────────────────────────────────────────────────────────────

/** v3.7-S: các slot = execution RIÊNG → biến trong RAM không sống qua được.
 *  Ghi kết quả vào Script Properties để slot 5 tổng hợp. Trước đây B4 chỉ biết
 *  việc trong CÙNG 1 run — tách slot thì cách đó vô dụng. */
function gp_noteSlot_(key, status) {
  try {
    PropertiesService.getScriptProperties().setProperty('GP_SLOT_' + key,
      Utilities.formatDate(new Date(), GP_TZ, 'HH:mm') + ' · ' + String(status).substring(0, 180));
  } catch (e) {}
}
function gp_readSlot_(key) {
  try {
    var v = PropertiesService.getScriptProperties().getProperty('GP_SLOT_' + key);
    if (!v) return '— chưa chạy hôm nay';
    return v;
  } catch (e) { return '?'; }
}

function gp_runSlot_(key, label, fn) {
  try {
    fn();
    gp_noteSlot_(key, '✅ OK');
  } catch (e) {
    var m = String(e && e.message ? e.message : e);
    gp_noteSlot_(key, '❌ ' + m);
    Logger.log('[' + key + '] ' + m);
    try {
      gp_send_('⚠️ <b>' + label + '</b> lỗi — xem khối Hệ thống 09:30.\n<code>' +
               gp_esc_(m.substring(0, 300)) + '</code>', 'HTML');
    } catch (e2) {}
  }
}

/** 07:00 — B1 Ads GP (live Graph API + Google sheet → Claude). */
function gpSlot1Ads() {
  gp_runSlot_('1', 'Ads GP', function () {
    var ctx = { src: {}, errors: [] };
    var b1 = buildBlockAds_(ctx);
    gp_send_(buildHeader_(ctx), 'HTML'); Utilities.sleep(GP_DELAY);
    gp_emit_('B1', 'Ads GP', b1);
    // cất số liệu cho slot 5 tổng hợp
    gp_noteSlot_('1DATA', 'Meta ' + ctx.src.meta_accounts_ok + '/6 · Google ' + ctx.src.google +
                          ' · LLM ' + (ctx.src.llm || '❌'));
  });
}

/** 07:30 — B2 Store & Kết quả (native, không qua AI, không phụ thuộc JSON). */
function gpSlot2Store() {
  gp_runSlot_('2', 'Store', function () {
    var ctx = { src: {}, errors: [] };
    gp_emit_('B2', 'Store GP & Kết quả', buildBlockStore_(ctx));
    gp_noteSlot_('2DATA', 'Store sheets ' + (ctx.src.store || '?'));
  });
}

/** 08:30 — Thị trường: market B1/B2/B3. */
function gpSlot3Market() { gp_runSlot_('3', 'Thị trường', function () { gp_sendMarketBlocks_(['B1','B2','B3'], 'Thị trường & Đối thủ', true); }); }

/** 09:00 — Ý tưởng: market B4→B8. */
function gpSlot4Ideas()  { gp_runSlot_('4', 'Ý tưởng', function () { gp_sendMarketBlocks_(['B4','B5','B6','B7','B8'], 'Ý tưởng & Sản phẩm', false); }); }

/** 09:30 — Ads đối thủ & Hook (market B9) + khối Hệ thống tổng hợp các nhịp. */
function gpSlot5Rival() {
  gp_runSlot_('5', 'Đối thủ & Hook', function () {
    gp_sendMarketBlocks_(['B9'], 'Ads đối thủ & Hook', false);
  });
  // v3.8-U: Hook dựng từ SKU bán THẬT (GAS), tách khỏi tin đối thủ (task trend).
  // Task trend cấm MCP nên không thấy doanh số — GAS đọc 'SKU Raw Data' thay.
  gp_runSlot_('5H', 'Hook', function () {
    gp_send_(gp_buildHookBlock_(), 'HTML'); Utilities.sleep(GP_DELAY);
  });
  try { gp_send_(gp_buildDayHealth_(), 'HTML'); } catch (e) { Logger.log('[health] ' + e.message); }
}

/** v3.9-X · 09:45 — Video Trends TikTok/IG (market B10, user chốt 31/07). */
function gpSlot6Video() {
  gp_runSlot_('6', 'Video Trends TikTok/IG', function () {
    gp_sendMarketBlocks_(['B10'], 'Video Trends TikTok/IG', false);
  });
}

/** v3.9-X · 10:00 — Động tĩnh đối thủ: SP·Collection·Blog·Promotion (market B11). */
function gpSlot7Moves() {
  gp_runSlot_('7', 'Động tĩnh đối thủ', function () {
    gp_sendMarketBlocks_(['B11'], 'Động tĩnh đối thủ', false);
  });
}

/**
 * Gửi đúng cụm khối chỉ định từ market.json.
 * KHÔNG lọc cứng: khối lạ (B12…) chưa ai khai vẫn được health 09:30 tố cáo —
 * giữ nguyên tinh thần v3.5-L, task thêm khối KHÔNG bao giờ bị bỏ rơi im lặng.
 */
function gp_sendMarketBlocks_(keys, label, withHeader) {
  var j = gp_loadMarketJson_();
  if (j.status !== 'OK') {
    gp_send_('🚨 <b>' + label + ' — không có dữ liệu</b>  <i>' + GP_BUILD + '</i>\n' +
             'status: <code>' + j.status + '</code>\n' + gp_esc_(j.note || ''), 'HTML');
    throw new Error(label + ': market.json ' + j.status);
  }
  if (withHeader) {
    var stale = (j.age_days !== null && j.age_days > 0)
      ? '\n🚨 <b>Data cũ ' + j.age_days + ' ngày</b> (' + j.date + ') — task gerbera-trend-research ' +
        '(07:15) KHÔNG push hôm nay.' : '';
    gp_send_('🔭 <b>GerberaPrints · Market Intelligence</b>\n' +
             Utilities.formatDate(new Date(), GP_TZ, 'EEE dd/MM/yyyy') +
             '\n<i>Niche: golf novelty US · dữ liệu ' + j.date + ' · ' + j.keys.length + ' khối.</i>' +
             '\n<i>⛔️ Mọi mục đều là ĐỀ XUẤT — không tự sửa gì.</i>' + stale, 'HTML');
    Utilities.sleep(GP_DELAY);
  }
  var sent = 0, missing = [];
  keys.forEach(function (k) {
    var arr = (j.data.blocks || {})[k];
    if (!arr || !arr.length) { missing.push(k); return; }
    for (var i = 0; i < arr.length; i++) {
      gp_send_(gp_sanitizeHtml_(arr[i]), 'HTML');
      Utilities.sleep(GP_DELAY); sent++;
    }
  });
  gp_noteSlot_(keys.join('') + 'INFO', sent + ' tin' + (missing.length ? ' · thiếu ' + missing.join(',') : ''));
  Logger.log(label + ': gửi ' + sent + ' tin' + (missing.length ? ' · thiếu ' + missing.join(',') : ''));
}

/** Khối Hệ thống 09:30 — tổng hợp các nhịp từ Script Properties.
 *  v3.9-Z: chạy TRƯỚC nhịp 6/7 → nhịp chưa tới giờ hiển thị "⏳", không phải "chết". */
function gp_buildDayHealth_() {
  var L = ['🩺 <b>Hệ thống — tổng kết ' + GP_SLOTS.length + ' nhịp</b>  <i>' + GP_BUILD + '</i>\n'];
  var nowHM = parseInt(Utilities.formatDate(new Date(), GP_TZ, 'HHmm'), 10);
  GP_SLOTS.forEach(function (s, i) {
    var slotHM = s.h * 100 + s.m;
    var st = (slotHM > nowHM) ? '⏳ chưa tới giờ (lịch ' + s.h + ':' + (s.m < 10 ? '0' : '') + s.m + ')'
                              : gp_readSlot_(String(i + 1));
    L.push('<b>' + (s.h + ':' + (s.m < 10 ? '0' : '') + s.m) + '</b> ' + s.label + ' → ' + gp_esc_(st));
  });
  L.push('');
  L.push('<i>Ads: ' + gp_esc_(gp_readSlot_('1DATA')) + '</i>');
  L.push('<i>' + gp_esc_(gp_readSlot_('2DATA')) + '</i>');
  L.push('<b>Hook</b> (SKU Raw Data): ' + gp_esc_(gp_readSlot_('5H')));

  var j = gp_loadMarketJson_();
  L.push('<b>market.json</b>: ' + j.status + (j.date ? ' · ' + j.date + ' (cũ ' + j.age_days + 'd)' : ''));
  if (j.keys) {
    // v3.5-L + v3.9-Z: B10/B11 đã khai nhịp 09:45/10:00 → hết cảnh "khối LẠ".
    // Khối MỚI hơn nữa (B12…) vẫn phải lộ ra, không im lặng.
    var known = ['B1','B2','B3','B4','B5','B6','B7','B8','B9','B10','B11'];
    var extra = j.keys.filter(function (k) { return known.indexOf(k) < 0; });
    if (extra.length) {
      L.push('\n🚨 <b>Khối LẠ chưa khai nhịp</b>: ' + extra.join(', ') +
             ' — có trong JSON nhưng chưa gán vào slot nào → CHƯA được gửi. Thêm vào gp_sendMarketBlocks_.');
    }
  }
  if (j.age_days !== null && j.age_days > 0) {
    L.push('\n🚨 Task gerbera-trend-research (07:15) không push hôm nay.');
  }
  return L.join('\n');
}

/** Chạy tay cả 7 nhịp liên tiếp (test). Trigger thật thì chạy riêng từng nhịp. */
function gpSendAllSlots() {
  gpSlot1Ads(); gpSlot2Store(); gpSlot3Market(); gpSlot4Ideas(); gpSlot5Rival();
  gpSlot6Video(); gpSlot7Moves();
  Logger.log('DONE gpSendAllSlots (' + GP_SLOTS.length + ' nhịp)');
}

// ─────────────────────────────────────────────────────────────────────────────
// v3.8-U/V — TOP SKU từ 'SKU Raw Data' (thay Shopify MCP của task ads đã xoá)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Đọc 'SKU Raw Data' (per line-item) → gộp theo Title trong cửa sổ N ngày.
 *
 * 🔴 XẾP HẠNG BẰNG UNITS, KHÔNG PHẢI TIỀN — có lý do:
 * GP_ProductPL.gs dòng 59: "Gross Rev = size reference only"; price×qty là GROSS
 * TRƯỚC giảm giá, còn Shopify MCP (nguồn cũ của B9) trả NET. Baseline: discount
 * ăn ~26.2% gross. Nặng hơn: B2G1 thì món TẶNG vẫn mang price ⇒ gross thổi phồng
 * đúng nhóm B2G1 — offer lõi của GP. Xếp hạng bằng gross = tự bơm điểm B2G1 rồi
 * khuyên scale nhầm. Units (Qty) miễn nhiễm cả giảm giá lẫn B2G1.
 * → gross vẫn trả về NHƯNG luôn kèm nhãn, KHÔNG so trực tiếp với số Shopify cũ.
 */
function gp_readTopSku_(days) {
  var ss = tgResolveSS_().ss;
  if (!ss) return { status: 'NO_SPREADSHEET' };
  var ws = ss.getSheetByName(GP_SKURAW_SHEET);
  if (!ws || ws.getLastRow() < 2) return { status: 'NO_SKU_SHEET', note: 'thiếu "' + GP_SKURAW_SHEET + '"' };

  var C = GP_SKU_COLS, win = tgWindowKeys_(1, days), agg = {}, rows = 0;
  ws.getRange(2, 1, ws.getLastRow() - 1, 7).getValues().forEach(function (r) {
    var d = r[C.date];
    if (!(d instanceof Date) || isNaN(d.getTime())) return;
    if (!win[tgDayKey_(d)]) return;
    var title = String(r[C.title] || '').trim();
    if (!title) return;                       // dòng product_title RỖNG — bỏ, không tính top
    var qty = parseFloat(r[C.qty]) || 0; if (qty <= 0) qty = 1;
    var price = parseFloat(r[C.price]) || 0;
    var a = agg[title] || (agg[title] = { title: title, units: 0, gross: 0, orders: {}, skus: {} });
    a.units += qty;
    a.gross += price * qty;                   // GROSS pre-discount — chỉ tham chiếu
    var o = String(r[C.order] || '').trim(); if (o) a.orders[o] = 1;
    var sk = String(r[C.sku] || '').trim(); if (sk) a.skus[sk] = 1;
    rows++;
  });

  var list = Object.keys(agg).map(function (k) {
    var a = agg[k];
    return { title: a.title, units: a.units, orders: Object.keys(a.orders).length,
             gross: Math.round(a.gross * 100) / 100, sku_sample: Object.keys(a.skus).slice(0, 2) };
  }).sort(function (x, y) { return y.units - x.units; });   // ← UNITS, không phải gross

  return {
    status: list.length ? 'OK' : 'NO_DATA_IN_WINDOW', days: days, line_items: rows,
    top: list.slice(0, GP_TOP_SKU_N), total_titles: list.length,
    revenue_note: 'gross = price×qty TRƯỚC giảm giá (nguồn: SKU Raw Data). KHÔNG phải net như ' +
                  'Shopify (discount ~26.2% gross) và B2G1 bị thổi phồng vì món tặng vẫn mang price. ' +
                  'Xếp hạng theo UNITS. Đừng so gross này với số $ trong báo cáo B9 cũ.'
  };
}

/** 09:30 — Hook đề xuất, dựng từ SKU bán thật + tin đối thủ. */
function gp_buildHookBlock_() {
  var sku7 = gp_readTopSku_(7), sku3 = gp_readTopSku_(3);
  if (sku7.status !== 'OK') {
    return '⚠️ <b>Hook</b>: không đọc được "' + GP_SKURAW_SHEET + '" (' + sku7.status + ') → bỏ qua.';
  }
  var j = gp_loadMarketJson_();
  var rival = (j.status === 'OK' && j.data.blocks && j.data.blocks.B9) ? j.data.blocks.B9.join('\n') : '';

  var payload = {
    top_sku_7d: sku7.top, top_sku_3d: sku3.status === 'OK' ? sku3.top : null,
    revenue_note: sku7.revenue_note, rival_news: rival.substring(0, 3000)
  };
  var sys = [
    'Bạn là chuyên gia creative cho GerberaPrints (POD golf novelty/NSFW apparel US).',
    'Viết khối "Hook đề xuất" cho Telegram. HTML Telegram: chỉ <b> <i> <code>. KHÔNG markdown.',
    'KHÔNG dùng & < > trần (viết &amp; &lt; &gt;).',
    '',
    '🔴 SỐ LIỆU — ĐỌC ĐÚNG:',
    '- top_sku_7d/3d xếp theo UNITS (số cái bán ra), KHÔNG theo tiền. Lý do trong revenue_note.',
    '- gross là GROSS TRƯỚC giảm giá, B2G1 bị thổi phồng ⇒ ĐỪNG xếp hạng theo gross, ĐỪNG so',
    '  với số $ của báo cáo cũ. Nếu trích gross PHẢI ghi "(gross, trước giảm giá)".',
    '- SKU lên ở 3d mà không có ở 7d ⇒ đang tăng tốc. Có ở 7d mà rớt khỏi 3d ⇒ đang nguội.',
    '',
    '🔴 CHÍNH SÁCH NSFW (quyết định hook nào được chạy paid):',
    '- L3 = explicit/profanity (American Tatas, The Shocker, S-e-x Ed, Badonkadonk, Duck You,',
    '  Frank and Beans, Boats and Hoes…) → ORGANIC ONLY, TUYỆT ĐỐI không đề xuất paid.',
    '- L2 → test $20–30 trước. L1 → thường auto-pass. L0 → paid thoải mái.',
    '- Split The G dính TM (#guinness) → KHÔNG paid dù bán tốt.',
    '- Mọi creative distance-reveal PHẢI có bản censored để Meta duyệt.',
    '- ⚠️ Phân loại L3 suy từ TÊN SKU, chỉ The Shocker + American Tatas được xác nhận đích danh',
    '  → khi gắn L3 cho SKU khác phải ghi "nghi L3, chưa xác nhận".',
    '',
    'THẾ MẠNH GP: NSFW distance-reveal sublimation & seamless all-over — T1 KHÔNG brand nào có.',
    'Try-On (format thắng của Bad Birdie) và distance-reveal là CÙNG một cú máy → GP không cần',
    'đua 12 creative/tuần, chỉ cần cú máy đối thủ không in được.',
    '',
    'ĐỊNH DẠNG: tối đa 3 hook 🟢 (làm tuần này) + 1–2 🟡 (test nhỏ) + danh sách 🔴 KHÔNG paid.',
    'Mỗi hook: tên SKU · units 7d/3d · mức policy · CTA cụ thể · 1 câu vì sao. Kết "👉 <b>Chốt:</b>".',
    'Số nào không có thì nói KHÔNG CÓ. Tuyệt đối không bịa.'
  ].join('\n');

  var resp = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json',
    headers: { 'x-api-key': prop_('ANTHROPIC_API_KEY', true), 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: prop_('LLM_MODEL', false) || TG_LLM_MODEL_DEFAULT,
      max_tokens: 4000, system: sys, thinking: { type: 'disabled' },
      messages: [{ role: 'user', content: '```json\n' + JSON.stringify(payload) + '\n```' }]
    }), muteHttpExceptions: true
  });
  var body = JSON.parse(resp.getContentText() || '{}');
  if (resp.getResponseCode() !== 200 || body.error) {
    throw new Error('Hook LLM ' + (body.error ? body.error.message : 'HTTP ' + resp.getResponseCode()));
  }
  var txt = (body.content || []).filter(function (b) { return b && b.type === 'text' && b.text; })
              .map(function (b) { return b.text; }).join('\n').trim();
  if (!txt) throw new Error('Hook LLM rỗng · stop_reason=' + (body.stop_reason || '?'));

  return '🎣 <b>Hook đề xuất</b>  <i>(xếp theo UNITS bán thật, 7d/3d)</i>\n\n' + gp_sanitizeHtml_(txt) +
         '\n\n<i>Nguồn SKU: sheet "' + GP_SKURAW_SHEET + '" (' + sku7.line_items + ' line-item, ' +
         sku7.total_titles + ' SP). Thay Shopify MCP của task ads đã gộp.</i>';
}

/** Chẩn đoán top SKU — không gửi Telegram. */
function gpTestTopSku() {
  var L = ['🛍 TEST TOP SKU', 'build: ' + GP_BUILD, '────────────────────'];
  [1, 3, 7].forEach(function (d) {
    var r = gp_readTopSku_(d);
    L.push('');
    L.push(d + ' ngày → ' + r.status + (r.line_items !== undefined ? ' · ' + r.line_items + ' line-item · ' + r.total_titles + ' SP' : ''));
    if (r.note) L.push('  ⚠️ ' + r.note);
    (r.top || []).forEach(function (t, i) {
      L.push('  ' + (i + 1) + '. ' + t.title + ' — ' + t.units + ' cái · ' + t.orders + ' đơn · gross $' +
             Math.round(t.gross) + ' (trước giảm giá)');
    });
  });
  Logger.log(L.join('\n'));
  return L.join('\n');
}