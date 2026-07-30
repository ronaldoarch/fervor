# Fervor - Agente de Tendência

**Estrategista Cultural e Semiótico Especialista** — um app web que analisa manifestações culturais através da lente do Materialismo Cultural e traduz sinais em estratégias acionáveis.

## Funcionalidades

- **Cadastro e login** — usuários podem se cadastrar e acessar automaticamente após o registro
- **Histórico de conversas** — cada usuário tem suas conversas salvas (localStorage)
- **Múltiplas conversas** — novo chat, listar e carregar análises anteriores
- **Chat com GPT** — conversa com o Fervor usando GPT (OpenAI) no frontend
- **Fallback heurístico** — se a API não estiver rodando, usa análise local
- **PWA** — instalável no celular e desktop
- **Painel Admin** — acesso apenas para administradores

## Como rodar

### 1. Com GPT (recomendado)

```bash
npm install
cp .env.example .env
# Edite .env e adicione sua OPENAI_API_KEY
npm run dev:all
```

Isso sobe o frontend (http://localhost:5173) e o backend (porta 3001) com proxy configurado.

### 2. Só frontend (heurístico)

```bash
npm install
npm run dev
```

Acesse http://localhost:5173 — usa análise local sem GPT.

### 3. Backend separado

```bash
# Terminal 1
OPENAI_API_KEY=sk-... npm run server

# Terminal 2
npm run dev
```

## Configuração

Crie `.env` na raiz:

```
DATABASE_URL=postgresql://user:password@localhost:5432/fervor
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o  # opcional
RESEND_API_KEY=re_...
EMAIL_FROM=Fervô <nao-responda@seudominio.com>
APP_URL=https://fervo.seudominio.com
```

Para habilitar **Esqueceu sua senha?**, adicione e verifique seu domínio no Resend,
crie uma API key e configure as três últimas variáveis no ambiente de produção.
O link enviado expira em 30 minutos e pode ser usado somente uma vez.

### Banco de dados (PostgreSQL)

O Fervor usa PostgreSQL para usuários e conversas. Opções:

**1. PostgreSQL local (macOS com Homebrew):**
```bash
brew install postgresql@16
brew services start postgresql@16
createdb fervor
# Ajuste DATABASE_URL: postgresql://seu_usuario@localhost:5432/fervor
```

**2. Docker Compose (recomendado):**
```bash
docker compose up -d
# DATABASE_URL=postgresql://fervor:fervor@localhost:5432/fervor
```

**3. Neon ou Supabase (cloud, gratuito):** crie um projeto e use a connection string fornecida.

Depois de configurar:
```bash
npm run check-db   # testa conexão
npm run db:migrate # aplica migrations
npm run db:seed    # (opcional) cria usuários demo
```

## Credenciais demo

| Tipo  | Email            | Senha    |
|-------|------------------|----------|
| Admin | admin@fervor.com | admin123 |
| User  | user@fervor.com  | user123  |

## OpenClaw

O Fervor está disponível como **skill** para o [OpenClaw](https://github.com/openclaw/openclaw):

```bash
cp -r skills/fervor ~/.openclaw/workspace/skills/
```

Ver [OPENCLAW.md](OPENCLAW.md) para instruções completas.

## Estrutura

```
src/
├── agent/          # Lógica heurística (fallback)
├── services/       # chatApi, conversationStorage
├── contexts/       # Auth
├── pages/          # Login, Agent, Admin
└── styles/
server/
└── index.js        # API OpenAI
```
