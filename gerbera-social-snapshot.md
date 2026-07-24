# GerberaPrints — Social Manual Snapshot (TikTok/Reddit/X)

**Vì sao có file này:** TikTok/Instagram/Pinterest/Facebook Ad Library/Reddit đều chặn fetch tự động trong phiên scheduled (xác nhận 21–24/07, xem LUẬT 8 trong prompt Gerbera Market Intelligence). Reddit API chính thức cũng không khả thi cho routine này — Reddit yêu cầu hợp đồng thương mại cho mục đích "brand/competitor monitoring", không phải form tự đăng ký (xác nhận 23/07). Giải pháp: con người tự duyệt web bình thường (không phải "khai thác API") rồi dán tóm tắt vào đây — bot chỉ ĐỌC, không tự ghi/sửa/xoá.

**Cách dùng (người thật, gợi ý ~1 lần/tuần hoặc khi thấy gì đáng chú ý):**
1. Mở TikTok, tìm/lướt: `#golftok`, `#golftiktok`, `#obnoxiousgolfapparel`, `mens golf shirt hidden image`, tên brand T1 (Bad Birdie, Bogey Bros, Swannies, Pins & Aces, Shank It, U Suck at Golf) — ghi video nào nổi (link + view/like nếu thấy) + 1 câu mô tả.
2. Mở Reddit (tài khoản cá nhân, duyệt bình thường): r/golf, r/golfswing — tìm `"funny golf shirt"`, `"hidden image"`, `"worst golfer award"`, tên brand T1 — ghi thread/comment đáng chú ý (link + số upvote/comment nếu thấy).
3. Mở X (Twitter): tìm brand T1, `#golftwitter`, meme golf đang lan truyền — ghi post đáng chú ý (link + tương tác nếu thấy).
4. (Tuỳ) Facebook Ad Library (facebook.com/ads/library, country US) cho Bad Birdie/Bogey Bros/Swannies — ghi số ads active ước lượng + 1-2 hook text + ngày "Started running".
5. Dán thành khối `## SNAPSHOT YYYY-MM-DD` MỚI LÊN ĐẦU file (giữ khối cũ bên dưới làm lịch sử) → commit + push lên repo `foxera-daily` (chỉ file này, không đụng file khác).

**Bot đọc mỗi run (07:15 Bangkok):** snapshot mới nhất ≤8 ngày → dùng cho B3/B9 với nhãn `manual snapshot dd/mm`. Cũ hơn 8 ngày hoặc chưa ai dán gì → ghi "snapshot cũ/chưa có — cần dán mới", KHÔNG dùng làm fact tươi.

---

## SNAPSHOT (chưa có — dán khối đầu tiên tại đây)

### TikTok
- LINK | mô tả ngắn | view/like nếu thấy | ngày xem

### Reddit
- SUBREDDIT | LINK | mô tả ngắn | upvote/comment nếu thấy | ngày xem

### X (Twitter)
- LINK | mô tả ngắn | tương tác nếu thấy | ngày xem

### Meta Ad Library (tuỳ chọn)
- BRAND | ~N ads active | hook: "..." | format | started dd/mm
