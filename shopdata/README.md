# shopdata/ — Dữ liệu shop cho Khối B9 "Market vs Shop"

Mỗi tuần (lý tưởng: Chủ nhật), export **Etsy Stats CSV** và bỏ vào thư mục này:

1. Etsy Shop Manager → Stats → chọn khoảng 7 hoặc 30 ngày → Download data (CSV).
2. Đặt tên file: `etsy-stats-YYYY-MM-DD.csv` (ngày export).
3. Commit + push lên repo (hoặc upload qua GitHub web UI).

Bot daily sẽ tự phát hiện CSV mới vào sáng thứ 2 (hoặc ngày có file mới) và tạo Khối B9:
- Listing impressions cao + CTR thấp → đề xuất đổi thumbnail.
- Cụm market đang nóng mà shop chưa có listing → gap.
- Listing đủ tín hiệu → scale sang hat / quarter zip / patch.

Cột tối thiểu cần có: listing title/ID, impressions, visits, orders (revenue nếu có).
Không có file mới → B9 chỉ là 1 dòng nhắc export, không ảnh hưởng các khối khác.
