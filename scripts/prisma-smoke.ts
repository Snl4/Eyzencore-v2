import { prisma } from '@/lib/prisma'
import { getAdminStats, listAllUsers, listServers } from '@/lib/auth-db'

async function main(): Promise<void> {
  const [users, servers, userRows, serverRows, stats] = await Promise.all([
    prisma.app_users.count(),
    prisma.app_servers.count(),
    listAllUsers(),
    listServers(),
    getAdminStats(),
  ])

  if (users !== userRows.length || servers !== serverRows.length) {
    throw new Error('Prisma model counts do not match the domain database layer')
  }

  console.log(JSON.stringify({ users, servers, activeSessions: stats.activeSessions }))
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
