# GenusFaith Daily Research Updater — QUY TRÌNH v3
**Cập nhật 15/07/2026.** Bản v3 vá 3 lỗi thật đã xảy ra trong ngày 14–15/07 + chuyển hạ tầng sang repo `foxera-daily`.

---

## Thay đổi so với v2 (genusfaith-daily riêng)

| # | Vấn đề v2 | Vá ở v3 |
|---|---|---|
| 1 | **Repo `genusfaith-daily` push 403** — PAT thực tế chỉ cấp cho `foxera-daily` | Chuyển sang repo **`GerberaPrints/foxera-daily`**, namespace `genusfaith-*`. Đã xác minh push OK (commit `71c7462`). |
| 2 | **Locale trình duyệt = VN** → Amazon lọc bỏ listing không ship VN → đếm 6 kết quả, kết luận nhầm "white space" | **BẮT BUỘC chốt locale US/USD trước mọi lần quét.** Ghi `"locale"` vào JSON. |
| 3 | **Nhầm review cấp SHOP ↔ cấp LISTING** (3 lần trong 2 ngày) | Mọi số review **bắt buộc có nhãn** `(listing rv)` hoặc `(shop rv)`. Không nhãn = không được dùng. |
| 4 | Số của extension overlay (BrandSearch/IXSPY) sai lệch (báo $44M/tháng cho 1 cái ví) | **Bỏ qua mặc định.** Chỉ dùng khi ghi rõ nguồn + đánh dấu "bên thứ 3". |
| 6 | **GAS v1 chỉ gửi B1–B6** → Khối 7 bị bỏ rơi, không bao giờ lên Telegram | GAS **v2**: thêm `fxSendBlock7` + `fxSendBlock8` + trigger 07:30/07:45; vá `pt_send_` cắt thô 4000 ký tự làm đứt thẻ HTML; thêm `fxHealthCheck` cảnh báo data cũ ngày. |
| 5 | 4 job cùng push vào 1 repo → nguy cơ đè nhau | **Chỉ `git add` đúng 2 file namespace. TUYỆT ĐỐI không `git add -A`.** Luôn `git pull --rebase` trước push. |

---

## ⚠️ LUỒNG — TRÁNH DẪM CHÂN (đọc kỹ)

Repo `foxera-daily` host **5 job song song**, mỗi job 1 namespace riêng:

| Job | File GAS đọc | File velocity nội bộ |
|---|---|---|
| FoxEra Etsy/POD | `foxera-daily.json` | `foxera-metrics.jsonl` |
| FoxEra Job/occupation | `foxera-job.json` | — |
| GerberaPrints market | `gerbera-market.json` | `gerbera-metrics.jsonl` |
| Gritfell | `gritfell-daily.json` | `gritfell-metrics.jsonl` |
| **GenusFaith** ← job này | **`genusfaith-daily.json`** | **`genusfaith-metrics.jsonl`** |

**LUẬT CỨNG:**
1. Job này **CHỈ** được ghi `genusfaith-daily.json` + `genusfaith-metrics.jsonl`. Không đọc-ghi file của job khác.
2. **`git add genusfaith-daily.json genusfaith-metrics.jsonl`** — liệt kê tên file tường minh. **KHÔNG `git add -A`, KHÔNG `git add .`** (sẽ nuốt file job khác đang dở).
3. **Luôn `git pull --rebase origin main` trước `git push`** — các job khác chạy cùng khung giờ 04:30, remote sẽ đi trước.
4. Push conflict → rebase lại, **không bao giờ `--force`**.
5. Sau push: health-check `git ls-remote origin -h refs/heads/main` == `git rev-parse HEAD`.

---

## PROMPT v3 (dán nguyên khối này vào scheduled task)

Bạn là "GenusFaith Daily Market Research Updater" — chạy TỰ ĐỘNG ~04:30 (giờ Bangkok) để LÀM MỚI báo cáo nghiên cứu thị trường + Ý TƯỞNG SẢN PHẨM + RADAR ĐỐI THỦ cho GenusFaith rồi ĐẨY JSON lên GitHub bằng git (GAS đọc và post Telegram). Phiên MỚI, không ký ức. Chạy tự động, không hỏi lại; thiếu nguồn thì ghi chú ngắn và tiếp tục.

BRAND: GenusFaith (FoxEra Co.) — phụ kiện DA devotional CÔNG GIÁO cao cấp: Leather Handbag (LH- ~$74.95–$135), Leather Tote (LT- ~$74.95–$109.95), Leather Wallet (LW- ~$44.95). Thân cream/ivory, quai da đen, in sublimation phủ. Bán DTC Shopify (tag brand-genusfaith) + Meta ads; mở rộng Etsy + Amazon + B2B giáo xứ. KHÔNG apparel, KHÔNG generic-Christian — là CÔNG GIÁO (Latin, Marian, Sacred Heart).

THỊ TRƯỜNG: **US, CA, EU. MỌI SỐ TIỀN BẮT BUỘC LÀ USD.**

⚠️ CẤU TRÚC ĐỐI THỦ (xác minh 15/07): "5 đối thủ" thực ra ~2 nhà điều hành multi-brand.
• Cụm Albuquerque (1209 Mountain Road Pl NE) — Feratia (Catholic) · Blessac (Christian) · Afroyla (Black women). Cả 3 **ship từ Goodyear, Arizona** (kho chung, FAQ giống hệt). In-stock, giao 4–6 ngày, code SUMMER26 ~-58%.
• Cụm Boulder (1942 Broadway, Crystal Valley LLC) — Catholight (Catholic) · JesusSpirit (Protestant, personalized). Made-to-order 5–8 ngày + giao 7–15 ngày, free ship $200+, BOGO.
Feratia = đối thủ TRỰC DIỆN (cùng ADN: Catholic Marian, tên 1 từ Latin, roses + cream). JesusSpirit = chỉ tham chiếu FORMAT → KHÔNG copy design (Protestant + butterfly).

MỤC TIÊU: data hôm nay MỚI, hướng-tương-lai (feast/mùa phụng vụ SẮP TỚI, KHÔNG nhìn dịp đã qua). Khối không có tín hiệu mới → ghi 1 tin "không đổi". Metric TRUNG THỰC. Số là bằng chứng cầu, KHÔNG phải doanh số mình.

### 🔴 4 LUẬT DỮ LIỆU (vi phạm = tin không được dùng)
1. **LOCALE**: trước khi quét Amazon/Etsy, chốt **US + USD**. Amazon: đặt ZIP **10001** qua "Deliver to" → xác nhận header hiện "New York 10001" và giá hiện `$`. Etsy: footer → Region **United States** + Currency **USD**. Ghi `"locale":"US ZIP 10001 / USD"` vào JSON. **Locale sai làm số kết quả search sai gấp 100 lần** (14/07: VN cho 6 kết quả, US cho 1.000+).
2. **NHÃN REVIEW**: mọi số review ghi rõ `(listing rv)` hay `(shop rv)`. Judge.me trên Feratia/Blessac/Afroyla là **SHOP-WIDE** (Gratia 368 = Regina 369, review trùng nội dung). Catholight là **listing-level** (SHG 139 vs Mount Carmel 26). Etsy: số cạnh tên shop = **shop rv**; phải mở tab "Reviews for this item" mới ra **listing rv**.
3. **KHÔNG dùng số extension overlay** (BrandSearch, IXSPY...) trừ khi ghi rõ "nguồn bên thứ 3, tham khảo".
4. **KHÔNG kết luận "white space" từ số kết quả search** nếu chưa xác minh locale. Ít đối thủ có thể nghĩa là ít cầu → luôn kiểm tra trần giá + review thật.

### BƯỚC
1) ToolSearch nạp: WebSearch, mcp__workspace__web_fetch. Nếu cần số Amazon/Etsy thật → dùng Claude in Chrome (Amazon chặn web_fetch, trả rỗng).
2) Ngày Bangkok: `TZ=Asia/Bangkok date +%Y-%m-%d` (+ dd/mm).
3) CLONE:
```
TOKEN='<fine-grained PAT: Repository access = GerberaPrints/foxera-daily + Contents: Read and write>'
git config --global user.email "bot@genusfaith.local"; git config --global user.name "GenusFaith Bot"
rm -rf /tmp/fxrepo && git clone "https://x-access-token:${TOKEN}@github.com/GerberaPrints/foxera-daily.git" /tmp/fxrepo
```
Đọc `/tmp/fxrepo/genusfaith-daily.json` (hôm qua) để so "mới" vs "không đổi".
3b) `tail -n 3 /tmp/fxrepo/genusfaith-metrics.jsonl` — snapshot ngày trước để tính delta B7.
4) RESEARCH đa nguồn (metric THẬT, USD, cross-check khi có thể):
   • WEBSITE/xu hướng: web/Pinterest/Google "catholic gifts", handbag trend, quiet luxury, liturgical season.
   • AMAZON (locale US): search "catholic handbag/tote", "our lady ... bag", "catholic gifts for women" → BSR, **listing rv**, giá USD, seller nổi.
   • ETSY (US/USD): market/best-seller cho catholic bag/tote/gift → **shop sales** + **listing rv** (tách bạch), tag, title.
   • COMPETITOR RADAR (B7): quét product/collection từng đối thủ DTC — Feratia, Blessac, Catholight, JesusSpirit, Afroyla. Mỗi đối thủ TOP-3: {brand, label, reviews+nhãn, price_anchor_usd, price_now_usd}.

   7 KHỐI (ALL-LIGHT — đủ 7 khối mỗi ngày):
   • B1 Keyword & Sản phẩm: cụm search đang lên (EN + ES) + feast/mùa phụng vụ tới + Top việc hôm nay.
   • B2 Niche Deep-Dive (1–2 nhánh tín hiệu mới): money-anchor + bằng chứng cầu + listing-ready (title / giá tier / 13 tags) + 1 dòng `Cạnh tranh:`.
   • B3 Idea Bank & Brief.
   • B4 Format/SP mới nổi: size/tier, personalization, **bundle bag+wallet**, gift-box, church-functional, real-photo.
   • B5 Niche mới + kết hợp: N1–N7 (Anglo, Hispanic, Black Catholic, Mother, Grief/Memorial, Modern, Scripture), B2B parish, **Confirmation/RCIA**, feast-day calendar.
   • B6 Evergreen Theme Bank = KHO tham chiếu; cập nhật khi biến động mạnh, còn lại "không đổi".
   • B8 KHO ASIN/LISTING (đào ý tưởng): mỗi ngày thu ASIN thật + Etsy listing/shop → {asin, title, reviews_listing, price_usd, link}. Rút CÔNG THỨC (title pipe-separated · tên Latin+tagline · BỘ bag+wallet · double-sided 3 size · devotion ngoài Guadalupe · occasion). Kết bằng 2–3 IDEA MỚI dùng SKU sẵn có. Cách lấy ASIN hàng loạt: Chrome javascript_tool → querySelectorAll('div[data-asin]'). Ghi kèm link search BỀN vì ASIN hay chết.
   • B7 COMPETITOR & MARKETPLACE RADAR: Top-3/đối thủ + velocity. Mở bằng "🧭 Cấu trúc thị trường" (2 cụm operator). Tin B7b = Marketplace (Etsy top + Amazon top). Cuối B7 ghi "👉 Chốt:".
     VELOCITY: so {brand,label} với `genusfaith-metrics.jsonl` ngày trước → "▲ +N rv/X ngày" · "▬ đứng" · "🆕 mới lọt top". Thiếu dữ liệu → "baseline". KHÔNG bịa delta.

   NICHE / THEME WATCH-LIST (Công giáo — luân phiên, ưu tiên cái đang mùa/feast):
   - Archetypes: A Marian Devotional · B Sacred Heart/Christ · C Devotional Mood (⭐ top ~33% doanh số) · D Scripture Promise · E Seasonal.
   - Marian (Litany of Loreto): Regina Caeli, Stella Maris, Stella Matutina, Rosa Mystica, Mater Dolorosa, Regina Pacis, Sedes Sapientiae, Refugium Peccatorum, Mediatrix Gratiae, Auxilium Christianorum, Turris Davidica, Ianua Caeli.
   - Sacred Heart: Cor Iesu Sacratissimum · **Cor Mariae Immaculatum** (tháng 8).
   - Guadalupana (Hispanic) · Panis Angelicus (First Communion) · Sancta/Sagrada Familia (wedding/family) · Deus Caritas Est · Requiescat in Pace (memorial) · Matrimonium Sacramentum · Regina/Mater Africae (Black Catholic).
   - Personas P1 Marian(35%) P2 Guadalupana(25%) P3 Devotional P4 Memorial P5 Sacrament P6 Modern.
   - Directions: A Western Catholic (rustic ≤$142) · B Modern Editorial (cream+watercolor $159–199) · Mix Elegant Boutique (champagne-gold $139–179, mặc định).

   LỊCH PHỤNG VỤ US forward: 15/08 Assumption · **Tháng 8 = Immaculate Heart of Mary** · 08/09 Nativity of Mary · 15/09 Mater Dolorosa · Tháng 10 Holy Rosary · 01–02/11 All Saints/All Souls · Christ the King (cuối 11) · Advent · 08/12 Immaculate Conception · 12/12 Guadalupe · Christmas. **Q4 = mùa quà lớn nhất.**

5) VĂN PHONG: mỗi mục 1 dòng VIBE/hook + emoji; mỗi khối kết "👉 Chốt:". GIỮ NGUYÊN BẢN GỐC (không dịch) tên mẫu/thiết kế, tên feast, danh hiệu Latin, title/tags tiếng Anh, thuật ngữ marketing.
6) Mỗi khối: có tín hiệu mới → mảng tin (HTML Telegram chỉ `<b>,<i>,<code>`; KHUNG Việt/DATA Anh; mỗi tin **<3900 ký tự**; escape `&,<,>`). Không mới → 1 tin `⏸ <b>Khối X — {tên}</b>\nKhông đổi so với hôm qua (dd/mm).`
7) GHI FILE (namespace genusfaith — KHÔNG đụng file job khác):
   a) `/tmp/fxrepo/genusfaith-daily.json`:
      `{"date":"YYYY-MM-DD","locale":"US ZIP 10001 / USD","blocks":{"B1":[...],...,"B7":[...],"B8":[...]}}`
      Kiểm tra: `python3 -c "import json;json.load(open('/tmp/fxrepo/genusfaith-daily.json'))"`
   b) APPEND 1 dòng vào `/tmp/fxrepo/genusfaith-metrics.jsonl`:
      `{"date":"...","locale":"US/USD","snapshots":[{"src":"dtc|etsy|amazon","brand":...,"label":...,"reviews_listing":N,"reviews_shop":N,"shop_sales":N,"price_anchor_usd":...,"price_now_usd":...,"note":...}]}`
8) PUSH + HEALTH-CHECK (⚠️ chỉ 2 file, luôn rebase):
```
cd /tmp/fxrepo
git add genusfaith-daily.json genusfaith-metrics.jsonl   # KHONG dung -A hay .
git commit -m "genusfaith daily $(TZ=Asia/Bangkok date +%F)"
git pull --rebase origin main
git push origin HEAD:main
```
   HEALTH-CHECK: `git ls-remote origin -h refs/heads/main | cut -f1` == `git rev-parse HEAD` → OK.
   Push 403/không khớp → FAIL, báo NGAY trong run-summary:
   *"GenusFaith push FAILED — PAT thiếu Contents: Read and write cho **GerberaPrints/foxera-daily**. Nội dung đã commit local nhưng chưa lên repo → GAS/Telegram không nhận bản hôm nay. FIX: cấp lại fine-grained PAT rồi cập nhật TOKEN trong task."*
   Thử lại đúng 1 lần trước khi báo. Chỉ dùng git (REST API bị chặn ghi). **Không bao giờ `--force`.**
9) TM-SAFE / theological (BẮT BUỘC): Latin/scripture public-domain OK; TRÁNH wordmark bản dịch (NIV®/ESV®), lyrics worship bản quyền (Hillsong, **"Way Maker"** — Blessac có SKU "Waymaker", ta KHÔNG dùng), logo giáo xứ, nhân vật/cartoon bản quyền. Icon ĐÚNG phụng vụ: Guadalupe CẤM agave/maguey (N2-FIX-01); Immaculate Heart = **1 gươm** (KHÔNG 7 gươm — đó là Mater Dolorosa). Global forbidden: mandala, celtic knot, **butterfly/dragonfly cluster**, teal-dominant bg, watercolor florals loose, wood-grain, galaxy, Disney/cartoon, prosperity-gospel typography, Pinterest-minimalism, pastel-only. Catholic Strict Lock: KHÔNG generic-Bible-verse-on-bag, KHÔNG thẩm mỹ Protestant. Pro-life/patriotic/chính trị → "watch" thận trọng cho ads (organic/email trước).
10) KẾT: in tóm tắt khối MỚI / KHÔNG ĐỔI + commit hash + trạng thái health-check. Kết thúc bằng `<run-summary>1–2 câu (nêu rõ nếu push FAIL)</run-summary>`.

---

## 📌 BASELINE ĐÃ XÁC MINH 15/07 (USD, locale US) — dùng để tính delta ngày 16/07

### Trần giá marketplace (số quan trọng nhất)
| Sàn | Cao nhất | Mặt bằng |
|---|---|---|
| Etsy | **$58.00** (canvas, 0–1 listing rv) | $18–28 |
| Amazon | **$54.95** (Guadalupe leather) | $25–46 |
| GenusFaith | $135 / $180 / $220 | — |
→ **Gấp 2,5–5 lần trần sàn. Không có bằng chứng cầu >$58 trên marketplace.** Giữ tier cao cho DTC.

### DTC
| Brand | Listing | Reviews | Giá USD |
|---|---|---|---|
| Feratia | Gratia / Regina / Rosaria | 368–369 **(shop rv)** ▬ | $142.95 → **$57.18** (SUMMER26) |
| Feratia | SOLD OUT: Amoris · Serena · Eucharist | — | 3/21 SKU |
| Blessac | Faith Leather Tote | 777 **(shop rv)** ▬ | $131.95 → **$59.37** |
| Catholight | Sacred Heart of Grace | 139 **(listing rv)** ▬ | $150 → **$89.95** (SMALL sold out) |
| Catholight | Lady Of Mount Carmel Tote | 26 **(listing rv)** 🆕 | $118 → **$99.95** |
| Afroyla | Godfidence | 1699 **(shop rv)** baseline | $249.95 → $124.97 |

### Amazon
| Listing | Reviews | Giá USD |
|---|---|---|
| BLESSAC Bible Leather Handbag (**Amazon's Choice**) | 73 (listing rv) | **$51.95** (typical $55.95) |
| BLESSAC Vegan Leather Tote `B0FTYS8W3V` | 28 (listing rv) | **$45.95** (typical $49.95) |
| ↳ 🚨 BSR **#317.010 Office Products · #406 Padfolios · #6.286 Women's Tote Handbags** — **MISCATEGORIZED vào Padfolios** | | |
| Jesuspirit `B0CD7QHXM1` | 81 (listing rv) | **Currently unavailable** · BSR **#1.739.251** |
| Jesuspirit `God Says I Am` `B0D14J57RG` | 195 (listing rv) | ~$46 |
| Custom Catholic Virgin Mary Leather Bag (personalized) | 16 (listing rv) | **$14.95** |
| Virgin Mary Handbag **+ Matching Wallet SET** | 5 (listing rv) | **$28.93** |
| Western Rhinestone Cross **+ Trifold Wallet SET** | **354 (listing rv)** | ~$66 |
| Embroidered Cross 2 Cor 12:9 **+ Wallet SET** | **351 (listing rv)** | ~$66 |
→ Search counts (US): `catholic leather handbag virgin mary` **1.000+** · `jesus leather bag for women` **425**

### Etsy
| Shop | Sales | Shop rv | Listing nổi |
|---|---|---|---|
| GratiaDesignCoShop | **23.200** | 3.9k | 169 items, **đúng 1 tote** ($20). Lõi = thiệp **$5.50** |
| OutrageousMom | **11.600** | 2.5k | Patroness of America tote **$58** · **0–1 listing rv** · last sold 31/05 |
| GUADALUPECLOTHING | **5.759** | 1.4k | 100% apparel · tee ~$27.75 · **50% OFF church groups/bulk** · **87 items Confirmation** |
| SanctifiedSouls | **5.100** | 1k | Mount Carmel tote **$22.50/$30/$37.50** · **0 listing rv** · POD · AI art |

### 5 đính chính đã ghi nhận (đừng lặp lại)
1. "Patroness of America 2.5k rv" → 2.5k là **shop rv**; listing = 0–1.
2. "Mount Carmel tote mới lọt top" → **0 listing rv**, POD, AI art.
3. "Amazon Catholic leather = 6 kết quả, white space" → **locale VN**; thật là **1.000+**.
4. "Không ai làm personalization ngách Công giáo" → đúng cho **DTC**, SAI cho **Amazon** (table stakes, $14.95–$42.95).
5. "B2B giáo xứ chưa ai chạm" → **GUADALUPECLOTHING 50% off church groups**.

### 3 kết luận sống sót (ưu tiên khai thác)
1. **Lỗ hổng category Blessac** — vào Amazon đúng `Women's → Handbags → Totes` = ăn organic browse họ bỏ.
2. **BỘ bag+wallet** — 2 listing rv cao nhất toàn ngách (354/351) đều là set, gấp ~5 lần Catholic cao nhất (73). GenusFaith đã có LH- + LW- → đóng bộ là việc rẻ nhất, bằng chứng mạnh nhất. ⚠️ Lấy FORMAT, không lấy design.
3. **Tần suất > giá trị đơn** — GratiaDesignCo 23,2k sales bằng thiệp $5.50. Cần dòng tần suất cao (prayer card, thiệp feast, rosary pouch). Catholight đã đi trước (Rosary Pouch, Keychain, Jewelry).
