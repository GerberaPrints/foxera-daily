// ════════════════════════════════════════════════════════════════════════
//  GP_ProductPL.gs — v28.1 · PRODUCT MIX & SIZE DEMAND (units, not P&L)
//  v28.1: taxonomy sync — 'Sleeveless Top'→'Sleeveless Polo Shirt',
//         'Dress'→'Short Sleeve Dress', + new 'Long Sleeve Dress' (LSD-).
//         TYPES array MUST match _skuToType labels in CRM main exactly.
//  Old COGS/GM was misleading (gross rev pre-discount minus flat per-prefix
//  cost ignored promos/B2G1/fees). True margin is blended & correct in
//  📊 Daily/Monthly P&L. This sheet reports what SKU Raw Data measures
//  ACCURATELY: units fulfilled by type + size demand. No fake margin.
//  Sheet name '📦 Product Type P&L' kept → CRM menu unchanged.
//  Reuses: _getSSActive, _skuToType, _dplResetSheet, DPL.
//  Layout: LEFT = Units × Month (primary). RIGHT = By Type + Size matrix.
// ════════════════════════════════════════════════════════════════════════

function buildProductTypePL() {
  var ss = _getSSActive();
  ss.toast('Building Product Mix & Size Demand…', '📦', 30);
  var wsSku = ss.getSheetByName('SKU Raw Data');
  if (!wsSku || wsSku.getLastRow() < 2) { ss.toast('❌ "SKU Raw Data" missing/empty.', '📦', 8); return; }

  var data = wsSku.getRange(2, 1, wsSku.getLastRow() - 1, 7).getValues(); // A:Date B:Order# C:SKU D:Title E:Variant F:Price G:Qty
  var TYPES = ['Polo Shirt', 'Polo Shirt for Women', 'Sleeveless Polo Shirt', 'Half-Zip Pullover', 'Hawaiian Shirt', 'Short Sleeve Dress', 'Long Sleeve Dress', 'Hat', 'Tee', 'Other'];
  var SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', 'One Size', 'Other'];

  var agg = {};
  TYPES.forEach(function (t) { agg[t] = { units: 0, rev: 0, orders: {}, size: {} }; SIZES.forEach(function (s) { agg[t].size[s] = 0; }); });
  var mon = {};

  data.forEach(function (r) {
    var sku = String(r[2] || '').trim(); if (!sku) return;
    var qty = parseFloat(r[6]) || 0; if (qty <= 0) qty = 1;
    var price = parseFloat(r[5]) || 0;
    var type = _skuToType(sku); if (!agg[type]) { agg[type] = { units: 0, rev: 0, orders: {}, size: {} }; SIZES.forEach(function (s) { agg[type].size[s] = 0; }); }
    var sz = _ppSize(r[4]);
    agg[type].units += qty; agg[type].rev += price * qty;
    agg[type].size[sz] = (agg[type].size[sz] || 0) + qty;
    var ord = String(r[1] || '').trim(); if (ord) agg[type].orders[ord] = 1;
    var d = r[0];
    if (d instanceof Date && !isNaN(d.getTime())) {
      var mk = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM');
      if (!mon[mk]) mon[mk] = {};
      mon[mk][type] = (mon[mk][type] || 0) + qty;
    }
  });

  var ws = ss.getSheetByName('📦 Product Type P&L') || ss.insertSheet('📦 Product Type P&L');
  _dplResetSheet(ws);
  var NUM = '#,##0', PCT = '0.0%', USD = '"$"#,##0', stamp = Utilities.formatDate(new Date(), DPL.VN_TZ, 'dd/MM/yyyy HH:mm');

  var MW = TYPES.length + 2;        // month block width
  var RC = MW + 2;                  // right panels start col; gap col before it
  var SW = SIZES.length + 2;        // size panel width = 13
  var FULLW = RC + SW - 1;

  ws.getRange(1, 1, 1, FULLW).merge().setValue('📦  GerberaPrints — Product Mix & Size Demand  (units fulfilled — for supplier orders & inventory)')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1, 34);
  ws.getRange(2, 1, 1, FULLW).merge().setValue('Updated: ' + stamp + ' ICT  ·  Source = SKU Raw Data (per line-item).  Counts UNITS fulfilled by type & size.  ' +
    'No COGS / margin here on purpose — true profit is blended (promos, B2G1, fees) in 📊 Daily/Monthly P&L.  Gross Rev = size reference only.')
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(DPL.TNR).setFontSize(9).setFontStyle('italic').setWrap(true).setVerticalAlignment('middle');
  ws.setRowHeight(2, 44); ws.setRowHeight(3, 6);

  var totU = 0; TYPES.forEach(function (t) { totU += agg[t].units; });
  var list = TYPES.filter(function (t) { return agg[t].units > 0; }).sort(function (a, b) { return agg[b].units - agg[a].units; });

  // ── LEFT (PRIMARY): Units by Product Type × Month (newest first) ──
  ws.getRange(4, 1, 1, MW).merge().setValue('▸ Units by Product Type × Month  (newest first)')
    .setFontFamily(DPL.TNR).setFontSize(11).setFontWeight('bold').setFontColor('#0F172A');
  var hdrM = ['Month'].concat(TYPES).concat(['Total']);
  ws.getRange(5, 1, 1, MW).setValues([hdrM]).setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(DPL.TNR).setFontSize(9).setFontWeight('bold').setHorizontalAlignment('center').setWrap(true);
  ws.setRowHeight(5, 30);
  var mkeys = Object.keys(mon).sort().reverse();
  var rowsM = mkeys.map(function (mk) {
    var row = [mk], tot = 0;
    TYPES.forEach(function (t) { var v = mon[mk][t] || 0; row.push(v); tot += v; });
    row.push(tot); return row;
  });
  if (rowsM.length) {
    ws.getRange(6, 1, rowsM.length, MW).setValues(rowsM).setFontFamily(DPL.TNR).setFontSize(9);
    ws.getRange(6, 2, rowsM.length, MW - 1).setNumberFormat(NUM);
  }

  // ── RIGHT PANEL 1: By Product Type (units desc) ──
  ws.getRange(4, RC, 1, 6).merge().setValue('▸ By Product Type  (units desc)')
    .setFontFamily(DPL.TNR).setFontSize(11).setFontWeight('bold').setFontColor('#0F172A');
  ws.getRange(5, RC, 1, 6).setValues([['Product Type', 'Units', 'Orders', 'Unit Share %', 'Gross Rev ($ ref)', 'Avg U/Order']])
    .setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(DPL.TNR).setFontSize(10).setFontWeight('bold').setHorizontalAlignment('center').setWrap(true);
  var rows1 = [], gU = 0, gO = 0, gR = 0;
  list.forEach(function (t) {
    var a = agg[t], nOrd = Object.keys(a.orders).length, sh = totU > 0 ? a.units / totU : 0, upo = nOrd > 0 ? a.units / nOrd : 0;
    rows1.push([t, a.units, nOrd, sh, a.rev, upo]); gU += a.units; gO += nOrd; gR += a.rev;
  });
  if (rows1.length) {
    ws.getRange(6, RC, rows1.length, 6).setValues(rows1).setFontFamily(DPL.TNR).setFontSize(10);
    ws.getRange(6, RC + 1, rows1.length, 2).setNumberFormat(NUM);
    ws.getRange(6, RC + 3, rows1.length, 1).setNumberFormat(PCT);
    ws.getRange(6, RC + 4, rows1.length, 1).setNumberFormat(USD);
    ws.getRange(6, RC + 5, rows1.length, 1).setNumberFormat('#,##0.00');
    var p1tot = 6 + rows1.length;
    ws.getRange(p1tot, RC, 1, 6).setValues([['TOTAL', gU, gO, 1, gR, gO > 0 ? gU / gO : 0]])
      .setFontFamily(DPL.TNR).setFontSize(10).setFontWeight('bold').setBackground('#0F172A').setFontColor('#C9A84C');
    ws.getRange(p1tot, RC + 1, 1, 2).setNumberFormat(NUM);
    ws.getRange(p1tot, RC + 3).setNumberFormat(PCT);
    ws.getRange(p1tot, RC + 4).setNumberFormat(USD);
    ws.getRange(p1tot, RC + 5).setNumberFormat('#,##0.00');
  }

  // ── RIGHT PANEL 2: Size matrix (below panel 1) ──
  var sizeTitle = 6 + rows1.length + 1 + 2;
  ws.getRange(sizeTitle, RC, 1, SW).merge().setValue('▸ Size Demand — units by type × size  (size your supplier orders)')
    .setFontFamily(DPL.TNR).setFontSize(11).setFontWeight('bold').setFontColor('#0F172A');
  var hdrS = ['Product Type'].concat(SIZES).concat(['Total']);
  ws.getRange(sizeTitle + 1, RC, 1, SW).setValues([hdrS]).setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(DPL.TNR).setFontSize(9).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(sizeTitle + 1, 26);
  var colTot = {}; SIZES.forEach(function (s) { colTot[s] = 0; }); var grand = 0;
  var rowsS = list.map(function (t) {
    var row = [t], rt = 0;
    SIZES.forEach(function (s) { var v = agg[t].size[s] || 0; row.push(v); rt += v; colTot[s] += v; });
    row.push(rt); grand += rt; return row;
  });
  if (rowsS.length) {
    ws.getRange(sizeTitle + 2, RC, rowsS.length, SW).setValues(rowsS).setFontFamily(DPL.TNR).setFontSize(9);
    ws.getRange(sizeTitle + 2, RC + 1, rowsS.length, SW - 1).setNumberFormat(NUM);
    var trow = ['TOTAL']; SIZES.forEach(function (s) { trow.push(colTot[s]); }); trow.push(grand);
    var sTot = sizeTitle + 2 + rowsS.length;
    ws.getRange(sTot, RC, 1, SW).setValues([trow]).setFontFamily(DPL.TNR).setFontSize(9).setFontWeight('bold').setBackground('#0F172A').setFontColor('#C9A84C');
    ws.getRange(sTot, RC + 1, 1, SW - 1).setNumberFormat(NUM);
  }

  ws.setColumnWidth(1, 80);
  for (var c = 2; c <= MW; c++) ws.setColumnWidth(c, 62);
  ws.setColumnWidth(MW + 1, 24);
  ws.setColumnWidth(RC, 150);
  for (var c2 = RC + 1; c2 <= RC + SW - 1; c2++) ws.setColumnWidth(c2, 58);
  try { ws.setFrozenRows(3); } catch (e) {}
  ss.toast('✅ Product Mix: ' + list.length + ' types · ' + totU + ' units · ' + mkeys.length + ' months.', '📦', 10);
}

/** Size from Variant. "Dark Blue / 2XL"→2XL · "M"→M · "Snapback / White"→One Size. */
function _ppSize(variant) {
  var v = String(variant || '').toUpperCase().trim();
  if (!v) return 'Other';
  var SET = { 'XS': 1, 'S': 1, 'M': 1, 'L': 1, 'XL': 1, '2XL': 1, '3XL': 1, '4XL': 1, '5XL': 1 };
  var parts = v.split('/');
  for (var p = 0; p < parts.length; p++) {
    var tok = parts[p].replace(/\s+/g, ' ').trim();
    if (SET[tok]) return tok;
  }
  if (v.indexOf('SNAPBACK') >= 0 || v.indexOf('BASEBALL') >= 0 || v.indexOf('TRUCKER') >= 0 || v.indexOf('ONE SIZE') >= 0) return 'One Size';
  return 'Other';
}