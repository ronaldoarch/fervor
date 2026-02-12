export interface StoredMessage {
  id: string
  role: 'agent' | 'user'
  content: string
  timestamp: string
}

export interface StoredConversation {
  id: string
  title: string
  messages: StoredMessage[]
  createdAt: string
  updatedAt: string
}

const STORAGE_PREFIX = 'fervor_conv_'

function getKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`
}

export function getConversations(userId: string): StoredConversation[] {
  try {
    const raw = localStorage.getItem(getKey(userId))
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export function saveConversation(userId: string, conv: StoredConversation) {
  const all = getConversations(userId)
  const idx = all.findIndex((c) => c.id === conv.id)
  const updated = { ...conv, updatedAt: new Date().toISOString() }
  const newList = idx >= 0 ? [...all.slice(0, idx), updated, ...all.slice(idx + 1)] : [...all, updated]
  localStorage.setItem(getKey(userId), JSON.stringify(newList))
}

export function deleteConversation(userId: string, convId: string) {
  const all = getConversations(userId).filter((c) => c.id !== convId)
  localStorage.setItem(getKey(userId), JSON.stringify(all))
}

export function createConversation(
  userId: string,
  title = 'Nova análise',
  initialMessages: StoredMessage[] = []
): StoredConversation {
  const now = new Date().toISOString()
  const conv: StoredConversation = {
    id: crypto.randomUUID(),
    title,
    messages: initialMessages,
    createdAt: now,
    updatedAt: now,
  }
  saveConversation(userId, conv)
  return conv
}

export function updateConversationTitle(userId: string, convId: string, title: string) {
  const all = getConversations(userId)
  const conv = all.find((c) => c.id === convId)
  if (conv) {
    conv.title = title
    conv.updatedAt = new Date().toISOString()
    saveConversation(userId, conv)
  }
}
