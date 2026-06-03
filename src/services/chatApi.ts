import { getToken } from './authApi'

const API_URL = '/api/chat'

export interface SendFervoResult {
  content: string
  /** Resposta já gravada no servidor (como no ChatGPT); ao voltar ao app, recarregue a conversa. */
  persisted: boolean
}

export type ChatMessageContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >

export async function sendToFervo(
  messages: { role: 'user' | 'agent'; content: ChatMessageContent }[],
  apiKey?: string,
  userId?: string,
  conversationId?: string | null
): Promise<SendFervoResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (apiKey) headers['x-api-key'] = apiKey
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const bodyStr = JSON.stringify({
    messages,
    userId: userId || undefined,
    conversationId: conversationId || undefined,
  })
  /** Limite ~64KB do Chrome; keepalive ajuda a concluir o POST se a aba fechar durante a análise. */
  const keepalive = bodyStr.length < 58_000

  const res = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: bodyStr,
    keepalive,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `Erro ${res.status}`)
  }

  const data = await res.json()
  return {
    content: data.content ?? '',
    persisted: Boolean(data.persisted),
  }
}
