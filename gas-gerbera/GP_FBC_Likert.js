/* ════════════════════════════════════════════════════════════════════════════
 *  GP_FBC_Likert.gs  ·  v2.2
 *  Five-band colour grading for '📱 FB Campaign Daily' (18 columns — v2.9 layout,
 *  col R Campaign ID appended; every graded column F..Q is unchanged).
 *
 *  v2.2 — three corrections, all of the 'typed instead of derived' family this file exists to end:
 *    · GATEWAY_PCT was 3.78%, which no longer reproduces from the P&L it claims as its source.
 *      Measured on the live Daily P&L (2026-08-18): (Processing AWX + PP) ÷ Rev Received =
 *      4.566% whole history, 4.466% trailing 90 days. Now 4.47%. Break-evens tighten by ~$0.4–0.6;
 *      the weakest (SSD) drops to $40.97, still above the $40 fair/average cut, so both band
 *      promises hold — with $0.97 of headroom, not $1.45. If gateway fees reach ~5.5% the GREEN
 *      PROMISE breaks and _fbclCheckBands() throws, which is the point.
 *    · ROAS_CUTS was typed next to a comment explaining it must equal CPP_CUTS inverted. Typed
 *      numbers drift; it is now COMPUTED from ONE_ITEM_FLOOR and CPP_CUTS at load, so changing
 *      either input moves the ROAS bands with it and nothing can desynchronise.
 *    · The local _fbcSay duplicated the identical function in GP_FB_Campaign_Sync.gs. Apps Script
 *      merges all files into one scope, so the loser of that collision is silently ignored — an
 *      edit to it would do nothing and say nothing. Removed; the Sync copy is the only one.
 *
 *  WHAT CHANGED IN v2.0, AND WHY IT MATTERED
 *  v1.x graded CPP against $59 and ROAS against [2, 2.5, 3, 3.5]. Both were wrong,
 *  and wrong in the dangerous direction.
 *
 *  $59 came from a B2G1 basket worked out in an earlier session at a different AOV.
 *  Measured against real supplier invoices it is not a target and not a break-even:
 *  it sits ABOVE the break-even of every line the store advertises. A day losing
 *  money on every order would have coloured amber.
 *
 *  The ROAS cuts were the store-wide MER thresholds, which answer a different
 *  question at a different level. Borrowing them for a single campaign-day compared
 *  two things that do not share a denominator.
 *
 *  Both numbers were typed rather than derived. That is the actual defect: a
 *  threshold nobody can trace back to a unit cost will drift the moment a price or
 *  a supplier rate moves, and nothing will announce it.
 *
 *  THE ONE ANCHOR EVERY BAND NOW COMES FROM
 *    contribution per order = price + shipping − COGS − gateway − Shopify txn
 *    break-even CPP         = that contribution
 *    ROAS                   = AOV ÷ CPP, so the ROAS cuts are the CPP cuts inverted
 *
 *  Measured on the ONE-ITEM order, the worst case FoxEra asked to stay safe at
 *  (COGS from CustomEase invoices, n = 5,574 for Men Polo down to 35 for SSD):
 *
 *    line                 rev     COGS    break-even CPP   CM%
 *    Men Polo            $59.90  $13.70       $42.92       71.7%
 *    Women Polo          $59.90  $12.50       $44.12       73.7%
 *    Sleeveless          $59.90  $11.20       $45.42       75.8%
 *    Short Sleeve Dress  $69.90  $25.11       $40.97       58.6%
 *    Long Sleeve Dress   $79.90  $27.00       $48.53       60.7%
 *
 *  Every break-even lands between $40.97 and $48.53, and that spread is what the
 *  bands are built around. In $10 steps from FoxEra's target of $20:
 *    20 / 30 / 40 / 50
 *
 *  The fit is exact, and each band means one thing:
 *    excellent  under $20   profitable on EVERY line, FoxEra's stretch target
 *    good       $20 to $30  profitable on EVERY line, inside target
 *    fair       $30 to $40  profitable on EVERY line, outside target
 *    average    $40 to $50  AMBIGUOUS by design: the break-even spread lives here,
 *                           so SSD is already losing at $42 while Sleeveless is not
 *    poor       $50 and up  losing on EVERY line, no product mix saves it
 *
 *  Amber is therefore not a soft warning, it is an honest 'cannot tell without
 *  knowing what sold'. Splitting the bands per line would resolve it, but Facebook
 *  returns no product type at campaign level, so the ambiguity is real and the
 *  colour should say so rather than pick a side.
 *
 *  ROAS is the same cuts inverted at the one-item floor of $59.90:
 *    CPP $20 → 3.00x   $30 → 2.00x   $40 → 1.50x   $50 → 1.20x
 *  rounded to 1.2 / 1.5 / 2.0 / 3.0. At the real blended AOV of $104.54 the same
 *  CPP reads a higher ROAS, which is correct: a bigger basket earns more per dollar
 *  of ad spend. Designing at the floor keeps the grade honest when it is not.
 *
 *  WHAT THIS STILL CANNOT DO, stated plainly
 *  Facebook's per-campaign purchases OVERLAP across campaigns, so CPP measured here
 *  is biased LOW and flatters. Treat the colours as a ranking between campaigns and
 *  between days. The question of whether the store is profitable belongs to Blended
 *  MER against its 2.3x target and to the account-level '📱 FB Ads Daily'.
 *
 *  Run: fbcApplyLikert()
 * ════════════════════════════════════════════════════════════════════════════ */

var FBCL = {
  SHEET : '📱 FB Campaign Daily',
  // canonical palette, identical to the rest of the CRM so a colour means one thing everywhere
  POOR  : { bg: '#DC2626', fg: '#FFFFFF' },
  AVG   : { bg: '#F97316', fg: '#FFFFFF' },
  FAIR  : { bg: '#FACC15', fg: '#713F12' },
  GOOD  : { bg: '#4ADE80', fg: '#14532D' },
  EXCEL : { bg: '#15803D', fg: '#FFFFFF' }
};

/**
 * The unit economics every band is derived from. Edit HERE and nowhere else.
 *
 * COGS figures are the median of that prefix's priced supplier rows in the
 * Fulfillment Hub, not list prices and not estimates. LSD is FoxEra's stated $27
 * because no LSD row has been invoiced yet; replace it the moment one is.
 */
var GP_UNIT_ECONOMICS = (function () {
  var E = {
    // Blended gateway rate MEASURED on Daily P&L 2026-08-18: (Processing AWX + Processing PP)
    // ÷ Rev Received = 4.466% over the trailing 90 days (4.566% whole history). To re-measure
    // after a gateway or mix change: sum those two P&L columns over 90 days, divide by the
    // Rev Received sum, and put the result here. NOTE: '⚙ Settings' still carries a stale 3.00%
    // 'Gateway blended fee rate'; it is NOT read here precisely because it is stale.
    GATEWAY_PCT : 0.0447,
    SHOPIFY_PCT : 0.0100,   // Shopify transaction fee
    SHIPPING    : 4.95,     // charged on orders under $75, which every one-item order is
    // The cheapest one-item order: $54.95 + $4.95 shipping. ROAS bands are designed at this
    // floor so the grade stays honest for the smallest basket (bigger baskets read better,
    // which is correct).
    ONE_ITEM_FLOOR : 59.90,
    LINES : [
      { name: 'Men Polo',           price: 54.95, cogs: 13.70 },
      { name: 'Women Polo',         price: 54.95, cogs: 12.50 },
      { name: 'Sleeveless',         price: 54.95, cogs: 11.20 },
      { name: 'Short Sleeve Dress', price: 64.95, cogs: 25.11 },
      { name: 'Long Sleeve Dress',  price: 74.95, cogs: 27.00 }
    ],
    CPP_CUTS : [20, 30, 40, 50]       // $10 steps from FoxEra's target, straddling break-even
  };
  // v2.2 DERIVED, NOT TYPED. ROAS cut i = floor ÷ CPP cut (reversed), rounded to 0.1:
  // $50 gives 1.2x · $40 gives 1.5x · $30 gives 2.0x · $20 gives 3.0x. Typed twin numbers
  // drift the moment one side is edited; a computed pair cannot.
  E.ROAS_CUTS = [E.CPP_CUTS[3], E.CPP_CUTS[2], E.CPP_CUTS[1], E.CPP_CUTS[0]]
    .map(function (c) { return Math.round(E.ONE_ITEM_FLOOR / c * 10) / 10; });
  return E;
})();

/**
 * Recompute every break-even from the constants above and check the bands still mean
 * what the comments claim. This is the guard that was missing when $59 went in.
 *
 * Two conditions, not one, because the bands make two separate promises:
 *   GREEN PROMISE  the top of 'fair' must sit at or below the WEAKEST break-even, so
 *                  nothing green or yellow can be losing money on any line.
 *   RED PROMISE    the bottom of 'poor' must sit at or above the STRONGEST break-even,
 *                  so nothing red is still profitable on some line.
 * Everything between those two is the ambiguous band, and that is intended: it is
 * exactly the range where the answer depends on which product sold.
 *
 * A threshold is only safe while the costs behind it hold. If a supplier raises a
 * price or a line is repriced, one of these promises breaks and the sheet would keep
 * colouring loss-making days green. Here that condition throws instead of drifting.
 */
function _fbclCheckBands() {
  var E = GP_UNIT_ECONOMICS, feeRate = E.GATEWAY_PCT + E.SHOPIFY_PCT;
  var worst = null, best = null, report = [];
  E.LINES.forEach(function (L) {
    var rev = L.price + E.SHIPPING;
    var contrib = rev - L.cogs - rev * feeRate;
    report.push(L.name + ' break-even CPP $' + contrib.toFixed(2) +
                '  (CM ' + (contrib / rev * 100).toFixed(1) + '%)');
    if (worst === null || contrib < worst.contrib) worst = { name: L.name, contrib: contrib };
    if (best  === null || contrib > best.contrib)  best  = { name: L.name, contrib: contrib };
  });
  var fairTop = E.CPP_CUTS[2], poorFrom = E.CPP_CUTS[3];
  if (fairTop > worst.contrib) {
    throw new Error('GREEN PROMISE BROKEN: fair ends at $' + fairTop + ' but ' + worst.name +
      ' breaks even at $' + worst.contrib.toFixed(2) + '. A loss-making day would colour yellow. ' +
      'Lower CPP_CUTS[2] or update the COGS in GP_UNIT_ECONOMICS.');
  }
  if (poorFrom < best.contrib) {
    throw new Error('RED PROMISE BROKEN: poor starts at $' + poorFrom + ' but ' + best.name +
      ' is still profitable up to $' + best.contrib.toFixed(2) + '. A profitable day would colour red. ' +
      'Raise CPP_CUTS[3] or update the COGS in GP_UNIT_ECONOMICS.');
  }
  return { worst: worst, best: best, report: report };
}

/** Column map for the v2.5 sheet. `lowerBetter` marks a cost: small becomes green. */
function _fbclColumns() {
  var E = GP_UNIT_ECONOMICS;
  return [
    { col: 'F', name: 'CPM ($)',           lowerBetter: true,  cuts: [25, 35, 45, 55],           derived: false },
    { col: 'H', name: 'CTR',               lowerBetter: false, cuts: [0.015, 0.025, 0.035, 0.045], derived: false },
    { col: 'I', name: 'CPC ($)',           lowerBetter: true,  cuts: [0.80, 1.20, 1.60, 2.20],   derived: false },
    { col: 'K', name: 'ATC Cost ($)',      lowerBetter: true,  cuts: [3, 5, 7, 10],              derived: false },
    { col: 'M', name: 'Checkout Cost ($)', lowerBetter: true,  cuts: [8, 13, 18, 25],            derived: false },
    { col: 'O', name: 'CPP ($)',           lowerBetter: true,  cuts: E.CPP_CUTS,                 derived: true  },
    { col: 'Q', name: 'ROAS',              lowerBetter: false, cuts: E.ROAS_CUTS,                derived: true  }
  ];
}

/**
 * Build the five rules for one column.
 *
 * Blank cells are left alone deliberately. CPP is blank on a day with no purchases,
 * and colouring that blank either green or red would both be wrong: the cost per
 * purchase is unknown, not good and not bad. An uncoloured cell beside a spend
 * figure reads as the open question it is.
 */
function _fbclRules(range, cuts, lowerBetter) {
  var order = lowerBetter
    ? [FBCL.EXCEL, FBCL.GOOD, FBCL.FAIR, FBCL.AVG, FBCL.POOR]
    : [FBCL.POOR, FBCL.AVG, FBCL.FAIR, FBCL.GOOD, FBCL.EXCEL];
  var out = [];
  out.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(cuts[0])
    .setBackground(order[0].bg).setFontColor(order[0].fg).setRanges([range]).build());
  for (var i = 0; i < 3; i++) {
    out.push(SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(cuts[i], cuts[i + 1])
      .setBackground(order[i + 1].bg).setFontColor(order[i + 1].fg).setRanges([range]).build());
  }
  out.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThanOrEqualTo(cuts[3])
    .setBackground(order[4].bg).setFontColor(order[4].fg).setRanges([range]).build());
  return out;
}

// _fbcSay (log + non-blocking toast) lives in GP_FB_Campaign_Sync.gs — same project, same scope.
// v2.2 removed the identical local copy: two same-named functions in one Apps Script project is a
// silent coin-toss over which body runs, and an edit to the losing copy changes nothing.

function fbcApplyLikert() {
  var ss = _getSSActive();
  var ws = ss.getSheetByName(FBCL.SHEET);
  if (!ws) { throw new Error('Sheet not found: ' + FBCL.SHEET + '. Run fetchFBCampaignDaily first.'); }

  // Refuse to grade the wrong columns. If the header is not the v2.5 layout the letters
  // below point elsewhere, and a confidently wrong colour is worse than no colour.
  var cpp = ws.getRange(4, 15).getValue();
  if (String(cpp).indexOf('CPP') < 0) {
    throw new Error('Column O is "' + cpp + '", not CPP. Update GP_FB_Campaign_Sync.gs to v2.5 or later ' +
                    'and re-run fetchFBCampaignDaily first.');
  }

  var check = _fbclCheckBands();

  var last = Math.max(ws.getLastRow(), 5);
  var rules = [], names = [];
  _fbclColumns().forEach(function (c) {
    var range = ws.getRange(c.col + '5:' + c.col + last);
    rules = rules.concat(_fbclRules(range, c.cuts, c.lowerBetter));
    names.push(c.name + (c.derived ? '*' : ''));
  });
  ws.setConditionalFormatRules(rules);

  var msg = 'Colour applied to ' + names.length + ' columns: ' + names.join(' · ') +
            '\n* = derived from unit economics, not typed.' +
            '\nCPP cuts $' + GP_UNIT_ECONOMICS.CPP_CUTS.join(' / $') +
            ' · ROAS cuts ' + GP_UNIT_ECONOMICS.ROAS_CUTS.join('x / ') + 'x' +
            '\nGreen and yellow are safe up to $' + GP_UNIT_ECONOMICS.CPP_CUTS[2] + ', below ' +
            check.worst.name + ' at $' + check.worst.contrib.toFixed(2) + '. Red starts at $' +
            GP_UNIT_ECONOMICS.CPP_CUTS[3] + ', above ' + check.best.name + ' at $' +
            check.best.contrib.toFixed(2) + '. Amber between them is ambiguous by design.' +
            '\nRows 5 to ' + last + '. Blank CPP stays uncoloured: no purchases means unknown, not good and not bad.' +
            '\nPer-campaign purchases overlap, so read these as a RANKING. Profitability belongs to Blended MER.';
  _fbcSay('🎨 FB Campaign Likert', msg);
  check.report.forEach(function (r) { Logger.log('  ' + r); });
}

/** Remove every conditional format from the tab, for when the bands need rebuilding. */
function fbcClearLikert() {
  var ws = _getSSActive().getSheetByName(FBCL.SHEET);
  if (!ws) return;
  ws.setConditionalFormatRules([]);
  _fbcSay('🎨 Likert', 'Conditional formatting cleared on ' + FBCL.SHEET);
}

/**
 * Print the break-even of every line and how the rows fall across the bands.
 *
 * Worth running after any change to price or COGS. A band holding nearly every row
 * decides nothing: before CPP existed, every CPC on this tab was green, which looked
 * like a healthy account and was really a scale too wide to separate a good day from
 * a bad one.
 */
function fbcLikertDistribution() {
  var check = _fbclCheckBands();
  var L = ['=== unit economics behind the bands ==='];
  check.report.forEach(function (r) { L.push('  ' + r); });
  L.push('  CPP cuts $' + GP_UNIT_ECONOMICS.CPP_CUTS.join(' / $') +
         '  ·  ROAS cuts ' + GP_UNIT_ECONOMICS.ROAS_CUTS.join('x / ') + 'x');

  var ws = _getSSActive().getSheetByName(FBCL.SHEET);
  if (!ws || ws.getLastRow() < 5) { Logger.log(L.concat(['No data rows.']).join('\n')); return; }
  var n = ws.getLastRow() - 4;
  L.push('');
  L.push('=== how the rows fall across the bands (' + n + ' rows) ===');
  _fbclColumns().forEach(function (c) {
    var vals = ws.getRange(c.col + '5:' + c.col + ws.getLastRow()).getValues();
    var b = [0, 0, 0, 0, 0], blank = 0;
    vals.forEach(function (r) {
      var v = r[0];
      if (v === '' || v === null || isNaN(parseFloat(v))) { blank++; return; }
      v = parseFloat(v);
      var i = v < c.cuts[0] ? 0 : v < c.cuts[1] ? 1 : v < c.cuts[2] ? 2 : v < c.cuts[3] ? 3 : 4;
      b[i]++;
    });
    var labels = c.lowerBetter ? ['excellent', 'good', 'fair', 'average', 'poor']
                               : ['poor', 'average', 'fair', 'good', 'excellent'];
    var parts = [];
    for (var i = 0; i < 5; i++) parts.push(labels[i] + ' ' + b[i]);
    L.push('  ' + (c.name + '                ').substring(0, 18) + parts.join(' · ') + (blank ? '  · blank ' + blank : ''));
  });
  L.push('A band holding nearly every row is not measuring anything; move its cuts.');
  Logger.log(L.join('\n'));
  _fbcSay('🎨 Likert', 'Distribution logged · View > Executions > Logs');
}