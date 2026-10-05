FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@9.5.0

FROM base AS dependencies
COPY pnpm-lock.yaml* pnpm-workspace.yaml package.json turbo.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder
COPY apps/api/ ./apps/api/
RUN pnpm --filter @taskmaster/shared build
RUN pnpm --filter @taskmaster/api build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 taskmaster

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages ./packages
COPY --from=dependencies /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

USER taskmaster
EXPOSE 5000
CMD ["node", "apps/api/dist/server.js"]
