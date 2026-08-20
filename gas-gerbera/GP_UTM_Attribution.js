// ╔══════════════════════════════════════════════════════════════════════╗
// ║  GP_UTM_Attribution.gs  —  Shopify order-source TRUTH (UTM-based)       ║
// ║  ------------------------------------------------------------------    ║
// ║  WHY: FB/Google each CLAIM the same orders inside their attribution    ║
// ║  windows, so summing platform "purchases" over-counts. Shopify is the  ║
// ║  single source of truth: every paid order carries the UTM of the visit ║
// ║  that produced it (landing_site). This module reads that, groups REAL   ║
// ║  orders by channel + campaign, and RECONCILES it against what FB /      ║
// ║  Google claim — so you can see the over-count factor per channel.       ║
// ║                                                                        ║
// ║  Standalone: paste as a NEW file in the SAME Apps Script project as     ║
// ║  Gerberaprints CRM.gs. It reuses CRM globals (SHOPIFY_STORE/TOKEN/      ║
// ║  API_VER, DPL, _getSSActive, _dplResetSheet, _dplParseDisplayDate,      ║
// ║  _dplGetSetting, DPL_FB_SHEET, DPL_GADS_SHEET). Do NOT redeclare those.  ║
// ║                                                                        ║
// ║  Read-only on Shopify. Writes one sheet: '🧭 UTM Attribution'.          ║
// ╚══════════════════════════════════════════════════════════════════════╝

var UTM_SHEET = '🧭 UTM Attribution';

// GER markers must match gp_fb_graph.py FB_CAMPAIGN_MARKERS so the audit flags
// FB-channel orders whose utm_campaign drifts from the naming convention.
var UTM_FB_MARKERS = ['ger', 'gerberaprints'];

// Channel display order (drives table sort + reconciliation pairing).
var UTM_CHANNEL_ORDER = ['Facebook', 'Google', 'Pinterest', 'TikTok', 'Email', 'Organic', 'Other', 'Direct/Unknown'];

// ── Source / channel normalization ──────────────────────────────────────
function _utmInferSource(referring, sourceName) {
  var r = (referring || '').toLowerCase();
  if (/facebook|fb\.|instagram|\big\b/.test(r)) return 'facebook';
  if (/google|youtube/.test(r))                 return 'google';
  if (/pinterest/.test(r))                       return 'pinterest';
  if (/tiktok/.test(r))                          return 'tiktok';
  if (/bing|duckduckgo|yahoo/.test(r))           return 'organic';
  return '';   // source_name (web/pos/app) is a SALES channel, not a marketing source → leave blank
}

function _utmChannel(src, med, sourceName) {
  var s = (src || '').toLowerCase(), m = (med || '').toLowerCase(), sn = (sourceName || '').toLowerCase();
  if (/facebook|fbads|^fb$|meta|instagram|^ig$/.test(s)) return 'Facebook';
  if (/google|youtube|gdn|pmax|googleads|google-ads|gads/.test(s)) return 'Google';
  if (/pinterest|^pin$/.test(s)) return 'Pinterest';
  if (/tiktok/.test(s)) return 'TikTok';
  if (/klaviyo|email|newsletter/.test(s) || m === 'email') return 'Email';
  if (/(^|\W)organic|bing|duckduckgo|yahoo/.test(s) || m === 'organic') return 'Organic';
  if (!s && !m) return 'Direct/Unknown';
  return 'Other';
}

/** Parse one order's UTM from landing_site (+ note_attributes + referrer fallback). */
function _utmParse(landing, referring, sourceName, noteAttrs) {
  var qs = '';
  var qi = (landing || '').indexOf('?');
  if (qi >= 0) qs = landing.slice(qi + 1);
  function q(name) {
    var m = qs.match(new RegExp('(?:^|&)' + name + '=([^&]*)', 'i'));
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  }
  var src = q('utm_source'), med = q('utm_medium'), camp = q('utm_campaign'),
      cont = q('utm_content'), term = q('utm_term');
  // note_attributes fallback (some themes push UTM there at checkout)
  (noteAttrs || []).forEach(function(a) {
    var n = (a.name || '').toLowerCase();
    if (!src  && n === 'utm_source')   src  = a.value || '';
    if (!camp && n === 'utm_campaign') camp = a.value || '';
    if (!med  && n === 'utm_medium')   med  = a.value || '';
    if (!cont && n === 'utm_content')  cont = a.value || '';
  });
  var hasUtm = !!(src || camp);
  var rawSrc = src || _utmInferSource(referring, sourceName);
  return {
    source:   (src || rawSrc || '').toLowerCase(),
    medium:   med.toLowerCase(),
    campaign: (camp || '(not set)'),
    content:  cont,
    channel:  _utmChannel(rawSrc, med, sourceName),
    hasUtm:   hasUtm
  };
}

// ── Shopify fetch (paginated via Link header; time-guarded) ──────────────
function _utmFetchOrders(days, log) {
  var base = 'https://' + SHOPIFY_STORE + '/admin/api/' + SHOPIFY_API_VER;
  var since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - days);
  var url = base + '/orders.json?status=any&limit=250&order=created_at+asc' +
            '&created_at_min=' + encodeURIComponent(since.toISOString()) +
            '&fields=id,name,created_at,total_price,subtotal_price,financial_status,' +
            'landing_site,referring_site,source_name,note_attributes,cancelled_at';
  var out = [], guard = 0, deadline = Date.now() + 280000;   // ~4.7 min (GAS 6-min cap)
  while (url && guard < 50 && Date.now() < deadline) {
    var resp = UrlFetchApp.fetch(url, { headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN }, muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) {
      if (log) log('[utm] HTTP ' + resp.getResponseCode() + ' · ' + resp.getContentText().slice(0, 180));
      break;
    }
    var orders = JSON.parse(resp.getContentText()).orders || [];
    orders.forEach(function(o) {
      var fin = (o.financial_status || '').toLowerCase();
      if (o.cancelled_at) return;                        // skip cancelled
      if (fin === 'voided' || fin === 'refunded') return; // skip clearly non-revenue
      var rev = parseFloat(o.total_price) || 0;
      var info = _utmParse(o.landing_site || '', o.referring_site || '', o.source_name || '', o.note_attributes || []);
      out.push({
        name: (o.name || '').trim(),
        date: o.created_at ? new Date(o.created_at) : null,
        rev: Math.round(rev * 100) / 100,
        source: info.source, medium: info.medium, campaign: info.campaign,
        content: info.content, channel: info.channel, hasUtm: info.hasUtm
      });
    });
    // follow rel="next" (cursor pagination) — use the URL Shopify hands back verbatim
    var link = resp.getHeaders()['Link'] || resp.getHeaders()['link'] || '';
    var next = '';
    link.split(',').forEach(function(part) {
      var m = part.match(/<([^>]+)>;\s*rel="next"/);
      if (m) next = m[1];
    });
    url = next; guard++;
    if (next) Utilities.sleep(350);
  }
  if (log) log('[utm] fetched ' + out.length + ' orders over ' + days + 'd (pages=' + guard + ')');
  return out;
}

// ── Platform-claimed pulls (for reconciliation) ─────────────────────────
function _utmCutoffStr(days) {
  var c = new Date(); c.setHours(0, 0, 0, 0); c.setDate(c.getDate() - days);
  return Utilities.formatDate(c, DPL.VN_TZ, 'yyyy-MM-dd');
}

function _utmFbClaimed(days) {
  var ss = _getSSActive(), ws = ss.getSheetByName(DPL_FB_SHEET);
  var res = { orders: 0, rev: 0, spend: 0 };
  if (!ws || ws.getLastRow() < 5) return res;
  var cutoff = _utmCutoffStr(days), n = ws.getLastRow() - 4;
  var dd = ws.getRange(5, 1, n, 1).getDisplayValues();
  // FB Ads Daily v5 layout (USD-normalized already): C=Spend(2) · M=Purchases(12) · N=Revenue(13).
  var vv = ws.getRange(5, 1, n, 14).getValues();   // [2]spend [12]purchases [13]rev (USD)
  for (var i = 0; i < n; i++) {
    var k = _dplParseDisplayDate(dd[i][0]); if (!k || k < cutoff) continue;
    res.spend  += parseFloat(vv[i][2])  || 0;
    res.orders += parseFloat(vv[i][12]) || 0;
    res.rev    += parseFloat(vv[i][13]) || 0;
  }
  return res;
}

function _utmGaClaimed(days) {
  var ss = _getSSActive(), ws = ss.getSheetByName(DPL_GADS_SHEET);
  var res = { orders: 0, rev: 0, spend: 0 };
  if (!ws || ws.getLastRow() < 5) return res;
  var rate = _dplGetSetting('USD/VND exchange rate', 26000) || 26000;
  var cutoff = _utmCutoffStr(days), n = ws.getLastRow() - 4;
  var dd = ws.getRange(5, 1, n, 1).getDisplayValues();
  // Google Ads Daily layout: D=Cost(3) · I=Conv(8) · J=ConvValue(9) · L=Currency(11).
  var vv = ws.getRange(5, 1, n, 12).getValues();   // [3]cost [8]conv [9]val [11]currency
  for (var i = 0; i < n; i++) {
    var k = _dplParseDisplayDate(dd[i][0]); if (!k || k < cutoff) continue;
    var div = ((vv[i][11] || '').toString().toUpperCase() === 'VND') ? rate : 1;
    res.spend  += (parseFloat(vv[i][3]) || 0) / div;
    res.orders += parseFloat(vv[i][8]) || 0;
    res.rev    += (parseFloat(vv[i][9]) || 0) / div;
  }
  return res;
}

// ── Main builder ─────────────────────────────────────────────────────────
function buildUtmAttribution(days) {
  days = days || 7;
  var ss = _getSSActive();
  var ws = ss.getSheetByName(UTM_SHEET) || ss.insertSheet(UTM_SHEET);
  _dplResetSheet(ws);
  ss.toast('Building UTM Attribution (' + days + 'd)…', '🧭', 30);

  var orders = _utmFetchOrders(days, function(m) { Logger.log(m); });

  // aggregate by channel + by campaign
  var byCh = {}, byCamp = {}, totOrders = 0, totRev = 0, noUtm = 0, srcNoCamp = 0, inferred = 0;
  orders.forEach(function(o) {
    totOrders++; totRev += o.rev;
    if (!o.hasUtm) noUtm++;
    // no real UTM but a channel was guessed from the referrer (l.facebook.com / google) —
    // these sit inside FB/Google but are NOT UTM-tagged, so flag them honestly.
    if (!o.hasUtm && o.channel !== 'Direct/Unknown') inferred++;
    if (o.hasUtm && o.campaign === '(not set)') srcNoCamp++;
    var c = byCh[o.channel] || (byCh[o.channel] = { orders: 0, rev: 0 });
    c.orders++; c.rev += o.rev;
    var key = o.channel + ' ▸ ' + o.campaign;
    var k = byCamp[key] || (byCamp[key] = { channel: o.channel, campaign: o.campaign, orders: 0, rev: 0 });
    k.orders++; k.rev += o.rev;
  });

  var fbReal = byCh['Facebook'] || { orders: 0, rev: 0 };
  var gaReal = byCh['Google']   || { orders: 0, rev: 0 };
  var fbClaim = _utmFbClaimed(days);
  var gaClaim = _utmGaClaimed(days);

  // ── formats / style ──
  var NCOLS = 7, USD = '"$"#,##0.00', PCT = '0.0%', NUM = '#,##0', X = '0.00"x"';
  var stamp = Utilities.formatDate(new Date(), DPL.VN_TZ, 'dd/MM/yyyy HH:mm');
  ws.getRange(1, 1, 1, NCOLS).merge()
    .setValue('🧭  GerberaPrints — UTM Attribution  (Shopify order-source = TRUTH · last ' + days + ' days)')
    .setBackground('#0F172A').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(14)
    .setFontWeight('bold').setHorizontalAlignment('center');
  ws.setRowHeight(1, 34);
  ws.getRange(2, 1, 1, NCOLS).merge()
    .setValue('Updated: ' + stamp + ' ICT  ·  Source = order landing_site UTM (session that produced the sale). ' +
              'Real orders/revenue here do NOT double-count across platforms. ' +
              'Reconciliation shows how each ad platform OVER- or UNDER-claims vs this truth.')
    .setBackground('#F1F5F9').setFontColor('#475569').setFontFamily(DPL.TNR).setFontSize(9).setFontStyle('italic');
  ws.setRowHeight(2, 30); ws.setRowHeight(3, 6);

  var row = 4;

  // ── Section A: Channel Truth ──
  row = _utmSection(ws, row, '✅ Channel Truth (real orders by source)',
    ['Channel', 'Real Orders', '% Orders', 'Real Revenue', '% Revenue', 'AOV', ''],
    UTM_CHANNEL_ORDER.filter(function(ch) { return byCh[ch]; }).map(function(ch) {
      var c = byCh[ch];
      var aov = c.orders > 0 ? c.rev / c.orders : 0;
      var color = (ch === 'Direct/Unknown') ? '#DC2626' : (ch === 'Facebook' ? '#1D4ED8' : (ch === 'Google' ? '#0F766E' : '#334155'));
      return { cells: [ch, c.orders, totOrders ? c.orders / totOrders : 0, c.rev,
                        totRev ? c.rev / totRev : 0, aov, ''], color: color };
    }), { USD: USD, PCT: PCT, NUM: NUM, X: X },
    [{ c: 2, f: NUM }, { c: 3, f: PCT }, { c: 4, f: USD }, { c: 5, f: PCT }, { c: 6, f: USD }]);
  // total row
  ws.getRange(row, 1).setValue('TOTAL').setFontFamily(DPL.TNR).setFontWeight('bold');
  ws.getRange(row, 2).setValue(totOrders).setNumberFormat(NUM).setFontFamily(DPL.TNR).setFontWeight('bold');
  ws.getRange(row, 4).setValue(totRev).setNumberFormat(USD).setFontFamily(DPL.TNR).setFontWeight('bold');
  ws.getRange(row, 6).setValue(totOrders ? totRev / totOrders : 0).setNumberFormat(USD).setFontFamily(DPL.TNR).setFontWeight('bold');
  ws.getRange(row, 1, 1, NCOLS).setBackground('#F8FAFC');
  row += 2;

  // ── Section B: Reconciliation (platform-claimed vs truth) ──
  function recon(plat, claim, real) {
    var ocx = real.orders > 0 ? claim.orders / real.orders : (claim.orders > 0 ? 99 : 0);
    var rd = _utmClaimRead(ocx, real.orders, claim.orders);
    return { cells: [plat, Math.round(claim.orders), real.orders, ocx, claim.rev, real.rev, rd[0]], color: rd[1] };
  }
  row = _utmSection(ws, row, '⚖️ Reconciliation — platform CLAIMS vs Shopify TRUTH',
    ['Platform', 'Claimed Orders', 'Real Orders (UTM)', 'Claim ÷ Real', 'Claimed Rev', 'Real Rev (UTM)', 'Read'],
    [recon('Facebook', fbClaim, fbReal), recon('Google', gaClaim, gaReal)],
    { USD: USD, PCT: PCT, NUM: NUM, X: X },
    [{ c: 2, f: NUM }, { c: 3, f: NUM }, { c: 4, f: X }, { c: 5, f: USD }, { c: 6, f: USD }]);
  row += 1;

  // ── Section C: By Campaign (top 30 by revenue) ──
  var campRows = Object.keys(byCamp).map(function(k) { return byCamp[k]; })
    .sort(function(a, b) { return b.rev - a.rev; }).slice(0, 30);
  row = _utmSection(ws, row, '🎯 By Campaign (real orders — top 30 by revenue)',
    ['Campaign', 'Channel', 'Real Orders', 'Real Revenue', 'AOV', '% of Rev', ''],
    campRows.map(function(c) {
      var aov = c.orders > 0 ? c.rev / c.orders : 0;
      var note = (c.campaign === '(not set)') ? '⚠ no utm_campaign' :
                 (c.channel === 'Facebook' && _utmCampIsId(c.campaign)) ? '⚠ FB UTM = campaign ID → switch to {{campaign.name}}' :
                 (c.channel === 'Facebook' && !_utmCampHasMarker(c.campaign)) ? '⚠ FB name lacks GER marker' : '';
      return { cells: [c.campaign, c.channel, c.orders, c.rev, aov, totRev ? c.rev / totRev : 0, note],
               color: note ? '#CA8A04' : '#334155' };
    }),
    { USD: USD, PCT: PCT, NUM: NUM, X: X },
    [{ c: 3, f: NUM }, { c: 4, f: USD }, { c: 5, f: USD }, { c: 6, f: PCT }]);
  row += 1;

  // ── Section D: Audit / Blind spots ──
  var blindPct = totOrders ? (noUtm / totOrders) : 0;
  ws.getRange(row, 1, 1, NCOLS).merge().setValue('🔎 Audit & Blind Spots')
    .setBackground('#1E293B').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(12).setFontWeight('bold');
  row++;
  var trulyDirect = (byCh['Direct/Unknown'] || { orders: 0 }).orders;
  function claimRead(label, claim, real) {
    if (!real.orders) return '• ' + label + ': n/a (no UTM-tagged ' + label + ' orders this window).';
    var x = claim.orders / real.orders;
    var verb = x >= 1.15 ? 'OVER-claims ' + x.toFixed(2) + '× (inflated)' :
               x < 0.85  ? 'UNDER-reports (' + x.toFixed(2) + '× — channel is STRONGER than it shows; do NOT cut on platform numbers)' :
               'is in line (' + x.toFixed(2) + '×)';
    return '• ' + label + ' ' + verb + ': claimed ' + Math.round(claim.orders) + ' vs real ' + real.orders + ' orders.';
  }
  var audit = [
    '• Orders WITHOUT real UTM: ' + noUtm + ' / ' + totOrders + ' (' + (blindPct * 100).toFixed(1) +
      '%). Of these, ' + trulyDirect + ' are truly Direct/Unknown and ' + inferred +
      ' were INFERRED from the referrer (l.facebook.com / google) and folded into FB/Google — so those channel counts mix real-UTM + inferred. The more inferred, the softer the per-channel split.',
    '• Orders with a source but NO utm_campaign ("(not set)"): ' + srcNoCamp +
      '  → tagging gap; add utm_campaign to those ads so they roll up per-campaign.',
    claimRead('Facebook', fbClaim, fbReal) + ' Use MER + this real number to scale, not FB-claimed.',
    claimRead('Google', gaClaim, gaReal),
    '• Note: every FB campaign shows as a numeric ID (e.g. 1202398…) → utm_campaign is passing {{campaign.id}}. Switch the ad URL to utm_campaign={{campaign.name}} to read real names here.',
    '• landing_site captures the SESSION that produced the sale (entry point). Multi-session journeys (saw FB ad → returned direct → bought) attribute to the converting session, so direct may absorb some assisted FB/Google value. Treat per-channel as last-session, not full multi-touch.',
    '• Next-level truth: add a post-purchase survey ("How did you hear about us?") to separate FB vs Google vs word-of-mouth for the direct/unknown bucket.'
  ];
  audit.forEach(function(line) {
    ws.getRange(row, 1, 1, NCOLS).merge().setValue(line)
      .setFontFamily(DPL.TNR).setFontSize(10).setFontColor('#334155').setWrap(true).setVerticalAlignment('middle');
    ws.setRowHeight(row, 30);
    row++;
  });

  // widths
  ws.setColumnWidth(1, 240);
  [110, 96, 130, 96, 84, 220].forEach(function(w, i) { ws.setColumnWidth(i + 2, w); });
  try { ws.setFrozenRows(3); } catch (e) {}
  ss.toast('✅ UTM Attribution: ' + totOrders + ' orders · ' + (blindPct * 100).toFixed(0) + '% blind · FB ' +
           (fbReal.orders ? (fbClaim.orders / fbReal.orders).toFixed(2) + '× over' : 'n/a'), '🧭', 8);
}

function _utmCampHasMarker(camp) {
  var c = (camp || '').toLowerCase();
  for (var i = 0; i < UTM_FB_MARKERS.length; i++) if (c.indexOf(UTM_FB_MARKERS[i]) >= 0) return true;
  return false;
}

/** True if utm_campaign looks like a Meta campaign ID (all digits, ≥6 long) — i.e. {{campaign.id}} passed. */
function _utmCampIsId(camp) {
  return /^\d{6,}$/.test((camp || '').trim());
}

/** Shared read of claim÷real ratio → [note, hexColor]. Adds an UNDER-claim tier (purple). */
function _utmClaimRead(ocx, realOrders, claimOrders) {
  if (realOrders === 0 && claimOrders > 0) return ['Platform claims sales UTM cannot see — check UTM tagging', '#DC2626'];
  if (ocx >= 1.5)  return ['Heavy OVER-claim — trust UTM, not platform', '#DC2626'];
  if (ocx >= 1.15) return ['Moderate over-claim (windows / overlap)', '#CA8A04'];
  if (ocx > 0 && ocx < 0.85) return ['UNDER-report — channel STRONGER than platform shows; do NOT cut', '#7C3AED'];
  return ['In line with truth', '#16A34A'];
}

/** Section writer: title bar + header row + data rows with per-column formats + verdict color on last col. */
function _utmSection(ws, startRow, title, headers, rows, fmt, colFmts) {
  var NCOLS = headers.length;
  ws.getRange(startRow, 1, 1, NCOLS).merge().setValue(title)
    .setBackground('#1E293B').setFontColor('#C9A84C').setFontFamily(DPL.TNR).setFontSize(12).setFontWeight('bold');
  var hRow = startRow + 1;
  ws.getRange(hRow, 1, 1, NCOLS).setValues([headers])
    .setBackground('#334155').setFontColor('#FFFFFF').setFontFamily(DPL.TNR).setFontSize(10)
    .setFontWeight('bold').setHorizontalAlignment('center');
  var r0 = hRow + 1;
  if (!rows.length) {
    ws.getRange(r0, 1).setValue('— no data in window —').setFontFamily(DPL.TNR).setFontStyle('italic').setFontColor('#94A3B8');
    return r0 + 1;
  }
  ws.getRange(r0, 1, rows.length, NCOLS).setValues(rows.map(function(r) { return r.cells; }))
    .setFontFamily(DPL.TNR).setFontSize(10);
  (colFmts || []).forEach(function(cf) { ws.getRange(r0, cf.c, rows.length, 1).setNumberFormat(cf.f); });
  // last column = note/read; color it per row
  ws.getRange(r0, NCOLS, rows.length, 1).setFontSize(9).setFontColor('#475569').setWrap(true);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].color) ws.getRange(r0 + i, 1).setFontColor(rows[i].color).setFontWeight('bold');
  }
  return r0 + rows.length;
}

// ── Menu wrappers ─────────────────────────────────────────────────────────
function utmRebuild7()  { buildUtmAttribution(7);  }
function utmRebuild14() { buildUtmAttribution(14); }
function utmRebuild30() { buildUtmAttribution(30); }