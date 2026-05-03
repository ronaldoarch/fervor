# AGENTS.md

## Cursor Cloud specific instructions

### Visão geral

Fervor (Fervô) é um agente de IA para análise de tendências culturais — um app full-stack (React + Express + PostgreSQL) que analisa observações culturais pela lente do Materialismo Cultural e gera estratégias acionáveis.

### Serviços

| Serviço | Porta | Comando |
|---------|-------|---------|
| PostgreSQL 16 | 5432 | `docker compose up -d` |
| Backend Express.js | 3001 | `npm run server` |
| Frontend Vite (dev) | 5173 | `npm run dev` |
| Ambos (backend+frontend) | 3001+5173 | `npm run dev:all` |

### Variáveis de ambiente

Copie `.env.example` para `.env` e configure:
- `DATABASE_URL` — string de conexão PostgreSQL (padrão docker-compose: `postgresql://fervor:fervor@localhost:5432/fervor`)
- `JWT_SECRET` — string de 32+ caracteres para assinatura de tokens
- `OPENAI_API_KEY` — necessária para o chat com IA (sem ela, o backend retorna 401 em `/api/chat`; o frontend tem fallback heurístico)

### Iniciar serviços para desenvolvimento

1. Iniciar Docker daemon se não estiver rodando: `dockerd &`
2. Subir PostgreSQL: `docker compose up -d`
3. Aguardar Postgres ficar pronto: `docker exec workspace-postgres-1 pg_isready -U fervor`
4. Rodar migrations (idempotente): `npm run db:migrate`
5. Iniciar tudo: `npm run dev:all`

### Cuidados importantes

- O script `prisma/seed.js` NÃO carrega o `.env` automaticamente. Use `DATABASE_URL=... node prisma/seed.js` ou garanta que `DATABASE_URL` esteja exportada no shell.
- O backend (`server/index.js`) lê o `.env` com um parser manual — NÃO usa `dotenv/config`. A verificação de `DATABASE_URL` acontece antes do startup; o servidor faz `process.exit(1)` se estiver ausente.
- TypeScript (`npx tsc --noEmit`) tem alguns erros pré-existentes não bloqueantes em `processor.ts` e arquivos utilitários. O build do Vite os ignora; o projeto não tem configuração de ESLint.
- Docker em VMs do Cloud Agent requer storage driver `fuse-overlayfs` e `iptables-legacy`.
- Credenciais demo após seed: `admin@fervor.com` / `admin123`.

### Testes e build

- Build: `npm run build` (build de produção Vite)
- Type check: `npx tsc --noEmit` (tem warnings pré-existentes, não bloqueantes)
- Verificar conexão com banco: `npm run check-db`
- Não existe suite de testes automatizados neste repositório.
