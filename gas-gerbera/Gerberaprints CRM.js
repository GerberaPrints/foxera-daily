// ╔══════════════════════════════════════════════════════════════════════╗
// ║  GerberaPrints CRM v28.14 — heatmap: unhide FB ROAS col Z (28.13 hid it); FB ROAS bands from GP_UNIT_ECONOMICS; dplPaintAdsRoas no longer paints Revenue as ROAS ║
// ║                                                                        ║
// ║  PURPOSE: one focused tool — business results + true daily NET P&L.    ║
// ║    Revenue − COGS − Gateway − Ad spend = CONTRIBUTION MARGIN           ║
// ║                                                                        ║
// ║  WHAT THIS FILE OWNS (autonomous, via hourly trigger):                 ║
// ║    • Shopify order sync → 'Shopify B2C'                                ║
// ║    • Daily P&L NET ledger (COGS from Fulfillment Hub + all costs)      ║
// ║  WHAT CLAUDE DOES ON-DEMAND (MCP — not in this file):                  ║
// ║    • FB/Google ad spend (you paste into '📊 Ad Spend')                ║
// ║    • Deep Ads/MER analysis · payment-fee reconciliation               ║
// ║                                                                        ║
// ║  KEPT (protected — feed bot + builders):                               ║
// ║    Shopify B2C · 📅 Daily P&L · 📱 FB Ads Daily · 📊 Ad Spend ·        ║
// ║    🔍 Google Ads Daily · 💰 Cost Tracker · ⚙ Settings · 🛍️ Catalog    ║
// ║  DROPPED vs v26: ~25 redundant dashboards/analytics + payment sync     ║
// ║                  (run dplCleanupOldSheets to remove the sheets).       ║
// ║                                                                        ║
// ║  COGS join needs Script Property FULFILLMENT_HUB_ID (already set in    ║
// ║  this project — survives the code replacement).                        ║
// ╚══════════════════════════════════════════════════════════════════════╝

// ── Shopify config (read-only Admin API) ────────────────────────────────
var SHOPIFY_STORE   = '1nyyjq-kf.myshopify.com';
var SHOPIFY_API_VER = '2024-01';
var SHOPIFY_TOKEN   = '__REDACTED__';
var _SHOPIFY_SYNC_DATE = 'SHOPIFY_LAST_SYNC_DATE';
var _HOURLY_FN = '_dplHourlySync';
var _DAILY_FN  = '_dplDailyRefreshAll';

var DPL = {
  PL       : '📅 Daily P&L',
  B2C      : 'Shopify B2C',
  COST     : '💰 Cost Tracker',
  SETTINGS : '⚙ Settings',
  ADSPEND  : '📊 Ad Spend',
  PL_MONTHLY: '📆 Monthly P&L',
  ADSPERF: '🎯 Campaign Daily',
  HEATMAP: '🎯 Campaign Daily',
  CATALOG  : '🛍️ Product Catalog',
  MTP      : '🎩 MTP Cap',
  YOYCOL   : '👕 Yoycol',
  CUSTEASE : '📦 CustomEase',
  KLEMAIL  : '📧 Email Marketing',
  AUDIT    : '🔎 Channel Audit',
  CAMPSCORE: '📧 Campaign Scorecard',
  TNR      : 'Times New Roman',
  // Reporting/day-bucketing timezone. Switched to Pacific so Daily/Monthly/Channel reconcile with
  // Shopify (revenue source of truth), Facebook, Email and the Lark bot (all Pacific). DST-aware
  // (PST -8 / PDT -7), matching Shopify's "Pacific Time" store setting. Key name kept for compatibility
  // (the separate GP_UTM_Attribution.gs reads DPL.VN_TZ). Google Ads is +7 but its daily spend lives
  // in its own sheet, so only edge-of-day cents shift; monthly totals are unaffected.
  VN_TZ    : 'America/Los_Angeles',
  TZ_LABEL : 'PT'
};

// 2a — ad-spend rollup sources
var DPL_FB_SHEET   = '📱 FB Ads Daily';
var DPL_GADS_SHEET = '🔍 Google Ads Daily';
var DPL_TZ_PST     = 'America/Los_Angeles';

// Per-execution memo cache. GAS resets globals on every execution, so these are valid only within a
// single run (e.g. _dplDailyRefreshAll builds Daily+Monthly+Channel+Missing in ONE execution → the
// cross-spreadsheet Fulfillment Hub read + SKU-cost scan + ad-spend rollup each run ONCE, not 3-4×).
// Standalone menu rebuilds are separate executions, so each stays self-sufficient.
var _DPL_COGS_MEMO    = null;   // _dplLoadCogsMap() result
var _DPL_SKUCOGS_MEMO = null;   // _dplCogsBySKU() result (prefixCost is stable within an execution)
var _DPL_ROLLUP_DONE  = false;  // dplRollupAdSpend() guard
var _DPL_ADSPEND_MEMO = null;   // _dplLoadAdSpend() result (post-rollup, stable within execution)
var _DPL_ADSPLIT_MEMO = null;   // _dplLoadAdSpendSplit() result
var _DPL_SETTINGS_MEMO = null;  // _dplGetSetting() — ⚙ Settings read once per execution (critical: it is called per-order)

/** Timezone-stable calendar-day anchor. Noon UTC keeps the SAME calendar date in every timezone from
 *  UTC-11..+13, so Utilities.formatDate(date, DPL.VN_TZ) and the sheet's own display tz always agree.
 *  REQUIRED for every constructed day/month loop date and label: building a date at local midnight
 *  (new Date(y,m,d) = Apps-Script-project tz, ICT) and then formatting it in a far-away tz (Pacific)
 *  rolls the date BACK across the day boundary — that shifted month labels one month and day labels
 *  one day after the Pacific switch. */
function _dplAnchor(y, m, d) { return new Date(Date.UTC(y, m, d, 12, 0, 0)); }

// ════════════════════════════════════════════════════════════════════════
//  MENU
// ════════════════════════════════════════════════════════════════════════

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('📅 GerberaPrints')
    .addItem('🛒 Sync Shopify (new orders now)', 'syncShopifyOrdersNew')
    .addSeparator()
    .addSubMenu(ui.createMenu('🔄 Rebuild')
      .addItem('Daily P&L (2025 → now)', 'dplRebuildDaily')
      .addItem('Monthly P&L (2025 → now)', 'dplRebuildMonthly')
      .addItem('Channel Trends (FB vs Google)', 'dplRebuildChannelTrends')
      .addItem('Channel Daily (per day)', 'dplRebuildChannelDaily')
      .addItem('Channel Audit (raw sources)', 'dplRebuildChannelAudit')
      .addItem('nCAC (new-customer CAC)', 'buildNcacReport')
      .addItem('FB ROAS Reconciliation', 'buildFbRoasRecon')
      .addItem('FB Platform Archive (append)', 'archiveFbPlatformDaily')
      .addItem('Install FB Archive trigger (7AM)', 'installFbArchiveTrigger')
      .addItem('FB Incrementality Test (template)', 'buildFbIncrementalityTest')
      .addItem('\uD83D\uDD0D FB Coverage Audit (accounts + campaigns)', 'buildFbCoverageAudit')
      .addItem('Product Type P&L', 'buildProductTypePL'))
    .addSubMenu(ui.createMenu('💰 COGS')
      .addItem('▶ Run COGS pipeline (refresh + reconcile + gaps)', 'gpCogsDaily')
      .addItem('🎯 Build COGS Gaps worklist', 'gpCleanCogsGaps')
      .addItem('🔎 List orders missing actual COGS', 'dplListMissingCogs')
      .addSeparator()
      .addItem('👁 Status refresh — preview', 'gpRefreshOrderStatusPreview')
      .addItem('✅ Status refresh — apply', 'gpRefreshOrderStatusApply')
      .addItem('👁 Hub cancel reconcile — preview', 'gpReconcileHubCancelsPreview')
      .addItem('✅ Hub cancel reconcile — apply', 'gpReconcileHubCancelsApply')
      .addItem('⏰ Install daily COGS trigger', 'gpInstallCogsDailyTrigger'))
    .addSubMenu(ui.createMenu('\uD83E\uDDF9 Tidy')
      .addItem('\uD83E\uDDF9 Hide background sheets', 'gpTidyCrmSheets')
      .addItem('\uD83D\uDC41 Show ALL sheets', 'gpShowAllCrmSheets')
      .addSeparator()
      .addItem('\u2696\uFE0F Dispute Register (from Airwallex CSV)', 'awxBuildDisputeRegister')
      .addItem('\u2696\uFE0F Dispute Scorecard (volume proxy)', 'awxBuildDisputeScorecard')
      .addItem('\uD83D\uDD27 Check / repair triggers', '_dplEnsureDailyTriggers'))
    .addSubMenu(ui.createMenu('📧 Klaviyo / Campaigns')
      .addItem('Set / Update Klaviyo API Key', 'dplSetKlaviyoKey')
      .addItem('Sync Klaviyo Email (last 3 mo)', 'dplSyncKlaviyoEmail')
      .addItem('Backfill Klaviyo Email (12 mo)', 'dplBackfillKlaviyoEmail')
      .addItem('Build Campaign Scorecard (since launch)', 'dplSyncCampaignScorecard')
      .addItem('Build SMS Scorecard (since launch)', 'dplSyncSmsScorecard')
      .addItem('\uD83D\uDD0E Diagnose Klaviyo windows (log)', 'dplDiagKlaviyoWindows')
      .addItem('Build Campaign Heatmap (daily ROAS)', 'buildCampaignHeatmap')
      .addItem('Paint Ads Daily (ROAS + CPM/CTR/CPC)', 'dplPaintAdsRoas'))
    .addSeparator()
    .addItem('🔁 Re-sync ALL B2C from Shopify (1-time)', 'resyncAllB2C')
    .addSubMenu(ui.createMenu('🧭 UTM Attribution (real order source)')
      .addItem('Rebuild — Last 7 days',  'utmRebuild7')
      .addItem('Rebuild — Last 14 days', 'utmRebuild14')
      .addItem('Rebuild — Last 30 days', 'utmRebuild30'))
    .addSubMenu(ui.createMenu('🔧 Setup')
      .addItem('① Create Settings + Ad Spend', 'dplSetup')
      .addItem('② Enable auto-update (hourly + daily full)', 'dplInstallTrigger')
      .addItem('🚀 Install ALL triggers (full automation)', 'gpInstallAllTriggers')
      .addItem('🗂 Reorder tabs (dashboards front)', 'gpReorderTabs')
      .addItem('⏰ List installed triggers (log)', 'gpListTriggers')
      .addItem('🩺 Health Check (status + reconciliation)', 'dplHealthCheck')
      .addItem('✉️ Send test alert email', 'dplTestAlertEmail')
      .addItem('➕ Add fixed-cost entry', 'dplAddCost')
      .addItem('💳 Build cost table (seed billing)', 'dplBuildCostTracker')
      .addItem('💰 Sync Shopify fixed (plan+apps from CSV)', 'dplSyncShopifyFixed')
      .addItem('🧾 Build Tools & Fees breakdown', 'dplBuildToolsFees')
      .addSeparator()
      .addItem('🔗 Link Fulfillment Hub (COGS)', 'dplLinkFulfillmentHub')
      .addItem('🔍 Diagnostics', 'dplDiagnostics')
      .addItem('🔁 Rollup ad spend (FB+Google) now', 'dplRollupAdSpend')
      .addItem('🧹 Dedupe Ad Spend (fix duplicate days)', 'dplDedupeAdSpend')
      .addItem('🔎 Diagnose heatmap sources (log)', 'dplDiagHeatmapSources')
      .addItem('🗓 Backfill FB Ads history…', 'menuFBBackfill')
      .addSeparator()
      .addItem('👁 Preview cleanup (no delete)', 'dplPreviewCleanup')
      .addItem('🗑 Clean up old v26 sheets', 'dplCleanupOldSheets'))
    .addToUi();
    dplFBAdsMenu(SpreadsheetApp.getUi());
    try { klBuildMenu(); } catch (e) {}   // v27.60: render consolidated Klaviyo menu (GP_Klaviyo.gs)
    try { SpreadsheetApp.getUi().createMenu('📑 Sheets')
      .addItem('🔀 Reorder tabs by priority', 'dplReorderSheets')
      .addItem('🔧 Diagnose sheets (log)', 'dplDiagSheets').addToUi(); } catch (e) {}   // v27.62
}

// ════════════════════════════════════════════════════════════════════════
//  SMALL HELPERS
// ════════════════════════════════════════════════════════════════════════

function _getSSActive() {
  try { var a = SpreadsheetApp.getActiveSpreadsheet(); if (a) return a; } catch(e) {}
  try {
    var id = PropertiesService.getScriptProperties().getProperty('TARGET_SS_ID');
    if (id) return SpreadsheetApp.openById(id);
  } catch(e) {
    try { PropertiesService.getScriptProperties().deleteProperty('TARGET_SS_ID'); } catch(e2) {}
  }
  return null;
}

/** Robust order# normalize — symmetric on B2C + supplier sides (strips ⚠ / spaces / #). */
function _dplCleanGPN(raw) {
  if (!raw) return '';
  return raw.toString().replace(/^[\s\u26A0\uFE0F]+/, '').replace(/^#/, '').trim();
}

function _skuToType(code) {
  var u = (code || '').toUpperCase();
  if (u.indexOf('PM-')  >= 0) return 'Polo Shirt';                              // men's polo
  if (u.indexOf('PW-')  >= 0) return 'Polo Shirt for Women';                    // women's polo — NOT half-zip
  if (u.indexOf('PS-')  >= 0) return 'Sleeveless Polo Shirt';                   // v27.77: renamed from 'Sleeveless Top'
  if (u.indexOf('SSD-') >= 0) return 'Short Sleeve Dress';                      // v27.77: renamed from 'Dress'
  if (u.indexOf('LSD-') >= 0) return 'Long Sleeve Dress';                       // v27.77: NEW ($74.95, CustomEase)
  if (u.indexOf('HP-')  >= 0 || u.indexOf('HZ-') >= 0) return 'Half-Zip Pullover';
  if (u.indexOf('HW-')  >= 0 || u.indexOf('HA-') >= 0) return 'Hawaiian Shirt';
  if (u.indexOf('BC-')  >= 0 || u.indexOf('SH-') >= 0 || u.indexOf('DA-') >= 0 ||
      u.indexOf('SN-')  >= 0 || u.indexOf('EA-') >= 0 || u.indexOf('OT-') >= 0) return 'Hat';
  if (u.indexOf('HT-')  >= 0) return 'Tee';
  return 'Other';
}

function _dplCogsBizDay(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return date;
  var ymd = Utilities.formatDate(date, DPL.VN_TZ, 'yyyy-MM-dd');
  var d   = new Date(ymd + 'T00:00:00+07:00');
  var dow = d.getDay();
  if (dow === 5) d.setDate(d.getDate() + 3);
  if (dow === 6) d.setDate(d.getDate() + 2);
  if (dow === 0) d.setDate(d.getDate() + 1);
  return d;
}

function _dplResetSheet(ws) {
  if (!ws) return;
  try { ws.getRange(1,1,Math.max(1,ws.getMaxRows()),Math.max(1,ws.getMaxColumns())).breakApart(); } catch(e) {}
  try { ws.setFrozenRows(0);    } catch(e) {}
  try { ws.setFrozenColumns(0); } catch(e) {}
  try { ws.clearContents(); } catch(e) {}
  try { ws.clearFormats();  } catch(e) {}
  try { ws.clearNotes();    } catch(e) {}
}

function _dplGetFulfillmentHub() {
  try {
    var id = PropertiesService.getScriptProperties().getProperty('FULFILLMENT_HUB_ID');
    if (!id) return null;
    return SpreadsheetApp.openById(id);
  } catch(e) { Logger.log('[_dplGetFulfillmentHub] ' + e.message); return null; }
}

function _sortB2CSheet(wsB2C) {
  var lastRow = wsB2C.getLastRow();
  if (lastRow < 4) return;
  // Newest → oldest (descending). Safe for incremental sync: since-date uses Math.max(dates)
  // and the whole range is re-sorted on every write, so row order is irrelevant to the logic.
  wsB2C.getRange(3, 1, lastRow - 2, wsB2C.getLastColumn())
       .sort([{ column: 1, ascending: false }]);
}

/** Sort any sheet's data block newest → oldest by the date in column A. */
function _dplSortByDateDesc(ws, startRow) {
  var lr = ws.getLastRow();
  if (!ws || lr <= startRow) return;
  ws.getRange(startRow, 1, lr - startRow + 1, ws.getLastColumn())
    .sort([{ column: 1, ascending: false }]);
}

// ════════════════════════════════════════════════════════════════════════
//  DATA LOADERS
// ════════════════════════════════════════════════════════════════════════

/** COGS map {GPN: totalCost} from Fulfillment Hub (MTP/Yoycol/CustomEase),
 *  data from row 6, Total COGS at col 17 (already includes supplier shipping). */
/**
 * v28.6 Read a large range in chunks, retrying each chunk once after a pause.
 *
 * A single getValues over 7,600 rows is one all-or-nothing call against a remote spreadsheet, and
 * when it fails it takes the whole sheet with it. Chunks turn that into several small calls where a
 * stumble costs one slice and is usually recovered on the retry. Whatever cannot be read is logged
 * and thrown, so the caller records a failure instead of inheriting a short array and believing it.
 */
/**
 * v28.6 One line describing how much actual COGS the Hub handed over, for the P&L banner.
 *
 * The trailing-percentage fallback keeps the P&L looking complete whether the Hub returned every
 * order or none at all, so the only way to tell measurement from modelling is to say it out loud.
 */
function _dplCogsCoverageNote() {
  try {
    var info = _dplLoadCogsMap();
    var n = Object.keys(info.map || {}).length;
    if (info.readFailed && info.readFailed.length) {
      return '\u26A0 FAILED (' + info.readFailed.join(' ; ') + ') — costs below are ESTIMATES, rerun before trusting them';
    }
    return n + ' orders with actual cost' +
           (info.provCount ? '  ·  ' + info.provCount + ' order(s) carry a PROVISIONAL line priced from supplier history (unbilled, e.g. MTP Cap invoices the following month)' : '') +
           (info.sheetReport ? ' [' + info.sheetReport + ']' : '');
  } catch (e) { return 'unavailable: ' + e.message; }
}

function _dplReadChunked(ws, startRow, startCol, numRows, numCols, label) {
  var CHUNK = 2000, out = [];
  for (var off = 0; off < numRows; off += CHUNK) {
    var n = Math.min(CHUNK, numRows - off), part = null, err = null;
    for (var attempt = 0; attempt < 2 && !part; attempt++) {
      try { part = ws.getRange(startRow + off, startCol, n, numCols).getValues(); }
      catch (e) { err = e; Utilities.sleep(1200); }
    }
    if (!part) {
      Logger.log('[_dplReadChunked] ' + label + ' rows ' + (startRow + off) + '..' + (startRow + off + n - 1) +
                 ' unreadable after retry: ' + (err ? err.message : 'unknown'));
      throw new Error('chunk ' + (startRow + off) + '..' + (startRow + off + n - 1) + ' unreadable: ' +
                      (err ? err.message : 'unknown'));
    }
    out = out.concat(part);
  }
  return out;
}

function _dplLoadCogsMap() {
  if (_DPL_COGS_MEMO) return _DPL_COGS_MEMO;
  var map = {}, rows = 0, allGpns = {};
  var unpriced = {};             // v28.7 order -> [ supplier lines the supplier has not billed yet ]
  var typeAcc  = {};             // v28.7 supplier||productType -> { cost, qty } for a per-type unit cost
  var pAcc = {};                 // prefix -> { cost: sumTotalCOGS, qty: sumQty }
  var hub = _dplGetFulfillmentHub();
  var ss  = hub || _getSSActive();
  var src = hub ? 'Fulfillment Hub' : 'local';
  // v28.6 THE READ USED TO FAIL IN SILENCE. Each supplier sheet was wrapped in `catch(e) {}` with an
  // empty body, so a failed read looked exactly like an empty sheet. It was failing: '\uD83D\uDD0E Missing
  // COGS' reported 'matched 245' when the three Hub sheets hold 3,729 orders with cost. 245 is MTP
  // Cap alone, which is first in the loop; the two large sheets, Yoycol at 1,169 rows and CustomEase
  // at 7,601, both threw and said nothing. 93% of real COGS was invisible.
  // Nothing looked wrong downstream because the P&L quietly substitutes a trailing-percentage
  // estimate for any order with no actual cost. The totals stayed plausible and every per-day and
  // per-product margin was modelled rather than measured, with the real figures one file away.
  // Now: large sheets are read in chunks, a failed chunk is retried, every sheet reports what it
  // returned, and a sheet that has rows but yielded nothing is recorded as a FAILURE rather than
  // treated as empty.
  var perSheet = {}, readFailed = [];
  [DPL.MTP, DPL.YOYCOL, DPL.CUSTEASE].forEach(function(name) {
    var got = 0, expected = 0;
    try {
      var ws = ss.getSheetByName(name);
      if (!ws) { readFailed.push(name + ': sheet not found'); perSheet[name] = 'MISSING'; return; }
      if (ws.getLastRow() < 6) { perSheet[name] = '0 rows'; return; }
      expected = ws.getLastRow() - 5;
      var data = _dplReadChunked(ws, 6, 1, expected, 17, name);
      got = data.length;
      data.forEach(function(r) {
        var gpn = _dplCleanGPN(r[1]);
        var c   = parseFloat(r[16]) || parseFloat(r[15]) || 0;
        if (gpn) allGpns[gpn] = true;   // present in Hub regardless of cost
        if (gpn && c > 0) { map[gpn] = (map[gpn] || 0) + c; rows++; }
        // v28.7 Remember the lines the supplier has NOT priced yet, per order.
        // Cost was being judged one ORDER at a time: any order with at least one priced line counted
        // as fully costed, so a polo invoiced by CustomEase hid an MTP hat that had not been billed.
        // MTP Cap prices the previous month's work, so on a two-supplier order that gap is normal and
        // permanent, and it always understates cost in the same direction. 16 live orders sit like
        // this today, one unpriced hat each. Judging line by line is the only honest way.
        if (gpn && c <= 0) {
          if (!unpriced[gpn]) unpriced[gpn] = [];
          unpriced[gpn].push({
            supplier: name,
            ptype:    String(r[7] || '').trim(),
            spu:      String(r[6] || r[5] || '').trim(),
            qty:      parseFloat(r[10]) || 1
          });
        }
        // per-prefix avg cost: SPU col G (idx6) -> prefix; Qty col K (idx10); Total COGS col Q (idx16)
        var spu = String(r[6] || r[5] || '').trim();
        var pfx = spu ? spu.split('-')[0].toUpperCase().trim() : '';
        var q   = parseFloat(r[10]) || 0;
        if (pfx && c > 0 && q > 0) {
          if (!pAcc[pfx]) pAcc[pfx] = { cost: 0, qty: 0 };
          pAcc[pfx].cost += c; pAcc[pfx].qty += q;
        }
        // v28.7 Unit cost per supplier and product type. A prefix average blends every hat together;
        // the type separates them, and the history is unambiguous: MTP Dad Hat 14.50 across 135 rows,
        // Snap Back 15.50 across 97. An estimate that precise is worth more than a trailing average
        // of the whole store applied to a $29.95 hat.
        var pt = String(r[7] || '').trim();
        if (pt && c > 0 && q > 0) {
          var tk = name + '||' + pt.toUpperCase();
          if (!typeAcc[tk]) typeAcc[tk] = { cost: 0, qty: 0 };
          typeAcc[tk].cost += c; typeAcc[tk].qty += q;
        }
      });
      perSheet[name] = got + '/' + expected + ' rows';
      if (expected > 0 && got === 0) { readFailed.push(name + ': ' + expected + ' rows expected, 0 read'); }
    } catch(e) {
      // Never swallow. A read that fails must look different from a sheet that is empty.
      readFailed.push(name + ': ' + e.message);
      perSheet[name] = 'FAILED';
      Logger.log('[_dplLoadCogsMap] READ FAILED on ' + name + ': ' + e.message);
    }
  });
  var prefixCost = {};           // prefix -> avg COGS per unit (incl supplier ship)
  Object.keys(pAcc).forEach(function(p){ if (pAcc[p].qty > 0) prefixCost[p] = pAcc[p].cost / pAcc[p].qty; });
  var typeCost = {};             // v28.7 supplier||PRODUCT TYPE -> avg COGS per unit
  Object.keys(typeAcc).forEach(function(t){ if (typeAcc[t].qty > 0) typeCost[t] = typeAcc[t].cost / typeAcc[t].qty; });

  // v28.7 Provisional cost for lines the supplier has not billed. Priced from that supplier's own
  // history for that exact product type, falling back to the SPU prefix, and only then to nothing.
  // It is kept in a SEPARATE map and never added into `map`, because `map` means invoiced fact and
  // the two must not blur: when the real invoice lands the provisional figure has to disappear
  // cleanly rather than be added on top of it.
  var provisional = {}, provLines = {};
  Object.keys(unpriced).forEach(function(gpn) {
    var sum = 0, detail = [];
    unpriced[gpn].forEach(function(L) {
      var unit = 0, basis = '';
      var tk = L.supplier + '||' + (L.ptype || '').toUpperCase();
      if (L.ptype && typeCost[tk] > 0) { unit = typeCost[tk]; basis = L.ptype; }
      else {
        var pfx = L.spu ? L.spu.split('-')[0].toUpperCase().trim() : '';
        if (pfx && prefixCost[pfx] > 0) { unit = prefixCost[pfx]; basis = pfx + ' prefix'; }
      }
      if (unit > 0) {
        var q = L.qty > 0 ? L.qty : 1;
        sum += unit * q;
        detail.push(L.supplier + ' ' + (basis || 'unknown') + ' x' + q + ' @ $' + (Math.round(unit * 100) / 100).toFixed(2));
      }
    });
    if (sum > 0) { provisional[gpn] = Math.round(sum * 100) / 100; provLines[gpn] = detail.join(' + '); }
  });
  var sheetReport = Object.keys(perSheet).map(function(k){ return k + ' ' + perSheet[k]; }).join(' | ');
  Logger.log('[_dplLoadCogsMap] ' + Object.keys(map).length + ' orders, ' + rows + ' rows, ' +
             Object.keys(prefixCost).length + ' SKU-prefix costs, ' +
             Object.keys(provisional).length + ' orders carrying a provisional line, src=' + src + ' || ' + sheetReport +
             (readFailed.length ? ' || READ FAILURES: ' + readFailed.join(' ; ') : ''));
  // v28.6 A broken read must not be cached. Memoising it would freeze the failure for the rest of
  // the execution, so every builder downstream would fall back to estimated cost on one bad call.
  var result = { map: map, rows: rows, src: src, prefixCost: prefixCost, allGpns: allGpns,
                 sheetReport: sheetReport, readFailed: readFailed,
                 typeCost: typeCost, provisional: provisional, provLines: provLines,
                 provCount: Object.keys(provisional).length };
  if (readFailed.length) {
    Logger.log('[_dplLoadCogsMap] NOT memoised because ' + readFailed.length + ' sheet(s) failed; the next call retries.');
    return result;
  }
  _DPL_COGS_MEMO = result;
  return _DPL_COGS_MEMO;
}

/** Estimated per-order COGS {GPN: estCost} from 'SKU Raw Data' line items
 *  (Order# col B, SKU col C, Qty col G) x per-prefix avg cost. Used ONLY as a
 *  smart fallback for orders not yet in the supplier (fulfilled) COGS map. */
function _dplCogsBySKU(prefixCost) {
  if (_DPL_SKUCOGS_MEMO) return _DPL_SKUCOGS_MEMO;
  var est = {};
  if (!prefixCost || !Object.keys(prefixCost).length) return est;
  try {
    var ws = _getSSActive().getSheetByName('SKU Raw Data');
    if (!ws || ws.getLastRow() < 2) return est;
    var data = ws.getRange(2, 1, ws.getLastRow() - 1, 7).getValues();  // A..G
    data.forEach(function(r) {
      var gpn = _dplCleanGPN(r[1]);                 // col B
      var sku = String(r[2] || '').trim();          // col C
      if (!gpn || !sku) return;
      var pfx = sku.split('-')[0].toUpperCase().trim();
      var c   = prefixCost[pfx]; if (!(c > 0)) return;
      var q   = parseFloat(r[6]) || 1;              // col G Qty
      est[gpn] = (est[gpn] || 0) + c * q;
    });
  } catch(e) { Logger.log('[_dplCogsBySKU] ' + e.message); }
  Logger.log('[_dplCogsBySKU] ' + Object.keys(est).length + ' orders estimated by SKU');
  _DPL_SKUCOGS_MEMO = est;
  return est;
}

/** Ad spend per day {YYYY-MM-DD: spendUSD} from '📊 Ad Spend' (col A Date, col E Total). */
function _dplLoadAdSpend() {
  if (_DPL_ADSPEND_MEMO) return _DPL_ADSPEND_MEMO;
  var out = {};
  var ws = _getSSActive().getSheetByName(DPL.ADSPEND);
  if (!ws || ws.getLastRow() < 2) return out;
  var data = ws.getRange(1, 1, ws.getLastRow(), 5).getValues();
  data.forEach(function(r) {
    var d = r[0]; if (!(d instanceof Date) || isNaN(d.getTime())) return;
    var fb = parseFloat(r[1]) || 0, g = parseFloat(r[2]) || 0, total = parseFloat(r[4]) || 0;
    var spend = total > 0 ? total : (fb + g + (parseFloat(r[3]) || 0));
    if (spend > 0) { var k = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM-dd'); out[k] = (out[k] || 0) + spend; }
  });
  _DPL_ADSPEND_MEMO = out;
  return out;
}

/** Per-day {YYYY-MM-DD: {fb,ga}} from '📊 Ad Spend' (col B FB, col C Google) — for the
 *  Daily P&L split columns. Net profit still deducts the authoritative total (col E). */
function _dplLoadAdSpendSplit() {
  if (_DPL_ADSPLIT_MEMO) return _DPL_ADSPLIT_MEMO;
  var out = {};
  var ws = _getSSActive().getSheetByName(DPL.ADSPEND);
  if (!ws || ws.getLastRow() < 2) return out;
  var data = ws.getRange(1, 1, ws.getLastRow(), 5).getValues();
  data.forEach(function(r) {
    var d = r[0]; if (!(d instanceof Date) || isNaN(d.getTime())) return;
    var k = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM-dd');
    if (!out[k]) out[k] = { fb: 0, ga: 0 };
    out[k].fb += parseFloat(r[1]) || 0;
    out[k].ga += parseFloat(r[2]) || 0;
  });
  _DPL_ADSPLIT_MEMO = out;
  return out;
}

/** Monthly fixed-cost totals {YYYY-MM: totalUSD} from '💰 Cost Tracker'
 *  (any row whose col A is a Date and col D is a positive number). */
function _dplLoadFixedMonthly() {
  var out = {};
  var ws = _getSSActive().getSheetByName(DPL.COST);
  if (!ws || ws.getLastRow() < 2) return out;
  var data = ws.getRange(1, 1, ws.getLastRow(), 4).getValues();
  data.forEach(function(r) {
    var d = r[0], amt = parseFloat(r[3]);
    if (!(d instanceof Date) || isNaN(d.getTime()) || !(amt > 0)) return;
    var k = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM');
    out[k] = (out[k] || 0) + amt;
  });
  return out;
}

/** Fill every month in [from..to]; un-billed months use trailing 3-month average.
 *  Auto-corrects when the real bill is entered. {map, estimated}. */
function _dplResolveFixedMonthly(from, to) {
  var raw = _dplLoadFixedMonthly();
  var resolved = {}, estimated = {};
  var known = Object.keys(raw).filter(function(m){ return raw[m] > 0; }).sort();
  var cur = _dplAnchor(from.getFullYear(), from.getMonth(), 1);
  var end = _dplAnchor(to.getFullYear(), to.getMonth(), 1);
  while (cur <= end) {
    var k = Utilities.formatDate(cur, DPL.VN_TZ, 'yyyy-MM');
    if (raw[k] > 0) { resolved[k] = raw[k]; }
    else {
      var prior = known.filter(function(m){ return m < k; }).slice(-3);
      if (prior.length) { resolved[k] = prior.reduce(function(s,m){ return s + raw[m]; }, 0) / prior.length; estimated[k] = true; }
      else { resolved[k] = 0; }
    }
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return { map: resolved, estimated: estimated };
}

function _dplLoadFixedSplitMonthly() {
  var out = {};   // {yyyy-MM: {shopify, sapps, klav}}
  var ws = _getSSActive().getSheetByName(DPL.COST);
  if (!ws || ws.getLastRow() < 2) return out;
  var data = ws.getRange(1, 1, ws.getLastRow(), 4).getValues();   // A=Month, C=Vendor, D=Amount
  data.forEach(function(r) {
    var d = r[0], vendor = String(r[2] || '').toLowerCase(), amt = parseFloat(r[3]);
    if (!(d instanceof Date) || isNaN(d.getTime()) || !(amt > 0)) return;
    var k = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM');
    var o = out[k] || (out[k] = { shopify: 0, sapps: 0, klav: 0 });
    if (vendor.indexOf('shopify plan') >= 0) o.shopify += amt;
    else if (vendor.indexOf('shopify apps') >= 0) o.sapps += amt;
    else o.klav += amt;   // Klaviyo + Vercel/other
  });
  return out;
}

/** Split fixed cost over [from..to]; un-billed months use trailing 3-mo average per component. */
function _dplResolveFixedSplit(from, to) {
  var raw = _dplLoadFixedSplitMonthly();
  var resolved = {}, estimated = {};
  var known = Object.keys(raw).sort();
  var cur = _dplAnchor(from.getFullYear(), from.getMonth(), 1);
  var end = _dplAnchor(to.getFullYear(), to.getMonth(), 1);
  while (cur <= end) {
    var k = Utilities.formatDate(cur, DPL.VN_TZ, 'yyyy-MM');
    if (raw[k]) { resolved[k] = { shopify: raw[k].shopify, sapps: raw[k].sapps, klav: raw[k].klav }; }
    else {
      var prior = known.filter(function(m){ return m < k; }).slice(-3);
      if (prior.length) {
        var sS = 0, sA = 0, sK = 0;
        prior.forEach(function(m){ sS += raw[m].shopify; sA += raw[m].sapps; sK += raw[m].klav; });
        resolved[k] = { shopify: sS / prior.length, sapps: sA / prior.length, klav: sK / prior.length }; estimated[k] = true;
      } else { resolved[k] = { shopify: 0, sapps: 0, klav: 0 }; }
    }
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return { map: resolved, estimated: estimated };
}

/** Presentation pass: wrap header (no truncation) + center all data. Called at end of grid builders. */
function _dplPrettyGrid(ws, headerRow, dataStartRow, nCols) {
  try {
    ws.getRange(headerRow, 1, 1, nCols).setWrap(true).setHorizontalAlignment('center').setVerticalAlignment('middle');
    ws.setRowHeight(headerRow, 42);
    var last = ws.getLastRow();
    if (last >= dataStartRow) ws.getRange(dataStartRow, 1, last - dataStartRow + 1, nCols).setHorizontalAlignment('center');
  } catch (e) {}
}

function _dplGetSetting(key, dflt) {
  try {
    if (!_DPL_SETTINGS_MEMO) {
      _DPL_SETTINGS_MEMO = {};
      var ws = _getSSActive().getSheetByName(DPL.SETTINGS);
      if (ws && ws.getLastRow() >= 1) {
        var data = ws.getRange(1, 1, ws.getLastRow(), 2).getValues();
        data.forEach(function(r) {
          var k = (r[0] || '').toString().trim();
          if (k && !(k in _DPL_SETTINGS_MEMO)) { var v = parseFloat(r[1]); _DPL_SETTINGS_MEMO[k] = isNaN(v) ? null : v; }
        });
      }
    }
    var val = _DPL_SETTINGS_MEMO[key];
    return (val === undefined || val === null) ? dflt : val;
  } catch(e) { return dflt; }
}

/** Per-order gateway fee rate by payment method (blended fallback for blanks). */
function _dplGatewayRate(gateway, blended) {
  var g = (gateway || '').toLowerCase();
  if (g.indexOf('airwallex') >= 0 && g.indexOf('paypal') >= 0) return blended; // mixed
  if (g.indexOf('paypal')    >= 0) return _dplGetSetting('PayPal fee rate', 0.034);
  if (g.indexOf('airwallex') >= 0) return _dplGetSetting('Airwallex fee rate', 0.029);
  return blended;
}

/** Per-order FIXED gateway fee (USD per transaction), on top of the % rate.
 * PayPal US ≈ $0.49/order; Airwallex ≈ $0.30/order. Editable in ⚙ Settings — tune to your real statements. */
function _dplGatewayFixed(gateway) {
  var g = (gateway || '').toLowerCase();
  if (g.indexOf('airwallex') >= 0 && g.indexOf('paypal') >= 0) return _dplGetSetting('Gateway blended fixed fee', 0.30);
  if (g.indexOf('paypal')    >= 0) return _dplGetSetting('PayPal fixed fee per order', 0.49);
  if (g.indexOf('airwallex') >= 0) return _dplGetSetting('Airwallex fixed fee per order', 0.30);
  return _dplGetSetting('Gateway blended fixed fee', 0.30);
}

/** Shopify per-order TRANSACTION fee rate. You pay this because checkout runs on
 * Airwallex/PayPal (NOT Shopify Payments). It is a VARIABLE cost and is REFUNDED
 * when the order is refunded — so it is applied to the charged base (net of refund).
 * Current plan = 1.0%. Editable in ⚙ Settings ('Shopify transaction fee rate'). */
function _dplShopifyFeeRate() {
  return _dplGetSetting('Shopify transaction fee rate', 0.01);
}

// ════════════════════════════════════════════════════════════════════════
//  2a — AD SPEND ROLLUP  (FB Ads Daily + Google Ads Daily → 📊 Ad Spend)
//  Runs at the start of every Daily P&L rebuild so the newest day is fed.
//  TZ-PROOF: day keys come from getDisplayValues() (the literal text shown in
//  the cell) — a script-vs-spreadsheet timezone mismatch can never shift a day.
//  Update-in-place: only days inside each source's own date span are touched
//  (missing days in that span are healed to 0), so backfilled history and
//  manual 'Other' (col D) outside the live windows are preserved.
// ════════════════════════════════════════════════════════════════════════

function _dplParseDisplayDate(s) {
  s = (s == null ? '' : s).toString().trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);   // m/d/yyyy fallback
  if (m) return m[3] + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2);
  return '';
}

/** FB spend (USD) per day from '📱 FB Ads Daily' (col A date text, col E Spend USD). */
function _dplSumFBSpend() {
  var out = {};
  var ws = _getSSActive().getSheetByName(DPL_FB_SHEET);
  if (!ws || ws.getLastRow() < 5) return out;
  var n = ws.getLastRow() - 4;
  var dts = ws.getRange(5, 1, n, 1).getDisplayValues();
  var spd = ws.getRange(5, 3, n, 1).getValues();   // v5 FB layout: Spend(USD) = col C
  for (var i = 0; i < n; i++) {
    var k = _dplParseDisplayDate(dts[i][0]);
    var v = parseFloat(spd[i][0]) || 0;
    if (k) out[k] = (out[k] || 0) + v;
  }
  return out;
}

/** Google spend (USD) per day from '🔍 Google Ads Daily' (col A date, col D Cost, col L Currency). */
function _dplSumGoogleSpend() {
  var out = {};
  var ws = _getSSActive().getSheetByName(DPL_GADS_SHEET);
  if (!ws || ws.getLastRow() < 5) return out;
  var rate = _dplGetSetting('USD to VND rate', 26000) || 26000;
  var n = ws.getLastRow() - 4;
  var dts = ws.getRange(5, 1, n, 1).getDisplayValues();
  var val = ws.getRange(5, 1, n, 12).getValues();
  for (var i = 0; i < n; i++) {
    var k = _dplParseDisplayDate(dts[i][0]);
    if (!k) continue;
    var cost = parseFloat(val[i][3]) || 0;
    if (!cost) continue;
    var cur = (val[i][11] || '').toString().toUpperCase();
    out[k] = (out[k] || 0) + ((cur === 'VND') ? cost / rate : cost);
  }
  return out;
}

/** Update '📊 Ad Spend' B (FB) + C (Google) + E (Total) from the two daily sheets. */
function dplRollupAdSpend() {
  if (_DPL_ROLLUP_DONE) return;   // once per execution — Daily/Monthly/Channel all call this
  _DPL_ROLLUP_DONE = true;
  var ss = _getSSActive();
  var ws = ss.getSheetByName(DPL.ADSPEND) || _dplEnsureAdSpend();

  // ── Self-healing header (older Ad Spend sheets were created without one). ──
  // Runs only when the header is missing, so it never re-merges (merge-crash) on rebuild.
  if (ws.getRange(2,1).getValue() !== 'Date') {
    try { ws.getRange(1,1,1,6).breakApart(); } catch(e){}
    ws.getRange(1,1,1,6).merge()
      .setValue('📊  Ad Spend (daily)  ·  B = Facebook · C = Google · D = Other · E = Total (Daily/Monthly P&L read col E)')
      .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(12).setFontWeight('bold').setHorizontalAlignment('center');
    ws.setRowHeight(1, 30);
    ws.getRange(2,1,1,6).setValues([['Date','FB Spend ($)','Google Spend ($)','Other ($)','Total ($)','Note']])
      .setFontWeight('bold').setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(DPL.TNR).setFontSize(10).setHorizontalAlignment('center');
    try { ws.setFrozenRows(2); } catch(e){}
  }

  var fb = _dplSumFBSpend();
  var ga = _dplSumGoogleSpend();

  function span(o){ var ks = Object.keys(o); if (!ks.length) return null; ks.sort(); return { lo: ks[0], hi: ks[ks.length - 1] }; }
  var fbSpan = span(fb), gaSpan = span(ga);
  function inFbSpan(k){ return fbSpan && k >= fbSpan.lo && k <= fbSpan.hi; }
  function inGaSpan(k){ return gaSpan && k >= gaSpan.lo && k <= gaSpan.hi; }

  // ── BATCH READ the whole block once (TZ-proof keys from display values). ──
  // Per-cell getValue/setValue in a loop blows past the 6-min limit once the
  // sheet holds hundreds of backfilled days, so read/mutate/write in bulk.
  var lastRow = ws.getLastRow();
  var n = lastRow >= 3 ? lastRow - 2 : 0;
  var disp  = n ? ws.getRange(3, 1, n, 1).getDisplayValues() : [];
  var block = n ? ws.getRange(3, 1, n, 6).getValues()        : [];   // cols A..F
  var idx = {};                                                       // dayKey -> 0-based index within block
  for (var i = 0; i < n; i++) {
    var dv = block[i][0], k0;                                          // prefer raw Date (locale/TZ-proof)
    if (dv instanceof Date && !isNaN(dv.getTime())) k0 = Utilities.formatDate(dv, DPL.VN_TZ, 'yyyy-MM-dd');
    else k0 = _dplParseDisplayDate(disp[i][0]);                        // fallback: text date
    if (k0) idx[k0] = i;
  }

  // Mutate existing rows in memory; heal only days inside each source's span.
  Object.keys(idx).forEach(function(k) {
    if (!(inFbSpan(k) || inGaSpan(k))) return;
    var i     = idx[k];
    var other = parseFloat(block[i][3]) || 0;                                   // col D
    var newFb = inFbSpan(k) ? (fb[k] || 0) : (parseFloat(block[i][1]) || 0);    // col B
    var newGa = inGaSpan(k) ? (ga[k] || 0) : (parseFloat(block[i][2]) || 0);    // col C
    block[i][1] = newFb;
    block[i][2] = newGa;
    block[i][4] = newFb + newGa + other;                                        // col E
  });

  // New days present in either source but with no row yet -> append.
  var appends = [], newDays = {};
  Object.keys(fb).forEach(function(k){ newDays[k] = 1; });
  Object.keys(ga).forEach(function(k){ newDays[k] = 1; });
  Object.keys(newDays).forEach(function(k) {
    if (idx[k] != null) return;
    var f = fb[k] || 0, g = ga[k] || 0;
    appends.push([ new Date(k + 'T12:00:00Z'), f, g, 0, f + g, 'auto: FB+Google rollup' ]);
  });

  // One batched write-back of the existing block.
  if (n) ws.getRange(3, 1, n, 6).setValues(block);

  if (appends.length) {
    var at = Math.max(3, ws.getLastRow() + 1);
    ws.getRange(at, 1, appends.length, 6).setValues(appends);
    ws.getRange(at, 1, appends.length, 1).setNumberFormat('yyyy-mm-dd');
    ws.getRange(at, 2, appends.length, 4).setNumberFormat('"$"#,##0.00');
  }
  var lr = ws.getLastRow();
  if (lr >= 4) ws.getRange(3, 1, lr - 2, 6).sort([{ column: 1, ascending: false }]);
  Logger.log('[dplRollupAdSpend] FB days=' + Object.keys(fb).length +
             ' · GA days=' + Object.keys(ga).length + ' · appended=' + appends.length);
}

// ════════════════════════════════════════════════════════════════════════
//  2c — FB ADS HISTORICAL BACKFILL  →  📊 Ad Spend (col B FB)
//  FB Insights retains ~37 months, so 2025 is retrievable. Pulls daily spend
//  per account over a date range (month-by-month) and upserts FB spend into
//  📊 Ad Spend. Days OUTSIDE the live 14-day window are never touched by the
//  hourly rollup, so backfilled history is preserved. Reuses FB_Ads_Daily.gs
//  helpers (_fbaAccountIds / _fbaApiCall / _fbaToUSD / _fbaVndRate).
//  Keep the range OLDER than ~15 days so it doesn't fight the daily sync.
// ════════════════════════════════════════════════════════════════════════

function _dplMonthRanges(fromStr, toStr) {
  var f = _dplParseDisplayDate(fromStr), t = _dplParseDisplayDate(toStr);
  if (!f || !t || f > t) throw new Error('Bad date range: ' + fromStr + ' → ' + toStr);
  var out = [];
  var y = parseInt(f.substring(0,4),10), m = parseInt(f.substring(5,7),10);
  var ey = parseInt(t.substring(0,4),10), em = parseInt(t.substring(5,7),10);
  while (y < ey || (y === ey && m <= em)) {
    var mStr = ('0'+m).slice(-2);
    var since = y + '-' + mStr + '-01';
    var lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    var until = y + '-' + mStr + '-' + ('0'+lastDay).slice(-2);
    if (since < f) since = f;
    if (until > t) until = t;
    out.push({ since: since, until: until });
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
}

/** Upsert FB spend (col B) for the given {yyyy-MM-dd: usd} map; preserves Google(C)+Other(D). */
function _dplUpsertAdSpendFB(ws, byDay) {
  var days = Object.keys(byDay);
  if (!days.length) return;
  var idx = {}, lastRow = ws.getLastRow();
  if (lastRow >= 3) {
    var disp = ws.getRange(3,1,lastRow-2,1).getDisplayValues();
    for (var i=0;i<disp.length;i++){ var k=_dplParseDisplayDate(disp[i][0]); if(k) idx[k]=3+i; }
  }
  var appends = [];
  days.forEach(function(k){
    var fb = byDay[k] || 0, rowAt = idx[k];
    if (rowAt) {
      var g = parseFloat(ws.getRange(rowAt,3).getValue())||0;
      var o = parseFloat(ws.getRange(rowAt,4).getValue())||0;
      ws.getRange(rowAt,2).setValue(fb);
      ws.getRange(rowAt,5).setValue(fb+g+o);
    } else {
      appends.push([ new Date(k+'T12:00:00Z'), fb, 0, 0, fb, 'backfill: FB history' ]);
    }
  });
  if (appends.length){
    var at = Math.max(3, ws.getLastRow()+1);
    ws.getRange(at,1,appends.length,6).setValues(appends);
    ws.getRange(at,1,appends.length,1).setNumberFormat('yyyy-mm-dd');
    ws.getRange(at,2,appends.length,4).setNumberFormat('"$"#,##0.00');
  }
  var lr = ws.getLastRow();
  if (lr >= 4) ws.getRange(3,1,lr-2,6).sort([{column:1, ascending:false}]);
}

function dplBackfillFBHistory(fromStr, toStr) {
  if (typeof _fbaAccountIds !== 'function') throw new Error('FB_Ads_Daily.gs not found in this project.');
  var ss = _getSSActive();
  var ws = ss.getSheetByName(DPL.ADSPEND) || _dplEnsureAdSpend();
  var ids = _fbaAccountIds();
  if (!ids.length) throw new Error('No FB ad accounts configured — run 📱 FB Ads → Setup.');
  var vndRate = _fbaVndRate();

  // currency per account (cached once)
  var cur = {};
  ids.forEach(function(a){ try { cur[a] = (_fbaApiCall('/act_'+a, {fields:'currency'}).currency)||'USD'; } catch(e){ cur[a]='USD'; } });

  var months = _dplMonthRanges(fromStr, toStr);
  var byDay = {}, t0 = Date.now(), GUARD = 4.5*60*1000, doneThrough = null, aborted = false;
  // v27.8: campaign-level + GerberaPrints marker filter (same as live sync FB v4),
  // so historical backfill excludes other sites/pixels on shared accounts.
  var markers = (typeof _fbaCampaignMarkers === 'function') ? _fbaCampaignMarkers() : [];
  var isGP    = (typeof _fbaIsGP === 'function') ? _fbaIsGP : function(){ return true; };
  var kept = 0, dropped = 0;

  for (var mi=0; mi<months.length; mi++){
    if (Date.now()-t0 > GUARD) { aborted = true; break; }
    var mr = months[mi];
    ids.forEach(function(a){
      try {
        var params = {
          level: 'campaign',
          time_range: JSON.stringify({ since: mr.since, until: mr.until }),
          time_increment: 1,
          fields: 'date_start,campaign_name,spend',
          limit: 400
        };
        var items = (typeof _fbaInsightsAll === 'function')
          ? _fbaInsightsAll('/act_'+a+'/insights', params)
          : ((_fbaApiCall('/act_'+a+'/insights', params).data) || []);
        items.forEach(function(it){
          if (!isGP(it.campaign_name || '', markers)) { dropped++; return; }
          kept++;
          var day = (it.date_start||'').substring(0,10);
          var usd = _fbaToUSD(parseFloat(it.spend)||0, cur[a], vndRate);
          if (day && usd) byDay[day] = (byDay[day]||0) + usd;
        });
        Utilities.sleep(200);
      } catch(e){ Logger.log('[backfill] act_'+a+' '+mr.since+': '+e.message); }
    });
    doneThrough = mr.until;
  }

  _dplUpsertAdSpendFB(ws, byDay);

  var nDays = Object.keys(byDay).length;
  var total = Object.keys(byDay).reduce(function(s,k){ return s+byDay[k]; },0);
  var mk = markers.length ? markers.join(',') : 'OFF (all campaigns)';
  var msg = '✅ FB backfill (GP-only · markers: '+mk+'): '+nDays+' days · $'+Math.round(total).toLocaleString()+
            ' written to 📊 Ad Spend ('+fromStr+' → '+(aborted?doneThrough:toStr)+'). Campaigns kept '+kept+' / dropped '+dropped+'.';
  if (aborted) msg += '\n⚠ Stopped at time limit. Re-run with FROM = day after '+doneThrough+' to continue.';
  msg += '\nNow rebuild Daily P&L (YTD) to see the filled days.';
  try { SpreadsheetApp.getUi().alert(msg); } catch(e){ ss.toast(msg, '📊 Backfill', 12); }
  Logger.log(msg);
}

function menuFBBackfill() {
  var ui = SpreadsheetApp.getUi();
  var defTo = new Date(); defTo.setDate(defTo.getDate()-15);
  var defToStr = Utilities.formatDate(defTo, DPL.VN_TZ, 'yyyy-MM-dd');
  var r1 = ui.prompt('Backfill FB Ads — FROM date', 'yyyy-MM-dd (e.g. 2025-01-01):', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  var from = r1.getResponseText().trim();
  var r2 = ui.prompt('Backfill FB Ads — TO date', 'yyyy-MM-dd (default '+defToStr+' — ~15 days ago, to avoid the live window):', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  var to = r2.getResponseText().trim() || defToStr;
  dplBackfillFBHistory(from, to);
}

// ════════════════════════════════════════════════════════════════════════
//  #4 — MONTHLY P&L  (one row per month, 2025 + 2026; same sources as Daily)
// ════════════════════════════════════════════════════════════════════════

function dplRebuildMonthly() {
  var today = new Date(); today.setHours(0,0,0,0);
  // Store launched May 2025 — start here so pre-launch Google spend (Jan–Apr 2025,
  // $0 revenue) doesn't show as phantom losses. Change the month if launch shifts.
  buildMonthlyPL(new Date(2025, 4, 1), today);   // 2025-05-01 (month is 0-indexed: 4 = May)
}

// _awxOtherCostByMonth() moved to GP_Airwallex.gs (v27.63) — buildMonthlyPL() still calls it (same project).


function buildMonthlyPL(fromDate, toDate) {
  var ss = _getSSActive();
  var ws = ss.getSheetByName(DPL.PL_MONTHLY) || ss.insertSheet(DPL.PL_MONTHLY);
  var from = (fromDate instanceof Date) ? fromDate : new Date(2025, 0, 1);
  var to   = (toDate   instanceof Date) ? toDate   : new Date();
  // A project-tz (ICT) midnight is only ~10am Pacific, so an upper bound of "today 00:00" would
  // truncate the rest of today's Pacific orders out of the range. If 'to' is today-or-later, use NOW.
  var _todayMid = new Date(); _todayMid.setHours(0,0,0,0);
  if (to >= _todayMid) to = new Date();

  _dplResetSheet(ws);
  ss.toast('Building Monthly P&L…', '📆', 60);

  var blended  = _dplGetSetting('Gateway blended fee rate', 0.03);
  var cogsDflt = _dplGetSetting('COGS fallback default %', 0.34);
  try { dplRollupAdSpend(); } catch(e) {}

  var _ci     = _dplLoadCogsMap();
  var cogsMap = _ci.map;
  var skuCogs = _dplCogsBySKU(_ci.prefixCost);
  var adSpend = _dplLoadAdSpend();
  var fixedMo = _dplResolveFixedMonthly(from, to).map;
  var fixedSplit = _dplResolveFixedSplit(from, to).map;

  var wsB2C = ss.getSheetByName(DPL.B2C);
  if (!wsB2C) { ss.toast('❌ "Shopify B2C" missing', '📆', 6); return; }
  var _bw = Math.min(29, wsB2C.getMaxColumns());
  var b2c = wsB2C.getLastRow() >= 3 ? wsB2C.getRange(3, 1, wsB2C.getLastRow() - 2, _bw).getValues() : [];

  var t30 = new Date(); t30.setHours(0,0,0,0); t30.setDate(t30.getDate() - 30);
  var mNet = 0, mCogs = 0;
  b2c.forEach(function(r){
    var d = r[0]; if (!(d instanceof Date) || d < t30) return;
    var cc = cogsMap[_dplCleanGPN(r[1])] || 0, net = parseFloat(r[9]) || 0;   // r[9]=Net Sales (base)
    if (cc > 0 && net > 0) { mNet += net; mCogs += cc; }
  });
  var trailingPct = mNet > 0 ? (mCogs / mNet) : cogsDflt;

  var shopRate = _dplShopifyFeeRate();   // Shopify per-order txn fee (refundable)
  var actual = {};
  b2c.forEach(function(r){
    var d = r[0]; if (!(d instanceof Date) || isNaN(d.getTime()) || d < from || d > to) return;
    var totalRev = parseFloat(r[15]) || 0; if (totalRev <= 0) return;   // r[15]=Total Revenue
    var gpn = _dplCleanGPN(r[1]);
    var actCogs = cogsMap[gpn] || 0; var est = actCogs <= 0;
    var cogs = actCogs;
    if (est) { var sc = skuCogs[gpn] || 0; cogs = sc > 0 ? sc : (parseFloat(r[9])||0) * trailingPct; }
    // v28.7 An order can be PARTLY invoiced. MTP Cap bills the previous month, so a polo already
    // priced by CustomEase used to make the whole order look complete while the hat beside it was
    // still free. Cost only ever fell short, never over, so margin only ever looked better than it
    // was. Unbilled lines are topped up at that supplier's own historical unit cost for that exact
    // product type, and the order is marked estimated so the day still reads as provisional.
    var prov = (_ci.provisional && _ci.provisional[gpn]) || 0;
    // v28.8 ONLY top up an order that is PARTLY invoiced. When nothing on the order has been billed,
    // the estimate above already priced every line from SKU Raw Data, including the unbilled ones,
    // so adding the provisional figure on top would charge those lines twice. v28.7 did exactly that
    // for orders with no invoice at all. actCogs > 0 is the whole test: some lines paid, some not.
    if (prov > 0 && actCogs > 0) { cogs += prov; est = true; }
    var refund = parseFloat(r[21]) || 0;                       // r[21]=Refund
    var chargedBase = totalRev - refund; if (chargedBase < 0) chargedBase = 0;
    var gw = chargedBase > 0 ? (chargedBase * _dplGatewayRate(r[16], blended) + _dplGatewayFixed(r[16])) : 0;  // refund-aware
    var _isAwx = String(r[16] || '').toLowerCase().indexOf('airwallex') >= 0;   // v27.56: split for real-fee override
    var shop = chargedBase * shopRate;                         // Shopify 1% (refundable)
    var mk = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM');
    if (!actual[mk]) actual[mk] = { orders:0, gross:0, disc:0, net:0, product:0, ship:0, tips:0, ins:0, totalRev:0, refund:0, cogs:0, gw:0, gwAwx:0, gwOther:0, shop:0, est:0, cancCnt:0, cancGross:0, cancRefund:0 };
    var a = actual[mk];
    if (String(r[28] || '').trim() === 'CANCELLED') { a.cancCnt++; a.cancGross += totalRev; a.cancRefund += refund; return; }   // exclude cancelled from revenue; record stats
    a.orders += 1; a.gross += parseFloat(r[7])||0; a.disc += parseFloat(r[8])||0; a.net += parseFloat(r[9])||0;
    a.product += parseFloat(r[10])||0; a.ship += parseFloat(r[11])||0; a.tips += parseFloat(r[12])||0;
    a.ins += parseFloat(r[13])||0; a.totalRev += totalRev; a.refund += refund; a.cogs += cogs; a.gw += gw; a.shop += shop;
    if (_isAwx) a.gwAwx += gw; else a.gwOther += gw;
    if (est && (parseFloat(r[17])||0) > 0 && String(r[19]||'').toLowerCase() === 'fulfilled' && refund < ((parseFloat(r[9])||totalRev) * 0.85)) a.est += 1;   // ⏳ only for orders that truly expect actual COGS
  });

  // v27.56: override estimated Gateway with REAL Airwallex fee/month (summed from '💳 Airwallex Daily'); PayPal/other stays estimated. Fallback-safe.
  try { var _awxRealM = _awxGwByMonth(); Object.keys(actual).forEach(function(mk){ if (_awxRealM[mk] != null) { actual[mk].gw = _awxRealM[mk] + actual[mk].gwOther; actual[mk].gwAwxReal = _awxRealM[mk]; } }); } catch (e) {}

  // Ad spend per month — total (authoritative for deduction) + FB/Google split (display)
  var adMonthT = {}, adMonthFb = {}, adMonthGa = {};
  Object.keys(adSpend).forEach(function(k){ var m=k.substring(0,7); adMonthT[m]=(adMonthT[m]||0)+adSpend[k]; });
  var _adSplit = _dplLoadAdSpendSplit();
  Object.keys(_adSplit).forEach(function(k){ var m=k.substring(0,7); adMonthFb[m]=(adMonthFb[m]||0)+_adSplit[k].fb; adMonthGa[m]=(adMonthGa[m]||0)+_adSplit[k].ga; });

  var months = [];
  var cur = _dplAnchor(from.getFullYear(), from.getMonth(), 1);
  var endM = _dplAnchor(to.getFullYear(), to.getMonth(), 1);
  while (cur <= endM) { months.push(Utilities.formatDate(cur, DPL.VN_TZ, 'yyyy-MM')); cur.setUTCMonth(cur.getUTCMonth() + 1); }

  var NCOLS = 26, USD = '"$"#,##0.00', PCT = '0.0%', NUM = '#,##0';
  var stamp = Utilities.formatDate(new Date(), DPL.VN_TZ, 'dd/MM/yyyy HH:mm');
  ws.getRange(1,1,1,NCOLS).merge()
    .setValue('📆  GerberaPrints — Monthly P&L  (OPERATING MARGIN · after all operating costs)')
    .setBackground('#0F172A').setFontColor('#C9A84C')
    .setFontFamily(DPL.TNR).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1,34);
  ws.getRange(2,1,1,NCOLS).merge()
    .setValue('Updated: ' + stamp + ' PT  ·  ' + months.length + ' months  ·  COGS fallback ' +
              (trailingPct*100).toFixed(1) + '% of Net  ·  Processing = AWX real + PP est  ·  Operating Margin = (Total Rev − Refund) − COGS − Processing − Shopify Txn − Ads − Shopify Plan − Apps&Tools − AWX  ·  Shopify(' +
              (_dplShopifyFeeRate()*100).toFixed(1) + '%) txn  ·  ALL operating costs deducted (excl. labor/overhead)  ·  Shopify Plan+Apps auto-synced from Shopify billing (txn kept separate)  ·  fees refunded on refunds  ·  ⏳ = fulfilled orders awaiting actual COGS, or ad spend incomplete  ·  ✅ = actuals in')
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(DPL.TNR).setFontSize(9).setFontStyle('italic');
  ws.setRowHeight(2,20); ws.setRowHeight(3,6);

  var headers = ['Month','Orders','Gross ($)','Discount ($)','Cancelled #','Cancelled ($)','Cancel Refund ($)','Rev Received ($)','Net Sales ($)','Product ($)','Shipping ($)','Tips ($)',
                 'Insurance ($)','COGS ($)','Processing AWX ($)','Processing PP ($)','Shopify Txn ($)','FB Ad ($)','Google Ad ($)','Shopify Plan ($)','Shopify Apps ($)','Klaviyo ($)','Acct & Dispute AWX ($)',
                 'Operating Margin ($)','Op %','Status'];
  ws.getRange(4,1,1,NCOLS).setValues([headers])
    .setBackground('#1E293B').setFontColor('#E2E8F0').setFontFamily(DPL.TNR).setFontSize(11)
    .setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(4,26);

  var awxOtherMo = {}; try { awxOtherMo = _awxOtherCostByMonth(); } catch (e) {}   // v27.57: Airwallex account fees + chargeback losses
  var out = [], tot = { orders:0, gross:0, disc:0, net:0, product:0, ship:0, tips:0, ins:0, cogs:0, gwAwx:0, gwPp:0, shop:0, fb:0, ga:0, shopify:0, sapps:0, klav:0, awx:0, np:0, totalRev:0, refund:0, cancCnt:0, cancGross:0, cancRefund:0 };
  months.forEach(function(mk){
    var a = actual[mk] || { orders:0, gross:0, disc:0, net:0, product:0, ship:0, tips:0, ins:0, totalRev:0, refund:0, cogs:0, gw:0, shop:0, est:0, cancCnt:0, cancGross:0, cancRefund:0 };
    var fb = adMonthFb[mk] || 0, ga = adMonthGa[mk] || 0, adT = adMonthT[mk] || 0;
    var adUsed = (fb + ga) > 0 ? (fb + ga) : adT;
    var fxm = fixedSplit[mk] || { shopify: 0, sapps: 0, klav: 0 }, awxFee = (awxOtherMo[mk] || 0);   // Shopify Plan / Shopify Apps / Klaviyo split + AWX as SEPARATE columns
    var gwAwxP = (a.gwAwxReal != null) ? a.gwAwxReal : (a.gwAwx || 0), gwPpP = (a.gwOther || 0);   // v27.64: gateway split AWX(real)/PP(est)
    var net = a.totalRev - a.refund - a.cogs - a.gw - a.shop - adUsed - fxm.shopify - fxm.sapps - fxm.klav - awxFee;   // Operating Margin (after Shopify Plan + Shopify Apps + Klaviyo + AWX; before labor/overhead)
    var margin = (a.totalRev - a.refund) > 0 ? net / (a.totalRev - a.refund) : 0;
    var label = Utilities.formatDate(_dplAnchor(parseInt(mk.substring(0,4),10), parseInt(mk.substring(5,7),10)-1, 1), DPL.VN_TZ, 'MMM yyyy');
    var pending = (a.est > 0) || (a.totalRev > 0 && adUsed <= 0);
    out.push([label, a.orders, a.gross, a.disc, (a.cancCnt||0), (a.cancGross||0), (a.cancRefund||0), (a.totalRev - a.refund), a.net, a.product, a.ship, a.tips, a.ins, a.cogs, gwAwxP, gwPpP, a.shop, fb, ga, fxm.shopify, fxm.sapps, fxm.klav, awxFee, net, margin, pending ? '⏳' : '✅']);
    tot.orders+=a.orders; tot.gross+=a.gross; tot.disc+=a.disc; tot.cancCnt+=(a.cancCnt||0); tot.cancGross+=(a.cancGross||0); tot.cancRefund+=(a.cancRefund||0); tot.net+=a.net; tot.product+=a.product;
    tot.ship+=a.ship; tot.tips+=a.tips; tot.ins+=a.ins; tot.cogs+=a.cogs; tot.gwAwx+=gwAwxP; tot.gwPp+=gwPpP; tot.shop+=a.shop; tot.fb+=fb; tot.ga+=ga; tot.shopify+=fxm.shopify; tot.sapps+=fxm.sapps; tot.klav+=fxm.klav; tot.awx+=awxFee; tot.np+=net; tot.totalRev+=a.totalRev; tot.refund+=a.refund;
  });

  out.reverse();   // newest month on top

  var startRow = 5;
  if (out.length) {
    ws.getRange(startRow,1,out.length,NCOLS).setValues(out).setFontFamily(DPL.TNR).setFontSize(11);
    ws.getRange(startRow,2,out.length,1).setNumberFormat(NUM);
    ws.getRange(startRow,3,out.length,22).setNumberFormat(USD);   // Gross..Operating Margin
    ws.getRange(startRow,5,out.length,1).setNumberFormat(NUM);   // Cancelled #
    ws.getRange(startRow,25,out.length,1).setNumberFormat(PCT);
    ws.getRange(startRow,26,out.length,1).setHorizontalAlignment('center');
    var opBg = [], opFc = [];
    for (var i = 0; i < out.length; i++) {
      var nc = ws.getRange(startRow + i, 24).setFontWeight('bold');
      if (out[i][23] < 0) nc.setFontColor('#DC2626');                 // Operating Margin ($) loss = red
      var _lo = _kpiLikert5(out[i][24], [0.10, 0.15, 0.20, 0.25]);    // Op % (col 25) -> canonical Likert
      opBg.push([_lo.bg]); opFc.push([_lo.fg]);
    }
    ws.getRange(startRow, 25, out.length, 1).setBackgrounds(opBg).setFontColors(opFc).setFontWeight('bold').setHorizontalAlignment('center');
  }

  var tr = startRow + out.length;
  var tMargin = (tot.totalRev - tot.refund) > 0 ? tot.np / (tot.totalRev - tot.refund) : 0;
  ws.getRange(tr,1,1,NCOLS).setValues([['TOTAL', tot.orders, tot.gross, tot.disc, tot.cancCnt, tot.cancGross, tot.cancRefund, (tot.totalRev - tot.refund), tot.net, tot.product, tot.ship, tot.tips, tot.ins, tot.cogs, tot.gwAwx, tot.gwPp, tot.shop, tot.fb, tot.ga, tot.shopify, tot.sapps, tot.klav, tot.awx, tot.np, tMargin, '']])
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(11).setFontWeight('bold');
  ws.getRange(tr,2).setNumberFormat(NUM);
  ws.getRange(tr,3,1,22).setNumberFormat(USD);
  ws.getRange(tr,5).setNumberFormat(NUM);
  ws.getRange(tr,25).setNumberFormat(PCT);

  ws.setFrozenRows(4);
  // setColumnWidth (NOT autoResizeColumn — that throws on the row 1/2 full-width merges).
  [96,64,100,90,64,90,96,100,100,100,84,72,80,100,92,92,92,92,92,92,92,92,92,108,84,60].forEach(function(w,i){ ws.setColumnWidth(i+1, w); });
  _dplPrettyGrid(ws, 4, 5, NCOLS);
  ss.toast('✅ Monthly P&L: ' + out.length + ' months built.', '📆', 6);
}

// ════════════════════════════════════════════════════════════════════════
//  #4b — CHANNEL TRENDS  (FB vs Google per month · spend %MoM · ROAS · MER)
//  Spend = '📊 Ad Spend' (reconciled). Store Rev = 'Shopify B2C' (VN day).
//  Blended MER = store rev ÷ total ad spend (TRUE). Per-channel ROAS = platform-
//  attributed (rank only). FB ROAS blank where 'FB Ads Daily' lacks revenue rows.
// ════════════════════════════════════════════════════════════════════════

/** Per-month {fb,ga} spend (USD) from '📊 Ad Spend' (cols B/C), TZ-proof by display date. */
function _ctAdSpendByMonth() {
  var out = {}, ws = _getSSActive().getSheetByName(DPL.ADSPEND);
  if (!ws || ws.getLastRow() < 3) return out;
  var n = ws.getLastRow() - 2;
  var dts = ws.getRange(3, 1, n, 1).getDisplayValues();
  var val = ws.getRange(3, 2, n, 2).getValues();          // B=FB, C=Google
  for (var i = 0; i < n; i++) {
    var k = _dplParseDisplayDate(dts[i][0]); if (!k) continue;
    var m = k.substring(0, 7);
    if (!out[m]) out[m] = { fb: 0, ga: 0 };
    out[m].fb += parseFloat(val[i][0]) || 0;
    out[m].ga += parseFloat(val[i][1]) || 0;
  }
  return out;
}

/** Per-month store revenue from 'Shopify B2C' (col A date, Total Revenue r[15]), VN-bucketed. */
function _ctStoreRevByMonth(from, to) {
  var out = {}, ws = _getSSActive().getSheetByName(DPL.B2C);
  if (!ws || ws.getLastRow() < 3) return out;
  var _bw = Math.min(27, ws.getMaxColumns());
  var b2c = ws.getRange(3, 1, ws.getLastRow() - 2, _bw).getValues();
  b2c.forEach(function(r){
    var d = r[0]; if (!(d instanceof Date) || isNaN(d.getTime()) || d < from || d > to) return;
    var rev = parseFloat(r[15]) || 0; if (rev <= 0) return;   // r[15]=Total Revenue
    var m = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM');
    out[m] = (out[m] || 0) + rev;
  });
  return out;
}

function dplRebuildChannelTrends() { buildChannelTrends(); }

function dplRebuildChannelDaily() { buildChannelDaily(); }

// ═══ #4c — CHANNEL DAILY (per-channel rev/spend/ROAS per DAY) — daily layer
//  between monthly Channel Trends and the campaign/account drill-downs. Same UTM
//  last-session lens as Channel Trends → reconciles to Store Rev. ═══
function buildChannelDaily(days) {
  days = days || 0;   // 0 = full history since launch (mirrors Channel Trends)
  var ss = _getSSActive();
  var ws = ss.getSheetByName('📈 Channel Daily') || ss.insertSheet('📈 Channel Daily');
  _dplResetSheet(ws);
  ss.toast('Building Channel Daily…', '📈', 30);
  try { dplRollupAdSpend(); } catch (e) {}

  var cutoffStr;
  if (days) { var cutoff = new Date(); cutoff.setHours(0,0,0,0); cutoff.setDate(cutoff.getDate() - (days - 1)); cutoffStr = Utilities.formatDate(cutoff, DPL.VN_TZ, 'yyyy-MM-dd'); }
  else { cutoffStr = '2025-05-01'; }   // launch

  var chRev   = _cdChannelRevByDay(cutoffStr);
  var adSplit = _dplLoadAdSpendSplit();   // {ymd:{fb,ga}} from 📊 Ad Spend — SAME source as Daily P&L (ties out + full history)

  var dset = {};
  Object.keys(chRev).forEach(function (k) { dset[k] = 1; });
  Object.keys(adSplit).forEach(function (k) { if (k >= cutoffStr) dset[k] = 1; });
  var ds = Object.keys(dset).sort();

  var NCOLS = 16, USD = '"$"#,##0', RX = '0.00"x"';
  var stamp = Utilities.formatDate(new Date(), DPL.VN_TZ, 'dd/MM/yyyy HH:mm');
  ws.getRange(1,1,1,NCOLS).merge()
    .setValue('📈  GerberaPrints — Channel Daily  (per-channel rev / spend / ROAS · ' + (days ? 'last ' + days + ' days' : 'since launch') + ')')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1,34);
  ws.getRange(2,1,1,NCOLS).merge()
    .setValue('Updated: ' + stamp + ' ICT  ·  Daily version of 📈 Channel Trends. Rev by channel = orders whose LAST-SESSION source was that channel (UTM truth · sums to Store Rev). FB/Google Spend = 📊 Ad Spend (SAME source as Daily P&L — ties out + full history). Per-channel ROAS = UTM rev ÷ spend (UTM floor; platform-attributed ROAS lives in 📱 FB Ads Daily / 🎯 Campaign Daily). Blended MER = store rev ÷ total ad. Last 1-2 days settle over ~72h.')
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(DPL.TNR).setFontSize(9).setFontStyle('italic').setWrap(true);
  ws.setRowHeight(2,52); ws.setRowHeight(3,6);

  var headers = ['Date','Store Rev ($)','Total Ad ($)','Blended MER',
                 'FB Rev ($)','FB Spend ($)','FB ROAS',
                 'Google Rev ($)','Google Spend ($)','Google ROAS',
                 'Email Rev ($)','Email % Store',
                 'Organic/Direct ($)','Pinterest Rev ($)','TikTok Rev ($)','Other Rev ($)'];
  ws.getRange(4,1,1,NCOLS).setValues([headers])
    .setBackground('#1E293B').setFontColor('#E2E8F0').setFontFamily(DPL.TNR).setFontSize(11).setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  ws.setRowHeight(4,30);

  var out = [];
  ds.forEach(function (k) {
    var c = chRev[k] || {};
    var sr = c._store || 0;
    var a = adSplit[k] || { fb: 0, ga: 0 }; var fbSpend = a.fb || 0, gaSpend = a.ga || 0;
    var tot = fbSpend + gaSpend;
    var fbR = c['Facebook'] || 0, gaR = c['Google'] || 0, emR = c['Email'] || 0;
    var orgR = (c['Organic'] || 0) + (c['Direct/Unknown'] || 0);
    var pinR = c['Pinterest'] || 0, tikR = c['TikTok'] || 0, othR = c['Other'] || 0;
    var mer = tot > 0 ? sr / tot : 0;
    var fbRoas = fbSpend > 0 ? fbR / fbSpend : 0;
    var gaRoas = gaSpend > 0 ? gaR / gaSpend : 0;
    var emShare = sr > 0 ? emR / sr : 0;
    out.push([new Date(k + 'T12:00:00Z'), sr, tot, mer, fbR, fbSpend, fbRoas, gaR, gaSpend, gaRoas, emR, emShare, orgR, pinR, tikR, othR]);
  });
  out.reverse();

  // ── lifetime TOTAL (sums; MER/ROAS/share recomputed from sums, not averaged) ──
  var T = { sr:0, ad:0, fbR:0, fbS:0, gaR:0, gaS:0, emR:0, org:0, pin:0, tik:0, oth:0 };
  out.forEach(function (r) {
    T.sr += r[1]; T.ad += r[2]; T.fbR += r[4]; T.fbS += r[5];
    T.gaR += r[7]; T.gaS += r[8]; T.emR += r[10];
    T.org += r[12]; T.pin += r[13]; T.tik += r[14]; T.oth += r[15];
  });
  var totRow = ['TOTAL since launch', T.sr, T.ad, (T.ad>0?T.sr/T.ad:0),
                T.fbR, T.fbS, (T.fbS>0?T.fbR/T.fbS:0),
                T.gaR, T.gaS, (T.gaS>0?T.gaR/T.gaS:0),
                T.emR, (T.sr>0?T.emR/T.sr:0), T.org, T.pin, T.tik, T.oth];
  ws.getRange(5,1,1,NCOLS).setValues([totRow])
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(11).setFontWeight('bold');
  ws.getRange(5,2,1,2).setNumberFormat(USD);
  ws.getRange(5,4,1,1).setNumberFormat(RX);
  ws.getRange(5,5,1,2).setNumberFormat(USD);
  ws.getRange(5,7,1,1).setNumberFormat(RX);
  ws.getRange(5,8,1,2).setNumberFormat(USD);
  ws.getRange(5,10,1,1).setNumberFormat(RX);
  ws.getRange(5,11,1,1).setNumberFormat(USD);
  ws.getRange(5,12,1,1).setNumberFormat('0.0%');
  ws.getRange(5,13,1,4).setNumberFormat(USD);
  ws.getRange(5,1,1,1).setHorizontalAlignment('left');
  ws.setRowHeight(5,24);

  var sr0 = 6;
  if (out.length) {
    ws.getRange(sr0,1,out.length,NCOLS).setValues(out).setFontFamily(DPL.TNR).setFontSize(11);
    ws.getRange(sr0,1,out.length,1).setNumberFormat('yyyy-mm-dd').setHorizontalAlignment('center');
    ws.getRange(sr0,2,out.length,2).setNumberFormat(USD);
    ws.getRange(sr0,4,out.length,1).setNumberFormat(RX);
    ws.getRange(sr0,5,out.length,2).setNumberFormat(USD);
    ws.getRange(sr0,7,out.length,1).setNumberFormat(RX);
    ws.getRange(sr0,8,out.length,2).setNumberFormat(USD);
    ws.getRange(sr0,10,out.length,1).setNumberFormat(RX);
    ws.getRange(sr0,11,out.length,1).setNumberFormat(USD);
    ws.getRange(sr0,12,out.length,1).setNumberFormat('0.0%');
    ws.getRange(sr0,13,out.length,4).setNumberFormat(USD);
    var bg = [], fc = [];
    for (var i = 0; i < out.length; i++) {
      var rowbg = [], rowfc = []; for (var j = 0; j < NCOLS; j++) { rowbg.push('#FFFFFF'); rowfc.push('#000000'); }
      var _lm = _kpiLikert5(out[i][3], [2.5, 3, 3.5, 4]); rowbg[3] = _lm.bg; rowfc[3] = _lm.fg;   // Blended MER
      var _lf = _kpiLikert5(out[i][6], [2, 2.5, 3, 3.5]);       rowbg[6] = _lf.bg; rowfc[6] = _lf.fg;   // FB ROAS
      var _lg = _kpiLikert5(out[i][9], [2, 2.5, 3, 3.5]);       rowbg[9] = _lg.bg; rowfc[9] = _lg.fg;   // Google ROAS
      bg.push(rowbg); fc.push(rowfc);
    }
    ws.getRange(sr0,1,out.length,NCOLS).setBackgrounds(bg).setFontColors(fc);
    [4,7,10].forEach(function (cc) {
      ws.getRange(sr0,cc,out.length,1).setFontWeight('bold').setHorizontalAlignment('center');
    });
  }

  ws.setFrozenRows(5);
  ws.setColumnWidth(1, 90);
  [96,84,80, 96,84,72, 96,84,76, 96,76, 100,92,86,86].forEach(function (w, i) { ws.setColumnWidth(i + 2, w); });
  _dplPrettyGrid(ws, 4, 5, NCOLS);
  ss.toast('✅ Channel Daily: ' + out.length + ' days · per-channel ROAS + Email', '📈', 6);
}

function cdDiagAdSpend() {
  // Read-only. Compares FB/Google spend per day across the 3 sources so the
  // live-vs-frozen gap is visible. View \u2192 Executions \u2192 Logs.
  var fb = _dplSumFBSpend();          // LIVE 📱 FB Ads Daily (col C, rolling ~26d)
  var ga = _dplSumGoogleSpend();      // LIVE 🔍 Google Ads Daily (col D \u2192 USD)
  var sp = _dplLoadAdSpendSplit();    // FROZEN 📊 Ad Spend (col B/C) = what Daily P&L reads
  var t = new Date(); t.setHours(0,0,0,0);
  var L = ['DATE         |  LIVE FB  |  LIVE GA  ||  AdSpend FB | AdSpend GA   (USD \u00b7 frozen = P&L)'];
  for (var i = 0; i < 10; i++) {
    var k = Utilities.formatDate(new Date(t.getTime() - i * 86400000), DPL.VN_TZ, 'yyyy-MM-dd');
    var s2 = sp[k] || { fb: 0, ga: 0 };
    function pad(x){ x = (x||0).toFixed(2); while (x.length < 9) x = ' ' + x; return x; }
    L.push(k + ' | ' + pad(fb[k]) + ' | ' + pad(ga[k]) + ' || ' + pad(s2.fb) + ' | ' + pad(s2.ga));
  }
  Logger.log(L.join('\n'));
  _getSSActive().toast('cdDiagAdSpend done \u2014 View \u2192 Executions \u2192 Logs', '🔎', 8);
}

/** ONE-TIME CLEANUP — collapse duplicate date rows in 📊 Ad Spend.
 *  Duplicates arose when an older rollup could not parse a row's display date
 *  (locale dd/mm/yyyy) and re-appended the same day. _dplLoadAdSpendSplit SUMS
 *  rows per day, so duplicates inflated FB/Google spend in Daily P&L + Channel
 *  Daily. Column-wise MAX merge per day = reconstruct the single intended row
 *  without double-counting. Drops junk rows whose col A is not a real Date.
 *  Safe to run repeatedly (idempotent once clean). */
function dplDedupeAdSpend() {
  var ss = _getSSActive();
  var ws = ss.getSheetByName(DPL.ADSPEND);
  if (!ws || ws.getLastRow() < 4) { ss.toast('Ad Spend: nothing to dedupe', '📊', 5); return; }
  var n = ws.getLastRow() - 2;
  var block = ws.getRange(3, 1, n, 6).getValues();
  var best = {}, junk = 0;
  block.forEach(function (r) {
    var d = r[0];
    if (!(d instanceof Date) || isNaN(d.getTime())) { junk++; return; }   // drop non-date junk rows
    var k  = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM-dd');
    var fb = parseFloat(r[1]) || 0, ga = parseFloat(r[2]) || 0, ot = parseFloat(r[3]) || 0;
    if (!best[k]) best[k] = { d: d, fb: fb, ga: ga, ot: ot, note: r[5] };
    else {                                                                // column-wise MAX = no double-count
      best[k].fb = Math.max(best[k].fb, fb);
      best[k].ga = Math.max(best[k].ga, ga);
      best[k].ot = Math.max(best[k].ot, ot);
    }
  });
  var keys = Object.keys(best).sort(function (a, b) { return a < b ? 1 : -1; });   // newest first
  var rows = keys.map(function (k) {
    var b = best[k];
    return [b.d, b.fb, b.ga, b.ot, b.fb + b.ga + b.ot, b.note || 'deduped'];
  });
  var removed = n - rows.length;
  ws.getRange(3, 1, n, 6).clearContent();
  if (rows.length) {
    ws.getRange(3, 1, rows.length, 6).setValues(rows);
    ws.getRange(3, 1, rows.length, 1).setNumberFormat('yyyy-mm-dd');
    ws.getRange(3, 2, rows.length, 4).setNumberFormat('"$"#,##0.00');
    ws.getRange(3, 1, rows.length, 6).setFontFamily(DPL.TNR).setFontSize(10);
  }
  _DPL_ADSPLIT_MEMO = null; _DPL_ADSPEND_MEMO = null;   // bust memo so next read is clean
  var msg = '\u2705 Ad Spend deduped: kept ' + rows.length + ' unique days \u00b7 removed ' +
            removed + ' dup/junk (junk=' + junk + ').';
  ss.toast(msg, '📊', 8); Logger.log(msg);
}

/** READ-ONLY DIAGNOSTIC — why the 🎯 Campaign Daily heatmap shows nothing.
 *  The heatmap is a LIVE MIRROR of two source tabs; if a block is blank the
 *  source tab is empty/stale or no campaign is picked. Logs row counts, date
 *  span, sample campaigns for BOTH sources + current C3/N3 picks.
 *  View → Executions → Logs. */
function dplDiagHeatmapSources() {
  var ss = _getSSActive();
  function probe(name, dateCol, campCol) {
    var ws = ss.getSheetByName(name);
    if (!ws) return name + ': \u274c TAB MISSING';
    var last = ws.getLastRow();
    if (last < 5) return name + ': \u26a0 only ' + last + ' rows (no data — sync has not run)';
    var n = last - 4;
    var dts = ws.getRange(5, dateCol, n, 1).getDisplayValues().map(function (r) { return r[0]; }).filter(String).sort();
    var camps = {};
    ws.getRange(5, campCol, n, 1).getValues().forEach(function (r) { var c = String(r[0] || '').trim(); if (c) camps[c] = 1; });
    var ck = Object.keys(camps);
    return name + ': \u2705 ' + n + ' rows \u00b7 ' + (dts.length ? dts[0] + ' \u2192 ' + dts[dts.length - 1] : 'no dates') +
           ' \u00b7 ' + ck.length + ' campaigns [' + ck.slice(0, 4).join(' | ') + (ck.length > 4 ? ' \u2026' : '') + ']';
  }
  var hm = ss.getSheetByName(DPL.HEATMAP);
  var c3 = hm ? hm.getRange('C3').getDisplayValue() : '(no heatmap tab)';
  var n3 = hm ? hm.getRange('N3').getDisplayValue() : '(no heatmap tab)';
  var L = ['=== 🎯 Campaign Daily — source diagnostic ===',
           probe(DPL_GADS_SHEET, 1, 2),         // 🔍 Google Ads Daily: date A, campaign B
           probe('📱 FB Campaign Daily', 1, 3),   // date A, campaign C
           'Heatmap picks \u2192 C3 (Google) = "' + c3 + '"   \u00b7   N3 (FB) = "' + n3 + '"',
           '\u2192 Blank block = source empty/stale (run its sync) OR pick is blank/stale (re-choose in C3/N3).'];
  Logger.log(L.join('\n'));
  ss.toast('Heatmap source diag done \u2014 View \u2192 Executions \u2192 Logs', '🎯', 8);
}

function _cdChannelRevByDay(cutoffStr) {
  var out = {}, ws = _getSSActive().getSheetByName(DPL.B2C);
  if (!ws || ws.getLastRow() < 3) return out;
  var bw = Math.min(27, ws.getMaxColumns());
  var b2c = ws.getRange(3, 1, ws.getLastRow() - 2, bw).getValues();
  b2c.forEach(function (r) {
    var d = r[0]; if (!(d instanceof Date) || isNaN(d.getTime())) return;
    var k = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM-dd'); if (k < cutoffStr) return;
    var rev = parseFloat(r[15]) || 0; if (rev <= 0) return;
    var ch = String(r[26] || '').trim() || 'Direct/Unknown';
    if (!out[k]) out[k] = { _store: 0 };
    out[k][ch] = (out[k][ch] || 0) + rev;
    out[k]._store += rev;
  });
  return out;
}

function dplRebuildChannelAudit() { buildChannelAudit(); }

// ── A (v27.36): live Klaviyo Reporting API → 📧 Email Rev (Klaviyo), Campaign vs Flow vs SMS split.
//  Private key stored in Script Properties (never in the sheet). Auto-runs in the daily refresh.
function _klApiKey() {
  var k = PropertiesService.getScriptProperties().getProperty('KLAVIYO_API_KEY');
  return k ? k.trim() : '';
}

function dplSetKlaviyoKey() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Klaviyo Private API Key',
    'Paste your Klaviyo PRIVATE API key (starts with pk_). Stored in Script Properties, never in the sheet. ' +
    'Create it in Klaviyo: Settings → API keys → Create Private API Key (Reporting/Analytics read scope).',
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var k = (r.getResponseText() || '').trim();
  if (!k) { ui.alert('No key entered.'); return; }
  PropertiesService.getScriptProperties().setProperty('KLAVIYO_API_KEY', k);
  ui.alert('✅ Klaviyo key saved. Now run "Backfill Klaviyo Email (12 mo)", then Rebuild Channel Trends.');
}

/** POST a Klaviyo {campaign|flow}-values-report for one timeframe, grouped by send_channel. */
function _klPostReport(kind, startISO, endISO) {
  var key = _klApiKey();
  if (!key) throw new Error('No Klaviyo API key — run "Set / Update Klaviyo API Key" first.');
  var url = 'https://a.klaviyo.com/api/' + kind + '-values-reports/';
  // group_by MUST include the entity id(s) for the report type — Klaviyo rejects send_channel-only (HTTP 400).
  var groupBy = (kind === 'campaign')
    ? ['campaign_id', 'campaign_message_id', 'send_channel']
    : ['flow_id', 'flow_message_id', 'send_channel'];
  var body = { data: { type: kind + '-values-report', attributes: {
    timeframe: { start: startISO, end: endISO },
    conversion_metric_id: 'SvcwqH',
    statistics: ['conversion_value', 'recipients'],
    group_by: groupBy
  } } };
  var opts = {
    method: 'post', contentType: 'application/json',
    headers: { 'Authorization': 'Klaviyo-API-Key ' + key, 'accept': 'application/json', 'revision': '2024-10-15' },
    payload: JSON.stringify(body), muteHttpExceptions: true
  };
  var res, code;
  for (var attempt = 1; attempt <= 4; attempt++) {     // retry on 429 (Klaviyo rate limit) with backoff
    res = UrlFetchApp.fetch(url, opts);
    code = res.getResponseCode();
    if (code !== 429) break;
    var h = res.getHeaders() || {};
    var ra = parseFloat(h['Retry-After'] || h['retry-after'] || '0');
    Utilities.sleep(ra > 0 ? Math.min(ra * 1000, 20000) : attempt * 2000);
  }
  if (code < 200 || code >= 300) throw new Error('Klaviyo ' + kind + ' HTTP ' + code + ': ' + res.getContentText().slice(0, 300));
  return JSON.parse(res.getContentText());
}

/** Sum conversion_value + recipients by send_channel (email / sms) across a report's results. */
function _klSumByChannel(report) {
  var out = { email: { rev: 0, recip: 0 }, sms: { rev: 0, recip: 0 } };
  var results = (report && report.data && report.data.attributes && report.data.attributes.results) || [];
  results.forEach(function(r) {
    var ch = ((r.groupings && r.groupings.send_channel) || 'email').toLowerCase();
    if (ch !== 'email' && ch !== 'sms') return;
    var st = r.statistics || {};
    out[ch].rev   += parseFloat(st.conversion_value) || 0;
    out[ch].recip += parseFloat(st.recipients) || 0;
  });
  return out;
}

/** Upsert 8-col rows into 📧 Email Rev (Klaviyo) by month key (col A). */
// ── 📧 Email Marketing: ONE sheet, two stacked sections (band layout owned by _ctEnsureEmailRevSheet) ──
//   Section A (MONTHLY ROLLUP):    header row EM_MONTH_HDR, data rows EM_MONTH_START..EM_MONTH_MAX
//   Section B (PER-CAMPAIGN SCORECARD): title EM_SC_TITLE, header EM_SC_HDR, data EM_SC_START+
// Each writer touches ONLY its own band — never ws.clear() the whole sheet (would wipe the other section).
var EM_MONTH_HDR = 4, EM_MONTH_START = 5, EM_MONTH_MAX = 40;   // 36-month capacity
var EM_SC_TITLE = 42, EM_SC_HDR = 43, EM_SC_START = 44;

function _klUpsertEmailRows(ws, rows) {
  // Upsert month rows WITHIN the monthly band only, keyed by col A. Never touches the scorecard section.
  var bandH = EM_MONTH_MAX - EM_MONTH_START + 1;
  var vals = ws.getRange(EM_MONTH_START, 1, bandH, 1).getValues();
  var idx = {}, firstFree = EM_MONTH_MAX + 1;
  for (var r = 0; r < bandH; r++) {
    var k = String(vals[r][0] || '').trim();
    if (k) idx[k] = EM_MONTH_START + r;
    else if (firstFree === EM_MONTH_MAX + 1) firstFree = EM_MONTH_START + r;
  }
  rows.forEach(function(row) {
    var k = String(row[0]).trim();
    var at = idx[k] ? idx[k] : firstFree;
    if (at > EM_MONTH_MAX) return;   // band full (>36 months) — raise EM_MONTH_MAX if ever needed
    if (!idx[k]) { idx[k] = at; firstFree = at + 1; }
    ws.getRange(at, 1).setNumberFormat('@');
    ws.getRange(at, 1, 1, 6).setValues([row]).setFontFamily(DPL.TNR).setFontSize(10);
    var campV = parseFloat(row[1]) || 0;
    ws.getRange(at, 2).setBackground(campV > 0 ? null : '#FEE2E2');   // red tint = no campaign sent that month
  });
}

/** Pull real Klaviyo email+SMS revenue per month (Campaign vs Flow split) into 📧 Email Rev (Klaviyo).
 *  monthsBack = number of COMPLETE prior months to refresh (default 3). 2 API calls per month. */
function dplSyncKlaviyoEmail(monthsBack, missingOnly) {
  monthsBack = (typeof monthsBack === 'number' && monthsBack > 0) ? monthsBack : 3;
  if (!_klApiKey()) { try { SpreadsheetApp.getUi().alert('No Klaviyo API key — run "Set / Update Klaviyo API Key" first.'); } catch(e){} return; }
  var ws = _ctEnsureEmailRevSheet();
  // Which months are already present (used when missingOnly: backfill only fills gaps so re-runs converge).
  var have = {};
  if (missingOnly) {
    var bandH0 = EM_MONTH_MAX - EM_MONTH_START + 1;
    ws.getRange(EM_MONTH_START,1,bandH0,1).getValues().forEach(function(r){ var k=String(r[0]||'').trim(); if(k) have[k]=true; });
  }
  var now = new Date(), done = 0, skipped = 0, fails = 0, firstErr = '', timedOut = false;
  var t0 = Date.now(), BUDGET_MS = 270000;   // 4.5 min — stop before the 6-min GAS cap so progress is never lost
  for (var i = 0; i < monthsBack; i++) {   // v28.5: start at 0 to INCLUDE the current (partial) month (SMS launched this month and was being skipped)
    var start = _dplAnchor(now.getFullYear(), now.getMonth() - i, 1);
    var end   = _dplAnchor(now.getFullYear(), now.getMonth() - i + 1, 1);
    var _todayAnc = _dplAnchor(now.getFullYear(), now.getMonth(), now.getDate());
    if (end > _todayAnc) end = _todayAnc;   // v28.5: cap current partial month at today (Klaviyo rejects a future end date)
    var mk    = Utilities.formatDate(start, DPL.VN_TZ, 'yyyy-MM');
    if (missingOnly && have[mk]) { skipped++; continue; }
    if (Date.now() - t0 > BUDGET_MS) { timedOut = true; break; }   // graceful stop — re-run to continue
    var sISO  = Utilities.formatDate(start, 'UTC', "yyyy-MM-dd'T'00:00:00'+00:00'");
    var eISO  = Utilities.formatDate(end,   'UTC', "yyyy-MM-dd'T'00:00:00'+00:00'");
    try {
      var camp = _klSumByChannel(_klPostReport('campaign', sISO, eISO)); Utilities.sleep(200);
      var flow = _klSumByChannel(_klPostReport('flow', sISO, eISO));     Utilities.sleep(200);
      var campRev = camp.email.rev, flowRev = flow.email.rev;
      var smsRev  = camp.sms.rev + flow.sms.rev;
      var total = campRev + flowRev;
      // INCREMENTAL upsert: write each month immediately so a timeout never discards completed months.
      _klUpsertEmailRows(ws, [[mk, campRev, flowRev, smsRev, total,
                 'Auto-synced ' + Utilities.formatDate(now, DPL.VN_TZ, 'yyyy-MM-dd') + ' via Klaviyo API']]);
      done++;
    } catch(e) { fails++; if (!firstErr) firstErr = mk + ' → ' + e.message; Logger.log('[dplSyncKlaviyoEmail] ' + mk + ': ' + e.message); }
  }
  ws.getRange(EM_MONTH_START, 1, EM_MONTH_MAX - EM_MONTH_START + 1, 6).sort({ column: 1, ascending: false });   // newest month on top (band only)
  if (!done && fails) { try { SpreadsheetApp.getUi().alert('Klaviyo sync failed (' + fails + ' month(s)). First error:\n\n' + firstErr + '\n\nHTTP 401/403 = API key wrong or missing Analytics scope. HTTP 400 = request body (send this to Claude). HTTP 429 = rate limit (just run again).'); } catch(e){} }
  var msg = '✅ Klaviyo email: ' + done + ' month(s) synced'
    + (skipped ? ' · ' + skipped + ' already present' : '')
    + (fails ? ' · ' + fails + ' failed (see log)' : '')
    + (timedOut ? ' · ⏳ time budget hit — run Backfill again to continue' : '');
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, '📧', 9); } catch(e){}
}

// Backfill = fill only the MISSING months among the last 12 (resumable & idempotent). Klaviyo's
// reporting endpoints rate-limit hard, so a full 12-month pull can exceed the 6-min GAS cap; with
// incremental writes + missing-only, just run this 2-3 times and it converges (each run pulls only gaps).
function dplBackfillKlaviyoEmail() { dplSyncKlaviyoEmail(12, true); }

/** Email-as-%-of-store-revenue badge (replaces the meaningless 'Email ROAS').
 *  Email is a flat-cost channel; share of revenue is the right health metric. GP target ~20-30%. */
/* ════════════════════════════════════════════════════════════════════════
 *  CAMPAIGN SCORECARD (v27.41) — one row PER email CAMPAIGN, since store launch.
 *  Judges manual campaign blasts (flows live in 📧 Email Rev) on email-marketing
 *  KPIs only: RPR, Open/Click/Conv %, Unsub %, Spam %, AOV. Names + send dates
 *  from the Campaigns API; stats from campaign-values-reports (<=1yr windows,
 *  summed). All rates use DELIVERED as denominator (Klaviyo convention).
 * ════════════════════════════════════════════════════════════════════════ */

/** Conversion-rate grade (placed-order conversions / delivered). Higher = better. Campaign email CR
 *  is low by nature; calibrated for apparel blasts. Tunable. */
function _csConvColor(v){
  if(!isFinite(v) || v<=0)  return '#94A3B8';   // grey (no conversions)
  if(v<0.001)  return '#DC2626';   // red        < 0.10%
  if(v<0.0025) return '#EA580C';   // orange     < 0.25%
  if(v<0.005)  return '#CA8A04';   // amber      < 0.50%
  if(v<0.01)   return '#166534';   // dark green < 1.00%
  return '#16A34A';                // green      >= 1.00%
}

/** Unsubscribe-rate grade. LOWER is better (list-burn guard). Healthy campaign unsub < 0.20%. */
function _csUnsubColor(v){
  if(!isFinite(v) || v<0)  return '#94A3B8';
  if(v<0.001)  return '#16A34A';   // green      < 0.10%
  if(v<0.002)  return '#166534';   // dark green < 0.20%
  if(v<0.0035) return '#CA8A04';   // amber      < 0.35%
  if(v<0.005)  return '#EA580C';   // orange     < 0.50%
  return '#DC2626';                // red        >= 0.50%
}

/** Spam-complaint-rate grade. LOWER is better. 0.30% = Gmail/Yahoo enforcement danger line. */
function _csSpamColor(v){
  if(!isFinite(v) || v<0)  return '#94A3B8';
  if(v<0.0005) return '#16A34A';   // green      < 0.05%
  if(v<0.001)  return '#166534';   // dark green < 0.10%
  if(v<0.002)  return '#CA8A04';   // amber      < 0.20%
  if(v<0.003)  return '#EA580C';   // orange     < 0.30%
  return '#DC2626';                // red        >= 0.30% (deliverability danger)
}

/** List EMAIL campaigns created since launch (paginated). Returns [{id,name,status,send:Date|null}].
 *  Channel filter is REQUIRED by Klaviyo; created_at datetime must be UNQUOTED inside the filter
 *  string (quoting it returns "invalid filter"). send_time is not filterable, so we filter by
 *  created_at and read send_time from the response. */
function _klGetCampaigns(startISO, channel){
  channel = channel || 'email';
  var key=_klApiKey();
  if(!key) throw new Error('No Klaviyo API key.');
  var filter="and(equals(messages.channel,'"+channel+"'),greater-or-equal(created_at,"+startISO+"))";
  // NOTE: revision 2024-10-15 of /api/campaigns rejects page[size] and sparse fieldsets for this
  // resource (HTTP 400 'page_size not a valid field'). Use the default page size; paginate via links.next.
  var url='https://a.klaviyo.com/api/campaigns/?filter='+encodeURIComponent(filter);
  var headers={'Authorization':'Klaviyo-API-Key '+key,'accept':'application/json','revision':'2024-10-15'};
  var out=[], guard=0;
  while(url && guard++<25){
    var res, code;
    for(var attempt=1; attempt<=4; attempt++){
      res=UrlFetchApp.fetch(url,{method:'get',headers:headers,muteHttpExceptions:true});
      code=res.getResponseCode();
      if(code!==429) break;
      var h=res.getHeaders()||{}; var ra=parseFloat(h['Retry-After']||h['retry-after']||'0');
      Utilities.sleep(ra>0?Math.min(ra*1000,20000):attempt*2000);
    }
    if(code<200 || code>=300) throw new Error('Klaviyo campaigns HTTP '+code+': '+res.getContentText().slice(0,300));
    var j=JSON.parse(res.getContentText());
    (j.data||[]).forEach(function(d){
      var a=d.attributes||{};
      var sendRaw=a.send_time
        || (a.send_strategy && a.send_strategy.options_static && a.send_strategy.options_static.datetime)
        || a.scheduled_at || null;
      var sd=null; if(sendRaw){ var t=new Date(sendRaw); if(!isNaN(t.getTime())) sd=t; }
      out.push({ id:d.id, name:a.name||'(unnamed)', status:a.status||'', send:sd });
    });
    url=(j.links && j.links.next) ? j.links.next : null;
    if(url) Utilities.sleep(250);
  }
  return out;
}

/** POST campaign-values-report for one timeframe, grouped by campaign_id. Returns results[].
 *  Requests ABSOLUTE COUNTS (not rates) so rates can be recomputed from sums across windows. */
function _klPostCampaignFull(startISO,endISO){
  var key=_klApiKey();
  if(!key) throw new Error('No Klaviyo API key.');
  var url='https://a.klaviyo.com/api/campaign-values-reports/';
  var body={ data:{ type:'campaign-values-report', attributes:{
    timeframe:{ start:startISO, end:endISO },
    conversion_metric_id:'SvcwqH',
    statistics:['conversion_value','recipients','delivered','opens_unique','clicks_unique','conversion_uniques','unsubscribes','spam_complaints'],
    group_by:['campaign_id','campaign_message_id','send_channel']
  } } };
  var opts={ method:'post', contentType:'application/json',
    headers:{ 'Authorization':'Klaviyo-API-Key '+key, 'accept':'application/json', 'revision':'2024-10-15' },
    payload:JSON.stringify(body), muteHttpExceptions:true };
  var res, code;
  for(var attempt=1; attempt<=4; attempt++){
    res=UrlFetchApp.fetch(url,opts); code=res.getResponseCode();
    if(code!==429) break;
    var h=res.getHeaders()||{}; var ra=parseFloat(h['Retry-After']||h['retry-after']||'0');
    Utilities.sleep(ra>0?Math.min(ra*1000,20000):attempt*2000);
  }
  if(code<200 || code>=300) throw new Error('Klaviyo campaign-scorecard HTTP '+code+': '+res.getContentText().slice(0,300));
  var j=JSON.parse(res.getContentText());
  return (j.data && j.data.attributes && j.data.attributes.results) || [];
}

function _csEnsureScorecardSheet(){ return _ctEnsureEmailRevSheet(); }   // merged: scorecard shares the 📧 Email Marketing sheet

/** Build 📧 Campaign Scorecard — one row PER campaign since launch (2025-05), graded by email KPIs.
 *  6-month windows (safely under the values-report 1-year cap), summed per campaign_id; rates use
 *  DELIVERED as denominator. Flows excluded by design. Auto-refreshed in the daily run. */
function dplDiagKlaviyoWindows() {
  // Logs each 3-month window: HTTP result + how many email/sms campaign rows come back.
  // View -> Executions -> Logs. Use this to prove the scorecard covers up to today.
  if(!_klApiKey()){ Logger.log('No Klaviyo API key.'); return; }
  var now=new Date(), wStart=_dplAnchor(2025,4,1);
  var hardEnd=_dplAnchor(now.getFullYear(),now.getMonth(),now.getDate());
  var w=0;
  Logger.log('=== Klaviyo scorecard windows (end must be <= today; future end = HTTP 400) ===');
  while(wStart<hardEnd && w<24){
    var wEnd=_dplAnchor(wStart.getUTCFullYear(),wStart.getUTCMonth()+3,wStart.getUTCDate());
    if(wEnd>hardEnd) wEnd=hardEnd;
    var sISO=Utilities.formatDate(wStart,'UTC',"yyyy-MM-dd'T'00:00:00'+00:00'");
    var eISO=Utilities.formatDate(wEnd,'UTC',"yyyy-MM-dd'T'00:00:00'+00:00'");
    try{
      var res=_klPostCampaignFull(sISO,eISO);
      var em=0, sm=0;
      res.forEach(function(r){
        var ch=((r.groupings&&r.groupings.send_channel)||'email').toLowerCase();
        if(ch==='sms') sm++; else em++;
      });
      Logger.log('  win'+(w+1)+' '+sISO.slice(0,10)+' -> '+eISO.slice(0,10)+' : OK, '+res.length+' rows ('+em+' email / '+sm+' sms)');
    }catch(e){ Logger.log('  win'+(w+1)+' '+sISO.slice(0,10)+' -> '+eISO.slice(0,10)+' : FAILED - '+e.message.slice(0,160)); }
    Utilities.sleep(400);
    wStart=_dplAnchor(wStart.getUTCFullYear(),wStart.getUTCMonth()+3,wStart.getUTCDate()); w++;
  }
  Logger.log('=== done. Any FAILED window = that period is missing from the scorecard. ===');
  try{ _getSSActive().toast('Diag done - View > Executions > Logs','\uD83D\uDCE7',7); }catch(e){}
}

function dplSyncSmsScorecard(){
  // SMS per-campaign scorecard. _klPostCampaignFull returns send_channel=sms rows (email scorecard filters
  // them out); here we keep sms. SMS has NO opens/spam -> those columns omitted.
  if(!_klApiKey()){ try{ SpreadsheetApp.getUi().alert('No Klaviyo API key.'); }catch(e){} return; }
  var LAUNCH_Y=2025, LAUNCH_M=4, now=new Date();
  var launchISO=Utilities.formatDate(_dplAnchor(LAUNCH_Y,LAUNCH_M,1),'UTC',"yyyy-MM-dd'T'00:00:00'+00:00'");
  var meta={};
  try{ _klGetCampaigns(launchISO,'sms').forEach(function(c){ meta[c.id]={name:c.name,send:c.send,status:c.status}; }); }
  catch(e){ try{ SpreadsheetApp.getUi().alert('SMS campaign list failed:\n\n'+e.message); }catch(_){} return; }
  var acc={};
  function add(id,st){
    var a=acc[id]||(acc[id]={rev:0,recip:0,deliv:0,clicks:0,conv:0,unsub:0});
    a.rev+=parseFloat(st.conversion_value)||0; a.recip+=parseFloat(st.recipients)||0;
    a.deliv+=parseFloat(st.delivered)||0; a.clicks+=parseFloat(st.clicks_unique)||0;
    a.conv+=parseFloat(st.conversion_uniques)||0; a.unsub+=parseFloat(st.unsubscribes)||0;
  }
  var wStart=_dplAnchor(LAUNCH_Y,LAUNCH_M,1), hardEnd=_dplAnchor(now.getFullYear(),now.getMonth(),now.getDate());   // v27.93: NOT +1 (future end = Klaviyo error)
  var firstErr='', windows=0, failed=0;
  while(wStart<hardEnd && windows<24){
    var wEnd=_dplAnchor(wStart.getUTCFullYear(),wStart.getUTCMonth()+3,wStart.getUTCDate()); if(wEnd>hardEnd) wEnd=hardEnd;
    var sISO=Utilities.formatDate(wStart,'UTC',"yyyy-MM-dd'T'00:00:00'+00:00'");
    var eISO=Utilities.formatDate(wEnd,'UTC',"yyyy-MM-dd'T'00:00:00'+00:00'");
    var ok=false, lastE='';
    for(var att=1; att<=3 && !ok; att++){
      try{
        _klPostCampaignFull(sISO,eISO).forEach(function(r){
          var ch=((r.groupings&&r.groupings.send_channel)||'email').toLowerCase();
          if(ch!=='sms') return;
          var id=r.groupings&&r.groupings.campaign_id; if(!id) return;
          add(id,r.statistics||{});
        });
        ok=true;
      }catch(e){ lastE=e.message; Logger.log('[sms scorecard] '+sISO+' attempt '+att+': '+e.message); Utilities.sleep(att*2500); }
    }
    if(!ok){ failed++; if(!firstErr) firstErr=sISO+' \u2192 '+lastE; }
    Utilities.sleep(350);
    wStart=_dplAnchor(wStart.getUTCFullYear(),wStart.getUTCMonth()+3,wStart.getUTCDate()); windows++;
  }
  if(failed){
    Logger.log('[sms scorecard] ABORTED: '+failed+'/'+windows+' windows failed: '+firstErr);
    try{ _getSSActive().toast('SMS Scorecard aborted \u2014 '+failed+' window(s) failed. Run again.','\uD83D\uDCF1',9); }catch(e){}
    return;
  }
  var rows=[];
  Object.keys(acc).forEach(function(id){
    var a=acc[id]; var denom=a.deliv>0?a.deliv:a.recip; if(denom<=0) return;
    var m=meta[id]||{};
    rows.push({send:m.send||null, name:m.name||('(sms '+String(id).slice(-6)+')'), recip:a.recip, deliv:a.deliv, rev:a.rev,
      rpr:a.rev/denom, clickR:a.clicks/denom, convR:a.conv/denom, unsubR:a.unsub/denom, aov:a.conv>0?a.rev/a.conv:0});
  });
  rows.sort(function(x,y){ var tx=x.send?x.send.getTime():0, ty=y.send?y.send.getTime():0; return ty-tx; });

  var ss=_getSSActive(), SH='\uD83D\uDCF1 SMS Scorecard', TNR=DPL.TNR, NC=10;
  var ws=ss.getSheetByName(SH)||ss.insertSheet(SH); ws.clear();
  try{ ws.setTabColor('#7C3AED'); }catch(e){}
  ws.getRange(1,1,1,NC).merge().setValue('\uD83D\uDCF1  GerberaPrints \u2014 SMS Scorecard  (every SMS campaign since launch)')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(TNR).setFontSize(13).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1,28);
  ws.getRange(2,1,1,NC).merge().setValue('Klaviyo-attributed SMS (send_channel=sms). SMS has no opens/spam. RPR/Click/Conv graded 5-tier (bars borrowed from email \u2014 SMS RPR/Click usually run HIGHER, tune up if all-green). Unsub lower=better. Auto-synced daily.')
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(TNR).setFontSize(9).setFontStyle('italic').setWrap(true);
  ws.setRowHeight(2,34);
  ws.getRange(3,1,1,NC).setValues([['Send Date','Campaign','Recipients','Delivered','Revenue ($)','RPR ($)','Click %','Conv %','Unsub %','AOV ($)']])
    .setBackground('#1E293B').setFontColor('#E2E8F0').setFontFamily(TNR).setFontSize(11).setFontWeight('bold').setHorizontalAlignment('center');
  if(rows.length){
    var body=rows.map(function(r){ return [r.send?r.send:'', r.name, r.recip, r.deliv, r.rev, r.rpr, r.clickR, r.convR, r.unsubR, r.aov]; });
    var nb=body.length;
    ws.getRange(4,1,nb,NC).setValues(body).setFontFamily(TNR).setFontSize(10);
    ws.getRange(4,1,nb,1).setNumberFormat('yyyy-mm-dd');
    ws.getRange(4,3,nb,2).setNumberFormat('#,##0');
    ws.getRange(4,5,nb,1).setNumberFormat('"$"#,##0');
    ws.getRange(4,6,nb,1).setNumberFormat('"$"#,##0.000');
    ws.getRange(4,7,nb,3).setNumberFormat('0.00%');
    ws.getRange(4,10,nb,1).setNumberFormat('"$"#,##0.00');
    var bR=[],fR=[],bK=[],fK=[],bC=[],fC=[],bU=[],fU=[];
    rows.forEach(function(r){
      var _r=_kpiByKey(r.rpr,'campaign_rpr'); bR.push([_r.bg]); fR.push([_r.fg]);
      var _k=_kpiByKey(r.clickR,'email_click'); bK.push([_k.bg]); fK.push([_k.fg]);
      var _c=_kpiByKey(r.convR,'email_conv'); bC.push([_c.bg]); fC.push([_c.fg]);
      var _u=_kpiByKey(r.unsubR,'email_unsub'); bU.push([_u.bg]); fU.push([_u.fg]);
    });
    ws.getRange(4,6,nb,1).setBackgrounds(bR).setFontColors(fR).setFontWeight('bold');
    ws.getRange(4,7,nb,1).setBackgrounds(bK).setFontColors(fK).setFontWeight('bold');
    ws.getRange(4,8,nb,1).setBackgrounds(bC).setFontColors(fC).setFontWeight('bold');
    ws.getRange(4,9,nb,1).setBackgrounds(bU).setFontColors(fU).setFontWeight('bold');
  }
  ws.setFrozenRows(3);
  [110,250,95,90,100,95,80,80,80,90].forEach(function(w,i){ ws.setColumnWidth(i+1,w); });
  try{ ss.toast('SMS Scorecard: '+rows.length+' campaign(s)'+(firstErr?' (some windows failed)':''),'\uD83D\uDCF1',8); }catch(e){}
}

function dplSyncCampaignScorecard(){
  if(!_klApiKey()){ try{ SpreadsheetApp.getUi().alert('No Klaviyo API key — run "Set / Update Klaviyo API Key" first.'); }catch(e){} return; }
  var LAUNCH_Y=2025, LAUNCH_M=4;          // May 2025 (0-based month)
  var now=new Date();
  var launchISO=Utilities.formatDate(_dplAnchor(LAUNCH_Y,LAUNCH_M,1),'UTC',"yyyy-MM-dd'T'00:00:00'+00:00'");

  // 1) campaign metadata (name + send date)
  var meta={};
  try{
    _klGetCampaigns(launchISO).forEach(function(c){ meta[c.id]={ name:c.name, send:c.send, status:c.status }; });
  }catch(e){ try{ SpreadsheetApp.getUi().alert('Campaign list pull failed:\n\n'+e.message); }catch(_){ } return; }

  // 2) per-campaign stats across 6-month windows (summed; email channel only)
  var acc={};
  function add(id,st){
    var a=acc[id] || (acc[id]={rev:0,recip:0,deliv:0,opens:0,clicks:0,conv:0,unsub:0,spam:0});
    a.rev    += parseFloat(st.conversion_value)   || 0;
    a.recip  += parseFloat(st.recipients)         || 0;
    a.deliv  += parseFloat(st.delivered)          || 0;
    a.opens  += parseFloat(st.opens_unique)       || 0;
    a.clicks += parseFloat(st.clicks_unique)      || 0;
    a.conv   += parseFloat(st.conversion_uniques) || 0;
    a.unsub  += parseFloat(st.unsubscribes)       || 0;
    a.spam   += parseFloat(st.spam_complaints)    || 0;
  }
  // v27.92: 3-month windows (smaller = far less likely to time out / rate-limit) + RETRY each window.
  // A silently-failed window used to wipe good data (the May-Jul gap): now failures are COUNTED and the
  // write is ABORTED if any window failed, so an existing good scorecard is never destroyed by a bad run.
  var wStart=_dplAnchor(LAUNCH_Y,LAUNCH_M,1);
  // v27.93 ROOT-CAUSE FIX: end was now+1 = TOMORROW. Klaviyo rejects a timeframe whose end is in the
  // FUTURE -> the last window ALWAYS failed -> scorecard silently stopped at the previous window
  // boundary (2026-04). End must be <= now; we use TODAY 00:00 (exclusive), covering through yesterday.
  var hardEnd=_dplAnchor(now.getFullYear(),now.getMonth(),now.getDate());
  var firstErr='', windows=0, failed=0;
  var _scT0=Date.now(), _scBUDGET=300000, deferred=false;   // v27.98: 5-min soft cap on its OWN trigger wall; defers rest to next day
  while(wStart < hardEnd && windows < 24){
    if(Date.now()-_scT0 > _scBUDGET){ deferred=true; Logger.log('[scorecard] time budget reached after '+windows+' window(s) - deferring rest (429 rate-limit)'); break; }
    var wEnd=_dplAnchor(wStart.getUTCFullYear(), wStart.getUTCMonth()+3, wStart.getUTCDate());
    if(wEnd > hardEnd) wEnd=hardEnd;
    var sISO=Utilities.formatDate(wStart,'UTC',"yyyy-MM-dd'T'00:00:00'+00:00'");
    var eISO=Utilities.formatDate(wEnd,  'UTC',"yyyy-MM-dd'T'00:00:00'+00:00'");
    var ok=false, lastE='';
    for(var att=1; att<=3 && !ok; att++){
      try{
        _klPostCampaignFull(sISO,eISO).forEach(function(r){
          var ch=((r.groupings && r.groupings.send_channel) || 'email').toLowerCase();
          if(ch!=='email') return;
          var id=r.groupings && r.groupings.campaign_id; if(!id) return;
          add(id, r.statistics||{});
        });
        ok=true;
      }catch(e){ lastE=e.message; Logger.log('[scorecard window] '+sISO+' attempt '+att+': '+e.message); Utilities.sleep(att*2500); }
    }
    if(!ok){ failed++; if(!firstErr) firstErr=sISO+' \u2192 '+lastE; }
    Utilities.sleep(350);
    wStart=_dplAnchor(wStart.getUTCFullYear(), wStart.getUTCMonth()+3, wStart.getUTCDate());
    windows++;
  }
  if(failed || deferred){
    var _rsn = deferred ? ('DEFERRED: time budget reached after '+windows+' window(s) (Klaviyo 429 rate-limit)') : (failed+' of '+windows+' window(s) failed');
    var em='\u26A0 Campaign Scorecard NOT written ('+_rsn+') \u2014 existing data left INTACT '
      +'(a partial write would delete good months). '+(firstErr?('First error:\n\n'+firstErr+'\n\n'):'')+'HTTP 429 = rate limit: it retries on the next daily run.';
    Logger.log(em);
    try{ SpreadsheetApp.getUi().alert(em); }catch(e){ try{ _getSSActive().toast('Scorecard aborted \u2014 '+failed+' window(s) failed. Run again.','\uD83D\uDCE7',10); }catch(_){} }
    return;
  }

  // 3) join -> rows (only campaigns that actually delivered)
  var rows=[];
  Object.keys(acc).forEach(function(id){
    var a=acc[id]; var denom=a.deliv>0 ? a.deliv : a.recip;
    if(denom<=0) return;
    var m=meta[id]||{};
    rows.push({
      send:m.send||null,
      name:m.name||('(campaign '+String(id).slice(-6)+')'),
      recip:a.recip, deliv:a.deliv, rev:a.rev,
      rpr:a.rev/denom, openR:a.opens/denom, clickR:a.clicks/denom,
      convR:a.conv/denom, unsubR:a.unsub/denom, spamR:a.spam/denom,
      aov:a.conv>0 ? a.rev/a.conv : 0
    });
  });
  rows.sort(function(x,y){ var tx=x.send?x.send.getTime():0, ty=y.send?y.send.getTime():0; return ty-tx; });

  // 4) write — into the PER-CAMPAIGN section of the merged 📧 Email Marketing sheet (band EM_SC_START+)
  var ws=_ctEnsureEmailRevSheet();
  var NC=12;
  // clear ONLY the scorecard data region (its header at EM_SC_HDR is owned by the layout); never touch the monthly band
  var maxR=ws.getMaxRows();
  if(maxR>=EM_SC_START) ws.getRange(EM_SC_START,1,maxR-EM_SC_START+1,NC).clearContent().setBackground(null).setFontColor('#000000').setFontWeight('normal');

  if(rows.length){
    var body=rows.map(function(r){
      return [ r.send?r.send:'', r.name, r.recip, r.deliv, r.rev, r.rpr, r.openR, r.clickR, r.convR, r.unsubR, r.spamR, r.aov ];
    });
    var nb=body.length;
    ws.getRange(EM_SC_START,1,nb,NC).setValues(body).setFontFamily(DPL.TNR).setFontSize(10);
    ws.getRange(EM_SC_START,1,nb,1).setNumberFormat('yyyy-mm-dd');
    ws.getRange(EM_SC_START,3,nb,2).setNumberFormat('#,##0');
    ws.getRange(EM_SC_START,5,nb,1).setNumberFormat('"$"#,##0');
    ws.getRange(EM_SC_START,6,nb,1).setNumberFormat('"$"#,##0.000');
    ws.getRange(EM_SC_START,7,nb,5).setNumberFormat('0.00%');
    ws.getRange(EM_SC_START,12,nb,1).setNumberFormat('"$"#,##0.00');

    var bgR=[],fcR=[],bgO=[],fcO=[],bgK=[],fcK=[],bgC=[],fcC=[],bgU=[],fcU=[],bgS=[],fcS=[];
    rows.forEach(function(r){
      var _r=_kpiByKey(r.rpr,'campaign_rpr');   bgR.push([_r.bg]); fcR.push([_r.fg]);
      var _o=_kpiByKey(r.openR,'email_open');   bgO.push([_o.bg]); fcO.push([_o.fg]);
      var _k=_kpiByKey(r.clickR,'email_click'); bgK.push([_k.bg]); fcK.push([_k.fg]);
      var _c=_kpiByKey(r.convR,'email_conv');   bgC.push([_c.bg]); fcC.push([_c.fg]);
      var _u=_kpiByKey(r.unsubR,'email_unsub'); bgU.push([_u.bg]); fcU.push([_u.fg]);
      var _s=_kpiByKey(r.spamR,'email_spam');   bgS.push([_s.bg]); fcS.push([_s.fg]);
    });
    ws.getRange(EM_SC_START, 6,nb,1).setBackgrounds(bgR).setFontColors(fcR).setFontWeight('bold');
    ws.getRange(EM_SC_START, 7,nb,1).setBackgrounds(bgO).setFontColors(fcO).setFontWeight('bold');
    ws.getRange(EM_SC_START, 8,nb,1).setBackgrounds(bgK).setFontColors(fcK).setFontWeight('bold');
    ws.getRange(EM_SC_START, 9,nb,1).setBackgrounds(bgC).setFontColors(fcC).setFontWeight('bold');
    ws.getRange(EM_SC_START,10,nb,1).setBackgrounds(bgU).setFontColors(fcU).setFontWeight('bold');
    ws.getRange(EM_SC_START,11,nb,1).setBackgrounds(bgS).setFontColors(fcS).setFontWeight('bold');
  }

  var msg='✅ Campaign Scorecard: '+rows.length+' campaign(s)'+(firstErr?' · some windows failed (see log)':'');
  try{ SpreadsheetApp.getActiveSpreadsheet().toast(msg,'📧',7); }catch(e){}
  if(!rows.length && firstErr){ try{ SpreadsheetApp.getUi().alert('Scorecard: no rows. First window error:\n\n'+firstErr); }catch(e){} }
}


function _ctEmailShareColor(v) {
  if (!isFinite(v) || v <= 0) return '#94A3B8';   // grey
  if (v < 0.11) return '#DC2626';   // red    <11%
  if (v < 0.14) return '#EA580C';   // orange 11-14%
  if (v < 0.17) return '#CA8A04';   // amber  14-17%
  if (v < 0.20) return '#166534';   // dark green 17-20%
  return '#16A34A';                 // green  >=20% (channel target)
}

/** Campaign RPR grade (revenue per recipient) — the real CAMPAIGN KPI. Flows excluded; judges only
 *  the manual campaign blasts. Anchored to Klaviyo all-email avg ~$0.11 (campaign-only avg is lower). Tunable. */
function _ctCampaignRprColor(v) {
  if (!isFinite(v) || v <= 0) return '#94A3B8';   // grey (no campaigns sent)
  if (v < 0.05) return '#DC2626';   // red    < $0.05
  if (v < 0.11) return '#EA580C';   // orange < $0.11 (below Klaviyo avg)
  if (v < 0.20) return '#CA8A04';   // amber  < $0.20
  if (v < 0.35) return '#166534';   // dark green < $0.35
  return '#16A34A';                 // green  >= $0.35 (excellent)
}

// _ctCampaignRprByMonth removed in v27.43 — per-campaign RPR now lives only in 📧 Campaign Scorecard.

/** Channel Audit — raw-source breakdown of revenue per channel bucket, from 'Shopify B2C'
 *  (channel col 27, Raw Source col 28, Total Revenue r[15]). Reveals what is inside 'Other'
 *  (e.g. chatgpt.com / AI search) and confirms discovery channels (Pinterest/TikTok) are near-zero
 *  on last-click. Rows synced before col 28 existed show '(not captured)' — run Re-sync ALL B2C. */
function buildChannelAudit() {
  var ss = _getSSActive();
  var ws = ss.getSheetByName(DPL.AUDIT) || ss.insertSheet(DPL.AUDIT);
  ws.clear();
  var b2c = ss.getSheetByName(DPL.B2C);
  if (!b2c || b2c.getLastRow() < 3) { ss.toast('No B2C data', '🔎', 5); return; }
  var bw = Math.min(28, b2c.getMaxColumns());
  var data = b2c.getRange(3, 1, b2c.getLastRow() - 2, bw).getValues();
  var agg = {}, total = 0;
  data.forEach(function(r){
    var rev = parseFloat(r[15]) || 0; if (rev <= 0) return;
    var ch  = String(r[26] || '').trim() || 'Direct/Unknown';
    var raw = (bw >= 28 ? String(r[27] || '').trim().toLowerCase() : '');
    if (!raw) raw = '(not captured — run Re-sync ALL B2C)';
    var key = ch + '||' + raw;
    if (!agg[key]) agg[key] = { ch: ch, raw: raw, orders: 0, rev: 0 };
    agg[key].orders += 1; agg[key].rev += rev; total += rev;
  });
  var rowsArr = Object.keys(agg).map(function(k){ return agg[k]; });
  rowsArr.sort(function(a,b){ return b.rev - a.rev; });
  var NC = 5;
  ws.getRange(1,1,1,NC).merge().setValue('🔎  GerberaPrints — Channel Audit  (raw-source breakdown by revenue)')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1,30);
  ws.getRange(2,1,1,NC).merge().setValue('Last-session (UTM) attribution from Shopify B2C. "(not captured)" = synced before Raw Source col existed — run 🔁 Re-sync ALL B2C to backfill. Pinterest/TikTok are discovery channels: near-zero here is expected (last-click) — see Pinterest Ads/GA for their real influence.')
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(DPL.TNR).setFontSize(9).setFontStyle('italic').setWrap(true);
  ws.setRowHeight(2,44);
  ws.getRange(3,1,1,NC).setValues([['Channel','Raw Source','Orders','Revenue ($)','% of Rev']])
    .setBackground('#1E293B').setFontColor('#E2E8F0').setFontFamily(DPL.TNR).setFontSize(11).setFontWeight('bold').setHorizontalAlignment('center');
  var out = rowsArr.map(function(x){ return [x.ch, x.raw, x.orders, x.rev, total > 0 ? x.rev/total : 0]; });
  if (out.length) {
    ws.getRange(4,1,out.length,NC).setValues(out).setFontFamily(DPL.TNR).setFontSize(10);
    ws.getRange(4,3,out.length,1).setNumberFormat('#,##0');
    ws.getRange(4,4,out.length,1).setNumberFormat('"$"#,##0');
    ws.getRange(4,5,out.length,1).setNumberFormat('0.0%');
  }
  ws.setFrozenRows(3);
  ws.setColumnWidth(1,150); ws.setColumnWidth(2,270); ws.setColumnWidth(3,90); ws.setColumnWidth(4,120); ws.setColumnWidth(5,90);
  ss.toast('✅ Channel Audit: ' + out.length + ' source rows · $' + Math.round(total).toLocaleString(), '🔎', 6);
}

/** Real per-channel store revenue by month from 'Shopify B2C' (Source col 27, Total Revenue r[15]). */
function _ctRealChannelRevByMonth(from, to) {
  var out = {}, ws = _getSSActive().getSheetByName(DPL.B2C);
  if (!ws || ws.getLastRow() < 3) return out;
  var _bw = Math.min(27, ws.getMaxColumns());
  var b2c = ws.getRange(3, 1, ws.getLastRow() - 2, _bw).getValues();
  b2c.forEach(function(r){
    var d = r[0]; if (!(d instanceof Date) || isNaN(d.getTime()) || d < from || d > to) return;
    var rev = parseFloat(r[15]) || 0; if (rev <= 0) return;
    var ch  = String(r[26] || '').trim() || 'Direct/Unknown';
    var m = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM');
    if (!out[m]) out[m] = {};
    out[m][ch] = (out[m][ch] || 0) + rev;
  });
  return out;
}

/** Per-month Klaviyo cost {YYYY-MM: usd} from '💰 Cost Tracker' (vendor col C contains 'klaviyo').
 *  This is a FIXED monthly tooling cost (subscription by profile tier), NOT a per-campaign variable
 *  cost — so Email ROAS (rev ÷ this) is return-on-tooling, not comparable to ad ROAS. Already counted
 *  inside Daily/Monthly 'Fixed'; surfacing it here is display-only and does not double-count P&L. */
function _ctKlaviyoCostByMonth() {
  var out = {}, ws = _getSSActive().getSheetByName(DPL.COST);
  if (!ws || ws.getLastRow() < 2) return out;
  var data = ws.getRange(1, 1, ws.getLastRow(), 4).getValues();   // A=Month · C=Vendor · D=Amount
  data.forEach(function(r){
    var d = r[0], vendor = String(r[2] || '').toLowerCase(), amt = parseFloat(r[3]);
    if (!(d instanceof Date) || isNaN(d.getTime()) || !(amt > 0)) return;
    if (vendor.indexOf('klaviyo') < 0) return;
    var k = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM');
    out[k] = (out[k] || 0) + amt;
  });
  return out;
}

/** Real Klaviyo email-attributed revenue by month, from the 📧 Email Rev (Klaviyo) input sheet
 *  (col A = month yyyy-MM or Date, col B = USD). Returns {yyyy-MM: number}. Blank/missing months are
 *  omitted so Channel Trends falls back to the UTM Email figure for those months. */
function _ctEmailRealRevByMonth() {
  var out = {}, ws = _getSSActive().getSheetByName(DPL.KLEMAIL);
  if (!ws) return out;
  var bandH = EM_MONTH_MAX - EM_MONTH_START + 1;
  var data = ws.getRange(EM_MONTH_START, 1, bandH, 5).getValues();   // monthly band only
  data.forEach(function(r){
    var m = r[0], amt = parseFloat(r[4]);   // col E = Email Total (Campaign + Flow email)
    if (!isFinite(amt) || amt < 0) return;
    var k = null;
    if (m instanceof Date && !isNaN(m.getTime())) k = Utilities.formatDate(m, DPL.VN_TZ, 'yyyy-MM');
    else { var ss2 = String(m || '').trim(); if (/^\d{4}-\d{2}/.test(ss2)) k = ss2.substring(0,7); }
    if (k) out[k] = amt;
  });
  return out;
}

/** Ensure the 📧 Email Rev (Klaviyo) sheet exists with the v27.36 8-column schema
 *  (Campaign vs Flow vs SMS split). Auto-filled by dplSyncKlaviyoEmail from the Klaviyo API.
 *  Migrates the old v27.35 3-col schema by rebuilding the header (data is re-pulled). */
function _ctEnsureEmailRevSheet() {
  var ss = _getSSActive(), ws = ss.getSheetByName(DPL.KLEMAIL);
  if (!ws) ws = ss.insertSheet(DPL.KLEMAIL);
  // Idempotent: if BOTH section headers are already in place, skip re-layout (preserves all data).
  if (String(ws.getRange(EM_MONTH_HDR,1).getValue()||'').trim() === 'Month (yyyy-MM)'
      && String(ws.getRange(EM_SC_HDR,1).getValue()||'').trim() === 'Send Date') return ws;

  ws.getRange(1,1,1,12).merge().setValue('\uD83D\uDCE7  GerberaPrints \u2014 Email Marketing')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1,30);
  ws.getRange(2,1,1,12).merge().setValue('TWO sections in one sheet \u2014 TOP: monthly channel rollup (Campaign vs Flow vs SMS; Email Total feeds Channel Trends % Store). BOTTOM: per-campaign scorecard, graded by RPR (Klaviyo avg ~$0.11) / Conv % (higher=better) / Unsub % & Spam % (lower=better; Spam >= 0.30% = Gmail/Yahoo danger). Rates use DELIVERED. Klaviyo attribution OVERLAPS ad/last-click \u2014 do NOT add to channel ROAS. Auto-synced daily; manual refresh via the menu.')
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(DPL.TNR).setFontSize(9).setFontStyle('italic').setWrap(true);
  ws.setRowHeight(2,46);

  // Section A: MONTHLY ROLLUP
  ws.getRange(3,1).setValue('\u25B8 MONTHLY ROLLUP (Campaign vs Flow vs SMS)').setFontFamily(DPL.TNR).setFontSize(10).setFontWeight('bold').setFontColor('#0F172A');
  var MHDR = ['Month (yyyy-MM)','Campaign Rev ($)','Flow Rev ($)','SMS Rev ($)','Email Total ($)','Note'];
  ws.getRange(EM_MONTH_HDR,1,1,6).setValues([MHDR])
    .setBackground('#1E293B').setFontColor('#E2E8F0').setFontFamily(DPL.TNR).setFontSize(11).setFontWeight('bold').setHorizontalAlignment('center');
  ws.getRange(EM_MONTH_START,1, EM_MONTH_MAX-EM_MONTH_START+1, 1).setNumberFormat('@');
  ws.getRange(EM_MONTH_START,2, EM_MONTH_MAX-EM_MONTH_START+1, 4).setNumberFormat('"$"#,##0');

  // Section B: PER-CAMPAIGN SCORECARD
  ws.getRange(EM_SC_TITLE,1,1,12).merge().setValue('\u25B8 PER-CAMPAIGN SCORECARD \u2014 every email campaign since launch (newest first)')
    .setBackground('#334155').setFontColor('#E2E8F0').setFontFamily(DPL.TNR).setFontSize(11).setFontWeight('bold').setHorizontalAlignment('left');
  var SHDR=['Send Date','Campaign','Recipients','Delivered','Revenue ($)','RPR ($)','Open %','Click %','Conv %','Unsub %','Spam %','AOV ($)'];
  ws.getRange(EM_SC_HDR,1,1,12).setValues([SHDR])
    .setBackground('#1E293B').setFontColor('#E2E8F0').setFontFamily(DPL.TNR).setFontSize(11).setFontWeight('bold').setHorizontalAlignment('center');

  ws.setColumnWidth(1,110); ws.setColumnWidth(2,250); ws.setColumnWidth(3,95);  ws.setColumnWidth(4,90);
  ws.setColumnWidth(5,100); ws.setColumnWidth(6,95);  ws.setColumnWidth(7,75);  ws.setColumnWidth(8,75);
  ws.setColumnWidth(9,80);  ws.setColumnWidth(10,80); ws.setColumnWidth(11,80); ws.setColumnWidth(12,90);
  ws.setFrozenRows(EM_MONTH_HDR);
  return ws;
}

/** Evidence-based KPI grades (background fill), calibrated to GerberaPrints unit economics:
 *  break-even ROAS ≈ 1.8x (gross margin 65-75%, blended w/ B2G1 dilution + ~4% gateway/Shopify fees
 *  → contribution margin ~55% → 1/0.55 ≈ 1.8; matches the women-line model's 1.8x break-even).
 *  Healthy/holding blended ≈ 2.85x (that model runs ad spend at 35% of revenue = MER 2.85x). */

/** Channel paid-ROAS grade (FB / Google), on ad-spend break-even 1.8x.
 *  WARNING: in Channel Trends these are UTM last-session, which UNDERCOUNTS paid (esp. FB top-funnel)
 *  — a red FB here is an attribution floor, NOT proof of loss. Use 🎯 Campaign Daily (platform-
 *  attributed) for the authoritative per-channel ad grade. */
function _ctRoasColor(v) {
  if (!(v > 0)) return '#94A3B8';   // grey       — no spend / no data
  if (v < 1.8)  return '#DC2626';   // red        — below break-even (losing on this channel)
  if (v < 2.2)  return '#EA580C';   // orange     — above break-even, thin
  if (v < 2.6)  return '#CA8A04';   // amber      — healthy
  if (v < 3.2)  return '#166534';   // dark green — scale-ready
  return '#16A34A';                 // light green— excellent
}

/** Blended MER grade (store rev ÷ total ad spend) — the trustworthy monthly health metric.
 *  Break-even ≈ 1.8x; the brand's own financial model holds MER ≈ 2.85x (ad spend = 35% of rev).
 *  MER carries non-paid rev (organic/email/direct), so its top bar sits a notch above paid ROAS. */
function _ctMerColor(v) {
  if (!(v > 0)) return '#94A3B8';   // grey
  if (v < 1.8)  return '#DC2626';   // red        — ads not covering contribution
  if (v < 2.3)  return '#EA580C';   // orange     — break-even to thin
  if (v < 2.85) return '#CA8A04';   // amber      — approaching modeled-healthy (2.85x)
  if (v < 3.6)  return '#166534';   // dark green — at/above modeled-healthy = strong
  return '#16A34A';                 // light green— excellent
}

/** Email grade — Email Rev ÷ Klaviyo tooling cost, SOURCE-AWARE.
 *  Real Klaviyo-attributed rev (Flows + Campaigns, Placed Order SvcwqH) measured ~$1,333/mo = ~4× the
 *  UTM last-session figure; GP real email ROAS ≈ 16.7×, below the ~$36/$1 industry email ROI
 *  (email under-monetized; flows carry ~91%). REAL bands anchor on that (36× ≈ healthy). When the
 *  📧 Email Rev (Klaviyo) sheet is unfilled, Email Rev falls back to the UTM floor (undercounts ~4×). */
function _ctEmailColor(v, isReal) {
  if (!(v > 0)) return '#94A3B8';            // grey — no email rev attributed this month
  if (isReal) {                              // Klaviyo-attributed (real)
    if (v < 10) return '#DC2626';            // red    — weak
    if (v < 20) return '#EA580C';            // orange — GP current ~16.7× = under-monetized
    if (v < 30) return '#CA8A04';            // amber  — improving
    if (v < 45) return '#166534';            // dark green — at/above ~$36/$1 industry ROI
    return '#16A34A';                        // light green — excellent
  }
  if (v < 3)  return '#DC2626';              // UTM floor (undercounts ~4×) — conservative
  if (v < 6)  return '#EA580C';
  if (v < 10) return '#CA8A04';
  if (v < 15) return '#166534';
  return '#16A34A';
}

function archiveFbPlatformDaily() {
  // Append/upsert FB Ads Daily (per-day platform spend+rev) into a PERMANENT sheet so history survives
  // the ~14-day FB Ads Daily window. Recent ~3 days are provisional (settle ~72h); re-runs update them.
  var ss = _getSSActive(), SH = '\uD83D\uDCC1 FB Platform Archive', TNR = DPL.TNR, TZ = DPL.VN_TZ;
  var wFb = ss.getSheetByName(DPL_FB_SHEET);
  if (!wFb || wFb.getLastRow() < 5) { ss.toast('FB Ads Daily empty', '\uD83D\uDCC1', 6); return; }
  var n = wFb.getLastRow() - 4;
  var dd = wFb.getRange(5, 1, n, 1).getDisplayValues();
  var vv = wFb.getRange(5, 1, n, 14).getValues();
  var agg = {};
  for (var i = 0; i < n; i++) {
    var k = _dplParseDisplayDate(dd[i][0]); if (!k) continue;
    var a = agg[k] || (agg[k] = { spend: 0, impr: 0, clicks: 0, purch: 0, rev: 0 });
    a.spend += parseFloat(vv[i][2]) || 0; a.impr += parseFloat(vv[i][3]) || 0;
    a.clicks += parseFloat(vv[i][5]) || 0; a.purch += parseFloat(vv[i][12]) || 0; a.rev += parseFloat(vv[i][13]) || 0;
  }
  var ws = ss.getSheetByName(SH), existing = {};
  if (ws && ws.getLastRow() > 3) {
    ws.getRange(4, 1, ws.getLastRow() - 3, 7).getValues().forEach(function (r) {
      if (!r[0]) return; var kk = (r[0] instanceof Date) ? Utilities.formatDate(r[0], TZ, 'yyyy-MM-dd') : String(r[0]);
      existing[kk] = { spend: +r[1] || 0, impr: +r[2] || 0, clicks: +r[3] || 0, purch: +r[4] || 0, rev: +r[5] || 0 };
    });
  }
  Object.keys(agg).forEach(function (k) { existing[k] = agg[k]; });   // upsert
  var rows = Object.keys(existing).sort().reverse().map(function (k) {
    var a = existing[k]; return [k, a.spend, a.impr, a.clicks, a.purch, a.rev, (a.spend > 0 ? a.rev / a.spend : 0)];
  });
  ws = ws || ss.insertSheet(SH); ws.clear();
  try { ws.setTabColor('#94A3B8'); } catch (e) {}
  ws.getRange(1, 1, 1, 7).merge().setValue('\uD83D\uDCC1  GerberaPrints \u2014 FB Platform Archive  (permanent daily snapshot)')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(TNR).setFontSize(13).setFontWeight('bold').setHorizontalAlignment('center');
  ws.getRange(2, 1, 1, 7).merge().setValue('Auto-appended daily. FB Ads Daily keeps only ~14 days; this KEEPS history so FB ROAS Recon shows platform ROAS long-term. Recent ~3 days provisional (settle ~72h) \u2014 re-run updates them.')
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(TNR).setFontSize(9).setFontStyle('italic').setWrap(true);
  ws.getRange(3, 1, 1, 7).setValues([['Date', 'FB Spend ($)', 'Impressions', 'Clicks', 'Purchases', 'FB Rev ($)', 'ROAS']])
    .setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(TNR).setFontSize(10).setFontWeight('bold').setHorizontalAlignment('center');
  if (rows.length) {
    ws.getRange(4, 1, rows.length, 7).setValues(rows).setFontFamily(TNR).setFontSize(10).setHorizontalAlignment('center');
    ws.getRange(4, 2, rows.length, 1).setNumberFormat('"$"#,##0');
    ws.getRange(4, 3, rows.length, 3).setNumberFormat('#,##0');
    ws.getRange(4, 6, rows.length, 1).setNumberFormat('"$"#,##0');
    ws.getRange(4, 7, rows.length, 1).setNumberFormat('0.00"x"');
  }
  ws.setFrozenRows(3);
  [92, 96, 88, 66, 78, 96, 62].forEach(function (w, i) { ws.setColumnWidth(i + 1, w); });
  ss.toast('FB archive: ' + rows.length + ' days (' + Object.keys(agg).length + ' upserted)', '\uD83D\uDCC1', 6);
}

function installFbArchiveTrigger() {
  var ss = _getSSActive();
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'archiveFbPlatformDaily') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('archiveFbPlatformDaily').timeBased().everyDays(1).atHour(7).create();
  ss.toast('FB archive trigger installed (daily ~7AM PT)', '\uD83D\uDCC1', 6);
}

function buildFbIncrementalityTest() {
  // Template + calculator to measure FB INCREMENTALITY (the only way to settle last-click vs platform).
  var ss = _getSSActive(), SH = '\uD83E\uDDEA FB Incrementality Test', TNR = DPL.TNR, TZ = DPL.VN_TZ;
  var day = function (d) { return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); };
  var cut = day(new Date(Date.now() - 14 * 864e5));

  // baseline: last 14d avg store rev/day + contribution% (Daily P&L) + FB spend/day (Ad Spend)
  var rev = 0, cost = 0, days = 0;
  var wPL = ss.getSheetByName(DPL.PL);
  if (wPL && wPL.getLastRow() > 5) {
    wPL.getRange(1, 1, wPL.getLastRow(), 18).getValues().forEach(function (p) {
      if (!(p[0] instanceof Date) || isNaN(p[0].getTime())) return; if (day(p[0]) < cut) return;
      rev += parseFloat(p[8]) || 0; cost += (parseFloat(p[14]) || 0) + (parseFloat(p[15]) || 0) + (parseFloat(p[16]) || 0) + (parseFloat(p[17]) || 0); days++;
    });
  }
  var sp = _dplLoadAdSpendSplit(), fbSpend = 0, spDays = 0;
  Object.keys(sp).forEach(function (k) { if (k >= cut) { fbSpend += (sp[k].fb || 0); spDays++; } });
  var revDay = days > 0 ? rev / days : 0;
  var margin = rev > 0 ? (rev - cost) / rev : 0.62;
  var fbDay = spDays > 0 ? fbSpend / spDays : 0;

  var ws = ss.getSheetByName(SH) || ss.insertSheet(SH); ws.clear();
  try { ws.setTabColor('#2563EB'); } catch (e) {}
  var NC = 3;
  ws.getRange(1, 1, 1, NC).merge().setValue('\uD83E\uDDEA  GerberaPrints \u2014 FB Incrementality Test  (measure REAL FB lift)')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(TNR).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1, 30);
  ws.getRange(2, 1, 1, NC).merge().setValue('Attribution (last-click vs platform) can never prove FB\u2019s true value. Only a holdout can. Run ONE method below, fill the yellow Test cells, read the verdict.')
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(TNR).setFontSize(10).setFontStyle('italic').setWrap(true);
  ws.setRowHeight(2, 34);

  var proto = [
    ['\uD83D\uDCCB  PROTOCOL \u2014 pick ONE', '', ''],
    ['A) SPEND-DOWN (easiest)', 'Cut TOTAL FB budget 30\u201350% for 14 days. Compare TOTAL store rev/day vs a matched 14-day baseline (same weekdays, no promo/holiday clash).', ''],
    ['B) GEO-HOLDOUT (cleanest)', 'Turn FB OFF in ~20\u201330% of US states for 14 days. Compare store rev per-capita in OFF states vs ON states (needs state-level rev from Shopify B2C State col).', ''],
    ['Rules', 'Min 14 days (2 full weeks). Avoid Q4/Prime Day/Father\u2019s Day windows. Keep Google/email unchanged. Measure TOTAL store rev, NOT platform-attributed.', ''],
    ['', '', '']
  ];
  var r = 4;
  proto.forEach(function (row) {
    ws.getRange(r, 1, 1, NC).setValues([row]);
    ws.getRange(r, 1).setFontWeight('bold');
    ws.getRange(r, 2, 1, 2).mergeAcross().setWrap(true);
    ws.getRange(r, 1, 1, NC).setFontFamily(TNR).setFontSize(10);
    r++;
  });
  ws.getRange(4, 1, 1, NC).setBackground('#1E293B').setFontColor('#FFFFFF');

  // calculator
  var C = r;   // calculator header row
  ws.getRange(C, 1, 1, NC).merge().setValue('\uD83E\uDDEE  CALCULATOR  (baseline auto-filled from last 14 days; fill yellow Test cells)')
    .setBackground('#1E293B').setFontColor('#FFFFFF').setFontFamily(TNR).setFontSize(11).setFontWeight('bold');
  var rows = [
    ['Baseline Store Rev / day ($)', revDay, 'auto'],
    ['Baseline FB Spend / day ($)', fbDay, 'auto'],
    ['Contribution margin %', margin, 'auto'],
    ['Test Store Rev / day ($)', 0, 'FILL'],
    ['Test FB Spend / day ($)', 0, 'FILL'],
    ['\u0394 Store Rev / day lost ($)', '', 'calc'],
    ['\u0394 FB Spend / day saved ($)', '', 'calc'],
    ['Incremental ROAS', '', 'calc'],
    ['Break-even ROAS', '', 'calc'],
    ['Incremental contribution / day ($)', '', 'calc'],
    ['VERDICT', '', 'calc']
  ];
  var base = C + 1;                          // first data row
  var Rrev = base, Rspd = base + 1, Rmar = base + 2, RtRev = base + 3, RtSpd = base + 4;
  var RdRev = base + 5, RdSpd = base + 6, Rinc = base + 7, Rbe = base + 8, Rcon = base + 9, Rver = base + 10;
  ws.getRange(base, 1, rows.length, 3).setValues(rows).setFontFamily(TNR).setFontSize(11);
  // formulas
  ws.getRange(RdRev, 2).setFormula('=B' + Rrev + '-B' + RtRev);
  ws.getRange(RdSpd, 2).setFormula('=B' + Rspd + '-B' + RtSpd);
  var _tf = 'OR(B' + RtRev + '<=0,B' + RtSpd + '<=0)';
  ws.getRange(Rinc, 2).setFormula('=IF(' + _tf + ',"fill Test cells",IF(B' + RdSpd + '<=0,"set Test spend < baseline",B' + RdRev + '/B' + RdSpd + '))');
  ws.getRange(Rbe, 2).setFormula('=IF(B' + Rmar + '>0,1/B' + Rmar + ',"n/a")');
  ws.getRange(Rcon, 2).setFormula('=IF(' + _tf + ',"",B' + RdRev + '*B' + Rmar + '-B' + RdSpd + ')');
  ws.getRange(Rver, 2).setFormula(
    '=IF(' + _tf + ',"<- run test, fill Test cells",'
    + 'IF(B' + RdSpd + '<=0,"set Test spend < baseline",'
    + 'IF(B' + Rinc + '>=B' + Rbe + ',"FB INCREMENTAL & PROFITABLE - keep/scale",'
    + 'IF(B' + Rinc + '>=1,"FB incremental but THIN - watch margin",'
    + '"FB NOT incremental - cannibalizing organic/other"))))');
  // formats
  ws.getRange(Rrev, 2).setNumberFormat('"$"#,##0.00'); ws.getRange(Rspd, 2).setNumberFormat('"$"#,##0.00');
  ws.getRange(Rmar, 2).setNumberFormat('0.0%');
  ws.getRange(RtRev, 2, 2, 1).setNumberFormat('"$"#,##0.00').setBackground('#FEF9C3');   // yellow input
  ws.getRange(RdRev, 2, 2, 1).setNumberFormat('"$"#,##0.00');
  ws.getRange(Rinc, 2).setNumberFormat('0.00"x"'); ws.getRange(Rbe, 2).setNumberFormat('0.00"x"');
  ws.getRange(Rcon, 2).setNumberFormat('"$"#,##0.00');
  ws.getRange(Rver, 1, 1, 2).setFontWeight('bold').setBackground('#0F172A').setFontColor('#C9A84C');
  ws.getRange(base, 1, rows.length, 1).setFontWeight('bold');
  // ---- B2G1 break-even reference (free polo dilutes margin -> higher break-even than blended) ----
  var b2be = 110 / (110 - 46.5 - 110 * 0.054);   // B2G1 = 3 polos rev $110, COGS $46.50, fees ~5.4%
  var gr = Rver + 2;
  ws.getRange(gr, 1, 1, NC).merge().setValue('\uD83D\uDCA1  B2G1 needs a HIGHER ROAS (free polo dilutes margin)')
    .setBackground('#1E293B').setFontColor('#FFFFFF').setFontFamily(TNR).setFontSize(11).setFontWeight('bold');
  ws.getRange(gr + 1, 1).setValue('Blended break-even ROAS').setFontFamily(TNR).setFontSize(11).setFontWeight('bold');
  ws.getRange(gr + 1, 2).setFormula('=B' + Rbe).setNumberFormat('0.00"x"');
  ws.getRange(gr + 2, 1).setValue('B2G1 break-even ROAS').setFontFamily(TNR).setFontSize(11).setFontWeight('bold');
  ws.getRange(gr + 2, 2).setValue(b2be).setNumberFormat('0.00"x"');
  ws.getRange(gr + 3, 1, 1, NC).merge().setValue('\u2192 B2G1-heavy campaigns must clear ~' + b2be.toFixed(2) + 'x, not the blended bar.').setFontFamily(TNR).setFontSize(10).setFontStyle('italic');

  // ---- GEO-HOLDOUT group calculator (cleaner than spend-down; needs FB OFF in some states) ----
  var geo = gr + 5;
  ws.getRange(geo, 1, 1, NC).merge().setValue('\uD83D\uDDFA  GEO-HOLDOUT (group-level) \u2014 turn FB OFF in some states 14d, fill yellow')
    .setBackground('#1E293B').setFontColor('#FFFFFF').setFontFamily(TNR).setFontSize(11).setFontWeight('bold');
  var grows = [
    ['OFF-states Store Rev / day BASELINE ($)', 0, 'FILL'],
    ['OFF-states Store Rev / day TEST ($)', 0, 'FILL'],
    ['ON-states Store Rev / day BASELINE ($)', 0, 'FILL'],
    ['ON-states Store Rev / day TEST ($)', 0, 'FILL'],
    ['OFF group % drop', '', 'calc'],
    ['ON group % drop', '', 'calc'],
    ['FB lift (OFF drop - ON drop)', '', 'calc'],
    ['VERDICT', '', 'calc']
  ];
  var gb = geo + 1;
  ws.getRange(gb, 1, grows.length, 3).setValues(grows).setFontFamily(TNR).setFontSize(11);
  var GoB = gb, GoT = gb + 1, GnB = gb + 2, GnT = gb + 3, GoD = gb + 4, GnD = gb + 5, GL = gb + 6, GV = gb + 7;
  ws.getRange(GoB, 2, 4, 1).setNumberFormat('"$"#,##0.00').setBackground('#FEF9C3');
  ws.getRange(GoD, 2).setFormula('=IF(B' + GoB + '<=0,"n/a",IF(B' + GoT + '<=0,"fill test",(B' + GoB + '-B' + GoT + ')/B' + GoB + '))').setNumberFormat('0.0%');
  ws.getRange(GnD, 2).setFormula('=IF(B' + GnB + '<=0,"n/a",IF(B' + GnT + '<=0,"fill test",(B' + GnB + '-B' + GnT + ')/B' + GnB + '))').setNumberFormat('0.0%');
  ws.getRange(GL, 2).setFormula('=IF(AND(ISNUMBER(B' + GoD + '),ISNUMBER(B' + GnD + ')),B' + GoD + '-B' + GnD + ',"n/a")').setNumberFormat('0.0%');
  ws.getRange(GV, 2).setFormula('=IF(B' + GoB + '<=0,"fill baseline",IF(B' + GL + '>0.03,"FB INCREMENTAL - OFF states dropped more",IF(B' + GL + '>-0.03,"INCONCLUSIVE - lift too small","FB NOT incremental")))');
  ws.getRange(GV, 1, 1, 2).setFontWeight('bold').setBackground('#0F172A').setFontColor('#C9A84C');
  ws.getRange(gb, 1, grows.length, 1).setFontWeight('bold');

  // ---- top states by revenue (last 30d) to pick the OFF group ----
  var stRev = {}, cut30 = day(new Date(Date.now() - 30 * 864e5));
  var wB = ss.getSheetByName(DPL.B2C);
  if (wB && wB.getLastRow() > 2) {
    wB.getRange(1, 1, wB.getLastRow(), 16).getValues().forEach(function (b) {
      if (!(b[0] instanceof Date) || isNaN(b[0].getTime()) || day(b[0]) < cut30) return;
      var st = (b[5] || '').toString().trim(); if (!st) return;
      stRev[st] = (stRev[st] || 0) + (parseFloat(b[15]) || 0);
    });
  }
  var topSt = Object.keys(stRev).sort(function (a, b) { return stRev[b] - stRev[a]; }).slice(0, 15);
  var ts = GV + 3;
  ws.getRange(ts, 1, 1, NC).merge().setValue('\uD83D\uDCCD  Top states by revenue (last 30 days) \u2014 pick your OFF group from high-volume states')
    .setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(TNR).setFontSize(10).setFontWeight('bold');
  ws.getRange(ts + 1, 1, 1, 2).setValues([['State', 'Rev 30d ($)']]).setFontWeight('bold').setFontFamily(TNR).setFontSize(10);
  if (topSt.length) {
    ws.getRange(ts + 2, 1, topSt.length, 2).setValues(topSt.map(function (x) { return [x, stRev[x]]; })).setFontFamily(TNR).setFontSize(10);
    ws.getRange(ts + 2, 2, topSt.length, 1).setNumberFormat('"$"#,##0');
  }

  ws.setColumnWidth(1, 260); ws.setColumnWidth(2, 220); ws.setColumnWidth(3, 380);
  ss.toast('Incrementality template ready (spend-down + B2G1 + geo-holdout + top states).', '\uD83E\uDDEA', 6);
}

function buildFbRoasRecon() {
  // Reconcile FB ROAS across 3 lenses + break-even + halo, monthly AND daily.
  //   LC (last-click, UTM)  = B2C Source='Facebook' rev / FB spend  -> floor (under-credits FB)
  //   Plat (platform)       = FB Ads Daily rev / FB spend           -> matches Ads Manager (over-credits, view-through)
  //   Break-even ROAS       = RevRec / (RevRec - COGS - Processing - Txn)  (from Daily P&L)
  //   Halo gap              = ROAS Plat - ROAS LC = demand FB creates that converts on other last-click paths
  var ss = _getSSActive(), SH = '\uD83D\uDD35 FB ROAS Recon';
  var TZ = DPL.VN_TZ, day = function (d) { return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); };

  // --- FB spend (recon = platform, per day) ---
  var sp = _dplLoadAdSpendSplit(), spendD = {};
  Object.keys(sp).forEach(function (k) { spendD[k] = (sp[k].fb || 0); });

  // --- FB last-click rev per day (B2C Source='Facebook') ---
  var lcD = {};
  var wB2C = ss.getSheetByName(DPL.B2C);
  if (wB2C && wB2C.getLastRow() > 2) {
    var b = wB2C.getRange(1, 1, wB2C.getLastRow(), 27).getValues();
    for (var i = 0; i < b.length; i++) {
      var d = b[i][0]; if (!(d instanceof Date) || isNaN(d.getTime())) continue;
      var src = (b[i][26] || '').toString().toLowerCase();
      if (src.indexOf('facebook') < 0) continue;
      var k = day(d); lcD[k] = (lcD[k] || 0) + (parseFloat(b[i][15]) || 0);
    }
  }

  // --- FB platform rev per day: ARCHIVE (permanent history) overlaid with FB Ads Daily (freshest ~14d) ---
  var platD = {};
  var wArch = ss.getSheetByName('\uD83D\uDCC1 FB Platform Archive');
  if (wArch && wArch.getLastRow() > 3) {
    var av = wArch.getRange(4, 1, wArch.getLastRow() - 3, 6).getValues();
    av.forEach(function (rr) { var k = (rr[0] instanceof Date) ? Utilities.formatDate(rr[0], TZ, 'yyyy-MM-dd') : String(rr[0]); if (k) platD[k] = parseFloat(rr[5]) || 0; });
  }
  var wFb = ss.getSheetByName(DPL_FB_SHEET);
  if (wFb && wFb.getLastRow() >= 5) {
    var n = wFb.getLastRow() - 4;
    var dd = wFb.getRange(5, 1, n, 1).getDisplayValues();
    var rv = wFb.getRange(5, 14, n, 1).getValues();
    var fresh = {};
    for (var j = 0; j < n; j++) { var kk = _dplParseDisplayDate(dd[j][0]); if (!kk) continue; fresh[kk] = (fresh[kk] || 0) + (parseFloat(rv[j][0]) || 0); }
    Object.keys(fresh).forEach(function (k) { platD[k] = fresh[k]; });   // fresh overwrites archived for recent days
  }

  // --- break-even inputs per day (Daily P&L: RevRec[8] COGS[14] ProcAWX[15] ProcPP[16] Txn[17]) ---
  var beD = {};
  var wPL = ss.getSheetByName(DPL.PL);
  if (wPL && wPL.getLastRow() > 5) {
    var p = wPL.getRange(1, 1, wPL.getLastRow(), 18).getValues();
    for (var q = 0; q < p.length; q++) {
      var pd = p[q][0]; if (!(pd instanceof Date) || isNaN(pd.getTime())) continue;
      var k2 = day(pd);
      beD[k2] = { rev: parseFloat(p[q][8]) || 0, cost: (parseFloat(p[q][14]) || 0) + (parseFloat(p[q][15]) || 0) + (parseFloat(p[q][16]) || 0) + (parseFloat(p[q][17]) || 0) };
    }
  }
  var beROAS = function (o) { if (!o || o.rev <= 0) return ''; var c = o.rev - o.cost; return c > 0 ? o.rev / c : ''; };

  // --- roll a day-map to month-map ---
  var toM = function (mObj) { var o = {}; Object.keys(mObj).forEach(function (k) { var m = k.slice(0, 7); o[m] = (o[m] || 0) + mObj[k]; }); return o; };
  var spendM = toM(spendD), lcM = toM(lcD), platRevM = toM(platD);
  // Platform data (FB Ads Daily) retained only ~14d. 'covered spend' = spend on days that HAVE platform data,
  // so ROAS Plat = plat rev / covered spend (apples-to-apples). Periods with no coverage -> Plat/Verdict = n/a.
  var covSpendD = {}; Object.keys(platD).forEach(function (k) { covSpendD[k] = spendD[k] || 0; });
  var covSpendM = toM(covSpendD);
  var beM = {}; Object.keys(beD).forEach(function (k) { var m = k.slice(0, 7); (beM[m] = beM[m] || { rev: 0, cost: 0 }); beM[m].rev += beD[k].rev; beM[m].cost += beD[k].cost; });

  // --- verdict (ROAS Plat vs break-even; blank plat -> n/a) ---
  var CLR = { scale: ['#15803D', '#FFFFFF'], profit: ['#4ADE80', '#14532D'], border: ['#FACC15', '#713F12'], below: ['#DC2626', '#FFFFFF'], na: ['#F1F5F9', '#64748B'] };
  var verdict = function (plat, be) {
    if (!(be > 0) || plat === '' || !(plat > 0)) return ['n/a', CLR.na];
    if (plat >= be * 1.25) return ['SCALE', CLR.scale];
    if (plat >= be) return ['PROFIT', CLR.profit];
    if (plat >= be * 0.8) return ['BORDERLINE', CLR.border];
    return ['BELOW BE - fix', CLR.below];
  };

  // --- monthly rows (Plat aligned to covered days; n/a where FB Ads Daily has no data for that month) ---
  var mKeys = Object.keys(spendM).concat(Object.keys(lcM))
    .filter(function (v, i, a) { return a.indexOf(v) === i; }).sort().reverse();
  var monthly = mKeys.map(function (k) {
    var spd = spendM[k] || 0, lc = lcM[k] || 0, csp = covSpendM[k] || 0, prev = platRevM[k] || 0;
    var lcR = spd > 0 ? lc / spd : '';
    var plCell = csp > 0 ? prev : '', plR = csp > 0 ? prev / csp : '';
    var be = beROAS(beM[k]);
    var halo = (plR !== '' && lcR !== '') ? plR - lcR : '';
    return [k, spd, lc, lcR, plCell, plR, be, halo];
  });

  // --- daily rows (last 90d; Plat only on covered days = ~14d, else n/a) ---
  var dCutoff = day(new Date(Date.now() - 90 * 864e5));
  var dKeys = Object.keys(spendD).concat(Object.keys(lcD)).concat(Object.keys(platD))
    .filter(function (v, i, a) { return a.indexOf(v) === i && v >= dCutoff; }).sort().reverse();
  var daily = dKeys.map(function (k) {
    var spd = spendD[k] || 0, lc = lcD[k] || 0, hasPlat = platD.hasOwnProperty(k);
    var lcR = spd > 0 ? lc / spd : '';
    var plCell = hasPlat ? platD[k] : '', plR = (hasPlat && spd > 0) ? platD[k] / spd : '';
    var be = beROAS(beD[k]);
    var halo = (plR !== '' && lcR !== '') ? plR - lcR : '';
    return [k, spd, lc, lcR, plCell, plR, be, halo];
  });

  // --- write (DAILY left | MONTHLY right; compact 7-col; drops $ rev cols) ---
  try { var oldDup = ss.getSheetByName('U0001F535 FB ROAS Recon'); if (oldDup) ss.deleteSheet(oldDup); } catch (e) {}
  var ws = ss.getSheetByName(SH) || ss.insertSheet(SH); ws.clear();
  try { ws.setTabColor('#2563EB'); } catch (e) {}
  var TNR = DPL.TNR, USD = '"$"#,##0', RX = '0.00"x"';
  var HDR = ['Period', 'FB Spend', 'ROAS LC', 'ROAS Plat', 'Break-even', 'Halo', 'Verdict'];
  var W = 7, MC = W + 2, TOTC = W * 2 + 1;   // MONTHLY starts col I(9); gap col H(8)
  ws.getRange(1, 1, 1, TOTC).merge().setValue('\uD83D\uDD35  GerberaPrints \u2014 FB ROAS Reconciliation  (DAILY left \u00b7 MONTHLY right)')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(TNR).setFontSize(13).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1, 28);
  ws.getRange(2, 1, 1, TOTC).merge().setValue('LC = last-click FLOOR (under-credits FB). Plat = platform CEILING (matches Ads Manager; ~14d window, older = n/a). Break-even = 1/margin. Halo = Plat - LC (demand FB sends to other channels). Verdict on Plat vs break-even; decide on settled aggregate (drop last ~3 days).')
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(TNR).setFontSize(9).setFontStyle('italic').setWrap(true);
  ws.setRowHeight(2, 40);

  var renderBlock = function (c0, label, rows) {
    ws.getRange(3, c0, 1, W).merge().setValue(label).setBackground('#1E293B').setFontColor('#FFFFFF').setFontFamily(TNR).setFontSize(11).setFontWeight('bold');
    ws.getRange(4, c0, 1, W).setValues([HDR]).setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(TNR).setFontSize(10).setFontWeight('bold').setHorizontalAlignment('center');
    if (!rows.length) { ws.getRange(5, c0).setValue('(no data)').setFontFamily(TNR); return; }
    var body = [], lcBg = [], lcFc = [], plBg = [], plFc = [], vBg = [], vFc = [];
    rows.forEach(function (x) {
      var vd = verdict(x[5], x[6]);
      body.push([x[0], x[1], x[3], x[5], x[6], x[7], vd[0]]);
      var gl = (x[3] === '' || !(x[3] >= 0)) ? { bg: '#F1F5F9', fg: '#64748B' } : _kpiByKey(x[3], 'roas');
      var gp = (x[5] === '' || !(x[5] >= 0)) ? { bg: '#F1F5F9', fg: '#64748B' } : _kpiByKey(x[5], 'roas');
      lcBg.push([gl.bg]); lcFc.push([gl.fg]); plBg.push([gp.bg]); plFc.push([gp.fg]); vBg.push([vd[1][0]]); vFc.push([vd[1][1]]);
    });
    var nr = body.length;
    ws.getRange(5, c0, nr, W).setValues(body).setFontFamily(TNR).setFontSize(10).setHorizontalAlignment('center');
    ws.getRange(5, c0 + 1, nr, 1).setNumberFormat(USD);
    ws.getRange(5, c0 + 2, nr, 4).setNumberFormat(RX);   // ROAS LC, ROAS Plat, BE, Halo
    ws.getRange(5, c0 + 2, nr, 1).setBackgrounds(lcBg).setFontColors(lcFc).setFontWeight('bold');
    ws.getRange(5, c0 + 3, nr, 1).setBackgrounds(plBg).setFontColors(plFc).setFontWeight('bold');
    ws.getRange(5, c0 + 6, nr, 1).setBackgrounds(vBg).setFontColors(vFc).setFontWeight('bold');
  };

  renderBlock(1, '\uD83D\uDCC6 DAILY (last 90 days)', daily);
  renderBlock(MC, '\uD83D\uDCC5 MONTHLY', monthly);
  ws.setFrozenRows(4);
  var wds = [70, 66, 64, 64, 72, 58, 104];
  wds.forEach(function (w, i) { ws.setColumnWidth(1 + i, w); ws.setColumnWidth(MC + i, w); });
  ws.setColumnWidth(W + 1, 20);
  ss.toast('FB Recon: ' + daily.length + ' days | ' + monthly.length + ' mo (side-by-side)', '\uD83D\uDD35', 6);
}

function buildFbCoverageAudit() {
  // WHAT FB IS ACTUALLY RECORDING. The syncs keep only campaigns whose NAME matches a GP marker
  // (_fbaIsGP); everything else is silently DROPPED -> that spend is real but never reaches the CRM.
  // This sheet lists every ad account and every campaign of the last 30 days with KEPT / DROPPED + spend,
  // so blind spots (typo'd campaign names, new accounts, non-GP campaigns) become visible.
  var ss = _getSSActive(), SH = '\uD83D\uDD0D FB Coverage Audit', TNR = DPL.TNR;
  if (typeof _fbaAccountIds !== 'function' || typeof _fbaInsightsAll !== 'function') {
    ss.toast('FB_Ads_Daily.gs not found in this project.', '\uD83D\uDD0D', 8); return;
  }
  var ids = _fbaAccountIds();
  if (!ids.length) { ss.toast('No FB ad accounts configured (FB Ads > Setup).', '\uD83D\uDD0D', 8); return; }
  var markers = _fbaCampaignMarkers();
  var rate = _fbaVndRate();

  var now = new Date();
  var until = new Date(now.getTime() - 864e5);
  var since = new Date(until.getTime() - 29 * 864e5);
  var fmt = function (d) { return Utilities.formatDate(d, FBA.TZ_PST, 'yyyy-MM-dd'); };

  var accts = [], camps = [], errs = [];
  ids.forEach(function (id) {
    var name = 'act_' + id, cur = 'USD';
    try { var m = _fbaApiCall('/act_' + id, { fields: 'name,currency' }); name = m.name || name; cur = m.currency || 'USD'; }
    catch (e) { errs.push('act_' + id + ': ' + e.message.slice(0, 60)); }
    var aSpend = 0, aKept = 0, aDropped = 0;
    try {
      _fbaInsightsAll('/act_' + id + '/insights', {
        level: 'campaign',
        time_range: JSON.stringify({ since: fmt(since), until: fmt(until) }),
        fields: 'campaign_name,spend,impressions',
        limit: 300
      }).forEach(function (it) {
        var cn = it.campaign_name || '(unnamed)';
        var sp = _fbaToUSD(parseFloat(it.spend) || 0, cur, rate);
        var kept = _fbaIsGP(cn, markers);
        aSpend += sp; if (kept) aKept += sp; else aDropped += sp;
        camps.push([cn, name, sp, parseInt(it.impressions) || 0, kept ? 'KEPT' : 'DROPPED']);
      });
    } catch (e) { errs.push('act_' + id + ' insights: ' + e.message.slice(0, 60)); }
    accts.push([id, name, cur, aSpend, aKept, aDropped, aSpend > 0 ? aKept / aSpend : 0]);
    Utilities.sleep(300);
  });
  camps.sort(function (a, b) { return b[2] - a[2]; });
  accts.sort(function (a, b) { return b[3] - a[3]; });
  var totAll = 0, totKept = 0;
  accts.forEach(function (a) { totAll += a[3]; totKept += a[4]; });
  // Only ACTIVE accounts (spend in window) belong in the table; idle ones are noise (FoxWears, TK-Error...).
  var idle = accts.filter(function (a) { return !(a[3] > 0); }).length;
  accts = accts.filter(function (a) { return a[3] > 0; });
  // Dropped spend is EXPECTED when another brand shares the ad account (e.g. Gritfell). Not a bug.
  var dropList = {};
  camps.forEach(function (c) { if (c[4] === 'DROPPED' && c[2] > 0) { var b = c[0].split('/')[0].trim() || '(unnamed)'; dropList[b] = (dropList[b] || 0) + c[2]; } });
  var dropTxt = Object.keys(dropList).sort(function (x, y) { return dropList[y] - dropList[x]; })
    .map(function (b) { return b + ' $' + Math.round(dropList[b]); }).join(' \u00b7 ');

  var ws = ss.getSheetByName(SH) || ss.insertSheet(SH); ws.clear();
  try { ws.setTabColor('#0EA5E9'); } catch (e) {}
  var NC = 7, USD = '"$"#,##0.00', PCT = '0.0%';
  ws.getRange(1, 1, 1, NC).merge().setValue('\uD83D\uDD0D  GerberaPrints \u2014 FB Coverage Audit  (what the CRM actually records \u00b7 last 30 days)')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(TNR).setFontSize(13).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1, 28);
  ws.getRange(2, 1, 1, NC).merge().setValue('The FB syncs keep ONLY campaigns whose name matches a GP marker \u2014 current markers: [ ' + markers.join(' , ') + ' ]. '
    + 'Everything else is DROPPED: that spend is REAL but never enters Daily/Monthly P&L, MER, ROAS or nCAC. A DROPPED row with spend = a blind spot (rename the campaign, or add its marker in FB Ads > Setup). '
    + 'Coverage = kept spend / total spend; anything under 100% means the CRM is under-counting your ad cost.')
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(TNR).setFontSize(9).setFontStyle('italic').setWrap(true);
  ws.setRowHeight(2, 44);

  var r = 3;
  var covPct = totAll > 0 ? totKept / totAll : 0;
  ws.getRange(r, 1, 1, NC).merge().setValue('\uD83D\uDCCA  GerberaPrints spend recorded: $' + Math.round(totKept)
    + '   \u00b7   Excluded (other brands / non-GP): $' + Math.round(totAll - totKept)
    + (dropTxt ? '  \u2192  ' + dropTxt : '')
    + '   \u00b7   ' + (covPct * 100).toFixed(1) + '% of spend on these accounts is GP')
    .setBackground('#15803D').setFontColor('#FFFFFF')
    .setFontFamily(TNR).setFontSize(11).setFontWeight('bold').setHorizontalAlignment('center');
  r++;
  ws.getRange(r, 1, 1, NC).merge().setValue('\u2713 Excluded spend is CORRECT when it belongs to another brand sharing the ad account (it must NOT hit GerberaPrints P&L). '
    + 'It is only a BUG if a real GerberaPrints campaign shows as DROPPED below \u2014 then rename it to match a marker, or add the marker in FB Ads \u203a Setup. '
    + (idle ? idle + ' idle account(s) with $0 spend hidden. ' : '') + (errs.length ? '\u26A0 ' + errs.length + ' API error(s) \u2014 see Logs.' : ''))
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(TNR).setFontSize(9).setFontStyle('italic').setWrap(true);
  ws.setRowHeight(r, 30);
  r += 2;

  ws.getRange(r, 1, 1, NC).merge().setValue('\uD83C\uDFE2  AD ACCOUNTS').setBackground('#1E293B').setFontColor('#FFFFFF').setFontFamily(TNR).setFontSize(11).setFontWeight('bold'); r++;
  ws.getRange(r, 1, 1, NC).setValues([['Account ID', 'Account Name', 'Currency', 'Spend 30d ($)', 'GP Kept ($)', 'Other-brand ($)', '% GP']])
    .setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(TNR).setFontSize(10).setFontWeight('bold').setHorizontalAlignment('center'); r++;
  if (accts.length) {
    ws.getRange(r, 1, accts.length, 1).setNumberFormat('@');   // TEXT -> kills 1.53765E+15
    ws.getRange(r, 1, accts.length, NC).setValues(accts).setFontFamily(TNR).setFontSize(10).setHorizontalAlignment('center');
    ws.getRange(r, 4, accts.length, 3).setNumberFormat(USD);
    ws.getRange(r, 7, accts.length, 1).setNumberFormat(PCT);
    var cb = [], cf = [];
    accts.forEach(function (a) {
      var ok = a[6] >= 0.995;
      cb.push([ok ? '#15803D' : '#FACC15']);           // mixed-brand account = amber (info), NOT red
      cf.push([ok ? '#FFFFFF' : '#713F12']);
    });
    ws.getRange(r, 7, accts.length, 1).setBackgrounds(cb).setFontColors(cf).setFontWeight('bold');
    r += accts.length;
  } else {
    ws.getRange(r, 1).setValue('(no account had spend in the window)').setFontFamily(TNR); r++;
  }
  r += 2;

  ws.getRange(r, 1, 1, NC).merge().setValue('\uD83C\uDFAF  CAMPAIGNS (last 30d \u00b7 by spend)').setBackground('#1E293B').setFontColor('#FFFFFF').setFontFamily(TNR).setFontSize(11).setFontWeight('bold'); r++;
  ws.getRange(r, 1, 1, 5).setValues([['Campaign', 'Account', 'Spend 30d ($)', 'Impressions', 'Status  (DROPPED = not GerberaPrints)']])
    .setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(TNR).setFontSize(10).setFontWeight('bold').setHorizontalAlignment('center'); r++;
  if (camps.length) {
    ws.getRange(r, 1, camps.length, 5).setValues(camps).setFontFamily(TNR).setFontSize(10);
    ws.getRange(r, 3, camps.length, 1).setNumberFormat(USD);
    ws.getRange(r, 4, camps.length, 1).setNumberFormat('#,##0');
    ws.getRange(r, 3, camps.length, 3).setHorizontalAlignment('center');
    var sb = [], sf = [];
    camps.forEach(function (c) {
      var kept = c[4] === 'KEPT';
      // DROPPED with spend = amber: check it truly is another brand. Red would imply a bug it may not be.
      sb.push([kept ? '#15803D' : (c[2] > 0 ? '#FACC15' : '#F1F5F9')]);
      sf.push([kept ? '#FFFFFF' : (c[2] > 0 ? '#713F12' : '#64748B')]);
    });
    ws.getRange(r, 5, camps.length, 1).setBackgrounds(sb).setFontColors(sf).setFontWeight('bold');
    r += camps.length;
  } else {
    ws.getRange(r, 1).setValue('(no campaigns returned)').setFontFamily(TNR);
  }
  errs.forEach(function (e) { Logger.log('[fb audit] ' + e); });
  ws.setFrozenRows(2);
  [300, 170, 110, 110, 100, 100, 84].forEach(function (w, i) { ws.setColumnWidth(i + 1, w); });
  ss.toast('FB Coverage: ' + (totAll > 0 ? (totKept / totAll * 100).toFixed(1) : 0) + '% \u00b7 ' + accts.length + ' acct \u00b7 ' + camps.length + ' campaigns', '\uD83D\uDD0D', 8);
}

function buildNcacReport() {
  // New-Customer Acquisition Cost per month = (FB+Google spend) / NEW customers (first-ever order by email).
  // The acquisition metric MER hides. Blended (incl. retargeting) & all-source new custs. Lower = better.
  var ss = _getSSActive(), SH = '📊 nCAC';
  var wsB2C = ss.getSheetByName(DPL.B2C);
  if (!wsB2C || wsB2C.getLastRow() < 3) { ss.toast('Shopify B2C empty \u2014 sync first.', '👥', 6); return; }

  // B2C: Date col A(0), Email col D(3). first-order-ms per email + orders per month.
  var vals = wsB2C.getRange(1, 1, wsB2C.getLastRow(), 4).getValues();
  var firstMs = {}, ordByM = {};
  for (var i = 0; i < vals.length; i++) {
    var d = vals[i][0], em = (vals[i][3] || '').toString().trim().toLowerCase();
    if (!(d instanceof Date) || isNaN(d.getTime()) || !em) continue;
    var t = d.getTime();
    if (firstMs[em] === undefined || t < firstMs[em]) firstMs[em] = t;
    var mk = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM');
    ordByM[mk] = (ordByM[mk] || 0) + 1;
  }
  var newByM = {};
  Object.keys(firstMs).forEach(function (em) {
    var mk = Utilities.formatDate(new Date(firstMs[em]), DPL.VN_TZ, 'yyyy-MM');
    newByM[mk] = (newByM[mk] || 0) + 1;
  });

  var sp = _dplLoadAdSpendSplit(), spendByM = {};
  Object.keys(sp).forEach(function (dk) {
    var mk = dk.slice(0, 7), x = sp[dk];
    spendByM[mk] = (spendByM[mk] || 0) + (x.fb || 0) + (x.ga || 0);
  });

  var mset = {};
  Object.keys(ordByM).forEach(function (m) { mset[m] = 1; });
  Object.keys(spendByM).forEach(function (m) { mset[m] = 1; });
  var out = Object.keys(mset).sort().map(function (m) {
    var nc = newByM[m] || 0, ord = ordByM[m] || 0, spend = spendByM[m] || 0;
    return [m, nc, ord, (ord > 0 ? nc / ord : 0), spend, (nc > 0 ? spend / nc : '')];   // blank nCAC when 0 new custs (truncated/no-data)
  });
  out.reverse();   // newest first

  var ws = ss.getSheetByName(SH) || ss.insertSheet(SH);
  ws.clear();
  var NC = 6, TNR = DPL.TNR;
  ws.getRange(1, 1, 1, NC).merge().setValue('👥  GerberaPrints \u2014 nCAC  (New-Customer Acquisition Cost)')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(TNR).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1, 30);
  ws.getRange(2, 1, 1, NC).merge().setValue(
    'nCAC = (FB + Google spend) \u00f7 NEW customers that month (first-ever order by email). The acquisition metric MER hides. '
    + 'Lower = better; bands TUNABLE to your LTV/repeat rate. CAVEATS: needs full B2C history (earliest month over-counts new custs if truncated); '
    + 'guest orders without email excluded; spend is TOTAL ad (prospecting-only nCAC needs campaign classification); new custs are ALL-source (not ad-attributed).')
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(TNR).setFontSize(9).setFontStyle('italic').setWrap(true);
  ws.setRowHeight(2, 46);
  ws.getRange(3, 1, 1, NC).setValues([['Month', 'New Customers', 'Orders', 'New % of Orders', 'Ad Spend FB+G ($)', 'nCAC ($)']])
    .setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(TNR).setFontSize(11).setFontWeight('bold').setHorizontalAlignment('center');
  if (out.length) {
    ws.getRange(4, 1, out.length, NC).setValues(out).setFontFamily(TNR).setFontSize(11).setHorizontalAlignment('center');
    ws.getRange(4, 2, out.length, 2).setNumberFormat('#,##0');
    ws.getRange(4, 4, out.length, 1).setNumberFormat('0.0%');
    ws.getRange(4, 5, out.length, 1).setNumberFormat('"$"#,##0');
    ws.getRange(4, 6, out.length, 1).setNumberFormat('"$"#,##0.00');
    var bg = [], fc = [];
    out.forEach(function (r) {
      if (!(r[5] > 0)) { bg.push(['#F1F5F9']); fc.push(['#64748B']); }   // 0 new custs => grey n/a, NOT green
      else { var g = _kpiByKey(r[5], 'ncac'); bg.push([g.bg]); fc.push([g.fg]); }
    });
    ws.getRange(4, 6, out.length, 1).setBackgrounds(bg).setFontColors(fc).setFontWeight('bold');
  }
  ws.setFrozenRows(3);
  [70, 110, 80, 120, 130, 100].forEach(function (w, i) { ws.setColumnWidth(i + 1, w); });
  ss.toast('nCAC report: ' + out.length + ' months', '👥', 6);
}

function buildChannelTrends() {
  var ss = _getSSActive();
  var ws = ss.getSheetByName('📈 Channel Trends') || ss.insertSheet('📈 Channel Trends');
  _dplResetSheet(ws);
  ss.toast('Building Channel Trends…', '📈', 30);
  try { dplRollupAdSpend(); } catch(e) {}

  var from = new Date(2025, 4, 1);                         // 2025-05-01 launch (match Monthly P&L)
  var to = new Date();                                     // through NOW — project-tz midnight is only ~10am Pacific and would truncate today's later orders

  var ad     = _ctAdSpendByMonth();                        // {mk:{fb,ga}} real spend
  var rev    = _ctStoreRevByMonth(from, to);              // {mk: total store revenue}
  var chRev  = _ctRealChannelRevByMonth(from, to);        // {mk:{Facebook,Google,Email,Organic,Direct/Unknown,…}} REAL rev by source
  var kvCost = _ctKlaviyoCostByMonth();                   // {mk: Klaviyo cost} from 💰 Cost Tracker
  _ctEnsureEmailRevSheet();
  var realEm = _ctEmailRealRevByMonth();                  // {mk: REAL Klaviyo email rev} from 📧 sheet (else UTM)

  var months = [];
  var cur = _dplAnchor(from.getFullYear(), from.getMonth(), 1);
  var endM = _dplAnchor(to.getFullYear(), to.getMonth(), 1);
  while (cur <= endM) { months.push(Utilities.formatDate(cur, DPL.VN_TZ, 'yyyy-MM')); cur.setUTCMonth(cur.getUTCMonth() + 1); }

  var NCOLS = 16, USD = '"$"#,##0', RX = '0.00"x"';
  var stamp = Utilities.formatDate(new Date(), DPL.VN_TZ, 'dd/MM/yyyy HH:mm');
  ws.getRange(1,1,1,NCOLS).merge()
    .setValue('📈  GerberaPrints — Channel Trends  (REAL revenue by source · per-channel ROAS · Email)')
    .setBackground('#0F172A').setFontColor('#C9A84C')
    .setFontFamily(DPL.TNR).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1,34);
  ws.getRange(2,1,1,NCOLS).merge()
    .setValue('Updated: ' + stamp + ' PT  ·  Rev by channel = orders whose LAST-SESSION landing source was that channel (UTM truth, NOT platform-claimed).  ' +
              'Per-channel ROAS = that channel\u2019s real rev \u00f7 its spend \u2014 use 🎯 Campaign Daily for scale/kill decisions.  ' +
              'Email Rev = UTM last-click (dedup; same lens as other channels, so the row reconciles to Store Rev). Klaviyo-attributed email % + per-campaign verdicts live in 📧 Email & SMS Performance.  ' +
              'Blended MER = store rev / total ad spend.  KPI badge (break-even ~1.8x, healthy ~2.85x): MER (bar >=ROAS, counts Email/SMS) red <2.5 / orange <3 / amber <3.5 / dark green <4 / green >=4.  Ad ROAS FB+Google (UTM floor; use 🎯 Campaign Daily for platform truth) red <1.8 / <2.2 / <2.6 / <3.2 / green >=3.2.  Email column = UTM last-click (does NOT double-count; sums into Store Rev with the other channels).  The Klaviyo program lens (~8% incl. flows) and its 20% target live in 📧 Email & SMS Performance.')
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(DPL.TNR).setFontSize(9).setFontStyle('italic').setWrap(true);
  ws.setRowHeight(2,58); ws.setRowHeight(3,6);

  var headers = ['Month','Store Rev ($)','Total Ad ($)','Blended MER',
                 'FB Rev ($)','FB Spend ($)','FB ROAS',
                 'Google Rev ($)','Google Spend ($)','Google ROAS',
                 'Email Rev (UTM)','Email % (UTM)',
                 'Organic/Direct ($)','Pinterest Rev ($)','TikTok Rev ($)','Other Rev ($)'];
  ws.getRange(4,1,1,NCOLS).setValues([headers])
    .setBackground('#1E293B').setFontColor('#E2E8F0').setFontFamily(DPL.TNR).setFontSize(11)
    .setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  ws.setRowHeight(4,30);

  var out = [], emSrc = [];   // emSrc[i] = true when that month's Email Rev is real Klaviyo (not UTM)
  months.forEach(function(mk){
    var a = ad[mk] || { fb:0, ga:0 };
    var c = chRev[mk] || {};
    var sr = rev[mk] || 0;
    var tot = a.fb + a.ga;
    var mer = tot > 0 ? sr / tot : 0;
    var fbR = c['Facebook'] || 0, gaR = c['Google'] || 0;
    var emIsReal = false;                                 // FIX v27.55: Channel Trends Email is now ALWAYS UTM last-click
    var emR = c['Email'] || 0;                            // same lens as other channels -> reconciles to Store Rev (no double-count). Klaviyo % lives in '📧 Email & SMS Performance'.
    var orgR = c['Organic'] || 0, dirR = c['Direct/Unknown'] || 0;
    var pinR = c['Pinterest'] || 0, tikR = c['TikTok'] || 0, othR = c['Other'] || 0;
    var emC = kvCost[mk] || 0;
    var fbRoas = a.fb > 0 ? fbR / a.fb : 0;
    var gaRoas = a.ga > 0 ? gaR / a.ga : 0;
    var emShare = sr > 0 ? emR / sr : 0;   // email as % of store revenue (replaces meaningless 'ROAS')
    var label = Utilities.formatDate(_dplAnchor(parseInt(mk.substring(0,4),10), parseInt(mk.substring(5,7),10)-1, 1), DPL.VN_TZ, 'MMM yyyy');
    emSrc.push(emIsReal);
    out.push([label, sr, tot, mer, fbR, a.fb, fbRoas, gaR, a.ga, gaRoas, emR, emShare, (orgR + dirR), pinR, tikR, othR]);
  });
  out.reverse(); emSrc.reverse();   // newest on top

  var sr0 = 5;
  if (out.length) {
    ws.getRange(sr0,1,out.length,NCOLS).setValues(out).setFontFamily(DPL.TNR).setFontSize(11);
    ws.getRange(sr0,2,out.length,2).setNumberFormat(USD);    // Store Rev, Total Ad
    ws.getRange(sr0,4,out.length,1).setNumberFormat(RX);     // Blended MER
    ws.getRange(sr0,5,out.length,2).setNumberFormat(USD);    // FB Rev, FB Spend
    ws.getRange(sr0,7,out.length,1).setNumberFormat(RX);     // FB ROAS
    ws.getRange(sr0,8,out.length,2).setNumberFormat(USD);    // Google Rev, Google Spend
    ws.getRange(sr0,10,out.length,1).setNumberFormat(RX);    // Google ROAS
    ws.getRange(sr0,11,out.length,1).setNumberFormat(USD);   // Email Rev
    ws.getRange(sr0,12,out.length,1).setNumberFormat('0.0%');  // Email % Store
    ws.getRange(sr0,13,out.length,4).setNumberFormat(USD);   // Organic/Direct, Pinterest, TikTok, Other Rev
    // Per-metric evidence-based KPI badges — BATCHED (one setBackgrounds + per-column font) to avoid
    // SpreadsheetApp service timeouts. MER · FB/Google ROAS (UTM floor) · Email (real if Klaviyo sheet filled).
    var bg = [], fc = [];
    for (var i = 0; i < out.length; i++) {
      var rowbg = [], rowfc = []; for (var j = 0; j < NCOLS; j++) { rowbg.push('#FFFFFF'); rowfc.push('#000000'); }
      var _lm = _kpiLikert5(out[i][3], [2.5, 3, 3.5, 4]); rowbg[3] = _lm.bg; rowfc[3] = _lm.fg;   // col 4  Blended MER
      var _lf = _kpiLikert5(out[i][6], [2, 2.5, 3, 3.5]);       rowbg[6] = _lf.bg; rowfc[6] = _lf.fg;   // col 7  FB ROAS
      var _lg = _kpiLikert5(out[i][9], [2, 2.5, 3, 3.5]);       rowbg[9] = _lg.bg; rowfc[9] = _lg.fg;   // col 10 Google ROAS
      // v27.55: Email % no longer badge-colored (UTM last-click is not a maturity metric)
      bg.push(rowbg); fc.push(rowfc);
    }
    ws.getRange(sr0,1,out.length,NCOLS).setBackgrounds(bg).setFontColors(fc);
    [4,7,10].forEach(function(cc){
      ws.getRange(sr0,cc,out.length,1).setFontWeight('bold').setHorizontalAlignment('center');
    });
  }

  ws.setFrozenRows(4);
  ws.setColumnWidth(1, 84);
  [96,84,80, 96,84,72, 96,84,76, 96,76, 100,92,86,86].forEach(function(w,i){ ws.setColumnWidth(i+2, w); });
  _dplPrettyGrid(ws, 4, 5, NCOLS);
  ss.toast('✅ Channel Trends: ' + out.length + ' months · per-channel ROAS + Email', '📈', 6);
}


/* ════════════════════════════════════════════════════════════════════════
 *  🎯 CAMPAIGN DAILY (heatmap) — pick a Google campaign / FB account from a
 *  dropdown and read that entity's day-by-day metrics, ROAS colour-graded.
 *  100% LIVE: FILTER formulas read the daily tabs, so it self-updates — build once.
 *  ROAS is computed value/cost (currency-neutral). Google cost = account ccy (VND).
 * ════════════════════════════════════════════════════════════════════════ */
/** ONE CLICK = full automation. Calls every trigger-installer in the project
 *  (each idempotent: clears its own old handler, then re-creates). Run from the
 *  menu OR the editor. Missing installers (file not in project) are skipped, not
 *  fatal. After this, NOTHING needs manual daily updating.
 *  Daily map: klRecoveryDaily 9 · awxDailyAll 12 · _dplDailyCore 13 ·
 *  _dplDailyAnalytics 14 (Email Marketing) · emailPerfRebuild 15 (Email & SMS) ·
 *  fetchFBCampaignDaily 15:30 · hourly light sync. */
function gpInstallAllTriggers() {
  var plan = [
    ['Core P&L + Email Marketing (hourly + 13h + 14h)', 'dplInstallTrigger'],
    ['Airwallex Daily + Fees + CashFlow (12h)',         'awxInstallTrigger'],
    ['Failed-Payment recovery (9h)',                    'klInstallRecoveryTrigger'],
    ['FB Campaign Daily heatmap (15:30)',               'fbcInstallTrigger'],
    ['Email & SMS Performance (15h)',                   'empInstallTrigger']
  ];
  var ok = [], miss = [], err = [];
  plan.forEach(function (p) {
    var fn = this[p[1]];
    if (typeof fn !== 'function') { miss.push(p[0] + ' (' + p[1] + ' not in project)'); return; }
    try { fn(); ok.push(p[0]); }
    catch (e) { err.push(p[0] + ': ' + e.message); Logger.log('[gpInstallAllTriggers] ' + p[1] + ' FAILED: ' + e.message); }
  }, this);
  var L = ['=== gpInstallAllTriggers ===',
           '\u2705 installed: ' + (ok.join('  \u00b7  ') || 'none'),
           (miss.length ? '\u26a0 skipped (file missing): ' + miss.join(' | ') : ''),
           (err.length ? '\u274c errors: ' + err.join(' | ') : '')].filter(String);
  Logger.log(L.join('\n'));
  try { gpListTriggers(); } catch (e) {}
  try { _getSSActive().toast('\u2705 Automation: ' + ok.length + ' installed' +
        (miss.length ? ' \u00b7 ' + miss.length + ' skipped' : '') +
        (err.length ? ' \u00b7 ' + err.length + ' errors' : '') + ' \u2014 see Logs', '\u2699', 10); } catch (e) {}
}

/** Reorder tabs: priority dashboards to the FRONT, heavy source/data sheets to
 *  the BACK. Matches by case-insensitive substring so emoji prefixes don't matter.
 *  Leaves any non-listed sheet in the middle, untouched. */
function gpReorderTabs() {
  var ss = _getSSActive();
  var FRONT = ['shopify b2c', 'daily p&l', 'monthly p&l', 'channel daily', 'channel trends', '\u00a7campaign daily'];   // \u00a7 = exact (not fb campaign)
  var BACK  = ['fb ads daily', 'fb campaign daily', 'google ads daily', 'ad spend',
               'airwallex daily', 'airwallex fees', 'airwallex cash flow', 'failed payments',
               'sku raw data', 'missing cogs', 'channel audit', 'utm attribution'];
  function find(kw) {
    var exact = kw.charAt(0) === '\u00a7'; if (exact) kw = kw.slice(1);
    return ss.getSheets().filter(function (sh) {
      var n = sh.getName().toLowerCase();
      if (exact) return n.indexOf(kw) >= 0 && n.indexOf('fb ') < 0 && n.indexOf('google') < 0;
      return n.indexOf(kw) >= 0;
    })[0];
  }
  FRONT.forEach(function (kw, i) { var sh = find(kw); if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(i + 1); } });
  BACK.forEach(function (kw) { var sh = find(kw); if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(ss.getSheets().length); } });
  try { _getSSActive().toast('\u2705 Tabs reordered: dashboards front, data sheets to the end.', '\uD83D\uDDC2', 6); } catch (e) {}
}

function dplPaintAdsRoas() {
  // Persistent Likert ROAS colour on the 3 append/sync ads sheets via conditional format
  // (CF survives value re-writes on each sync). ROAS bands = [2, 2.5, 3, 3.5] via _kpiCfRules.
  var ss = _getSSActive();
  // ROAS = Likert [2,2.5,3,3.5]; CPM/CPC/CTR = 5-band Likert (cost inverted). Google = VND -> CPM/CPC skipped.
  // v28.14 '📱 FB Campaign Daily' is NOT in this list any more, for two reasons that were both
  // live defects. (1) Its entry graded P5:P2000 as ROAS, but v2.5 inserted CPP and P has been
  // REVENUE ever since — revenue dollars were being painted with ROAS bands, the same class of
  // off-by-one that produced the 744x reading. (2) setConditionalFormatRules REPLACES every rule
  // on the tab, so running this after fbcApplyLikert silently wiped the 7-column unit-economics
  // grading. That tab belongs to GP_FBC_Likert alone; it is delegated below.
  var targets = [
    { name: '📱 FB Ads Daily',      roas: 'O5:O2000', cpm: 'E5:E2000', cpc: 'G5:G2000', ctr: 'H5:H2000', ctrKey: 'ctr_fb' },
    { name: '🔍 Google Ads Daily',  roas: 'K5:K2000',                                   ctr: 'G5:G2000', ctrKey: 'ctr_google' }
  ];
  var done = [];
  targets.forEach(function (t) {
    var ws = ss.getSheetByName(t.name);
    if (!ws) return;
    var rules = _kpiCfRules([ws.getRange(t.roas)], 'roas');
    if (t.cpm) rules = rules.concat(_kpiCfRules([ws.getRange(t.cpm)], 'cpm'));
    if (t.cpc) rules = rules.concat(_kpiCfRules([ws.getRange(t.cpc)], 'cpc'));
    if (t.ctr) rules = rules.concat(_kpiCfRules([ws.getRange(t.ctr)], t.ctrKey));
    ws.setConditionalFormatRules(rules);
    done.push(t.name);
  });
  if (typeof fbcApplyLikert === 'function') {
    try { fbcApplyLikert(); done.push('📱 FB Campaign Daily (unit-econ, via GP_FBC_Likert)'); }
    catch (e) { Logger.log('[dplPaintAdsRoas] fbcApplyLikert failed: ' + e.message); }
  }
  ss.toast(done.length ? ('Ads Likert CF applied: ' + done.join(' \u00b7 ')) : 'No ads sheets found.', '🎨', 6);
}

function buildCampaignHeatmap() {
  var ss = _getSSActive();
  var ws = ss.getSheetByName(DPL.HEATMAP) || ss.insertSheet(DPL.HEATMAP);
  ws.clear();
  try { ws.getRange(1, 1, ws.getMaxRows(), ws.getMaxColumns()).clearDataValidations(); } catch (e) {}
  try { ws.setConditionalFormatRules([]); } catch (e) {}
  try { ws.getRange(1, 1, 6, 30).breakApart(); } catch (e) {}

  var TNR = DPL.TNR, USD = '"$"#,##0.00', NUM = '#,##0', PCT = '0.00%', X = '0.00"x"';
  var LASTCOL = 26;   // Z — FB block is 15 cols (L..Z) since v28.13; the title/note rows must span the ROAS column too

  ws.getRange(1, 1, 1, LASTCOL).merge()
    .setValue('🎯  GerberaPrints \u2014 Campaign Daily  (pick one \u2192 day-by-day \u00b7 ROAS colour-graded)')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(TNR).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1, 34);
  ws.getRange(2, 1, 1, LASTCOL).merge()
    .setValue('Live from 🔍 Google Ads Daily & 📱 FB Campaign Daily \u2014 updates automatically. FB = per-CAMPAIGN (pixel purchases \u00b7 7d-click \u00b7 matches Ads Manager). CPC / ATC Cost / Checkout Cost = Spend \u00f7 Clicks / ATC / Checkout (matches Ads Manager). ROAS = value/cost (platform-attributed \u2192 trend only). Google cost is account currency (VND). ROAS colour: Google = Likert [2/2.5/3/3.5] (target-shaped \u2014 names carry tROAS). FB = unit-economics cuts [1.2/1.5/2/3] (derived in GP_FBC_Likert) shared with \ud83d\udcf1 FB Campaign Daily. CPM/CPC/CTR = 5-band Likert (CPM/CPC lower=better) (Google VND CPC not graded). Google grouped by campaign ID (renames = ONE continuous history); Target % read from the name captured that day. \u26a0 The Google and FB blocks are INDEPENDENT panels \u2014 rows do NOT align by date (histories differ; FB excludes today).')
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(TNR).setFontSize(9).setFontStyle('italic').setWrap(true);
  ws.setRowHeight(2, 30);

  ws.getRange(3, 1, 1, 2).merge().setValue('\u25b8 GOOGLE campaign:')
    .setFontFamily(TNR).setFontWeight('bold').setFontColor('#1E3A8A').setHorizontalAlignment('right');
  ws.getRange('C3:I3').merge().setBackground('#DBEAFE').setFontFamily(TNR).setFontWeight('bold').setHorizontalAlignment('left');
  ws.getRange(3, 12, 1, 2).merge().setValue('\u25b8 FACEBOOK campaign:')
    .setFontFamily(TNR).setFontWeight('bold').setFontColor('#7C2D12').setHorizontalAlignment('right');
  ws.getRange('N3:Z3').merge().setBackground('#FEE2E2').setFontFamily(TNR).setFontWeight('bold').setHorizontalAlignment('left');
  ws.setRowHeight(3, 24);

  ws.getRange('AB4').setValue('Google campaigns');
  ws.getRange('AB5').setFormula('=IFERROR(LET(gA,\'🔍 Google Ads Daily\'!A5:A,gB,\'🔍 Google Ads Daily\'!B5:B,gC,\'🔍 Google Ads Daily\'!C5:C,ids,UNIQUE(FILTER(gC,gC<>"")),SORT(MAP(ids,LAMBDA(id,LET(dts,FILTER(gA,gC=id),nms,FILTER(gB,gC=id),XLOOKUP(MAX(dts),dts,nms)))))),"")');
  ws.getRange('AD4').setValue('FB campaigns');
  ws.getRange('AD5').setFormula('=IFERROR(SORT(UNIQUE(FILTER(\'📱 FB Campaign Daily\'!C5:C,\'📱 FB Campaign Daily\'!C5:C<>""))),"")');

  var gv = SpreadsheetApp.newDataValidation().requireValueInRange(ws.getRange('AB5:AB1000'), true).setAllowInvalid(true).build();
  var fv = SpreadsheetApp.newDataValidation().requireValueInRange(ws.getRange('AD5:AD1000'), true).setAllowInvalid(true).build();
  ws.getRange('C3').setDataValidation(gv);
  ws.getRange('N3').setDataValidation(fv);

  var gHead = ['Date', 'Cost', 'Impr', 'Clicks', 'CTR', 'CPC', 'Conv', 'Conv Value', 'ROAS', 'Target %'];
  // v28.13 CPP inserted between Purchases and Revenue, matching FB Campaign Daily v2.5. The FB
  // block now runs L..Z instead of L..Y, so every reference below moved one letter to the right.
  var fHead = ['Date', 'Spend ($)', 'Impr', 'CPM ($)', 'Clicks', 'CTR', 'CPC ($)', 'ATC', 'ATC Cost ($)', 'Checkout', 'Checkout Cost ($)', 'Purchases', 'CPP ($)', 'Revenue ($)', 'ROAS'];
  ws.getRange(4, 1, 1, gHead.length).setValues([gHead])
    .setBackground('#1E3A8A').setFontColor('#FFFFFF').setFontFamily(TNR).setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
  ws.getRange(4, 12, 1, fHead.length).setValues([fHead])
    .setBackground('#7C2D12').setFontColor('#FFFFFF').setFontFamily(TNR).setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
  ws.setRowHeight(4, 24);

  // ── TOTAL row 5 — lifetime of the PICKED campaign (auto-sums the spill below) ──
  ws.getRange('A5').setValue('▸ TOTAL'); ws.getRange('L5').setValue('▸ TOTAL');
  ws.getRange('B5').setFormula('=SUM(B6:B1000)');            // Google Cost
  ws.getRange('C5').setFormula('=SUM(C6:C1000)');            // Impr
  ws.getRange('D5').setFormula('=SUM(D6:D1000)');            // Clicks
  ws.getRange('E5').setFormula('=IFERROR(D5/C5,0)');         // CTR
  ws.getRange('F5').setFormula('=IFERROR(B5/D5,0)');         // CPC
  ws.getRange('G5').setFormula('=SUM(G6:G1000)');            // Conv
  ws.getRange('H5').setFormula('=SUM(H6:H1000)');            // Conv Value
  ws.getRange('I5').setFormula('=IFERROR(H5/B5,0)');         // ROAS
  ws.getRange('M5').setFormula('=SUM(M6:M1000)');            // FB Spend
  ws.getRange('N5').setFormula('=SUM(N6:N1000)');            // Impr
  ws.getRange('O5').setFormula('=IFERROR(M5/N5*1000,0)');    // CPM
  ws.getRange('P5').setFormula('=SUM(P6:P1000)');            // Clicks
  ws.getRange('Q5').setFormula('=IFERROR(P5/N5,0)');         // CTR
  ws.getRange('R5').setFormula('=IFERROR(M5/P5,0)');         // CPC
  ws.getRange('S5').setFormula('=SUM(S6:S1000)');            // ATC
  ws.getRange('T5').setFormula('=IFERROR(M5/S5,0)');         // ATC Cost
  ws.getRange('U5').setFormula('=SUM(U6:U1000)');            // Checkout
  ws.getRange('V5').setFormula('=IFERROR(M5/U5,0)');         // Checkout Cost
  ws.getRange('W5').setFormula('=SUM(W6:W1000)');            // Purchases
  // CPP on the TOTAL row is spend divided by purchases, NOT the sum of the daily CPPs. Summing a
  // per-order cost across days answers no question at all.
  ws.getRange('X5').setFormula('=IFERROR(M5/W5,"")');        // CPP = Spend / Purchases
  ws.getRange('Y5').setFormula('=SUM(Y6:Y1000)');            // Revenue
  ws.getRange('Z5').setFormula('=IFERROR(Y5/M5,0)');         // ROAS
  ws.getRange('A5:Z5').setBackground('#FEF3C7').setFontFamily(TNR).setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');
  ws.getRange('A5').setHorizontalAlignment('left'); ws.getRange('L5').setHorizontalAlignment('left');
  ws.getRange('B5:D5').setNumberFormat(NUM); ws.getRange('E5').setNumberFormat(PCT); ws.getRange('F5').setNumberFormat(NUM);
  ws.getRange('G5:H5').setNumberFormat(NUM); ws.getRange('I5').setNumberFormat(X);
  ws.getRange('M5').setNumberFormat(USD); ws.getRange('N5').setNumberFormat(NUM); ws.getRange('O5').setNumberFormat(USD);
  ws.getRange('P5').setNumberFormat(NUM); ws.getRange('Q5').setNumberFormat(PCT); ws.getRange('R5').setNumberFormat(USD);
  ws.getRange('S5').setNumberFormat(NUM); ws.getRange('T5').setNumberFormat(USD); ws.getRange('U5').setNumberFormat(NUM);
  ws.getRange('V5').setNumberFormat(USD); ws.getRange('W5').setNumberFormat(NUM);
  ws.getRange('X5').setNumberFormat(USD); ws.getRange('Y5').setNumberFormat(USD); ws.getRange('Z5').setNumberFormat(X);
  ws.setRowHeight(5, 22);

  var gF = '=IFERROR(LET(gid,XLOOKUP($C$3,\'🔍 Google Ads Daily\'!B5:B,\'🔍 Google Ads Daily\'!C5:C),src,FILTER(\'🔍 Google Ads Daily\'!A5:L,\'🔍 Google Ads Daily\'!C5:C=gid),HSTACK(CHOOSECOLS(src,1,4,5,6,7,8,9,10),MAP(CHOOSECOLS(src,10),CHOOSECOLS(src,4),LAMBDA(v,c,IFERROR(v/c,0))),MAP(CHOOSECOLS(src,2),LAMBDA(nm,IFERROR(REGEXEXTRACT(TO_TEXT(nm),"[0-9]+%"),""))))),"\u25b8 Pick a Google campaign in C3")';   // v28.4: group by campaign ID (survives renames) + Target% from name
  // v28.13 THE SOURCE GREW A COLUMN AND THIS DID NOT. GP_FB_Campaign_Sync v2.5 inserted CPP between
  // Purchases and Revenue, taking the tab from 16 columns to 17. This formula still pulled A5:P and
  // picked 16 columns, which silently shifted everything past Purchases by one: the block labelled
  // Revenue was showing CPP, and the block labelled ROAS was showing Revenue. That is why a day with
  // $85.89 of spend displayed a ROAS of 744.25x. It was never a ROAS, it was $744.25 of revenue
  // printed into a cell formatted as 0.00"x".
  // A range that stops one column short of the data does not raise an error, it just quietly returns
  // less, which is how this survived a full sync and a full backfill without one warning.
  var fF = '=IFERROR(LET(src, FILTER(\'📱 FB Campaign Daily\'!A5:Q,\'📱 FB Campaign Daily\'!C5:C=$N$3),'
         + ' CHOOSECOLS(src,1,4,5,6,7,8,9,10,11,12,13,14,15,16,17)),'
         + ' "\u25b8 Pick an FB campaign in N3")';
  ws.getRange('A6').setFormula(gF);
  ws.getRange('L6').setFormula(fF);

  ws.getRange('A6:A1000').setNumberFormat('yyyy-mm-dd').setHorizontalAlignment('center');
  ws.getRange('B6:B1000').setNumberFormat(NUM);
  ws.getRange('C6:D1000').setNumberFormat(NUM);
  ws.getRange('E6:E1000').setNumberFormat(PCT);
  ws.getRange('F6:F1000').setNumberFormat(NUM);
  ws.getRange('G6:H1000').setNumberFormat(NUM);
  ws.getRange('I6:I1000').setNumberFormat(X);
  ws.getRange('J6:J1000').setNumberFormat('@').setHorizontalAlignment('center');   // v28.4 Target %
  ws.getRange('L6:L1000').setNumberFormat('yyyy-mm-dd').setHorizontalAlignment('center');
  ws.getRange('M6:M1000').setNumberFormat(USD);
  ws.getRange('N6:N1000').setNumberFormat(NUM);
  ws.getRange('O6:O1000').setNumberFormat(USD);
  ws.getRange('P6:P1000').setNumberFormat(NUM);
  ws.getRange('Q6:Q1000').setNumberFormat(PCT);
  ws.getRange('R6:R1000').setNumberFormat(USD);
  ws.getRange('S6:S1000').setNumberFormat(NUM);
  ws.getRange('T6:T1000').setNumberFormat(USD);
  ws.getRange('U6:U1000').setNumberFormat(NUM);
  ws.getRange('V6:V1000').setNumberFormat(USD);
  ws.getRange('W6:W1000').setNumberFormat(NUM);
  ws.getRange('X6:X1000').setNumberFormat(USD);   // CPP
  ws.getRange('Y6:Y1000').setNumberFormat(USD);   // Revenue
  ws.getRange('Z6:Z1000').setNumberFormat(X);     // ROAS
  ws.getRange('A6:Z1000').setFontFamily(TNR).setFontSize(10);

  // ROAS colour: discrete canonical Likert 5-band (locked 2 / 2.5 / 3 / 3.5). Google ROAS (I) + FB ROAS (Y).
  // ROAS = Likert 5-band [2,2.5,3,3.5] (I Google + Y FB). CPM/CPC/CTR = 5-band Likert (cost inverted).
  // FB (USD): CPM=O, CTR=Q, CPC=R. Google (VND): only CTR=E (CPM absent, CPC=F not graded).
  // v28.13 ROAS moved from Y to Z. Colouring Y would now be painting Revenue with ROAS bands,
  // which is exactly the class of mistake that produced the 744x reading in the first place.
  // v28.14 The two ROAS columns answer different questions and no longer share one scale.
  // Google (I) keeps the canonical [2 / 2.5 / 3 / 3.5]: those campaigns carry explicit tROAS
  // targets (180-250%) in their names, so a target-shaped scale reads correctly. FB (Z) is the
  // SAME per-campaign data GP_FBC_Likert grades on '📱 FB Campaign Daily', so it takes the
  // SAME unit-economics cuts (derived: 1.2 / 1.5 / 2.0 / 3.0 at the one-item floor) — one number,
  // one colour, on both tabs. Falls back to the canonical scale only if the Likert file is absent.
  var _zRules = (typeof _fbclRules === 'function' && typeof GP_UNIT_ECONOMICS !== 'undefined')
    ? _fbclRules(ws.getRange('Z6:Z1000'), GP_UNIT_ECONOMICS.ROAS_CUTS, false)
    : _kpiCfRules([ws.getRange('Z6:Z1000')], 'roas');
  var _cdRules = _kpiCfRules([ws.getRange('I6:I1000')], 'roas')
    .concat(_zRules)
    .concat(_kpiCfRules([ws.getRange('O6:O1000')], 'cpm'))
    .concat(_kpiCfRules([ws.getRange('R6:R1000')], 'cpc'))
    .concat(_kpiCfRules([ws.getRange('Q6:Q1000')], 'ctr_fb'))        // FB CTR (higher bar)
    .concat(_kpiCfRules([ws.getRange('E6:E1000')], 'ctr_google'));   // Google Shopping/PMax CTR (lower bar)
  ws.setConditionalFormatRules(_cdRules);

  try { ws.showColumns(1, 30); } catch (e) {}
  [84, 80, 64, 64, 60, 64, 60, 92, 64].forEach(function (w, i) { ws.setColumnWidth(i + 1, w); });
  ws.setColumnWidth(11, 24);
  [84, 86, 64, 72, 64, 60, 64, 56, 80, 72, 92, 74, 82, 92, 64].forEach(function (w, i) { ws.setColumnWidth(12 + i, w); });
  ws.setFrozenRows(5);
  // v28.14 hide starts at AA(27), not Z(26). v28.13 moved ROAS into Z and then hid columns 26-30,
  // which hid the very column the whole rebuild existed to show. Only the helper lists (AA..AD)
  // belong out of sight.
  try { ws.hideColumns(27, 4); } catch (e) {}

  ss.toast('🎯 Campaign Daily ready \u2014 pick a Google campaign (C3) or FB account (N3).', '🎯', 6);
}


// ════════════════════════════════════════════════════════════════════════
//  MAIN BUILDER — Daily P&L (NET)
// ════════════════════════════════════════════════════════════════════════

function buildDailyPLNet(fromDate, toDate) {
  var ss = _getSSActive();
  var ws = ss.getSheetByName(DPL.PL) || ss.insertSheet(DPL.PL);

  var today = new Date(); today.setHours(0,0,0,0);
  var from, to;
  if (fromDate instanceof Date) from = fromDate;
  if (toDate   instanceof Date) to   = toDate;
  if (!from) from = new Date(2025, 4, 1);   // store launch
  if (!to)   to = today;
  // A project-tz (ICT) midnight is only ~10am Pacific, so an upper bound of "today 00:00" would
  // truncate the rest of today's Pacific orders out of the range. If 'to' is today-or-later, use NOW.
  if (to >= today) to = new Date();

  _dplResetSheet(ws);
  ss.toast('Building Daily P&L (NET)…', '📅', 60);

  var blended  = _dplGetSetting('Gateway blended fee rate', 0.03);
  var cogsDflt = _dplGetSetting('COGS fallback default %', 0.34);

  try { dplRollupAdSpend(); } catch(eRoll) { Logger.log('[adspend rollup] ' + eRoll.message); }

  var cogsInfo  = _dplLoadCogsMap();
  var cogsMap   = cogsInfo.map;
  var skuCogs   = _dplCogsBySKU(cogsInfo.prefixCost);
  var adSpend   = _dplLoadAdSpend();        // total per day (authoritative for deduction)
  var adSplit   = _dplLoadAdSpendSplit();   // {fb,ga} per day (display columns)
  var fixedInfo = _dplResolveFixedMonthly(from, to);
  var fixedMo   = fixedInfo.map;
  var fixedSplit = _dplResolveFixedSplit(from, to).map;
  var awxOtherMo = {}; try { awxOtherMo = _awxOtherCostByMonth(); } catch (e) {}   // prorate monthly AWX into Daily so Daily reconciles to Monthly
  var adKeys     = Object.keys(adSpend).sort();
  var adCoverage = adKeys.length ? adKeys[adKeys.length - 1] : null;

  var wsB2C = ss.getSheetByName(DPL.B2C);
  if (!wsB2C) { ss.toast('❌ "Shopify B2C" sheet missing', '📅', 6); return; }
  var _bw = Math.min(29, wsB2C.getMaxColumns());
  var b2c = wsB2C.getLastRow() >= 3 ? wsB2C.getRange(3, 1, wsB2C.getLastRow() - 2, _bw).getValues() : [];

  // Trailing-30d COGS% (self-calibrating fallback), denominator = Net Sales (r[9])
  var t30 = new Date(today); t30.setDate(t30.getDate() - 30);
  var mNet = 0, mCogs = 0;
  b2c.forEach(function(r) {
    var d = r[0]; if (!(d instanceof Date) || d < t30) return;
    var c = cogsMap[_dplCleanGPN(r[1])] || 0, net = parseFloat(r[9]) || 0;
    if (c > 0 && net > 0) { mNet += net; mCogs += c; }
  });
  var trailingPct = mNet > 0 ? (mCogs / mNet) : cogsDflt;

  // Aggregate per calendar day
  var shopRate = _dplShopifyFeeRate();   // Shopify per-order txn fee (refundable)
  var actual = {};
  b2c.forEach(function(r) {
    var d = r[0];
    if (!(d instanceof Date) || isNaN(d.getTime()) || d < from || d > to) return;
    var totalRev = parseFloat(r[15]) || 0; if (totalRev <= 0) return;
    var gpn = _dplCleanGPN(r[1]);
    var gross = parseFloat(r[7]) || 0, disc = parseFloat(r[8]) || 0, net = parseFloat(r[9]) || 0;
    var product = parseFloat(r[10]) || 0, ship = parseFloat(r[11]) || 0;
    var tips = parseFloat(r[12]) || 0, ins = parseFloat(r[13]) || 0;
    var actCogs = cogsMap[gpn] || 0;
    var est = actCogs <= 0;
    var cogs = actCogs;
    if (est) { var sc = skuCogs[gpn] || 0; cogs = sc > 0 ? sc : (net * trailingPct); }
    // v28.7 Same partial-invoice top-up as the Monthly builder. Daily and Monthly must value an
    // order identically or the two reports disagree and nobody knows which to believe.
    var prov = (cogsInfo.provisional && cogsInfo.provisional[gpn]) || 0;
    // v28.8 ONLY top up an order that is PARTLY invoiced. When nothing on the order has been billed,
    // the estimate above already priced every line from SKU Raw Data, including the unbilled ones,
    // so adding the provisional figure on top would charge those lines twice. v28.7 did exactly that
    // for orders with no invoice at all. actCogs > 0 is the whole test: some lines paid, some not.
    if (prov > 0 && actCogs > 0) { cogs += prov; est = true; }
    var refund = parseFloat(r[21]) || 0;                       // r[21]=Refund
    var chargedBase = totalRev - refund; if (chargedBase < 0) chargedBase = 0;
    var gw = chargedBase > 0 ? (chargedBase * _dplGatewayRate(r[16], blended) + _dplGatewayFixed(r[16])) : 0;  // refund-aware
    var _isAwx = String(r[16] || '').toLowerCase().indexOf('airwallex') >= 0;   // v27.56: split for real-fee override
    var shop = chargedBase * shopRate;                         // Shopify 1% (refundable)

    var k = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM-dd');
    if (!actual[k]) actual[k] = { orders:0, gross:0, disc:0, net:0, product:0, ship:0, tips:0, ins:0, totalRev:0, refund:0, cogs:0, gw:0, gwAwx:0, gwOther:0, shop:0, est:0, cancCnt:0, cancGross:0, cancRefund:0 };
    var a = actual[k];
    if (String(r[28] || '').trim() === 'CANCELLED') { a.cancCnt++; a.cancGross += totalRev; a.cancRefund += refund; return; }   // exclude cancelled from revenue; record stats
    a.orders += 1; a.gross += gross; a.disc += disc; a.net += net; a.product += product;
    a.ship += ship; a.tips += tips; a.ins += ins; a.totalRev += totalRev; a.refund += refund; a.cogs += cogs; a.gw += gw; a.shop += shop;
    if (_isAwx) a.gwAwx += gw; else a.gwOther += gw;
    if (est && (parseFloat(r[17])||0) > 0 && String(r[19]||'').toLowerCase() === 'fulfilled' && refund < ((parseFloat(r[9])||totalRev) * 0.85)) a.est += 1;   // ⏳ only for orders that truly expect actual COGS
  });

  // v27.56: override estimated Gateway with REAL Airwallex fee/day ('💳 Airwallex Daily'); PayPal/other stays estimated. Fallback-safe.
  try { var _awxRealD = _awxGwByDay(); Object.keys(actual).forEach(function(k){ if (_awxRealD[k] != null) { actual[k].gw = _awxRealD[k] + actual[k].gwOther; actual[k].gwAwxReal = _awxRealD[k]; } }); } catch (e) {}

  var days = [];
  var cur  = _dplAnchor(from.getFullYear(), from.getMonth(), from.getDate());
  var endD = _dplAnchor(to.getFullYear(),   to.getMonth(),   to.getDate());
  while (cur <= endD) { days.push(new Date(cur)); cur.setUTCDate(cur.getUTCDate() + 1); }

  var NCOLS = 27, USD = '"$"#,##0.00', PCT = '0.0%', NUM = '#,##0';
  var stamp = Utilities.formatDate(new Date(), DPL.VN_TZ, 'dd/MM/yyyy HH:mm');
  ws.getRange(1,1,1,NCOLS).merge()
    .setValue('📅  GerberaPrints — Daily P&L  (OPERATING MARGIN · after all operating costs)')
    .setBackground('#0F172A').setFontColor('#C9A84C')
    .setFontFamily(DPL.TNR).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1, 34);

  ws.getRange(2,1,1,3).merge().setValue('📅  Range →')
    .setBackground('#1E293B').setFontColor('#94A3B8')
    .setFontFamily(DPL.TNR).setFontSize(9).setFontWeight('bold').setHorizontalAlignment('right');
  ws.getRange(2,4).setValue(from).setNumberFormat('yyyy-mm-dd')
    .setBackground('#DBEAFE').setFontWeight('bold').setFontFamily(DPL.TNR).setHorizontalAlignment('center');
  ws.getRange(2,5).setValue('→').setBackground('#F1F5F9').setFontFamily(DPL.TNR).setHorizontalAlignment('center');
  ws.getRange(2,6).setValue(to).setNumberFormat('yyyy-mm-dd')
    .setBackground('#DBEAFE').setFontWeight('bold').setFontFamily(DPL.TNR).setHorizontalAlignment('center');
  ws.getRange(2,7,1,NCOLS-6).merge()
    .setValue('Processing: AWX = REAL fee/day (fallback est ' + (_dplGetSetting('Airwallex fee rate',0.029)*100).toFixed(1) +
              '%+$' + _dplGetSetting('Airwallex fixed fee per order',0.30).toFixed(2) +
              ') · PP est ' + (_dplGetSetting('PayPal fee rate',0.034)*100).toFixed(1) +
              '%+$' + _dplGetSetting('PayPal fixed fee per order',0.49).toFixed(2) +
              '/order  ·  Shopify ' + (_dplShopifyFeeRate()*100).toFixed(1) + '%/order (refundable)  ·  COGS fallback ' + (trailingPct*100).toFixed(1) +
              '% of Net  ·  Operating Margin = (Total Rev − Refund) − COGS − Processing − Shopify Txn − Ads − Shopify Plan − Apps&Tools − AWX  ·  AWX prorated from monthly (reconciles to Monthly) · excl. labor/overhead' +
              // v28.6 How much of this margin is measured and how much is modelled. The fallback is
              // silent by design and that is exactly the danger: when the Hub read failed, 93% of
              // cost quietly became an estimate and every figure below still looked finished.
              '  ·  Hub COGS read: ' + (_dplCogsCoverageNote()))
    .setFontFamily(DPL.TNR).setFontSize(8).setFontColor('#64748B').setFontStyle('italic');
  ws.setRowHeight(2, 26);

  ws.getRange(3,1,1,NCOLS).merge()
    .setValue('Updated: ' + stamp + ' PT  ·  Days: ' + days.length +
              '  ·  COGS source: ' + cogsInfo.src + ' (' + Object.keys(cogsMap).length + ' orders)' +
              '  ·  Ad spend fed through: ' + (adCoverage || 'none — paste into 📊 Ad Spend') +
              '  ·  ⏳ = fulfilled orders awaiting actual COGS, or ad spend not fed yet  ·  ✅ = actuals in')
    .setBackground('#F1F5F9').setFontColor('#475569')
    .setFontFamily(DPL.TNR).setFontSize(9).setFontStyle('italic');
  ws.setRowHeight(3, 20);
  ws.setRowHeight(4, 6);

  var headers = ['Date','Day','Orders','Gross ($)','Discount ($)','Cancelled #','Cancelled ($)','Cancel Refund ($)','Rev Received ($)','Net Sales ($)','Product ($)','Shipping ($)',
                 'Tips ($)','Insurance ($)','COGS ($)','Processing AWX ($)','Processing PP ($)','Shopify Txn ($)','FB Ad ($)','Google Ad ($)',
                 'Shopify Plan ($)','Shopify Apps ($)','Klaviyo ($)','Acct & Dispute AWX ($)','Operating Margin ($)','Op %','Status'];
  ws.getRange(5,1,1,NCOLS).setValues([headers])
    .setBackground('#334155').setFontColor('#FFFFFF')
    .setFontFamily(DPL.TNR).setFontSize(10).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  ws.setRowHeight(5, 24);

  var rows = [], cogsNotes = [];
  days.forEach(function(d) {
    var key   = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM-dd');
    var ymKey = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM');
    var dow   = Utilities.formatDate(d, DPL.VN_TZ, 'EEE');
    var a     = actual[key] || { orders:0, gross:0, disc:0, net:0, product:0, ship:0, tips:0, ins:0, totalRev:0, refund:0, cogs:0, gw:0, shop:0, est:0, cancCnt:0, cancGross:0, cancRefund:0 };
    var sp    = adSplit[key] || { fb:0, ga:0 };
    var adT   = adSpend[key] || 0;
    var adUsed = (sp.fb + sp.ga) > 0 ? (sp.fb + sp.ga) : adT;   // deduct split when present, else total
    var dim   = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    var fxm = fixedSplit[ymKey] || { shopify: 0, sapps: 0, klav: 0 };
    var fxShop = fxm.shopify / dim, fxSApps = fxm.sapps / dim, fxKlav = fxm.klav / dim;
    var awxDay = (awxOtherMo[ymKey] || 0) / dim;
    var net   = a.totalRev - a.refund - a.cogs - a.gw - a.shop - adUsed - fxShop - fxSApps - fxKlav - awxDay;   // Operating Margin (after Shopify + Apps&Tools + AWX prorated — reconciles to Monthly)
    var gwAwxP = (a.gwAwxReal != null) ? a.gwAwxReal : (a.gwAwx || 0), gwPpP = (a.gwOther || 0);   // v27.64: gateway split
    var margin= (a.totalRev - a.refund) > 0 ? net / (a.totalRev - a.refund) : 0;
    var adsPending = adCoverage ? (key > adCoverage) : false;
    var pending    = (a.est > 0) || adsPending;
    var status     = a.totalRev === 0 ? '—' : (pending ? '⏳' : '✅');
    rows.push([d, dow, a.orders, a.gross, a.disc, (a.cancCnt||0), (a.cancGross||0), (a.cancRefund||0), (a.totalRev - a.refund), a.net, a.product, a.ship, a.tips, a.ins,
               a.cogs, gwAwxP, gwPpP, a.shop, sp.fb, sp.ga, fxShop, fxSApps, fxKlav, awxDay, net, margin, status]);
    // COGS-column note ONLY for days whose COGS is still estimated (orders not yet invoiced).
    cogsNotes.push([ (a.orders > 0 && a.est > 0)
      ? ('⏳ ' + a.est + ' of ' + a.orders + ' orders still on ESTIMATED COGS.\n' +
         'Vietnam suppliers (MTP Cap, etc.) invoice on a T+30/T+45 cycle — the actual cost fills in ' +
         'automatically once it lands in the Fulfillment Hub, and this day turns ✅.')
      : '' ]);
  });

  rows.reverse();        // newest day on top
  cogsNotes.reverse();   // keep notes aligned with the reversed rows

  if (rows.length) {
    ws.getRange(6,1,rows.length,NCOLS).setValues(rows).setFontFamily(DPL.TNR).setFontSize(10);
    ws.getRange(6,1,rows.length,1).setNumberFormat('yyyy-mm-dd').setHorizontalAlignment('center');
    ws.getRange(6,2,rows.length,1).setHorizontalAlignment('center');
    ws.getRange(6,3,rows.length,1).setNumberFormat(NUM).setHorizontalAlignment('right');
    ws.getRange(6,4,rows.length,22).setNumberFormat(USD);   // Gross..Operating Margin
    ws.getRange(6,6,rows.length,1).setNumberFormat(NUM);   // Cancelled #
    ws.getRange(6,25,rows.length,1).setFontWeight('bold');
    ws.getRange(6,26,rows.length,1).setNumberFormat(PCT);
    ws.getRange(6,27,rows.length,1).setHorizontalAlignment('center');
    // Batch formatting — one setBackgrounds + one setFontColors (per-row range calls blow the 6-min cap).
    var bgs = [], fcs = [];
    for (var i = 0; i < rows.length; i++) {
      var dw = rows[i][1];
      var wk = (dw === 'Fri' || dw === 'Sat' || dw === 'Sun') ? '#FFFBEB' : '#FFFFFF';
      var neg = rows[i][24] < 0;
      var _lo = _kpiLikert5(rows[i][25], [0.10, 0.15, 0.20, 0.25]);   // Op % (col 26) -> canonical Likert
      var bgRow = [], fcRow = [];
      for (var c = 0; c < NCOLS; c++) {
        if (c === 25) { bgRow.push(_lo.bg); fcRow.push(_lo.fg); }              // Op % cell = Likert bg+fg
        else { bgRow.push(wk); fcRow.push((neg && c === 24) ? '#DC2626' : '#000000'); }   // Op Margin ($) loss = red
      }
      bgs.push(bgRow); fcs.push(fcRow);
    }
    ws.getRange(6,1,rows.length,NCOLS).setBackgrounds(bgs).setFontColors(fcs);
    ws.getRange(6,15,rows.length,1).setNotes(cogsNotes);   // est-COGS note on the COGS column only
  }

  function sum(c){ return rows.reduce(function(s,r){ return s + (r[c]||0); }, 0); }
  var tOrd=sum(2), tGross=sum(3), tDisc=sum(4), tCancCnt=sum(5), tCancGross=sum(6), tCancRefund=sum(7), tRevRecv=sum(8), tNet=sum(9), tProd=sum(10), tShip=sum(11),
      tTips=sum(12), tIns=sum(13), tCogs=sum(14), tGwAwx=sum(15), tGwPp=sum(16), tShop=sum(17), tFb=sum(18), tGa=sum(19),
      tShopPlan=sum(20), tSApps=sum(21), tKlav=sum(22), tAwx=sum(23), tNetP=sum(24);
  var totalR = 6 + rows.length + 1;
  ws.getRange(totalR,1,1,2).merge().setValue('TOTAL')
    .setBackground('#0F172A').setFontColor('#FFFFFF')
    .setFontFamily(DPL.TNR).setFontWeight('bold').setHorizontalAlignment('center');
  ws.getRange(totalR,3,1,NCOLS-2).setValues([[tOrd, tGross, tDisc, tCancCnt, tCancGross, tCancRefund, tRevRecv, tNet, tProd, tShip, tTips, tIns,
                                              tCogs, tGwAwx, tGwPp, tShop, tFb, tGa, tShopPlan, tSApps, tKlav, tAwx, tNetP, (tRevRecv>0?tNetP/tRevRecv:0), '']]);
  ws.getRange(totalR,3).setNumberFormat(NUM);
  ws.getRange(totalR,4,1,22).setNumberFormat(USD);
  ws.getRange(totalR,6).setNumberFormat(NUM);
  ws.getRange(totalR,26).setNumberFormat(PCT);
  ws.getRange(totalR,3,1,NCOLS-2).setFontFamily(DPL.TNR).setFontWeight('bold').setBackground('#E2E8F0').setFontSize(11);

  [96,44,56,96,86,56,90,96,96,96,96,80,70,78,96,90,86,96,90,90,80,80,80,90,104,80,56].forEach(function(w,i){ ws.setColumnWidth(i+1, w); });
  try { ws.setFrozenRows(5); } catch(e) {}

  _dplPrettyGrid(ws, 5, 6, NCOLS);
  ss.toast('✅ Daily P&L NET · ' + days.length + 'd · Net $' + Math.round(tNetP).toLocaleString(), '📅', 7);
}

// ════════════════════════════════════════════════════════════════════════
//  SHOPIFY SYNC  (incremental — appends new orders to 'Shopify B2C')
//  v27 FIX: gateway field payment_gateway → payment_gateway_names (array)
//  so new orders record their gateway (old singular field is deprecated).
// ════════════════════════════════════════════════════════════════════════

/** Shared order → row mapper for the v27.9 B2C schema (26 cols) + per-line SKU rows.
 *  Insurance app changed over time, so insurance is detected by BOTH old name ('insurance')
 *  AND new names ('shipping protection' / 'protection' / 'route'). Tips prefer the native
 *  total_tip_received field, falling back to tip line items. */
function _b2cMapOrder(o) {
  var orderName = (o.name || '').trim();
  var d    = o.created_at ? new Date(o.created_at) : '';
  var ship = o.shipping_address || o.billing_address || {};
  var bill = o.billing_address || {};
  var r2   = function(x){ return Math.round((parseFloat(x)||0) * 100) / 100; };

  var gross = parseFloat(o.total_line_items_price) || 0;   // before discount
  var disc  = parseFloat(o.total_discounts) || 0;
  var net   = parseFloat(o.subtotal_price) || 0;           // after discount (incl. insurance line)
  var tot   = parseFloat(o.total_price) || 0;
  var tax   = parseFloat(o.total_tax) || 0;
  var tipN  = parseFloat(o.total_tip_received) || 0;
  var shp   = 0; try { shp = parseFloat(o.total_shipping_price_set.shop_money.amount) || 0; } catch(e) {}
  var refund = 0;
  (o.refunds || []).forEach(function(r){ (r.refund_line_items || []).forEach(function(li){ refund += parseFloat(li.subtotal) || 0; }); });

  var items = o.line_items || [];
  // Insurance line — app changed names over time: old 'Insurance', new 'Shipping Protection',
  // or Route. Match these specific forms (NOT bare 'protection', which could hit a product title).
  function isIns(t){ t = (t||'').toLowerCase().trim();
    return t.indexOf('insurance') >= 0 || t.indexOf('shipping protection') >= 0 ||
           t === 'protection' || t.indexOf('route') === 0; }
  // Tip line — Shopify tip line is literally 'Tip' / 'Gratuity'. Match standalone forms only so
  // a product whose title merely contains 'tip' (substring) is never mis-flagged as a tip.
  function isTip(t){ t = (t||'').toLowerCase().trim();
    return t === 'tip' || t.indexOf('tip ') === 0 || t.indexOf('gratuity') >= 0; }

  var insItems = items.filter(function(li){ return isIns(li.title); });
  var tipItems = items.filter(function(li){ return isTip(li.title) && !isIns(li.title); });
  var prods    = items.filter(function(li){ return !isIns(li.title) && !isTip(li.title); });
  var insCost  = insItems.reduce(function(s,li){ return s + (parseFloat(li.price)||0)*(parseInt(li.quantity)||1); }, 0);
  var tipAmt   = tipN > 0 ? tipN : tipItems.reduce(function(s,li){ return s + (parseFloat(li.price)||0)*(parseInt(li.quantity)||1); }, 0);
  var qty      = prods.reduce(function(s,li){ return s + (parseInt(li.quantity)||1); }, 0);
  var prodStr  = prods.map(function(li){ var q=parseInt(li.quantity)||1; return li.title+(q>1?' (x'+q+')':''); }).join(' | ');
  var skuStr   = prods.map(function(li){ return li.sku||''; }).filter(Boolean).join(' | ');
  var gateway  = (o.payment_gateway_names || []).join(' + ');
  var product  = r2(net - insCost);   // apparel net (strip insurance line from net)
  var source   = _b2cChannel(o);      // real channel from landing_site UTM (Facebook/Google/Email/Organic/Direct…)
  var rawSrc   = _b2cRawSource(o);     // raw last-session source token (col 28) for Channel Audit

  var row = [
    d, orderName,
    (ship.name||bill.name||''), (o.email||''),
    (ship.city||''), (ship.province||''), (ship.country||''),
    r2(gross), r2(disc), r2(net), product, r2(shp), r2(tipAmt), r2(insCost), r2(tax), r2(tot),
    gateway,
    qty, prodStr, (o.fulfillment_status||'unfulfilled'), skuStr, r2(refund),
    (ship.phone||o.phone||''), (ship.address1||''), (ship.address2||''), (ship.zip||''),
    source, rawSrc
  ];   // 28 cols (col 28 = Raw Source for Channel Audit)

  var skuRows = prods.map(function(li){
    return [d, orderName, (li.sku||''), (li.title||''), (li.variant_title||''),
            (parseFloat(li.price)||0), (parseInt(li.quantity)||1)];
  });
  return { name: orderName, date: d, row: row, skuRows: skuRows };
}

// ── Channel attribution (mirrors GP_UTM_Attribution logic; local names to avoid collision) ──
function _b2cChannel(o) {
  var landing = o.landing_site || '', referring = o.referring_site || '', sn = o.source_name || '';
  var qs = '', qi = landing.indexOf('?'); if (qi >= 0) qs = landing.slice(qi + 1);
  function q(name){ var m = qs.match(new RegExp('(?:^|&)' + name + '=([^&]*)', 'i')); return m ? decodeURIComponent(m[1].replace(/\+/g,' ')) : ''; }
  var src = q('utm_source'), med = q('utm_medium');
  (o.note_attributes || []).forEach(function(a){
    var n = (a.name||'').toLowerCase();
    if (!src && n === 'utm_source') src = a.value || '';
    if (!med && n === 'utm_medium') med = a.value || '';
  });
  var hadUtmSrc = !!src;
  if (!src) src = _b2cInferSource(referring);
  var s = (src||'').toLowerCase(), m = (med||'').toLowerCase();
  // B (v27.35): Gmail / email-client referrer with NO utm_source = ambiguous click (order-confirm, personal forward) — not Google search/ads.
  if (!hadUtmSrc && /mail\.google|googlemail|android-app:\/\/com\.google\.android\.gm/.test((referring||'').toLowerCase())) return 'Direct/Unknown';
  if (/facebook|fbads|^fb$|meta|instagram|^ig$/.test(s)) return 'Facebook';
  if (/google|youtube|gdn|pmax|googleads|google-ads|gads/.test(s)) return 'Google';
  if (/pinterest|^pin$/.test(s)) return 'Pinterest';
  if (/tiktok/.test(s)) return 'TikTok';
  if (/klaviyo|email|newsletter/.test(s) || m === 'email') return 'Email';
  if (/shop_app|shopapp/.test(s)) return 'Shop App';   // D (v27.35): Shopify Shop app
  if (/(^|\W)organic|bing|duckduckgo|yahoo/.test(s) || m === 'organic') return 'Organic';
  if (!s && !m) return 'Direct/Unknown';
  return 'Other';
}
function _b2cInferSource(referring) {
  var r = (referring||'').toLowerCase();
  if (/facebook|fb\.|instagram|\big\b/.test(r)) return 'facebook';
  if (/google|youtube/.test(r)) return 'google';
  if (/pinterest/.test(r)) return 'pinterest';
  if (/tiktok/.test(r)) return 'tiktok';
  if (/bing|duckduckgo|yahoo/.test(r)) return 'organic';
  return '';
}

/** Raw last-session source token for the Channel Audit (col 28): utm_source if present, else the
 *  external referrer domain, else 'direct'. Lowercased. Internal (gerberaprints) referrer = direct. */
function _b2cRawSource(o) {
  var landing = o.landing_site || '', referring = o.referring_site || '';
  var qs = '', qi = landing.indexOf('?'); if (qi >= 0) qs = landing.slice(qi + 1);
  function q(name){ var m = qs.match(new RegExp('(?:^|&)' + name + '=([^&]*)', 'i')); return m ? decodeURIComponent(m[1].replace(/\+/g,' ')) : ''; }
  var src = q('utm_source');
  (o.note_attributes || []).forEach(function(a){ if (!src && (a.name||'').toLowerCase() === 'utm_source') src = a.value || ''; });
  if (src) return String(src).toLowerCase().trim();
  var r = (referring || '').toLowerCase();
  if (!r) return 'direct';
  if (r.indexOf('gerberaprints') >= 0) return 'direct';
  var mm = r.match(/^https?:\/\/([^\/]+)/);
  return mm ? mm[1].replace(/^www\./,'') : r;
}

/** Ensure a sheet has at least n columns (insert if short) — guards 28-col B2C writes. */
function _b2cEnsureWidth(ws, n) {
  var c = ws.getMaxColumns();
  if (c < n) ws.insertColumnsAfter(c, n - c);
}

var _B2C_ORDER_FIELDS = 'id,name,created_at,email,billing_address,shipping_address,' +
  'total_price,subtotal_price,total_line_items_price,total_discounts,total_tax,total_tip_received,' +
  'total_shipping_price_set,financial_status,fulfillment_status,payment_gateway_names,' +
  'line_items,refunds,note_attributes,phone,landing_site,referring_site,source_name';
var _B2C_USD_COLS = [8,9,10,11,12,13,14,15,16,22];
var _B2C_NCOLS = 28;

function _b2cEnsureSkuRaw(ss) {
  var ws = ss.getSheetByName('SKU Raw Data') || ss.insertSheet('SKU Raw Data');
  if (ws.getLastRow() < 1 || (ws.getRange(1,1).getValue()||'') === '') {
    ws.getRange(1,1,1,7).setValues([['Date','Order#','SKU','Title','Variant','Price','Qty']])
      .setFontWeight('bold').setFontFamily(DPL.TNR).setBackground('#334155').setFontColor('#FFFFFF');
  }
  return ws;
}

function _b2cFormatRows(wsB2C, startRow, n) {
  wsB2C.getRange(startRow, 1, n, 1).setNumberFormat('yyyy-mm-dd');
  _B2C_USD_COLS.forEach(function(c){ wsB2C.getRange(startRow, c, n, 1).setNumberFormat('"$"#,##0.00'); });
}

function syncShopifyOrdersNew() {
  var ss = _getSSActive();
  var wsB2C = ss.getSheetByName(DPL.B2C);
  if (!wsB2C) { ss.toast('❌ "Shopify B2C" missing — cannot sync', '🛒', 6); return; }

  var baseUrl = 'https://' + SHOPIFY_STORE + '/admin/api/' + SHOPIFY_API_VER;
  var lastRow = wsB2C.getLastRow();
  var sinceDate;
  if (lastRow >= 3) {
    var dates = wsB2C.getRange(3, 1, lastRow-2, 1).getValues()
      .map(function(r){ return r[0]; }).filter(function(d){ return d instanceof Date; });
    if (dates.length) {
      var maxDate = new Date(Math.max.apply(null, dates));
      maxDate.setDate(maxDate.getDate() - 1);
      sinceDate = maxDate.toISOString();
    }
  }
  if (!sinceDate) { var d30 = new Date(); d30.setDate(d30.getDate() - 30); sinceDate = d30.toISOString(); }

  var existing = {};
  if (lastRow >= 3) {
    wsB2C.getRange(3, 2, lastRow-2, 1).getValues()
      .forEach(function(r){ if (r[0]) existing[r[0].toString().trim()] = true; });
  }

  var url = baseUrl + '/orders.json?status=any&limit=250' +
            '&created_at_min=' + encodeURIComponent(sinceDate) +
            '&order=created_at+asc&fields=' + _B2C_ORDER_FIELDS;

  var resp = UrlFetchApp.fetch(url, { headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN }, muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) { Logger.log('syncShopifyOrdersNew HTTP ' + resp.getResponseCode()); return; }

  var orders = JSON.parse(resp.getContentText()).orders || [];
  var newRows = [], skuRows = [];
  orders.forEach(function(o) {
    if (!o.name || existing[o.name.trim()]) return;
    var m = _b2cMapOrder(o);
    newRows.push(m.row);
    m.skuRows.forEach(function(s){ skuRows.push(s); });
  });

  if (!newRows.length) { Logger.log('syncShopifyOrdersNew: no new orders'); return; }
  var insertAt = Math.max(3, wsB2C.getLastRow()+1);
  _b2cEnsureWidth(wsB2C, _B2C_NCOLS);
  wsB2C.getRange(insertAt, 1, newRows.length, _B2C_NCOLS).setValues(newRows);
  _b2cFormatRows(wsB2C, insertAt, newRows.length);

  if (skuRows.length) {
    var wsSku = _b2cEnsureSkuRaw(ss);
    var sAt = Math.max(2, wsSku.getLastRow()+1);
    wsSku.getRange(sAt, 1, skuRows.length, 7).setValues(skuRows);
    wsSku.getRange(sAt, 1, skuRows.length, 1).setNumberFormat('yyyy-mm-dd');
    _dplSortByDateDesc(wsSku, 2);   // newest → oldest
  }

  _sortB2CSheet(wsB2C);
  PropertiesService.getScriptProperties().setProperty(_SHOPIFY_SYNC_DATE, new Date().toISOString());
  ss.toast('🛒 +' + newRows.length + ' new orders synced', 'Sync', 5);
}

/** ONE-TIME migration: re-fetch EVERY order since launch and rebuild 'Shopify B2C' +
 *  'SKU Raw Data' in the v27.9 schema. Paginated (Link header) + time-guarded. Irreversible
 *  (the old layout is replaced). Run this once right after deploying v27.9. */
function resyncAllB2C() {
  var ss = _getSSActive();
  var ui; try { ui = SpreadsheetApp.getUi(); } catch(e) { ui = null; }
  if (ui) {
    var ok = ui.alert('🔁 Re-sync ALL B2C?',
      'This re-fetches every order from Shopify (since 2025-05-01) and REBUILDS "Shopify B2C" + "SKU Raw Data" in the new schema.\n\n' +
      'The current B2C rows (old layout) will be replaced. This is a one-time migration.\n\nProceed?',
      ui.ButtonSet.YES_NO);
    if (ok !== ui.Button.YES) { ss.toast('Cancelled', '🔁', 4); return; }
  }
  var wsB2C = ss.getSheetByName(DPL.B2C) || ss.insertSheet(DPL.B2C);

  var baseUrl = 'https://' + SHOPIFY_STORE + '/admin/api/' + SHOPIFY_API_VER;
  var since = new Date(2025, 4, 1);   // launch
  var url = baseUrl + '/orders.json?status=any&limit=250&order=created_at+asc' +
            '&created_at_min=' + encodeURIComponent(since.toISOString()) +
            '&fields=' + _B2C_ORDER_FIELDS;

  var rows = [], skuRows = [], seen = {}, guard = 0, deadline = Date.now() + 280000;
  while (url && guard < 40 && Date.now() < deadline) {
    var resp = UrlFetchApp.fetch(url, { headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN }, muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) { ss.toast('❌ Shopify HTTP ' + resp.getResponseCode(), '🔁', 6); Logger.log(resp.getContentText().slice(0,300)); break; }
    var batch = JSON.parse(resp.getContentText()).orders || [];
    batch.forEach(function(o){
      if (!o.name || seen[o.name.trim()]) return;
      seen[o.name.trim()] = true;
      var m = _b2cMapOrder(o);
      rows.push(m.row);
      m.skuRows.forEach(function(s){ skuRows.push(s); });
    });
    var link = resp.getHeaders()['Link'] || resp.getHeaders()['link'] || '';
    var next = '';
    link.split(',').forEach(function(p){ var mm = p.match(/<([^>]+)>;\s*rel="next"/); if (mm) next = mm[1]; });
    url = next; guard++; if (next) Utilities.sleep(350);
  }
  if (url && guard >= 40) Logger.log('[resync] stopped at page guard — re-run to continue');

  // Rebuild Shopify B2C
  _dplResetSheet(wsB2C);
  _b2cEnsureWidth(wsB2C, 28);
  // title rows 1-2 (kept simple — sync writes data from row 3)
  wsB2C.getRange(1,1,1,28).merge().setValue('🛒  GerberaPrints — Shopify B2C  (orders · v27.9 schema · auto-synced)')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(12).setFontWeight('bold');
  var hdr = ['Date','Order#','Customer','Email','City','State','Country','Gross Sales','Discount','Net Sales',
             'Product','Shipping','Tips','Insurance','Tax','Total Revenue','Gateway','Qty','Products',
             'Fulfillment','SKUs','Refund','Phone','Address1','Address2','Zip','Source','Raw Source'];
  wsB2C.getRange(2,1,1,28).setValues([hdr]).setBackground('#334155').setFontColor('#FFFFFF')
    .setFontFamily(DPL.TNR).setFontWeight('bold').setFontSize(10);
  if (rows.length) {
    wsB2C.getRange(3,1,rows.length,28).setValues(rows).setFontFamily(DPL.TNR).setFontSize(10);
    _b2cFormatRows(wsB2C, 3, rows.length);
  }
  // trim any stale extra columns (old 28-col grid → 26)
  try { if (wsB2C.getMaxColumns() > 28) wsB2C.deleteColumns(29, wsB2C.getMaxColumns() - 28); } catch(e) {}
  try { wsB2C.setFrozenRows(2); } catch(e) {}
  _sortB2CSheet(wsB2C);

  // Rebuild SKU Raw Data
  var wsSku = _b2cEnsureSkuRaw(ss);
  _dplResetSheet(wsSku);
  wsSku.getRange(1,1,1,7).setValues([['Date','Order#','SKU','Title','Variant','Price','Qty']])
    .setFontWeight('bold').setFontFamily(DPL.TNR).setBackground('#334155').setFontColor('#FFFFFF');
  if (skuRows.length) {
    wsSku.getRange(2,1,skuRows.length,7).setValues(skuRows).setFontFamily(DPL.TNR).setFontSize(10);
    wsSku.getRange(2,1,skuRows.length,1).setNumberFormat('yyyy-mm-dd');
    _dplSortByDateDesc(wsSku, 2);   // newest → oldest
  }
  try { wsSku.setFrozenRows(1); } catch(e) {}

  PropertiesService.getScriptProperties().setProperty(_SHOPIFY_SYNC_DATE, new Date().toISOString());
  ss.toast('🔁 Re-sync done: ' + rows.length + ' orders · ' + skuRows.length + ' SKU lines (' + guard + ' pages)', '🔁', 9);
  Logger.log('[resync] ' + rows.length + ' orders, ' + skuRows.length + ' sku lines, ' + guard + ' pages');
}

// ════════════════════════════════════════════════════════════════════════
//  PRESETS
// ════════════════════════════════════════════════════════════════════════

/** Single Daily P&L command — full history from store launch (May 2025) to today. */
function dplRebuildDaily() {
  var today = new Date(); today.setHours(0,0,0,0);
  buildDailyPLNet(new Date(2025, 4, 1), today);   // 2025-05-01 → now
}

// ════════════════════════════════════════════════════════════════════════
//  SETUP
// ════════════════════════════════════════════════════════════════════════

function _dplEnsureSettings() {
  var ss = _getSSActive(); var ws = ss.getSheetByName(DPL.SETTINGS);
  var kv = [
    ['Key', 'Value'],
    ['Airwallex fee rate', 0.029],
    ['PayPal fee rate', 0.034],
    ['Gateway blended fee rate', 0.03],
    ['Airwallex fixed fee per order', 0.30],
    ['PayPal fixed fee per order', 0.49],
    ['Gateway blended fixed fee', 0.30],
    ['Shopify transaction fee rate', 0.01],
    ['COGS fallback default %', 0.34],
    ['Monthly revenue target (floor)', 150000],
    ['Monthly revenue target (stretch)', 200000],
    ['Break-even ROAS', 1.43]
  ];
  if (ws) {
    // Backfill any keys missing from an existing sheet (e.g. fee keys added in a later version).
    try {
      var have = {};
      ws.getRange(1, 1, ws.getLastRow(), 1).getValues().forEach(function(r){ have[(r[0]||'').toString().trim()] = true; });
      var add = kv.filter(function(row, i){ return i > 0 && !have[row[0]]; });
      if (add.length) {
        var startRow = ws.getLastRow() + 1;
        ws.getRange(startRow, 1, add.length, 2).setValues(add).setFontFamily(DPL.TNR).setFontSize(11);
        ws.getRange(startRow, 2, add.length, 1).setBackground('#FFF8E7');
      }
    } catch(e) { Logger.log('[settings backfill] ' + e.message); }
    return ws;
  }
  ws = ss.insertSheet(DPL.SETTINGS);
  ws.getRange(1,1,1,2).merge().setValue('⚙  GerberaPrints — Settings  (edit values, then rebuild Daily P&L)')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(13).setFontWeight('bold');
  ws.getRange(2,1,kv.length,2).setValues(kv).setFontFamily(DPL.TNR).setFontSize(11);
  ws.getRange(2,1,1,2).setFontWeight('bold').setBackground('#334155').setFontColor('#FFFFFF');
  ws.getRange(3,2,kv.length-1,1).setBackground('#FFF8E7');
  ws.setColumnWidth(1, 250); ws.setColumnWidth(2, 120);
  return ws;
}

function _dplEnsureAdSpend() {
  var ss = _getSSActive(); var ws = ss.getSheetByName(DPL.ADSPEND);
  if (ws) return ws;
  ws = ss.insertSheet(DPL.ADSPEND);
  ws.getRange(1,1,1,6).merge()
    .setValue('📊  Ad Spend (daily)  —  paste from Claude:  "export daily ad spend last 30 days"')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(12).setFontWeight('bold');
  ws.getRange(2,1,1,6).setValues([['Date','FB Spend ($)','Google Spend ($)','Other ($)','Total ($)','Note']])
    .setFontWeight('bold').setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(DPL.TNR);
  ws.getRange(2,1).setNote('Daily P&L reads col A (Date) + col E (Total). If Total blank it sums FB+Google+Other.');
  ws.setColumnWidth(1,104); ws.setColumnWidth(6,260); ws.setFrozenRows(2);
  return ws;
}

function dplSetup() {
  _dplEnsureSettings(); _dplEnsureAdSpend();
  _getSSActive().toast('✅ Created ⚙ Settings + 📊 Ad Spend. Edit Settings, feed Ad Spend, then rebuild.', 'Setup', 7);
}

/** Parse a flexible month input → last calendar day of that month (fixed costs group by month). */
function _dplParseMonthEnd(s) {
  s = (s || '').trim();
  var m;
  if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})(?:[-\/.]\d{1,2})?$/))) return new Date(+m[1], +m[2], 0);   // YYYY-MM[-DD]
  if ((m = s.match(/^(\d{1,2})[-\/.](\d{4})$/)))                  return new Date(+m[2], +m[1], 0);   // MM/YYYY
  var d = new Date(s);                                                                                 // native fallback
  if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return null;
}

/** Parse a money input, tolerating $, spaces, and thousands commas (US format: dot = decimal). */
function _dplParseAmount(s) {
  var v = parseFloat((s || '').toString().replace(/[$\s,]/g, ''));
  return isNaN(v) ? null : v;
}

function dplAddCost() {
  var ss = _getSSActive(); var ws = ss.getSheetByName(DPL.COST);
  if (!ws) { ss.toast('❌ "💰 Cost Tracker" not found — run Setup first', 'Add Cost', 5); return; }
  var ui = SpreadsheetApp.getUi();

  var rMonth = ui.prompt('Add fixed cost — 1 of 3',
    'Which MONTH is this cost for?\n\nType YYYY-MM  (e.g. 2026-05).\nLeave blank = this month.', ui.ButtonSet.OK_CANCEL);
  if (rMonth.getSelectedButton() !== ui.Button.OK) return;
  var mTxt = rMonth.getResponseText().trim();
  var dt = mTxt ? _dplParseMonthEnd(mTxt) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
  if (!dt) { ui.alert('❌ Could not read the month "' + mTxt + '".\n\nUse YYYY-MM, e.g. 2026-05.'); return; }

  var rName = ui.prompt('Add fixed cost — 2 of 3',
    'What is this cost?\n\ne.g. Klaviyo, Shopify, Vercel, Simprosys', ui.ButtonSet.OK_CANCEL);
  if (rName.getSelectedButton() !== ui.Button.OK) return;
  var name = rName.getResponseText().trim();
  if (!name) { ui.alert('❌ Description is empty — type a name like "Klaviyo".'); return; }

  var rAmt = ui.prompt('Add fixed cost — 3 of 3',
    'Amount in USD for ' + Utilities.formatDate(dt, DPL.VN_TZ, 'MMM yyyy') + '?\n\n' +
    'Numbers only (e.g. 150 or 49.50). A "$" sign is OK; do NOT use a comma for decimals.', ui.ButtonSet.OK_CANCEL);
  if (rAmt.getSelectedButton() !== ui.Button.OK) return;
  var amt = _dplParseAmount(rAmt.getResponseText());
  if (amt === null || amt < 0) { ui.alert('❌ Could not read the amount "' + rAmt.getResponseText() + '".\n\nType numbers only, e.g. 150 or 49.50.'); return; }

  ws.appendRow([dt, 'App Fee', name, amt, '', 'Actual', new Date()]);
  ss.toast('✅ ' + name + '  $' + amt.toFixed(2) + '  →  ' + Utilities.formatDate(dt, DPL.VN_TZ, 'MMM yyyy') +
           '   (rebuild Daily/Monthly to see it in Fixed)', 'Cost Tracker', 7);
}

/* 💳 Build / seed the Cost Tracker from imported real billing (Shopify + Klaviyo, May 2025 → May 2026).
 * One sheet = the cost table. Engine reads col A (Month) + col D (Amount), summed per month → Fixed.
 * Shopify rows = the REAL invoice totals (Grow plan + apps + Shopify txn fees + usage; failed bills excluded).
 * These do NOT overlap the per-order Airwallex/PayPal fees in the Gateway column (different parties). */
/** Backfill the 'Cancelled' flag (B2C col 29) from Shopify. Self-contained: ensures the column
 *  exists, fetches ONLY cancelled orders (small subset - no full re-sync), marks matching Order# rows.
 *  Re-run after any B2C re-sync. Idempotent. (P&L reads col 29 to exclude cancelled revenue.) */
// dplBackfillCancelled REMOVED (v-opt) — superseded by GP_COGS_Coverage.gs gpRefreshOrderStatus + gpReconcileHubCancels (auto, covers cancel+void+expired+refunded).
/** '🧾 Tools & Fees' — monthly breakdown of software/fee costs into clear buckets:
 *  Shopify Plan (subscription) · Shopify Txn (order commission, actual from billing) ·
 *  Shopify Apps (Loox etc.) · Klaviyo · Other Tools. Reads '💰 Cost Tracker' (fixed) +
 *  '📄 Shopify Charges' (actual txn). Read-only view for staff — no P&L impact. */
function dplBuildToolsFees() {
  var ss = _getSSActive();
  var fix = {};
  var ct = ss.getSheetByName(DPL.COST);
  if (ct && ct.getLastRow() >= 4) {
    var cv = ct.getRange(4, 1, ct.getLastRow() - 3, 4).getValues();
    cv.forEach(function (r) {
      var d = r[0]; if (!(d instanceof Date)) return;
      var mk = Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM');
      var vend = String(r[2] || '').toLowerCase(), amt = parseFloat(r[3]) || 0;
      var o = fix[mk] || (fix[mk] = { plan: 0, sapps: 0, klav: 0, other: 0 });
      if (vend.indexOf('shopify plan') >= 0) o.plan += amt;
      else if (vend.indexOf('shopify apps') >= 0) o.sapps += amt;
      else if (vend.indexOf('klaviyo') >= 0) o.klav += amt;
      else o.other += amt;
    });
  }
  var txn = {};
  var sc = ss.getSheetByName('📄 Shopify Charges');
  if (sc && sc.getLastRow() >= 2) {
    var data = sc.getDataRange().getValues(), hRow = -1, col = {};
    for (var i = 0; i < data.length; i++) {
      var lc = data[i].map(function (c) { return String(c || '').trim().toLowerCase(); });
      if (lc.indexOf('charge category') >= 0) { hRow = i; lc.forEach(function (n, idx) { col[n] = idx; }); break; }
    }
    if (hRow >= 0) {
      var ci = col['charge category'], ai = col['amount'], di = col['date'], bi = col['bill #'], ei = col['description'], seen = {};
      for (var r = 0; r < data.length; r++) {
        if (r === hRow) continue;
        if (String(data[r][ci] || '').trim().toLowerCase() !== 'order_commission') continue;
        var amt2 = parseFloat(data[r][ai]) || 0, d2 = data[r][di];
        var mk2 = (d2 instanceof Date) ? Utilities.formatDate(d2, DPL.VN_TZ, 'yyyy-MM') : String(d2 || '').substring(0, 7);
        var key = [data[r][bi], data[r][ei], amt2, String(d2)].join('|'); if (seen[key]) continue; seen[key] = 1;
        if (/^\d{4}-\d{2}$/.test(mk2)) txn[mk2] = (txn[mk2] || 0) + amt2;
      }
    }
  }
  var mset = {}; Object.keys(fix).forEach(function (m) { mset[m] = 1; }); Object.keys(txn).forEach(function (m) { mset[m] = 1; });
  var keys = Object.keys(mset).sort().reverse();
  var ws = ss.getSheetByName('🧾 Tools & Fees') || ss.insertSheet('🧾 Tools & Fees');
  _dplResetSheet(ws);
  var USD = '"$"#,##0.00', stamp = Utilities.formatDate(new Date(), DPL.VN_TZ, 'dd/MM/yyyy HH:mm');
  ws.getRange(1, 1, 1, 7).merge().setValue('🧾  GerberaPrints — Tools & Fees  (monthly software/fee breakdown · ' + stamp + ' ICT)')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(13).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1, 30);
  ws.getRange(2, 1, 1, 7).merge().setValue('Shopify Plan = subscription (Grow $92 / Advanced $399)  ·  Shopify Txn = per-order commission (actual)  ·  Shopify Apps = Shopify-billed apps (Loox…)  ·  Klaviyo = email/SMS tool  ·  Other = Vercel/misc. Source: 💰 Cost Tracker + 📄 Shopify Charges.')
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(DPL.TNR).setFontSize(9).setFontStyle('italic').setWrap(true);
  ws.setRowHeight(2, 34);
  ws.getRange(3, 1, 1, 7).setValues([['Month', 'Shopify Plan', 'Shopify Txn', 'Shopify Apps', 'Klaviyo', 'Other Tools', 'Total']])
    .setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(DPL.TNR).setFontSize(10).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(3, 24);
  var rows = [], tot = [0, 0, 0, 0, 0];
  keys.forEach(function (m) {
    var o = fix[m] || { plan: 0, sapps: 0, klav: 0, other: 0 }, t = txn[m] || 0;
    tot[0] += o.plan; tot[1] += t; tot[2] += o.sapps; tot[3] += o.klav; tot[4] += o.other;
    rows.push([m, o.plan, t, o.sapps, o.klav, o.other, o.plan + t + o.sapps + o.klav + o.other]);
  });
  if (rows.length) {
    ws.getRange(4, 1, rows.length, 7).setValues(rows).setFontFamily(DPL.TNR).setFontSize(10);
    ws.getRange(4, 2, rows.length, 6).setNumberFormat(USD);
    var tr = 4 + rows.length, gtot = tot[0] + tot[1] + tot[2] + tot[3] + tot[4];
    ws.getRange(tr, 1, 1, 7).setValues([['TOTAL', tot[0], tot[1], tot[2], tot[3], tot[4], gtot]])
      .setFontFamily(DPL.TNR).setFontWeight('bold').setBackground('#F1F5F9');
    ws.getRange(tr, 2, 1, 6).setNumberFormat(USD);
  }
  ws.setColumnWidth(1, 80);
  [100, 96, 100, 90, 96, 100].forEach(function (w, i) { ws.setColumnWidth(i + 2, w); });
  try { ws.setFrozenRows(3); } catch (e) {}
  ss.toast('✅ Tools & Fees: ' + keys.length + ' months · Plan $' + tot[0].toFixed(0) + ' · Txn $' + tot[1].toFixed(0) +
           ' · Shopify Apps $' + tot[2].toFixed(0) + ' · Klaviyo $' + tot[3].toFixed(0) + ' · Other $' + tot[4].toFixed(0), '🧾', 15);
}

/** AUTO-SYNC Shopify fixed cost (plan + apps) into '💰 Cost Tracker' Platform rows.
 *  Shopify has NO API for a merchant's own billing, so the flow is: paste the Shopify
 *  billing CSV export (Settings → Billing → Export) into tab '📄 Shopify Charges', then
 *  run this. It sums subscription_fee + application_fee per month (txn = order_commission
 *  is EXCLUDED — that lives per-order in the P&L Shopify Fee col), and REWRITES the
 *  Platform rows (correct month labels). Non-Platform rows (Klaviyo/Vercel/etc) untouched.
 *  Idempotent · duplicates ignored · re-run monthly after pasting the new export. */
function dplSyncShopifyFixed() {
  var ss = _getSSActive();
  var SRC = '📄 Shopify Charges';
  var src = ss.getSheetByName(SRC);
  if (!src || src.getLastRow() < 2) {
    if (!src) src = ss.insertSheet(SRC);
    src.getRange(1, 1).setValue('▶ Paste your Shopify billing CSV export here (Settings → Billing → Export), INCLUDING the header row. You may paste multiple exports — duplicates are ignored. Then run the menu item again.');
    ss.toast('Created "📄 Shopify Charges" — paste the Shopify billing CSV export there, then run again.', '💰', 14);
    return;
  }
  var data = src.getDataRange().getValues();
  var hRow = -1, col = {};
  for (var i = 0; i < data.length; i++) {
    var lc = data[i].map(function (c) { return String(c || '').trim().toLowerCase(); });
    if (lc.indexOf('charge category') >= 0) { hRow = i; lc.forEach(function (n, idx) { col[n] = idx; }); break; }
  }
  if (hRow < 0) { ss.toast('No "Charge category" header in 📄 Shopify Charges — paste the full CSV with its header.', '💰', 10); return; }
  var ci = col['charge category'], ai = col['amount'], di = col['date'], bi = col['bill #'], ei = col['description'];
  var plan = {}, apps = {}, seen = {}, txnTot = 0, n = 0;
  for (var r = 0; r < data.length; r++) {
    if (r === hRow) continue;
    var cat = String(data[r][ci] || '').trim().toLowerCase();
    var amt = parseFloat(data[r][ai]) || 0;
    var d = data[r][di], mk = (d instanceof Date) ? Utilities.formatDate(d, DPL.VN_TZ, 'yyyy-MM') : String(d || '').substring(0, 7);
    var key = [data[r][bi], cat, data[r][ei], amt, String(d)].join('|');
    if (cat === 'order_commission') { if (!seen[key]) { seen[key] = 1; txnTot += amt; } continue; }
    if (cat !== 'subscription_fee' && cat !== 'application_fee') continue;
    if (!(amt > 0) || !/^\d{4}-\d{2}$/.test(mk)) continue;
    if (seen[key]) continue; seen[key] = 1;
    if (cat === 'subscription_fee') plan[mk] = (plan[mk] || 0) + amt; else apps[mk] = (apps[mk] || 0) + amt; n++;
  }
  var months = Object.keys(plan).concat(Object.keys(apps)).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort();
  if (!months.length) { ss.toast('No subscription/application fees found in the pasted CSV.', '💰', 8); return; }
  var ct = ss.getSheetByName(DPL.COST);
  if (!ct) { ss.toast('"💰 Cost Tracker" missing — run Setup / Build cost table first.', '💰', 8); return; }
  var now = new Date(), fixTot = 0;
  var body = ct.getLastRow() >= 4 ? ct.getRange(4, 1, ct.getLastRow() - 3, 8).getValues() : [];
  var keep = body.filter(function (row) { return String(row[2] || '').trim().toLowerCase().indexOf('shopify') < 0; });
  var platform = [];
  months.forEach(function (mk) {
    var y = parseInt(mk.substring(0, 4), 10), mo = parseInt(mk.substring(5, 7), 10) - 1;
    var pAmt = Math.round((plan[mk] || 0) * 100) / 100, aAmt = Math.round((apps[mk] || 0) * 100) / 100;
    fixTot += pAmt + aAmt;
    if (pAmt > 0) platform.push([_dplAnchor(y, mo, 15), 'Platform', 'Shopify Plan', pAmt, 'Auto-sync', 'Actual', now, 'Auto: Shopify subscription (Grow/Advanced plan)']);
    if (aAmt > 0) platform.push([_dplAnchor(y, mo, 15), 'App/Tool', 'Shopify Apps', aAmt, 'Auto-sync', 'Actual', now, 'Auto: Shopify-billed apps (Loox etc.); txn separate in P&L Shopify Txn col']);
  });
  var all = keep.concat(platform);
  all.sort(function (a, b) { var ka = (a[0] instanceof Date) ? a[0].getTime() : 0, kb = (b[0] instanceof Date) ? b[0].getTime() : 0; return kb - ka; });
  if (ct.getLastRow() >= 4) ct.getRange(4, 1, ct.getLastRow() - 3, 8).clearContent();
  if (all.length) {
    ct.getRange(4, 1, all.length, 8).setValues(all).setFontFamily(DPL.TNR).setFontSize(10);
    ct.getRange(4, 1, all.length, 1).setNumberFormat('yyyy-mm');
    ct.getRange(4, 4, all.length, 1).setNumberFormat('$#,##0.00');
    ct.getRange(4, 7, all.length, 1).setNumberFormat('yyyy-mm-dd');
  }
  ss.toast('✅ Shopify fixed synced: ' + months.length + ' months · plan+apps $' + fixTot.toFixed(0) +
           ' (txn $' + txnTot.toFixed(0) + ' excluded). Rebuild Daily/Monthly P&L.', '💰', 14);
  Logger.log('[dplSyncShopifyFixed] months=' + months.length + ' fixed=$' + fixTot.toFixed(2) + ' txnExcluded=$' + txnTot.toFixed(2));
}

function dplBuildCostTracker() {
  var ss = _getSSActive(), TNR = DPL.TNR, now = new Date();
  try {
    var ui = SpreadsheetApp.getUi();
    var c = ui.alert('Build / seed Cost Tracker',
      'This rebuilds "💰 Cost Tracker" from the imported Shopify + Klaviyo billing (May 2025 → May 2026) ' +
      'and OVERWRITES existing rows.\n\nContinue?', ui.ButtonSet.OK_CANCEL);
    if (c !== ui.Button.OK) return;
  } catch(e) {}

  // [year, monthIndex(0=Jan), amount]
  var shopify = [[2026,4,627.55],[2026,3,397.85],[2026,2,386.57],[2026,1,359.13],[2026,0,278.47],
    [2025,11,271.58],[2025,10,130.98],[2025,9,547.31],[2025,8,543.22],[2025,7,617.96],
    [2025,6,601.58],[2025,5,247.08],[2025,4,122.87]];
  var klaviyo = [[2026,4,80],[2026,3,70],[2026,2,60],[2026,1,60],[2026,0,60],
    [2025,11,100],[2025,10,100],[2025,9,100],[2025,8,100],[2025,7,100],
    [2025,6,60],[2025,5,60],[2025,4,60]];

  var rows = [];
  shopify.forEach(function(r){ rows.push([_dplAnchor(r[0], r[1], 15), 'Platform', 'Shopify (plan+apps+usage)', r[2], 'Actual bill', 'Actual', now, 'Shopify invoice MINUS txn fees (txn is per-order in P&L Shopify Fee col — do NOT double). Edit each amount to plan+apps+usage from your invoice.']); });
  klaviyo.forEach(function(r){ rows.push([_dplAnchor(r[0], r[1], 15), 'Email/SMS', 'Klaviyo', r[2], 'Actual invoice', 'Actual', now, 'Klaviyo monthly invoice']); });
  rows.sort(function(a,b){ return (b[0] - a[0]) || (a[2] < b[2] ? -1 : 1); });   // newest first, then vendor

  var pend = _dplAnchor(now.getFullYear(), now.getMonth(), 15);
  var pending = [
    [pend, 'Gateway monthly', 'Airwallex monthly fee', '', 'Pending', 'Pending', now, 'Awaiting data — enter the monthly account fee when known'],
    [pend, 'Infra', 'Vercel', '', 'Pending', 'Pending', now, 'Confirm plan (Hobby free / Pro $20) and enter']
  ];
  var all = pending.concat(rows);

  var ws = ss.getSheetByName(DPL.COST) || ss.insertSheet(DPL.COST);
  _dplResetSheet(ws);
  var NC = 8;
  ws.getRange(1,1,1,NC).merge().setValue('💰  GerberaPrints — Cost Tracker  (fixed monthly costs → Daily/Monthly "Fixed")')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(TNR).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1,32);
  ws.getRange(2,1,1,NC).merge().setValue('Engine sums col A (Month) + col D (Amount) per month. Add new months via menu ➕ Add fixed-cost entry. Per-order Airwallex/PayPal fees are NOT here — they live in the Gateway column.')
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(TNR).setFontSize(9).setFontStyle('italic');
  ws.setRowHeight(2,22);
  ws.getRange(3,1,1,NC).setValues([['Month','Category','Vendor / App','Amount ($)','Source','Status','Updated','Note']])
    .setFontWeight('bold').setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(TNR).setFontSize(11);

  if (all.length) {
    ws.getRange(4,1,all.length,NC).setValues(all).setFontFamily(TNR).setFontSize(10);
    ws.getRange(4,1,all.length,1).setNumberFormat('yyyy-mm');
    ws.getRange(4,4,all.length,1).setNumberFormat('$#,##0.00');
    ws.getRange(4,7,all.length,1).setNumberFormat('yyyy-mm-dd');
  }
  ws.setColumnWidth(1,80); ws.setColumnWidth(2,130); ws.setColumnWidth(3,210); ws.setColumnWidth(4,100);
  ws.setColumnWidth(5,130); ws.setColumnWidth(6,90); ws.setColumnWidth(7,110); ws.setColumnWidth(8,360);
  ws.setFrozenRows(3);
  ss.toast('✅ Cost Tracker built: ' + rows.length + ' billed rows + ' + pending.length + ' pending. Rebuild Daily/Monthly to apply.', 'Cost Tracker', 7);
}

function dplLinkFulfillmentHub() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('🔗 Link Fulfillment Hub',
    'Paste the Fulfillment Hub Spreadsheet ID or URL (COGS source):', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var p = r.getResponseText().trim();
  var m = p.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/); if (m) p = m[1];
  if (!p) return;
  try {
    var ssH = SpreadsheetApp.openById(p);
    PropertiesService.getScriptProperties().setProperty('FULFILLMENT_HUB_ID', p);
    ui.alert('✅ Linked: ' + ssH.getName());
  } catch(e) { ui.alert('❌ Could not open that ID: ' + e.message); }
}

// ════════════════════════════════════════════════════════════════════════
//  AUTO-UPDATE (hourly) + DIAGNOSTICS + CLEANUP
// ════════════════════════════════════════════════════════════════════════

// v27.96 SELF-HEAL: the CRM had NO trigger self-heal, so when a daily trigger went missing
// (deploy / Google-disable after failures / quota) it stayed dead -> silent manual-only days
// (analytics last auto-ran 2026-07-10 while hourly kept going). The hourly handler now re-arms
// the two daily triggers every hour, so a missing one recovers within 1h. Mirrors the Fulfillment
// Hub's _ensureAutoPushTrigger pattern. NOTE: cannot self-heal the HOURLY trigger from itself --
// if hourly also dies, run dplInstallTrigger once to bootstrap all three.
// ═════════════════════════════════════════════════════════════════════════
//  v28.9  TIDY — hide the sheets nobody reads, keep the ones that are decisions
//
//  38 tabs is not a system, it is a filing cabinet with the drawers left open. Most of them are
//  either raw feed for something else, a worklist that was finished weeks ago, or a tool waiting on
//  a launch that has not happened. Every one of them costs attention and none of them is read.
//
//  HIDING ONLY. No sheet is deleted, no data is touched, and every formula and every builder keeps
//  working exactly as before, because code reads a hidden sheet the same way it reads a visible one.
//  View > Hidden sheets brings any of them back in one click.
//
//  Shopify B2C is hidden and must never be deleted: it is the spine the whole CRM is built on.
// ═════════════════════════════════════════════════════════════════════════
var CRM_TIDY_HIDE = [
  // Raw feed. Read by the builders, never read by a person.
  'Shopify B2C', 'SKU Raw Data', '\uD83D\uDD0D Google Ads Daily', '\uD83D\uDCC4 Shopify Charges',
  '\uD83D\uDCCA Ad Spend', '\uD83D\uDCF1 FB Ads Daily', '\uD83D\uDCF1 FB Campaign Daily',
  '\uD83D\uDCB3 Airwallex Daily', '\uD83D\uDED2 Abandoned Checkouts',
  // Worklists that finished. Each one still says APPLIED or carries a July date.
  '\uD83D\uDD0E Status Refresh', '\uD83D\uDD0E Hub Cancel Reconcile', '\uD83C\uDFAF COGS Gaps',
  '\uD83D\uDCCA Decline Mix', '\uD83D\uDD0D FB Coverage Audit', '\uD83D\uDD0E Channel Audit',
  // Waiting on something that has not happened yet.
  '\uD83D\uDCF1 SMS Scorecard', '\uD83E\uDDEA FB Incrementality Test', '\uD83C\uDFAF MER Target & FB Marginal Test',
  // Archive, by definition.
  '\uD83D\uDCC1 FB Platform Archive'
];

/**
 * Hide the background sheets. Names are matched exactly first and then by prefix, because a tab can
 * be renamed slightly and a silent miss would leave the tidy half done with nothing to show for it.
 */
function gpTidyCrmSheets() {
  var ss = _getSSActive();
  var all = ss.getSheets();
  var byName = {};
  all.forEach(function(sh){ byName[sh.getName()] = sh; });

  var hidden = [], missing = [], active = ss.getActiveSheet().getName();
  CRM_TIDY_HIDE.forEach(function(want){
    var sh = byName[want];
    if (!sh) {
      // Prefix match on the distinctive part, so a tab renamed at the tail is still found.
      var key = want.replace(/^[^A-Za-z]+/, '').toLowerCase().slice(0, 12);
      for (var i = 0; i < all.length && !sh; i++) {
        var n = all[i].getName().replace(/^[^A-Za-z]+/, '').toLowerCase();
        if (key && n.indexOf(key) === 0) sh = all[i];
      }
    }
    if (!sh) { missing.push(want); return; }
    // Never hide the sheet the user is looking at; Sheets throws and the whole run stops.
    if (sh.getName() === active) { missing.push(sh.getName() + ' (open right now, skipped)'); return; }
    if (sh.isSheetHidden()) return;
    try { sh.hideSheet(); hidden.push(sh.getName()); }
    catch (e) { missing.push(sh.getName() + ': ' + e.message); }
  });

  var visible = ss.getSheets().filter(function(sh){ return !sh.isSheetHidden(); }).length;
  var msg = 'Tidy done.\n\nHidden this run: ' + hidden.length +
            '\nVisible tabs now: ' + visible + ' of ' + all.length +
            (missing.length ? '\n\nNot hidden:\n  ' + missing.join('\n  ') : '') +
            '\n\nNothing was deleted. View > Hidden sheets brings any of them back.';
  Logger.log('[gpTidyCrmSheets] hid ' + hidden.length + ' | visible ' + visible + '/' + all.length +
             (missing.length ? ' | not hidden: ' + missing.join(' ; ') : ''));
  try { SpreadsheetApp.getUi().alert('\uD83E\uDDF9 Tidy CRM', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
  return msg;
}

/** Undo: bring every hidden sheet back, for when something needs auditing. */
function gpShowAllCrmSheets() {
  var ss = _getSSActive(), n = 0;
  ss.getSheets().forEach(function(sh){ if (sh.isSheetHidden()) { sh.showSheet(); n++; } });
  var msg = 'Unhid ' + n + ' sheet(s).';
  Logger.log('[gpShowAllCrmSheets] ' + msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return msg;
}

function _dplEnsureDailyTriggers() {
  // v27.99: SYSTEM-WIDE self-heal. Re-arms EVERY expected trigger across ALL files if missing.
  // Schedules verified from each subsystem's own installer. _fnExists guards against a PHANTOM:
  // a handler whose file was removed is SKIPPED (never create a trigger to a missing function).
  // NOTE: _fbaDailyTrigger is intentionally absent -- it's a duplicate (FB sync lives in
  // _dplDailyCore@13); it is auto-DELETED below. gpCogsDaily not yet mapped (the file sent as
  // GP_COGS_Coverage was actually GP_KpiLikert) -- add once the real GP_COGS_Coverage.gs is seen.
  var daily = {                        // handler -> atHour (once/day)
    '_dplDailyCore':13, '_dplDailyAnalytics':14,
    '_dplKlaviyoEmail':10, '_dplKlaviyoScorecard':11, '_dplKlaviyoSms':12,
    'archiveFbPlatformDaily':7,        // FB platform archive (CRM)
    '_klaviyoDailyRun':9,              // Klaviyo ops flows: abandoned cart / list stats / email status
    'awxDailyAll':12,                  // Airwallex daily
    'emailPerfRebuild':15,             // Email & SMS Performance
    'fetchFBCampaignDaily':23,         // FB Campaign Daily
    'pushAdsAdviceToTelegram':7        // v28.1: Telegram ads advisor (reads pre-synced FB+Google sheets)
  };
  var everyH = { 'klRecoveryDaily':4 };   // Klaviyo failed-payment recovery every 4h (awxSync data). NOTE: the FEED itself is neutered in GP_Klaviyo.gs v2.4 (Hub is sole feeder), so keeping this trigger alive is safe -- it syncs data, does NOT feed.
  // v28.0: legacy DUPLICATE triggers to auto-DELETE (a paste can't remove a trigger; running code can).
  // _fbaDailyTrigger@15 duplicated the FB sync already done in _dplDailyCore@13 -> kill it on every run.
  var KILL = { '_fbaDailyTrigger':1 };
  function _fnExists(n){ try { return typeof globalThis[n] === 'function'; } catch(e){ return true; } }
  var have = {}, removed = [];
  ScriptApp.getProjectTriggers().forEach(function(t){
    if (t.getTriggerSource() !== ScriptApp.TriggerSource.CLOCK) return;
    var h = t.getHandlerFunction();
    if (KILL[h]) { ScriptApp.deleteTrigger(t); removed.push('deleted:'+h); return; }
    // v28.9 PHANTOM TRIGGERS. Creation was already guarded by _fnExists, but deletion never was, so
    // a trigger left behind by a removed or renamed file fired on schedule for ever and failed every
    // time. gpCogsDaily sat at a 100% error rate exactly like this. A trigger pointing at a function
    // that no longer exists cannot do anything except generate noise and hide real failures among
    // its own, so it is deleted the moment it is seen.
    // KILL is checked first, so an intentional removal still wins over this rule.
    if (!_fnExists(h)) { ScriptApp.deleteTrigger(t); removed.push('deleted PHANTOM:'+h); return; }
    have[h] = true;
  });
  var healed = [];
  Object.keys(daily).forEach(function(fn){
    if (!have[fn] && _fnExists(fn)) { ScriptApp.newTrigger(fn).timeBased().everyDays(1).atHour(daily[fn]).create(); healed.push(fn+'@'+daily[fn]); }
  });
  Object.keys(everyH).forEach(function(fn){
    if (!have[fn] && _fnExists(fn)) { ScriptApp.newTrigger(fn).timeBased().everyHours(everyH[fn]).create(); healed.push(fn+'/'+everyH[fn]+'h'); }
  });
  // v28.10 Say what happened. This returned its result and logged nothing, so running it by hand
  // produced a blank execution and no way to tell a clean pass from a phantom being deleted.
  var _out = healed.concat(removed);
  Logger.log('[_dplEnsureDailyTriggers] ' + (_out.length ? _out.join(' | ') : 'nothing to change, all triggers present and valid'));
  return _out;   // created + deleted, so the hourly log/email reports both
}

function _dplHourlySync() {
  var err = [];
  try { syncShopifyOrdersNew(); } catch(e) { err.push('sync: ' + e.message); Logger.log('[hourly] sync: ' + e.message); }
  try { buildDailyPLNet(new Date(2025, 4, 1), new Date()); }   // FULL range — never wipe history to current month
  catch(e) { err.push('DailyPL: ' + e.message); Logger.log('[hourly] P&L: ' + e.message); }
  try {
    var props = PropertiesService.getScriptProperties();
    props.setProperty('DPL_LAST_HOURLY_RUN', Utilities.formatDate(new Date(), DPL.VN_TZ, 'yyyy-MM-dd HH:mm') + ' ' + DPL.TZ_LABEL);
    props.setProperty('DPL_LAST_HOURLY_STATUS', err.length ? ('FAIL: ' + err.join(' | ')) : 'OK');
  } catch(e) {}
  try {
    var _healed = _dplEnsureDailyTriggers();   // v27.96 self-heal
    if (_healed.length) {
      PropertiesService.getScriptProperties().setProperty('DPL_TRIGGER_SELFHEAL',
        Utilities.formatDate(new Date(), DPL.VN_TZ, 'yyyy-MM-dd HH:mm') + ' re-armed: ' + _healed.join(', '));
      _dplNotifyEmail('🔧 GerberaPrints CRM — daily trigger self-heal',
        'The hourly run re-armed missing daily trigger(s): ' + _healed.join(', ') + '.\n' +
        'They had gone missing (deploy / Google-disable / quota) so analytics or core were NOT auto-running. ' +
        'Back now; if a day was skipped, run the daily refresh once from the menu to backfill.');
    }
  } catch(e) { Logger.log('[hourly] self-heal: ' + e.message); }
}

/* 🩺 One-click reliability snapshot: trigger state, last runs, COGS coverage,
 * and a Daily↔Monthly reconciliation (orders + gross must match — same source/range). */
function dplHealthCheck() {
  var ss = _getSSActive();
  var ui; try { ui = SpreadsheetApp.getUi(); } catch(e) {}
  var props = PropertiesService.getScriptProperties();
  var L = [];

  var clk = 0;
  try { ScriptApp.getProjectTriggers().forEach(function(t){ if (t.getTriggerSource() === ScriptApp.TriggerSource.CLOCK) clk++; }); } catch(e) {}
  L.push('⏱ Auto-update triggers: ' + clk + (clk >= 4 ? '  ✅' : '  ⚠️ expected 4 (hourly + core 13h + analytics 14h + weekly) — run Setup → ② Enable auto-update'));
  L.push('   • Last hourly:    ' + (props.getProperty('DPL_LAST_HOURLY_RUN')    || '—') + '  [' + (props.getProperty('DPL_LAST_HOURLY_STATUS')    || '—') + ']');
  L.push('   • Last core 13h:  ' + (props.getProperty('DPL_LAST_CORE_RUN')      || '—') + '  [' + (props.getProperty('DPL_LAST_CORE_STATUS')      || '—') + ']');
  L.push('   • Last anlys 14h: ' + (props.getProperty('DPL_LAST_ANALYTICS_RUN') || '—') + '  [' + (props.getProperty('DPL_LAST_ANALYTICS_STATUS') || '—') + ']');
  var _fbFn = (typeof syncFBAdsDaily === 'function'), _fbLatest = '';
  try {
    var _wfb = ss.getSheetByName(DPL_FB_SHEET);
    if (_wfb && _wfb.getLastRow() >= 5) {
      var _fd = _wfb.getRange(5,1,_wfb.getLastRow()-4,1).getDisplayValues();
      for (var _fi=0; _fi<_fd.length; _fi++){ var _fk=_dplParseDisplayDate(_fd[_fi][0]); if(_fk && _fk>_fbLatest) _fbLatest=_fk; }
    }
  } catch(e) {}
  L.push('   • FB Ads sync: ' + (_fbFn ? 'auto ON ✅' : 'FB_Ads_Daily.gs MISSING ⚠️') + ' · latest FB data ' + (_fbLatest || '—'));

  var dOrders = 0, dGross = 0, nDays = 0, nPend = 0, nOk = 0, latest = '—';
  try {
    var wd = ss.getSheetByName(DPL.PL), lr = wd.getLastRow();
    if (lr >= 6) {
      var dv = wd.getRange(6, 1, lr - 5, 20).getValues();
      if (dv[0][0] instanceof Date) latest = Utilities.formatDate(dv[0][0], DPL.VN_TZ, 'yyyy-MM-dd');
      dv.forEach(function(r){
        if (!(r[0] instanceof Date)) return;
        nDays++; dOrders += (parseFloat(r[2]) || 0); dGross += (parseFloat(r[3]) || 0);
        if (r[19] === '⏳') nPend++; else if (r[19] === '✅') nOk++;
      });
    }
  } catch(e) { L.push('Daily read error: ' + e.message); }
  L.push('');
  L.push('📅 Daily P&L: ' + nDays + ' days · latest ' + latest);
  L.push('   • COGS status: ' + nOk + ' ✅ actual · ' + nPend + ' ⏳ estimated');

  var mOrders = 0, mGross = 0;
  try {
    var wm = ss.getSheetByName(DPL.PL_MONTHLY), mlr = wm.getLastRow();
    var mv = wm.getRange(5, 1, mlr - 4, 17).getValues();
    for (var i = mv.length - 1; i >= 0; i--) {
      if (String(mv[i][0]).indexOf('TOTAL') === 0) { mOrders = parseFloat(mv[i][1]) || 0; mGross = parseFloat(mv[i][2]) || 0; break; }
    }
  } catch(e) { L.push('Monthly read error: ' + e.message); }

  var oMatch = Math.round(dOrders) === Math.round(mOrders);
  var gMatch = Math.abs(dGross - mGross) < 1;
  L.push('');
  L.push('🔗 Daily vs Monthly reconciliation:');
  L.push('   • Orders: ' + Math.round(dOrders) + ' vs ' + Math.round(mOrders) + (oMatch ? '  ✅' : '  ⚠️ MISMATCH'));
  L.push('   • Gross:  $' + dGross.toFixed(0) + ' vs $' + mGross.toFixed(0) + (gMatch ? '  ✅' : '  ⚠️ MISMATCH'));
  if (!oMatch || !gMatch) L.push('   → Rebuild Daily + Monthly; if it persists, check the launch-month start (2025-05).');

  L.push('');
  L.push('🏭 Fulfillment Hub (COGS): ' + (props.getProperty('FULFILLMENT_HUB_ID') ? 'linked ✅' : 'NOT linked ⚠️'));
  L.push('🔔 Failure-alert email: ' + DPL_NOTIFY_EMAIL);

  var rec = _dplReconcileShopify();
  L.push('');
  if (!rec.ok) {
    L.push('🛒 Shopify reconcile: ⚠️ API error — ' + rec.msg);
  } else {
    L.push('🛒 Shopify vs B2C (sync check):');
    L.push('   • Latest order: Shopify ' + (rec.shopifyLatest || '—') + ' vs B2C ' + (rec.b2cLatest || '—') +
           (rec.behind ? '  ⚠️ SYNC BEHIND — run 🛒 Sync Shopify' : '  ✅ current'));
    L.push('   • Count: Shopify ' + (rec.shopifyCount == null ? '—' : rec.shopifyCount) +
           ' vs B2C ' + rec.b2cCount + (rec.countGap == null ? '' : ' (gap ' + rec.countGap + ')'));
  }

  var msg = L.join('\n');
  if (ui) ui.alert('🩺 CRM Health Check', msg, ui.ButtonSet.OK); else Logger.log(msg);
}

function dplTestAlertEmail() {
  var ok = _dplNotifyEmail('✅ GerberaPrints CRM — test alert',
    'This confirms failure-alert emails work. You will only receive real alerts when an automated ' +
    'refresh step actually fails.');
  try { SpreadsheetApp.getUi().alert(ok ? '✅ Test email sent to ' + DPL_NOTIFY_EMAIL
        : '❌ Failed — re-run and authorize the Mail permission when prompted.'); } catch(e) {}
}

/* 📧 Proactive weekly summary — emailed every Monday (and on demand from the menu).
 * Reads the last 14 completed days from Daily P&L and reports a rolling 7-day snapshot
 * with week-over-week deltas. Pure read; never blocks anything. */
/** Full daily rebuild — everything the menu does, in one pass. Each step guarded so
 *  one failure never blocks the rest. Runs once/day BEFORE the Lark bot (≈13:00 ICT). */
/* ── Reliability: failure alert + heartbeat ─────────────────────────────────
 * The automated refresh runs unattended, so a silent failure could go unnoticed for days.
 * On any failed step the daily refresh emails a summary; every run also stamps a heartbeat
 * into Script Properties (surfaced by 🩺 Health Check). */
var DPL_NOTIFY_EMAIL = 'foxwears.net@gmail.com';

function _dplNotifyEmail(subject, body) {
  try { MailApp.sendEmail(DPL_NOTIFY_EMAIL, subject, body); return true; }
  catch(e) { Logger.log('[notify] email failed: ' + e.message); return false; }
}

/** Trailing digits of an order name: '#GPN3763' → 3763. Null if none. */
function _dplOrderNum(name) {
  if (name == null) return null;
  var m = String(name).match(/(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : null;
}

/** Reconcile the CRM against Shopify to catch a stalled/incomplete sync.
 *  Uses the LATEST order number (filter- and timezone-independent) as the authoritative
 *  "is the sync behind?" signal, plus a total count for context. 2 lightweight API calls. */
function _dplReconcileShopify() {
  var r = { ok:true, msg:'', shopifyCount:null, b2cCount:0, shopifyLatest:null, b2cLatest:null, behind:false, countGap:null };
  try {
    var base = 'https://' + SHOPIFY_STORE + '/admin/api/' + SHOPIFY_API_VER;
    var opt  = { headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN }, muteHttpExceptions: true };
    var since = '2025-05-01T00:00:00Z';

    var cRes = UrlFetchApp.fetch(base + '/orders/count.json?status=any&created_at_min=' + encodeURIComponent(since), opt);
    if (cRes.getResponseCode() === 200) r.shopifyCount = (JSON.parse(cRes.getContentText()) || {}).count;

    var lRes = UrlFetchApp.fetch(base + '/orders.json?status=any&limit=1&order=created_at+desc&fields=name,created_at', opt);
    if (lRes.getResponseCode() === 200) { var lo = (JSON.parse(lRes.getContentText()) || {}).orders; if (lo && lo.length) r.shopifyLatest = lo[0].name; }

    var ws = _getSSActive().getSheetByName(DPL.B2C);
    r.b2cCount = (ws && ws.getLastRow() >= 3) ? ws.getLastRow() - 2 : 0;
    if (r.b2cCount > 0) r.b2cLatest = ws.getRange(3, 2).getDisplayValue();   // newest-first → row 3 col B

    var sN = _dplOrderNum(r.shopifyLatest), bN = _dplOrderNum(r.b2cLatest);
    r.behind = (sN != null && bN != null && sN > bN);
    if (r.shopifyCount != null) r.countGap = r.shopifyCount - r.b2cCount;
  } catch(e) { r.ok = false; r.msg = e.message; }
  return r;
}

/* GAS hard-kills any execution at 6 min (360s). We stop launching NEW steps after
 * 285s so the status-prop write + alert email always run, instead of the whole run
 * being killed mid-step (which loses the status and leaves the trigger "failed"). */
var _DPL_STEP_BUDGET_MS = 285000;

/* Generic ordered step-runner shared by the two daily halves. Per-step try/catch
 * PLUS a wall-clock budget guard: if the budget is exceeded it SKIPS the remaining
 * steps (they finish on the next scheduled run) rather than risking a hard timeout.
 * Writes <propRun>/<propStatus> and emails on any failure or skip. */
function _dplRunDaily(label, steps, propRun, propStatus) {
  var t0 = Date.now();
  var stamp = Utilities.formatDate(new Date(), DPL.VN_TZ, 'yyyy-MM-dd HH:mm') + ' ' + DPL.TZ_LABEL;
  Logger.log('[' + label + '] start ' + stamp);

  // v28.12 THE LAST STEP WAS STARVED FOR EVER. The budget guard stops at whatever step the clock
  // runs out on, and the next run starts again from step 1, so the same tail step is dropped every
  // single day. 'MER status' is last in the analytics list and had been skipped repeatedly while
  // the alert promised it would 'complete automatically on the next run'. It never could.
  // Now whatever was skipped is remembered and PROMOTED TO THE FRONT of the next run, so a starved
  // step gets first claim on the budget instead of last. Normal order is otherwise untouched.
  var _skipKey = 'DPL_SKIPPED_' + label.replace(/[^A-Za-z]/g, '').toUpperCase();
  var _prev = [];
  try { _prev = JSON.parse(PropertiesService.getScriptProperties().getProperty(_skipKey) || '[]'); } catch (e) { _prev = []; }
  if (_prev.length) {
    var _front = [], _rest = [];
    steps.forEach(function (st) { (_prev.indexOf(st.name) >= 0 ? _front : _rest).push(st); });
    if (_front.length) {
      steps = _front.concat(_rest);
      Logger.log('[' + label + '] promoting previously skipped step(s) to the front: ' + _prev.join(', '));
    }
  }

  var errors = [], skipped = [];
  for (var i = 0; i < steps.length; i++) {
    if (Date.now() - t0 > _DPL_STEP_BUDGET_MS) {
      for (var j = i; j < steps.length; j++) skipped.push(steps[j].name);
      Logger.log('[' + label + '] time budget reached — skipped: ' + skipped.join(', '));
      break;
    }
    try { steps[i].fn(); }
    catch (e) { errors.push('• ' + steps[i].name + ': ' + e.message); Logger.log('[' + label + '] ' + steps[i].name + ': ' + e.message); }
  }
  try { PropertiesService.getScriptProperties().setProperty(_skipKey, JSON.stringify(skipped)); } catch (e) {}
  var parts = [];
  if (!errors.length && !skipped.length) parts.push('OK');
  if (errors.length)  parts.push('FAIL (' + errors.length + ')');
  if (skipped.length) parts.push('SKIPPED ' + skipped.length + ' (time budget)');
  var status = parts.join(' \u00B7 ');
  try {
    var props = PropertiesService.getScriptProperties();
    props.setProperty(propRun, stamp);
    props.setProperty(propStatus, status);
  } catch (e) {}
  if (errors.length || skipped.length) {
    var body = 'The automated ' + label + ' ran at ' + stamp + '.\n\n';
    if (errors.length)  body += errors.length + ' step(s) FAILED:\n' + errors.join('\n') + '\n\n';
    if (skipped.length) body += skipped.length + ' step(s) were SKIPPED to stay under the 6-minute limit. ' +
        'They run FIRST on the next scheduled run, so they are not starved:\n• ' + skipped.join('\n• ') + '\n\n' +
        'If the same step keeps being skipped for several days, the whole list no longer fits the ' +
        'budget and one step should move to its own trigger rather than rotate for ever.\n\n';
    body += 'Re-run the affected step from the 📅 GerberaPrints menu if needed, or check the Apps Script log.';
    _dplNotifyEmail('⚠️ GerberaPrints CRM — ' + label + ': ' + status, body);
  }
  Logger.log('[' + label + '] done — ' + status);
  return { errors: errors, skipped: skipped };
}

/* ── Daily CORE (revenue + spend essentials) · own 13:00 trigger ──────────────
 * Runs FIRST and ALONE so the Facebook spend + P&L core can never be blocked or
 * timed-out by the variable-latency Klaviyo analytics steps. THIS is what makes
 * FB Ad spend auto-update reliably every day. */
function _dplDailyCore() {
  var res = _dplRunDaily('daily core', [
    { name: 'Shopify sync',      fn: function(){ syncShopifyOrdersNew(); } },
    { name: 'FB Ads sync',       fn: function(){ if (typeof syncFBAdsDaily !== 'function') throw new Error('FB_Ads_Daily.gs not in project — FB spend will go stale'); syncFBAdsDaily(); } },
    { name: 'Daily P&L',         fn: function(){ buildDailyPLNet(new Date(2025, 4, 1), new Date()); } },
    { name: 'Shopify reconcile', fn: function(){
        var rec = _dplReconcileShopify();
        if (rec && !rec.ok)    throw new Error('API error — ' + rec.msg);
        if (rec && rec.behind) throw new Error('Shopify sync BEHIND — Shopify latest ' + rec.shopifyLatest +
            ' vs B2C ' + rec.b2cLatest + ' (count gap ' + rec.countGap + '). Run 🛒 Sync Shopify, or 🔁 Re-sync ALL B2C if it persists.');
      } }
  ], 'DPL_LAST_CORE_RUN', 'DPL_LAST_CORE_STATUS');
  // Mirror into the legacy daily props so Health Check + the Lark card keep reading a value.
  try {
    var p = PropertiesService.getScriptProperties();
    p.setProperty('DPL_LAST_DAILY_RUN',    p.getProperty('DPL_LAST_CORE_RUN')    || '');
    p.setProperty('DPL_LAST_DAILY_STATUS', p.getProperty('DPL_LAST_CORE_STATUS') || '');
  } catch (e) {}
  return res;
}

/* ── Daily ANALYTICS (rollups + Klaviyo) · own 14:00 trigger ──────────────────
 * Runs ~1h after CORE so it reads the freshly-built Daily P&L. Klaviyo's variable
 * latency lives here, fully isolated from the FB/revenue core above. */
function _dplDailyAnalytics() {
  // v27.97/98: the 3 Klaviyo steps MOVED OUT to their own _dplKlaviyo* handlers+triggers (10/11/12h). Their HTTP-429
  // rate-limit retries were blowing the 6-min wall -> hard-kill (uncatchable) -> LAST_ANALYTICS_RUN
  // never stamped (stuck 07-10) + no alert email (notify is post-loop) + Google disabled the trigger.
  return _dplRunDaily('daily analytics', [
    { name: 'Monthly P&L',       fn: function(){ dplRebuildMonthly(); } },
    { name: 'Channel Trends',    fn: function(){ buildChannelTrends(); } },
    { name: 'Channel Daily',     fn: function(){ buildChannelDaily(); } },
    { name: 'UTM Attribution',   fn: function(){ if (typeof buildUtmAttribution === 'function') buildUtmAttribution(7); } },
    { name: 'Missing-COGS list', fn: function(){ dplListMissingCogs(); } },
    { name: 'FB Acquisition',    fn: function(){ if (typeof buildAcquisitionViews === 'function') buildAcquisitionViews(); } },   // v28.2
    { name: 'nCAC',              fn: function(){ if (typeof buildNcacReport === 'function') buildNcacReport(); } },               // v28.3 auto-refresh
    { name: 'MER status',        fn: function(){ if (typeof _merStatusRefresh === 'function') _merStatusRefresh(); } }            // v28.3 light status only (keeps MER Test config)
  ], 'DPL_LAST_ANALYTICS_RUN', 'DPL_LAST_ANALYTICS_STATUS');
}

/* Daily KLAVIYO (email/SMS scorecards) - own ~15:00 trigger, isolated from analytics. Klaviyo 429
 * retries have unbounded latency; the scorecard self-defers under a time budget (never hard-kills),
 * and on its own trigger a slow Klaviyo run can never block Monthly P&L / reconciliation / UTM. */
/* v27.98: Klaviyo SPLIT into 3 one-step handlers, each on its OWN trigger (10/11/12h). Running all
 * three in ONE execution stacked their 429 rate-limit retries and blew the 6-min wall (v27.97 only
 * guarded the campaign scorecard, so the hard-kill just MOVED to the SMS scorecard). Alone, each
 * finishes in ~1-3 min with a full 6-min wall; the 1-hour gap also lets Klaviyo's rate-limit window
 * recover between them. All run before the 15:30 Lark bot so the scorecards it reads are fresh. */
function _dplKlaviyoEmail() {
  return _dplRunDaily('klaviyo email', [
    { name: 'Klaviyo email', fn: function(){ if (_klApiKey()) dplSyncKlaviyoEmail(3); } }
  ], 'DPL_LAST_KLEMAIL_RUN', 'DPL_LAST_KLEMAIL_STATUS');
}
function _dplKlaviyoScorecard() {
  return _dplRunDaily('klaviyo scorecard', [
    { name: 'Campaign Scorecard', fn: function(){ if (_klApiKey()) dplSyncCampaignScorecard(); } }
  ], 'DPL_LAST_KLSCORE_RUN', 'DPL_LAST_KLSCORE_STATUS');
}
function _dplKlaviyoSms() {
  return _dplRunDaily('klaviyo sms', [
    { name: 'SMS Scorecard', fn: function(){ if (_klApiKey()) dplSyncSmsScorecard(); } }
  ], 'DPL_LAST_KLSMS_RUN', 'DPL_LAST_KLSMS_STATUS');
}

/* Manual one-shot "run everything" (kept for back-compat / menu). The automated
 * triggers use the two split halves above; this just chains them on demand. */
function _dplDailyRefreshAll() {
  _dplDailyCore();
  _dplDailyAnalytics();
}

function dplInstallTrigger() {
  try {
    var a = SpreadsheetApp.getActiveSpreadsheet();
    if (a) PropertiesService.getScriptProperties().setProperty('TARGET_SS_ID', a.getId());
  } catch(e) {}
  var removed = 0;
  // v27.78: surgical - manage ONLY our own 3 core handlers; never wipe other subsystems'
  // clock triggers (Airwallex 12h / Klaviyo recovery 9h / FB campaign / Email-Perf 15h).
  // Prevents "Enable auto-update" from silently deleting the rest of the automation.
  var _MINE = {}; _MINE[_HOURLY_FN] = 1; _MINE['_dplDailyCore'] = 1; _MINE['_dplDailyAnalytics'] = 1; _MINE['_dplKlaviyoEmail'] = 1; _MINE['_dplKlaviyoScorecard'] = 1; _MINE['_dplKlaviyoSms'] = 1;  _MINE['_dplDailyKlaviyo'] = 1;   // v27.98 legacy cleanup: remove the old single klaviyo trigger (handler renamed to the 3 above)
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getTriggerSource() === ScriptApp.TriggerSource.CLOCK && _MINE[t.getHandlerFunction()]) { ScriptApp.deleteTrigger(t); removed++; }
  });
  ScriptApp.newTrigger(_HOURLY_FN).timeBased().everyHours(1).create();                       // light: sync + Daily P&L (full 2025→now)
  ScriptApp.newTrigger('_dplDailyCore').timeBased().everyDays(1).atHour(13).create();        // 13h ICT — FB Ads + Shopify + Daily P&L + reconcile
  ScriptApp.newTrigger('_dplDailyAnalytics').timeBased().everyDays(1).atHour(14).create();   // 14h ICT — Monthly + Klaviyo + Scorecard + Channel + AdsPerf + UTM
  ScriptApp.newTrigger('_dplKlaviyoEmail').timeBased().everyDays(1).atHour(10).create();      // 10h — Klaviyo email (own 6-min wall)
  ScriptApp.newTrigger('_dplKlaviyoScorecard').timeBased().everyDays(1).atHour(11).create();  // 11h — Campaign scorecard (own wall)
  ScriptApp.newTrigger('_dplKlaviyoSms').timeBased().everyDays(1).atHour(12).create();        // 12h — SMS scorecard (own wall)
  var msg = '✅ Core auto-update enabled (refreshed ' + removed + ' core trigger(s); other subsystems untouched).\n' +
            '• Every hour: Shopify sync + Daily P&L (full 2025→now).\n' +
            '• Every day ~13:00 ICT — CORE: FB Ads sync + Shopify + Daily P&L + reconcile.\n' +
            '• Every day ~14:00 ICT — ANALYTICS: Monthly P&L + Channel Trends + Channel Daily + UTM (fast/reliable).\n' +
            '• Klaviyo on OWN triggers: email ~10:00 / Campaign scorecard ~11:00 / SMS scorecard ~12:00 (each a full 6-min wall, 429-safe).\n' +
            '(FB Ads is now isolated in the 13:00 CORE run so slow Klaviyo calls can never block or time it out.)\n' +
            '(Both daily runs finish well before the 15:30 Lark bot.)\n\n' +
            '🔔 If any step fails OR is skipped to beat the 6-min limit, an alert email goes to ' + DPL_NOTIFY_EMAIL + '.\n' +
            'Run Setup → ✉️ Send test alert email once to authorize Mail; use 🩺 Health Check anytime.';
  try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); }
}

/** Lists every B2C order with NO actual COGS in the Fulfillment Hub — these are the orders that
 *  flip a day to ⏳. Import their cost into the Hub and the day turns ✅. Writes '🔎 Missing COGS'. */
function dplListMissingCogs() {
  var ss = _getSSActive();
  var cogsInfo = _dplLoadCogsMap();
  var cogsMap  = cogsInfo.map;
  var skuCogs  = _dplCogsBySKU(cogsInfo.prefixCost);
  var hubNum = {}; Object.keys(cogsMap).forEach(function(g){ var nn = String(g).replace(/[^0-9]/g,''); if (nn) hubNum[nn] = g; });   // numeric index for format-mismatch detection
  var allGpns = cogsInfo.allGpns || {};   // every GPN present in Hub (even cost=0)
  var _mcNow = new Date(), _mc45 = new Date(_mcNow.getTime() - 45*86400000);
  var wsB2C = ss.getSheetByName(DPL.B2C);
  if (!wsB2C || wsB2C.getLastRow() < 3) { ss.toast('No B2C data', '🔎', 5); return; }
  var _bw = Math.min(29, wsB2C.getMaxColumns());
  var b2c = wsB2C.getRange(3, 1, wsB2C.getLastRow() - 2, _bw).getValues();

  var rows = [], totMissRev = 0;
  b2c.forEach(function(r){
    var d = r[0]; if (!(d instanceof Date) || isNaN(d.getTime())) return;
    var totalRev = parseFloat(r[15]) || 0; if (totalRev <= 0) return;
    var gpn = _dplCleanGPN(r[1]);
    if ((cogsMap[gpn] || 0) > 0) return;            // has actual COGS → not missing
    var estVia = (skuCogs[gpn] || 0) > 0 ? 'SKU estimate' : 'trailing %';
    var ful = String(r[19]||'').toLowerCase(), cancelled = String(r[28]||'').trim() === 'CANCELLED';
    var refund = parseFloat(r[21]) || 0, qty = parseFloat(r[17]) || 0;
    var reason, pr;
    if (cancelled || ful.indexOf('restock') >= 0) { reason = 'RESTOCKED/CANCELLED — no COGS expected'; pr = 7; }
    else if (qty <= 0) { reason = 'NO PRODUCT (insurance/tip only) — no COGS'; pr = 6; }
    else if (refund > 0 && refund >= (parseFloat(r[9]) || totalRev) * 0.85) { reason = 'REFUNDED — money returned, no COGS incurred'; pr = 5; }
    else if (ful !== 'fulfilled') { reason = 'UNFULFILLED — not shipped yet, no COGS yet'; pr = 4; }
    else if (d >= _mc45) { reason = 'PENDING INVOICE (<45d — auto-resolves)'; pr = 3; }
    else { var num = String(gpn).replace(/[^0-9]/g,'');
      if (num && hubNum[num]) { reason = 'FIXABLE · GPN FORMAT MISMATCH — Hub has "' + hubNum[num] + '"'; pr = 0; }
      else if (allGpns[gpn]) { reason = 'IN HUB · cost cell EMPTY — fill supplier cost in Hub'; pr = 1; }
      else { reason = 'NOT IN HUB · order absent from supplier sheet — check fulfillment pipeline'; pr = 2; } }
    rows.push([d, r[1], parseFloat(r[9])||0, totalRev, (r[20]||''), (r[19]||'unfulfilled'), estVia, reason, pr]);
    totMissRev += totalRev;
  });
  rows.sort(function(a,b){ return (a[8]-b[8]) || (b[0]-a[0]); });   // priority: format-mismatch, supplier-gap, pending, restock
  var _mcCnt = { mismatch:0, hubempty:0, notinhub:0, pending:0, unful:0, refund:0, noprod:0, restock:0 };
  rows.forEach(function(r){ var p=r[8]; if(p===0)_mcCnt.mismatch++; else if(p===1)_mcCnt.hubempty++; else if(p===2)_mcCnt.notinhub++; else if(p===3)_mcCnt.pending++; else if(p===4)_mcCnt.unful++; else if(p===5)_mcCnt.refund++; else if(p===6)_mcCnt.noprod++; else _mcCnt.restock++; r.pop(); });

  var ws = ss.getSheetByName('🔎 Missing COGS') || ss.insertSheet('🔎 Missing COGS');
  _dplResetSheet(ws);
  ws.getRange(1,1,1,8).merge()
    .setValue('🔎  Missing ACTUAL COGS  ·  ' + (_mcCnt.mismatch + _mcCnt.hubempty + _mcCnt.notinhub) + ' ACTIONABLE  ·  ' +
              rows.length + ' total of ' + b2c.length + '  ·  matched ' + Object.keys(cogsMap).length + ' (' + cogsInfo.src + ')' +
              // v28.6 Say what the Hub read actually returned. 'matched 245' looked like a data gap
              // for weeks when it was a failed read of two sheets, and nothing on screen said so.
              (cogsInfo.sheetReport ? '  ·  Hub read: ' + cogsInfo.sheetReport : '') +
              ((cogsInfo.readFailed && cogsInfo.readFailed.length)
                 ? '  ·  ⚠ HUB READ FAILED: ' + cogsInfo.readFailed.join(' ; ') + ' — rerun before trusting this list'
                 : ''))
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(13).setFontWeight('bold');
  ws.setRowHeight(1, 30);
  ws.getRange(2,1,1,8).setValues([['Date','Order#','Net Sales ($)','Total Rev ($)','SKUs','Fulfillment','Estimated via','Reason']])
    .setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(DPL.TNR).setFontWeight('bold').setFontSize(10);
  if (rows.length) {
    ws.getRange(3,1,rows.length,8).setValues(rows).setFontFamily(DPL.TNR).setFontSize(10);
    ws.getRange(3,1,rows.length,1).setNumberFormat('yyyy-mm-dd');
    ws.getRange(3,3,rows.length,2).setNumberFormat('"$"#,##0.00');
  }
  ws.setFrozenRows(2);
  [96,90,90,90,220,96,90,320].forEach(function(w,i){ ws.setColumnWidth(i+1, w); });
  _dplPrettyGrid(ws, 2, 3, 8);
  ss.toast('🔎 ACTION: ' + _mcCnt.mismatch + ' mismatch-fix · ' + _mcCnt.hubempty + ' IN-HUB-cost-empty · ' + _mcCnt.notinhub + ' NOT-in-Hub  ||  ignore: pending ' + _mcCnt.pending + ' · unful ' + _mcCnt.unful + ' · refunded ' + _mcCnt.refund + ' · no-prod ' + _mcCnt.noprod + ' · restock ' + _mcCnt.restock, '🔎', 22);
}

function dplDiagnostics() {
  var ss = _getSSActive();
  var msg = '🔍 Diagnostics\n\n';
  var b2c = ss.getSheetByName(DPL.B2C);
  msg += 'Shopify B2C: ' + (b2c ? (Math.max(0,b2c.getLastRow()-2) + ' order rows') : 'MISSING') + '\n';
  var hubId = PropertiesService.getScriptProperties().getProperty('FULFILLMENT_HUB_ID');
  msg += 'Fulfillment Hub ID: ' + (hubId ? 'set' : 'NOT SET — COGS will be $0') + '\n';
  var cogs = _dplLoadCogsMap();
  msg += 'COGS map: ' + Object.keys(cogs.map).length + ' orders (' + cogs.src + ')\n';
  var ad = _dplLoadAdSpend(); var adKeys = Object.keys(ad).sort();
  msg += 'Ad Spend fed through: ' + (adKeys.length ? adKeys[adKeys.length-1] : 'none') + '\n';
  var fx = _dplLoadFixedMonthly();
  msg += 'Cost Tracker months: ' + Object.keys(fx).length + '\n';
  var trig = ScriptApp.getProjectTriggers().filter(function(t){ return t.getTriggerSource()===ScriptApp.TriggerSource.CLOCK; }).length;
  msg += 'Clock triggers: ' + trig;
  try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); }
}

// ════════════════════════════════════════════════════════════════════════
//  CLEANUP — SAFE  (explicit delete-list + normalized protect; preview first)
//  Only sheets explicitly listed in _DPL_DELETE can be removed, AND a protect
//  match always wins. Name matching is normalized (emoji/space/punct ignored),
//  so '📱 FB Ads Daily' / 'FB Ads Daily' / ' FB Ads Daily ' all match.
// ════════════════════════════════════════════════════════════════════════

/** Normalize a sheet name so emoji / spaces / punctuation don't matter. */
function _dplNorm(s) { return (s == null ? '' : s.toString()).toLowerCase().replace(/[^a-z0-9]/g, ''); }

/** PROTECT — pipeline-critical, NEVER deleted (read/written by the Lark bot,
 *  FB Ads Daily, Google Ads Script, Daily P&L builder, Shopify sync). */
var _DPL_PROTECT = [
  'Shopify B2C', '📅 Daily P&L', '📱 FB Ads Daily', '📊 Ad Spend', '🔍 Google Ads Daily',
  '💰 Cost Tracker', '⚙ Settings', '🛍️ Product Catalog', '🧭 UTM Attribution',
  '🎩 MTP Cap', '👕 Yoycol', '📦 CustomEase', '🔎 FB Accounts (temp)'
];

/** HOLD — may contain raw/manual data; NOT auto-deleted. Delete by hand later if unused. */
var _DPL_HOLD = ['SKU Raw Data', '🏌️ B2B Pipeline', 'B2B Pipeline'];

/** DELETE — known redundant v26 dashboards/analytics/payment sheets (all rebuildable). */
var _DPL_DELETE = [
  'Hub KPI Summary', 'Dashboard', 'KW Log',
  'Annual Business Report', 'Monthly Business Report', 'P&L Statement', 'SKU P&L Report',
  'WoW Revenue Tracker', 'Campaign Attribution', 'Campaign Checkpoint', 'Daily MER',
  'Cinco de Mayo Checkpoint', 'Revenue Target Tracker', 'Daily Heatmap',
  'Order Analytics', 'Product Dashboard', 'SKU Analytics', 'Geo Analytics',
  'COGS & Product Dashboard', 'Cost Dashboard',
  'Payment Analytics', 'Payment Dashboard', 'Airwallex', 'PayPal',
  'Dispute Tracker', 'Failed Payments', 'System Diagnostics', 'Help Guide',
  'Master Orders', '📋 Master Orders'
];

/** Classify each sheet -> delete / protect / hold / other. Protect ALWAYS wins. */
function _dplClassifySheets() {
  var ss = _getSSActive();
  var pN = {}; _DPL_PROTECT.forEach(function(n){ pN[_dplNorm(n)] = true; });
  var hN = {}; _DPL_HOLD.forEach(function(n){ hN[_dplNorm(n)] = true; });
  var dN = {}; _DPL_DELETE.forEach(function(n){ dN[_dplNorm(n)] = true; });
  var out = { del: [], protect: [], hold: [], other: [] };
  ss.getSheets().forEach(function(sh){
    var name = sh.getName(), k = _dplNorm(name);
    if (pN[k])      out.protect.push(name);
    else if (hN[k]) out.hold.push(name);
    else if (dN[k]) out.del.push(name);
    else            out.other.push(name);
  });
  return out;
}

/** DRY-RUN — shows exactly what WOULD be deleted vs kept. No changes. Run this first. */
function dplPreviewCleanup() {
  var c = _dplClassifySheets();
  var msg = '👁 CLEANUP PREVIEW (nothing deleted yet)\n\n' +
    '🗑 WILL DELETE (' + c.del.length + '):\n' + (c.del.join('\n') || '  — none —') + '\n\n' +
    '🔒 PROTECTED — pipeline-critical (' + c.protect.length + '):\n' + (c.protect.join('\n') || '  — none —') + '\n\n' +
    '⏸ HELD for review — kept (' + c.hold.length + '):\n' + (c.hold.join('\n') || '  — none —') + '\n\n' +
    '➕ OTHER kept (' + c.other.length + '):\n' + (c.other.join('\n') || '  — none —');
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch(e) {}
}

/** Delete ONLY known-redundant v26 sheets. Protected + held + unknown are never touched.
 *  BACKUP FIRST (File -> Make a copy). Run dplPreviewCleanup() to review before confirming. */
function dplCleanupOldSheets() {
  var ss = _getSSActive();
  var c = _dplClassifySheets();
  if (!c.del.length) { ss.toast('Nothing to remove — already lean.', '🗑', 5); return; }
  var ui = SpreadsheetApp.getUi();
  var r = ui.alert('🗑 Delete ' + c.del.length + ' redundant v26 sheets?',
    'BACKUP FIRST: File -> Make a copy (recommended).\n\n' +
    'WILL DELETE:\n' + c.del.join('\n') + '\n\n' +
    'KEPT (protected): ' + c.protect.join(', ') + '\n' +
    'HELD (review later): ' + (c.hold.join(', ') || 'none') + '\n\n' +
    'Proceed?', ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;
  var n = 0, failed = [];
  c.del.forEach(function(name){
    try { ss.deleteSheet(ss.getSheetByName(name)); n++; }
    catch(e) { failed.push(name); }
  });
  var done = '✅ Removed ' + n + ' sheets.' + (failed.length ? ' Could not remove: ' + failed.join(', ') : '');
  ss.toast(done, '🗑', 8);
  Logger.log(done);
}

// ════════════════════════════════════════════════════════════════════════
//  📦 PRODUCT TYPE P&L  (v27.58) — gross margin by product type
//  Source = 'SKU Raw Data' (per line-item: Date,Order#,SKU,Title,Variant,Price,Qty).
//  Revenue = Price × Qty (GROSS line-item, pre order-level discount).
//  COGS    = supplier per-prefix avg cost × Qty (from _dplLoadCogsMap().prefixCost).
//  Gross Profit = Rev − COGS.  Operating costs (gateway/ads/fixed) stay BLENDED in
//  the main P&L (not per-product-attributable) — this view is for product-MIX & margin.
// ════════════════════════════════════════════════════════════════════════
// buildProductTypePL() moved to module GP_ProductPL.gs (v27.61) — menu '📦 Rebuild Product Type P&L' still calls it (same project).