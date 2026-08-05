/**
 * GenusFaith → Telegram — GAS v4.0 (05/08/2026)
 * Thay thế genusfaith-telegram-gas-v3.gs.
 *
 * v4 VÁ 20 LỖ HỔNG tìm được trong phiên rà soát 05/08. Bốn cái nguy hiểm nhất:
 *
 *  L2  v3: JSON.parse(response Telegram) KHÔNG bọc try/catch. Telegram trả 502
 *      (body là HTML) -> SyntaxError vọt khỏi pt_send_ -> khỏi vòng lặp -> dòng
 *      ghi sổ counts[key] KHÔNG chạy -> delta sweep 12:30 thấy done=0 -> GỬI LẠI
 *      TỪ ĐẦU CẢ KHỐI. Một lỗi mạng thoáng qua tạo ra một bản tin trùng hoàn chỉnh.
 *  L3  v3 ghi sổ MỘT LẦN sau khi gửi xong cả khối. Đứt giữa chừng (timeout 6 phút,
 *      quota) -> đã gửi 3/4 tin nhưng sổ vẫn 0 -> sweep gửi lại cả 4.
 *  L4  v3 dedupe bằng ĐỘ DÀI MẢNG. Research sửa nội dung tin mà không đổi số tin
 *      -> bản sửa KHÔNG BAO GIỜ được gửi. Mảng rút ngắn rồi dài lại -> mất tin.
 *  L13 v3 hardcode 8 khối ở 3 chỗ (FX_BLOCKS + 8 sender + 8 trigger). Thêm B9 mà
 *      quên 1 trong 3 chỗ -> khối mồ côi vĩnh viễn. Đây đúng là bệnh đã xảy ra với
 *      B7 ở GAS v1.
 *
 * CÁCH v4 GIẢI:
 *  - MỘT hàm gửi duy nhất, IDEMPOTENT, khoá dedupe là HASH NỘI DUNG từng tin.
 *    Chạy lại bao nhiêu lần cũng không gửi trùng; đứt giữa chừng thì lần chạy sau
 *    tự đi tiếp. Vì vậy 3 trigger sáng + 2 sweep dùng CHUNG một hàm.
 *  - Ghi sổ SAU MỖI TIN, không phải sau mỗi khối.
 *  - Fetch ĐÚNG MỘT LẦN mỗi execution -> không còn cảnh B1 lấy bản A, B5 lấy bản B.
 *  - Auto-detect B1..BN từ JSON -> thêm khối không cần sửa code.
 *  - LockService -> hai trigger chồng nhau không gửi trùng.
 *  - Đếm sent/failed thật, lưu message_id, có dead-man switch 08:00.
 *
 * CÀI ĐẶT (làm theo thứ tự):
 *  0. ⚠️ REVOKE token cũ 8837604249:... qua @BotFather — nó nằm nguyên văn trong
 *     genusfaith-telegram-gas-v2.gs trên repo PUBLIC và trong git history.
 *     Chưa revoke thì bất kỳ ai cũng gửi được tin giả vào nhóm.
 *  1. File > Project settings > Time zone = (GMT+07:00) Bangkok.  ⬅ BẮT BUỘC
 *  2. Chạy gfSetSecrets() một lần (điền token mới + chat id), rồi XOÁ 2 giá trị
 *     khỏi code trước khi lưu.
 *  3. Chạy gfSelfTest() — nó kiểm timezone, secret, JSON, khối, và IN RA mọi thứ
 *     sai trước khi bạn cài lịch.
 *  4. Chạy gfInstallTriggers().
 */

// ── HẰNG SỐ ──────────────────────────────────────────────────────────────────
const GF_TZ      = 'Asia/Bangkok';
const GF_RAW     = 'https://raw.githubusercontent.com/GerberaPrints/foxera-daily/main/genusfaith-daily.json';
const GF_LABEL   = '✝️ GenusFaith';
const GF_DELAY   = 3500;   // ms giữa 2 tin (chống rate-limit Telegram)
const GF_PARTGAP = 1200;   // ms giữa 2 phần của cùng 1 tin
const GF_MAXLEN  = 3900;   // trần an toàn dưới 4096 của Telegram
const GF_LEDGER  = 'GF_LEDGER_V4';
const GF_MAXRUN  = 4.5 * 60 * 1000;  // dừng chủ động trước trần 6 phút của GAS

// Tên khối chỉ để hiển thị. THIẾU TÊN KHÔNG SAO — khối vẫn được gửi (auto-detect).
const GF_BLOCK_NAMES = {
  B1: 'Bối cảnh & Việc hôm nay', B2: 'Money anchor & Listing-ready',
  B3: 'Ý tưởng & hạn sử dụng',   B4: 'Format watch & Design arbitrage',
  B5: 'Persona, B2B, phản đối',  B6: 'Định vị & hướng thẩm mỹ',
  B7: 'Cấu trúc thị trường & Radar đối thủ', B8: 'Kho dữ liệu'
};

// ── SECRETS ──────────────────────────────────────────────────────────────────
/** Chạy 1 lần rồi xoá 2 giá trị khỏi code. (mẫu lấy từ gritfelldaily-v2.gs) */
function gfSetSecrets() {
  var TOKEN = '';   // <- token MỚI từ @BotFather (sau khi đã revoke token cũ)
  var CHAT  = '';   // <- chat id nhóm GenusFaith
  if (!TOKEN || !CHAT) throw new Error('Điền TOKEN và CHAT vào gfSetSecrets() rồi chạy lại.');
  PropertiesService.getScriptProperties().setProperties({ GF_TOKEN: TOKEN, GF_CHAT: CHAT });
  Logger.log('Đã lưu GF_TOKEN + GF_CHAT. Giờ xoá 2 giá trị khỏi code.');
}

/** VÁ L8: fail-fast. v3 fallback im lặng về placeholder -> gửi vào URL rác, 404, không ai biết. */
function gf_prop_(k) {
  var v = PropertiesService.getScriptProperties().getProperty(k);
  if (!v || String(v).trim() === '' || String(v).indexOf('<') === 0) {
    throw new Error('Thiếu Script Property "' + k + '". Chạy gfSetSecrets() trước.');
  }
  return String(v).trim();
}

// ── TIỆN ÍCH ─────────────────────────────────────────────────────────────────
function gf_today_()  { return Utilities.formatDate(new Date(), GF_TZ, 'yyyy-MM-dd'); }
function gf_now_()    { return Utilities.formatDate(new Date(), GF_TZ, 'HH:mm'); }
function gf_date_(d)  { return String((d && d.date) || '').substring(0, 10); }
function gf_fresh_(d) { return gf_date_(d) === gf_today_(); }

/** VÁ L4: khoá dedupe là hash NỘI DUNG, không phải chỉ số mảng. */
function gf_hash_(s) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(s), Utilities.Charset.UTF_8);
  var h = '';
  for (var i = 0; i < 6; i++) { var x = (b[i] + 256) % 256; h += (x < 16 ? '0' : '') + x.toString(16); }
  return h;
}

/** Cắt theo ranh giới DÒNG để không xé giữa thẻ <a>/<b> (Telegram trả 400 -> mất tin). */
function gf_chunk_(html) {
  var out = [], cur = '', lines = String(html).split('\n');
  for (var i = 0; i < lines.length; i++) {
    var ln = lines[i];
    // VÁ: dòng đơn dài hơn trần thì cắt cứng, nếu không sẽ đẩy 1 phần > 4096 và mất tin.
    while (ln.length > GF_MAXLEN) {
      if (cur) { out.push(cur); cur = ''; }
      out.push(ln.substring(0, GF_MAXLEN)); ln = ln.substring(GF_MAXLEN);
    }
    if ((cur + '\n' + ln).length > GF_MAXLEN) { out.push(cur); cur = ln; }
    else { cur = cur ? (cur + '\n' + ln) : ln; }
  }
  if (cur) out.push(cur);
  return out.length ? out : [''];
}

// ── TELEGRAM API ─────────────────────────────────────────────────────────────
/** VÁ L2 + L19: JSON.parse an toàn, retry backoff cho 429 VÀ 5xx VÀ lỗi transport. */
function gf_api_(method, payload) {
  var url = 'https://api.telegram.org/bot' + gf_prop_('GF_TOKEN') + '/' + method;
  for (var a = 0; a < 4; a++) {
    var res, code, body;
    try {
      res  = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json',
                                      payload: JSON.stringify(payload), muteHttpExceptions: true });
      code = res.getResponseCode();
      body = res.getContentText();
    } catch (e) {
      // muteHttpExceptions chỉ mute HTTP status, KHÔNG mute lỗi tầng transport (DNS/timeout).
      Logger.log('fetch transport lỗi (lần ' + (a + 1) + '): ' + e);
      Utilities.sleep(1500 * (a + 1)); continue;
    }
    var d;
    try { d = JSON.parse(body); } catch (e) { d = { ok: false, _raw: String(body).substring(0, 200) }; }
    if (d.ok) return d;
    if (d.error_code === 429 && d.parameters && d.parameters.retry_after) {
      Utilities.sleep((d.parameters.retry_after + 1) * 1000); continue;
    }
    if (code >= 500) { Utilities.sleep(2000 * (a + 1)); continue; }  // 5xx: backoff rồi thử lại
    Logger.log(method + ' ERR ' + code + ': ' + String(body).substring(0, 300));
    return d;   // 4xx (trừ 429): sai bền vững, thử lại vô ích
  }
  return { ok: false, _exhausted: true };
}

/**
 * Gửi 1 tin. VÁ L6: có KIỂM kết quả fallback và TRẢ VỀ trạng thái thật.
 * v3 gửi fallback rồi vứt kết quả -> bot bị kick khỏi nhóm mà hệ thống vẫn ghi "đã gửi".
 * @return {{ok:boolean, ids:Array, err:string}}
 */
function gf_send_(html) {
  var chat = gf_prop_('GF_CHAT');
  html = String(html).replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
  var parts = gf_chunk_(html), ids = [], lastErr = '';
  for (var i = 0; i < parts.length; i++) {
    var r = gf_api_('sendMessage', { chat_id: chat, text: parts[i],
                                     parse_mode: 'HTML', disable_web_page_preview: true });
    if (!r.ok) {
      Logger.log('HTML fail -> thử plain. 80 ký tự đầu: ' + parts[i].substring(0, 80));
      r = gf_api_('sendMessage', { chat_id: chat, text: parts[i].replace(/<[^>]+>/g, ''),
                                   disable_web_page_preview: true });
      if (!r.ok) {
        lastErr = (r.description || r._raw || 'unknown');
        return { ok: false, ids: ids, err: lastErr };   // cả 2 lần đều hỏng -> KHÔNG ghi sổ
      }
    }
    if (r.result && r.result.message_id) ids.push(r.result.message_id);
    if (i < parts.length - 1) Utilities.sleep(GF_PARTGAP);
  }
  return { ok: true, ids: ids, err: '' };
}

// ── DỮ LIỆU ──────────────────────────────────────────────────────────────────
/** VÁ L19b: GitHub raw chớp 502 một lần là v3 mất trọn khối. v4 retry 3 lần. */
function gf_load_() {
  var last = '';
  for (var a = 0; a < 3; a++) {
    try {
      var res = UrlFetchApp.fetch(GF_RAW + '?t=' + Date.now(),
                { muteHttpExceptions: true, headers: { 'Cache-Control': 'no-cache' } });
      if (res.getResponseCode() === 200) return JSON.parse(res.getContentText());
      last = 'HTTP ' + res.getResponseCode();
    } catch (e) { last = String(e); }
    Utilities.sleep(1500 * (a + 1));
  }
  throw new Error('Không đọc được GitHub raw sau 3 lần: ' + last);
}

/** VÁ L13: auto-detect B1..BN. Thêm khối mới KHÔNG cần sửa code. */
function gf_keys_(d) {
  return Object.keys((d && d.blocks) || {}).sort(function (a, b) {
    return (parseInt(String(a).replace(/\D/g, ''), 10) || 0) - (parseInt(String(b).replace(/\D/g, ''), 10) || 0);
  });
}

// ── SỔ ĐÃ GỬI ────────────────────────────────────────────────────────────────
// { _date, _staleWarned, _openedAt, sent:{<hash>:1}, stats:{sent,failed}, ids:[] }
function gf_led_() {
  var raw = PropertiesService.getScriptProperties().getProperty(GF_LEDGER);
  var s = null;
  try { s = raw ? JSON.parse(raw) : null; } catch (e) { s = null; }
  if (!s || s._date !== gf_today_()) s = { _date: gf_today_(), sent: {}, stats: { sent: 0, failed: 0 }, ids: [] };
  if (!s.sent)  s.sent  = {};
  if (!s.stats) s.stats = { sent: 0, failed: 0 };
  if (!s.ids)   s.ids   = [];
  return s;
}
function gf_ledSave_(s) {
  // Giữ ids gọn để không chạm trần 9KB của một Script Property.
  if (s.ids.length > 120) s.ids = s.ids.slice(-120);
  PropertiesService.getScriptProperties().setProperty(GF_LEDGER, JSON.stringify(s));
}

// ── HÀM GỬI DUY NHẤT (idempotent) ────────────────────────────────────────────
/**
 * Gửi mọi tin CHƯA TỪNG GỬI hôm nay. An toàn khi gọi lại nhiều lần.
 * Cùng một hàm phục vụ: bản tin sáng, lần chạy bù, và delta sweep.
 * VÁ L5: LockService. VÁ L3: ghi sổ sau MỖI tin. VÁ L9: fetch đúng 1 lần.
 */
function gf_run_(tag) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) { Logger.log(tag + ': lần chạy khác đang giữ khoá -> bỏ qua'); return; }
  var t0 = Date.now();
  try {
    var d;
    try { d = gf_load_(); }
    catch (e) { Logger.log(tag + ' load lỗi: ' + e); return; }   // VÁ L1: không throw ra ngoài

    var led = gf_led_();

    // ── STALE-GATE. VÁ L7: đúng 1 cảnh báo/ngày (cờ _staleWarned), không phải 2.
    if (!gf_fresh_(d)) {
      if (!led._staleWarned) {
        gf_send_('⚠️ <b>' + GF_LABEL + ' — DỮ LIỆU CHƯA CẬP NHẬT HÔM NAY</b>\n' +
                 'File trên GitHub vẫn là ngày <b>' + (gf_date_(d) || '?') + '</b> (hôm nay ' + gf_today_() + ').\n' +
                 'Research task chưa chạy hoặc push thất bại.\n' +
                 '<i>KHÔNG đăng bản cũ để tránh nhầm là báo cáo mới.</i>');
        led._staleWarned = true; gf_ledSave_(led);
      }
      Logger.log(tag + ': STALE (' + gf_date_(d) + ') -> skip');
      return;
    }

    var keys = gf_keys_(d);
    if (!keys.length) { Logger.log(tag + ': JSON không có khối nào -> skip'); return; }

    // ── HEADER: chỉ gửi 1 lần/ngày, và gửi ở LẦN CHẠY THÀNH CÔNG ĐẦU TIÊN.
    // VÁ L11: v3 gắn header cứng vào block1; research push trễ -> B3..B8 lên
    // không header, còn sweep thì dán nhãn "TIN BỔ SUNG" cho bản tin CHÍNH.
    if (!led._openedAt) {
      var h = d.health || {};
      var late = (gf_now_() > '09:00');
      gf_send_('📖 <b>' + GF_LABEL + ' · Nghiên cứu thị trường</b> — ' + gf_date_(d) +
               (late ? '  <i>(bản tin chính, push trễ — gửi lúc ' + gf_now_() + ')</i>' : '') +
               '\n<i>' + (d.locale || 'US / USD') + '</i>' +
               (h.status ? '\n🩺 health: <b>' + h.status + '</b>' +
                           (h.feed_age_days != null ? ' · feed ' + h.feed_age_days + 'd' : '') : '') +
               '\n' + keys.length + ' khối · ' + gf_today_());
      led._openedAt = gf_now_(); gf_ledSave_(led);
      Utilities.sleep(GF_DELAY);
    }

    // ── GỬI. Lặp theo hash: đã gửi thì bỏ qua, dù nó nằm ở vị trí nào trong mảng.
    var newCount = 0, banner = false;
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      var arr = d.blocks[key] || [];
      for (var i = 0; i < arr.length; i++) {
        if (Date.now() - t0 > GF_MAXRUN) {                       // VÁ L18: dừng trước trần 6'
          Logger.log(tag + ': gần hết thời gian -> dừng, lần chạy sau đi tiếp');
          gf_ledSave_(led); return;
        }
        var hash = gf_hash_(arr[i]);
        if (led.sent[hash]) continue;                            // đã gửi -> bỏ qua

        // VÁ L10: tin bổ sung phải nói rõ thuộc khối nào.
        if (led._openedAt && !banner && newCount === 0 && gf_now_() > '10:00') {
          gf_send_('🔄 <b>' + GF_LABEL + ' — TIN BỔ SUNG trong ngày</b> (' + gf_now_() + ')');
          banner = true; Utilities.sleep(GF_DELAY);
        }

        var r = gf_send_(arr[i]);
        if (r.ok) {
          led.sent[hash] = 1; led.stats.sent++;
          for (var z = 0; z < r.ids.length; z++) led.ids.push(r.ids[z]);
          newCount++;
        } else {
          led.stats.failed++;
          Logger.log('GỬI HỎNG ' + key + '#' + i + ': ' + r.err);
        }
        gf_ledSave_(led);                                        // VÁ L3: ghi sổ SAU MỖI TIN
        Utilities.sleep(GF_DELAY);
      }
    }
    Logger.log(tag + ': gửi mới ' + newCount + ' tin · tổng hôm nay ' +
               led.stats.sent + ' ok / ' + led.stats.failed + ' hỏng');
  } finally {
    lock.releaseLock();
  }
}

// ── ENTRY POINTS ─────────────────────────────────────────────────────────────
function gfSendAll()     { gf_run_('sendAll');   }  // 06:00
function gfResume()      { gf_run_('resume');    }  // 06:40, 07:20 — bù nếu lần trước đứt
function gfDeltaSweep()  { gf_run_('delta');     }  // 12:30, 19:30

/** 05:45 — cảnh báo TRƯỚC giờ gửi. Không gửi cảnh báo stale (để gf_run_ lo, tránh trùng). */
function gfHealthCheck() {
  var d;
  try { d = gf_load_(); }
  catch (e) {
    try { gf_send_('🚨 <b>' + GF_LABEL + ' — KHÔNG ĐỌC ĐƯỢC DỮ LIỆU</b>\n<code>' +
                   String(e).substring(0, 200) + '</code>\nKiểm repo/đường dẫn raw.'); } catch (e2) {}
    return;
  }
  var h = d.health || {}, keys = gf_keys_(d);
  var line = (gf_fresh_(d) ? '✅' : '⚠️') + ' <b>' + GF_LABEL + ' health ' + gf_today_() + '</b>' +
             '\ndata: <b>' + gf_date_(d) + '</b> · ' + keys.length + ' khối (' + keys.join(', ') + ')' +
             (h.status ? '\nhealth: <b>' + h.status + '</b>' +
                         (h.feed_age_days != null ? ' · feed ' + h.feed_age_days + ' ngày' : '') +
                         (h.note ? '\n<i>' + h.note + '</i>' : '') : '\n<i>JSON chưa có khoá health (routine v9 sẽ thêm)</i>');
  Logger.log(line);
  // Chỉ làm phiền nhóm khi CÓ VẤN ĐỀ. Ngày khoẻ thì im lặng.
  if (!gf_fresh_(d) || h.status === 'stale' || h.status === 'degraded') gf_send_(line);
}

/**
 * 08:15 — DEAD-MAN SWITCH. VÁ L16: v3 không có gì phát hiện "cả ngày không tin nào".
 * Nếu trigger bị tắt / OAuth hết hạn / quota cạn thì im lặng tuyệt đối, không ai biết.
 */
function gfDeadMan() {
  var led = gf_led_();
  if (led.stats.sent > 0) { Logger.log('deadman: đã gửi ' + led.stats.sent + ' tin -> OK'); return; }
  try {
    gf_send_('🚨 <b>' + GF_LABEL + ' — 08:15 MÀ CHƯA GỬI ĐƯỢC TIN NÀO HÔM NAY</b>\n' +
             'Khả năng: research chưa push · trigger bị tắt · OAuth hết hạn · cạn quota.\n' +
             'Kiểm: Apps Script > Executions, và raw genusfaith-daily.json.');
  } catch (e) { Logger.log('deadman cũng không gửi được: ' + e); }
}

/** Chạy TAY trước khi cài lịch. Kiểm mọi thứ hay hỏng, in ra một lượt. */
function gfSelfTest() {
  var out = [];
  var tz = Session.getScriptTimeZone();
  // VÁ L17: trigger chạy theo Project Time zone, KHÔNG theo GF_TZ. Lệch TZ = gửi sai giờ.
  out.push((tz === GF_TZ ? '✅' : '❌') + ' Project Time zone = ' + tz +
           (tz === GF_TZ ? '' : '  ⬅ PHẢI đổi thành ' + GF_TZ + ' (File > Project settings)'));
  try { gf_prop_('GF_TOKEN'); out.push('✅ GF_TOKEN có'); } catch (e) { out.push('❌ ' + e.message); }
  try { gf_prop_('GF_CHAT');  out.push('✅ GF_CHAT có');  } catch (e) { out.push('❌ ' + e.message); }
  try {
    var d = gf_load_(), keys = gf_keys_(d), n = 0, over = [];
    keys.forEach(function (k) {
      (d.blocks[k] || []).forEach(function (m, i) {
        n++; if (String(m).length > GF_MAXLEN) over.push(k + '#' + (i + 1) + ' = ' + String(m).length);
      });
    });
    out.push('✅ JSON đọc được · date=' + gf_date_(d) + (gf_fresh_(d) ? ' (HÔM NAY)' : ' ⚠️ KHÔNG phải hôm nay'));
    out.push('   khối: ' + keys.join(', ') + ' · tổng ' + n + ' tin');
    out.push((d.health ? '✅' : '⚠️') + ' khoá health: ' + (d.health ? JSON.stringify(d.health) : 'CHƯA CÓ'));
    out.push((over.length ? '⚠️ tin vượt ' + GF_MAXLEN + ' (sẽ tự chia): ' + over.join(', ') : '✅ mọi tin dưới trần độ dài'));
    var miss = keys.filter(function (k) { return !GF_BLOCK_NAMES[k]; });
    if (miss.length) out.push('ℹ️ khối chưa đặt tên (vẫn gửi bình thường): ' + miss.join(', '));
  } catch (e) { out.push('❌ JSON: ' + e); }
  var led = gf_led_();
  out.push('📒 sổ hôm nay: ' + Object.keys(led.sent).length + ' tin đã gửi · ' +
           led.stats.sent + ' ok / ' + led.stats.failed + ' hỏng' + (led._openedAt ? ' · mở lúc ' + led._openedAt : ''));
  Logger.log(out.join('\n'));
  return out.join('\n');
}

/** Xoá sổ hôm nay để gửi lại từ đầu (dùng khi cần test). CẨN THẬN: sẽ gửi trùng. */
function gfResetLedger() {
  PropertiesService.getScriptProperties().deleteProperty(GF_LEDGER);
  Logger.log('Đã xoá sổ. Lần gửi tới sẽ gửi LẠI TOÀN BỘ tin của hôm nay.');
}

// ── TRIGGERS ─────────────────────────────────────────────────────────────────
// v3 cần 11 trigger (8 sender + health + 2 sweep). v4 cần 7, và thêm khối
// KHÔNG phải sửa gì cả.
function gfInstallTriggers() {
  gfRemoveTriggers();
  var mk = function (fn, h, m) {
    ScriptApp.newTrigger(fn).timeBased().atHour(h).nearMinute(m).everyDays(1).create();
  };
  mk('gfHealthCheck',  5, 45);
  mk('gfSendAll',      6,  0);
  mk('gfResume',       6, 40);   // bù nếu 06:00 đứt giữa chừng (idempotent, an toàn)
  mk('gfResume',       7, 20);   // bù lần 2 + bắt trường hợp research push trễ
  mk('gfDeadMan',      8, 15);
  mk('gfDeltaSweep',  12, 30);
  mk('gfDeltaSweep',  19, 30);
  Logger.log('Đã cài 7 trigger. Nhớ kiểm Project Time zone = ' + GF_TZ);
}

function gfRemoveTriggers() {
  var names = ['gfHealthCheck','gfSendAll','gfResume','gfDeadMan','gfDeltaSweep'];
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (names.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  Logger.log('Đã xoá trigger cũ.');
}
