// ════════════════════════════════════════════════════════════════════════
//  GP_SheetOrder.gs — sắp xếp tab theo ưu tiên kinh doanh (re-runnable)
//  Match theo KEYWORD (substring) → không lệ thuộc emoji prefix.
//  Sheet không khớp keyword nào → tự xếp sau cùng, giữ thứ tự cũ.
//  Sửa/đảo thứ tự = sửa mảng ORDER bên dưới (con người đọc được).
// ════════════════════════════════════════════════════════════════════════
function dplReorderSheets() {
  var ss = _getSSActive();
  var ORDER = [
    // ⓪ Nguồn đơn gốc — đầu bảng
    'Shopify B2C',
    // ① P&L — quan tâm nhất
    'Daily P&L',
    'Monthly P&L',
    // ② Ads — tổng trước, rồi từng kênh
    'Ad Spend',            // ads TỔNG (rollup FB+Google)
    'FB Ads Daily',        // ads kênh — Facebook
    'Google Ads Daily',    // ads kênh — Google
    // ③ Campaign
    'Campaign Daily',      // 🎯 Campaign Daily + 📱 FB Campaign Daily
    // ④ Email & Klaviyo
    'Klaviyo',
    'Email',
    'Abandoned',
    'SMS',
    // ⑤ Cổng thanh toán
    'Airwallex Daily',
    'Airwallex Fees',
    'Airwallex Cash Flow',
    'Failed Payment'
    // ⑥ mọi sheet KHÁC → tự xếp sau, giữ thứ tự cũ
  ];

  var all = ss.getSheets();
  var used = {}, seq = [];
  ORDER.forEach(function (kw) {
    all.forEach(function (s) {
      var n = s.getName();
      if (!used[n] && n.indexOf(kw) >= 0) { used[n] = true; seq.push(s); }
    });
  });
  all.forEach(function (s) { if (!used[s.getName()]) seq.push(s); });   // leftovers

  var pos = 0, moved = [];
  seq.forEach(function (s) {
    try { ss.setActiveSheet(s); pos++; ss.moveActiveSheet(pos); moved.push(s.getName()); }
    catch (e) { Logger.log('skip (hidden?) ' + s.getName() + ': ' + e.message); }
  });
  Logger.log('FINAL TAB ORDER:\n' + moved.map(function (n, i) { return (i + 1) + '. ' + n; }).join('\n'));
  ss.toast('✅ Đã sắp xếp ' + moved.length + ' tab: P&L → Ads → Campaign → Email/Klaviyo → Payment → khác.', '📑', 10);
}


// ════════════════════════════════════════════════════════════════════════
//  dplDiagSheets() — liệt kê mọi sheet: tên, số dòng/cột, ẩn?, A1, cờ EMPTY.
//  Phát hiện sheet trùng-tên-gần-giống & sheet rỗng. Chỉ ĐỌC, không sửa gì.
//  Run → mở "Execution log" (Ctrl+Enter) để đọc, hoặc gửi log cho dev.
// ════════════════════════════════════════════════════════════════════════
function dplDiagSheets() {
  var ss = _getSSActive();
  var lines = ss.getSheets().map(function (s, i) {
    var lr = s.getLastRow(), lc = s.getLastColumn(), a1 = '';
    try { a1 = String(s.getRange(1, 1).getValue()).slice(0, 45); } catch (e) {}
    return (i + 1) + '. "' + s.getName() + '" | rows=' + lr + ' cols=' + lc +
      (s.isSheetHidden() ? ' [HIDDEN]' : '') + (lr <= 1 ? '  ⚠️EMPTY' : '') +
      ' | A1="' + a1 + '"';
  });
  var empty = ss.getSheets().filter(function (s) { return s.getLastRow() <= 1; })
    .map(function (s) { return s.getName(); });
  Logger.log('=== SHEET DIAGNOSTIC (' + lines.length + ' sheets) ===\n' + lines.join('\n') +
    '\n\nEMPTY (rows<=1): ' + (empty.join(' | ') || 'none'));
  ss.toast('Diag xong: ' + lines.length + ' sheet, ' + empty.length + ' rỗng. Mở Execution log để xem chi tiết.', '🔧', 10);
  return lines.join('\n');
}