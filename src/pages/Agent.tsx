import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useConversationsContext } from '../contexts/ConversationsContext'
import * as conversationApi from '../services/conversationApi'
import { sendToFervo } from '../services/chatApi'
import { sanitizeAgentText } from '../utils/sanitizeAgentText'
import {
  getFervoNotificationPermission,
  notifyFervoReplyReady,
  notificationsSupported,
  requestFervoNotificationPermission,
  requestPersistentStorage,
  setFervoChatSurfaceMounted,
} from '../utils/responseNotification'
import { FERVO_ETAPA_3_BODY } from '../constants/fervoCopy'
import {
  processarEtapa1,
  processarEtapa2,
  processarEtapa4,
  gerarPerguntasProvocativas,
  gerarAprofundamentoEtapa2,
} from '../agent/processor'
import { exportAnalysisToPdf } from '../utils/exportAnalysisPdf'
import type { ContextoUsuario, Etapa, Manifestacao } from '../agent/types'
import './Agent.css'

interface Message {
  id: string
  role: 'agent' | 'user'
  content: string
  timestamp: Date
  analise?: unknown
}

function TypewriterContent({ content, onComplete }: { content: string; onComplete: () => void }) {
  const [display, setDisplay] = useState('')
  const [done, setDone] = useState(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (content.length === 0) {
      setDone(true)
      onCompleteRef.current()
      return
    }
    let i = 0
    const step = 2
    const delay = 25
    let timer: ReturnType<typeof setInterval> | null = null
    let completed = false

    const finish = () => {
      if (completed) return
      completed = true
      if (timer != null) {
        clearInterval(timer)
        timer = null
      }
      i = content.length
      setDisplay(content)
      setDone(true)
      onCompleteRef.current()
    }

    const onVisibility = () => {
      if (document.hidden) finish()
    }
    document.addEventListener('visibilitychange', onVisibility)

    timer = setInterval(() => {
      if (document.hidden) return
      i = Math.min(i + step, content.length)
      setDisplay(content.slice(0, i))
      if (i >= content.length) finish()
    }, delay)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      if (timer != null) clearInterval(timer)
    }
  }, [content])

  return (
    <div className="message-content">
      {display.split('\n').map((line, i) => (
        <p key={i}>
          {line ? line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={j}>{part.slice(2, -2)}</strong>
              : part
          ) : <br />}
        </p>
      ))}
      {!done && <span className="typewriter-cursor">|</span>}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="message message-agent typing-indicator">
      <div className="typing-dots">
        <span></span><span></span><span></span>
      </div>
    </div>
  )
}

export default function Agent() {
  const { user, logout, isAdmin } = useAuth()
  const {
    conversations,
    activeId,
    messages: storedMessages,
    setMessages,
    saveMessages,
    startNewConversation,
    loadConversation,
    refresh,
  } = useConversationsContext()

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    setFervoChatSurfaceMounted(true)
    return () => {
      mountedRef.current = false
      setFervoChatSurfaceMounted(false)
    }
  }, [])

  const [input, setInput] = useState('')
  const [etapa, setEtapa] = useState<Etapa>('inicio')
  const [contexto, setContexto] = useState<Partial<ContextoUsuario>>({})
  const [manifestacoes, setManifestacoes] = useState<Manifestacao[]>([])
  const [indiceManifestacao, setIndiceManifestacao] = useState(0)
  const [aguardando, setAguardando] = useState(false)
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [useAI, setUseAI] = useState<boolean | null>(null) // null = ainda não testou
  const [notifyPerm, setNotifyPerm] = useState(() => getFervoNotificationPermission())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  /** Quantas vezes o usuário pediu aprofundamento na Etapa 2 (heurística). */
  const profundidadeEtapa2Ref = useRef(0)

  const deliverAgentMessage = (content: string, analise?: unknown) => {
    addMessage('agent', content, analise)
    void notifyFervoReplyReady(content).catch(() => {})
  }

  const handleEnableNotifications = async (e: React.MouseEvent) => {
    e.preventDefault()
    const p = await requestFervoNotificationPermission()
    setNotifyPerm(p)
  }

  useEffect(() => {
    const sync = () => setNotifyPerm(getFervoNotificationPermission())
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  useEffect(() => {
    void requestPersistentStorage()
  }, [])

  /** Se o servidor gravou a resposta enquanto a aba estava em segundo plano, ao voltar puxa do banco (padrão tipo ChatGPT). */
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible' || !activeId) return
      void conversationApi.getConversation(activeId).then((full) => {
        const remote = full.messages || []
        setMessages((cur) => {
          if (remote.length <= cur.length) return cur
          return remote.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.timestamp),
          }))
        })
      })
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [activeId, setMessages])

  const messages = storedMessages

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => { scrollToBottom() }, [messages, aguardando, typingMessageId])
  useEffect(() => {
    if (!typingMessageId) return
    const t = setInterval(scrollToBottom, 80)
    return () => clearInterval(t)
  }, [typingMessageId])

  const addMessage = (role: 'agent' | 'user', content: string, analise?: unknown) => {
    addMessageAndReturn(role, content, analise)
  }

  const addMessageAndReturn = (role: 'agent' | 'user', content: string, analise?: unknown): Message => {
    const newMsg: Message = {
      id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role,
      content,
      timestamp: new Date(),
      analise,
    }
    setMessages((prev) => {
      const isFirstUserMsg = prev.filter((m) => m.role === 'user').length === 0
      const base = prev.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            analise: (m as Message & { analise?: unknown }).analise,
          }))
      const next = [...base, newMsg]
      const title = role === 'user' && isFirstUserMsg
        ? content.slice(0, 40) + (content.length > 40 ? '...' : '')
        : undefined
      saveMessages(next, title)
      return next
    })
    return newMsg
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || aguardando) return

    const userMsg = input.trim()
    setInput('')
    setAguardando(true)

    const snapshot = messages
    const isFirstUserMsg = snapshot.filter((m) => m.role === 'user').length === 0
    const newUserMsg: Message = {
      id:
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role: 'user',
      content: userMsg,
      timestamp: new Date(),
    }
    const baseMsgs = snapshot.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      analise: (m as Message & { analise?: unknown }).analise,
    }))
    const nextWithUser: Message[] = [...baseMsgs, newUserMsg]
    const chatTitle =
      isFirstUserMsg ? userMsg.slice(0, 40) + (userMsg.length > 40 ? '...' : '') : undefined

    setMessages(nextWithUser)
    await saveMessages(nextWithUser, chatTitle)

    const apiMessages = nextWithUser.map((m) => ({
      role: m.role as 'user' | 'agent',
      content: m.content,
    }))

    try {
      if (useAI !== false) {
        const { content: rawContent, persisted } = await sendToFervo(
          apiMessages,
          undefined,
          user?.id,
          activeId
        )
        const content = sanitizeAgentText(rawContent)
        setUseAI(true)
        if (persisted && activeId) {
          const full = await conversationApi.getConversation(activeId)
          setMessages(
            (full.messages || []).map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: new Date(m.timestamp),
            }))
          )
          const msgs = full.messages || []
          const lastAgent = [...msgs].reverse().find((m) => m.role === 'agent')
          if (lastAgent) setTypingMessageId(lastAgent.id)
          await refresh()
        } else {
          const msg = addMessageAndReturn('agent', content)
          setTypingMessageId(msg.id)
        }
        await notifyFervoReplyReady(content)
      } else {
        throw new Error('Usando heurística')
      }
    } catch (err) {
      console.warn('API falhou, usando heurística:', err)
      await runHeuristic(userMsg)
    } finally {
      if (mountedRef.current) {
        setAguardando(false)
        inputRef.current?.focus()
      }
    }
  }

  const runHeuristic = async (userMsg: string) => {
    if (etapa === 'inicio') {
      profundidadeEtapa2Ref.current = 0
      const manifestMatch = userMsg.match(/(?:manifesta[çc][õo]es?\s*[:\-]?\s*)(.+?)(?=local|$)/is)
      const localMatch = userMsg.match(/(?:local\s*(?:da\s*)?observa[çc][ãa]o?\s*[:\-]?\s*)(.+?)(?=hip[óo]tese|$)/is)
      const hipMatch = userMsg.match(/(?:hip[óo]tese\s*(?:inicial)?\s*[:\-]?\s*)(.+?)$/is)
      const ctx: Partial<ContextoUsuario> = {
        manifestacoesObservadas: (manifestMatch?.[1]?.trim() || userMsg.split(/\n\n|\n/)[0] || userMsg).trim(),
        localObservacao: (localMatch?.[1]?.trim() || userMsg.split(/\n\n|\n/)[1] || '').trim(),
        hipoteseInicial: (hipMatch?.[1]?.trim() || userMsg.split(/\n\n|\n/)[2] || '').trim(),
      }
      setContexto(ctx)

      const manifestacoesResult = processarEtapa1(ctx as ContextoUsuario)
      setManifestacoes(manifestacoesResult)

      let analiseEtapa1 =
        'Ótimo, vamos começar com a análise e categorização dessa manifestação cultural.\n\n' +
        'ETAPA 1\n\n' +
        'O Radar Cultural: Análise e Categorização\n\n'
      for (const m of manifestacoesResult) {
        analiseEtapa1 += `**${m.nome}**\n`
        analiseEtapa1 += `- **Categoria:** ${m.categoria}\n`
        analiseEtapa1 += `- **Diagnóstico:** ${m.diagnostico}\n`
        analiseEtapa1 += `- **Camada Simbólica:** ${m.camadaSimbolica}\n\n`
      }

      const m0 = manifestacoesResult[0]
      const conexao = processarEtapa2(m0)
      let analiseEtapa2 =
        '\nETAPA 2\n\n' +
        'A tensão psicológica: Conexão com Expectativas\n\n'
      analiseEtapa2 += `- Esse sinal **responde a** ${conexao.respondeA}\n`
      analiseEtapa2 += `- Esse sinal **alimenta o desejo por** ${conexao.alimentaDesejo}\n`
      analiseEtapa2 += `- Esse sinal **tenta neutralizar o medo de** ${conexao.neutralizaMedo}\n`
      analiseEtapa2 += `- Esse sinal **é reflexo de** ${conexao.reflexoDe}\n`
      analiseEtapa2 += `- Esse sinal **vai de encontro a** ${conexao.encontraEm}\n\n`
      analiseEtapa2 +=
        'Essa leitura ressoa com o que você observou, ou tem outro ângulo que quer explorar?\n\n' +
        'Se quiser uma leitura **mais aprofundada** nesta mesma etapa (mais tensões, contrastes e camadas de significado), responda com **aprofundar**. É opcional: o que veio até aqui já fecha bem a Etapa 2 para quem prefere seguir no ritmo direto.'

      setEtapa('etapa2')
      deliverAgentMessage(sanitizeAgentText(analiseEtapa1 + analiseEtapa2), {
        manifestacoes: manifestacoesResult,
      })
    } else if (etapa === 'etapa2') {
      const trimmed = userMsg.trim()
      const negouAprofundar = /\b(n[aã]o quero aprofund|sem aprofund|n[aã]o precisa aprofund)\b/i.test(
        trimmed
      )
      const querAprofundar =
        !negouAprofundar &&
        /\b(aprofundar|aprofundamento|mais fundo|mais denso|vers[aã]o estendida|leitura mais (rica|profunda)|mais camadas|mais tens[oõ]es)\b/i.test(
          trimmed
        )

      if (querAprofundar) {
        const m = manifestacoes[indiceManifestacao] || manifestacoes[0]
        const texto = gerarAprofundamentoEtapa2(m, contexto, profundidadeEtapa2Ref.current)
        profundidadeEtapa2Ref.current += 1
        deliverAgentMessage(texto)
        return
      }

      const recua = /^(não|nao)\b/i.test(trimmed) && trimmed.length < 48
      const seguir =
        !recua &&
        (/^(sim|s|ok|yes|y)\b/i.test(trimmed) ||
          /\b(vamos|avanç|avançar|seguir|bora|perfeito|pode ser|beleza)\b/i.test(trimmed.toLowerCase()))

      if (seguir) {
        const resp = `Ótimo!\n\n${FERVO_ETAPA_3_BODY}`
        setEtapa('etapa3')
        deliverAgentMessage(resp)
      } else if (recua) {
        deliverAgentMessage(
          'Sem problema. O que não ressoou com você, ou que ângulo você gostaria de aprofundar antes da gente seguir?'
        )
      } else {
        deliverAgentMessage(
          'Anotado. Quando quiser ir para a etapa prática (pivô), responda **sim** ou diga que podemos seguir.'
        )
      }
    } else if (etapa === 'etapa3') {
      const partes = userMsg.split(/\n\n+/).map((s) => s.trim()).filter(Boolean)
      const area = partes[0] || userMsg
      const onde = partes.length >= 3 ? partes[1] : ''
      const objetivo = partes.length >= 3 ? partes[2] : partes[1] || ''
      const resumoObjetivo =
        [onde && `Aplicação: ${onde}`, objetivo && `Objetivo: ${objetivo}`].filter(Boolean).join(' — ') ||
        userMsg

      setContexto((c) => ({
        ...c,
        areaAtuacao: area,
        ondeAplicarInsights: onde || undefined,
        objetivoProjeto: objetivo || resumoObjetivo,
      }))

      const m = manifestacoes[indiceManifestacao] || manifestacoes[0]
      const traducao = processarEtapa4(m, area, resumoObjetivo)
      const perguntas = gerarPerguntasProvocativas(area)

      let resp =
        'ETAPA 4\n\n' +
        '"So what?": Tradução Estratégica\n\n'
      const filtroLabel = traducao.filtroRelevancia === 'aplicar' ? 'APLICAR' : 'DESCARTAR'
      resp += `**Filtro de Relevância:** ${filtroLabel}\n`
      resp += `${traducao.motivoFiltro}\n\n`
      resp += `**So what?** ${traducao.soWhat}\n\n`
      resp += `**Adaptação:** ${traducao.adaptacao}\n\n`
      resp += 'Provocação: Agora é a sua vez\n\n'
      resp += 'Do Fervô pra você:\n\n'
      for (const p of perguntas) {
        resp += `• ${p}\n`
      }
      resp += '\nQuer uma nova análise? É só mandar novas observações aqui.'
      setEtapa('finalizado')
      deliverAgentMessage(resp)
    } else if (etapa === 'finalizado') {
      profundidadeEtapa2Ref.current = 0
      setEtapa('inicio')
      setContexto({})
      setManifestacoes([])
      setIndiceManifestacao(0)
    }
  }

  const handleNewChat = () => {
    profundidadeEtapa2Ref.current = 0
    setEtapa('inicio')
    setContexto({})
    setManifestacoes([])
    setIndiceManifestacao(0)
    setUseAI(null)
    startNewConversation()
  }

  const handleSelectConversation = (convId: string) => {
    if (convId === activeId) return
    profundidadeEtapa2Ref.current = 0
    setEtapa('inicio')
    setContexto({})
    setManifestacoes([])
    setIndiceManifestacao(0)
    loadConversation(convId)
  }

  const handleExportPdf = async () => {
    if (messages.length === 0 || aguardando) return
    setExportingPdf(true)
    try {
      const conv = conversations.find((c) => c.id === activeId)
      await exportAnalysisToPdf({
        conversationTitle: conv?.title || 'Análise Fervô',
        userName: user?.name,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
      })
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Não foi possível gerar o PDF. Tente de novo.')
    } finally {
      setExportingPdf(false)
    }
  }

  return (
    <div className="agent-page">
      <header className="agent-header">
        <div className="header-left">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen((s) => !s)} aria-label="Abrir conversas">☰</button>
          <h1>Fervô</h1>
          <span className="agent-badge">Agente de Tendência</span>
        </div>
        <nav className="header-nav">
          {notificationsSupported() && notifyPerm === 'default' && (
            <button
              type="button"
              className="btn-notify"
              onClick={handleEnableNotifications}
              title="Aviso do sistema quando o Fervô terminar (outro app ou aba em segundo plano)"
            >
              Ativar avisos
            </button>
          )}
          {notificationsSupported() && notifyPerm === 'granted' && (
            <span className="notify-on" title="Você receberá aviso ao sair do chat ou da aba">
              Avisos ativos
            </span>
          )}
          {notificationsSupported() && notifyPerm === 'denied' && (
            <span className="notify-off" title="Permissão negada — ative nas configurações do navegador se quiser avisos">
              Avisos bloqueados
            </span>
          )}
          {isAdmin && (
            <Link to="/admin" className="nav-link">Admin</Link>
          )}
          <span className="user-name">{user?.name}</span>
          <button onClick={logout} className="btn-logout">Sair</button>
        </nav>
      </header>

      <div className="agent-layout">
        <aside className={`conversations-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <button className="btn-new-chat" onClick={() => { handleNewChat(); setSidebarOpen(false) }}>
            + Nova análise
          </button>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu">×</button>
          <ul className="conversations-list">
            {conversations
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((conv) => (
                <li key={conv.id}>
                  <button
                    className={`conv-item ${conv.id === activeId ? 'active' : ''}`}
                    onClick={() => { handleSelectConversation(conv.id); setSidebarOpen(false) }}
                    title={conv.title}
                  >
                    <span className="conv-title">{conv.title}</span>
                    <span className="conv-date">
                      {new Date(conv.updatedAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </aside>

        <main className="agent-main">
          <div className="chat-toolbar">
            <button
              type="button"
              className="btn-export-pdf"
              disabled={messages.length === 0 || aguardando || exportingPdf}
              title="Baixar esta conversa em PDF (A4)"
              onClick={() => void handleExportPdf()}
            >
              {exportingPdf ? 'Gerando PDF…' : 'Exportar análise em PDF'}
            </button>
          </div>
          <div className="chat-container">
            <div className="messages">
              {messages.length === 0 && !aguardando && (
                <div className="empty-state">
                  <p>Carregando a conversa…</p>
                </div>
              )}
              {messages.map((msg) => {
                const display =
                  msg.role === 'agent' ? sanitizeAgentText(msg.content) : msg.content
                return (
                <div key={msg.id} className={`message message-${msg.role}`}>
                  {msg.role === 'agent' && msg.id === typingMessageId ? (
                    <TypewriterContent
                      content={display}
                      onComplete={() => setTypingMessageId(null)}
                    />
                  ) : (
                    <div className="message-content">
                      {display.split('\n').map((line, i) => (
                        <p key={i}>
                          {line ? line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
                            part.startsWith('**') && part.endsWith('**')
                              ? <strong key={j}>{part.slice(2, -2)}</strong>
                              : part
                          ) : <br />}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )})}
              {aguardando && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            <p className="notify-footnote">
              A resposta do Fervô também é <strong>gravada no servidor</strong> ao terminar (como no ChatGPT):
              ao voltar ao app ou à aba, a conversa atualiza sozinha. Use <strong>Ativar avisos</strong> para
              alerta ao sair; em aparelhos muito restritivos o navegador pode pausar o site por um tempo.
            </p>
            <form onSubmit={handleSubmit} className="input-form">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua mensagem, manifestação cultural ou análise..."
                rows={3}
                disabled={aguardando}
              />
              <button type="submit" disabled={aguardando || !input.trim()}>
                {aguardando ? '...' : 'Enviar'}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}
