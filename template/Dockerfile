# Project Dockerfile — multi-stage builder + selectable runtime.
# SERVER_TYPE selects the runtime stage: serve | nginx | nginx-auth.
# Default for this project is set below; override at build with --build-arg.

ARG SERVER_TYPE=__SERVER_TYPE__

# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN corepack enable

# Optional CI job token used to fetch git+ssh dependencies over HTTPS in CI.
# Empty in local builds (deps are then expected to be pre-fetched or accessible
# via the developer's SSH agent — but Docker doesn't forward that, so prefer
# the GitLab npm registry for non-CI builds).
ARG GITLAB_CI_TOKEN=""

COPY package.json pnpm-lock.yaml* ./
RUN if [ -n "$GITLAB_CI_TOKEN" ]; then \
      git config --global url."https://gitlab-ci-token:${GITLAB_CI_TOKEN}@gitlab.com/".insteadOf "ssh://git@gitlab.com/"; \
      git config --global url."https://gitlab-ci-token:${GITLAB_CI_TOKEN}@gitlab.com/".insteadOf "git@gitlab.com:"; \
    fi \
 && pnpm install --frozen-lockfile \
 && rm -f /root/.gitconfig

COPY docs/ ./docs/
COPY tsconfig.json ./

RUN pnpm run docs:print && pnpm run docs:build

# ── Stage 2a: serve ───────────────────────────────────────────────────────────
FROM node:22-slim AS runner-serve

WORKDIR /app
RUN npm install -g serve@14
COPY --from=builder /app/docs/.vitepress/dist ./dist

ENV PORT=8080
EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080", "--no-clipboard"]

# ── Stage 2b: nginx ───────────────────────────────────────────────────────────
FROM node:22-slim AS runner-nginx

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends nginx \
 && rm -rf /var/lib/apt/lists/*

COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY --from=builder /app/docs/.vitepress/dist /app/docs/.vitepress/dist

ENV PORT=8080
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]

# ── Stage 2c: nginx + Basic auth ──────────────────────────────────────────────
FROM node:22-slim AS runner-nginx-auth

ARG BASIC_AUTH_USER
ARG BASIC_AUTH_PASS

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends nginx apache2-utils \
 && rm -rf /var/lib/apt/lists/*

RUN test -n "$BASIC_AUTH_USER" || (echo "BASIC_AUTH_USER must be set" >&2 && exit 1)
RUN test -n "$BASIC_AUTH_PASS" || (echo "BASIC_AUTH_PASS must be set" >&2 && exit 1)
RUN htpasswd -bc /etc/nginx/.htpasswd "$BASIC_AUTH_USER" "$BASIC_AUTH_PASS"

COPY docker/nginx-auth.conf /etc/nginx/sites-available/default
COPY --from=builder /app/docs/.vitepress/dist /app/docs/.vitepress/dist

ENV PORT=8080
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]

# ── Final stage selector ──────────────────────────────────────────────────────
FROM runner-${SERVER_TYPE} AS final
