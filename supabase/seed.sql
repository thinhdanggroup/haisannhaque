insert into admin_roles (name, description)
values
  ('super_admin', 'Full access'),
  ('catalog_manager', 'Catalog and product access'),
  ('marketing', 'CMS and promotions access'),
  ('customer_service', 'Customer and order support access'),
  ('warehouse', 'Inventory and fulfillment access'),
  ('procurement', 'Supplier and purchase order access'),
  ('finance', 'Payment and refund access'),
  ('reporter', 'Read-only report access')
on conflict (name) do nothing;

insert into warehouses (code, name, warehouse_type, address)
values ('HCM-01', 'Ho Chi Minh Main Branch', 'branch', 'Ho Chi Minh City')
on conflict (code) do nothing;

with category_seed as (
  select *
  from jsonb_to_recordset(
    '[
      {"slug":"best-sellers","name":"Bán chạy","description":"Những món hải sản được chọn nhiều cho bữa cơm tuần.","image":"https://placehold.co/900x700/e0f7fa/0f172a?text=Ban+Chay","sort":10},
      {"slug":"promotions","name":"Khuyến mãi","description":"Ưu đãi ngắn ngày và combo gia đình.","image":"https://placehold.co/900x700/fef3c7/0f172a?text=Khuyen+Mai","sort":20},
      {"slug":"sashimi","name":"Sushi & sashimi","description":"Hải sản lạnh chuẩn bị cho bữa nhẹ và món chia sẻ.","image":"https://placehold.co/900x700/fce7f3/0f172a?text=Sashimi","sort":30},
      {"slug":"fresh-seafood","name":"Hải sản tươi","description":"Hàng sống và hàng tươi cho bữa nấu trong ngày.","image":"https://placehold.co/900x700/dcfce7/0f172a?text=Hai+San+Tuoi","sort":40},
      {"slug":"frozen-seafood","name":"Hải sản đông lạnh","description":"Khẩu phần tiện trữ đông cho gia đình.","image":"https://placehold.co/900x700/e0f2fe/0f172a?text=Dong+Lanh","sort":50},
      {"slug":"live-seafood","name":"Hải sản sống","description":"Hải sản sống được xử lý cho bữa nấu trong ngày.","image":"https://placehold.co/900x700/dcfce7/0f172a?text=Hai+San+Song","sort":60},
      {"slug":"imported-seafood","name":"Hàng nhập khẩu","description":"Khẩu phần hải sản nhập khẩu và món đặc sản.","image":"https://placehold.co/900x700/e0f7fa/0f172a?text=Nhap+Khau","sort":70},
      {"slug":"salmon","name":"Cá hồi","description":"Cá hồi tươi và món cá hồi tiện dùng.","image":"https://placehold.co/900x700/fee2e2/0f172a?text=Ca+Hoi","sort":80},
      {"slug":"oyster-shellfish","name":"Hàu và nghêu sò","description":"Hàu, nghêu, sò điệp và các món vỏ được chọn nhiều.","image":"https://placehold.co/900x700/e0f2f1/0f172a?text=Hau+Ngheu+So","sort":90},
      {"slug":"crab-lobster","name":"Cua và tôm hùm","description":"Cua và tôm hùm cho bữa ăn đặc biệt.","image":"https://placehold.co/900x700/ede9fe/0f172a?text=Cua+Tom+Hum","sort":100},
      {"slug":"shrimp-squid","name":"Tôm và mực","description":"Tôm, mực và bạch tuộc cho bữa cơm hằng ngày.","image":"https://placehold.co/900x700/e0f2fe/0f172a?text=Tom+Muc","sort":110},
      {"slug":"ready-to-eat","name":"Món chế biến sẵn","description":"Món hải sản đã chuẩn bị để dùng nhanh.","image":"https://placehold.co/900x700/ffedd5/0f172a?text=San+An","sort":120}
    ]'::jsonb
  ) as category(slug text, name text, description text, image text, sort integer)
)
insert into categories (slug, name, description, image_url, sort_order, is_active)
select slug, name, description, image, sort, true
from category_seed
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    image_url = excluded.image_url,
    sort_order = excluded.sort_order,
    is_active = true;

delete from product_categories
using categories
where product_categories.category_id = categories.id
  and categories.slug in ('shrimp-crab');

update categories
set is_active = false
where slug in ('shrimp-crab');

with product_seed as (
  select *
  from jsonb_to_recordset(
    '[
      {"slug":"alaska-lobster-500g","name":"Tôm hùm Alaska 500g","category":"best-sellers","temperature":"live","origin":"Nhập khẩu","price":745000,"sale":499000,"unit":"1 con","summary":"Tôm hùm sống khoảng 500g","image":"https://placehold.co/900x700/e0f7fa/0f172a?text=Tom+Hum+Alaska"},
      {"slug":"korean-abalone-live","name":"Bào ngư Hàn Quốc sống","category":"best-sellers","temperature":"live","origin":"Hàn Quốc","price":99000,"sale":65000,"unit":"1 con","summary":"Bào ngư sống theo khẩu phần","image":"https://placehold.co/900x700/e8f5e9/0f172a?text=Bao+Ngu"},
      {"slug":"fresh-salmon-loin","name":"Phi lê cá hồi tươi","category":"salmon","temperature":"fresh","origin":"Na Uy","price":249000,"sale":null,"unit":"khay 200g","summary":"Khay phi lê cá hồi đã sơ chế","image":"https://placehold.co/900x700/fff3e0/0f172a?text=Ca+Hoi+Tuoi"},
      {"slug":"green-lobster-live","name":"Tôm hùm xanh sống","category":"fresh-seafood","temperature":"live","origin":"Việt Nam","price":535000,"sale":429000,"unit":"con 350g","summary":"Tôm hùm xanh sống theo con","image":"https://placehold.co/900x700/e3f2fd/0f172a?text=Tom+Hum+Xanh"},
      {"slug":"sashimi-mix-family","name":"Set sashimi gia đình","category":"sashimi","temperature":"chilled","origin":"Bếp Nhà Quê","price":965000,"sale":799000,"unit":"combo","summary":"Khay sashimi tổng hợp cho gia đình","image":"https://placehold.co/900x700/fce4ec/0f172a?text=Sashimi+Gia+Dinh"},
      {"slug":"shrimp-teriyaki-maki","name":"Maki tôm teriyaki","category":"sashimi","temperature":"ready","origin":"Bếp Nhà Quê","price":99000,"sale":null,"unit":"phần","summary":"Phần maki dùng ngay","image":"https://placehold.co/900x700/f3e5f5/0f172a?text=Maki+Tom"},
      {"slug":"peeled-white-shrimp","name":"Tôm thẻ bóc nõn","category":"frozen-seafood","temperature":"frozen","origin":"Việt Nam","price":79000,"sale":69000,"unit":"khay 150g","summary":"Khay tôm bóc nõn đông lạnh","image":"https://placehold.co/900x700/e1f5fe/0f172a?text=Tom+Boc+Non"},
      {"slug":"ready-meal-salmon-soy","name":"Cơm cá hồi sốt tương","category":"ready-to-eat","temperature":"ready","origin":"Bếp Nhà Quê","price":179000,"sale":null,"unit":"khay","summary":"Cơm cá hồi đã chuẩn bị","image":"https://placehold.co/900x700/fff8e1/0f172a?text=Com+Ca+Hoi"},
      {"slug":"clam-combo","name":"Combo 3 loại nghêu","category":"promotions","temperature":"fresh","origin":"Việt Nam","price":119000,"sale":null,"unit":"combo","summary":"Combo nghêu tổng hợp","image":"https://placehold.co/900x700/e0f2f1/0f172a?text=Combo+Ngheu"},
      {"slug":"blue-crab-live","name":"Cua xanh sống","category":"crab-lobster","temperature":"live","origin":"Việt Nam","price":390000,"sale":369000,"unit":"1kg","summary":"Cua xanh sống bán theo kg","image":"https://placehold.co/900x700/ede7f6/0f172a?text=Cua+Xanh"},
      {"slug":"canada-oyster-half-shell","name":"Hàu Canada nửa vỏ","category":"oyster-shellfish","temperature":"chilled","origin":"Canada","price":290000,"sale":null,"unit":"hộp","summary":"Hộp hàu nửa vỏ giữ lạnh","image":"https://placehold.co/900x700/e0f2fe/0f172a?text=Hau+Canada"},
      {"slug":"japanese-scallop-meat","name":"Cồi sò điệp Nhật","category":"imported-seafood","temperature":"frozen","origin":"Nhật Bản","price":389000,"sale":349000,"unit":"khay 250g","summary":"Khay cồi sò điệp đông lạnh","image":"https://placehold.co/900x700/e0f7fa/0f172a?text=So+Diep"},
      {"slug":"norway-salmon-saku","name":"Cá hồi Na Uy saku","category":"salmon","temperature":"chilled","origin":"Na Uy","price":320000,"sale":null,"unit":"khay 250g","summary":"Cá hồi cắt saku theo khẩu phần","image":"https://placehold.co/900x700/fee2e2/0f172a?text=Salmon+Saku"},
      {"slug":"snow-crab-cluster","name":"Cụm cua tuyết","category":"crab-lobster","temperature":"frozen","origin":"Nhập khẩu","price":690000,"sale":629000,"unit":"kg","summary":"Cụm cua tuyết đông lạnh","image":"https://placehold.co/900x700/ede9fe/0f172a?text=Cua+Tuyet"},
      {"slug":"tiger-prawn-live","name":"Tôm sú sống","category":"live-seafood","temperature":"live","origin":"Việt Nam","price":420000,"sale":null,"unit":"kg","summary":"Tôm sú sống bán theo kg","image":"https://placehold.co/900x700/dcfce7/0f172a?text=Tom+Su"},
      {"slug":"squid-ring-tray","name":"Khoanh mực đông lạnh","category":"shrimp-squid","temperature":"frozen","origin":"Việt Nam","price":125000,"sale":99000,"unit":"khay 300g","summary":"Khay khoanh mực đông lạnh","image":"https://placehold.co/900x700/e0f2fe/0f172a?text=Khoanh+Muc"},
      {"slug":"seafood-hotpot-combo","name":"Combo lẩu hải sản","category":"promotions","temperature":"fresh","origin":"Bếp Nhà Quê","price":459000,"sale":399000,"unit":"combo","summary":"Combo hải sản nấu lẩu","image":"https://placehold.co/900x700/fef3c7/0f172a?text=Lau+Hai+San"},
      {"slug":"grilled-salmon-teriyaki","name":"Cá hồi nướng teriyaki","category":"ready-to-eat","temperature":"ready","origin":"Bếp Nhà Quê","price":189000,"sale":null,"unit":"khay","summary":"Khay cá hồi teriyaki đã chuẩn bị","image":"https://placehold.co/900x700/ffedd5/0f172a?text=Ca+Hoi+Teriyaki"},
      {"slug":"ikura-sushi-pack","name":"Set sushi trứng cá hồi","category":"sashimi","temperature":"chilled","origin":"Bếp Nhà Quê","price":219000,"sale":null,"unit":"gói","summary":"Set sushi trứng cá hồi giữ lạnh","image":"https://placehold.co/900x700/fce7f3/0f172a?text=Ikura+Sushi"},
      {"slug":"baby-octopus-tray","name":"Bạch tuộc baby khay","category":"shrimp-squid","temperature":"frozen","origin":"Việt Nam","price":145000,"sale":null,"unit":"khay 300g","summary":"Khay bạch tuộc baby đông lạnh","image":"https://placehold.co/900x700/e0f2fe/0f172a?text=Bach+Tuoc"},
      {"slug":"black-tiger-shrimp","name":"Tôm sú tươi","category":"shrimp-squid","temperature":"fresh","origin":"Việt Nam","price":260000,"sale":229000,"unit":"kg","summary":"Tôm sú tươi bán theo kg","image":"https://placehold.co/900x700/e0f7fa/0f172a?text=Tom+Su+Tuoi"},
      {"slug":"lobster-tail-pack","name":"Đuôi tôm hùm","category":"crab-lobster","temperature":"frozen","origin":"Nhập khẩu","price":530000,"sale":489000,"unit":"gói","summary":"Gói đuôi tôm hùm đông lạnh","image":"https://placehold.co/900x700/ede9fe/0f172a?text=Duoi+Tom+Hum"},
      {"slug":"clam-meat-pack","name":"Thịt nghêu gói","category":"frozen-seafood","temperature":"frozen","origin":"Việt Nam","price":69000,"sale":null,"unit":"gói 250g","summary":"Gói thịt nghêu đông lạnh","image":"https://placehold.co/900x700/e0f2f1/0f172a?text=Thit+Ngheu"},
      {"slug":"seaweed-salad-box","name":"Salad rong biển","category":"ready-to-eat","temperature":"chilled","origin":"Bếp Nhà Quê","price":59000,"sale":null,"unit":"hộp","summary":"Hộp salad rong biển giữ lạnh","image":"https://placehold.co/900x700/dcfce7/0f172a?text=Salad+Rong+Bien"}
    ]'::jsonb
  ) as product(
    slug text,
    name text,
    category text,
    temperature text,
    origin text,
    price numeric,
    sale numeric,
    unit text,
    summary text,
    image text
  )
),
upserted_products as (
  insert into products (
    slug,
    name,
    short_description,
    description,
    origin,
    temperature_class,
    status,
    seo_title,
    seo_description
  )
  select
    slug,
    name,
    'Hải sản được chọn cho giao nhanh trong ngày.',
    'Nội dung sản phẩm placeholder gốc cho dữ liệu seed Hải Sản Nhà Quê.',
    origin,
    temperature,
    'published',
    name,
    'Đặt ' || name || ' tại Hải Sản Nhà Quê.'
  from product_seed
  on conflict (slug) do update
  set name = excluded.name,
      short_description = excluded.short_description,
      description = excluded.description,
      origin = excluded.origin,
      temperature_class = excluded.temperature_class,
      status = excluded.status,
      seo_title = excluded.seo_title,
      seo_description = excluded.seo_description,
      updated_at = now()
  returning id, slug
)
insert into product_variants (
  product_id,
  sku,
  unit,
  option_summary,
  list_price,
  sale_price,
  is_active,
  is_weighable
)
select
  upserted_products.id,
  upper(replace(upserted_products.slug, '-', '_')),
  product_seed.unit,
  product_seed.summary,
  product_seed.price,
  product_seed.sale,
  true,
  product_seed.unit in ('1kg', 'kg')
from upserted_products
join product_seed on product_seed.slug = upserted_products.slug
on conflict (sku) do update
set product_id = excluded.product_id,
    unit = excluded.unit,
    option_summary = excluded.option_summary,
    list_price = excluded.list_price,
    sale_price = excluded.sale_price,
    is_active = true,
    is_weighable = excluded.is_weighable;

with product_category_seed as (
  select *
  from jsonb_to_recordset(
    '[
      {"slug":"alaska-lobster-500g","category":"best-sellers"},
      {"slug":"alaska-lobster-500g","category":"promotions"},
      {"slug":"korean-abalone-live","category":"best-sellers"},
      {"slug":"korean-abalone-live","category":"fresh-seafood"},
      {"slug":"fresh-salmon-loin","category":"salmon"},
      {"slug":"fresh-salmon-loin","category":"fresh-seafood"},
      {"slug":"fresh-salmon-loin","category":"best-sellers"},
      {"slug":"green-lobster-live","category":"fresh-seafood"},
      {"slug":"green-lobster-live","category":"promotions"},
      {"slug":"sashimi-mix-family","category":"sashimi"},
      {"slug":"sashimi-mix-family","category":"ready-to-eat"},
      {"slug":"shrimp-teriyaki-maki","category":"sashimi"},
      {"slug":"shrimp-teriyaki-maki","category":"ready-to-eat"},
      {"slug":"peeled-white-shrimp","category":"frozen-seafood"},
      {"slug":"peeled-white-shrimp","category":"shrimp-squid"},
      {"slug":"peeled-white-shrimp","category":"promotions"},
      {"slug":"ready-meal-salmon-soy","category":"ready-to-eat"},
      {"slug":"ready-meal-salmon-soy","category":"salmon"},
      {"slug":"clam-combo","category":"promotions"},
      {"slug":"clam-combo","category":"fresh-seafood"},
      {"slug":"blue-crab-live","category":"crab-lobster"},
      {"slug":"blue-crab-live","category":"fresh-seafood"},
      {"slug":"blue-crab-live","category":"promotions"},
      {"slug":"canada-oyster-half-shell","category":"oyster-shellfish"},
      {"slug":"canada-oyster-half-shell","category":"imported-seafood"},
      {"slug":"japanese-scallop-meat","category":"imported-seafood"},
      {"slug":"japanese-scallop-meat","category":"frozen-seafood"},
      {"slug":"norway-salmon-saku","category":"salmon"},
      {"slug":"norway-salmon-saku","category":"sashimi"},
      {"slug":"snow-crab-cluster","category":"crab-lobster"},
      {"slug":"snow-crab-cluster","category":"frozen-seafood"},
      {"slug":"tiger-prawn-live","category":"live-seafood"},
      {"slug":"tiger-prawn-live","category":"fresh-seafood"},
      {"slug":"squid-ring-tray","category":"shrimp-squid"},
      {"slug":"squid-ring-tray","category":"frozen-seafood"},
      {"slug":"seafood-hotpot-combo","category":"promotions"},
      {"slug":"seafood-hotpot-combo","category":"fresh-seafood"},
      {"slug":"grilled-salmon-teriyaki","category":"ready-to-eat"},
      {"slug":"grilled-salmon-teriyaki","category":"salmon"},
      {"slug":"ikura-sushi-pack","category":"sashimi"},
      {"slug":"baby-octopus-tray","category":"shrimp-squid"},
      {"slug":"baby-octopus-tray","category":"frozen-seafood"},
      {"slug":"black-tiger-shrimp","category":"shrimp-squid"},
      {"slug":"black-tiger-shrimp","category":"fresh-seafood"},
      {"slug":"lobster-tail-pack","category":"crab-lobster"},
      {"slug":"lobster-tail-pack","category":"promotions"},
      {"slug":"clam-meat-pack","category":"frozen-seafood"},
      {"slug":"clam-meat-pack","category":"oyster-shellfish"},
      {"slug":"seaweed-salad-box","category":"ready-to-eat"}
    ]'::jsonb
  ) as product_category(slug text, category text)
)
insert into product_categories (product_id, category_id)
select products.id, categories.id
from product_category_seed
join products on products.slug = product_category_seed.slug
join categories on categories.slug = product_category_seed.category
on conflict (product_id, category_id) do nothing;

with image_seed as (
  select *
  from jsonb_to_recordset(
    '[
      {"slug":"alaska-lobster-500g","image":"https://placehold.co/900x700/e0f7fa/0f172a?text=Alaska+Lobster"},
      {"slug":"korean-abalone-live","image":"https://placehold.co/900x700/e8f5e9/0f172a?text=Korean+Abalone"},
      {"slug":"fresh-salmon-loin","image":"https://placehold.co/900x700/fff3e0/0f172a?text=Fresh+Salmon"},
      {"slug":"green-lobster-live","image":"https://placehold.co/900x700/e3f2fd/0f172a?text=Green+Lobster"},
      {"slug":"sashimi-mix-family","image":"https://placehold.co/900x700/fce4ec/0f172a?text=Sashimi+Mix"},
      {"slug":"shrimp-teriyaki-maki","image":"https://placehold.co/900x700/f3e5f5/0f172a?text=Shrimp+Maki"},
      {"slug":"peeled-white-shrimp","image":"https://placehold.co/900x700/e1f5fe/0f172a?text=Peeled+Shrimp"},
      {"slug":"ready-meal-salmon-soy","image":"https://placehold.co/900x700/fff8e1/0f172a?text=Salmon+Bowl"},
      {"slug":"clam-combo","image":"https://placehold.co/900x700/e0f2f1/0f172a?text=Clam+Combo"},
      {"slug":"blue-crab-live","image":"https://placehold.co/900x700/ede7f6/0f172a?text=Blue+Crab"},
      {"slug":"canada-oyster-half-shell","image":"https://placehold.co/900x700/e0f2fe/0f172a?text=Canada+Oyster"},
      {"slug":"japanese-scallop-meat","image":"https://placehold.co/900x700/e0f7fa/0f172a?text=Scallop"},
      {"slug":"norway-salmon-saku","image":"https://placehold.co/900x700/fee2e2/0f172a?text=Salmon+Saku"},
      {"slug":"snow-crab-cluster","image":"https://placehold.co/900x700/ede9fe/0f172a?text=Snow+Crab"},
      {"slug":"tiger-prawn-live","image":"https://placehold.co/900x700/dcfce7/0f172a?text=Tiger+Prawn"},
      {"slug":"squid-ring-tray","image":"https://placehold.co/900x700/e0f2fe/0f172a?text=Squid+Ring"},
      {"slug":"seafood-hotpot-combo","image":"https://placehold.co/900x700/fef3c7/0f172a?text=Hotpot+Combo"},
      {"slug":"grilled-salmon-teriyaki","image":"https://placehold.co/900x700/ffedd5/0f172a?text=Salmon+Teriyaki"},
      {"slug":"ikura-sushi-pack","image":"https://placehold.co/900x700/fce7f3/0f172a?text=Ikura+Sushi"},
      {"slug":"baby-octopus-tray","image":"https://placehold.co/900x700/e0f2fe/0f172a?text=Baby+Octopus"},
      {"slug":"black-tiger-shrimp","image":"https://placehold.co/900x700/e0f7fa/0f172a?text=Tiger+Shrimp"},
      {"slug":"lobster-tail-pack","image":"https://placehold.co/900x700/ede9fe/0f172a?text=Lobster+Tail"},
      {"slug":"clam-meat-pack","image":"https://placehold.co/900x700/e0f2f1/0f172a?text=Clam+Meat"},
      {"slug":"seaweed-salad-box","image":"https://placehold.co/900x700/dcfce7/0f172a?text=Seaweed+Salad"}
    ]'::jsonb
  ) as image(slug text, image text)
)
insert into product_images (product_id, url, alt_text, sort_order)
select products.id, image_seed.image, products.name, 0
from image_seed
join products on products.slug = image_seed.slug
where not exists (
  select 1
  from product_images
  where product_images.product_id = products.id
    and product_images.url = image_seed.image
);

insert into cms_pages (page_key, title, status)
values ('home', 'Trang chủ Hải Sản Nhà Quê', 'published')
on conflict (page_key) do update
set title = excluded.title,
    status = excluded.status,
    updated_at = now();

with section_seed as (
  select *
  from jsonb_to_recordset(
    '[
      {"section_key":"hero","section_type":"hero","title":"Chợ hải sản hôm nay","subtitle":"Ưu đãi hải sản tươi từ Hải Sản Nhà Quê","layout":"dao_market_grid","sort":10,"metadata":{}},
      {"section_key":"service-strip","section_type":"service_strip","title":"Cam kết dịch vụ","subtitle":"Giao hàng, tích điểm và hỗ trợ","layout":"icons","sort":20,"metadata":{"items":[{"label":"Giao 2H","detail":"Giao nhanh giữ lạnh nội thành","iconKey":"truck"},{"label":"Tích điểm","detail":"Nhận điểm cho mỗi đơn hàng","iconKey":"award"},{"label":"Hàng mới","detail":"Hải sản mới về cho bữa cơm tuần","iconKey":"package-plus"},{"label":"Bán chạy","detail":"Món được chọn nhiều đã bổ sung hàng","iconKey":"star"}]}},
      {"section_key":"category-shortcuts","section_type":"category_shortcuts","title":"Mua theo danh mục","subtitle":"Lối tắt mua nhanh","layout":"compact_grid","sort":30,"metadata":{"items":[{"label":"Bán chạy","href":"/categories/best-sellers","iconKey":"star"},{"label":"Khuyến mãi","href":"/categories/promotions","iconKey":"badge-percent"},{"label":"Sushi & sashimi","href":"/categories/sashimi","iconKey":"fish"},{"label":"Hải sản tươi","href":"/categories/fresh-seafood","iconKey":"waves"},{"label":"Hải sản đông lạnh","href":"/categories/frozen-seafood","iconKey":"snowflake"},{"label":"Hải sản sống","href":"/categories/live-seafood","iconKey":"waves"},{"label":"Hàng nhập khẩu","href":"/categories/imported-seafood","iconKey":"ship"},{"label":"Cá hồi","href":"/categories/salmon","iconKey":"fish"},{"label":"Hàu và nghêu sò","href":"/categories/oyster-shellfish","iconKey":"shell"},{"label":"Cua và tôm hùm","href":"/categories/crab-lobster","iconKey":"fish"},{"label":"Tôm và mực","href":"/categories/shrimp-squid","iconKey":"fish"},{"label":"Món chế biến sẵn","href":"/categories/ready-to-eat","iconKey":"utensils"}]}},
      {"section_key":"best-sellers","section_type":"product_rail","title":"Bán chạy","subtitle":"Sản phẩm được chọn nhiều tuần này","layout":"grid","sort":40,"metadata":{"viewMoreHref":"/categories/best-sellers"}},
      {"section_key":"flash-sale","section_type":"flash_sale","title":"Flash sale hải sản","subtitle":"Ưu đãi trong ngày","layout":"countdown_grid","sort":50,"metadata":{"tone":"sale","saleBadge":"Đang giảm","countdownLabel":"Kết thúc sau","countdownItems":[{"value":"02","label":"Giờ"},{"value":"18","label":"Phút"},{"value":"45","label":"Giây"}],"viewMoreHref":"/categories/promotions"}},
      {"section_key":"budget-promo","section_type":"promo_band","title":"Hải sản giá tốt từ 29K","subtitle":"Món hải sản hằng ngày cho bữa cơm nhà","layout":"wide_banner","sort":60,"metadata":{}},
      {"section_key":"recommendations","section_type":"recommendation_tabs","title":"Gợi ý cho bạn","subtitle":"Bộ sưu tập hải sản được tuyển chọn","layout":"tabs","sort":70,"metadata":{"viewMoreHref":"/search?collection=recommendations","tabs":[{"key":"family","label":"Bữa cơm gia đình"},{"key":"party","label":"Cuối tuần đãi khách"},{"key":"quick","label":"Món nhanh trong ngày"},{"key":"premium","label":"Hải sản cao cấp"}]}},
      {"section_key":"sashimi","section_type":"product_rail","title":"Sushi & sashimi","subtitle":"Món lạnh sẵn dùng","layout":"grid","sort":80,"metadata":{"viewMoreHref":"/categories/sashimi"}},
      {"section_key":"frozen-seafood","section_type":"product_rail","title":"Hải sản đông lạnh","subtitle":"Khẩu phần tiện trữ đông","layout":"grid","sort":90,"metadata":{"viewMoreHref":"/categories/frozen-seafood"}},
      {"section_key":"shellfish","section_type":"product_rail","title":"Hàu, nghêu và sò","subtitle":"Món vỏ giữ lạnh, dễ chế biến","layout":"grid","sort":100,"metadata":{"viewMoreHref":"/categories/oyster-shellfish"}},
      {"section_key":"crab-lobster","section_type":"product_rail","title":"Cua và tôm hùm","subtitle":"Gợi ý cho bữa ăn đặc biệt","layout":"grid","sort":110,"metadata":{"viewMoreHref":"/categories/crab-lobster"}},
      {"section_key":"ready-to-eat","section_type":"product_rail","title":"Món chế biến sẵn","subtitle":"Món hải sản đã chuẩn bị","layout":"grid","sort":120,"metadata":{"viewMoreHref":"/categories/ready-to-eat"}},
      {"section_key":"content-highlights","section_type":"content_highlights","title":"Thông tin hữu ích","subtitle":"Mẹo chọn, bảo quản và đặt hải sản","layout":"editorial_grid","sort":130,"metadata":{"cards":[{"groupLabel":"Cẩm nang","title":"Cách giữ lạnh hải sản khi nhận hàng","description":"Gợi ý kiểm tra đá gel, bao bì và thời gian bảo quản trước khi nấu.","href":"#cold-storage","imageUrl":"https://placehold.co/720x420/e0f2fe/0f172a?text=Giu+Lanh+Hai+San"},{"groupLabel":"Món ngon","title":"Thực đơn cuối tuần với tôm và nghêu","description":"Một nhịp chuẩn bị nhanh cho bữa cơm gia đình nhiều món.","href":"#weekend-menu","imageUrl":"https://placehold.co/540x360/fef3c7/0f172a?text=Thuc+Don+Cuoi+Tuan"},{"groupLabel":"Chính sách","title":"Cam kết đổi trả cho đơn giao lạnh","description":"Quy trình tiếp nhận phản hồi minh bạch cho đơn hàng trong ngày.","href":"#fresh-policy","imageUrl":"https://placehold.co/540x360/dcfce7/0f172a?text=Cam+Ket+Don+Hang"}],"highlights":[{"groupLabel":"Cẩm nang","title":"Cách giữ lạnh hải sản khi nhận hàng","description":"Gợi ý kiểm tra đá gel, bao bì và thời gian bảo quản trước khi nấu.","href":"#cold-storage","imageUrl":"https://placehold.co/720x420/e0f2fe/0f172a?text=Giu+Lanh+Hai+San"},{"groupLabel":"Món ngon","title":"Thực đơn cuối tuần với tôm và nghêu","description":"Một nhịp chuẩn bị nhanh cho bữa cơm gia đình nhiều món.","href":"#weekend-menu","imageUrl":"https://placehold.co/540x360/fef3c7/0f172a?text=Thuc+Don+Cuoi+Tuan"},{"groupLabel":"Chính sách","title":"Cam kết đổi trả cho đơn giao lạnh","description":"Quy trình tiếp nhận phản hồi minh bạch cho đơn hàng trong ngày.","href":"#fresh-policy","imageUrl":"https://placehold.co/540x360/dcfce7/0f172a?text=Cam+Ket+Don+Hang"}]}},
      {"section_key":"partners","section_type":"partner_strip","title":"Đối tác Hải Sản Nhà Quê","subtitle":"Đối tác bán lẻ, thanh toán và vận hành demo","layout":"logo_grid","sort":140,"metadata":{"groups":[{"label":"Đối tác","items":[{"label":"Retail Partner","imageUrl":"https://placehold.co/220x90/e0f2fe/0f172a?text=Retail+Partner","href":"#partners"},{"label":"Cold Delivery","imageUrl":"https://placehold.co/220x90/dcfce7/0f172a?text=Cold+Delivery","href":"#partners"}]},{"label":"Thanh toán","items":[{"label":"COD","imageUrl":"https://placehold.co/220x90/ecfeff/0f172a?text=COD","href":"#payments"},{"label":"VNPAY Demo","imageUrl":"https://placehold.co/220x90/dbeafe/0f172a?text=VNPAY+Demo","href":"#payments"}]},{"label":"Kênh xã hội","items":[{"label":"Zalo demo","imageUrl":"https://placehold.co/220x90/e0f7fa/0f172a?text=Zalo+Demo","href":"#zalo"},{"label":"Community demo","imageUrl":"https://placehold.co/220x90/fce7f3/0f172a?text=Community","href":"#community"}]},{"label":"Cam kết","items":[{"label":"Fresh Daily","imageUrl":"https://placehold.co/220x90/ccfbf1/0f172a?text=Fresh+Daily","href":"#trust"},{"label":"Cold Chain","imageUrl":"https://placehold.co/220x90/e0f2fe/0f172a?text=Cold+Chain","href":"#trust"}]}]}}
    ]'::jsonb
  ) as section(
    section_key text,
    section_type text,
    title text,
    subtitle text,
    layout text,
    sort integer,
    metadata jsonb
  )
)
insert into cms_sections (
  page_key,
  section_key,
  section_type,
  title,
  subtitle,
  layout,
  sort_order,
  metadata,
  is_active
)
select
  'home',
  section_key,
  section_type,
  title,
  subtitle,
  layout,
  sort,
  metadata,
  true
from section_seed
on conflict (page_key, section_key) do update
set section_type = excluded.section_type,
    title = excluded.title,
    subtitle = excluded.subtitle,
    layout = excluded.layout,
    sort_order = excluded.sort_order,
    metadata = excluded.metadata,
    is_active = true,
    updated_at = now();

update cms_sections
set is_active = false,
    updated_at = now()
where page_key = 'home'
  and section_key not in (
    'hero',
    'service-strip',
    'category-shortcuts',
    'best-sellers',
    'flash-sale',
    'budget-promo',
    'recommendations',
    'sashimi',
    'frozen-seafood',
    'shellfish',
    'crab-lobster',
    'ready-to-eat',
    'content-highlights',
    'partners'
  );

delete from cms_banners
using cms_sections
where cms_banners.section_id = cms_sections.id
  and cms_sections.page_key = 'home'
  and cms_sections.section_key in ('hero', 'budget-promo', 'partners');

with banner_seed as (
  select *
  from jsonb_to_recordset(
    '[
      {"section":"hero","title":"Ưu đãi hải sản trong tuần","subtitle":"Ảnh placeholder gốc cho mùa hải sản.","image":"https://placehold.co/1200x430/0284c7/ffffff?text=Cho+Hai+San","mobile":"https://placehold.co/720x360/0284c7/ffffff?text=Cho+Hai+San","href":"/search?q=seafood","label":"Mua ngay","sort":10},
      {"section":"hero","title":"Hải sản từ 29K","subtitle":"Khẩu phần mỗi ngày cho bữa cơm nhà.","image":"https://placehold.co/600x210/f97316/ffffff?text=Hai+San+29K","mobile":"https://placehold.co/720x320/f97316/ffffff?text=Hai+San+29K","href":"/categories/promotions","label":"Xem ưu đãi","sort":20},
      {"section":"hero","title":"Sushi & sashimi","subtitle":"Chuẩn bị mới mỗi ngày với ảnh placeholder.","image":"https://placehold.co/600x210/16a34a/ffffff?text=Sashimi","mobile":"https://placehold.co/720x320/16a34a/ffffff?text=Sashimi","href":"/categories/sashimi","label":"Xem sashimi","sort":30},
      {"section":"hero","title":"Hàu, nghêu và sò","subtitle":"Gợi ý món vỏ cho bữa cuối tuần.","image":"https://placehold.co/600x210/fef3c7/0f172a?text=Hau+Ngheu+So","mobile":"https://placehold.co/720x320/fef3c7/0f172a?text=Hai+San+Vo","href":"/categories/oyster-shellfish","label":"Xem món vỏ","sort":40},
      {"section":"budget-promo","title":"Hải sản từ 29K","subtitle":"Khẩu phần thực tế cho bữa cơm gia đình.","image":"https://placehold.co/1400x260/0ea5e9/ffffff?text=Hai+San+Gia+Tot","mobile":"https://placehold.co/720x320/0ea5e9/ffffff?text=Gia+Tot","href":"/categories/promotions","label":"Mua giá tốt","sort":10},
      {"section":"partners","title":"Retail Partner","subtitle":"Logo placeholder đối tác bán lẻ","image":"https://placehold.co/220x90/e0f2fe/0f172a?text=Retail+Partner","mobile":null,"href":"#partners","label":null,"sort":10},
      {"section":"partners","title":"VNPAY Demo","subtitle":"Logo placeholder thanh toán","image":"https://placehold.co/220x90/dbeafe/0f172a?text=VNPAY+Demo","mobile":null,"href":"#payments","label":null,"sort":20},
      {"section":"partners","title":"Zalo demo","subtitle":"Logo placeholder kênh xã hội","image":"https://placehold.co/220x90/e0f7fa/0f172a?text=Zalo+Demo","mobile":null,"href":"#zalo","label":null,"sort":30},
      {"section":"partners","title":"Fresh Daily","subtitle":"Logo placeholder cam kết chất lượng","image":"https://placehold.co/220x90/ccfbf1/0f172a?text=Fresh+Daily","mobile":null,"href":"#trust","label":null,"sort":40}
    ]'::jsonb
  ) as banner(
    section text,
    title text,
    subtitle text,
    image text,
    mobile text,
    href text,
    label text,
    sort integer
  )
)
insert into cms_banners (
  section_id,
  title,
  subtitle,
  image_url,
  mobile_image_url,
  cta_href,
  cta_label,
  sort_order,
  is_active
)
select
  cms_sections.id,
  banner.title,
  banner.subtitle,
  banner.image,
  banner.mobile,
  banner.href,
  banner.label,
  banner.sort,
  true
from banner_seed banner
join cms_sections
  on cms_sections.page_key = 'home'
  and cms_sections.section_key = banner.section
where not exists (
  select 1
  from cms_banners
  where cms_banners.section_id = cms_sections.id
    and cms_banners.title = banner.title
);

delete from cms_navigation_items
where placement in ('header', 'sidebar', 'mobile_dock');

insert into cms_navigation_items (
  placement,
  label,
  href,
  icon_key,
  sort_order,
  is_active
)
values
  ('header', 'Bán chạy', '/categories/best-sellers', 'star', 10, true),
  ('header', 'Khuyến mãi', '/categories/promotions', 'badge-percent', 20, true),
  ('header', 'Sushi & sashimi', '/categories/sashimi', 'fish', 30, true),
  ('header', 'Hải sản tươi sống', '/categories/fresh-seafood', 'waves', 40, true),
  ('header', 'Hải sản đông lạnh', '/categories/frozen-seafood', 'snowflake', 50, true),
  ('header', 'Hải sản sống', '/categories/live-seafood', 'waves', 60, true),
  ('header', 'Hàng nhập khẩu', '/categories/imported-seafood', 'ship', 70, true),
  ('header', 'Cá hồi', '/categories/salmon', 'fish', 80, true),
  ('header', 'Hàu và nghêu sò', '/categories/oyster-shellfish', 'shell', 90, true),
  ('header', 'Cua và tôm hùm', '/categories/crab-lobster', 'fish', 100, true),
  ('header', 'Tôm và mực', '/categories/shrimp-squid', 'fish', 110, true),
  ('header', 'Món chế biến sẵn', '/categories/ready-to-eat', 'utensils', 120, true),
  ('sidebar', 'Bán chạy', '/categories/best-sellers', 'star', 10, true),
  ('sidebar', 'Khuyến mãi', '/categories/promotions', 'badge-percent', 20, true),
  ('sidebar', 'Sushi & sashimi', '/categories/sashimi', 'fish', 30, true),
  ('sidebar', 'Hải sản tươi sống', '/categories/fresh-seafood', 'waves', 40, true),
  ('sidebar', 'Hải sản đông lạnh', '/categories/frozen-seafood', 'snowflake', 50, true),
  ('sidebar', 'Hải sản sống', '/categories/live-seafood', 'waves', 60, true),
  ('sidebar', 'Hàng nhập khẩu', '/categories/imported-seafood', 'ship', 70, true),
  ('sidebar', 'Cá hồi', '/categories/salmon', 'fish', 80, true),
  ('sidebar', 'Hàu và nghêu sò', '/categories/oyster-shellfish', 'shell', 90, true),
  ('sidebar', 'Cua và tôm hùm', '/categories/crab-lobster', 'fish', 100, true),
  ('sidebar', 'Tôm và mực', '/categories/shrimp-squid', 'fish', 110, true),
  ('sidebar', 'Món chế biến sẵn', '/categories/ready-to-eat', 'utensils', 120, true),
  ('mobile_dock', 'Danh mục', '/search', 'menu', 10, true),
  ('mobile_dock', '8h - 21h', 'tel:19000098', 'phone', 20, true),
  ('mobile_dock', 'Messenger', '#messenger', 'message-circle', 30, true),
  ('mobile_dock', 'Zalo', '#zalo', 'send', 40, true),
  ('mobile_dock', 'Tài khoản', '/account/orders', 'user', 50, true)
on conflict (placement, label, href) do update
set icon_key = excluded.icon_key,
    sort_order = excluded.sort_order,
    is_active = true;

delete from cms_footer_links
where group_label in (
  'Information',
  'Policies',
  'Products',
  'Thông tin',
  'Chính sách',
  'Sản phẩm',
  'Thông tin công ty',
  'Hỗ trợ khách hàng',
  'Danh mục nổi bật'
);

insert into cms_footer_links (
  group_label,
  label,
  href,
  sort_order,
  is_active
)
values
  ('Thông tin', 'Về Hải Sản Nhà Quê', '#company', 10, true),
  ('Thông tin', 'Hệ thống cửa hàng', '#stores', 20, true),
  ('Thông tin', 'Khách hàng thân thiết', '/account/loyalty', 30, true),
  ('Hỗ trợ khách hàng', 'Chính sách giao hàng', '#shipping', 10, true),
  ('Hỗ trợ khách hàng', 'Hướng dẫn đặt hàng', '#ordering', 20, true),
  ('Hỗ trợ khách hàng', 'Đổi trả và khiếu nại', '#returns', 30, true),
  ('Danh mục nổi bật', 'Sushi & sashimi', '/categories/sashimi', 10, true),
  ('Danh mục nổi bật', 'Hàu, nghêu và sò', '/categories/oyster-shellfish', 20, true),
  ('Danh mục nổi bật', 'Món chế biến sẵn', '/categories/ready-to-eat', 30, true)
on conflict (group_label, label, href) do update
set sort_order = excluded.sort_order,
    is_active = true;

insert into cms_brand_assets (
  asset_key,
  placement,
  image_url,
  alt_text,
  href,
  sort_order,
  is_active
)
values
  ('brand-logo', 'brand', 'https://placehold.co/240x96/f8fafc/0f172a?text=Hai+San+Nha+Que', 'Logo placeholder Hải Sản Nhà Quê', '/', 10, true),
  ('brand-wordmark', 'brand', 'https://placehold.co/320x96/ecfeff/0f172a?text=Hai+San+Nha+Que', 'Wordmark placeholder Hải Sản Nhà Quê', '/', 20, true),
  ('payment-cod', 'payment', 'https://placehold.co/180x80/f8fafc/0f172a?text=COD', 'Cash on delivery', null, 10, true),
  ('payment-momo', 'payment', 'https://placehold.co/180x80/fce7f3/0f172a?text=MoMo+Demo', 'Thanh toán MoMo demo', null, 20, true),
  ('payment-vnpay', 'payment', 'https://placehold.co/180x80/dbeafe/0f172a?text=VNPAY+Demo', 'Thanh toán VNPAY demo', null, 30, true),
  ('payment-bank', 'payment', 'https://placehold.co/180x80/fef3c7/0f172a?text=Bank+Transfer', 'Chuyển khoản ngân hàng', null, 40, true),
  ('partner-retail', 'partner', 'https://placehold.co/220x90/e0f2fe/0f172a?text=Retail+Partner', 'Đối tác bán lẻ demo', null, 10, true),
  ('partner-delivery', 'partner', 'https://placehold.co/220x90/dcfce7/0f172a?text=Cold+Delivery', 'Đối tác giao hàng lạnh demo', null, 20, true),
  ('partner-kitchen', 'partner', 'https://placehold.co/220x90/ffedd5/0f172a?text=Prep+Kitchen', 'Đối tác bếp sơ chế demo', null, 30, true),
  ('trust-fresh', 'trust', 'https://placehold.co/220x90/ccfbf1/0f172a?text=Fresh+Daily', 'Cam kết hàng mới mỗi ngày', null, 10, true),
  ('trust-cold-chain', 'trust', 'https://placehold.co/220x90/e0f2fe/0f172a?text=Cold+Chain', 'Cam kết giữ lạnh', null, 20, true),
  ('trust-traceable', 'trust', 'https://placehold.co/220x90/fef9c3/0f172a?text=Traceable', 'Thông tin nguồn hàng minh bạch', null, 30, true)
on conflict (placement, asset_key) do update
set image_url = excluded.image_url,
    alt_text = excluded.alt_text,
    href = excluded.href,
    sort_order = excluded.sort_order,
    is_active = true;

delete from cms_section_products
using cms_sections
where cms_section_products.section_id = cms_sections.id
  and cms_sections.page_key = 'home';

with section_products as (
  select *
  from jsonb_to_recordset(
    '[
      {"section":"best-sellers","slug":"alaska-lobster-500g","sort":10,"badge":"Hot"},
      {"section":"best-sellers","slug":"korean-abalone-live","sort":20,"badge":"Sống"},
      {"section":"best-sellers","slug":"fresh-salmon-loin","sort":30,"badge":"Tươi"},
      {"section":"best-sellers","slug":"black-tiger-shrimp","sort":40,"badge":"Tươi"},
      {"section":"flash-sale","slug":"green-lobster-live","sort":10,"badge":"Flash"},
      {"section":"flash-sale","slug":"peeled-white-shrimp","sort":20,"badge":"Giảm"},
      {"section":"flash-sale","slug":"seafood-hotpot-combo","sort":30,"badge":"Combo"},
      {"section":"flash-sale","slug":"lobster-tail-pack","sort":40,"badge":"Giảm"},
      {"section":"recommendations","slug":"fresh-salmon-loin","sort":10,"badge":"Gợi ý"},
      {"section":"recommendations","slug":"seafood-hotpot-combo","sort":20,"badge":"Gia đình"},
      {"section":"recommendations","slug":"canada-oyster-half-shell","sort":30,"badge":"Cuối tuần"},
      {"section":"recommendations","slug":"sashimi-mix-family","sort":40,"badge":"Tuyển chọn"},
      {"section":"recommendations","slug":"green-lobster-live","sort":50,"badge":"Cao cấp"},
      {"section":"recommendations","slug":"japanese-scallop-meat","sort":60,"badge":"Nhập"},
      {"section":"recommendations","slug":"ready-meal-salmon-soy","sort":70,"badge":"Sẵn ăn"},
      {"section":"recommendations","slug":"blue-crab-live","sort":80,"badge":"Sống"},
      {"section":"sashimi","slug":"sashimi-mix-family","sort":10,"badge":"Tươi"},
      {"section":"sashimi","slug":"shrimp-teriyaki-maki","sort":20,"badge":"Sẵn ăn"},
      {"section":"sashimi","slug":"norway-salmon-saku","sort":30,"badge":"Lạnh"},
      {"section":"sashimi","slug":"ikura-sushi-pack","sort":40,"badge":"Mới"},
      {"section":"frozen-seafood","slug":"peeled-white-shrimp","sort":10,"badge":"Đông lạnh"},
      {"section":"frozen-seafood","slug":"japanese-scallop-meat","sort":20,"badge":"Nhập"},
      {"section":"frozen-seafood","slug":"squid-ring-tray","sort":30,"badge":"Giảm"},
      {"section":"frozen-seafood","slug":"baby-octopus-tray","sort":40,"badge":"Đông lạnh"},
      {"section":"shellfish","slug":"canada-oyster-half-shell","sort":10,"badge":"Lạnh"},
      {"section":"shellfish","slug":"clam-combo","sort":20,"badge":"Tươi"},
      {"section":"shellfish","slug":"japanese-scallop-meat","sort":30,"badge":"Nhập"},
      {"section":"shellfish","slug":"clam-meat-pack","sort":40,"badge":"Đông lạnh"},
      {"section":"crab-lobster","slug":"blue-crab-live","sort":10,"badge":"Sống"},
      {"section":"crab-lobster","slug":"alaska-lobster-500g","sort":20,"badge":"Hot"},
      {"section":"crab-lobster","slug":"lobster-tail-pack","sort":30,"badge":"Giảm"},
      {"section":"crab-lobster","slug":"snow-crab-cluster","sort":40,"badge":"Đông lạnh"},
      {"section":"ready-to-eat","slug":"ready-meal-salmon-soy","sort":10,"badge":"Sẵn ăn"},
      {"section":"ready-to-eat","slug":"grilled-salmon-teriyaki","sort":20,"badge":"Sẵn ăn"},
      {"section":"ready-to-eat","slug":"seaweed-salad-box","sort":30,"badge":"Lạnh"},
      {"section":"ready-to-eat","slug":"shrimp-teriyaki-maki","sort":40,"badge":"Sẵn ăn"}
    ]'::jsonb
  ) as item(section text, slug text, sort integer, badge text)
)
insert into cms_section_products (
  section_id,
  product_id,
  sort_order,
  badge_text
)
select
  cms_sections.id,
  products.id,
  section_products.sort,
  section_products.badge
from section_products
join cms_sections
  on cms_sections.page_key = 'home'
  and cms_sections.section_key = section_products.section
join products on products.slug = section_products.slug
on conflict (section_id, product_id) do update
set sort_order = excluded.sort_order,
    badge_text = excluded.badge_text;
