import { FERVO_ETAPA_3_BODY } from '../constants/fervoCopy'

/** Remove artefatos de markdown e instruções internas vazadas nas respostas do agente. */

export function sanitizeAgentText(text: string): string {
  const source = String(text ?? '')
  const hasLeakedEtapa3Template =
    /\betapa\s*3\b/i.test(source) &&
    /(\[logo em seguida,\s*exemplos|não envie só as três perguntas)/i.test(source)

  if (hasLeakedEtapa3Template) {
    return FERVO_ETAPA_3_BODY
  }

  const lines = source.split('\n').map((line) => {
    let trimmed = line.replace(/^#{1,6}\s+/, '')
    if (/^-{3,}\s*$/.test(trimmed)) return ''
    if (/^\s*\[[^\]]+\]\s*$/.test(trimmed)) return ''
    if (/^\s*não envie só as três perguntas/i.test(trimmed)) return ''
    if (/^\s*formatação\s*\(obrigatório\)/i.test(trimmed)) return ''
    if (/^\s*fluxo\s*[—-]\s*4 etapas/i.test(trimmed)) return ''
    if (/^\s*pausa obrigatória/i.test(trimmed)) return ''
    trimmed = trimmed.replace(/\s+$/g, '')
    return trimmed
  })

  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
