# Admin: Post New Product Flow

Two paths to get a product live on the storefront.

---

## Path A — Manual (single product)

### Step 1: Go to Products list

Navigate to `/admin/products` and click **New product** in the top-right.

### Step 2: Fill basic details

Page: `/admin/products/new`

| Field | Required |
|---|---|
| Name | ✱ |
| Temperature class (`live`, `fresh`, `chilled`, `frozen`, `ready`) | ✱ |
| Origin | optional |
| Short description | optional |
| Description | optional |

Status defaults to **Draft** — safe to leave for now. Submit → automatically redirected to the edit page.

### Step 3: Add variants & pricing

Page: `/admin/products/[id]/edit` — scroll to the **Variants** section.

| Field | Required |
|---|---|
| SKU | ✱ |
| Unit (e.g. `kg`, `con`, `hộp`) | ✱ |
| List price | ✱ |
| Sale price | optional |

Add one row per variant (e.g. 500g, 1kg). At least one active variant is needed before publishing.

### Step 4: Upload images

Same edit page — scroll to the **Images** section. Upload JPEG / PNG / WebP. The first image becomes the card thumbnail on the storefront.

### Step 5: Set status → Published ⚠️

Change the **Status** field at the top of the edit form to `Published`, then save. The product is immediately visible on the storefront.

### ✓ Product is live

Accessible at `/products/[slug]` and appears in category pages and search results.

---

## Path B — CSV Import (bulk)

### Step 1: Go to Import page

Navigate to `/admin/products/import`, or click **Import CSV** from the Products list.

### Step 2: Download & fill the template

Click **Tải xuống file mẫu** to get `product-import-template.csv`. Each row represents one product with one variant.

CSV columns:

| Column | Required |
|---|---|
| `name` | ✱ |
| `status` (`draft` or `published`, defaults to `draft`) | optional |
| `temperature_class` | ✱ |
| `origin` | optional |
| `short_description` | optional |
| `description` | optional |
| `sku` | ✱ |
| `unit` | ✱ |
| `list_price` | ✱ |
| `sale_price` | optional |

Example:

```csv
name,status,temperature_class,origin,short_description,description,sku,unit,list_price,sale_price
Cá hồi tươi,draft,fresh,Na Uy,Cá hồi tươi nhập khẩu,,CA-HOI-001,kg,350000,
Tôm sú đông lạnh,draft,frozen,Việt Nam,,,TOM-SU-001,con,80000,70000
```

### Step 3: Upload & review results

Select your filled CSV and click **Nhập sản phẩm**. The page shows:
- Total products imported successfully
- Per-row errors (row number + error message) for any rows that failed

Fix errors in the CSV and re-upload if needed.

### Step 4: Edit each draft to publish ⚠️

Imported products land as **Draft**. Open each one at `/admin/products/[id]/edit`, add images, then set Status → `Published`.

### ✓ Products are live

---

## Quick reference

| | Manual | CSV Import |
|---|---|---|
| Best for | One product at a time | Many products at once |
| Variants per product | Multiple (via edit page) | One (first variant only) |
| Images | Uploaded on edit page | Must add after import |
| Entry point | `/admin/products/new` | `/admin/products/import` |
| Minimum required fields | Name, Temperature class | Name, Temperature class, SKU, Unit, List price |
