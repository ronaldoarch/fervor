import { authMiddleware } from '../auth.js'
import { prisma } from '../db.js'

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' })
  }
  next()
}

const adminChain = [authMiddleware, requireAdmin]

export function registerAdminRoutes(app) {
  app.get('/api/admin/users', ...adminChain, async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      })
      res.json(users)
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Erro ao listar usuários' })
    }
  })

  app.patch('/api/admin/users/:id', ...adminChain, async (req, res) => {
    try {
      const { id } = req.params
      const { role, name } = req.body
      const target = await prisma.user.findUnique({ where: { id } })
      if (!target) {
        return res.status(404).json({ error: 'Usuário não encontrado' })
      }

      if (id === req.user.id && role === 'user') {
        return res.status(400).json({ error: 'Você não pode remover seu próprio papel de administrador' })
      }

      const adminCount = await prisma.user.count({ where: { role: 'admin' } })
      if (target.role === 'admin' && role === 'user' && adminCount <= 1) {
        return res.status(400).json({ error: 'Deve existir pelo menos um administrador' })
      }

      const data = {}
      if (role !== undefined) {
        if (!['user', 'admin'].includes(role)) {
          return res.status(400).json({ error: 'role inválido' })
        }
        data.role = role
      }
      if (typeof name === 'string' && name.trim()) {
        data.name = name.trim().slice(0, 120)
      }
      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'Nada para atualizar' })
      }

      const updated = await prisma.user.update({
        where: { id },
        data,
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      })
      res.json(updated)
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Erro ao atualizar usuário' })
    }
  })

  app.delete('/api/admin/users/:id', ...adminChain, async (req, res) => {
    try {
      const { id } = req.params
      if (id === req.user.id) {
        return res.status(400).json({ error: 'Não é possível excluir a própria conta' })
      }
      const target = await prisma.user.findUnique({ where: { id } })
      if (!target) {
        return res.status(404).json({ error: 'Usuário não encontrado' })
      }
      const adminCount = await prisma.user.count({ where: { role: 'admin' } })
      if (target.role === 'admin' && adminCount <= 1) {
        return res.status(400).json({ error: 'Não é possível excluir o último administrador' })
      }
      await prisma.user.delete({ where: { id } })
      res.json({ ok: true })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Erro ao excluir usuário' })
    }
  })

  app.get('/api/admin/settings', ...adminChain, async (req, res) => {
    try {
      const [promptRow, modelRow] = await Promise.all([
        prisma.appSetting.findUnique({ where: { key: 'system_prompt' } }),
        prisma.appSetting.findUnique({ where: { key: 'openai_model' } }),
      ])
      res.json({
        systemPrompt: promptRow?.value ?? '',
        openaiModel: modelRow?.value ?? '',
      })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Erro ao carregar configurações' })
    }
  })

  app.put('/api/admin/settings', ...adminChain, async (req, res) => {
    try {
      const { systemPrompt, openaiModel } = req.body
      if (systemPrompt !== undefined) {
        if (typeof systemPrompt !== 'string') {
          return res.status(400).json({ error: 'systemPrompt deve ser string' })
        }
        const t = systemPrompt.trim()
        if (!t) {
          await prisma.appSetting.deleteMany({ where: { key: 'system_prompt' } })
        } else {
          await prisma.appSetting.upsert({
            where: { key: 'system_prompt' },
            create: { key: 'system_prompt', value: t },
            update: { value: t },
          })
        }
      }
      if (openaiModel !== undefined) {
        if (typeof openaiModel !== 'string') {
          return res.status(400).json({ error: 'openaiModel deve ser string' })
        }
        const m = openaiModel.trim()
        if (!m) {
          await prisma.appSetting.deleteMany({ where: { key: 'openai_model' } })
        } else {
          await prisma.appSetting.upsert({
            where: { key: 'openai_model' },
            create: { key: 'openai_model', value: m.slice(0, 80) },
            update: { value: m.slice(0, 80) },
          })
        }
      }
      res.json({ ok: true })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Erro ao salvar configurações' })
    }
  })

  app.get('/api/admin/stats', ...adminChain, async (req, res) => {
    try {
      const since = new Date()
      since.setDate(since.getDate() - 14)

      const [userCount, conversationCount, messageCount, assistantCount, userCountRecent] =
        await Promise.all([
          prisma.user.count(),
          prisma.conversation.count(),
          prisma.message.count(),
          prisma.message.count({ where: { role: 'assistant' } }),
          prisma.user.count({ where: { createdAt: { gte: since } } }),
        ])

      const conversationsRecent = await prisma.conversation.count({
        where: { createdAt: { gte: since } },
      })

      let messagesByDay = []
      try {
        messagesByDay = await prisma.$queryRaw`
          SELECT date_trunc('day', m."createdAt") AS day, COUNT(*)::int AS count
          FROM "Message" m
          WHERE m."createdAt" >= ${since}
          GROUP BY 1
          ORDER BY 1 ASC
        `
      } catch (qerr) {
        console.warn('[admin/stats] agrupamento diário:', qerr.message)
      }

      const normalized = (messagesByDay || []).map((row) => ({
        day: row.day instanceof Date ? row.day.toISOString().slice(0, 10) : String(row.day),
        count: Number(row.count),
      }))

      res.json({
        userCount,
        conversationCount,
        messageCount,
        assistantReplyCount: assistantCount,
        usersLast14Days: userCountRecent,
        conversationsLast14Days: conversationsRecent,
        messagesByDay: normalized,
      })
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Erro ao carregar estatísticas' })
    }
  })
}
