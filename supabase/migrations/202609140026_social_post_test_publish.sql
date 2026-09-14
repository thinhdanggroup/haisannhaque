-- "Đăng thử": publish a post to Facebook as an UNPUBLISHED photo, visible only
-- to Page admins in Business Suite. It proves the token, the image URL and the
-- caption without anything reaching the timeline.
--
-- Recorded separately from fb_post_id/posted_at on purpose. publishSocialPost
-- refuses to publish a post that already carries fb_post_id, so reusing that
-- column would make a single test consume the post and lock it out of ever
-- being published for real.

alter table social_posts
  add column test_fb_post_id text,
  add column tested_at timestamptz;

comment on column social_posts.test_fb_post_id is
  'Graph API id of the unpublished test photo; independent of fb_post_id.';
comment on column social_posts.tested_at is
  'When the post was last test-published. Null means never tested.';
