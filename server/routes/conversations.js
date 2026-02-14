import { authMiddleware } from '../auth.js'
import { prisma } from '../db.js'

export function registerConversationRoutes(app) {
  app.use('/api/conversations', authMiddleware)

  app.get('/api/conversations', async (req, res) => {
    const list = await prisma.conversation.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    })
    res.json(list)
  })

  app.post('/api/conversations', async (req, res) => {
    const { title = 'Nova análise', messages = [] } = req.body
    const conv = await prisma.conversation.create({
      data: {
        userId: req.user.id,
        title: String(title).slice(0, 200),
        messages: {
          create: messages.map((m) => ({
            role: m.role === 'agent' ? 'assistant' : m.role,
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
          })),
        },
      },
      include: { messages: true },
    })
    res.json({
      id: conv.id,
      title: conv.title,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messages: conv.messages.map((m) => ({
        id: m.id,
        role: m.role === 'assistant' ? 'agent' : m.role,
        content: m.content,
        timestamp: m.createdAt,
      })),
    })
  })

  app.get('/api/conversations/:id', async (req, res) => {
    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
    if (!conv) {
      return res.status(404).json({ error: 'Conversa não encontrada' })
    }
    res.json({
      id: conv.id,
      title: conv.title,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messages: conv.messages.map((m) => ({
        id: m.id,
        role: m.role === 'assistant' ? 'agent' : m.role,
        content: m.content,
        timestamp: m.createdAt,
      })),
    })
  })

  app.put('/api/conversations/:id', async (req, res) => {
    const { title, messages } = req.body
    const existing = await prisma.conversation.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { messages: true },
    })
    if (!existing) {
      return res.status(404).json({ error: 'Conversa não encontrada' })
    }
    const updates = {}
    if (typeof title === 'string') updates.title = title.slice(0, 200)
    if (Array.isArray(messages)) {
      await prisma.message.deleteMany({ where: { conversationId: existing.id } })
      await prisma.message.createMany({
        data: messages.map((m) => ({
          conversationId: existing.id,
          role: m.role === 'agent' ? 'assistant' : m.role,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        })),
      })
    }
    const conv = await prisma.conversation.update({
      where: { id: existing.id },
      data: updates,
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
    res.json({
      id: conv.id,
      title: conv.title,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messages: conv.messages.map((m) => ({
        id: m.id,
        role: m.role === 'assistant' ? 'agent' : m.role,
        content: m.content,
        timestamp: m.createdAt,
      })),
    })
  })

  app.delete('/api/conversations/:id', async (req, res) => {
    const deleted = await prisma.conversation.deleteMany({
      where: { id: req.params.id, userId: req.user.id },
    })
    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Conversa não encontrada' })
    }
    res.json({ ok: true })
  })
}
