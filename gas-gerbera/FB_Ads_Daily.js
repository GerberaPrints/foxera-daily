// ╔══════════════════════════════════════════════════════════════════════╗
// ║  GerberaPrints — FB Ads Daily Module  ·  v5                            ║
// ║                                                                        ║
// ║  v5 CHANGES vs v4:                                                     ║
// ║    • EXPANDED METRICS per request — columns now (in order):            ║
// ║      Date · Account · Spend(USD) · Impressions · CPM · Clicks · CPC ·  ║
// ║      CTR · ATC · ATC Cost · Checkout · Checkout Cost · Purchases ·     ║
// ║      Revenue(USD) · ROAS · Status.                                     ║
// ║      ATC = add-to-cart, Checkout = initiate-checkout (from `actions`). ║
// ║      CPM = spend/impr*1000 · CPC = spend/clk · ATC Cost = spend/ATC ·  ║
// ║      Checkout Cost = spend/checkout (all USD).                         ║
// ║    • Spend(USD) moved to col C (CRM rollup updated to match: spend=C,  ║
// ║      impr=D, clicks=F, purchases=M, revenue=N).                        ║
// ║  v4: campaign-level pull + GerberaPrints marker filter (kept).         ║
// ╚══════════════════════════════════════════════════════════════════════╝

var FBA = {
  API_VER     : 'v20.0',
  GRAPH       : 'https://graph.facebook.com',
  SHEET       : '📱 FB Ads Daily',
  ROLLUP_SHEET: '📊 Ad Spend',
  WINDOW_DAYS : 14,
  TZ_PST      : 'America/Los_Angeles',
  TNR         : 'Times New Roman',
  PROP_TOKEN_NEW     : 'FB_ADS_TOKEN',
  PROP_TOKEN_LEGACY  : 'FB_CAPI_TOKEN',
  PROP_ACCT_IDS      : 'FB_ADS_ACCOUNT_IDS',
  PROP_MARKERS       : 'FB_ADS_CAMPAIGN_MARKERS',  // v4: campaign-name markers (CSV)
  DEFAULT_MARKERS    : 'GER,GerberaPrints',
  DEFAULT_VND_RATE   : 26000,
  PURCHASE_TYPES     : ['offsite_conversion.fb_pixel_purchase', 'omni_purchase', 'purchase'],   // priority order — pick FIRST present, never sum
  ATC_TYPES          : ['offsite_conversion.fb_pixel_add_to_cart', 'omni_add_to_cart', 'add_to_cart'],
  CHECKOUT_TYPES     : ['offsite_conversion.fb_pixel_initiate_checkout', 'omni_initiated_checkout', 'initiate_checkout']
};

// ════════════════════════════════════════════════════════════════════════
//  TOKEN / ACCOUNT / SETTINGS HELPERS
// ════════════════════════════════════════════════════════════════════════

function _fbaToken() {
  var p = PropertiesService.getScriptProperties();
  var t = p.getProperty(FBA.PROP_TOKEN_NEW);
  if (t && t.trim()) return t.trim();
  t = p.getProperty(FBA.PROP_TOKEN_LEGACY);
  return t ? t.trim() : '';
}

function _fbaAccountIds() {
  var raw = PropertiesService.getScriptProperties().getProperty(FBA.PROP_ACCT_IDS) || '';
  return raw.split(',')
            .map(function(s){ return s.replace(/^act_/, '').trim(); })
            .filter(function(s){ return /^\d+$/.test(s); });
}

/** v4: campaign-name markers a campaign must carry to count as GerberaPrints. */
function _fbaCampaignMarkers() {
  var v = PropertiesService.getScriptProperties().getProperty(FBA.PROP_MARKERS);
  if (v === null || v === undefined) v = FBA.DEFAULT_MARKERS;
  return v.replace(/;/g, ',').split(',')
          .map(function(s){ return s.trim().toLowerCase(); })
          .filter(function(s){ return s.length > 0; });
}

/** True if campaign NAME carries a marker on a word boundary (so "Burger"
 *  does NOT match "GER", but "GER", "GER_B2G1", "[GER]", "GerberaPrints" do).
 *  Empty marker list = keep everything. */
function _fbaIsGP(name, markers) {
  if (!markers || !markers.length) return true;
  var n = (name || '').toLowerCase();
  var isAlpha = function(c){ return c >= 'a' && c <= 'z'; };
  for (var mi = 0; mi < markers.length; mi++) {
    var m = markers[mi], start = 0, i;
    while ((i = n.indexOf(m, start)) >= 0) {
      var before = i > 0 ? n.charAt(i - 1) : '';
      var after  = (i + m.length < n.length) ? n.charAt(i + m.length) : '';
      if (!isAlpha(before) && !isAlpha(after)) return true;
      start = i + 1;
    }
  }
  return false;
}

/** Paginated insights fetch (campaign level returns many rows). */
function _fbaInsightsAll(path, params) {
  var token = _fbaToken();
  if (!token) throw new Error('No FB token — run Setup first.');
  params = params || {};
  params.access_token = token;
  var url = _fbaUrl(path, params), out = [], safety = 0;
  while (url && safety < 30) {
    var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var code = resp.getResponseCode();
    if (code !== 200) throw new Error('FB API ' + code + ': ' + resp.getContentText().substring(0, 200));
    var j = JSON.parse(resp.getContentText());
    (j.data || []).forEach(function(x){ out.push(x); });
    url = (j.paging && j.paging.next) ? j.paging.next : null;   // next already has access_token
    safety++;
  }
  return out;
}

function _fbaSumActions(items, types) {
  return (items || []).filter(function(a){ return types.indexOf(a.action_type) >= 0; })
                      .reduce(function(s,a){ return s + (parseFloat(a.value) || 0); }, 0);
}

// v-fix: single action_type value in PRIORITY order — FIRST present wins, NEVER summed.
// Fixes x2-x3 double-count from summing overlapping types (omni_purchase already includes
// offsite_conversion.fb_pixel_purchase). Mirrors _fbcPickOne in GP_FB_Campaign_Sync.
function _fbaPickOne(items, types) {
  if (!items) return 0;
  for (var t = 0; t < types.length; t++)
    for (var i = 0; i < items.length; i++)
      if (items[i].action_type === types[t]) return parseFloat(items[i].value) || 0;
  return 0;
}

function _fbaVndRate() {
  var rate = _dplGetSetting('USD/VND exchange rate', FBA.DEFAULT_VND_RATE);
  return rate > 100 ? rate : FBA.DEFAULT_VND_RATE;
}

function _fbaUrl(path, params) {
  var url = FBA.GRAPH + '/' + FBA.API_VER + path;
  var qs = [];
  for (var k in params) {
    if (params.hasOwnProperty(k)) qs.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
  }
  return url + (qs.length ? '?' + qs.join('&') : '');
}

function _fbaApiCall(path, params) {
  var token = _fbaToken();
  if (!token) throw new Error('No FB token — run "FB Ads → Setup" first.');
  params = params || {};
  params.access_token = token;
  var resp = UrlFetchApp.fetch(_fbaUrl(path, params), { muteHttpExceptions: true });
  var code = resp.getResponseCode();
  var body = resp.getContentText();
  if (code !== 200) throw new Error('FB API ' + code + ': ' + body.substring(0, 300));
  return JSON.parse(body);
}

function _fbaToUSD(nativeAmount, currency, vndRate) {
  if (!nativeAmount) return 0;
  var c = (currency || 'USD').toUpperCase();
  if (c === 'USD') return nativeAmount;
  if (c === 'VND') return nativeAmount / vndRate;
  Logger.log('[fba] unsupported currency: ' + c + ' — treating as 0 USD');
  return 0;
}

// ════════════════════════════════════════════════════════════════════════
//  TOKEN TEST + ACCOUNT LISTER
// ════════════════════════════════════════════════════════════════════════

function menuFBAdsTestToken() {
  var ui = SpreadsheetApp.getUi();
  var token = _fbaToken();
  if (!token) { ui.alert('No FB token — run "Setup" first.'); return; }
  var msg = '🔍 FB Ads Token Test\n\n';
  try {
    var dbg = _fbaApiCall('/debug_token', { input_token: token });
    var d = dbg.data || {};
    msg += 'Token type: ' + (d.type || '?') + '\n';
    msg += 'Expires: ' + (d.expires_at === 0 || !d.expires_at ? 'NEVER ✅' :
                          new Date(d.expires_at * 1000).toISOString().substring(0,10)) + '\n';
    var scopes = (d.scopes || []).join(', ');
    msg += 'Scopes: ' + (scopes || '(none)') + '\n';
    var hasRead = (d.scopes || []).indexOf('ads_read') >= 0 ||
                  (d.scopes || []).indexOf('ads_management') >= 0;
    msg += 'Can read Ads Insights: ' + (hasRead ? '✅ YES' : '❌ NO — needs ads_read') + '\n\n';
  } catch(e) { msg += 'debug_token failed: ' + e.message + '\n\n'; }

  var ids = _fbaAccountIds();
  msg += 'Configured accounts (' + ids.length + '):\n';
  if (!ids.length) {
    msg += '  ⚠ None. Run "📋 List my visible accounts" then "⚙ Setup".\n';
  } else {
    ids.forEach(function(id){
      try {
        var info = _fbaApiCall('/act_' + id, { fields: 'name,currency,timezone_name,account_status' });
        msg += '  • act_' + id + ' — ' + info.name + ' (' + info.currency + ', ' + info.timezone_name + ', status=' + info.account_status + ')\n';
      } catch(e) {
        msg += '  • act_' + id + ' — ❌ ' + e.message.substring(0, 60) + '\n';
      }
    });
  }
  msg += '\nCampaign markers (count only campaigns whose name contains): [' + _fbaCampaignMarkers().join(', ') + ']';
  msg += '\nVND→USD rate (from Settings): ' + _fbaVndRate();
  ui.alert(msg);
}

function menuFBAdsListAccounts() {
  var ss = _getSSActive();
  var token = _fbaToken();
  if (!token) { SpreadsheetApp.getUi().alert('No FB token — run Setup first.'); return; }

  var all = [], next = _fbaUrl('/me/adaccounts', {
    fields: 'id,name,currency,timezone_name,account_status,business_name', limit: 100
  }) + '&access_token=' + encodeURIComponent(token);
  var safety = 0;
  while (next && safety < 20) {
    var resp = UrlFetchApp.fetch(next, { muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) {
      ss.toast('❌ ' + resp.getResponseCode() + ' — see logs', '📋', 6);
      Logger.log(resp.getContentText()); return;
    }
    var j = JSON.parse(resp.getContentText());
    (j.data || []).forEach(function(a){ all.push(a); });
    next = (j.paging && j.paging.next) ? j.paging.next : null;
    safety++;
  }

  var ws = ss.getSheetByName('🔎 FB Accounts (temp)') || ss.insertSheet('🔎 FB Accounts (temp)');
  _dplResetSheet(ws);
  ws.getRange(1,1,1,7).merge()
    .setValue('🔎  FB Ads Accounts visible to this token  ·  copy IDs of accounts that RUN GerberaPrints campaigns → Setup')
    .setBackground('#1877F2').setFontColor('#FFFFFF')
    .setFontFamily(FBA.TNR).setFontSize(12).setFontWeight('bold');
  var hdr = ['Include?', 'Account ID', 'Name', 'Business', 'Currency', 'Timezone', 'Status'];
  ws.getRange(2,1,1,7).setValues([hdr]).setFontWeight('bold')
    .setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(FBA.TNR);
  var rows = all.map(function(a){
    var idDigits = (a.id || '').toString().replace(/^act_/, '');
    return ['', idDigits, a.name || '', a.business_name || '', a.currency || '', a.timezone_name || '', a.account_status || ''];
  });
  if (rows.length) {
    ws.getRange(3,1,rows.length,7).setValues(rows).setFontFamily(FBA.TNR).setFontSize(10);
    var csvRow = 3 + rows.length + 1;
    ws.getRange(csvRow,1).setValue('CSV of ALL visible IDs:').setFontWeight('bold').setFontFamily(FBA.TNR);
    ws.getRange(csvRow,2,1,6).merge()
      .setValue(rows.map(function(r){return r[1];}).join(','))
      .setFontFamily('Courier New').setFontSize(9).setWrap(true);
  }
  [60, 160, 240, 200, 80, 140, 80].forEach(function(w,i){ ws.setColumnWidth(i+1, w); });
  ws.setFrozenRows(2);
  ss.setActiveSheet(ws);
  ss.toast('✅ Found ' + all.length + ' accounts. Tick "Include?" mentally, then paste IDs in Setup.', '📋', 8);
}

// ════════════════════════════════════════════════════════════════════════
//  SETUP
// ════════════════════════════════════════════════════════════════════════

function _fbaEnsureExchangeRate() {
  var ws = _getSSActive().getSheetByName('⚙ Settings');
  if (!ws || ws.getLastRow() < 1) return;
  var data = ws.getRange(1, 1, ws.getLastRow(), 2).getValues();
  for (var i = 0; i < data.length; i++) {
    if ((data[i][0] || '').toString().trim() === 'USD/VND exchange rate') return;
  }
  ws.appendRow(['USD/VND exchange rate', FBA.DEFAULT_VND_RATE]);
  ws.getRange(ws.getLastRow(), 2).setBackground('#FFF8E7').setFontFamily(FBA.TNR);
  ws.getRange(ws.getLastRow(), 1).setFontFamily(FBA.TNR);
}

function menuFBAdsSetup() {
  var ui = SpreadsheetApp.getUi();
  var p = PropertiesService.getScriptProperties();
  _fbaEnsureExchangeRate();
  var rT = ui.prompt('FB Ads Setup — Step 1/3',
    'Paste FB access token (System User token preferred; leave empty to keep current FB_ADS_TOKEN or fall back to FB_CAPI_TOKEN):',
    ui.ButtonSet.OK_CANCEL);
  if (rT.getSelectedButton() !== ui.Button.OK) return;
  var token = rT.getResponseText().trim();
  if (token) p.setProperty(FBA.PROP_TOKEN_NEW, token);

  var rA = ui.prompt('FB Ads Setup — Step 2/3',
    'Paste GerberaPrints ad account IDs as CSV (digits only, comma-separated).\n' +
    'Example:  1234567890123456, 9876543210987654\n\n' +
    'Tip: run "📋 List my visible accounts" first to see options.',
    ui.ButtonSet.OK_CANCEL);
  if (rA.getSelectedButton() !== ui.Button.OK) return;
  var raw = rA.getResponseText();
  var ids = raw.split(/[,\s]+/).map(function(s){ return s.replace(/^act_/, '').trim(); })
              .filter(function(s){ return /^\d+$/.test(s); });
  if (!ids.length) { ui.alert('No valid IDs found. Aborted.'); return; }
  p.setProperty(FBA.PROP_ACCT_IDS, ids.join(','));

  var rN = ui.prompt('FB Ads Setup — Step 3/3',
    'Campaign-name MARKERS that identify GerberaPrints campaigns (CSV, case-insensitive).\n' +
    'One ad account may run several sites; only campaigns whose NAME contains a marker are counted.\n\n' +
    'Default: "GER,GerberaPrints"  ·  type "ALL" to keep every campaign (no filter).',
    ui.ButtonSet.OK_CANCEL);
  if (rN.getSelectedButton() === ui.Button.OK) {
    var nm = rN.getResponseText().trim();
    p.setProperty(FBA.PROP_MARKERS, (nm.toUpperCase() === 'ALL') ? '' : (nm || FBA.DEFAULT_MARKERS));
  }

  ui.alert('✅ Saved ' + ids.length + ' account(s):\n  ' + ids.join('\n  ') +
           '\n\nCampaign markers: [' + _fbaCampaignMarkers().join(', ') + ']\nNext: "🔍 Test Token & Scopes".');
}

// ════════════════════════════════════════════════════════════════════════
//  SYNC — main entry point, multi-account
// ════════════════════════════════════════════════════════════════════════

function syncFBAdsDaily() {
  var ss = _getSSActive();
  var ids = _fbaAccountIds();
  if (!ids.length) throw new Error('No ad accounts configured — run Setup first.');

  var nowPST  = new Date(Utilities.formatDate(new Date(), FBA.TZ_PST, 'yyyy-MM-dd') + 'T12:00:00Z');
  var until   = new Date(nowPST); until.setUTCDate(until.getUTCDate() - 1);
  var since   = new Date(until);  since.setUTCDate(since.getUTCDate() - (FBA.WINDOW_DAYS - 1));
  var fmt = function(d) { return Utilities.formatDate(d, FBA.TZ_PST, 'yyyy-MM-dd'); };
  var sinceStr = fmt(since), untilStr = fmt(until);

  var vndRate = _fbaVndRate();
  var markers = _fbaCampaignMarkers();
  var agg = {};                     // key "date|account" -> aggregated GP-only totals
  var errors = [], keptCamps = 0, dropCamps = 0;

  ids.forEach(function(acctId) {
    try {
      var meta = _fbaApiCall('/act_' + acctId, { fields: 'name,currency' });
      var acctName = meta.name || ('act_' + acctId);
      var cur = meta.currency || 'USD';
      // Pull at CAMPAIGN level so we can tell GerberaPrints campaigns from
      // other sites/pixels running on the same ad account.
      var items = _fbaInsightsAll('/act_' + acctId + '/insights', {
        level                      : 'campaign',
        time_range                 : JSON.stringify({ since: sinceStr, until: untilStr }),
        time_increment             : 1,
        fields                     : 'date_start,campaign_name,spend,impressions,clicks,actions,action_values',
        action_attribution_windows : JSON.stringify(['7d_click','1d_view']),
        limit                      : 200
      });
      items.forEach(function(it){
        if (!_fbaIsGP(it.campaign_name || '', markers)) { dropCamps++; return; }
        keptCamps++;
        var spendNative = parseFloat(it.spend) || 0;
        var revNative   = _fbaPickOne(it.action_values, FBA.PURCHASE_TYPES);
        var key = (it.date_start || '') + '|' + acctName;
        var a = agg[key] || (agg[key] = { date: it.date_start, account: acctName, currency: cur,
                  spendNative: 0, spendUSD: 0, impr: 0, clk: 0, atc: 0, co: 0, pur: 0, revUSD: 0 });
        a.spendNative += spendNative;
        a.spendUSD    += _fbaToUSD(spendNative, cur, vndRate);
        a.impr        += parseInt(it.impressions) || 0;
        a.clk         += parseInt(it.clicks) || 0;
        a.atc         += _fbaPickOne(it.actions, FBA.ATC_TYPES);
        a.co          += _fbaPickOne(it.actions, FBA.CHECKOUT_TYPES);
        a.pur         += _fbaPickOne(it.actions, FBA.PURCHASE_TYPES);
        a.revUSD      += _fbaToUSD(revNative, cur, vndRate);
      });
      Utilities.sleep(300);
    } catch(e) {
      errors.push('act_' + acctId + ': ' + e.message.substring(0, 80));
      Logger.log('[fba sync] act_' + acctId + ' failed: ' + e.message);
    }
  });

  // Aggregated GP-only campaigns -> one row per (date × account)
  var allRows = Object.keys(agg).map(function(k){
    var a = agg[k], su = a.spendUSD;
    return {
      date         : a.date,
      account      : a.account,
      spendUSD     : su,
      impressions  : a.impr,
      cpm          : a.impr > 0 ? (su / a.impr * 1000) : 0,
      clicks       : a.clk,
      cpc          : a.clk > 0 ? (su / a.clk) : 0,
      ctr          : a.impr > 0 ? (a.clk / a.impr) : 0,       // fraction (formatted 0.00%)
      atc          : a.atc,
      atcCost      : a.atc > 0 ? (su / a.atc) : 0,
      checkout     : a.co,
      checkoutCost : a.co > 0 ? (su / a.co) : 0,
      purchases    : a.pur,
      revenueUSD   : a.revUSD,
      roas         : su > 0 ? (a.revUSD / su) : 0
    };
  });

  _fbaWriteSheet(ss, allRows);
  _fbaRollupToAdSpend(ss, allRows);

  var totalUSD = allRows.reduce(function(s,r){ return s + r.spendUSD; }, 0);
  var summary = '✅ FB Ads synced: ' + allRows.length + ' (date×account) rows, $' +
                Math.round(totalUSD).toLocaleString() + ' GP spend · campaigns kept ' +
                keptCamps + ' / dropped ' + dropCamps + ' (markers: ' + markers.join(',') + ')';
  if (errors.length) summary += ' · ⚠ ' + errors.length + ' acct failed (logs)';
  ss.toast(summary, '📱 FB Ads', 8);
  Logger.log(summary);
}

// ════════════════════════════════════════════════════════════════════════
//  SHEET WRITE  (v5 layout: A Date · B Account · C Spend(USD) · D Impr ·
//  E CPM · F Clicks · G CPC · H CTR · I ATC · J ATC Cost · K Checkout ·
//  L Checkout Cost · M Purchases · N Revenue · O ROAS · P Status)
// ════════════════════════════════════════════════════════════════════════

function _fbaWriteSheet(ss, newRows) {
  var ws = ss.getSheetByName(FBA.SHEET) || ss.insertSheet(FBA.SHEET);
  if (ws.getLastRow() === 0) _fbaInitSheet(ws);
  // If an older (v4) 12-col sheet exists, rebuild the header to v5 16-col.
  if (ws.getRange(4,1).getValue() === 'Date' && ws.getRange(4,5).getValue() !== 'CPM ($)') {
    var keepLast = ws.getLastRow();
    if (keepLast >= 5) ws.getRange(5,1,keepLast-4, ws.getLastColumn()).clearContent();
    _fbaInitSheet(ws);
  }

  var lastRow = ws.getLastRow();
  var existing = {};
  if (lastRow >= 5) {
    var rng = ws.getRange(5, 1, lastRow - 4, 2).getValues();   // A Date, B Account
    rng.forEach(function(r, i) {
      if (r[0] instanceof Date) {
        var k = Utilities.formatDate(r[0], FBA.TZ_PST, 'yyyy-MM-dd') + '|' + (r[1] || '');
        existing[k] = 5 + i;
      }
    });
  }

  newRows.sort(function(a,b){ return (a.date + a.account) < (b.date + b.account) ? -1 : 1; });
  var append = [];
  newRows.forEach(function(r){
    var arr = [
      new Date(r.date + 'T12:00:00Z'),   // A Date
      r.account,                          // B Account
      r.spendUSD,                         // C Spend (USD)
      r.impressions,                      // D Impressions
      r.cpm,                              // E CPM ($)
      r.clicks,                           // F Clicks
      r.cpc,                              // G CPC ($)
      r.ctr,                              // H CTR (fraction)
      r.atc,                              // I ATC
      r.atcCost,                          // J ATC Cost ($)
      r.checkout,                         // K Checkout
      r.checkoutCost,                     // L Checkout Cost ($)
      r.purchases,                        // M Purchases
      r.revenueUSD,                       // N Revenue (USD)
      r.roas,                             // O ROAS
      r.spendUSD > 0 ? '✅' : '—'         // P Status
    ];
    var k = r.date + '|' + r.account;
    if (existing[k]) {
      ws.getRange(existing[k], 1, 1, arr.length).setValues([arr]);
    } else {
      append.push(arr);
    }
  });
  if (append.length) {
    var at = Math.max(5, ws.getLastRow() + 1);
    ws.getRange(at, 1, append.length, append[0].length).setValues(append);
  }
  _fbaFormatSheet(ws);
}

function _fbaInitSheet(ws) {
  _dplResetSheet(ws);
  var NCOLS = 16;
  ws.getRange(1,1,1,NCOLS).merge()
    .setValue('📱  GerberaPrints — Facebook Ads Daily  (multi-account, USD-normalized, PST)')
    .setBackground('#1877F2').setFontColor('#FFFFFF')
    .setFontFamily(FBA.TNR).setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1, 32);
  ws.getRange(2,1,1,NCOLS).merge()
    .setValue('Last ' + FBA.WINDOW_DAYS + ' days · 1 row per (date × account) · USD (VND→USD at ⚙ Settings rate) · today excluded · CPM=spend/impr×1000 · CPC=spend/clk · ATC/Checkout cost=spend/count')
    .setBackground('#F1F5F9').setFontColor('#475569')
    .setFontFamily(FBA.TNR).setFontSize(9).setFontStyle('italic');
  ws.setRowHeight(3, 6);
  var hdr = ['Date','Account','Spend (USD)','Impressions','CPM ($)','Clicks','CPC ($)','CTR',
             'ATC','ATC Cost ($)','Checkout','Checkout Cost ($)','Purchases','Revenue (USD)','ROAS','Status'];
  ws.getRange(4,1,1,NCOLS).setValues([hdr])
    .setBackground('#334155').setFontColor('#FFFFFF')
    .setFontFamily(FBA.TNR).setFontSize(10).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  ws.setRowHeight(4, 26);
  [92, 168, 100, 96, 76, 72, 72, 60, 64, 90, 78, 110, 84, 108, 60, 62].forEach(function(w,i){ ws.setColumnWidth(i+1, w); });
  try { ws.setFrozenRows(4); } catch(e) {}
}

function _fbaFormatSheet(ws) {
  var last = ws.getLastRow();
  if (last < 5) return;
  var n = last - 4;
  ws.getRange(5,1,n,1).setNumberFormat('yyyy-mm-dd').setHorizontalAlignment('center');   // Date
  ws.getRange(5,3,n,1).setNumberFormat('"$"#,##0.00').setFontWeight('bold');              // Spend USD
  ws.getRange(5,4,n,1).setNumberFormat('#,##0');                                          // Impressions
  ws.getRange(5,5,n,1).setNumberFormat('"$"#,##0.00');                                    // CPM
  ws.getRange(5,6,n,1).setNumberFormat('#,##0');                                          // Clicks
  ws.getRange(5,7,n,1).setNumberFormat('"$"#,##0.00');                                    // CPC
  ws.getRange(5,8,n,1).setNumberFormat('0.00%');                                          // CTR
  ws.getRange(5,9,n,1).setNumberFormat('#,##0');                                          // ATC
  ws.getRange(5,10,n,1).setNumberFormat('"$"#,##0.00');                                   // ATC Cost
  ws.getRange(5,11,n,1).setNumberFormat('#,##0');                                         // Checkout
  ws.getRange(5,12,n,1).setNumberFormat('"$"#,##0.00');                                   // Checkout Cost
  ws.getRange(5,13,n,1).setNumberFormat('#,##0');                                         // Purchases
  ws.getRange(5,14,n,1).setNumberFormat('"$"#,##0.00');                                   // Revenue
  ws.getRange(5,15,n,1).setNumberFormat('0.00').setFontWeight('bold');                    // ROAS
  ws.getRange(5,16,n,1).setHorizontalAlignment('center');                                // Status
  ws.getRange(5,1,n,16).setFontFamily(FBA.TNR).setFontSize(10);
  ws.getRange(5,1,n,16).sort([{ column: 1, ascending: false }, { column: 2, ascending: true }]);
}

function _fbaRollupToAdSpend(ss, rows) {
  var ws = ss.getSheetByName(FBA.ROLLUP_SHEET);
  if (!ws) return;
  var byDate = {};
  rows.forEach(function(r){ byDate[r.date] = (byDate[r.date] || 0) + r.spendUSD; });

  var lastRow = ws.getLastRow();
  var existing = {};
  if (lastRow >= 3) {
    var data = ws.getRange(3, 1, lastRow - 2, 1).getValues();
    data.forEach(function(r, i) {
      if (r[0] instanceof Date) existing[Utilities.formatDate(r[0], FBA.TZ_PST, 'yyyy-MM-dd')] = 3 + i;
    });
  }
  var toAppend = [];
  Object.keys(byDate).forEach(function(date) {
    var spend = byDate[date];
    var rowAt = existing[date];
    if (rowAt) {
      ws.getRange(rowAt, 2).setValue(spend);
      var g = parseFloat(ws.getRange(rowAt, 3).getValue()) || 0;
      var o = parseFloat(ws.getRange(rowAt, 4).getValue()) || 0;
      ws.getRange(rowAt, 5).setValue(spend + g + o);
    } else {
      toAppend.push([ new Date(date + 'T12:00:00Z'), spend, 0, 0, spend, 'auto: FB sync (multi-account USD)' ]);
    }
  });
  if (toAppend.length) {
    var at = Math.max(3, ws.getLastRow() + 1);
    ws.getRange(at, 1, toAppend.length, 6).setValues(toAppend);
    ws.getRange(at, 1, toAppend.length, 1).setNumberFormat('yyyy-mm-dd');
    ws.getRange(at, 2, toAppend.length, 4).setNumberFormat('"$"#,##0.00');
  }
}

// ════════════════════════════════════════════════════════════════════════
//  CLEAN & RE-SYNC  (fix legacy inflated / broken rows)
// ════════════════════════════════════════════════════════════════════════

/** Wipes data rows (5+) of 📱 FB Ads Daily, then re-pulls the window cleanly.
 *  📊 Ad Spend rollup history is left intact. */
function menuFBAdsCleanResync() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert('🧹 Clean & Re-sync FB Ads Daily',
    'This DELETES all data rows (5+) in "📱 FB Ads Daily" and re-pulls the last ' +
    FBA.WINDOW_DAYS + ' days fresh (USD-normalized, GerberaPrints accounts only).\n\n' +
    '📊 Ad Spend rollup is NOT touched. Continue?',
    ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;

  var ss = _getSSActive();
  var ws = ss.getSheetByName(FBA.SHEET);
  if (ws) {
    var last = ws.getLastRow();
    if (last >= 5) ws.getRange(5, 1, last - 4, ws.getLastColumn()).clearContent();
    ss.toast('Cleared old rows. Re-syncing…', '🧹', 5);
  }
  syncFBAdsDaily();
}

// ════════════════════════════════════════════════════════════════════════
//  TRIGGER + MENU
// ════════════════════════════════════════════════════════════════════════

function _fbaDailyTrigger() {
  try { syncFBAdsDaily(); }
  catch(e) { Logger.log('[_fbaDailyTrigger] ' + e.message); }
}

function menuFBAdsInstallTrigger() {
  var removed = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === '_fbaDailyTrigger') { ScriptApp.deleteTrigger(t); removed++; }
  });
  ScriptApp.newTrigger('_fbaDailyTrigger').timeBased().atHour(15).nearMinute(0).everyDays(1).create();
  var msg = '✅ FB Ads daily sync trigger installed at 15:00 VN (cleared ' + removed + ' old).';
  try { SpreadsheetApp.getUi().alert(msg); } catch(e) { Logger.log(msg); }
}

/** Wire into v27.x onOpen: dplFBAdsMenu(SpreadsheetApp.getUi()); */
function dplFBAdsMenu(ui) {
  ui.createMenu('📱 FB Ads')
    .addItem('🔄 Sync now',                       'syncFBAdsDaily')
    .addItem('🧹 Clean & Re-sync',                 'menuFBAdsCleanResync')
    .addSeparator()
    .addItem('📋 List my visible accounts',        'menuFBAdsListAccounts')
    .addItem('⚙ Setup Token & Accounts (CSV)',    'menuFBAdsSetup')
    .addItem('🔍 Test Token & Scopes',             'menuFBAdsTestToken')
    .addSeparator()
    .addItem('🎯 Sync CAMPAIGN-level (🎯 Campaign Daily heatmap)', 'fetchFBCampaignDaily')
    .addItem('⏰ Install daily trigger (15:00 VN)','menuFBAdsInstallTrigger')
    .addItem('⏰ Install CAMPAIGN daily trigger (15:30 VN)','fbcInstallTrigger')
    .addToUi();
}