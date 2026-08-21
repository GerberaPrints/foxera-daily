---
name: gerberaprints-gas
description: Dùng khi viết, sửa, hoặc debug Google Apps Script cho GerberaPrints (project "Gerberaprints CRM" — CRM v28.14 + Telegram advisor v3.9). Trigger khi user đề cập: GAS, Apps Script, CRM code, function, bug, script, menu, sync, import, rebuild, heatmap, dashboard, CAPI, Klaviyo, supplier, Shopify, Telegram, nhịp, slot, market.json. LUÔN đọc skill này trước khi chạm vào bất kỳ dòng code GAS nào.
---

# GerberaPrints GAS — bản đồ thực tế

> **Đối chiếu ngày 20/08/2026** từ `clasp pull` toàn bộ project (17 file `.js`).
> Nguồn sự thật đầy đủ: `gas-gerbera/` trong repo `GerberaPrints/foxera-daily`.
> Bản trước của skill này ghi "CRM v19, 1 file, 14.126 dòng, 231 hàm" — **sai 9 phiên bản
> và sai cả cấu trúc**. Nếu thấy skill mô tả `var SH = {...}` hoặc `_SHOP_CFG` thì đó là
> bản cũ, đừng dùng.

## Toạ độ

| | |
|---|---|
| Apps Script project | **Gerberaprints CRM** |
| Script ID | `1qLx5j3znm8KQk4cuh47_y3bD1LfD-MMwuR8QRD5Is3nWkcIPEAdSFtY1` |
| Bảng tính CRM | `1sd8LENhX1fUrK7d42oHbNRTYsbaj7BEsNYTsQ0xouwM` |
| Quy mô thật | **17 file · 12.797 dòng · 428 hàm** |
| Bản sao lưu | `gas-gerbera/` trong repo (đã che credential — **CHỈ ĐỌC**) |

Kéo bản mới: `clasp pull` trong `gas-gerbera/`, rồi **bắt buộc** chạy `python gpredactsecrets.py gas-gerbera` trước khi commit.
⛔️ **KHÔNG BAO GIỜ `clasp push` từ thư mục đó** — sẽ ghi `__REDACTED__` đè lên production.

## 17 file — ai làm gì

| File | Dòng | Hàm | Vai trò |
|---|---:|---:|---|
| `Gerberaprints CRM.js` | 4474 | 140 | **Lõi v28.14.** Sync Shopify → `Shopify B2C`, sổ Daily P&L NET |
| `Gerbera telegram ads advisor.js` | 1885 | 77 | **Telegram v3.9** — 7 nhịp `gpSlot1..7` |
| `GP_Klaviyo.js` | 1369 | 46 | 4 flow Klaviyo |
| `GP_Airwallex.js` | 1252 | 35 | Đối soát thanh toán |
| `GP_FB_Campaign_Sync.js` | 699 | 16 | Sync campaign Meta |
| `FB_Ads_Daily.js` | 590 | 24 | Sheet `📱 FB Ads Daily` |
| `GerberaPrints — Daily Ads Advisor → Telegram.js` | 559 | 28 | ⚠️ **BẢN CŨ — xem Mìn 1** |
| `Gp Email Performance & AirWallex.js` | 373 | 13 | Hiệu quả email |
| `GP_UTM_Attribution.js` | 353 | 18 | Quy nguồn UTM |
| `GP_FBC_Likert.js` | 302 | 6 | Chấm điểm creative |
| `Gp geoholdout.js` | 176 | 5 | ⚠️ **Bản sao MerTest — xem Mìn 2** |
| `GP_COGS_Coverage.js` | 167 | 7 | Độ phủ COGS |
| `GP_MerTest.gs.js` | 156 | 4 | Kiểm định MER |
| `GP_ProductPL.gs.js` | 150 | 2 | P&L theo SP (v28.1) |
| `GP_Acquisition.gs.js` | 144 | 3 | Chi phí thu hút |
| `GP_SetAdAccounts.js` | 75 | 2 | Khai TK quảng cáo |
| `GP_SheetOrder.js` | 73 | 2 | Sắp thứ tự sheet |

**Thứ tự nạp = thứ tự file trong sidebar Apps Script** (đúng thứ tự bảng trên).
Apps Script gộp mọi file vào **một không gian tên chung**; hàm định nghĩa **sau ghi đè** hàm trước.

## 🔴 MÌN 1 — hai file Telegram, 12 hàm trùng tên, 10 khác nhau

`GerberaPrints — Daily Ads Advisor → Telegram.js` (bản cũ) định nghĩa lại 12 hàm cũng có trong bản v3.9:

```
callLLM_  cleanInsightRow_  extractRoas_  fetchGoogleSnapshot_
fetchMetaSnapshot_  llmSystemPrompt_  metaInsights_  num_
prevWeekRange_  prop_  testTelegramConnection  toQuery_
```

**10/12 khác nhau về nội dung**, có cái lệch gấp 3:

| Hàm | Bản cũ | v3.9 |
|---|---:|---:|
| `callLLM_` | 1.362 ký tự | **3.534** |
| `fetchMetaSnapshot_` | 593 | **1.835** |
| `llmSystemPrompt_` | 3.491 | **5.103** |

Hiện bản cũ nạp **trước** ⇒ v3.9 thắng ⇒ chạy đúng. **Nhưng đó là may, không phải thiết kế.**
Kéo-thả đổi thứ tự file trong sidebar (thao tác bình thường) là bản cũ thắng, và
07:00 sẽ im lặng dùng logic cũ: mất bản vá v3.8 *"xếp hạng hook bằng UNITS"*, mất
`date_preset` 1d/3d. **Không có lỗi nào báo.**

→ Việc cần làm: **xoá `GerberaPrints — Daily Ads Advisor → Telegram.js`**.
Trước khi xoá, kiểm 16 hàm riêng của nó có ai gọi không.

## 🔴 MÌN 2 — `Gp geoholdout.js` là bản sao chưa đổi tên của `GP_MerTest.gs.js`

Header của `Gp geoholdout.js` **ghi thẳng `GP_MerTest.gs`** — copy-paste chưa sửa. Trùng
`_merRevByDay`, `_merWindow`, `buildMerTest`, `analyzeMerTest`.

`buildMerTest` khác nhau (3.216 vs 2.933 ký tự). `GP_MerTest.gs.js` nạp sau ⇒ **thắng**.
Đáng lo: header geoholdout ghi **v1.1**, MerTest ghi **v1.0** ⇒ nhiều khả năng
**bản mới đang bị bản cũ đè**. MER là số quan trọng nhất của GP.

→ Cần người quyết: giữ bản nào, đổi tên hàm bản kia.

## Hằng số thật (KHÔNG còn `SH` hay `_SHOP_CFG`)

```javascript
// Gerberaprints CRM.js
var SHOPIFY_STORE   = '1nyyjq-kf.myshopify.com';
var SHOPIFY_API_VER = '2024-01';
var SHOPIFY_TOKEN   = '...';           // ⚠️ hardcode — nên chuyển Script Properties
var _HOURLY_FN = '_dplHourlySync';
var _DAILY_FN  = '_dplDailyRefreshAll';

var DPL = {
  PL:'📅 Daily P&L',  B2C:'Shopify B2C',  COST:'💰 Cost Tracker',
  SETTINGS:'⚙ Settings',  ADSPEND:'📊 Ad Spend',  PL_MONTHLY:'📆 Monthly P&L',
  ADSPERF:'🎯 Campaign Daily',  HEATMAP:'🎯 Campaign Daily',
  CATALOG:'🛍️ Product Catalog',  MTP:'🎩 MTP Cap',  YOYCOL:'👕 Yoycol',
  CUSTEASE:'📦 CustomEase',  KLEMAIL:'📧 Email Marketing',
  AUDIT:'🔎 Channel Audit',  CAMPSCORE:'📧 Campaign Scorecard',
  TNR:'Times New Roman',
  VN_TZ:'America/Los_Angeles',   // ⚠️ TÊN LỪA — xem dưới
  TZ_LABEL:'PT'
};
var DPL_FB_SHEET   = '📱 FB Ads Daily';
var DPL_GADS_SHEET = '🔍 Google Ads Daily';
```

⚠️ **`DPL.VN_TZ` KHÔNG phải giờ Việt Nam.** Giá trị là `America/Los_Angeles`.
Đổi sang Pacific để khớp Shopify (nguồn sự thật doanh thu), Facebook, Email, Lark bot.
Tên khoá giữ nguyên vì `GP_UTM_Attribution.js` đang đọc `DPL.VN_TZ`.
**Đừng "sửa" nó thành Asia/Ho_Chi_Minh** — sẽ lệch toàn bộ đối soát ngày.

Công thức lõi v28.14: `Revenue − COGS − Gateway − Ad spend = CONTRIBUTION MARGIN`
COGS join cần Script Property **`FULFILLMENT_HUB_ID`**.
v28.14: bỏ ẩn cột Z FB ROAS · dải ROAS từ `GP_UNIT_ECONOMICS` · `dplPaintAdsRoas` thôi tô Revenue thành ROAS.
Bỏ so với v26: ~25 dashboard/analytics thừa + payment sync (`dplCleanupOldSheets` để dọn sheet).

## Telegram v3.9 — `GP_BUILD = 'v3.9 · 2026-07-31'`

```javascript
var GP_TZ = 'Asia/Bangkok';   // khác DPL.VN_TZ — đây MỚI là giờ Đông Nam Á
var GP_DELAY = 3500;
var GP_SLOTS = [
  { fn:'gpSlot1Ads',    h:7,  m:0  },  { fn:'gpSlot2Store',  h:7,  m:30 },
  { fn:'gpSlot3Market', h:8,  m:30 },  { fn:'gpSlot4Ideas',  h:9,  m:0  },
  { fn:'gpSlot5Rival',  h:9,  m:30 },  { fn:'gpSlot6Video',  h:9,  m:45 },
  { fn:'gpSlot7Moves',  h:10, m:0  }
];
var GP_JSON_BLOCKS = ['B3'];   // chỉ B3 lấy từ JSON; B1/B2/B4 tự chủ
```

| Nhịp | Hàm | Khối | Nguồn |
|---|---|---|---|
| 07:00 | `gpSlot1Ads` | Ads GP | Graph API + sheet |
| 07:30 | `gpSlot2Store` | Store | NATIVE sheet CRM |
| 08:30 | `gpSlot3Market` | B1·B2·B3 | `gerbera-market.json` |
| 09:00 | `gpSlot4Ideas` | B4→B8 | `gerbera-market.json` |
| 09:30 | `gpSlot5Rival` | B9 + Hệ thống | JSON + `SKU Raw Data` |
| 09:45 | `gpSlot6Video` | B10 | `gerbera-market.json` |
| 10:00 | `gpSlot7Moves` | B11 | `gerbera-market.json` |

Sau khi paste đè code Telegram: **bắt buộc chạy `gpInstallTriggers()`** — cài trigger là
việc tay, paste code không tự tạo. Nếu còn `PATCH_v3_to_v3_1.gs` trong project thì **xoá**,
nó gây `Illegal return statement`.

## Code chết còn sót — `gerbera-ads.json`

`GP_RAW_URL` (dòng 190) vẫn trỏ `gerbera-ads.json`, file đã **chết từ 18/07** (task sinh ra nó bị xoá).
`gp_loadJson_()` (dòng 613) đọc nó; được gọi ở **`tgSelfTest` dòng 342** và dòng 640.

7 nhịp đang chạy **KHÔNG** gọi đường code này ⇒ **không có tin Telegram nào dùng số cũ**.
Nhưng `tgSelfTest` vẫn in *"JSON cũ N ngày"* → **cảnh báo giả**, tới nay đã hơn 30 ngày.

→ Sửa: gỡ/đổi nhãn đoạn kiểm tuổi trong `tgSelfTest`. **Gỡ code trước, xoá file trong repo sau** —
xoá file trước là tạo 404 ở đường code đang ngủ.

## Bài học đã trả giá (giữ nguyên từ bản cũ — vẫn đúng)

1. **Brace balance** — verify `{`/`}` cân bằng trước khi save
2. **Không `PropertiesService` ở global scope** — chỉ đọc trong thân hàm
3. **`_b2cAllRows`** khai ở function scope, không trong `if` (bug #54)
4. **`var marginPct`** chỉ 1 lần/hàm (bug #59)
5. **Font** Times New Roman toàn bộ (bug #51)
6. **Legend text** không bắt đầu bằng `=` (→ `#NAME?`)
7. **Default year** `2026`, không phải 2025 (bug #56)
8. **`isFuture`** so sánh chuỗi `key > todayKey` (bug #66)

## Quy ước đặt tên

```
menuXxx()    thin wrapper cho menu     buildXxx()   tạo/rebuild sheet
syncXxx()    pull API → sheet           fetchXxx()   API call, không ghi sheet
_privateXxx() helper nội bộ             setupXxx()   cấu hình một lần
triggerXxx() bắn event Klaviyo          rebuildXxx() rebuild layout, không pull
gpSlotN()    nhịp Telegram              gp_xxx_()    helper Telegram
```

## Việc tồn đọng (ưu tiên giảm dần)

1. 🔴 Xoá file Telegram cũ — **Mìn 1**
2. 🔴 Quyết `Gp geoholdout` vs `GP_MerTest` — **Mìn 2**
3. 🟡 Gỡ cảnh báo giả `gerbera-ads.json` trong `tgSelfTest`
4. 🟡 Chuyển `SHOPIFY_TOKEN` + khoá Klaviyo sang Script Properties.
   Codebase **đã có mẫu đúng**: `_CAPI.ACCESS_TOKEN` để rỗng, đọc từ Properties lúc runtime.
5. 🟢 Đổi tên đuôi lẫn `.gs.js` (`GP_ProductPL.gs.js`, `GP_Acquisition.gs.js`, `GP_MerTest.gs.js`)
