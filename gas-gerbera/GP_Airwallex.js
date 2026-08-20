// ╔══════════════════════════════════════════════════════════════════════╗
// ║  GP_Airwallex.gs  —  Airwallex connector (v0.8 · month-walk + honest labels)║
// ║  ------------------------------------------------------------------    ║
// ║  STEP 1 of #4 (AirWallex). This file ONLY authenticates and DUMPS the   ║
// ║  raw JSON shape of the endpoints we need, so we read the REAL field     ║
// ║  names for fees / FX / status from YOUR account before writing any      ║
// ║  parser. No sheets written yet, no money math yet — discovery only.     ║
// ║                                                                        ║
// ║  Endpoints probed:                                                      ║
// ║    • /api/v1/financial_transactions   → REAL fees (gateway/FX/payout)   ║
// ║    • /api/v1/pa/payment_intents       → payment status (failed/declined)║
// ║    • /api/v1/balances/current         → cash position                   ║
// ║                                                                        ║
// ║  Credentials live in Script Properties (NEVER hardcoded):              ║
// ║    AWX_CLIENT_ID, AWX_API_KEY   (optional AWX_BASE to switch demo/prod) ║
// ║                                                                        ║
// ║  Standalone: paste as a NEW file in the SAME Apps Script project.       ║
// ║  Reuses only _getSSActive (toast). Do NOT redeclare it.                 ║
// ╚══════════════════════════════════════════════════════════════════════╝

var AWX_TOKEN_CACHE = 'awx_token';
var AWX_TOKEN_TTL   = 1500;   // 25 min (Airwallex token ~30 min)

// ── Setup: store creds via dialog (run from menu/editor — uses getUi) ─────
function awxSetup() {
  var ui = SpreadsheetApp.getUi();
  var p  = PropertiesService.getScriptProperties();
  var r1 = ui.prompt('Airwallex setup (1/2)', 'Paste your Airwallex CLIENT ID:', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  var r2 = ui.prompt('Airwallex setup (2/2)', 'Paste your Airwallex API KEY:', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  p.setProperty('AWX_CLIENT_ID', (r1.getResponseText() || '').trim());
  p.setProperty('AWX_API_KEY',   (r2.getResponseText() || '').trim());
  ui.alert('✅ Saved to Script Properties. Now run  awxDiag()  and paste the Logs back.');
}

// ── Config / creds ────────────────────────────────────────────────────────
function _awxBase()  { return PropertiesService.getScriptProperties().getProperty('AWX_BASE') || 'https://api.airwallex.com'; }
function _awxCreds() {
  var p = PropertiesService.getScriptProperties();
  return { id: p.getProperty('AWX_CLIENT_ID'), key: p.getProperty('AWX_API_KEY') };
}

// ── Auth → Bearer token (cached) ──────────────────────────────────────────
function _awxToken() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(AWX_TOKEN_CACHE);
  if (hit) return hit;
  var c = _awxCreds();
  if (!c.id || !c.key) throw new Error('Missing AWX_CLIENT_ID / AWX_API_KEY — run awxSetup() first.');
  var resp = UrlFetchApp.fetch(_awxBase() + '/api/v1/authentication/login', {
    method: 'post',
    headers: { 'x-client-id': c.id, 'x-api-key': c.key, 'Content-Type': 'application/json' },
    muteHttpExceptions: true
  });
  var code = resp.getResponseCode();
  if (code !== 200 && code !== 201) throw new Error('Auth HTTP ' + code + ' · ' + resp.getContentText().slice(0, 300));
  var tok = (JSON.parse(resp.getContentText()) || {}).token;
  if (!tok) throw new Error('Auth: no token in response · ' + resp.getContentText().slice(0, 200));
  cache.put(AWX_TOKEN_CACHE, tok, AWX_TOKEN_TTL);
  return tok;
}

// ── Generic GET ───────────────────────────────────────────────────────────
function _awxGet(path, params) {
  var url = _awxBase() + path;
  if (params) {
    var q = Object.keys(params).map(function(k){ return k + '=' + encodeURIComponent(params[k]); }).join('&');
    url += (path.indexOf('?') < 0 ? '?' : '&') + q;
  }
  var resp = UrlFetchApp.fetch(url, {
    headers: { 'Authorization': 'Bearer ' + _awxToken() }, muteHttpExceptions: true
  });
  return { code: resp.getResponseCode(), body: resp.getContentText() };
}

// ── DISCOVERY: dump raw JSON of the 3 endpoints we need ──────────────────
function awxDiag() {
  var ss = _getSSActive();
  try {
    var tok = _awxToken();
    Logger.log('AUTH OK · base=' + _awxBase() + ' · token_len=' + tok.length);
    ss.toast('Auth OK — probing endpoints…', '💳', 20);
  } catch (e) {
    Logger.log('AUTH FAILED: ' + e.message);
    ss.toast('Auth FAILED: ' + e.message, '❌', 15);
    return;
  }

  var probes = [
    ['financial_transactions (REAL fees)', '/api/v1/financial_transactions', { page_num: 0, page_size: 5 }],
    ['payment_intents (status)',           '/api/v1/pa/payment_intents',      { page_num: 0, page_size: 5 }],
    ['balances/current (cash)',            '/api/v1/balances/current',        null]
  ];
  probes.forEach(function(p) {
    try {
      var r = _awxGet(p[1], p[2]);
      Logger.log('\n===== ' + p[0] + '  ·  HTTP ' + r.code + '  ·  ' + p[1] + ' =====');
      Logger.log(r.body.slice(0, 4500));
    } catch (e) {
      Logger.log('\n===== ' + p[0] + '  ·  ERROR: ' + e.message + ' =====');
    }
  });

  ss.toast('✅ Diag done. Open Extensions ▸ Apps Script ▸ Executions (or View ▸ Logs) and paste the output back.', '💳', 15);
}

// ── DISCOVERY v0.2: confirm fee access + map payment statuses ─────────────
function awxDiag2() {
  var ss = _getSSActive();
  try { _awxToken(); } catch (e) { ss.toast('Auth FAILED: ' + e.message, '❌', 12); Logger.log('AUTH FAIL: ' + e.message); return; }

  // (1) financial_transactions — the REAL fee source. Report HTTP clearly.
  var ft = _awxGet('/api/v1/financial_transactions', { page_num: 0, page_size: 5 });
  Logger.log('\n===== financial_transactions  ·  HTTP ' + ft.code + '  ·  /api/v1/financial_transactions =====');
  Logger.log(ft.body.slice(0, 4500));
  if (ft.code === 401 || ft.code === 403) {
    Logger.log('>>> Fee endpoint DENIED. The API key needs Finance/Treasury READ scope (balances was also 401). ' +
               'Create/upgrade an API key with full read permissions, then re-run awxSetup().');
  }

  // (2) payment_intents status distribution over last 60 days + sample failures
  var from = Utilities.formatDate(new Date(Date.now() - 60 * 86400000), 'UTC', "yyyy-MM-dd'T'HH:mm:ssXXX");
  var counts = {}, samplesFailed = [], page = 0, scanned = 0, guard = 0;
  while (guard < 6) {
    var r = _awxGet('/api/v1/pa/payment_intents', { page_num: page, page_size: 100, from_created_at: from });
    if (r.code !== 200) { Logger.log('payment_intents page ' + page + ' HTTP ' + r.code + ' · ' + r.body.slice(0, 200)); break; }
    var j = JSON.parse(r.body), items = j.items || [];
    items.forEach(function (it) {
      var st = it.status || '?'; counts[st] = (counts[st] || 0) + 1; scanned++;
      if (st !== 'SUCCEEDED' && samplesFailed.length < 2) samplesFailed.push(it);
    });
    if (!j.has_more) break;
    page++; guard++;
  }
  Logger.log('\n===== payment_intents STATUS distribution (last 60d · scanned ' + scanned + ') =====');
  Logger.log(JSON.stringify(counts, null, 2));
  Logger.log('\n===== sample NON-succeeded payment_intent(s) (for recovery field mapping) =====');
  if (samplesFailed.length) samplesFailed.forEach(function (it) { Logger.log(JSON.stringify(it).slice(0, 2600)); });
  else Logger.log('(none in last 60d — no failed-payment samples to model yet)');

  ss.toast('✅ Diag2 done — paste the Logs (financial_transactions HTTP + status distribution).', '💳', 15);
}

// ════════════════════════════════════════════════════════════════════════
//  #4 mảng (2) — REAL FEES  (checkpoint 2a: measure real vs P&L estimate)
//  Writes '💳 Airwallex Fees': monthly real gateway/FX/payout fees from
//  financial_transactions, compared to the P&L estimate (2.9% + $0.30).
//  Read-only on Airwallex. Does NOT touch the P&L yet (that's checkpoint 2b).
// ════════════════════════════════════════════════════════════════════════
var AWX_FEE_SHEET = '💳 Airwallex Fees';
var AWX_PL_RATE   = 0.029;   // current P&L estimate (Settings 'Airwallex fee rate')
var AWX_PL_FIXED  = 0.30;    // current P&L estimate (Settings 'Airwallex fixed fee per order')

var _AWX_TX_MEMO = {};   // per-execution cache so awxDailyAll pulls financial_transactions ONCE
/**
 * v0.8 WHY THIS WAS REWRITTEN. The old loop asked for ONE open-ended window and stopped at
 * `guard < 80`, i.e. 8,000 rows, then returned whatever it had and said nothing. On 2026-08-18 it
 * logged 'pulled 8000 rows (pages=81)' — exactly the cap — and the Dispute Scorecard silently
 * began at 2025-10 while the caller had asked for 14 months. Five months of dispute history simply
 * were not there, and nothing in the sheet or the log said so. A truncated pull that reports
 * success is the same failure as a column that shifts without erroring.
 *
 * Now: the range is walked ONE CALENDAR MONTH AT A TIME (from_created_at + to_created_at), newest
 * first, so no single window can exhaust its own page budget. Every window states its row count,
 * a window that DOES hit its budget is reported as INCOMPLETE by name, and the time budget is
 * checked between windows so a partial answer is always labelled partial.
 */
function _awxAllFinancialTx(monthsBack, log) {
  monthsBack = monthsBack || 14;
  var _mk = 'm' + monthsBack;
  if (_AWX_TX_MEMO[_mk]) { if (log) log('financial_transactions (memo reuse) ' + _AWX_TX_MEMO[_mk].length + ' rows'); return _AWX_TX_MEMO[_mk]; }

  var iso = function (d) { return Utilities.formatDate(d, 'UTC', "yyyy-MM-dd'T'HH:mm:ssXXX"); };
  var now = new Date();
  var out = [], deadline = Date.now() + 280000, truncated = [], stoppedEarly = null;

  for (var back = 0; back < monthsBack; back++) {
    if (Date.now() >= deadline) {
      stoppedEarly = back;
      break;
    }
    var wFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1, 0, 0, 0));
    var wTo   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back + 1, 1, 0, 0, 0));
    var label = Utilities.formatDate(wFrom, 'UTC', 'yyyy-MM');
    var page = 0, got = 0, hitCap = false;
    while (page < 60) {
      var r = _awxGet('/api/v1/financial_transactions', {
        page_num: page, page_size: 100,
        from_created_at: iso(wFrom), to_created_at: iso(wTo)
      });
      if (r.code !== 200) {
        if (log) log('financial_transactions ' + label + ' HTTP ' + r.code + ' p' + page + ' ' + r.body.slice(0, 150));
        break;
      }
      var j = JSON.parse(r.body), items = j.items || [];
      for (var i = 0; i < items.length; i++) out.push(items[i]);
      got += items.length;
      if (!j.has_more) break;
      page++;
      if (page >= 60) hitCap = true;
      Utilities.sleep(200);
    }
    if (hitCap) truncated.push(label);
    if (log) log('  ' + label + ': ' + got + ' rows' + (hitCap ? '  ⚠ INCOMPLETE (hit the 6,000-row window budget)' : ''));
  }

  if (log) {
    log('financial_transactions pulled ' + out.length + ' rows across ' +
        (stoppedEarly === null ? monthsBack : stoppedEarly) + ' of ' + monthsBack + ' month(s) requested');
    if (stoppedEarly !== null) {
      log('⚠ STOPPED EARLY at the 280s time budget after ' + stoppedEarly + ' month(s). Months older ' +
          'than that are MISSING from this run. Re-run, or call with a smaller monthsBack and read ' +
          'the older months in a second pass.');
    }
    if (truncated.length) {
      log('⚠ INCOMPLETE month(s): ' + truncated.join(', ') + '. Those months hold more than 6,000 ' +
          'transactions and were cut. Any figure covering them is a FLOOR, not a total.');
    }
  }
  _AWX_TX_MEMO[_mk] = out;
  return out;
}

function awxSyncFees(monthsBack) {
  monthsBack = monthsBack || 14;
  var ss = _getSSActive();
  ss.toast('Pulling Airwallex financial transactions…', '💳', 30);
  var tx = _awxAllFinancialTx(monthsBack, function (m) { Logger.log(m); });
  if (!tx.length) { ss.toast('No transactions returned (check permissions / window).', '❌', 10); return; }

  // aggregate by month
  var M = {};
  tx.forEach(function (t) {
    var d = t.created_at ? new Date(t.created_at) : null; if (!d || isNaN(d.getTime())) return;
    var k = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM');
    var m = M[k] || (M[k] = { pay: 0, cnt: 0, gw: 0, fx: 0, other: 0, fee: 0, net: 0 });
    var amt = parseFloat(t.amount) || 0, fee = parseFloat(t.fee) || 0, net = parseFloat(t.net) || 0;
    var tt = String(t.transaction_type || '').toUpperCase();
    var isFx = (t.currency_pair != null && t.currency_pair !== '');
    m.fee += fee; m.net += net;
    if (tt === 'PAYMENT') { m.pay += amt; m.cnt++; m.gw += fee; } else { m.other += fee; }
    if (isFx) m.fx += fee;
  });

  var keys = Object.keys(M).sort().reverse();   // newest first
  var USD = '"$"#,##0.00', PCT = '0.00%', NUM = '#,##0';
  var rows = [], tot = { pay: 0, cnt: 0, gw: 0, fx: 0, other: 0, fee: 0, est: 0 };
  keys.forEach(function (k) {
    var m = M[k];
    var eff = m.pay > 0 ? m.gw / m.pay : 0;
    var est = m.pay * AWX_PL_RATE + m.cnt * AWX_PL_FIXED;   // what P&L currently assumes
    var delta = m.gw - est;                                  // real gateway − P&L estimate (hidden gap)
    tot.pay += m.pay; tot.cnt += m.cnt; tot.gw += m.gw; tot.fx += m.fx; tot.other += m.other; tot.fee += m.fee; tot.est += est;
    rows.push([k, m.pay, m.cnt, m.gw, eff, est, delta, m.fx, m.other, m.fee, m.net]);
  });

  var ws = ss.getSheetByName(AWX_FEE_SHEET) || ss.insertSheet(AWX_FEE_SHEET);
  _dplResetSheet(ws);
  var W = 11, stamp = Utilities.formatDate(new Date(), DPL.VN_TZ, 'dd/MM/yyyy HH:mm');
  ws.getRange(1, 1, 1, W).merge().setValue('💳  GerberaPrints — Airwallex Fees  (REAL gateway/FX/payout cost vs P&L estimate)')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1, 34);
  var effAll = tot.pay > 0 ? tot.gw / tot.pay : 0;
  ws.getRange(2, 1, 1, W).merge().setValue('Updated: ' + stamp + ' ICT  ·  Source = Airwallex /financial_transactions (field "fee"). ' +
    'REAL blended gateway rate = ' + (effAll * 100).toFixed(2) + '% vs P&L estimate ' + (AWX_PL_RATE * 100).toFixed(1) + '%+$' + AWX_PL_FIXED.toFixed(2) + '/order. ' +
    'Δ Hidden = real gateway fee − P&L estimate (P&L understates by this). FX & Payout/Other fees are EXTRA costs not in P&L at all. Next: wire real fee into the P&L Gateway column.')
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(DPL.TNR).setFontSize(9).setFontStyle('italic').setWrap(true).setVerticalAlignment('middle');
  ws.setRowHeight(2, 44); ws.setRowHeight(3, 6);

  var hdr = ['Month', 'Payments ($)', '# Pmts', 'Processing Fee ($)', 'Eff Rate %', 'P&L Est ($)', 'Δ Hidden ($)', 'FX Fee ($)', 'Payout/Other Fee ($)', 'Total Fee ($)', 'Net Settled ($)'];
  ws.getRange(4, 1, 1, W).setValues([hdr]).setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(DPL.TNR)
    .setFontSize(10).setFontWeight('bold').setHorizontalAlignment('center').setWrap(true);
  ws.setRowHeight(4, 30);

  if (rows.length) {
    ws.getRange(5, 1, rows.length, W).setValues(rows).setFontFamily(DPL.TNR).setFontSize(10);
    [2, 4, 6, 7, 8, 9, 10, 11].forEach(function (c) { ws.getRange(5, c, rows.length, 1).setNumberFormat(USD); });
    ws.getRange(5, 3, rows.length, 1).setNumberFormat(NUM);
    ws.getRange(5, 5, rows.length, 1).setNumberFormat(PCT);
    // color Δ Hidden (col 7): red if P&L understates (delta>0)
    for (var i = 0; i < rows.length; i++) {
      var dl = rows[i][6];
      ws.getRange(5 + i, 7).setFontColor(dl > 1 ? '#B91C1C' : (dl < -1 ? '#16A34A' : '#334155')).setFontWeight('bold');
      ws.getRange(5 + i, 5).setFontColor(rows[i][4] > AWX_PL_RATE ? '#B91C1C' : '#16A34A').setFontWeight('bold');
    }
    var tr = 5 + rows.length;
    ws.getRange(tr, 1, 1, W).setValues([['TOTAL', tot.pay, tot.cnt, tot.gw, effAll, tot.est, tot.gw - tot.est, tot.fx, tot.other, tot.fee, '']])
      .setFontFamily(DPL.TNR).setFontSize(10).setFontWeight('bold').setBackground('#F1F5F9');
    [2, 4, 6, 7, 8, 9, 10].forEach(function (c) { ws.getRange(tr, c, 1, 1).setNumberFormat(USD); });
    ws.getRange(tr, 3).setNumberFormat(NUM); ws.getRange(tr, 5).setNumberFormat(PCT);
  }
  ws.setColumnWidth(1, 84);
  [104, 64, 110, 84, 96, 104, 96, 130, 100, 110].forEach(function (w, i) { ws.setColumnWidth(i + 2, w); });
  try { ws.setFrozenRows(4); } catch (e) {}
  ss.toast('✅ Airwallex Fees: real ' + (effAll * 100).toFixed(2) + '% vs P&L ' + (AWX_PL_RATE * 100).toFixed(1) +
           '% · hidden Δ $' + (tot.gw - tot.est).toFixed(0) + ' + FX $' + tot.fx.toFixed(0) + ' + payout $' + tot.other.toFixed(0), '💳', 12);
}

// ════════════════════════════════════════════════════════════════════════
//  #4 mảng (2b) — DAILY FEE CACHE  (feeds P&L Gateway override, v27.56)
//  awxSyncDaily(): writes '💳 Airwallex Daily' (real gateway fee per day).
//  _awxGwByDay()/_awxGwByMonth(): fast readers the P&L calls (fallback-safe).
//  Run awxSyncDaily ~12:00 ICT (BEFORE _dplDailyCore @13:00) so the P&L picks
//  up real fees. PayPal fees are NOT in Airwallex → P&L keeps PayPal estimated.
// ════════════════════════════════════════════════════════════════════════
var AWX_DAILY_SHEET = '💳 Airwallex Daily';

function awxSyncDaily(monthsBack) {
  monthsBack = monthsBack || 14;
  var ss = _getSSActive();
  ss.toast('Pulling Airwallex daily fees…', '💳', 30);
  var tx = _awxAllFinancialTx(monthsBack, function (m) { Logger.log(m); });
  if (!tx.length) { ss.toast('No transactions returned (check permissions / window).', '❌', 10); return; }

  var D = {};
  tx.forEach(function (t) {
    var d = t.created_at ? new Date(t.created_at) : null; if (!d || isNaN(d.getTime())) return;
    var k = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM-dd');
    var x = D[k] || (D[k] = { gw: 0, fx: 0, other: 0, cnt: 0 });
    var fee = parseFloat(t.fee) || 0;
    var tt = String(t.transaction_type || '').toUpperCase();
    var isFx = (t.currency_pair != null && t.currency_pair !== '');
    if (tt === 'PAYMENT') { x.gw += fee; x.cnt++; } else { x.other += fee; }
    if (isFx) x.fx += fee;
  });

  var keys = Object.keys(D).sort().reverse();   // newest first
  var ws = ss.getSheetByName(AWX_DAILY_SHEET) || ss.insertSheet(AWX_DAILY_SHEET);
  _dplResetSheet(ws);
  var USD = '"$"#,##0.00', NUM = '#,##0';
  ws.getRange(1, 1, 1, 5).merge().setValue('💳  Airwallex Daily — REAL gateway fee per day  (P&L cache · do not edit)')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(13).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1, 30);
  ws.getRange(2, 1, 1, 5).setValues([['Date', 'Processing Fee ($)', 'FX Fee ($)', 'Payout/Other Fee ($)', '# Pmts']])
    .setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(DPL.TNR).setFontSize(10).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(2, 26);
  var rows = keys.map(function (k) { return [k, D[k].gw, D[k].fx, D[k].other, D[k].cnt]; });
  if (rows.length) {
    ws.getRange(3, 1, rows.length, 5).setValues(rows).setFontFamily(DPL.TNR).setFontSize(10);
    ws.getRange(3, 2, rows.length, 3).setNumberFormat(USD);
    ws.getRange(3, 5, rows.length, 1).setNumberFormat(NUM);
  }
  ws.setColumnWidth(1, 100); [110, 90, 134, 70].forEach(function (w, i) { ws.setColumnWidth(i + 2, w); });
  try { ws.setFrozenRows(2); } catch (e) {}
  ss.toast('✅ Airwallex Daily cache: ' + rows.length + ' days written. Rebuild Daily/Monthly P&L to apply.', '💳', 10);
}

/** Reader: { 'yyyy-MM-dd': realGatewayFee } from the daily cache. Empty {} if absent. */
function _awxGwByDay() {
  var out = {}, ss = _getSSActive(), ws = ss.getSheetByName(AWX_DAILY_SHEET);
  if (!ws || ws.getLastRow() < 3) return out;
  var tz = ss.getSpreadsheetTimeZone() || (typeof DPL !== 'undefined' ? DPL.VN_TZ : 'Asia/Bangkok');
  var n = ws.getLastRow() - 2, v = ws.getRange(3, 1, n, 2).getValues();
  for (var i = 0; i < n; i++) {
    var raw = v[i][0], k;                                   // v27.72: date-safe - Sheets stores col A as Date object, not string
    if (raw instanceof Date && !isNaN(raw.getTime())) k = Utilities.formatDate(raw, tz, 'yyyy-MM-dd');
    else k = String(raw).trim().substring(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(k)) out[k] = parseFloat(v[i][1]) || 0;
  }
  return out;
}

/** Reader: { 'yyyy-MM': realGatewayFee } summed from the daily cache. */
function _awxGwByMonth() {
  var day = _awxGwByDay(), out = {};
  Object.keys(day).forEach(function (k) { var m = k.substring(0, 7); out[m] = (out[m] || 0) + day[k]; });
  return out;
}

/** Daily trigger ~12:00 ICT — runs BEFORE _dplDailyCore (@13:00). Surgical: only its own handler. */
/** awxDiagOverride() \u2014 read-only. PROVES why P&L Processing AWX \u2260 real Airwallex fee.
 *  Shows (1) raw type of the Daily date cell (Date vs string), (2) days parsed by
 *  _awxGwByDay, (3) real fee/month from _awxGwByMonth. View \u2192 Executions \u2192 Logs. */
function awxDiagOverride() {
  var ss = _getSSActive(), L = [];
  var ws = ss.getSheetByName(AWX_DAILY_SHEET);
  if (ws && ws.getLastRow() >= 3) {
    var raw = ws.getRange(3, 1).getValue();
    L.push('Airwallex Daily A3 raw = ' + raw + '   (type = ' + (raw instanceof Date ? 'DATE OBJECT \u26a0\ufe0f' : typeof raw) + ')');
  } else { L.push('Airwallex Daily: no data rows.'); }
  var d = _awxGwByDay(), dk = Object.keys(d), dTot = 0;
  dk.forEach(function (k) { dTot += d[k]; });
  L.push('_awxGwByDay   \u2192 ' + dk.length + ' days parsed \u00b7 total $' + dTot.toFixed(2));
  if (!dk.length) L.push('   \u26a0\ufe0f 0 days \u2192 reader cannot match the date column \u2192 override SILENTLY no-ops (try/catch) \u2192 P&L falls back to ESTIMATE. THIS is the ~$700 gap.');
  var m = _awxGwByMonth(), mk = Object.keys(m).sort(), mTot = 0;
  mk.forEach(function (k) { mTot += m[k]; });
  L.push('_awxGwByMonth \u2192 ' + mk.length + ' months \u00b7 total $' + mTot.toFixed(2) + '   (what the override SHOULD feed the P&L)');
  mk.forEach(function (k) { L.push('   ' + k + '   $' + m[k].toFixed(2)); });
  Logger.log(L.join('\n'));
  ss.toast('awxDiagOverride done \u2014 View \u2192 Executions \u2192 Logs', '🔎', 8);
}

/** MASTER daily Airwallex refresh — ONE trigger refreshes all 3 cost tabs.
 *  _awxAllFinancialTx is memoized per execution, so the 14-month pull happens
 *  ONCE and is shared across Daily + Fees + CashFlow (no 3x API cost, stays well
 *  under the 6-min limit). Each step is isolated: one failure logs and the rest
 *  still run. This is what kills the manual updates on the Fees / CashFlow tabs. */
function awxDailyAll() {
  var ss = _getSSActive(), done = [], failed = [];
  [['Airwallex Daily',    function () { awxSyncDaily(14); }],
   ['Airwallex Fees',     function () { awxSyncFees(14); }],
   ['Airwallex CashFlow', function () { awxSyncCashFlow(14); }]
  ].forEach(function (step) {
    try { step[1](); done.push(step[0]); }
    catch (e) { failed.push(step[0] + ': ' + e.message); Logger.log('[awxDailyAll] ' + step[0] + ' FAILED: ' + e.message); }
  });
  var msg = '✅ Airwallex daily-all: ' + (done.join(', ') || 'none') +
            (failed.length ? '  ·  ⚠ FAILED ' + failed.join(' | ') : '');
  ss.toast(msg, '💳', 10); Logger.log('[awxDailyAll] ' + msg);
}

function awxInstallTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var h = t.getHandlerFunction();
    if (h === 'awxSyncDaily' || h === 'awxDailyAll') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('awxDailyAll').timeBased().everyDays(1).atHour(12).create();
  _getSSActive().toast('✅ Trigger installed: awxDailyAll daily ~12:00 ICT (Daily + Fees + CashFlow, one pull).', '💳', 8);
}

/** READ-ONLY — log every installed trigger so you can SEE what is automated
 *  vs still manual. View → Executions → Logs. */
function gpListTriggers() {
  var ts = ScriptApp.getProjectTriggers();
  var L = ['=== Installed triggers (' + ts.length + ') ==='];
  ts.forEach(function (t) {
    var src = t.getTriggerSource(); var when = '';
    try { when = (t.getEventType && t.getEventType()) ? String(t.getEventType()) : ''; } catch (e) {}
    L.push('  • ' + t.getHandlerFunction() + '  [' + src + (when ? ' / ' + when : '') + ']');
  });
  L.push('— Expected daily set: klRecoveryDaily(9) · awxDailyAll(12) · _dplDailyCore(13) · _dplDailyAnalytics(14) · fetchFBCampaignDaily(15:30) · hourly sync');
  Logger.log(L.join('\n'));
  try { _getSSActive().toast('Trigger list — View → Executions → Logs', '⏰', 8); } catch (e) {}
}

// ════════════════════════════════════════════════════════════════════════
//  awxDiag3() — DEEP COST AUDIT (find blind spots: payout fee, FX, cash flow)
//  Buckets ALL financial_transactions by type×source, lists currencies +
//  currency_pairs (FX) with sample rates, and computes payout cash flow.
//  Read-only. Run from editor → read the Logs.
// ════════════════════════════════════════════════════════════════════════
function awxDiag3() {
  var ss = _getSSActive(); ss.toast('Airwallex deep cost audit…', '🔎', 30);
  var tx = _awxAllFinancialTx(14, function (m) { Logger.log(m); });
  Logger.log('===== TOTAL rows: ' + tx.length + ' =====');

  var B = {}, cur = {}, pair = {}, st = {};
  var paidOut = 0, paymentsAmt = 0, paymentsFee = 0, netSum = 0, feePosNonPay = 0;
  tx.forEach(function (t) {
    var amt = parseFloat(t.amount) || 0, fee = parseFloat(t.fee) || 0, net = parseFloat(t.net) || 0;
    var tt = String(t.transaction_type || '?'), srt = String(t.source_type || '?');
    var key = tt + ' | ' + srt;
    var b = B[key] || (B[key] = { n: 0, amt: 0, fee: 0, net: 0, feePos: 0 });
    b.n++; b.amt += amt; b.fee += fee; b.net += net; if (fee > 0) b.feePos++;
    netSum += net;
    cur[t.currency || '?'] = (cur[t.currency || '?'] || 0) + 1;
    if (t.currency_pair) {
      var p = pair[t.currency_pair] || (pair[t.currency_pair] = { n: 0, fee: 0, amt: 0, rates: [] });
      p.n++; p.fee += fee; p.amt += amt; if (p.rates.length < 6) p.rates.push(t.client_rate);
    }
    st[t.status || '?'] = (st[t.status || '?'] || 0) + 1;
    if (tt.toUpperCase() === 'PAYMENT') { paymentsAmt += amt; paymentsFee += fee; }
    else if (fee > 0) feePosNonPay++;
    if (amt < 0) paidOut += amt;
  });

  Logger.log('===== by transaction_type | source_type  (n · Σamount · Σfee · Σnet · #fee>0) =====');
  Object.keys(B).sort().forEach(function (k) { var b = B[k]; Logger.log(k + '  →  n=' + b.n + '  amt=' + b.amt.toFixed(2) + '  fee=' + b.fee.toFixed(2) + '  net=' + b.net.toFixed(2) + '  feePos=' + b.feePos); });
  Logger.log('===== currency counts ====='); Logger.log(JSON.stringify(cur));
  Logger.log('===== currency_pair (FX) — n · Σamount · Σfee(field) · sampleRates =====');
  if (Object.keys(pair).length) Object.keys(pair).forEach(function (k) { var p = pair[k]; Logger.log(k + '  n=' + p.n + '  Σamt=' + p.amt.toFixed(2) + '  Σfee=' + p.fee.toFixed(2) + '  rates=' + JSON.stringify(p.rates)); });
  else Logger.log('(no currency_pair transactions in window — paid out in USD, no FX conversion)');
  Logger.log('===== status ====='); Logger.log(JSON.stringify(st));
  Logger.log('===== CASH / PAYOUT SUMMARY =====');
  Logger.log('Payments Σamount = ' + paymentsAmt.toFixed(2));
  Logger.log('Payments Σfee (gateway) = ' + paymentsFee.toFixed(2) + '  (' + (paymentsAmt > 0 ? (paymentsFee / paymentsAmt * 100).toFixed(2) : '0') + '%)');
  Logger.log('NON-payment transactions carrying a fee>0 = ' + feePosNonPay + '  (if 0 → no separate payout/FX fee in the fee field)');
  Logger.log('Paid OUT to bank (Σ negative amounts) = ' + paidOut.toFixed(2));
  Logger.log('Σ net all tx = ' + netSum.toFixed(2) + '  ← net balance change over window (≈ cash still in Airwallex if not all paid out)');
  ss.toast('✅ Deep audit done — paste the Logs (types + FX + cash).', '🔎', 14);
}

// ════════════════════════════════════════════════════════════════════════
//  awxSyncCashFlow() — '💳 Airwallex Cash Flow' (full money movement / month)
//  Surfaces ALL cost & cash categories transparently so nothing hides:
//    Payments In · Gateway Fee · Other Fees (FEE bucket) · Refunds ·
//    Disputes(net) · Card Spend · Reserve Δ · Payout→Bank · Net Balance Δ
//  Annotates which columns are ALREADY in the P&L vs MISSING (avoid double-count).
//  Read-only. Does NOT change the P&L.
// ════════════════════════════════════════════════════════════════════════
// ═════════════════════════════════════════════════════════════════════════
//  v0.2  DISPUTE SCORECARD  —  the number that can end the business
//
//  Visa places a merchant into its monitoring programme at a 0.9% dispute rate and Mastercard at
//  1.5%. Past those, fines start and the acquirer can close the account. For a store that already
//  cannot use Shopify Payments, losing Airwallex would stop trading, not inconvenience it.
//
//  Until now that ratio could not be produced at all. The cash-flow sheet reports dispute DOLLARS by
//  month, which is the wrong unit: the card schemes count CASES against ORDERS, and a month of two
//  large disputes reads the same in dollars as a month of ten small ones while being far safer.
//
//  No new endpoint is needed. Every dispute already moves money and therefore already appears in
//  financial_transactions, which this file has been pulling all along. A debit is a case opened
//  against us; a credit under a dispute type is that money coming back, which means the case was
//  won or withdrawn. Counting the two separately gives case volume, dispute rate and win rate from
//  data already in hand.
//
//  Honest about its limits: this counts MONEY MOVEMENTS, not case records. A dispute opened and not
//  yet debited will not appear, and a reason code is not available here. For that, Airwallex's
//  disputes endpoint would be needed. As an early-warning ratio against a threshold, movements are
//  enough, and having the ratio approximately is worth incomparably more than not having it.
// ═════════════════════════════════════════════════════════════════════════
// ═════════════════════════════════════════════════════════════════════════
//  v0.4  REAL DISPUTE REGISTER, from the Airwallex CSV export
//
//  The transaction proxy in v0.3 was close on volume and badly wrong on outcome, and the export
//  shows why. 84 real cases against 75 counted from money movements, so roughly one case in ten
//  never moves money at the stage it is raised and stays invisible to the proxy. That part is
//  acceptable for an early warning.
//
//  The outcome was not. The proxy reported a 67% win rate by dividing reversals by reversals plus
//  DISPUTE_LOST entries. But 56 of 73 resolved cases were ACCEPTED, meaning the dispute was conceded
//  without a fight, and an accepted case emits no DISPUTE_LOST at all. The whole of the largest loss
//  category was missing from the denominator. The real win rate is 20.5%.
//
//  A number that flatters by three times is worse than no number, so the register below reads the
//  export directly and the proxy stops claiming a win rate it cannot see.
//
//  HOW TO USE: in Airwallex, Disputes, export the list to CSV, then paste the whole file into a
//  sheet named exactly as AWX_DISPUTE_IMPORT below, starting at cell A1. Run this. The two preamble
//  lines Airwallex adds above the header are skipped automatically.
// ═════════════════════════════════════════════════════════════════════════
var AWX_DISPUTE_IMPORT = '\uD83D\uDCE5 Dispute Import';
var AWX_DISPUTE_REAL   = '\u2696\uFE0F Dispute Register';

/** Locate a column by a fragment of its header, so a renamed or reordered export still binds. */
function _awxCol(hdr, want) {
  var w = want.toLowerCase();
  for (var i = 0; i < hdr.length; i++) {
    if (String(hdr[i] || '').toLowerCase().indexOf(w) >= 0) return i;
  }
  return -1;
}

function awxBuildDisputeRegister() {
  var ss = _getSSActive();
  var src = ss.getSheetByName(AWX_DISPUTE_IMPORT);
  if (!src || src.getLastRow() < 2) {
    var help = 'Paste the Airwallex dispute CSV into a sheet named "' + AWX_DISPUTE_IMPORT + '" first.\n\n' +
               'Airwallex > Disputes > Export > CSV, then paste the whole file at A1.';
    try { SpreadsheetApp.getUi().alert(help); } catch (e) { Logger.log(help); }
    return;
  }
  var raw = src.getDataRange().getValues();

  // Airwallex writes 'Filters applied' and a blank line above the real header. Find the header by
  // looking for the row that actually contains the dispute columns, rather than assuming row 3.
  var h = -1;
  for (var i = 0; i < Math.min(raw.length, 10) && h < 0; i++) {
    if (_awxCol(raw[i], 'dispute reason') >= 0 && _awxCol(raw[i], 'dispute status') >= 0) h = i;
  }
  if (h < 0) { Logger.log('[awxBuildDisputeRegister] header row not found'); return; }
  var hdr = raw[h];
  var cReason = _awxCol(hdr, 'dispute reason'), cStatus = _awxCol(hdr, 'dispute status');
  var cStage  = _awxCol(hdr, 'dispute stage'),  cTime   = _awxCol(hdr, 'disputed time');
  var cAmt    = _awxCol(hdr, 'dispute amount'), cMethod = _awxCol(hdr, 'payment method');
  var cOrder  = _awxCol(hdr, 'order id');

  // v0.5 KNOWN STATUS VALUES. A pasted CSV shifts columns wherever a field contains a comma, and a
  // shifted row quietly lands a dollar amount in the reason column and a payment id in the date.
  // The first run showed it: a month called 'int_hkp', reasons reading '224.8' and '99.9', and an
  // outcome of '0'. Three rows, silently mixed into every percentage on the sheet.
  // Rows that do not look like dispute rows are now counted as MALFORMED and excluded, and the
  // count is printed at the top, because a register that quietly absorbs corruption is worse than
  // one that refuses it out loud.
  var VALID_STATUS = { 'ACCEPTED':1, 'WON':1, 'LOST':1, 'REVERSED':1, 'CHALLENGED':1,
                       'REQUIRES RESPONSE':1, 'PENDING CLOSURE':1, 'EXPIRED':1, 'CLOSED':1 };
  var byMonth = {}, byReason = {}, byStatus = {}, byMethod = {}, n = 0, totAmt = 0;
  var malformed = 0, autoRefund = 0, autoRefundAmt = 0, bigConceded = 0, bigConcededAmt = 0;
  var AUTO_REFUND_LIMIT = 100;   // Airwallex agreement: disputes under this are refunded automatically
  for (var r = h + 1; r < raw.length; r++) {
    var row = raw[r];
    var st = String(cStatus >= 0 ? row[cStatus] : '').trim();
    if (!st) continue;
    var mk = String(cTime >= 0 ? row[cTime] : '').trim().slice(0, 7) || '';
    if (!VALID_STATUS[st.toUpperCase()] || !/^\d{4}-\d{2}$/.test(mk)) { malformed++; continue; }
    n++;
    var amt = parseFloat(cAmt >= 0 ? row[cAmt] : 0) || 0; totAmt += amt;
    // The auto-refund agreement is the single biggest driver of the outcome mix, so it is measured
    // rather than left as an explanation. Every contested case in the export is at or above $100;
    // not one below it was ever fought, which is the agreement working exactly as signed.
    var isAuto = (amt < AUTO_REFUND_LIMIT) && /^accepted$/i.test(st);
    if (isAuto) { autoRefund++; autoRefundAmt += amt; }
    if (!isAuto && /^accepted$/i.test(st)) { bigConceded++; bigConcededAmt += amt; }
    var m = byMonth[mk] || (byMonth[mk] = { n: 0, amt: 0, won: 0, accepted: 0, open: 0 });
    m.n++; m.amt += amt;
    // Accepted means the dispute was conceded, which is a loss with the paperwork skipped. Grouping
    // it with 'resolved' and away from 'won' is the whole point; the proxy could not see it.
    if (/^won$|reversed/i.test(st)) m.won++;
    else if (/^accepted$|^lost$/i.test(st)) m.accepted++;
    else m.open++;
    var rs = String(cReason >= 0 ? row[cReason] : '').trim() || '(blank)';
    byReason[rs] = (byReason[rs] || 0) + 1;
    byStatus[st] = (byStatus[st] || 0) + 1;
    var pm = String(cMethod >= 0 ? row[cMethod] : '').trim() || '(blank)';
    byMethod[pm] = (byMethod[pm] || 0) + 1;
  }

  var orders = _awxOrdersByMonth();
  var ws = ss.getSheetByName(AWX_DISPUTE_REAL) || ss.insertSheet(AWX_DISPUTE_REAL);
  _dplResetSheet(ws);
  var W = 9, USD = '"$"#,##0.00', PCT = '0.00%', TNR = DPL.TNR;
  var stamp = Utilities.formatDate(new Date(), DPL.VN_TZ, 'dd/MM/yyyy HH:mm');

  var resolved = 0, won = 0;
  Object.keys(byMonth).forEach(function(k){ resolved += byMonth[k].won + byMonth[k].accepted; won += byMonth[k].won; });
  var tOrd = 0; Object.keys(byMonth).forEach(function(k){ tOrd += (orders[k] || 0); });
  var overall = tOrd > 0 ? n / tOrd : 0;

  ws.getRange(1, 1, 1, W).merge()
    .setValue('\u2696\uFE0F  Dispute Register (real export)  \u00b7  ' + n + ' case(s)  \u00b7  $' + totAmt.toFixed(2) +
              ' disputed  \u00b7  rate ' + (overall * 100).toFixed(2) + '% vs Visa 0.90%  \u00b7  win rate ' +
              (resolved > 0 ? (100 * won / resolved).toFixed(1) : '0') + '% of ' + resolved + ' resolved' +
              (malformed ? '  \u00b7  \u26A0 ' + malformed + ' MALFORMED ROW(S) EXCLUDED' : '') + '  \u00b7  ' + stamp)
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(TNR).setFontSize(13).setFontWeight('bold');
  ws.setRowHeight(1, 30);

  // The auto-refund agreement, stated before any outcome table, because without it the 66% 'Accepted'
  // reads as a team giving up when most of it is a contract signed when the average order was larger.
  ws.getRange(2, 1, 1, W).merge()
    .setValue('Airwallex auto-refunds disputes under $' + AUTO_REFUND_LIMIT + ' under the agreement signed when AOV was higher: ' +
              autoRefund + ' case(s), $' + autoRefundAmt.toFixed(2) + ' returned without any review. ' +
              'Separately, ' + bigConceded + ' case(s) worth $' + bigConcededAmt.toFixed(2) + ' were AT OR ABOVE $' + AUTO_REFUND_LIMIT +
              ' and were still accepted rather than contested. Those were winnable and are the money worth chasing. ' +
              'No case below $' + AUTO_REFUND_LIMIT + ' in this export was ever contested, which is the agreement working as signed.' +
              (malformed ? '  \u26A0 ' + malformed + ' row(s) were dropped as corrupted: re-import with File > Import > Replace current sheet rather than pasting, so a comma inside a field does not shift the columns.' : ''))
    .setBackground('#FEF3C7').setFontColor('#78350F').setFontFamily(TNR).setFontSize(9).setWrap(true);
  ws.setRowHeight(2, 54);

  var R = 4;
  ws.getRange(R, 1, 1, W).merge().setValue('BY MONTH')
    .setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(TNR).setFontWeight('bold').setFontSize(10); R++;
  ws.getRange(R, 1, 1, 8).setValues([['Month', 'Orders', 'Cases', 'Dispute rate', 'Won', 'Conceded / lost', 'Still open', 'Disputed ($)']])
    .setBackground('#1E293B').setFontColor('#E2E8F0').setFontFamily(TNR).setFontWeight('bold').setFontSize(10); R++;
  var mk = Object.keys(byMonth).sort().reverse();
  mk.forEach(function(k){
    var m = byMonth[k], ord = orders[k] || 0, rate = ord > 0 ? m.n / ord : '';
    ws.getRange(R, 1, 1, 8).setValues([[k, ord, m.n, rate, m.won, m.accepted, m.open, m.amt]])
      .setFontFamily(TNR).setFontSize(10);
    ws.getRange(R, 4).setNumberFormat(PCT); ws.getRange(R, 8).setNumberFormat(USD);
    var bg = (ord > 0 && rate >= AWX_MC_LIMIT) ? '#FEE2E2'
           : (ord > 0 && rate >= AWX_VISA_LIMIT) ? '#FFEDD5'
           : '#F0FDF4';
    ws.getRange(R, 1, 1, 8).setBackground(bg);
    R++;
  });
  R++;

  function tbl(title, obj, note) {
    ws.getRange(R, 1, 1, W).merge().setValue(title)
      .setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(TNR).setFontWeight('bold').setFontSize(10); R++;
    if (note) { ws.getRange(R, 1, 1, W).merge().setValue(note)
      .setFontFamily(TNR).setFontSize(9).setFontColor('#64748B').setFontStyle('italic').setWrap(true); ws.setRowHeight(R, 30); R++; }
    var ks = Object.keys(obj).sort(function(a, b){ return obj[b] - obj[a]; });
    ks.forEach(function(k){
      ws.getRange(R, 1, 1, 3).setValues([[k, obj[k], (n > 0 ? obj[k] / n : '')]]).setFontFamily(TNR).setFontSize(10);
      ws.getRange(R, 3).setNumberFormat(PCT);
      R++;
    });
    R++;
  }
  tbl('WHY THEY DISPUTE', byReason,
      'This is the column that decides what to fix. A dispute for goods not received is a fulfilment ' +
      'problem, one for an unrecognised charge is a billing-descriptor problem, and one for the item ' +
      'not matching is a product-page problem. Three different repairs, and only this tells them apart.');
  tbl('OUTCOME', byStatus,
      'Accepted means the case was conceded rather than contested. It costs the same as losing.');
  tbl('PAYMENT METHOD', byMethod, '');

  [220, 90, 90, 110, 90, 130, 100, 120, 120].forEach(function(w, i){ ws.setColumnWidth(i + 1, w); });
  ws.setFrozenRows(1);
  try { ss.setActiveSheet(ws); } catch (e) {}
  Logger.log('[awxBuildDisputeRegister] ' + n + ' cases | rate ' + (overall * 100).toFixed(2) +
             '% | win ' + won + '/' + resolved);
}

var AWX_DISPUTE_SHEET = '\u2696\uFE0F Dispute Scorecard';
var AWX_VISA_LIMIT = 0.009;      // Visa Dispute Monitoring Programme
var AWX_MC_LIMIT   = 0.015;      // Mastercard Excessive Chargeback Merchant

/** Orders per month from Shopify B2C: the denominator the card schemes actually use. */
function _awxOrdersByMonth() {
  var out = {};
  try {
    var ws = _getSSActive().getSheetByName(DPL.B2C);
    if (!ws || ws.getLastRow() < 3) return out;
    var v = ws.getRange(3, 1, ws.getLastRow() - 2, 16).getValues();
    v.forEach(function (r) {
      var d = r[0]; if (!(d instanceof Date) || isNaN(d.getTime())) return;
      if ((parseFloat(r[15]) || 0) <= 0) return;      // $0 rows are reships and seeds, not sales
      var k = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM');
      out[k] = (out[k] || 0) + 1;
    });
  } catch (e) { Logger.log('[_awxOrdersByMonth] ' + e.message); }
  return out;
}

function awxBuildDisputeScorecard(monthsBack) {
  monthsBack = monthsBack || 14;
  var ss = _getSSActive(); ss.toast('Building dispute scorecard\u2026', '\u2696\uFE0F', 30);
  var tx = _awxAllFinancialTx(monthsBack, function (m) { Logger.log(m); });
  if (!tx.length) { ss.toast('No transactions returned.', '\u274C', 8); return; }

  var orders = _awxOrdersByMonth();
  var M = {}, types = {};
  tx.forEach(function (t) {
    var tt = String(t.transaction_type || '').toUpperCase();
    if (tt.indexOf('DISPUTE') < 0 && tt.indexOf('CHARGEBACK') < 0) return;
    types[tt] = (types[tt] || 0) + 1;
    var d = t.created_at ? new Date(t.created_at) : null;
    if (!d || isNaN(d.getTime())) return;
    var k = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM');
    var m = M[k] || (M[k] = { opened: 0, openAmt: 0, won: 0, wonAmt: 0, lost: 0, lostAmt: 0 });
    var amt = parseFloat(t.amount) || 0;
    // v0.3 COUNT CASES BY TYPE, NOT BY DIRECTION. The first version treated every debit as a new
    // case, but one case moves money more than once: it is debited when raised (DISPUTE) and
    // debited again when finally decided against us (DISPUTE_LOST). Counting both inflated the
    // case count from 65 to 93 and the rate from 2.49% to 3.56%.
    // On a number that decides whether the payment gateway stays open, inflation is as dangerous as
    // understatement: cry wolf once and the next reading gets ignored.
    //   DISPUTE, PRE_CHARGEBACK_ACCEPTED -> a case is raised
    //   DISPUTE_REVERSAL                 -> that case came back to us, won
    //   DISPUTE_LOST                     -> that case is settled against us, NOT a new case
    if (tt === 'DISPUTE' || tt === 'PRE_CHARGEBACK_ACCEPTED') { m.opened++; m.openAmt += Math.abs(amt); }
    else if (tt.indexOf('REVERSAL') >= 0 || tt.indexOf('WON') >= 0) { m.won++; m.wonAmt += Math.abs(amt); }
    else if (tt.indexOf('LOST') >= 0) { m.lost++; m.lostAmt += Math.abs(amt); }
    // Any other dispute-typed movement is left uncounted on purpose and listed at the foot of the
    // sheet, so an unknown type is visible rather than silently folded into a number.
  });

  var keys = Object.keys(M).sort().reverse();
  if (!keys.length) {
    ss.toast('No dispute transactions found in the last ' + monthsBack + ' months.', '\u2696\uFE0F', 10);
    Logger.log('[awxBuildDisputeScorecard] no dispute-typed transactions; types seen: ' + JSON.stringify(types));
  }

  var rows = [], tOpen = 0, tWon = 0, tLost = 0, tOpenAmt = 0, tWonAmt = 0, tOrd = 0;
  keys.forEach(function (k) {
    var m = M[k], ord = orders[k] || 0;
    var rate = ord > 0 ? (m.opened / ord) : '';
    // v0.4 The proxy CANNOT compute a win rate and no longer pretends to. 56 of 73 resolved cases
    // were ACCEPTED, conceded without contest, and an accepted case emits no DISPUTE_LOST, so the
    // largest loss category is invisible here. v0.3 divided reversals by reversals plus LOST and
    // reported 67% against a real 20.5%. For the outcome, read the Dispute Register built from the
    // Airwallex export; this sheet is for volume only.
    var winRate = '';
    var verdict = (ord <= 0) ? 'no order count'
                : (rate >= AWX_MC_LIMIT)   ? '\uD83D\uDD34 OVER Mastercard 1.50%'
                : (rate >= AWX_VISA_LIMIT) ? '\uD83D\uDFE0 OVER Visa 0.90%'
                : (rate >= AWX_VISA_LIMIT * 0.75) ? '\uD83D\uDFE1 approaching Visa 0.90%'
                : '\u2705 safe';
    rows.push([k, ord, m.opened, rate, m.won, m.lost, winRate, m.openAmt, m.wonAmt,
               Math.round((m.openAmt - m.wonAmt) * 100) / 100, verdict]);
    tOpen += m.opened; tWon += m.won; tLost += m.lost;
    tOpenAmt += m.openAmt; tWonAmt += m.wonAmt; tOrd += ord;
  });

  var W = 11, USD = '"$"#,##0.00', PCT = '0.00%';
  var ws = ss.getSheetByName(AWX_DISPUTE_SHEET) || ss.insertSheet(AWX_DISPUTE_SHEET);
  _dplResetSheet(ws);
  var overall = tOrd > 0 ? (tOpen / tOrd) : 0;
  var stamp = Utilities.formatDate(new Date(), DPL.VN_TZ, 'dd/MM/yyyy HH:mm');

  ws.getRange(1, 1, 1, W).merge()
    .setValue('\u2696\uFE0F  Dispute Scorecard  \u00b7  ' + tOpen + ' case(s) opened over ' + tOrd +
              ' order(s)  \u00b7  overall ' + (overall * 100).toFixed(2) + '%  \u00b7  Visa limit 0.90%  \u00b7  Mastercard 1.50%  \u00b7  ' + stamp)
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(13).setFontWeight('bold');
  ws.setRowHeight(1, 30);

  ws.getRange(2, 1, 1, W).merge()
    .setValue('Counted from money movements in financial_transactions: a debit under a dispute type is a case ' +
              'opened, a credit is that case reversed in our favour. A dispute opened but not yet debited is ' +
              'not visible here, and no reason code is available, so read this as an early warning on the ' +
              'ratio rather than a case register. Losing the gateway would stop the store trading, which is ' +
              'why the ratio is worth watching approximately instead of not at all.  ·  ⚠ REVERSED IS NOT ' +
              'WON: Airwallex also reverses the debit on a pre-chargeback we CONCEDED, so this column counts ' +
              'wins plus concessions. For the real outcome and the reason codes, read ⚖️ Dispute Register, ' +
              'rebuilt from the Airwallex CSV export via awxBuildDisputeRegister().  ·  Coverage depends on ' +
              'the pull completing — check the execution log for INCOMPLETE or STOPPED EARLY before trusting ' +
              'the oldest months.')
    .setBackground('#FEF2F2').setFontColor('#7F1D1D').setFontFamily(DPL.TNR).setFontSize(9).setWrap(true);
  ws.setRowHeight(2, 42);

  // v0.8 HONEST LABELS. The column called 'Won' counted DISPUTE_REVERSAL, which is money coming
  // back — not a win. Airwallex also reverses the debit on a PRE_CHARGEBACK_ACCEPTED case, i.e. one
  // we CONCEDED. On 2026-08-18 the types were DISPUTE 53 + PRE_CHARGEBACK_ACCEPTED 22 = 75 opened,
  // with 38 reversals — and the real export shows only 16 genuinely won (15 Won + 1 Reversed).
  // 22 + 16 = 38 exactly, so the reversal count is wins PLUS conceded pre-chargebacks. Calling that
  // 'Won' turned a 21.9% win rate into an apparent 50%. It is now named for what it measures.
  // Per-month these also run ACROSS months: a case opened in June can reverse in August, which is
  // why August shows 3 opened and 6 reversed. That is timing, not an error.
  var hdr = ['Month', 'Orders', 'Cases opened', 'Dispute rate', 'Reversed (money back)', 'Debited as lost',
             'Win rate (settled)', 'Debited ($)', 'Returned ($)', 'Net loss ($)', 'Verdict'];
  ws.getRange(4, 1, 1, W).setValues([hdr])
    .setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(DPL.TNR).setFontWeight('bold').setFontSize(10);

  if (rows.length) {
    ws.getRange(5, 1, rows.length, W).setValues(rows).setFontFamily(DPL.TNR).setFontSize(10);
    ws.getRange(5, 4, rows.length, 1).setNumberFormat(PCT);
    // v0.7 Won/Lost are COUNTS and are formatted as such EXPLICITLY. An earlier layout kept a
    // percent column where Lost now sits; _dplResetSheet does not clear number formats, so the
    // stale percent survived every rebuild and 3 lost cases rendered as '300.00%'. A count that
    // prints as a percentage is the same class of lie as a revenue printed as a ROAS.
    ws.getRange(5, 5, rows.length, 2).setNumberFormat('#,##0');
    ws.getRange(5, 7, rows.length, 1).setNumberFormat(PCT);
    ws.getRange(5, 8, rows.length, 3).setNumberFormat(USD);
    for (var i = 0; i < rows.length; i++) {
      var v = String(rows[i][10]);
      var bg = v.indexOf('OVER Mastercard') >= 0 ? '#FEE2E2'
             : v.indexOf('OVER Visa') >= 0 ? '#FFEDD5'
             : v.indexOf('approaching') >= 0 ? '#FEF9C3' : '#F0FDF4';
      ws.getRange(5 + i, 1, 1, W).setBackground(bg);
    }
    var tr = 5 + rows.length;
    // v0.6 The TOTAL row no longer computes reversals ÷ (reversals + LOST). v0.4 blanked that
    // metric on every monthly row because ACCEPTED cases (56 of 73, conceded under the auto-refund
    // agreement) emit no DISPUTE_LOST and are invisible to it — it printed 67% against a real
    // 20.5%. Leaving the same formula alive on the TOTAL row kept the one number the eye lands on
    // first as the one number the sheet had already declared it cannot compute. For outcomes, read
    // the ⚖️ Dispute Register (built from the real export); this sheet is volume only.
    ws.getRange(tr, 1, 1, W).setValues([['TOTAL', tOrd, tOpen, (tOrd > 0 ? tOpen / tOrd : ''), tWon, tLost,
                                         '', tOpenAmt, tWonAmt,
                                         Math.round((tOpenAmt - tWonAmt) * 100) / 100, '']])
      .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontWeight('bold').setFontSize(10);
    ws.getRange(tr, 4).setNumberFormat(PCT); ws.getRange(tr, 5, 1, 2).setNumberFormat('#,##0'); ws.getRange(tr, 7).setNumberFormat(PCT);
    ws.getRange(tr, 8, 1, 3).setNumberFormat(USD);
  } else {
    ws.getRange(5, 1, 1, W).merge().setValue('(no dispute-typed transactions in the window)')
      .setFontFamily(DPL.TNR).setFontSize(10).setFontColor('#166534');
  }

  var lastRow = 6 + rows.length;
  ws.getRange(lastRow, 1, 1, W).merge()
    .setValue('Transaction types seen: ' + (Object.keys(types).length ? JSON.stringify(types) : 'none') +
              '  \u00b7  if a type here looks like a dispute but was not counted, it needs adding to the filter.')
    .setFontFamily(DPL.TNR).setFontSize(9).setFontColor('#64748B').setFontStyle('italic');

  [90, 80, 110, 100, 70, 70, 130, 110, 110, 110, 200].forEach(function (w, i) { ws.setColumnWidth(i + 1, w); });
  ws.setFrozenRows(4);
  try { ss.setActiveSheet(ws); } catch (e) {}
  Logger.log('[awxBuildDisputeScorecard] ' + tOpen + ' opened / ' + tOrd + ' orders = ' +
             (overall * 100).toFixed(2) + '% | reversed ' + tWon + ' | types ' + JSON.stringify(types));
  ss.toast('\u2696\uFE0F ' + tOpen + ' case(s) / ' + tOrd + ' orders = ' + (overall * 100).toFixed(2) +
           '%  (Visa 0.90% \u00b7 MC 1.50%)', '\u2696\uFE0F', 20);
}

var AWX_CASHFLOW_SHEET = '💳 Airwallex Cash Flow';

function awxSyncCashFlow(monthsBack) {
  monthsBack = monthsBack || 14;
  var ss = _getSSActive(); ss.toast('Building Airwallex cash flow…', '💵', 30);
  var tx = _awxAllFinancialTx(monthsBack, function (m) { Logger.log(m); });
  if (!tx.length) { ss.toast('No transactions returned.', '❌', 8); return; }

  var M = {};
  tx.forEach(function (t) {
    var d = t.created_at ? new Date(t.created_at) : null; if (!d || isNaN(d.getTime())) return;
    var k = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM');
    var m = M[k] || (M[k] = { payIn: 0, gwFee: 0, otherFee: 0, refund: 0, dispute: 0, card: 0, reserve: 0, payout: 0, net: 0 });
    var amt = parseFloat(t.amount) || 0, fee = parseFloat(t.fee) || 0, net = parseFloat(t.net) || 0;
    var tt = String(t.transaction_type || '').toUpperCase();
    m.net += net;
    if (tt === 'PAYMENT') { m.payIn += amt; m.gwFee += fee; }
    else if (tt === 'FEE') { m.otherFee += -amt; }                                  // account/dispute/admin fees (cost +)
    else if (tt === 'REFUND') { m.refund += -amt; }                                 // already in P&L
    else if (tt.indexOf('DISPUTE') >= 0 || tt === 'PRE_CHARGEBACK_ACCEPTED') { m.dispute += amt; }  // net cash (neg=loss)
    else if (tt === 'ISSUING_CAPTURE') { m.card += -amt; }                          // card spend (cash out +)
    else if (tt.indexOf('RESERVE') >= 0) { m.reserve += amt; }                      // rolling reserve Δ
    else if (tt.indexOf('PAYOUT') >= 0 || tt === 'DC_DEBIT') { m.payout += -amt; }  // cash to bank (+)
    // ISSUING_AUTHORISATION_HOLD/RELEASE net to zero → ignored (still in m.net)
  });

  var keys = Object.keys(M).sort().reverse();
  var ws = ss.getSheetByName(AWX_CASHFLOW_SHEET) || ss.insertSheet(AWX_CASHFLOW_SHEET);
  _dplResetSheet(ws);
  var W = 10, USD = '"$"#,##0.00', stamp = Utilities.formatDate(new Date(), DPL.VN_TZ, 'dd/MM/yyyy HH:mm');
  ws.getRange(1, 1, 1, W).merge().setValue('💵  GerberaPrints — Airwallex Cash Flow  (full money movement · real cash truth)')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1, 34);
  ws.getRange(2, 1, 1, W).merge().setValue('Updated: ' + stamp + ' ICT  ·  Source = Airwallex /financial_transactions.  ' +
    '🟢 ALREADY in P&L: Processing Fee (Processing col), Refunds (revenue is refund-adjusted).  ' +
    '🔴 MISSING from P&L (still inflating profit): Account & Dispute Fees + Disputes(net).  ' +
    '🟡 Card Spend = paid via Airwallex card — exclude if already in FB/Google/Fixed.  ' +
    'Payout→Bank is FREE (fee $0). USD→VND FX happens at your VN bank on receipt (not visible here).')
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(DPL.TNR).setFontSize(9).setFontStyle('italic').setWrap(true).setVerticalAlignment('middle');
  ws.setRowHeight(2, 58); ws.setRowHeight(3, 6);

  var hdr = ['Month', 'Payments In ($)', 'Processing Fee ($) 🟢', 'Account & Dispute Fees ($) 🔴', 'Refunds ($) 🟢', 'Disputes net ($) 🔴', 'Card Spend ($) 🟡', 'Reserve Δ ($)', 'Payout→Bank ($)', 'Net Balance Δ ($)'];
  ws.getRange(4, 1, 1, W).setValues([hdr]).setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(DPL.TNR)
    .setFontSize(10).setFontWeight('bold').setHorizontalAlignment('center').setWrap(true);
  ws.setRowHeight(4, 34);

  var tot = { payIn: 0, gwFee: 0, otherFee: 0, refund: 0, dispute: 0, card: 0, reserve: 0, payout: 0, net: 0 };
  var rows = keys.map(function (k) {
    var m = M[k];
    Object.keys(tot).forEach(function (f) { tot[f] += m[f]; });
    return [k, m.payIn, m.gwFee, m.otherFee, m.refund, m.dispute, m.card, m.reserve, m.payout, m.net];
  });
  if (rows.length) {
    ws.getRange(5, 1, rows.length, W).setValues(rows).setFontFamily(DPL.TNR).setFontSize(10);
    ws.getRange(5, 2, rows.length, W - 1).setNumberFormat(USD);
    for (var i = 0; i < rows.length; i++) {
      ws.getRange(5 + i, 4).setFontColor('#B91C1C');                                       // other fees red
      ws.getRange(5 + i, 6).setFontColor(rows[i][5] < 0 ? '#B91C1C' : '#16A34A');          // disputes
      ws.getRange(5 + i, 10).setFontColor(rows[i][9] >= 0 ? '#16A34A' : '#B91C1C');        // net balance
    }
    var tr = 5 + rows.length;
    ws.getRange(tr, 1, 1, W).setValues([['TOTAL', tot.payIn, tot.gwFee, tot.otherFee, tot.refund, tot.dispute, tot.card, tot.reserve, tot.payout, tot.net]])
      .setFontFamily(DPL.TNR).setFontSize(10).setFontWeight('bold').setBackground('#F1F5F9');
    ws.getRange(tr, 2, 1, W - 1).setNumberFormat(USD);
  }
  ws.setColumnWidth(1, 80);[104, 116, 104, 96, 116, 104, 92, 110, 116].forEach(function (w, i) { ws.setColumnWidth(i + 2, w); });
  try { ws.setFrozenRows(4); } catch (e) {}

  var missing = tot.otherFee + (-tot.dispute);   // dispute is negative → loss positive
  ss.toast('✅ Cash Flow built. MISSING from P&L: Other Fees $' + tot.otherFee.toFixed(0) +
    ' + Disputes $' + (-tot.dispute).toFixed(0) + ' = $' + missing.toFixed(0) + '. Payout→bank $' + tot.payout.toFixed(0) + '.', '💵', 15);
}

// ════════════════════════════════════════════════════════════════════════
//  FAILED-PAYMENT RECOVERY TRACKER  — '💳 Failed Payments'
//  Pulls payment_intents (status REQUIRES_PAYMENT_METHOD = payment failed /
//  abandoned at pay step, NO Shopify order created). Each has customer email +
//  products + amount. De-dups against any SUCCEEDED intent (already recovered).
//  Send window 3h–7d (skip in-flight & stale). Feeds a future Klaviyo recovery.
//  Read-only on Airwallex. Run from editor.
// ════════════════════════════════════════════════════════════════════════
var AWX_FAILED_SHEET = '💳 Failed Payments';

function _awxAllPaymentIntents(daysBack, log) {
  var from = Utilities.formatDate(new Date(Date.now() - daysBack * 86400000), 'UTC', "yyyy-MM-dd'T'HH:mm:ssXXX");
  var out = [], page = 0, guard = 0, deadline = Date.now() + 250000;
  while (guard < 60 && Date.now() < deadline) {
    var r = _awxGet('/api/v1/pa/payment_intents', { page_num: page, page_size: 100, from_created_at: from });
    if (r.code !== 200) { if (log) log('payment_intents HTTP ' + r.code + ' p' + page + ' ' + r.body.slice(0, 150)); break; }
    var j = JSON.parse(r.body), items = j.items || [];
    for (var i = 0; i < items.length; i++) out.push(items[i]);
    if (!j.has_more) break; page++; guard++; Utilities.sleep(150);
  }
  if (log) log('payment_intents pulled ' + out.length + ' (pages=' + (page + 1) + ')');
  return out;
}
function _awxPiEmail(p) { try { return String((p.customer && p.customer.email) || '').trim().toLowerCase(); } catch (e) { return ''; } }
function _awxPiProducts(p) {
  try {
    var arr = (p.order && p.order.products) || [];
    return arr.map(function (x) { return (x.name || '') + (x.quantity > 1 ? (' x' + x.quantity) : ''); })
      .filter(function (s) { return s && s.indexOf('Tax & Shipping') < 0 && s.indexOf('Shipping Protection') < 0; })
      .join(' | ').slice(0, 220);
  } catch (e) { return ''; }
}

// ════════════════════════════════════════════════════════════════════════
//  v2.4 — DECLINE REASON auto-classification (feeds Failed-Payment CSKH Tracker)
//  Adds a "Decline Reason" column to '💳 Failed Payments' by mapping the raw
//  Airwallex decline string → GP failure-reason taxonomy. INVOLUNTARY reasons
//  only (payment mechanics); VOLUNTARY reasons (changed mind / wants PayPal /
//  price) are customer intent → CSKH-tagged, not derivable here.
//  ⚠ VERIFY FIRST: run awxDebugDecline() once and paste the log — the list
//  endpoint may not carry a granular decline code; if so we add a per-intent
//  detail fetch. Until confirmed, unmapped rows read 'Unknown - not classified'.
// ════════════════════════════════════════════════════════════════════════

/** Defensive extractor: scan the most likely Airwallex decline paths, return
 *  the first non-empty string (else ''). Trim to the real path after awxDebugDecline. */
function _awxPickDecline(p) {
  try {
    var a = p.latest_payment_attempt || {};
    var cands = [
      a.provider_original_response_code, a.provider_decline_code, a.decline_code,
      a.failure_code, a.failure_reason, a.status_reason, a.reason,
      (a.payment_method && a.payment_method.card && a.payment_method.card.avs_check_result),
      a.status, p.status_reason, p.cancellation_reason, p.failure_reason
    ];
    for (var i = 0; i < cands.length; i++) {
      var v = cands[i];
      if (v != null && String(v).trim() !== '') return String(v).trim();
    }
  } catch (e) {}
  return '';
}

/** Map raw decline string → GP failure-reason taxonomy (matches Tracker dropdown).
 *  Order matters: specific patterns before the generic 'declined'. */
function _awxDeclineToReason(raw) {
  var s = String(raw || '').toLowerCase();
  if (!s) return 'Unknown - not classified';
  if (/insufficient|\bnsf\b|not_enough|no_funds|low_balance/.test(s))                                    return 'Insufficient funds';
  if (/expired|expiry|\bexpire\b/.test(s))                                                                return 'Card expired/invalid';
  if (/authentication|3ds|3d[_ -]?secure|\bauth\b|challenge|liability|not_authenticated/.test(s))         return '3DS/auth failed';
  if (/fraud|suspect|security|\brisk\b|do[_ ]?not[_ ]?honou?r|restricted|lost|stolen|pickup|blocked|blacklist|prohibited/.test(s)) return 'Bank fraud/security block';
  if (/not[_ ]?supported|unsupported|card[_ ]?type|currency[_ ]?not|scheme_not|invalid_scheme/.test(s))   return 'Card type not supported';
  if (/issuer[_ ]?unavailable|try[_ ]?again|processing_error|processor|system|timeout|temporar|network|service/.test(s)) return 'Processor/technical error';
  if (/incorrect|invalid|\bcvc\b|\bcvv\b|_number|wrong|malformed/.test(s))                                return 'Card expired/invalid';
  if (/declin|not[_ ]?allowed|not[_ ]?permitted|generic|refer|rejected/.test(s))                          return 'Card declined (generic)';
  return 'Unknown - not classified';
}

// v2.4b: the decline detail is NOT in the list response — it lives in the payment
// ATTEMPT (GET /pa/payment_attempts/{id}). _awxAttemptReason fetches it per failed
// intent and maps the card-network response code -> taxonomy. Cached per attempt id;
// bounded by _AWX_DECL_DEADLINE so a big backlog never blows the 6-min limit.
var _AWX_DECL_CACHE = {};
var _AWX_DECL_DEADLINE = 0;

/** ISO-8583 / card-network response code (+ text fallback) -> GP failure-reason taxonomy. */
function _awxCodeToReason(code, text) {
  code = String(code || '').trim();
  var MAP = {
    '01': 'Card declined (generic)', '02': 'Card declined (generic)', '05': 'Card declined (generic)',
    '04': 'Bank fraud/security block', '07': 'Bank fraud/security block',
    '41': 'Bank fraud/security block', '43': 'Bank fraud/security block',
    '59': 'Bank fraud/security block', '62': 'Bank fraud/security block', '63': 'Bank fraud/security block',
    '51': 'Insufficient funds', '61': 'Insufficient funds', '65': 'Insufficient funds',
    '14': 'Card expired/invalid', '15': 'Card expired/invalid', '54': 'Card expired/invalid', '82': 'Card expired/invalid',
    '55': 'Card declined (generic)', '57': 'Card declined (generic)', '58': 'Card declined (generic)',
    '75': 'Card declined (generic)', '83': 'Card declined (generic)',
    '91': 'Processor/technical error', '92': 'Processor/technical error',
    '94': 'Processor/technical error', '96': 'Processor/technical error'
  };
  if (MAP[code]) return MAP[code];
  return _awxDeclineToReason(text);   // fall back to the text mapper for unknown codes
}

/** Fetch the payment ATTEMPT for a failed intent and classify its decline.
 *  Cached per attempt id; returns 'Unknown - pending' if the time budget is spent. */
function _awxAttemptReason(p) {
  try {
    var att = p.latest_payment_attempt || {};
    var id = att.id || '';
    if (!id) return _awxDeclineToReason(_awxPickDecline(p));
    if (_AWX_DECL_CACHE[id] != null) return _AWX_DECL_CACHE[id];
    if (_AWX_DECL_DEADLINE && Date.now() > _AWX_DECL_DEADLINE) return 'Unknown - pending';
    var r = _awxGet('/api/v1/pa/payment_attempts/' + id);
    var reason = 'Unknown - not classified';
    if (r.code === 200) {
      var a = {}; try { a = JSON.parse(r.body) || {}; } catch (e) {}
      var fd = a.failure_details || {}, dt = fd.details || {};
      var code = a.provider_original_response_code || dt.original_response_code || '';
      var text = [a.failure_code, fd.code, fd.message].filter(Boolean).join(' ');
      reason = _awxCodeToReason(code, text);
    }
    _AWX_DECL_CACHE[id] = reason;
    Utilities.sleep(100);
    return reason;
  } catch (e) { return 'Unknown - not classified'; }
}

/** READ-ONLY — dump raw failed payment_intent shape so we can SEE the real decline
 *  field for THIS account (verify, don't trust). View → Executions → Logs. */
function awxDebugDecline(daysBack) {
  daysBack = daysBack || 30;
  var ss = _getSSActive(); ss.toast('Dumping failed payment_intent shape…', '🔎', 20);
  var pis = _awxAllPaymentIntents(daysBack, function (m) { Logger.log(m); });
  var shown = 0, L = ['===== FAILED payment_intent samples (REQUIRES_PAYMENT_METHOD) ====='];
  for (var i = 0; i < pis.length && shown < 3; i++) {
    var p = pis[i];
    if (String(p.status || '').toUpperCase() !== 'REQUIRES_PAYMENT_METHOD') continue;
    var raw = _awxPickDecline(p);
    L.push('\n--- sample ' + (shown + 1) + ' · email=' + _awxPiEmail(p) + ' ---');
    L.push('latest_payment_attempt (from list) = ' + JSON.stringify(p.latest_payment_attempt || {}).slice(0, 400));
    var attId = (p.latest_payment_attempt && p.latest_payment_attempt.id) || '';
    if (attId) {
      var ra = _awxGet('/api/v1/pa/payment_attempts/' + attId);
      L.push('GET /pa/payment_attempts/' + attId + '  -> HTTP ' + ra.code);
      L.push('ATTEMPT DETAIL = ' + ra.body.slice(0, 2200));
    } else {
      var rp = _awxGet('/api/v1/pa/payment_intents/' + (p.id || ''));
      L.push('GET /pa/payment_intents/' + (p.id || '') + '  -> HTTP ' + rp.code);
      L.push('INTENT DETAIL = ' + rp.body.slice(0, 2200));
    }
    L.push('_awxPickDecline(list) -> "' + raw + '"   _awxDeclineToReason -> "' + _awxDeclineToReason(raw) + '"');
    shown++;
  }
  if (!shown) L.push('(no REQUIRES_PAYMENT_METHOD intents in last ' + daysBack + 'd)');
  Logger.log(L.join('\n'));
  ss.toast('✅ awxDebugDecline done — paste the Logs so I can lock the exact field.', '🔎', 12);
}

function awxSyncFailedPayments(daysBack) {
  daysBack = daysBack || 30;
  var ss = _getSSActive(); ss.toast('Pulling Airwallex payment intents…', '💳', 30);
  _AWX_DECL_DEADLINE = Date.now() + 180000;   // v2.4b: time budget for per-attempt decline fetches
  var pis = _awxAllPaymentIntents(daysBack, function (m) { Logger.log(m); });
  if (!pis.length) { ss.toast('No payment intents returned.', '❌', 8); return; }

  var succeeded = {};
  pis.forEach(function (p) { if (String(p.status || '').toUpperCase() === 'SUCCEEDED') { var e = _awxPiEmail(p); if (e) succeeded[e] = true; } });

  var now = Date.now(), rows = [], atRisk = 0, recoverable = 0, recoveredN = 0;
  pis.forEach(function (p) {
    if (String(p.status || '').toUpperCase() !== 'REQUIRES_PAYMENT_METHOD') return;
    var email = _awxPiEmail(p), cust = p.customer || {};
    var name = ((cust.first_name || '') + ' ' + (cust.last_name || '')).trim();
    var amt = parseFloat(p.amount) || 0; atRisk += amt;
    var created = p.created_at ? new Date(p.created_at) : null;
    var ageH = created ? Math.round((now - created.getTime()) / 3600000) : -1;
    var recovered = email && succeeded[email];
    var inWindow = email && !recovered && ageH >= 3 && ageH <= 168;   // 3h..7d
    if (recovered) recoveredN++; if (inWindow) recoverable++;
    rows.push([
      created ? Utilities.formatDate(created, DPL.VN_TZ, 'yyyy-MM-dd HH:mm') : '', ageH < 0 ? '' : ageH,
      email || '(none)', name, cust.phone_number || '', amt, _awxPiProducts(p),
      recovered ? 'RECOVERED (skip)' : (inWindow ? 'RECOVERABLE' : '(out of window)'),
      _awxAttemptReason(p)
    ]);
  });
  rows.sort(function (a, b) { return String(b[0]).localeCompare(String(a[0])); });

  var ws = ss.getSheetByName(AWX_FAILED_SHEET) || ss.insertSheet(AWX_FAILED_SHEET);
  _dplResetSheet(ws);
  var W = 9, USD = '"$"#,##0.00', stamp = Utilities.formatDate(new Date(), DPL.VN_TZ, 'dd/MM/yyyy HH:mm');
  ws.getRange(1, 1, 1, W).merge().setValue('💳  GerberaPrints — Failed Payments  (recoverable — payment failed, no order created)')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1, 34);
  ws.getRange(2, 1, 1, W).merge().setValue('Updated: ' + stamp + ' ICT · last ' + daysBack + 'd · ' + rows.length + ' failed · $' + atRisk.toFixed(0) +
    ' at risk · ' + recoverable + ' RECOVERABLE (3h–7d, not already succeeded) · ' + recoveredN + ' later recovered (skip). ' +
    'Status REQUIRES_PAYMENT_METHOD = customer reached pay step but card failed/abandoned; email captured, no #GPN. NEXT: push "Failed Payment" event → Klaviyo recovery flow (verify no overlap with abandoned-checkout flow first).')
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(DPL.TNR).setFontSize(9).setFontStyle('italic').setWrap(true).setVerticalAlignment('middle');
  ws.setRowHeight(2, 56); ws.setRowHeight(3, 6);
  ws.getRange(4, 1, 1, W).setValues([['Created (ICT)', 'Age (h)', 'Email', 'Name', 'Phone', 'Amount ($)', 'Products', 'Status', 'Decline Reason']])
    .setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(DPL.TNR).setFontSize(10).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(4, 28);
  if (rows.length) {
    ws.getRange(5, 1, rows.length, W).setValues(rows).setFontFamily(DPL.TNR).setFontSize(10);
    ws.getRange(5, 6, rows.length, 1).setNumberFormat(USD);
    for (var i = 0; i < rows.length; i++) {
      var st = rows[i][7];
      ws.getRange(5 + i, 8).setFontColor(st === 'RECOVERABLE' ? '#16A34A' : (st.indexOf('RECOVERED') === 0 ? '#94A3B8' : '#CA8A04')).setFontWeight('bold');
    }
  }
  ws.setColumnWidth(1, 124); [56, 210, 140, 120, 90, 280, 130, 150].forEach(function (w, i) { ws.setColumnWidth(i + 2, w); });
  try { ws.setFrozenRows(4); } catch (e) {}
  ss.toast('✅ Failed Payments: ' + recoverable + ' recoverable · $' + atRisk.toFixed(0) + ' at risk (' + rows.length + ' failed / ' + daysBack + 'd).', '💳', 14);
}


/** v27.57: Airwallex monthly other-cost (account/dispute FEE bucket + chargeback net loss)
 * read from '💳 Airwallex Cash Flow' (col4 Other Fees, col6 Disputes net). Returns
 * { 'yyyy-MM': otherFee - disputeNet }. Empty {} if the sheet is absent (fallback-safe, no deduction). */
function _awxOtherCostByMonth() {
  var out = {}, ws = _getSSActive().getSheetByName('💳 Airwallex Cash Flow');
  if (!ws || ws.getLastRow() < 5) return out;
  var n = ws.getLastRow() - 4, v = ws.getRange(5, 1, n, 6).getValues();
  for (var i = 0; i < n; i++) {
    var c = v[i][0], k = (c instanceof Date) ? Utilities.formatDate(c, DPL.VN_TZ, 'yyyy-MM') : String(c).trim().substring(0, 7);
    if (!/^\d{4}-\d{2}$/.test(k)) continue;                 // skip TOTAL row
    var otherFee = parseFloat(v[i][3]) || 0;                 // col 4 = Other Fees (cost +)
    var disputeNet = parseFloat(v[i][5]) || 0;               // col 6 = Disputes net (neg=loss)
    out[k] = otherFee - disputeNet;                          // loss adds cost; net win reduces it
  }
  return out;
}


// ════════════════════════════════════════════════════════════════════════
//  awxReconcileMonth(ym) — đối chiếu phí 1 tháng với Airwallex official fee report.
//  Tách PAYMENT.fee (= cột "Gateway Fee") vs FEE bucket theo source_type (= "Other Fees").
//  Lộ ra: (1) source_type nào trong FEE bucket có thể đang bị đếm 2 lần với PAYMENT.fee,
//  (2) tổng phí CRM vs report. Bucket theo ICT (khớp cách CRM gom tháng). Chỉ ĐỌC.
//  Run: awxReconcileMonth('2026-01') → mở Execution log (Ctrl+Enter).
// ════════════════════════════════════════════════════════════════════════
function awxReconcileMonth(ym) {
  var ss = _getSSActive();
  ym = ym || Utilities.formatDate(new Date(), DPL.VN_TZ, 'yyyy-MM');
  ss.toast('Reconciling Airwallex ' + ym + '…', '🔍', 30);
  var tx = _awxAllFinancialTx(14, function (m) { Logger.log(m); });
  if (!tx.length) { ss.toast('No transactions (check permissions/window).', '❌', 8); return; }

  var payFee = 0, payCnt = 0, payAmt = 0, feeTot = 0;
  var feeBySrc = {}, otherByType = {};
  tx.forEach(function (t) {
    var d = t.created_at ? new Date(t.created_at) : null; if (!d || isNaN(d.getTime())) return;
    if (Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM') !== ym) return;
    var tt = String(t.transaction_type || '?').toUpperCase();
    var srt = String(t.source_type || t.transaction_type || '?');
    var fee = parseFloat(t.fee) || 0, amt = parseFloat(t.amount) || 0;
    if (tt === 'PAYMENT') { payCnt++; payFee += fee; payAmt += amt; }
    else if (tt === 'FEE') { feeBySrc[srt] = (feeBySrc[srt] || 0) + amt; feeTot += amt; }
    else { otherByType[tt] = (otherByType[tt] || 0) + amt; }
  });

  var L = ['===== AWX RECONCILE ' + ym + ' (bucket = ICT, matches CRM) ====='];
  L.push('PAYMENT  count=' + payCnt + '  Σamount=$' + payAmt.toFixed(2) + '  Σfee=$' + payFee.toFixed(2) + '   ← CRM "Gateway Fee" col');
  L.push('FEE bucket by source_type   ← CRM "Other Fees" col:');
  Object.keys(feeBySrc).sort().forEach(function (s) { L.push('    ' + s + ' = $' + feeBySrc[s].toFixed(2)); });
  L.push('    FEE TOTAL = $' + feeTot.toFixed(2));
  L.push('Non-PAYMENT/FEE types (Σamount):');
  Object.keys(otherByType).sort().forEach(function (s) { L.push('    ' + s + ' = $' + otherByType[s].toFixed(2)); });
  L.push('CRM TOTAL FEES (Gateway + Other) = $' + (payFee + feeTot).toFixed(2) + '   ← so với tổng report Airwallex');
  L.push('DOUBLE-COUNT CHECK: nếu có source_type "gateway"/"payment_method" trong FEE bucket mà cũng nằm trong PAYMENT.fee → đếm 2 lần.');
  Logger.log(L.join('\n'));
  ss.toast('Reconcile ' + ym + ': Gateway $' + payFee.toFixed(0) + ' + Other $' + feeTot.toFixed(0) + ' = $' + (payFee + feeTot).toFixed(0) + '. Xem Execution log.', '🔍', 15);
}
// ════════════════════════════════════════════════════════════════════════
//  awxReasonRollup() — '📊 Decline Mix' : đo tỷ lệ LÝ DO khách chưa thanh toán.
//  Đọc '💳 Failed Payments' (col 6 Amount, col 9 Decline Reason) → count · % · $
//  at-risk theo từng lý do, sort $ giảm dần. Standalone, READ-ONLY nguồn Airwallex,
//  chỉ ghi tab riêng '📊 Decline Mix'. Append vào GP_Airwallex.gs, chạy sau
//  awxSyncFailedPayments. (v2.4c)
// ════════════════════════════════════════════════════════════════════════
function awxReasonRollup() {
  var ss = _getSSActive();
  var src = ss.getSheetByName(AWX_FAILED_SHEET);
  if (!src || src.getLastRow() < 5) { ss.toast('Chạy awxSyncFailedPayments trước.', '📊', 6); return; }
  var n = src.getLastRow() - 4;
  var v = src.getRange(5, 1, n, 9).getValues();
  var tally = {}, risk = {}, total = 0, totRisk = 0;
  for (var i = 0; i < n; i++) {
    var reason = String(v[i][8] || '').trim() || 'Unknown - not classified';
    var amt = parseFloat(v[i][5]) || 0;
    tally[reason] = (tally[reason] || 0) + 1;
    risk[reason] = (risk[reason] || 0) + amt;
    total++; totRisk += amt;
  }
  var keys = Object.keys(tally).sort(function (a, b) { return risk[b] - risk[a]; });
  var ws = ss.getSheetByName('📊 Decline Mix') || ss.insertSheet('📊 Decline Mix');
  _dplResetSheet(ws);
  var USD = '"$"#,##0.00', PCT = '0.0%', stamp = Utilities.formatDate(new Date(), DPL.VN_TZ, 'dd/MM/yyyy HH:mm');
  ws.getRange(1, 1, 1, 4).merge().setValue('📊  Decline Mix — why customers did not pay  (' + total + ' failed · $' + totRisk.toFixed(0) + ' at risk · ' + stamp + ' ICT)')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(13).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1, 30);
  ws.getRange(2, 1, 1, 4).setValues([['Decline Reason', 'Count', '% of failed', '$ at risk']])
    .setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(DPL.TNR).setFontSize(10).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(2, 24);
  var rows = keys.map(function (k) { return [k, tally[k], total ? tally[k] / total : 0, risk[k]]; });
  if (rows.length) {
    ws.getRange(3, 1, rows.length, 4).setValues(rows).setFontFamily(DPL.TNR).setFontSize(10);
    ws.getRange(3, 3, rows.length, 1).setNumberFormat(PCT);
    ws.getRange(3, 4, rows.length, 1).setNumberFormat(USD);
    for (var j = 0; j < rows.length; j++) {
      var isCardMech = /fraud|declined|expired|type not/.test(String(rows[j][0]).toLowerCase());
      if (isCardMech) ws.getRange(3 + j, 1).setFontColor('#B91C1C').setFontWeight('bold');   // card-mechanics = PayPal-recoverable
    }
    var tr = 3 + rows.length;
    ws.getRange(tr, 1, 1, 4).setValues([['TOTAL', total, 1, totRisk]]).setFontFamily(DPL.TNR).setFontWeight('bold').setBackground('#F1F5F9');
    ws.getRange(tr, 3).setNumberFormat(PCT); ws.getRange(tr, 4).setNumberFormat(USD);
  }
  ws.setColumnWidth(1, 230); ws.setColumnWidth(2, 70); ws.setColumnWidth(3, 96); ws.setColumnWidth(4, 104);
  try { ws.setFrozenRows(2); } catch (e) {}
  ss.toast('✅ Decline Mix: ' + keys.length + ' reasons / ' + total + ' failed ($' + totRisk.toFixed(0) + ' at risk).', '📊', 10);
}