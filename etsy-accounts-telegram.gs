/************************************************************************
 * ACCOUNTS → TELEGRAM — file BỔ SUNG cho project "FoxEra - Etsy Order Tracking"
 * (dán làm FILE MỚI trong cùng project GAS v2.26.0+, KHÔNG đè file chính)
 *
 * NGUỒN SỐ: sheet 'Accounts' (ACCOUNT SCORECARD v2.26.0 — SCORE 0-110, Grade A-F,
 *   sales/rating/orders/loss do etsyShopFetchAuto 04:30 tự cập nhật).
 * NGUỒN HÀNH ĐỘNG: foxera-accounts-daily.json trên GitHub (Claude viết mỗi sáng ~04:30)
 *   → ghép dòng "⚠️ XỬ LÝ" cho từng account. Fetch fail -> vẫn gửi, chỉ thiếu dòng action.
 *
 * CÀI (1 lần):
 *  1) Project Settings -> Script Properties, thêm:
 *       TG_BOT_TOKEN     = token bot Telegram
 *       TG_CHAT_ACCOUNTS = chat_id nhóm nhận báo cáo (vd -100xxxx)
 *  2) Chạy accTgTest()   -> xem Log: số account đọc được + preview tin (KHÔNG gửi).
 *  3) Chạy accTgSendNow() -> gửi thật 1 lần.
 *  4) Chạy accTgInstallTrigger() -> tự gửi daily 06:10 (sau khi etsyShopFetchAuto 04:30 chạy xong).
 *  LƯU Ý: nếu dùng file này thì Ở MULTIBOT KHÔNG set CHAT_FOXACC (tránh đăng trùng).
 ************************************************************************/

var ACC_TG_SHEET   = 'Accounts';
var ACC_TG_RAWJSON = 'https://raw.githubusercontent.com/GerberaPrints/foxera-daily/main/foxera-accounts-daily.json';
var ACC_TG_MAXLEN  = 3900;
var ACC_TG_DELAY   = 3500;

function accTg_prop_(k){ return PropertiesService.getScriptProperties().getProperty(k); }

// ---------- đọc sheet Accounts (header-driven, không phụ thuộc vị trí cột) ----------
function accTg_readAccounts_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(ACC_TG_SHEET);
  if (!sh) throw new Error("Không thấy sheet '" + ACC_TG_SHEET + "' — chạy scorecard (etsyShopFetchAuto) trước.");
  var vals = sh.getDataRange().getDisplayValues();
  // tìm hàng header: có ô match 'account' hoặc 'store' VÀ ô match 'score'
  var hRow = -1, map = {};
  for (var r = 0; r < Math.min(vals.length, 15); r++) {
    var low = vals[r].map(function(x){ return String(x).toLowerCase(); });
    var hasAcc = low.some(function(x){ return /account|store/.test(x); });
    var hasScore = low.some(function(x){ return /score/.test(x); });
    if (hasAcc && hasScore) { hRow = r; break; }
  }
  if (hRow < 0) throw new Error("Không tìm thấy header (cột Account + Score) trong sheet Accounts.");
  var heads = vals[hRow].map(function(x){ return String(x).toLowerCase(); });
  function col(re){ for (var i=0;i<heads.length;i++){ if (re.test(heads[i])) return i; } return -1; }
  map = {
    account: col(/account|store/), score: col(/score/), grade: col(/grade/),
    rating: col(/rating/), reviews: col(/review/), sales: col(/sale/),
    orders: col(/order/), loss: col(/loss/), state: col(/state|status|not.?selling|blocked/),
    seller: col(/seller|owner/), velocity: col(/velocit|90d|\/90/), note: col(/note|issue/)
  };
  var out = [];
  for (var r2 = hRow + 1; r2 < vals.length; r2++) {
    var row = vals[r2];
    var acc = String(row[map.account] || '').trim();
    if (!acc) { if (out.length) break; else continue; }          // hết bảng per-account (trước rollup per-seller)
    if (/^per.?seller|rollup|tổng/i.test(acc)) break;
    var g = function(k){ return map[k] >= 0 ? String(row[map[k]] || '').trim() : ''; };
    out.push({
      account: acc, score: parseFloat(g('score')) || 0, grade: g('grade').toUpperCase(),
      rating: g('rating'), reviews: g('reviews'), sales: g('sales'), orders: g('orders'),
      loss: g('loss'), state: g('state'), seller: g('seller'), velocity: g('velocity'), note: g('note')
    });
  }
  return out;
}

// ---------- action từ Claude (GitHub raw) ----------
function accTg_actions_() {
  var m = {};
  try {
    var d = JSON.parse(UrlFetchApp.fetch(ACC_TG_RAWJSON, {muteHttpExceptions:true}).getContentText());
    (d.scores || []).forEach(function(s){
      var code = String(s.code || '').toUpperCase();
      if (code) m[code] = { action: s.action || '', issue: s.top_issue || '', date: d.date || '' };
    });
  } catch(e) { Logger.log('actions fetch fail: ' + e); }
  return m;
}
function accTg_code_(name){ var m = String(name).match(/^(E\d{1,3})/i); return m ? m[1].toUpperCase() : String(name).toUpperCase(); }

// ---------- Δ so hôm qua (Script Properties) ----------
function accTg_prev_(){ try { return JSON.parse(accTg_prop_('ACC_TG_LAST') || '{}'); } catch(e){ return {}; } }
function accTg_savePrev_(rows){
  var o = {}; rows.forEach(function(a){ o[accTg_code_(a.account)] = {score:a.score, grade:a.grade, state:a.state}; });
  PropertiesService.getScriptProperties().setProperty('ACC_TG_LAST', JSON.stringify(o));
}

// ---------- build tin ----------
function accTg_build_() {
  var rows = accTg_readAccounts_();
  if (!rows.length) throw new Error('Sheet Accounts rỗng.');
  var acts = accTg_actions_(), prev = accTg_prev_();
  var dstr = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM');
  var isDead = function(a){ return /not.?selling|suspend|block|dead|❌|⛔/i.test(a.state) || a.grade === 'F'; };
  var tierA = [], tierB = [], tierC = [], alerts = [];

  rows.forEach(function(a){
    var code = accTg_code_(a.account), p = prev[code];
    a._code = code;
    a._delta = (p && typeof p.score === 'number') ? Math.round(a.score - p.score) : null;
    if (p && !( /not.?selling|suspend|block/i.test(p.state||'') ) && isDead(a))
      alerts.push('🔴 <b>' + a.account + '</b> vừa rơi vào ĐÌNH CHỈ/BLOCKED hôm nay!');
    if (p && a._delta !== null && a._delta <= -10 && !isDead(a))
      alerts.push('⚠️ <b>' + a.account + '</b> rớt ' + Math.abs(a._delta) + ' điểm (' + Math.round(p.score) + '→' + Math.round(a.score) + ').');
    if (isDead(a)) tierC.push(a);
    else if (/^[AB]/.test(a.grade) || a.score >= 60) tierA.push(a);
    else tierB.push(a);
  });
  var byScore = function(x,y){ return y.score - x.score; };
  tierA.sort(byScore); tierB.sort(byScore); tierC.sort(byScore);

  function line(a, detail) {
    var d = (a._delta === null || a._delta === 0) ? '' : (a._delta > 0 ? ' ▲+' + a._delta : ' ▼' + a._delta);
    var s = '<b>' + a.account + '</b> — ' + Math.round(a.score) + 'đ' + (a.grade ? ' (' + a.grade + ')' : '') + d;
    var bits = [];
    if (a.rating) bits.push(a.rating + '★' + (a.reviews ? '(' + a.reviews + ')' : ''));
    if (a.orders) bits.push(a.orders + ' đơn'); else if (a.sales) bits.push(a.sales + ' sales');
    if (a.loss) bits.push('loss ' + a.loss);
    if (a.seller) bits.push(a.seller);
    if (bits.length) s += '\n• ' + bits.join(' · ');
    var act = acts[a._code];
    if (detail && act && (act.action || act.issue))
      s += '\n• ⚠️ XỬ LÝ: ' + (act.action || act.issue);
    else if (detail && a.note) s += '\n• ⚠️ ' + a.note;
    return s;
  }

  var msgs = [];
  if (alerts.length) msgs.push('<b>🚨 ALERT ' + dstr + '</b>\n\n' + alerts.join('\n'));
  var head = '<b>🟢 BLOCK A — ĐANG CHẠY (' + tierA.length + ') · ' + dstr + '</b>\n<i>Nguồn: scorecard Accounts (GAS fetch 04:30) + hành động từ Claude daily</i>\n\n';
  msgs = msgs.concat(accTg_chunk_(head, tierA.map(function(a){ return line(a, true); }),
    '\n👉 <b>Chốt:</b> ưu tiên xử lý account có ▼ hoặc dòng XỬ LÝ đỏ trước.'));
  if (tierB.length)
    msgs = msgs.concat(accTg_chunk_('<b>🟡 BLOCK B — THEO DÕI/DORMANT (' + tierB.length + ') · ' + dstr + '</b>\n\n',
      tierB.map(function(a){ return line(a, a._delta !== null && a._delta !== 0); }),
      '\n👉 <b>Chốt:</b> chỉ hành động với account có biến động; còn lại quyết giữ/gộp/buông theo chu kỳ 2 tuần.'));
  var deadNew = alerts.some(function(x){ return x.indexOf('ĐÌNH CHỈ') >= 0; });
  if (deadNew || !accTg_prop_('ACC_TG_LAST')) // lần đầu hoặc có shop mới chết -> liệt kê đầy đủ
    msgs = msgs.concat(accTg_chunk_('<b>🔴 BLOCK C — ĐÌNH CHỈ/BLOCKED (' + tierC.length + ') · ' + dstr + '</b>\n\n',
      tierC.map(function(a){ return line(a, false); }), ''));
  else
    msgs.push('<b>🔴 BLOCK C · ' + dstr + ':</b> ' + tierC.length + ' shop đình chỉ — 0 shop MỚI hôm nay ✅');
  return { msgs: msgs, rows: rows };
}

function accTg_chunk_(head, lines, foot) {
  var out = [], cur = head;
  lines.forEach(function(l){
    if ((cur + l + foot).length > ACC_TG_MAXLEN) { out.push(cur.replace(/\n+$/,'')); cur = head.replace('</b>', ' (tiếp)</b>'); }
    cur += l + '\n\n';
  });
  out.push((cur + foot).replace(/\n{3,}/g,'\n\n'));
  return out;
}

// ---------- gửi ----------
function accTg_send_(text) {
  var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + accTg_prop_('TG_BOT_TOKEN') + '/sendMessage', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ chat_id: accTg_prop_('TG_CHAT_ACCOUNTS'), text: text, parse_mode: 'HTML', disable_web_page_preview: true })
  });
  if (res.getResponseCode() !== 200) Logger.log('TG fail: ' + res.getContentText());
}

// ====== HÀM CHẠY ======
function accTgTest() {            // preview, KHÔNG gửi
  var b = accTg_build_();
  Logger.log('Đọc được ' + b.rows.length + ' account. ' + b.msgs.length + ' tin sẽ gửi:');
  b.msgs.forEach(function(m,i){ Logger.log('--- TIN ' + (i+1) + ' (' + m.length + ' ký tự) ---\n' + m); });
}
function accTgSendNow() {         // gửi thật + lưu mốc Δ
  var b = accTg_build_();
  b.msgs.forEach(function(m){ accTg_send_(m); Utilities.sleep(ACC_TG_DELAY); });
  accTg_savePrev_(b.rows);
}
function accTgInstallTrigger() {  // daily 06:10 BKK
  ScriptApp.getProjectTriggers().forEach(function(t){ if (t.getHandlerFunction() === 'accTgSendNow') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('accTgSendNow').timeBased().atHour(6).nearMinute(10).everyDays(1).create();
  Logger.log('Đã cài trigger accTgSendNow ~06:10 hằng ngày (timezone project phải là Bangkok).');
}
