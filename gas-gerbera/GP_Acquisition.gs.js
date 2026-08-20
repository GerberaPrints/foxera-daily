// ════════════════════════════════════════════════════════════════════════
//  GP_Acquisition.gs — GerberaPrints · FB acquisition lens  v1.2
//  ------------------------------------------------------------------------
//  v1.2: CONSOLIDATED into ONE auto-refreshed sheet '📊 FB Acquisition'
//  (was 2 sheets). Section A = Cohort LTV (first-order channel + lifetime value
//  + FB Acquisition ROAS). Section B = New-Customer by Channel (monthly first-
//  touch share). Wired into _dplDailyAnalytics -> refreshes daily, no manual run.
//
//  WHY: last-click ROAS under-credits FB (it drives discovery; customers convert
//  later via Google/branded/direct/email). For a NEW customer the FIRST order's
//  channel ~ first touch, so this measures FB by its real job: acquiring customers.
//
//  Reads 'Shopify B2C' (Date r[0] · Email r[3] · Total Rev r[15] · Channel r[26]).
//  Reuses CRM globals: _getSSActive, DPL, _dplLoadAdSpendSplit.
// ════════════════════════════════════════════════════════════════════════

var ACQ_SHEET = '\uD83D\uDCCA FB Acquisition';   // 📊
var ACQ_CHANNELS = ['Facebook', 'Google', 'Email', 'Organic/Direct', 'Pinterest', 'TikTok', 'Other'];

function _acqChannel(raw) {
  var s = (raw || '').toString().trim();
  if (!s) return 'Other';
  var l = s.toLowerCase();
  if (l.indexOf('facebook') >= 0 || l === 'fb' || l.indexOf('meta') >= 0 || l.indexOf('instagram') >= 0) return 'Facebook';
  if (l.indexOf('google') >= 0) return 'Google';
  if (l.indexOf('email') >= 0 || l.indexOf('klaviyo') >= 0 || l.indexOf('sms') >= 0) return 'Email';
  if (l.indexOf('pinterest') >= 0) return 'Pinterest';
  if (l.indexOf('tiktok') >= 0) return 'TikTok';
  if (l.indexOf('organic') >= 0 || l.indexOf('direct') >= 0) return 'Organic/Direct';
  return 'Other';
}

function buildAcquisitionViews() {
  var ss = _getSSActive();
  var wsB2C = ss.getSheetByName(DPL.B2C);
  if (!wsB2C || wsB2C.getLastRow() < 3) { ss.toast('Shopify B2C empty \u2014 sync first.', '\uD83D\uDCCA', 6); return; }

  var lastCol = Math.max(wsB2C.getLastColumn(), 27);
  var vals = wsB2C.getRange(1, 1, wsB2C.getLastRow(), lastCol).getValues();
  var cust = {};
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    var d = r[0], em = (r[3] || '').toString().trim().toLowerCase();
    if (!(d instanceof Date) || isNaN(d.getTime()) || !em) continue;
    var rev = parseFloat(r[15]) || 0, chan = _acqChannel(r[26]), t = d.getTime();
    var c = cust[em];
    if (!c) { c = cust[em] = { firstMs: t, firstChan: chan, firstRev: rev, ltv: 0, orders: 0 }; }
    if (t < c.firstMs) { c.firstMs = t; c.firstChan = chan; c.firstRev = rev; }
    c.ltv += rev; c.orders += 1;
  }

  var byMonthChan = {}, monthsSet = {}, byChan = {};
  ACQ_CHANNELS.forEach(function (ch) { byChan[ch] = { n: 0, firstRev: 0, ltv: 0 }; });
  Object.keys(cust).forEach(function (em) {
    var c = cust[em], mk = Utilities.formatDate(new Date(c.firstMs), DPL.VN_TZ, 'yyyy-MM');
    monthsSet[mk] = 1;
    (byMonthChan[mk] || (byMonthChan[mk] = {}));
    var cell = byMonthChan[mk][c.firstChan] || (byMonthChan[mk][c.firstChan] = { n: 0, rev: 0 });
    cell.n += 1; cell.rev += c.firstRev;
    var b = byChan[c.firstChan] || (byChan[c.firstChan] = { n: 0, firstRev: 0, ltv: 0 });
    b.n += 1; b.firstRev += c.firstRev; b.ltv += c.ltv;
  });

  var lcRevByChan = {}; ACQ_CHANNELS.forEach(function (ch) { lcRevByChan[ch] = 0; });
  for (var j = 0; j < vals.length; j++) {
    var rr = vals[j], dd = rr[0]; if (!(dd instanceof Date) || isNaN(dd.getTime())) continue;
    lcRevByChan[_acqChannel(rr[26])] += (parseFloat(rr[15]) || 0);
  }
  var sp = _dplLoadAdSpendSplit(), fbSpend = 0, gaSpend = 0;
  Object.keys(sp).forEach(function (dk) { fbSpend += (sp[dk].fb || 0); gaSpend += (sp[dk].ga || 0); });

  _acqWriteAll(ss, monthsSet, byMonthChan, byChan, lcRevByChan, fbSpend, gaSpend);
  ss.toast('FB Acquisition refreshed (Cohort LTV + New-Customer by Channel).', '\uD83D\uDCCA', 6);
}

/** One consolidated sheet: Section A = Cohort LTV, Section B = New-Customer by Channel. */
function _acqWriteAll(ss, monthsSet, byMonthChan, byChan, lcRevByChan, fbSpend, gaSpend) {
  var TNR = DPL.TNR, NC = 10, CH = ACQ_CHANNELS;
  var ws = ss.getSheetByName(ACQ_SHEET) || ss.insertSheet(ACQ_SHEET); ws.clear();

  ws.getRange(1, 1, 1, NC).merge().setValue('\uD83D\uDCCA  GerberaPrints \u2014 FB Acquisition  (first-touch \u00b7 lifetime value \u00b7 auto-daily)')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(TNR).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1, 30);
  ws.getRange(2, 1, 1, NC).merge().setValue(
    'Last-click under-credits FB (it seeds discovery; customers convert later via Google/branded/direct/email). Section A groups customers by '
    + 'first-order channel + their TOTAL lifetime revenue \u2014 FB Acquisition ROAS = FB-cohort LTV \u00f7 FB spend, fairer than last-click. Section B = '
    + 'monthly NEW-customer share by first-order channel (first-touch proxy). Earliest month over-counts if B2C history is truncated.')
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(TNR).setFontSize(9).setFontStyle('italic').setWrap(true);
  ws.setRowHeight(2, 46);

  // ---------- Section A: Cohort LTV ----------
  var R = 4;
  ws.getRange(R, 1, 1, NC).merge().setValue('\uD83D\uDC8E  A \u00b7 ACQUISITION COHORT LTV  (by first-order channel)')
    .setBackground('#1E293B').setFontColor('#FFFFFF').setFontFamily(TNR).setFontSize(12).setFontWeight('bold');
  R++;
  ws.getRange(R, 1, 1, 8).setValues([['First-Order Channel', 'Customers', 'First-Order Rev ($)', 'Cohort LTV ($)', 'LTV / Cust ($)', 'Repeat Rev ($)', 'Repeat %', 'Last-Click Rev ($)']])
    .setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(TNR).setFontSize(11).setFontWeight('bold').setHorizontalAlignment('center').setWrap(true);
  R++;
  var cohRows = CH.filter(function (ch) { return byChan[ch] && byChan[ch].n > 0; })
    .sort(function (a, b) { return byChan[b].ltv - byChan[a].ltv; })
    .map(function (ch) { var b = byChan[ch], rep = b.ltv - b.firstRev;
      return [ch, b.n, b.firstRev, b.ltv, (b.n > 0 ? b.ltv / b.n : 0), rep, (b.ltv > 0 ? rep / b.ltv : 0), (lcRevByChan[ch] || 0)]; });
  if (cohRows.length) {
    ws.getRange(R, 1, cohRows.length, 8).setValues(cohRows).setFontFamily(TNR).setFontSize(11).setHorizontalAlignment('center');
    ws.getRange(R, 1, cohRows.length, 1).setHorizontalAlignment('left').setFontWeight('bold');
    ws.getRange(R, 2, cohRows.length, 1).setNumberFormat('#,##0');
    ws.getRange(R, 3, cohRows.length, 3).setNumberFormat('"$"#,##0');
    ws.getRange(R, 5, cohRows.length, 1).setNumberFormat('"$"#,##0.00');
    ws.getRange(R, 6, cohRows.length, 1).setNumberFormat('"$"#,##0');
    ws.getRange(R, 7, cohRows.length, 1).setNumberFormat('0.0%');
    ws.getRange(R, 8, cohRows.length, 1).setNumberFormat('"$"#,##0');
    for (var k = 0; k < cohRows.length; k++) if (cohRows[k][0] === 'Facebook') ws.getRange(R + k, 1, 1, 8).setBackground('#FEF3C7');
  }
  R += cohRows.length + 1;
  var fb = byChan['Facebook'] || { ltv: 0 }, ga = byChan['Google'] || { ltv: 0 };
  var acqFb = fbSpend > 0 ? fb.ltv / fbSpend : 0, lcFb = fbSpend > 0 ? (lcRevByChan['Facebook'] || 0) / fbSpend : 0, acqGa = gaSpend > 0 ? ga.ltv / gaSpend : 0;
  ws.getRange(R, 1, 1, NC).merge().setValue('\uD83D\uDCE3 FB Acquisition ROAS ' + acqFb.toFixed(2) + 'x  (LTV $' + Math.round(fb.ltv).toLocaleString() + ' \u00f7 spend $' + Math.round(fbSpend).toLocaleString()
    + ')   \u00b7  vs last-click ' + lcFb.toFixed(2) + 'x  \u00b7  uplift ' + (lcFb > 0 ? (acqFb / lcFb).toFixed(1) : '\u221E') + 'x    |    Google Acq ROAS ' + acqGa.toFixed(2) + 'x')
    .setBackground('#FEF3C7').setFontFamily(TNR).setFontSize(11).setFontWeight('bold');
  R += 2;

  // ---------- Section B: New-Customer by Channel ----------
  ws.getRange(R, 1, 1, NC).merge().setValue('\uD83D\uDC65  B \u00b7 NEW-CUSTOMER BY CHANNEL  (monthly first-touch acquisition)')
    .setBackground('#1E293B').setFontColor('#FFFFFF').setFontFamily(TNR).setFontSize(12).setFontWeight('bold');
  R++;
  var hdr = ['Month'].concat(CH).concat(['Total New', 'FB % of New']);
  ws.getRange(R, 1, 1, NC).setValues([hdr]).setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(TNR).setFontSize(11).setFontWeight('bold').setHorizontalAlignment('center').setWrap(true);
  R++;
  var months = Object.keys(monthsSet).sort().reverse();
  var ncRows = months.map(function (m) {
    var row = [m], tot = 0, fbn = 0;
    CH.forEach(function (ch) { var v = (byMonthChan[m] && byMonthChan[m][ch]) ? byMonthChan[m][ch].n : 0; row.push(v); tot += v; if (ch === 'Facebook') fbn = v; });
    row.push(tot); row.push(tot > 0 ? fbn / tot : 0); return row;
  });
  if (ncRows.length) {
    ws.getRange(R, 1, ncRows.length, NC).setValues(ncRows).setFontFamily(TNR).setFontSize(11).setHorizontalAlignment('center');
    ws.getRange(R, 2, ncRows.length, CH.length + 1).setNumberFormat('#,##0');
    ws.getRange(R, NC, ncRows.length, 1).setNumberFormat('0.0%').setFontWeight('bold');
    var fbCol = 2 + CH.indexOf('Facebook');
    ws.getRange(R, fbCol, ncRows.length, 1).setFontWeight('bold').setBackground('#FEF3C7');
  }
  ws.setFrozenRows(2);
  ws.setColumnWidth(1, 150);
  for (var c = 2; c <= NC; c++) ws.setColumnWidth(c, 96);
}