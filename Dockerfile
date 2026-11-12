# ==============================================================================
# Dockerfile Multi-Stage para Plataforma Matriz (Next.js 14 Standalone + Prisma)
# ==============================================================================

# 1. Base com Node.js 20 em Alpine Linux
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# 2. Instalação de Dependências
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --fetch-retries 5 --fetch-retry-mintimeout 20000

# 3. Compilação da Aplicação
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /app/public
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npx tsc prisma/seed.ts --target ES2022 --module NodeNext --moduleResolution NodeNext --outDir prisma/dist
RUN npm run build

# 4. Imagem Final de Produção (Runner)
FROM base AS runner
RUN apk add --no-cache libc6-compat openssl curl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Criação de utilizador e grupo não-root para segurança
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Cópia dos artefactos compilados (Next.js Standalone)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Cópia do esquema, migrações e dependências para suporte a migrações e seed
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Script de entrada para migrações e arranque
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh

# Garantir permissões de escrita para a base de dados SQLite
RUN mkdir -p /app/prisma && chown -R nextjs:nodejs /app/prisma

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
