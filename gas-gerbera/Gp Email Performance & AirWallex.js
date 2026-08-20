// ╔══════════════════════════════════════════════════════════════════════╗
// ║  GP_Email_Performance.gs  —  Email & SMS channel SCORECARD (v2.5)       ║
// ║  ------------------------------------------------------------------    ║
// ║  THE single email/SMS analytics tab. Reads raw feed from (hidden)       ║
// ║  '📧 Email Marketing' (monthly rollup + per-campaign incl unsub/spam),  ║
// ║  then layers ROI, % of store, 20% target, flow split, deliverability,   ║
// ║  AND a 5-tier colour KPI heatmap + action verdict.                      ║
// ║                                                                        ║
// ║  v2.0 CHANGES (consolidation):                                          ║
// ║   • Per-campaign scorecard is now Section A (top), monthly rollup +     ║
// ║     flow split move to the RIGHT panels (cols M+).                      ║
// ║   • 5-tier colour heatmap on Click/RPR/Conv/Unsub/Spam (was verdict-    ║
// ║     text only). Thresholds in EMP_SCALE.                                ║
// ║   • Open% intentionally NOT graded (Apple MPP inflates it → noise).     ║
// ║   • Low-volume gate raised 50 → 200 recipients = grey "LOW VOL",        ║
// ║     excluded from KPI grading (kills small-sample false signals).       ║
// ║   • Verdict prioritises Click/RPR over Open.                            ║
// ║   • '📧 Email Marketing' kept as a HIDDEN technical feed (this file is   ║
// ║     the only email tab a human reads). Run empHideRawFeed() once.       ║
// ║                                                                        ║
// ║  ATTRIBUTION: KLAVIYO-ATTRIBUTED (overlaps FB/Google) — program-health  ║
// ║  lens, NOT the dedup channel split (= 🧭 UTM Attribution). Never feeds   ║
// ║  the P&L channel split. Read-only on sources.                           ║
// ║                                                                        ║
// ║  Reuses CRM globals: _getSSActive, _dplResetSheet, DPL.TNR, DPL.VN_TZ.  ║
// ╚══════════════════════════════════════════════════════════════════════╝

var EMP_SHEET  = '📧 Email & SMS Performance';
var EMP_SRC    = '📧 Email Marketing';
var EMP_PNL    = '📆 Monthly P&L';
var EMP_COST   = '💰 Cost Tracker';
var EMP_TARGET = 0.17;     // 17% of store revenue (top tier; tiers step ~3%)
var EMP_MONTHS = 12;
var EMP_CAMPS  = 60;       // campaigns shown (full history → this IS the scorecard)
var EMP_SPAM_MAX  = 0.003; // 0.30% spam = Gmail/Yahoo danger
var EMP_UNSUB_MAX = 0.005; // 0.50% unsub = cadence/list warning
var EMP_MINVOL    = 200;   // below this many recipients → not KPI-graded (LOW VOL)

var EMP_USD = '"$"#,##0.00';
var EMP_PCT = '0.0%';
var EMP_PCT2= '0.00%';
var EMP_NUM = '#,##0';
var EMP_X   = '0.00"x"';

// 5-tier colour scale (backgrounds). dir:+1 higher=better, -1 lower=better.
// t = [b1,b2,b3,b4] thresholds; 5 buckets. Open% deliberately absent (MPP noise).
var EMP_SCALE = {
  open:  { dir: 1,  t: [0.30, 0.40, 0.50, 0.60] },   // MPP-inflated → directional, but graded
  pctstore:{dir: 1, t: [0.08, 0.11, 0.14, 0.17] },   // % of store revenue: <8 / 8-11 / 11-14 / 14-17 / >=17
  click: { dir: 1,  t: [0.005, 0.01, 0.02, 0.03] },   // <0.5 / .5-1 / 1-2 / 2-3 / >=3 %
  rpr:   { dir: 1,  t: [0.02, 0.06, 0.12, 0.20] },     // $ per recipient
  conv:  { dir: 1,  t: [0.0003, 0.0008, 0.0015, 0.003] }, // 0.03/.08/.15/.30 %
  unsub: { dir: -1, t: [0.001, 0.0025, 0.0045, 0.007] },  // lower better
  spam:  { dir: -1, t: [0.0002, 0.0005, 0.001, 0.003] }   // >=0.30% = worst (danger)
};
// 5 background colours: best → worst
var EMP_C5 = ['#15803D', '#4ADE80', '#FACC15', '#F97316', '#DC2626'];   // v2.2 canonical Likert (best->worst)
var EMP_CF5= ['#FFFFFF', '#14532D', '#713F12', '#FFFFFF', '#FFFFFF']; // font on each (white on dark-green/orange/red; dark on yellow/light-green)
var EMP_GREY_BG = '#E2E8F0', EMP_GREY_FC = '#64748B';                 // LOW VOL / not graded

// pick bucket index 0..4 for a value on a scale
function _empBucket(val, sc) {
  var t = sc.t, idx;
  if (val < t[0]) idx = 0; else if (val < t[1]) idx = 1; else if (val < t[2]) idx = 2;
  else if (val < t[3]) idx = 3; else idx = 4;
  // for "higher=better", invert so idx 0 = best colour
  return sc.dir === 1 ? (4 - idx) : idx;
}

// ── Entry point (no getUi() → safe from editor Run or menu) ───────────────
function emailPerfRebuild() {
  var ss  = _getSSActive();
  var src = ss.getSheetByName(EMP_SRC);
  if (!src) { ss.toast('Source "' + EMP_SRC + '" not found — run the Klaviyo sync first.', '❌', 8); return; }
  ss.toast('Building Email & SMS Performance…', '📧', 30);

  var data     = _empReadSource(src);
  var storeMap = _empMonthlyStoreRev(ss);
  var costMap  = _empKlaviyoCost(ss);

  var ws = ss.getSheetByName(EMP_SHEET) || ss.insertSheet(EMP_SHEET);
  _dplResetSheet(ws);
  _empBuild(ws, ss, data, storeMap, costMap);
}

// ── Read raw '📧 Email Marketing' (rollup + per-campaign incl deliverability) ──
function _empReadSource(src) {
  var last = src.getLastRow();
  if (last < 1) return { rollup: [], camps: [] };
  var vals = src.getRange(1, 1, last, 12).getValues();
  var rollup = [], camps = [], inCamp = false;
  for (var i = 0; i < vals.length; i++) {
    var a = vals[i][0];
    var aStr = (a === null || a === undefined) ? '' : a.toString().trim();
    if (/^\d{4}-\d{2}$/.test(aStr)) {
      rollup.push({ month: aStr, campaign: _empNum(vals[i][1]), flow: _empNum(vals[i][2]),
                    sms: _empNum(vals[i][3]), total: _empNum(vals[i][4]) });
      continue;
    }
    if (aStr === 'Send Date') { inCamp = true; continue; }
    if (inCamp && (a instanceof Date) && vals[i][1]) {
      camps.push({
        date: a, name: (vals[i][1] || '').toString(),
        recipients: _empNum(vals[i][2]), delivered: _empNum(vals[i][3]),
        rev: _empNum(vals[i][4]), rpr: _empNum(vals[i][5]),
        open: _empNum(vals[i][6]), click: _empNum(vals[i][7]), conv: _empNum(vals[i][8]),
        unsub: _empNum(vals[i][9]), spam: _empNum(vals[i][10])
      });
    }
  }
  return { rollup: rollup, camps: camps };
}

// ── Store revenue per month (Rev Received = '📆 Monthly P&L' col H) ───────
//  v2.4 BUGFIX: was reading col E (index 4) = 'Cancelled #' -> Store Rev came out as $2.00 and
//  % Store as 224,919% (verdicts all fake-EXCELLENT). Monthly P&L header is:
//    A Month | B Orders | C Gross | D Discount | E Cancelled # | F Cancelled $ | G Cancel Refund | H Rev Received
//  -> Rev Received is index 7 (col H). Header is auto-detected so a future column shift can't break it again.
function _empMonthlyStoreRev(ss) {
  var ws = ss.getSheetByName(EMP_PNL), map = {};
  if (!ws || ws.getLastRow() < 5) return map;
  var WID = 12;
  // locate 'Rev Received' by header text (row 4); fall back to index 7 if not found
  var col = 7;
  try {
    var hdr = ws.getRange(4, 1, 1, WID).getValues()[0];
    for (var h = 0; h < hdr.length; h++) {
      if (String(hdr[h] || '').toLowerCase().indexOf('rev received') >= 0) { col = h; break; }
    }
  } catch (e) {}
  var n = ws.getLastRow() - 4, vv = ws.getRange(5, 1, n, WID).getValues();
  for (var i = 0; i < n; i++) {
    var d = vv[i][0]; if (!(d instanceof Date)) continue;
    var rev = _empNum(vv[i][col]);
    if (rev <= 0) continue;                       // no store rev -> leave month unmapped (no fake % / ROI)
    map[Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM')] = rev;
  }
  return map;
}

// ── Klaviyo cost per month ('💰 Cost Tracker') ───────────────────────────
function _empKlaviyoCost(ss) {
  var ws = ss.getSheetByName(EMP_COST), map = {};
  if (!ws || ws.getLastRow() < 4) return map;
  var n = ws.getLastRow() - 3, vv = ws.getRange(4, 1, n, 4).getValues();
  for (var i = 0; i < n; i++) {
    var vendor = (vv[i][2] || '').toString().toLowerCase();
    var cat    = (vv[i][1] || '').toString().toLowerCase();
    if (vendor.indexOf('klaviyo') < 0 && cat.indexOf('email') < 0 && cat.indexOf('sms') < 0) continue;
    var amt = _empNum(vv[i][3]); if (!amt) continue;
    var d = vv[i][0];
    var k = (d instanceof Date) ? Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM') : (d || '').toString().slice(0, 7);
    map[k] = (map[k] || 0) + amt;
  }
  return map;
}

// ── Verdicts ──────────────────────────────────────────────────────────────
function _empCampVerdict(c) {
  if (c.recipients < EMP_MINVOL)          return ['⚪ LOW VOL — not graded', EMP_GREY_FC];
  if (c.spam  >= EMP_SPAM_MAX)            return ['🔴 SPAM RISK ≥0.3% — pause/clean segment', '#B91C1C'];
  if (c.rev > 0 && c.rpr >= 0.15)         return ['🟢 WINNER', '#16A34A'];
  if (c.click >= 0.02 && c.rev > 0)       return ['🟢 STRONG — high click + revenue', '#16A34A'];
  if (c.rev > 0)                          return ['🟡 CONVERTS · low RPR', '#CA8A04'];
  if (c.unsub >= EMP_UNSUB_MAX)           return ['🟠 HIGH UNSUB — cadence/list', '#EA580C'];
  if (c.click >= 0.01)                    return ['🟠 CLICKS · NO BUY — fix offer/CTA', '#EA580C'];
  return ['🔴 WEAK CLICK — creative/list/deliverability', '#DC2626'];
}
function _empMonthVerdict(pct) {
  if (!(pct > 0))  return ['⚪ n/a — no store rev', EMP_GREY_FC];
  if (pct > 1)     return ['⚠ CHECK DATA — % > 100%', '#DC2626'];   // impossible: store-rev source broken
  if (pct >= 0.17) return ['🟢 EXCELLENT', '#15803D'];
  if (pct >= 0.14) return ['🟢 GOOD',      '#16A34A'];
  if (pct >= 0.11) return ['🟡 BUILDING',  '#CA8A04'];
  if (pct >= 0.08) return ['🟠 BELOW',     '#EA580C'];
  return ['🔴 WEAK', '#DC2626'];
}

// ── Main builder ─────────────────────────────────────────────────────────
function _empBuild(ws, ss, data, storeMap, costMap) {
  var stamp = Utilities.formatDate(new Date(), DPL.VN_TZ, 'dd/MM/yyyy HH:mm');

  // Layout:  LEFT scorecard A..K (11) | gap L | RIGHT compact tables M..U (no wrap).
  // All long PROSE goes to a FULL-WIDTH block at the BOTTOM (no shared-row balloon).
  var SC_W = 11;            // scorecard width A..K
  var RC   = SC_W + 2;      // right start = M (13)
  var RW   = 9;             // right panel width M..U
  var FULLW = RC + RW - 1;  // U = 21

  ws.getRange(1, 1, 1, FULLW).merge()
    .setValue('📧  GerberaPrints — Email & SMS Performance  (Klaviyo program scorecard · v2.4)')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(14)
    .setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1, 34);
  ws.getRange(2, 1, 1, FULLW).merge()
    .setValue('Updated: ' + stamp + ' ICT  ·  KLAVIYO-ATTRIBUTED (overlaps FB/Google — program-health lens, NOT the dedup channel split; channel truth = 🧭 UTM Attribution).  ' +
              'KPI heatmap: Click/RPR/Conv/Unsub/Spam graded 5-tier; Open% graded too (top-of-funnel) but Apple MPP inflates it → directional; sends under ' + EMP_MINVOL + ' recipients = LOW VOL (grey, not graded).')
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(DPL.TNR).setFontSize(9).setFontStyle('italic')
    .setWrap(true).setVerticalAlignment('middle');
  ws.setRowHeight(2, 40); ws.setRowHeight(3, 6);

  // ════════ LEFT (PRIMARY): Campaign Scorecard with 5-tier heatmap ════════
  var camps = data.camps.slice().sort(function(a, b) { return b.date - a.date; }).slice(0, EMP_CAMPS);
  var scTitle = 4;
  ws.getRange(scTitle, 1, 1, SC_W).merge().setValue('🏷 Campaign Scorecard — every send (newest first · 5-tier KPI heatmap)')
    .setBackground('#1E293B').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(12).setFontWeight('bold');
  var scHdr = ['Send Date', 'Campaign', 'Recipients', 'Open %', 'Click %', 'Conv %', 'Unsub %', 'Spam %', 'Revenue', 'RPR', 'Verdict'];
  ws.getRange(scTitle + 1, 1, 1, SC_W).setValues([scHdr])
    .setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(DPL.TNR).setFontSize(10).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(scTitle + 1, 24);
  var r0 = scTitle + 2, leftEnd = r0;
  if (camps.length) {
    var body = camps.map(function(c) {
      var v = _empCampVerdict(c);
      return [ Utilities.formatDate(c.date, DPL.VN_TZ, 'yyyy-MM-dd'), c.name, c.recipients,
               c.open, c.click, c.conv, c.unsub, c.spam, c.rev, c.rpr, v[0] ];
    });
    ws.getRange(r0, 1, body.length, SC_W).setValues(body).setFontFamily(DPL.TNR).setFontSize(10);
    ws.getRange(r0, 3, body.length, 1).setNumberFormat(EMP_NUM);
    ws.getRange(r0, 4, body.length, 1).setNumberFormat(EMP_PCT);   // Open
    ws.getRange(r0, 5, body.length, 1).setNumberFormat(EMP_PCT);   // Click
    ws.getRange(r0, 6, body.length, 1).setNumberFormat(EMP_PCT2);  // Conv
    ws.getRange(r0, 7, body.length, 1).setNumberFormat(EMP_PCT2);  // Unsub
    ws.getRange(r0, 8, body.length, 1).setNumberFormat(EMP_PCT2);  // Spam
    ws.getRange(r0, 9, body.length, 1).setNumberFormat(EMP_USD);   // Revenue
    ws.getRange(r0, 10, body.length, 1).setNumberFormat(EMP_USD);  // RPR
    // Verdict column: clip (no wrap) so left rows never balloon
    ws.getRange(r0, SC_W, body.length, 1).setWrap(false).setFontSize(9).setHorizontalAlignment('left');
    ws.getRange(r0, 2, body.length, 1).setHorizontalAlignment('left');  // Campaign left
    ws.getRange(r0, 3, body.length, 8).setHorizontalAlignment('center'); // Recip..RPR center

    for (var i = 0; i < camps.length; i++) {
      var c = camps[i], rr = r0 + i;
      ws.setRowHeight(rr, 21);                                   // force compact uniform rows
      if (c.recipients < EMP_MINVOL) {
        ws.getRange(rr, 4, 1, 5).setBackground(EMP_GREY_BG).setFontColor(EMP_GREY_FC); // Open..Spam grey
        ws.getRange(rr, 10).setBackground(EMP_GREY_BG).setFontColor(EMP_GREY_FC);
        ws.getRange(rr, SC_W).setFontColor(EMP_GREY_FC).setFontWeight('bold');
        continue;
      }
      _empPaint(ws, rr, 4,  c.open,  EMP_SCALE.open);
      _empPaint(ws, rr, 5,  c.click, EMP_SCALE.click);
      _empPaint(ws, rr, 6,  c.conv,  EMP_SCALE.conv);
      _empPaint(ws, rr, 7,  c.unsub, EMP_SCALE.unsub);
      _empPaint(ws, rr, 8,  c.spam,  EMP_SCALE.spam);
      _empPaint(ws, rr, 10, c.rpr,   EMP_SCALE.rpr);
      ws.getRange(rr, SC_W).setFontColor(_empCampVerdict(c)[1]).setFontWeight('bold');
    }
    leftEnd = r0 + camps.length - 1;
  } else {
    ws.getRange(r0, 1).setValue('— no campaigns in source —').setFontFamily(DPL.TNR).setFontStyle('italic').setFontColor('#94A3B8');
  }

  // ════════ RIGHT PANEL 1: Monthly Email/SMS vs Store (compact, no wrap) ════════
  var roll = data.rollup.slice().sort(function(a, b) { return a.month < b.month ? 1 : -1; }).slice(0, EMP_MONTHS);
  var rRow = 4;
  ws.getRange(rRow, RC, 1, RW).merge().setValue('📈 Monthly Email/SMS vs Store  (ROI · % store · gap to 17%)')
    .setBackground('#1E293B').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(12).setFontWeight('bold');
  var mHdr = ['Month', 'Email+SMS', 'Kl. Cost', 'ROI', 'Store Rev', '% Store', '17% Tgt $', 'Gap $', 'Verdict'];
  ws.getRange(rRow + 1, RC, 1, RW).setValues([mHdr])
    .setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(DPL.TNR).setFontSize(9).setFontWeight('bold').setHorizontalAlignment('center').setWrap(false);
  var mr0 = rRow + 2, lastComplete = null, rightEnd = mr0;
  if (roll.length) {
    var mBody = roll.map(function(m) {
      var store = storeMap[m.month] || 0, cost = costMap[m.month] || 0;
      var pct = store > 0 ? m.total / store : 0, roi = cost > 0 ? m.total / cost : 0;
      var tgt = store * EMP_TARGET;
      if (!lastComplete && store > 0) lastComplete = { m: m, store: store, pct: pct, tgt: tgt };
      return [m.month, m.total, cost, roi, store, pct, tgt, tgt - m.total, _empMonthVerdict(pct)[0]];
    });
    ws.getRange(mr0, RC, mBody.length, RW).setValues(mBody).setFontFamily(DPL.TNR).setFontSize(9).setWrap(false);
    ws.getRange(mr0, RC + 1, mBody.length, 1).setNumberFormat(EMP_USD);
    ws.getRange(mr0, RC + 2, mBody.length, 1).setNumberFormat(EMP_USD);
    ws.getRange(mr0, RC + 3, mBody.length, 1).setNumberFormat(EMP_X);
    ws.getRange(mr0, RC + 4, mBody.length, 1).setNumberFormat(EMP_USD);
    ws.getRange(mr0, RC + 5, mBody.length, 1).setNumberFormat(EMP_PCT);
    ws.getRange(mr0, RC + 6, mBody.length, 1).setNumberFormat(EMP_USD);
    ws.getRange(mr0, RC + 7, mBody.length, 1).setNumberFormat(EMP_USD);
    for (var k = 0; k < roll.length; k++) {
      var st = storeMap[roll[k].month] || 0, pc = st > 0 ? roll[k].total / st : 0;
      ws.getRange(mr0 + k, RC + 8).setFontColor(_empMonthVerdict(pc)[1]).setFontWeight('bold').setFontSize(9);
      _empPaint(ws, mr0 + k, RC + 5, pc, EMP_SCALE.pctstore);   // % Store 5-tier heatmap
    }
    rightEnd = mr0 + roll.length - 1;
  }

  // ════════ RIGHT PANEL 2: Flow vs Campaign vs SMS (compact, SHORT read, no wrap) ════════
  var fRow = rightEnd + 2;
  var sumC = 0, sumF = 0, sumS = 0;
  data.rollup.forEach(function(m) { sumC += m.campaign; sumF += m.flow; sumS += m.sms; });
  var sumTot = sumC + sumF + sumS;
  ws.getRange(fRow, RC, 1, RW).merge().setValue('🔀 Flow vs Campaign vs SMS  (last ' + data.rollup.length + ' mo)')
    .setBackground('#1E293B').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(12).setFontWeight('bold');
  ws.getRange(fRow + 1, RC, 1, RW).setValues([['Source', 'Revenue', '% Email', '', '', '', '', '', 'Note']])
    .setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(DPL.TNR).setFontSize(9).setFontWeight('bold').setHorizontalAlignment('center');
  var fBody = [
    ['Flows (automated)',    sumF, sumTot ? sumF / sumTot : 0, '', '', '', '', '', 'Carry the program — protect & expand'],
    ['Campaigns (broadcast)',sumC, sumTot ? sumC / sumTot : 0, '', '', '', '', '', 'Weak conv — #1 growth lever'],
    ['SMS',                  sumS, sumTot ? sumS / sumTot : 0, '', '', '', '', '', (sumS > 0 ? 'LIVE — SMS flows + campaigns (send_channel=sms)' : '$0 — not synced yet (run _dplKlaviyoEmail) or not live')]
  ];
  var fColor = ['#16A34A', '#CA8A04', '#DC2626'];
  ws.getRange(fRow + 2, RC, 3, RW).setValues(fBody).setFontFamily(DPL.TNR).setFontSize(9).setWrap(false);
  ws.getRange(fRow + 2, RC + 1, 3, 1).setNumberFormat(EMP_USD);
  ws.getRange(fRow + 2, RC + 2, 3, 1).setNumberFormat(EMP_PCT);
  for (var f = 0; f < 3; f++) ws.getRange(fRow + 2 + f, RC).setFontColor(fColor[f]).setFontWeight('bold');
  rightEnd = fRow + 4;

  // ════════ BOTTOM (FULL WIDTH): Target · Deliverability · SMS — long prose lives here ════════
  var bRow = Math.max(leftEnd, rightEnd) + 2;
  ws.getRange(bRow, 1, 1, FULLW).merge().setValue('🎯 Target  ·  🚨 Deliverability  ·  📲 SMS & Actions')
    .setBackground('#1E293B').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(12).setFontWeight('bold');
  bRow++;
  var lines = [];
  if (lastComplete) {
    var lc = lastComplete, gap = lc.tgt - lc.m.total;
    lines.push((gap > 0 ? '🔴 ' : '🟢 ') + lc.m.month + ': $' + _empF(lc.m.total) + ' = ' + (lc.pct * 100).toFixed(1) +
      '% of store (17% target = $' + _empF(lc.tgt) + '). ' + (gap > 0 ? 'Shortfall +$' + _empF(gap) + '/mo to hit 17%.' : 'Target met (+$' + _empF(-gap) + ' over).'));
  }
  var spamBad  = data.camps.filter(function(c){ return c.spam  >= EMP_SPAM_MAX  && c.recipients >= EMP_MINVOL; }).sort(function(a,b){return b.spam-a.spam;});
  var unsubBad = data.camps.filter(function(c){ return c.unsub >= EMP_UNSUB_MAX && c.recipients >= EMP_MINVOL; }).sort(function(a,b){return b.unsub-a.unsub;});
  lines.push((spamBad.length ? '🔴 ' : '🟢 ') + spamBad.length + ' send(s) over the 0.30% SPAM threshold' + (spamBad.length ? ' — repeated offenders hurt domain reputation & inbox placement.' : ' — clean.'));
  spamBad.slice(0, 3).forEach(function(c){ lines.push('     • ' + Utilities.formatDate(c.date, DPL.VN_TZ, 'yyyy-MM-dd') + ' "' + c.name + '" — spam ' + (c.spam*100).toFixed(2) + '% (' + c.recipients + ' recipients).'); });
  lines.push((unsubBad.length ? '🟠 ' : '🟢 ') + unsubBad.length + ' send(s) over the 0.50% UNSUB threshold' + (unsubBad.length ? ' — review cadence / segmentation (sending to non-engaged).' : ' — clean.'));
  unsubBad.slice(0, 3).forEach(function(c){ lines.push('     • ' + Utilities.formatDate(c.date, DPL.VN_TZ, 'yyyy-MM-dd') + ' "' + c.name + '" — unsub ' + (c.unsub*100).toFixed(2) + '%.'); });
  var _smsRev = 0; try { data.rollup.forEach(function(m){ _smsRev += (m.sms||0); }); } catch(e) {}
  lines.push(_smsRev > 0
    ? '📲 SMS is LIVE — $' + Math.round(_smsRev).toLocaleString() + ' over the window (send_channel=sms, SMS flows + campaigns; captured automatically in the SMS column). Per-CAMPAIGN detail in 📱 SMS Scorecard. Note: SMS costs ~$0.01/send, so judge by RPR, not raw revenue. Keep ~1 SMS/week on proven offers.'
    : '📲 SMS = $0 in the synced data — if SMS is live in Klaviyo but shows $0 here, the Klaviyo sync is stale/throttled: run _dplKlaviyoEmail (retry past any 429), then rebuild. Once synced, SMS flows + campaigns appear here automatically (send_channel=sms).');
  lines.push('⚙ Bottleneck = broadcast conversion: opens 25–87% but conversions ≈ 0. Fix the offer/CTA and segment buyers vs prospects — not subject lines. Flows already carry ~90% of email revenue; audit abandoned-checkout, post-purchase and win-back next.');
  lines.forEach(function(line) {
    ws.getRange(bRow, 1, 1, FULLW).merge().setValue(line)
      .setFontFamily(DPL.TNR).setFontSize(10).setFontColor('#334155').setWrap(true).setVerticalAlignment('middle');
    ws.setRowHeight(bRow, line.length > 110 ? 34 : (line.length > 70 ? 26 : 20)); bRow++;
  });

  // widths
  ws.setColumnWidth(1, 92); ws.setColumnWidth(2, 232);
  // C Recip, D Open, E Click, F Conv, G Unsub, H Spam, I Revenue, J RPR, K Verdict
  [72, 62, 62, 62, 66, 66, 84, 64, 252].forEach(function(w, i) { ws.setColumnWidth(i + 3, w); });
  ws.setColumnWidth(SC_W + 1, 20);  // gap
  ws.setColumnWidth(RC, 130);
  // N Email+SMS, O Kl.Cost, P ROI, Q Store Rev, R %Store, S 20%Tgt, T Gap, U Verdict/Note
  [86, 74, 52, 88, 58, 84, 80, 214].forEach(function(w, i) { ws.setColumnWidth(RC + 1 + i, w); });
  try { ws.setFrozenRows(3); } catch (e) {}

  ss.toast('✅ Email & SMS Performance v2.4 · ' + camps.length + ' campaigns · ' + roll.length + ' months · ' + spamBad.length + ' spam-risk', '📧', 8);
}

// paint one KPI cell with 5-tier colour
function _empPaint(ws, row, col, val, sc) {
  var b = _empBucket(val, sc);
  ws.getRange(row, col).setBackground(EMP_C5[b]).setFontColor(EMP_CF5[b]);
}

// ── Utils ─────────────────────────────────────────────────────────────────
function _empNum(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
function _empF(n)   { var p = (Math.round(n * 100) / 100).toFixed(2).split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); return p.join('.'); }

// ── Hide the raw feed tab (run once) — keeps it as technical source ───────
function empHideRawFeed() {
  var ss = _getSSActive(), src = ss.getSheetByName(EMP_SRC);
  if (!src) { ss.toast('"' + EMP_SRC + '" not found.', '📧', 6); return; }
  src.hideSheet();
  ss.toast('✅ "' + EMP_SRC + '" hidden — it stays the technical feed; read "' + EMP_SHEET + '".', '📧', 8);
}

// ── Daily auto-trigger (manages only its OWN handler) ────────────────────
function empInstallTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'emailPerfRebuild') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('emailPerfRebuild').timeBased().everyDays(1).atHour(15).create();
  _getSSActive().toast('✅ Trigger installed: emailPerfRebuild daily ~15:00 ICT.', '📧', 6);
}