# FoxEra Daily Research — ROUTINE v5.2 (ADDENDUM cho v5.1)
> Bot ĐỌC file này SAU v4 → v5 → v5.1. v5.2 GIỮ TOÀN BỘ. Khi mâu thuẫn: **v5.2 > v5.1 > v5 > v4 > trigger prompt.**
> Lý do ra đời (06/08/2026): run 04:30 chạy được nhưng lộ 4 lỗi hệ thống — 1 lỗi đọc số (suýt tạo tín hiệu giả), 1 lỗi quy trình (mất bản tin account), 1 rào hạ tầng (push), 1 điểm mù roster.

---

## LUẬT 31 — NGƯỠNG NHIỄU META (chống mũi tên Δ giả) — BẮT BUỘC

**Sự thật kỹ thuật đo được 06/08:** gọi CÙNG một interest, CÙNG tham số, CÙNG phiên → Meta trả giá trị khác nhau.

| Interest | Các giá trị quan sát cùng ngày 06/08 | Biên độ |
|---|---|---|
| Pickleball | 14.0–16.5M · 14.0–16.4M · 13.9–16.4M | ~0.7% |
| Gardening | 70.6–83.1M · 70.5–82.9M · 70.6–83.1M | ~0.24% |
| Halloween | 25.6–30.1M (5 lần trùng khít) | 0% |
| Embroidery | 26.9–31.6M (nhiều lần trùng khít) | 0% |
| Book Lovers | 221.500–260.600 (trùng khít) | 0% |
| Golf | 58.5–68.9M (trùng khít) | 0% |

**Quy tắc:**
1. **Chỉ ghi Δ (▲/▼) khi lệch > 1%** so với lần đo trước. Kèm sàn tuyệt đối 0.1M cho interest nhỏ (< 10M).
2. Lệch ≤1% → ghi **▬ đứng**, TUYỆT ĐỐI không viết "giảm nhẹ", "trần −0.1M", hay bất kỳ chữ nào hàm ý xu hướng.
3. Interest dao động nhiều nhất tới nay = **Pickleball** → khi nó đổi số, phải gọi lại lần 2 xác nhận trước khi ghi Δ.
4. Vẫn giữ luật 5: **≥3 ngày** mới được kết luận xu hướng, kể cả khi Δ vượt 1%.

> Vì sao quan trọng: bảng cầu có 9 dòng. Nếu đọc mọi dao động là biến động, mỗi sáng sẽ có 2–3 mũi tên hoàn toàn bịa — đúng loại lỗi mà luật 27 (ratio US/global) đã từng gây ra.

## LUẬT 32 — CHỐT CHẶN "SINH ĐỦ 2 FILE" (mất bản tin account 05/08 → 06/08)

Sự cố: run 05/08 chỉ sinh `foxera-daily.json`, bỏ `foxera-accounts-daily.json` → bản tin AccountsTelegram 06:10 ngày 06/08 đăng bản **31/07** và tự ghi "Đề xuất Cloud cũ".

**Quy tắc:**
1. Mỗi run BẮT BUỘC sinh **CẢ HAI**: `foxera-daily.json` (market B1..B10) **VÀ** `foxera-accounts-daily.json` (account, B1..B3).
2. **Self-check chặn cứng trước push** — nếu `foxera-accounts-daily.json.date != hôm nay` thì COI NHƯ RUN THẤT BẠI, phải sinh lại, KHÔNG được push nửa vời.
3. `foxera-accounts-daily.json` phải merge `local-verify/foxera-shops-live.json` nếu file đó có `verified_at` = hôm nay (Desktop chạy 04:00 trước routine 04:30 → gần như luôn có).
4. Trong summary phải có: `new_not_selling_today`, `reopened_today`, `rating_below_4_3` — 3 chỉ số cảnh báo sớm.

## LUẬT 33 — RÀO PUSH GIT-PROXY: QUY TRÌNH BÀN GIAO CHUẨN (nâng cấp luật 30)

403 "not in this session's authorized repository set" đã xảy ra **2 ngày liên tiếp** (05/08, 06/08) ⇒ coi là **trạng thái mặc định của môi trường Cloud**, không phải sự cố.

**Quy trình chuẩn khi gặp 403:**
1. KHÔNG retry, KHÔNG đổ lỗi PAT.
2. `git commit` đầy đủ ở local.
3. `git bundle create /tmp/foxera-update-<ddMM>.bundle origin/main..HEAD`
4. Gửi user: **bundle + các file JSON rời** (để user có thể áp bằng 1 trong 2 cách).
5. PushNotification 1 lần/ngày, nêu đúng nguyên nhân proxy.

**Cách user áp bundle (Desktop, trong thư mục repo):**
```bat
git fetch /duong-dan/foxera-update-0608.bundle main:cloud-0608
git merge cloud-0608          :: hoac: git cherry-pick cloud-0608
git push origin main
```
**Cách 2 (đơn giản hơn, khi chỉ cần data):** copy đè 5 file JSON đã tải về vào repo → `git add` → `commit` → `push`.

**Fix gốc:** thêm `GerberaPrints/foxera-daily` vào *authorized repository sources* của scheduled task 04:30. Chưa fix thì mỗi sáng GAS vẫn báo "chưa cập nhật".

## LUẬT 34 — ROSTER PHẢI PHỦ MỌI SHOP CÓ ĐƠN (điểm mù 06/08)

Sự cố: Hub báo E5 (48 đơn/90d) và E3 (42 đơn/90d) là SỐNG-CÓ-TIỀN, nhưng `verify_shops.py` không quét vì 2 code này không có trong roster lẫn registry ⇒ Cloud không có số sàn nào để đối chiếu.

**Quy tắc:**
1. Mọi shop xuất hiện trong bản tin Hub với **đơn/90d > 0** mà chưa có trong `foxera-accounts.json` hoặc `foxera-store-registry.json` → PHẢI thêm vào `store_links_extra` của registry ngay trong ngày.
2. Đã thêm 06/08: **E3 Loomelody · E5 AURELOOMS · E22 Sylvarineo · E32 SilverSproutDesign · E37 EverberryCraft** → `verify_shops.py` giờ quét 161 target (trước 156).
3. Mỗi run so `len(shops-live)` với số acc Hub báo; lệch > 5 → nêu trong Khối 2 accounts.

## LUẬT 35 — INTEREST KHÔNG SẠCH: CHỐT DANH SÁCH ĐEN

Kiểm 06/08 ở limit 6 và limit 10 đều xác nhận: **"National Park" KHÔNG có interest sạch** (trả về phim hài, phim hành động, Nhật Bản, Brasil, Đài Loan…).

- Bổ sung `no_clean_interest`: National Park.
- Thay thế cho làn sóng National Parks (B5/B10): thử `Hiking`, `Camping (outdoor)`, hoặc dùng behavior — KHÔNG ép dùng interest bẩn.
- `National Grandparents Day` (6003124021617, US 15.0–17.6M) có `disambiguation_category = local business` → dùng làm **proxy mùa vụ**, gắn ⚠️, KHÔNG coi là tệp mua sạch, KHÔNG dồn ngân sách lớn.

---

## SELF-CHECK v5.2 (thêm vào self-check v5.1)
- (g) Mọi Δ trong B1/B9 đều **> 1%** mới có mũi tên; còn lại là ▬.
- (h) `foxera-accounts-daily.json.date` == hôm nay (nếu không → run FAIL, sinh lại).
- (i) Nếu push 403 → có bundle + đã notify đúng nguyên nhân proxy.
- (j) Shop có đơn/90d > 0 trong bản tin Hub đều có mặt trong roster/registry.
