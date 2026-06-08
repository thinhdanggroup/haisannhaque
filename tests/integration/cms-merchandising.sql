begin;

select
  to_regclass('public.cms_pages') as cms_pages_table,
  to_regclass('public.cms_sections') as cms_sections_table,
  to_regclass('public.cms_banners') as cms_banners_table,
  to_regclass('public.cms_section_products') as cms_section_products_table,
  to_regclass('public.cms_navigation_items') as cms_navigation_items_table,
  to_regclass('public.cms_footer_links') as cms_footer_links_table,
  to_regclass('public.cms_brand_assets') as cms_brand_assets_table;

do $$
begin
  if to_regclass('public.cms_pages') is null then
    raise exception 'cms_pages table is missing';
  end if;

  if to_regclass('public.cms_sections') is null then
    raise exception 'cms_sections table is missing';
  end if;

  if to_regclass('public.cms_banners') is null then
    raise exception 'cms_banners table is missing';
  end if;

  if to_regclass('public.cms_section_products') is null then
    raise exception 'cms_section_products table is missing';
  end if;

  if to_regclass('public.cms_navigation_items') is null then
    raise exception 'cms_navigation_items table is missing';
  end if;

  if to_regclass('public.cms_footer_links') is null then
    raise exception 'cms_footer_links table is missing';
  end if;

  if to_regclass('public.cms_brand_assets') is null then
    raise exception 'cms_brand_assets table is missing';
  end if;
end $$;

rollback;
