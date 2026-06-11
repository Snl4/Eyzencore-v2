import { NextResponse } from 'next/server'
import {
  syncAchievementsForUser,
  syncAllUserAchievements,
} from '@/lib/achievements'
import { getCurrentCmsUser } from '@/lib/cms-auth'

export async function POST(request: Request) {
  if (!(await getCurrentCmsUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const userId = String(body.userId ?? '').trim()

    if (userId) {
      const awarded = await syncAchievementsForUser(userId)
      return NextResponse.json({ ok: true, awarded, scope: 'user' })
    }

    const awarded = await syncAllUserAchievements()
    return NextResponse.json({ ok: true, awarded, scope: 'all' })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 400 }
    )
  }
}
