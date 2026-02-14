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

function getStorage(): Storage {
  try {
    localStorage.setItem('_', '_')
    localStorage.removeItem('_')
    return localStorage
  } catch {
    return sessionStorage
  }
}

function getKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function getConversations(userId: string): StoredConversation[] {
  try {
    const raw = getStorage().getItem(getKey(userId))
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export function saveConversation(userId: string, conv: StoredConversation) {
  try {
    const all = getConversations(userId)
    const idx = all.findIndex((c) => c.id === conv.id)
    const updated = { ...conv, updatedAt: new Date().toISOString() }
    const newList = idx >= 0 ? [...all.slice(0, idx), updated, ...all.slice(idx + 1)] : [...all, updated]
    getStorage().setItem(getKey(userId), JSON.stringify(newList))
  } catch {
    // storage bloqueado - ignora silenciosamente
  }
}

export function deleteConversation(userId: string, convId: string) {
  try {
    const all = getConversations(userId).filter((c) => c.id !== convId)
    getStorage().setItem(getKey(userId), JSON.stringify(all))
  } catch {
    // storage bloqueado
  }
}

export function createConversation(
  userId: string,
  title = 'Nova análise',
  initialMessages: StoredMessage[] = []
): StoredConversation {
  const now = new Date().toISOString()
  const conv: StoredConversation = {
    id: generateId(),
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
