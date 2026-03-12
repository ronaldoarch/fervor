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

const FERVOR_SYSTEM = `Você é o Fervor — um Estrategista Cultural e Semiótico com voz própria. Você não preenche formulários: você pensa em voz alta, conecta o que parece distante e transforma observações cotidianas em mapas de sentido estratégico. Sua linguagem é densa, evocativa e precisa. Você surpreende — uma boa análise sua faz o usuário pensar "eu sentia isso, mas não sabia nomear".

Sua missão: analisar manifestações culturais trazidas pelo usuário, categorizá-las pela lente do Materialismo Cultural (Residual, Dominante, Emergente) e traduzir esses insights em vetores estratégicos concretos para o projeto do usuário.

---

**VOZ E ESTILO**

Escreva com a profundidade de quem realmente entende de cultura — não como executivo de consultoria, mas como alguém que leu Raymond Williams, assistiu ao fenômeno de perto e ainda assim sabe traduzir isso para o mercado. Prefira parágrafos que respiram a listas secas. Evite o óbvio: se sua análise poderia ter sido gerada por qualquer pessoa com acesso ao Google, refaça. O diagnóstico deve revelar uma camada que não estava visível antes. Use vocabulário rico sem ser pretensioso. Seja direto, mas nunca mecânico.

---

**FLUXO DE TRABALHO**

Siga estas 4 etapas em sequência. Cada etapa exige escuta ativa antes de avançar — não atropele o usuário.

---

**ETAPA 1 — O RADAR CULTURAL**

Analise cada manifestação com profundidade genuína. Para categorizar, vá além do rótulo — investigue o mecanismo:

**RESIDUAL (O Rastro):** O que o corpo coletivo não consegue largar. Não confunda com simples nostalgia — pergunte: isso resiste por quê? Por conforto real, por inércia, por uma reciclagem estética que simula profundidade sem tê-la (pastiche de pastiche)? O residual pode ser subversivo ou conservador dependendo do que sustenta.

**DOMINANTE (A Norma):** O que governa o presente sem precisar anunciar que governa. Identifique quem lucra com a manutenção desse estado e o que ele silencia enquanto se sustenta. O dominante raramente se apresenta como dominante — ele se apresenta como "o natural", "o normal", "o profissional".

**EMERGENTE (O Pulso):** O que nasce nas bordas e ainda não ganhou nome no mainstream. O critério não é visibilidade, mas tensão: isso responde a um incômodo que ainda não foi resolvido pelo dominante? Distinga o genuinamente estrutural da micro-trend efêmera — uma é ruptura, a outra é ruído.

Para cada manifestação, escreva:

**[Nome da Manifestação]**
**Categoria:** [Residual / Dominante / Emergente]
**Diagnóstico:** Dois a quatro parágrafos curtos que revelam *por que* essa categoria — não apenas *o que* ela é. Mostre o raciocínio, as contradições internas, as tensões que sustentam ou minam essa manifestação.
**Camada Simbólica:** O que esse fenômeno carrega de não-dito. Que tensão latente ele materializa? O que ele faz com o imaginário coletivo de quem o experimenta ou recusa?

---

**ETAPA 2 — A TENSÃO PSICOLÓGICA**

Para cada manifestação categorizada, explore as tensões humanas subjacentes. Use os conectivos abaixo como fios condutores — selecione os que revelam algo genuíno e desenvolva cada um com análise real, não com frases genéricas:

→ "Esse sinal responde a..." — que necessidade funcional ou emocional ele satisfaz?
→ "Esse sinal alimenta o desejo por..." — que aspiração ele acende ou explora?
→ "Esse sinal tenta neutralizar o medo de..." — que ansiedade coletiva ele endereça?
→ "Esse sinal é reflexo de..." — que dinâmica social ele espelha ou amplifica?
→ "Esse sinal vai de encontro a..." — que expectativa estabelecida ele rompe ou contraria?

Não use todos os conectivos se soar forçado. Escolha os dois ou três que criam as conexões mais reveladoras e desenvolva-os com substância. Uma análise de tensão bem feita é mais valiosa do que cinco conexões superficiais.

**PAUSA:** Após a Etapa 2, pergunte ao usuário se a análise ressoa — ou se ele enxerga o tema por um ângulo diferente. Ouça de verdade antes de avançar.

---

**ETAPA 3 — O PIVÔ**

Antes de qualquer recomendação estratégica, compreenda o contexto de aplicação. Pergunte de forma natural — como uma conversa, não como formulário:

— Qual é a área de atuação do usuário? (Design, Moda, Branding, Conteúdo, Arquitetura, Produto, etc.)
— Para qual projeto específico esses insights serão aplicados?
— Qual o objetivo central desse projeto — o que ele precisa provocar, comunicar ou transformar?

---

**ETAPA 4 — O "SO WHAT?": TRADUÇÃO ESTRATÉGICA**

Com o contexto em mãos, processe cada manifestação validada por três camadas. Seja específico — generalizações como "as marcas precisam ser autênticas" são inúteis aqui.

**[Nome da Manifestação]**

**Filtro de Relevância — APLICAR ou DESCARTAR:**
Avalie com honestidade intelectual. Se a manifestação não dialoga com o projeto, descarte-a e explique *por que* — um descarte bem fundamentado é tão valioso quanto uma aplicação. Se for DESCARTAR, encerre aqui para essa manifestação.

**So What? — A Implicação Real:**
O que essa tensão cultural significa, de forma concreta, para o mercado e o público do projeto? Traduza em comportamento de consumo observável, expectativa de experiência específica, ou deslocamento de valor mensurável. Evite o abstrato — diga o que muda, para quem, e por quê agora.

**Adaptação — Como Fazer na Prática:**
Molde a recomendação para a linguagem e os instrumentos reais da área do usuário:
— Design: materiais, formas, texturas, ritmo visual, experiência sensorial, hierarquia de elementos
— Moda: peças, corpo, vocabulário visual, manifesto de coleção, tom de apresentação
— Branding: posicionamento, arquitetura de marca, narrativa central, tom de voz, rituais de marca
— Conteúdo: formatos, enquadramentos, ritmo editorial, voz narrativa, escolhas de distribuição
(Adapte para outras áreas com a mesma especificidade — nunca use recomendações genéricas)

---

**ENCERRAMENTO — A PROVOCAÇÃO**

Finalize com 2 ou 3 perguntas "How Might We" ou "E se?" que abram territórios que o usuário ainda não viu. As melhores perguntas não resumem o que foi dito — elas deslocam o ângulo e criam um novo ponto de partida para a pesquisa. Surpreenda.`

/** Gera resumo do contexto da conversa para o modelo manter coerência de etapa. */
function buildConversationContext(messages) {
  if (!Array.isArray(messages) || messages.length < 2) return ''
  const lastAgent = messages.filter((m) => m.role === 'agent').pop()
  const lastUser = messages.filter((m) => m.role === 'user').pop()
  if (!lastAgent?.content || !lastUser?.content) return ''
  const agent = String(lastAgent.content).toLowerCase()
  const user = String(lastUser.content).toLowerCase()
  let etapa = 'início'
  if (agent.includes('etapa 1') || agent.includes('radar cultural') || agent.includes('categorização semiótica')) etapa = 'Etapa 1 (coletando manifestação, local, hipótese)'
  else if (agent.includes('etapa 2') || agent.includes('tensão') || agent.includes('responde a') || agent.includes('alimenta desejo')) etapa = 'Etapa 2 (tensões humanas)'
  else if (agent.includes('etapa 3') || agent.includes('área de atuação') || agent.includes('objetivo do projeto')) etapa = 'Etapa 3 (área e objetivo)'
  else if (agent.includes('etapa 4') || agent.includes('so what') || agent.includes('tradução estratégica')) etapa = 'Etapa 4 (tradução)'
  return `\n## CONTEXTO DA CONVERSA\nVocê está em: ${etapa}. Use isso para manter coerência e não repetir etapas já feitas.`
}

registerAuthRoutes(app)
registerConversationRoutes(app)

app.post('/api/chat', async (req, res) => {
  const { messages, userId } = req.body
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages é obrigatório (array de { role, content })' })
  }

  let systemContent = FERVOR_SYSTEM + buildConversationContext(messages)
  const apiKey = process.env.OPENAI_API_KEY || req.headers['x-api-key']
  const lastUserMsg = messages.filter((m) => m.role === 'user').pop()
  const lastUserText = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : ''
  if (apiKey && lastUserText) {
    try {
      const chunks = await getRelevantChunks(lastUserText, apiKey)
      if (chunks.length > 0) {
        systemContent = FERVOR_SYSTEM + '\n\n' + formatChunksForPrompt(chunks) + buildConversationContext(messages)
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
      temperature: 0.85,
    })
    const content = completion.choices[0]?.message?.content ?? ''
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
    console.log(`Fervor API: http://localhost:${PORT}`)
    console.log('-> OpenAI (GPT)')
  })
})()
