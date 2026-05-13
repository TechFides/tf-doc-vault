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
FROM node:24-slim@sha256:24dc26ef1e3c3690f27ebc4136c9c186c3133b25563ae4d7f0692e4d1fe5db0e AS builder

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
FROM node:24-slim@sha256:24dc26ef1e3c3690f27ebc4136c9c186c3133b25563ae4d7f0692e4d1fe5db0e AS runner-nginx

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends nginx \
 && rm -rf /var/lib/apt/lists/*

COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY --from=builder /app/docs/.vitepress/dist /app/docs/.vitepress/dist

ENV PORT=8080
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]

# ── Stage 2b: nginx + Basic auth ──────────────────────────────────────────────
FROM node:24-slim@sha256:24dc26ef1e3c3690f27ebc4136c9c186c3133b25563ae4d7f0692e4d1fe5db0e AS runner-nginx-auth

ARG BASIC_AUTH_USER
ARG BASIC_AUTH_PASS

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends nginx apache2-utils \
 && rm -rf /var/lib/apt/lists/*

# Generate htpasswd from build args. Pokud nejsou nastavené, vytvoří se prázdný
# soubor — stage se postaví v pohodě (důležité u legacy builderu, který staví
# všechny stage), ale runtime auth zablokuje všechny požadavky (fail-secure).
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
# Resolves SERVER_TYPE → one of the runner-* stages.
FROM runner-${SERVER_TYPE} AS final
