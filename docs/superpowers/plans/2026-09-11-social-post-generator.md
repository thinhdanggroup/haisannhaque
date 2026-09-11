# Facebook Post Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admins a page that turns an idea plus an image into a reviewable Vietnamese Facebook sales post, generated server-side by the `agy` CLI, then published or scheduled via the Graph API.

**Architecture:** A new `src/features/social-posts/` module following the repo's feature-module pattern. Generation is a synchronous server action that shells out to `agy` via `execFile` and parses its JSON envelope. Two pure modules (`prompt-builder`, `response-parser`) hold all the subtle CLI behaviour and carry the bulk of the tests. Generation and Facebook posting each sit behind a small interface so tests never spawn a subprocess or hit the network.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Supabase (Postgres + RLS + Storage), Zod v4, Vitest, Tailwind CSS, `agy` CLI 1.2.1, Facebook Graph API v21.0.

**Spec:** `docs/superpowers/specs/2026-09-11-social-post-generator-design.md`

## Global Constraints

- **Next.js 16:** route params are `Promise<{ id: string }>` and MUST be `await`ed.
- **Zod v4:** use `.issues[0]?.message` — `.errors` was removed.
- **Server actions:** call `requireAdminPermission` BEFORE parsing `formData`; `revalidatePath()` before `redirect()`; `redirect()` outside `try/catch`; validate IDs with `z.string().uuid().safeParse(id)` before any DB call.
- **Permission string:** `social_posts:manage` for every action, route handler, and page in this feature.
- **Migrations:** append-only, format `YYYYMMDDNNNN_description.sql`. This feature uses exactly one: `202609110024_social_posts.sql`.
- **All admin-facing copy is Vietnamese** (matches `components/admin/admin-nav.tsx` and every existing admin page).
- **`agy` invocation MUST use `execFile` with an args array — never a shell string.** Idea text and prompt templates are admin-supplied; interpolating them into a shell is a command-injection hole.
- **`--dangerously-skip-permissions` is forbidden.** It would let an admin web request run arbitrary shell commands on the host.
- **`agy` vision requires all four of:** a `read_file(<dir>/**)` allow-rule, `--add-dir <dir>`, an **absolute** image path in the prompt, and the literal instruction *"Use ONLY your file-reading tool. Do NOT run any shell command."* Dropping the last two reintroduced a `command`/`RunCommand` denial during spec probing.
- **`agy`'s `.response` is JSON-escaped.** Always `JSON.parse` the envelope; never regex raw stdout.
- **Graph API scheduling window:** `scheduled_publish_time` must be between 10 minutes and 75 days from now.
- **Test commands:** `pnpm test` (all), `pnpm vitest run <path>` (single file). `pnpm lint` before each commit.
- **Never import `createAdminClient` into a Client Component**; never expose `SUPABASE_SERVICE_ROLE_KEY` or `FACEBOOK_PAGE_ACCESS_TOKEN` to the browser.

## Deviations from the spec

One deliberate simplification, recorded so a reviewer does not treat it as an
oversight:

- **Spec §7's `PostTarget` interface and `manual` adapter are not built.** The
  spec proposed them so posting could be exercised before Meta app review
  finished, but the approved decision was "Graph API + scheduled option", and
  a second adapter with no current caller is speculative. Publishing is
  already isolated in `facebook/graph-client.ts` behind `publishPhoto`, so a
  manual or alternative adapter can be added later without touching the review
  flow — which is the property the interface was there to protect.

Everything else in the spec is implemented. Spec §9's admin-action cases are
covered where they are actually reachable: failed-generation persistence is
asserted in `generation.test.ts` (Task 8) via the `status: "failed"` row values,
and "the admin's edit wins when publishing" in `types.test.ts` (Task 1) via
`effectiveCaption`, which `publishSocialPost` calls.

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/202609110024_social_posts.sql` | Two tables, RLS policies, seed template |
| `src/features/social-posts/types.ts` | Pure domain types, zero Supabase/Next imports |
| `src/features/social-posts/prompt-builder.ts` | Template + idea + image path -> prompt string |
| `src/features/social-posts/response-parser.ts` | `agy` JSON envelope -> caption or typed error |
| `src/features/social-posts/generator/types.ts` | `ContentGenerator` interface, `GenerateInput/Result` |
| `src/features/social-posts/generator/stub-generator.ts` | Deterministic generator for tests |
| `src/features/social-posts/generator/agy-generator.ts` | `execFile` adapter |
| `src/features/social-posts/schema.ts` | Zod input schemas incl. schedule window |
| `src/features/social-posts/queries.ts` | Reads; row -> domain mapping |
| `src/features/social-posts/admin-actions.ts` | `"use server"` mutations + permission checks |
| `src/features/social-posts/facebook/graph-client.ts` | Graph payload builder + photo publish |
| `app/api/admin/social-images/route.ts` | Image upload to storage + local dir |
| `app/admin/social-posts/page.tsx` | Post list |
| `app/admin/social-posts/new/page.tsx` | Generate form |
| `app/admin/social-posts/[id]/page.tsx` | Review, edit, publish/schedule |
| `app/admin/social-posts/templates/page.tsx` | Template CRUD |
| `components/admin/social-post-generate-form.tsx` | Client form (upload + idea + template) |
| `components/admin/social-post-review-form.tsx` | Client form (edit caption, publish/schedule) |
| `components/admin/social-post-template-form.tsx` | Client form (template CRUD) |

`prompt-builder` and `response-parser` are separate pure modules because they hold the two counter-intuitive CLI behaviours from the spec and are testable with zero subprocess or network involvement.

---

### Task 1: Migration, types, permission, navigation

**Files:**
- Create: `supabase/migrations/202609110024_social_posts.sql`
- Create: `src/features/social-posts/types.ts`
- Modify: `src/features/admin/permissions.ts:12` (the `marketing` role array)
- Modify: `components/admin/admin-nav.tsx:10` (after the Flash Sale entry)

**Interfaces:**
- Consumes: nothing (first task)
- Produces: types `SocialPostStatus`, `ImageVisionMode`, `SocialPostTemplate`, `SocialPost`; permission string `social_posts:manage`; tables `social_post_templates`, `social_posts`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/202609110024_social_posts.sql`:

```sql
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
```

- [ ] **Step 2: Run the migration**

Run: `pnpm migrate`
Expected: the new migration applies without error. Verify with `pnpm migrate:list` that `202609110024_social_posts.sql` is listed as applied.

- [ ] **Step 3: Write the domain types**

Create `src/features/social-posts/types.ts` (pure types — no Supabase or Next imports, per the feature-module pattern):

```ts
export type SocialPostStatus = "draft" | "generated" | "posted" | "scheduled" | "failed";

// "vision" hands agy an absolute image path to read; "attach-only" generates
// from the idea text alone and attaches the image to Facebook untouched.
export type ImageVisionMode = "vision" | "attach-only";

export type SocialPostTemplate = {
  id: string;
  name: string;
  promptBody: string;
  isDefault: boolean;
  isActive: boolean;
  updatedAt: string;
};

export type SocialPost = {
  id: string;
  templateId: string | null;
  idea: string;
  imageUrl: string | null;
  imageStoragePath: string | null;
  imageLocalPath: string | null;
  generatedCaption: string | null;
  editedCaption: string | null;
  status: SocialPostStatus;
  fbPostId: string | null;
  scheduledPublishTime: string | null;
  conversationId: string | null;
  generationMs: number | null;
  generationTokens: number | null;
  errorMessage: string | null;
  createdAt: string;
  postedAt: string | null;
};

// The caption actually published: the admin's edit wins when present.
export function effectiveCaption(post: SocialPost): string {
  return post.editedCaption ?? post.generatedCaption ?? "";
}
```

- [ ] **Step 4: Write a failing test for `effectiveCaption`**

Create `src/features/social-posts/types.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { effectiveCaption } from "./types";
import type { SocialPost } from "./types";

function buildPost(overrides: Partial<SocialPost> = {}): SocialPost {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    templateId: null,
    idea: "Cá hồi tươi",
    imageUrl: null,
    imageStoragePath: null,
    imageLocalPath: null,
    generatedCaption: "Bản AI",
    editedCaption: null,
    status: "generated",
    fbPostId: null,
    scheduledPublishTime: null,
    conversationId: null,
    generationMs: null,
    generationTokens: null,
    errorMessage: null,
    createdAt: "2026-09-11T00:00:00.000Z",
    postedAt: null,
    ...overrides,
  };
}

describe("effectiveCaption", () => {
  it("uses the generated caption when there is no edit", () => {
    expect(effectiveCaption(buildPost())).toBe("Bản AI");
  });

  it("prefers the admin edit over the generated caption", () => {
    expect(effectiveCaption(buildPost({ editedCaption: "Bản sửa" }))).toBe("Bản sửa");
  });

  it("returns an empty string when nothing has been generated", () => {
    expect(effectiveCaption(buildPost({ generatedCaption: null }))).toBe("");
  });
});
```

- [ ] **Step 5: Run the test**

Run: `pnpm vitest run src/features/social-posts/types.test.ts`
Expected: PASS (3 tests). The implementation was written in Step 3, so this confirms rather than drives it — `effectiveCaption` is a two-line total function whose test is cheaper to write after.

- [ ] **Step 6: Add the permission**

In `src/features/admin/permissions.ts`, add `"social_posts:manage"` to the `marketing` array:

```ts
  marketing: ["cms:update", "promotions:update", "flash_sales:manage", "social_posts:manage"],
```

`super_admin` already has `"*"` and needs no change.

- [ ] **Step 7: Add the navigation entry**

In `components/admin/admin-nav.tsx`, insert after the Flash Sale entry:

```ts
  { href: "/admin/social-posts", label: "Bài đăng Facebook" },
```

- [ ] **Step 8: Verify the full suite and lint still pass**

Run: `pnpm test && pnpm lint`
Expected: PASS, no new failures.

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/202609110024_social_posts.sql \
        src/features/social-posts/types.ts \
        src/features/social-posts/types.test.ts \
        src/features/admin/permissions.ts \
        components/admin/admin-nav.tsx
git commit -m "feat(social-posts): add schema, domain types, permission, and nav entry"
```

---

### Task 2: Prompt builder

The prompt builder owns the four load-bearing requirements for `agy` vision (spec §2.4.1). Getting any of them wrong silently degrades to a permission denial, so each one gets a test.

**Files:**
- Create: `src/features/social-posts/prompt-builder.ts`
- Test: `src/features/social-posts/prompt-builder.test.ts`

**Interfaces:**
- Consumes: `ImageVisionMode` from `./types` (Task 1)
- Produces: `buildPrompt(input: BuildPromptInput): string`; constants `POST_START = "<<<POST>>>"`, `POST_END = "<<<END>>>"`, `NO_SHELL_CLAUSE`; type `BuildPromptInput = { promptBody: string; idea: string; visionMode: ImageVisionMode; imagePath?: string }`

- [ ] **Step 1: Write the failing tests**

Create `src/features/social-posts/prompt-builder.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildPrompt, NO_SHELL_CLAUSE, POST_END, POST_START } from "./prompt-builder";

const PROMPT_BODY = "Bạn là chuyên gia viết content Facebook.";
const IDEA = "Cá hồi Na Uy tươi về sáng nay, giảm 20%";
const ABS_PATH = "/var/lib/social-posts/abc.png";

describe("buildPrompt", () => {
  it("includes the template body and the idea", () => {
    const prompt = buildPrompt({ promptBody: PROMPT_BODY, idea: IDEA, visionMode: "attach-only" });
    expect(prompt).toContain(PROMPT_BODY);
    expect(prompt).toContain(IDEA);
  });

  it("always instructs the model to wrap output in the delimiters", () => {
    const prompt = buildPrompt({ promptBody: PROMPT_BODY, idea: IDEA, visionMode: "attach-only" });
    expect(prompt).toContain(POST_START);
    expect(prompt).toContain(POST_END);
  });

  it("includes the absolute image path and the no-shell clause in vision mode", () => {
    const prompt = buildPrompt({
      promptBody: PROMPT_BODY,
      idea: IDEA,
      visionMode: "vision",
      imagePath: ABS_PATH,
    });
    expect(prompt).toContain(ABS_PATH);
    expect(prompt).toContain(NO_SHELL_CLAUSE);
  });

  it("omits the image path and no-shell clause in attach-only mode", () => {
    const prompt = buildPrompt({
      promptBody: PROMPT_BODY,
      idea: IDEA,
      visionMode: "attach-only",
      imagePath: ABS_PATH,
    });
    expect(prompt).not.toContain(ABS_PATH);
    expect(prompt).not.toContain(NO_SHELL_CLAUSE);
  });

  it("rejects a relative image path in vision mode", () => {
    expect(() =>
      buildPrompt({
        promptBody: PROMPT_BODY,
        idea: IDEA,
        visionMode: "vision",
        imagePath: "./abc.png",
      }),
    ).toThrow(/absolute/i);
  });

  it("rejects vision mode with no image path", () => {
    expect(() =>
      buildPrompt({ promptBody: PROMPT_BODY, idea: IDEA, visionMode: "vision" }),
    ).toThrow(/imagePath/i);
  });

  it("trims surrounding whitespace from the body and idea", () => {
    const prompt = buildPrompt({
      promptBody: `  ${PROMPT_BODY}  `,
      idea: `  ${IDEA}  `,
      visionMode: "attach-only",
    });
    expect(prompt).not.toContain(`  ${PROMPT_BODY}`);
    expect(prompt).toContain(`"${IDEA}"`);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/features/social-posts/prompt-builder.test.ts`
Expected: FAIL — "Failed to resolve import ./prompt-builder" (the module does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/features/social-posts/prompt-builder.ts`:

```ts
import type { ImageVisionMode } from "./types";

export const POST_START = "<<<POST>>>";
export const POST_END = "<<<END>>>";

// Verified during spec probing (§2.4.1): without this exact steering, agy
// reached for its shell tool (command/RunCommand), which stays denied on the
// server. A relative path made it explore the directory for the same reason,
// which is why an absolute path is enforced below.
export const NO_SHELL_CLAUSE =
  "Use ONLY your file-reading tool to read that image. Do NOT run any shell command.";

export type BuildPromptInput = {
  promptBody: string;
  idea: string;
  visionMode: ImageVisionMode;
  imagePath?: string;
};

export function buildPrompt(input: BuildPromptInput): string {
  const { promptBody, idea, visionMode, imagePath } = input;

  if (visionMode === "vision") {
    if (!imagePath) {
      throw new Error("imagePath is required when visionMode is 'vision'");
    }
    if (!imagePath.startsWith("/")) {
      throw new Error("imagePath must be an absolute path");
    }
  }

  const parts = [promptBody.trim()];

  if (visionMode === "vision" && imagePath) {
    parts.push(`Ảnh sản phẩm: ${imagePath}`);
    parts.push(NO_SHELL_CLAUSE);
  }

  parts.push(`Ý tưởng: "${idea.trim()}"`);
  parts.push(
    `Chỉ xuất ra bài đăng, bọc trong đúng định dạng: ${POST_START} nội dung ${POST_END}. ` +
      "Không thêm lời mở đầu, không giải thích.",
  );

  return parts.join("\n\n");
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/features/social-posts/prompt-builder.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/social-posts/prompt-builder.ts src/features/social-posts/prompt-builder.test.ts
git commit -m "feat(social-posts): add prompt builder with agy vision steering"
```

---

### Task 3: Response parser

**Files:**
- Create: `src/features/social-posts/generator/types.ts`
- Create: `src/features/social-posts/response-parser.ts`
- Test: `src/features/social-posts/response-parser.test.ts`

**Interfaces:**
- Consumes: `POST_START`, `POST_END` from `../prompt-builder` (Task 2)
- Produces: `GenerateInput`, `GenerateResult`, `ContentGenerator` (in `generator/types.ts`); `parseAgyResponse(input: ParseAgyInput): GenerateResult`; `extractPost(response: string): string`; `stripMarkdownFileLinks(text: string): string`; type `ParseAgyInput = { exitCode: number; stdout: string; stderr: string }`

- [ ] **Step 1: Write the generator interface**

Create `src/features/social-posts/generator/types.ts`. This is defined here rather than in Task 4 because `parseAgyResponse` returns a `GenerateResult`:

```ts
export type GenerateInput = {
  prompt: string;
  // Absolute path, only set in vision mode. agy cannot read a URL.
  imagePath?: string;
  // Set to continue an existing agy conversation (used by regeneration).
  conversationId?: string;
};

export type GenerateResult =
  | {
      ok: true;
      caption: string;
      conversationId: string;
      durationMs: number;
      tokens: number;
    }
  | {
      ok: false;
      error: string;
      deniedActions?: string[];
    };

export interface ContentGenerator {
  generate(input: GenerateInput): Promise<GenerateResult>;
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/features/social-posts/response-parser.test.ts`. The envelope shapes below are copied from real `agy` 1.2.1 output recorded in spec §2:

```ts
import { describe, expect, it } from "vitest";
import { extractPost, parseAgyResponse, stripMarkdownFileLinks } from "./response-parser";

function envelope(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    conversation_id: "76e612f3-1a70-4d20-8d86-cc9a12755638",
    status: "SUCCESS",
    response: "<<<POST>>>\nCá hồi tươi về sáng nay!\n<<<END>>>\n",
    duration_seconds: 11.329279588,
    num_turns: 1,
    usage: { input_tokens: 11925, output_tokens: 1871, total_tokens: 13796 },
    ...overrides,
  });
}

function parse(stdout: string, exitCode = 0, stderr = "") {
  return parseAgyResponse({ exitCode, stdout, stderr });
}

describe("stripMarkdownFileLinks", () => {
  it("replaces a markdown file link with its label", () => {
    const input = "The image [mindmap.png](file:///home/u/mindmap.png) shows a chart.";
    expect(stripMarkdownFileLinks(input)).toBe("The image mindmap.png shows a chart.");
  });

  it("leaves ordinary text untouched", () => {
    expect(stripMarkdownFileLinks("no links here")).toBe("no links here");
  });
});

describe("extractPost", () => {
  it("extracts the content between the delimiters", () => {
    expect(extractPost("<<<POST>>>\nXin chào\n<<<END>>>")).toBe("Xin chào");
  });

  it("falls back to the whole trimmed response when delimiters are absent", () => {
    expect(extractPost("  Xin chào  ")).toBe("Xin chào");
  });

  it("ignores a stray END that appears before START", () => {
    expect(extractPost("<<<END>>> junk <<<POST>>>\nXin chào\n")).toBe("Xin chào");
  });
});

describe("parseAgyResponse", () => {
  it("returns the caption, conversation id, duration and tokens on success", () => {
    const result = parse(envelope());
    expect(result).toEqual({
      ok: true,
      caption: "Cá hồi tươi về sáng nay!",
      conversationId: "76e612f3-1a70-4d20-8d86-cc9a12755638",
      durationMs: 11329,
      tokens: 13796,
    });
  });

  it("decodes JSON-escaped delimiters", () => {
    // agy escapes < and > in .response; a raw-stdout regex would miss these.
    const raw =
      '{"conversation_id":"c1","status":"SUCCESS","response":"\\u003c\\u003c\\u003cPOST\\u003e\\u003e\\u003e\\nXin chào\\n\\u003c\\u003c\\u003cEND\\u003e\\u003e\\u003e","duration_seconds":1,"usage":{"total_tokens":5}}';
    const result = parse(raw);
    expect(result.ok && result.caption).toBe("Xin chào");
  });

  it("reports denied actions even when status is SUCCESS", () => {
    // Observed in spec §2.4: denials arrive with status SUCCESS and an
    // empty response, so denied_actions must be checked before status.
    const result = parse(
      envelope({
        response: "",
        denied_actions: [{ action: "read_file", display_name: "ListDir" }],
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.deniedActions).toEqual(["read_file"]);
    expect(result.ok === false && result.error).toContain("read_file");
  });

  it("fails on a non-SUCCESS status", () => {
    const result = parse(envelope({ status: "ERROR" }));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain("ERROR");
  });

  it("fails when the extracted caption is empty", () => {
    const result = parse(envelope({ response: "<<<POST>>>   <<<END>>>" }));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/nội dung/i);
  });

  it("fails on a non-zero exit code and includes the stderr excerpt", () => {
    const result = parse("", 1, "agy: something broke");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain("something broke");
  });

  it("fails on unparseable stdout", () => {
    const result = parse("not json at all");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/không đọc được/i);
  });

  it("defaults tokens to 0 when usage is absent", () => {
    const result = parse(envelope({ usage: undefined }));
    expect(result.ok && result.tokens).toBe(0);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm vitest run src/features/social-posts/response-parser.test.ts`
Expected: FAIL — "Failed to resolve import ./response-parser".

- [ ] **Step 4: Write the implementation**

Create `src/features/social-posts/response-parser.ts`:

```ts
import type { GenerateResult } from "./generator/types";
import { POST_END, POST_START } from "./prompt-builder";

type AgyEnvelope = {
  conversation_id?: string;
  status?: string;
  response?: string;
  duration_seconds?: number;
  usage?: { total_tokens?: number };
  denied_actions?: Array<{ action?: string; display_name?: string }>;
};

export type ParseAgyInput = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

const MARKDOWN_FILE_LINK = /\[([^\]]+)\]\(file:\/\/[^)]*\)/g;
const STDERR_EXCERPT_LIMIT = 300;

export function stripMarkdownFileLinks(text: string): string {
  return text.replace(MARKDOWN_FILE_LINK, "$1");
}

export function extractPost(response: string): string {
  const start = response.indexOf(POST_START);
  const end = response.indexOf(POST_END, start === -1 ? 0 : start);

  const body =
    start !== -1 && end !== -1 && end > start
      ? response.slice(start + POST_START.length, end)
      : response;

  return stripMarkdownFileLinks(body).trim();
}

function excerpt(text: string): string {
  return text.trim().slice(0, STDERR_EXCERPT_LIMIT);
}

export function parseAgyResponse(input: ParseAgyInput): GenerateResult {
  const { exitCode, stdout, stderr } = input;

  if (exitCode !== 0) {
    return { ok: false, error: `agy thất bại (exit ${exitCode}): ${excerpt(stderr)}` };
  }

  let envelope: AgyEnvelope;
  try {
    envelope = JSON.parse(stdout) as AgyEnvelope;
  } catch {
    return {
      ok: false,
      error: `Không đọc được kết quả từ agy: ${excerpt(stdout || stderr)}`,
    };
  }

  // Checked before status: agy reports denials with status SUCCESS and an
  // empty response, so status alone is not a sufficient health check.
  const denied = (envelope.denied_actions ?? [])
    .map((entry) => entry.action)
    .filter((action): action is string => Boolean(action));

  if (denied.length > 0) {
    return {
      ok: false,
      error:
        `agy bị từ chối quyền: ${denied.join(", ")}. ` +
        "Kiểm tra permissions.allow trong cấu hình agy.",
      deniedActions: denied,
    };
  }

  if (envelope.status !== "SUCCESS") {
    return { ok: false, error: `agy trả về trạng thái ${envelope.status ?? "không rõ"}.` };
  }

  const caption = extractPost(envelope.response ?? "");
  if (caption.length === 0) {
    return { ok: false, error: "agy không trả về nội dung bài đăng." };
  }

  return {
    ok: true,
    caption,
    conversationId: envelope.conversation_id ?? "",
    durationMs: Math.round((envelope.duration_seconds ?? 0) * 1000),
    tokens: envelope.usage?.total_tokens ?? 0,
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run src/features/social-posts/response-parser.test.ts`
Expected: PASS (14 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/social-posts/generator/types.ts \
        src/features/social-posts/response-parser.ts \
        src/features/social-posts/response-parser.test.ts
git commit -m "feat(social-posts): add agy response parser and generator interface"
```

---

### Task 4: agy generator adapter and test stub

**Files:**
- Create: `src/features/social-posts/generator/agy-generator.ts`
- Create: `src/features/social-posts/generator/stub-generator.ts`
- Test: `src/features/social-posts/generator/agy-generator.test.ts`

**Interfaces:**
- Consumes: `ContentGenerator`, `GenerateInput`, `GenerateResult` from `./types` (Task 3); `parseAgyResponse` from `../response-parser` (Task 3)
- Produces: `buildAgyArgs(input: GenerateInput, config: AgyGeneratorConfig): string[]`; `createAgyGenerator(config: AgyGeneratorConfig): ContentGenerator`; `createStubGenerator(result: GenerateResult): ContentGenerator`; type `AgyGeneratorConfig = { binPath: string; imageDir: string; printTimeoutSeconds?: number }`

The tests cover `buildAgyArgs` only. The subprocess call itself is deliberately untested — spawning a real `agy` would make the suite slow, network-dependent, and dependent on the developer's `~/.gemini` credentials. `buildAgyArgs` is where the injection guard lives, so that is what gets asserted.

- [ ] **Step 1: Write the failing tests**

Create `src/features/social-posts/generator/agy-generator.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildAgyArgs } from "./agy-generator";

const CONFIG = { binPath: "/home/u/.local/bin/agy", imageDir: "/var/lib/social-posts" };

describe("buildAgyArgs", () => {
  it("builds the verified flag set", () => {
    const args = buildAgyArgs({ prompt: "xin chào" }, CONFIG);
    expect(args).toEqual([
      "-p",
      "xin chào",
      "--output-format",
      "json",
      "--print-timeout",
      "120s",
      "--add-dir",
      "/var/lib/social-posts",
    ]);
  });

  it("always passes --add-dir, which vision depends on", () => {
    const args = buildAgyArgs({ prompt: "x" }, CONFIG);
    expect(args).toContain("--add-dir");
    expect(args[args.indexOf("--add-dir") + 1]).toBe("/var/lib/social-posts");
  });

  it("appends --conversation when continuing a conversation", () => {
    const args = buildAgyArgs({ prompt: "ngắn hơn", conversationId: "abc-123" }, CONFIG);
    expect(args.slice(-2)).toEqual(["--conversation", "abc-123"]);
  });

  it("honours a custom print timeout", () => {
    const args = buildAgyArgs({ prompt: "x" }, { ...CONFIG, printTimeoutSeconds: 60 });
    expect(args[args.indexOf("--print-timeout") + 1]).toBe("60s");
  });

  it("keeps a prompt containing shell metacharacters as one single argument", () => {
    // Injection guard: the prompt embeds admin-supplied text. Because the
    // adapter uses execFile with an args array (never a shell string), this
    // must stay exactly one element and must not be escaped or split.
    const nasty = 'x"; rm -rf / #$(whoami)`id`';
    const args = buildAgyArgs({ prompt: nasty }, CONFIG);
    expect(args.filter((a) => a === nasty)).toHaveLength(1);
    expect(args[args.indexOf("-p") + 1]).toBe(nasty);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/features/social-posts/generator/agy-generator.test.ts`
Expected: FAIL — "Failed to resolve import ./agy-generator".

- [ ] **Step 3: Write the adapter**

Create `src/features/social-posts/generator/agy-generator.ts`:

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseAgyResponse } from "../response-parser";
import type { ContentGenerator, GenerateInput, GenerateResult } from "./types";

const execFileAsync = promisify(execFile);

const DEFAULT_PRINT_TIMEOUT_SECONDS = 120;
// Give the subprocess a little longer than agy's own --print-timeout so a
// hung process is killed rather than holding the request open forever.
const KILL_BUFFER_SECONDS = 15;
const MAX_BUFFER_BYTES = 10 * 1024 * 1024;

export type AgyGeneratorConfig = {
  binPath: string;
  imageDir: string;
  printTimeoutSeconds?: number;
};

export function buildAgyArgs(input: GenerateInput, config: AgyGeneratorConfig): string[] {
  const timeout = config.printTimeoutSeconds ?? DEFAULT_PRINT_TIMEOUT_SECONDS;

  const args = [
    "-p",
    input.prompt,
    "--output-format",
    "json",
    "--print-timeout",
    `${timeout}s`,
    // Required, not optional: without it agy shells out to orient itself and
    // hits the denied `command` permission (spec §2.4.1).
    "--add-dir",
    config.imageDir,
  ];

  if (input.conversationId) {
    args.push("--conversation", input.conversationId);
  }

  return args;
}

export function createAgyGenerator(config: AgyGeneratorConfig): ContentGenerator {
  return {
    async generate(input: GenerateInput): Promise<GenerateResult> {
      const args = buildAgyArgs(input, config);
      const timeout = config.printTimeoutSeconds ?? DEFAULT_PRINT_TIMEOUT_SECONDS;

      try {
        // execFile, never exec: args are passed as an array so admin-supplied
        // prompt text is never interpreted by a shell.
        const { stdout, stderr } = await execFileAsync(config.binPath, args, {
          cwd: config.imageDir,
          // agy reads its credentials from $HOME/.gemini/antigravity-cli.
          env: process.env,
          timeout: (timeout + KILL_BUFFER_SECONDS) * 1000,
          maxBuffer: MAX_BUFFER_BYTES,
        });
        return parseAgyResponse({ exitCode: 0, stdout, stderr });
      } catch (error) {
        const failure = error as {
          code?: number | string;
          stdout?: string;
          stderr?: string;
          message?: string;
        };
        return parseAgyResponse({
          exitCode: typeof failure.code === "number" ? failure.code : 1,
          stdout: failure.stdout ?? "",
          stderr: failure.stderr ?? failure.message ?? "",
        });
      }
    },
  };
}
```

- [ ] **Step 4: Write the stub generator**

Create `src/features/social-posts/generator/stub-generator.ts`. Later tasks inject this so no test ever spawns `agy`:

```ts
import type { ContentGenerator, GenerateInput, GenerateResult } from "./types";

export function createStubGenerator(
  result: GenerateResult,
): ContentGenerator & { calls: GenerateInput[] } {
  const calls: GenerateInput[] = [];

  return {
    calls,
    async generate(input: GenerateInput): Promise<GenerateResult> {
      calls.push(input);
      return result;
    },
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run src/features/social-posts/generator/agy-generator.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/social-posts/generator/agy-generator.ts \
        src/features/social-posts/generator/stub-generator.ts \
        src/features/social-posts/generator/agy-generator.test.ts
git commit -m "feat(social-posts): add agy execFile adapter and stub generator"
```

---

### Task 5: Zod schemas and the schedule window

**Files:**
- Create: `src/features/social-posts/schema.ts`
- Test: `src/features/social-posts/schema.test.ts`

**Interfaces:**
- Consumes: `ImageVisionMode` from `./types` (Task 1)
- Produces: `parseGenerateSocialPostForm(formData: FormData): ParseResult<GenerateSocialPostData>`; `parseSocialPostTemplateForm(formData: FormData): ParseResult<SocialPostTemplateData>`; `parseCaptionForm(formData: FormData): ParseResult<{ caption: string }>`; `parseScheduledPublishTime(raw: string, now: Date): ParseResult<Date>`; `isUuid(value: string): boolean`; constants `SCHEDULE_MIN_MINUTES = 10`, `SCHEDULE_MAX_DAYS = 75`; types `ParseResult<T>`, `GenerateSocialPostData`, `SocialPostTemplateData`

- [ ] **Step 1: Write the failing tests**

Create `src/features/social-posts/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  SCHEDULE_MAX_DAYS,
  SCHEDULE_MIN_MINUTES,
  isUuid,
  parseCaptionForm,
  parseGenerateSocialPostForm,
  parseScheduledPublishTime,
  parseSocialPostTemplateForm,
} from "./schema";

const TEMPLATE_ID = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-09-11T10:00:00.000Z");
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

function generateForm(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("templateId", overrides.templateId ?? TEMPLATE_ID);
  fd.set("idea", overrides.idea ?? "Cá hồi Na Uy tươi về sáng nay, giảm 20%");
  fd.set("visionMode", overrides.visionMode ?? "vision");
  fd.set("imageUrl", overrides.imageUrl ?? "https://example.supabase.co/storage/v1/a.png");
  fd.set("imageStoragePath", overrides.imageStoragePath ?? "social/a.png");
  fd.set("imageLocalPath", overrides.imageLocalPath ?? "/var/lib/social-posts/a.png");
  return fd;
}

describe("isUuid", () => {
  it("accepts a valid UUID", () => {
    expect(isUuid(TEMPLATE_ID)).toBe(true);
  });

  it("rejects a non-UUID", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
  });
});

describe("parseGenerateSocialPostForm", () => {
  it("parses a valid vision-mode form", () => {
    const result = parseGenerateSocialPostForm(generateForm());
    expect(result.success).toBe(true);
    expect(result.success && result.data.visionMode).toBe("vision");
    expect(result.success && result.data.imageLocalPath).toBe("/var/lib/social-posts/a.png");
  });

  it("trims the idea", () => {
    const result = parseGenerateSocialPostForm(generateForm({ idea: "   Cá hồi tươi ngon   " }));
    expect(result.success && result.data.idea).toBe("Cá hồi tươi ngon");
  });

  it("rejects a non-UUID templateId", () => {
    const result = parseGenerateSocialPostForm(generateForm({ templateId: "abc" }));
    expect(result.success).toBe(false);
  });

  it("rejects an idea shorter than 10 characters", () => {
    const result = parseGenerateSocialPostForm(generateForm({ idea: "ngắn" }));
    expect(result).toEqual({ success: false, error: expect.stringContaining("10") });
  });

  it("rejects vision mode without a local image path", () => {
    const result = parseGenerateSocialPostForm(generateForm({ imageLocalPath: "" }));
    expect(result).toEqual({ success: false, error: expect.stringContaining("ảnh") });
  });

  it("allows attach-only mode with no image at all", () => {
    const fd = generateForm({ visionMode: "attach-only" });
    fd.delete("imageLocalPath");
    fd.delete("imageUrl");
    fd.delete("imageStoragePath");
    const result = parseGenerateSocialPostForm(fd);
    expect(result.success).toBe(true);
    expect(result.success && result.data.imageLocalPath).toBeUndefined();
  });

  it("rejects an unknown vision mode", () => {
    const result = parseGenerateSocialPostForm(generateForm({ visionMode: "magic" }));
    expect(result.success).toBe(false);
  });
});

describe("parseScheduledPublishTime", () => {
  it("accepts a time inside the window", () => {
    const target = new Date(NOW.getTime() + DAY);
    const result = parseScheduledPublishTime(target.toISOString(), NOW);
    expect(result.success && result.data.toISOString()).toBe(target.toISOString());
  });

  it("rejects a time sooner than the minimum", () => {
    const target = new Date(NOW.getTime() + (SCHEDULE_MIN_MINUTES - 1) * MINUTE);
    const result = parseScheduledPublishTime(target.toISOString(), NOW);
    expect(result).toEqual({ success: false, error: expect.stringContaining("10 phút") });
  });

  it("accepts a time exactly at the minimum boundary", () => {
    const target = new Date(NOW.getTime() + SCHEDULE_MIN_MINUTES * MINUTE);
    expect(parseScheduledPublishTime(target.toISOString(), NOW).success).toBe(true);
  });

  it("rejects a time beyond the maximum", () => {
    const target = new Date(NOW.getTime() + (SCHEDULE_MAX_DAYS + 1) * DAY);
    const result = parseScheduledPublishTime(target.toISOString(), NOW);
    expect(result).toEqual({ success: false, error: expect.stringContaining("75 ngày") });
  });

  it("accepts a time exactly at the maximum boundary", () => {
    const target = new Date(NOW.getTime() + SCHEDULE_MAX_DAYS * DAY);
    expect(parseScheduledPublishTime(target.toISOString(), NOW).success).toBe(true);
  });

  it("rejects an unparseable time", () => {
    const result = parseScheduledPublishTime("not a date", NOW);
    expect(result.success).toBe(false);
  });

  it("rejects an empty time", () => {
    expect(parseScheduledPublishTime("", NOW).success).toBe(false);
  });
});

describe("parseSocialPostTemplateForm", () => {
  it("parses a valid template form", () => {
    const fd = new FormData();
    fd.set("name", "Flash sale");
    fd.set("promptBody", "Viết bài đăng flash sale bằng tiếng Việt cho shop hải sản.");
    fd.set("isDefault", "on");
    const result = parseSocialPostTemplateForm(fd);
    expect(result).toEqual({
      success: true,
      data: {
        name: "Flash sale",
        promptBody: "Viết bài đăng flash sale bằng tiếng Việt cho shop hải sản.",
        isDefault: true,
        isActive: false,
      },
    });
  });

  it("treats missing checkboxes as false", () => {
    const fd = new FormData();
    fd.set("name", "Tên mẫu");
    fd.set("promptBody", "Nội dung prompt đủ dài để hợp lệ.");
    const result = parseSocialPostTemplateForm(fd);
    expect(result.success && result.data.isDefault).toBe(false);
  });

  it("rejects an empty name", () => {
    const fd = new FormData();
    fd.set("name", "");
    fd.set("promptBody", "Nội dung prompt đủ dài để hợp lệ.");
    expect(parseSocialPostTemplateForm(fd).success).toBe(false);
  });

  it("rejects a prompt body shorter than 20 characters", () => {
    const fd = new FormData();
    fd.set("name", "Tên mẫu");
    fd.set("promptBody", "quá ngắn");
    expect(parseSocialPostTemplateForm(fd).success).toBe(false);
  });
});

describe("parseCaptionForm", () => {
  it("parses and trims a caption", () => {
    const fd = new FormData();
    fd.set("caption", "  Nội dung bài đăng  ");
    expect(parseCaptionForm(fd)).toEqual({ success: true, data: { caption: "Nội dung bài đăng" } });
  });

  it("rejects an empty caption", () => {
    const fd = new FormData();
    fd.set("caption", "   ");
    expect(parseCaptionForm(fd).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/features/social-posts/schema.test.ts`
Expected: FAIL — "Failed to resolve import ./schema".

- [ ] **Step 3: Write the implementation**

Create `src/features/social-posts/schema.ts`. Note `.issues[0]?.message` — Zod v4 removed `.errors`:

```ts
import { z } from "zod";
import type { ImageVisionMode } from "./types";

// Facebook rejects scheduled_publish_time outside this window, so it is
// enforced at the form boundary rather than surfacing as a Graph API error.
export const SCHEDULE_MIN_MINUTES = 10;
export const SCHEDULE_MAX_DAYS = 75;

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export type ParseResult<T> = { success: true; data: T } | { success: false; error: string };

const uuidSchema = z.string().uuid();

export function isUuid(value: string): boolean {
  return uuidSchema.safeParse(value).success;
}

const optionalText = z
  .string()
  .trim()
  .min(1)
  .optional()
  .transform((value) => (value === "" ? undefined : value));

export const generateSocialPostSchema = z
  .object({
    templateId: z.string().uuid("Mẫu prompt không hợp lệ"),
    idea: z
      .string()
      .trim()
      .min(10, "Ý tưởng cần ít nhất 10 ký tự")
      .max(2000, "Ý tưởng không được vượt quá 2000 ký tự"),
    visionMode: z.enum(["vision", "attach-only"]),
    imageUrl: optionalText,
    imageStoragePath: optionalText,
    imageLocalPath: optionalText,
  })
  .refine(
    (value) => value.visionMode !== "vision" || Boolean(value.imageLocalPath?.startsWith("/")),
    { message: "Cần tải ảnh lên trước khi dùng chế độ đọc ảnh", path: ["imageLocalPath"] },
  );

export type GenerateSocialPostData = {
  templateId: string;
  idea: string;
  visionMode: ImageVisionMode;
  imageUrl?: string;
  imageStoragePath?: string;
  imageLocalPath?: string;
};

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dữ liệu không hợp lệ";
}

function readOptional(formData: FormData, key: string): string | undefined {
  const raw = formData.get(key);
  if (raw === null) return undefined;
  const text = String(raw).trim();
  return text === "" ? undefined : text;
}

export function parseGenerateSocialPostForm(formData: FormData): ParseResult<GenerateSocialPostData> {
  const parsed = generateSocialPostSchema.safeParse({
    templateId: String(formData.get("templateId") ?? ""),
    idea: String(formData.get("idea") ?? ""),
    visionMode: String(formData.get("visionMode") ?? "attach-only"),
    imageUrl: readOptional(formData, "imageUrl"),
    imageStoragePath: readOptional(formData, "imageStoragePath"),
    imageLocalPath: readOptional(formData, "imageLocalPath"),
  });

  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error) };
  }

  return { success: true, data: parsed.data as GenerateSocialPostData };
}

export function parseScheduledPublishTime(raw: string, now: Date): ParseResult<Date> {
  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return { success: false, error: "Thời gian đăng không hợp lệ" };
  }

  const delta = parsed.getTime() - now.getTime();

  if (delta < SCHEDULE_MIN_MINUTES * MINUTE_MS) {
    return {
      success: false,
      error: `Thời gian đăng phải cách hiện tại ít nhất ${SCHEDULE_MIN_MINUTES} phút`,
    };
  }

  if (delta > SCHEDULE_MAX_DAYS * DAY_MS) {
    return {
      success: false,
      error: `Thời gian đăng không được quá ${SCHEDULE_MAX_DAYS} ngày kể từ hiện tại`,
    };
  }

  return { success: true, data: parsed };
}

export const socialPostTemplateSchema = z.object({
  name: z.string().trim().min(1, "Tên mẫu là bắt buộc").max(120, "Tên mẫu quá dài"),
  promptBody: z
    .string()
    .trim()
    .min(20, "Nội dung prompt cần ít nhất 20 ký tự")
    .max(5000, "Nội dung prompt không được vượt quá 5000 ký tự"),
  isDefault: z.boolean(),
  isActive: z.boolean(),
});

export type SocialPostTemplateData = z.infer<typeof socialPostTemplateSchema>;

export function parseSocialPostTemplateForm(formData: FormData): ParseResult<SocialPostTemplateData> {
  const parsed = socialPostTemplateSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    promptBody: String(formData.get("promptBody") ?? ""),
    isDefault: formData.get("isDefault") === "on",
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error) };
  }

  return { success: true, data: parsed.data };
}

export const captionSchema = z.object({
  caption: z.string().trim().min(1, "Nội dung bài đăng không được để trống"),
});

export function parseCaptionForm(formData: FormData): ParseResult<{ caption: string }> {
  const parsed = captionSchema.safeParse({ caption: String(formData.get("caption") ?? "") });

  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error) };
  }

  return { success: true, data: parsed.data };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/features/social-posts/schema.test.ts`
Expected: PASS (22 tests).

Note on the `isActive: false` expectation in the template test: an unchecked checkbox is absent from `FormData`, so `isActive` parses as `false`. Task 9's form renders `isActive` checked by default, so newly created templates are active.

- [ ] **Step 5: Commit**

```bash
git add src/features/social-posts/schema.ts src/features/social-posts/schema.test.ts
git commit -m "feat(social-posts): add Zod schemas with Graph API schedule window"
```

---

### Task 6: Queries

**Files:**
- Create: `src/features/social-posts/queries.ts`
- Test: `src/features/social-posts/queries.test.ts`

**Interfaces:**
- Consumes: `SocialPost`, `SocialPostTemplate` from `./types` (Task 1)
- Produces: `listSocialPosts(client, limit?)`, `getSocialPost(client, id)`, `listSocialPostTemplates(client)`, `getSocialPostTemplate(client, id)`, `getDefaultSocialPostTemplate(client)`

Follows the row-type + `map*` shape used by `src/features/shop-sync/queries.ts`.

- [ ] **Step 1: Write the failing tests**

Create `src/features/social-posts/queries.test.ts`. The fake client mirrors only the chain each query actually uses:

```ts
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getDefaultSocialPostTemplate,
  getSocialPost,
  listSocialPostTemplates,
  listSocialPosts,
} from "./queries";

const POST_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  template_id: "22222222-2222-4222-8222-222222222222",
  idea: "Cá hồi tươi",
  image_url: "https://example.com/a.png",
  image_storage_path: "social/a.png",
  image_local_path: "/var/lib/social-posts/a.png",
  generated_caption: "Bản AI",
  edited_caption: null,
  status: "generated",
  fb_post_id: null,
  scheduled_publish_time: null,
  conversation_id: "conv-1",
  generation_ms: 11329,
  generation_tokens: 13796,
  error_message: null,
  created_at: "2026-09-11T00:00:00.000Z",
  posted_at: null,
};

const TEMPLATE_ROW = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Bài đăng bán hàng",
  prompt_body: "Bạn là chuyên gia viết content.",
  is_default: true,
  is_active: true,
  updated_at: "2026-09-11T00:00:00.000Z",
};

function fakeClient(result: { data: unknown; error: unknown }) {
  const calls: string[] = [];
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  const client = {
    from: (table: string) => {
      calls.push(table);
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

describe("listSocialPosts", () => {
  it("maps snake_case rows to domain objects", async () => {
    const { client } = fakeClient({ data: [POST_ROW], error: null });
    const posts = await listSocialPosts(client);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      id: POST_ROW.id,
      templateId: POST_ROW.template_id,
      generatedCaption: "Bản AI",
      editedCaption: null,
      status: "generated",
      conversationId: "conv-1",
      generationMs: 11329,
      generationTokens: 13796,
    });
  });

  it("reads from the social_posts table", async () => {
    const { client, calls } = fakeClient({ data: [], error: null });
    await listSocialPosts(client);
    expect(calls).toContain("social_posts");
  });

  it("returns an empty array when data is null", async () => {
    const { client } = fakeClient({ data: null, error: null });
    expect(await listSocialPosts(client)).toEqual([]);
  });

  it("throws when the query errors", async () => {
    const { client } = fakeClient({ data: null, error: { message: "boom" } });
    await expect(listSocialPosts(client)).rejects.toBeTruthy();
  });
});

describe("getSocialPost", () => {
  it("maps a single row", async () => {
    const { client } = fakeClient({ data: POST_ROW, error: null });
    const post = await getSocialPost(client, POST_ROW.id);
    expect(post?.idea).toBe("Cá hồi tươi");
  });

  it("returns null when no row is found", async () => {
    const { client } = fakeClient({ data: null, error: null });
    expect(await getSocialPost(client, POST_ROW.id)).toBeNull();
  });
});

describe("listSocialPostTemplates", () => {
  it("maps template rows", async () => {
    const { client } = fakeClient({ data: [TEMPLATE_ROW], error: null });
    const templates = await listSocialPostTemplates(client);
    expect(templates[0]).toEqual({
      id: TEMPLATE_ROW.id,
      name: "Bài đăng bán hàng",
      promptBody: "Bạn là chuyên gia viết content.",
      isDefault: true,
      isActive: true,
      updatedAt: TEMPLATE_ROW.updated_at,
    });
  });
});

describe("getDefaultSocialPostTemplate", () => {
  it("returns the default template when one exists", async () => {
    const { client } = fakeClient({ data: TEMPLATE_ROW, error: null });
    const template = await getDefaultSocialPostTemplate(client);
    expect(template?.isDefault).toBe(true);
  });

  it("returns null when there is no default", async () => {
    const { client } = fakeClient({ data: null, error: null });
    expect(await getDefaultSocialPostTemplate(client)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/features/social-posts/queries.test.ts`
Expected: FAIL — "Failed to resolve import ./queries".

- [ ] **Step 3: Write the implementation**

Create `src/features/social-posts/queries.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SocialPost, SocialPostStatus, SocialPostTemplate } from "./types";

const POST_COLUMNS =
  "id, template_id, idea, image_url, image_storage_path, image_local_path, " +
  "generated_caption, edited_caption, status, fb_post_id, scheduled_publish_time, " +
  "conversation_id, generation_ms, generation_tokens, error_message, created_at, posted_at";

const TEMPLATE_COLUMNS = "id, name, prompt_body, is_default, is_active, updated_at";

const DEFAULT_POST_LIMIT = 50;

type PostRow = {
  id: string;
  template_id: string | null;
  idea: string;
  image_url: string | null;
  image_storage_path: string | null;
  image_local_path: string | null;
  generated_caption: string | null;
  edited_caption: string | null;
  status: SocialPostStatus;
  fb_post_id: string | null;
  scheduled_publish_time: string | null;
  conversation_id: string | null;
  generation_ms: number | null;
  generation_tokens: number | null;
  error_message: string | null;
  created_at: string;
  posted_at: string | null;
};

type TemplateRow = {
  id: string;
  name: string;
  prompt_body: string;
  is_default: boolean;
  is_active: boolean;
  updated_at: string;
};

function mapPost(row: PostRow): SocialPost {
  return {
    id: row.id,
    templateId: row.template_id,
    idea: row.idea,
    imageUrl: row.image_url,
    imageStoragePath: row.image_storage_path,
    imageLocalPath: row.image_local_path,
    generatedCaption: row.generated_caption,
    editedCaption: row.edited_caption,
    status: row.status,
    fbPostId: row.fb_post_id,
    scheduledPublishTime: row.scheduled_publish_time,
    conversationId: row.conversation_id,
    generationMs: row.generation_ms,
    generationTokens: row.generation_tokens,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    postedAt: row.posted_at,
  };
}

function mapTemplate(row: TemplateRow): SocialPostTemplate {
  return {
    id: row.id,
    name: row.name,
    promptBody: row.prompt_body,
    isDefault: row.is_default,
    isActive: row.is_active,
    updatedAt: row.updated_at,
  };
}

export async function listSocialPosts(
  client: SupabaseClient,
  limit: number = DEFAULT_POST_LIMIT,
): Promise<SocialPost[]> {
  const { data, error } = await client
    .from("social_posts")
    .select(POST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as PostRow[]).map(mapPost);
}

export async function getSocialPost(
  client: SupabaseClient,
  id: string,
): Promise<SocialPost | null> {
  const { data, error } = await client
    .from("social_posts")
    .select(POST_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data ? mapPost(data as PostRow) : null;
}

export async function listSocialPostTemplates(
  client: SupabaseClient,
): Promise<SocialPostTemplate[]> {
  const { data, error } = await client
    .from("social_post_templates")
    .select(TEMPLATE_COLUMNS)
    .order("name", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as TemplateRow[]).map(mapTemplate);
}

export async function getSocialPostTemplate(
  client: SupabaseClient,
  id: string,
): Promise<SocialPostTemplate | null> {
  const { data, error } = await client
    .from("social_post_templates")
    .select(TEMPLATE_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data ? mapTemplate(data as TemplateRow) : null;
}

export async function getDefaultSocialPostTemplate(
  client: SupabaseClient,
): Promise<SocialPostTemplate | null> {
  const { data, error } = await client
    .from("social_post_templates")
    .select(TEMPLATE_COLUMNS)
    .eq("is_default", true)
    .maybeSingle();

  if (error) throw error;

  return data ? mapTemplate(data as TemplateRow) : null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/features/social-posts/queries.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/social-posts/queries.ts src/features/social-posts/queries.test.ts
git commit -m "feat(social-posts): add read queries for posts and templates"
```

---

### Task 7: Image upload route (two destinations)

`agy` needs a local filesystem path for `read_file`; Facebook needs a public URL. One upload produces both. `app/api/admin/images/route.ts` cannot be reused — it hardcodes `productId` and inserts into `product_images` — so this is a sibling route reusing its validation rules verbatim.

**Files:**
- Create: `src/features/social-posts/image-store.ts`
- Create: `app/api/admin/social-images/route.ts`
- Test: `src/features/social-posts/image-store.test.ts`
- Modify: `.env.example` (append `SOCIAL_POST_IMAGE_DIR`)

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: `validateImageFile(file: { type: string; size: number }): string | null`; `buildImagePaths(fileName: string, imageDir: string): { storagePath: string; localPath: string }`; `resolveImageDir(): string`; constants `ALLOWED_IMAGE_TYPES`, `MAX_IMAGE_BYTES`. Route returns JSON `{ url, storagePath, localPath }`.

- [ ] **Step 1: Write the failing tests**

Create `src/features/social-posts/image-store.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, buildImagePaths, validateImageFile } from "./image-store";

describe("validateImageFile", () => {
  it("accepts a JPEG under the size cap", () => {
    expect(validateImageFile({ type: "image/jpeg", size: 1024 })).toBeNull();
  });

  it("accepts PNG, WebP and GIF", () => {
    for (const type of ["image/png", "image/webp", "image/gif"]) {
      expect(validateImageFile({ type, size: 1024 })).toBeNull();
    }
  });

  it("rejects a disallowed MIME type", () => {
    expect(validateImageFile({ type: "application/pdf", size: 1024 })).toMatch(/JPEG/);
  });

  it("rejects a file over the size cap", () => {
    expect(validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES + 1 })).toMatch(/5 MB/);
  });

  it("accepts a file exactly at the size cap", () => {
    expect(validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES })).toBeNull();
  });
});

describe("buildImagePaths", () => {
  it("puts the storage object under the social/ prefix", () => {
    const { storagePath } = buildImagePaths("photo.png", "/var/lib/social-posts");
    expect(storagePath).toMatch(/^social\/[0-9a-f-]{36}\.png$/);
  });

  it("returns an absolute local path inside the image dir", () => {
    const { localPath } = buildImagePaths("photo.png", "/var/lib/social-posts");
    expect(localPath.startsWith("/var/lib/social-posts/")).toBe(true);
    expect(localPath.endsWith(".png")).toBe(true);
  });

  it("uses the same basename for both destinations", () => {
    const { storagePath, localPath } = buildImagePaths("photo.webp", "/tmp/images");
    expect(localPath.split("/").pop()).toBe(storagePath.split("/").pop());
  });

  it("falls back to .jpg when the filename has no extension", () => {
    const { storagePath } = buildImagePaths("photo", "/tmp/images");
    expect(storagePath.endsWith(".jpg")).toBe(true);
  });

  it("ignores a directory-traversal filename and keeps only the extension", () => {
    // The client controls file.name, so it must never reach a path unsanitised.
    const { localPath, storagePath } = buildImagePaths("../../etc/passwd.png", "/tmp/images");
    expect(localPath).not.toContain("..");
    expect(storagePath).not.toContain("..");
    expect(storagePath.endsWith(".png")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/features/social-posts/image-store.test.ts`
Expected: FAIL — "Failed to resolve import ./image-store".

- [ ] **Step 3: Write the image-store helpers**

Create `src/features/social-posts/image-store.ts`:

```ts
import { extname } from "node:path";

// Same rules as app/api/admin/images/route.ts.
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const DEFAULT_IMAGE_DIR = "/tmp/social-post-images";

export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Chỉ cho phép ảnh JPEG, PNG, WebP hoặc GIF";
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return "Ảnh phải nhỏ hơn 5 MB";
  }

  return null;
}

// The image directory must sit inside the agy read_file allow-rule and be
// writable by the Next.js process.
export function resolveImageDir(): string {
  return process.env.SOCIAL_POST_IMAGE_DIR ?? DEFAULT_IMAGE_DIR;
}

export function buildImagePaths(
  fileName: string,
  imageDir: string,
): { storagePath: string; localPath: string } {
  // Only the extension is taken from the client-supplied name; the basename
  // is a fresh UUID, so a traversal attempt like "../../x.png" cannot escape.
  const ext = extname(fileName) || ".jpg";
  const basename = `${crypto.randomUUID()}${ext}`;

  return {
    storagePath: `social/${basename}`,
    localPath: `${imageDir}/${basename}`,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/features/social-posts/image-store.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Write the route handler**

Create `app/api/admin/social-images/route.ts`. Permission is checked before any form parsing:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { createServerClient } from "@/src/lib/supabase/server";
import { requireAdminPermission } from "@/src/features/admin/auth";
import { buildImagePaths, resolveImageDir, validateImageFile } from "@/src/features/social-posts/image-store";

export async function POST(request: NextRequest) {
  const authClient = await createServerClient();

  try {
    await requireAdminPermission(authClient, "social_posts:manage");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const validationError = validateImageFile({ type: file.type, size: file.size });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const imageDir = resolveImageDir();
  const { storagePath, localPath } = buildImagePaths(file.name, imageDir);
  const bytes = Buffer.from(await file.arrayBuffer());

  // Destination 1: Supabase Storage, for the Facebook photo and the preview.
  const adminClient = createAdminClient();
  const { error: uploadError } = await adminClient.storage
    .from("media")
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = adminClient.storage.from("media").getPublicUrl(storagePath);

  // Destination 2: local disk, because agy's read_file needs a real path.
  try {
    await mkdir(imageDir, { recursive: true });
    await writeFile(localPath, bytes);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không ghi được ảnh vào đĩa";
    return NextResponse.json(
      { error: `Không ghi được ảnh vào ${imageDir}: ${message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: publicUrl, storagePath, localPath });
}
```

- [ ] **Step 6: Document the environment variable**

Append to `.env.example`:

```
# Directory where uploaded social-post images are written so the agy CLI can
# read them. Must be writable by the Next.js process AND covered by the
# read_file allow-rule in ~/.gemini/antigravity-cli/settings.json.
SOCIAL_POST_IMAGE_DIR=/tmp/social-post-images
```

- [ ] **Step 7: Verify lint and the full suite**

Run: `pnpm test && pnpm lint`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/features/social-posts/image-store.ts \
        src/features/social-posts/image-store.test.ts \
        app/api/admin/social-images/route.ts \
        .env.example
git commit -m "feat(social-posts): add image upload to storage and local agy dir"
```

---

### Task 8: Generation service

The decision logic lives in a plain module rather than inside the `"use server"` file, so it can be unit-tested with the stub generator. The server action in Task 10 wires it to the database; this task does no DB work.

**Files:**
- Create: `src/features/social-posts/generation.ts`
- Test: `src/features/social-posts/generation.test.ts`

**Interfaces:**
- Consumes: `buildPrompt` from `./prompt-builder` (Task 2); `ContentGenerator` from `./generator/types` (Task 3); `createStubGenerator` from `./generator/stub-generator` (Task 4); `ImageVisionMode` from `./types` (Task 1)
- Produces: `generateCaption(params: GenerateCaptionParams): Promise<GenerationOutcome>`; types `GenerateCaptionParams`, `GenerationOutcome`, `SocialPostUpdate`

- [ ] **Step 1: Write the failing tests**

Create `src/features/social-posts/generation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { generateCaption } from "./generation";
import { createStubGenerator } from "./generator/stub-generator";
import { POST_START } from "./prompt-builder";

const SUCCESS = {
  ok: true as const,
  caption: "Cá hồi tươi về sáng nay!",
  conversationId: "conv-1",
  durationMs: 11329,
  tokens: 13796,
};

const BASE = {
  promptBody: "Bạn là chuyên gia viết content Facebook.",
  idea: "Cá hồi Na Uy tươi về sáng nay, giảm 20%",
  visionMode: "attach-only" as const,
};

describe("generateCaption", () => {
  it("returns the caption and generation metrics on success", async () => {
    const generator = createStubGenerator(SUCCESS);
    const outcome = await generateCaption({ ...BASE, generator });

    expect(outcome.ok).toBe(true);
    expect(outcome.values).toEqual({
      generated_caption: "Cá hồi tươi về sáng nay!",
      edited_caption: null,
      conversation_id: "conv-1",
      generation_ms: 11329,
      generation_tokens: 13796,
      status: "generated",
      error_message: null,
    });
  });

  it("clears any previous admin edit, since it belonged to superseded output", async () => {
    const generator = createStubGenerator(SUCCESS);
    const outcome = await generateCaption({ ...BASE, generator });
    // Narrow via outcome.ok: edited_caption exists only on the success branch.
    expect(outcome.ok && outcome.values.edited_caption).toBeNull();
  });

  it("sends a prompt containing the delimiter instruction", async () => {
    const generator = createStubGenerator(SUCCESS);
    await generateCaption({ ...BASE, generator });
    expect(generator.calls[0]?.prompt).toContain(POST_START);
  });

  it("passes the absolute image path to the generator in vision mode", async () => {
    const generator = createStubGenerator(SUCCESS);
    await generateCaption({
      ...BASE,
      visionMode: "vision",
      imagePath: "/var/lib/social-posts/a.png",
      generator,
    });
    expect(generator.calls[0]?.imagePath).toBe("/var/lib/social-posts/a.png");
    expect(generator.calls[0]?.prompt).toContain("/var/lib/social-posts/a.png");
  });

  it("omits the image path in attach-only mode", async () => {
    const generator = createStubGenerator(SUCCESS);
    await generateCaption({ ...BASE, imagePath: "/var/lib/social-posts/a.png", generator });
    expect(generator.calls[0]?.imagePath).toBeUndefined();
  });

  it("forwards a conversation id so regeneration continues the conversation", async () => {
    const generator = createStubGenerator(SUCCESS);
    await generateCaption({ ...BASE, conversationId: "conv-earlier", generator });
    expect(generator.calls[0]?.conversationId).toBe("conv-earlier");
  });

  it("maps a generator failure to failed status with the error preserved", async () => {
    const generator = createStubGenerator({
      ok: false,
      error: "agy bị từ chối quyền: read_file.",
      deniedActions: ["read_file"],
    });
    const outcome = await generateCaption({ ...BASE, generator });

    expect(outcome.ok).toBe(false);
    expect(outcome.values).toEqual({
      status: "failed",
      error_message: "agy bị từ chối quyền: read_file.",
    });
  });

  it("maps a thrown prompt-builder error to failed status instead of propagating", async () => {
    // vision mode with a relative path makes buildPrompt throw; the admin
    // should see a legible failure rather than an unhandled exception.
    const generator = createStubGenerator(SUCCESS);
    const outcome = await generateCaption({
      ...BASE,
      visionMode: "vision",
      imagePath: "./relative.png",
      generator,
    });

    expect(outcome.ok).toBe(false);
    expect(outcome.ok === false && outcome.values.error_message).toMatch(/absolute/i);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/features/social-posts/generation.test.ts`
Expected: FAIL — "Failed to resolve import ./generation".

- [ ] **Step 3: Write the implementation**

Create `src/features/social-posts/generation.ts`:

```ts
import { buildPrompt } from "./prompt-builder";
import type { ContentGenerator } from "./generator/types";
import type { ImageVisionMode } from "./types";

export type GenerateCaptionParams = {
  generator: ContentGenerator;
  promptBody: string;
  idea: string;
  visionMode: ImageVisionMode;
  imagePath?: string;
  conversationId?: string;
};

type SuccessUpdate = {
  generated_caption: string;
  edited_caption: null;
  conversation_id: string;
  generation_ms: number;
  generation_tokens: number;
  status: "generated";
  error_message: null;
};

type FailureUpdate = {
  status: "failed";
  error_message: string;
};

export type SocialPostUpdate = SuccessUpdate | FailureUpdate;

export type GenerationOutcome =
  | { ok: true; values: SuccessUpdate }
  | { ok: false; values: FailureUpdate };

export async function generateCaption(
  params: GenerateCaptionParams,
): Promise<GenerationOutcome> {
  const { generator, promptBody, idea, visionMode, imagePath, conversationId } = params;

  let prompt: string;
  try {
    prompt = buildPrompt({ promptBody, idea, visionMode, imagePath });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không dựng được prompt";
    return { ok: false, values: { status: "failed", error_message: message } };
  }

  const result = await generator.generate({
    prompt,
    // Only vision mode gives agy a file to read.
    imagePath: visionMode === "vision" ? imagePath : undefined,
    conversationId,
  });

  if (!result.ok) {
    return { ok: false, values: { status: "failed", error_message: result.error } };
  }

  return {
    ok: true,
    values: {
      generated_caption: result.caption,
      // Regeneration supersedes any earlier admin edit.
      edited_caption: null,
      conversation_id: result.conversationId,
      generation_ms: result.durationMs,
      generation_tokens: result.tokens,
      status: "generated",
      error_message: null,
    },
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/features/social-posts/generation.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/social-posts/generation.ts src/features/social-posts/generation.test.ts
git commit -m "feat(social-posts): add generation service mapping agy results to row updates"
```

---

### Task 9: Facebook Graph client

**Files:**
- Create: `src/features/social-posts/facebook/graph-client.ts`
- Test: `src/features/social-posts/facebook/graph-client.test.ts`
- Modify: `.env.example` (append the three Facebook variables)

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: `buildPhotoPayload(input: PublishPhotoInput): URLSearchParams`; `buildPhotoEndpoint(pageId: string, version?: string): string`; `publishPhoto(input: PublishPhotoInput, fetchImpl?: typeof fetch): Promise<PublishResult>`; `resolveFacebookConfig(): FacebookConfig | null`; types `PublishPhotoInput`, `PublishResult`, `FacebookConfig`; constant `GRAPH_VERSION = "v21.0"`

- [ ] **Step 1: Write the failing tests**

Create `src/features/social-posts/facebook/graph-client.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { buildPhotoEndpoint, buildPhotoPayload, publishPhoto } from "./graph-client";

const INPUT = {
  pageId: "123456",
  accessToken: "page-token",
  message: "Cá hồi tươi về sáng nay!",
  imageUrl: "https://example.supabase.co/storage/v1/social/a.png",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("buildPhotoEndpoint", () => {
  it("targets the page photos edge on v21.0", () => {
    expect(buildPhotoEndpoint("123456")).toBe("https://graph.facebook.com/v21.0/123456/photos");
  });

  it("honours an explicit version", () => {
    expect(buildPhotoEndpoint("123456", "v22.0")).toContain("/v22.0/");
  });
});

describe("buildPhotoPayload", () => {
  it("publishes immediately when no schedule is given", () => {
    const payload = buildPhotoPayload(INPUT);
    expect(payload.get("url")).toBe(INPUT.imageUrl);
    expect(payload.get("message")).toBe(INPUT.message);
    expect(payload.get("access_token")).toBe("page-token");
    expect(payload.get("published")).toBe("true");
    expect(payload.get("scheduled_publish_time")).toBeNull();
  });

  it("sets published=false and a unix timestamp when scheduled", () => {
    const when = new Date("2026-09-12T10:00:00.000Z");
    const payload = buildPhotoPayload({ ...INPUT, scheduledPublishTime: when });
    expect(payload.get("published")).toBe("false");
    expect(payload.get("scheduled_publish_time")).toBe(String(Math.floor(when.getTime() / 1000)));
  });
});

describe("publishPhoto", () => {
  it("returns post_id when Facebook provides one", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ id: "photo-1", post_id: "123_456" }));
    const result = await publishPhoto(INPUT, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: true, postId: "123_456" });
  });

  it("falls back to id when post_id is absent", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ id: "photo-1" }));
    const result = await publishPhoto(INPUT, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: true, postId: "photo-1" });
  });

  it("POSTs form-encoded data to the photos edge", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ id: "photo-1" }));
    await publishPhoto(INPUT, fetchImpl as unknown as typeof fetch);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://graph.facebook.com/v21.0/123456/photos");
    expect(init.method).toBe("POST");
    expect(String(init.body)).toContain("message=");
  });

  it("surfaces the Graph API error message", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ error: { message: "Invalid OAuth access token", code: 190 } }, 400),
    );
    const result = await publishPhoto(INPUT, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, error: expect.stringContaining("Invalid OAuth") });
  });

  it("reports a transport failure instead of throwing", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    const result = await publishPhoto(INPUT, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, error: expect.stringContaining("network down") });
  });

  it("reports a non-JSON response instead of throwing", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("<html>502</html>", { status: 502 }));
    const result = await publishPhoto(INPUT, fetchImpl as unknown as typeof fetch);
    expect(result.ok).toBe(false);
  });

  it("fails when Facebook returns neither an id nor an error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}));
    const result = await publishPhoto(INPUT, fetchImpl as unknown as typeof fetch);
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/features/social-posts/facebook/graph-client.test.ts`
Expected: FAIL — "Failed to resolve import ./graph-client".

- [ ] **Step 3: Write the implementation**

Create `src/features/social-posts/facebook/graph-client.ts`:

```ts
export const GRAPH_VERSION = "v21.0";

export type PublishPhotoInput = {
  pageId: string;
  accessToken: string;
  message: string;
  imageUrl: string;
  // Omit to publish immediately. Must already be inside the Graph API's
  // 10-minute-to-75-day window (validated by schema.ts).
  scheduledPublishTime?: Date;
};

export type PublishResult = { ok: true; postId: string } | { ok: false; error: string };

export type FacebookConfig = { pageId: string; accessToken: string };

export function buildPhotoEndpoint(pageId: string, version: string = GRAPH_VERSION): string {
  return `https://graph.facebook.com/${version}/${pageId}/photos`;
}

export function buildPhotoPayload(input: PublishPhotoInput): URLSearchParams {
  const payload = new URLSearchParams({
    url: input.imageUrl,
    message: input.message,
    access_token: input.accessToken,
  });

  if (input.scheduledPublishTime) {
    payload.set("published", "false");
    payload.set(
      "scheduled_publish_time",
      String(Math.floor(input.scheduledPublishTime.getTime() / 1000)),
    );
  } else {
    payload.set("published", "true");
  }

  return payload;
}

type GraphResponse = {
  id?: string;
  post_id?: string;
  error?: { message?: string; code?: number };
};

export async function publishPhoto(
  input: PublishPhotoInput,
  fetchImpl: typeof fetch = fetch,
): Promise<PublishResult> {
  let body: GraphResponse;

  try {
    const response = await fetchImpl(buildPhotoEndpoint(input.pageId), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: buildPhotoPayload(input),
    });
    body = (await response.json()) as GraphResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không gọi được Facebook Graph API";
    return { ok: false, error: `Lỗi khi gọi Facebook: ${message}` };
  }

  if (body.error?.message) {
    return { ok: false, error: `Facebook từ chối: ${body.error.message}` };
  }

  const postId = body.post_id ?? body.id;
  if (!postId) {
    return { ok: false, error: "Facebook không trả về mã bài đăng." };
  }

  return { ok: true, postId };
}

// Server-only: these must never be imported into a Client Component.
export function resolveFacebookConfig(): FacebookConfig | null {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) return null;

  return { pageId, accessToken };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/features/social-posts/facebook/graph-client.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Document the environment variables**

Append to `.env.example`:

```
# Facebook Page posting. The access token must be a long-lived Page token
# with the pages_manage_posts scope. Server-only — never expose to the browser.
FACEBOOK_PAGE_ID=
FACEBOOK_PAGE_ACCESS_TOKEN=
```

- [ ] **Step 6: Commit**

```bash
git add src/features/social-posts/facebook/graph-client.ts \
        src/features/social-posts/facebook/graph-client.test.ts \
        .env.example
git commit -m "feat(social-posts): add Facebook Graph photo publish client"
```

---

### Task 10: Server actions

**Files:**
- Create: `src/features/social-posts/admin-actions.ts`
- Test: `src/features/social-posts/admin-actions.test.ts`
- Modify: `.env.example` (append `AGY_BIN_PATH`)

**Interfaces:**
- Consumes: `generateCaption` (Task 8); `publishPhoto`, `resolveFacebookConfig` (Task 9); queries (Task 6); schemas (Task 5); `createAgyGenerator` (Task 4); `resolveImageDir` (Task 7); `effectiveCaption` (Task 1)
- Produces: `SocialPostActionState = { error: string } | null`; actions `generateSocialPost`, `regenerateSocialPost`, `updateSocialPostCaption`, `publishSocialPost`, `deleteSocialPost`, `upsertSocialPostTemplate`, `deleteSocialPostTemplate`

- [ ] **Step 1: Write the failing test**

Create `src/features/social-posts/admin-actions.test.ts`. This covers the ordering rule that unit tests can actually reach — permission before parsing:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminPermission = vi.fn();
const from = vi.fn();

vi.mock("@/src/lib/supabase/server", () => ({
  createServerClient: () => Promise.resolve({ from }),
}));

vi.mock("@/src/features/admin/auth", () => ({
  requireAdminPermission: (...args: unknown[]) => requireAdminPermission(...args),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const { generateSocialPost, updateSocialPostCaption } = await import("./admin-actions");

beforeEach(() => {
  requireAdminPermission.mockReset();
  from.mockReset();
});

describe("generateSocialPost", () => {
  it("checks the permission before touching the form or the database", async () => {
    requireAdminPermission.mockRejectedValue(new Error("Permission denied"));

    const formData = new FormData();
    // Deliberately invalid: if parsing ran first it would return a validation
    // error instead of propagating the authorization failure.
    formData.set("idea", "x");

    await expect(generateSocialPost(null, formData)).rejects.toThrow("Permission denied");
    expect(from).not.toHaveBeenCalled();
  });

  it("requests the social_posts:manage permission", async () => {
    requireAdminPermission.mockRejectedValue(new Error("Permission denied"));
    await expect(generateSocialPost(null, new FormData())).rejects.toThrow();
    expect(requireAdminPermission).toHaveBeenCalledWith(expect.anything(), "social_posts:manage");
  });

  it("returns a validation error without writing when the form is invalid", async () => {
    requireAdminPermission.mockResolvedValue({ userId: "u1", roles: ["super_admin"] });

    const formData = new FormData();
    formData.set("templateId", "not-a-uuid");
    formData.set("idea", "short");
    formData.set("visionMode", "attach-only");

    const result = await generateSocialPost(null, formData);
    expect(result).toMatchObject({ error: expect.any(String) });
    expect(from).not.toHaveBeenCalled();
  });
});

describe("updateSocialPostCaption", () => {
  it("rejects a non-UUID post id before any database call", async () => {
    requireAdminPermission.mockResolvedValue({ userId: "u1", roles: ["super_admin"] });

    const formData = new FormData();
    formData.set("postId", "../../etc/passwd");
    formData.set("caption", "Nội dung hợp lệ");

    const result = await updateSocialPostCaption(null, formData);
    expect(result).toMatchObject({ error: expect.stringContaining("không hợp lệ") });
    expect(from).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/features/social-posts/admin-actions.test.ts`
Expected: FAIL — "Failed to resolve import ./admin-actions".

- [ ] **Step 3: Write the actions**

Create `src/features/social-posts/admin-actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";
import { publishPhoto, resolveFacebookConfig } from "./facebook/graph-client";
import { createAgyGenerator } from "./generator/agy-generator";
import { generateCaption } from "./generation";
import { resolveImageDir } from "./image-store";
import { getSocialPost, getSocialPostTemplate } from "./queries";
import {
  isUuid,
  parseCaptionForm,
  parseGenerateSocialPostForm,
  parseScheduledPublishTime,
  parseSocialPostTemplateForm,
} from "./schema";
import { effectiveCaption } from "./types";

const PERMISSION = "social_posts:manage";
const LIST_PATH = "/admin/social-posts";
const TEMPLATES_PATH = "/admin/social-posts/templates";

export type SocialPostActionState = { error: string } | null;

function buildGenerator() {
  return createAgyGenerator({
    binPath: process.env.AGY_BIN_PATH ?? "agy",
    imageDir: resolveImageDir(),
  });
}

export async function generateSocialPost(
  _prev: SocialPostActionState,
  formData: FormData,
): Promise<SocialPostActionState> {
  const client = await createServerClient();
  // Auth before validation, per the server-action rules.
  await requireAdminPermission(client, PERMISSION);

  const parsed = parseGenerateSocialPostForm(formData);
  if (!parsed.success) return { error: parsed.error };

  const template = await getSocialPostTemplate(client, parsed.data.templateId);
  if (!template) return { error: "Không tìm thấy mẫu prompt" };

  const { data: inserted, error: insertError } = await client
    .from("social_posts")
    .insert({
      template_id: template.id,
      idea: parsed.data.idea,
      image_url: parsed.data.imageUrl ?? null,
      image_storage_path: parsed.data.imageStoragePath ?? null,
      image_local_path: parsed.data.imageLocalPath ?? null,
      status: "draft",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { error: insertError?.message ?? "Không tạo được bài đăng" };
  }

  const outcome = await generateCaption({
    generator: buildGenerator(),
    promptBody: template.promptBody,
    idea: parsed.data.idea,
    visionMode: parsed.data.visionMode,
    imagePath: parsed.data.imageLocalPath,
  });

  const { error: updateError } = await client
    .from("social_posts")
    .update(outcome.values)
    .eq("id", inserted.id);

  if (updateError) return { error: updateError.message };

  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${inserted.id}`);

  // Redirect even on generation failure: the review page shows the recorded
  // error_message, which is more useful than a bare form error. redirect()
  // throws internally, so it stays outside any try/catch.
  redirect(`${LIST_PATH}/${inserted.id}`);
}

export async function regenerateSocialPost(
  _prev: SocialPostActionState,
  formData: FormData,
): Promise<SocialPostActionState> {
  const client = await createServerClient();
  await requireAdminPermission(client, PERMISSION);

  const id = String(formData.get("postId") ?? "");
  if (!isUuid(id)) return { error: "Mã bài đăng không hợp lệ" };

  const post = await getSocialPost(client, id);
  if (!post) return { error: "Không tìm thấy bài đăng" };
  if (!post.templateId) return { error: "Bài đăng không còn mẫu prompt liên kết" };

  const template = await getSocialPostTemplate(client, post.templateId);
  if (!template) return { error: "Không tìm thấy mẫu prompt" };

  const adjustment = String(formData.get("adjustment") ?? "").trim();
  const idea = adjustment ? `${post.idea}\n\nYêu cầu thêm: ${adjustment}` : post.idea;

  const outcome = await generateCaption({
    generator: buildGenerator(),
    promptBody: template.promptBody,
    idea,
    visionMode: post.imageLocalPath ? "vision" : "attach-only",
    imagePath: post.imageLocalPath ?? undefined,
    // Continuing the conversation is cheaper and more coherent than a cold
    // re-prompt when the admin asks for an adjustment.
    conversationId: post.conversationId ?? undefined,
  });

  const { error } = await client.from("social_posts").update(outcome.values).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`${LIST_PATH}/${id}`);

  return outcome.ok ? null : { error: outcome.values.error_message };
}

export async function updateSocialPostCaption(
  _prev: SocialPostActionState,
  formData: FormData,
): Promise<SocialPostActionState> {
  const client = await createServerClient();
  await requireAdminPermission(client, PERMISSION);

  const id = String(formData.get("postId") ?? "");
  if (!isUuid(id)) return { error: "Mã bài đăng không hợp lệ" };

  const parsed = parseCaptionForm(formData);
  if (!parsed.success) return { error: parsed.error };

  const { error } = await client
    .from("social_posts")
    .update({ edited_caption: parsed.data.caption })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`${LIST_PATH}/${id}`);
  return null;
}

export async function publishSocialPost(
  _prev: SocialPostActionState,
  formData: FormData,
): Promise<SocialPostActionState> {
  const client = await createServerClient();
  await requireAdminPermission(client, PERMISSION);

  const id = String(formData.get("postId") ?? "");
  if (!isUuid(id)) return { error: "Mã bài đăng không hợp lệ" };

  const config = resolveFacebookConfig();
  if (!config) {
    return { error: "Chưa cấu hình FACEBOOK_PAGE_ID và FACEBOOK_PAGE_ACCESS_TOKEN" };
  }

  const post = await getSocialPost(client, id);
  if (!post) return { error: "Không tìm thấy bài đăng" };
  if (!post.imageUrl) return { error: "Bài đăng chưa có ảnh để đăng lên Facebook" };

  const caption = effectiveCaption(post);
  if (!caption) return { error: "Bài đăng chưa có nội dung" };

  // An empty schedule field means publish now.
  const rawSchedule = String(formData.get("scheduledPublishTime") ?? "").trim();
  let scheduledPublishTime: Date | undefined;

  if (rawSchedule) {
    const parsedSchedule = parseScheduledPublishTime(rawSchedule, new Date());
    if (!parsedSchedule.success) return { error: parsedSchedule.error };
    scheduledPublishTime = parsedSchedule.data;
  }

  const result = await publishPhoto({
    pageId: config.pageId,
    accessToken: config.accessToken,
    message: caption,
    imageUrl: post.imageUrl,
    scheduledPublishTime,
  });

  if (!result.ok) {
    await client
      .from("social_posts")
      .update({ status: "failed", error_message: result.error })
      .eq("id", id);
    revalidatePath(`${LIST_PATH}/${id}`);
    return { error: result.error };
  }

  const { error } = await client
    .from("social_posts")
    .update({
      status: scheduledPublishTime ? "scheduled" : "posted",
      fb_post_id: result.postId,
      scheduled_publish_time: scheduledPublishTime?.toISOString() ?? null,
      posted_at: scheduledPublishTime ? null : new Date().toISOString(),
      error_message: null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id}`);
  return null;
}

export async function deleteSocialPost(formData: FormData): Promise<void> {
  const client = await createServerClient();
  await requireAdminPermission(client, PERMISSION);

  const id = String(formData.get("postId") ?? "");
  if (!isUuid(id)) return;

  await client.from("social_posts").delete().eq("id", id);

  revalidatePath(LIST_PATH);
}

export async function upsertSocialPostTemplate(
  _prev: SocialPostActionState,
  formData: FormData,
): Promise<SocialPostActionState> {
  const client = await createServerClient();
  await requireAdminPermission(client, PERMISSION);

  const parsed = parseSocialPostTemplateForm(formData);
  if (!parsed.success) return { error: parsed.error };

  const rawId = String(formData.get("templateId") ?? "").trim();
  if (rawId && !isUuid(rawId)) return { error: "Mã mẫu không hợp lệ" };

  // social_post_templates_default_key is a partial unique index on
  // is_default, so the previous default must be cleared first.
  if (parsed.data.isDefault) {
    await client
      .from("social_post_templates")
      .update({ is_default: false })
      .eq("is_default", true);
  }

  const values = {
    name: parsed.data.name,
    prompt_body: parsed.data.promptBody,
    is_default: parsed.data.isDefault,
    is_active: parsed.data.isActive,
    updated_at: new Date().toISOString(),
  };

  const { error } = rawId
    ? await client.from("social_post_templates").update(values).eq("id", rawId)
    : await client.from("social_post_templates").insert(values);

  if (error) return { error: error.message };

  revalidatePath(TEMPLATES_PATH);
  revalidatePath(`${LIST_PATH}/new`);
  return null;
}

export async function deleteSocialPostTemplate(formData: FormData): Promise<void> {
  const client = await createServerClient();
  await requireAdminPermission(client, PERMISSION);

  const id = String(formData.get("templateId") ?? "");
  if (!isUuid(id)) return;

  await client.from("social_post_templates").delete().eq("id", id);

  revalidatePath(TEMPLATES_PATH);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/features/social-posts/admin-actions.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Document the binary path variable**

Append to `.env.example`:

```
# Absolute path to the agy CLI. Defaults to "agy" on PATH, which will NOT
# resolve inside the production container unless the binary is mounted in.
AGY_BIN_PATH=
```

- [ ] **Step 6: Verify lint and the full suite**

Run: `pnpm test && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/social-posts/admin-actions.ts \
        src/features/social-posts/admin-actions.test.ts \
        .env.example
git commit -m "feat(social-posts): add generate, review, publish and template actions"
```

---

### Task 11: Template management page

**Files:**
- Create: `components/admin/social-post-template-form.tsx`
- Create: `app/admin/social-posts/templates/page.tsx`

**Interfaces:**
- Consumes: `upsertSocialPostTemplate`, `deleteSocialPostTemplate`, `SocialPostActionState` (Task 10); `listSocialPostTemplates` (Task 6); `SocialPostTemplate` (Task 1)
- Produces: `SocialPostTemplateForm` component

No unit tests: these are thin presentational wrappers over already-tested actions and queries, matching how `components/admin/shop-sync-settings-form.tsx` is handled in this repo.

- [ ] **Step 1: Write the form component**

Create `components/admin/social-post-template-form.tsx`, following the `INPUT_CLASS` and `useActionState` conventions of `shop-sync-settings-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import type { SocialPostActionState } from "@/src/features/social-posts/admin-actions";

type InitialValues = {
  id?: string;
  name: string;
  promptBody: string;
  isDefault: boolean;
  isActive: boolean;
};

type SocialPostTemplateFormProps = {
  action: (prev: SocialPostActionState, formData: FormData) => Promise<SocialPostActionState>;
  initialValues: InitialValues;
  submitLabel: string;
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export function SocialPostTemplateForm({
  action,
  initialValues,
  submitLabel,
}: SocialPostTemplateFormProps) {
  const [state, formAction, isPending] = useActionState<SocialPostActionState, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {initialValues.id && <input type="hidden" name="templateId" value={initialValues.id} />}

      <label className="block text-sm" htmlFor="name">
        <span className="font-medium text-slate-700">Tên mẫu</span>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={initialValues.name}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block text-sm" htmlFor="promptBody">
        <span className="font-medium text-slate-700">Nội dung prompt</span>
        <textarea
          id="promptBody"
          name="promptBody"
          required
          rows={10}
          defaultValue={initialValues.promptBody}
          className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <p className="text-xs text-slate-500">
        Không cần thêm hướng dẫn về định dạng đầu ra hay về việc đọc ảnh — hệ thống tự thêm phần đó
        vào prompt để khớp với bộ phân tích kết quả.
      </p>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isDefault" defaultChecked={initialValues.isDefault} />
        <span className="font-medium text-slate-700">Đặt làm mẫu mặc định</span>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={initialValues.isActive} />
        <span className="font-medium text-slate-700">Đang sử dụng</span>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-11 items-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {isPending ? "Đang lưu…" : submitLabel}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Write the templates page**

Create `app/admin/social-posts/templates/page.tsx`, following the access-check shape of `app/admin/shop-sync/page.tsx`:

```tsx
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SocialPostTemplateForm } from "@/components/admin/social-post-template-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";
import {
  deleteSocialPostTemplate,
  upsertSocialPostTemplate,
} from "@/src/features/social-posts/admin-actions";
import { listSocialPostTemplates } from "@/src/features/social-posts/queries";
import type { SocialPostTemplate } from "@/src/features/social-posts/types";

export const dynamic = "force-dynamic";

async function getPageData() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "social_posts:manage");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return { access: "denied" as const };
    throw error;
  }

  return {
    access: "allowed" as const,
    templates: await listSocialPostTemplates(client),
  };
}

export default async function SocialPostTemplatesPage() {
  const data = await getPageData();

  if (data.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Mẫu prompt" />
        <p className="text-sm text-slate-600">Bạn không có quyền quản lý bài đăng Facebook.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Mẫu prompt"
        description="Quản lý các mẫu prompt dùng để sinh nội dung bài đăng Facebook."
        action={
          <Link href="/admin/social-posts" className="text-sm font-medium text-teal-700">
            ← Danh sách bài đăng
          </Link>
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Thêm mẫu mới</h2>
        <SocialPostTemplateForm
          action={upsertSocialPostTemplate}
          submitLabel="Tạo mẫu"
          initialValues={{ name: "", promptBody: "", isDefault: false, isActive: true }}
        />
      </section>

      <section className="space-y-6">
        <h2 className="text-sm font-semibold text-slate-800">Mẫu hiện có</h2>

        {data.templates.length === 0 && (
          <p className="text-sm text-slate-600">Chưa có mẫu prompt nào.</p>
        )}

        {data.templates.map((template: SocialPostTemplate) => (
          <div key={template.id} className="space-y-3 rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">
                {template.name}
                {template.isDefault && (
                  <span className="ml-2 rounded bg-teal-50 px-2 py-0.5 text-xs text-teal-700">
                    mặc định
                  </span>
                )}
              </h3>
              <form action={deleteSocialPostTemplate}>
                <input type="hidden" name="templateId" value={template.id} />
                <button type="submit" className="text-sm font-medium text-red-700">
                  Xoá
                </button>
              </form>
            </div>

            <SocialPostTemplateForm
              action={upsertSocialPostTemplate}
              submitLabel="Lưu thay đổi"
              initialValues={{
                id: template.id,
                name: template.name,
                promptBody: template.promptBody,
                isDefault: template.isDefault,
                isActive: template.isActive,
              }}
            />
          </div>
        ))}
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Verify the build compiles and lint passes**

Run: `pnpm lint && pnpm build`
Expected: PASS. `pnpm build` is the check that matters here — it type-checks the pages, which Vitest does not cover.

- [ ] **Step 4: Commit**

```bash
git add components/admin/social-post-template-form.tsx \
        app/admin/social-posts/templates/page.tsx
git commit -m "feat(social-posts): add prompt template management page"
```

---

### Task 12: Generate page

**Files:**
- Create: `components/admin/social-post-generate-form.tsx`
- Create: `app/admin/social-posts/new/page.tsx`

**Interfaces:**
- Consumes: `generateSocialPost`, `SocialPostActionState` (Task 10); `listSocialPostTemplates`, `getDefaultSocialPostTemplate` (Task 6); the `POST /api/admin/social-images` route (Task 7)
- Produces: `SocialPostGenerateForm` component

The image is uploaded by `fetch` before the form is submitted, so the server action receives plain text fields. This keeps the action free of multipart handling and lets the admin see an upload error before spending 10–60s on generation.

- [ ] **Step 1: Write the generate form component**

Create `components/admin/social-post-generate-form.tsx`:

```tsx
"use client";

import { useActionState, useState } from "react";
import type { SocialPostActionState } from "@/src/features/social-posts/admin-actions";

type TemplateOption = { id: string; name: string };

type UploadedImage = { url: string; storagePath: string; localPath: string };

type SocialPostGenerateFormProps = {
  action: (prev: SocialPostActionState, formData: FormData) => Promise<SocialPostActionState>;
  templates: TemplateOption[];
  defaultTemplateId: string | null;
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export function SocialPostGenerateForm({
  action,
  templates,
  defaultTemplateId,
}: SocialPostGenerateFormProps) {
  const [state, formAction, isPending] = useActionState<SocialPostActionState, FormData>(
    action,
    null,
  );
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const body = new FormData();
      body.set("file", file);

      const response = await fetch("/api/admin/social-images", { method: "POST", body });
      const payload = (await response.json()) as UploadedImage & { error?: string };

      if (!response.ok) {
        setUploadError(payload.error ?? "Tải ảnh thất bại");
        setImage(null);
        return;
      }

      setImage({
        url: payload.url,
        storagePath: payload.storagePath,
        localPath: payload.localPath,
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Tải ảnh thất bại");
      setImage(null);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <label className="block text-sm" htmlFor="templateId">
        <span className="font-medium text-slate-700">Mẫu prompt</span>
        <select
          id="templateId"
          name="templateId"
          required
          defaultValue={defaultTemplateId ?? ""}
          className={INPUT_CLASS}
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm" htmlFor="idea">
        <span className="font-medium text-slate-700">Ý tưởng bài đăng</span>
        <textarea
          id="idea"
          name="idea"
          required
          rows={4}
          placeholder="Ví dụ: Cá hồi Na Uy tươi về sáng nay, giảm 20% cho 30 khách đầu tiên"
          className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </label>

      <div className="space-y-2 text-sm">
        <span className="font-medium text-slate-700">Ảnh sản phẩm</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="block w-full text-sm"
        />
        {isUploading && <p className="text-xs text-slate-500">Đang tải ảnh lên…</p>}
        {uploadError && <p className="text-xs text-red-700">{uploadError}</p>}
        {image && (
          <div className="space-y-2">
            <p className="text-xs text-teal-700">Đã tải ảnh lên.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt="Ảnh đã tải lên" className="max-h-48 rounded-lg border" />
          </div>
        )}
      </div>

      {image && (
        <>
          <input type="hidden" name="imageUrl" value={image.url} />
          <input type="hidden" name="imageStoragePath" value={image.storagePath} />
          <input type="hidden" name="imageLocalPath" value={image.localPath} />
        </>
      )}

      {/* Unchecked checkboxes are absent from FormData, which the schema reads
          as "attach-only" — so this maps directly onto ImageVisionMode. */}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="visionMode" value="vision" defaultChecked disabled={!image} />
        <span className="font-medium text-slate-700">Cho AI xem ảnh khi viết nội dung</span>
      </label>

      <p className="text-xs text-slate-500">
        Việc sinh nội dung mất khoảng 10–60 giây. Vui lòng không đóng trang trong lúc chờ.
      </p>

      <button
        type="submit"
        disabled={isPending || isUploading}
        className="inline-flex min-h-11 items-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {isPending ? "Đang sinh nội dung…" : "Sinh nội dung"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Write the new-post page**

Create `app/admin/social-posts/new/page.tsx`:

```tsx
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SocialPostGenerateForm } from "@/components/admin/social-post-generate-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";
import { generateSocialPost } from "@/src/features/social-posts/admin-actions";
import {
  getDefaultSocialPostTemplate,
  listSocialPostTemplates,
} from "@/src/features/social-posts/queries";

export const dynamic = "force-dynamic";

async function getPageData() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "social_posts:manage");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return { access: "denied" as const };
    throw error;
  }

  const [templates, defaultTemplate] = await Promise.all([
    listSocialPostTemplates(client),
    getDefaultSocialPostTemplate(client),
  ]);

  return {
    access: "allowed" as const,
    templates: templates.filter((template) => template.isActive),
    defaultTemplateId: defaultTemplate?.id ?? null,
  };
}

export default async function NewSocialPostPage() {
  const data = await getPageData();

  if (data.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Tạo bài đăng" />
        <p className="text-sm text-slate-600">Bạn không có quyền quản lý bài đăng Facebook.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Tạo bài đăng"
        description="Nhập ý tưởng và tải ảnh lên, AI sẽ viết nội dung bài đăng Facebook để bạn duyệt."
        action={
          <Link href="/admin/social-posts" className="text-sm font-medium text-teal-700">
            ← Danh sách bài đăng
          </Link>
        }
      />

      {data.templates.length === 0 ? (
        <p className="text-sm text-slate-600">
          Chưa có mẫu prompt nào đang sử dụng.{" "}
          <Link href="/admin/social-posts/templates" className="font-medium text-teal-700">
            Tạo mẫu prompt
          </Link>{" "}
          trước khi sinh nội dung.
        </p>
      ) : (
        <SocialPostGenerateForm
          action={generateSocialPost}
          templates={data.templates.map((template) => ({ id: template.id, name: template.name }))}
          defaultTemplateId={data.defaultTemplateId}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify the build compiles and lint passes**

Run: `pnpm lint && pnpm build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/admin/social-post-generate-form.tsx \
        app/admin/social-posts/new/page.tsx
git commit -m "feat(social-posts): add generate page with image upload"
```

---

### Task 13: Review page and post list

**Files:**
- Create: `components/admin/social-post-review-form.tsx`
- Create: `app/admin/social-posts/[id]/page.tsx`
- Create: `app/admin/social-posts/page.tsx`

**Interfaces:**
- Consumes: `updateSocialPostCaption`, `regenerateSocialPost`, `publishSocialPost`, `deleteSocialPost`, `SocialPostActionState` (Task 10); `getSocialPost`, `listSocialPosts` (Task 6); `effectiveCaption`, `SocialPost` (Task 1)
- Produces: `SocialPostReviewForm` component

Route params are `Promise<{ id: string }>` in Next.js 16 and MUST be awaited.

- [ ] **Step 1: Write the review form component**

Create `components/admin/social-post-review-form.tsx`. Three separate forms, because each posts to a different action:

```tsx
"use client";

import { useActionState } from "react";
import type { SocialPostActionState } from "@/src/features/social-posts/admin-actions";

type SocialPostReviewFormProps = {
  postId: string;
  caption: string;
  canPublish: boolean;
  updateAction: (
    prev: SocialPostActionState,
    formData: FormData,
  ) => Promise<SocialPostActionState>;
  regenerateAction: (
    prev: SocialPostActionState,
    formData: FormData,
  ) => Promise<SocialPostActionState>;
  publishAction: (
    prev: SocialPostActionState,
    formData: FormData,
  ) => Promise<SocialPostActionState>;
};

const INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

const TEXTAREA_CLASS =
  "mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </p>
  );
}

export function SocialPostReviewForm({
  postId,
  caption,
  canPublish,
  updateAction,
  regenerateAction,
  publishAction,
}: SocialPostReviewFormProps) {
  const [updateState, updateFormAction, isUpdating] = useActionState<
    SocialPostActionState,
    FormData
  >(updateAction, null);
  const [regenerateState, regenerateFormAction, isRegenerating] = useActionState<
    SocialPostActionState,
    FormData
  >(regenerateAction, null);
  const [publishState, publishFormAction, isPublishing] = useActionState<
    SocialPostActionState,
    FormData
  >(publishAction, null);

  return (
    <div className="max-w-2xl space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Nội dung bài đăng</h2>
        <form action={updateFormAction} className="space-y-3">
          <ErrorBanner message={updateState?.error} />
          <input type="hidden" name="postId" value={postId} />
          <textarea
            name="caption"
            rows={16}
            defaultValue={caption}
            className={TEXTAREA_CLASS}
            aria-label="Nội dung bài đăng"
          />
          <button
            type="submit"
            disabled={isUpdating}
            className="inline-flex min-h-11 items-center rounded-lg border border-teal-700 px-4 text-sm font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-60"
          >
            {isUpdating ? "Đang lưu…" : "Lưu nội dung"}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Sinh lại nội dung</h2>
        <form action={regenerateFormAction} className="space-y-3">
          <ErrorBanner message={regenerateState?.error} />
          <input type="hidden" name="postId" value={postId} />
          <label className="block text-sm" htmlFor="adjustment">
            <span className="font-medium text-slate-700">Yêu cầu điều chỉnh (tuỳ chọn)</span>
            <input
              id="adjustment"
              name="adjustment"
              type="text"
              placeholder="Ví dụ: ngắn hơn, giọng điệu trẻ trung hơn"
              className={INPUT_CLASS}
            />
          </label>
          <p className="text-xs text-slate-500">
            Sinh lại sẽ ghi đè nội dung hiện tại, kể cả phần bạn đã sửa. Mất khoảng 10–60 giây.
          </p>
          <button
            type="submit"
            disabled={isRegenerating}
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {isRegenerating ? "Đang sinh lại…" : "Sinh lại"}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Đăng lên Facebook</h2>
        <form action={publishFormAction} className="space-y-3">
          <ErrorBanner message={publishState?.error} />
          <input type="hidden" name="postId" value={postId} />
          <label className="block text-sm" htmlFor="scheduledPublishTime">
            <span className="font-medium text-slate-700">Hẹn giờ đăng (để trống = đăng ngay)</span>
            <input
              id="scheduledPublishTime"
              name="scheduledPublishTime"
              type="datetime-local"
              className={INPUT_CLASS}
            />
          </label>
          <p className="text-xs text-slate-500">
            Nếu hẹn giờ, thời điểm đăng phải cách hiện tại từ 10 phút đến 75 ngày (giới hạn của
            Facebook).
          </p>
          <button
            type="submit"
            disabled={isPublishing || !canPublish}
            className="inline-flex min-h-11 items-center rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {isPublishing ? "Đang đăng…" : "Đăng lên Facebook"}
          </button>
          {!canPublish && (
            <p className="text-xs text-slate-500">
              Cần có ảnh và nội dung trước khi đăng lên Facebook.
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Write the review page**

Create `app/admin/social-posts/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusChip, type StatusChipTone } from "@/components/admin/status-chip";
import { SocialPostReviewForm } from "@/components/admin/social-post-review-form";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";
import {
  publishSocialPost,
  regenerateSocialPost,
  updateSocialPostCaption,
} from "@/src/features/social-posts/admin-actions";
import { getSocialPost } from "@/src/features/social-posts/queries";
import { effectiveCaption } from "@/src/features/social-posts/types";
import { isUuid } from "@/src/features/social-posts/schema";

export const dynamic = "force-dynamic";

function statusTone(status: string): StatusChipTone {
  if (status === "posted" || status === "scheduled") return "success";
  if (status === "failed") return "danger";
  return "warning";
}

type PageProps = {
  // Next.js 16: params is a Promise and must be awaited.
  params: Promise<{ id: string }>;
};

export default async function SocialPostReviewPage({ params }: PageProps) {
  const { id } = await params;

  if (!isUuid(id)) notFound();

  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "social_posts:manage");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return (
        <div>
          <AdminPageHeader title="Bài đăng Facebook" />
          <p className="text-sm text-slate-600">Bạn không có quyền quản lý bài đăng Facebook.</p>
        </div>
      );
    }
    throw error;
  }

  const post = await getSocialPost(client, id);
  if (!post) notFound();

  const caption = effectiveCaption(post);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Duyệt bài đăng"
        description="Kiểm tra và chỉnh sửa nội dung trước khi đăng lên Facebook."
        action={
          <Link href="/admin/social-posts" className="text-sm font-medium text-teal-700">
            ← Danh sách bài đăng
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <StatusChip value={post.status} tone={statusTone(post.status)} />
        {post.generationMs !== null && <span>Sinh trong {Math.round(post.generationMs / 1000)}s</span>}
        {post.fbPostId && <span>Mã bài Facebook: {post.fbPostId}</span>}
        {post.scheduledPublishTime && (
          <span>Hẹn đăng: {post.scheduledPublishTime.slice(0, 16).replace("T", " ")}</span>
        )}
      </div>

      {post.errorMessage && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {post.errorMessage}
        </p>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-800">Ý tưởng</h2>
        <p className="whitespace-pre-wrap text-sm text-slate-700">{post.idea}</p>
      </section>

      {post.imageUrl && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-800">Ảnh</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.imageUrl} alt="Ảnh bài đăng" className="max-h-64 rounded-lg border" />
        </section>
      )}

      <SocialPostReviewForm
        postId={post.id}
        caption={caption}
        canPublish={Boolean(post.imageUrl) && caption.length > 0}
        updateAction={updateSocialPostCaption}
        regenerateAction={regenerateSocialPost}
        publishAction={publishSocialPost}
      />
    </div>
  );
}
```

- [ ] **Step 3: Write the list page**

Create `app/admin/social-posts/page.tsx`:

```tsx
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { StatusChip, type StatusChipTone } from "@/components/admin/status-chip";
import { AdminAuthorizationError, requireAdminPermission } from "@/src/features/admin/auth";
import { createServerClient } from "@/src/lib/supabase/server";
import { deleteSocialPost } from "@/src/features/social-posts/admin-actions";
import { listSocialPosts } from "@/src/features/social-posts/queries";
import { effectiveCaption } from "@/src/features/social-posts/types";

export const dynamic = "force-dynamic";

type PostRow = {
  id: string;
  createdAt: string;
  idea: string;
  preview: string;
  status: string;
};

function statusTone(status: string): StatusChipTone {
  if (status === "posted" || status === "scheduled") return "success";
  if (status === "failed") return "danger";
  return "warning";
}

async function getPageData() {
  const client = await createServerClient();

  try {
    await requireAdminPermission(client, "social_posts:manage");
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return { access: "denied" as const };
    throw error;
  }

  const posts = await listSocialPosts(client);

  return {
    access: "allowed" as const,
    rows: posts.map((post) => ({
      id: post.id,
      createdAt: post.createdAt.slice(0, 16).replace("T", " "),
      idea: post.idea.length > 60 ? `${post.idea.slice(0, 60)}…` : post.idea,
      preview: effectiveCaption(post).slice(0, 80),
      status: post.status,
    })),
  };
}

export default async function SocialPostsPage() {
  const data = await getPageData();

  if (data.access === "denied") {
    return (
      <div>
        <AdminPageHeader title="Bài đăng Facebook" />
        <p className="text-sm text-slate-600">Bạn không có quyền quản lý bài đăng Facebook.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Bài đăng Facebook"
        description="Sinh nội dung bài đăng bằng AI, duyệt lại rồi đăng lên Facebook."
        action={
          <div className="flex items-center gap-4">
            <Link href="/admin/social-posts/templates" className="text-sm font-medium text-teal-700">
              Mẫu prompt
            </Link>
            <Link
              href="/admin/social-posts/new"
              className="inline-flex min-h-9 items-center rounded-lg bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Tạo bài đăng
            </Link>
          </div>
        }
      />

      <AdminDataTable<PostRow>
        columns={[
          { key: "createdAt", label: "Thời gian" },
          { key: "idea", label: "Ý tưởng" },
          { key: "preview", label: "Nội dung" },
          {
            key: "status",
            label: "Trạng thái",
            render: (row) => <StatusChip value={row.status} tone={statusTone(row.status)} />,
          },
        ]}
        rows={data.rows}
        emptyMessage="Chưa có bài đăng nào."
        actionsSlot={(row) => (
          <div className="flex items-center gap-3">
            <Link href={`/admin/social-posts/${row.id}`} className="text-sm font-medium text-teal-700">
              Duyệt
            </Link>
            <form action={deleteSocialPost}>
              <input type="hidden" name="postId" value={row.id} />
              <button type="submit" className="text-sm font-medium text-red-700">
                Xoá
              </button>
            </form>
          </div>
        )}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify the build compiles, lint and the full suite pass**

Run: `pnpm test && pnpm lint && pnpm build`
Expected: PASS.

- [ ] **Step 5: Manual smoke test**

Run: `pnpm dev`, then:
1. Visit `http://localhost:3000/admin/social-posts` — the list renders empty with a "Tạo bài đăng" button.
2. Click "Tạo bài đăng", pick the seeded template, enter an idea of at least 10 characters, upload a product photo, keep "Cho AI xem ảnh" checked, submit.
3. Expect a redirect to the review page within ~60s, with a Vietnamese caption present and no error banner.
4. If the banner reads `agy bị từ chối quyền: …`, the `read_file` allow-rule does not cover `SOCIAL_POST_IMAGE_DIR` — fix the rule rather than the code.
5. Edit the caption, save, and confirm the edit survives a page reload.

- [ ] **Step 6: Commit**

```bash
git add components/admin/social-post-review-form.tsx \
        app/admin/social-posts/[id]/page.tsx \
        app/admin/social-posts/page.tsx
git commit -m "feat(social-posts): add review page and post list"
```

---

### Task 14: Operator documentation

**Files:**
- Create: `docs/social-post-generator.md`
- Modify: `docs/developer-guide.md` (add a link in its feature list)

**Interfaces:**
- Consumes: everything above
- Produces: no code

The spec flags deployment as the one unresolved risk: `agy` lives in `~/.local/bin` with credentials in `~/.gemini/`, and the production container has neither. This task writes that down where an operator will find it.

- [ ] **Step 1: Write the operator guide**

Create `docs/social-post-generator.md`:

```markdown
# Facebook Post Generator — Setup & Operations

Admin page: **/admin/social-posts** (permission `social_posts:manage`,
granted to `super_admin` and `marketing`).

## How it works

1. Admin picks a prompt template, types an idea, uploads an image.
2. The image is written to **two** destinations: Supabase Storage (`media`
   bucket, `social/` prefix) for Facebook and the preview, and
   `SOCIAL_POST_IMAGE_DIR` on local disk so the `agy` CLI can read it.
3. A server action runs `agy -p … --output-format json --add-dir …`
   synchronously (10–60s) and parses the JSON envelope.
4. The admin reviews and edits the caption, then publishes or schedules it
   to the Facebook Page via the Graph API.

## Environment

| Variable | Purpose |
|---|---|
| `SOCIAL_POST_IMAGE_DIR` | Where uploaded images are written for `agy` to read |
| `AGY_BIN_PATH` | Absolute path to the `agy` binary (defaults to `agy` on PATH) |
| `FACEBOOK_PAGE_ID` | Target Page id |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Long-lived Page token, scope `pages_manage_posts` |

## agy permission configuration (required)

`agy` runs headless and therefore **cannot prompt** for tool permissions — it
auto-denies them. Vision needs a `read_file` allow-rule in
`~/.gemini/antigravity-cli/settings.json` for the user the Next.js process
runs as:

```json
{
  "permissions": { "allow": ["read_file(/var/lib/social-post-images/**)"] }
}
```

The target MUST cover `SOCIAL_POST_IMAGE_DIR`.

**Never use `--dangerously-skip-permissions`.** It auto-approves every tool,
which would let an admin web request run arbitrary shell commands on the
host. The `command` permission stays denied; the prompt is written to steer
`agy` away from it.

### Diagnosing generation failures

| Admin-facing message | Cause |
|---|---|
| `agy bị từ chối quyền: read_file` | The allow-rule does not cover `SOCIAL_POST_IMAGE_DIR` |
| `agy bị từ chối quyền: command` | `agy` tried to shell out; check the prompt still contains the absolute path and the no-shell clause |
| `agy không trả về nội dung bài đăng` | The model replied without the `<<<POST>>>` delimiters and the fallback was empty |
| `Chưa cấu hình FACEBOOK_PAGE_ID…` | Facebook env vars missing |
| `Facebook từ chối: Invalid OAuth access token` | Page token expired — reissue it |

## Deployment (IMPORTANT)

On a developer machine `agy` is at `~/.local/bin/agy` with credentials in
`~/.gemini/antigravity-cli/`. **The production container has neither**, so
generation will fail there until all of the following are true:

1. The `agy` binary is available in the container and `AGY_BIN_PATH` points at it.
2. `~/.gemini/antigravity-cli/` (credentials **and** the `permissions.allow`
   rule) is mounted for the container's user.
3. `SOCIAL_POST_IMAGE_DIR` is a writable volume whose path is covered by that
   allow-rule.

Publishing to Facebook and reviewing drafts do not depend on `agy`; only
generation does.

## Known limitations

- Generation is synchronous. A reverse proxy with a timeout below ~90s may
  show a gateway error even when generation succeeded — the draft is still
  saved, so reload the review page before retrying. If this recurs, move
  generation to the background-job pattern used by `shop_sync_runs`.
- Single image per post; no carousel or video.
- Scheduled posts are handed to Facebook, which owns the publish. Cancelling
  a scheduled post must be done in Meta Business Suite.
```

- [ ] **Step 2: Link it from the developer guide**

Add a line to the feature list in `docs/developer-guide.md`:

```markdown
- [Facebook Post Generator](./social-post-generator.md) — AI-generated Facebook sales posts (admin)
```

- [ ] **Step 3: Commit**

```bash
git add docs/social-post-generator.md docs/developer-guide.md
git commit -m "docs(social-posts): add setup, permission and deployment guide"
```
