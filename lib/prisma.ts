/**
 * Prisma client singleton — ready for PostgreSQL / MongoDB.
 *
 * To activate:
 *   1. npm install @prisma/client prisma
 *   2. npx prisma init
 *   3. Define your schema in prisma/schema.prisma
 *   4. Uncomment the code below and remove the mock stub
 *
 * Example schema (prisma/schema.prisma):
 *
 *   datasource db {
 *     provider = "postgresql"
 *     url      = env("DATABASE_URL")
 *   }
 *
 *   model Server {
 *     id        Int      @id @default(autoincrement())
 *     name      String
 *     addr      String   @unique
 *     players   Int      @default(0)
 *     max       Int      @default(100)
 *     online    Boolean  @default(false)
 *     verified  Boolean  @default(false)
 *     rank      Int      @default(0)
 *     createdAt DateTime @default(now())
 *     updatedAt DateTime @updatedAt
 *   }
 */

// import { PrismaClient } from '@prisma/client';
//
// const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
//
// export const prisma =
//   globalForPrisma.prisma ??
//   new PrismaClient({ log: ['query'] });
//
// if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const prisma = null; // replace with above when Prisma is set up
