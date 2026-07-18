# FoxEra Daily Intelligence — KIẾN TRÚC HỆ THỐNG (SYSTEM v1)
**Lập 18/07/2026** — tổng hợp từ bài học thật của 4 dự án đi trước (FoxEra Etsy, GenusFaith, Job, GerberaPrints) để mọi bot mới (GritFell và về sau) kế thừa, không dẫm lại vết xe đổ.

---

## 1. Sơ đồ hệ thống

```
[Claude scheduled task]  ──research──►  [GitHub: GerberaPrints/foxera-daily]  ──raw──►  [Google Apps Script]  ──►  [Telegram group]
   (04:30–05:30 BKK)          git push        1 repo · N namespace                đọc JSON, stale-gate,           mỗi dự án 1 nhóm
                                                                                  gửi theo block 07:00+
```

Ba tầng, mỗi tầng một trách nhiệm — **research (Claude) · vận chuyển (GitHub) · phân phối (GAS/Telegram)**. Tầng nào hỏng thì tầng sau phải PHÁT HIỆN được (health-check), không im lặng đăng bản cũ.

## 2. Bản đồ namespace (1 repo · nhiều job song song)

| Dự án | File GAS đọc | File velocity | Giờ research (BKK) | Telegram gửi |
|---|---|---|---|---|
| FoxEra Etsy/POD | `foxera-daily.json` | `foxera-metrics.jsonl` | 04:30 | 07:00+ |
| FoxEra Job | `foxera-job.json` | `foxera-job-metrics.jsonl` | 04:30 | 07:00+ |
| GenusFaith | `genusfaith-daily.json` | `genusfaith-metrics.jsonl` | 04:30 | 07:00+ |
| Gerbera market | `gerbera-market.json` | `gerbera-metrics.jsonl` | sáng | 07:00+ |
| Gerbera ads | `gerbera-ads.json` | — | sáng | 07:00+ |
| **GritFell** | `gritfell-daily.json` | `gritfell-metrics.jsonl` | **05:30** | health 06:45 · gửi 07:00–08:15 |

**LUẬT CỨNG GIT (bài học GenusFaith #5 — nhiều job push cùng repo):**
1. Mỗi job **CHỈ** ghi đúng file namespace của mình.
2. `git add <tên file tường minh>` — **TUYỆT ĐỐI KHÔNG** `git add -A` / `git add .` (nuốt file job khác đang dở).
3. Luôn `git pull --rebase origin main` **trước** push (job khác đã push trước trong cùng khung giờ).
4. **Không bao giờ `--force`.** Push xong kiểm `git ls-remote origin -h refs/heads/main` == `git rev-parse HEAD`.
5. Push 403/auth fail → thử lại đúng 1 lần → vẫn fail thì **báo ngay** (PushNotification), nêu rõ fix: fine-grained PAT, Repository access = `GerberaPrints/foxera-daily`, Contents: Read & write.

## 3. KỶ LUẬT DỮ LIỆU chung (đúc từ lỗi thật, mọi bot áp dụng)

| # | Luật | Lỗi gốc đã xảy ra |
|---|---|---|
| 1 | **Locale US/USD chốt trước khi quét**, ghi `"locale"` vào JSON | GenusFaith 14/07: locale VN → Amazon 6 kết quả, kết luận nhầm "white space"; thật là 1.000+ |
| 2 | **Nhãn review bắt buộc**: `(listing rv)` / `(shop rv)` / `(shop sales)` | GenusFaith: nhầm shop↔listing 3 lần trong 2 ngày (Judge.me = shop-wide) |
| 3 | Số extension overlay (IXSPY/BrandSearch) = bỏ, trừ khi ghi "bên thứ 3, tham khảo" | Overlay báo $44M/tháng cho 1 cái ví |
| 4 | Trend-blog/aggregator = định hướng, KHÔNG phải fact; số cứng cần ≥2 nguồn hoặc nguồn sơ cấp | — |
| 5 | **Velocity cần ≥3 ngày**; thiếu lịch sử → "baseline", không bịa delta | — |
| 6 | **Tuổi số liệu**: mỗi số kèm ngày verify; >7 ngày chưa re-verify → hạ xuống "lịch sử, tham khảo" | Số cũ đội lốt "đang hot" |
| 7 | **Phân tầng provenance**: live / snippet / mốc dd·mm / tham khảo SEO — không cho tầng thấp đội lốt tầng cao | — |
| 8 | **Link bền, không bịa mã**: ưu tiên `/market/slug`, `/s?k=`, Best-Sellers; chỉ ghi ASIN/listing-id nếu đã mở được thật (200) | ASIN/listing-id bịa hoặc chết |
| 9 | Fetch chặn → **WebSearch làm freshness engine**; mỗi ngày ≥1 tín hiệu tươi thật | Amazon chặn headless, trả rỗng |
| 10 | **Nói trước cái KHÔNG có** (nguồn chặn, số không lấy được) rồi mới nói cái có | Gerbera chuẩn hoá; chống ảo giác đủ-dữ-liệu |
| 11 | **Đính chính là nội dung hạng nhất**: phát hiện hôm qua sai → mở khối bằng 🚨 đính chính, ghi vào sổ để không lặp lại | GenusFaith giữ sổ "5 đính chính"; Gerbera đến đính chính #7 |
| 12 | **Trần ý tưởng**: tối đa 3 ý 🟢 mới/ngày | Gerbera LUẬT 6 — chống loãng |
| 13 | ALL-LIGHT: đa số ngày 1–3 khối đổi; khối yên → "⏸ Không đổi so với hôm qua (dd/mm)" — trung thực, không cố bịa tin | Thị trường đổi theo tuần/mùa |

## 4. Chuỗi health-check (3 chốt chặn)

1. **Trước push (Claude)**: JSON hợp lệ (`python json.load`) · `date` = hôm nay giờ Bangkok (sai ngày → GAS stale-gate, cả run vô ích) · đủ mọi khối GAS sẽ gửi (bài học GenusFaith #6: GAS v1 chỉ gửi B1–B6 → B7 mồ côi vĩnh viễn) · mỗi khối ≥1 link nguồn.
2. **Sau push (Claude)**: ls-remote == local HEAD; fail → retry 1 lần → notify.
3. **Trước giờ gửi (GAS)**: health-check chạy trước send-window (GritFell: 06:45); data không phải hôm nay → đăng đúng 1 cảnh báo, **không đăng bản cũ**. Chunk tin theo **ranh giới dòng** (không cắt giữa thẻ `<a>`/`<b>` → Telegram 400 mất tin); HTML hỏng → fallback plain-text.

## 5. Quy trình thêm bot mới (checklist 10 bước)

1. Đặt namespace: `<brand>-daily.json` + `<brand>-metrics.jsonl` — không đụng file job khác.
2. Viết prompt theo khung chuẩn: BỐI CẢNH BRAND → MỤC TIÊU → KỶ LUẬT DỮ LIỆU (mục 3) → BƯỚC (clone → đọc hôm qua + tail metrics → research → viết khối → self-check → push + health-check) → TM-safe → KẾT + run-summary.
3. Chốt cấu trúc khối B1..Bn **trước**, GAS viết sender đủ từng khối (không thêm khối mà quên sender).
4. GAS: token/chat riêng, stale-gate, health-check trigger trước send-window ≥15', chunk theo dòng, fallback plain.
5. Giờ chạy: research cách giờ gửi ≥75' (đủ retry); tránh đụng khung 04:30 đã đông (rebase là đủ nhưng lệch giờ giảm conflict).
6. Metrics.jsonl từ ngày đầu (baseline) — velocity chỉ sống khi có lịch sử; ghi kèm `note` cái gì carried vs re-scraped.
7. PAT fine-grained đúng 1 repo, Contents R/W; ghi nhớ: token nằm plaintext trong prompt task → ai thấy task là thấy token; hết hạn = push chết → có đường báo lỗi.
8. Chạy tay 1 lần (fxTestRead → SendAll) trước khi cài trigger lịch.
9. Ngày đầu chấp nhận toàn "baseline"; KHÔNG kết luận xu hướng trước ngày 3.
10. Mọi lỗi mới → ghi vào routine-vN+1 của bot đó **và** cân nhắc nâng SYSTEM này (bài học là tài sản chung).

## 6. Sổ nguồn bài học (để truy vết)

- `genusfaith-routine-v3.md` — 6 vá lỗi hạ tầng + 5 đính chính dữ liệu + 3 kết luận sống sót.
- `foxera-routine-v2.md` — velocity/metrics.jsonl, độ bão hòa, health-check sau push.
- `gritfell-routine-v3.md` — bản hợp nhất mới nhất của khung chuẩn (mục 5.2).
- GAS các bot (`genusfaith-telegram-gas-v2.gs`, `gritfelldaily.gs`) — stale-gate, chunk theo dòng, health-check trigger.
