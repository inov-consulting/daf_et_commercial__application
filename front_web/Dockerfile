# syntax=docker/dockerfile:1.7
# ───── Base : Node.js 20 ───────────────────────────────────────────────
FROM node:20-alpine AS base

WORKDIR /app

# ───── Dependencies ─────────────────────────────────────────────────────
FROM base AS deps

COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile || yarn install

# ───── Builder ──────────────────────────────────────────────────────────
FROM base AS builder

# Build avec des placeholders qui seront remplacés au runtime
ENV NEXT_PUBLIC_API_BASE_URL=__NEXT_PUBLIC_API_BASE_URL__
ENV NEXT_PUBLIC_KEYCLOAK_URL=__NEXT_PUBLIC_KEYCLOAK_URL__
ENV NEXT_PUBLIC_KEYCLOAK_REALM=__NEXT_PUBLIC_KEYCLOAK_REALM__
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=__NEXT_PUBLIC_KEYCLOAK_CLIENT_ID__

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN mkdir -p public && yarn build

# ───── Runner ───────────────────────────────────────────────────────────
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000

# Installer sed pour l'injection runtime
RUN apk add --no-cache sed

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copier et configurer l'entrypoint
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
