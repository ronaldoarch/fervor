import React, { createContext, useContext, useState, useEffect } from 'react'

export type UserRole = 'user' | 'admin'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isAdmin: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const MOCK_USERS = [
  { id: '1', email: 'admin@fervor.com', password: 'admin123', name: 'Administrador', role: 'admin' as UserRole },
  { id: '2', email: 'user@fervor.com', password: 'user123', name: 'Usuário', role: 'user' as UserRole },
]

const STORAGE_KEY = 'fervor_auth'
const USERS_STORAGE_KEY = 'fervor_users'

interface StoredUser {
  id: string
  email: string
  password: string
  name: string
  role: UserRole
}

function getRegisteredUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function saveRegisteredUser(user: StoredUser) {
  const all = getRegisteredUsers()
  const exists = all.some((u) => u.email.toLowerCase() === user.email.toLowerCase())
  if (exists) return false
  all.push(user)
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(all))
  return true
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setUser(parsed)
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const found =
      MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password) ||
      getRegisteredUsers().find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
    if (found) {
      const userData: User = {
        id: found.id,
        email: found.email,
        name: found.name,
        role: found.role,
      }
      setUser(userData)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
      return true
    }
    return false
  }

  const register = async (name: string, email: string, password: string) => {
    const lower = email.toLowerCase().trim()
    if (MOCK_USERS.some((u) => u.email.toLowerCase() === lower)) {
      return { success: false, error: 'Este email já está em uso.' }
    }
    if (getRegisteredUsers().some((u) => u.email.toLowerCase() === lower)) {
      return { success: false, error: 'Este email já está cadastrado.' }
    }
    const newUser: StoredUser = {
      id: crypto.randomUUID(),
      email: lower,
      password,
      name: name.trim(),
      role: 'user',
    }
    if (!saveRegisteredUser(newUser)) {
      return { success: false, error: 'Erro ao salvar cadastro.' }
    }
    const userData: User = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    }
    setUser(userData)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
    return { success: true }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAdmin: user?.role === 'admin',
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
