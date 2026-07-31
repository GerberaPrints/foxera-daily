/************************************************************************
 * ACCOUNTS → TELEGRAM v3 — file BỔ SUNG cho project "FoxEra - Etsy Order Tracking"
 * (dán ĐÈ file AccountsTelegram.gs; tương thích scorecard v2.26.2+)
 *
 * CHUẨN CÔNG TY (FoxEra Status Color Coding & Rating Standards v1.0 · 31/07/2026):
 *   1) Likert chất lượng 1-5 (CAO = tốt) — màu: 1 đỏ #DC2626, 2 cam #F97316,
 *      3 vàng #FACC15, 4 xanh #22C55E, 5 xanh đậm #15803D. Ngưỡng band 1.5/2.5/3.5/4.5.
 *      Telegram hiển thị: 🔴1 🟠2 🟡3 🟢4 💚5 — ĐỌC MÀU TRƯỚC, số chỉ có nghĩa trong thang của nó.
 *   2) Khẩn cấp P1-P4 (THẤP = khẩn): P1 🔴 xử lý ngay · P2 🟠 trong ngày ·
 *      P3 🟡 theo kế hoạch · P4 🟢 thường lệ. KHÔNG so số giữa 2 thang.
 *
 * NGUỒN SỐ (ưu tiên): accScorecardJSON() của file chính v2.26.2 —
 *   {code store owner seller sales rating reviews shopStatus fetchedTs
 *    orders o90 delivPct lossN lossUsd score(0-110) likert(1-5) why}
 *   Fallback: parse sheet '🏪 Accounts' (header ROW 3, cột Likert).
 * NGUỒN HÀNH ĐỘNG: foxera-accounts-daily.json (GitHub, Claude viết ~04:30)
 *   → ghép "XỬ LÝ" + priority P1-P4 theo mã E-code. Fetch fail -> vẫn gửi.
 *
 * CÀI: Script Properties TG_BOT_TOKEN + TG_CHAT_ACCOUNTS
 *   -> accTgTest() (preview) -> accTgSendNow() -> accTgInstallTrigger() (06:10).
 * LƯU Ý: dùng file này thì Ở MULTIBOT KHÔNG set CHAT_FOXACC (tránh đăng trùng).
 * NAMESPACE: file này chỉ dùng prefix accTg-/ACC_TG_ (hợp đồng với file chính).
 ************************************************************************/

var ACC_TG_RAWJSON = 'https://raw.githubusercontent.com/GerberaPrints/foxera-daily/main/foxera-accounts-daily.json';
var ACC_TG_MAXLEN  = 3900;
var ACC_TG_DELAY   = 3500;
var ACC_TG_LEGEND  = '<i>Likert: 🔴1 🟠2 🟡3 🟢4 💚5 (màu trước, số sau) · Khẩn cấp P1🔴→P4🟢</i>';

function accTg_prop_(k){ return PropertiesService.getScriptProperties().getProperty(k); }
function accTg_num_(v){ var n = parseFloat(String(v).replace(/[^\d.\-]/g,'')); return isNaN(n) ? null : n; }

// Likert -> badge màu theo band công ty (1.5/2.5/3.5/4.5). Màu trước, số sau.
function accTg_likert_(l) {
  if (l == null) return '';
  var band = (l < 1.5) ? 1 : (l < 2.5) ? 2 : (l < 3.5) ? 3 : (l < 4.5) ? 4 : 5;
  return ['','🔴','🟠','🟡','🟢','💚'][band] + (Math.round(l*10)/10);
}
// Priority hành động -> badge (P1 khẩn nhất)
function accTg_prio_(p) {
  var mm = String(p || '').toUpperCase().match(/P?([1-4])/);
  if (!mm) return 'P3 🟡';
  return 'P' + mm[1] + ' ' + ['','🔴','🟠','🟡','🟢'][+mm[1]];
}

// ---------- NGUỒN 1: API accScorecardJSON() (v2.26.2) ----------
function accTg_rows_() {
  if (typeof accScorecardJSON === 'function') {
    try {
      var arr = accScorecardJSON() || [];
      if (arr.length) {
        Logger.log('Nguồn: accScorecardJSON() — ' + arr.length + ' account.');
        return arr.map(function(x){
          return {
            code:   String(x.code || '').toUpperCase(),
            name:   String(x.code || '') + (x.store ? '-' + x.store : ''),
            score:  accTg_num_(x.score)  || 0,
            likert: accTg_num_(x.likert),
            rating: accTg_num_(x.rating),
            reviews:accTg_num_(x.reviews),
            sales:  accTg_num_(x.sales),
            orders: accTg_num_(x.orders) != null ? accTg_num_(x.orders) : accTg_num_(x.o90),
            lossUsd:accTg_num_(x.lossUsd),
            state:  String(x.shopStatus || ''),
            seller: String(x.seller || x.owner || ''),
            why:    String(x.why || '')
          };
        });
      }
    } catch(e){ Logger.log('accScorecardJSON lỗi: ' + e + ' -> fallback parse sheet.'); }
  } else Logger.log('Không thấy accScorecardJSON() -> fallback parse sheet.');
  return accTg_sheetFallback_();
}

// ---------- NGUỒN 2 (fallback): parse sheet '🏪 Accounts', header ROW 3 ----------
function accTg_sheetFallback_() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName('Accounts');
  if (!sh) {
    var c = ss.getSheets().filter(function(s){ var n=s.getName(); return /account/i.test(n) && !/team/i.test(n); });
    if (c.length) sh = c[0];
  }
  if (!sh) throw new Error('Không thấy sheet Accounts. Tabs: ' + ss.getSheets().map(function(s){return s.getName();}).join(' | '));
  var vals = sh.getDataRange().getDisplayValues();
  var hRow = -1;
  for (var r = 0; r < Math.min(vals.length, 10); r++) {
    var low = vals[r].map(function(x){ return String(x).toLowerCase(); });
    if (low.some(function(x){ return /score/.test(x); }) &&
        low.some(function(x){ return /likert|grade/.test(x); })) { hRow = r; break; }
  }
  if (hRow < 0) hRow = 2; // v2.26.x: header ROW 3
  var heads = vals[hRow].map(function(x){ return String(x).toLowerCase(); });
  function col(re){ for (var i=0;i<heads.length;i++){ if (re.test(heads[i])) return i; } return -1; }
  var m = { code: col(/code|mã|account|store/), score: col(/score/), likert: col(/likert|grade/),
            rating: col(/rating/), reviews: col(/review/), sales: col(/sale/), orders: col(/order|o90/),
            loss: col(/loss/), state: col(/status|state|shop/), seller: col(/seller|owner/), why: col(/why|note|issue/) };
  var out = [];
  for (var r2 = hRow + 1; r2 < vals.length; r2++) {
    var row = vals[r2];
    var codeCell = String(row[m.code] || '').trim();
    var mm = codeCell.match(/E\d{1,3}/i);
    if (!mm) { if (out.length) break; else continue; }
    function g(k){ return m[k] >= 0 ? String(row[m[k]] || '').trim() : ''; }
    out.push({ code: mm[0].toUpperCase(), name: codeCell, score: accTg_num_(g('score'))||0,
      likert: accTg_num_(g('likert')), rating: accTg_num_(g('rating')), reviews: accTg_num_(g('reviews')),
      sales: accTg_num_(g('sales')), orders: accTg_num_(g('orders')), lossUsd: accTg_num_(g('loss')),
      state: g('state'), seller: g('seller'), why: g('why') });
  }
  Logger.log('Nguồn: parse sheet fallback — ' + out.length + ' account.');
  return out;
}

// ---------- hành động + priority từ Claude (GitHub raw) ----------
function accTg_actions_() {
  var mp = {};
  try {
    var d = JSON.parse(UrlFetchApp.fetch(ACC_TG_RAWJSON, {muteHttpExceptions:true}).getContentText());
    (d.scores || []).forEach(function(s){
      var c = String(s.code || '').toUpperCase();
      if (c) mp[c] = { act: s.action || s.top_issue || '', prio: s.priority || '' };
    });
  } catch(e) { Logger.log('actions fetch fail: ' + e); }
  return mp;
}

// ---------- Δ so hôm qua ----------
function accTg_prev_(){ try { return JSON.parse(accTg_prop_('ACC_TG_LAST') || '{}'); } catch(e){ return {}; } }
function accTg_savePrev_(rows){
  var o = {}; rows.forEach(function(a){ o[a.code] = { score: a.score, likert: a.likert, state: a.state }; });
  PropertiesService.getScriptProperties().setProperty('ACC_TG_LAST', JSON.stringify(o));
}

// ---------- build ----------
function accTg_build_() {
  var rows = accTg_rows_();
  if (!rows.length) throw new Error('Không đọc được account nào.');
  var acts = accTg_actions_(), prev = accTg_prev_();
  var dstr = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM');
  var isDead = function(a){ return /not.?selling|suspend|block|dead|closed|❌|⛔/i.test(a.state); };
  var tierA = [], tierB = [], tierC = [], alerts = [];

  rows.forEach(function(a){
    var p = prev[a.code];
    a._delta = (p && typeof p.score === 'number') ? Math.round(a.score - p.score) : null;
    if (p && !/not.?selling|suspend|block/i.test(String(p.state||'')) && isDead(a))
      alerts.push('P1 🔴 <b>' + a.name + '</b> vừa rơi vào ĐÌNH CHỈ/BLOCKED hôm nay — xử lý NGAY!');
    if (p && a._delta !== null && a._delta <= -10 && !isDead(a))
      alerts.push('P2 🟠 <b>' + a.name + '</b> rớt ' + Math.abs(a._delta) + 'đ (' + Math.round(p.score) + '→' + Math.round(a.score) + ') — xử lý trong ngày.');
    if (isDead(a)) tierC.push(a);
    else if ((a.likert != null && a.likert >= 3.5) || a.score >= 60) tierA.push(a);
    else tierB.push(a);
  });
  var byScore = function(x,y){ return y.score - x.score; };
  tierA.sort(byScore); tierB.sort(byScore); tierC.sort(byScore);

  function avgLikert(arr){
    var v = arr.filter(function(a){ return a.likert != null; });
    if (!v.length) return '';
    var s = v.reduce(function(t,a){ return t + a.likert; }, 0) / v.length;
    return ' · Avg ' + accTg_likert_(s);
  }
  function line(a, detail) {
    var d = (a._delta === null || a._delta === 0) ? '' : (a._delta > 0 ? ' ▲+' + a._delta : ' ▼' + a._delta);
    var s = '<b>' + a.name + '</b> — ' + accTg_likert_(a.likert) + ' · ' + Math.round(a.score) + 'đ' + d;
    var bits = [];
    if (a.rating != null) bits.push(a.rating + '★' + (a.reviews != null ? '(' + a.reviews + ')' : ''));
    if (a.orders != null) bits.push(a.orders + ' đơn/90d'); else if (a.sales != null) bits.push(a.sales + ' sales');
    if (a.lossUsd) bits.push('loss $' + a.lossUsd);
    if (a.seller) bits.push(a.seller);
    if (bits.length) s += '\n• ' + bits.join(' · ');
    var ac = acts[a.code];
    if (detail && ac && ac.act) s += '\n• ' + accTg_prio_(ac.prio) + ' XỬ LÝ: ' + ac.act;
    else if (detail && a.why) s += '\n• ⚠️ ' + a.why;
    return s;
  }

  var msgs = [];
  if (alerts.length) msgs.push('<b>🚨 ALERT ' + dstr + '</b>\n' + ACC_TG_LEGEND + '\n\n' + alerts.join('\n'));
  msgs = msgs.concat(accTg_chunk_(
    '<b>💚 BLOCK A — ĐANG CHẠY (' + tierA.length + ')' + avgLikert(tierA) + ' · ' + dstr + '</b>\n' + ACC_TG_LEGEND + '\n\n',
    tierA.map(function(a){ return line(a, true); }),
    '\n👉 <b>Chốt:</b> làm theo thứ tự P1 → P4; account có ▼ ưu tiên soi trước.'));
  if (tierB.length)
    msgs = msgs.concat(accTg_chunk_('<b>🟡 BLOCK B — THEO DÕI/DORMANT (' + tierB.length + ')' + avgLikert(tierB) + ' · ' + dstr + '</b>\n\n',
      tierB.map(function(a){ return line(a, a._delta !== null && a._delta !== 0); }),
      '\n👉 <b>Chốt:</b> chỉ hành động với account biến động; còn lại quyết giữ/gộp/buông chu kỳ 2 tuần.'));
  var deadNew = alerts.some(function(x){ return x.indexOf('ĐÌNH CHỈ') >= 0; });
  if (tierC.length && (deadNew || !accTg_prop_('ACC_TG_LAST')))
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

function accTg_send_(text) {
  var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + accTg_prop_('TG_BOT_TOKEN') + '/sendMessage', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ chat_id: accTg_prop_('TG_CHAT_ACCOUNTS'), text: text, parse_mode: 'HTML', disable_web_page_preview: true })
  });
  if (res.getResponseCode() !== 200) Logger.log('TG fail: ' + res.getContentText());
}

// ====== HÀM CHẠY ======
function accTgTest() {
  var b = accTg_build_();
  Logger.log('Đọc được ' + b.rows.length + ' account. ' + b.msgs.length + ' tin sẽ gửi:');
  b.msgs.forEach(function(m,i){ Logger.log('--- TIN ' + (i+1) + ' (' + m.length + ' ký tự) ---\n' + m); });
}
function accTgSendNow() {
  var b = accTg_build_();
  b.msgs.forEach(function(m){ accTg_send_(m); Utilities.sleep(ACC_TG_DELAY); });
  accTg_savePrev_(b.rows);
}
function accTgInstallTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t){ if (t.getHandlerFunction() === 'accTgSendNow') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('accTgSendNow').timeBased().atHour(6).nearMinute(10).everyDays(1).create();
  Logger.log('Đã cài trigger accTgSendNow ~06:10 hằng ngày (timezone Bangkok).');
}
