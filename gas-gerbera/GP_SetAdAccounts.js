/* ════════════════════════════════════════════════════════════════════════════
 *  GP_SetAdAccounts.gs  ·  one-off setter for FB_ADS_ACCOUNT_IDS
 *
 *  WHY THIS EXISTS
 *  The Apps Script properties pane turns READ-ONLY once a project holds more than
 *  50 script properties, which this one does. The list of ad accounts therefore
 *  cannot be edited by hand any more, and PropertiesService is the only way in.
 *
 *  WHAT IS IN THE LIST
 *  All 52 accounts FoxEra had configured, plus the 3 the token can already read
 *  but which were never configured (1803150516844674 "07. GenusFaith",
 *  563319219577190 FoxWears023, 398764213173011 FoxWears021). If any of those three
 *  carries a GER-prefixed campaign, its spend has been missing from the P&L and the
 *  reported profit has been too high.
 *
 *  THE FIVE BLOCKED ACCOUNTS ARE DELIBERATELY KEPT (238858809146561,
 *  1964756130351699, 682066606308223, 1006635643393826, 490968165870445). They 403,
 *  and a search of FoxEra Co. Ltd found none of them, but that only proves they are
 *  not in THAT portfolio. Removing them costs nothing if they are dead and costs a
 *  hole in the P&L if they are live under another login, so they stay until Ads
 *  Manager settles it. Five failed calls per sync is about two seconds; a silently
 *  missing month of spend is not recoverable once nobody remembers it existed.
 *
 *  Run gpSetFbAccountIds() once. It prints the old value first, so the previous
 *  list can always be pasted back.
 * ════════════════════════════════════════════════════════════════════════════ */

var GP_FB_ACCOUNT_IDS =
  '3666317626944281,441855108709735,1635419550630846,687791113516625,336036882779656,' +
  '1159085711985068,1456156811934108,408509139005908,529798326149618,399582856425792,' +
  '8641003289327260,535101292785509,2055782498187419,4003340909989910,1083221366699256,' +
  '2028944580953077,1084858669717466,1309735153347439,1603166010556293,395964240223195,' +
  '1585147355766508,963669045520479,885283586910184,1078609580283225,1227095925265193,' +
  '1217333205989886,1740085316727968,1537646073808820,499883299178251,402882659548465,' +
  '1085881689643097,1308896546793924,530845723191039,8438486609592526,1633411913918591,' +
  '3746332828964522,1088528692930509,491997713840919,866408619021054,1028516852353766,' +
  '1518992092149070,1234606510921714,863062695942163,574938241863960,1075322513569687,' +
  '557381033332705,2343598192672053,238858809146561,1964756130351699,682066606308223,' +
  '1006635643393826,490968165870445,1803150516844674,563319219577190,398764213173011';

function gpSetFbAccountIds() {
  var props = PropertiesService.getScriptProperties();
  var key = 'FB_ADS_ACCOUNT_IDS';

  // Print the old value BEFORE overwriting. Property history is not recoverable any
  // other way, and this is the only copy of what was there a moment ago.
  var before = props.getProperty(key) || '(empty)';
  Logger.log('OLD ' + key + ' (' + before.split(',').filter(String).length + ' ids):');
  Logger.log(before);

  // Normalise the same way _fbaAccountIds() reads it: strip act_, trim, digits only,
  // de-duplicate. Writing a value the reader would silently drop is how a list ends
  // up shorter than it looks.
  var seen = {}, clean = [];
  GP_FB_ACCOUNT_IDS.split(',').forEach(function (s) {
    var id = s.replace(/^act_/, '').trim();
    if (!/^\d+$/.test(id) || seen[id]) return;
    seen[id] = 1;
    clean.push(id);
  });

  props.setProperty(key, clean.join(','));

  Logger.log('');
  Logger.log('NEW ' + key + ' (' + clean.length + ' ids) written.');
  Logger.log(clean.join(','));
  Logger.log('');
  Logger.log('Next: run fbcDiagAccountAccess() to see how many are reachable.');
}

/** Print the current value without changing anything. */
function gpShowFbAccountIds() {
  var v = PropertiesService.getScriptProperties().getProperty('FB_ADS_ACCOUNT_IDS') || '(empty)';
  Logger.log('FB_ADS_ACCOUNT_IDS (' + v.split(',').filter(String).length + ' ids):');
  Logger.log(v);
}