import { useState, useEffect, useCallback } from 'react'
import * as conversationApi from '../services/conversationApi'
import { FERVO_WELCOME } from '../constants/fervoCopy'
import {
  clearFervoChatSessionBoot,
  hasFervoChatSessionBooted,
  markFervoChatSessionBooted,
} from '../utils/chatSessionBoot'

/** Evita duas criações em paralelo (ex.: Strict Mode) no primeiro arranque após login. */
const bootConversationInFlight = new Set<string>()

export interface Message {
  id: string
  role: 'agent' | 'user'
  content: string
  timestamp: Date
  imagePreviewUrl?: string
}

const IMAGE_PAYLOAD_PREFIX = '[fervo-image]'

function deserializeStoredUserContent(stored: string): { text: string; imageDataUrl?: string } {
  if (stored.startsWith(IMAGE_PAYLOAD_PREFIX)) {
    try {
      const payload = JSON.parse(stored.slice(IMAGE_PAYLOAD_PREFIX.length)) as {
        text?: string
        imageDataUrl?: string
      }
      return {
        text: payload.text || 'Imagem enviada para análise semiótica.',
        imageDataUrl: payload.imageDataUrl,
      }
    } catch {
      return { text: stored }
    }
  }
  try {
    const parsed = JSON.parse(stored)
    if (Array.isArray(parsed)) {
      const text = parsed
        .filter((part) => part?.type === 'text' && typeof part?.text === 'string')
        .map((part) => part.text)
        .join(' ')
        .trim()
      const imageDataUrl = parsed.find((part) => part?.type === 'image_url')?.image_url?.url
      return {
        text: text || 'Imagem enviada para análise semiótica.',
        imageDataUrl: typeof imageDataUrl === 'string' ? imageDataUrl : undefined,
      }
    }
  } catch {
    // valor simples
  }
  return { text: stored }
}

function serializeUserMessage(text: string, imageDataUrl?: string): string {
  if (!imageDataUrl) return text
  return `${IMAGE_PAYLOAD_PREFIX}${JSON.stringify({ text, imageDataUrl })}`
}

function toMessage(m: conversationApi.ApiMessage): Message {
  if (m.role === 'user') {
    const parsed = deserializeStoredUserContent(m.content)
    return {
      id: m.id,
      role: m.role,
      content: parsed.text,
      imagePreviewUrl: parsed.imageDataUrl,
      timestamp: new Date(m.timestamp),
    }
  }
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: new Date(m.timestamp),
  }
}

export interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export function useConversations(userId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!userId) return
    try {
      const list = await conversationApi.getConversations()
      setConversations(list)
      if (list.length === 0) {
        const newConv = await conversationApi.createConversation('Nova análise', [
          { role: 'agent', content: FERVO_WELCOME },
        ])
        setConversations([newConv])
        setActiveId(newConv.id)
        setMessages((newConv.messages || []).map(toMessage))
        markFervoChatSessionBooted(userId)
      } else if (!activeId) {
        const resumeLast = hasFervoChatSessionBooted(userId)
        if (!resumeLast) {
          if (bootConversationInFlight.has(userId)) {
            return
          }
          bootConversationInFlight.add(userId)
          try {
            const newConv = await conversationApi.createConversation('Nova análise', [
              { role: 'agent', content: FERVO_WELCOME },
            ])
            markFervoChatSessionBooted(userId)
            setConversations([newConv, ...list])
            setActiveId(newConv.id)
            setMessages((newConv.messages || []).map(toMessage))
          } catch (createErr) {
            console.error('Erro ao criar conversa inicial:', createErr)
            clearFervoChatSessionBoot()
            const latest = list[0]
            setActiveId(latest.id)
            const full = await conversationApi.getConversation(latest.id)
            setMessages((full.messages || []).map(toMessage))
          } finally {
            bootConversationInFlight.delete(userId)
          }
        } else {
          const latest = list[0]
          setActiveId(latest.id)
          const full = await conversationApi.getConversation(latest.id)
          setMessages((full.messages || []).map(toMessage))
        }
      }
    } catch (err) {
      console.error('Erro ao carregar conversas:', err)
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [userId, activeId])

  useEffect(() => {
    if (!userId) {
      setConversations([])
      setActiveId(null)
      setMessages([])
      setLoading(false)
      return
    }
    setLoading(true)
    refresh()
  }, [userId])

  useEffect(() => {
    if (!userId || !activeId) return
    const conv = conversations.find((c) => c.id === activeId)
    if (!conv) return
    conversationApi
      .getConversation(activeId)
      .then((full) => setMessages((full.messages || []).map(toMessage)))
      .catch(() => setMessages([]))
  }, [userId, activeId])

  const saveMessages = useCallback(
    async (msgs: Message[], title?: string) => {
      if (!userId || !activeId) return
      setSaving(true)
      try {
        await conversationApi.updateConversation(activeId, {
          title: title ?? undefined,
          messages: msgs.map((m) => ({
            role: m.role,
            content:
              m.role === 'user'
                ? serializeUserMessage(m.content, m.imagePreviewUrl)
                : m.content,
          })),
        })
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId
              ? { ...c, title: title ?? c.title, updatedAt: new Date().toISOString() }
              : c
          )
        )
      } catch (err) {
        console.error('Erro ao salvar:', err)
      } finally {
        setSaving(false)
      }
    },
    [userId, activeId]
  )

  const startNewConversation = useCallback(
    async (initialMessages?: Message[]) => {
      if (!userId) return null
      try {
        const stored =
          initialMessages != null && initialMessages.length > 0
            ? initialMessages.map((m) => ({
                role: m.role,
                content:
                  m.role === 'user'
                    ? serializeUserMessage(m.content, m.imagePreviewUrl)
                    : m.content,
              }))
            : [{ role: 'agent' as const, content: FERVO_WELCOME }]
        const newConv = await conversationApi.createConversation('Nova análise', stored)
        setConversations((prev) => [newConv, ...prev])
        setActiveId(newConv.id)
        setMessages((newConv.messages || []).map(toMessage))
        return newConv.id
      } catch (err) {
        console.error('Erro ao criar conversa:', err)
        return null
      }
    },
    [userId]
  )

  const loadConversation = useCallback((convId: string) => {
    setActiveId(convId)
  }, [])

  const removeConversation = useCallback(
    async (convId: string) => {
      if (!userId) return
      try {
        await conversationApi.deleteConversation(convId)
        const remaining = conversations.filter((c) => c.id !== convId)
        setConversations(remaining)
        if (activeId === convId) {
          if (remaining.length > 0) {
            const next = remaining[0]
            setActiveId(next.id)
            const full = await conversationApi.getConversation(next.id)
            setMessages((full.messages || []).map(toMessage))
          } else {
            await startNewConversation()
          }
        }
      } catch (err) {
        console.error('Erro ao excluir:', err)
      }
    },
    [userId, activeId, conversations, startNewConversation]
  )

  const updateTitle = useCallback(
    async (convId: string, title: string) => {
      if (!userId) return
      try {
        await conversationApi.updateConversation(convId, { title })
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title } : c))
        )
      } catch (err) {
        console.error('Erro ao atualizar título:', err)
      }
    },
    [userId]
  )

  return {
    conversations,
    activeId,
    messages,
    setMessages,
    saveMessages,
    startNewConversation,
    loadConversation,
    removeConversation,
    updateTitle,
    refresh,
    loading,
    saving,
  }
}
