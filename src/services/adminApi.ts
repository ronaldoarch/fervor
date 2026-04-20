import { headers } from './authApi'

const API = '/api/admin'

export interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  createdAt: string
}

export interface AdminSettings {
  systemPrompt: string
  openaiModel: string
}

export interface AdminStats {
  userCount: number
  conversationCount: number
  messageCount: number
  assistantReplyCount: number
  usersLast14Days: number
  conversationsLast14Days: number
  messagesByDay: { day: string; count: number }[]
}

async function parseError(res: Response): Promise<string> {
  const j = await res.json().catch(() => ({}))
  return (j as { error?: string }).error || res.statusText
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const res = await fetch(`${API}/users`, { headers: headers() })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function patchAdminUser(
  id: string,
  data: { role?: string; name?: string }
): Promise<AdminUser> {
  const res = await fetch(`${API}/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function deleteAdminUser(id: string): Promise<void> {
  const res = await fetch(`${API}/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers(),
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const res = await fetch(`${API}/settings`, { headers: headers() })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function putAdminSettings(data: {
  systemPrompt?: string
  openaiModel?: string
}): Promise<void> {
  const res = await fetch(`${API}/settings`, {
    method: 'PUT',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function getAdminStats(): Promise<AdminStats> {
  const res = await fetch(`${API}/stats`, { headers: headers() })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}
