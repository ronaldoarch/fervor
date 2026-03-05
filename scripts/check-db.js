#!/usr/bin/env node
/**
 * Verifica conexão com o banco PostgreSQL.
 * Uso: npm run check-db
 */

import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('❌ DATABASE_URL não está definida no .env')
  console.error('   Exemplo: postgresql://user:password@localhost:5432/fervor')
  process.exit(1)
}

// Mostra host e database (sem senha)
let safe = url
try {
  const u = new URL(url.replace(/^postgresql:/, 'http:'))
  safe = `${u.hostname}:${u.port || 5432}/${(u.pathname || '/').slice(1) || '(default)'}`
} catch (_) {}
console.log('🔍 Testando conexão:', safe)

;(async () => {
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    await prisma.$connect()
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Conexão OK')
    await prisma.$disconnect()
    process.exit(0)
  } catch (e) {
    console.error('❌ Erro:', e.message)
    if (e.message?.includes('denied access')) {
      console.error('\n   Possíveis causas:')
      console.error('   - Usuário/senha incorretos no DATABASE_URL')
      console.error('   - Banco de dados não existe (crie com: createdb fervor)')
      console.error('   - PostgreSQL não está rodando (brew services start postgresql)')
      console.error('   - Se for Neon/Supabase: verifique se a URL está correta e o projeto ativo')
    }
    process.exit(1)
  }
})()
