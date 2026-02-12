# Fervor + OpenClaw

Integração do **Fervor** (Estrategista Cultural e Semiótico) com o [OpenClaw](https://github.com/openclaw/openclaw) — seu assistente pessoal de IA.

## O que é OpenClaw?

OpenClaw é um assistente de IA pessoal que roda nos seus dispositivos. Funciona em WhatsApp, Telegram, Slack, Discord, WebChat, Signal, iMessage e outros canais. O Fervor vira uma **skill** que o agente pode usar quando você pedir análise de tendências.

## Instalação

### 1. Instalar OpenClaw

```bash
npm install -g openclaw@latest
# ou: pnpm add -g openclaw@latest

openclaw onboard --install-daemon
```

Runtime: **Node ≥22**

### 2. Adicionar a skill Fervor

**Opção A — Usar este repo como workspace:**

Se quiser usar o Fervor como workspace do OpenClaw, adicione em `~/.openclaw/openclaw.json`:

```json
{
  "agents": {
    "defaults": {
      "workspace": "/caminho/para/Fervor-agentedetendencia"
    }
  }
}
```

A pasta `skills/fervor` será carregada automaticamente.

**Opção B — Copiar a skill:**

```bash
mkdir -p ~/.openclaw/workspace/skills
cp -r skills/fervor ~/.openclaw/workspace/skills/
```

### 3. Reiniciar o Gateway

```bash
openclaw gateway --port 18789 --verbose
```

## Como usar

### Via WebChat

1. Abra o WebChat do OpenClaw (na interface do Gateway ou app)
2. Digite algo como:
   - "Quero uma análise de tendência"
   - "Fervor: estou vendo nostalgia do retrô no TikTok"
   - "Analise essa manifestação cultural..."

### Via WhatsApp / Telegram / Slack / Discord

Envie uma mensagem:
- "Fervor, analise essa tendência..."
- "Preciso de uma análise semiótica de [manifestação]"

O agente OpenClaw reconhecerá a skill e seguirá o fluxo em 4 etapas.

## Fluxo do Fervor no OpenClaw

1. **Etapa 1:** O agente pede manifestações, local e hipótese inicial → classifica em Residual/Dominante/Emergente
2. **Etapa 2:** Conecta às tensões psicológicas → pergunta se faz sentido
3. **Etapa 3:** Pede área de atuação e objetivo do projeto
4. **Etapa 4:** Tradução estratégica ("So What?") + perguntas "How Might We"

## Fervor Web App vs OpenClaw

| | Fervor Web (este repo) | Fervor no OpenClaw |
|---|---|---|
| Interface | App PWA com login | Qualquer canal (WhatsApp, Telegram, etc.) |
| Uso | Análise dedicada | Integrado ao assistente |
| Offline | Heurístico (sem IA) | Usa o modelo do OpenClaw (Claude, GPT, etc.) |

O **Fervor Web** continua funcionando standalone. O **Fervor no OpenClaw** usa o modelo configurado (Anthropic, OpenAI, etc.) para análises mais ricas.

## Referências

- [OpenClaw Docs](https://docs.openclaw.ai/)
- [Skills — OpenClaw](https://docs.openclaw.ai/tools/skills)
- [ClawHub](https://clawhub.com) — marketplace de skills
