import { headers } from './authApi'

const API = '/api/conversations'

export interface ApiMessage {
  id: string
  role: 'agent' | 'user'
  content: string
  timestamp: string
}

export interface ApiConversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages?: ApiMessage[]
}

export async function getConversations(): Promise<ApiConversation[]> {
  const res = await fetch(API, { headers: headers() })
  if (!res.ok) throw new Error('Erro ao carregar conversas')
  return res.json()
}

export async function getConversation(id: string): Promise<ApiConversation> {
  const res = await fetch(`${API}/${id}`, { headers: headers() })
  if (!res.ok) throw new Error('Conversa não encontrada')
  return res.json()
}

export async function createConversation(
  title = 'Nova análise',
  messages: { role: 'agent' | 'user'; content: string }[] = []
): Promise<ApiConversation> {
  const res = await fetch(API, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ title, messages }),
  })
  if (!res.ok) throw new Error('Erro ao criar conversa')
  return res.json()
}

export async function updateConversation(
  id: string,
  data: { title?: string; messages?: { role: 'agent' | 'user'; content: string }[] }
): Promise<ApiConversation> {
  const res = await fetch(`${API}/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Erro ao salvar conversa')
  return res.json()
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`${API}/${id}`, { method: 'DELETE', headers: headers() })
  if (!res.ok) throw new Error('Erro ao excluir conversa')
}
