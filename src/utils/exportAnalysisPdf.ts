import { sanitizeAgentText } from './sanitizeAgentText'

export type ExportPdfMessage = {
  role: 'agent' | 'user'
  content: string
  timestamp?: Date
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

  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const marginX = 14
  const marginTop = 16
  const marginBottom = 14
  const contentWidth = pageWidth - marginX * 2
  let y = marginTop

  const ensureSpace = (needed: number) => {
    if (y + needed <= pageHeight - marginBottom) return
    pdf.addPage()
    y = marginTop
  }

  const writeWrapped = (
    text: string,
    opts: { size?: number; style?: 'normal' | 'bold'; color?: [number, number, number]; gap?: number } = {}
  ) => {
    const size = opts.size ?? 10
    const style = opts.style ?? 'normal'
    const color = opts.color ?? [20, 20, 20]
    const gap = opts.gap ?? 1.4

    pdf.setFont('helvetica', style)
    pdf.setFontSize(size)
    pdf.setTextColor(color[0], color[1], color[2])

    const normalized = text.replace(/\*\*/g, '').replace(/\r/g, '')
    const lines = normalized
      .split('\n')
      .flatMap((line) => (line.trim().length === 0 ? [''] : pdf.splitTextToSize(line, contentWidth)))

    const lineHeight = Math.max(4.2, size * 0.42)
    ensureSpace(lines.length * lineHeight + gap)
    for (const line of lines) {
      ensureSpace(lineHeight)
      pdf.text(line || ' ', marginX, y)
      y += lineHeight
    }
    y += gap
  }

  const generatedAt = new Date().toLocaleString('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  })
  writeWrapped('Fervô — análise exportada', { size: 9, style: 'bold', color: [13, 79, 60], gap: 1.8 })
  writeWrapped(conversationTitle || 'Conversa', { size: 16, style: 'bold', color: [20, 20, 20], gap: 1.2 })
  writeWrapped(`${generatedAt}${userName ? ` · ${userName}` : ''}`, {
    size: 9,
    color: [90, 90, 90],
    gap: 2.6,
  })

  const slug = safeFilenamePart(conversationTitle)
  const day = new Date().toISOString().slice(0, 10)
  const filename = `fervor-${slug}-${day}.pdf`

  for (const m of messages) {
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

    writeWrapped(`${label}${ts ? ` · ${ts}` : ''}`, {
      size: 9,
      style: 'bold',
      color: m.role === 'agent' ? [13, 79, 60] : [60, 60, 60],
      gap: 0.8,
    })
    writeWrapped(display || '(sem conteúdo)', {
      size: 10,
      color: [25, 25, 25],
      gap: 2.1,
    })
  }

  writeWrapped('Documento gerado pelo aplicativo Fervô.', {
    size: 8.5,
    color: [120, 120, 120],
    gap: 0,
  })

  pdf.save(filename)
}
