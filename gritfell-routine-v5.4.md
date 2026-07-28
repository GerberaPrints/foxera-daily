> # 🔴🔴 CHẶN ĐẦU — ĐỌC `SYSTEM-v2.md` TRƯỚC KHI LÀM BẤT CỨ GÌ 🔴🔴
> **BẮT BUỘC ngay sau khi clone repo: `cat SYSTEM-v2.md` và TUÂN THEO.** Ưu tiên khi mâu thuẫn: **SYSTEM-v2 > routine riêng của bot này > trigger prompt**.
> SYSTEM-v2 (28/07/2026) là bài học PHỔ QUÁT rút từ audit 14 ngày bot Job; quét chéo metrics của cả 4 bot cùng ngày xác nhận các lỗ hổng này **không của riêng bot nào**. 11 luật S1–S11, nhớ tối thiểu 6 cái:
> - **S1** CẤM kết luận velocity từ review **thang k** (làm tròn hiển thị + chỉ 1–5% người mua để lại review + trễ 2–4 tuần). Chỉ đo velocity cho đơn vị **<500 review**; ≥1k → nhịp **TUẦN** + ghi *"dưới ngưỡng phân giải"*. CẤM viết "đứng / nguội / khai tử / bão hoà" từ vài ngày đứng yên.
> - **S2** **% giảm giá = kịch giá neo ảo phổ cập**, KHÔNG phải chiến tranh giá. Chỉ ghi **GIÁ CUỐI**; cấm "price war / sập giá" trừ khi có ≥2 điểm đo giá cuối của **cùng một** đơn vị.
> - **S3** Nhãn kỹ thuật/chất liệu trong title **nói dối ở cả hai đầu giá** (rẻ: in nhồi keyword; đắt: giá cao hoá ra không phải kỹ thuật đó). Chưa verify → gắn dấu `?`, không dùng để kết luận band.
> - **S4** ⭐ **TIÊU CHÍ CHỌN NGÁCH = đơn vị KHÔNG chạy Ad mà vẫn giữ GIÁ CAO** (= personalization sâu / thẩm mỹ đẹp). Phụ thuộc Ad ≈ commodity. Mạnh hơn review count. *(Quét 28/07: cả 4 bot gần như chưa dùng tiêu chí này.)*
> - **S6** 🔴 **KHÔNG CÓ DÒNG BIÊN LỢI NHUẬN THÌ KHÔNG ĐƯỢC ĐỀ XUẤT.** 0/4 bot từng viết một dòng nào về giá vốn. Chưa có COGS thật → chỉ được ghi **"thăm dò"**, KHÔNG được ghi "scale", và phải nhắc user gửi số.
> - **S7** **Khung mua là biến giá độc lập**: slug/khung *"quà tặng"* cho mặt bằng giá cao hơn hẳn slug *"sản phẩm"* (bằng chứng Job: $62.90 vs $26.90 cùng tệp). Mỗi đối tượng phải có **cả hai khung** trong ledger.
> Còn lại: **S5** (tỉ lệ Ad badge page 1 ≠ dữ liệu thị trường — đó là trang sàn trả cho *bot lạnh*) · **S8** (ghi "giả thuyết bị bác bỏ" vào field `rejected`, không hồi sinh) · **S9** (mỗi tuần 1 ngày quét rộng ≥12 đơn vị theo 4 trục, đầu ra là **bảng xếp hạng**) · **S10** (ngày 0 nguồn live → báo cáo **NGẮN**, cấm nống chữ) · **S11** (đừng thử lại mỗi ngày 2 việc cloud KHÔNG làm được: đọc ngày tháng review vì sàn render JS, và lấy tên shop ở list view — đó là việc của scheduled task LOCAL).
>
> *(Khối này do phiên bot Job thêm 28/07/2026 theo SYSTEM v1 §5.10 "bài học là tài sản chung". Nội dung gốc của file giữ NGUYÊN, không sửa dòng nào.)*

# GritFell Daily Updater — PATCH v5.4 (kết quả audit 28/07/2026)

**Quan hệ với v5.3:** đọc `gritfell-routine-v5.3.md` **mục 0–3** trước (bài học FoxEra, engine TREND→DESIGN ARBITRAGE, luật 📌 CẦN CHÚ Ý, guard Meta 3f). Rồi đọc file này. **Mâu thuẫn ở đâu → v5.4 thắng.**

Nguồn gốc: rà soát toàn bộ hệ GritFell ngày 28/07 (repo + GAS + 16 dòng metrics + handoff + test fetch thật). Dưới đây là **lỗi tìm được** và **luật sửa**, không phải ý tưởng chung chung.

---

## A. 🔴 LỖI URL — Marsh Wear bị báo "chặn" oan 2 ngày

**Tìm thấy:** bot fetch `marshwear.com` → ROBOTS_DISALLOWED / DNS fail → ghi ⛔️ "Marsh Wear fetch chặn" ngày 27/07 và 28/07. Nhưng domain THẬT là **`marshwearclothing.com`** — mở live 28/07 hoàn toàn bình thường (hero "Longer days. Warmer water. A little more trouble to get into.", Heritage Hat $39, Outpost Mesh Trucker $35, Stackhouse Tech Tee $49, Baracoa Camp Shirt $65, ship free $100+, vẫn Spring 2026, KHÔNG có fall/dove).

**Tệ hơn:** URL đúng ĐÃ NẰM trong `gritfell-handoff/07_SOURCE_REGISTRY.json` từ 20/07 (`marshwear_polo` → `marshwearclothing.com`) và metrics 19/07 đã ghi rõ *"marshwear.com robots-blocked, priced via marshwearclothing.com"*. Kiến thức có sẵn nhưng **quy trình không đọc lại** → mất trí nhớ, báo sai 2 ngày liền.

### Luật sửa A1 — BẢNG URL CHỐT (dùng đúng, không tự đoán domain)

| Brand | URL rotation |
|---|---|
| Huk | https://huk.com/ |
| BURLEBO | https://burlebo.com/ |
| Poncho | https://ponchooutdoors.com/ |
| **Marsh Wear** | **https://www.marshwearclothing.com/** ⚠️ KHÔNG dùng marshwear.com |
| Duck Camp | https://duckcamp.com/ |
| AFTCO | https://www.aftco.com/ |
| Drake | https://www.drakewaterfowl.com/ |
| Free Fly | https://freeflyapparel.com/ |
| Howler | https://howlerbros.com/ |
| SITKA | https://www.sitkagear.com/ |
| Tom Beckbe | https://tombeckbe.com/ |
| DECOY | https://decoyapparelco.com/ (chặn 25/07 — xem mục C) |

### Luật sửa A2 — 07_SOURCE_REGISTRY.json vào vòng đọc BẮT BUỘC
Bước 3c từ nay đọc thêm `gritfell-handoff/07_SOURCE_REGISTRY.json`. Trước khi kết luận một nguồn "chặn", **phải kiểm registry xem có URL/domain thay thế đã biết không**. Khi phát hiện domain sai/đổi → bot được **cập nhật entry trong registry** (thêm `"status"`, `"last_ok"`, `"blocked_since"`) và ghi vào metrics note. Registry = trí nhớ dài hạn về NGUỒN; metrics = trí nhớ về TÍN HIỆU. Không lẫn hai thứ.

---

## B. 🔴 ĐIỂM MÙ — bot theo dõi 11 đối thủ mỗi ngày nhưng CHƯA BAO GIỜ soi gritfell.com

**Tìm thấy:** bước 3b ("tùy chọn") trên thực tế không chạy ngày nào trong 14 ngày. Hệ quả cụ thể phát hiện khi test live 28/07:

- `gritfell.com/collections/hunting-button-shirt` mở tốt: **11 SP, đều $55**, có Mallard Marsh / Marsh Flight / Marsh Hawk Camo / Marshland / Buck Fever / Bird Dog… **KHÔNG có SKU dove hay teal** → claim đang carry là ĐÚNG, nhưng từ nay phải là *verified live*, không phải carry chay.
- ⚠️ **Banner site đang là "SPRING GEAR. BUY 2 GET 1 FREE!" vào ngày 28/07.** Trong khi radar ghi: Free Fly "End of Summer up to 50%", SITKA "FALL GEAR IS HERE", Huk back-to-school, BURLEBO gameday. **GritFell là brand duy nhất trong khung hình còn nói "Spring" cuối tháng 7.** Bot bỏ lỡ điều này suốt vì chỉ nhìn ra ngoài.

### Luật sửa B1 — SELF-AUDIT (bắt buộc, không còn "tùy chọn")
Mỗi run, WebFetch `https://gritfell.com/` + **1 collection xoay vòng theo thứ** (T2 hunting-button-shirt · T3 fishing button/polo · T4 mens-swim-short · T5 hats · T6 new arrivals/all · T7 sale/collection nổi · CN homepage-only). Render **1–3 dòng trong B1, ngay TRƯỚC mục 🏪 NỘI BỘ**, mục tên **"🪞 SOI MÌNH"**:
- banner/offer hiện tại của gritfell.com + **so với mùa vụ và với 11 brand** (lệch mùa → nói thẳng);
- số SP + trần giá của collection xoay vòng hôm nay;
- 1 dòng gap: cái đối thủ đang đẩy mà GritFell chưa có / claim đang carry mà nay verify được.

### Luật sửa B2 — Self-audit là ĐƯỜNG LÙI khi Shopify chết
Khi guard 3e trượt (connector sai store), **B1 vẫn phải có dữ liệu về chính mình** qua B1 self-audit. Nhãn `OBSERVED_CURRENT` (site công khai), **KHÔNG phải** `INTERNAL_OBSERVED`. Không được để B1 trống phần "mình" chỉ vì Shopify hỏng.

---

## C. Nguồn bị chặn — thôi đập cửa mỗi ngày

**Tìm thấy:** marshwear.com (sai domain, đã sửa ở A), decoyapparelco.com chặn từ 25/07, duckcamp.com trả cache cũ "Fall '23", Meta Ad Library robots-blocked. Bot thử lại hằng ngày → tốn lượt fetch + đẻ ⛔️ lặp.

### Luật sửa C1 — SỔ NGUỒN CHẶN
Một nguồn fail **2 lần liên tiếp** → chuyển trạng thái `BLOCKED` trong `07_SOURCE_REGISTRY.json` (`blocked_since`). Từ đó **chỉ thử lại 1 lần/tuần, đúng ngày rotation của nó**. Các ngày khác: không fetch, không ⛔️ riêng; thay vào đó B6 gom **1 dòng duy nhất**: "⛔️ Chưa verify: Marsh Wear N ngày · DECOY N ngày · Duck Camp N ngày (cache)". Mở lại được → xoá `blocked_since`, ghi `last_ok`, báo trong metrics note.

### Luật sửa C2 — CACHE ≠ CHẶN
Nguồn trả nội dung nghi cache cũ (mốc năm/mùa sai như Duck Camp "Fall '23", AFTCO banner "spring") **KHÔNG được dùng làm fact hôm nay** và cũng **không đếm là "chặn"** — trạng thái riêng `STALE_CACHE`. Ghi rõ trong registry.

---

## D. Toàn vẹn dữ liệu — metrics/internal phải idempotent

**Tìm thấy:** `gritfell-metrics.jsonl` có **3 dòng cùng ngày 2026-07-18**. Vì velocity đọc bằng `tail -n 3`, một ngày bị nhân ba sẽ **che mất 2 ngày lịch sử thật** → so sánh velocity sai mà không ai biết.

### Luật sửa D1 — APPEND CÓ KIỂM
Trước khi append `gritfell-metrics.jsonl` / `gritfell-internal.jsonl`: đọc dòng cuối. **Trùng `date` → GHI ĐÈ dòng cuối, KHÔNG append.** (Chạy lại trong ngày là bình thường — không được đẻ dòng trùng.) Kiểm nhanh:
```
python3 -c "import json,collections;c=collections.Counter(json.loads(l)['date'] for l in open('/tmp/gfrepo/gritfell-metrics.jsonl'));print([k for k,v in c.items() if v>1] or 'no dup')"
```
Đưa vào SELF-CHECK mục (g). *(3 dòng 18/07 cũ giữ nguyên — không viết lại lịch sử; chỉ chặn từ nay.)*

### Luật sửa D2 — LỖ HỔNG PHẢI THẤY ĐƯỢC
3e không chạy được → vẫn APPEND `gritfell-internal.jsonl` 1 dòng `{"date":…,"status":"skipped","reason":"shopify connector points to <store>"}`. Không để lịch sử im lặng: sau này phải phân biệt được "không có đơn" và "không đọc được".

---

## E. Cảnh báo đúng lúc — dùng PushNotification, đừng chôn trong Telegram

**Tìm thấy:** connector Shopify trỏ nhầm store phát hiện 28/07; nếu không có người đọc kỹ B1 thì mất data nội bộ hàng tuần mà không ai biết. Snapshot social nhắc **8 ngày liên tiếp, 0 lần được dán** — nhắc hằng ngày rõ ràng không hiệu quả, chỉ tạo nhiễu.

### Luật sửa E1 — 3 tình huống BẮT BUỘC PushNotification (ngoài push-fail đã có)
1. **Guard 3e trượt** (Shopify không phải gritfell.com) → push ngay, nêu store đang trỏ + việc cần làm.
2. **Ledger sắp hết hạn:** item pending còn **≤3 ngày** tới `kill_date` → push 1 lần/item (đừng để EXPIRED thành bất ngờ). *Áp dụng ngay: OPENER-CAPSULE-2026 kill 07/08 → push ngày 04/08.*
3. **Nguồn cốt lõi chết ≥3 ngày** (cả 2 nguồn Gulf, hoặc ≥3/11 brand rotation cùng chặn) → push 1 lần, không lặp.
Ngày bình thường: **KHÔNG push.** Bản tin Telegram là kênh mặc định; push chỉ dành cho thứ hỏng hoặc sắp hết hạn.

### Luật sửa E2 — chống nhiễu nhắc-nhở
Nhắc "dán snapshot" **chỉ còn hiện thứ 2**. Nếu 3f (Meta MCP) chạy được thì **bỏ hẳn** mục nhắc — snapshot tay chỉ còn tùy chọn cho IG/TikTok. Không nhắc cùng một việc 7 ngày/tuần.

---

## F. Định dạng — khối dài và Telegram

**Tìm thấy:** GAS `pt_chunk_` tự cắt ở 3900 ký tự **theo ranh giới dòng, mù về nội dung** — B1/B2 hiện đã 2.7KB, cộng thêm 📌 (v5.3) + 🪞 SOI MÌNH (B1) sẽ vượt 3900 → GAS cắt máy móc, có thể tách rời dòng 🔗 Nguồn khỏi thân tin.

### Luật sửa F1 — tự tách có chủ đích
Khối nào dự kiến **>3500 ký tự** → bot chủ động tách thành **2 phần tử trong mảng** `blocks.Bx` (GAS gửi từng phần tử là 1 tin, có `Utilities.sleep` giữa các tin). Cắt ở ranh giới ngữ nghĩa (hết một mục), phần 2 mở đầu bằng `…(tiếp)` và **phần cuối cùng phải chứa 👉 Chốt + 📌 CẦN CHÚ Ý + 🔗 Nguồn**.

---

## G. SELF-CHECK v5.4 (thay bản v5.3)

- **(a)** JSON hợp lệ (daily + decisions + internal nếu sửa)
- **(b)** `date` == hôm nay giờ Bangkok
- **(c)** đủ 7 khối B1..B7 (GAS chỉ có sender B1–B7)
- **(d)** mỗi khối có ≥1 `🔗 Nguồn:` **và** ≥1 `📌 CẦN CHÚ Ý:`
- **(e)** khối yên = "⏸ Không đổi" + vẫn có 📌
- **(f)** B7 có mục arbitrage (≥1 tín hiệu đã chấm điểm **hoặc** dòng null trung thực)
- **(g)** 🆕 không có `date` trùng trong metrics.jsonl / internal.jsonl
- **(h)** 🆕 B1 có mục **🪞 SOI MÌNH** (self-audit gritfell.com)
- **(i)** 🆕 mọi phần tử `blocks.Bx[i]` ≤ 3900 ký tự; phần tử CUỐI của mỗi khối chứa đủ 👉 + 📌 + 🔗

---

## H. ⚠️ VIỆC CỦA NGƯỜI — bảo mật (bot không tự làm được)

**Repo `GerberaPrints/foxera-daily` là PUBLIC** (xác nhận 28/07: `raw.githubusercontent.com/.../README.md` đọc được không cần auth — GAS vốn dựa vào đúng tính công khai này).

Trong repo public đó đang có **2 token Telegram bot còn sống**:
- `gritfelldaily-v2.gs` — token bot GritFell + `chat_id` nhóm
- `genusfaith-telegram-gas-v2.gs` — token bot GenusFaith *(file của dự án khác — chỉ BÁO, không đụng, đúng luật namespace)*

Ai đọc được repo cũng **đăng bài giả vào nhóm Telegram** hoặc đọc update của bot được.

**Xử lý (theo thứ tự):**
1. **Revoke + tạo token mới** cho cả 2 bot qua BotFather (`/revoke`). Bắt buộc — **git history vẫn giữ token cũ dù đã xoá khỏi file**, nên chỉ redact là chưa đủ.
2. Dán token mới vào **Apps Script → Project Settings → Script Properties** (`PT_TOKEN`, `PT_CHAT`), KHÔNG dán vào code. `gritfelldaily-v2.gs` trong repo đã được sửa sẵn để đọc từ Script Properties + có hàm `fxSetSecrets()` chạy 1 lần.
3. Cân nhắc chuyển repo sang **private** — nhưng như vậy GAS `fx_loadData_()` sẽ hỏng (raw URL cần auth). Nếu chuyển private thì phải đổi GAS sang gọi GitHub API kèm PAT (cũng lưu trong Script Properties). Giữ public thì **tuyệt đối không commit secret nào nữa**.
4. GitHub PAT hiện **không** bị commit (chỉ nằm trong prompt scheduled task + `.git/config` local) — chỗ này đang ổn.

---

## I. Việc người còn treo (tính đến 28/07)

1. **Bảo mật:** rotate 2 token Telegram + chuyển sang Script Properties (mục H) — ưu tiên cao nhất.
2. **Shopify connector**: authorize lại, chọn store GritFell (đang trỏ Genus Faith).
3. **MCP_Facebook_Ads**: authorize → mở khoá 3f, thay được snapshot tay.
4. **Ledger**: OPENER-CAPSULE-2026 (kill 07/08 — sẽ có push nhắc 04/08) · NUMBERED-SPECIES-DROP-2026 (kill 21/08).
5. **Dán lại `gritfelldaily-v2.gs`** vào Apps Script sau khi rotate token (bản trong repo đã sửa: Script Properties + cảnh báo stale trỏ đúng tên task v5.4).
6. **Banner "SPRING GEAR" trên gritfell.com cuối tháng 7** (mục B) — quyết định của người: giữ hay xoay sang late-summer/opener.
