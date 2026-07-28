# GritFell Daily Updater — QUY TRÌNH v5.3 (Trend→Design Arbitrage + CẦN CHÚ Ý)

**Lập 28/07/2026.** v5.3 = v5.2.1 + 3 nâng cấp, nguồn gốc: **bài học chéo từ dự án FoxEra/Etsy (phiên 28/07)**.
GAS `gritfelldaily-v2.gs` GIỮ NGUYÊN — vẫn đúng 7 sender B1–B7 (`fxSendBlock1..7`). **KHÔNG thêm khối mới.**

---

## 0. Bài học FoxEra — và bản dịch sang GritFell

Phiên FoxEra hôm nay kết luận: chạy theo "lấy trend TikTok → bán sang FB/Google/sàn" là **motion của dropship** (thắng bằng tốc độ nguồn hàng + giá), và khi một tín hiệu đã lọt vào listicle "Top 15 products 2026" thì **cửa arbitrage đã đóng**. Bản đúng cho một brand có ADN riêng là **TREND → DESIGN**, không phải TREND → PRODUCT.

Bản dịch sang GritFell — 5 điểm:

| # | Bài học FoxEra | Bản GritFell |
|---|---|---|
| 1 | Trend→product = sân dropship, mất moat | GritFell KHÔNG đua **format** đối thủ (hoodie/quarter-zip/ladder promo). Moat = **species specificity + naturalist art (K2) + field-to-town + độ chính xác cảm xúc cho Megan**. Arbitrage đúng: **MOMENT/LOÀI đang nóng → DESIGN**, không phải **format đối thủ → SKU**. B2/B4 vẫn đọc format (intel supply-side hợp lệ) nhưng KHÔNG được biến thành đề xuất SKU chỉ vì "đối thủ đang đẩy". |
| 2 | Tín hiệu đã vào listicle = tín hiệu chết | GritFell: tín hiệu đã lên homepage **≥3/11 brand** trong radar = cửa đóng (LATE). Ngược lại, tín hiệu ở tầng **primary/regulation/editorial** (TPWD, IGFA, F&S, OL, fishing report) mà **0 brand** chạy creative = cửa mở. Bot ĐANG bắt được loại này rất tốt (dove 1/9: 0/11 brand, 35 ngày) nhưng **chưa chấm điểm**, nên nó nằm lẫn với tin nền và không ai biết nó đáng giá hơn tin khác. v5.3 sửa đúng chỗ đó. |
| 3 | Phụ kiện thắng full apparel trên TikTok/FB (không rủi ro size/return; tiêu chí #1 = "visually demonstrable") | GritFell có sẵn **hat $34** = đúng tầng phụ kiện, và **thêu** = đúng thứ "visually demonstrable" (chỉ bắt sáng khi xoay — texture-in-motion 5–15s). Song song FoxEra: **button shirt/polo = ván Shopify + gift (Megan) · hat thêu = ván FB/TikTok**. ⚠️ Nguồn của luận điểm này là 1 bài agency (Darkroom, carry từ phiên FoxEra 28/07) — nhãn **"tham khảo SEO/agency, chưa đối chứng cho ngách outdoor"**. KHÔNG được nâng lên fact khi chưa có nguồn thứ 2 hoặc dữ liệu chạy thật. |
| 4 | Radar cũ chỉ bắt "đang nóng", không chấm độ sớm & khả năng chuyển kênh | B7 GritFell cũng đúng lỗi đó: tường thuật "bass wave ngày 3", "whitetail scouting" rồi dừng. v5.3 thêm **cổng chấm điểm 4 tiêu chí + độ sớm**, và bắt buộc ra **1 output cụ thể** (ý tưởng hat thêu listing-ready + 1 angle video), hoặc **null trung thực**. |
| 5 | Meta MCP re-auth → chấm cầu bằng audience-size thật thay vì đoán từ hype | Session GritFell có `MCP_Facebook_Ads` (gồm `ads_library_search`) nhưng **CHƯA authorize**. Nếu người authorize: thay được **manual snapshot Meta Ad Library** (đã nhắc từ 21/07, 8 ngày chưa ai dán) bằng dữ liệu tự động. Xem bước 3f. |

**Quan sát nội bộ hỗ trợ điểm 3 (nhãn INTERNAL_OBSERVED, mẫu NHỎ):** cửa sổ 30 ngày gần nhất đọc được (25–27/07) = 7 đơn, top products toàn **button shirt + swim short**, **0 hat**. Mẫu 7 đơn quá nhỏ để kết luận "hat không bán được" — chỉ đủ để nói **tầng phụ kiện đang chưa được chơi**. Không dùng số này làm bằng chứng velocity thị trường (luật KỶ LUẬT NỘI BỘ).

---

## 1. Nâng cấp A — Engine TREND→DESIGN ARBITRAGE (nằm TRONG B7)

**Vì sao không phải khối mới:** GAS v2 chỉ có sender B1–B7. Muốn có khối B8 riêng thì phải sửa `gritfelldaily-v2.gs` (thêm `fxSendBlock8` + time-driven trigger) TRƯỚC — việc của người. Trong khi chờ, engine sống ở **cuối B7**, sau mục HOOK.

### Nguồn đầu vào (ưu tiên tầng sớm → muộn)
1. **Primary/regulation** (TPWD & cơ quan bang, IGFA) — sớm nhất, gần như chưa brand nào phản ứng.
2. **Editorial daily** (outdoorlife.com, fieldandstream.com, themeateater.com, wideopenspaces.com, gearjunkie.com theo lịch thứ) — sớm vừa.
3. **Fishing report vùng** (Gulf AL, NW FL) — tín hiệu loài đang cắn, rất sớm nhưng rất địa phương.
4. **Google Trends RSS** — bắt moment ngoài ngành tràn vào.
5. **Manual snapshot / Meta Ad Library** (nếu 3f chạy) — tầng muộn, dùng để **xác nhận cửa đã đóng hay chưa**, KHÔNG dùng để tìm ý mới.
6. ❌ **Listicle / "best products 2026" / aggregator SEO** — theo bài học FoxEra: đọc để biết cửa ĐÃ ĐÓNG, tuyệt đối không lấy làm nguồn ý tưởng.

### Cổng chấm điểm — 4 tiêu chí + độ sớm

Mỗi tín hiệu ứng viên chấm **S · E · A · C** (mỗi cái PASS/FAIL) rồi **T** (độ sớm, 1–5):

| Mã | Tiêu chí | PASS khi |
|---|---|---|
| **S** | **Species/scene cụ thể** | Dịch được thành 1 chủ thể cụ thể theo luật hard sub-niche (01 §6): "drake mallard banking into flooded timber" ✅ — "duck" ❌, "hunting season" ❌, slogan/pun ❌ |
| **E** | **Thêu được** | Sống ở 7×13 cm, 3 màu chỉ (4 nếu có "money detail"), ~3–4K mũi, line ≥4–5 mm, không gradient/blur; chọn được stitch style K1–K5 (01 §7) |
| **A** | **Tầng phụ kiện** | Chạy được trên **hat** (không rủi ro size/return → đẩy FB/TikTok được). Nếu CHỈ sống trên shirt → không FAIL cả tín hiệu, nhưng đánh dấu `tier: site/gift` thay vì `tier: social` |
| **C** | **Sạch** | Không camo bản quyền (Realtree/Mossy Oak), không logo/team licensed (gameday), không nhân vật/IP, không claim hiệu năng bịa; nếu tín hiệu gắn ngày mùa vụ thì ngày phải khớp nguồn primary |

**T — độ sớm (quyết định có đáng làm không):**

- **T5** — mới ở tầng primary/regulation hoặc fishing report, **0/11 brand** chạy creative, editorial cũng chưa nói → cửa rộng nhất.
- **T4** — editorial đã nói (1–2 bài), 0 brand creative.
- **T3** — 1–2 brand đã chạm.
- **T2** — 3+ brand đã chạm → cửa hẹp, chỉ vào nếu GritFell có góc species-art khác biệt rõ.
- **T1** — đã vào listicle/roundup/"trending products" → **LATE, LOẠI.** Ghi 1 dòng lý do loại, không phát triển tiếp.

### Output bắt buộc mỗi ngày

Tín hiệu nào **S·E·C đều PASS và T≥3** thì ra:
1. **1 ý tưởng hat thêu listing-ready:** tên SP (giọng doctrine) + chủ thể cụ thể + stitch style (K1–K5) + 3 màu chỉ từ palette (01 §5) + placement + 1 dòng vì sao Megan hiểu ngay.
2. **1 angle video 5–15s "texture-in-motion"** cho FB/TikTok: cảnh mở, chuyển động làm chỉ thêu bắt sáng, 1 câu hook giọng GritFell, CTA.
3. Nhãn `tier: social` (chạy được hat) hoặc `tier: site/gift` (chỉ shirt).

**LUẬT NULL:** ngày không có tín hiệu nào qua cổng → ghi thẳng **"0 tín hiệu qua cổng hôm nay"** + 1 dòng nêu ứng viên gần nhất trượt ở tiêu chí nào. **Thà null còn hơn ép ý** — đúng tinh thần "null trung thực" đang áp cho Google Trends RSS.

**Trần ý tưởng:** ý arbitrage tính vào **trần 3 ý 🟢/ngày** toàn báo cáo (không phải hạn ngạch riêng). Re-score ý cũ không tính.

**Cổng duyệt người giữ nguyên:** ý tưởng design = bot được đề xuất + add vào `gritfell-decisions.json`. Đổi **giá/offer/claim/chạy ads** = vẫn CẦN NGƯỜI DUYỆT, bot không tự quyết.

---

## 2. Nâng cấp B — 📌 CẦN CHÚ Ý cuối mỗi khối (BẮT BUỘC)

Từ v5.3, **mọi khối B1–B7** kết theo đúng thứ tự 3 phần:

```
👉 <b>Chốt:</b> …            ← kết luận 1-2 câu (đã có từ v5)
📌 <b>CẦN CHÚ Ý:</b>          ← MỚI, 2-4 gạch đầu dòng
• <việc người> …
• <số/mốc cần theo dõi + ngày> …
• <rủi ro / cái đang thiếu> …
🔗 <b>Nguồn:</b> …
```

Luật viết mục 📌:
- Chỉ đưa thứ **hành động được hoặc theo dõi được**. Không nhắc lại nội dung khối.
- Ưu tiên theo thứ tự: (a) **việc cần người làm** (duyệt, authorize, dán snapshot), (b) **mốc/đếm ngược** (kill_date, opener, ngày re-verify), (c) **cái đang bị chặn/thiếu**.
- Khối "⏸ Không đổi" **vẫn phải có** 📌 — tối thiểu 1 dòng (vd: "không có việc gì cần làm ở khối này hôm nay").
- Mỗi dòng ngắn, có số/ngày nếu có.

---

## 3. Nâng cấp C — Bước 3f: Meta Ad Library qua MCP (CÓ GUARD)

Chèn sau bước 3e (Shopify), **cùng kiểu guard**:

1. Thử **1 lần** `mcp__MCP_Facebook_Ads__ads_library_search` (hoặc tool tương đương) cho 2–3 brand trong rotation hôm nay.
2. **Lỗi / chưa auth / không có tool** → B7 ghi đúng **1 dòng ⛔️**: "Meta Ad Library MCP chưa authorize — cần người bật trong claude.ai connector settings" rồi BỎ QUA. **KHÔNG thử lại nhiều lần trong 1 phiên, KHÔNG chạy OAuth** (phiên scheduled không có người bấm).
3. **Chạy được** → dùng cho B7 với nhãn **"Meta Ad Library (live dd/mm)"** — đây là tầng (a) live, được phép, khác hẳn nhãn "manual snapshot". Ghi: số ads active, hook tiêu biểu (trích NGẮN), format, ngày started.
4. Khi 3f chạy được ổn định → mục "manual snapshot" trong B7 hạ xuống **tùy chọn** (chỉ còn dùng cho IG/TikTok quan sát tay). Ghi kết quả test vào `metrics.note` mỗi lần.

⚠️ Vẫn giữ nguyên luật: **KHÔNG fetch trực tiếp** TikTok/IG/Reddit/YouTube/Meta Ad Library bằng WebFetch (đã test chặn 24/07). MCP là đường khác, không phải WebFetch.

---

## 4. Worked example — B7 ngày 28/07 nếu chạy bằng v5.3

*(Dùng đúng dữ liệu đã verify live 28/07 — để bot ngày mai biết hình dạng output. Không phải dữ liệu mới.)*

```
🎯 TREND→DESIGN ARBITRAGE (28/07)

Ứng viên 1 — "Whitetail summer scouting" (F&S hunting index, live 28/07)
S ✅ (chủ thể cụ thể hoá được: velvet buck bước ra bìa đậu tương, first light tháng 8)
E ✅ (K2 cross-hatch — default cho deer theo 01 §7; 3 chỉ: Iron Charcoal / Aged Tan / Bone White)
A ✅ hat được → tier: social
C ✅ (không camo bản quyền, không licensed)
T4 — editorial đang đẩy mạnh, 0/11 brand chạy creative scouting
→ RA OUTPUT:
  • Hat idea: "VELVET DAYS" — velvet buck nhìn nghiêng, bìa ruộng, K2, 3 chỉ,
    front 7×13cm tonal. Megan hiểu ngay: chồng cô ấy đang đi soi buck từ tháng 7.
  • Video 5–15s: macro chỉ thêu nhung gạc xoay dưới nắng chếch → pan lên mũ đội
    trên nóc xe bán tải lúc first light. Hook: "He's been watching this buck since July."
    CTA: shop the hat.

Ứng viên 2 — "Numbered species drop" (FF x TU sold out, live 28/07)
→ KHÔNG qua cổng: đây là MECHANICS bán hàng, không phải tín hiệu design.
   Đã nằm đúng chỗ ở ledger (NUMBERED-SPECIES-DROP-2026). Không tính trần 🟢.

Ứng viên 3 — "Back-to-school / gameday moment" (Huk, BURLEBO, Poncho)
→ LOẠI: C ❌ (gameday = licensed) + T2 (3 brand đã chạm) + ngoài doctrine.
```

---

## 5. Self-check v5.3 (thay mục (d) cũ)

Trước push, theo thứ tự:

- **(a)** JSON hợp lệ: `python3 -c "import json;json.load(open('/tmp/gfrepo/gritfell-daily.json'))"` (+ decisions.json / internal.jsonl nếu sửa)
- **(b)** `"date"` == hôm nay giờ Bangkok
- **(c)** đủ 7 khối B1..B7
- **(d)** mỗi khối có **≥1 dòng `🔗 Nguồn:`** VÀ **≥1 mục `📌 CẦN CHÚ Ý:`** ← *mới v5.3*
- **(e)** khối yên = "⏸ Không đổi" + vẫn có 📌, KHÔNG rỗng
- **(f)** B7 có mục arbitrage: hoặc ≥1 tín hiệu đã chấm điểm, hoặc dòng null trung thực

---

## 6. Ghi chú vận hành

- Namespace ghi file KHÔNG đổi: `gritfell-daily.json` · `gritfell-metrics.jsonl` · `gritfell-decisions.json` · `gritfell-internal.jsonl`. `gritfell-social-snapshot.md` vẫn là file NGƯỜI ghi.
- Muốn tách arbitrage thành khối riêng (B8) → **sửa GAS trước**, rồi mới sửa prompt. Không tự thêm khối vào JSON: GAS v2 không có sender cho nó, tin sẽ rơi mất.
- Việc người còn treo tính đến 28/07: (1) **authorize lại Shopify connector → chọn store GritFell** (đang trỏ nhầm Genus Faith); (2) **authorize MCP_Facebook_Ads** (mở khoá 3f); (3) duyệt/từ chối 2 item trong ledger (OPENER-CAPSULE-2026 kill 07/08 · NUMBERED-SPECIES-DROP-2026 kill 21/08).
