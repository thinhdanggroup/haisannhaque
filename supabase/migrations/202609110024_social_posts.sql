-- Admin-authored prompt templates for Facebook post generation. One row may
-- be flagged is_default so the generate form has a sensible preselection.
create table social_post_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  prompt_body text not null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

-- Partial unique index: at most one row may have is_default = true.
create unique index social_post_templates_default_key
  on social_post_templates (is_default) where is_default;

-- One row per generated post. Generation is synchronous, so there is no
-- runs table; generation metadata lives here. image_local_path is the
-- transient path handed to agy for vision and may be pruned from disk
-- after generation; image_url is the durable reference used by Facebook.
create table social_posts (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references social_post_templates(id) on delete set null,
  idea text not null,
  image_url text,
  image_storage_path text,
  image_local_path text,
  generated_caption text,
  edited_caption text,
  status text not null default 'draft'
    check (status in ('draft','generated','posted','scheduled','failed')),
  fb_post_id text,
  scheduled_publish_time timestamptz,
  conversation_id text,
  generation_ms integer,
  generation_tokens integer,
  error_message text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  posted_at timestamptz
);

create index social_posts_created_at_idx on social_posts (created_at desc);

alter table social_post_templates enable row level security;
alter table social_posts enable row level security;

create policy "Admins manage social_post_templates" on social_post_templates
  for all
  using (exists (select 1 from user_admin_roles where user_id = auth.uid()))
  with check (exists (select 1 from user_admin_roles where user_id = auth.uid()));

create policy "Admins manage social_posts" on social_posts
  for all
  using (exists (select 1 from user_admin_roles where user_id = auth.uid()))
  with check (exists (select 1 from user_admin_roles where user_id = auth.uid()));

-- Seed one default template so the generate page works on first load.
-- The delimiter and no-shell instructions are appended by prompt-builder,
-- not stored here, so they stay in sync with the parser.
insert into social_post_templates (name, prompt_body, is_default)
values (
  'Bài đăng bán hàng',
  'Bạn là chuyên gia viết content Facebook cho shop hải sản Đảo Seafood. '
  || 'Viết MỘT bài đăng Facebook bằng tiếng Việt để tăng đơn hàng và tương tác. '
  || 'Giọng điệu thân thiện, gần gũi với khách Việt. '
  || 'Bao gồm: tiêu đề hấp dẫn, 3-4 điểm nổi bật của sản phẩm, một lời kêu gọi '
  || 'hành động rõ ràng (comment hoặc inbox), và 5-7 hashtag liên quan.',
  true
);
