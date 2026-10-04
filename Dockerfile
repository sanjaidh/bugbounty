# Multi-stage Dockerfile for CyberCarnival Bug Bountyy Platform

# ── Stage 1: Build All Workspaces ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL & native libraries required by Prisma ORM
RUN apk add --no-cache openssl ca-certificates libc6-compat

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root & package manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build packages and apps
ENV NODE_ENV=production
RUN pnpm run build

# ── Stage 2: API Server Runtime ────────────────────────────────────────────────
FROM node:20-alpine AS api-runner

WORKDIR /app

# Install OpenSSL & native libraries required by Prisma ORM
RUN apk add --no-cache openssl ca-certificates libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app /app

EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

CMD ["sh", "-c", "pnpm db:push && pnpm --filter db db:seed && pnpm --filter api start"]

# ── Stage 3: Web Frontend Nginx Runtime ────────────────────────────────────────
FROM nginx:alpine AS web-runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
