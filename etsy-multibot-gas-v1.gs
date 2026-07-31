/************************************************************************
 * ETSY MULTIBOT — 1 Apps Script cho TẤT CẢ dự án Daily Market Research — v1 (29/07/2026)
 *
 * THAY THẾ: 5 Google Sheet + 5 project GAS riêng lẻ (FoxEra / GenusFaith / Gritfell /
 * Gerbera-Market / FoxEra-Job). Các GAS cũ KHÔNG hề dùng SpreadsheetApp — Sheet chỉ là
 * "vỏ" chứa script, hoàn toàn không cần thiết. Bản này chạy dạng STANDALONE
 * (script.google.com -> New project), không cần Sheet nào cả.
 *
 * KIẾN TRÚC: Claude research (~04:30 BKK) --git push--> repo foxera-daily (GitHub =
 * nguồn dữ liệu DUY NHẤT, đã gộp sẵn) --raw--> script NÀY (1 bộ trigger chung)
 * --> từng nhóm Telegram riêng của mỗi dự án.
 *
 * TÍNH NĂNG (port đủ từ GenusFaith v3 + Gritfell v2):
 *  - AUTO-DETECT khối B1..BN từ JSON — thêm khối mới KHÔNG cần sửa code (hết bệnh "B7 mồ côi").
 *  - STALE-GATE: data không phải hôm nay -> đăng ĐÚNG 1 cảnh báo / dự án rồi skip, không spam bản cũ.
 *  - DELTA SWEEP 12:30 + 19:30: run bổ sung push thêm tin sau giờ gửi sáng -> chỉ gửi phần MỚI
 *    (sổ đã-gửi riêng từng dự án trong Script Properties, key SENT_<id>).
 *  - Cô lập lỗi: 1 dự án lỗi (JSON hỏng / chat sai) KHÔNG chặn các dự án còn lại (try/catch từng vòng).
 *  - Markdown [text](url) -> <a href>; HTML fail -> gửi lại plain-text; tự cắt tin > 3900 ký tự.
 *  - Token/chat đọc từ Script Properties — KHÔNG dán token vào file (repo public).
 *
 * CÀI ĐẶT (1 lần):
 *  1) script.google.com -> New project (standalone) -> dán file này.
 *  2) Project Settings -> Time zone = (GMT+07:00) Bangkok.
 *  3) Script Properties:
 *       BOT_TOKEN      = token bot Telegram (dùng chung 1 bot cho mọi nhóm)
 *       CHAT_FOXERA    = -100xxxx (nhóm 'Etsy - Daily Market Research Report')
 *       CHAT_GENUSFAITH= -4990055415
 *       CHAT_GRITFELL  = -100xxxx
 *       CHAT_GERBERA   = -100xxxx
 *       CHAT_FOXJOB    = -100xxxx
 *     (dự án nào chưa điền CHAT_* thì tự động bỏ qua, không lỗi.)
 *  4) mbTestRead()        -> log phải thấy từng dự án FRESH/STALE + số khối.
 *  5) mbSendAllNow()      -> test đẩy full 1 lần.
 *  6) mbInstallTriggers() -> cài 4 trigger chung (health 05:45 · send 06:00 · delta 12:30 & 19:30).
 *  7) Xoá 5 project GAS cũ + xoá các Google Sheet "vỏ" (sau khi test OK 2-3 ngày).
 ************************************************************************/

const MB_TZ    = 'Asia/Bangkok';
const MB_DELAY = 3500; // ms giữa 2 tin (chống rate-limit Telegram)
const MB_RAW   = 'https://raw.githubusercontent.com/GerberaPrints/foxera-daily/main/';

// ====== DANH SÁCH DỰ ÁN — thêm dự án mới = thêm 1 dòng ======
const MB_PROJECTS = [
  { id: 'FOXERA',     label: '🧵 FoxEra',        file: 'foxera-daily.json' },
  { id: 'GENUSFAITH', label: '✝️ GenusFaith',    file: 'genusfaith-daily.json' },
  { id: 'GRITFELL',   label: '🏋️ Gritfell',      file: 'gritfell-daily.json' },
  { id: 'GERBERA',    label: '🌼 Gerbera Market', file: 'gerbera-market.json' },
  { id: 'FOXJOB',     label: '💼 FoxEra Job',    file: 'foxera-job.json' },
  { id: 'FOXACC',     label: '🏪 FoxEra Accounts', file: 'foxera-accounts-daily.json' }
];

// ====== props ======
function mb_prop_(k) { return PropertiesService.getScriptProperties().getProperty(k); }
function mb_token_() { return mb_prop_('BOT_TOKEN'); }
function mb_chat_(p) { return mb_prop_('CHAT_' + p.id); }

// ====== Telegram ======
function mb_api_(method, payload) {
  var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + mb_token_() + '/' + method, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify(payload), muteHttpExceptions: true
  });
  var j; try { j = JSON.parse(res.getContentText()); } catch (e) { j = { ok: false }; }
  return j;
}

function mb_mdSafe_(s) { // [text](url) -> <a href> (lưới an toàn nếu research lỡ viết Markdown)
  return String(s).replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
}

function mb_split_(s) { // cắt < 3900 ký tự theo dòng
  var out = [], cur = '';
  String(s).split('\n').forEach(function (line) {
    if ((cur + '\n' + line).length > 3900) { if (cur) out.push(cur); cur = line; }
    else cur = cur ? cur + '\n' + line : line;
  });
  if (cur) out.push(cur);
  return out;
}

function mb_send_(chatId, text) {
  var parts = mb_split_(mb_mdSafe_(text));
  for (var i = 0; i < parts.length; i++) {
    var r = mb_api_('sendMessage', { chat_id: chatId, text: parts[i], parse_mode: 'HTML', disable_web_page_preview: true });
    if (!r.ok) { // HTML fail -> plain fallback
      mb_api_('sendMessage', { chat_id: chatId, text: parts[i].replace(/<[^>]+>/g, ''), disable_web_page_preview: true });
    }
    Utilities.sleep(MB_DELAY);
  }
}

// ====== đọc JSON từ GitHub ======
function mb_fetch_(p) {
  var res = UrlFetchApp.fetch(MB_RAW + p.file + '?t=' + Date.now(), {
    muteHttpExceptions: true, headers: { 'Cache-Control': 'no-cache' }
  });
  if (res.getResponseCode() !== 200) throw new Error('HTTP ' + res.getResponseCode());
  return JSON.parse(res.getContentText());
}
function mb_today_() { return Utilities.formatDate(new Date(), MB_TZ, 'yyyy-MM-dd'); }
function mb_isFresh_(d) { return String(d.date || '').substring(0, 10) === mb_today_(); }

// ====== sổ đã-gửi (delta sweep) — riêng từng dự án ======
function mb_ledger_(p) {
  var raw = mb_prop_('SENT_' + p.id);
  var s = raw ? JSON.parse(raw) : {};
  if (s._date !== mb_today_()) s = { _date: mb_today_() }; // sang ngày mới -> reset
  return s;
}
function mb_ledgerSave_(p, s) { PropertiesService.getScriptProperties().setProperty('SENT_' + p.id, JSON.stringify(s)); }

// ====== gửi 1 dự án (mode: 'full' = sáng, 'delta' = quét bổ sung) ======
function mb_sendProject_(p, mode) {
  var chat = mb_chat_(p);
  if (!chat) { Logger.log(p.id + ': chưa cấu hình CHAT_' + p.id + ' -> skip'); return; }
  var d;
  try { d = mb_fetch_(p); } catch (e) { Logger.log(p.id + ' fetch lỗi: ' + e); return; }

  if (!mb_isFresh_(d)) { // STALE-GATE: 1 cảnh báo / ngày / dự án, không spam bản cũ
    var led = mb_ledger_(p);
    if (mode === 'full' && !led._staleWarned) {
      mb_send_(chat, '⚠️ <b>' + p.label + ' — DỮ LIỆU CHƯA CẬP NHẬT HÔM NAY</b>\nFile trên GitHub vẫn là ngày <b>' +
        String(d.date).substring(0, 10) + '</b> → research task chưa chạy/push thành công.\nKHÔNG đăng bản cũ để tránh nhầm là báo cáo mới.');
      led._staleWarned = true; mb_ledgerSave_(p, led);
    }
    return;
  }

  var led = mb_ledger_(p);
  var keys = Object.keys(d.blocks || {}).sort(function (a, b) { // B1..B10 đúng thứ tự số
    return parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10);
  });
  keys.forEach(function (k) {
    var msgs = d.blocks[k] || [];
    var sent = led[k] || 0;
    for (var i = sent; i < msgs.length; i++) mb_send_(chat, msgs[i]); // delta: chỉ gửi phần APPEND mới
    led[k] = msgs.length;
  });
  mb_ledgerSave_(p, led);
  Logger.log(p.id + ' (' + mode + '): OK, ' + keys.length + ' khối.');
}

// ====== entry points (mỗi dự án bọc try/catch — 1 dự án lỗi không chặn dự án khác) ======
function mbSendAllNow()  { MB_PROJECTS.forEach(function (p) { try { mb_sendProject_(p, 'full');  } catch (e) { Logger.log(p.id + ' FAIL: ' + e); } }); }
function mbDeltaSweep()  { MB_PROJECTS.forEach(function (p) { try { mb_sendProject_(p, 'delta'); } catch (e) { Logger.log(p.id + ' FAIL: ' + e); } }); }

// health 05:45: GOM 1 tin trạng thái mọi dự án -> gửi vào nhóm FoxEra (nhóm điều hành)
function mbHealthCheck() {
  var lines = ['🩺 <b>Multibot health ' + mb_today_() + '</b>'];
  MB_PROJECTS.forEach(function (p) {
    try {
      var d = mb_fetch_(p);
      var h = d.health ? (' · health: ' + (d.health.status || '?')) : '';
      lines.push((mb_isFresh_(d) ? '✅ ' : '⚠️ ') + p.label + ' — ' + String(d.date).substring(0, 10) +
                 ' · ' + Object.keys(d.blocks || {}).length + ' khối' + h);
    } catch (e) { lines.push('❌ ' + p.label + ' — fetch lỗi: ' + e); }
  });
  var opsChat = mb_chat_(MB_PROJECTS[0]); // nhóm FoxEra làm nhóm điều hành
  if (opsChat) mb_send_(opsChat, lines.join('\n'));
  Logger.log(lines.join('\n'));
}

// ====== test & triggers ======
function mbTestRead() {
  MB_PROJECTS.forEach(function (p) {
    try {
      var d = mb_fetch_(p);
      Logger.log(p.id + ': ' + (mb_isFresh_(d) ? 'FRESH' : 'STALE(' + d.date + ')') +
                 ' · khối: ' + Object.keys(d.blocks || {}).join(',') +
                 ' · CHAT_' + p.id + '=' + (mb_chat_(p) ? 'OK' : 'CHƯA CÀI'));
    } catch (e) { Logger.log(p.id + ' LỖI: ' + e); }
  });
  Logger.log('BOT_TOKEN: ' + (mb_token_() ? 'OK (Script Properties)' : '❌ CHƯA CÀI'));
}

function mbInstallTriggers() {
  // xoá trigger cũ của chính script này (idempotent)
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['mbHealthCheck', 'mbSendAllNow', 'mbDeltaSweep'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('mbHealthCheck').timeBased().atHour(5).nearMinute(45).everyDays(1).create();
  ScriptApp.newTrigger('mbSendAllNow').timeBased().atHour(6).nearMinute(0).everyDays(1).create();
  ScriptApp.newTrigger('mbDeltaSweep').timeBased().atHour(12).nearMinute(30).everyDays(1).create();
  ScriptApp.newTrigger('mbDeltaSweep').timeBased().atHour(19).nearMinute(30).everyDays(1).create();
  Logger.log('Đã cài 4 trigger: health 05:45 · send 06:00 · delta 12:30 & 19:30 (giờ Bangkok).');
}
