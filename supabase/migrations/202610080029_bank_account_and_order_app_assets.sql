-- Two new brand-asset placements so the shop can attach real images:
--   bank_account — a transfer QR (image) plus the account details (alt_text),
--                  shown at checkout and on the order confirmation page.
--   order_app    — a delivery-app logo (ShopeeFood, GrabFood…) linking to the
--                  shop's page in that app, shown in the footer and at checkout.
alter table cms_brand_assets drop constraint cms_brand_assets_placement_check;
alter table cms_brand_assets add constraint cms_brand_assets_placement_check
  check (placement in ('partner', 'payment', 'trust', 'brand', 'bank_account', 'order_app'));

-- The shop had already entered these as stand-ins under other placements.
update cms_brand_assets
set placement = 'order_app'
where placement = 'partner'
  and asset_key in ('partner-shopeefood', 'partner-grabfood');

update cms_brand_assets
set placement = 'bank_account'
where placement = 'payment'
  and asset_key = 'payment'
  and alt_text ilike '%chuyển khoản%';
