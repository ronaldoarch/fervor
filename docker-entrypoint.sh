#!/bin/sh
set -e

echo "[Fervô] Aplicando migrações do banco..."
npx prisma migrate deploy

KNOWLEDGE_FILE="/app/data/knowledge.json"
if [ ! -f "$KNOWLEDGE_FILE" ] && [ -n "$OPENAI_API_KEY" ]; then
  echo "[Fervô] knowledge.json não encontrado. Gerando base RAG (ingest)..."
  if npm run ingest; then
    echo "[Fervô] Base RAG gerada com sucesso."
  else
    echo "[Fervô] Aviso: ingest falhou ou não há fontes em data/. RAG desativado."
  fi
elif [ -f "$KNOWLEDGE_FILE" ]; then
  echo "[Fervô] Base RAG encontrada (knowledge.json)."
else
  echo "[Fervô] Aviso: OPENAI_API_KEY não configurada ou data/ vazia. RAG desativado."
fi

echo "[Fervô] Iniciando servidor..."
exec node server/index.js
