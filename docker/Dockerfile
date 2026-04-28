# syntax=docker/dockerfile:1.7
#
# Multi-stage Dockerfile for TFSA analysis docs.
#
# Build-arg SERVER_TYPE selects the runtime:
#   nginx         Nginx serving static files (no auth)
#   nginx-auth    Nginx + Basic auth (htpasswd from BASIC_AUTH_USER / BASIC_AUTH_PASS)
#
# Example:
#   docker build --build-arg SERVER_TYPE=nginx-auth \
#                --build-arg BASIC_AUTH_USER=lapa \
#                --build-arg BASIC_AUTH_PASS=lapaTF \
#                -t docs-web .

ARG SERVER_TYPE=nginx

# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

# git is required by VitePress for lastUpdated timestamps
RUN apt-get update && apt-get install -y --no-install-recommends git \
 && rm -rf /var/lib/apt/lists/*

# Use pnpm via corepack (faster install, deterministic)
RUN corepack enable

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY docs/ ./docs/
COPY scripts/ ./scripts/
COPY tsconfig.json ./

RUN pnpm run docs:print && pnpm run docs:build

# ── Stage 2a: nginx (no auth) ─────────────────────────────────────────────────
FROM node:22-slim AS runner-nginx

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends nginx \
 && rm -rf /var/lib/apt/lists/*

COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY --from=builder /app/docs/.vitepress/dist /app/docs/.vitepress/dist

ENV PORT=8080
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]

# ── Stage 2b: nginx + Basic auth ──────────────────────────────────────────────
FROM node:22-slim AS runner-nginx-auth

ARG BASIC_AUTH_USER
ARG BASIC_AUTH_PASS

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends nginx apache2-utils \
 && rm -rf /var/lib/apt/lists/*

# Generate htpasswd from build args. If empty, the build fails — fail fast rather
# than ship an unauthenticated production image when auth was expected.
RUN test -n "$BASIC_AUTH_USER" || (echo "BASIC_AUTH_USER must be set" >&2 && exit 1)
RUN test -n "$BASIC_AUTH_PASS" || (echo "BASIC_AUTH_PASS must be set" >&2 && exit 1)
RUN htpasswd -bc /etc/nginx/.htpasswd "$BASIC_AUTH_USER" "$BASIC_AUTH_PASS"

COPY docker/nginx-auth.conf /etc/nginx/sites-available/default
COPY --from=builder /app/docs/.vitepress/dist /app/docs/.vitepress/dist

ENV PORT=8080
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]

# ── Final stage selector ──────────────────────────────────────────────────────
# Resolves SERVER_TYPE → one of the runner-* stages.
FROM runner-${SERVER_TYPE} AS final
