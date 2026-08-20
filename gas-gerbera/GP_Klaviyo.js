// ════════════════════════════════════════════════════════════════════════
//  GP_Klaviyo.gs — Klaviyo module (CONSOLIDATED into CRM project)
//  Email perf · Abandoned Checkout · Failed-Payment Recovery (polling; webhook RETIRED)
//  · Post-Purchase · Win-Back. Owns sheets in THIS spreadsheet.
//  Reuses CRM globals: _getSSActive, SHOPIFY_STORE/API_VER/TOKEN.
//  Menu via klBuildMenu() — called from CRM onOpen (no duplicate onOpen).
// ════════════════════════════════════════════════════════════════════════

// ╔══════════════════════════════════════════════════════════════════╗
// ║         GERBERAPRINTS — KLAVIYO HUB v1                           ║
// ║         Email & SMS Marketing · Standalone Apps Script           ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  Sheets owned by this file:                                      ║
// ║    📧 Klaviyo Overview · 🛒 Abandoned Checkouts                  ║
// ║    💳 Failed Payments (recovery tracker)                         ║
// ║                                                                  ║
// ║  Reads CRM Core via SpreadsheetApp.openById(CRM_CORE_ID):        ║
// ║    Shopify B2C · 📋 Master Orders                                ║
// ║                                                                  ║
// ║  Architecture: See gerberaprints_CRM_v26_ARCHITECTURE.md         ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  INSTALL (first time):                                           ║
// ║   1. Create new Google Sheet → "GerberaPrints — Klaviyo Hub"     ║
// ║   2. Import gerberaprints_Klaviyo_Hub.xlsx                       ║
// ║   3. Extensions → Apps Script → delete default Code.gs           ║
// ║   4. Paste this file → Ctrl+S → reload spreadsheet               ║
// ║   5. appsscript.json → use this manifest:                        ║
// ║      {                                                           ║
// ║        "timeZone": "Asia/Ho_Chi_Minh",                           ║
// ║        "runtimeVersion": "V8",                                   ║
// ║        "oauthScopes": [                                          ║
// ║          "https://www.googleapis.com/auth/spreadsheets",         ║
// ║          "https://www.googleapis.com/auth/script.external_request", ║
// ║          "https://www.googleapis.com/auth/script.scriptapp"      ║
// ║        ]                                                         ║
// ║      }                                                           ║
// ║   6. Menu → 📧 Klaviyo Hub → 🚀 First-Time Setup Wizard          ║
// ╚══════════════════════════════════════════════════════════════════╝


// ════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════

var HUB_NAME    = 'Klaviyo Hub';
var HUB_VERSION = 'v2.5';   // v2.5 CUTOVER: _klaviyoDailyRun no longer feeds abandoned-cart either (Hub is sole feeder for ALL reconvert flows); only list-stats/email-status kept. v2.4: failed-payment feed moved to Hub. v2.3: per-email dedup ledger + 4h cadence

// Klaviyo List IDs (verified from sheet 📧 Klaviyo Overview)
var KL_LIST = {
  EMAIL_MAIN     : 'XCApTY',  // Email List — main subscribers
  SMS_MAIN       : 'UyQus5',  // SMS List
  FAILED_PAY_REC : 'YcpNV9'   // Failed Payment Recovery (Apr 3 2026)
};

// Canonical event names (match Klaviyo flow triggers exactly)
var KL_EVT = {
  ABANDONED      : 'Checkout Abandoned',
  PAYMENT_FAILED : 'Payment Failed',          // canonical — KHÔNG dùng 'Failed Payment Recovery'
  POST_PURCHASE  : 'Post Purchase',
  WIN_BACK       : 'Win-Back Eligible'
};

// Discount codes (verified active in Shopify Admin)
var KL_PROMO = {
  ABANDONED_RECOVERY : 'SAVE10',   // 10% off — Email 3 Abandoned T+48h
  PAYMENT_FAILED_REC : 'FIXPAY5'   // 5% off — Email 3 Failed Pay T+36h (apology)
};

// Recovery retry links — UTM-tagged so recovered revenue is attributable in Klaviyo + 📈 Channel Daily.
// Root cause of these failures = Airwallex card declines, so PayPal is pushed as the working method.
var KL_URL = {
  RETRY_CART   : 'https://gerberaprints.com/cart?utm_source=klaviyo&utm_medium=email&utm_campaign=failed_payment_recovery',
  RETRY_PAYPAL : 'https://gerberaprints.com/cart?utm_source=klaviyo&utm_medium=email&utm_campaign=failed_payment_recovery&payment=paypal'
};

// Sheet name constants (this hub)
var KLSH = {
  KLAVIYO_SH : '📧 Klaviyo Overview',
  ABANDON    : '🛒 Abandoned Checkouts',
  FAILED_PAY : '💳 Failed Payments',
  // CRM Core sheets (read via openById)
  SHOPIFY    : 'Shopify B2C',
  MASTER     : '📋 Master Orders',
};

// Master Orders columns on the CRM Core side (1-indexed)
var MO_COL = { EMAIL:15, KLAVIYO_ID:23, RECONVERT_DATE:24, RECONVERT_SENT:25 };

// v27.79: Master Orders now lives in the Fulfillment Hub, so the Klaviyo flows read the
// LOCAL 'Shopify B2C' sheet instead (same customer/order data). B2C is 28 cols (_B2C_NCOLS);
// post-purchase dedup markers live in spare cols 29/30.
var B2C_COL = { DATE:1, ORDER:2, EMAIL:4, REVENUE:16, PP_SENT:29, PP_DATE:30 };

// Abandoned Checkouts layout
var AC = {
  DATE:1, ID:2, NAME:3, EMAIL:4, PHONE:5, TOTAL:6,
  CURRENCY:7, ITEMS:8, PRODUCTS:9, STATUS:10,
  RECOVERY_EMAIL:11, EMAIL_SENT_AT:12, OPENS:13, CLICKED:14, NOTES:15,
  KLAVIYO_ID:16, SEGMENT:17
};
var AC_HEADER_ROW = 7;
var AC_DATA_ROW   = 8;
var AC_STAT_ROW   = 5;

// Klaviyo API defaults (override via PropertiesService)
var _KL = {
  PRIVATE_KEY    : '__REDACTED__',
  WEBHOOK_SECRET : '__REDACTED__',
  WEBHOOK_ID     : 'wh_qVjE4uQQouD7VqGTO6T4xRYLYj3g6hUM',
  ACCOUNT_ID     : 'acct_D39aF1u3OwSBgUQVGxWpeA',
  VERCEL_URL     : 'https://gerberaprints-webhook.vercel.app/api/webhook',
  API_REVISION   : '2024-02-15'
};

// Shopify API (read-only for abandoned checkout fetch)
// (Shopify globals SHOPIFY_STORE / SHOPIFY_API_VER / SHOPIFY_TOKEN reused from CRM core — not redeclared)


// ════════════════════════════════════════════════════════════════════
// AUTO-INIT: write default secrets to Properties on first load
// ════════════════════════════════════════════════════════════════════
(function _initKlaviyoSecrets() {
  try {
    var p = PropertiesService.getScriptProperties();
    p.setProperties({
      'KLAVIYO_KEY'            : _KL.PRIVATE_KEY,
      'KLAVIYO_WEBHOOK_SECRET' : _KL.WEBHOOK_SECRET,
      'KLAVIYO_WEBHOOK_ID'     : _KL.WEBHOOK_ID,
      'KLAVIYO_ACCOUNT_ID'     : _KL.ACCOUNT_ID,
    });
  } catch(e) { /* silent — runs again on next load */ }
})();


// ════════════════════════════════════════════════════════════════════
// CORE HELPERS — CRM link + access
// ════════════════════════════════════════════════════════════════════

/**
 * Returns the CRM Core spreadsheet. Throws if not linked.
 * User must run menuLinkToCRM() once.
 */
function _getCRMCore() {
  return _getSSActive();   // consolidated into CRM project — core = this spreadsheet
}

/** Returns this hub's active spreadsheet. */
function _getHub() {
  return _getSSActive();
}

/** Read-only access to CRM Core sheet; returns null on failure. */
function _crmSheet(name) {
  try {
    return _getCRMCore().getSheetByName(name);
  } catch(e) {
    Logger.log('[_crmSheet] ' + name + ': ' + e.message);
    return null;
  }
}


// ════════════════════════════════════════════════════════════════════
// SHEET HELPERS
// ════════════════════════════════════════════════════════════════════

/**
 * Build set of emails that already have Master Orders (live) — this is
 * how we know an abandoned cart converted. Reads from CRM Core.
 */
function _buildOrderedSet() {
  var s = new Set();
  var wsMO = _crmSheet(KLSH.MASTER);
  var wsB2C = _crmSheet(KLSH.SHOPIFY);

  if (wsMO && wsMO.getLastRow() >= 3) {
    wsMO.getRange(3, MO_COL.EMAIL, wsMO.getLastRow()-2, 1).getValues()
      .forEach(function(r){
        var e = (r[0]||'').toString().toLowerCase().trim();
        if (e) s.add(e);
      });
  }
  if (wsB2C && wsB2C.getLastRow() >= 3) {
    // B2C col 4 = Email
    wsB2C.getRange(3, 4, wsB2C.getLastRow()-2, 1).getValues()
      .forEach(function(r){
        var e = (r[0]||'').toString().toLowerCase().trim();
        if (e) s.add(e);
      });
  }
  return s;
}


// ════════════════════════════════════════════════════════════════════
// KLAVIYO API v3 HELPERS
// ════════════════════════════════════════════════════════════════════

/** Get active Klaviyo key from Properties. */
function _klaviyoKey() {
  return PropertiesService.getScriptProperties().getProperty('KLAVIYO_KEY') || _KL.PRIVATE_KEY;
}

function _klaviyoWebhookSecret() {
  return PropertiesService.getScriptProperties().getProperty('KLAVIYO_WEBHOOK_SECRET') || _KL.WEBHOOK_SECRET;
}

/** Upsert profile → returns profile_id. */
function _klaviyoUpsert(email, name, phone) {
  if (!email || !_klaviyoKey()) return null;
  var parts = (name||'').trim().split(' ');
  var body = JSON.stringify({
    data: {
      type: 'profile',
      attributes: {
        email: email,
        first_name: parts[0] || '',
        last_name: parts.slice(1).join(' ') || '',
        phone_number: phone || ''
      }
    }
  });
  try {
    var resp = UrlFetchApp.fetch('https://a.klaviyo.com/api/profile-import/', {
      method: 'post',
      headers: {
        'Authorization': 'Klaviyo-API-Key ' + _klaviyoKey(),
        'revision': _KL.API_REVISION,
        'Content-Type': 'application/json'
      },
      payload: body,
      muteHttpExceptions: true
    });
    var d = JSON.parse(resp.getContentText());
    return d.data ? d.data.id : null;
  } catch(e) {
    Logger.log('❌ _klaviyoUpsert: ' + e.message);
    return null;
  }
}

/** Track Klaviyo event (used by flows). */
function _klaviyoTrackEvent(profileId, eventName, properties) {
  if (!profileId || !_klaviyoKey()) return false;
  var body = JSON.stringify({
    data: {
      type: 'event',
      attributes: {
        metric: { data: { type: 'metric', attributes: { name: eventName } } },
        profile: { data: { type: 'profile', id: profileId } },
        properties: properties || {}
      }
    }
  });
  try {
    var resp = UrlFetchApp.fetch('https://a.klaviyo.com/api/events/', {
      method: 'post',
      headers: {
        'Authorization': 'Klaviyo-API-Key ' + _klaviyoKey(),
        'revision': _KL.API_REVISION,
        'Content-Type': 'application/json'
      },
      payload: body,
      muteHttpExceptions: true
    });
    return resp.getResponseCode() < 400;
  } catch(e) {
    Logger.log('❌ _klaviyoTrackEvent: ' + e.message);
    return false;
  }
}

/** Subscribe a profile to a Klaviyo list (idempotent — safe to call multiple times). */
function _klaviyoSubscribeToList(profileId, listId, email) {
  if (!profileId || !listId || !_klaviyoKey()) return false;

  var body = JSON.stringify({
    data: [{
      type: 'profile',
      id: profileId,
      attributes: { email: email || '' }
    }]
  });

  try {
    var resp = UrlFetchApp.fetch(
      'https://a.klaviyo.com/api/lists/' + listId + '/relationships/profiles/',
      {
        method: 'post',
        headers: {
          'Authorization': 'Klaviyo-API-Key ' + _klaviyoKey(),
          'revision': _KL.API_REVISION,
          'Content-Type': 'application/json'
        },
        payload: body,
        muteHttpExceptions: true
      }
    );
    var code = resp.getResponseCode();
    // 204 = added, 409 = already in list, 400 = body issue. Accept 204+409.
    if (code === 204 || code === 409) return true;
    Logger.log('[_klaviyoSubscribeToList] HTTP ' + code + ' · ' + resp.getContentText().substring(0,200));
    return false;
  } catch(e) {
    Logger.log('❌ _klaviyoSubscribeToList: ' + e.message);
    return false;
  }
}


function _klaviyoTrackAbandoned(profileId, c, prods, value, seg) {
  var items = (c.line_items||[]).map(function(it){return{
    title: it.title,
    variant: it.variant_title || '',
    quantity: it.quantity,
    price: parseFloat(it.price || 0),
    product_url: 'https://gerberaprints.com/products/' + (it.handle||'')
  };});
  return _klaviyoTrackEvent(profileId, KL_EVT.ABANDONED, {
    checkout_id:    c.id,
    cart_value:     value,
    currency:       c.currency || 'USD',
    products:       prods,
    items_count:    (c.line_items||[]).length,
    checkout_url:   c.abandoned_checkout_url || '',
    value_segment:  seg,
    items:          items,
    promo_code:     KL_PROMO.ABANDONED_RECOVERY,
    promo_pct:      10
  });
}

/** Fetch Klaviyo list/segment stats. Returns array of list objects. */
function _klaviyoMetrics() {
  if (!_klaviyoKey()) return [];
  try {
    var resp = UrlFetchApp.fetch('https://a.klaviyo.com/api/lists/', {
      method: 'get',
      headers: {
        'Authorization': 'Klaviyo-API-Key ' + _klaviyoKey(),
        'revision': _KL.API_REVISION
      },
      muteHttpExceptions: true
    });
    var d = JSON.parse(resp.getContentText());
    return (d.data || []).map(function(x){
      return {
        id:           x.id,
        name:         x.attributes ? x.attributes.name : '',
        created:      x.attributes ? x.attributes.created : '',
        profile_count: (x.attributes && x.attributes.profile_count) || 0
      };
    });
  } catch(e) {
    Logger.log('❌ _klaviyoMetrics: ' + e.message);
    return [];
  }
}

/**
 * Write Klaviyo profile ID back to CRM Core Master Orders.
 * Finds row by email (col MO_COL.EMAIL) and updates KLAVIYO_ID column.
 */
function _moUpdateKlaviyo(email, profileId) {
  if (!email || !profileId) return false;
  var wsMO = _crmSheet(KLSH.MASTER);
  if (!wsMO || wsMO.getLastRow() < 3) return false;

  var emails = wsMO.getRange(3, MO_COL.EMAIL, wsMO.getLastRow()-2, 1).getValues();
  var lowerEmail = email.toLowerCase().trim();
  for (var i = 0; i < emails.length; i++) {
    var e = (emails[i][0]||'').toString().toLowerCase().trim();
    if (e === lowerEmail) {
      wsMO.getRange(i+3, MO_COL.KLAVIYO_ID).setValue(profileId);
      return true;
    }
  }
  return false;
}


// ════════════════════════════════════════════════════════════════════
// SHOPIFY — Abandoned checkouts fetcher
// ════════════════════════════════════════════════════════════════════

function _shopifyGetAbandoned() {
  var BASE = 'https://' + SHOPIFY_STORE + '/admin/api/' + SHOPIFY_API_VER + '/';
  var HDR  = { 'X-Shopify-Access-Token': SHOPIFY_TOKEN };
  try {
    var resp = UrlFetchApp.fetch(BASE + 'checkouts.json?limit=250&status=open', {
      headers: HDR, muteHttpExceptions: true
    });
    if (resp.getResponseCode() !== 200) return [];
    var d = JSON.parse(resp.getContentText());
    return d.checkouts || [];
  } catch(e) {
    Logger.log('❌ _shopifyGetAbandoned: ' + e.message);
    return [];
  }
}


// ════════════════════════════════════════════════════════════════════
// FLOW 1 — SYNC ABANDONED CHECKOUTS
// ════════════════════════════════════════════════════════════════════

function syncAbandonedCheckouts() {
  var ss   = _getHub();
  // v27.80: auto-create the Abandoned Checkouts sheet if missing (was: hard error + return).
  // NOTE: a freshly created sheet has no history, so the first run treats every current
  // Shopify abandoned checkout as NEW and fires its Klaviyo event once (dedup by checkout_id after).
  var wsAC = ss.getSheetByName(KLSH.ABANDON);
  if (!wsAC) {
    wsAC = ss.insertSheet(KLSH.ABANDON);
    wsAC.getRange(1, 1, 1, 17).merge()
      .setValue('Abandoned Checkouts')
      .setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');
    wsAC.getRange(AC_HEADER_ROW, 1, 1, 17).setValues([[
      'Date', 'Checkout ID', 'Name', 'Email', 'Phone', 'Total', 'Currency', 'Items', 'Products',
      'Status', 'Recovery Email', 'Email Sent At', 'Opens', 'Clicked', 'Notes', 'Klaviyo ID', 'Segment'
    ]]).setFontWeight('bold');
    wsAC.setFrozenRows(AC_HEADER_ROW);
  }

  var t0 = new Date();
  var checkouts = _shopifyGetAbandoned();
  if (!checkouts.length) {
    ss.toast('No abandoned checkouts from Shopify', 'Flow 1', 5);
    return;
  }

  // Emails that already converted (from CRM Core)
  var ordered;
  try {
    ordered = _buildOrderedSet();
  } catch(e) {
    SpreadsheetApp.getUi().alert('CRM Core not linked.\n\n' + e.message);
    return;
  }

  // PATCH v2: Build map of existing checkouts in sheet (preserve history of opens/clicks)
  // Keyed by checkout_id (col B / index 1)
  var existingMap = {};
  if (wsAC.getLastRow() >= AC_DATA_ROW) {
    var prev = wsAC.getRange(AC_DATA_ROW, 1, wsAC.getLastRow()-AC_DATA_ROW+1, 17).getValues();
    for (var p = 0; p < prev.length; p++) {
      var pid = prev[p][AC.ID-1];
      if (pid) existingMap[pid.toString()] = prev[p];
    }
  }

  var rows = [];
  var newEvents = 0;
  var skipped = 0;
  checkouts.forEach(function(c) {
    var email = (c.email || '').toLowerCase().trim();
    if (!email) return;
    if (ordered.has(email)) return;   // already converted — exit flow naturally

    var cid = c.id.toString();
    var value = parseFloat(c.total_price || 0);
    var seg   = value >= 150 ? 'High Value' : value >= 50 ? 'Mid' : 'Low';
    var prods = (c.line_items || []).map(function(li){ return li.title; }).join(' | ');

    var existing = existingMap[cid];
    var isNew = !existing;

    var profId = '';
    if (isNew) {
      // Only fire Klaviyo event ONCE per checkout — dedup by checkout_id
      var custName = ((c.customer && c.customer.first_name) || '') + ' ' + ((c.customer && c.customer.last_name) || '');
      profId = _klaviyoUpsert(email, custName.trim(), c.phone) || '';

      if (profId) {
        // PATCH v2: Subscribe to Email List so flow can fire
        _klaviyoSubscribeToList(profId, KL_LIST.EMAIL_MAIN, email);
        Utilities.sleep(80);
        // Track event — canonical name from KL_EVT
        _klaviyoTrackAbandoned(profId, c, prods, value, seg);
        newEvents++;
      }
    } else {
      // Already in sheet — preserve profileId + stats, skip event
      profId = existing[AC.KLAVIYO_ID-1] || '';
      skipped++;
    }

    var emailSentAt = isNew ? new Date() : (existing ? existing[AC.EMAIL_SENT_AT-1] : '');
    var opens       = existing ? existing[AC.OPENS-1] : '';
    var clicked     = existing ? existing[AC.CLICKED-1] : '';
    var notes       = existing ? existing[AC.NOTES-1] : '';

    rows.push([
      new Date(c.created_at),
      cid,
      ((c.customer && c.customer.first_name)||'') + ' ' + ((c.customer && c.customer.last_name)||''),
      email,
      c.phone || '',
      value,
      c.currency || 'USD',
      (c.line_items||[]).length,
      prods,
      'Abandoned',
      c.abandoned_checkout_url || '',
      emailSentAt,
      opens,
      clicked,
      notes,
      profId,
      seg
    ]);
  });

  // Write rows (overwrite data area)
  if (wsAC.getLastRow() >= AC_DATA_ROW) {
    wsAC.getRange(AC_DATA_ROW, 1, wsAC.getLastRow()-AC_DATA_ROW+1, 17).clearContent();
  }
  if (rows.length) {
    wsAC.getRange(AC_DATA_ROW, 1, rows.length, 17).setValues(rows);
  }

  // Stats row
  wsAC.getRange(AC_STAT_ROW, 1).setValue('Last sync: ' + Utilities.formatDate(t0, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'));
  wsAC.getRange(AC_STAT_ROW, 2).setValue(checkouts.length + ' found');
  wsAC.getRange(AC_STAT_ROW, 3).setValue(newEvents + ' new events');
  wsAC.getRange(AC_STAT_ROW, 4).setValue(skipped + ' dedup skipped');

  ss.toast('✓ ' + rows.length + ' rows · ' + newEvents + ' new events → Klaviyo (skipped ' + skipped + ')', 'Flow 1', 5);
  Logger.log('[syncAbandonedCheckouts] total=' + rows.length + ' new=' + newEvents + ' skipped=' + skipped);
}


// ════════════════════════════════════════════════════════════════════
// FLOW 1B — SYNC EMAIL STATUS (check opens/clicks from Klaviyo)
// ════════════════════════════════════════════════════════════════════

function syncKlaviyoEmailStatus() {
  var wsAC = _getHub().getSheetByName(KLSH.ABANDON);
  if (!wsAC || wsAC.getLastRow() < AC_DATA_ROW) return;

  var rows = wsAC.getRange(AC_DATA_ROW, 1, wsAC.getLastRow()-AC_DATA_ROW+1, 17).getValues();
  var updates = 0;

  for (var i = 0; i < rows.length; i++) {
    var profId = rows[i][AC.KLAVIYO_ID-1];
    if (!profId) continue;

    try {
      var resp = UrlFetchApp.fetch('https://a.klaviyo.com/api/profiles/' + profId, {
        method: 'get',
        headers: { 'Authorization': 'Klaviyo-API-Key ' + _klaviyoKey(), 'revision': _KL.API_REVISION },
        muteHttpExceptions: true
      });
      if (resp.getResponseCode() !== 200) continue;
      var p = JSON.parse(resp.getContentText());
      var attrs = p.data && p.data.attributes;
      if (!attrs) continue;

      // Subscription status → email sent flag
      var subs = attrs.subscriptions && attrs.subscriptions.email;
      if (subs && subs.marketing && subs.marketing.consent === 'SUBSCRIBED') {
        wsAC.getRange(AC_DATA_ROW + i, AC.STATUS).setValue('Subscribed');
        updates++;
      }
    } catch(e) { /* skip this row */ }
    Utilities.sleep(100);  // rate limit
  }

  _getHub().toast('Updated ' + updates + ' rows', 'Email Status', 5);
}


// ════════════════════════════════════════════════════════════════════
// FLOW 1C — SYNC LIST STATS (writes to 📧 Klaviyo Overview)
// ════════════════════════════════════════════════════════════════════

function syncKlaviyoListStats() {
  var ss   = _getHub();
  // v27.78: auto-create the Klaviyo Overview sheet if missing (was: hard error + return)
  var wsKL = ss.getSheetByName(KLSH.KLAVIYO_SH);
  if (!wsKL) {
    wsKL = ss.insertSheet(KLSH.KLAVIYO_SH);
    wsKL.getRange(1, 1, 1, 7).merge()
      .setValue('Klaviyo Overview - list stats')
      .setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');
    wsKL.getRange(3, 1, 1, 7)
      .setValues([['List Name', 'Type', 'Profile Count', 'Created', 'Opt-in', 'List ID', 'Status']])
      .setFontWeight('bold');
    wsKL.setFrozenRows(3);
  }

  var lists = _klaviyoMetrics();
  if (!lists.length) {
    ss.toast('No Klaviyo lists fetched — check API key', 'Warning', 5);
    return;
  }

  // Overwrite data area — assume header row 3, data from row 4
  var HEADER_ROW = 3;
  var DATA_ROW   = 4;
  var lr = wsKL.getLastRow();
  if (lr >= DATA_ROW) {
    wsKL.getRange(DATA_ROW, 1, lr-DATA_ROW+1, 7).clearContent();
  }
  var rows = lists.map(function(l){
    return [
      l.name,
      'List',
      l.profile_count,
      l.created ? new Date(l.created) : '',
      'double',
      l.id,
      l.profile_count > 0 ? 'Active' : 'Empty'
    ];
  });
  if (rows.length) {
    wsKL.getRange(DATA_ROW, 1, rows.length, 7).setValues(rows);
  }
  // Updated stamp at row 2
  wsKL.getRange(2, 1).setValue('Updated: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'));

  ss.toast('✓ ' + rows.length + ' lists synced', 'Klaviyo Overview', 5);
}


// ════════════════════════════════════════════════════════════════════
// FLOW 2 — FAILED PAYMENT RECOVERY
// ════════════════════════════════════════════════════════════════════

function _updateFailedPayStats() {
  var wsFP = _getHub().getSheetByName(KLSH.FAILED_PAY);
  if (!wsFP) return;

  var lr = wsFP.getLastRow();
  if (lr < 3) return;

  // Data starts row 3. Cols: A:Date, B:Ref, C:Customer, D:Amount,
  //                        E:Status, F:PaymentID, G:EmailSent, H:Recovered
  var data = wsFP.getRange(3, 1, lr-2, 8).getValues();
  var total = 0, pending = 0, recovered = 0, sent = 0, valueLost = 0;
  data.forEach(function(r){
    if (!r[0]) return;
    total++;
    var amt = parseFloat(r[3]||0);
    if ((r[4]||'').toString().toLowerCase().indexOf('pending') >= 0) pending++;
    if ((r[6]||'').toString().indexOf('✓') >= 0 || r[6] === true) sent++;
    if ((r[7]||'').toString().indexOf('✓') >= 0 || r[7] === true) { recovered++; }
    else { valueLost += amt; }
  });

  // Write summary in row 2 (if structure allows)
  try {
    wsFP.getRange(2, 1).setValue('Updated: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') +
      ' · Total: ' + total + ' · Pending: ' + pending + ' · Recovered: ' + recovered +
      ' · Value lost: $' + valueLost.toFixed(2));
  } catch(e) {}
}

function _failedPayRecovery_LEGACY() {
  var ss   = _getHub();
  var wsFP = ss.getSheetByName(KLSH.FAILED_PAY);
  if (!wsFP) { SpreadsheetApp.getUi().alert('❌ Sheet not found: ' + KLSH.FAILED_PAY); return; }

  var lr = wsFP.getLastRow();
  if (lr < 3) { ss.toast('No failed payments in tracker', 'Flow 2', 5); return; }

  var data = wsFP.getRange(3, 1, lr-2, 8).getValues();
  var ordered = _buildOrderedSet();
  var triggered = 0;
  var skipped = 0;

  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    if (!r[0]) continue;

    // FailedPay layout: A:Date B:OrderRef/PI_ID C:Customer D:Amount E:Status F:PaymentID G:EmailSent H:Recovered
    // PATCH v2: customer email may be in col C (if email format) or need to be resolved separately
    var customerVal = (r[2]||'').toString().trim();
    var email = customerVal.toLowerCase();
    if (!email || email.indexOf('@') < 0) {
      skipped++;
      continue;
    }
    if ((r[6]||'').toString().indexOf('✓') >= 0) { skipped++; continue; }   // already sent

    // Auto-recover detection — order placed under same email
    if (ordered.has(email)) {
      wsFP.getRange(3+i, 8).setValue('✓ Auto-recovered');
      skipped++;
      continue;
    }

    // Upsert + subscribe + track
    var profId = _klaviyoUpsert(email, '', '');
    if (profId) {
      // PATCH v2: subscribe to Failed Payment Recovery list
      _klaviyoSubscribeToList(profId, KL_LIST.FAILED_PAY_REC, email);
      Utilities.sleep(80);

      var orderRef  = (r[1]||'').toString();
      var amount    = parseFloat(r[3]||0);
      var paymentId = (r[5]||'').toString();

      // Build retry URL (Shopify checkout retry) and PayPal backup link
      // Shopify pattern: orders/<order_id>/recover (admin-side); customers use checkout URL from order
      var retryUrl    = orderRef ? 'https://gerberaprints.com/account#order_' + orderRef : 'https://gerberaprints.com/cart';
      var paypalUrl   = 'https://gerberaprints.com/checkout?payment_method=paypal';

      _klaviyoTrackEvent(profId, KL_EVT.PAYMENT_FAILED, {
        amount:        amount,
        amount_str:    '$' + amount.toFixed(2),
        currency:      'USD',
        payment_id:    paymentId,
        order_ref:     orderRef,
        failed_at:     r[0] ? new Date(r[0]).toISOString() : '',
        retry_url:     retryUrl,
        paypal_url:    paypalUrl,           // for Email 2 — alternative payment method
        promo_code:    KL_PROMO.PAYMENT_FAILED_REC,  // FIXPAY5
        promo_pct:     5,
        support_email: 'orders@gerberaprints.com'
      });
      wsFP.getRange(3+i, 7).setValue('✓ ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM HH:mm'));
      triggered++;
    }
    Utilities.sleep(150);
  }

  _updateFailedPayStats();
  ss.toast('✓ ' + triggered + ' recovery events · ' + skipped + ' skipped', 'Flow 2', 5);
  Logger.log('[triggerFailedPaymentRecovery] triggered=' + triggered + ' skipped=' + skipped);
}

/** PATCH v2.1: Append a new failed payment row from Vercel webhook relay.
 *  Payload structure:
 *  {
 *    email, first_name, last_name,
 *    amount, currency,
 *    payment_intent_id, payment_attempt_id,
 *    order_ref, shopify_order_id,
 *    event_name, failure_code, failure_message,
 *    checkout_url, failed_at, resolved_via
 *  }
 */
function appendFailedPayment(payload) {
  var ss   = _getHub();
  var wsFP = ss.getSheetByName(KLSH.FAILED_PAY);
  if (!wsFP) return false;

  var p = payload || {};

  // Field extraction — try multiple paths for backward compat
  var email     = (p.email || '').toString().toLowerCase().trim();
  var orderRef  = (p.shopify_order_id || p.order_ref || p.merchant_order_id || '').toString();
  var amount    = parseFloat(p.amount || 0);
  var paymentId = (p.payment_intent_id || p.payment_id || '').toString();
  var attemptId = (p.payment_attempt_id || '').toString();
  var failedAt  = p.failed_at ? new Date(p.failed_at) : new Date();

  // Build status string with rich context
  var failCode = p.failure_code || p.fail_code || '';
  var resolvedVia = p.resolved_via || 'unknown';
  var status = 'failed';
  if (failCode) status = 'failed: ' + failCode;
  if (resolvedVia && resolvedVia !== 'payload') status += ' (email via ' + resolvedVia + ')';
  if (!email) status = 'failed: email_unresolved';

  // Dedup by payment_intent_id (stable across retries)
  var dedupKey = paymentId || attemptId;
  var lr = wsFP.getLastRow();
  if (lr >= 3 && dedupKey) {
    var existing = wsFP.getRange(3, 6, lr-2, 1).getValues();
    for (var i = 0; i < existing.length; i++) {
      if ((existing[i][0]||'').toString() === dedupKey) {
        Logger.log('[appendFailedPayment] dedup hit for ' + dedupKey);
        return false;
      }
    }
  }

  // Append row
  var newRow = [
    failedAt,                           // A: Date
    orderRef || attemptId,              // B: Order Ref (Shopify order or payment_attempt_id)
    email || '(email_unresolved)',      // C: Customer (email)
    amount,                             // D: Amount
    status,                             // E: Status (with failure code + resolution method)
    paymentId || attemptId,             // F: Payment ID (used for dedup + recovery match)
    '',                                 // G: Email Sent (filled by triggerFailedPaymentRecovery)
    ''                                  // H: Recovered
  ];
  wsFP.appendRow(newRow);

  // Clear placeholder if present (only when sheet had no real data)
  if (lr === 3) {
    var firstCell = wsFP.getRange(3, 1).getValue();
    if (typeof firstCell === 'string' && firstCell.indexOf('No failed payments') >= 0) {
      // Note: appendRow already added new row at lr+1, so placeholder at row 3 needs removal
      // But since we just appended, we should not clear what was just added. Skip clearing.
    }
  }

  _updateFailedPayStats();
  Logger.log('[appendFailedPayment] added pi=' + paymentId + ' email=' + email +
             ' amt=' + amount + ' via=' + resolvedVia);
  return true;
}

/** PATCH v2.1: Webhook entry point. Called by Vercel relay → GAS Web App.
 *  Expects POST with JSON body:
 *  {
 *    secret: 'gp_callback_2026',
 *    event: 'failed_payment' | 'payment_recovered' | 'dispute',
 *    data: { ... rich payload ... }
 *  }
 */
function doPost(e) {
  var GAS_CALLBACK_SECRET = 'gp_callback_2026';

  try {
    var raw = (e && e.postData && e.postData.contents) || '{}';
    var payload = JSON.parse(raw);

    // Secret validation
    if (payload.secret !== GAS_CALLBACK_SECRET) {
      Logger.log('[doPost] invalid secret — rejected');
      return ContentService.createTextOutput(
        JSON.stringify({ok:false, error:'invalid_secret'})
      ).setMimeType(ContentService.MimeType.JSON);
    }

    var event = (payload.event || '').toString();
    var data  = payload.data || {};
    var result = { ok: true, event: event, ts: new Date().toISOString() };

    switch (event) {
      // Vercel sends this when Airwallex fires payment_attempt.*_failed
      case 'failed_payment':
      case 'airwallex_payment_failed':  // backward compat
        result.appended = appendFailedPayment(data);
        // Note: NOT auto-firing triggerFailedPaymentRecovery here.
        // Vercel already adds profile to Klaviyo list YcpNV9 directly,
        // which fires the Klaviyo flow. GAS sheet is audit log only.
        break;

      // Vercel sends this when Airwallex fires payment_attempt.authorized after a fail
      case 'payment_recovered':
      case 'airwallex_payment_succeeded':  // backward compat
        var pid = data.payment_intent_id || data.payment_id || '';
        result.recovered = _markFailedPaymentRecovered(pid);
        break;

      // Future: dispute logging
      case 'dispute':
      case 'airwallex_dispute':
        Logger.log('[doPost] dispute received: ' + JSON.stringify(data).slice(0, 300));
        result.logged = true;
        break;

      // Health check / ping
      case 'ping':
        result.pong = true;
        break;

      default:
        result.ok = false;
        result.error = 'unknown_event';
        result.received = event;
        Logger.log('[doPost] unknown event: ' + event);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    Logger.log('[doPost] error: ' + err.message + ' | stack: ' + (err.stack || 'n/a'));
    return ContentService.createTextOutput(
      JSON.stringify({ok:false, error:err.message, ts:new Date().toISOString()})
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/** PATCH v2.1: doGet for browser test of Web App URL.
 *  Use to verify deployment URL is alive without firing real event.
 *  Hit URL in browser → returns simple status JSON.
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    service: 'GerberaPrints Klaviyo Hub',
    version: HUB_VERSION,
    endpoints: ['POST / with {secret, event, data}'],
    events_supported: ['failed_payment', 'payment_recovered', 'dispute', 'ping'],
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}


/** Called when Airwallex reports a payment as recovered. */
function _handleAirwallexRecovered(paymentIntentId) {
  if (!paymentIntentId) return false;
  return _markFailedPaymentRecovered(paymentIntentId);
}

/** Marks a failed-payment row as recovered (by payment intent ID). */
function _markFailedPaymentRecovered(paymentIntentId) {
  var wsFP = _getHub().getSheetByName(KLSH.FAILED_PAY);
  if (!wsFP || wsFP.getLastRow() < 3) return false;

  var data = wsFP.getRange(3, 1, wsFP.getLastRow()-2, 8).getValues();
  for (var i = 0; i < data.length; i++) {
    if ((data[i][1]||'').toString() === paymentIntentId ||
        (data[i][5]||'').toString() === paymentIntentId) {
      wsFP.getRange(3+i, 8).setValue('✓ ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM HH:mm'));
      return true;
    }
  }
  return false;
}


// ════════════════════════════════════════════════════════════════════
// FLOW 3 — AFTER-PURCHASE (thank-you / upsell sequence)
// ════════════════════════════════════════════════════════════════════

function triggerAfterPurchaseFlow() {
  var wsB2C = _crmSheet(KLSH.SHOPIFY);
  if (!wsB2C || wsB2C.getLastRow() < 3) {
    SpreadsheetApp.getUi().alert('Shopify B2C sheet not found or empty.');
    return;
  }
  // v27.79: ensure dedup marker columns exist (beyond the 28 synced B2C cols)
  if (wsB2C.getMaxColumns() < B2C_COL.PP_DATE) {
    wsB2C.insertColumnsAfter(wsB2C.getMaxColumns(), B2C_COL.PP_DATE - wsB2C.getMaxColumns());
  }
  try { wsB2C.getRange(2, B2C_COL.PP_SENT, 1, 2).setValues([['Klaviyo PP Sent', 'Klaviyo PP Date']]); } catch (e) {}

  var now = new Date();
  var data = wsB2C.getRange(3, 1, wsB2C.getLastRow()-2, B2C_COL.PP_DATE).getValues();
  var triggered = 0;

  for (var i = 0; i < data.length; i++) {
    var orderDate = data[i][B2C_COL.DATE-1];
    var email     = (data[i][B2C_COL.EMAIL-1]||'').toString().toLowerCase().trim();
    var sent      = (data[i][B2C_COL.PP_SENT-1]||'').toString();
    if (!orderDate || !email || email.indexOf('@') < 0) continue;
    if (sent.indexOf('✓') >= 0) continue;

    // Only trigger for orders 3-7 days old
    var days = (now - new Date(orderDate)) / (1000*60*60*24);
    if (days < 3 || days > 7) continue;

    var profId = _klaviyoUpsert(email, '', '');
    if (profId) {
      _klaviyoTrackEvent(profId, KL_EVT.POST_PURCHASE, {
        days_since_order: Math.round(days),
        order_number:     data[i][B2C_COL.ORDER-1],
        order_value:      parseFloat(data[i][B2C_COL.REVENUE-1]||0)
      });
      wsB2C.getRange(3+i, B2C_COL.PP_SENT).setValue('✓ ' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd/MM HH:mm'));
      wsB2C.getRange(3+i, B2C_COL.PP_DATE).setValue(now);
      triggered++;
    }
    Utilities.sleep(150);
  }

  _getHub().toast('✓ ' + triggered + ' after-purchase events', 'Flow 3', 5);
}


// ════════════════════════════════════════════════════════════════════
// FLOW 4 — WIN-BACK (customers lapsed 45-90 days)
// ════════════════════════════════════════════════════════════════════

function triggerWinBackFlow() {
  var wsB2C = _crmSheet(KLSH.SHOPIFY);
  if (!wsB2C || wsB2C.getLastRow() < 3) {
    SpreadsheetApp.getUi().alert('Shopify B2C sheet not found or empty.');
    return;
  }

  var now = new Date();
  var data = wsB2C.getRange(3, 1, wsB2C.getLastRow()-2, B2C_COL.REVENUE).getValues();

  // Group by email -> last order date per customer
  var lastOrder = {};
  data.forEach(function(r){
    var e = (r[B2C_COL.EMAIL-1]||'').toString().toLowerCase().trim();
    var d = r[B2C_COL.DATE-1];
    if (!e || !d) return;
    var ts = new Date(d).getTime();
    if (!lastOrder[e] || lastOrder[e] < ts) lastOrder[e] = ts;
  });

  var triggered = 0;
  Object.keys(lastOrder).forEach(function(email){
    var days = (now.getTime() - lastOrder[email]) / (1000*60*60*24);
    if (days < 45 || days > 90) return;

    var profId = _klaviyoUpsert(email, '', '');
    if (profId) {
      _klaviyoTrackEvent(profId, KL_EVT.WIN_BACK, {
        days_since_last_order: Math.round(days)
      });
      triggered++;
    }
    Utilities.sleep(150);
  });

  _getHub().toast('✓ ' + triggered + ' win-back events', 'Flow 4', 5);
}


// ════════════════════════════════════════════════════════════════════
// DEBUG — inspect Shopify response
// ════════════════════════════════════════════════════════════════════

function debugAbandonedCheckouts() {
  var BASE = 'https://' + SHOPIFY_STORE + '/admin/api/' + SHOPIFY_API_VER + '/';
  var HDR  = { 'X-Shopify-Access-Token': SHOPIFY_TOKEN };

  Logger.log('=== ABANDONED CHECKOUT DEBUG ===');
  Logger.log('Shop: ' + SHOPIFY_STORE);

  var r1 = UrlFetchApp.fetch(BASE + 'checkouts.json?limit=5&status=open',
    { headers: HDR, muteHttpExceptions: true });
  Logger.log('[1] checkouts.json -> HTTP ' + r1.getResponseCode());
  Logger.log('    Response: ' + r1.getContentText().substring(0, 300));

  var since = new Date(); since.setDate(since.getDate()-30);
  var r3 = UrlFetchApp.fetch(BASE + 'orders/count.json?status=open&created_at_min=' + since.toISOString().split('T')[0],
    { headers: HDR, muteHttpExceptions: true });
  Logger.log('[2] orders/count (open, last 30d) -> HTTP ' + r3.getResponseCode());
  Logger.log('    ' + r3.getContentText());

  Logger.log('=== CHECK LOGS ABOVE ===');
  SpreadsheetApp.getActive().toast('Check Apps Script Logs (View → Logs)', 'Debug', 5);
}


// ════════════════════════════════════════════════════════════════════
// SETUP WIZARDS
// ════════════════════════════════════════════════════════════════════

/** First-time wizard: prompts all needed config in sequence. */
function menuFirstTimeSetupWizard() {
  var ui = SpreadsheetApp.getUi();

  // Step 1 — link to CRM Core
  var r1 = ui.prompt('🚀 Setup Wizard — Step 1 of 3',
    'Paste the CRM Core Spreadsheet ID:\n\n' +
    '(From CRM URL:\n  https://docs.google.com/spreadsheets/d/{THIS_ID}/edit )',
    ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  var crmId = r1.getResponseText().trim();
  if (!crmId) { ui.alert('❌ ID empty — canceled'); return; }
  try { SpreadsheetApp.openById(crmId); }
  catch(e) { ui.alert('❌ Cannot open that ID:\n' + e.message); return; }
  PropertiesService.getScriptProperties().setProperty('CRM_CORE_ID', crmId);

  // Step 2 — Klaviyo API key
  var r2 = ui.prompt('🚀 Setup Wizard — Step 2 of 3',
    'Paste Klaviyo Private API Key (starts with "pk_"):\n\n' +
    '(Leave empty to use baked-in default)',
    ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  var key = r2.getResponseText().trim();
  if (key) PropertiesService.getScriptProperties().setProperty('KLAVIYO_KEY', key);

  // Step 3 — daily trigger
  var r3 = ui.alert('🚀 Setup Wizard — Step 3 of 3',
    'Install daily 9 AM trigger?\n\n' +
    'Runs syncAbandonedCheckouts + syncKlaviyoListStats + syncKlaviyoEmailStatus + triggerFailedPaymentRecovery',
    ui.ButtonSet.YES_NO);
  if (r3 === ui.Button.YES) setupKlaviyoDailyTrigger();

  ui.alert('✅ Klaviyo Hub ready!\n\n' +
    'Menu → 📧 Klaviyo Hub → ⚡ Run All Flows (test)\n' +
    'Logs visible under View → Executions');
}

/** Manual: only link to CRM Core. */
function menuLinkToCRM() {
  var ui = SpreadsheetApp.getUi();
  var cur = PropertiesService.getScriptProperties().getProperty('CRM_CORE_ID') || '(not set)';
  var r = ui.prompt('🔗 Link to CRM Core',
    'Current CRM Core ID: ' + cur + '\n\nPaste new CRM Core Spreadsheet ID:',
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var id = r.getResponseText().trim();
  if (!id) return;
  try {
    SpreadsheetApp.openById(id);
    PropertiesService.getScriptProperties().setProperty('CRM_CORE_ID', id);
    ui.alert('✅ Linked to CRM Core');
  } catch(e) {
    ui.alert('❌ Cannot open: ' + e.message);
  }
}

/** Set Klaviyo private API key. */
function setupKlaviyo() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('🔑 Klaviyo API Key',
    'Paste Klaviyo Private API Key (starts with "pk_"):',
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var key = r.getResponseText().trim();
  if (!key) return;
  PropertiesService.getScriptProperties().setProperty('KLAVIYO_KEY', key);
  ui.alert('✅ Klaviyo key saved to Script Properties');
}

/** Install 9 AM daily trigger that runs all 4 flows + sync. */
function setupKlaviyoDailyTrigger() {
  // Remove old triggers for these functions
  ScriptApp.getProjectTriggers().forEach(function(t){
    var h = t.getHandlerFunction();
    if (h === '_klaviyoDailyRun') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('_klaviyoDailyRun').timeBased().atHour(9).everyDays(1).create();
  SpreadsheetApp.getUi().alert('✅ Daily trigger installed at 9:00 AM');
}

/** Handler fired by the daily trigger. */
function _klaviyoDailyRun() {
  // CUTOVER (v2.5): abandoned-cart FEED moved to the Fulfillment Hub (sole feeder, avoids double-feed).
  //   syncAbandonedCheckouts() intentionally NOT called from the daily run anymore; kept for manual use.
  // CUTOVER (v2.4): failed-payment FEED moved to the Fulfillment Hub (sole feeder, avoids double-feed).
  //   klFeedFailedPayments() intentionally NOT called from the daily run anymore; kept for manual use.
  try { syncKlaviyoListStats();   } catch(e){ Logger.log('LS: ' + e.message); }
  try { syncKlaviyoEmailStatus(); } catch(e){ Logger.log('ES: ' + e.message); }
}

/** One-click run of all 4 flows (manual test). */
function menuRunAllFlows() {
  var ss = _getHub();
  ss.toast('Running all 4 flows…', 'Please wait', 3);
  try { syncAbandonedCheckouts();       } catch(e){ Logger.log('Flow 1: ' + e.message); }
  try { klFeedFailedPayments(); } catch(e){ Logger.log('Flow 2: ' + e.message); }
  try { triggerAfterPurchaseFlow();     } catch(e){ Logger.log('Flow 3: ' + e.message); }
  try { triggerWinBackFlow();           } catch(e){ Logger.log('Flow 4: ' + e.message); }
  try { syncKlaviyoListStats();         } catch(e){ Logger.log('Lists: ' + e.message); }
  ss.toast('✓ All flows done (check logs)', 'Klaviyo', 5);
}

/** Connection status dialog. */
function menuConnectionStatus() {
  var ui = SpreadsheetApp.getUi();
  var p = PropertiesService.getScriptProperties();
  var crmId = p.getProperty('CRM_CORE_ID') || '❌ not set';
  var klKey = p.getProperty('KLAVIYO_KEY') ? '✅ set' : '❌ not set';

  var crmName = '—';
  try { crmName = _getCRMCore().getName(); } catch(e) { crmName = e.message; }

  var triggers = ScriptApp.getProjectTriggers().length;

  ui.alert('🔗 Klaviyo Hub — Connection Status',
    '─────────────────────────────\n' +
    'CRM Core link:  ' + (crmId === '❌ not set' ? crmId : '✅ ' + crmName) + '\n' +
    'Klaviyo API key: ' + klKey + '\n' +
    'Active triggers: ' + triggers + '\n' +
    '─────────────────────────────\n' +
    'Hub version: ' + HUB_VERSION,
    ui.ButtonSet.OK);
}


// ════════════════════════════════════════════════════════════════════
// MENU WRAPPERS (one-line wrappers for menu items)
// ════════════════════════════════════════════════════════════════════

function menuSyncAbandoned()       { syncAbandonedCheckouts(); }
function menuKlaviyoStatus()       { syncKlaviyoEmailStatus(); }
function menuSyncKlaviyo()         { syncKlaviyoListStats(); }
function menuFailedPayRecover()    { klFeedFailedPayments(); }
function menuSyncFailedPayments()  { awxSyncFailedPayments(); }
function menuTriggerAfterPurchase(){ triggerAfterPurchaseFlow(); }
function menuTriggerWinBack()      { triggerWinBackFlow(); }

/** PATCH v2: Simulate Airwallex failed payment webhook (manual test). */
function menuTestWebhook() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('🧪 Simulate Failed Payment Webhook',
    'Enter test email (will create real Klaviyo profile + event):',
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var email = r.getResponseText().trim();
  if (!email || email.indexOf('@') < 0) { ui.alert('❌ Invalid email'); return; }

  var fakePayload = {
    secret: 'gp_callback_2026',
    event:  'airwallex_payment_failed',
    data: {
      email:        email,
      amount:       89.95,
      payment_id:   'TEST_PI_' + Date.now(),
      order_ref:    '#GPN_TEST_' + Date.now(),
      fail_code:    'card_declined',
      failed_at:    new Date().toISOString()
    }
  };

  var fakeEvent = { postData: { contents: JSON.stringify(fakePayload) } };
  var resp = doPost(fakeEvent);
  ui.alert('Webhook Test Result',
    'Response: ' + resp.getContent() + '\n\n' +
    'Check sheet 💳 Failed Payments for new row.\n' +
    'Check Klaviyo → Profiles → ' + email + ' for "Payment Failed" event.',
    ui.ButtonSet.OK);
}

/** PATCH v2: About dialog. */
function menuAboutHub() {
  SpreadsheetApp.getUi().alert(
    '📧 ' + HUB_NAME + ' — ' + HUB_VERSION,
    '─────────────────────────────\n' +
    'Reconvert Email System\n' +
    '─────────────────────────────\n\n' +
    'Sequences (configured in Klaviyo Dashboard):\n' +
    '  • Abandoned Checkout — 3 emails over 72h\n' +
    '    Trigger event: ' + KL_EVT.ABANDONED + '\n' +
    '    Email 3 promo:  ' + KL_PROMO.ABANDONED_RECOVERY + ' (10%)\n\n' +
    '  • Failed Payment Recovery — 3 emails over 48h\n' +
    '    Trigger event: ' + KL_EVT.PAYMENT_FAILED + '\n' +
    '    Email 3 promo:  ' + KL_PROMO.PAYMENT_FAILED_REC + ' (5%)\n\n' +
    'Lists:\n' +
    '  Email Main:        ' + KL_LIST.EMAIL_MAIN + '\n' +
    '  Failed Pay Recov:  ' + KL_LIST.FAILED_PAY_REC + '\n' +
    '─────────────────────────────',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}


// ════════════════════════════════════════════════════════════════════
// onOpen — builds the menu
// ════════════════════════════════════════════════════════════════════

function klBuildMenu() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('📧 Klaviyo Hub')
      // Setup block
      .addItem('🚀 First-Time Setup Wizard',          'menuFirstTimeSetupWizard')
      .addSeparator()
      .addItem('🔑 Set Klaviyo API Key',              'setupKlaviyo')
      .addItem('⏱ Install Daily Trigger (9 AM)',     'setupKlaviyoDailyTrigger')
      .addItem('💳 Install Auto-Recovery (daily 9 AM)', 'klInstallRecoveryTrigger')
      .addItem('🔍 Connection Status',                'menuConnectionStatus')
      .addSeparator()

      // Flows
      .addItem('⚡ Run All 4 Flows (test)',           'menuRunAllFlows')
      .addSeparator()
      .addItem('🛒 Flow 1 — Sync Abandoned Checkouts','menuSyncAbandoned')
      .addItem('💳 Flow 2 — Failed Payment Recovery', 'menuFailedPayRecover')
      .addItem('📦 Flow 3 — After-Purchase Sequence', 'menuTriggerAfterPurchase')
      .addItem('🔁 Flow 4 — Win-Back (45-90d)',       'menuTriggerWinBack')
      .addSeparator()

      // Data refresh
      .addItem('📧 Refresh Klaviyo Overview',         'menuSyncKlaviyo')
      .addItem('📊 Refresh Failed Pay Stats',         'menuSyncFailedPayments')
      .addItem('🔄 Sync Email Opens/Clicks',          'menuKlaviyoStatus')
      .addSeparator()

      // Debug
      .addItem('🐛 Debug Shopify API',                'debugAbandonedCheckouts')
      .addItem('ℹ️ About — ' + HUB_VERSION,           'menuAboutHub')
      .addToUi();
  } catch(e) {
    Logger.log('onOpen error: ' + e.message);
  }
}

// ════════════════════════════════════════════════════════════════════════
//  klFeedFailedPayments() — RECOVERY FEED (replaces webhook path)
//  Reads Airwallex tracker '💳 Failed Payments' (awxSyncFailedPayments):
//    header row 4; data row 5+; cols 1 Created,2 Age,3 Email,4 Name,5 Phone,6 Amount,7 Products,8 Status
//  For Status=='RECOVERABLE' and not already an ordered customer → upsert +
//  subscribe to YcpNV9 (live flow Si5rH4) + push 'Payment Failed' event.
//  Klaviyo list re-add is idempotent → safe to run daily.
// ════════════════════════════════════════════════════════════════════════
function klFeedFailedPayments() {
  var ss = _getSSActive();
  var ws = ss.getSheetByName(KLSH.FAILED_PAY);
  if (!ws || ws.getLastRow() < 5) { ss.toast('No Failed Payments rows — run awxSyncFailedPayments first.', '💳', 6); return; }
  var n = ws.getLastRow() - 4;
  var data = ws.getRange(5, 1, n, 8).getValues();
  var ordered = _buildOrderedSet();

  // v2.3 DEDUP LEDGER — one recovery per email per cooldown window. Fixes the two
  // observed bugs, which share one root cause (no "already fed" memory):
  //   (a) same customer, N failed attempts in a day → N events (seen: 4x) → collapse to 1.
  //   (b) each RECOVERABLE row (age 3h–7d) re-fed on EVERY poll → daily duplicates.
  // awxSyncFailedPayments rebuilds the sheet each run (_dplResetSheet), so a sheet
  // column can't persist state — the ledger lives in Script Properties instead.
  var _props = PropertiesService.getScriptProperties();
  var _LEDGER_KEY = 'KL_FED_EMAILS';
  var _COOLDOWN_MS = 7 * 86400000;    // 7 days: don't re-poke the same email
  var _PRUNE_MS    = 14 * 86400000;   // drop ledger entries older than 14 days
  var _nowMs = Date.now();
  var _ledger = {};
  try { _ledger = JSON.parse(_props.getProperty(_LEDGER_KEY) || '{}'); } catch (e) { _ledger = {}; }
  var _fedThisRun = {};

  var fed = 0, fedRisk = 0, sNotRec = 0, sNoEmail = 0, sOrdered = 0, sUpsert = 0, sDupe = 0;
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    if (String(r[7]).trim() !== 'RECOVERABLE') { sNotRec++; continue; }
    var email = String(r[2] || '').trim().toLowerCase();
    if (!email || email.indexOf('@') < 0) { sNoEmail++; continue; }
    if (ordered.has(email)) { sOrdered++; continue; }                    // already converted — never re-poke
    // v2.3: skip if already fed THIS run, or fed within the cooldown window
    if (_fedThisRun[email]) { sDupe++; continue; }
    var _last = _ledger[email] ? Date.parse(_ledger[email]) : 0;
    if (_last && (_nowMs - _last) < _COOLDOWN_MS) { sDupe++; continue; }
    var profId = _klaviyoUpsert(email, String(r[3] || ''), String(r[4] || ''));
    if (!profId) { sUpsert++; continue; }
    _klaviyoSubscribeToList(profId, KL_LIST.FAILED_PAY_REC, email);       // triggers live flow Si5rH4 (Added to List)
    Utilities.sleep(80);
    var amt   = parseFloat(r[5]) || 0;
    var first = (String(r[3] || '').trim().split(/\s+/)[0]) || 'there';
    _klaviyoTrackEvent(profId, KL_EVT.PAYMENT_FAILED, {
      first_name      : first,
      amount          : amt,
      amount_str      : '$' + amt.toFixed(2),
      currency        : 'USD',
      products        : String(r[6] || ''),
      failed_at       : String(r[0] || ''),
      promo_code      : KL_PROMO.PAYMENT_FAILED_REC, promo_pct: 5,
      pay_with_paypal : true,                          // ROOT CAUSE = Airwallex card decline → push the method that works
      paypal_url      : KL_URL.RETRY_PAYPAL,
      retry_url       : KL_URL.RETRY_CART,             // UTM-tagged → recovered revenue is attributable
      support_email   : 'orders@gerberaprints.com'
    });
    _ledger[email] = new Date().toISOString(); _fedThisRun[email] = true;   // v2.3: record in dedup ledger
    fed++; fedRisk += amt; Utilities.sleep(150);
  }
  // v2.3: prune stale ledger entries and persist
  Object.keys(_ledger).forEach(function (k) { if (_nowMs - Date.parse(_ledger[k]) > _PRUNE_MS) delete _ledger[k]; });
  try { _props.setProperty(_LEDGER_KEY, JSON.stringify(_ledger)); } catch (e) { Logger.log('[klFeedFailedPayments] ledger save failed: ' + e.message); }

  var msg = '✅ Recovery fed: ' + fed + ' ($' + fedRisk.toFixed(0) + ') → ' + KL_LIST.FAILED_PAY_REC +
            '  ·  skip: ' + sDupe + ' dupe / ' + sOrdered + ' ordered / ' + sNoEmail + ' no-email / ' + sNotRec + ' not-recoverable / ' + sUpsert + ' upsert-fail.';
  ss.toast(msg, '💳', 14);
  Logger.log('[klFeedFailedPayments] ' + msg);
}


// ════════════════════════════════════════════════════════════════════════
//  AUTO-RECOVERY (every 4h) — refresh Airwallex failed-payment tracker, then feed
//  RECOVERABLE profiles to Klaviyo list YcpNV9 (live flow Si5rH4). Idempotent.
//  v2.3: cadence raised daily → 4h to cut recovery latency (was up to ~24h) now
//  that the dedup ledger guarantees each email is fed at most once per 7 days.
// ════════════════════════════════════════════════════════════════════════
function klRecoveryDaily() {
  try { awxSyncFailedPayments(30); } catch (e) { Logger.log('[klRecoveryDaily] awxSync: ' + e.message); }
  // CUTOVER (v2.4): FEED moved to the Fulfillment Hub (sole feeder). awxSyncFailedPayments above still
  // runs (data sync the Hub reads); klFeedFailedPayments() intentionally NOT called here anymore.
}

function klInstallRecoveryTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'klRecoveryDaily') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('klRecoveryDaily').timeBased().everyHours(4).create();   // v2.3: 4h (was everyDays(1).atHour(9))
  _getSSActive().toast('✅ Auto-Recovery installed: every 4h (refresh tracker → feed Klaviyo). Re-run to apply.', '💳', 8);
}