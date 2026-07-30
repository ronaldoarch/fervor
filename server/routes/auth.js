import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { Resend } from 'resend'
import { prisma } from '../db.js'
import { isTokenStale, signToken } from '../auth.js'

const RESET_TOKEN_TTL_MINUTES = 30
const RESET_REQUEST_COOLDOWN_MINUTES = 2
const RESET_RESPONSE = {
  message: 'Se esse e-mail estiver cadastrado, você receberá as instruções em instantes.',
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

async function sendPasswordResetEmail(email) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const emailFrom = process.env.EMAIL_FROM?.trim()
  const appUrl = process.env.APP_URL?.trim()?.replace(/\/+$/, '')
  if (!apiKey || !emailFrom || !appUrl) {
    throw new Error('Configure RESEND_API_KEY, EMAIL_FROM e APP_URL para recuperar senhas')
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  })
  if (!user) return

  const cooldownStart = new Date(Date.now() - RESET_REQUEST_COOLDOWN_MINUTES * 60 * 1000)
  const recentToken = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, createdAt: { gte: cooldownStart } },
    select: { id: true },
  })
  if (recentToken) return

  await prisma.passwordResetToken.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  })

  const token = crypto.randomBytes(32).toString('base64url')
  const tokenRow = await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashResetToken(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
    },
  })
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`
  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: emailFrom,
    to: user.email,
    subject: 'Redefina sua senha do Fervô',
    html: `
      <div style="font-family:Arial,sans-serif;color:#29252f;line-height:1.6;max-width:560px;margin:auto">
        <h1 style="font-size:24px">Redefinição de senha</h1>
        <p>Recebemos uma solicitação para redefinir sua senha do Fervô.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#7a4dff;color:#fff;text-decoration:none">
            Criar nova senha
          </a>
        </p>
        <p>Este link expira em ${RESET_TOKEN_TTL_MINUTES} minutos e só pode ser usado uma vez.</p>
        <p>Se você não fez essa solicitação, ignore este e-mail.</p>
      </div>
    `,
    text: `Redefina sua senha do Fervô acessando: ${resetUrl}\n\nO link expira em ${RESET_TOKEN_TTL_MINUTES} minutos e só pode ser usado uma vez.`,
  })

  if (error) {
    await prisma.passwordResetToken.deleteMany({ where: { id: tokenRow.id } })
    throw new Error(`Resend: ${error.message}`)
  }
}

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

  app.post('/api/auth/forgot-password', (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : ''

    // A resposta é sempre igual e imediata para não revelar se uma conta existe.
    res.json(RESET_RESPONSE)
    if (!email || email.length > 320) return

    void sendPasswordResetEmail(email).catch((error) => {
      console.error('[auth/forgot-password] Não foi possível enviar o e-mail:', error.message)
    })
  })

  app.post('/api/auth/reset-password', async (req, res) => {
    const { token, password } = req.body ?? {}
    if (typeof token !== 'string' || token.length < 20 || token.length > 200) {
      return res.status(400).json({ error: 'Link de recuperação inválido ou expirado.' })
    }
    if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: 'A senha deve ter entre 6 e 128 caracteres.' })
    }

    const tokenHash = hashResetToken(token)
    const passwordHash = await bcrypt.hash(password, 10)

    try {
      await prisma.$transaction(async (tx) => {
        const resetToken = await tx.passwordResetToken.findUnique({
          where: { tokenHash },
          select: { id: true, userId: true, expiresAt: true },
        })
        if (!resetToken || resetToken.expiresAt <= new Date()) {
          throw new Error('INVALID_RESET_TOKEN')
        }

        const claimed = await tx.passwordResetToken.deleteMany({
          where: { id: resetToken.id, expiresAt: { gt: new Date() } },
        })
        if (claimed.count !== 1) {
          throw new Error('INVALID_RESET_TOKEN')
        }

        await tx.user.update({
          where: { id: resetToken.userId },
          data: {
            passwordHash,
            passwordChangedAt: new Date(Math.floor(Date.now() / 1000) * 1000),
          },
        })
        await tx.passwordResetToken.deleteMany({ where: { userId: resetToken.userId } })
      })
      res.json({ message: 'Senha redefinida com sucesso.' })
    } catch (error) {
      if (error.message === 'INVALID_RESET_TOKEN') {
        return res.status(400).json({ error: 'Link de recuperação inválido ou expirado.' })
      }
      console.error('[auth/reset-password]', error)
      res.status(500).json({ error: 'Não foi possível redefinir a senha. Tente novamente.' })
    }
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
      select: { id: true, email: true, name: true, role: true, passwordChangedAt: true },
    })
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' })
    }
    if (isTokenStale(decoded, user.passwordChangedAt)) {
      return res.status(401).json({ error: 'Sessão expirada. Entre novamente.' })
    }
    const { passwordChangedAt: _, ...safeUser } = user
    res.json({ user: safeUser })
  })
}
