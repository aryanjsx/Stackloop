# Production Dockerfile for StackLoop Next.js Web Application
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --frozen-lockfile --filter @stackloop/web...

COPY apps/web ./apps/web
ARG NEXT_PUBLIC_API_URL=https://stackloop-api-c24oncfvua-uc.a.run.app
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_STANDALONE=1
ENV NODE_ENV=production
RUN pnpm --filter @stackloop/web build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=https://stackloop-api-c24oncfvua-uc.a.run.app
ENV PORT=8080
EXPOSE 8080

# Copy standalone server and client bundles
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

CMD ["node", "apps/web/server.js"]
