-- The green header bar, the vertical sidebar and the homepage "Mua theo danh
-- mục" strip each kept their own copy of the category list: two sets of
-- cms_navigation_items rows plus a metadata blob on a cms_sections row. None
-- of them read the categories table, so editing a category in /admin/categories
-- changed no menu, and the three copies drifted apart -- a duplicated header
-- entry, four links pointing at slugs that no longer exist, and five real
-- categories missing from every menu.
--
-- From here the categories table is the single source of truth for all three
-- surfaces. It gains the two display fields the CMS rows used to hold, and the
-- category-shaped CMS rows are retired.

alter table categories
  add column icon_key text,
  add column show_in_nav boolean not null default true;

comment on column categories.icon_key is
  'Lucide icon name rendered beside the category in the storefront menus.';
comment on column categories.show_in_nav is
  'When false the category and its page still work, but it is hidden from the header bar, the sidebar and the homepage shortcuts.';

-- Carry over the icons staff already chose, matched on the slug each CMS row
-- linked to. Header wins over sidebar when the two disagree.
update categories
set icon_key = nav.icon_key
from (
  select distinct on (href) href, icon_key
  from cms_navigation_items
  where placement in ('header', 'sidebar')
    and icon_key is not null
  order by href, placement
) as nav
where nav.href = '/categories/' || categories.slug;

-- Retire the category-shaped navigation rows. Deactivated rather than deleted
-- so the previous hand-maintained ordering stays recoverable; nothing reads
-- header/sidebar rows any more. mobile_dock and footer rows are untouched --
-- they are not categories.
update cms_navigation_items
set is_active = false
where placement in ('header', 'sidebar');

-- Drop the hand-maintained shortcut list. The section row stays: it still
-- supplies the strip's title and subtitle, it just no longer carries its own
-- copy of the categories.
update cms_sections
set metadata = metadata - 'items'
where section_type = 'category_shortcuts';
