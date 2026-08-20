// ════════════════════════════════════════════════════════════════════════
//  GP_KpiLikert.gs  —  v2.8 · CANONICAL Likert palette + KPI scoring registry
//  ------------------------------------------------------------------------
//  v2.8: HARDENED - unknown KPI key logs + skips (grey / no CF) instead of throwing, so a CRM<->module
//        version mismatch can never crash a rebuild again (root cause of 'unknown key cpm' error).
//  v2.7: + ncac key (new-customer acquisition cost, lower=better).
//  v2.6: CF fix - higher-better (ROAS/CTR) value 0 = LOSS -> RED (was grey 'no-data'; spending with 0
//        return IS a loss). Cost metrics (CPM/CPC) 0 still grey = no spend. Blank rows stay uncoloured.
//  v2.5: CPM/CPC RE-CALIBRATED to niche reality (golf-US-narrow-NSFW): broad-apparel benchmark was a
//        blind spot ($30-40 CPM is NORMAL for this niche, not 'average/poor'). CTR unchanged (a GP strength).
//  v2.1: mer band raised to [2.5,3,3.5,4] (>=ROAS; MER counts Email/SMS).
//  v2.0 SYNC: rebuilt to match the DEPLOYED _kpiLikert5 recovered from the
//  live CRM/Hub (saturated 5-hue palette + exact signature). v1.0 used a
//  muted palette reconstructed from v27.78 helpers — SUPERSEDED.
//
//  Grade model (deployed convention): band 0 = poor (worst) .. 4 = excellent.
//  NaN / unparseable -> poor (red).  thresholds = 4 ascending cut points
//  [t0,t1,t2,t3] -> 5 bands [<t0 | t0-t1 | t1-t2 | t2-t3 | >=t3].
//  invert=true when LOWER is better (unsub %, spam %, CPA, cost).
//
//  Font rule is baked into the palette: white fg on red/orange/dark-green,
//  dark bold fg on yellow/light-green (readable on every bg — no forced white).
// ════════════════════════════════════════════════════════════════════════

// == Canonical 5-tier Likert palette (poor -> excellent) — DO NOT edit hues
//    without a brand-wide decision. For PERFORMANCE KPIs only (margin %, ROAS,
//    MER, coverage ...). Categorical status (delivered/refund/transit) keeps
//    its own SEMANTIC colours.
var _LIKERT5 = [
  { key: 'poor',      bg: '#DC2626', fg: '#FFFFFF' },   // red        - te (poor)
  { key: 'average',   bg: '#F97316', fg: '#FFFFFF' },   // orange     - trung binh
  { key: 'fair',      bg: '#FACC15', fg: '#713F12' },   // yellow     - kha (dark fg)
  { key: 'good',      bg: '#4ADE80', fg: '#14532D' },   // green      - tot  (dark fg)
  { key: 'excellent', bg: '#15803D', fg: '#FFFFFF' }    // dark green - xuat sac
];

// == DEPLOYED contract — keep signature identical so existing call sites
//    _kpiLikert5(out[i][6], [2,2.5,3,3.5]) stay drop-in compatible.
function _kpiLikert5(value, thresholds, invert) {
  var v = parseFloat(value); if (isNaN(v)) return _LIKERT5[0];
  var t = thresholds || [0, 0, 0, 0];
  var band = (v < t[0]) ? 0 : (v < t[1]) ? 1 : (v < t[2]) ? 2 : (v < t[3]) ? 3 : 4;
  if (invert) band = 4 - band;
  return _LIKERT5[band];
}

// == KPI threshold registry — one lookup table so no builder hard-codes bands.
//    t = [t0,t1,t2,t3];  invert=true when lower is better.
var LIKERT_KPI = {
  // ---- Financial / P&L ---------------------------------------------------
  op_pct:          { t: [0.10, 0.15, 0.20, 0.25],       invert: false }, // <10 / 10-15 / 15-20 / 20-25 / >=25 %  (FoxEra-locked)
  roas:            { t: [2, 2.5, 3, 3.5],               invert: false }, // <2 / 2-2.5 / 2.5-3 / 3-3.5 / >=3.5     (FoxEra-locked · FB·Google·Channel·Campaign)
  mer:             { t: [2.5, 3.0, 3.5, 4.0],           invert: false }, // v2.1 RAISED >=ROAS+0.5 (MER counts Email/SMS/organic -> must clear a higher bar than paid ROAS)
  margin_pct:      { t: [0.40, 0.50, 0.60, 0.70],       invert: false }, // Fulfillment Hub Master Orders margin: <40 / 40-50 / 50-60 / 60-70 / >=70 %
  ncac:            { t: [25, 40, 55, 70],               invert: true  }, // $ new-customer CAC (lower=better; AOV ~$54-110, TUNE to your LTV/repeat): <25 exc / 25-40 good / 40-55 fair / 55-70 avg / >=70 poor

  // ---- Email — main CRM helpers -----------------------------------------
  email_conv:      { t: [0.001, 0.0025, 0.005, 0.01],   invert: false }, // 0.10 / 0.25 / 0.50 / 1.00 %
  email_share:     { t: [0.11, 0.14, 0.17, 0.20],       invert: false }, // 11 / 14 / 17 / 20 % (channel target 20)
  campaign_rpr:    { t: [0.05, 0.11, 0.20, 0.35],       invert: false }, // $0.05 / 0.11 / 0.20 / 0.35 (Klaviyo avg ~0.11)
  email_unsub:     { t: [0.001, 0.002, 0.0035, 0.005],  invert: true  }, // 0.10 / 0.20 / 0.35 / 0.50 % (lower better)
  email_spam:      { t: [0.0005, 0.001, 0.002, 0.003],  invert: true  }, // 0.05 / 0.10 / 0.20 / 0.30 % (>=0.30 Gmail/Yahoo danger)
  email_roas_real: { t: [10, 20, 30, 45],               invert: false }, // Klaviyo-attributed real ROAS
  email_roas_utm:  { t: [3, 6, 10, 15],                 invert: false }, // UTM floor (undercounts ~4x)

  // ---- Email — Gp_Email_Performance (EMP_SCALE) -------------------------
  email_open:      { t: [0.30, 0.40, 0.50, 0.60],       invert: false }, // 30 / 40 / 50 / 60 % (Apple MPP inflates -> directional)
  email_click:     { t: [0.005, 0.01, 0.02, 0.03],      invert: false }, // 0.5 / 1 / 2 / 3 %

  // ---- Ads ops (5-band). CPM/CPC NICHE-CALIBRATED to golf-US-narrow-NSFW reality (not broad apparel):
  //      narrow US audience + NSFW throttling => CPM $30-40 is NORMAL (not 'bad'). US Meta baseline ~$20.
  //      CPM/CPC are DIAGNOSTIC inputs, not pass/fail: high CPM + strong CTR/ROAS = fine (act on ROAS/CPA).
  //      FB CTR bar > Google CTR bar (Meta feed CTR structurally higher than Google Shopping/PMax).
  cpm:        { t: [22, 30, 40, 50],             invert: true  },   // $ FB CPM  NICHE-CAL (golf US + narrow interest + NSFW throttle => $30-40 NORMAL; US Meta baseline ~$20): <22 exc / 22-30 good / 30-40 fair / 40-50 avg / >=50 poor
  cpc:        { t: [1.00, 1.60, 2.30, 3.00],     invert: true  },   // $ FB CPC  NICHE-CAL (= niche CPM/(1000*CTR) => ~$1.5-2.3 normal; kill >$3): <1 exc / 1-1.6 good / 1.6-2.3 fair / 2.3-3 avg / >=3 poor
  ctr_fb:     { t: [0.008, 0.012, 0.018, 0.028], invert: false },   // FB link CTR (Meta apparel ~1.24%): <.8 poor / .8-1.2 avg / 1.2-1.8 fair / 1.8-2.8 good / >=2.8% exc
  ctr_google: { t: [0.005, 0.0086, 0.013, 0.020], invert: false }   // Google Shopping/PMax CTR (avg ~0.86%, apparel ~1.26%): <.5 poor / .5-.86 avg / .86-1.3 fair / 1.3-2 good / >=2% exc
};

/** Grade a value by registered KPI key -> {key,bg,fg}. */
function _kpiWarn(key) {
  // Non-fatal: a version-mismatched CRM (older/newer than this module) asking for a key we do not have
  // must NOT crash the whole rebuild. Log and skip so every other metric still paints.
  try { Logger.log('[Likert] unknown KPI key "' + key + '" - deploy GP_KpiLikert.gs v2.8+ (has cpm/cpc/ctr_fb/ctr_google/ncac). Skipped.'); } catch (e) {}
}

function _kpiByKey(value, key) {
  var s = LIKERT_KPI[key];
  if (!s) { _kpiWarn(key); return _LIKERT_GREY; }
  return _kpiLikert5(value, s.t, s.invert);
}

// == OPTIONAL no-data (grey) variant. The deployed _kpiLikert5 collapses
//    blank / <=0 into red; use this wrapper where an empty or no-spend cell
//    should read as "no data" (grey) instead. Additive — does not change the
//    deployed contract.
var _LIKERT_GREY = { key: 'nodata', bg: '#F1F5F9', fg: '#64748B' };
function _kpiLikert5Grey(value, thresholds, invert) {
  if (value === '' || value === null || typeof value === 'undefined') return _LIKERT_GREY;
  var v = parseFloat(value); if (isNaN(v)) return _LIKERT_GREY;
  if (!invert && v <= 0) return _LIKERT_GREY;   // no spend / no data on higher-better KPIs
  return _kpiLikert5(v, thresholds, invert);
}
function _kpiByKeyGrey(value, key) {
  var s = LIKERT_KPI[key];
  if (!s) { _kpiWarn(key); return _LIKERT_GREY; }
  return _kpiLikert5Grey(value, s.t, s.invert);
}

/**
 * Discrete conditional-format rules for a live/formula range (e.g. Campaign
 * Daily ROAS in I6:I1000 & Y6:Y1000). Higher-better keys only. Blanks stay
 * uncoloured; <=0 -> grey. Apply with ws.setConditionalFormatRules(rules).
 */
function _kpiCfRules(ranges, key) {
  var s = LIKERT_KPI[key];
  if (!s) { _kpiWarn(key); return []; }   // unknown key -> no CF rules (uncoloured), build continues
  var t = s.t, P = _LIKERT5;
  var mk = function (builder, cell) {
    return builder.setBackground(cell.bg).setFontColor(cell.fg).setBold(true).setRanges(ranges).build();
  };
  if (!s.invert) {
    // higher = better (ROAS, CTR). A row WITH spend but value 0 = real LOSS / no engagement = POOR (red),
    // NOT grey "no-data" (spending with 0 return IS a loss). Blank cells aren't numbers -> stay uncoloured.
    return [
      mk(SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(t[0]),              P[0]),   // poor (includes 0 = loss)
      mk(SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(t[1]),              P[1]),
      mk(SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(t[2]),              P[2]),
      mk(SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(t[3]),              P[3]),
      mk(SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThanOrEqualTo(t[3]), P[4])
    ];
  }
  // lower = better COST (CPM, CPC). <=0 = no spend / no impressions = genuine NO-DATA -> grey (not 'excellent').
  return [
    mk(SpreadsheetApp.newConditionalFormatRule().whenNumberLessThanOrEqualTo(0),        _LIKERT_GREY),
    mk(SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(t[0]),              P[4]),
    mk(SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(t[1]),              P[3]),
    mk(SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(t[2]),              P[2]),
    mk(SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(t[3]),              P[1]),
    mk(SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThanOrEqualTo(t[3]), P[0])
  ];
}

/** Console self-test — run from editor. View -> Executions -> Logs. */
function _kpiLikertSelfTest() {
  var cases = [
    ['op_pct', 0.08, 'poor'], ['op_pct', 0.12, 'average'], ['op_pct', 0.18, 'fair'], ['op_pct', 0.23, 'good'], ['op_pct', 0.30, 'excellent'],
    ['roas', 1.9, 'poor'], ['roas', 2.0, 'average'], ['roas', 2.6, 'fair'], ['roas', 3.2, 'good'], ['roas', 3.5, 'excellent'],
    ['mer', 1.7, 'poor'], ['mer', 3.7, 'excellent'],
    ['margin_pct', 0.35, 'poor'], ['margin_pct', 0.72, 'excellent'],
    ['email_unsub', 0.0, 'excellent'], ['email_unsub', 0.0015, 'good'], ['email_unsub', 0.003, 'fair'], ['email_unsub', 0.004, 'average'], ['email_unsub', 0.006, 'poor'],
    ['email_spam', 0.0003, 'excellent'], ['email_spam', 0.004, 'poor'],
    ['email_open', 0.25, 'poor'], ['email_open', 0.65, 'excellent'],
    ['email_click', 0.004, 'poor'], ['email_click', 0.05, 'excellent'],
    ['campaign_rpr', 0.04, 'poor'], ['campaign_rpr', 0.40, 'excellent'],
    ['cpm', 15, 'excellent'], ['cpm', 55, 'poor'], ['cpc', 0.8, 'excellent'], ['cpc', 3.5, 'poor'],
    ['ctr_fb', 0.005, 'poor'], ['ctr_fb', 0.03, 'excellent'],
    ['ctr_google', 0.004, 'poor'], ['ctr_google', 0.025, 'excellent']
  ];
  var pass = 0, fail = 0, out = [];
  cases.forEach(function (c) {
    var r = _kpiByKey(c[1], c[0]), ok = (r.key === c[2]);
    ok ? pass++ : fail++;
    out.push((ok ? 'OK  ' : 'FAIL') + '  ' + c[0] + '(' + c[1] + ') = ' + r.key + ' (exp ' + c[2] + ') bg ' + r.bg);
  });
  Logger.log('GP_KpiLikert v2.0 self-test: ' + pass + ' pass / ' + fail + ' fail\n' + out.join('\n'));
  return fail === 0;
}