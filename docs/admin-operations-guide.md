# Hướng Dẫn Vận Hành Admin

Tài liệu tham khảo đầy đủ cho mọi tính năng trong trang quản trị tại `/admin`.

---

## Mục Lục

1. [Truy Cập & Phân Quyền](#1-truy-cập--phân-quyền)
2. [Bảng Điều Khiển](#2-bảng-điều-khiển)
3. [Sản Phẩm](#3-sản-phẩm)
4. [Danh Mục](#4-danh-mục)
5. [Quản Lý Nội Dung](#5-quản-lý-nội-dung)
6. [Đơn Hàng](#6-đơn-hàng)
7. [Kho Hàng Tồn Kho](#7-kho-hàng-tồn-kho)
8. [Kho Bãi](#8-kho-bãi)
9. [Đơn Đặt Hàng Nhập](#9-đơn-đặt-hàng-nhập)
10. [Nhà Cung Cấp](#10-nhà-cung-cấp)
11. [Hoàn Tiền](#11-hoàn-tiền)
12. [Khiếu Nại](#12-khiếu-nại)
13. [Báo Cáo](#13-báo-cáo)

---

## 1. Truy Cập & Phân Quyền

### Đăng nhập

Truy cập `/admin/login`. Nhập email và mật khẩu admin, sau đó nhấn **Đăng nhập**.

Tài khoản admin được tạo qua các script CLI:

```bash
node scripts/create-user.mjs    # tạo tài khoản người dùng
node scripts/assign-admin.mjs   # cấp quyền admin
```

### Mô hình phân quyền

Mỗi phần trong trang admin yêu cầu một quyền cụ thể. Quyền được lưu theo từng người dùng trong bảng `user_admin_roles`. Vai trò `super_admin` đáp ứng tất cả các quyền.

| Quyền | Cho phép |
|---|---|
| `*` | Toàn quyền truy cập admin (bảng điều khiển) |
| `products:read` | Xem danh sách sản phẩm |
| `products:update` | Tạo, chỉnh sửa, xóa sản phẩm và biến thể |
| `categories:update` | Tạo, chỉnh sửa, xóa danh mục |
| `cms:update` | Toàn bộ quản lý nội dung (trang, phần, banner, điều hướng, footer, brand asset) |
| `orders:read` | Xem đơn hàng và chuyển đổi trạng thái |
| `inventory:read` | Xem mức tồn kho |
| `inventory:update` | Điều chỉnh tồn kho, quản lý kho bãi |
| `suppliers:update` | Tạo, chỉnh sửa, xóa nhà cung cấp |
| `purchase_orders:read` | Xem đơn đặt hàng nhập |
| `purchase_orders:update` | Tạo đơn đặt hàng nhập, ghi nhận hàng nhập |
| `payments:read` | Xem danh sách hoàn tiền |
| `complaints:read` | Xem và quản lý khiếu nại |
| `reports:read` | Xem tất cả báo cáo |

---

## 2. Bảng Điều Khiển

**Đường dẫn:** `/admin`  
**Quyền:** `*`

Bảng điều khiển hiển thị sáu ô số liệu trực tiếp, cập nhật mỗi lần tải trang:

| Ô số liệu | Ý nghĩa |
|---|---|
| Đơn hàng đang mở | Số đơn hàng chưa hoàn thành hoặc chưa hủy |
| SKU tồn kho thấp | Số SKU có ít hơn 5 đơn vị khả dụng |
| Hoàn tiền đang chờ | Số yêu cầu hoàn tiền ở trạng thái `requested` hoặc `approved` |
| Khiếu nại đang mở | Số khiếu nại ở trạng thái `open` hoặc `investigating` |
| Đơn đặt hàng nhập | Số đơn ở trạng thái `submitted` hoặc `partially_received` |
| Doanh thu hôm nay | Tổng giá trị đơn hàng đã thanh toán trong ngày |

Sử dụng thanh điều hướng bên trái để di chuyển đến các mục khác.

---

## 3. Sản Phẩm

**Đường dẫn:** `/admin/products`  
**Quyền:** `products:read` (xem), `products:update` (tạo/chỉnh sửa/xóa)

### 3.1 Danh sách sản phẩm

Hiển thị 50 sản phẩm được tạo gần nhất với các cột: Tên, Trạng thái, Số lượng biến thể.

Thao tác:
- **Sản phẩm mới** — mở form tạo mới
- **Nhập CSV** — mở trang nhập hàng loạt
- **Chỉnh sửa** — mở form chỉnh sửa sản phẩm
- **Xóa** — xóa vĩnh viễn sản phẩm cùng toàn bộ biến thể và ảnh

### 3.2 Tạo sản phẩm mới

**Đường dẫn:** `/admin/products/new`

Điền vào form thông tin cơ bản:

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| Tên sản phẩm | ✱ | Hiển thị trên trang sản phẩm và thẻ sản phẩm |
| Trạng thái | ✱ | `draft` — ẩn; `published` — công khai; `archived` — lưu trữ |
| Nhiệt độ bảo quản | ✱ | `live` (sống), `fresh` (tươi), `chilled` (ướp lạnh), `frozen` (đông lạnh), `ready` (chế biến sẵn) |
| Xuất xứ | — | Văn bản tự do, ví dụ: `Na Uy`, `Việt Nam` |
| Mô tả ngắn | — | Dòng tóm tắt hiển thị trên thẻ sản phẩm |
| Mô tả chi tiết | — | Mô tả đầy đủ về sản phẩm |

Sau khi gửi, bạn được chuyển hướng đến trang chỉnh sửa để thêm biến thể, ảnh và sản phẩm liên quan.

### 3.3 Chỉnh sửa sản phẩm

**Đường dẫn:** `/admin/products/[id]/edit`

Trang chỉnh sửa có bốn phần:

#### Thông tin cơ bản
Các trường giống như form tạo mới. Đổi trạng thái thành `published` tại đây để công khai sản phẩm.

#### Biến thể & giá cả

Mỗi biến thể đại diện cho một SKU có thể mua (ví dụ: gói 500g, gói 1kg).

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| SKU | ✱ | Mã đơn vị lưu kho duy nhất |
| Đơn vị | ✱ | Đơn vị hiển thị (ví dụ: `kg`, `con`, `hộp`) |
| Tóm tắt tùy chọn | — | Nhãn hiển thị trên bộ chọn (ví dụ: `500g`) |
| Giá niêm yết | ✱ | Giá gốc tính bằng VNĐ. Nhận số thập phân (tối đa 2 chữ số sau dấu phẩy) |
| Giá khuyến mãi | — | Giá giảm; hiển thị cùng giá gốc bị gạch ngang. Để trống nếu không giảm giá |
| Kích hoạt | — | Bật/tắt để ẩn biến thể mà không xóa |

Nhấn **Thêm biến thể** để thêm hàng mới. Cần ít nhất một biến thể đang kích hoạt thì sản phẩm mới có thể mua được trên storefront.

**Cách nhập giá.** Ô giá nhận cả số nguyên lẫn số thập phân, gõ theo kiểu nào cũng được. Ngay dưới ô có dòng **= …d** cho biết hệ thống sẽ lưu giá nào; hãy nhìn dòng này trước khi bấm **Lưu giá**.

| Bạn gõ | Được lưu thành |
|---|---|
| `125000` hoặc `125.000` | 125.000đ |
| `1.250.000` | 1.250.000đ |
| `125500,5` hoặc `125500.5` | 125.500,5đ |
| `125.500,75` | 125.500,75đ |

> Dấu chấm theo sau đúng 3 chữ số (`125.000`) được hiểu là dấu phân cách hàng nghìn, không phải phần thập phân. Giá chỉ giữ 2 chữ số thập phân; số lẻ hơn được làm tròn. Nếu dòng xem trước báo **Giá không hợp lệ**, hãy sửa trước khi lưu.

#### Hình ảnh

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| URL hình ảnh | ✱ | URL đầy đủ (Supabase Storage, CDN, Unsplash, v.v.) |
| Văn bản thay thế | — | Mô tả trợ năng; mặc định là tên sản phẩm |
| Thứ tự sắp xếp | — | Số nhỏ hơn = hiển thị trước; ảnh đầu tiên là thumbnail trên thẻ sản phẩm |

Nhấn **Thêm ảnh** để thêm nhiều ảnh. Nhấn **Xóa** để xóa một ảnh.

#### Sản phẩm liên quan

Chọn các sản phẩm khác để hiển thị trong mục "Có thể bạn cũng thích" trên trang sản phẩm. Gõ để tìm kiếm theo tên, chọn từ danh sách thả xuống rồi lưu.

### 3.4 Nhập hàng loạt qua CSV

**Đường dẫn:** `/admin/products/import`

1. Nhấn **Tải xuống file mẫu** để tải file CSV mẫu.
2. Điền vào file — mỗi hàng là một sản phẩm (một biến thể mỗi hàng):

| Cột | Bắt buộc | Ghi chú |
|---|---|---|
| `name` | ✱ | Tên sản phẩm |
| `status` | — | `draft` (mặc định) hoặc `published` |
| `temperature_class` | ✱ | `live`, `fresh`, `chilled`, `frozen`, `ready` |
| `origin` | — | Quốc gia hoặc vùng xuất xứ |
| `short_description` | — | Dòng tóm tắt |
| `description` | — | Mô tả chi tiết |
| `sku` | ✱ | Mã SKU duy nhất |
| `unit` | ✱ | Đơn vị hiển thị |
| `list_price` | ✱ | Giá tính bằng VNĐ (chỉ số) |
| `sale_price` | — | Giá khuyến mãi tính bằng VNĐ |

3. Tải file CSV đã điền lên và nhấn **Nhập sản phẩm**.
4. Trang hiển thị tổng số nhập thành công và lỗi từng hàng (nếu có).
5. Sau khi nhập, mở từng sản phẩm tại `/admin/products/[id]/edit` để thêm ảnh và công khai.

> **Lưu ý:** Nhập CSV tạo một biến thể mỗi hàng. Thêm các biến thể khác thủ công trên trang chỉnh sửa.

---

## 4. Danh Mục

**Đường dẫn:** `/admin/categories`  
**Quyền:** `categories:update`

### 4.1 Danh sách danh mục

Hiển thị tất cả danh mục với các cột: Tên, Slug, Danh mục cha, Thứ tự, Trạng thái.

Thao tác: **Danh mục mới**, **Chỉnh sửa**, **Xóa** trên mỗi hàng.

### 4.2 Tạo / chỉnh sửa danh mục

**Đường dẫn:** `/admin/categories/new` · `/admin/categories/[id]/edit`

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| Tên | ✱ | Tên hiển thị trên storefront |
| Slug | ✱ | Đường dẫn URL (chữ thường, dùng dấu gạch ngang). Thiết lập khi tạo; **không thể thay đổi** sau đó. |
| Mô tả | — | Văn bản tùy chọn hiển thị trên trang danh mục |
| URL hình ảnh | — | Ảnh hero cho trang danh mục |
| Danh mục cha | — | Chọn để tạo danh mục con. Để trống nếu là danh mục cấp cao nhất. |
| Thứ tự sắp xếp | — | Số nhỏ hơn = hiển thị trước trong danh sách |
| Trạng thái | ✱ | `Active` — hiển thị trên storefront; `Inactive` — ẩn |

Slug của danh mục xác định URL trên storefront: `/categories/[slug]`.

> Xóa danh mục không xóa các sản phẩm trong đó; chỉ xóa bản ghi danh mục.

---

## 5. Quản Lý Nội Dung

**Đường dẫn:** `/admin/content`  
**Quyền:** `cms:update`

Trung tâm nội dung quản lý sáu loại thực thể điều khiển nội dung hiển thị trên storefront. Xem thêm [Hướng Dẫn Quản Lý Nội Dung](admin-content-guide.md).

### 5.1 Trang (Pages)

Các container cấp cao nhất chứa các phần. Page key `home` là trang chủ storefront.

**Đường dẫn:** `/admin/content/pages/new` · `/admin/content/pages/[pageKey]/edit`

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| Page key | ✱ | Chữ thường, chữ số, dấu gạch ngang. Duy nhất. **Không thể thay đổi sau khi tạo.** |
| Tiêu đề | ✱ | Chỉ hiển thị trong admin |
| Trạng thái | ✱ | `draft`, `published`, `archived` |

### 5.2 Phần (Sections)

Các vùng bố cục bên trong một trang. Loại phần xác định component nào được render trên storefront.

**Đường dẫn:** `/admin/content/sections/new` · `/admin/content/sections/[id]/edit`

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| Trang | ✱ | Trang cha (đặt khi tạo) |
| Section key | ✱ | Duy nhất trong trang. Chữ thường, dấu gạch ngang. |
| Loại phần | ✱ | Xem bảng loại bên dưới |
| Tiêu đề | — | Tiêu đề tùy chọn hiển thị phía trên phần |
| Phụ đề | — | Văn bản phụ tùy chọn |
| Layout | — | `default` = lưới sản phẩm; `carousel` = một hàng sản phẩm trượt ngang (có nút ‹ › trên máy tính, vuốt trên điện thoại). Chỉ áp dụng cho `product_rail` và `flash_sale` |
| Thứ tự sắp xếp | — | Số nhỏ hơn = hiển thị cao hơn trên trang |
| Trạng thái | — | Active / Inactive |

**Các loại phần:**

| Loại | Component trên storefront |
|---|---|
| `hero` | Lưới banner hero toàn chiều rộng |
| `service_strip` | Hàng nổi bật dịch vụ dạng icon + nhãn |
| `category_shortcuts` | Lưới icon danh mục |
| `product_rail` | Danh sách sản phẩm (lưới, hoặc trượt ngang nếu Layout = `carousel`) |
| `flash_sale` | Đồng hồ đếm ngược + lưới sản phẩm |
| `promo_band` | Thanh thông báo khuyến mãi mỏng |
| `recommendation_tabs` | Đề xuất sản phẩm dạng tab |
| `partner_strip` | Dải logo đối tác |
| `content_highlights` | Lưới thẻ nội dung biên tập |
| `footer` | Vùng bố cục footer |

#### 5.2.1 Tab gợi ý ("Gợi ý cho bạn")

Phần loại `recommendation_tabs` hiển thị một hàng tab trên trang chủ (ví dụ: *Bữa cơm gia đình*, *Cuối tuần đãi khách*…). Mỗi tab có danh sách sản phẩm riêng; khách bấm tab nào thì lưới sản phẩm đổi sang sản phẩm của tab đó.

**Đường dẫn:** `/admin/content/sections/[id]/tabs` — vào **Nội dung → Phần CMS**, bấm **Tab & sản phẩm** trên hàng `recommendation_tabs` (hoặc link *Quản lý tab & sản phẩm gợi ý* trong trang Sửa phần).

| Thao tác | Cách làm |
|---|---|
| Thêm tab | Bấm **Thêm tab**, nhập **Tên tab** (tối đa 60 ký tự). **Khóa** được tạo sẵn, có thể đổi (chữ thường, số, gạch ngang; không trùng nhau). |
| Đổi tên tab | Sửa ô **Tên tab**. |
| Sắp xếp tab | Dùng nút ↑ / ↓ ở góc tab. Tab đầu tiên được chọn sẵn khi khách mở trang. |
| Xóa tab | Bấm biểu tượng thùng rác, xác nhận. |
| Thêm sản phẩm vào tab | Gõ tên vào ô *Tìm sản phẩm để thêm…*, chọn sản phẩm trong danh sách. Chỉ sản phẩm **published** mới xuất hiện. Tối đa 40 sản phẩm mỗi tab. |
| Sắp xếp / bỏ sản phẩm | Nút ↑ / ↓ và ✕ trên từng dòng sản phẩm. |
| Liên kết (tuỳ chọn) | Nếu điền (phải bắt đầu bằng `/` hoặc `#`, ví dụ `/categories/tom`), bấm tab sẽ **mở trang đó** thay vì đổi danh sách sản phẩm. |

Bấm **Lưu tab** để lưu — trang chủ cập nhật ngay. Mọi thay đổi chỉ được ghi khi bấm Lưu; dòng *Có thay đổi chưa lưu* nhắc bạn khi còn chỉnh sửa dở.

> **Lưu ý:**
> - Tab chưa chọn sản phẩm nào sẽ hiển thị **toàn bộ** sản phẩm của phần — hãy chọn sản phẩm cho từng tab.
> - Phần phải ở trạng thái **Active** mới hiện trên trang chủ. Tiêu đề, phụ đề, thứ tự và trạng thái chỉnh ở trang **Sửa phần**, không phải trang tab.
> - Một sản phẩm có thể nằm trong nhiều tab.

#### 5.2.2 Chọn sản phẩm cho phần ("Bán chạy" và các phần sản phẩm khác)

Phần loại `product_rail` và `flash_sale` hiển thị danh sách sản phẩm do bạn tự chọn. Phần **Bán chạy** trên trang chủ là một phần như vậy: nó nằm ngay dưới khung "Hải Sản Nhà Quê" và trên khung "Chợ hải sản hôm nay", dạng hàng trượt ngang.

**Đường dẫn:** `/admin/content/sections/[id]/products`. Vào **Nội dung → Phần CMS**, bấm **Sản phẩm** trên hàng của phần (ví dụ `best-sellers`), hoặc bấm link *Chọn sản phẩm hiển thị* trong trang **Sửa phần**.

| Thao tác | Cách làm |
|---|---|
| Thêm sản phẩm | Gõ tên vào ô *Tìm sản phẩm để thêm…* rồi chọn. Chỉ sản phẩm **published** mới xuất hiện trong danh sách tìm. Tối đa 40 sản phẩm. |
| Sắp xếp | Nút ↑ / ↓ trên từng dòng. Sản phẩm đầu tiên hiện đầu tiên. |
| Bỏ sản phẩm | Nút ✕ trên dòng sản phẩm. |
| Lưu | Bấm **Lưu sản phẩm**. Trang chủ cập nhật ngay. |

> **Lưu ý:**
> - Sản phẩm chỉ hiện trên trang chủ khi có **ít nhất một biến thể đang kích hoạt** (có giá). Nếu bạn chọn 5 sản phẩm mà chỉ thấy 2, hãy kiểm tra biến thể của 3 sản phẩm còn lại ở mục [3.3](#33-chỉnh-sửa-sản-phẩm).
> - Muốn phần hiện dạng lưới thay vì trượt ngang: vào **Sửa phần**, đổi **Bố cục** từ `carousel` sang `default`.
> - Muốn đổi vị trí phần trên trang chủ: sửa **Thứ tự** (số nhỏ hiện trước). "Bán chạy" đang là `5`, nằm giữa "Hải Sản Nhà Quê" (`0`) và "Chợ hải sản hôm nay" (`10`).
> - Nút **Xem thêm** của phần dẫn tới đường dẫn đã cấu hình sẵn cho phần đó.

### 5.3 Banner

Tài nguyên hình ảnh gắn vào một phần. Nhiều banner trong một phần `hero` tạo thành lưới hero.

**Đường dẫn:** `/admin/content/banners/new` · `/admin/content/banners/[id]/edit`

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| Phần | ✱ | Danh sách thả xuống hiển thị `pageKey / sectionKey` |
| Tiêu đề | ✱ | Văn bản chồng lên ảnh; cũng dùng làm alt text dự phòng |
| Phụ đề | — | Dòng phụ bên dưới tiêu đề |
| URL hình ảnh | ✱ | URL `https://` đầy đủ — Supabase Storage, CDN, Unsplash, v.v. |
| URL hình ảnh mobile | — | Tùy chọn. Dùng lại ảnh desktop nếu để trống. |
| Nhãn CTA | — | Văn bản nút (ví dụ: `Xem ngay`, `Mua ngay`) |
| Href CTA | — | Đích đến (ví dụ: `/categories/tom-cua`, `/sale`) |
| Thứ tự sắp xếp | — | Kiểm soát vị trí trong lưới (xem bên dưới) |
| Trạng thái | — | Active / Inactive |

**Quy tắc vị trí lưới hero (theo thứ tự sắp xếp):**

| Vị trí | Vị trí hiển thị |
|---|---|
| Thấp nhất (ví dụ: 10) | Hero nổi bật lớn — 2/3 bên trái, toàn chiều cao |
| Thứ 2 (ví dụ: 20) | Banner nhỏ — góc trên bên phải |
| Thứ 3 (ví dụ: 30) | Banner nhỏ — góc dưới bên phải |
| Thứ 4–5 (ví dụ: 40–50) | Hàng thứ hai, cặp toàn chiều rộng |

**Kích thước ảnh được khuyến nghị:** 1440 × 600 px cho hero nổi bật; 720 × 400 px cho banner nhỏ.

> Tránh URL `placehold.co` — chúng kích hoạt placeholder màu xanh ngọc thay vì hiển thị ảnh thật.

Xem quy trình cập nhật đầy đủ tại [Cập Nhật Hero Banner](admin-update-hero-banner.md).

### 5.4 Mục điều hướng (Navigation)

Điền vào các vị trí điều hướng của trang.

**Đường dẫn:** `/admin/content/navigation/new` · `/admin/content/navigation/[id]/edit`

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| Vị trí | ✱ | `header`, `sidebar`, `mobile_dock`, `footer` |
| Nhãn | ✱ | Văn bản liên kết hiển thị cho người dùng |
| Href | ✱ | Đường dẫn hoặc URL đích |
| Icon key | — | Tham chiếu đến registry icon của storefront |
| Thứ tự sắp xếp | — | Kiểm soát thứ tự trong vị trí |
| Trạng thái | — | Active / Inactive |

**Các vị trí:**

| Vị trí | Nơi hiển thị |
|---|---|
| `header` | Thanh điều hướng trên cùng |
| `sidebar` | Bảng điều hướng danh mục bên trái |
| `mobile_dock` | Thanh tab dưới cùng trên mobile |
| `footer` | Cột điều hướng footer |

> Các mục trùng lặp `(vị trí, nhãn, href)` sẽ bị từ chối.

### 5.5 Liên kết footer

Các nhóm liên kết hiển thị trong các cột footer của trang.

**Đường dẫn:** `/admin/content/footer-links/new` · `/admin/content/footer-links/[id]/edit`

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| Nhãn nhóm | ✱ | Tiêu đề cột (ví dụ: `Công ty`, `Hỗ trợ`, `Pháp lý`). Các liên kết có cùng nhãn nhóm được render trong cùng một cột. |
| Nhãn | ✱ | Văn bản liên kết |
| Href | ✱ | Đường dẫn hoặc URL đích |
| Thứ tự sắp xếp | — | Kiểm soát thứ tự trong nhóm |
| Trạng thái | — | Active / Inactive |

> Các link trong nhóm **Hỗ trợ khách hàng** được tạo và cập nhật tự động từ mục [5.7 Trang Hỗ trợ khách hàng](#57-trang-hỗ-trợ-khách-hàng). Đừng sửa tay các link đó ở đây; hãy sửa trang tương ứng.

### 5.6 Hình ảnh: tài khoản ngân hàng, app đặt hàng, logo (Brand asset)

Nơi đính kèm ảnh mã QR chuyển khoản, logo các app đặt hàng (ShopeeFood, GrabFood…) và các logo khác ở chân trang. Trên trang **Nội dung**, mục này có tên **Hình ảnh: tài khoản ngân hàng, app đặt hàng, logo**.

**Đường dẫn:** `/admin/content/brand-assets/new` · `/admin/content/brand-assets/[id]/edit`

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| Khóa tài nguyên | ✱ | Tên định danh, không trùng trong cùng vị trí (ví dụ `bank-techcombank`, `order-app-shopeefood`) |
| Vị trí | ✱ | Xem bảng vị trí bên dưới. Khi đổi vị trí, nhãn các ô bên dưới đổi theo để gợi ý cần nhập gì |
| Hình ảnh | ✱ | Bấm **Tải ảnh lên** để chọn ảnh từ máy (JPG, PNG, WEBP hoặc GIF, tối đa 5MB), hoặc dán một URL `https://`. Ảnh xem trước hiện ngay bên dưới |
| Văn bản / thông tin | ✱ | Với tài khoản ngân hàng: thông tin tài khoản. Với app: tên hiển thị. Với logo khác: mô tả ngắn |
| Đường dẫn | — | Với app đặt hàng: link gian hàng trên app. Với tài khoản ngân hàng: để trống |
| Thứ tự | — | Số nhỏ hiện trước |
| Trạng thái | — | Hoạt động / Không hoạt động |

**Các vị trí:**

| Vị trí | Hiện ở đâu |
|---|---|
| Tài khoản ngân hàng (`bank_account`) | Trang thanh toán khi khách chọn **Chuyển khoản ngân hàng**, trang **Đặt hàng thành công**, và chân trang |
| Đặt hàng qua app (`order_app`) | Mục **Đặt hàng qua app** ở chân trang và cuối khung thanh toán. Bấm logo sẽ mở app trong tab mới |
| Thanh toán (`payment`) | Nhóm "Thanh toán" ở chân trang (logo COD, MoMo, VNPAY…) |
| Đối tác (`partner`) | Nhóm "Đối tác" ở chân trang |
| Cam kết (`trust`) | Nhóm "Cam kết" ở chân trang |
| Thương hiệu (`brand`) | Khu vực thương hiệu chung |

#### Thêm tài khoản ngân hàng (ảnh QR chuyển khoản)

1. Vào **Nội dung**, mục **Hình ảnh: tài khoản ngân hàng, app đặt hàng, logo**, bấm **Thêm** (hoặc bấm **Sửa** trên tài khoản đã có).
2. **Vị trí:** chọn *Tài khoản ngân hàng (ảnh QR chuyển khoản)*.
3. **Ảnh mã QR chuyển khoản:** bấm **Tải ảnh lên**, chọn ảnh QR lấy từ app ngân hàng.
4. **Thông tin tài khoản:** gõ trên một dòng, các phần cách nhau bằng ` - ` (khoảng trắng, gạch ngang, khoảng trắng). Ví dụ:
   `Techcombank - 1903 7253 7380 24 - HO KINH DOANH COM NHA VI QUE`
   Mỗi phần sẽ hiện trên một dòng riêng; phần đầu được in đậm.
5. Để trống **Đường dẫn**, bấm **Lưu**.

Khi khách đặt hàng bằng chuyển khoản, trang **Đặt hàng thành công** hiện QR, thông tin tài khoản và dòng **Nội dung chuyển khoản: \<mã đơn hàng\>** để khách ghi vào nội dung chuyển khoản. Có nhiều tài khoản thì thêm nhiều mục; chúng hiện theo **Thứ tự**.

#### Thêm app đặt hàng (ShopeeFood, GrabFood…)

1. Bấm **Thêm** (hoặc **Sửa** trên app đã có).
2. **Vị trí:** chọn *Đặt hàng qua app (logo Shopee, Grab…)*.
3. **Logo app:** bấm **Tải ảnh lên**, chọn logo (nên dùng ảnh nền trong suốt hoặc nền trắng, chiều ngang khoảng 240px).
4. **Tên hiển thị:** ví dụ `Đặt hàng qua ShopeeFood`. Tên này hiện khi rê chuột lên logo, và hiện thay cho logo nếu chưa có ảnh.
5. **Link gian hàng trên app:** dán link gian hàng (bắt đầu bằng `https://`).
6. Bấm **Lưu**.

> **Lưu ý:**
> - Mục nào còn dùng ảnh mẫu `placehold.co` sẽ hiện **chữ** thay cho ảnh. Hãy tải ảnh thật lên để thay.
> - Muốn tạm ẩn mà không xóa: đặt **Trạng thái** = *Không hoạt động*.

### 5.7 Trang Hỗ trợ khách hàng

Các trang như *Chính sách giao hàng*, *Hướng dẫn đặt hàng*, *Đổi trả và khiếu nại*… Mỗi trang có địa chỉ riêng `haisannhaque.com/ho-tro/<đường-dẫn>` và tự có link trong cột **Hỗ trợ khách hàng** ở chân trang.

**Đường dẫn:** menu bên trái **Hỗ trợ khách hàng** (`/admin/support-pages`)

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| Tiêu đề | ✱ | Tên trang, cũng là chữ hiện ở chân trang |
| Đường dẫn | ✱ | Phần cuối của địa chỉ trang. Khi tạo trang mới, đường dẫn được tạo tự động từ tiêu đề (bỏ dấu), có thể sửa. Chỉ gồm chữ thường không dấu, số và dấu gạch ngang |
| Nội dung | — | Văn bản của trang, xem cách định dạng bên dưới. Khung **Xem trước** bên phải cho thấy trang sẽ hiện thế nào |
| Thứ tự ở chân trang | — | Số nhỏ hiện trước trong cột Hỗ trợ khách hàng |
| Trạng thái | — | **Hiển thị**: trang mở được và có link ở chân trang. **Ẩn (bản nháp)**: trang không mở được và link bị ẩn |

**Định dạng nội dung.** Gõ văn bản bình thường; vài ký hiệu đơn giản tạo định dạng:

| Gõ | Kết quả |
|---|---|
| `## Tiêu đề nhỏ` | Tiêu đề mục |
| `- nội dung` | Gạch đầu dòng |
| `1. nội dung` | Danh sách đánh số (các bước) |
| `**chữ đậm**` | **chữ đậm** |
| Một dòng trống | Bắt đầu đoạn mới |
| `https://…` | Tự thành link bấm được |

**Thao tác:**

| Việc cần làm | Cách làm |
|---|---|
| Thêm trang | Bấm **Thêm trang**, nhập tiêu đề và nội dung, bấm **Tạo trang**. Link ở chân trang được thêm tự động |
| Sửa trang | Bấm **Sửa** trên hàng của trang, chỉnh rồi bấm **Lưu**. Đổi tiêu đề thì chữ ở chân trang cũng đổi theo |
| Xem trang trên web | Bấm vào đường dẫn `/ho-tro/…` trong danh sách (mở tab mới) |
| Tạm ẩn | Đổi **Trạng thái** sang *Ẩn (bản nháp)* |
| Xóa | Bấm **Xóa**, xác nhận. Link ở chân trang bị xóa theo |

> **Việc cần làm:** hai trang *Chính sách giao hàng* và *Đổi trả và khiếu nại* hiện chỉ có nội dung tạm ("đang được cập nhật" và số hotline). Hãy viết nội dung chính sách thật cho hai trang này.

---

## 6. Đơn Hàng

**Đường dẫn:** `/admin/orders`  
**Quyền:** `orders:read`

### 6.1 Danh sách đơn hàng

Hiển thị 50 đơn hàng gần nhất với các cột: Mã đơn, Trạng thái, Trạng thái thanh toán, Tổng tiền, Ngày đặt.

Màu sắc badge trạng thái:

| Màu | Trạng thái |
|---|---|
| Xanh lá | `delivered`, `completed` |
| Đỏ | `cancelled`, `refunded`, `payment_failed` |
| Xanh dương | `confirmed`, `picking`, `packed`, `dispatched` |
| Cam | `awaiting_payment`, `pending_confirmation`, `delivery_attempted` |
| Xám | Tất cả trạng thái khác |

Nhấn **Xem** trên bất kỳ hàng nào để mở trang chi tiết đơn hàng.

### 6.2 Chi tiết đơn hàng

**Đường dẫn:** `/admin/orders/[id]`

Hiển thị:
- Tiêu đề: Mã đơn hàng và tên khách hàng
- Thẻ trạng thái: Trạng thái hiện tại, Trạng thái thanh toán, Tổng tiền, Ngày/giờ đặt hàng
- **Nút chuyển trạng thái** — một nút cho mỗi trạng thái tiếp theo hợp lệ theo quy tắc state machine
- **Bảng sản phẩm:** Tên sản phẩm, SKU, Số lượng, Đơn giá
- **Bảng thanh toán:** Nhà cung cấp, Phương thức, Số tiền, Trạng thái, Ngày tạo

**Vòng đời đơn hàng đầy đủ:**

```
draft_checkout
  → awaiting_payment (chờ thanh toán)
    → payment_failed (thanh toán thất bại)
    → pending_confirmation (chờ xác nhận)
      → confirmed (đã xác nhận)
        → picking (đang lấy hàng)
          → packed (đã đóng gói)
            → dispatched (đã giao vận chuyển)
              → delivery_attempted (đã thử giao)
              → delivered (đã giao hàng)
                → completed (hoàn thành)
                → returned (trả hàng)
                  → partially_returned (trả một phần)
                  → refunded (đã hoàn tiền)
      → cancelled (đã hủy)
```

Nhấn nút chuyển trạng thái để chuyển đơn hàng sang trạng thái tiếp theo. Nhãn nút phản ánh trạng thái đích (ví dụ: **Xác nhận đơn**, **Đã giao vận chuyển**).

### 6.3 Tài khoản khách hàng & tích điểm

Khách có thể tự đăng ký tài khoản tại `haisannhaque.com/register` (có link **Đăng ký** ở trang đăng nhập, ở trang thanh toán và ở các trang tài khoản). Khách nhập họ tên, số điện thoại, email và mật khẩu (ít nhất 8 ký tự). Tài khoản dùng được ngay, không cần xác nhận email.

- Khi khách **đã đăng nhập** và đặt hàng, đơn được gắn vào tài khoản: khách thấy đơn ở **Tài khoản → Đơn hàng**, và họ tên, số điện thoại được điền sẵn ở trang thanh toán.
- Điểm được cộng khi đơn chuyển sang trạng thái **Hoàn thành** (`completed`): **1.000đ = 1 điểm** (theo tổng tiền đơn). Khách xem điểm ở **Tài khoản → Tích điểm**.
- Đơn đặt khi **chưa đăng nhập** không được tích điểm, và cũng không thể gắn lại vào tài khoản sau đó. Trang thanh toán nhắc khách đăng nhập hoặc đăng ký trước khi đặt.

> Để khách được cộng điểm, hãy nhớ chuyển đơn sang **Hoàn thành** sau khi giao xong (mục [6.2](#62-chi-tiết-đơn-hàng)).

---

## 7. Kho Hàng Tồn Kho

**Đường dẫn:** `/admin/inventory`  
**Quyền:** `inventory:read` (xem), `inventory:update` (điều chỉnh)

### 7.1 Danh sách tồn kho

Hiển thị tất cả SKU đang hoạt động nhóm theo kho với các cột: SKU, Tên sản phẩm, Mã kho, Số lượng khả dụng, Đơn vị.

### 7.2 Điều chỉnh tồn kho

Nhấn **Điều chỉnh** trên bất kỳ hàng nào để mở form điều chỉnh nội tuyến.

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| Số lượng thay đổi | ✱ | Số dương để thêm hàng; số âm để giảm hàng |
| Lý do / ghi chú | — | Được ghi lại trong nhật ký di chuyển hàng |

Các điều chỉnh được ghi là di chuyển `manual_adjustment` và xuất hiện trong mục Báo cáo → Điều chỉnh tồn kho.

---

## 8. Kho Bãi

**Đường dẫn:** `/admin/warehouses`  
**Quyền:** `inventory:update`

### 8.1 Danh sách kho bãi

Hiển thị tất cả kho với các cột: Mã, Tên, Địa chỉ, Trạng thái.

Thao tác: **Kho mới**, **Chỉnh sửa**, **Xóa** trên mỗi hàng.

### 8.2 Tạo / chỉnh sửa kho bãi

**Đường dẫn:** `/admin/warehouses/new` · `/admin/warehouses/[id]/edit`

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| Mã | ✱ | Định danh viết hoa (ví dụ: `WH-HN-01`, `WH-HCM-01`). Dùng trong đơn đặt hàng nhập và báo cáo tồn kho. |
| Tên | ✱ | Tên dễ đọc |
| Địa chỉ | — | Địa chỉ thực tế |
| Trạng thái | ✱ | `Active` — dùng được cho đơn đặt hàng và tồn kho; `Inactive` — ẩn khỏi danh sách thả xuống |

> Vô hiệu hóa kho không xóa bản ghi tồn kho của nó; chỉ ẩn nó khỏi các dropdown tạo đơn đặt hàng và tồn kho mới.

---

## 9. Đơn Đặt Hàng Nhập

**Đường dẫn:** `/admin/purchase-orders`  
**Quyền:** `purchase_orders:read` (xem), `purchase_orders:update` (tạo/ghi nhận)

Đơn đặt hàng nhập (PO) theo dõi hàng hóa đặt từ nhà cung cấp vào kho.

### 9.1 Danh sách đơn đặt hàng nhập

Hiển thị 50 đơn gần nhất với các cột: Mã PO, Tên nhà cung cấp, Mã kho, Trạng thái, Tổng đặt, Tổng nhận.

Màu sắc badge trạng thái:

| Màu | Trạng thái |
|---|---|
| Xanh lá | `received` (đã nhận) |
| Đỏ | `cancelled` (đã hủy) |
| Xanh dương | `submitted` (đã gửi) |
| Cam | `partially_received` (nhận một phần) |

Nhấn **Xem** để mở trang chi tiết PO.

### 9.2 Tạo đơn đặt hàng nhập

**Đường dẫn:** `/admin/purchase-orders/new`

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| Nhà cung cấp | ✱ | Danh sách tất cả nhà cung cấp đang hoạt động |
| Kho đích | ✱ | Danh sách tất cả kho đang hoạt động |
| Ngày dự kiến | — | Ngày giao hàng dự kiến |
| Dòng hàng | ✱ | Cần ít nhất một dòng. Mỗi dòng: Biến thể sản phẩm (SKU), Số lượng đặt, Giá đơn vị |

Nhấn **Thêm dòng** để thêm dòng hàng mới. Nhấn **Xóa** để xóa một dòng. Gửi tạo PO ở trạng thái `submitted`.

### 9.3 Chi tiết đơn đặt hàng nhập

**Đường dẫn:** `/admin/purchase-orders/[id]`

Hiển thị:
- Tiêu đề: Mã PO và tuyến Nhà cung cấp → Kho
- Thẻ trạng thái: Trạng thái hiện tại, Tổng đặt, Tổng nhận, Ngày dự kiến
- Nút **Ghi nhận hàng nhập** — chỉ hiển thị khi trạng thái là `submitted` hoặc `partially_received`
- **Bảng dòng hàng:** SKU, Đơn vị, SL đặt, SL nhận, Giá đơn vị

### 9.4 Ghi nhận hàng nhập

**Đường dẫn:** `/admin/purchase-orders/[id]/receive`  
**Chỉ khả dụng cho PO ở trạng thái `submitted` hoặc `partially_received`.**

Với mỗi dòng hàng, nhập số lượng thực tế đã nhận. Cho phép số lượng một phần — PO chuyển sang `partially_received`. Khi tất cả dòng được nhận đầy đủ, chuyển sang `received` và tồn kho được cộng vào kho đích tự động.

---

## 10. Nhà Cung Cấp

**Đường dẫn:** `/admin/suppliers`  
**Quyền:** `suppliers:update`

Nhà cung cấp là các đơn vị mà đơn đặt hàng nhập được tạo từ đó.

### 10.1 Danh sách nhà cung cấp

Hiển thị tất cả nhà cung cấp với các cột: Tên, Người liên hệ, Điện thoại, Email, Trạng thái.

Thao tác: **Nhà cung cấp mới**, **Chỉnh sửa**, **Xóa** trên mỗi hàng.

### 10.2 Tạo / chỉnh sửa nhà cung cấp

**Đường dẫn:** `/admin/suppliers/new` · `/admin/suppliers/[id]/edit`

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| Tên | ✱ | Tên công ty hoặc nhà bán hàng |
| Người liên hệ | — | Người liên hệ chính |
| Điện thoại | — | Số điện thoại liên hệ |
| Email | — | Email liên hệ |
| Địa chỉ | — | Địa chỉ kinh doanh |
| Mã số thuế | — | Mã đăng ký VAT / thuế |
| Trạng thái | ✱ | `Active` — hiển thị trong dropdown PO; `Inactive` — ẩn |

> Nhà cung cấp phải được tạo trước khi xuất hiện trong form tạo đơn đặt hàng nhập.

---

## 11. Hoàn Tiền

**Đường dẫn:** `/admin/refunds`  
**Quyền:** `payments:read` (xem), `payments:update` (tạo)

### 11.1 Danh sách hoàn tiền

Hiển thị 50 yêu cầu hoàn tiền gần nhất với các cột: Mã đơn, Số tiền (VNĐ), Phương thức hoàn tiền, Trạng thái, Lý do.

Màu sắc badge trạng thái:

| Màu | Trạng thái |
|---|---|
| Xanh lá | `completed` (đã hoàn thành) |
| Đỏ | `failed` (thất bại), `cancelled` (đã hủy) |
| Xanh dương | `approved` (đã duyệt), `processing` (đang xử lý) |
| Cam | `requested` (đã yêu cầu) |

### 11.2 Tạo yêu cầu hoàn tiền

**Đường dẫn:** `/admin/refunds/new`

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| ID đơn hàng | ✱ | UUID của đơn hàng cần hoàn tiền |
| ID thanh toán | — | UUID của giao dịch thanh toán cụ thể (để trống để hoàn theo đơn hàng) |
| Số tiền | ✱ | Số tiền hoàn tính bằng VNĐ (tối thiểu 1) |
| Phương thức hoàn tiền | ✱ | Phương thức trả lại tiền (ví dụ: chuyển khoản ngân hàng, phương thức thanh toán gốc) |
| Lý do | ✱ | Giải thích bằng văn bản tự do (chỉ hiển thị nội bộ) |

Gửi form gọi `POST /api/admin/refunds` và tạo bản ghi hoàn tiền ở trạng thái `requested`.

**Vòng đời hoàn tiền:** `requested` → `approved` → `processing` → `completed` (hoặc `failed` / `cancelled`).

---

## 12. Khiếu Nại

**Đường dẫn:** `/admin/complaints`  
**Quyền:** `complaints:read`

### 12.1 Danh sách khiếu nại

Hiển thị 50 khiếu nại gần nhất với các cột: Mã đơn, Tên khách hàng, Trạng thái, Lý do, Giải quyết.

Màu sắc badge trạng thái:

| Màu | Trạng thái |
|---|---|
| Xanh lá | `resolved` (đã giải quyết) |
| Xám | `closed` (đã đóng) |
| Xanh dương | `investigating` (đang điều tra) |
| Cam | `open` (đang mở) |

Thao tác: **Khiếu nại mới**, **Xem** trên mỗi hàng.

### 12.2 Tạo khiếu nại

**Đường dẫn:** `/admin/complaints/new`

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| ID đơn hàng | — | UUID của đơn hàng liên quan (nếu có) |
| ID khách hàng | — | UUID của khách hàng (nếu có) |
| Lý do | ✱ | Mô tả khiếu nại |

### 12.3 Chi tiết & giải quyết khiếu nại

**Đường dẫn:** `/admin/complaints/[id]`

Hiển thị lý do khiếu nại và form cập nhật:

| Trường | Ghi chú |
|---|---|
| Trạng thái | `open` → `investigating` → `resolved` → `closed` |
| Giải quyết | Mô tả bằng văn bản về cách xử lý khiếu nại |

Lưu để cập nhật. Văn bản giải quyết được lưu và hiển thị trên trang chi tiết.

**Vòng đời khiếu nại:** `open` → `investigating` → `resolved` → `closed`

---

## 13. Báo Cáo

**Đường dẫn:** `/admin/reports`  
**Quyền:** `reports:read`

Tất cả báo cáo bao gồm **7 ngày gần nhất** (từ 6 ngày trước đến hôm nay). Dữ liệu làm mới mỗi lần tải trang.

### 13.1 Doanh thu theo ngày

Tổng hợp doanh thu mỗi ngày.

| Cột | Mô tả |
|---|---|
| Ngày | Ngày trong lịch |
| Đơn hàng | Số đơn hàng được đặt |
| Sản phẩm | Tổng số lượng dòng hàng bán được |
| Doanh thu | Tổng giá trị đơn hàng (VNĐ) |
| Hoàn tiền | Tổng số tiền đã hoàn (VNĐ) |

### 13.2 Doanh thu theo sản phẩm

Phân tích doanh thu theo từng SKU.

| Cột | Mô tả |
|---|---|
| SKU | Mã đơn vị lưu kho |
| Tên sản phẩm | Tên hiển thị của sản phẩm |
| Số lượng bán | Tổng đơn vị đã bán |
| Tổng doanh thu | Tổng doanh thu cho SKU này (VNĐ) |

### 13.3 Sử dụng khuyến mãi

Việc sử dụng mã giảm giá / khuyến mãi.

| Cột | Mô tả |
|---|---|
| Mã khuyến mãi | Mã giảm giá được áp dụng |
| Lượt dùng | Số đơn hàng đã áp dụng |
| Tổng giảm giá | Tổng giá trị giảm giá đã cấp (VNĐ) |

### 13.4 Cảnh báo tồn kho thấp

SKU có ít hơn 5 đơn vị khả dụng trên tất cả kho.

| Cột | Mô tả |
|---|---|
| SKU | Mã đơn vị lưu kho |
| Tên sản phẩm | Tên hiển thị của sản phẩm |
| Mã kho | Kho đang lưu trữ hàng |
| Số lượng khả dụng | Đơn vị hiện tại còn lại |

> Dùng báo cáo này để kích hoạt đơn đặt hàng nhập trước khi hết hàng.

### 13.5 Hàng sắp hết hạn

Các lô hàng sẽ hết hạn trong vòng 7 ngày tới.

| Cột | Mô tả |
|---|---|
| SKU | Mã đơn vị lưu kho |
| Mã kho | Kho đang lưu lô hàng |
| Số lô | Định danh lô / mẻ |
| Ngày hết hạn | Ngày hàng hóa hết hạn |
| Số lượng tồn | Đơn vị còn lại trong lô này |

### 13.6 Điều chỉnh tồn kho

Tất cả di chuyển điều chỉnh tồn kho thủ công trong 7 ngày qua.

| Cột | Mô tả |
|---|---|
| SKU | Mã đơn vị lưu kho |
| Mã kho | Kho thực hiện điều chỉnh |
| Loại di chuyển | Loại di chuyển (ví dụ: `manual_adjustment`, `receipt`, `sale`) |
| Thay đổi số lượng | Thay đổi đơn vị (dương = thêm, âm = bớt) |
| Loại tài liệu nguồn | Nguồn gốc di chuyển (đơn đặt hàng, đơn hàng, thủ công, v.v.) |

### 13.7 Tóm tắt đơn đặt hàng nhập

Tất cả PO được tạo trong 7 ngày qua.

| Cột | Mô tả |
|---|---|
| Mã PO | Định danh đơn đặt hàng |
| Tên nhà cung cấp | Tên nhà bán hàng |
| Mã kho | Kho đích |
| Trạng thái | Trạng thái PO hiện tại (có màu) |
| Tổng đặt | Tổng giá trị hàng đặt (VNĐ) |
| Tổng nhận | Tổng giá trị hàng đã nhận đến nay (VNĐ) |

### 13.8 Tóm tắt hoàn tiền

Tất cả yêu cầu hoàn tiền được tạo trong 7 ngày qua.

| Cột | Mô tả |
|---|---|
| Mã đơn hàng | Định danh đơn hàng liên quan |
| Số tiền | Số tiền hoàn (VNĐ) |
| Phương thức hoàn tiền | Cách thức trả lại tiền |
| Trạng thái | Trạng thái hoàn tiền hiện tại (có màu) |
| Lý do | Lý do ghi lại khi tạo |

---

## Tham Khảo Các Thao Tác Thường Dùng

### Vô hiệu hóa mà không xóa

Đặt **Trạng thái** thành **Inactive** (hoặc `draft` / `archived` cho sản phẩm và trang). Storefront ẩn bản ghi mà không xóa khỏi cơ sở dữ liệu. Có thể kích hoạt lại bất cứ lúc nào.

### Kiểm soát thứ tự hiển thị

Mọi thực thể có trường **Thứ tự sắp xếp**: số nhỏ hơn = hiển thị trước. Các mục có thứ tự sắp xếp giống nhau sẽ theo thứ tự chèn vào cơ sở dữ liệu.

### Xóa một bản ghi

Nhấn **Xóa** trên hàng trong danh sách. Một hộp xác nhận trình duyệt xuất hiện trước khi gửi lệnh xóa. **Xóa là vĩnh viễn.**

> Xóa theo tầng:
> - Xóa một phần CMS sẽ xóa theo tầng tất cả banner của nó.
> - Xóa một sản phẩm sẽ xóa theo tầng các biến thể và ảnh của nó.
> - Xóa một danh mục **không** xóa sản phẩm; sản phẩm sẽ trở thành chưa phân loại.

### Thực hành tốt nhất cho URL hình ảnh

- Dùng bất kỳ URL `https://` công khai — Supabase Storage, Cloudflare R2, Unsplash, v.v.
- Hình ảnh được render với `<Image unoptimized>` — không cần cấu hình domain Next.js.
- Tránh URL `placehold.co` — chúng kích hoạt placeholder màu xám/xanh ngọc.
- Cách dễ nhất: bấm **Tải ảnh lên** ngay trong form (có ở Banner và mục Hình ảnh 5.6). Ảnh được lưu vào Supabase Storage và URL được điền tự động.

---

## Tài Liệu Liên Quan

| Tài liệu | Nội dung |
|---|---|
| [Hướng Dẫn Cấu Hình Banner](admin-banner-config.md) | Tạo phần hero và banner từ đầu |
| [Cập Nhật Hero Banner](admin-update-hero-banner.md) | Chỉnh sửa banner hiện có (ảnh, nội dung, CTA, thứ tự) |
| [Hướng Dẫn Quản Lý Nội Dung](admin-content-guide.md) | Chi tiết về trang CMS, phần, điều hướng, footer |
| [Quy Trình Đăng Sản Phẩm Mới](admin-post-product-flow.md) | Tạo sản phẩm thủ công và nhập CSV hàng loạt |
| [Hướng Dẫn Tính Năng Mới (10/2026)](huong-dan-tinh-nang-moi.md) | Có hình minh hoạ: giá thập phân, ảnh QR ngân hàng & app đặt hàng, trang Hỗ trợ khách hàng, đăng ký tích điểm, mục Bán chạy |
