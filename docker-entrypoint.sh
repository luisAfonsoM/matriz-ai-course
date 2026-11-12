#!/bin/sh
set -e

echo "=========================================================="
echo "🚀 [Matriz] Inicialização do Contentor Docker"
echo "=========================================================="

# 1. Garantir que a diretoria da base de dados existe
if [ -n "$DATABASE_URL" ]; then
  DB_PATH=$(echo "$DATABASE_URL" | sed 's|^file:||')
  DB_DIR=$(dirname "$DB_PATH")
  if [ -n "$DB_DIR" ] && [ "$DB_DIR" != "." ]; then
    mkdir -p "$DB_DIR"
  fi
fi

# 2. Executar migrações relacionais pendentes do Prisma
echo "📦 [Matriz] A aplicar migrações da base de dados (prisma migrate deploy)..."
npx prisma migrate deploy

# 3. Executar seed idempotente para garantir contas de demonstração
echo "🌱 [Matriz] A verificar dados iniciais de demonstração (seed)..."
if [ -f "prisma/dist/seed.js" ]; then
  node prisma/dist/seed.js || echo "⚠️ Seed já aplicado ou ignorado."
elif [ -f "prisma/seed.js" ]; then
  node prisma/seed.js || echo "⚠️ Seed já aplicado ou ignorado."
else
  node prisma/seed.ts 2>/dev/null || echo "⚠️ Seed já aplicado ou ignorado."
fi

echo "✅ [Matriz] Base de dados configurada. A iniciar servidor Next.js..."
echo "=========================================================="

exec "$@"
