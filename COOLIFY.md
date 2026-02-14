# Fervor no Coolify

## Resources necessários

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| **CPU** | 0.5 vCPU | 1 vCPU |
| **RAM** | 512 MB | 1 GB |
| **Storage** | 100 MB | 200 MB |
| **Porta** | 3001 | 3001 |

O Fervor usa **PostgreSQL** para usuários e conversas. É necessário um banco de dados.

---

## Variáveis de ambiente (Environment Variables)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | URL do PostgreSQL (ex: `postgresql://user:pass@host:5432/fervor`) |
| `JWT_SECRET` | Sim | Chave para tokens JWT (gere com: `openssl rand -hex 32`) |
| `OPENAI_API_KEY` | Sim* | Chave da API OpenAI (sk-...) |
| `OPENAI_MODEL` | Não | Modelo (padrão: gpt-4o) |
| `OPENCLAW_GATEWAY_URL` | Não | URL do gateway OpenClaw |
| `OPENCLAW_GATEWAY_TOKEN` | Não | Token do gateway OpenClaw |
| `PORT` | Não | Porta interna (padrão: 3001) |

\* Se OpenClaw estiver configurado, a OpenAI é usada como fallback.

---

## Deploy no Coolify

### Opção 1: Docker Compose (recomendado)

Crie um PostgreSQL no Coolify e use a URL em `DATABASE_URL`. Ou use o compose abaixo:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: fervor
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: fervor
    volumes:
      - fervor_db:/var/lib/postgresql/data
    restart: unless-stopped

  fervor:
    build: .
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://fervor:${POSTGRES_PASSWORD}@postgres:5432/fervor
      - JWT_SECRET=${JWT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OPENAI_MODEL=${OPENAI_MODEL:-gpt-4o}
      - PORT=3001
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  fervor_db:
```

**Após o primeiro deploy**, rode o seed para criar o admin:

```bash
# Dentro do container fervor ou com DATABASE_URL configurada
npm run db:seed
```

Admin: `admin@fervor.com` / `admin123`

### Opção 2: Dockerfile + PostgreSQL externo

1. **Novo Resource** → **Dockerfile**
2. **Dockerfile Location**: `./Dockerfile`
3. **Port**: 3001
4. **Environment**: `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`
5. Crie um PostgreSQL no Coolify (ou use externo como Supabase, Neon, etc.)
6. Rode `npm run db:seed` após o deploy

---

## Migrations

As migrations rodam automaticamente no startup (`prisma migrate deploy`). Para rodar manualmente:

```bash
npm run db:migrate
```

---

## Health Check

- **Path**: `/api/health`
- **Expected**: `{"ok":true}`
