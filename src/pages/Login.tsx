import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import fervoAvatar from '../assets/fervo-avatar.png'
import './Login.css'

type Mode = 'login' | 'register'
type AvatarState = 'idle' | 'look-email' | 'peek-password'
type AvatarCue = 'none' | 'cue-email' | 'cue-password'

export default function Login() {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [avatarState, setAvatarState] = useState<AvatarState>('idle')
  const [avatarCue, setAvatarCue] = useState<AvatarCue>('none')
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
    setShowPassword(false)
    setAvatarState('idle')
  }

  const triggerAvatarCue = (cue: Exclude<AvatarCue, 'none'>) => {
    setAvatarCue('none')
    requestAnimationFrame(() => {
      setAvatarCue(cue)
      window.setTimeout(() => setAvatarCue('none'), 650)
    })
  }

  return (
    <div className="login-page">
      <div className="login-stage">
        <section className="login-brand" aria-label="Marca Fervô">
          <h1 className="brand-wordmark">Fervô</h1>
          <p className="brand-tagline">Estrategista cultural e semiótico</p>
          <p className="brand-description">
            Acesse o Fervô e transforme observações do mundo em inteligência estratégica.
          </p>
        </section>
        <section
          className={`login-avatar-col ${avatarState} ${avatarCue} ${loading ? 'is-loading' : ''}`}
          aria-label="Mascote Fervô"
        >
          <div className="login-avatar-shell">
            <img src={fervoAvatar} alt="Mascote Fervô" className="login-avatar" />
          </div>
        </section>

        <section className="login-card-shell">
          <div className="eye-logo" aria-hidden="true">
            <svg width="68" height="36" viewBox="0 0 68 36" fill="none">
              <path d="M2 22 C 14 4, 54 4, 66 22" />
              <path d="M2 22 C 14 34, 54 34, 66 22" />
              <circle cx="34" cy="22" r="8" />
              <line x1="20" y1="22" x2="48" y2="22" />
              <path d="M44 18.5 L48 22 L44 25.5" />
              <circle cx="34" cy="22" r="2.6" className="eye-logo-dot" />
            </svg>
          </div>
          <h2 className="card-title">
            {mode === 'login' ? 'Acesse sua conta' : 'Crie sua conta'}
          </h2>
          <div className="title-underline" />

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
                  onFocus={() => setAvatarState('look-email')}
                  onClick={() => triggerAvatarCue('cue-email')}
                  onBlur={() => setAvatarState('idle')}
                    placeholder="Seu nome"
                    required
                    autoComplete="name"
                  />
                </div>
              </div>
            )}
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
                  onFocus={() => setAvatarState('look-email')}
                  onClick={() => triggerAvatarCue('cue-email')}
                  onBlur={() => setAvatarState('idle')}
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="password">Senha</label>
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
                  onFocus={() => setAvatarState('peek-password')}
                  onClick={() => triggerAvatarCue('cue-password')}
                  onBlur={() => setAvatarState('idle')}
                  placeholder="Sua senha"
                  required
                  minLength={6}
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
          {mode === 'login' && (
            <button type="button" className="forgot-link">
              Esqueceu sua senha?
            </button>
          )}
          <div className="card-divider" />
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
        </section>
      </div>
    </div>
  )
}
