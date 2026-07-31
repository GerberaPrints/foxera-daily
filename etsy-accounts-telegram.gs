/************************************************************************
 * ACCOUNTS → TELEGRAM v4 — file BỔ SUNG cho project "FoxEra - Etsy Order Tracking"
 * (dán ĐÈ AccountsTelegram.gs; tương thích scorecard v2.30+)
 *
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
  if (/sus\s*new/.test(s)) return 'susnew';
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
  var mp = {};
  try {
    var d = JSON.parse(UrlFetchApp.fetch(ACC_TG_RAWJSON, {muteHttpExceptions:true}).getContentText());
    (d.scores||[]).forEach(function(s){
      var c = String(s.code||'').toUpperCase();
      if (c) mp[c] = { act: s.action || s.top_issue || '', prio: s.priority || '' };
    });
  } catch(e){ Logger.log('actions fetch fail: ' + e); }
  return mp;
}
function accTg_prev_(){ try { return JSON.parse(accTg_prop_('ACC_TG_LAST')||'{}'); } catch(e){ return {}; } }
function accTg_savePrev_(rows){
  var o = {}; rows.forEach(function(a){ o[a.code] = {score:a.score, likert:a.likert, cls:a.cls}; });
  PropertiesService.getScriptProperties().setProperty('ACC_TG_LAST', JSON.stringify(o));
}

function accTg_card_(a, acts){
  var d = (a._delta===null||a._delta===0) ? '' : (a._delta>0 ? ' ▲+'+a._delta : ' ▼'+a._delta);
  var s = '<b>'+a.name+'</b> — '+accTg_likert_(a.likert)+' · '+Math.round(a.score)+'đ'+d;
  var bits = [];
  if (a.rating != null) bits.push(a.rating+'★'+(a.reviews!=null?'('+a.reviews+')':''));
  if (a.sales != null) bits.push(a.sales+' sales');
  if (a.orders) bits.push(a.orders+' đơn/90d');
  if (a.lossUsd) bits.push('loss $'+a.lossUsd);
  if (a.seller) bits.push(accTg_seller_(a.seller));
  if (bits.length) s += '\n• ' + bits.join(' · ');
  var ac = acts[a.code];
  if (ac && ac.act) s += '\n👉 ' + accTg_prio_(ac.prio) + ' ' + ac.act;
  else if (a.why) s += '\n👉 P3 🟡 ' + a.why;
  return s;
}
// cụm 1 dòng: gom mã theo chủ
function accTg_cluster_(list){
  var by = {};
  list.forEach(function(a){
    var k = accTg_seller_(a.seller || '?');
    (by[k] = by[k] || []).push(a.code);
  });
  return Object.keys(by).sort().map(function(k){
    return '• ' + k + ' (' + by[k].length + '): ' + by[k].join(' ');
  });
}

function accTg_build_(){
  var rows = accTg_rows_();
  if (!rows.length) throw new Error('0 account.');
  var acts = accTg_actions_(), prev = accTg_prev_();
  var dstr = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM');
  var alerts = [], p1 = [], liveCards = [], dorm = [], susNO = [], susOK = [], susNew = [], errStale = [];

  rows.forEach(function(a){
    var p = prev[a.code];
    a._delta = (p && typeof p.score==='number') ? Math.round(a.score - p.score) : null;
    if (p && p.cls && p.cls !== 'sus' && p.cls !== 'susnew' && a.cls === 'sus')
      alerts.push('P1 🔴 <b>'+a.name+'</b> vừa rơi vào ĐÌNH CHỈ hôm nay — xử lý NGAY!');
    if (p && a._delta !== null && a._delta <= -10 && a.cls === 'live')
      alerts.push('P2 🟠 <b>'+a.name+'</b> rớt '+Math.abs(a._delta)+'đ.');

    var ac = acts[a.code];
    if (a.cls === 'susnew') { susNew.push(a); return; }
    if (a.cls === 'sus') { (a.bank === 'OK' ? susOK : susNO).push(a); return; }
    // sống / lỗi fetch / unknown → xét theo hoạt động
    if (ac && /^p1/i.test(String(ac.prio))) { p1.push(a); return; }
    var hasData = (a.sales||0) > 0 || (a.orders||0) >= 3 || (a.rating != null) || (ac && ac.act);
    if (hasData) liveCards.push(a); else dorm.push(a);
  });
  liveCards.sort(function(x,y){ return y.score - x.score; });

  var msgs = [];
  if (alerts.length) msgs.push('<b>🚨 ALERT '+dstr+'</b>\n\n'+alerts.join('\n'));

  if (p1.length)
    msgs = msgs.concat(accTg_chunk_('<b>🚨 P1 — XỬ LÝ NGAY HÔM NAY ('+p1.length+') · '+dstr+'</b>\n'+ACC_TG_LEGEND+'\n\n',
      p1.map(function(a){ return accTg_card_(a, acts); }), ''));

  msgs = msgs.concat(accTg_chunk_('<b>💚 ĐANG CHẠY — CÓ SỐ ('+liveCards.length+') · '+dstr+'</b>\n\n',
    liveCards.map(function(a){ return accTg_card_(a, acts); }),
    ''));

  if (dorm.length)
    msgs = msgs.concat(accTg_chunk_('<b>🌱 DORMANT 0 ĐƠN ('+dorm.length+') — gom theo chủ</b>\n\n',
      accTg_cluster_(dorm),
      '\n👉 <b>P3 🟡 cả nhóm:</b> quyết giữ/gộp/buông chu kỳ 2 tuần. Chủ đã nghỉ → <b>P2 🟠 bàn giao</b> trước.'));

  var susLines = [];
  if (susNO.length) susLines.push('<b>P1 🔴 bank NO ('+susNO.length+'):</b> verify bank + kháng cáo — quá hạn 20/07\n' + accTg_cluster_(susNO).join('\n'));
  if (susOK.length) susLines.push('<b>P2 🟠 bank OK ('+susOK.length+'):</b> kháng cáo (ưu tiên shop nhiều sales)\n' + accTg_cluster_(susOK).join('\n'));
  if (susNew.length) susLines.push('<b>⚫ SUS NEW ('+susNew.length+'):</b> chết tầng danh tính — KHÔNG quy cá nhân, đóng băng tạo mới\n' + accTg_cluster_(susNew).join('\n'));
  if (susLines.length)
    msgs = msgs.concat(accTg_chunk_('<b>🔴 ĐÌNH CHỈ ('+(susNO.length+susOK.length+susNew.length)+') · '+dstr+'</b>\n\n',
      susLines, ''));

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
