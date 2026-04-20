/** Indica se a superfície do chat do Fervô está montada (rota /). Falso em Admin ou após desmontar. */
let fervoChatSurfaceMounted = false

export function setFervoChatSurfaceMounted(mounted: boolean) {
  fervoChatSurfaceMounted = mounted
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

function previewBody(text: string, max = 140): string {
  const one = text.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()
  if (one.length <= max) return one
  return `${one.slice(0, max - 1)}…`
}

function iconUrl(): string | undefined {
  if (typeof window === 'undefined' || !window.location?.origin) return undefined
  return `${window.location.origin}/favicon.svg`
}

/**
 * Considera "fora do Fervô" quando: aba/oculto, outro app, ou outra rota do mesmo site (ex.: Admin).
 * Assim o aviso dispara ao ir no WhatsApp ou ao abrir Admin enquanto a IA responde.
 */
export function isUserAwayFromChat(): boolean {
  if (typeof document === 'undefined') return false
  if (document.visibilityState === 'hidden' || document.hidden) return true
  if (!fervoChatSurfaceMounted) return true
  return false
}

/** Pede permissão (precisa ser chamado após gesto do usuário, ex.: clique). */
export async function requestFervoNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  return Notification.requestPermission()
}

export function getFervoNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationsSupported()) return 'unsupported'
  return Notification.permission
}

function vibrateShort() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([80, 40, 80])
    }
  } catch {
    /* silencioso */
  }
}

/**
 * Notificação quando a resposta chega e o usuário não está no chat.
 * Tenta primeiro via Service Worker (costuma integrar melhor com PWA / segundo plano no Android).
 */
export async function notifyFervoReplyReady(agentText: string): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  if (!isUserAwayFromChat()) return

  const body = previewBody(agentText) || 'Nova resposta na sua análise.'
  const icon = iconUrl()
  const opts: NotificationOptions = {
    body,
    icon,
    tag: 'fervo-reply',
    renotify: true,
    requireInteraction: false,
    silent: false,
  }

  try {
    const reg =
      typeof navigator !== 'undefined' && 'serviceWorker' in navigator
        ? await navigator.serviceWorker.getRegistration()
        : undefined
    if (reg && typeof reg.showNotification === 'function') {
      await reg.showNotification('Fervô', opts)
      vibrateShort()
      return
    }
  } catch {
    /* cai para Notification() */
  }

  try {
    new Notification('Fervô', opts)
  } catch {
    /* silencioso */
  }
  vibrateShort()
}

/** Pede armazenamento persistente (alguns navegadores pausam menos abas “importantes”). */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
