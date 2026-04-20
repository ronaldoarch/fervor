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
import { registerConversationRoutes } from './routes/conversations.js'
import { getRelevantChunks, formatChunksForPrompt } from './knowledge.js'
import { prisma } from './db.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

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

Não escreva "PAUSA OBRIGATÓRIA" nem peça apenas sim/não.

APÓS A RESPOSTA À PERGUNTA DE RESSONÂNCIA
Se a pessoa quiser explorar outro ângulo, converse e refine; quando for seguir para aplicação prática, apresente a Etapa 3 com estes títulos e texto:

ETAPA 3
O pivô: Interação e Contextualização

"Agora me ajuda a levar essa análise pra prática e me conta:"

Pergunte exatamente (mantendo os parênteses):
"Em que área você atua? (o Fervô já sugere algumas áreas)"
"Onde você quer aplicar esses insights? (o Fervô já sugere alguns insights)"
"Qual o objetivo central desse projeto? (o Fervô já sugere algumas ideias)"

Em seguida ofereça exemplos curtos: áreas como Design, Moda, Branding, Conteúdo; aplicação em produto, campanha, marca, experiência; objetivos como lançamento, reposicionamento, cultura interna, etc.

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

function stripAgentMarkdownArtifacts(content) {
  return String(content)
    .split('\n')
    .map((line) => {
      const t = line.replace(/^#{1,6}\s+/, '')
      if (/^-{3,}\s*$/.test(t.trim())) return ''
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
  } else if (agent.includes('etapa 1') || agent.includes('radar cultural')) {
    etapa =
      'Etapas 1 e 2 já entregues na última mensagem; aguardando resposta à pergunta de ressonância ou refinamento antes do pivô'
  }
  return `\n## CONTEXTO DA CONVERSA\nVocê está em: ${etapa}. Use isso para manter coerência e não repetir etapas já feitas.`
}

registerAuthRoutes(app)
registerConversationRoutes(app)

app.post('/api/chat', async (req, res) => {
  const { messages, userId } = req.body
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages é obrigatório (array de { role, content })' })
  }

  let systemContent = FERVO_SYSTEM + buildConversationContext(messages)
  const apiKey = process.env.OPENAI_API_KEY || req.headers['x-api-key']
  const lastUserMsg = messages.filter((m) => m.role === 'user').pop()
  const lastUserText = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : ''
  if (apiKey && lastUserText) {
    try {
      const chunks = await getRelevantChunks(lastUserText, apiKey)
      if (chunks.length > 0) {
        systemContent = FERVO_SYSTEM + '\n\n' + formatChunksForPrompt(chunks) + buildConversationContext(messages)
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
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: apiMessages,
      temperature: 0.7,
    })
    const raw = completion.choices[0]?.message?.content ?? ''
    const content = stripAgentMarkdownArtifacts(raw)
    res.json({ content, backend: 'openai' })
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
