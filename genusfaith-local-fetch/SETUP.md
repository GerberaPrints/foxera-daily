# GenusFaith PC-side Fetch — Cài 1 lần (~10 phút)

## Mục đích

GenusFaith bán **phụ kiện da devotional Công giáo**. Đối thủ trực diện đều là store Shopify — mà Shopify
mở sẵn endpoint `products.json` công khai. Job này chạy trên PC (nơi không bị chặn provenance như phiên
cloud tự động), quét 6 brand lúc **04:00 Bangkok**, ghi `genusfaith-live-fetch.json` ra gốc repo rồi push.
Routine cloud 04:30 đọc file đó làm nguồn LIVE.

Chia vai: **PC = FETCH** · **Cloud 04:30 = MERGE + gác chất lượng** · **report = HIỂN THỊ**.
PC tắt máy → cloud tự carry số cũ, bản tin không gãy.

## Vì sao feed này quý (3 thứ không lấy được bằng cách khác)

1. **`created_at` = ngày ra mắt CHÍNH XÁC của từng SP.** Không phải đoán qua "thấy nó trên web tuần trước".
   Nhờ vậy `is_new_14d` + `new_14d[]` cho biết đối thủ vừa drop cái gì, ngày nào, giá bao nhiêu — đây là
   nhịp ra hàng thật của họ.
2. **`available` ở CẤP VARIANT = tồn kho thật.** Đây là thứ giải quyết dứt điểm vụ
   **"lưới collection Catholight nói In Stock nhưng vào PDP thì Sold Out"** — lưới hiển thị theo trạng thái
   product, còn feed cho biết TỪNG variant còn hay hết. `oos_level` phân biệt rõ
   `in_stock` / `partial` (hết vài variant) / `sold_out` (hết sạch). `partial` chính là dạng bị lưới nói dối.
3. **`product_types{}` = BẢN ĐỒ ĐỊNH DẠNG chính xác.** Câu "Feratia chạy mấy định dạng?" được trả lời bằng
   đếm máy trên **toàn catalog**, không phải đếm tay trên trang 1 rồi đoán.

**Lưu ý phân trang (quan trọng):** `?limit=250` MỘT MÌNH chỉ trả trang đầu — Feratia trả 26 SP trong khi
`/collections/all` của họ có 13 trang. Script cuộn `&page=1,2,3,...` cho tới khi `products[]` rỗng hoặc chạm
trần `MAX_PAGES = 12`, nghỉ 1.5s giữa 2 trang. Mỗi brand có `pages_fetched` + `hit_page_cap`. **Nếu
`hit_page_cap: true` thì `products_total` là SÀN, không phải tổng** — script tự gắn `page_cap_note`, và phải
nâng `MAX_PAGES` rồi chạy lại. Tương tự khi có `page_errors` (một trang giữa chừng lỗi): số đọc được là sàn.

Thêm 3 thứ nữa:

- **`material_variants` / `material_axis[]` — trường quan trọng nhất của file này.** Feratia và Afroyla dùng
  variant làm **trục CHẤT LIỆU** ("Premium Vegan Leather" vs "Top-Grain Leather" — tức là good/better trên
  cùng một SKU), còn Catholight dùng **trục SIZE** ("SMALL"/"MEDIUM") và một số SP trộn thêm chất liệu
  ("VEGANIQUE LEATHER"/"TOP-GRAIN LEATHER") → **trục HỖN HỢP**. Script tự phân loại bằng
  `classify_variant_axis()`, ghi `variant_axis` cho từng SP và `variant_axis_dominant` +
  `variant_axis_breakdown` cho từng brand. Bốn giá trị: `material` · `size` · `single` · `mixed`.
  Ghép với `price_bands{}` là ra chênh lệch giá giữa hai bậc chất liệu.

- **`base_variant_note` — ĐỌC TRƯỚC KHI SO GIÁ. Đây là cái bẫy đắt nhất trong dự án này.**
  Bậc giá hiển thị của một brand là bậc của **variant ĐẦU TIÊN**. Ở Feratia variant đầu tiên là
  "Premium Vegan Leather" (26/26 SP), ở Catholight là "VEGANIQUE LEATHER". Nghĩa là **mọi so sánh giá từ
  trước tới nay đã đem DA THẬT của GenusFaith so với DA VEGAN của đối thủ — sai vế, và luôn làm GenusFaith
  trông đắt hơn thực tế.** Trường này đếm tần suất title của variant đầu tiên (`counts`, `dominant`,
  `dominant_share`, `median_price_by_base_variant`) và tự gắn cờ `MISMATCH_RISK` khi variant đầu phổ biến
  nhất là vegan/PU/faux. **Muốn so cùng hạng thì lấy variant top-grain trong `products[].variants`, KHÔNG
  dùng `price_min`.**
- **`changes{}` — diff so với lần chạy trước.** Đây là thứ khiến file có giá trị hơn một ảnh chụp đơn thuần:
  `new_products[]`, `removed_products[]`, `price_changes[]` (handle, old, new), `stock_flips[]`
  (handle, oos_level cũ → mới). Đọc `changes{}` là biết đêm qua thị trường động gì.

## 5 bước cài

**Bước 1 — Clone repo (nếu máy chưa có)**

```bat
git clone "https://x-access-token:<PAT>@github.com/GerberaPrints/foxera-daily.git" C:\genusfaith\foxera-daily
```

`<PAT>` = fine-grained PAT quyền Contents: Read and write. Nếu máy đã có sẵn repo FoxEra thì dùng luôn
thư mục đó — chỉ cần sửa đường dẫn trong `.bat`.

**Bước 2 — Sửa đường dẫn trong `.bat`**

Mở `genusfaith-local-fetch\run_genusfaith_fetch.bat`, sửa dòng:

```bat
cd /d C:\genusfaith\foxera-daily
```

thành đường dẫn THẬT nơi bạn clone. Đây là placeholder, gần như chắc chắn sai trên máy bạn.

**Bước 3 — Test tay 1 lần**

```bat
cd /d C:\genusfaith\foxera-daily
python genusfaith-local-fetch\genusfaith_fetch.py
```

Kỳ vọng (theo kiểm chứng tay 05/08/2026): đọc được **feratia, afroyla, westcoastcatholic, catholight**;
**blessac** vào `errors[]` (known-blocked); **venxara** chưa từng test — được thì tính là bonus, không được
thì cũng vào `errors[]`. Job vẫn exit 0. Cần Python 3.8+ trong PATH; stdlib-only, không cần pip.

Chạy mất khoảng **1–3 phút** (phân trang + nghỉ 1.5s giữa các trang) — đứng im không có nghĩa là treo.
Script in ra mỗi brand 1 dòng: số SP, số trang, trục variant, và variant đầu tiên phổ biến nhất. Nếu thấy
dòng `!! ...DA VEGAN/PU...` thì đó là cảnh báo so giá sai vế, không phải lỗi.

**Bước 4 — Đăng ký Task Scheduler**

1. Task Scheduler → **Create Task** (không phải Basic Task).
2. General: tên "GenusFaith PC Fetch" · Run whether user is logged on or not (tuỳ chọn).
3. Triggers: **Daily 04:00** (giờ máy = Bangkok) — chạy trước routine cloud 04:30 để cloud đọc được số của
   CÙNG NGÀY. Thêm trigger phụ **At log on** để chạy bù khi máy tắt lúc 04:00.
4. Actions: Start a program → `C:\genusfaith\foxera-daily\genusfaith-local-fetch\run_genusfaith_fetch.bat`.
5. Settings: tick **"Run task as soon as possible after a scheduled start is missed"**.

**Bước 5 — Kiểm tra sau 1 đêm**

Mở `genusfaith-local-fetch\fetch_log.txt` — mỗi lần chạy 1 dòng
(`brands x/6 | products N | new14d N | errors N | changes ...`). Và xem commit "genusfaith pc-fetch ..."
đã lên GitHub chưa.

## Cách sửa khi đổi brand

Toàn bộ danh sách nằm trong dict **`TARGETS`** ở đầu `genusfaith_fetch.py`. Thêm/bớt/sửa một brand là sửa
đúng chỗ đó, không cần đụng phần còn lại. Mỗi mục cần đủ 5 khoá:

```python
"tenbrand": {
    "id": "tenbrand",
    "label": "Tên hiển thị",
    "url": "https://tenbrand.com/products.json?limit=250",
    "role": "direct",          # "direct" = đối thủ trực diện | "lifestyle" = brand bối cảnh
    "known_blocked": False,    # True nếu đã xác nhận bị chặn
},
```

Mẹo khi thêm brand mới:

- Test bằng trình duyệt trước: mở `https://<domain>/products.json?limit=250`. Ra JSON → dùng được.
- Root báo lỗi (như **catholight**) → thử URL collection:
  `https://<domain>/collections/<handle>/products.json?limit=250`. Lưu ý: khi dùng URL collection thì
  `products_total` là của RIÊNG collection đó, KHÔNG phải toàn store — script tự gắn `scope_note` cho catholight,
  nếu bạn thêm brand collection khác thì nên gắn ghi chú tương tự.
- Bị chặn (timeout / 403) → **cứ giữ trong `TARGETS`** và đặt `known_blocked: True`. Giữ lại để phát hiện
  ngày họ mở lại; brand đó chỉ vào `errors[]`, không làm hỏng job.

### Danh sách hằng số cần sửa (đầu file `genusfaith_fetch.py`)

| Hằng số | Mặc định | Khi nào sửa |
|---|---|---|
| `TARGETS` | 6 brand | Thêm/bớt/đổi đối thủ (xem trên) |
| `TIMEOUT` | `25` | Mạng chậm → tăng 40–60 |
| `MAX_PAGES` | `12` | Brand nào báo `hit_page_cap: true` → nâng lên (mỗi trang 250 SP) |
| `PAGE_SLEEP` | `1.5` | Nghỉ giữa 2 trang. Bị 429/chặn → tăng 3–5 |
| `_SIZE_RE` / `_MATERIAL_RE` | regex | Thêm từ khoá chất liệu/size mới khi gặp brand lạ |
| `NEW_WINDOW_DAYS` | `14` | Muốn cửa sổ "hàng mới" rộng/hẹp hơn |
| `SCHEMA_VERSION` | `"1.0"` | Khi đổi cấu trúc JSON — phải báo cloud biết |
| `OUT_NAME` | `"genusfaith-live-fetch.json"` | Đổi tên file output (nhớ sửa cả 2 dòng `git add` trong `.bat`) |
| `BANGKOK` | `UTC+7` | Đổi múi giờ |
| `UA` | Chrome desktop | Hiếm khi cần |

Đổi giờ chạy: sửa trigger trong Task Scheduler **và** dòng REM trong `.bat` cho khớp. Nguyên tắc bất di bất
dịch: **PC phải chạy xong trước routine cloud** (hiện là 04:30).

## Quy tắc an toàn repo (nhiều job chạy song song)

- `.bat` CHỈ `git add` đúng 2 đường dẫn: `genusfaith-live-fetch.json` + `genusfaith-local-fetch/fetch_log.txt`.
  **TUYỆT ĐỐI KHÔNG `git add -A`** — sẽ nuốt file dở dang của job khác.
- Luôn `git pull --rebase origin main` trước push. **KHÔNG BAO GIỜ `--force`.**
- Brand lẻ fail → ghi `errors[]`, job vẫn exit 0 và vẫn push (phần đọc được vẫn có giá trị).
- **0 brand nào đọc được** → `sys.exit(1)` → `.bat` dừng, KHÔNG push, cloud carry số cũ.
  Đây là hành vi ĐÚNG, không phải bug.
- Trung thực: brand fail thì **không có key trong `brands{}`** — cloud không bao giờ đọc phải số bịa.
  Giá không parse được → `None` kèm `notes`.

## GIỚI HẠN — cái feed này KHÔNG cho biết

Đọc kỹ mục này trước khi kết luận bất cứ điều gì từ file JSON.

- **KHÔNG có review.** `products.json` không trả review, rating, số sao. Muốn biết đối thủ được đánh giá ra
  sao phải vào widget review trên PDP (Judge.me/Loox/Okendo) — việc đó cần browser thật, không phải urllib.
- **KHÔNG có ngày review.** Nên **không suy ra được ngày bán hàng đầu tiên** hay nhịp bán. `created_at` là
  ngày SP được TẠO trong admin, không phải ngày có đơn đầu tiên.
- **KHÔNG có traffic.** Không biết brand nào đông khách, không biết nguồn khách, không biết thứ hạng SEO.
- **KHÔNG có doanh số.** `available: false` chỉ nói HẾT HÀNG — có thể vì bán chạy, mà cũng có thể vì nhập
  hàng trễ hoặc chủ shop tự tắt. Đừng đọc sold-out thành "bán tốt".
- **KHÔNG có số lượng tồn.** Chỉ có boolean còn/hết, không có "còn mấy cái".
- **KHÔNG có chi phí quảng cáo, không có creative.** Feed không dính gì tới ads.
- **KHÔNG có SP ẩn/unpublished** và không có SP ở ngoài phạm vi URL đang quét (đặc biệt là catholight — chỉ
  đọc 1 collection).
- **KHÔNG có currency.** `products.json` không trả mã tiền tệ; số giá là theo market mặc định của shop
  (giả định USD). Nếu shop đổi market mặc định, số sẽ lệch mà file không tự biết.
- **KHÔNG cho biết variant nào là variant HIỂN THỊ MẶC ĐỊNH trên PDP.** Ta chỉ suy ra từ thứ tự mảng
  `variants[]` (phần tử đầu tiên) — đây là **INFERENCE, KHÔNG PHẢI FACT**. Shopify có thể hiển thị mặc định
  một variant khác do theme, do `selected_or_first_available_variant` (variant đầu còn hàng, không phải
  variant đầu mảng), hoặc do link `?variant=` trong quảng cáo. `base_variant_note` rất hữu ích nhưng phải
  đọc đúng mức tin cậy đó — muốn chắc thì mở PDP xem tận mắt.
- **`hit_page_cap: true` nghĩa là số CHƯA ĐỦ.** Khi đó `products_total` là SÀN, không phải tổng catalog.
