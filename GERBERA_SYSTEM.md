# GerberaPrints — THỐNG KÊ HỆ THỐNG BOT
**Chốt ngày 31/07/2026 · nguồn sự thật cho mọi phiên sau (áp LUẬT 8.1: registry trước, report sau)**

---

## 1. BẢN ĐỒ 3 VAI (LUẬT 8.5)

| Vai | Nơi chạy | Giờ | Việc | Sản phẩm |
|---|---|---|---|---|
| **FETCH** | PC nhà (Task Scheduler) | 06:45 | Quét feed/collection T1 — nơi cloud bị chặn | `gerbera-live-fetch.json` |
| **MERGE + GÁC CHẤT LƯỢNG** | Cloud (task `[Gerbera·Trend] Research`) | 07:15 | So delta, áp 8 luật, viết 11 khối | `gerbera-market.json` + `gerbera-metrics.jsonl` |
| **HIỂN THỊ** | GAS v3.9 (project Gerberaprints CRM) | 07:00–10:00 | 7 nhịp Telegram + đo ads/store live | Tin nhắn group "GP - Report Ads Daily" |

**Vì sao tách 3 vai:** cloud phiên tự động bị `PROVENANCE_REQUIRED` 11 ngày liên tiếp (21–31/07) → không fetch được. PC có IP dân cư, không bị chặn. GAS có quyền đọc sheet CRM + Graph API mà 2 vai kia không có. Vai nào chết thì 2 vai kia vẫn chạy (carry số cũ ghi rõ mốc).

---

## 2. LỊCH 7 NHỊP TELEGRAM (GAS v3.9)

| Giờ | Hàm | Nội dung | Nguồn |
|---|---|---|---|
| 07:00 | `gpSlot1Ads` | **Ads GP** — 6 TK Meta + Google Ads | LIVE Graph API + sheet → Claude |
| 07:30 | `gpSlot2Store` | **Store & Kết quả** — doanh thu/đơn/AOV/MER nhịp 1d·3d·7d | NATIVE sheet CRM (không qua AI) |
| 08:30 | `gpSlot3Market` | Market B1·B2·B3 — keyword, competitor radar, social signals | `gerbera-market.json` |
| 09:00 | `gpSlot4Ideas` | Market B4→B8 — deep-dive ngách, idea bank, format, evergreen, Etsy/Amazon | `gerbera-market.json` |
| 09:30 | `gpSlot5Rival` | Market B9 (ads đối thủ) + **Hook** (từ SKU bán thật) + **Hệ thống** | JSON + sheet `SKU Raw Data` |
| **09:45** | `gpSlot6Video` | **Market B10 — Video Trends TikTok/IG** *(mới 31/07)* | `gerbera-market.json` |
| **10:00** | `gpSlot7Moves` | **Market B11 — Động tĩnh đối thủ** *(mới 31/07)* | `gerbera-market.json` |

Mỗi nhịp là 1 execution độc lập — nhịp này chết KHÔNG kéo nhịp kia chết. Kết quả từng nhịp ghi vào Script Properties, nhịp 09:30 đọc lại để tổng kết.

---

## 3. BOT LÀM NHỮNG VIỆC GÌ

### 3.1 Vai FETCH (PC · `gerbera_fetch.py` v1.1.1) — 15 nguồn/lần
- **6 feed `products.json`** (Bogey Bros · Bad Birdie · Swannies · Pins & Aces · Shank It · U Suck) → phát hiện drop 48h (`created_at`/`published_at`) + sold-out theo cấp variant/product
- **3 collection core** → tính **giá anchor = mode** của dòng polo (đúng LUẬT 2: anchor KHÔNG lấy từ feed limit=N)
- **6 `collections.json`** → nguyên liệu cho B11 (collection mới, promotion, tín hiệu sớm)
- Tolerant parse cho feed bị cắt (Pins & Aces) · TLS 3 tầng · lỗi lẻ ghi vào `errors[]` vẫn chạy tiếp

### 3.2 Vai MERGE (Cloud · 11 khối)
| Khối | Nội dung |
|---|---|
| B1 | Keyword & mùa vụ + đếm ngược giải + cảnh báo TM |
| B2 | Competitor radar — thang giá T1, vị trí GP $54.95, drop 48h, sold-out, delta |
| B3 | Social & search signals + khe trống (phải có bằng chứng cầu) |
| B4 | Niche deep-dive — **vòng xoay 7 ngách theo thứ** (NSFW nam · nữ · bộ tứ · corporate · mùa vụ · uống&golf · retro) |
| B5 | Idea bank — mỗi ý có neo golf + SKU/giá + bằng chứng + 🟢🟡🔴, trần 3 ý 🟢/ngày |
| B6 | Định dạng SP & SP đối thủ đang thắng (học công thức, KHÔNG sao chép design) |
| B7 | Evergreen bank — DNA: NSFW distance-reveal + seamless all-over |
| B8 | Listing/ASIN Etsy & Amazon (link bền, 2 sàn chặn fetch) |
| B9 | Ads đối thủ & hook — ưu tiên báo ngành hơn spy-tool, hook kèm mức policy L0–L3 |
| **B10** | **Video trends TikTok/IG** — 2–4 format/ngày để team quay lại, bắt buộc có link dẫn chứng *(mới 31/07)* |
| **B11** | **Động tĩnh đối thủ** — SP/collection/blog/promotion mới *(mới 31/07)* |

### 3.3 Vai HIỂN THỊ (GAS — việc riêng, không trùng cloud)
- **Ads GP live**: 6 TK Meta, campaign-level rồi tự cộng (để lọc được brand khác), nhịp 1d/3d/7d + suy cửa sổ ngày 4–7 bằng phép trừ
- **Store native**: doanh thu · đơn · AOV · MER — tính trong code, AI không chạm nên không thể bịa số
- **Hook đề xuất**: đọc sheet `SKU Raw Data`, xếp hạng theo **UNITS** (miễn nhiễm giảm giá & B2G1)
- **Creative audit**: bóc body/title/CTA thật của top ad + gắn cờ (BODY_EMPTY, POLICY_RISK, TYPO_SPACING…)
- **Health**: tổng kết 7 nhịp, tố cáo khối lạ chưa khai nhịp, cảnh báo data cũ

---

## 4. CẢI TIẾN THEO MỐC

### 4.1 GAS: v3 → v3.9 (17/07 → 31/07, 10 bản)
| Bản | Cải tiến | Lỗi thật đã sửa |
|---|---|---|
| v3 | Gộp 2 file GAS làm một | 2 file chạy song song, 5 trigger cũ bắn trùng |
| v3.1 | Lọc "GER" theo **ranh giới từ** | `CONTAIN 'GER'` nuốt luôn Bur**ger**/Gin**ger**/Ham­bur**ger** → chi GritFell tính nhầm sang Gerbera |
| v3.2 | Gom mọi block `type='text'` | `content[0].text` = undefined khi có block thinking → tưởng LLM hỏng |
| v3.3 | **Tắt hẳn thinking**, max_tokens 5000→16000 | Model tự bật thinking, đốt sạch token, dừng trước khi viết được chữ nào |
| v3.4 | Retry LLM 4 lần (429/529/5xx) | HTTP 529 Overloaded → mất báo cáo cả ngày, không ai canh |
| v3.5 | **Đọc `gerbera-market.json`** + gửi MỌI khối, không lọc cứng | File push đều mỗi ngày suốt nhiều tuần mà **KHÔNG AI ĐỌC** |
| v3.6 | Dời market 07:30 → **08:30** | Race condition: GAS đọc lúc task chưa push xong → đổ oan "task fail" |
| v3.7 | **5 nhịp** + sửa thước BE ROAS **1.0 → 1.45** | Mọi ad ROAS 1.0–1.45 đang bị coi là LÃI, thực tế LỖ |
| v3.8 | Top SKU từ `SKU Raw Data`, xếp theo **UNITS**; nhịp 1d/3d | Xếp theo gross = tự bơm điểm B2G1 (món tặng vẫn mang price) rồi khuyên scale nhầm |
| **v3.9** | **7 nhịp** (+B10 09:45, +B11 10:00), health "⏳ chưa tới giờ", fix placeholder escape tường minh | Placeholder ký tự thô bị mất khi copy/paste → mọi con số trong tin bị thay nhầm thành thẻ HTML |

### 4.2 Cloud task — 8 luật dữ liệu tích luỹ
| Luật | Nội dung | Giá đã trả |
|---|---|---|
| 1 | Chốt locale US/USD trước mọi số | GenusFaith 14/07: locale VN → Amazon trả 6 kết quả → kết luận nhầm "white space", thật là 1.000+ (sai 100 lần) |
| 2 | `limit=N` trả SP MỚI NHẤT, không phải dòng core | 15/07: Bad Birdie ghi $78 (SKU archive-sale), thật là $88 → lệch cả thang giá T1 |
| 3 | Nhãn cấp độ sold-out: variant hay product | "SP sold-out" ≠ "hết 4/5 size" |
| 4 | Giảm giá thật vs giả (`compare_at` > `price`) | Nhiều brand set compare_at = price |
| 5 | Không suy "khe trống" từ vắng mặt đối thủ | 15/07: kết luận khe giá $27–32 từ việc ít người bán — ít người bán có thể vì KHÔNG CÓ CẦU |
| 6 | Ý tưởng có **hạn sử dụng** (≤3 ý 🟢/ngày, treo ≥3 ngày → 🟡) | Khối ý tưởng biến thành bãi chữ đẹp không ai làm |
| 7 | Số bên thứ 3 không đổi ≠ đối thủ đứng yên | Bad Birdie "108 ad ACTIVE" y hệt nhau 3 ngày liên tiếp = trang tĩnh; text lỗi Pipeboard nói sai 3 lần |
| **8** | **Bài học FoxEra** (31/07): registry trước · provenance+carry · quy tắc 2 lần liên tiếp · người đối chiếu số máy · chia 3 vai · trạng thái phải có bằng chứng | Alert ma do flap; parser đọc 4.1 thành 4.0 |

**Cải tiến cấu trúc khác:** gộp 2 task thành 1 (18/07 — xoá `gerbera-ads-report-daily`, hết mù ads 6 ngày/tuần vì hạn mức Pipeboard) · thêm cỗ máy ý tưởng B4–B8 (trước Gerbera thiếu, 3 brand kia đã có) · vòng xoay 7 ngách chống lặp.

### 4.3 PC fetch: v1.0 → v1.1.1 (cùng ngày 31/07)
- **v1.0** → chạy thật: 2/15 nguồn (13 lỗi)
- **v1.1** TLS 3 tầng (certifi → system → unverified) — root store Windows cũ báo "certificate has expired" trên hàng loạt domain → **15/15 nguồn**
- **v1.1.1** Bad Birdie anchor đổi `/collections/mens-polos` → `/collections/polos` (handle cũ không expose products.json) → anchor $88 thay vì rỗng
- `.bat` báo lỗi to khi push fail (trước in "DONE" giả dù push hỏng)

---

## 5. SỐ LIỆU CHỨNG MINH HỆ ĐANG CHẠY (31/07)

- **18 ngày** lịch sử giá liên tục trong `gerbera-metrics.jsonl` (15/07 → 31/07)
- **11 khối** trong `gerbera-market.json` · 23 lần push
- **15/15 nguồn** PC quét thành công, 0 lỗi
- **Anchor xác minh 2 chiều** (PC fetch khớp verify tay): Bogey Bros $69.95 (250 SKU) · Bad Birdie $88 (66 SKU) · Swannies $75 (55 SKU)
- **7/7 trigger** GAS đã cài đúng giờ Bangkok

---

## 6. SÁU ĐÍNH CHÍNH ĐÃ GHI NHẬN — ĐỪNG LẶP LẠI

1. "bogeybros.com rỗng = chặn bot" → SAI, sai domain, đúng là `.co`
2. "Bad Birdie polo $78" → SAI, đó là archive-sale; core là **$88**
3. "Polo AOP ~$34.95" → SAI, $34.95 là giá **TEE**; polo GP = $54.95
4. "Cuối 07 → 08 trũng golf-watching" → SAI, tháng 8 có Playoff 3 tuần liên tiếp
5. "Khe giá $27–32 headcover còn nguyên" → suy từ vắng mặt; 31/07 mới có điểm bằng chứng đầu tiên (U Suck $27 sold-out) — vẫn YẾU-VỪA
6. "Nghi vấn domain Bad Birdie" → XÁC NHẬN: đã đổi sang `badbirdiegolf.com`

---

## 7. VIỆC CÒN TREO + ĐỀ XUẤT CẢI TIẾN

### 🔥 Cần làm ngay
| Việc | Vì sao |
|---|---|
| **Đăng ký Task Scheduler cho `run_gerbera_fetch.bat`** (06:45 + At log on + tick "run missed task" + "run whether user is logged on") | Chưa đăng ký = PC fetch chỉ chạy khi bấm tay. Script không dùng browser nên khoá màn hình vẫn quét được (khác FoxEra dùng Playwright — chết khi máy khoá) |
| **Quyết dứt điểm "Test hook tease L1"** | Treo **12 ngày liên tiếp** (20–31/07), task nhắc mỗi ngày mà chưa ai quyết |
| **Chốt in ấn "Playoff Season Capsule"** | Còn **13 ngày** tới chặng 1 Memphis (13/08) — quá hạn là mất mùa |

### 🟡 Phát hiện kỹ thuật cần vá
| Vấn đề | Chi tiết |
|---|---|
| **`gerbera-ads.json` đã chết 13 ngày** (push cuối 18/07) | Task ads bị xoá 18/07, B9 chuyển sang market.json — nhưng GAS vẫn còn code đọc file này (`gp_loadJson_`, `buildBlockCompetitor_`, `GP_RAW_URL`). **Không gây hại** vì 7 nhịp hiện tại không gọi đường code đó (chỉ `gpSendAll`/`gpDailyRun` — đã gỡ khỏi trigger). Nhưng `tgSelfTest` vẫn in "JSON cũ 13 ngày" trông như báo động thật → **đề xuất: gỡ code chết hoặc đổi nhãn thành "đã khai tử, bỏ qua"** |
| **Trùng tên khối giữa 2 luồng** | GAS có B1=Ads, B2=Store; market cũng có B1=Keyword, B2=Competitor. Hai "B1" khác nhau hoàn toàn → dễ nhầm khi trao đổi. **Đề xuất: gọi market là M1–M11**, hoặc luôn nói rõ "Ads B1" vs "Market B1" |
| **Cloud chưa từng đọc `gerbera-live-fetch.json` trong phiên tự động** | Luật đã ghi vào task nhưng mai (01/08) mới là lần chạy thật đầu tiên → cần kiểm bản tin 08:30 có ghi "nguồn live PC" không |
| **B11 mới quét 3/6 brand** | Phiên 31/07 chỉ kịp collections của Bogey/Bad Birdie/Swannies. PC fetch đã lấy đủ 6 → từ mai B11 sẽ đầy đủ |
| **Blog đối thủ chưa quét được** | Atom feed Bad Birdie 404, Bogey Bros trả binary → cần dò handle blog thật (việc cho phiên có browser) |
| **Ad Library >12 ngày chưa cập nhật** | Cần phiên interactive Claude in Chrome — API chính thức vô hình với DTC Mỹ (giới hạn thiết kế, không phải lỗi token) |

### 💡 Cơ hội chưa khai thác
- **`gerbera-metrics.jsonl` đã có 18 ngày dữ liệu giá T1** nhưng chưa ai đọc ngoài chính task → đủ để dựng biểu đồ xu hướng giá/sold-out theo thời gian, hoặc phát hiện chu kỳ sale của đối thủ.
- **Tách collection NSFW/SFW** (học Bogey Bros) → mở đường landing sạch cho paid L0/L1, tách kênh L3 organic. Đây là việc rẻ nhất có tác động lớn nhất phát hiện được hôm nay.
- **Theo dõi "Swannies Fall 2026 Flock Box"** (handle dựng sẵn, phát hiện 31/07) → nếu tháng 9 ra box thật, GP có ~1 tháng để quyết mystery bundle.
