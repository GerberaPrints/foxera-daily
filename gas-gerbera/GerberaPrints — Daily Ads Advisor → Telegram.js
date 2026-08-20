/**
 * ============================================================================
 *  GerberaPrints — Daily Ads Advisor → Telegram  (add-on cho CRM v19)
 * ----------------------------------------------------------------------------
 *  Luồng hàng ngày (time-trigger):
 *    1. fetchMetaSnapshot_()     → Meta Insights 7 TK (account + ad level).
 *    2. fetchGoogleSnapshot_()   → đọc sheet '🔍 Google Ads' đã sync sẵn.
 *    3. fetchCompetitorAds_()    → Ad Library ads đang chạy của đối thủ (page_id).
 *    4. callLLM_()               → Claude API sinh "đề xuất" tiếng Việt:
 *                                   phân tích sâu + so sánh đối thủ + cách THẮNG.
 *    5. sendTelegramChunked_()   → đẩy Telegram, tự chia < 4096 ký tự.
 *
 *  KHÔNG hardcode secret — đọc từ Script Properties. Xem README.
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

/** 7 tài khoản Meta Gerbera (nhãn → ad_account_id). */
var TG_META_ACCOUNTS = {
  '02': '687791113516625',
  '03': '3666317626944281',
  '04': '529798326149618',
  '05': '408509139005908',
  '08': '1635419550630846', // hay lỗi tracking → ROAS thường N/A
  '09': '441855108709735',
  '10': '1075322513569687'
};

var TG_GRAPH_VER   = 'v20.0';                       // trùng _CAPI.API_VERSION
var TG_GOOGLE_CID  = '2946662893';                  // Gerbera Prints (VND)
var TG_SS_ID       = '1sd8LENhX1fUrK7d42oHbNRTYsbaj7BEsNYTsQ0xouwM'; // CRM spreadsheet
var TG_G_ADS_SHEET = '🔍 Google Ads';               // SH.G_ADS
var TG_ADS_ANALYTICS_SHEET = '📊 Ads Analytics';    // fallback nguồn Google
var TG_TOP_ADS_PER_ACCT = 6;                        // giới hạn ad-level/TK (token guard)
var TG_MAX_MSG   = 3900;                            // < 4096 cho an toàn
var TG_LLM_MODEL_DEFAULT = 'claude-sonnet-5';       // đổi qua Property LLM_MODEL nếu muốn
var TG_TZ        = 'Asia/Saigon';

// ── Competitor Ad-Library (quét theo PAGE_ID cho chính xác; tên brand bị nhiễu) ──
// Thêm brand mới: chạy tgFindCompetitorPageId('Tên Brand') → lấy page_id → dán vào đây.
var TG_COMPETITOR_PAGES = {
  // Đã verify page_id thật (2026-07-11). Xếp theo mức ưu tiên (ngách + volume ad).
  'Obnoxious Golf' : '108688241822508',   // ~388 ads · hook "Same Polo as Everyone Else?"
  'Bogey Bros'     : '113492263824346',   // ~308 ads · NSFW/hài · chạy Birdie Finger (trùng mình)
  'Sunday Swagger' : '552047315321061',   // ~214 ads · bundle His&Her + "15,000 5-Star Reviews"
  'Bad Birdie'     : '1387562821309193',  // premium · offer 15% off first order
  'Bush League Golf': '192149650658911',  // "Dead Serious Style"/"Boys' Trip" · sát ngách hài
  'Bogey Stars'    : '600758899777460',   // "Sold Out 5 times"/"Funny Polo Dad"
  'BONK Golf'      : '205427092645115',   // cheeky · "Women's Golf Hats Miss The Point"
  'Devereux Golf'  : '717198031640914',   // premium/modern · "Voodoo Collection"
  'Pins and Aces'  : '336470580233523',   // bags/accessories premium
  'Waggle Apparel' : '1868493276785452',  // matching sets · collab
  'Birds of Condor': '1530671910542547',  // AU · "Archive Sale"
  'Shankit Golf'   : '107080544377642',   // mũ · "The Wasted Golf Hat"
  'Slice Baby Golf': '214392221747613',   // funny polo · volume thấp
  'Swannies'       : '700200626767770'    // B2B/gameday · volume thấp
  // Chưa resolve (search nhiễu / không quảng cáo riêng): Good Good (creator),
  // Fore Play (thuộc Barstool Sports), U Suck At Golf, Bogey Boys, Swag Golf.
  // Thêm sau bằng: tgFindCompetitorPageId('Tên Brand').
};
var TG_COMPETITOR_MAX_BRANDS = 8;   // quét 8 brand ưu tiên đầu/ngày (nâng tối đa 14; token/rate guard)
var TG_COMPETITOR_ADS_PER    = 12;  // số ad kéo mỗi brand
var TG_COMPETITOR_COUNTRY    = 'US';

// ── Competitor Intel spreadsheet (file scrape products.json riêng, KHÁC CRM) ──
// Chứa Daily Report (new arrivals/promo/stock), New Arrivals Log, per-brand sheets.
var TG_CI_SS_ID        = '1YcuwVa8TDBcezRyjlRGVuenxQ-bHy1xSKIEkeYPOO0I';
var TG_CI_REPORT_MATCH = 'Daily Report'; // đọc sheet có tên chứa chuỗi này
var TG_CI_MAX_CHARS    = 4500;           // cắt bớt briefing cho gọn token

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINTS
// ─────────────────────────────────────────────────────────────────────────────

/** Chạy toàn bộ pipeline rồi đẩy Telegram. Gắn vào time-trigger hàng ngày. */
function pushAdsAdviceToTelegram() {
  var startedAt = new Date();
  try {
    var snapshot = {
      generated_at: Utilities.formatDate(startedAt, TG_TZ, 'yyyy-MM-dd HH:mm'),
      meta:            fetchMetaSnapshot_(),
      google:          fetchGoogleSnapshot_(),
      competitors:     fetchCompetitorAds_(),    // Ad Library đối thủ (ads đang chạy)
      competitor_intel: fetchCompetitorIntel_()  // catalog/promo/new-arrivals/stock từ file scrape
    };

    var report = callLLM_(snapshot);
    if (!report || report.length < 40) throw new Error('LLM trả về rỗng/ngắn bất thường.');

    var header = '📊 ĐỀ XUẤT QUẢNG CÁO — GerberaPrints\n🗓️ ' +
                 snapshot.generated_at + ' (Asia/Saigon)\n────────────────────';
    sendTelegramChunked_(header + '\n' + report);
    Logger.log('pushAdsAdviceToTelegram OK (%s ms)', (new Date() - startedAt));
  } catch (err) {
    var msg = '⚠️ Ads Advisor lỗi: ' + (err && err.message ? err.message : err);
    Logger.log(msg);
    try { sendTelegramChunked_(msg); } catch (e2) { /* nuốt lỗi gửi lỗi */ }
  }
}

/** Cấu hình một lần qua dialog (chạy từ menu Sheet, cần UI). */
function setupAdsAdvisorTelegram() {
  var ui = SpreadsheetApp.getUi();
  var p  = PropertiesService.getScriptProperties();
  function ask(key, label) {
    var cur = p.getProperty(key) ? ' (đang có, Enter để giữ)' : '';
    var res = ui.prompt('Ads Advisor Setup', label + cur, ui.ButtonSet.OK_CANCEL);
    if (res.getSelectedButton() !== ui.Button.OK) throw new Error('Huỷ setup.');
    var val = res.getResponseText().trim();
    if (val) p.setProperty(key, val);
  }
  ask('TELEGRAM_BOT_TOKEN', 'Bot token (BotFather):');
  ask('TELEGRAM_CHAT_ID',   'Chat ID (hoặc @channel):');
  ask('ANTHROPIC_API_KEY',  'Anthropic API key (sk-ant-...):');
  ask('ADS_READ_TOKEN',     'Meta token CHỈ-ĐỌC (ads_read) cho insights + Ad Library:');
  ui.alert('Đã lưu. Chạy testTelegramConnection() rồi pushAdsAdviceToTelegram().');
}

/** Bản headless: điền giá trị rồi Run 1 lần nếu không muốn dùng dialog. */
function setPropertiesDirect_() {
  PropertiesService.getScriptProperties().setProperties({
    // 'TELEGRAM_BOT_TOKEN': '123456:ABC...',
    // 'TELEGRAM_CHAT_ID'  : '-5560564819',
    // 'ANTHROPIC_API_KEY' : 'sk-ant-...',
    // 'ADS_READ_TOKEN'    : 'EAA...',   // token ads_read read-only (khuyến nghị)
    // 'LLM_MODEL'         : 'claude-sonnet-5'
  }, false);
  Logger.log('Đã set (những dòng bỏ comment).');
}

/** Cài trigger chạy mỗi sáng 07:00 giờ VN. Chạy 1 lần. */
function installAdsAdvisorTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'pushAdsAdviceToTelegram') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('pushAdsAdviceToTelegram')
    .timeBased().atHour(7).nearMinute(0).everyDays(1).inTimezone(TG_TZ).create();
  Logger.log('Đã cài trigger 07:00 %s.', TG_TZ);
}

/** Test nhanh: gửi 1 tin "ping". */
function testTelegramConnection() {
  sendTelegramChunked_('✅ Ads Advisor kết nối OK — ' +
    Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd HH:mm'));
}

// ─────────────────────────────────────────────────────────────────────────────
// META (Facebook) SNAPSHOT
// ─────────────────────────────────────────────────────────────────────────────

function fetchMetaSnapshot_() {
  var token = adsReadToken_();
  var out = { accounts: [] };
  Object.keys(TG_META_ACCOUNTS).forEach(function (label) {
    var actId = TG_META_ACCOUNTS[label];
    var rec = { label: label, id: actId };
    try {
      rec.acct_7d   = metaInsights_(actId, token, 'account', 'last_7d', null);
      rec.acct_prev = metaInsights_(actId, token, 'account', null, prevWeekRange_());
      rec.ads       = metaInsights_(actId, token, 'ad', 'last_7d', null, TG_TOP_ADS_PER_ACCT);
    } catch (e) {
      rec.error = String(e && e.message ? e.message : e);
    }
    out.accounts.push(rec);
    Utilities.sleep(400);
  });
  return out;
}

function metaInsights_(actId, token, level, datePreset, timeRange, limit) {
  var fields = (level === 'ad')
    ? 'ad_id,ad_name,campaign_name,spend,impressions,clicks,ctr,cpc,frequency,purchase_roas,actions,action_values'
    : 'spend,impressions,clicks,ctr,cpc,purchase_roas,actions,action_values';
  var params = {
    level: level,
    fields: fields,
    filtering: JSON.stringify([{ field: 'campaign.name', operator: 'CONTAIN', value: 'GER' }])
  };
  if (datePreset) params.date_preset = datePreset;
  if (timeRange)  params.time_range  = JSON.stringify(timeRange);
  if (level === 'ad') { params.sort = 'spend_descending'; params.limit = String(limit || 8); }

  var url = 'https://graph.facebook.com/' + TG_GRAPH_VER + '/act_' + actId +
            '/insights?access_token=' + encodeURIComponent(token) + '&' + toQuery_(params);
  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var body = JSON.parse(resp.getContentText() || '{}');
  if (resp.getResponseCode() !== 200 || body.error) {
    throw new Error('Meta ' + actId + ' [' + level + '] ' +
                    (body.error ? body.error.message : ('HTTP ' + resp.getResponseCode())));
  }
  var rows = (body.data || []).map(cleanInsightRow_);
  return (level === 'account') ? (rows[0] || {}) : rows;
}

function cleanInsightRow_(r) {
  var o = {
    spend: num_(r.spend), impressions: num_(r.impressions),
    clicks: num_(r.clicks), ctr: num_(r.ctr), cpc: num_(r.cpc)
  };
  if (r.ad_name)       o.ad = r.ad_name;
  if (r.ad_id)         o.ad_id = r.ad_id;
  if (r.campaign_name) o.camp = r.campaign_name;
  if (r.frequency)     o.freq = num_(r.frequency);
  o.roas = extractRoas_(r.purchase_roas);
  o.purchases = extractPurchases_(r.actions);
  o.revenue   = extractPurchases_(r.action_values);
  return o;
}

function extractRoas_(arr) {
  if (!arr || !arr.length) return null;
  var hit = arr.filter(function (a) { return /purchase/i.test(a.action_type); });
  var n = parseFloat((hit[0] || arr[0]).value);
  return isNaN(n) ? null : Math.round(n * 100) / 100;
}
function extractPurchases_(arr) {
  if (!arr || !arr.length) return 0;
  var hit = arr.filter(function (a) { return /^(omni_)?purchase$/i.test(a.action_type); });
  var n = parseFloat((hit[0] || {}).value);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

/** {since,until} cho tuần liền trước (8..14 ngày trước hôm nay). */
function prevWeekRange_() {
  var d = new Date();
  return {
    since: Utilities.formatDate(new Date(d.getTime() - 14 * 864e5), TG_TZ, 'yyyy-MM-dd'),
    until: Utilities.formatDate(new Date(d.getTime() - 8 * 864e5), TG_TZ, 'yyyy-MM-dd')
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPETITOR AD LIBRARY (quét ads đang chạy của đối thủ, theo PAGE_ID)
// ─────────────────────────────────────────────────────────────────────────────

function fetchCompetitorAds_() {
  var token = adsReadToken_(); // cần scope ads_read
  var brands = Object.keys(TG_COMPETITOR_PAGES).slice(0, TG_COMPETITOR_MAX_BRANDS);
  var out = [];
  brands.forEach(function (brand) {
    try {
      out.push(summarizeCompetitor_(brand, competitorArchive_(TG_COMPETITOR_PAGES[brand], token)));
    } catch (e) {
      out.push({ brand: brand, error: String(e && e.message ? e.message : e) });
    }
    Utilities.sleep(500);
  });
  return out;
}

/** Gọi Graph ads_archive theo page_id, ACTIVE, US. Trả mảng ad thô. */
function competitorArchive_(pageId, token) {
  var params = {
    access_token: token,
    ad_reached_countries: JSON.stringify([TG_COMPETITOR_COUNTRY]),
    search_page_ids: JSON.stringify([pageId]),
    ad_active_status: 'ACTIVE',
    fields: 'id,page_name,ad_creative_bodies,ad_creative_link_titles,ad_delivery_start_time',
    limit: String(TG_COMPETITOR_ADS_PER)
  };
  var url = 'https://graph.facebook.com/' + TG_GRAPH_VER + '/ads_archive?' + toQuery_(params);
  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var body = JSON.parse(resp.getContentText() || '{}');
  if (resp.getResponseCode() !== 200 || body.error) {
    throw new Error('AdLibrary ' + pageId + ': ' +
                    (body.error ? body.error.message : ('HTTP ' + resp.getResponseCode())));
  }
  return body.data || [];
}

/** Tóm tắt 1 đối thủ: hook lặp (winner), offer, creative sống lâu nhất, sample body. */
function summarizeCompetitor_(brand, ads) {
  var now = Date.now() / 1000;
  var titleFreq = {}, bodies = [], oldestDays = 0;
  ads.forEach(function (a) {
    (a.ad_creative_link_titles || []).forEach(function (t) {
      t = String(t || '').split('|')[0].trim();
      if (t && t.indexOf('{{') !== 0) titleFreq[t] = (titleFreq[t] || 0) + 1;
    });
    (a.ad_creative_bodies || []).forEach(function (b) {
      b = String(b || '').trim();
      if (b) bodies.push(b);
    });
    if (a.ad_delivery_start_time) {
      var start = Math.floor(new Date(a.ad_delivery_start_time).getTime() / 1000);
      var days = Math.round((now - start) / 86400);
      if (days > oldestDays) oldestDays = days;
    }
  });
  var topHooks = Object.keys(titleFreq).sort(function (x, y) { return titleFreq[y] - titleFreq[x]; }).slice(0, 4);
  var all = (topHooks.join(' ') + ' ' + bodies.join(' ')).toLowerCase();
  var offer = /buy\s*2\s*get\s*1|b2g1|bogo/.test(all) ? 'Buy2Get1'
            : /%\s*off|\bsale\b|\bcode\b/.test(all) ? 'Discount %'
            : /bundle|set of|kit/.test(all) ? 'Bundle'
            : /free shipping/.test(all) ? 'Free Shipping'
            : 'Brand/Awareness';
  return {
    brand: brand,
    active_ads_sampled: ads.length,
    top_hooks: topHooks,
    offer: offer,
    longest_running_days: oldestDays,
    sample_bodies: bodies.slice(0, 3).map(function (b) { return b.slice(0, 220); })
  };
}

/** Tiện ích: tìm page_id của 1 brand để thêm vào TG_COMPETITOR_PAGES. */
function tgFindCompetitorPageId(brandName) {
  var token = adsReadToken_();
  var params = {
    access_token: token,
    ad_reached_countries: JSON.stringify([TG_COMPETITOR_COUNTRY]),
    search_terms: brandName,
    ad_active_status: 'ACTIVE',
    fields: 'page_id,page_name',
    limit: '25'
  };
  var url = 'https://graph.facebook.com/' + TG_GRAPH_VER + '/ads_archive?' + toQuery_(params);
  var body = JSON.parse(UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText() || '{}');
  var seen = {};
  (body.data || []).forEach(function (a) {
    if (a.page_id && !seen[a.page_id]) { seen[a.page_id] = true; Logger.log('%s → page_id %s', a.page_name, a.page_id); }
  });
  if (!Object.keys(seen).length) Logger.log('Không thấy page nào cho "%s".', brandName);
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPETITOR INTEL (đọc Daily Report từ file scrape products.json — catalog/promo)
// ─────────────────────────────────────────────────────────────────────────────

function fetchCompetitorIntel_() {
  try {
    var ss = SpreadsheetApp.openById(TG_CI_SS_ID);
    // tìm sheet Daily Report (ưu tiên tên có 📰); fallback New Arrivals Log
    var sh = ss.getSheets().filter(function (s) {
      return s.getName().indexOf(TG_CI_REPORT_MATCH) >= 0;
    })[0];
    if (!sh) return { note: 'Không thấy sheet "' + TG_CI_REPORT_MATCH + '" trong file Competitor Intel.' };

    var values = sh.getDataRange().getValues();
    var lines = [];
    values.forEach(function (row) {
      var cells = row.map(function (c) {
        return (c === null || c === undefined) ? '' : String(c).trim();
      }).filter(function (x) { return x !== ''; });
      if (cells.length) lines.push(cells.join(' | '));
    });
    var briefing = lines.join('\n');
    if (briefing.length > TG_CI_MAX_CHARS) briefing = briefing.slice(0, TG_CI_MAX_CHARS) + ' …(cắt)';
    return { sheet: sh.getName(), briefing: briefing };
  } catch (e) {
    return { note: 'Lỗi đọc Competitor Intel: ' + (e && e.message ? e.message : e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE SNAPSHOT (đọc sheet đã sync sẵn — không cần Google Ads OAuth mới)
// ─────────────────────────────────────────────────────────────────────────────

function fetchGoogleSnapshot_() {
  try {
    var ss = SpreadsheetApp.openById(TG_SS_ID);
    var sh = ss.getSheetByName(TG_G_ADS_SHEET) || ss.getSheetByName(TG_ADS_ANALYTICS_SHEET);
    if (!sh) return { note: 'Không thấy sheet Google Ads — bỏ qua Google phiên này.' };
    var values = sh.getDataRange().getValues();
    var hdr = findHeaderRow_(values);
    if (hdr < 0) return { note: 'Không nhận diện được header Google Ads sheet.' };
    var col = mapCols_(values[hdr]);
    var rows = [];
    for (var i = hdr + 1; i < values.length && rows.length < 30; i++) {
      var r = values[i];
      var camp = col.camp >= 0 ? String(r[col.camp] || '').trim() : '';
      if (!camp) continue;
      var spend = col.spend >= 0 ? num_(r[col.spend]) : null;
      if (!spend) continue;
      rows.push({
        campaign: camp, spend: spend,
        roas: col.roas >= 0 ? num_(r[col.roas]) : null,
        ctr:  col.ctr  >= 0 ? num_(r[col.ctr])  : null,
        conv: col.conv >= 0 ? num_(r[col.conv]) : null,
        currency: spend > 10000 ? 'VND' : 'USD'
      });
    }
    return { customer_id: TG_GOOGLE_CID, source_sheet: sh.getName(), campaigns: rows };
  } catch (e) {
    return { note: 'Lỗi đọc Google sheet: ' + (e && e.message ? e.message : e) };
  }
}

function findHeaderRow_(values) {
  for (var i = 0; i < Math.min(8, values.length); i++) {
    var line = values[i].map(function (c) { return String(c).toLowerCase(); }).join('|');
    if (line.indexOf('campaign') >= 0 && (line.indexOf('spend') >= 0 || line.indexOf('cost') >= 0)) return i;
  }
  return -1;
}

function mapCols_(hdrRow) {
  var col = { camp: -1, spend: -1, roas: -1, ctr: -1, conv: -1 };
  hdrRow.forEach(function (h, idx) {
    var k = String(h).toLowerCase();
    if (col.camp < 0 && k.indexOf('campaign') >= 0) col.camp = idx;
    if (col.spend < 0 && (k.indexOf('spend') >= 0 || k.indexOf('cost') >= 0)) col.spend = idx;
    if (col.roas < 0 && k.indexOf('roas') >= 0) col.roas = idx;
    if (col.ctr  < 0 && k.indexOf('ctr') >= 0) col.ctr = idx;
    if (col.conv < 0 && (k.indexOf('conv') >= 0 || k.indexOf('purchase') >= 0)) col.conv = idx;
  });
  return col;
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM (Claude Messages API)
// ─────────────────────────────────────────────────────────────────────────────

function callLLM_(snapshot) {
  var apiKey = prop_('ANTHROPIC_API_KEY', true);
  var model  = prop_('LLM_MODEL', false) || TG_LLM_MODEL_DEFAULT;

  var payload = {
    model: model,
    max_tokens: 4096,
    system: llmSystemPrompt_(),
    messages: [{
      role: 'user',
      content: 'Snapshot gồm: (a) meta = ads của MÌNH 7 TK, (b) google = campaign của mình, ' +
               '(c) competitors = ads đang chạy của ĐỐI THỦ (Ad Library), ' +
               '(d) competitor_intel = tình báo catalog/khuyến mãi/SKU mới/hết hàng của đối thủ (scrape products.json). ' +
               'Phân tích SÂU ads của mình, SO SÁNH với đối thủ (cả ad lẫn catalog/promo), đề xuất Ads/Creative/Post/text để THẮNG. ' +
               'CHỈ dựa trên dữ liệu dưới đây, không bịa ad/ID/đối thủ không có.\n\n' +
               '```json\n' + JSON.stringify(snapshot) + '\n```'
    }]
  };

  var resp = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var body = JSON.parse(resp.getContentText() || '{}');
  if (resp.getResponseCode() !== 200 || body.error) {
    throw new Error('LLM API ' + (body.error ? body.error.message : ('HTTP ' + resp.getResponseCode())));
  }
  return (body.content && body.content[0] && body.content[0].text) || '';
}

/** System prompt — logic skill de-xuat-quang-cao + đối đầu đối thủ. */
function llmSystemPrompt_() {
  return [
    'Bạn là chuyên gia tối ưu quảng cáo cho GerberaPrints (POD apparel US, ngách polo golf hài/NSFW, offer chủ lực Buy 2 Get 1).',
    'Phân tích SÂU ads của mình (Facebook 7 TK USD + Google VND), SO SÁNH với ads đối thủ (Ad Library), rồi đề xuất để THẮNG.',
    'Output tiếng Việt, hành động cụ thể, luôn kèm số liệu căn cứ.',
    '',
    'NGUYÊN TẮC PHÂN TÍCH ADS MÌNH:',
    '- ROAS = doanh thu / chi. FB hoà vốn ~1.0; concept B2G1 (TK04) hoà vốn > 2.0.',
    '- "roas": null = Not available (tracking/độ trễ/chi nhỏ) — KHÔNG kết luận lỗ nếu chi nhỏ; chỉ 🔴 khi chi đủ lớn VÀ ROAS thực đo < hoà vốn.',
    '- Phân biệt ad bằng ad_id + TK. TK08 hay mù tracking → không tắt theo ROAS mù, chỉ xét CTR/CPC.',
    '- CBO/ABO chưa xác nhận → scale = NHÂN BẢN ad, cắt = TẮT ad; nhắc kiểm tra cấu trúc trước khi chỉnh tiền.',
    '- Google PMax: không có keyword/search term thao tác — tối ưu bằng tROAS/budget/asset/search theme. Cảnh báo over-scaling & xu hướng ROAS.',
    '',
    'NGUYÊN TẮC ĐỐI ĐẦU (dùng field competitors):',
    '- top_hooks lặp nhiều = winner đối thủ đang nhân bản (học/đánh bại). longest_running_days lớn = creative đã proven.',
    '- So sánh OFFER: đối thủ dùng "Discount %"/"15% off" mà mình có B2G1 → nhấn B2G1 mạnh hơn. Nếu đối thủ cũng B2G1/Bundle → thắng bằng hook/creative/tốc độ.',
    '- So sánh HOOK & GÓC: chỉ góc đối thủ đang chiếm (câu hỏi pattern-interrupt, hidden-joke, superlative, seasonal) và góc TRỐNG mình nên chiếm.',
    '- Tôn trọng bản quyền: KHÔNG sao chép nguyên văn caption đối thủ; viết bản của mình hay hơn.',
    '- competitor_intel (catalog/promo): SKU MỚI đối thủ ra 24h = tín hiệu concept đang đẩy (vd Bogey Bros ra "Birdie Finger Glove"); PROMO mạnh/nhiều = họ xả kho hoặc ép giá → mình phản ứng (đối đầu concept, hoặc giữ giá + nhấn B2G1); STOCK sold-out cao = cơ hội mình hứng cầu. Đối chiếu offer trên AD (nhiều đối thủ giảm sâu trên web nhưng không nói offer trên ad → lợi thế của mình là nói B2G1 rõ trên ad).',
    'CHỈ ĐỀ XUẤT, không tự ý sửa gì. Không bịa đối thủ/ad/ID không có trong dữ liệu.',
    '',
    'ĐỊNH DẠNG OUTPUT (markdown, emoji, số liệu):',
    '1. **Tóm tắt nhanh** (4–6 dòng): ROAS blended FB & Google + cảnh báo chính + 1 câu về động thái đối thủ.',
    '2. **🔴 Tắt ngay**: ad đang chạy nên tắt — tên + ad_id + TK + chi + ROAS/CTR.',
    '3. **🟡 Cải tiến**: chẩn đoán (CTR/frequency) + hook/creative thay thế.',
    '4. **🟢 Scale**: winner + cách nhân bản (lưu ý CBO/ABO).',
    '5. **Google Ads**: siết/scale campaign + PMax note.',
    '6. **🥊 Đối đầu đối thủ (Ads)**: bảng ngắn mỗi brand — offer | hook winner | ngày chạy lâu nhất | điểm mình hơn/kém.',
    '6b. **🛰️ Động thái đối thủ (catalog/promo)** từ competitor_intel: SKU mới đáng chú ý, brand đang sale mạnh nhất, cảnh báo hết hàng → 1–2 hành động phản ứng cụ thể.',
    '7. **🎯 Đề xuất để THẮNG** (quan trọng nhất, chạy được ngay):',
    '   - **Ads/Angle**: 2–3 góc tấn công dựa trên khoảng trống vs đối thủ.',
    '   - **Creative**: 2–3 concept hình/video nên test (định dạng, hook 3s, visual).',
    '   - **Text**: viết THẲNG 3–5 primary text + 3–5 headline mới (ngách hài/NSFW + B2G1), sẵn sàng copy.',
    '   - **Post/Organic**: 1–2 ý post social bám trend đang thắng.',
    '8. **Bảng tổng quan** từng TK: chi | ROAS | CTR (Google VND, FB USD).',
    'Sắp theo mức tác động. Khoản nào lỗi/thiếu dữ liệu ghi rõ ở cuối, không bịa số.'
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// TELEGRAM SENDER (chunk < 4096)
// ─────────────────────────────────────────────────────────────────────────────

function sendTelegramChunked_(text) {
  var botToken = prop_('TELEGRAM_BOT_TOKEN', true);
  var chatId   = prop_('TELEGRAM_CHAT_ID', true);
  var parts = splitForTelegram_(text, TG_MAX_MSG);
  var n = parts.length;
  for (var i = 0; i < n; i++) {
    var prefix = (n > 1) ? ('（' + (i + 1) + '/' + n + '）\n') : '';
    var resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify({ chat_id: chatId, text: prefix + parts[i], disable_web_page_preview: true }),
      muteHttpExceptions: true
    });
    if (resp.getResponseCode() !== 200) {
      throw new Error('Telegram HTTP ' + resp.getResponseCode() + ': ' + resp.getContentText().slice(0, 200));
    }
    Utilities.sleep(400);
  }
}

/** Cắt text theo ranh giới dòng, mỗi mảnh <= max. */
function splitForTelegram_(text, max) {
  var lines = String(text).split('\n');
  var parts = [], cur = '';
  lines.forEach(function (ln) {
    if (ln.length > max) {
      if (cur) { parts.push(cur); cur = ''; }
      for (var j = 0; j < ln.length; j += max) parts.push(ln.slice(j, j + max));
      return;
    }
    if ((cur + '\n' + ln).length > max) { parts.push(cur); cur = ln; }
    else { cur = cur ? (cur + '\n' + ln) : ln; }
  });
  if (cur) parts.push(cur);
  return parts.length ? parts : [''];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function prop_(key, required) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  if (required && !v) throw new Error('Thiếu Script Property: ' + key + ' (chạy setupAdsAdvisorTelegram).');
  return v;
}

/**
 * Token CHỈ ĐỌC cho insights + Ad Library (read-only).
 * Ưu tiên ADS_READ_TOKEN (System User scope ads_read — KHÔNG gửi được CAPI event),
 * fallback FB_CAPI_TOKEN. Code này KHÔNG BAO GIỜ gọi /events → không tạo dup conversion.
 */
function adsReadToken_() {
  var v = prop_('ADS_READ_TOKEN', false) || prop_('FB_CAPI_TOKEN', false);
  if (!v) throw new Error('Thiếu token đọc ads: set ADS_READ_TOKEN (khuyến nghị, ads_read) hoặc FB_CAPI_TOKEN.');
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