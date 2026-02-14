import bcrypt from 'bcrypt'
import { prisma } from '../db.js'
import { signToken } from '../auth.js'

export function registerAuthRoutes(app) {
  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' })
    }
    const lower = email.toLowerCase().trim()
    const existing = await prisma.user.findUnique({ where: { email: lower } })
    if (existing) {
      return res.status(400).json({ error: 'Este email já está cadastrado. Use "Entrar" para acessar.' })
    }
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: lower,
        passwordHash,
        role: 'user',
      },
      select: { id: true, email: true, name: true, role: true },
    })
    const token = signToken({ userId: user.id })
    res.json({ token, user })
  })

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' })
    }
    const lower = email.toLowerCase().trim()
    const user = await prisma.user.findUnique({ where: { email: lower } })
    if (!user) {
      return res.status(401).json({ error: 'Email ou senha incorretos.' })
    }
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return res.status(401).json({ error: 'Email ou senha incorretos.' })
    }
    const token = signToken({ userId: user.id })
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })
  })

  app.get('/api/auth/me', async (req, res) => {
    const auth = req.headers.authorization
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) {
      return res.status(401).json({ error: 'Token ausente' })
    }
    const { verifyToken } = await import('../auth.js')
    const decoded = verifyToken(token)
    if (!decoded?.userId) {
      return res.status(401).json({ error: 'Token inválido' })
    }
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true },
    })
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' })
    }
    res.json({ user })
  })
}
