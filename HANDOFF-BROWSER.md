# FOXERA — GÓI CHUYỂN GIAO CHO PHIÊN BROWSER (31/07/2026)
> Dán file này (hoặc bảo phiên đó fetch các raw URL dưới) để làm tiếp mà không mất ngữ cảnh.

## Nguồn sự thật (fetch được từ mọi phiên)
- Registry store→seller→status: https://raw.githubusercontent.com/GerberaPrints/foxera-daily/main/foxera-store-registry.json
- Điểm + số quét + ĐỀ XUẤT từng account: https://raw.githubusercontent.com/GerberaPrints/foxera-daily/main/foxera-accounts-daily.json
- Cầu nối 2 phiên + hợp đồng: https://raw.githubusercontent.com/GerberaPrints/foxera-daily/main/SYNC-HUB.md
- Lịch sử quét (tăng trưởng): https://raw.githubusercontent.com/GerberaPrints/foxera-daily/main/local-verify/foxera-shops-history.jsonl

## Kiến trúc đang chạy (tự động ~100%)
04:00 máy user quét 35 shop (Task Scheduler, verify_shops v7, tự push) → 04:30 Cloud routine cập nhật JSON/registry (luật 20-25) + Hub GAS fetch nội bộ → 06:10 Telegram giao việc P1→P4 cho team → sheet 🏪 Accounts (Hub v2.29) hiển thị số + chờ thêm cột "Đề xuất (Claude)" (SYNC-HUB Việc mở #0).

## ĐỀ XUẤT TỪNG ACCOUNT (35 account, sắp theo ưu tiên P1→P4, cập nhật lại MỖI SÁNG 04:30)
| Mã | Shop | Trạng thái | Likert | Ưu tiên | Vấn đề chính | ĐỀ XUẤT (việc cần làm) |
|---|---|---|---|---|---|---|
| E29 | Velarionne | active | 3 | P1 | rating 4.1 giu nguyen - van la bom hen gio acrylic (101 rv, 697 listing ALL on sale) | P1: sua listing acrylic ('printed acrylic not glass' + anh that + dong goi chong vo); KHONG scale Ads truoc khi sua; canh nguong 4.0 |
| E85 | NOVIXRA | not_selling | 1 | P1 | SUS co don (first order 2026-06-05) · bank NO | P1: VERIFY BANK chua xong + khang cao — qua han fix 20/07 (+11d) |
| E93 | Arvyno | active | 1 | P1 | SUS co don (first order 2026-06-05) · bank NO | P1: VERIFY BANK chua xong + khang cao — qua han fix 20/07 (+11d) |
| E92 | NoviForm | active | 1 | P1 | SUS co don (first order 2026-06-14) · bank NO | P1: VERIFY BANK chua xong + khang cao — qua han fix 20/07 (+11d) |
| E55 | NovaBirchStudio | active | 1 | P1 | SUS co don (first order 2026-06-16) · bank NO | P1: VERIFY BANK chua xong + khang cao — qua han fix 20/07 (+11d) |
| E62 | MoonSprigDesigns | active | 1 | P1 | SUS co don (first order 2026-06-29) · bank NO | P1: VERIFY BANK chua xong + khang cao — qua han fix 20/07 (+11d) |
| E172 | Aurelinx | active | 1 | P1 | SUS co don (first order 2026-07-03) · bank NO | P1: VERIFY BANK chua xong + khang cao — qua han fix 20/07 (+11d) |
| E61 | WillowPeakStudio | active | 1 | P1 | SUS co don (first order 2026-07-03) · bank NO | P1: VERIFY BANK chua xong + khang cao — qua han fix 20/07 (+11d) |
| E188 | Elorianestudio | active | 1 | P1 | SUS co don (first order 2026-06-29) · bank NO | P1: VERIFY BANK chua xong + khang cao — qua han fix 20/07 (+11d) |
| E193 | HoanElly | active | 5 | P2 | phu thuoc Ads + discount 60% bao mon bien | theo doi ACOS; test giam discount 45-50%; canh rating 4.3 nguong can thiep |
| E26 | Aurevanelis | active | 2 | P2 | rating 2.4 - 'sticker on plastic' | KHONG bom Ads; neu giu phai thay toan bo anh sang anh that |
| E1 | Stitchavita | not_selling | 1 | P2 | dinh chi du rating tot | nop/kiem tra khang cao Etsy - tai san dang cuu |
| E127 | Xaloryva | active | 1 | P2 | XUNG DOT: registry SUS nhung trang public dang ACTIVE (quet 31/07, sales an) | TEAM kiem tra: login Shop Manager. Vao duoc binh thuong = DA DUOC MO LAI -> bao cao ngay (data quy cho phan tich sweep); hien suspension = chi la vo public, giu nguyen SUS |
| E146 | LUNAVEXOR | active | 1 | P2 | XUNG DOT: registry SUS nhung trang public dang ACTIVE (quet 31/07, sales an) | TEAM kiem tra: login Shop Manager. Vao duoc binh thuong = DA DUOC MO LAI -> bao cao ngay (data quy cho phan tich sweep); hien suspension = chi la vo public, giu nguyen SUS |
| E155 | Valnexiro | active | 1 | P2 | XUNG DOT: registry SUS nhung trang public dang ACTIVE (quet 31/07, sales an) | TEAM kiem tra: login Shop Manager. Vao duoc binh thuong = DA DUOC MO LAI -> bao cao ngay (data quy cho phan tich sweep); hien suspension = chi la vo public, giu nguyen SUS |
| E190 | Avenorhomely | active | 1 | P2 | XUNG DOT: registry SUS nhung trang public dang ACTIVE (quet 31/07, sales an) | TEAM kiem tra: login Shop Manager. Vao duoc binh thuong = DA DUOC MO LAI -> bao cao ngay (data quy cho phan tich sweep); hien suspension = chi la vo public, giu nguyen SUS |
| E48 | StarlitCoveCo | active | 1 | P2 | XUNG DOT: registry SUS nhung trang public dang ACTIVE (quet 31/07, sales an) | TEAM kiem tra: login Shop Manager. Vao duoc binh thuong = DA DUOC MO LAI -> bao cao ngay (data quy cho phan tich sweep); hien suspension = chi la vo public, giu nguyen SUS |
| E107 | Xenavyra | active | 1 | P2 | XUNG DOT: registry SUS nhung trang public dang ACTIVE (quet 31/07, sales an) | TEAM kiem tra: login Shop Manager. Vao duoc binh thuong = DA DUOC MO LAI -> bao cao ngay (data quy cho phan tich sweep); hien suspension = chi la vo public, giu nguyen SUS |
| E77 | ZAVYNTA | active | 1 | P2 | XUNG DOT: registry SUS nhung trang public dang ACTIVE (quet 31/07, sales an) | TEAM kiem tra: login Shop Manager. Vao duoc binh thuong = DA DUOC MO LAI -> bao cao ngay (data quy cho phan tich sweep); hien suspension = chi la vo public, giu nguyen SUS |
| E185 | Norivelledesign | active | 1 | P2 | XUNG DOT: registry SUS nhung trang public dang ACTIVE (quet 31/07, sales an) | TEAM kiem tra: login Shop Manager. Vao duoc binh thuong = DA DUOC MO LAI -> bao cao ngay (data quy cho phan tich sweep); hien suspension = chi la vo public, giu nguyen SUS |
| E150 | Elvarixo | active | 1 | P2 | XUNG DOT: registry SUS nhung trang public dang ACTIVE (quet 31/07, sales an) | TEAM kiem tra: login Shop Manager. Vao duoc binh thuong = DA DUOC MO LAI -> bao cao ngay (data quy cho phan tich sweep); hien suspension = chi la vo public, giu nguyen SUS |
| E169 | Kindelora | not_selling | 1 | P2 | SUS co don (first order 2026-06-18) · bank OK | khang cao Etsy (bank OK) — qua han fix 20/07 (+11d) |
| E114 | Zyvaneli | not_selling | 1 | P2 | SUS co don (first order 2026-05-25) · bank OK | khang cao Etsy (bank OK) — qua han fix 20/07 (+11d) |
| E109 | Zarvynix | not_selling | 1 | P2 | SUS co don (first order 2026-06-17) · bank OK | khang cao Etsy (bank OK) — qua han fix 20/07 (+11d) |
| E84 | ARVIXON | not_selling | 1 | P2 | SUS co don (first order 2026-05-25) · bank OK | khang cao Etsy (bank OK) — qua han fix 20/07 (+11d) |
| E47 | BlueWillowWorks | not_selling | 1 | P2 | SUS co don (first order 2026-06-22) · bank OK | khang cao Etsy (bank OK) — qua han fix 20/07 (+11d) |
| E4 | ThreadMelodia | active | 4 | P3 | 5 tuan khong listing moi | day 10-15 listing back-to-school teacher |
| E257 | VintagebyTung | active | 4 | P3 | tote $10.95 ban re | test nang tote $12.95-13.95; tach section Tote |
| E135 | VDKHandmade | active | 3 | P3 | LIVE (first order 2026-05-11, bank OK) · chua cat canh | gop hoac dung lam shop test niche moi / LIVE giua song lien doi: khong tao them account tu cung moi truong; giu bank/thong tin sach; theo doi daily |
| E24 | Celivandora | active | 2 | P3 | cung loi ky vong acrylic | nghieng sang hat; sua anh neu giu suncatcher |
| E43 | DreamPineCo | active | 2 | P3 | LIVE (first order 2026-06-08, bank OK) · khong discount -> vo hinh | bat discount 25-40% hoac buong (quyet trong 2 tuan) / LIVE giua song lien doi: khong tao them account tu cung moi truong; giu bank/thong tin sach; theo doi daily |
| E42 | GoldenMossWorks | active | 2 | P3 | LIVE (first order 2026-05-31, bank OK) · khong discount -> vo hinh | nhu E43 / LIVE giua song lien doi: khong tao them account tu cung moi truong; giu bank/thong tin sach; theo doi daily |
| E81 | VELNIXA | active |  |  |  |  |
| E119 | Zyvorexa | active |  |  |  |  |
| E80 | TORVEXA | active |  |  |  |  |

## Về REVIEW và TĂNG TRƯỞNG từng account
- Đang có: rating + số review + sales + listings mỗi lần quét (browser thật). Từ hôm nay mỗi lần quét append vào history.jsonl → từ NGÀY MAI có Δ1d, sau 1 tuần có Δ7d cho sales/reviews/rating từng account; routine tự tính và in ▲/▼ vào bản tin (luật 25).
- KHÔNG trừ chéo 2 hệ đếm (số report tay vs số quét browser — vd E193 460 vs 1160 là 2 nguồn khác nhau).
- Chưa có: NỘI DUNG review (text). Có thể mở rộng verify_shops đọc 10-20 review mới nhất của các store tier A (E29 trước tiên — để xác nhận khách chê acrylic đúng như giả thuyết). Nói một câu là tôi build.

## Câu treo chờ user
1. 2 mã SUS NEW thiếu (37 vs 35) · 2. E267 'Thúy Ngân' = Ngân Trần/Ngân Huỳnh · 3. E185 owner thật (Năng06/Ly09) · 4. Kết quả team login 9 shop 'SUS-nhưng-public-active' · 5. Bảng so sánh setup Năng06 vs Ly09 (proxy/profile/email/SĐT/thẻ).

## BÀI HỌC ÁP CHO LỊCH CÁC DỰ ÁN KHÁC (website, GritFell, Genus, Gerbera...)
1. **Registry trước, report sau**: mọi dự án cần 1 file JSON "nguồn sự thật" (store/page/sản phẩm → chủ → trạng thái) trong repo; lịch chỉ ĐỌC nó và flag mâu thuẫn, không parse chat. Gap thì flag chờ chốt, không đoán.
2. **Provenance + carry**: mỗi số mang nhãn nguồn + ngày (live/carry/registry/nội bộ). Nguồn chết thì carry số cũ ghi rõ mốc — lịch không bao giờ gãy, chỉ bớt tươi.
3. **Quy tắc 2 lần liên tiếp**: trạng thái đổi (site down, shop sus, rank rớt) chỉ tin khi 2 lần quét liên tiếp cùng kết quả — tránh alert ma do flap (bài E188/E172).
4. **Số máy đọc phải đối chiếu mắt người ít nhất 1 lần** trước khi thành cảnh báo (bài E29 4.1 bị parser đọc 4.0).
5. **Chia 3 vai**: fetch (nơi không bị chặn — browser máy user), merge + gác chất lượng (cloud routine), hiển thị (GAS/Telegram/sheet). Website cũng vậy: GSC/analytics fetch bằng API chính chủ, đừng scrape khi có API.
6. **Chuẩn thang đo công ty v1.0 áp mọi báo cáo**: Likert 1-5 màu (đọc màu trước), khẩn cấp P1-P4, lead 1-4 — mọi dự án dùng chung, không chế thang mới.
7. **SYNC file trong repo = cầu giữa các phiên Claude** — phiên nào cũng đọc đầu session, chốt gì ghi kèm ngày, ai chốt sau thắng.
8. **Task Scheduler pattern**: .bat = commit-trước-pull-sau → chạy job → commit/pull/push; Settings tick 'run missed task', trigger At-logon chạy bù; carry lo phần máy tắt. Dùng nguyên cho website (uptime, sitemap diff, GSC export...).
9. **Trạng thái con người/tài sản phải có bằng chứng** (last action, last order) — 'không có trong danh sách nghỉ' ≠ 'đang hoạt động'.
