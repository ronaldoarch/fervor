import jwt from 'jsonwebtoken'
import { prisma } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('JWT_SECRET não configurada. Configure no .env para produção.')
  process.exit(1)
}
const SECRET = JWT_SECRET || 'dev-secret-change-in-production'

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '30d' })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET)
  } catch {
    return null
  }
}

export async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Token ausente' })
  }
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
  req.user = user
  next()
}
