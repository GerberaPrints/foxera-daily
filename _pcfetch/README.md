# `_pcfetch` — bộ máy fetch dùng chung cho mọi dự án FoxEra

**v1.0 · 17/08/2026**

Một bộ máy, nhiều file cấu hình. Thêm dự án = thêm **1 file JSON**, không đụng code.

```
<repo>/
  _pcfetch/
    pcfetch.py              ← bộ máy (không sửa khi thêm dự án)
    run_pc_fetch.bat        ← chạy 1 dự án + đồng bộ git
    make_task.bat           ← tạo lịch Windows
    projects/
      gritfell.json         ← cấu hình từng dự án
      _TEMPLATE.json        ← mẫu để chép
    logs/                   ← nhật ký, tự sinh
  gritfell-live-fetch.json  ← đầu ra, nằm ở gốc repo
  gritfell-social-fetch.json
```

---

## Thêm một dự án mới — 3 bước

**1.** Chép mẫu:

```bat
copy _pcfetch\projects\_TEMPLATE.json _pcfetch\projects\genusfaith.json
notepad _pcfetch\projects\genusfaith.json
```

Sửa `project`, `feeds`, `policies`. Không cần social thì để `"enabled": false`.

**2.** Chạy thử:

```bat
_pcfetch\run_pc_fetch.bat genusfaith
```

**3.** Đặt lịch — giờ lệch nhau để không chen nhau khi push:

```bat
_pcfetch\make_task.bat genusfaith 04:00
_pcfetch\make_task.bat gritfell   04:30
_pcfetch\make_task.bat gerbera    04:45
```

Xong. Không cần bấm GUI, không cần file XML, không hardcode đường dẫn.

---

## Vì sao đóng gói lại như thế này

Trước đó mỗi dự án có một bản sao script riêng. Sửa một lỗi phải sửa 3 chỗ, và thực tế **2 chỗ bị bỏ quên** — Gerbera chết 5 ngày không ai biết vì `.bat` của nó trỏ vào bản clone thứ hai không có PAT. Một bộ máy + nhiều config thì sửa một lần ăn cả hệ thống.

### 4 lỗi đã trả giá, nay chặn ngay trong code

| Lỗi | Từng gây ra gì | Chặn thế nào |
|---|---|---|
| `git pull --rebase` khi cây bẩn | pull fail, push vẫn 0 → **báo DONE giả** | kiểm `errorlevel` sau **mỗi** bước git |
| `--autostash` | xung đột khi trả stash → repo kẹt unmerged | bỏ hẳn, không stash |
| `git checkout -- .` | revert **chính script của mình** — `.bat` v4 về v3, social v1.2 về v1.0 | commit `_pcfetch` trước, rồi `checkout` có `:(exclude)_pcfetch` |
| Hardcode `C:\Users\Admin\...` | Gerbera trỏ nhầm clone thứ hai | đường dẫn suy ra từ `%~dp0..` |

### 3 nguyên tắc dữ liệu

**PC chỉ lấy dữ liệu thô.** Không kết luận, không chấm điểm. Cloud đọc rồi mới diễn giải theo `P_SCORE_V2` / `DEMAND_SENSOR_MAP`.

**In bảng chẩn đoán.** Nguồn nào hỏng, hỏng vì gì, hiện ngay ra màn hình. Task Scheduler chỉ cho mã `0x1` vô nghĩa.

**Cấm báo cáo giả.** Nguồn lấy không được thì ghi vào `"errors"` trong JSON. *Không lấy được* ≠ *không có dữ liệu* — đây là luật `SOURCE_FAILURE_NOT_ABSENCE` trong registry. Cụ thể: bài Reddit lấy qua RSS **không có** điểm upvote nên để `null`, **tuyệt đối không để 0** — 0 sẽ bị đọc thành "bài này không ai quan tâm".

---

## Mã thoát

| Mã | Nghĩa |
|---|---|
| `0` | Chạy xong. **Kể cả khi social hỏng hết** — social là nguồn bổ sung, mất social còn hơn mất cả số SKU |
| `1` | **Toàn bộ** feed bắt buộc chết → không push, cloud chạy chế độ suy giảm |
| `2` | Sai tham số hoặc không có file cấu hình |

---

## Reddit — chỗ mong manh nhất, nói thẳng

Script gọi JSON/RSS **công khai, không xác thực**. Reddit chặn theo nhịp và trả `403` lẫn `429` lộn xộn: cùng một đường, `r/waterfowl` OK còn `r/duckhunting` 403, 30 phút sau thì ngược lại.

Đã làm hết mức có thể mà không cần tài khoản: thử 4 đường, nhớ đường nào sống, lùi 20s rồi 45s khi bị chặn, nghỉ 4s giữa mỗi sub, sub im lặng thì rơi xuống `hot`. Kết quả thực đo: **5/12 → khá hơn nhưng chưa chắc chắn**.

**Cách dứt điểm** — 5 phút, sau đó hết phụ thuộc may rủi:

1. `reddit.com/prefs/apps` → **create app** → loại **script** → redirect uri điền `http://localhost:8080`
2. Lấy `client_id` (chuỗi ngắn **ngay dưới** tên app) và `secret`
3. ```bat
   setx REDDIT_CLIENT_ID xxxxxxxx
   setx REDDIT_CLIENT_SECRET yyyyyyyy
   ```
4. **Đóng Command Prompt, mở lại** (`setx` chỉ ăn ở cửa sổ mới) → chạy lại → bảng ra `OK R0-oauth`

Một lần cho **mọi** dự án — biến môi trường dùng chung.

---

## Chẩn lỗi

| Thấy gì | Nghĩa |
|---|---|
| `SSL` | `python -m pip install certifi` rồi chạy lại |
| `PROXY` | Tắt VPN |
| `HTTP 403` ở feed/policy | Shop đó bật Cloudflare — bỏ khỏi config hoặc chấp nhận thiếu |
| `HTTP 403/429` ở Reddit | Làm OAuth ở trên |
| `NO-CHANNEL` | Kênh YouTube đổi handle — sửa trong config |
| `PULL FAILED` | `git status` xem repo có kẹt xung đột không |
| `Last Result 2147942402` | Sai đường dẫn `.bat` trong task |

Bảng chẩn đoán luôn in ra màn hình và nối vào `_pcfetch/logs/<dự_án>_log.txt`. Muốn biết hôm qua chạy ra sao thì mở file đó.
