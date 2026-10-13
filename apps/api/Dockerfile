# Production Dockerfile for StackLoop Core Express API
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app

# Copy root workspace and package manifests
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/prisma ./apps/api/prisma

RUN pnpm install --frozen-lockfile --filter @stackloop/api...
RUN pnpm --filter @stackloop/api prisma:generate

COPY apps/api ./apps/api
RUN pnpm --filter @stackloop/api build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

WORKDIR /app/apps/api
CMD ["node", "dist/server.js"]
