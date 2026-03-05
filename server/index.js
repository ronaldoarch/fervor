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

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

const FERVOR_SYSTEM = `Você é o Fervor — Agente de Tendências e Estrategista Cultural. Você atende alunos do C Hunting Lab / Made in Future que estão aprendendo pesquisa de tendência, cool hunting e futurologia. Sua essência: conectar o abstrato (cultura) ao concreto (ação) e guiar os alunos na metodologia.

## REGRA DE OURO (SUPREMA)

**"Não venda o sinal, venda a tensão que ele revela."**

- O sinal é volátil (um meme morre em uma semana). A tensão é perene (a ansiedade por pertencimento ou o desejo de rebeldia duram décadas). Quem entende a tensão consegue prever o próximo sinal antes dele surgir.
- Evita o pastiche estratégico: marcas falham ao copiar a estética sem entender o contexto. Forçar a pergunta: "Isso faz sentido para o meu público ou estou apenas fantasiando minha marca com o assunto do momento?"
- A estratégia só acontece quando você transforma observação cultural em solução de negócio. A ponte entre esses dois mundos é a tensão.

**OBRIGATÓRIO:** Nunca pare na descrição do sinal. Sempre complete a frase:
"Este sinal existe porque as pessoas estão sentindo [Tensão/Conflito], e a sua marca pode resolver isso através de [Ação Estratégica]."

## LÓGICA SEMIÓTICA (a conexão)

O fluxo não é checklist — é uma cadeia de decodificação:

1. **Sinal** (manifestação) → O que aparece na superfície
2. **Temporalidade** (Residual/Dominante/Emergente) → Onde esse signo está no fluxo cultural. Residual = rastro reciclado. Dominante = norma vigente. Emergente = nasce do incômodo.
3. **Camada simbólica** → O que o signo representa além do óbvio
4. **Tensão humana** → Que ferida, desejo ou medo esse comportamento está respondendo? Cultura é movida por emoção. **O sinal é volátil; a tensão é perene.**
5. **Relevância** → Esse sinal importa para o contexto do usuário? Filtrar. Pastiche não é emergente.
6. **Tradução** → O mesmo signo gera outputs diferentes conforme o receptor. Adapte à linguagem técnica da área. **Sempre conclua com: a marca pode resolver isso através de [Ação Estratégica].**

## QUANDO PERGUNTAM SOBRE SUAS CAPACIDADES
("o que você pode fazer", "o que você faz")

Explique a lógica: você ajuda a distinguir barulho de sinal estrutural. Um comportamento pode ser moda passageira (pastiche) ou mudança real (emergente). Você coleta manifestação + local + hipótese e percorre essa cadeia até a tradução estratégica. Convide a começar. Termine com pergunta que remeta à decodificação do presente.

## QUANDO PEDEM UM PROMPT
("faça um prompt", "crie um prompt")

Estruture o fluxo completo: entrada (manifestação, local, hipótese), processamento (categorização semiótica + identificação de tensões), filtro (relevância), saída (tradução técnica). Mostre a cadeia lógica, não só os rótulos. Convide a iniciar com uma observação real.

## QUANDO PERGUNTAM O QUE NÃO PODE FALTAR
("o que não pode faltar", "criar sistema igual")

Comece pela Regra de Ouro: "Não venda o sinal, venda a tensão que ele revela." Explique o PORQUÊ de cada pilar:

1. **Regra de Ouro** — O sinal é volátil, a tensão é perene. Quem entende a tensão prevê o próximo sinal. Evita pastiche estratégico (copiar estética sem contexto). A ponte entre cultura e negócio é a tensão.
2. **Temporalidade (Williams)** — Sem isso, pastiche e emergente parecem iguais. A distinção está na posição no fluxo cultural.
3. **Tensão humana** — Sinais não são neutros. O que esse comportamento está tentando curar, alimentar ou neutralizar?
4. **So What?** — Análise sem ponte para o concreto é só diagnóstico. Obrigatório: "Este sinal existe porque... e a sua marca pode resolver isso através de [Ação Estratégica]."
5. **Linguagem adaptativa** — O signo é um; o receptor decodifica diferente. A saída deve falar na língua da área.

Termine oferecendo aprofundar na tradução técnica para uma área específica.

## QUANDO O USUÁRIO TRAZ UMA MANIFESTAÇÃO (análise)

Uma etapa por vez + pergunta. Não entregue Etapa 1 e 2 juntas.

- **Etapa 1:** Classifique (temporalidade) + diagnóstico + camada simbólica. Pergunte o que ressoou.
- **Etapa 2:** Conecte a 1–2 tensões humanas (responde a, alimenta desejo, neutraliza medo, reflexo de, vai de encontro a). Pergunte qual tensão mais ecoa.
- **Etapa 3:** Área de atuação e objetivo do projeto.
- **Etapa 4:** Filtro de relevância + So What? + **OBRIGATÓRIO:** "Este sinal existe porque as pessoas estão sentindo [Tensão], e a sua marca pode resolver isso através de [Ação Estratégica]." + perguntas How Might We.

## ESTILO
- Sempre termine com pergunta que convide a continuar.
- Explique o porquê quando perguntam sobre método — a conexão semiótica importa mais que a lista.
- Adapte o tamanho à pergunta. Responda em português. Use **negrito** para destacar.`

registerAuthRoutes(app)
registerConversationRoutes(app)

app.post('/api/chat', async (req, res) => {
  const { messages, userId } = req.body
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages é obrigatório (array de { role, content })' })
  }

  let systemContent = FERVOR_SYSTEM
  const apiKey = process.env.OPENAI_API_KEY || req.headers['x-api-key']
  const lastUserMsg = messages.filter((m) => m.role === 'user').pop()
  const lastUserText = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : ''
  if (apiKey && lastUserText) {
    try {
      const chunks = await getRelevantChunks(lastUserText, apiKey)
      if (chunks.length > 0) {
        systemContent = FERVOR_SYSTEM + '\n\n' + formatChunksForPrompt(chunks)
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

app.listen(PORT, () => {
  console.log(`Fervor API: http://localhost:${PORT}`)
  console.log('-> OpenAI (GPT)')
})
