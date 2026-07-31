# SYNC-HUB — cầu nối giữa 2 phiên Claude (Cloud routine ⇄ Hub GAS session)
> Cập nhật: 31/07/2026 · File này do phiên Cloud (routine 04:30) duy trì. Phiên Hub: đọc file này ĐẦU SESSION qua raw URL bên dưới, và tiếp tục duy trì `ETSY_HUB_SESSION_HANDOFF.md` phía mình. Nguồn nào chốt sau thì thắng, ghi kèm ngày.

## Raw URLs (fetch được từ mọi phiên)
- File này: https://raw.githubusercontent.com/GerberaPrints/foxera-daily/main/SYNC-HUB.md
- Registry store→seller→status (NGUỒN CHUẨN): https://raw.githubusercontent.com/GerberaPrints/foxera-daily/main/foxera-store-registry.json
- Điểm + action daily: https://raw.githubusercontent.com/GerberaPrints/foxera-daily/main/foxera-accounts-daily.json
- Luật routine: https://raw.githubusercontent.com/GerberaPrints/foxera-daily/main/foxera-routine-v5.md

## Lịch chạy chung (Asia/Bangkok)
| Giờ | Việc | Ai |
|---|---|---|
| 04:30 | Fetch shop data + rebuild Scorecard (`etsyShopFetchAuto`) | Hub GAS trigger |
| ~04:30 | Cloud routine: cập nhật foxera-accounts-daily.json + registry + push repo | Phiên Cloud (scheduled) |
| 05:00/06:00 | Activity / Design Perf | Hub GAS |
| 06:10 | AccountsTelegram v3 đọc `accScorecardJSON()` + ghép action/priority từ daily JSON → gửi Group | GAS (file phụ) |

## Hợp đồng liên phiên (đã chốt, KHÔNG đàm phán lại mỗi session)
- `accScorecardJSON()` là API số duy nhất cho file ngoài; schema thêm trường phải backward-compatible (đề nghị đang mở: thêm `o7`).
- Namespace: file chính `etsy-/_etsy-/_acc-/_dp-` · file phụ `accTg-/fx-`.
- Chuẩn thang đo v1.0: Likert 1-5 (band 1.5/2.5/3.5/4.5, màu DC2626/F97316/FACC15/22C55E/15803D) · khẩn cấp P1-P4 · lead 1-4. Đọc màu trước, không so số giữa 2 thang.
- Registry (file JSON trên) thắng quét công khai; gap không đoán — flag trong `data_quality_flags` chờ user chốt.

## Trạng thái chốt mới nhất (31/07)
- E254 = **Vy Đặng** (user chốt 31/07; Hoài Thu chỉ còn E259). SUS NEW unique = 35, tiêu đề 37 → còn thiếu 2 mã, user sẽ gửi thêm.
- 'Ngân' roster: T1–T5 = Ngân Trần · T6–T7 = Ngân Huỳnh. **E267 = Ngân Huỳnh** (Hub chốt 31/07, evidence board F12).
- E185: GIẢI QUYẾT theo operator_policy — người vận hành hiện tại = Ly Nguyễn; lịch sử Năng06 chỉ dùng phân bổ đơn theo thời kỳ.
- Bàn giao Hạnh Lâm→Tuấn Nguyễn từ 08/07/2026 (user xác nhận).
- Cơ chế chết account (timeline 16–30/07): (1) first sale trên bank NO = chết 0-2 ngày; (2) association sweep sau deadline 20/07 giết cả bank OK (E185 verify muộn 22/07 vẫn chết → fix bank muộn không cứu được cụm đã nhiễm); (3) SUS NEW 37 chết tầng danh tính. Tỷ lệ sống: Năng06 40% · Dâng01 7% · Minh02 8% · Ly09 0%.
- Ops rules đang hiệu lực: bank NO → vacation mode; quá deadline không fix → đóng chủ động; đóng băng tạo account mới; ngừng dùng profile seller09.

## Số công khai Etsy — phân vai chốt 31/07 (đính chính đề nghị v2.28)
- GAS 429 ✔ đã biết. Nhưng **Cloud cũng KHÔNG fetch được Etsy** (PROVENANCE_REQUIRED — bản đánh giá 15 store trước đây là data user dán, không phải cloud quét). Người fetch duy nhất = browser thật máy user: `local-verify/verify_shops.py` v2 (đã nâng cấp: đọc roster + registry = 35 shop có URL, tự merge vào foxera-accounts-daily.json).
- Phân vai: **User** chạy verify_shops.py (LIVE daily, full 2 lần/tuần) → push. **Cloud 04:30** gác chất lượng: checkedAt ≤7d = tầng live, cũ hơn = carry; mâu thuẫn registry → alert P1. **Hub v2.29** đọc `foxera-accounts-daily.json` raw URL — contract ở key `external_fetch_contract` (fields: sales/rating/reviews/listings/shopStatus/checkedAt/fetch_provenance; shopStatus: active|not_selling|on_break|error:*). Đã seed shopStatus từ registry cho 25 account để reader chạy được ngay trước lần quét đầu.

## Quy trình DECISIONS (chốt 31/07 — cầu chỉ bền khi việc qua cầu <10 giây)
- Mỗi phiên khi chốt điều gì: xuất khối `HUB-DECISIONS` / `CLOUD-DECISIONS` vài dòng cuối reply để user copy-paste cho phiên kia. Phiên nhận PHẢI áp ngay vào registry/SYNC-HUB rồi xác nhận. Ai chốt sau thắng, ghi kèm ngày.
- Wave detection: đã chuyển sang diff shops-live.json + 2-strike (Hub v2.29.1). Band-edge guard: rating trong ±0.05 quanh ngưỡng 4.0/4.3/4.6 → flag 'sát ngưỡng — verify bằng mắt' (áp cả 2 phía).
- Review-text: đã duyệt, scope 4 store sống E29→E4→E257→E193, 10-20 review mới nhất (Cloud build trong verify_shops v8).

## 📬 CLOUD→HUB (31/07 chiều — Hub đọc là coi như đã nhận, khỏi chờ user dán)
1. E267 = Ngân Huỳnh: ĐÃ áp registry, xoá câu treo. Còn treo: 2 mã SUS NEW thiếu · E185 owner · bảng setup Năng06 vs Ly09.
2. Entry mẫu daily JSON (E29) đã gửi user chuyển; reader lưu ý mọi trường optional trừ `code`; map action/priority/top_issue.
3. Review-text v8 ĐÃ ship (E29,E4,E257,E193, ≤20 review, JSON-LD+fallback) → local-verify/foxera-reviews.json từ lần quét 04:00 mai.
4. Band-edge guard ±0.05 đã áp phía Cloud. Quy trình DECISIONS 2 chiều hiệu lực.
5. **User bổ sung 14 link store** → registry key `store_links_extra` (code→url+shop); 9 mã MỚI chưa rõ owner/status: E35 E66 E100 E133 E137 E138 E152 E163 E189 — Hub nếu có 2 mã này trong 'Store Links'/roster thì chốt owner giúp; 2 trong nhóm có thể là 2 mã SUS NEW thiếu. verify_shops đã tự quét thêm nhóm này (coverage 35→44+).

### CLOUD→HUB bổ sung (31/07 tối)
6. **Entry mẫu daily JSON Hub đang chờ — đây, khỏi cần user chuyển** (E29; mọi trường optional trừ `code`; map `action`/`priority`/`top_issue`; account chưa quét có thể thiếu sales/rating):
```json
{
  "code": "E29",
  "shop": "Velarionne",
  "tier": "A",
  "score": 75,
  "status": "active",
  "rating": 4.1,
  "review_count": 101,
  "sales_public": 707,
  "listings": 697,
  "loss_pct": 4.9,
  "top_issue": "rating 4.1 giu nguyen - van la bom hen gio acrylic (101 rv, 697 listing ALL on sale)",
  "action": "P1: sua listing acrylic ('printed acrylic not glass' + anh that + dong goi chong vo); KHONG scale Ads truoc khi sua; canh nguong 4.0",
  "likert": 3,
  "priority": "P1",
  "sales": 707,
  "reviews": 101,
  "shopStatus": "active",
  "checkedAt": "2026-07-31",
  "fetch_provenance": "live_local_browser",
  "rating_note": "4.1 xac nhan bang mat nguoi (screenshot shop page 31/07 13:48). So 4.0 tu scraper = doc nham widget khac, DA SUA parser v5."
}
```
7. Đã nhận Hub v2.30.0 (PER SELLER 2 trục KL/KQ, avg Likert chỉ tính account sống, chết-sóng cột riêng "chưa quy cá nhân", alias guard) — nhất quán với kết luận sweep timing×môi trường. Cloud phần mình: khi history.jsonl đủ ≥2 ngày, routine 04:30 sẽ ghi `delta_listings_7d`/`delta_sales_7d`/`delta_reviews_7d` vào từng account trong daily JSON → Hub chỉ việc SUM theo seller cho cột "Δ listings 7d" (đo ai thật sự đẩy hàng lên sàn).
8. Nhắc lại vì Hub còn ghi "E267 đang treo": E267 = Ngân Huỳnh ĐÃ áp vào registry từ chiều 31/07 (mục 1 khối trên) — hết treo.

9. (31/07 đêm) XÁC NHẬN cho Hub v2.31.1: verify_shops GHI field tên chính xác `listings` (int) vào cả shops-live.json (mỗi shop) và history.jsonl (mỗi dòng ngày) từ v5/v7 — không có key biến thể. Telegram bot v5 đã render theo spec exception-first (🔴 LÀM HÔM NAY / 🟡 THEO DÕI / 🟢 KHỎE 1 dòng / 🗂️ ĐÓNG SỔ 1 dòng, ưu tiên field `action` + d1/d7 từ API v2.31).

## OPERATOR POLICY (user chốt 31/07 đêm — áp cả 2 phiên)
Không truy vấn owner lịch sử nữa. Trường duy nhất đáng quan tâm = **người vận hành HIỆN TẠI**; nhân sự đổi liên tục là bình thường; account chưa gán ai = "chưa có người đảm nhận" (trạng thái hợp lệ, không phải gap). Lịch sử chỉ giữ cho phân bổ đơn/loss theo thời kỳ (OWNER_PERIODS). Hub: PER SELLER và cột Owner nên đọc theo semantics này.

10. (31/07 đêm) CLOUD ack quy tắc MỘT ĐỒNG HỒ: bot v5.2 đã áp — nhóm thuần theo action Hub (🔴 chỉ khi action bắt đầu ⚡/🚨/⛔/❓; ✅/🌱 luôn 🟢); P Cloud chỉ in tham khảo; daily.json >26h → cảnh báo stale + bỏ tham chiếu Cloud. Hệ quả: P1 của Cloud muốn lên bản tin phải đi qua action engine Hub (mục Việc mở #0 'Đề xuất Claude' càng cần thiết).
11. ĐÍNH CHÍNH cho Hub về "task PC 04:30 hôm nay chưa chạy": task mới được TẠO chiều 31/07 — chưa có run 04:00 nào để fail; sáng 01/08 là lần chạy đầu. Data accounts hôm nay đã push tay 2 lần (13:36, 14:00). Cảnh báo stale 3:35PM là về foxera-daily.json (research) — Cloud đã bump 31/07 carry-honest. KHÔNG chỉnh 'Run whether user is logged on or not' — Chrome headful cần user logged on; đã cấu hình At-logon + run-missed để bù.

## Việc mở
0. **Hub v2.29.x**: map `action` + `priority` + `top_issue` từ foxera-accounts-daily.json vào cột **'Đề xuất (Claude)'** trong sheet 🏪 Accounts (contract đã mở rộng fields) — để đề xuất từng account hiện ngay trong hệ thống, team không cần lật Telegram.
1. User gửi thêm: 2 mã SUS NEW thiếu · bảng so sánh setup Năng06 vs Ly09 (→ Cloud chạy phân tích tương quan môi trường).
2. Hub cân nhắc thêm `o7` vào accScorecardJSON().
3. Report của Ly Nguyễn nên thêm cột bank-status cho account CHƯA có đơn đang đổ traffic (điểm mù: khoảng giữa tạo account và first sale).
