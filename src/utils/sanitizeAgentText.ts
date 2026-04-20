/** Remove marcadores de markdown indesejados (#, linhas ---) das respostas do agente. */

export function sanitizeAgentText(text: string): string {
  const lines = String(text).split('\n').map((line) => {
    const trimmed = line.replace(/^#{1,6}\s+/, '')
    if (/^-{3,}\s*$/.test(trimmed)) return ''
    return trimmed
  })
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()
}
