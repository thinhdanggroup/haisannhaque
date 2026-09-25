---
name: prod-smoke-test
description: Use right after deploying to production (scripts/deploy.sh on 110.172.28.198) or when asked to check that https://haisannhaque.com still works — runs a read-only browser smoke test of the live storefront at desktop and mobile width and reviews the screenshots.
---

# Production smoke test

Run this after every production deploy, once `scripts/deploy.sh` has finished.

**Read-only.** Production data is real: do not submit forms, add to cart,
check out, log in, or open admin pages. Never point `tests/e2e/*` at
production; those specs place orders and change admin data.

## Steps

1. **Confirm the deploy landed.** The commit on the server must match the one
   you pushed:

   ```bash
   ssh thinhda@110.172.28.198 'cd ~/haisannhaque && git log --oneline -1'
   ```

2. **Run the smoke script:**

   ```bash
   SMOKE_OUT_DIR=<scratchpad>/smoke node scripts/smoke-prod.mjs
   ```

   It opens `/`, the first category, the first product, `/search?q=cua` and
   `/cart` at 1280px and 390px width. A page fails on an HTTP error, a JS
   exception, a console error, a missing `<header>`/`<footer>`, a broken
   eager image, or horizontal scroll. The script exits non-zero on any failure.

3. **Look at the screenshots.** Read the homepage and any changed page at
   both widths. Check that whatever the deploy was meant to change is visible
   (or gone), and that nothing nearby broke. A passing script doesn't prove
   the page looks right.

4. **Check the change itself.** If the deploy touched a specific page or
   string, `curl -s https://haisannhaque.com/<path> | grep -c '<text>'` it.

5. **Report** each page as PASS/FAIL, with the commit hash and what the
   screenshots showed.

## Known noise

- If you run it within about a minute of a deploy, expect failures while the
  container is still booting. Wait and run it again before calling it a
  regression.
- As of 2026-09-25, cold homepage loads sometimes get `503` on
  `/_next/static/chunks/*.js`. The same chunk returns `200` right after, and the
  nginx logs show no 503s, so the cause isn't known yet. If it's still the
  only failure after one rerun, report it as this known issue rather than a
  new regression.
