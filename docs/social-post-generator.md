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
auto-denies them. Vision needs **all four** of these to avoid permission denials:

1. A `read_file(<image-dir>/**)` rule under `permissions.allow` in `~/.gemini/antigravity-cli/settings.json`
2. `--add-dir <SOCIAL_POST_IMAGE_DIR>` on the `agy` invocation
3. An **absolute** image path in the prompt (a relative path causes `agy` to explore the directory via its shell tool)
4. The literal instruction *"Use ONLY your file-reading tool to read that image. Do NOT run any shell command."* in the prompt

Items 2–4 are already handled in code (`generator/agy-generator.ts` and `prompt-builder.ts`).
The operator only needs to configure item 1.

Example allow-rule for `~/.gemini/antigravity-cli/settings.json`:

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

## Publishing and scheduling

The admin reviews the generated caption and can either publish immediately or schedule
a post for a future date.

### Scheduling timezone behaviour

- The admin picks a date/time using a `datetime-local` input in the browser.
- The **browser** converts this to an absolute UTC instant before submitting, so the time 
  the admin sees is in **their own** timezone — not the server's.
- This matters because the server process typically runs in UTC (e.g. in a container), and
  an earlier version that submitted the raw `datetime-local` value would have shifted every
  scheduled post by the admin's UTC offset (7 hours for Vietnam).
- Facebook's window is 10 minutes to 75 days from now, validated before the Graph API call.
- Cancelling a scheduled post must be done in Meta Business Suite — Facebook owns the post once it's accepted.

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
