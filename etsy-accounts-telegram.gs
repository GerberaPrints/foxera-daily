/************************************************************************
 * ACCOUNTS → TELEGRAM v5.2 — file BỔ SUNG cho project "FoxEra - Etsy Order Tracking"
 * (dán ĐÈ AccountsTelegram.gs; tương thích scorecard v2.30+)
 *
 * v5.2 (31/07 đêm — quy tắc MỘT ĐỒNG HỒ của Hub): action từ accScorecardJSON()
 *   là CHUẨN phân nhóm — 🔴 chỉ khi action bắt đầu ⚡/🚨/⛔/❓; ✅/🌱 luôn 🟢
 *   bất kể P của Cloud. P daily.json chỉ in THAM KHẢO. daily.json cũ >24h
 *   -> in cảnh báo stale + bỏ tham chiếu Cloud, không trộn 2 nhịp data.
 * v5 (31/07 — spec exception-first của Hub v2.31): bản tin ~15 dòng.
 *   🔴 LÀM HÔM NAY (action ⚡🚨⛔❓ hoặc P1) · 🟡 THEO DÕI (🔧📈⏳🪧💬)
 *   🟢 KHỎE = 1 DÒNG tổng (Σ Δ7d, không liệt kê) · 🗂️ ĐÓNG SỔ = 1 dòng đếm.
 *   Action lấy từ rule engine của Hub (accScorecardJSON().action) + Δ1d/Δ7d
 *   sale/review/listing từ counter-diff. Account không đổi -> không xuất hiện.
 * v4 (31/07 tối — theo feedback bản tin đầu):
 *  1) FIX phân loại: 'blocked_429'/'chưa fetch' = LỖI FETCH, không phải chết
 *     (trước đó E193/E4/E257/E29 bị ném vào Block C vì chữ 'block');
 *     'SUS' của Hub giờ nhận diện đúng là đình chỉ.
 *  2) GỌN: account giống nhau gom CỤM 1 dòng (dormant 0 đơn, SUS bank NO/OK,
 *     SUS NEW theo chủ) — chỉ account có SỐ hoặc có VIỆC mới hiện card riêng.
 *  3) ĐỀ XUẤT rõ từng account: card nào cũng có dòng 👉 (từ foxera-accounts-daily.json
 *     theo mã E; thiếu thì dùng đề xuất nhóm); mục 🚨 P1 đứng đầu bản tin.
 *  4) Nhân sự ĐÃ NGHỈ: tag '· nghỉ' ngay cạnh tên (danh sách SELLER_LEFT).
 *
 * CHUẨN v1.0: Likert 🔴1 🟠2 🟡3 🟢4 💚5 (màu trước) · Khẩn cấp P1🔴→P4🟢.
 * CÀI: Script Properties TG_BOT_TOKEN + TG_CHAT_ACCOUNTS
 *  -> accTgTest() -> accTgSendNow() -> accTgInstallTrigger() (06:10).
 * NAMESPACE: chỉ dùng prefix accTg-/ACC_TG_.
 ************************************************************************/

var ACC_TG_RAWJSON = 'https://raw.githubusercontent.com/GerberaPrints/foxera-daily/main/foxera-accounts-daily.json';
var ACC_TG_MAXLEN  = 3900;
var ACC_TG_DELAY   = 3500;
var ACC_TG_LEGEND  = '<i>Likert: 🔴1 🟠2 🟡3 🟢4 💚5 · Khẩn cấp P1🔴→P4🟢</i>';
var ACC_TG_LEFT = ['Giang Nguyễn','Ngân Trần','My Nguyễn','Hạnh Lâm','Năng Phan','Nga Phạm','Ngân Huỳnh','Thúy Trần','Thanh Vương','Vy Hồ'];

function accTg_prop_(k){ return PropertiesService.getScriptProperties().getProperty(k); }
function accTg_num_(v){ var n = parseFloat(String(v).replace(/[^\d.\-]/g,'')); return isNaN(n) ? null : n; }
function accTg_likert_(l){
  if (l == null) return '';
  var b = (l < 1.5) ? 1 : (l < 2.5) ? 2 : (l < 3.5) ? 3 : (l < 4.5) ? 4 : 5;
  return ['','🔴','🟠','🟡','🟢','💚'][b] + (Math.round(l*10)/10);
}
function accTg_prio_(p){
  var m = String(p||'').toUpperCase().match(/P?([1-4])/);
  if (!m) return 'P3 🟡';
  return 'P' + m[1] + ' ' + ['','🔴','🟠','🟡','🟢'][+m[1]];
}
function accTg_seller_(s){
  if (!s) return '';
  for (var i = 0; i < ACC_TG_LEFT.length; i++)
    if (s.indexOf(ACC_TG_LEFT[i]) >= 0) return s + ' <i>· nghỉ</i>';
  return s;
}
// Phân loại trạng thái từ chuỗi state của Hub / quét local — v4
function accTg_state_(st){
  var s = String(st||'').toLowerCase();
  if (/sus[\s_-]*new/.test(s)) return 'susnew';
  if (/blocked_429|429|chưa fetch|chua fetch|error/.test(s)) return 'err';   // lỗi fetch ≠ chết
  if (/not.?selling|suspend|⛔|closed|dead/.test(s)) return 'sus';
  if (/\bsus\b|sus ·|sus·|sus \(/.test(s)) return 'sus';
  if (/live|active|🟢/.test(s)) return 'live';
  return 'unknown';
}

function accTg_rows_(){
  if (typeof accScorecardJSON === 'function') {
    try {
      var arr = accScorecardJSON() || [];
      if (arr.length) {
        Logger.log('Nguồn: accScorecardJSON() — ' + arr.length + ' account.');
        return arr.map(function(x){
          var stateRaw = String(x.shopStatus || '');
          return {
            code: String(x.code||'').toUpperCase(),
            name: String(x.code||'') + (x.store ? '-' + x.store : ''),
            score: accTg_num_(x.score)||0, likert: accTg_num_(x.likert),
            rating: accTg_num_(x.rating), reviews: accTg_num_(x.reviews),
            sales: accTg_num_(x.sales),
            orders: accTg_num_(x.orders) != null ? accTg_num_(x.orders) : accTg_num_(x.o90),
            lossUsd: accTg_num_(x.lossUsd),
            stateRaw: stateRaw, cls: accTg_state_(stateRaw),
            act: String(x.action || ''),
            d1S: accTg_num_(x.d1Sales), d7S: accTg_num_(x.d7Sales),
            d1R: accTg_num_(x.d1Reviews), d7R: accTg_num_(x.d7Reviews),
            listings: accTg_num_(x.listings), d1L: accTg_num_(x.d1Listings), d7L: accTg_num_(x.d7Listings),
            bank: /bank\s*ok/i.test(stateRaw) ? 'OK' : (/bank\s*no/i.test(stateRaw) ? 'NO' : ''),
            seller: String(x.seller || x.owner || ''), why: String(x.why||'')
          };
        });
      }
    } catch(e){ Logger.log('accScorecardJSON lỗi: ' + e); }
  }
  throw new Error('Không gọi được accScorecardJSON() — kiểm tra file chính v2.26.2+.');
}

function accTg_actions_(){
  var mp = {}, dt = '';
  try {
    var d = JSON.parse(UrlFetchApp.fetch(ACC_TG_RAWJSON, {muteHttpExceptions:true}).getContentText());
    dt = String(d.date || '');
    (d.scores||[]).forEach(function(s){
      var c = String(s.code||'').toUpperCase();
      if (c) mp[c] = { act: s.action || s.top_issue || '', prio: s.priority || '' };
    });
  } catch(e){ Logger.log('actions fetch fail: ' + e); }
  return { mp: mp, date: dt, stale: dt ? ((new Date() - new Date(dt)) > 26*3600*1000) : true };
}
function accTg_prev_(){ try { return JSON.parse(accTg_prop_('ACC_TG_LAST')||'{}'); } catch(e){ return {}; } }
function accTg_savePrev_(rows){
  var o = {}; rows.forEach(function(a){ o[a.code] = {score:a.score, likert:a.likert, cls:a.cls}; });
  PropertiesService.getScriptProperties().setProperty('ACC_TG_LAST', JSON.stringify(o));
}

function accTg_delta_(a){
  var b = [];
  if (a.d1S) b.push('+'+a.d1S+' sale hôm nay'); else if (a.d7S) b.push('+'+a.d7S+' sale/7d');
  if (a.d1R) b.push('+'+a.d1R+' rv'); else if (a.d7R) b.push('+'+a.d7R+' rv/7d');
  if (a.d1L) b.push('+'+a.d1L+' lst'); else if (a.d7L) b.push('+'+a.d7L+' lst/7d');
  return b.length ? ' <i>('+b.join(' · ')+')</i>' : '';
}
function accTg_line_(a, acts, stale){
  var ac = acts[a.code] || {};
  var s = '• <b>'+a.code+'</b> '+(a.act || '')+accTg_delta_(a);
  if (!stale && ac.prio) s += ' · <i>Cloud: '+accTg_prio_(ac.prio)+'</i>';   // tham khảo, không quyết định nhóm
  if (a.seller) s += ' · '+accTg_seller_(a.seller);
  return s;
}
function accTg_build_(){
  var rows = accTg_rows_();
  if (!rows.length) throw new Error('0 account.');
  var ar = accTg_actions_(), acts = ar.mp, prev = accTg_prev_();
  var dstr = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM');
  var URGENT = /^\s*(⚡|🚨|⛔|❓)/, WATCH = /^\s*(🔧|📈|⏳|🪧|💬)/, CLOSED = /🗂/;
  var alerts = [], urgent = [], watch = [], healthy = [], closedSus = 0, closedNew = 0;

  rows.forEach(function(a){
    var p = prev[a.code];
    a._delta = (p && typeof p.score === 'number') ? Math.round(a.score - p.score) : null;
    if (p && p.cls && p.cls !== 'sus' && p.cls !== 'susnew' && a.cls === 'sus')
      alerts.push('P1 🔴 <b>'+a.code+'</b> vừa rơi ĐÌNH CHỈ hôm nay!');
    if (a.cls === 'susnew') { closedNew++; return; }
    if (CLOSED.test(a.act)) { closedSus++; return; }
    if (a.cls === 'sus') { if (URGENT.test(a.act)) urgent.push(a); else closedSus++; return; }
    if (URGENT.test(a.act)) { urgent.push(a); return; }
    if (WATCH.test(a.act)) { watch.push(a); return; }
    healthy.push(a);   // ✅/🌱/khác -> 🟢 bất kể P Cloud (quy tắc một-đồng-hồ)
  });
  var byD7 = function(x,y){ return (y.d7S||0)-(x.d7S||0); };
  urgent.sort(byD7); watch.sort(byD7);

  var head = '<b>🏪 ACCOUNTS '+dstr+'</b> · '+rows.length+' acc' + String.fromCharCode(10) + ACC_TG_LEGEND + String.fromCharCode(10) + String.fromCharCode(10);
  var NL = String.fromCharCode(10);
  var parts = [];
  if (ar.stale) parts.push('⚠️ <i>Đề xuất Cloud (daily.json) cũ' + (ar.date ? ' — ngày '+ar.date : '') + '; bản tin dùng thuần action Hub.</i>');
  if (alerts.length) parts.push('<b>🚨 ALERT</b>' + NL + alerts.join(NL));
  if (urgent.length) parts.push('<b>🔴 LÀM HÔM NAY ('+urgent.length+')</b>' + NL + urgent.map(function(a){ return accTg_line_(a, acts, ar.stale); }).join(NL));
  if (watch.length) parts.push('<b>🟡 THEO DÕI ('+watch.length+')</b>' + NL + watch.map(function(a){ return accTg_line_(a, acts, ar.stale); }).join(NL));
  var hS=0,hR=0,hL=0;
  healthy.forEach(function(a){ hS+=(a.d7S||0); hR+=(a.d7R||0); hL+=(a.d7L||0); });
  if (healthy.length) parts.push('<b>🟢 KHỎE ('+healthy.length+')</b>: Σ +'+hS+' sale · +'+hR+' rv · +'+hL+' lst /7d — không cần đụng');
  if (closedSus + closedNew) parts.push('<b>🗂️ ĐÓNG SỔ ('+(closedSus+closedNew)+')</b>: '+closedNew+' SUS NEW + '+closedSus+' SUS — danh sách cố định, chỉ báo khi có biến');

  var msgs = [], cur = head;
  parts.forEach(function(pt){
    if ((cur + pt).length > ACC_TG_MAXLEN) { msgs.push(cur); cur = ''; }
    cur += pt + NL + NL;
  });
  msgs.push(cur);
  return { msgs: msgs, rows: rows };
}

function accTg_chunk_(head, lines, foot){
  var out = [], cur = head;
  lines.forEach(function(l){
    if ((cur + l + foot).length > ACC_TG_MAXLEN) { out.push(cur.replace(/\n+$/,'')); cur = head.replace('</b>', ' (tiếp)</b>'); }
    cur += l + '\n\n';
  });
  out.push((cur + foot).replace(/\n{3,}/g,'\n\n'));
  return out;
}
function accTg_send_(text){
  var res = UrlFetchApp.fetch('https://api.telegram.org/bot'+accTg_prop_('TG_BOT_TOKEN')+'/sendMessage', {
    method:'post', contentType:'application/json', muteHttpExceptions:true,
    payload: JSON.stringify({chat_id: accTg_prop_('TG_CHAT_ACCOUNTS'), text: text, parse_mode:'HTML', disable_web_page_preview:true})
  });
  if (res.getResponseCode() !== 200) Logger.log('TG fail: ' + res.getContentText());
}

// ====== HÀM CHẠY ======
function accTgTest(){
  var b = accTg_build_();
  Logger.log('Đọc ' + b.rows.length + ' account. ' + b.msgs.length + ' tin:');
  b.msgs.forEach(function(m,i){ Logger.log('--- TIN '+(i+1)+' ('+m.length+' ký tự) ---\n'+m); });
}
function accTgSendNow(){
  var b = accTg_build_();
  b.msgs.forEach(function(m){ accTg_send_(m); Utilities.sleep(ACC_TG_DELAY); });
  accTg_savePrev_(b.rows);
}
function accTgInstallTrigger(){
  ScriptApp.getProjectTriggers().forEach(function(t){ if (t.getHandlerFunction()==='accTgSendNow') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('accTgSendNow').timeBased().atHour(6).nearMinute(10).everyDays(1).create();
  Logger.log('Đã cài trigger accTgSendNow ~06:10 hằng ngày.');
}
