/* ════════════════════════════════════════════════════════════════════════════
 *  GP_FB_Campaign_Sync.gs  —  v2.10
 *
 *  v2.10 — THE TRANSITION CASE v2.9 COULD NOT SEE, found live on 2026-08-18. Three campaigns
 *      were renamed (budget raised in the name: B2G1 $65→$80, Sleeveless $190→$220,
 *      New Products→New Polo) BEFORE their history rows had been stamped with a Campaign ID.
 *      The fresh fetch carried the new name + id; the legacy rows carried the old name and a
 *      blank id; NEITHER key matched, so ~136 window days were appended a second time. Worse,
 *      _fbcAssertNoDupes keyed the blank-id rows by name and the new rows by id — different
 *      keys — and reported the tab clean while it held duplicates. The guard answered
 *      confidently outside what it could actually verify, which is the exact failure this
 *      project keeps relearning.
 *      Fix, two parts: (1) declare each rename in FBC_RENAMES and run fbcApplyRenameMerges()
 *      once — it validates the pair, deletes the legacy copy of any day the id-stamped fetch
 *      already restated, and stamps id + current name onto the older history so the campaign
 *      becomes ONE continuous line; (2) the integrity check now REPORTS how many rows still
 *      lack a Campaign ID and says plainly that renames are invisible for those rows, so a
 *      'clean' verdict states its own limits.
 *
 *  v2.9 — THE UPSERT KEY IS NOW THE CAMPAIGN ID, NOT THE NAME. A campaign name is not an
 *      identity: Facebook keeps the same id through a rename. Keyed on the name, the run after
 *      a rename cannot find the old rows and APPENDS a second row for every day still inside
 *      the window — the exact bug that put 12 phantom rows and $785 of double-counted cost
 *      into the Google sheet in July 2026. The FB names were compared pairwise on 2026-08-18
 *      and no rename has happened here YET; this closes the door before it does.
 *      Column R 'Campaign ID' is APPENDED (17 → 18 cols) so no existing column shifts:
 *      the heatmap still reads A:Q and GP_FBC_Likert still grades F..Q untouched. Legacy rows
 *      have a blank R and keep matching on date+account+name until a fresh run stamps them.
 *      Every run ends with _fbcAssertNoDupes(), the question whose absence let the Google
 *      version of this bug live for weeks.
 *
 *  v2.8 — fbcDiagAccountAccess(). Facebook's 403 says 'Ad account owner has NOT grant
 *      ads_management or ads_read permission' and names neither the account nor the owner, so it
 *      cannot be acted on. This lists every configured account against what the token can
 *      actually reach, names the owning portfolio for the ones that work, and reports the exact
 *      ids to hand to whoever administers Meta.
 *
 *  v2.7 — NO BLOCKING DIALOGS. getUi().alert() waits for a human to press OK while the execution
 *      clock keeps running. fbcBackfillStep finished its month at 09:55:00 and was then killed at
 *      09:59:55 for 'Exceeded maximum execution time' purely because nobody had answered the
 *      dialog. The month had already been written and the cursor already saved, so nothing was
 *      lost, but the run is filed as a failure. A red error on a job that succeeded is how people
 *      learn to ignore red errors. Every report now goes through _fbcSay: log always, toast if a
 *      spreadsheet is attached, and never a wait.
 *
 *  v2.6 — BACKFILL YOU CAN ACTUALLY RUN. v2.5 shipped fbcBackfill(since, until), which the Apps
 *      Script editor cannot call: the Run button takes no arguments, so the only way to use it
 *      was to edit the source between every month. A tool that needs the code changed to be used
 *      does not get used. fbcBackfillStep() takes NO arguments, walks one month further back on
 *      each press, and remembers where it reached in a script property, so the whole history is
 *      a matter of clicking Run until it says there is nothing older.
 *
 *  v2.5 — TWO FIXES.
 *  (1) HISTORY WAS BEING DELETED, not missing. Facebook returns whatever window is asked for;
 *      this file asked for 45 days and then did a FULL REFRESH, clearing every data row before
 *      writing. Anything older than the window was destroyed on every run, so the tab could never
 *      hold more than 45 days no matter how long it had been running. The account-level sibling
 *      (FB_Ads_Daily) already upserts by date+account and keeps its history; this one did not.
 *      Now it upserts on date+account+campaign, so old rows survive and a backfill accumulates.
 *  (2) COST PER PURCHASE (CPP) ADDED. The tab carried ATC Cost and Checkout Cost but not the one
 *      cost that maps to money: spend per purchase. CPC was being colour-graded instead, and CPC
 *      is not a business metric here. Days with a $0.83 CPC and zero purchases looked green.
 *      CPP is spend divided by purchases, blank when there are no purchases, because a cost per
 *      purchase on zero purchases is not infinity, it is unknown.
 *  Facebook Ads → CAMPAIGN-level daily sync, for the 🎯 Campaign Daily heatmap.
 *
 *  DEPENDS ON FB_Ads_Daily.gs (same project) — reuses its proven helpers so token,
 *  accounts, GP markers, attribution window and VND→USD stay 100% consistent:
 *    _fbaToken · _fbaAccountIds · _fbaCampaignMarkers · _fbaIsGP ·
 *    _fbaInsightsAll · _fbaApiCall · _fbaToUSD · _fbaVndRate · FBA.TZ_PST
 *  …and _dplResetSheet / _getSSActive from the CRM main file.
 *
 *  WHY A SEPARATE FILE + TAB (do NOT merge into 📱 FB Ads Daily):
 *    • '📱 FB Ads Daily' (account-level) stays the source of truth for SPEND and
 *      feeds Daily/Monthly P&L. This file NEVER touches it.
 *    • This writes a NEW tab '📱 FB Campaign Daily' (row per account×campaign×day),
 *      used ONLY for the heatmap drill-down.
 *
 *  PURCHASE x2/x3 FIX (the whole point):
 *    The account sync SUMS several purchase action_types — at campaign level that
 *    double/triple-counts. Here we take EXACTLY ONE type, by priority (pixel first
 *    to match Ads Manager's Purchases column), NEVER summed. Same for ATC/Checkout
 *    and for Revenue (action_values).
 *
 *  HONEST CAVEAT (printed on the tab): per-campaign purchases are platform-
 *  attributed and do NOT sum to the account total (FB overlaps conversions across
 *  campaigns). Trend only — account-level remains source of truth.
 * ════════════════════════════════════════════════════════════════════════════ */

var FBC = {
  SHEET      : '📱 FB Campaign Daily',
  // v2.5 How far back each RUN asks Facebook for. This is a refresh window, no longer a retention
  // limit: rows outside it are left alone instead of being wiped. 45 days comfortably re-states
  // anything Facebook is still settling while keeping one run inside the 6-minute wall.
  WINDOW_DAYS: 45,
  // Set by fbcBackfill() to pull an older slice without touching the daily window.
  NCOLS      : 18,                 // v2.5 +1 for CPP · v2.9 +1 for Campaign ID (col R, appended last)
  BACKFILL_FLOOR_MONTHS: 37,       // v2.6 Facebook keeps campaign insights roughly this long
  REPORT_TIME: 'impression',       // 'impression' = click date (MATCHES Ads Manager). 'conversion' = sale date (Shopify-aligned).
  ATTR       : ['7d_click'],        // attribution window — match your Ads Manager Purchases column (default 7-day click)
  TNR        : 'Times New Roman',
  // single action_type priority — pixel first (matches Ads Manager) · FIRST present wins · NEVER summed
  PURCH      : ['offsite_conversion.fb_pixel_purchase', 'omni_purchase', 'purchase'],
  ATC        : ['offsite_conversion.fb_pixel_add_to_cart', 'omni_add_to_cart', 'add_to_cart'],
  CHECKOUT   : ['offsite_conversion.fb_pixel_initiate_checkout', 'omni_initiated_checkout', 'initiate_checkout']
};

/** Value of the FIRST matching action_type in priority order (single — never summed). */
function _fbcPickOne(items, types) {
  if (!items) return 0;
  for (var t = 0; t < types.length; t++)
    for (var i = 0; i < items.length; i++)
      if (items[i].action_type === types[t]) return parseFloat(items[i].value) || 0;
  return 0;
}

/** MAIN — pull campaign-level daily insights for GP campaigns, full-refresh the tab. */
function fetchFBCampaignDaily() {
  var ss  = _getSSActive();
  var ids = _fbaAccountIds();
  if (!ids.length) throw new Error('No FB ad accounts configured — run 📱 FB Ads → Setup first.');

  // window (PST, today excluded) — identical convention to syncFBAdsDaily()
  var nowPST = new Date(Utilities.formatDate(new Date(), FBA.TZ_PST, 'yyyy-MM-dd') + 'T12:00:00Z');
  var until  = new Date(nowPST); until.setUTCDate(until.getUTCDate() - 1);
  var since  = new Date(until);  since.setUTCDate(since.getUTCDate() - (FBC.WINDOW_DAYS - 1));
  var fmt = function (d) { return Utilities.formatDate(d, FBA.TZ_PST, 'yyyy-MM-dd'); };
  var sinceStr = fmt(since), untilStr = fmt(until);
  // v2.5 fbcBackfill sets FBC._range to fetch an explicit older slice instead of the rolling window.
  if (FBC._range && FBC._range.since && FBC._range.until) {
    sinceStr = FBC._range.since; untilStr = FBC._range.until;
  }

  var vndRate = _fbaVndRate();
  var markers = _fbaCampaignMarkers();
  var ws = _fbcEnsureSheet(ss);
  ss.toast('FB campaign sync: ' + ids.length + ' account(s) · ' + FBC.WINDOW_DAYS + 'd…', '📱 FB Campaign', 30);

  var rows = [], errors = [], kept = 0, dropped = 0;

  ids.forEach(function (acctId) {
    try {
      var meta     = _fbaApiCall('/act_' + acctId, { fields: 'name,currency' });
      var acctName = meta.name || ('act_' + acctId);
      var cur      = meta.currency || 'USD';
      var items = _fbaInsightsAll('/act_' + acctId + '/insights', {
        level                      : 'campaign',
        time_range                 : JSON.stringify({ since: sinceStr, until: untilStr }),
        time_increment             : 1,
        fields                     : 'date_start,campaign_id,campaign_name,spend,impressions,clicks,actions,action_values',
        action_attribution_windows : JSON.stringify(FBC.ATTR),
        action_report_time         : FBC.REPORT_TIME,
        limit                      : 200
      });
      items.forEach(function (it) {
        if (!_fbaIsGP(it.campaign_name || '', markers)) { dropped++; return; }
        kept++;
        var spendUSD = _fbaToUSD(parseFloat(it.spend) || 0, cur, vndRate);
        var revUSD   = _fbaToUSD(_fbcPickOne(it.action_values, FBC.PURCH), cur, vndRate);
        var impr = parseInt(it.impressions) || 0, clk = parseInt(it.clicks) || 0;
        var atcN = _fbcPickOne(it.actions, FBC.ATC), coN = _fbcPickOne(it.actions, FBC.CHECKOUT);
        var purchN = _fbcPickOne(it.actions, FBC.PURCH);
        rows.push([
          it.date_start,                                  // A  Date
          acctName,                                       // B  Account
          it.campaign_name || '',                         // C  Campaign
          spendUSD,                                       // D  Spend (USD)
          impr,                                           // E  Impr
          impr > 0 ? spendUSD / impr * 1000 : 0,          // F  CPM (USD)
          clk,                                            // G  Clicks
          impr > 0 ? clk / impr : 0,                      // H  CTR (fraction)
          clk  > 0 ? spendUSD / clk  : 0,                 // I  CPC = Spend/Clicks
          atcN,                                           // J  ATC (single)
          atcN > 0 ? spendUSD / atcN : 0,                 // K  ATC Cost = Spend/ATC
          coN,                                            // L  Checkout (single)
          coN  > 0 ? spendUSD / coN  : 0,                 // M  Checkout Cost = Spend/Checkout
          purchN,                                         // N  Purchases (single — pixel)
          // v2.5 CPP, cost per purchase. Blank rather than zero when nothing was bought: a cost per
          // purchase with no purchases is unknown, and writing 0 would read as free acquisition and
          // colour green, which is the exact opposite of the truth.
          purchN > 0 ? spendUSD / purchN : '',            // O  CPP (USD)
          revUSD,                                         // P  Revenue (USD)
          spendUSD > 0 ? revUSD / spendUSD : 0,           // Q  ROAS
          String(it.campaign_id || '')                    // R  Campaign ID — the stable identity the upsert keys on
        ]);
      });
      Utilities.sleep(300);
    } catch (e) {
      errors.push('act_' + acctId + ': ' + e.message.substring(0, 80));
      Logger.log('[fbc] act_' + acctId + ': ' + e.message);
    }
  });

  // v2.5 UPSERT, NOT WIPE. The previous version cleared every data row before writing, so the tab
  // could only ever hold the last WINDOW_DAYS and older history was destroyed on each run. That is
  // why the campaign view appeared to stop at a month: Facebook was answering fine, the sheet was
  // being emptied. Rows are now matched on date + account + campaign; a match is overwritten with
  // the fresher figures, anything else is appended, and rows outside the window are left untouched.
  // v2.9 Two maps, id first. byId is the real identity (survives renames); byName is the
  // fallback for rows written before column R existed. A fresh row that only matches byName
  // is overwritten in full, which stamps its Campaign ID and upgrades it permanently.
  var lastRow = ws.getLastRow();
  var byId = {}, byName = {}, updated = 0, appended = 0, upgraded = 0;
  if (lastRow >= 5) {
    var keyRng = ws.getRange(5, 1, lastRow - 4, FBC.NCOLS).getValues();   // A..R
    keyRng.forEach(function (r, i) {
      if (!(r[0] instanceof Date)) return;
      var dk  = Utilities.formatDate(r[0], FBA.TZ_PST, 'yyyy-MM-dd');
      var cid = String(r[17] == null ? '' : r[17]).trim();
      if (cid) byId[dk + '|' + (r[1] || '') + '|' + cid] = 5 + i;
      byName[dk + '|' + (r[1] || '') + '|' + (r[2] || '')] = 5 + i;
    });
  }
  if (rows.length) {
    var toAppend = [];
    rows.forEach(function (r) {
      var cid = String(r[17] || '').trim();
      var kId   = cid ? (r[0] + '|' + r[1] + '|' + cid) : '';
      var kName = r[0] + '|' + r[1] + '|' + r[2];
      r[0] = new Date(r[0] + 'T12:00:00Z');
      var at = (kId && byId[kId]) || 0;
      if (!at && byName[kName]) { at = byName[kName]; upgraded++; }
      if (at) { ws.getRange(at, 1, 1, FBC.NCOLS).setValues([r]); updated++; }
      else { toAppend.push(r); }
    });
    if (toAppend.length) {
      ws.getRange(ws.getLastRow() + 1, 1, toAppend.length, FBC.NCOLS).setValues(toAppend);
      appended = toAppend.length;
    }
    // Sort the whole tab newest first so appended rows do not sit at the bottom out of order.
    var total = ws.getLastRow() - 4;
    if (total > 1) {
      ws.getRange(5, 1, total, FBC.NCOLS).sort([{ column: 1, ascending: false },
                                                 { column: 2, ascending: true },
                                                 { column: 3, ascending: true }]);
    }
    _fbcFormat(ws, ws.getLastRow() - 4);
  }
  _fbcAssertNoDupes(ws);

  var stamp = Utilities.formatDate(new Date(), FBA.TZ_PST, 'yyyy-MM-dd HH:mm');
  var totalRows = Math.max(ws.getLastRow() - 4, 0);
  ws.getRange(2, 1).setValue('Updated: ' + stamp + ' PST  ·  ' + totalRows + ' rows on file (history kept)  ·  ' +
    'this run refreshed ' + updated + ', added ' + appended + '  ·  kept ' + kept +
    ' / dropped ' + dropped + ' campaigns (markers: ' + markers.join(',') + ')' +
    (errors.length ? '  ·  ⚠ ' + errors.length + ' acct failed (logs)' : ''));
  var msg = '✅ FB Campaign Daily: ' + totalRows + ' rows on file · refreshed ' + updated +
    (upgraded ? ' (' + upgraded + ' legacy row(s) stamped with Campaign ID)' : '') +
    ' · added ' + appended + ' · kept ' + kept + ' / dropped ' + dropped +
    (errors.length ? ' · ⚠ ' + errors.length + ' acct failed' : '');
  ss.toast(msg, '📱 FB Campaign', 8);
  Logger.log(msg);
}

/**
 * v2.7 Report without blocking.
 *
 * SpreadsheetApp.getUi().alert() WAITS for someone to press OK, and the clock keeps running while
 * it waits. fbcBackfillStep finished its month at 09:55:00, then sat on an unanswered dialog until
 * Google killed the execution at 09:59:55 with 'Exceeded maximum execution time'. The work was
 * already done and the cursor already saved, but the run is recorded as a failure, and a red error
 * on a job that actually succeeded is how people learn to ignore red errors.
 * toast() draws and returns immediately, so nothing waits on a human. The log always gets the full
 * message, because a toast disappears after a few seconds and the log does not.
 */
function _fbcSay(title, msg) {
  Logger.log('[' + title + '] ' + String(msg).replace(/\n+/g, ' | '));
  try { _getSSActive().toast(String(msg).split('\n')[0], title, 10); } catch (e) {}
}

/**
 * v2.6 ONE PRESS = ONE MONTH FURTHER BACK. No arguments, because the editor cannot pass any.
 *
 * The cursor lives in a script property. Each run fetches the month it points at, upserts it, then
 * steps the cursor back one month, so pressing Run repeatedly walks the history backwards without
 * anyone having to track which months are already done.
 *
 * It stops at FBC.BACKFILL_FLOOR_MONTHS because Facebook keeps campaign insights about that long;
 * asking for older data returns empty pages and burns quota for nothing.
 *
 * Reset and start again from last month: fbcBackfillReset()
 */
function fbcBackfillStep() {
  var props = PropertiesService.getScriptProperties();
  var cur = props.getProperty('FBC_BACKFILL_CURSOR') || '';

  // First press: start at the month BEFORE the rolling window already covers, so the daily sync and
  // the backfill never fight over the same days.
  if (!/^\d{4}-\d{2}$/.test(cur)) {
    var edge = new Date();
    edge.setUTCDate(edge.getUTCDate() - FBC.WINDOW_DAYS - 1);
    cur = Utilities.formatDate(edge, 'UTC', 'yyyy-MM');
  }

  var y = parseInt(cur.substring(0, 4), 10), m = parseInt(cur.substring(5, 7), 10);
  var floorDate = new Date();
  floorDate.setUTCMonth(floorDate.getUTCMonth() - FBC.BACKFILL_FLOOR_MONTHS);
  var floorKey = Utilities.formatDate(floorDate, 'UTC', 'yyyy-MM');
  if (cur < floorKey) {
    var stop = 'Backfill has reached ' + cur + ', past the ' + FBC.BACKFILL_FLOOR_MONTHS +
               ' month limit Facebook keeps campaign data for. Nothing older to fetch.' +
               '\n\nRun fbcBackfillReset() to start again from the most recent gap.';
    Logger.log('[fbcBackfillStep] ' + stop);
    _fbcSay('\uD83D\uDCF1 Backfill complete', stop);
    return;
  }

  var first = new Date(Date.UTC(y, m - 1, 1));
  var last  = new Date(Date.UTC(y, m, 0));            // day 0 of next month = last day of this one
  var sinceStr = Utilities.formatDate(first, 'UTC', 'yyyy-MM-dd');
  var untilStr = Utilities.formatDate(last,  'UTC', 'yyyy-MM-dd');

  var ws = _getSSActive().getSheetByName(FBC.SHEET);
  var before = ws ? Math.max(ws.getLastRow() - 4, 0) : 0;

  FBC._range = { since: sinceStr, until: untilStr };
  try { fetchFBCampaignDaily(); }
  finally { FBC._range = null; }

  ws = _getSSActive().getSheetByName(FBC.SHEET);
  var after = ws ? Math.max(ws.getLastRow() - 4, 0) : 0;

  // Step the cursor back one month and store it, so the next press continues from here.
  var prevMonth = new Date(Date.UTC(y, m - 2, 1));
  var nextCur = Utilities.formatDate(prevMonth, 'UTC', 'yyyy-MM');
  props.setProperty('FBC_BACKFILL_CURSOR', nextCur);

  var msg = cur + ' done (' + sinceStr + ' to ' + untilStr + ').' +
            '\nRows on file: ' + before + ' -> ' + after + '  (+' + (after - before) + ')' +
            '\n\nPress Run again for ' + nextCur + '.' +
            ((after - before) === 0
               ? '\n\nNo rows were added for this month. Either nothing ran then, or the ad account is ' +
                 'still returning 403 for want of ads_read permission. Check the execution log before ' +
                 'assuming the month was simply empty.'
               : '');
  Logger.log('[fbcBackfillStep] ' + msg.replace(/\n/g, ' | '));
  _fbcSay('\uD83D\uDCF1 Backfill ' + cur, msg);
}

/** Forget where the backfill reached, so the next press starts again just before the daily window. */
function fbcBackfillReset() {
  PropertiesService.getScriptProperties().deleteProperty('FBC_BACKFILL_CURSOR');
  var msg = 'Backfill cursor cleared. The next fbcBackfillStep() starts at the month before the ' +
            'rolling ' + FBC.WINDOW_DAYS + '-day window.';
  Logger.log('[fbcBackfillReset] ' + msg);
  _fbcSay('FB Campaign', msg);
}

/**
 * v2.5 BACKFILL an explicit slice. Kept for the case where one specific month needs re-pulling;
 * it cannot be launched from the editor Run button because that passes no arguments, so use
 * fbcBackfillStep() for ordinary walking-back and this only when calling from other code.
 *
 * Facebook keeps campaign insights for roughly 37 months, so the history exists; it was only ever
 * the wipe that removed it. Pulling it all in one go would blow the 6-minute wall, so this fetches
 * ONE month at a time and upserts. Run it repeatedly, walking backwards, until the tab reaches as
 * far as needed. Nothing already on the sheet is deleted at any point.
 *
 * Usage from the editor: fbcBackfill('2026-06-01', '2026-06-30')
 */
function fbcBackfill(sinceStr, untilStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sinceStr || '') || !/^\d{4}-\d{2}-\d{2}$/.test(untilStr || '')) {
    throw new Error('fbcBackfill needs two dates as yyyy-MM-dd, e.g. fbcBackfill("2026-06-01","2026-06-30")');
  }
  var days = Math.round((new Date(untilStr) - new Date(sinceStr)) / 86400000) + 1;
  if (days > 45) throw new Error('Range is ' + days + ' days. Keep each backfill to 45 days or fewer so the run stays inside the 6-minute limit.');
  var saved = FBC.WINDOW_DAYS, savedRange = FBC._range;
  FBC._range = { since: sinceStr, until: untilStr };
  try { fetchFBCampaignDaily(); }
  finally { FBC.WINDOW_DAYS = saved; FBC._range = savedRange; }
  Logger.log('[fbcBackfill] ' + sinceStr + ' -> ' + untilStr + ' done (' + days + ' days)');
}

/** Create the tab if missing or header drifted (header row 4, data row 5 → heatmap reads A5:M). */
function _fbcEnsureSheet(ss) {
  var ws = ss.getSheetByName(FBC.SHEET) || ss.insertSheet(FBC.SHEET);
  // v2.5 The drift check now looks at the CPP header too, so a sheet built by v2.4 is rebuilt once
  // rather than being written into with the columns off by one from Revenue onward.
  if (ws.getLastRow() === 0 ||
      ws.getRange(4, 3).getValue()  !== 'Campaign' ||
      ws.getRange(4, 6).getValue()  !== 'CPM ($)'  ||
      ws.getRange(4, 15).getValue() !== 'CPP ($)') _fbcInit(ws);
  // v2.9 Column R is APPENDED, so a v2.5 sheet is healed in place — never rebuilt, because
  // _fbcInit wipes and 2,000 rows of backfilled history is not a price a header is worth.
  if (ws.getRange(4, 18).getValue() !== 'Campaign ID') {
    ws.getRange(4, 18).setValue('Campaign ID')
      .setBackground('#1E293B').setFontColor('#FFFFFF').setFontFamily(FBC.TNR).setFontSize(10)
      .setFontWeight('bold').setHorizontalAlignment('center');
    try { ws.setColumnWidth(18, 110); } catch (e) {}
  }
  return ws;
}

function _fbcInit(ws) {
  _dplResetSheet(ws);
  var TNR = FBC.TNR, N = FBC.NCOLS;
  ws.getRange(1, 1, 1, N).merge()
    .setValue('📱  GerberaPrints — FB Campaign Daily   (account × campaign × day · TREND ONLY — purchases do NOT sum to account total)')
    .setBackground('#7C2D12').setFontColor('#FFFFFF').setFontFamily(TNR).setFontSize(13).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1, 30);
  ws.getRange(2, 1, 1, N).merge()
    .setValue('Each run REFRESHES the last ' + FBC.WINDOW_DAYS + ' days and KEEPS everything older (upsert on date+account+campaign ID — renames cannot duplicate a day) · use fbcBackfill("yyyy-MM-dd","yyyy-MM-dd") to pull further back, 45 days at a time · PST · today excluded · Purchases = fb_pixel_purchase (single type, no double-count) · CPP = Spend ÷ Purchases, blank when there were none · report time = ' + FBC.REPORT_TIME + ' (click date — MATCHES Ads Manager) · attribution ' + FBC.ATTR.join('+') + ' · last 1-2 days settle over ~72h · VND→USD at ⚙ Settings rate · GP-marker campaigns only')
    .setBackground('#FEF2F2').setFontColor('#7C2D12').setFontFamily(TNR).setFontSize(9).setFontStyle('italic').setWrap(true);
  ws.setRowHeight(2, 28);
  ws.setRowHeight(3, 6);
  var hdr = ['Date', 'Account', 'Campaign', 'Spend ($)', 'Impr', 'CPM ($)', 'Clicks', 'CTR', 'CPC ($)', 'ATC', 'ATC Cost ($)', 'Checkout', 'Checkout Cost ($)', 'Purchases', 'CPP ($)', 'Revenue ($)', 'ROAS', 'Campaign ID'];
  ws.getRange(4, 1, 1, N).setValues([hdr])
    .setBackground('#1E293B').setFontColor('#FFFFFF').setFontFamily(TNR).setFontSize(10).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(4, 24);
  [84, 150, 240, 90, 70, 80, 64, 60, 64, 60, 80, 72, 92, 78, 82, 92, 60, 110].forEach(function (w, i) { ws.setColumnWidth(i + 1, w); });
  try { ws.setFrozenRows(4); } catch (e) {}
}

function _fbcFormat(ws, n) {
  ws.getRange(5, 1,  n, 1).setNumberFormat('yyyy-mm-dd').setHorizontalAlignment('center'); // Date
  ws.getRange(5, 4,  n, 1).setNumberFormat('"$"#,##0.00');   // Spend
  ws.getRange(5, 5,  n, 1).setNumberFormat('#,##0');         // Impr
  ws.getRange(5, 6,  n, 1).setNumberFormat('"$"#,##0.00');   // CPM
  ws.getRange(5, 7,  n, 1).setNumberFormat('#,##0');         // Clicks
  ws.getRange(5, 8,  n, 1).setNumberFormat('0.00%');         // CTR
  ws.getRange(5, 9,  n, 1).setNumberFormat('"$"#,##0.00');   // CPC
  ws.getRange(5, 10, n, 1).setNumberFormat('#,##0');         // ATC
  ws.getRange(5, 11, n, 1).setNumberFormat('"$"#,##0.00');   // ATC Cost
  ws.getRange(5, 12, n, 1).setNumberFormat('#,##0');         // Checkout
  ws.getRange(5, 13, n, 1).setNumberFormat('"$"#,##0.00');   // Checkout Cost
  ws.getRange(5, 14, n, 1).setNumberFormat('#,##0');         // Purchases
  ws.getRange(5, 15, n, 1).setNumberFormat('"$"#,##0.00');   // CPP
  ws.getRange(5, 16, n, 1).setNumberFormat('"$"#,##0.00');   // Revenue
  ws.getRange(5, 17, n, 1).setNumberFormat('0.00"x"');       // ROAS
  ws.getRange(5, 18, n, 1).setNumberFormat('@').setHorizontalAlignment('center').setFontColor('#94A3B8'); // Campaign ID (metadata, greyed)
  ws.getRange(5, 1,  n, FBC.NCOLS).setFontFamily(FBC.TNR).setFontSize(10);
}

/**
 * v2.9 State plainly whether the tab holds the same campaign-day twice.
 *
 * Key: date + account + campaign id when the row has one, campaign name when it does not.
 * The Google rename bug survived for weeks precisely because nothing ever asked this
 * question; here it is asked at the end of every sync, and the answer goes to the log
 * either way so silence never again means clean.
 */
function _fbcAssertNoDupes(ws) {
  var last = ws.getLastRow();
  if (!ws || last < 6) return 0;
  var v = ws.getRange(5, 1, last - 4, FBC.NCOLS).getValues();
  var seen = {}, dupes = [];
  for (var i = 0; i < v.length; i++) {
    if (!(v[i][0] instanceof Date)) continue;
    var dk  = Utilities.formatDate(v[i][0], FBA.TZ_PST, 'yyyy-MM-dd');
    var cid = String(v[i][17] == null ? '' : v[i][17]).trim();
    var k = dk + '|' + (v[i][1] || '') + '|' + (cid || ('name:' + (v[i][2] || '')));
    if (seen[k]) dupes.push('row ' + (5 + i) + '  ' + k);
    else seen[k] = 1;
  }
  var blank = 0;
  for (var b = 0; b < v.length; b++) {
    if (v[b][0] instanceof Date && !String(v[b][17] == null ? '' : v[b][17]).trim()) blank++;
  }
  if (dupes.length) {
    Logger.log('⚠ FB CAMPAIGN INTEGRITY FAILED: ' + dupes.length + ' duplicate campaign-day row(s). ' +
               'The heatmap and GP_FBC_Likert read this tab. First offenders:');
    dupes.slice(0, 20).forEach(function (d) { Logger.log('   ' + d); });
  } else {
    Logger.log('✔ FB campaign integrity: no duplicate (date × account × campaign) rows.');
  }
  // v2.10 State the limit of that verdict instead of letting silence imply completeness: a row
  // without a Campaign ID is keyed by NAME, so a campaign renamed before its rows were stamped
  // holds invisible duplicates. That is not a theoretical case; it happened on 2026-08-18.
  if (blank > 0) {
    Logger.log('ℹ ' + blank + ' row(s) still have no Campaign ID (written before v2.9). Renames are ' +
               'INVISIBLE to this check for those rows. If a campaign was renamed, declare it in ' +
               'FBC_RENAMES and run fbcApplyRenameMerges(); to stamp ids across old history, walk ' +
               'fbcBackfillStep().');
  }
  return dupes.length;
}

/**
 * v2.10 Renames waiting to be merged into one continuous history. [old name, new name] — the
 * NEW name is whatever Facebook shows today (it is what the fetch writes). Direction is
 * VALIDATED at run time: the new name must resolve to exactly one Campaign ID on the sheet and
 * the old name must carry none, so a pair written backwards is refused, not applied.
 * Run fbcApplyRenameMerges() once after adding a pair; it is idempotent — a second run finds
 * nothing left to move.
 */
var FBC_RENAMES = [
  ['GerberaPrints / B2G1 / CBO / $65 / US / 02/02/26',
   'GerberaPrints / B2G1 / CBO / $80 / US / 02/02/26'],
  ['GerberaPrints / Sleeveless / CBO / $190 / US / 01/07/26',
   'GerberaPrints / Sleeveless / CBO / $220 / US / 01/07/26'],
  ['GerberaPrints / New Products / CBO / $30 / US / 02/12/25',
   'GerberaPrints / New Polo / CBO / $30 / US / 02/12/25']
];

/** v2.10 Merge every declared rename, report per pair, then re-run the integrity check. */
function fbcApplyRenameMerges() {
  if (!FBC_RENAMES.length) { _fbcSay('FB Campaign', 'FBC_RENAMES is empty — nothing to merge.'); return; }
  var L = [];
  FBC_RENAMES.forEach(function (p) {
    var r = _fbcMergeOneRename(String(p[0] || ''), String(p[1] || ''));
    L.push(r);
    Logger.log('[fbcApplyRenameMerges] ' + r);
  });
  var ws = _getSSActive().getSheetByName(FBC.SHEET);
  if (ws) _fbcAssertNoDupes(ws);
  _fbcSay('📱 Rename merge', L.join('\n'));
}

/**
 * Fold one renamed campaign into a single continuous history.
 *
 * For every legacy row carrying the OLD name and no id:
 *   · if the id-stamped fetch already wrote that same (date, account) day under the new name,
 *     the legacy row is DELETED — the fetched row is the fresher restatement of the same day
 *     (Facebook keeps attributing after the fact, so the later write is also the more settled);
 *   · otherwise the legacy row is kept and STAMPED with the id and the current name, so older
 *     history joins the same line instead of sitting under a name that no longer exists.
 * Refuses rather than guesses: wrong direction, ambiguous ids, or a conflicting id on an old
 * row each abort THAT pair with a stated reason and touch nothing.
 */
function _fbcMergeOneRename(oldName, newName) {
  if (!oldName || !newName) return 'REFUSED: empty name in pair.';
  if (oldName === newName) return 'REFUSED: old and new name are identical: ' + newName;
  var ws = _getSSActive().getSheetByName(FBC.SHEET);
  if (!ws || ws.getLastRow() < 5) return 'REFUSED: sheet has no data rows.';
  var n = ws.getLastRow() - 4;
  var v = ws.getRange(5, 1, n, FBC.NCOLS).getValues();

  var ids = {}, covered = {};
  for (var i = 0; i < n; i++) {
    if (!(v[i][0] instanceof Date)) continue;
    if (String(v[i][2]) !== newName) continue;
    var cid0 = String(v[i][17] == null ? '' : v[i][17]).trim();
    if (!cid0) continue;
    ids[cid0] = 1;
    covered[Utilities.formatDate(v[i][0], FBA.TZ_PST, 'yyyy-MM-dd') + '|' + (v[i][1] || '')] = 1;
  }
  var idList = Object.keys(ids);
  if (idList.length === 0) return 'REFUSED: "' + newName + '" has no id-stamped rows — is the NEW name on the right side of the pair?';
  if (idList.length > 1)  return 'REFUSED: "' + newName + '" resolves to ' + idList.length + ' different Campaign IDs — will not guess.';
  var cid = idList[0];

  var stamps = [], kills = [];
  for (var j = 0; j < n; j++) {
    if (!(v[j][0] instanceof Date)) continue;
    if (String(v[j][2]) !== oldName) continue;
    var rid = String(v[j][17] == null ? '' : v[j][17]).trim();
    if (rid && rid !== cid) return 'REFUSED: an old-name row carries a DIFFERENT id (' + rid + ' vs ' + cid + ') — these are two real campaigns, not a rename.';
    var key = Utilities.formatDate(v[j][0], FBA.TZ_PST, 'yyyy-MM-dd') + '|' + (v[j][1] || '');
    if (covered[key]) kills.push(5 + j);
    else stamps.push(5 + j);
  }
  if (!stamps.length && !kills.length) return 'Nothing to do for "' + oldName + '" (already merged or never present).';

  stamps.forEach(function (row) {
    ws.getRange(row, 3).setValue(newName);
    ws.getRange(row, 18).setValue(cid);
  });
  kills.sort(function (a, b) { return b - a; });
  kills.forEach(function (row) { ws.deleteRow(row); });

  return '"' + oldName + '" → "' + newName + '" (id ' + cid + '): stamped ' + stamps.length +
         ' older row(s), deleted ' + kills.length + ' duplicated window day(s).';
}

/**
 * Daily trigger, one hour after the account-level sync so the spend source is settled first.
 *
 * v2.5 The comment used to say 15:30 VN while the code asked for hour 23, and the two could not
 * both be true. The hour is read in the SCRIPT's timezone, so the honest thing is to state that
 * rather than assert a local time the code does not control. Account sync uses hour 15; this uses
 * 16, keeping the one-hour gap in whatever timezone the project is set to.
 */
function fbcInstallTrigger() {
  var removed = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'fetchFBCampaignDaily') { ScriptApp.deleteTrigger(t); removed++; }
  });
  ScriptApp.newTrigger('fetchFBCampaignDaily').timeBased().atHour(16).nearMinute(0).everyDays(1).create();
  var msg = '✅ FB Campaign daily trigger installed at hour 16 in the script timezone, one hour after '
          + 'the account sync at 15. Cleared ' + removed + ' old trigger(s).';
  _fbcSay('FB Campaign', msg);
}

/**
 * v2.8 WHICH ACCOUNTS CAN THIS TOKEN ACTUALLY SEE, and who owns the ones it cannot.
 *
 * The 403 message Facebook returns, 'Ad account owner has NOT grant ads_management or ads_read
 * permission', names no account and gives no owner, so it says nothing about what to fix. Five
 * accounts failing looks like one problem when it is usually several: an account never shared with
 * the token's user, an account sitting in a different Business Portfolio, and an account that was
 * closed months ago all produce the same sentence.
 *
 * This asks two questions and prints both answers side by side:
 *   1. Which accounts is the Hub configured to pull?
 *   2. Which accounts does the token actually have on it (/me/adaccounts)?
 * Anything in the first list and not the second is the work. Anything in the second and not the
 * first is an account being paid for and not measured, which is worth knowing too.
 */
function fbcDiagAccountAccess() {
  var configured = _fbaAccountIds();
  var L = ['=== FB ad account access \u00b7 ' + configured.length + ' configured ==='];

  // What the token can see. Business Manager may hold more; this is what the CREDENTIAL reaches.
  var visible = {}, visibleList = [];
  try {
    var res = _fbaApiCall('/me/adaccounts', { fields: 'account_id,name,account_status,business', limit: 200 });
    (res.data || []).forEach(function (a) {
      visible[String(a.account_id)] = a;
      visibleList.push(a);
    });
  } catch (e) {
    L.push('  /me/adaccounts FAILED: ' + e.message);
    L.push('  A token that cannot list its own accounts is expired or missing ads_read entirely.');
  }
  L.push('  token can see ' + visibleList.length + ' account(s)');
  L.push('');

  var ok = 0, bad = [];
  configured.forEach(function (id) {
    var key = String(id).replace(/^act_/, '');
    var v = visible[key];
    if (v) {
      ok++;
      var biz = (v.business && (v.business.name || v.business.id)) || 'no business portfolio';
      L.push('  OK       act_' + key + '  ' + (v.name || '') + '  [status ' + v.account_status + ']  owner: ' + biz);
    } else {
      // Ask about it directly: the answer distinguishes 'not shared' from 'does not exist'.
      var why = '';
      try { var m = _fbaApiCall('/act_' + key, { fields: 'name,account_status,business' });
            why = 'readable directly but NOT in /me/adaccounts, so the token has partial access: ' + (m.name || ''); }
      catch (e2) { why = String(e2.message).substring(0, 120); }
      bad.push(key);
      L.push('  BLOCKED  act_' + key + '  ' + why);
    }
  });

  // Accounts the token holds that nobody asked it to read. Usually another brand under the same
  // portfolio, occasionally a GerberaPrints account that was never added to FB_ADS_ACCOUNT_IDS.
  var extra = visibleList.filter(function (a) {
    return configured.map(function (c) { return String(c).replace(/^act_/, ''); }).indexOf(String(a.account_id)) < 0;
  });
  if (extra.length) {
    L.push('');
    L.push('  Visible to the token but NOT configured (' + extra.length + '):');
    extra.forEach(function (a) { L.push('    act_' + a.account_id + '  ' + (a.name || '')); });
  }

  L.push('');
  L.push('  ' + ok + ' reachable, ' + bad.length + ' blocked.');
  if (bad.length) {
    L.push('  Blocked ids for the Meta admin: ' + bad.join(', '));
    L.push('  Each needs the token user given a role on that ad account, with at least Analyst.');
  }
  Logger.log(L.join('\n'));
  _fbcSay('\uD83D\uDD11 Account access', ok + ' reachable, ' + bad.length + ' blocked. Full list in the log.');
}

/** DIAGNOSTIC — log every purchase/cart/checkout action_type + 14d totals (GP campaigns).
 *  Proves WHICH types FB returns and why summing inflates. View → Executions → Logs. */
function fbcDiagActionTypes() {
  var ids = _fbaAccountIds();
  if (!ids.length) { Logger.log('No accounts configured'); return; }
  var markers = _fbaCampaignMarkers();
  var nowPST = new Date(Utilities.formatDate(new Date(), FBA.TZ_PST, 'yyyy-MM-dd') + 'T12:00:00Z');
  var until  = new Date(nowPST); until.setUTCDate(until.getUTCDate() - 1);
  var since  = new Date(until);  since.setUTCDate(since.getUTCDate() - 13);
  var fmt = function (d) { return Utilities.formatDate(d, FBA.TZ_PST, 'yyyy-MM-dd'); };
  var seen = {};
  ids.forEach(function (acctId) {
    try {
      var items = _fbaInsightsAll('/act_' + acctId + '/insights', {
        level: 'campaign', time_increment: 1,
        time_range: JSON.stringify({ since: fmt(since), until: fmt(until) }),
        fields: 'campaign_name,actions',
        action_attribution_windows: JSON.stringify(FBC.ATTR), action_report_time: FBC.REPORT_TIME, limit: 200
      });
      items.forEach(function (it) {
        if (!_fbaIsGP(it.campaign_name || '', markers)) return;
        (it.actions || []).forEach(function (a) {
          var ty = a.action_type;
          if (ty.indexOf('purchase') >= 0 || ty.indexOf('cart') >= 0 || ty.indexOf('checkout') >= 0)
            seen[ty] = (seen[ty] || 0) + (parseFloat(a.value) || 0);
        });
      });
    } catch (e) { Logger.log('[diag] act_' + acctId + ': ' + e.message); }
  });
  Logger.log('=== FB purchase/cart/checkout action_types — last 14d, GP campaigns only ===');
  Object.keys(seen).sort().forEach(function (t) { Logger.log('  ' + t + ' = ' + (Math.round(seen[t] * 100) / 100)); });
  Logger.log('→ Sync uses FIRST present of: ' + FBC.PURCH.join('  >  ') + '   (single, never summed)');
  try { _getSSActive().toast('Diag done — View → Executions → Logs', '📱 FB Campaign', 6); } catch (e) {}
}
/** One-off check: which Meta identity does FB_ADS_TOKEN belong to. */
function whoAmI() {
  var t = _fbaToken();
  if (!t) { Logger.log('No token found in FB_ADS_TOKEN or FB_CAPI_TOKEN.'); return; }
  var url = FBA.GRAPH + '/' + FBA.API_VER + '/me?fields=id,name&access_token=' + encodeURIComponent(t);
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  Logger.log('WHO AM I: ' + res.getContentText());
}