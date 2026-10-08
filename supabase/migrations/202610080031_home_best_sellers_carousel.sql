-- Show "Bán chạy" as a sliding carousel between the "Hải Sản Nhà Quê" hero
-- (sort 0) and the "Chợ hải sản hôm nay" hero (sort 10).
update cms_sections
set is_active = true,
    sort_order = 5,
    layout = 'carousel',
    updated_at = now()
where page_key = 'home'
  and section_key = 'best-sellers';
