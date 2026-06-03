import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
}
import express from 'express'
import cors from 'cors'
import OpenAI from 'openai'
import { registerAuthRoutes } from './routes/auth.js'
import { verifyToken } from './auth.js'
import { registerConversationRoutes } from './routes/conversations.js'
import { registerAdminRoutes } from './routes/admin.js'
import { getRelevantChunks, formatChunksForPrompt } from './knowledge.js'
import { prisma } from './db.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))

const FERVO_SYSTEM = `Função: Você é o Fervô (sempre escreva "Fervô" com acento circunflexo no ô). Você é Estrategista Cultural e Semiótico da Made. Sua missão é pegar o que a pessoa observou no mundo e ajudar a transformar em inteligência estratégica, categorizando pela lente do Materialismo Cultural (Residual, Dominante, Emergente) e traduzindo em ações para a área dela.

Entrada inicial (três dimensões):
- O que observou (comportamento, estética, meme, consumo, vibe…)
- Onde observou (rede, bairro, evento, grupo…)
- O que acha que significa (intuição, hipótese, incômodo)

FORMATAÇÃO (obrigatório)
- Não use #, ##, ### nem linhas só com traços (---).
- Títulos de etapa em linhas próprias, em texto corrido, como nos modelos abaixo.
- Evite símbolos estranhos de markdown; **negrito** pode ser usado com moderação.

FLUXO — 4 etapas sequenciais. Não avance à Etapa 3 sem a pessoa ter respondido à pergunta de fechamento da Etapa 2 (ressonância / outro ângulo).

PRIMEIRA RESPOSTA DO USUÁRIO (com observação + contexto + significado)
Responda em UMA ÚNICA mensagem, nesta ordem:

1) Linha exata de abertura:
"Ótimo, vamos começar com a análise e categorização dessa manifestação cultural."

2) Títulos e conteúdo da Etapa 1 (uma linha em branco entre título de etapa e subtítulo):
ETAPA 1
O Radar Cultural: Análise e Categorização

Analise e classifique. Critérios:

RESIDUAL (O Rastro): o que resiste ao tempo. Origem histórica/social clara; nostalgia, tradição ou conforto; resistência genuína ou "reciclagem" estética (pastiche).

DOMINANTE (A Norma): o que dita a regra atual. Mainstream; mercado/mídia; valores hegemônicos; quem lucra; reforço ou inércia.

EMERGENTE (O Pulso): o que ganha forma nas margens. Incômodo ou desejo de mudança; tensões não resolvidas pelo dominante; micro-trend vs potencial estrutural.

Para cada manifestação: Nome, Categoria (Residual/Dominante/Emergente), Diagnóstico, Camada simbólica.

3) Títulos e conteúdo da Etapa 2:
ETAPA 2
A tensão psicológica: Conexão com Expectativas

Conecte os sinais às tensões humanas usando estes conectivos:
"Esse sinal responde a…", "Esse sinal alimenta o desejo por…", "Esse sinal tenta neutralizar o medo de…", "Esse sinal é reflexo de…", "Esse sinal vai de encontro a…"

4) Fim da mesma mensagem com a pergunta exata:
"Essa leitura ressoa com o que você observou, ou tem outro ângulo que quer explorar?"

5) Logo abaixo, um convite **opcional** e curto (quem preferir leve ignora):
Explique que, se quiser mais densidade **nesta mesma etapa** (mais tensões, contrastes e camadas de significado), pode escrever **aprofundar** (ou equivalente: "mais fundo", "versão mais densa", "mais camadas"). Deixe claro que é opcional: a leitura até o item 4 já está completa para seguir.

Não escreva "PAUSA OBRIGATÓRIA" nem peça apenas sim/não.

OPCIONAL — PEDIDO DE APROFUNDAMENTO NA ETAPA 2
Se o usuário pedir aprofundamento explícito (ex.: "aprofundar", "mais fundo", "mais camadas", "versão estendida", "mais denso"):
- NÃO avance para a Etapa 3 nessa mensagem.
- Entregue um bloco com título claro, por exemplo: "Aprofundamento (opcional) — tensões e camadas" ou "Leitura complementar".
- Amplie com tensões secundárias, contradições produtivas ("por um lado / por outro"), pressões entre Residual, Dominante e Emergente no caso concreto, e implicações de inclusão/exclusão simbólica — sem repetir parágrafo a parágrafo o que já foi dito na Etapa 2 inicial.
- Feche de novo com a pergunta de ressonância e lembre que **sim** (ou equivalente) leva ao pivô quando estiver pronto.

Se o usuário pedir aprofundamento de novo depois desse bloco: reconheça que já expandiu; não infle sem limite; convide a seguir ao pivô com **sim** ou a refinar um último ângulo.

APÓS A RESPOSTA À PERGUNTA DE RESSONÂNCIA
Se a pessoa quiser explorar outro ângulo, converse e refine; quando for seguir para aplicação prática, apresente a Etapa 3 seguindo OBRIGATORIAMENTE este modelo (as sugestões devem vir logo abaixo de cada pergunta, não agrupadas só no final):

ETAPA 3
O pivô: Interação e Contextualização

Agora me ajuda a levar essa análise pra prática e me conta:

Em que área você atua? (o Fervô já sugere algumas áreas)
[Logo em seguida, uma ou duas linhas com exemplos concretos de áreas — ex.: Design, Moda, Branding, Conteúdo, UX/UI, arquitetura de marca, pesquisa de tendência, comunicação, produto, embalagem, varejo, RH/cultura.]

Onde você quer aplicar esses insights? (o Fervô já sugere alguns insights)
[Logo em seguida, exemplos de aplicação — ex.: campanha 360 ou digital, redes e criadores, loja ou evento, pitch, naming/conceito, cultura interna, material de venda, lançamento de produto/coleção.]

Qual o objetivo central desse projeto? (o Fervô já sugere algumas ideias)
[Logo em seguida, exemplos de objetivo — ex.: lançamento/relançamento, reposicionamento, validação de conceito, mapa de oportunidades, briefing, linha de produto, tom de voz, sprint criativo.]

Não envie só as três perguntas com os parênteses sem as linhas de sugestão abaixo de cada uma.

ETAPA 4 (somente depois das três respostas da Etapa 3)
Títulos:
ETAPA 4
"So what?": Tradução Estratégica

Processe cada manifestação relevante com: Filtro de Relevância (APLICAR ou DESCARTAR e por quê); So What? (implicação para o mercado/comportamento); Adaptação prática (diretrizes na linguagem da área).

ENCERRAMENTO (na mesma mensagem da Etapa 4)
Provocação: Agora é a sua vez

Do Fervô pra você:

(liste 2 ou 3 perguntas provocativas em português, estilo "E se…?" ou "Como poderíamos…?", sem jargon em inglês obrigatório)

Convide a enviar novas observações quando quiser uma nova análise.`

const FERVO_ETAPA_3_SAFE = `ETAPA 3

O pivô: Interação e Contextualização

Agora me ajuda a levar essa análise pra prática e me conta:

Em que área você atua? (o Fervô já sugere algumas áreas)
Algumas áreas que costumo cruzar com esse tipo de leitura: Design, Moda, Branding, Conteúdo, UX/UI, arquitetura de marca, pesquisa de tendência, comunicação, produto, embalagem, varejo (visual merchandising), RH e cultura organizacional.

Onde você quer aplicar esses insights? (o Fervô já sugere alguns insights)
Alguns lugares comuns para pousar o insight: campanha (360 ou digital), redes sociais e playbook de criadores, experiência de loja ou evento, pitch para investidor ou cliente, naming e conceito de linha, cultura interna (workshop, ritual de time), material de venda, lançamento de produto ou coleção.

Qual o objetivo central desse projeto? (o Fervô já sugere algumas ideias)
Objetivos que aparecem bastante: lançamento ou relançamento, reposicionamento, validação ou teste de conceito, mapa de oportunidades, direcionamento de briefing, linha de produto ou coleção, tom de voz e narrativa, provocação de time ou sprint criativo.`

async function getFervoSystemPromptFromStore() {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: 'system_prompt' } })
    if (row?.value?.trim()) return row.value.trim()
  } catch (e) {
    console.warn('[chat] leitura AppSetting (system_prompt):', e.message)
  }
  return FERVO_SYSTEM
}

async function getOpenAIModelFromStore() {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: 'openai_model' } })
    if (row?.value?.trim()) return row.value.trim()
  } catch (_) {
    /* tabela ausente ou erro transitório */
  }
  return process.env.OPENAI_MODEL || 'gpt-4o'
}

function stripAgentMarkdownArtifacts(content) {
  const source = String(content ?? '')
  const hasLeakedEtapa3Template =
    /\betapa\s*3\b/i.test(source) &&
    /(\[logo em seguida,\s*exemplos|não envie só as três perguntas)/i.test(source)

  if (hasLeakedEtapa3Template) {
    return FERVO_ETAPA_3_SAFE
  }

  return source
    .split('\n')
    .map((line) => {
      const t = line.replace(/^#{1,6}\s+/, '')
      if (/^-{3,}\s*$/.test(t.trim())) return ''
      if (/^\s*\[[^\]]+\]\s*$/.test(t)) return ''
      if (/^\s*não envie só as três perguntas/i.test(t)) return ''
      if (/^\s*formatação\s*\(obrigatório\)/i.test(t)) return ''
      if (/^\s*fluxo\s*[—-]\s*4 etapas/i.test(t)) return ''
      return t
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()
}

/** Gera resumo do contexto da conversa para o modelo manter coerência de etapa. */
function buildConversationContext(messages) {
  if (!Array.isArray(messages) || messages.length < 2) return ''
  const lastAgent = messages.filter((m) => m.role === 'agent').pop()
  const lastUser = messages.filter((m) => m.role === 'user').pop()
  if (!lastAgent?.content || !lastUser?.content) return ''
  const agent = String(lastAgent.content).toLowerCase()
  let etapa = 'início'
  if (agent.includes('etapa 4') || agent.includes('so what')) {
    etapa = 'Etapa 4 concluída (tradução e provocação); usuário pode iniciar nova análise'
  } else if (agent.includes('etapa 3') || agent.includes('pivô')) {
    etapa = 'Etapa 3 (pivô) — aguardando área, onde aplicar insights e objetivo do projeto'
  } else if (
    agent.includes('aprofundamento') ||
    agent.includes('leitura complementar') ||
    (agent.includes('opcional') && agent.includes('camadas'))
  ) {
    etapa =
      'Etapa 2 após pedido de aprofundamento; aguardar ressonância ou confirmação (**sim**) para Etapa 3 (pivô). Não repetir outro bloco gigante de aprofundamento se o usuário pedir de novo.'
  } else if (agent.includes('etapa 1') || agent.includes('radar cultural')) {
    etapa =
      'Etapas 1 e 2 já entregues na última mensagem (com convite opcional de aprofundar); aguardar ressonância, pedido de aprofundamento, ou refinamento antes do pivô'
  }
  return `\n## CONTEXTO DA CONVERSA\nVocê está em: ${etapa}. Use isso para manter coerência e não repetir etapas já feitas.`
}

registerAuthRoutes(app)
registerConversationRoutes(app)
registerAdminRoutes(app)

function getUserIdFromBearer(req) {
  const auth = req.headers?.authorization
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  const decoded = verifyToken(token)
  return decoded?.userId ?? null
}

/** Grava no Postgres o histórico enviado + resposta do assistente (igual ao fluxo do ChatGPT no servidor). */
async function persistAssistantAfterChat(userId, conversationId, clientMessages, assistantContent) {
  const conv = await prisma.conversation.findFirst({
    where: { id: String(conversationId), userId },
    select: { id: true },
  })
  if (!conv) return false

  const rows = [...clientMessages, { role: 'agent', content: assistantContent }].map((m) => {
    const content =
      typeof m.content === 'string' ? m.content : JSON.stringify(m.content ?? '')
    const role =
      m.role === 'agent' || m.role === 'assistant'
        ? 'assistant'
        : m.role === 'user'
          ? 'user'
          : 'assistant'
    return { conversationId: conv.id, role, content }
  })

  await prisma.$transaction(async (tx) => {
    await tx.message.deleteMany({ where: { conversationId: conv.id } })
    await tx.message.createMany({ data: rows })
    await tx.conversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date() },
    })
  })
  return true
}

app.post('/api/chat', async (req, res) => {
  const { messages, userId, conversationId } = req.body
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages é obrigatório (array de { role, content })' })
  }

  const baseSystem = await getFervoSystemPromptFromStore()
  let systemContent = baseSystem + buildConversationContext(messages)
  const apiKey = process.env.OPENAI_API_KEY || req.headers['x-api-key']
  const lastUserMsg = messages.filter((m) => m.role === 'user').pop()
  const lastUserText = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : ''
  if (apiKey && lastUserText) {
    try {
      const chunks = await getRelevantChunks(lastUserText, apiKey)
      if (chunks.length > 0) {
        systemContent = baseSystem + '\n\n' + formatChunksForPrompt(chunks) + buildConversationContext(messages)
        console.log(`[RAG] ${chunks.length} chunk(s) injetados no contexto`)
      } else {
        console.log('[RAG] Nenhum chunk relevante (knowledge.json ausente ou sem match)')
      }
    } catch (e) {
      console.warn('[RAG] Erro ao recuperar chunks:', e.message)
    }
  }

  const apiMessages = [
    { role: 'system', content: systemContent },
    ...messages.map((m) => ({
      role: m.role === 'agent' ? 'assistant' : m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    })),
  ]

  if (lastUserMsg?.content && Array.isArray(lastUserMsg.content)) {
    const lastIdx = apiMessages.length - 1
    apiMessages[lastIdx] = { role: 'user', content: lastUserMsg.content }
  }

  if (!apiKey) {
    return res.status(401).json({ error: 'OPENAI_API_KEY não configurada. Defina no .env ou envie x-api-key.' })
  }

  try {
    const openai = new OpenAI({ apiKey })
    const model = await getOpenAIModelFromStore()
    const completion = await openai.chat.completions.create({
      model,
      messages: apiMessages,
      temperature: 0.7,
    })
    const raw = completion.choices[0]?.message?.content ?? ''
    const content = stripAgentMarkdownArtifacts(raw)

    const uid = getUserIdFromBearer(req)
    let persisted = false
    if (uid && conversationId) {
      try {
        persisted = await persistAssistantAfterChat(uid, conversationId, messages, content)
        if (persisted) {
          console.log(`[chat] conversa ${conversationId} atualizada no banco (resposta do assistente)`)
        }
      } catch (e) {
        console.warn('[chat] persistência no banco falhou:', e.message)
      }
    }

    res.json({ content, backend: 'openai', persisted })
  } catch (err) {
    console.error('OpenAI error:', err.message)
    res.status(500).json({ error: err.message || 'Erro ao chamar OpenAI' })
  }
})

app.get('/api/health', (_, res) => res.json({ ok: true }))

app.get('/api/backend', (_, res) => {
  res.json({ openai: !!process.env.OPENAI_API_KEY })
})

const distPath = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (_, res) => res.sendFile(path.join(distPath, 'index.html')))
}

const PORT = process.env.PORT || 3001

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não configurada. Configure no .env para usar autenticação e conversas.')
  process.exit(1)
}

;(async () => {
  try {
    await prisma.$connect()
    await prisma.$queryRaw`SELECT 1`
  } catch (e) {
    console.error('Erro ao conectar no banco:', e.message)
    if (e.message?.includes('denied access')) {
      console.error('Execute "npm run check-db" para diagnosticar. Verifique usuário, senha e se o banco existe.')
    }
    process.exit(1)
  }
  app.listen(PORT, () => {
    console.log(`Fervô API: http://localhost:${PORT}`)
    console.log('-> OpenAI (GPT)')
  })
})()
