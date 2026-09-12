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
| `agy không trả về nội dung bài đăng.` | The model replied without the `<<<POST>>>` delimiters and the fallback was empty |
| `Sinh nội dung quá thời gian chờ (Ns)` | `agy` did not finish within the configured `--print-timeout` and was killed; retry, or investigate why generation is slow |
| `Không tạo được thư mục ảnh <dir>: …` | `SOCIAL_POST_IMAGE_DIR` could not be created (permissions, read-only volume) before spawning `agy` |
| `Chưa cấu hình FACEBOOK_PAGE_ID và FACEBOOK_PAGE_ACCESS_TOKEN` | Both Facebook env vars missing — check both are set |
| `Facebook từ chối: Invalid OAuth access token` | Page token expired — reissue it |

### Path containment — what it does and does not cover

`generateSocialPost` verifies that the uploaded image's resolved path sits
inside the configured `SOCIAL_POST_IMAGE_DIR` before handing it to `agy` in
vision mode; a request naming a path outside that directory (e.g. a forged
hidden field) is rejected before generation runs.

**This does not make the `read_file` allow-rule safe to widen.** The check
only closes the hidden-field vector. A prompt **template**'s body is free
text that any admin with `social_posts:manage` can edit, and it can name any
absolute path in prose — the containment check in code has no visibility
into that. Treat prompt templates as a semi-trusted input, and **never widen
the `read_file` allow-rule beyond `SOCIAL_POST_IMAGE_DIR`** on the theory
that the app-level check makes a broader rule safe. It does not.

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

### What is solved

The production image installs `agy` itself. `Dockerfile` runs the official
installer in the runner stage and pins `AGY_BIN_PATH=/root/.local/bin/agy`,
because the installer only puts the binary on `PATH` via shell profiles that a
non-login `CMD` never sources.

The image is Debian (`node:22-bookworm-slim`), **not** Alpine. This is not a
preference: `agy` ships glibc builds only. The release server returns HTTP 404
for every `linux_*_musl` manifest, so the installer cannot even run on Alpine,
and the binary could not exec there if it did. Two consequences of that base
change, both verified in the built image:

- chromium is `/usr/bin/chromium` on Debian (Alpine called it
  `chromium-browser`), so `SHOPEEFOOD_SYNC_CHROMIUM_PATH` changed with it.
- `sharp` resolves to the glibc native binaries (`@img/sharp-linux-x64`), not
  the musl ones, so `next/image` optimization keeps working.

### What is NOT solved: authentication

**Mounting `~/.gemini` does not authenticate `agy`.** This was tested directly:
with the whole directory bind-mounted into a container, `agy` still demands an
interactive Google OAuth login and exits with
`error: authentication failed or timed out`. Setting `GEMINI_API_KEY` does not
help either — the OAuth prompt is identical, so that string in the binary is not
an auth path.

`agy`'s credentials belong to the desktop **Antigravity IDE** installation
(`~/.config/Antigravity/`, alongside the login keyring), not to `~/.gemini`.
`~/.gemini` holds settings, logs, caches and conversation state — which is why
mounting it is still required for the `permissions.allow` rule, but is not
sufficient to log in.

The practical consequences for a server:

1. There is no documented non-interactive login. Authenticating on the server
   means running `agy` there and completing a browser OAuth flow within a
   60-second window, pasting the authorization code back over SSH.
2. It is **unverified** whether the resulting token persists anywhere on the
   mounted volume. If it lives with the IDE profile instead, every container
   restart would need the login repeating — which is not viable unattended.

Until that is resolved, treat generation as a feature that works on a developer
machine and not on the server.

### Degradation when `agy` is absent or unauthenticated

The rest of the feature still works: the pages render, an admin can write and
edit a caption by hand, and publishing or scheduling to Facebook is unaffected
because it goes through the Graph API, not `agy`. Only generation and
regeneration fail, and they fail with a legible Vietnamese error rather than a
blank one.

### The allow-rule must use the CONTAINER path

`SOCIAL_POST_IMAGE_DIR` is `/var/lib/social-post-images` **inside** the
container, backed by the `social-post-images` volume. `agy` resolves the
`read_file` rule from inside the container, so the rule in the mounted
`settings.json` must name that container path:

```json
{ "permissions": { "allow": ["read_file(/var/lib/social-post-images/**)"] } }
```

A rule naming the host path (`/home/<user>/...`) will not match, and vision
fails with `agy bị từ chối quyền: read_file`.

## Known limitations

- Generation is synchronous. A reverse proxy with a timeout below ~90s may
  show a gateway error even when generation succeeded — the draft is still
  saved, so reload the review page before retrying. If this recurs, move
  generation to the background-job pattern used by `shop_sync_runs`.
- Single image per post; no carousel or video.
- Scheduled posts are handed to Facebook, which owns the publish. Cancelling
  a scheduled post must be done in Meta Business Suite.
