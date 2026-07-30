import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import * as authApi from '../services/authApi'
import fervoMascote from '../assets/fervo-avatar.png'
import madeLogoPreto from '../assets/made-logo-preto.png'
import './Login.css'

type Mode = 'login' | 'register' | 'forgot' | 'reset'
export default function Login() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const resetToken = searchParams.get('token') || ''
  const [mode, setMode] = useState<Mode>(
    location.pathname === '/reset-password' ? 'reset' : 'login'
  )
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    setMode(location.pathname === '/reset-password' ? 'reset' : 'login')
    setError('')
    setSuccess('')
  }, [location.pathname])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'forgot') {
        const result = await authApi.requestPasswordReset(email)
        setSuccess(result.message)
      } else if (mode === 'reset') {
        if (!resetToken) {
          setError('Link de recuperação inválido ou incompleto.')
          return
        }
        const result = await authApi.resetPassword(resetToken, password)
        setSuccess(result.message)
      } else if (mode === 'login') {
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
      setError(err instanceof Error ? err.message : 'Erro ao processar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'))
    setError('')
    setSuccess('')
    setShowPassword(false)
  }

  const returnToLogin = () => {
    setMode('login')
    setError('')
    setSuccess('')
    setPassword('')
    setShowPassword(false)
    navigate('/login', { replace: true })
  }

  const cardTitle = {
    login: 'Acesse sua conta',
    register: 'Crie sua conta',
    forgot: 'Recupere sua senha',
    reset: 'Crie uma nova senha',
  }[mode]

  const submitLabel = loading
    ? {
        login: 'Entrando...',
        register: 'Cadastrando...',
        forgot: 'Enviando...',
        reset: 'Salvando...',
      }[mode]
    : {
        login: 'Entrar',
        register: 'Cadastrar',
        forgot: 'Enviar link de recuperação',
        reset: 'Salvar nova senha',
      }[mode]

  return (
    <div className="login-page">
      <div className="login-stage">
        <section className="login-brand" aria-label="Marca Fervô">
          <div className="brand-made-pill">
            <img src={madeLogoPreto} alt="Made" className="brand-made-logo" />
          </div>
          <p className="brand-tagline">Estrategista cultural e semiótico</p>
          <p className="brand-description">
            Acesse o Fervô e transforme observações do mundo em inteligência estratégica.
          </p>
        </section>
        <section className="login-avatar-col" aria-label="Mascote Fervô">
          <div className="login-avatar-shell">
            <img src={fervoMascote} alt="Personagem Fervô" className="login-avatar" />
          </div>
        </section>

        <section className="login-card-shell">
          <h2 className="card-title">{cardTitle}</h2>
          <div className="title-underline" />

          {success ? (
            <p className="login-success" role="status">
              {success}
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="login-form">
            {mode === 'register' && (
              <div className="form-group">
                <label htmlFor="name">Nome</label>
                <div className="input-wrap">
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
              </div>
            )}
            {mode !== 'reset' && (
              <div className="form-group">
                <label htmlFor="email">E-mail</label>
                <div className="input-wrap">
                  <span className="leading-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" />
                    </svg>
                  </span>
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
              </div>
            )}
            {mode !== 'forgot' && (
              <div className="form-group">
                <label htmlFor="password">{mode === 'reset' ? 'Nova senha' : 'Senha'}</label>
                <div className="input-wrap has-trailing">
                  <span className="leading-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <rect x="4" y="11" width="16" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'reset' ? 'Digite a nova senha' : 'Sua senha'}
                    required
                    minLength={6}
                    maxLength={128}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    className="trailing-btn"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {(mode === 'register' || mode === 'reset') && (
                  <span className="form-hint">Mínimo 6 caracteres</span>
                )}
              </div>
            )}
            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn-login" disabled={loading}>
              {submitLabel}
            </button>
          </form>
          )}
          {mode === 'login' && !success && (
            <button
              type="button"
              className="forgot-link"
              onClick={() => {
                setMode('forgot')
                setError('')
                setSuccess('')
              }}
            >
              Esqueceu sua senha?
            </button>
          )}
          <div className="card-divider" />
          {mode === 'forgot' || mode === 'reset' ? (
            <p className="login-switch">
              {mode === 'forgot' ? 'Lembrou sua senha?' : 'Já pode acessar sua conta?'}{' '}
              <button type="button" onClick={returnToLogin} className="link-btn">
                Entrar
              </button>
            </p>
          ) : (
            <p className="login-switch">
              {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
              <button type="button" onClick={switchMode} className="link-btn">
                {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
              </button>
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
