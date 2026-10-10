# D:\GritFell — hạ tầng ops GritFell (v0.1.0 · 10/10/2026)

Port từ `D:\Kinmireva\km_*` theo kỷ luật của GerberaPrints: **mọi thao tác store đi qua Shopify Admin API bằng token trên máy**, không qua connector chat (connector đã trỏ sai store 24 ngày).

## Cài một lần
1. Shopify Admin → Settings → Apps and sales channels → Develop apps → tạo custom app `gritfell-ops` → Admin API scopes: `read_products`, `read_orders` (v0.2 sẽ xin thêm `write_products`, `read_all_orders`). Install → copy Admin API access token (`shpat_...`).
2. Tạo `D:\GritFell\.keys\shopify_token.txt` chứa đúng 1 dòng token. **Không commit, không gửi qua chat.**
3. `GR-KIEM.bat` → kỳ vọng `PASS 10/10` + `PASS 12/12` + `OK store: ... bdaheu-zf.myshopify.com`.
4. `GR-QUET.bat` → sinh `gr-catalog.json`, `gr-sku-counter.json`, `gr-audit-<ngày>.json`.
5. `GR-DON.bat 30` → `gr-orders-<ngày>.json` (đơn theo SKU + theo series).

## Luật
- Sai store → `SystemExit`, không làm gì thêm. Mọi lệnh kiểm identity trước.
- v0.1 **chỉ đọc**. Không có mutation.
- Bộ đếm SKU = `max` thật trên store theo series (`TS-C`, `MH-A`, `LH-A`, `PM-A`, `BT-A`, `SS-A`), không hằng số. `gr_ten.cap_sku()` từ chối nếu thiếu catalog.
- Cổng tên: `gr_ten.kiem_ten()` — CAM (Realtree, Mossy Oak, DU, NWTF, roster đối thủ, quân chủng, Great Seal, vườn quốc gia) · NGO (EST+năm, Henry, "[X] Life", 1776/patriot) · `quet_tm_file()` quét cả tên file đính kèm (vụ rename-bypass 25/08).
- Ghi file `.tmp` → `os.replace`, parse lại trước khi coi là xong. Ngày giờ Bangkok.

## Sắp tới (v0.2, sau khi v0.1 đo đúng)
`gr_upload.py` (Trello card có mockup → productCreate DRAFT, vendor Gritfell, alt text, metafield `gritfell.design_code` + `trello_card_id`) · `gr_duyet.py` (port km_duyet 3.16: nhãn lý do theo layout) · `gr_tang0` nối `gr-orders` vào signals cho engine (`SALE:<design_code>`).
