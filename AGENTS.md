# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Fervor (Fervô) is a cultural trend analysis AI agent — a full-stack web app (React + Express + PostgreSQL) that analyzes cultural observations through Cultural Materialism and produces actionable strategies.

### Services

| Service | Port | Command |
|---------|------|---------|
| PostgreSQL 16 | 5432 | `docker compose up -d` |
| Express.js Backend | 3001 | `npm run server` |
| Vite Frontend (dev) | 5173 | `npm run dev` |
| Both (backend+frontend) | 3001+5173 | `npm run dev:all` |

### Environment variables

Copy `.env.example` to `.env` and set:
- `DATABASE_URL` — PostgreSQL connection string (docker-compose default: `postgresql://fervor:fervor@localhost:5432/fervor`)
- `JWT_SECRET` — any 32+ char string for token signing
- `OPENAI_API_KEY` — required for AI chat (without it, the backend returns 401 on `/api/chat`; frontend has a heuristic fallback)

### Starting services for development

1. Start Docker daemon if not already running: `dockerd &`
2. Start PostgreSQL: `docker compose up -d`
3. Wait for Postgres to be ready: `docker exec workspace-postgres-1 pg_isready -U fervor`
4. Run migrations (idempotent): `npm run db:migrate`
5. Start all: `npm run dev:all`

### Gotchas

- The `prisma/seed.js` script does NOT load `.env` automatically. Use `DATABASE_URL=... node prisma/seed.js` or ensure `DATABASE_URL` is exported in your shell.
- The backend (`server/index.js`) reads `.env` itself using a manual parser — it does NOT use `dotenv/config`. The `DATABASE_URL` check happens before server startup; the server will `process.exit(1)` if it's missing.
- TypeScript (`npx tsc --noEmit`) has a few pre-existing non-blocking errors in `processor.ts` and utility files. The Vite build ignores them; the project has no ESLint config.
- Docker in Cloud Agent VMs requires `fuse-overlayfs` storage driver and `iptables-legacy`. See the Dockerfile/setup for details.
- Demo credentials after seeding: `admin@fervor.com` / `admin123`.

### Testing & build

- Build: `npm run build` (Vite production build)
- Type check: `npx tsc --noEmit` (has pre-existing warnings, not blocking)
- DB connection check: `npm run check-db`
- No automated test suite exists in this repo.
