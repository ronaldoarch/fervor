import { createContext, useContext, type ReactNode } from 'react'
import { useConversations } from '../hooks/useConversations'

type ConversationsValue = ReturnType<typeof useConversations>

const ConversationsContext = createContext<ConversationsValue | null>(null)

export function ConversationsProvider({
  userId,
  children,
}: {
  userId: string
  children: ReactNode
}) {
  const value = useConversations(userId)
  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  )
}

export function useConversationsContext(): ConversationsValue {
  const ctx = useContext(ConversationsContext)
  if (!ctx) {
    throw new Error('useConversationsContext deve ser usado dentro de ConversationsProvider')
  }
  return ctx
}
