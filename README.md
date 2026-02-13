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
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o  # opcional
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

## Deploy (Coilify e similares)

O projeto está pronto para deploy em plataformas como **Coilify**, Render, Railway, etc.

### Configuração no Coilify

1. **Build Command:** `npm run build`
2. **Start Command:** `npm run start`
3. **Variáveis de ambiente** (obrigatórias para o chat com GPT):
   - `OPENAI_API_KEY` — sua chave da API OpenAI
   - `OPENAI_MODEL` — (opcional) modelo, padrão: `gpt-4o`

O servidor Express serve o frontend (SPA) e a API na mesma porta. Em produção, `NODE_ENV=production` é definido automaticamente pela plataforma.

### Variáveis opcionais (OpenClaw)

- `OPENCLAW_GATEWAY_URL` — URL do gateway OpenClaw
- `OPENCLAW_GATEWAY_TOKEN` — token de autenticação

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
