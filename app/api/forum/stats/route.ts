import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const activeThreads = await prisma.forum_threads.count({
    where: { is_locked: 0 },
  })

  return NextResponse.json({ activeThreads })
}
