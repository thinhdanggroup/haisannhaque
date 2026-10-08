-- Editable "Hỗ trợ khách hàng" pages (shipping policy, ordering guide, …),
-- served at /ho-tro/<slug>. Each page keeps a matching footer link in the
-- "Hỗ trợ khách hàng" group in sync from the admin actions.
create table cms_support_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) > 0),
  body text not null default '',
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table cms_support_pages enable row level security;

create policy "public can read published support pages"
on cms_support_pages for select
using (is_published = true);

create policy "marketing can manage support pages"
on cms_support_pages for all
using (has_admin_permission('cms:update') or has_admin_permission('*'))
with check (has_admin_permission('cms:update') or has_admin_permission('*'));

insert into cms_support_pages (slug, title, body, sort_order) values
(
  'chinh-sach-giao-hang',
  'Chính sách giao hàng',
  E'Nội dung chi tiết đang được cập nhật.\n\nVui lòng liên hệ hotline 086 799 7200 hoặc email haisannq3@gmail.com để được tư vấn về phí và thời gian giao hàng.',
  10
),
(
  'huong-dan-dat-hang',
  'Hướng dẫn đặt hàng',
  E'## Đặt hàng trên website\n\n1. Chọn sản phẩm và bấm "Thêm vào giỏ".\n2. Mở giỏ hàng, kiểm tra số lượng rồi bấm "Thanh toán".\n3. Nhập thông tin người nhận và địa chỉ giao hàng.\n4. Chọn phương thức giao hàng và phương thức thanh toán, sau đó bấm "Đặt hàng".\n5. Hải Sản Nhà Quê sẽ gọi điện xác nhận đơn hàng trong thời gian sớm nhất.\n\n## Đặt hàng qua điện thoại\n\nGọi hotline 086 799 7200 để được tư vấn và đặt hàng trực tiếp.',
  20
),
(
  'doi-tra-va-khieu-nai',
  'Đổi trả và khiếu nại',
  E'Nội dung chi tiết đang được cập nhật.\n\nNếu sản phẩm có vấn đề, vui lòng liên hệ hotline 086 799 7200 hoặc email haisannq3@gmail.com để được hỗ trợ.',
  30
);

-- Point the existing footer links (previously dead "#…" anchors) at the pages.
update cms_footer_links set href = '/ho-tro/chinh-sach-giao-hang'
where group_label = 'Hỗ trợ khách hàng' and href = '#shipping';
update cms_footer_links set href = '/ho-tro/huong-dan-dat-hang'
where group_label = 'Hỗ trợ khách hàng' and href = '#ordering';
update cms_footer_links set href = '/ho-tro/doi-tra-va-khieu-nai'
where group_label = 'Hỗ trợ khách hàng' and href = '#returns';
