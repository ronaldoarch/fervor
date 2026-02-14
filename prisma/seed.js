import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@fervor.com'
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log('Admin já existe:', email)
    return
  }
  const hash = await bcrypt.hash('admin123', 10)
  await prisma.user.create({
    data: {
      email,
      name: 'Administrador',
      passwordHash: hash,
      role: 'admin',
    },
  })
  console.log('Admin criado: admin@fervor.com / admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
