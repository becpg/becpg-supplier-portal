# =============================================================================
# beCPG Supplier Portal — single Next.js standalone image
#
# Unlike becpg-regulatory there is NO Java backend here (spec §5.1.1): the
# route handlers under app/api/* ARE the proxy. One runtime, one image, one
# release cycle.
#
# Build:
#   docker build -t becpg-supplier-portal:latest --build-arg PORTAL_VERSION=0.0.1 .
#
# No NEXT_PUBLIC_* build arg exists on purpose: authentication is server side
# only, so nothing about OIDC, the tenant map or beCPG is baked into the
# client bundle. Everything is read from the container environment at runtime.
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1 — dependencies
# -----------------------------------------------------------------------------
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
        npm ci; \
    else \
        npm install --no-audit --no-fund; \
    fi

# -----------------------------------------------------------------------------
# Stage 2 — build (produces .next/standalone)
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

ARG PORTAL_VERSION=dev
ENV PORTAL_VERSION=${PORTAL_VERSION}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `public/` is optional in this repo; make sure the runner COPY below never fails.
RUN mkdir -p public && npm run build

# -----------------------------------------------------------------------------
# Stage 3 — runner
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner

ARG PORTAL_VERSION=dev

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORTAL_VERSION=${PORTAL_VERSION}
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 portal && \
    adduser -S -G portal -u 1001 -h /app portal

# Standalone output already embeds the traced node_modules and a server.js.
COPY --from=builder --chown=portal:portal /app/.next/standalone ./
COPY --from=builder --chown=portal:portal /app/.next/static ./.next/static
COPY --from=builder --chown=portal:portal /app/public ./public

USER portal

EXPOSE 3000

# busybox wget is part of the alpine base image — no extra package needed.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --quiet --tries=1 --spider "http://127.0.0.1:${PORT}/api/health" || exit 1

CMD ["node", "server.js"]
