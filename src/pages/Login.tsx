import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Login.css'

type Mode = 'login' | 'register'

export default function Login() {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const success = await login(email, password)
        if (success) {
          navigate('/')
        } else {
          setError('Email ou senha incorretos.')
        }
      } else {
        const result = await register(name, email, password)
        if (result.success) {
          navigate('/')
        } else {
          setError(result.error || 'Erro ao cadastrar.')
        }
      }
    } catch (err) {
      setError('Erro ao processar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'))
    setError('')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>Fervô</h1>
          <p>Estrategista Cultural e Semiótico</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="name">Nome</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                required
                autoComplete="name"
              />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            {mode === 'register' && (
              <span className="form-hint">Mínimo 6 caracteres</span>
            )}
          </div>
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn-login" disabled={loading}>
            {loading
              ? mode === 'login'
                ? 'Entrando...'
                : 'Cadastrando...'
              : mode === 'login'
              ? 'Entrar'
              : 'Cadastrar'}
          </button>
        </form>
        <p className="login-switch">
          {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
          <button type="button" onClick={switchMode} className="link-btn">
            {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
          </button>
        </p>
        {mode === 'login' && (
          <p className="login-hint">
            Após o seed: admin@fervor.com / admin123
          </p>
        )}
      </div>
    </div>
  )
}
