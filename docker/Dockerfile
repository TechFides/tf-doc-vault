# syntax=docker/dockerfile:1.24@sha256:87999aa3d42bdc6bea60565083ee17e86d1f3339802f543c0d03998580f9cb89
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
FROM node:24-slim@sha256:cb4e8f7c443347358b7875e717c29e27bf9befc8f5a26cf18af3c3dec80e58c5 AS builder

WORKDIR /app

# git is required by VitePress for lastUpdated timestamps
RUN apt-get update && apt-get install -y --no-install-recommends git \
 && rm -rf /var/lib/apt/lists/*

# corepack pins the pnpm version declared in package.json.
RUN corepack enable

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY docs/ ./docs/
COPY scripts/ ./scripts/
COPY tsconfig.json ./

RUN pnpm run docs:print && pnpm run docs:build

# ── Stage 2a: nginx (no auth) ─────────────────────────────────────────────────
FROM node:24-slim@sha256:cb4e8f7c443347358b7875e717c29e27bf9befc8f5a26cf18af3c3dec80e58c5 AS runner-nginx

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends nginx \
 && rm -rf /var/lib/apt/lists/*

COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY --from=builder /app/docs/.vitepress/dist /app/docs/.vitepress/dist

ENV PORT=8080
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]

# ── Stage 2b: nginx + Basic auth ──────────────────────────────────────────────
FROM node:24-slim@sha256:cb4e8f7c443347358b7875e717c29e27bf9befc8f5a26cf18af3c3dec80e58c5 AS runner-nginx-auth

ARG BASIC_AUTH_USER
ARG BASIC_AUTH_PASS

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends nginx apache2-utils \
 && rm -rf /var/lib/apt/lists/*

# Generate htpasswd from the build args. With none set the file comes out empty,
# so the stage still builds (the legacy builder builds every stage) while runtime
# auth rejects every request, which is fail-secure.
RUN if [ -n "$BASIC_AUTH_USER" ] && [ -n "$BASIC_AUTH_PASS" ]; then \
      htpasswd -bc /etc/nginx/.htpasswd "$BASIC_AUTH_USER" "$BASIC_AUTH_PASS"; \
    else \
      touch /etc/nginx/.htpasswd; \
    fi

COPY docker/nginx-auth.conf /etc/nginx/sites-available/default
COPY --from=builder /app/docs/.vitepress/dist /app/docs/.vitepress/dist

ENV PORT=8080
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]

# ── Final stage selector ──────────────────────────────────────────────────────
# Resolves SERVER_TYPE to one of the runner-* stages.
FROM runner-${SERVER_TYPE} AS final
