// ════════════════════════════════════════════════════════════════════════
//  GP_MerTest.gs — GerberaPrints · MER target + FB marginal test  v1.0
//  ------------------------------------------------------------------------
//  WHY: FB Ads Manager over-credits FB (its own 7d-click/1d-view attribution);
//  Shopify last-click under-credits it. The one number NEITHER can spin is the
//  BLENDED MER = total store revenue / total ad spend — real money in / real
//  money out. This tool runs a "poor-man's holdout": you CUT FB budget on a
//  date, then it measures how total Store Rev + MER respond. Because it reads
//  TOTAL revenue (not attribution), the response INCLUDES the branded-Google
//  halo — the same thing a geo-holdout measures, but with no revenue sacrificed
//  by geography and no attribution guesswork.
//
//  Marginal FB ROAS of the cut = (rev drop) / (FB spend saved). If that is BELOW
//  your breakeven MER, the cut FB was losing money -> cut more. If ABOVE, the FB
//  was incremental (halo real) -> restore it. Caveat: time-based (no geo control),
//  so external trend / seasonality / Google changes can bias — read directionally,
//  keep Google spend flat, avoid windows around big events.
//
//  WORKFLOW: buildMerTest() -> set MER target, pick a Baseline window (14d before
//  the cut). Cut FB ~25-30% on the FB-worst campaigns. After 14 days set the Test
//  window + run analyzeMerTest().
//
//  Reads 'Shopify B2C' (Date r[0] · Total Rev r[15]); ad spend via _dplLoadAdSpendSplit.
//  Reuses CRM globals: _getSSActive, DPL. Run from the editor — toast only.
// ════════════════════════════════════════════════════════════════════════

var MER_SHEET = '\uD83C\uDFAF MER Target & FB Marginal Test';   // 🎯

/** Sum total store revenue per day (yyyy-MM-dd) from Shopify B2C. */
function _merRevByDay(ss) {
  var ws = ss.getSheetByName(DPL.B2C); var out = {};
  if (!ws || ws.getLastRow() < 3) return out;
  var v = ws.getRange(1, 1, ws.getLastRow(), 16).getValues();
  for (var i = 0; i < v.length; i++) {
    var d = v[i][0]; if (!(d instanceof Date) || isNaN(d.getTime())) continue;
    var dk = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM-dd');
    out[dk] = (out[dk] || 0) + (parseFloat(v[i][15]) || 0);
  }
  return out;
}

/** Aggregate rev + FB/GA spend over [fromDk, toDk] into daily-averages. */
function _merWindow(revByDay, sp, fromDk, toDk) {
  var rev = 0, fb = 0, ga = 0, days = 0;
  var f = new Date(fromDk + 'T00:00:00'), t = new Date(toDk + 'T00:00:00');
  for (var d = new Date(f); d <= t; d.setDate(d.getDate() + 1)) {
    var dk = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM-dd');
    rev += (revByDay[dk] || 0);
    if (sp[dk]) { fb += (sp[dk].fb || 0); ga += (sp[dk].ga || 0); }
    days++;
  }
  days = Math.max(1, days);
  var ad = fb + ga;
  return { rev: rev, fb: fb, ga: ga, ad: ad, days: days,
           revD: rev / days, fbD: fb / days, gaD: ga / days, adD: ad / days,
           mer: ad > 0 ? rev / ad : 0 };
}

function buildMerTest() {
  var ss = _getSSActive(); var TNR = DPL.TNR, NC = 6;
  var revByDay = _merRevByDay(ss), sp = _dplLoadAdSpendSplit();
  // trailing 14d status
  var today = new Date();
  var t14from = Utilities.formatDate(new Date(today.getTime() - 14 * 864e5), DPL.VN_TZ, 'yyyy-MM-dd');
  var t14to = Utilities.formatDate(new Date(today.getTime() - 864e5), DPL.VN_TZ, 'yyyy-MM-dd');
  var cur = _merWindow(revByDay, sp, t14from, t14to);

  var ws = ss.getSheetByName(MER_SHEET) || ss.insertSheet(MER_SHEET); ws.clear();
  ws.getRange(1, 1, 1, NC).merge().setValue('\uD83C\uDFAF  GerberaPrints \u2014 MER Target & FB Marginal Test  (poor-man\u2019s holdout)')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(TNR).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1, 30);
  ws.getRange(2, 1, 1, NC).merge().setValue(
    'Blended MER = store rev / total ad = the number neither FB Ads (over-credits) nor last-click (under-credits) can spin. Cut FB ~25-30% on '
    + 'FB-worst campaigns, keep Google flat, wait 14 days, set the Test window, run analyzeMerTest(). Marginal FB ROAS of the cut = rev drop / FB '
    + 'saved; below breakeven MER = the cut FB was waste. Time-based (no geo control) \u2014 read directionally, avoid big-event windows.')
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(TNR).setFontSize(9).setFontStyle('italic').setWrap(true);
  ws.setRowHeight(2, 52);

  var cfg = [
    ['MER Target (aim):', 2.3, '', 'Breakeven MER (1/margin):', 2.0, ''],
    ['Baseline From:', t14from, 'To:', t14to, '(14d BEFORE the FB cut)', ''],
    ['Test From:', '', 'To:', '', '(14d AFTER the FB cut)', '']
  ];
  ws.getRange(4, 1, 3, 6).setValues(cfg).setFontFamily(TNR).setFontSize(11);
  ws.getRange(4, 1, 3, 1).setFontWeight('bold'); ws.getRange(4, 4, 1, 1).setFontWeight('bold'); ws.getRange(5, 3, 2, 1).setFontWeight('bold');
  ws.getRange(4, 2, 1, 1).setBackground('#FEF9C3').setNumberFormat('0.00"x"');   // MER target editable
  ws.getRange(4, 5, 1, 1).setBackground('#FEF9C3').setNumberFormat('0.00"x"');   // breakeven editable
  ws.getRange(5, 2, 2, 3).setBackground('#FEF9C3').setNumberFormat('yyyy-mm-dd');

  // current status
  ws.getRange(8, 1, 1, NC).merge().setValue('\uD83D\uDCC8 CURRENT (trailing 14d): Store Rev/day $' + Math.round(cur.revD).toLocaleString()
    + '  \u00b7  Ad/day $' + Math.round(cur.adD).toLocaleString() + '  \u00b7  Blended MER ' + cur.mer.toFixed(2) + 'x'
    + (cur.mer < 2.0 ? '  \u26A0 BELOW breakeven' : (cur.mer < 2.3 ? '  \u2014 thin (below target)' : '  \u2705 above target')))
    .setBackground(cur.mer < 2.0 ? '#FEE2E2' : (cur.mer < 2.3 ? '#FEF3C7' : '#DCFCE7')).setFontFamily(TNR).setFontSize(11).setFontWeight('bold');
  ws.setRowHeight(8, 24);

  [150, 110, 60, 200, 110, 200].forEach(function (w, i) { ws.setColumnWidth(i + 1, w); });
  ss.toast('MER Test ready. Trailing MER ' + cur.mer.toFixed(2) + 'x. Set the Test window after you cut FB, then analyzeMerTest().', '\uD83C\uDFAF', 9);
}

function analyzeMerTest() {
  var ss = _getSSActive(), ws = ss.getSheetByName(MER_SHEET);
  if (!ws) { ss.toast('Run buildMerTest() first.', '\uD83C\uDFAF', 6); return; }
  var target = parseFloat(ws.getRange(4, 2).getValue()) || 2.3;
  var be = parseFloat(ws.getRange(4, 5).getValue()) || 2.0;
  var bF = ws.getRange(5, 2).getValue(), bT = ws.getRange(5, 4).getValue();
  var tF = ws.getRange(6, 2).getValue(), tT = ws.getRange(6, 4).getValue();
  if (!(bF instanceof Date) || !(bT instanceof Date) || !(tF instanceof Date) || !(tT instanceof Date)) {
    ss.toast('Fill Baseline (B5/D5) and Test (B6/D6) date cells first.', '\uD83C\uDFAF', 7); return;
  }
  var fmt = function (d) { return Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM-dd'); };
  var revByDay = _merRevByDay(ss), sp = _dplLoadAdSpendSplit();
  var B = _merWindow(revByDay, sp, fmt(bF), fmt(bT));
  var T = _merWindow(revByDay, sp, fmt(tF), fmt(tT));

  var fbSaved = B.fbD - T.fbD;                 // +ve if FB cut
  var revDrop = B.revD - T.revD;               // +ve if rev fell
  var gaMove = T.gaD - B.gaD;                  // Google spend drift (should be ~0)
  var marg = fbSaved > 0 ? revDrop / fbSaved : 0;   // marginal FB ROAS of the cut
  var cutPct = B.fbD > 0 ? fbSaved / B.fbD : 0;

  var verdict, vbg;
  if (fbSaved <= 0) { verdict = 'No FB cut detected (FB spend did not fall) \u2014 nothing to judge.'; vbg = '#E2E8F0'; }
  else if (revDrop <= 0) { verdict = 'CLEAR WASTE \u2014 revenue did NOT drop after cutting FB. Cut more.'; vbg = '#DCFCE7'; }
  else if (marg < be) { verdict = 'WASTE \u2014 marginal FB ROAS ' + marg.toFixed(2) + 'x < breakeven ' + be.toFixed(2) + 'x. The cut FB lost money. Cut another 25%.'; vbg = '#DCFCE7'; }
  else { verdict = 'INCREMENTAL \u2014 marginal FB ROAS ' + marg.toFixed(2) + 'x >= breakeven. That FB was profitable (halo real). Restore it.'; vbg = '#FEE2E2'; }

  var TNR = DPL.TNR, NC = 6, r0 = 10;
  ws.getRange(r0, 1, 1, NC).merge().setValue('\uD83D\uDCCA RESULTS \u2014 Baseline ' + B.days + 'd  vs  Test ' + T.days + 'd')
    .setBackground('#1E293B').setFontColor('#FFFFFF').setFontFamily(TNR).setFontSize(12).setFontWeight('bold');
  var rows = [
    ['', 'Store Rev/day', 'FB Spend/day', 'Google Spend/day', 'Total Ad/day', 'Blended MER'],
    ['Baseline', B.revD, B.fbD, B.gaD, B.adD, B.mer],
    ['Test (post-cut)', T.revD, T.fbD, T.gaD, T.adD, T.mer],
    ['Change', T.revD - B.revD, -fbSaved, gaMove, T.adD - B.adD, T.mer - B.mer]
  ];
  ws.getRange(r0 + 1, 1, 4, NC).setValues(rows).setFontFamily(TNR).setFontSize(11).setHorizontalAlignment('center');
  ws.getRange(r0 + 1, 1, 1, NC).setFontWeight('bold').setBackground('#334155').setFontColor('#FFFFFF');
  ws.getRange(r0 + 2, 1, 3, 1).setFontWeight('bold').setHorizontalAlignment('left');
  ws.getRange(r0 + 2, 2, 3, 4).setNumberFormat('"$"#,##0');
  ws.getRange(r0 + 2, 6, 3, 1).setNumberFormat('0.00"x"');
  // MER cells coloured vs target/breakeven
  [B.mer, T.mer].forEach(function (m, k) {
    ws.getRange(r0 + 2 + k, 6).setBackground(m < be ? '#FEE2E2' : (m < target ? '#FEF3C7' : '#DCFCE7')).setFontWeight('bold');
  });

  var pr = r0 + 6;
  ws.getRange(pr, 1, 1, NC).merge().setValue('FB cut \u2248 ' + (cutPct * 100).toFixed(0) + '%  \u00b7  FB saved/day $' + Math.round(fbSaved).toLocaleString()
    + '  \u00b7  Rev change/day $' + Math.round(T.revD - B.revD).toLocaleString()
    + (Math.abs(gaMove) > B.gaD * 0.15 ? '  \u26A0 Google spend also moved ' + (gaMove >= 0 ? '+' : '') + '$' + Math.round(gaMove) + '/day (confounds the read)' : ''))
    .setFontFamily(TNR).setFontSize(11).setBackground('#F1F5F9');
  ws.getRange(pr + 1, 1, 1, NC).merge().setValue('MARGINAL FB ROAS of the cut: ' + (fbSaved > 0 ? marg.toFixed(2) + 'x' : 'n/a') + '   (vs breakeven ' + be.toFixed(2) + 'x)')
    .setFontFamily(TNR).setFontSize(12).setFontWeight('bold').setBackground('#FEF3C7');
  ws.getRange(pr + 2, 1, 1, NC).merge().setValue('\uD83E\uDDED ' + verdict).setFontFamily(TNR).setFontSize(12).setFontWeight('bold').setBackground(vbg).setWrap(true);
  ws.setRowHeight(pr + 2, 30);
  ss.toast('MER Test: MER ' + B.mer.toFixed(2) + 'x \u2192 ' + T.mer.toFixed(2) + 'x \u00b7 marginal FB ROAS ' + (fbSaved > 0 ? marg.toFixed(2) + 'x' : 'n/a'), '\uD83C\uDFAF', 10);
}