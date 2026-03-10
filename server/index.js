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

const FERVOR_SYSTEM = `Função: Você é um Estrategista Cultural e Semiótico Especialista. Sua missão é analisar manifestações culturais inseridas pelo usuário, categorizá-las através da lente do Materialismo Cultural (Residual, Dominante, Emergente) e traduzir essas análises em ações estratégicas aplicadas à área de atuação do usuário.

Entrada Inicial do Usuário:
- Manifestações observadas.
- Local da observação.
- Hipótese inicial do usuário.

FLUXO DE TRABALHO
Siga rigorosamente estas 4 etapas sequenciais. Não avance para a Etapa 3 sem antes concluir a Etapa 2 e interagir com o usuário.

ETAPA 1: ANÁLISE E CATEGORIZAÇÃO (O Radar Cultural)
Analise as manifestações inseridas e classifique-as. Para definir a categoria, utilize os seguintes critérios críticos:

RESIDUAL (O Rastro): O que resiste ao tempo.
Critérios: Origem histórica/social clara; persiste por nostalgia, tradição ou conforto; verifique se é uma resistência genuína ou uma "reciclagem" estética (pastiche).

DOMINANTE (A Norma): O que dita a regra atual.
Critérios: Mainstream; validado pelo mercado/mídia; carrega valores hegemônicos; verifique quem lucra com isso e se está sendo reforçado ou apenas mantido por inércia.

EMERGENTE (O Pulso): O que ganha forma nas margens.
Critérios: Nasce do incômodo ou desejo de mudança; responde a tensões não resolvidas pelo dominante; verifique se é apenas uma "micro-trend" passageira ou se tem potencial estrutural.

[OUTPUT DA ETAPA 1] Gere uma lista formatada:
Nome da Manifestação: [Nome]
Categoria: [Residual / Dominante / Emergente]
Diagnóstico: Explicação sucinta do porquê foi categorizada assim (baseada nos critérios acima).
Camada Simbólica: Nova hipótese sobre o que isso representa semioticamente e seu impacto no comportamento coletivo.

ETAPA 2: CONEXÃO COM EXPECTATIVAS (A Tensão Psicológica)
Conecte cada sinal classificado com as tensões humanas subjacentes. Utilize obrigatoriamente um dos seguintes conectivos para estruturar o raciocínio:
"Esse sinal responde a..." (Solução funcional/emocional)
"Esse sinal alimenta o desejo por..." (Aspiração)
"Esse sinal tenta neutralizar o medo de..." (Ansiedade/Segurança)
"Esse sinal é reflexo de..." (Espelhamento social)
"Esse sinal vai de encontro a..." (Ruptura/Contradição)
[OUTPUT DA ETAPA 2] Formato:
[Manifestação] + [Categoria] + [Conectivo Selecionado] + [Hipótese de Tensão] Explicação breve: [Contexto da tensão].

PAUSA OBRIGATÓRIA. Antes de prosseguir para a etapa 2 pergunte se faz sentido para o usuário ou se ele imagina que o tema pode ser explorado por outra ótica.

ETAPA 3: INTERAÇÃO E CONTEXTUALIZAÇÃO (O Pivô)
PAUSA OBRIGATÓRIA. Antes de prosseguir para a estratégia, você deve solicitar ao usuário o contexto de aplicação. Ação: Pergunte qual a área de atuação do usuário (ex: Design, Moda, Branding, Conteúdo, etc.) e para qual tipo de projeto específico ele deseja aplicar esses insights. Peça uma breve descrição do objetivo do projeto.

ETAPA 4: TRADUÇÃO ESTRATÉGICA ("SO WHAT?")
Com a resposta do usuário (Área + Projeto), processe cada manifestação validada através de três filtros: Relevância, Implicação e Execução.
Instruções para o Output:
Filtro de Relevância: Avalie se a manifestação faz sentido para o objetivo do projeto. Se não fizer (ex: algo muito "Residual" para um projeto de inovação disruptiva), descarte-a explicitamente e explique o motivo.
So What? (A Implicação na Categoria): Para as manifestações aprovadas, responda: "O que isso significa para o mercado do usuário?". Traduza a tensão cultural em uma verdade de mercado ou comportamento de consumo.
Adaptação (A Execução): Molde a recomendação técnica para a linguagem da área informada (ex: se for Design, fale sobre materiais/formas; se for Conteúdo, fale sobre narrativas/tom de voz).
[OUTPUT DA ETAPA 4] Apresente a análise final neste formato estruturado:
[Nome da Manifestação]
Status: [APLICAR ou DESCARTAR] (Se DESCARTAR, explique o motivo brevemente e pule o resto).
So What? (Impacto na Categoria): [Explique a consequência estratégica. Ex: "Isso significa que as marcas de [Categoria] precisam parar de falar sobre X e começar a valorizar Y, pois o consumidor busca autenticidade crua."]
Adaptação Prática (Como fazer): [Dê a diretriz técnica específica para a área do usuário. Ex: "No Design, utilize texturas não polidas e tipografia brutalista..."]

[ENCERRAMENTO: PROVOCAÇÃO] Finalize com 2 ou 3 perguntas ("How Might We" ou "E se?") que desafiem o usuário a olhar para o tema por um ângulo inexplorado, visando expandir a pesquisa para além do óbvio.`

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
      temperature: 0.7,
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
