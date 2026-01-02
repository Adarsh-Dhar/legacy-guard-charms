import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

if (!globalForPrisma.prisma) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  const adapter = new PrismaPg(pool)

  globalForPrisma.prisma = new PrismaClient({ adapter })
}

export const prisma: PrismaClient = globalForPrisma.prisma

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
