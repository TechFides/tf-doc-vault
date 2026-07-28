# Project Dockerfile: multi-stage builder with a selectable runtime.
# SERVER_TYPE selects the runtime stage: nginx | nginx-auth.
# Default for this project is set below; override at build with --build-arg.

ARG SERVER_TYPE=__SERVER_TYPE__

# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:24-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN corepack enable

# Optional CI job token used to fetch git+ssh dependencies over HTTPS in CI.
# Empty in local builds, where deps have to be pre-fetched: Docker does not
# forward the developer's SSH agent, so use the GitLab npm registry instead.
ARG GITLAB_CI_TOKEN=""

# pnpm-workspace.yaml carries allowBuilds (esbuild); without it the build stage
# fails on ERR_PNPM_IGNORED_BUILDS.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
RUN if [ -n "$GITLAB_CI_TOKEN" ]; then \
      git config --global url."https://gitlab-ci-token:${GITLAB_CI_TOKEN}@gitlab.com/".insteadOf "ssh://git@gitlab.com/"; \
      git config --global url."https://gitlab-ci-token:${GITLAB_CI_TOKEN}@gitlab.com/".insteadOf "git@gitlab.com:"; \
    fi \
 && pnpm install --frozen-lockfile \
 && rm -f /root/.gitconfig

COPY docs/ ./docs/
COPY tsconfig.json ./

RUN pnpm run docs:print && pnpm run docs:build

# ── Stage 2a: nginx ───────────────────────────────────────────────────────────
FROM node:24-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS runner-nginx

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends nginx \
 && rm -rf /var/lib/apt/lists/*

COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY --from=builder /app/docs/.vitepress/dist /app/docs/.vitepress/dist

ENV PORT=8080
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]

# ── Stage 2b: nginx + Basic auth ──────────────────────────────────────────────
FROM node:24-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d AS runner-nginx-auth

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
