#!/bin/bash
# Gera web/.env.local a partir dos Codespaces Secrets
# Configure os secrets em: github.com/FelipePriet0/gest-omznet/settings/secrets/codespaces

ENV_FILE="web/.env.local"

if [ -f "$ENV_FILE" ]; then
  echo "✅ $ENV_FILE já existe, pulando."
  exit 0
fi

echo "📝 Criando $ENV_FILE a partir dos Codespaces Secrets..."

cat > "$ENV_FILE" <<EOF
NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}
EOF

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo ""
  echo "⚠️  ATENÇÃO: Secrets do Supabase não encontrados."
  echo "   Adicione em: github.com/FelipePriet0/gest-omznet/settings/secrets/codespaces"
  echo "   - NEXT_PUBLIC_SUPABASE_URL"
  echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
else
  echo "✅ $ENV_FILE criado com sucesso."
fi
