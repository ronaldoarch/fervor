import { useState, useEffect, useCallback } from 'react'
import {
  getConversations,
  saveConversation,
  deleteConversation,
  createConversation,
  type StoredConversation,
  type StoredMessage,
} from '../services/conversationStorage'

export interface Message {
  id: string
  role: 'agent' | 'user'
  content: string
  timestamp: Date
}

function toMessage(m: StoredMessage): Message {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: new Date(m.timestamp),
  }
}

function toStoredMessage(m: Message): StoredMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp.toISOString(),
  }
}

export function useConversations(userId: string | undefined) {
  const [conversations, setConversations] = useState<StoredConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])

  const refresh = useCallback(() => {
    if (!userId) return
    setConversations(getConversations(userId))
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setConversations([])
      setActiveId(null)
      setMessages([])
      return
    }
    const list = getConversations(userId)
    setConversations(list)
    if (list.length === 0) {
      const newConv = createConversation(userId)
      setConversations([newConv])
      setActiveId(newConv.id)
      setMessages([])
    } else if (!activeId) {
      const latest = list.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0]
      setActiveId(latest.id)
      setMessages(latest.messages.map(toMessage))
    } else {
      const conv = list.find((c) => c.id === activeId)
      if (conv) setMessages(conv.messages.map(toMessage))
    }
  }, [userId])

  useEffect(() => {
    if (!userId || !activeId) return
    const conv = conversations.find((c) => c.id === activeId)
    if (conv) setMessages(conv.messages.map(toMessage))
  }, [userId, activeId, conversations])

  const saveMessages = useCallback(
    (msgs: Message[], title?: string) => {
      if (!userId || !activeId) return
      const existing = conversations.find((c) => c.id === activeId)
      const conv = existing || {
        id: activeId,
        title: title || 'Nova análise',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      conv.messages = msgs.map(toStoredMessage)
      if (title) conv.title = title
      conv.updatedAt = new Date().toISOString()
      saveConversation(userId, conv)
      if (!existing) {
        setConversations((prev) => [conv, ...prev])
      } else {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeId ? { ...conv } : c))
        )
      }
    },
    [userId, activeId, conversations]
  )

  const startNewConversation = useCallback((initialMessages?: Message[]) => {
    if (!userId) return
    const stored = initialMessages?.map(toStoredMessage)
    const newConv = createConversation(userId, 'Nova análise', stored)
    setConversations((prev) => [newConv, ...prev])
    setActiveId(newConv.id)
    setMessages(newConv.messages.map(toMessage))
    return newConv.id
  }, [userId])

  const loadConversation = useCallback((convId: string) => {
    setActiveId(convId)
  }, [])

  const removeConversation = useCallback(
    (convId: string) => {
      if (!userId) return
      deleteConversation(userId, convId)
      const remaining = conversations.filter((c) => c.id !== convId)
      setConversations(remaining)
      if (activeId === convId) {
        if (remaining.length > 0) {
          const next = remaining[0]
          setActiveId(next.id)
          setMessages(next.messages.map(toMessage))
        } else {
          startNewConversation()
        }
      }
    },
    [userId, activeId, conversations, startNewConversation]
  )

  const updateTitle = useCallback(
    (convId: string, title: string) => {
      if (!userId) return
      const conv = conversations.find((c) => c.id === convId)
      if (conv) {
        conv.title = title
        saveConversation(userId, conv)
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title } : c))
        )
      }
    },
    [userId, conversations]
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
  }
}
