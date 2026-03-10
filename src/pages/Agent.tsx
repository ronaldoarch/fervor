import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useConversations } from '../hooks/useConversations'
import { sendToFervor } from '../services/chatApi'
import {
  processarEtapa1,
  processarEtapa2,
  processarEtapa4,
  gerarPerguntasProvocativas,
} from '../agent/processor'
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
    const timer = setInterval(() => {
      i = Math.min(i + step, content.length)
      setDisplay(content.slice(0, i))
      if (i >= content.length) {
        clearInterval(timer)
        setDone(true)
        onCompleteRef.current()
      }
    }, delay)
    return () => clearInterval(timer)
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
  } = useConversations(user?.id)

  const [input, setInput] = useState('')
  const [etapa, setEtapa] = useState<Etapa>('inicio')
  const [contexto, setContexto] = useState<Partial<ContextoUsuario>>({})
  const [manifestacoes, setManifestacoes] = useState<Manifestacao[]>([])
  const [indiceManifestacao, setIndiceManifestacao] = useState(0)
  const [aguardando, setAguardando] = useState(false)
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [useAI, setUseAI] = useState<boolean | null>(null) // null = ainda não testou
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

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
    addMessage('user', userMsg)
    setAguardando(true)

    const apiMessages = [
      ...messages.map((m) => ({ role: m.role as 'user' | 'agent', content: m.content })),
      { role: 'user' as const, content: userMsg },
    ]

    try {
      if (useAI !== false) {
        const content = await sendToFervor(apiMessages, undefined, user?.id)
        setUseAI(true)
        const msg = addMessageAndReturn('agent', content)
        setTypingMessageId(msg.id)
      } else {
        throw new Error('Usando heurística')
      }
    } catch (err) {
      console.warn('API falhou, usando heurística:', err)
      await runHeuristic(userMsg)
    } finally {
      setAguardando(false)
      inputRef.current?.focus()
    }
  }

  const runHeuristic = async (userMsg: string) => {
    if (etapa === 'inicio') {
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

      let analiseEtapa1 = '## ETAPA 1: ANÁLISE E CATEGORIZAÇÃO (O Radar Cultural)\n\n'
      for (const m of manifestacoesResult) {
        analiseEtapa1 += `**${m.nome}**\n`
        analiseEtapa1 += `- **Categoria:** ${m.categoria}\n`
        analiseEtapa1 += `- **Diagnóstico:** ${m.diagnostico}\n`
        analiseEtapa1 += `- **Camada Simbólica:** ${m.camadaSimbolica}\n\n`
      }

      const m0 = manifestacoesResult[0]
      const conexao = processarEtapa2(m0)
      let analiseEtapa2 = '\n---\n\n## ETAPA 2: CONEXÃO COM EXPECTATIVAS (A Tensão Psicológica)\n\n'
      analiseEtapa2 += `- Esse sinal **responde a** ${conexao.respondeA}\n`
      analiseEtapa2 += `- Esse sinal **alimenta o desejo por** ${conexao.alimentaDesejo}\n`
      analiseEtapa2 += `- Esse sinal **tenta neutralizar o medo de** ${conexao.neutralizaMedo}\n`
      analiseEtapa2 += `- Esse sinal **é reflexo de** ${conexao.reflexoDe}\n`
      analiseEtapa2 += `- Esse sinal **vai de encontro a** ${conexao.encontraEm}\n\n`
      analiseEtapa2 += '**PAUSA OBRIGATÓRIA:** A análise faz sentido para você? Responda sim ou não para prosseguirmos à Etapa 3.'

      setEtapa('etapa2')
      addMessage('agent', analiseEtapa1 + analiseEtapa2, { manifestacoes: manifestacoesResult })
    } else if (etapa === 'etapa2') {
      const confirmou = /sim|s|yes|y/i.test(userMsg)
      if (confirmou) {
        const resp = 'Ótimo! A análise faz sentido.\n\n## ETAPA 3: INTERAÇÃO E CONTEXTUALIZAÇÃO (O Pivô)\n\nAgora preciso de mais duas informações:\n\n**Área de atuação:** (Design, Moda, Branding, etc.)\n\n**Objetivo do projeto específico:**'
        setEtapa('etapa3')
        addMessage('agent', resp)
      } else {
        addMessage('agent', 'Entendo. Podemos ajustar a análise. O que não fez sentido para você? Descreva e podemos refinar antes de prosseguir.')
      }
    } else if (etapa === 'etapa3') {
      const partes = userMsg.split(/\n\n|\n/)
      const area = partes[0] || userMsg
      const objetivo = partes[1] || userMsg

      setContexto((c) => ({ ...c, areaAtuacao: area, objetivoProjeto: objetivo }))

      const m = manifestacoes[indiceManifestacao] || manifestacoes[0]
      const traducao = processarEtapa4(m, area, objetivo)
      const perguntas = gerarPerguntasProvocativas(area)

      let resp = '## ETAPA 4: TRADUÇÃO ESTRATÉGICA ("SO WHAT?")\n\n'
      resp += `**Filtro de Relevância:** ${traducao.filtroRelevancia.toUpperCase()}\n`
      resp += `${traducao.motivoFiltro}\n\n`
      resp += `**So What?** ${traducao.soWhat}\n\n`
      resp += `**Adaptação:** ${traducao.adaptacao}\n\n`
      resp += '---\n\n**Perguntas provocativas:**\n\n'
      for (const p of perguntas) {
        resp += `• ${p}\n`
      }
      resp += '\n\nPosso iniciar uma nova análise? Basta me enviar suas novas manifestações.'
      setEtapa('finalizado')
      addMessage('agent', resp)
    } else if (etapa === 'finalizado') {
      setEtapa('inicio')
      setContexto({})
      setManifestacoes([])
      setIndiceManifestacao(0)
    }
  }

  const handleNewChat = () => {
    setEtapa('inicio')
    setContexto({})
    setManifestacoes([])
    setIndiceManifestacao(0)
    setUseAI(null)
    startNewConversation([])
  }

  const handleSelectConversation = (convId: string) => {
    if (convId === activeId) return
    setEtapa('inicio')
    setContexto({})
    setManifestacoes([])
    setIndiceManifestacao(0)
    loadConversation(convId)
  }

  return (
    <div className="agent-page">
      <header className="agent-header">
        <div className="header-left">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen((s) => !s)} aria-label="Abrir conversas">☰</button>
          <h1>Fervor</h1>
          <span className="agent-badge">Agente de Tendência</span>
        </div>
        <nav className="header-nav">
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
          <div className="chat-container">
            <div className="messages">
              {messages.length === 0 && !aguardando && (
                <div className="empty-state">
                  <p>Comece a conversa — digite sua observação cultural, manifestação ou pergunta abaixo.</p>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`message message-${msg.role}`}>
                  {msg.role === 'agent' && msg.id === typingMessageId ? (
                    <TypewriterContent
                      content={msg.content}
                      onComplete={() => setTypingMessageId(null)}
                    />
                  ) : (
                    <div className="message-content">
                      {msg.content.split('\n').map((line, i) => (
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
              ))}
              {aguardando && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

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
