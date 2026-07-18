/************************************************************************
 * GenusFaith · DAILY MARKET RESEARCH -> TELEGRAM  (đọc dữ liệu từ GitHub) — GAS v3
 * Brand: GenusFaith — Catholic devotional LEATHER goods (handbag / tote / wallet).
 *
 * ===== v3 — 18/07/2026 — PORT TỪ GRITFELL v2 + SYSTEM v1 + VÁ 2 ĐIỂM MÙ 18/07 =====
 * 1) 🚨 STALE-GATE THẬT SỰ (port GritFell): data KHÔNG phải hôm nay → đăng ĐÚNG 1
 *    cảnh báo rồi SKIP toàn bộ block. Bản v2 chỉ chèn dòng ⚠️ vào header nhưng VẪN
 *    đăng lại đủ ~20 tin của bản cũ → nhóm bị spam dữ liệu cũ ngày mà tưởng là mới.
 * 2) 🆕 DELTA SWEEP 12:30 (vá điểm mù 18/07): research/rescan push tin bổ sung SAU
 *    khung gửi sáng (vd tin B4 "auto v4" push 10:30) → v2 KHÔNG BAO GIỜ gửi tin đó.
 *    v3 nhớ số tin đã gửi mỗi khối (Script Properties) và quét lại 12:30 + 19:30,
 *    chỉ gửi tin MỚI APPEND, không gửi trùng.
 * 3) Lưới an toàn link Markdown (port GritFell): [text](url) → <a href> trước khi
 *    gửi, tránh hiện chữ thô khi research task lỡ viết link kiểu Markdown.
 * 4) So ngày bằng substring(0,10) (port GritFell): field "date" có lỡ kèm chữ
 *    ("2026-07-18 am") vẫn so đúng, không báo stale oan.
 * 5) 🔐 TOKEN ưu tiên đọc từ Script Properties (key: PT_TOKEN, PT_CHAT) — file .gs
 *    này nằm trên repo PUBLIC nên KHÔNG dán token thật vào đây nữa.
 *    CÀI TOKEN: Project Settings -> Script Properties -> thêm PT_TOKEN + PT_CHAT.
 *    ⚠️ Token cũ (bot id 8837604249) đã lộ trên repo public + transcript từ 15/07 —
 *    PHẢI revoke qua @BotFather (/revoke) rồi dán token MỚI vào Script Properties.
 *
 * KIẾN TRÚC (SYSTEM v1): Claude research (~04:30 BKK) --git push--> foxera-daily
 *   --raw--> GAS này (health 05:45 · gửi 06:00–07:45 · delta sweep 12:30 + 19:30)
 *   --> Telegram nhóm '✝️ GenusFaith · Daily Market Research'.
 *
 * CÀI (thay toàn bộ project cũ bằng file này):
 *   1) Project Settings -> Time zone = (GMT+07:00) Bangkok.
 *   2) Script Properties: PT_TOKEN = token bot MỚI (sau revoke) · PT_CHAT = -4990055415.
 *   3) fxTestRead()   -> log phải thấy FRESH/STALE + đủ 8 khối.
 *   4) foxeraSendAll() -> test đẩy full (tự ghi sổ đã-gửi cho delta sweep).
 *   5) installDailyTriggers() -> cài 11 trigger (tự xoá trigger cũ, không trùng).
 ************************************************************************/

// KHÔNG dán token thật vào 2 hằng dưới — chúng chỉ là fallback khi Script Properties trống.
const PT_TOKEN_FALLBACK = '<DÁN_PT_TOKEN_VÀO_SCRIPT_PROPERTIES_KHÔNG_PHẢI_Ở_ĐÂY>';
const PT_CHAT_FALLBACK  = '-4990055415'; // nhóm '✝️ GenusFaith · Daily Market Research'
const PT_DELAY = 3500;
const FX_TZ    = 'Asia/Bangkok';
const RAW_URL  = 'https://raw.githubusercontent.com/GerberaPrints/foxera-daily/main/genusfaith-daily.json';

function fx_prop_(k, fallback) {
  var v = PropertiesService.getScriptProperties().getProperty(k);
  return (v && v.indexOf('<') !== 0) ? v : fallback;
}
function pt_token_() { return fx_prop_('PT_TOKEN', PT_TOKEN_FALLBACK); }
function pt_chat_()  { return fx_prop_('PT_CHAT',  PT_CHAT_FALLBACK); }

// Danh sách khối gửi + tên hiển thị (thêm khối mới chỉ cần thêm 1 dòng ở đây
// — VÀ thêm sender + trigger; bài học B7 mồ côi ở GAS v1)
const FX_BLOCKS = [
  { key: 'B1', name: 'Keyword & Sản phẩm' },
  { key: 'B2', name: 'Niche Deep-Dive' },
  { key: 'B3', name: 'Idea Bank & Brief' },
  { key: 'B4', name: 'Format / SP mới nổi' },
  { key: 'B5', name: 'Niche mới + kết hợp' },
  { key: 'B6', name: 'Evergreen Theme Bank' },
  { key: 'B7', name: 'Competitor & Marketplace Radar' },
  { key: 'B8', name: 'Kho ASIN / Listing (đào ý tưởng)' }
];

/* ---------- Telegram ---------- */
function pt_api_(method, payload) {
  for (var a = 0; a < 4; a++) {
    var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + pt_token_() + '/' + method, {
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

/* Cắt theo RANH GIỚI DÒNG — không cắt giữa thẻ HTML (v2 giữ nguyên). */
function pt_chunk_(html, max) {
  max = max || 3900;
  if (html.length <= max) return [html];
  var lines = html.split('\n'), out = [], cur = '';
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

function pt_send_(html) {
  // v3 (port GritFell): lỡ có link Markdown [text](url) → đổi sang <a href> cho bấm được.
  html = String(html).replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
  var parts = pt_chunk_(html, 3900);
  for (var i = 0; i < parts.length; i++) {
    var r = pt_api_('sendMessage', {
      chat_id: pt_chat_(), text: parts[i], parse_mode: 'HTML', disable_web_page_preview: true
    });
    if (!r.ok) { // HTML hỏng -> gửi plain text thay vì mất tin
      Logger.log('HTML fail -> fallback plain. Preview: ' + parts[i].substring(0, 80));
      pt_api_('sendMessage', {
        chat_id: pt_chat_(), text: parts[i].replace(/<[^>]+>/g, ''),
        disable_web_page_preview: true
      });
    }
    if (i < parts.length - 1) Utilities.sleep(1200);
  }
}

/* ---------- Đọc dữ liệu từ GitHub (raw, cache-buster) ---------- */
function fx_loadData_() {
  var res = UrlFetchApp.fetch(RAW_URL + '?t=' + Date.now(), {
    muteHttpExceptions: true, headers: { 'Cache-Control': 'no-cache' }
  });
  if (res.getResponseCode() !== 200) throw new Error('Không đọc được GitHub raw (' + res.getResponseCode() + ').');
  return JSON.parse(res.getContentText());
}

function fx_todayBkk_() { return Utilities.formatDate(new Date(), FX_TZ, 'yyyy-MM-dd'); }
// v3 (port GritFell): substring(0,10) — "date" có kèm chữ vẫn so đúng.
function fx_dataDate_(data) { return String((data && data.date) || '').substring(0, 10); }
function fx_isStale_(data)  { return fx_dataDate_(data) !== fx_todayBkk_(); }

function fx_header_(data) {
  var d = Utilities.formatDate(new Date(), FX_TZ, 'EEE dd/MM/yyyy');
  var loc = (data && data.locale) ? data.locale : 'US / USD';
  return '✝️ <b>GenusFaith · Daily Market Research</b>\n' + d +
    '\n<i>Catholic devotional leather · nguồn: Website + Amazon + Etsy + competitor.</i>' +
    '\n<i>Dữ liệu ngày ' + fx_dataDate_(data) + ' · locale ' + loc + ' · khung VN / data EN.</i>' +
    '\n<i>Metric trung thực: luôn phân biệt (listing rv) vs (shop rv) vs (shop sales).</i>';
}
function fx_staleMsg_(data) {
  return '🚨 <b>GenusFaith — DỮ LIỆU CHƯA CẬP NHẬT HÔM NAY</b>\n' +
    Utilities.formatDate(new Date(), FX_TZ, 'EEE dd/MM/yyyy') + '\n' +
    'File <code>genusfaith-daily.json</code> vẫn là ngày <b>' + (fx_dataDate_(data) || '?') + '</b>.\n' +
    '→ research task ~04:30 <b>chưa chạy</b> hoặc <b>push GitHub fail</b>. KHÔNG đăng bản cũ.\n' +
    'FIX: kiểm scheduled task "[Genus·Research] Devotional" + PAT (Contents: Read &amp; write cho <code>GerberaPrints/foxera-daily</code>).';
}

/* ---------- Sổ đã-gửi (cho DELTA SWEEP) ---------- */
function fx_sent_() {
  var raw = PropertiesService.getScriptProperties().getProperty('FX_SENT');
  var s = raw ? JSON.parse(raw) : null;
  if (!s || s.date !== fx_todayBkk_()) s = { date: fx_todayBkk_(), counts: {} };
  return s;
}
function fx_saveSent_(s) {
  PropertiesService.getScriptProperties().setProperty('FX_SENT', JSON.stringify(s));
}

/* ---------- Gửi từng khối (v3: stale-gate + ghi sổ đã-gửi) ---------- */
function fx_sendBlock_(key, isFirst) {
  var data = fx_loadData_();
  if (fx_isStale_(data)) { // v3: KHÔNG đăng bản cũ — chỉ block đầu đăng 1 cảnh báo
    if (isFirst) pt_send_(fx_staleMsg_(data));
    Logger.log('STALE: data=' + fx_dataDate_(data) + ' today=' + fx_todayBkk_() + ' -> skip ' + key);
    return;
  }
  if (isFirst) { pt_send_(fx_header_(data)); Utilities.sleep(PT_DELAY); }
  var arr = (data.blocks && data.blocks[key]) ? data.blocks[key] : null;
  if (!arr || !arr.length) {
    var nm = '';
    for (var k = 0; k < FX_BLOCKS.length; k++) if (FX_BLOCKS[k].key === key) nm = FX_BLOCKS[k].name;
    pt_send_('⚠️ <b>' + key + ' — ' + nm + '</b>: không có dữ liệu hôm nay.');
    return;
  }
  for (var i = 0; i < arr.length; i++) { pt_send_(arr[i]); Utilities.sleep(PT_DELAY); }
  var s = fx_sent_(); s.counts[key] = arr.length; fx_saveSent_(s); // ghi sổ cho delta sweep
}

function fxSendBlock1() { fx_sendBlock_('B1', true); }
function fxSendBlock2() { fx_sendBlock_('B2', false); }
function fxSendBlock3() { fx_sendBlock_('B3', false); }
function fxSendBlock4() { fx_sendBlock_('B4', false); }
function fxSendBlock5() { fx_sendBlock_('B5', false); }
function fxSendBlock6() { fx_sendBlock_('B6', false); }
function fxSendBlock7() { fx_sendBlock_('B7', false); }
function fxSendBlock8() { fx_sendBlock_('B8', false); }

function foxeraSendAll() {
  fxSendBlock1(); fxSendBlock2(); fxSendBlock3(); fxSendBlock4();
  fxSendBlock5(); fxSendBlock6(); fxSendBlock7(); fxSendBlock8();
  Logger.log('DONE foxeraSendAll (8 blocks)');
}

/* ---------- 🆕 v3 DELTA SWEEP — gửi tin APPEND sau khung sáng ----------
 * Bài học 18/07: run auto v4 push tin B4 lúc ~10:30 (sau khung 06:00–07:45)
 * → v2 không bao giờ gửi tin đó. Sweep chạy 12:30 + 19:30: so số tin hiện có
 * với sổ đã-gửi, chỉ gửi phần MỚI. Data stale → bỏ qua (không gửi gì). */
function fxDeltaSweep() {
  var data;
  try { data = fx_loadData_(); } catch (e) { Logger.log('DeltaSweep: ' + e.message); return; }
  if (fx_isStale_(data)) { Logger.log('DeltaSweep: stale -> skip'); return; }
  var s = fx_sent_(), sentAny = false;
  for (var b = 0; b < FX_BLOCKS.length; b++) {
    var key = FX_BLOCKS[b].key;
    var arr = (data.blocks && data.blocks[key]) ? data.blocks[key] : [];
    var done = s.counts[key] || 0;
    if (arr.length > done) {
      if (!sentAny) {
        pt_send_('🔄 <b>GenusFaith — TIN BỔ SUNG trong ngày</b> (rescan/auto-run push sau khung gửi sáng)');
        Utilities.sleep(PT_DELAY); sentAny = true;
      }
      for (var i = done; i < arr.length; i++) { pt_send_(arr[i]); Utilities.sleep(PT_DELAY); }
      s.counts[key] = arr.length;
    }
  }
  if (sentAny) fx_saveSent_(s);
  Logger.log(sentAny ? 'DeltaSweep: sent new messages' : 'DeltaSweep: nothing new');
}

/* ---------- Test / Health ---------- */
function fxTestRead() {
  var d = fx_loadData_();
  var miss = [], longest = 0;
  for (var i = 0; i < FX_BLOCKS.length; i++) {
    var k = FX_BLOCKS[i].key;
    if (!d.blocks || !d.blocks[k] || !d.blocks[k].length) miss.push(k);
  }
  Object.keys(d.blocks || {}).forEach(function (k) {
    d.blocks[k].forEach(function (t) { if (t.length > longest) longest = t.length; });
  });
  Logger.log((fx_isStale_(d) ? '⚠️ STALE ' : '✅ FRESH ') + 'data=' + fx_dataDate_(d) + ' today=' + fx_todayBkk_() +
    ' · locale=' + (d.locale || '-') +
    ' · blocks=' + Object.keys(d.blocks).map(function (k) { return k + ':' + d.blocks[k].length; }).join(' ') +
    ' · tin dài nhất=' + longest + (longest > 3900 ? ' ⚠️ >3900!' : ' ✓') +
    (miss.length ? ' · ⚠️ THIẾU: ' + miss.join(',') : ' · đủ 8 khối') +
    ' · token=' + (pt_token_().indexOf('<') === 0 ? '⚠️ CHƯA CÀI Script Properties!' : 'OK từ ' +
      (PropertiesService.getScriptProperties().getProperty('PT_TOKEN') ? 'Script Properties' : 'fallback hằng số')));
}

/* Health-check 05:45 — data cũ/không đọc được → cảnh báo 1 lần TRƯỚC khung gửi. */
function fxHealthCheck() {
  try { var d = fx_loadData_(); if (fx_isStale_(d)) pt_send_(fx_staleMsg_(d)); }
  catch (e) { pt_send_('🚨 <b>GenusFaith — không đọc được GitHub raw</b>\n<code>' + e.message + '</code>'); }
}

/* ---------- Lịch gửi hàng ngày ---------- */
function _fxMkTrigger_(fn, hour, minute) {
  ScriptApp.newTrigger(fn).timeBased().atHour(hour).nearMinute(minute).everyDays(1).create();
}
function installDailyTriggers() {
  removeDailyTriggers();
  _fxMkTrigger_('fxHealthCheck', 5, 45);   // cảnh báo trước khi gửi
  _fxMkTrigger_('fxSendBlock1', 6, 0);
  _fxMkTrigger_('fxSendBlock2', 6, 15);
  _fxMkTrigger_('fxSendBlock3', 6, 30);
  _fxMkTrigger_('fxSendBlock4', 6, 45);
  _fxMkTrigger_('fxSendBlock5', 7, 0);
  _fxMkTrigger_('fxSendBlock6', 7, 15);
  _fxMkTrigger_('fxSendBlock7', 7, 30);
  _fxMkTrigger_('fxSendBlock8', 7, 45);
  _fxMkTrigger_('fxDeltaSweep', 12, 30);   // 🆕 v3: quét tin bổ sung trưa
  _fxMkTrigger_('fxDeltaSweep', 19, 30);   // 🆕 v3: quét tin bổ sung tối
  Logger.log('Installed 11 triggers: health 05:45 · blocks 06:00-07:45 · delta 12:30+19:30 (' + FX_TZ + '). Đặt Project Time zone = Bangkok!');
}
function removeDailyTriggers() {
  var t = ScriptApp.getProjectTriggers();
  for (var i = 0; i < t.length; i++) {
    var h = t[i].getHandlerFunction();
    if (h && (h.indexOf('fxSendBlock') === 0 || h === 'fxHealthCheck' || h === 'fxDeltaSweep')) ScriptApp.deleteTrigger(t[i]);
  }
}
