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

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN yarn build

# ───── Runner ───────────────────────────────────────────────────────────
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
