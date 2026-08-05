# SHARED BOT UPGRADE PLAYBOOK — Meta US-demand + 2-luồng (v1.0 · 05/08/2026)
> Dùng CHUNG cho mọi bot trong repo foxera-daily: **foxera · genusfaith · gritfell · gerbera · foxjob**.
> Mục tiêu: mọi bot khai thác cùng hạ tầng (Meta demand + Cloud/Desktop) một cách nhất quán, KHÔNG lặp lại lỗi đã gặp ở FoxEra 05/08. Khi routine của project mâu thuẫn playbook này về *method đo cầu*, playbook THẮNG.

## 0) Tình trạng hạ tầng (chốt 05/08)
- **Cloud** (scheduled 04:30): WebSearch + Meta interest/estimate + dựng `<project>-daily.json` → commit. ĐÃ kiểm chứng chạy đúng.
  - ⚠️ **Tự-push từ cloud có thể bị git-proxy chặn** (403 "not in authorized repository set"). KHÔNG phải lỗi PAT. Cách xử lý: mục 4.
- **Desktop** (máy user): `git push` ĐÃ kiểm chứng chạy tốt. `verify_listings.py` (mở listing thật) là MẮT DUY NHẤT lấy số review live.
  - ⚠️ Trước khi nhân rộng: chạy thử `python local-verify/verify_listings.py <project>` 1 lần để xác nhận scraper còn hoạt động (Etsy có thể đổi JSON-LD).

## 1) LUẬT ĐO CẦU META (bắt buộc mọi bot)
1. Chuẩn cầu = `estimate_audience_size`, `optimization_goal=REACH`, `geo_locations.countries=["US"]`, `age 18-65`, 1 interest trong `flexible_spec`. Account: `act_1635419550630846`.
2. **CẤM** so tỷ lệ `us_reach` với `search_interests.audience_size` ("global") — 2 hệ đo khác nhau (bằng chứng: Pickleball global 1.03M < US 15.25M). `search_interests` chỉ để lấy `interest_id`.
3. **Disambiguation:** chỉ nhận interest đúng nghĩa; loại film/TV/band/local-business/music-genre. Nhiều query KHÔNG có interest sạch (Christianity rỗng, Nurse→nursery, Dog→band, Back-to-School→phim) → ghi `no_clean_interest`, KHÔNG ép dùng, KHÔNG bịa.
4. Mọi số REACH kèm `verified_at`. >7 ngày chưa gọi lại → hạ "lịch sử".

## 2) DATA ASSET DÙNG CHUNG
- `meta-interest-library.json` (repo root) = thư viện interest-ID + US reach + no_clean, project-agnostic. **Mọi bot đọc file này trước**, chỉ gọi `estimate` cho `meta_id` liên quan tới niche của mình (field `projects[]`), thêm interest mới vào `next_to_add` khi cần đào sâu.
- Mỗi bot vẫn giữ baseline riêng `<project>-meta-us-baseline.json` (bản đồ id + reach của riêng niche project đó) để diff Δ ngày-qua-ngày. FoxEra mẫu: `foxera-meta-us-baseline.json`.
- Quy trình mỗi run: đọc library → đọc baseline project → gọi `estimate` cho từng id → cập nhật `us_reach` + `last_run` → tính Δ (▲/▼/▬) → đưa vào khối B1/B9 (hoặc khối cầu của project) → ghi lại library nếu thêm id mới.

## 3) CẦU NỐI 2 LUỒNG QUA B8 (áp mọi project có local-verify)
- `verify_listings.py` tự nhặt URL `https://www.etsy.com/listing/<id>` **từ chính `<project>-daily.json` (ưu tiên B8)**. Nếu Cloud không để URL listing nào → Desktop KHÔNG có đích → file live mãi cũ.
- ⇒ Mỗi ngày B8 PHẢI có **3–8 URL listing THẬT** (từ WebSearch snippet), nhãn "snippet, chưa verify rv", KHÔNG bịa id/số. Desktop CN mở đúng các URL này → ghi `<project>-live.json` → Cloud hôm sau nâng anchor snippet→LIVE.
- `PROJECTS` trong verify_listings.py: foxera→foxera-daily.json · genusfaith→genusfaith-daily.json · gritfell→gritfell-daily.json · gerbera→gerbera-market.json · foxjob→foxera-job.json.

## 4) XỬ LÝ RÀO PUSH (mọi bot)
- Nếu `git push` báo 403 git-proxy "not in authorized repository set": KHÔNG spam retry, KHÔNG đổ lỗi PAT.
- Fix gốc: thêm repo `GerberaPrints/foxera-daily` vào **authorized repository sources** của scheduled task (để cloud tự push). Chưa fix được → quy trình "Cloud dựng file → Desktop push" vẫn chạy.
- Khi bàn giao file cho user push tay: giao FILE trực tiếp + lệnh push chỉ-định-tên-file (KHÔNG `git add -A` để tránh commit nhầm file rác như .bundle):
  ```
  cd <repo> && git pull
  git add <file1> <file2> ...
  git commit -m "<project> <ngày>: <mô tả>"
  git push
  ```

## 5) TRIỂN KHAI CHO 1 BOT MỚI (checklist)
1. Xác định niche project → chọn `meta_id` liên quan từ `meta-interest-library.json` (thêm id mới nếu thiếu, theo LUẬT §1).
2. Tạo `<project>-meta-us-baseline.json` (copy cấu trúc foxera, thay danh sách interest theo niche).
3. Thêm vào routine project: bước "đọc library + baseline → gọi estimate → Δ → khối cầu"; và LUẬT §1 (cấm ratio), §3 (B8 gieo đích).
4. Đảm bảo B8 của project có URL listing thật mỗi ngày (đích cho Desktop).
5. Chạy thử `verify_listings.py <project>` 1 lần trên Desktop → xác nhận scraper OK.
6. Self-check trước push: daily hợp lệ JSON, đủ khối, mỗi khối có CẦN CHÚ Ý+Nguồn, không câu ratio US/global, baseline last_run=hôm nay, không file rác.

## 6) DISAMBIGUATION LOG (tra trước khi tự search lại — tiết kiệm & tránh dùng nhầm)
Rỗng/nhiễu đã biết (05/08): Christianity(rỗng) · Christmas(local-biz/film) · Camping(business) · Nurse(nursery) · Dog(band) · Back-to-School(phim) · Cats(music-genre, chỉ proxy ⚠️). Cập nhật vào `meta-interest-library.json > no_clean_interest` khi gặp thêm.
