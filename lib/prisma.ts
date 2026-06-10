import path from 'node:path'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@/lib/generated/prisma/client'

type GlobalPrisma = typeof globalThis & {
  __eyzencorePrisma?: PrismaClient
}

const databaseUrl =
  process.env.DATABASE_URL ||
  `file:${path.join(process.cwd(), 'data', 'eyzencore-auth.sqlite').replace(/\\/g, '/')}`

const globalPrisma = globalThis as GlobalPrisma

export const prisma =
  globalPrisma.__eyzencorePrisma ||
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
  })

if (process.env.NODE_ENV !== 'production') {
  globalPrisma.__eyzencorePrisma = prisma
}
