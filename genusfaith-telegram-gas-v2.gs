/************************************************************************
 * GenusFaith · DAILY MARKET RESEARCH -> TELEGRAM  (đọc dữ liệu từ GitHub)
 * Brand: GenusFaith — Catholic devotional LEATHER goods (handbag / tote / wallet).
 *
 * ===== v2 — 15/07/2026 — 3 SỬA LỖI =====
 * 1) 🚨 THÊM KHỐI 7 + KHỐI 8. Bản v1 chỉ gửi B1–B6 → toàn bộ Khối 7 (Competitor
 *    & Marketplace Radar) mà research task đang ghi vào JSON bị BỎ RƠI, không bao
 *    giờ lên Telegram. B8 (Kho ASIN/Listing để đào ý tưởng) là khối mới.
 * 2) 🚨 SỬA pt_send_: v1 cắt thô substring mỗi 4000 ký tự → cắt ĐỨT GIỮA THẺ HTML
 *    (<b>, <a href>) → Telegram trả lỗi "can't parse entities" và tin biến mất.
 *    v2 cắt theo ranh giới dòng, và fallback sang plain-text nếu HTML vẫn lỗi.
 * 3) Thêm fxHealthCheck(): cảnh báo ngay lên Telegram nếu JSON cũ ngày (research
 *    task chết/push fail) — thay vì im lặng gửi lại data hôm qua.
 *
 * KIẾN TRÚC:
 *   Cowork research task (~04:30 BKK) --git push--> GerberaPrints/foxera-daily
 *      (namespace riêng: genusfaith-daily.json + genusfaith-metrics.jsonl)
 *   GAS (file này, lịch 06:00–07:45) --đọc raw GitHub--> đẩy Telegram theo 8 khối.
 *
 * CÀI:
 *   1) Project Settings -> Time zone = (GMT+07:00) Bangkok.
 *   2) fxTestRead()  -> log hiện OK + số tin mỗi khối (phải thấy B7, B8).
 *   3) foxeraSendAll() -> test đẩy full.
 *   4) installDailyTriggers() -> bật lịch (8 trigger).
 *   Gỡ: removeDailyTriggers()
 *
 * ⚠️ BẢO MẬT: PT_TOKEN đã xuất hiện trong hội thoại/transcript. Nên revoke bot cũ
 *    qua @BotFather (/revoke) và dán token mới vào đây.
 ************************************************************************/

const PT_TOKEN = '8837604249:AAFsVi10v2TEg0eBWiAJF1PsT20cqNxCIqM'; // bot riêng GenusFaith — NÊN ROTATE
const PT_CHAT  = '-4990055415'; // nhóm '✝️ GenusFaith · Daily Market Research'
const PT_DELAY = 3500;
const FX_TZ    = 'Asia/Bangkok';
const RAW_URL  = 'https://raw.githubusercontent.com/GerberaPrints/foxera-daily/main/genusfaith-daily.json';

// Danh sách khối gửi + tên hiển thị (thêm khối mới chỉ cần thêm 1 dòng ở đây)
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
    var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + PT_TOKEN + '/' + method, {
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

/**
 * FIX #2 — cắt theo RANH GIỚI DÒNG, không cắt giữa thẻ HTML.
 * v1: html.substring(i, i+4000) -> đứt <a href="...  -> Telegram 400 -> mất tin.
 */
function pt_chunk_(html, max) {
  max = max || 3900;
  if (html.length <= max) return [html];
  var lines = html.split('\n');
  var out = [], cur = '';
  for (var i = 0; i < lines.length; i++) {
    var ln = lines[i];
    // dòng đơn lẻ quá dài (hiếm) -> đành cắt cứng dòng đó
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
  var parts = pt_chunk_(html, 3900);
  for (var i = 0; i < parts.length; i++) {
    var r = pt_api_('sendMessage', {
      chat_id: PT_CHAT, text: parts[i], parse_mode: 'HTML', disable_web_page_preview: true
    });
    // FIX #2b — HTML vẫn hỏng -> gửi plain text thay vì mất tin hoàn toàn
    if (!r.ok) {
      Logger.log('HTML fail -> fallback plain. Preview: ' + parts[i].substring(0, 80));
      pt_api_('sendMessage', {
        chat_id: PT_CHAT,
        text: parts[i].replace(/<[^>]+>/g, ''),
        disable_web_page_preview: true
      });
    }
    if (i < parts.length - 1) Utilities.sleep(1200);
  }
}

/* ---------- Đọc dữ liệu từ GitHub (raw, cache-buster) ---------- */
function fx_loadData_() {
  var url = RAW_URL + '?t=' + Date.now();
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { 'Cache-Control': 'no-cache' } });
  if (res.getResponseCode() !== 200) throw new Error('Không đọc được GitHub raw (' + res.getResponseCode() + ').');
  return JSON.parse(res.getContentText());
}

function fx_todayBkk_() { return Utilities.formatDate(new Date(), FX_TZ, 'yyyy-MM-dd'); }

function fx_header_(data) {
  var d = Utilities.formatDate(new Date(), FX_TZ, 'EEE dd/MM/yyyy');
  var asof = (data && data.date) ? data.date : '';
  var loc = (data && data.locale) ? data.locale : 'US / USD';
  var stale = (asof && asof !== fx_todayBkk_())
    ? '\n⚠️ <b>CẢNH BÁO: dữ liệu KHÔNG PHẢI hôm nay</b> (' + asof + ') — research task có thể đã fail hoặc push lỗi.'
    : '';
  return '✝️ <b>GenusFaith · Daily Market Research</b>\n' + d +
    '\n<i>Catholic devotional leather · nguồn: Website + Amazon + Etsy + competitor.</i>' +
    '\n<i>Dữ liệu ngày ' + asof + ' · locale ' + loc + ' · khung VN / data EN.</i>' +
    '\n<i>Metric trung thực: luôn phân biệt (listing rv) vs (shop rv) vs (shop sales).</i>' + stale;
}

/* ---------- Gửi từng khối ---------- */
function fx_sendBlock_(key, withHeader) {
  var data = fx_loadData_();
  if (withHeader) { pt_send_(fx_header_(data)); Utilities.sleep(PT_DELAY); }
  var arr = (data.blocks && data.blocks[key]) ? data.blocks[key] : null;
  if (!arr || !arr.length) {
    var nm = '';
    for (var k = 0; k < FX_BLOCKS.length; k++) if (FX_BLOCKS[k].key === key) nm = FX_BLOCKS[k].name;
    pt_send_('⚠️ <b>' + key + ' — ' + nm + '</b>: không có dữ liệu hôm nay.');
    return;
  }
  for (var i = 0; i < arr.length; i++) { pt_send_(arr[i]); Utilities.sleep(PT_DELAY); }
}

function fxSendBlock1() { fx_sendBlock_('B1', true); }
function fxSendBlock2() { fx_sendBlock_('B2', false); }
function fxSendBlock3() { fx_sendBlock_('B3', false); }
function fxSendBlock4() { fx_sendBlock_('B4', false); }
function fxSendBlock5() { fx_sendBlock_('B5', false); }
function fxSendBlock6() { fx_sendBlock_('B6', false); }
function fxSendBlock7() { fx_sendBlock_('B7', false); }  // FIX #1 — v1 thiếu hoàn toàn
function fxSendBlock8() { fx_sendBlock_('B8', false); }  // FIX #1 — khối ASIN/Listing mới

function foxeraSendAll() {
  fxSendBlock1(); fxSendBlock2(); fxSendBlock3(); fxSendBlock4();
  fxSendBlock5(); fxSendBlock6(); fxSendBlock7(); fxSendBlock8();
  Logger.log('DONE foxeraSendAll (8 blocks)');
}

function fxTestRead() {
  var d = fx_loadData_();
  var miss = [];
  for (var i = 0; i < FX_BLOCKS.length; i++) {
    var k = FX_BLOCKS[i].key;
    if (!d.blocks || !d.blocks[k] || !d.blocks[k].length) miss.push(k);
  }
  var longest = 0;
  Object.keys(d.blocks || {}).forEach(function (k) {
    d.blocks[k].forEach(function (t) { if (t.length > longest) longest = t.length; });
  });
  Logger.log('OK · date=' + d.date + ' · locale=' + (d.locale || '-') +
    ' · blocks=' + Object.keys(d.blocks).map(function (k) { return k + ':' + d.blocks[k].length; }).join(' ') +
    ' · tin dài nhất=' + longest + (longest > 3900 ? ' ⚠️ >3900!' : ' ✓') +
    (miss.length ? ' · ⚠️ THIẾU: ' + miss.join(',') : ' · đủ 8 khối') +
    (d.date !== fx_todayBkk_() ? ' · ⚠️ DATA CŨ NGÀY' : ''));
}

/* FIX #3 — cảnh báo nếu research task chết (data cũ ngày) */
function fxHealthCheck() {
  try {
    var d = fx_loadData_();
    if (d.date !== fx_todayBkk_()) {
      pt_send_('🚨 <b>GenusFaith — CẢNH BÁO HỆ THỐNG</b>\n' +
        'File <code>genusfaith-daily.json</code> vẫn là ngày <b>' + d.date + '</b>, không phải ' + fx_todayBkk_() + '.\n' +
        'Nghĩa là research task ~04:30 <b>chưa chạy</b> hoặc <b>push GitHub fail</b>.\n' +
        'FIX: kiểm tra scheduled task + PAT (Contents: Read and write cho <code>GerberaPrints/foxera-daily</code>).');
    }
  } catch (e) {
    pt_send_('🚨 <b>GenusFaith — không đọc được GitHub raw</b>\n<code>' + e.message + '</code>');
  }
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
  _fxMkTrigger_('fxSendBlock7', 7, 30);    // FIX #1
  _fxMkTrigger_('fxSendBlock8', 7, 45);    // FIX #1
  Logger.log('Installed 9 triggers 05:45–07:45 (' + FX_TZ + '). Đặt Project Time zone = Bangkok!');
}
function removeDailyTriggers() {
  var t = ScriptApp.getProjectTriggers();
  for (var i = 0; i < t.length; i++) {
    var h = t[i].getHandlerFunction();
    if (h && (h.indexOf('fxSendBlock') === 0 || h === 'fxHealthCheck')) ScriptApp.deleteTrigger(t[i]);
  }
}
