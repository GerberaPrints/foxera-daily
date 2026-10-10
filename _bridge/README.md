# `_bridge` — cầu nối cloud ⇄ foxera-server qua repo git

**v1.1.0 · 10/10/2026 · tác giả: Claude (phiên GritFell), theo yêu cầu FoxEra "xây bridge để tự quét dữ liệu và tự nâng cấp".**

Phiên Claude trên cloud **không nối được tới máy** (không có device link). Nhưng repo này thì **cả hai bên đều ghi được**: job `_pcfetch` push từ máy lên mỗi 04:30 suốt 50+ ngày; phiên claude.ai/code push được vào `main` (chứng minh 21/08, commit `2399f3d`). Vậy dùng chính kênh đó.

```
cloud  ghi  _bridge/inbox/<id>.json     YÊU CẦU  (5 loại, xem dưới)
máy    chạy run_bridge.bat (lịch 30 phút): pull → bridge_agent.py → commit _bridge → push
máy    ghi  _bridge/outbox/<id>.json    KẾT QUẢ  (JSON, đã che secret)
        _bridge/done/<id>.json           yêu cầu đã xử lý (di chuyển, không xoá)
        _bridge/health.json              nhịp sống: last_run, host, stats
```

## Cài một lần trên foxera-server (dán-là-chạy)

```bat
cd /d C:\Users\Admin\foxera-daily
git pull --rebase origin main
copy _bridge\bridge_config.example.json _bridge\bridge_config.json
notepad _bridge\bridge_config.json
```
Sửa 5 đường dẫn root cho đúng máy (mặc định đã là `D:\FoxEra\foxera-platform`, `D:\FoxEra`, `D:\Kinmireva`, `D:\GritFell`, `D:\GenusFaith`). Lưu. Rồi:

```bat
py -3.11 _bridge\bridge_agent.py --selftest
_bridge\run_bridge.bat
_bridge\make_bridge_task.bat 30
```

Kỳ vọng: selftest `PASS 12/12 — SACH`; `run_bridge.bat` in `[bridge] PUSH OK - DONE`; trên GitHub xuất hiện `_bridge/outbox/20261010-01-ping.json` với `"stdout": "pong"`.

**Kiểm phiên bản đang chạy (đếm được):** `py -3.11 -c "import sys;sys.path.insert(0,'_bridge');import bridge_agent as b;print(b.VERSION)"` → `1.1.0`.

## v1.1.0 (10/10 09:45) — sau lượt chạy thật đầu tiên trên FOXERA-SERVER
- `cmd` chạy với stdin=NUL → `pause` trong `.bat` không còn treo tới timeout (idea_check 594 s).
- `keep: head|tail` theo lệnh (schtasks giữ đầu, pytest giữ đuôi).
- **`cron.json`**: lệnh chạy MỖI lượt; chỉ ghi `outbox/cron-<tên>.json` khi kết quả đổi (không đẻ commit 30 phút/lần).
- **`sync_feed_gritfell`** (`tools/sync_feed.py`): chép `<repo>\gritfell-live-fetch.json` → `D:\FoxEra\ideas\signals\gritfell\` khi `fetched_at` mới hơn. Lý do: `idea_check` 10/10 báo nguồn `shopify_feed` cũ 10 ngày → engine chống trùng với 167 SP cũ, sót 20 SKU mới. Đang trong `cron.json`.
- Bảo mật cần biết: `run_bridge.bat` `git pull` rồi chạy `bridge_agent.py` từ repo → **mã agent tự cập nhật theo repo** (giống `_pcfetch`). Ai có quyền push vào repo là sửa được agent. Quyền push hiện chỉ thành viên org; giữ nguyên như `_pcfetch`.

## 5 loại yêu cầu — và chỉ 5

| type | làm gì | giới hạn |
|---|---|---|
| `tree` | liệt kê file trong một root (path/size/mtime/sha16) | ≤5000 mục, bỏ `.git/__pycache__/venv` |
| `read` | đọc 1 file, **che secret** bằng `PATTERNS` của `gpredactsecrets.py` + OpenAI/GitHub/Anthropic key | ≤200 KB/file |
| `hash` | sha256 nhiều file | — |
| `cmd` | chạy **tên lệnh** có trong `ALLOWED_CMDS` (chuỗi cố định trong `bridge_agent.py`) | không nhận tham số từ inbox; timeout 600 s |
| `stage_apply` | chép gói `_bridge/stage/<tên>/` vào root đích theo `MANIFEST.json` | **chỉ khi** sha256(manifest) có trong `%USERPROFILE%\foxera_bridge_approve.txt` (ghi bằng `approve.bat`) — backup bản cũ vào `_bridge/backup/` |

Đường dẫn viết dạng `rootkey:duong/dan/tuong/doi` (vd `platform:src/foxera_brands/gritfell/ideas.yaml`). Ra ngoài root, kể cả bằng `..` → `PermissionError`, ghi vào outbox, không chặn task khác.

## Ba luật an toàn — vì repo này PUBLIC
1. **Không thực thi mã tuỳ ý từ repo.** Muốn thêm lệnh = sửa `ALLOWED_CMDS` trong `bridge_agent.py` = qua commit có người thấy.
2. **Chỉ đọc trong root khai báo.** `bridge_config.json` nằm trên máy, **không commit** (`.gitignore`).
3. **Mã mới không tự áp.** Cloud đặt gói vào `stage/` + manifest; **người** chạy `approve.bat <sha>` trên máy; lượt sau agent mới chép, có backup. Máy tự quét — người duyệt mã.

## Luật vận hành kế thừa (đã trả giá ở `_pcfetch`)
- Kiểm `errorlevel` sau **mỗi** lệnh git · không `git add -A` · tree bẩn bởi file lạ → **DỪNG và báo**, không tự dọn · bước cuối `git diff --quiet HEAD origin/main` chống DONE giả · `GIT_ASK_YESNO=false`.
- `.bat` thuần ASCII, CRLF, không `chcp`, không dấu ngoặc đơn trong `echo`.
- Ghi file: `.tmp` rồi `os.replace` · kết quả parse lại bằng `json.loads` trước khi coi là xong (S7) · ngày giờ theo máy (Bangkok).
- Không lấy được thì ghi `"status":"error"` kèm nguyên nhân — không để trống (S4).

## Lô yêu cầu đầu tiên (14 task, đã nằm trong `inbox/`)
ping · python version · engine version · schtasks · tree platform/kinmireva/gritfell/foxera · đọc `gritfell/ideas.yaml`, `km_duyet.py`, `km_ten.py`, `ideas/__init__.py` · `idea_check gritfell` · `idea_audit`.
Mục đích: xác minh bridge sống + lấy nguồn thật để port `gr_duyet` / `gr_ten` cho GritFell (xem project doc `gritfell-ops-stack-v0.1`).

## Khi nào cần người
- `run_bridge.bat` in `DUNG - tree con thay doi chua commit` → có file lạ ở repo, commit hoặc vứt tay rồi chạy lại.
- Outbox của `stage_apply` ghi `CHUA DUOC NGUOI DUYET` → đọc gói trong `stage/`, nếu đồng ý chạy `approve.bat <sha>`.
- `health.json` quá 2 giờ không đổi → task lịch chết; `schtasks /Query /TN "FoxEra Bridge" /V /FO LIST | findstr "Last Result"`.
