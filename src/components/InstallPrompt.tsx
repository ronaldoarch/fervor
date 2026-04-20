import { useState, useEffect } from 'react'
import './InstallPrompt.css'

const DISMISS_KEY = 'fervor_install_dismissed'
const DISMISS_DAYS = 3

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as { standalone?: boolean }).standalone === true
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt: () => Promise<void> } | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    if (isStandalone()) return

    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (dismissed) {
      const when = parseInt(dismissed, 10)
      if (Date.now() - when < DISMISS_DAYS * 24 * 60 * 60 * 1000) return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as unknown as { prompt: () => Promise<void> })
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    if (isIOS()) {
      const t = setTimeout(() => setShowIOSGuide(true), 800)
      return () => {
        window.removeEventListener('beforeinstallprompt', handler)
        clearTimeout(t)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      setShowBanner(false)
      localStorage.setItem(DISMISS_KEY, Date.now().toString())
    } finally {
      setInstalling(false)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    setShowIOSGuide(false)
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
  }

  if (!showBanner && !showIOSGuide) return null

  if (deferredPrompt && showBanner) {
    return (
      <div className="install-prompt install-prompt--android">
        <div className="install-prompt__content">
          <span className="install-prompt__icon">📱</span>
          <div>
            <strong>Instale o Fervô</strong>
            <p>Use como app, mais rápido e sem abrir o navegador.</p>
          </div>
        </div>
        <div className="install-prompt__actions">
          <button type="button" onClick={handleInstall} disabled={installing} className="install-prompt__btn install-prompt__btn--primary">
            {installing ? 'Instalando...' : 'Instalar'}
          </button>
          <button type="button" onClick={handleDismiss} className="install-prompt__btn install-prompt__btn--secondary">
            Agora não
          </button>
        </div>
      </div>
    )
  }

  if (showIOSGuide) {
    return (
      <div className="install-prompt install-prompt--ios">
        <div className="install-prompt__content">
          <span className="install-prompt__icon">📱</span>
          <div>
            <strong>Adicionar à tela inicial</strong>
            <p className="install-prompt__steps">
              1. Toque no ícone <strong>Compartilhar</strong> (↑) na barra do Safari<br />
              2. Role e toque em <strong>Adicionar à Tela Inicial</strong><br />
              3. Toque em <strong>Adicionar</strong>
            </p>
          </div>
        </div>
        <button type="button" onClick={handleDismiss} className="install-prompt__btn install-prompt__btn--primary">
          Entendi
        </button>
      </div>
    )
  }

  return null
}
