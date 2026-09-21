# Debian (glibc) rather than Alpine (musl) throughout: the agy CLI installed in
# the runner stage ships glibc builds only — the release server returns 404 for
# every linux_*_musl manifest — so an Alpine base cannot run it at all. Keeping
# every stage on the same libc avoids native modules (sharp) being built against
# musl in deps/ and then loaded against glibc at runtime.
FROM node:22-bookworm-slim AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.5.2 --activate
# pnpm-workspace.yaml carries onlyBuiltDependencies; without it pnpm 10 skips
# sharp's build script and next/image optimization fails at runtime.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-bookworm-slim AS builder
WORKDIR /app

ARG NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

RUN corepack enable && corepack prepare pnpm@10.5.2 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

# chromium: used by the ShopeeFood sync. curl: used by the agy installer below.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      fonts-freefont-ttf \
      ca-certificates \
      curl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# Debian names the binary chromium; Alpine called it chromium-browser.
ENV SHOPEEFOOD_SYNC_CHROMIUM_PATH=/usr/bin/chromium

# agy CLI — writes the Facebook post captions for /admin/social-posts.
# The installer drops the binary at $HOME/.local/bin/agy and is non-interactive.
# NOTE: this bakes in the binary only. Credentials are NOT baked in: ~/.gemini is
# bind-mounted at runtime (see docker-compose.prod.yml), so no account material
# ends up in the image layers.
RUN curl -fsSL https://antigravity.google/cli/install.sh | bash \
    && /root/.local/bin/agy --version

# Point the app at the binary explicitly rather than relying on PATH, which the
# installer only sets via shell profiles that a non-login CMD never sources.
ENV AGY_BIN_PATH=/root/.local/bin/agy
# Must match the read_file allow-rule inside the mounted ~/.gemini settings.json.
ENV SOCIAL_POST_IMAGE_DIR=/var/lib/social-post-images

RUN corepack enable && corepack prepare pnpm@10.5.2 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/next-env.d.ts ./next-env.d.ts

EXPOSE 3000
CMD ["pnpm", "start"]
