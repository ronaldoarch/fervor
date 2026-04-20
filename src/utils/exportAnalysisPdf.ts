import { sanitizeAgentText } from './sanitizeAgentText'

export type ExportPdfMessage = {
  role: 'agent' | 'user'
  content: string
  timestamp?: Date
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatLineWithBold(line: string): string {
  if (!line) return '<br />'
  const parts = line.split(/(\*\*[^*]+\*\*)/g)
  return parts
    .map((part) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return '<strong>' + escapeHtml(part.slice(2, -2)) + '</strong>'
      }
      return escapeHtml(part)
    })
    .join('')
}

function formatMessageContent(raw: string): string {
  return raw
    .split('\n')
    .map(
      (line) =>
        `<p style="margin:0 0 0.35em 0;">${formatLineWithBold(line)}</p>`
    )
    .join('')
}

function safeFilenamePart(s: string): string {
  const t = s
    .trim()
    .normalize('NFC')
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 48)
  return t || 'analise'
}

export async function exportAnalysisToPdf(params: {
  conversationTitle: string
  userName?: string
  messages: ExportPdfMessage[]
}): Promise<void> {
  const { conversationTitle, userName, messages } = params
  if (!messages.length) return

  const generatedAt = new Date().toLocaleString('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  })

  const blocks = messages
    .map((m) => {
      const display = m.role === 'agent' ? sanitizeAgentText(m.content) : m.content
      const label = m.role === 'agent' ? 'Fervô' : 'Você'
      let ts = ''
      if (m.timestamp != null) {
        const d = m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp)
        if (!Number.isNaN(d.getTime())) {
          ts = d.toLocaleString('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short',
          })
        }
      }
      const roleColor = m.role === 'agent' ? '#0d4f3c' : '#444'
      return `
        <div style="margin-bottom:1.25em;">
          <div style="font-size:9pt;color:#666;margin-bottom:0.25em;">${escapeHtml(label)}${
            ts ? ' · ' + escapeHtml(ts) : ''
          }</div>
          <div style="border-left:3px solid ${roleColor};padding-left:12px;">
            ${formatMessageContent(display)}
          </div>
        </div>`
    })
    .join('')

  const container = document.createElement('div')
  Object.assign(container.style, {
    position: 'fixed',
    left: '-12000px',
    top: '0',
    width: '190mm',
    boxSizing: 'border-box',
    padding: '16mm 14mm',
    backgroundColor: '#ffffff',
    color: '#111111',
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: '10.5pt',
    lineHeight: '1.45',
  })

  container.innerHTML = `
    <header style="margin-bottom:18px;border-bottom:1px solid #ccc;padding-bottom:12px;">
      <div style="font-size:8pt;color:#666;letter-spacing:0.04em;text-transform:uppercase;">Fervô — análise exportada</div>
      <h1 style="margin:8px 0 4px 0;font-size:16pt;font-weight:700;color:#0d4f3c;">${escapeHtml(
        conversationTitle || 'Conversa'
      )}</h1>
      <div style="font-size:9pt;color:#555;">${escapeHtml(generatedAt)}${
        userName ? ' · ' + escapeHtml(userName) : ''
      }</div>
    </header>
    <article>${blocks}</article>
    <footer style="margin-top:24px;padding-top:12px;border-top:1px solid #eee;font-size:8pt;color:#888;">
      Documento gerado pelo aplicativo Fervô. Conteúdo da conversa no momento da exportação.
    </footer>
  `

  document.body.appendChild(container)

  const slug = safeFilenamePart(conversationTitle)
  const day = new Date().toISOString().slice(0, 10)
  const filename = `fervor-${slug}-${day}.pdf`

  try {
    const html2pdf = (await import('html2pdf.js')).default
    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      })
      .from(container)
      .save()
  } finally {
    container.remove()
  }
}
