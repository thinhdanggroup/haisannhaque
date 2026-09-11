# Facebook Post Generator — Design

**Date:** 2026-09-11
**Status:** Approved (design); implementation plan pending
**Feature area:** `app/admin/social-posts/`, `src/features/social-posts/`

---

## 1. Purpose

Give admins a page that turns a short **idea** plus an **image** into a
ready-to-publish Vietnamese Facebook post aimed at driving sales and
engagement. The admin picks a reusable prompt template, generates a draft,
reviews and edits the caption, then publishes it to the shop's Facebook Page
immediately or at a scheduled time.

Content is generated server-side by the `agy` CLI (Antigravity CLI 1.2.1) in
headless print mode.

### Success criteria

1. An admin can generate a draft caption from an idea + image in one click.
2. The generated caption references what is actually in the photo.
3. Prompt templates are editable in the admin UI without a deploy.
4. No post reaches Facebook without an explicit human review step.
5. Generation failures are legible ("AI couldn't read the image"), never a
   silently empty caption.

### Out of scope

- Multi-image / carousel and video posts.
- Platforms other than Facebook.
- Comment/engagement analytics or reply automation.
- Autonomous posting on a schedule without human review.

---

## 2. CLI contract (verified empirically)

All findings below were confirmed by probing `agy` 1.2.1 on 2026-09-11.
They are recorded because two of them are counter-intuitive and constrain the
design.

### 2.1 Headless mode works

```
agy -p "<prompt>" --output-format json --print-timeout 120s
```

`exit=0`. Observed latency: **10–31s** (12s trivial text, 18s short
generation, 26–31s when tool use was attempted). The JSON envelope:

```json
{
  "conversation_id": "…",
  "status": "SUCCESS",
  "response": "…",
  "duration_seconds": 10.5,
  "num_turns": 2,
  "structured_output": { … },
  "json_schema": { … },
  "usage": { "input_tokens": …, "output_tokens": …, "total_tokens": … },
  "denied_actions": [ { "action": "read_file", "display_name": "ListDir" } ]
}
```

`conversation_id` supports follow-up turns via `--continue` / `--conversation`,
which is how "regenerate, but shorter" is implemented.

### 2.2 `--json-schema` does NOT shape the generated content

**Do not use `--json-schema` to structure the post.** It requires
`--output-format json` (otherwise: `Error: --json-schema can only be used when
--output-format is 'json' or 'stream-json'`), but more importantly it binds the
agent's *final tool call*, not the artifact.

Probe: schema `{caption, hashtags}` against "Write a short Vietnamese Facebook
post promoting fresh salmon." The real post came back as prose in `.response`;
`structured_output` contained task-completion metadata:

```json
{"caption": "Completed drafting the Vietnamese Facebook post promoting fresh salmon.",
 "hashtags": ["#vietnamese", "#facebookpost", "#copywriting", "#salmon"]}
```

It also leaked `toolAction` / `toolSummary` keys into the `response` text.

**Consequence:** read `.response` and shape output with prompt instructions plus
explicit delimiters.

### 2.3 Responses carry conversational preamble

The probe response began `"Dưới đây là mẫu bài đăng Facebook ngắn gọn…"` before
the actual post. The prompt therefore instructs the model to wrap the post in
`<<<POST>>> … <<<END>>>`, and the parser extracts that block, falling back to
the trimmed full response when the delimiters are absent.

### 2.4 Tool permissions fail closed in headless mode

Headless mode cannot prompt, so it auto-denies. Two observed denials:

- `command` — when the prompt invited shell use ("look at the image file").
- `read_file` (`display_name: "ListDir"`) — when nudged toward a native read.

```
jetski: no output produced — a tool required the "read_file" permission that
headless mode cannot prompt for, so it was auto-denied. Add an allow-rule under
permissions.allow in settings.json (e.g. read_file(<target>)).
```

Denials surface as `denied_actions` in the envelope **with `status: "SUCCESS"`
and an empty `response`** — so status alone is not a sufficient health check.

Config lives at `~/.gemini/antigravity-cli/settings.json`:

```json
{
  "trustedWorkspaces": ["…"],
  "permissions": { "allow": ["read_file(<image-dir>/**)"] }
}
```

**`--dangerously-skip-permissions` is prohibited in this feature.** It
auto-approves every tool, which would let an admin web request run arbitrary
shell commands on the host. A `read_file` rule scoped to the image directory is
the supported configuration.

**Tool choice is non-deterministic.** With the `read_file` rule in place, a
subsequent probe was denied on `command` / `RunCommand` instead: the agent chose
to shell out to orient itself, because the directory was untrusted and the image
path was relative. The allowlist therefore cannot simply enumerate whichever
tool the agent picked last time — the prompt must actively steer it, and
`command` must stay denied.

### 2.4.1 Verified working configuration

This exact combination produced vision with **no denied actions** (6.4s,
`num_turns: 1`):

1. `read_file(<image-dir>/**)` under `permissions.allow`.
2. The image directory passed as `--add-dir <image-dir>`.
3. An **absolute** image path in the prompt (a relative `./x.png` triggered
   directory exploration via `command`).
4. An explicit instruction: *"Use ONLY your file-reading tool. Do NOT run any
   shell command."*

All four matter; dropping 3 or 4 reintroduced the `command` denial.

### 2.5 Vision — verified

Confirmed 2026-09-11 using the §2.4.1 configuration. Given an image whose
subject was unrelated to the prompt domain (a "BRM Capability" mindmap), `agy`
correctly identified it as a Business Relationship Management mind map and
quoted three exact labels present in the diagram (`BRM Capability`,
`Capability Framework`, `Organizational Factors`). Since none of that vocabulary
appeared in the prompt, this is genuine image reading rather than inference from
the prompt.

### 2.6 Delimiter contract — verified

The §2.3 delimiter instruction was tested together with vision in a single
realistic prompt (Vietnamese seafood sales post, absolute image path, shell
prohibited). Result: `<<<POST>>> … <<<END>>>` present, **no preamble**, on-brand
Vietnamese copy with CTA and hashtags, 11.3s, `num_turns: 1`, no denied actions.

Residual gap: the test image was a mindmap, irrelevant to seafood, and the model
sensibly declined to mention it. So vision (§2.5) and delimiter compliance (§2.6)
are each verified, but *vision materially shaping the caption* has not been
demonstrated end-to-end. Worth one probe with a real product photo during
implementation; it does not change any interface here.

### 2.7 `.response` is JSON-escaped

The envelope escapes the delimiters (`\u003c\u003c\u003cPOST\u003e\u003e\u003e`).
The parser MUST `JSON.parse` the stdout envelope and extract from the decoded
`.response` string — never regex the raw stdout. Responses may also embed
markdown file links (`[mindmap.png](file:///…)`), which the parser strips.

---

## 3. Architecture

```
app/admin/social-posts/
  page.tsx              list of posts
  new/page.tsx          generate form (template, idea, image)
  [id]/page.tsx         review · edit · publish/schedule
  templates/page.tsx    template CRUD

app/api/admin/social-images/route.ts   image upload (two destinations)

src/features/social-posts/
  types.ts              pure TS types
  schema.ts             Zod input schemas
  queries.ts            reads (accept SupabaseClient)
  admin-actions.ts      "use server" mutations + permission checks
  prompt-builder.ts     template + idea + image -> prompt string
  response-parser.ts    agy JSON envelope -> caption | error
  generator/
    types.ts            ContentGenerator interface
    agy-generator.ts    execFile adapter
    stub-generator.ts   deterministic, used by tests
  facebook/
    types.ts            PostTarget interface
    graph-client.ts     Graph API photo post + scheduling
  *.test.ts             co-located Vitest tests
```

The prompt builder must emit an **absolute** image path plus the clause
*"Use ONLY your file-reading tool. Do NOT run any shell command."* — both are
load-bearing for §2.4.1 and are covered by tests.

`prompt-builder` and `response-parser` are deliberately separate pure modules:
they hold the two subtle behaviours from §2.2–2.3 and are the highest-value
unit-test targets, testable with zero subprocess or network involvement.

---

## 4. Data model

Migration: `supabase/migrations/202609110024_social_posts.sql` (append-only).

```sql
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

create unique index social_post_templates_default_key
  on social_post_templates (is_default) where is_default;

create table social_posts (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references social_post_templates(id) on delete set null,
  idea text not null,
  image_url text,                   -- Supabase public URL (Facebook + preview)
  image_storage_path text,          -- media bucket path
  image_local_path text,            -- path handed to agy; transient, may be
                                    -- pruned from disk after generation
  generated_caption text,           -- raw model output
  edited_caption text,              -- admin's edit; wins when present
  status text not null default 'draft'
    check (status in ('draft','generated','posted','scheduled','failed')),
  fb_post_id text,
  scheduled_publish_time timestamptz,
  conversation_id text,             -- agy conversation, for regeneration
  generation_ms integer,
  generation_tokens integer,
  error_message text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  posted_at timestamptz
);
```

**Status flow:** `draft → generated → posted | scheduled`, with `failed` as a
terminal branch that retains `error_message`. Generation runs synchronously, so
there is no `generating` state and **no runs table** — generation metadata
(`conversation_id`, `generation_ms`, `generation_tokens`) lives on the row.

`edited_caption` is kept alongside `generated_caption` rather than overwriting
it, so the admin's edits can be compared against raw model output — useful for
tuning templates later.

**Regeneration updates the same row in place** (overwriting
`generated_caption`, `conversation_id`, and the generation metrics) rather than
creating a new one. A post is one unit of work the admin iterates on; keeping
history would need a child table, which §1 does not call for. Any
`edited_caption` is cleared on regeneration, since it belonged to superseded
model output.

RLS: admin-only, matching the `shop_sync_settings` policy shape:

```sql
create policy "Admins manage social_posts" on social_posts
  for all
  using (exists (select 1 from user_admin_roles where user_id = auth.uid()))
  with check (exists (select 1 from user_admin_roles where user_id = auth.uid()));
```

Seed one default template so the page is usable on first load.

### Permissions

Add `social_posts:manage` to `src/features/admin/permissions.ts`, granted to
`marketing` (which already holds `cms:update` / `promotions:update`).
`super_admin` inherits it via `*`.

Enforced with `await requireAdminPermission(client, "social_posts:manage")` as
the **first statement** of every action and route handler, before any form
parsing (per AGENTS.md rule 1).

### Navigation

Add `{ href: "/admin/social-posts", label: "Bài đăng Facebook" }` to
`adminLinks` in `components/admin/admin-nav.tsx`, after the Flash Sale entry.

---

## 5. Image flow (two destinations)

`agy` needs a **local filesystem path** for `read_file`; Facebook needs a
**public URL**. One upload therefore fans out to both:

```
admin uploads image
   |
   +--> local dir (SOCIAL_POST_IMAGE_DIR)        --> agy reads (vision)
   |
   +--> Supabase `media` bucket, social/ prefix  --> FB photo + admin preview
```

The existing `app/api/admin/images/route.ts` hardcodes `productId` and inserts
into `product_images`, so it cannot be reused. A sibling route
`app/api/admin/social-images/route.ts` reuses its validation rules verbatim
(MIME allowlist `jpeg|png|webp|gif`, 5 MB cap, `crypto.randomUUID()` filename)
rather than contorting the product route.

`SOCIAL_POST_IMAGE_DIR` must sit inside the directory covered by the
`read_file` allow-rule, and must be writable by the Next.js process.

```ts
type ImageVisionMode = "vision" | "attach-only";
```

`attach-only` skips the local write and the image instruction in the prompt.
This is the fallback if §2.5 shows vision is unavailable.

---

## 6. Generation

### Interface

```ts
export type GenerateInput = {
  prompt: string;
  imagePath?: string;
  conversationId?: string;   // set -> continue an existing conversation
};

export type GenerateResult =
  | { ok: true; caption: string; conversationId: string;
      durationMs: number; tokens: number }
  | { ok: false; error: string; deniedActions?: string[] };

export interface ContentGenerator {
  generate(input: GenerateInput): Promise<GenerateResult>;
}
```

The interface exists so tests inject `stub-generator` and **never spawn `agy`**,
keeping the suite fast and offline.

### agy adapter rules

1. **`execFile` with an args array — never a shell string.** The idea text and
   prompt template are admin-supplied; interpolating them into a shell command
   is a command-injection hole. This is non-negotiable.
2. Flags: `-p <prompt> --output-format json --print-timeout 120s
   --add-dir <SOCIAL_POST_IMAGE_DIR>`; add `--conversation <id>` when continuing.
   `--add-dir` is required, not optional — see §2.4.1.
3. `cwd` = `SOCIAL_POST_IMAGE_DIR`. Pass `HOME` through in `env` — `agy` reads
   credentials from `~/.gemini/antigravity-cli/`.
4. Node-side timeout slightly above `--print-timeout`, so a hung subprocess is
   killed rather than holding the request open.

### Response parsing (`response-parser.ts`)

In order:

0. `JSON.parse` stdout; extract the decoded `.response` (see §2.7 — the
   delimiters arrive escaped, so raw-stdout regex fails).
1. Non-zero exit or unparseable stdout -> `{ ok: false }` with stderr excerpt.
2. `denied_actions` non-empty -> `{ ok: false }` listing them, mapped to a
   Vietnamese admin-facing message. **Checked before `status`**, because §2.4
   showed denials coexist with `status: "SUCCESS"`.
3. `status !== "SUCCESS"` -> `{ ok: false }`.
4. Extract `<<<POST>>> … <<<END>>>` from `.response`; fall back to the trimmed
   full response if absent. Strip markdown file links (`[x](file:///…)`).
5. Empty caption after extraction -> `{ ok: false }`, never an empty draft.

---

## 7. Facebook publishing

```
POST https://graph.facebook.com/v21.0/{page-id}/photos
  url=<supabase public image url>
  message=<edited_caption ?? generated_caption>
  access_token=<page token>
  # scheduled:
  published=false
  scheduled_publish_time=<unix seconds>
```

Env: `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_ACCESS_TOKEN` (long-lived Page token,
scope `pages_manage_posts`). Added to `.env.example`. The token is server-only
and must never reach a Client Component.

**Scheduling window.** Graph API requires `scheduled_publish_time` between
**10 minutes and 75 days** from now. Enforced in Zod so an invalid time fails on
the admin form rather than as an opaque upstream error.

On success store `fb_post_id`, set `posted_at`, and move status to `posted` or
`scheduled`. On failure set `status='failed'` with the Graph error message
preserved in `error_message`.

Behind a `PostTarget` interface with a `manual` adapter (copy caption / download
image) so posting can be exercised before Meta app review completes.

---

## 8. Server action rules

Per AGENTS.md:

1. `requireAdminPermission` **before** parsing `formData`.
2. Zod v4: `.issues[0]?.message`, not `.errors`.
3. `redirect()` outside `try/catch`; wrap only the Supabase/CLI call.
4. `z.string().uuid().safeParse(id)` before any DB call using an ID.
5. `revalidatePath()` before `redirect()`.

Actions: `generateSocialPost`, `regenerateSocialPost`, `updateSocialPostCaption`,
`publishSocialPost`, `scheduleSocialPost`, `deleteSocialPost`, plus
`upsertSocialPostTemplate` / `deleteSocialPostTemplate`.

---

## 9. Testing

Vitest, co-located, no subprocess and no network.

| Module | Cases |
|---|---|
| `prompt-builder` | template + idea composition; delimiter instruction present; image instruction included only in `vision` mode |
| `response-parser` | delimiters present; absent (fallback); `denied_actions` with `status: SUCCESS`; non-SUCCESS status; empty response; malformed JSON; non-zero exit |
| `schema` | idea required/length; UUID validation; schedule window boundaries (<10 min rejected, >75 days rejected, inside accepted) |
| `facebook/graph-client` | published payload; scheduled payload (`published=false` + unix ts); error mapping — `fetch` mocked |
| `admin-actions` | permission denial short-circuits before parsing; failed generation persists `status='failed'` + `error_message`; `edited_caption` wins over `generated_caption` when publishing |

The agy adapter's `execFile` wiring is covered by one test asserting the **args
array** shape (injection guard), not by executing the binary.

---

## 10. Risks

### Deployment (must be resolved before production)

`agy` lives at `~/.local/bin/agy` with credentials in `~/.gemini/`. The
production container built from `Dockerfile` / `docker-compose.prod.yml` has
**neither**. This feature will work locally and fail in production until the
binary, its config, and its auth are mounted into the container, and
`SOCIAL_POST_IMAGE_DIR` is a writable volume inside the `read_file` allow-rule.

### Synchronous generation and proxy timeouts

Accepted trade-off: far simpler than a background job. Probes ran 10–31s and a
vision call will sit at the upper end. If a reverse proxy in front of Next.js
has a 30–60s timeout, the admin may see a gateway error while generation
actually succeeded. Mitigation: `--print-timeout 120s` plus a matching
server-side guard. If this bites in practice, the upgrade path is the
`shop_sync_runs` background-job pattern already proven in this codebase.

### Vision depends on prompt steering

Resolved as workable (§2.5, §2.4.1), but the guarantee is softer than a flag:
vision works because the prompt steers the agent away from `command`. A future
`agy` release could change tool-selection behaviour and reintroduce the denial.
Mitigation: `denied_actions` is already treated as a first-class error (§6), so
this degrades to a legible failure rather than silent empty output, and
`attach-only` (§5) remains available with no schema change.

### Model output variability

Free-text generation can drift (wrong length, missing delimiters, English
instead of Vietnamese). Mitigated by the delimiter fallback, the mandatory human
review gate, and editable templates.

---

## 11. Implementation order

1. Migration + types + permission + nav entry.
2. `prompt-builder` + `response-parser` with tests (pure, highest-risk logic).
3. `ContentGenerator` interface + stub; agy adapter behind it.
4. Image upload route (two destinations).
5. Template CRUD page.
6. Generate form -> draft.
7. Review page: edit, regenerate, publish/schedule.
8. Facebook adapter: manual first, then Graph API.
