/************************************************************************
 * GritFell · DAILY MARKET RESEARCH + ADS -> TELEGRAM  (GitHub) — bot GritFell · GAS v2
 * Ngành: áo outdoor NAM (câu cá + săn bắn), thị trường US.
 * TÁCH BIỆT với bot Etsy & bot Job: token/nhóm/file dữ liệu riêng (gritfell-daily.json).
 * Có CHỐT CHẶN STALE: file không phải hôm nay → chỉ đăng 1 cảnh báo (không đăng bản cũ).
 *
 * v2 (18/07/2026): thêm B7 (Ads & Hook radar) — sender fxSendBlock7 + trigger 08:30.
 *   Bài học GenusFaith: GAS thiếu sender = khối "mồ côi", không bao giờ lên Telegram.
 *
 * CÀI: mở project Apps Script hiện có, THAY TOÀN BỘ bằng file này. TZ = Bangkok.
 *   Chạy fxTestRead (kiểm) → gritfellSendAll (test) → installDailyTriggers (cài lại lịch —
 *   hàm này tự xoá trigger cũ trước khi cài, không bị trùng).
 ************************************************************************/

const PT_TOKEN = '8788178603:AAGwnrDjAiC7PsM_m86HghP0uyMOsOO3cEU';   // bot GritFell
const PT_CHAT  = '-5145103118';                                     // nhóm GritFell - Daily Market Research
const PT_DELAY = 3500;
const FX_TZ    = 'Asia/Bangkok';
const RAW_URL  = 'https://raw.githubusercontent.com/GerberaPrints/foxera-daily/main/gritfell-daily.json';

function pt_api_(method, payload) {
  for (var a = 0; a < 4; a++) {
    var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + PT_TOKEN + '/' + method, {
      method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
    var d = JSON.parse(res.getContentText());
    if (d.ok) return d;
    if (d.error_code === 429 && d.parameters && d.parameters.retry_after) { Utilities.sleep((d.parameters.retry_after + 1) * 1000); continue; }
    Logger.log(method + ' ERR: ' + res.getContentText()); return d;
  }
  return { ok: false };
}
// FIX (bài học GenusFaith): cắt theo RANH GIỚI DÒNG, KHÔNG cắt giữa thẻ <a href>/<b> → tránh Telegram 400 "can't parse entities" làm MẤT tin. Hỏng HTML → fallback plain-text.
function pt_chunk_(html, max) {
  max = max || 3900;
  if (html.length <= max) return [html];
  var lines = html.split('\n'), out = [], cur = '';
  for (var i = 0; i < lines.length; i++) {
    var ln = lines[i];
    if (ln.length > max) { if (cur) { out.push(cur); cur = ''; } for (var j = 0; j < ln.length; j += max) out.push(ln.substring(j, j + max)); continue; }
    if ((cur + '\n' + ln).length > max) { out.push(cur); cur = ln; } else { cur = cur ? (cur + '\n' + ln) : ln; }
  }
  if (cur) out.push(cur);
  return out;
}
function pt_send_(html) {
  // Lưới an toàn: lỡ có link Markdown [text](url) → đổi sang <a href> để HTML parse_mode hiển thị bấm được (không hiện chữ thô).
  html = String(html).replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
  var parts = pt_chunk_(html, 3900);
  for (var i = 0; i < parts.length; i++) {
    var r = pt_api_('sendMessage', { chat_id: PT_CHAT, text: parts[i], parse_mode: 'HTML', disable_web_page_preview: true });
    if (!r.ok) { Logger.log('HTML fail -> plain fallback: ' + parts[i].substring(0, 80)); pt_api_('sendMessage', { chat_id: PT_CHAT, text: parts[i].replace(/<[^>]+>/g, ''), disable_web_page_preview: true }); }
    if (i < parts.length - 1) Utilities.sleep(1200);
  }
}

function fx_loadData_() {
  var res = UrlFetchApp.fetch(RAW_URL + '?t=' + Date.now(), { muteHttpExceptions: true, headers: { 'Cache-Control': 'no-cache' } });
  if (res.getResponseCode() !== 200) throw new Error('Không đọc được GitHub raw (' + res.getResponseCode() + ').');
  return JSON.parse(res.getContentText());
}
function fx_today_() { return Utilities.formatDate(new Date(), FX_TZ, 'yyyy-MM-dd'); }
function fx_dataDate_(data) { return String((data && data.date) || '').substring(0, 10); }
function fx_isStale_(data) { return fx_dataDate_(data) !== fx_today_(); }

function fx_header_(data) {
  var d = Utilities.formatDate(new Date(), FX_TZ, 'EEE dd/MM/yyyy');
  return '🎣🦆 <b>GritFell · Daily Market Research + Ads</b>\n' + d + ' · áo outdoor nam · câu cá + săn bắn · US\n<i>Dữ liệu ngày ' + fx_dataDate_(data) + ' · khung VN / data EN · metric trung thực.</i>';
}
function fx_staleMsg_(data) {
  return '⚠️ <b>GritFell — DỮ LIỆU CHƯA CẬP NHẬT HÔM NAY</b>\n' +
    Utilities.formatDate(new Date(), FX_TZ, 'EEE dd/MM/yyyy') + '\n' +
    'File GitHub vẫn là ngày <b>' + (fx_dataDate_(data) || '?') + '</b> → research task 05:30 <b>chưa chạy/push thành công</b>.\n' +
    'KHÔNG đăng bản cũ. Kiểm tra scheduled task "🎣 GritFell · ALL-IN-ONE (Research + Ads) v4 · 05:30".';
}

function fx_sendBlock_(key, isFirst) {
  var data = fx_loadData_();
  if (fx_isStale_(data)) {
    if (isFirst) pt_send_(fx_staleMsg_(data));
    Logger.log('STALE: data=' + fx_dataDate_(data) + ' today=' + fx_today_() + ' -> skip ' + key);
    return;
  }
  if (isFirst) { pt_send_(fx_header_(data)); Utilities.sleep(PT_DELAY); }
  var arr = (data.blocks && data.blocks[key]) ? data.blocks[key] : ['⚠️ ' + key + ': không có dữ liệu hôm nay.'];
  for (var i = 0; i < arr.length; i++) { pt_send_(arr[i]); Utilities.sleep(PT_DELAY); }
}
function fxSendBlock1() { fx_sendBlock_('B1', true); }
function fxSendBlock2() { fx_sendBlock_('B2', false); }
function fxSendBlock3() { fx_sendBlock_('B3', false); }
function fxSendBlock4() { fx_sendBlock_('B4', false); }
function fxSendBlock5() { fx_sendBlock_('B5', false); }
function fxSendBlock6() { fx_sendBlock_('B6', false); }
function fxSendBlock7() { fx_sendBlock_('B7', false); }   // v2: Ads & Hook radar

function gritfellSendAll() { fxSendBlock1(); fxSendBlock2(); fxSendBlock3(); fxSendBlock4(); fxSendBlock5(); fxSendBlock6(); fxSendBlock7(); }

function fxTestRead() {
  var d = fx_loadData_();
  Logger.log((fx_isStale_(d) ? '⚠️ STALE ' : '✅ FRESH ') + 'data=' + fx_dataDate_(d) + ' today=' + fx_today_() +
    ' · blocks=' + Object.keys(d.blocks).map(function (k) { return k + ':' + d.blocks[k].length; }).join(' '));
}

/* Health-check chủ động (bài học GenusFaith): chạy TRƯỚC giờ gửi — data cũ/không đọc được → cảnh báo 1 lần, không lẫn vào block 1. */
function fxHealthCheck() {
  try { var d = fx_loadData_(); if (fx_isStale_(d)) pt_send_(fx_staleMsg_(d)); }
  catch (e) { pt_send_('🚨 <b>GritFell — không đọc được GitHub raw</b>\n<code>' + e.message + '</code>'); }
}

function _fxMkTrigger_(fn, hour, minute) { ScriptApp.newTrigger(fn).timeBased().atHour(hour).nearMinute(minute).everyDays(1).create(); }
function installDailyTriggers() {
  removeDailyTriggers();
  _fxMkTrigger_('fxHealthCheck', 6, 45);
  _fxMkTrigger_('fxSendBlock1', 7, 0);  _fxMkTrigger_('fxSendBlock2', 7, 15); _fxMkTrigger_('fxSendBlock3', 7, 30);
  _fxMkTrigger_('fxSendBlock4', 7, 45); _fxMkTrigger_('fxSendBlock5', 8, 0);  _fxMkTrigger_('fxSendBlock6', 8, 15);
  _fxMkTrigger_('fxSendBlock7', 8, 30); // v2: Ads & Hook radar
  Logger.log('Installed health-check 06:45 + 7 block triggers 07:00-08:30 (' + FX_TZ + ').');
}
function removeDailyTriggers() {
  var t = ScriptApp.getProjectTriggers();
  for (var i = 0; i < t.length; i++) { var h = t[i].getHandlerFunction(); if (h && (h.indexOf('fxSendBlock') === 0 || h === 'fxHealthCheck')) ScriptApp.deleteTrigger(t[i]); }
}
