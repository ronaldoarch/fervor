const API_URL = '/api/chat'

export async function sendToFervor(
  messages: { role: 'user' | 'agent'; content: string }[],
  apiKey?: string,
  userId?: string
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (apiKey) headers['x-api-key'] = apiKey

  const res = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages, userId: userId || undefined }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `Erro ${res.status}`)
  }

  const data = await res.json()
  return data.content ?? ''
}
