/**
 * Indica que o utilizador já entrou no chat neste login (persiste em localStorage).
 * No logout limpamos a chave: no próximo login abrimos uma conversa nova com o
 * boas-vindas do Fervô em vez de saltar para a última conversa atualizada.
 */
const KEY = 'fervor_auth_chat_booted_user_id'

export function markFervoChatSessionBooted(userId: string) {
  try {
    localStorage.setItem(KEY, userId)
  } catch {
    /* ignore */
  }
}

export function clearFervoChatSessionBoot() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function hasFervoChatSessionBooted(userId: string): boolean {
  try {
    return localStorage.getItem(KEY) === userId
  } catch {
    return false
  }
}
