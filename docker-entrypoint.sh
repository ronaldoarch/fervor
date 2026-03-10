#!/bin/sh
set -e

echo "[Fervor] Aplicando migrações do banco..."
npx prisma migrate deploy

KNOWLEDGE_FILE="/app/data/knowledge.json"
if [ ! -f "$KNOWLEDGE_FILE" ] && [ -n "$OPENAI_API_KEY" ]; then
  echo "[Fervor] knowledge.json não encontrado. Gerando base RAG (ingest)..."
  if npm run ingest; then
    echo "[Fervor] Base RAG gerada com sucesso."
  else
    echo "[Fervor] Aviso: ingest falhou ou não há fontes em data/. RAG desativado."
  fi
elif [ -f "$KNOWLEDGE_FILE" ]; then
  echo "[Fervor] Base RAG encontrada (knowledge.json)."
else
  echo "[Fervor] Aviso: OPENAI_API_KEY não configurada ou data/ vazia. RAG desativado."
fi

echo "[Fervor] Iniciando servidor..."
exec node server/index.js
