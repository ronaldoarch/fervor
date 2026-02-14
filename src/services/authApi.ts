const API = '/api'

function getToken(): string | null {
  try {
    return localStorage.getItem('fervor_token') || sessionStorage.getItem('fervor_token')
  } catch {
    return null
  }
}

function setToken(token: string, persist = true) {
  const storage = persist ? localStorage : sessionStorage
  try {
    storage.setItem('fervor_token', token)
  } catch {
    sessionStorage.setItem('fervor_token', token)
  }
}

function clearToken() {
  try {
    localStorage.removeItem('fervor_token')
    sessionStorage.removeItem('fervor_token')
  } catch {}
}

function headers(): Record<string, string> {
  const token = getToken()
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

export interface User {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
}

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Erro ao entrar')
  setToken(data.token)
  return data
}

export async function register(
  name: string,
  email: string,
  password: string
): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar')
  setToken(data.token)
  return data
}

export async function me(): Promise<User | null> {
  const token = getToken()
  if (!token) return null
  const res = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return null
  const data = await res.json()
  return data.user
}

export function logout() {
  clearToken()
}

export { getToken, headers }
