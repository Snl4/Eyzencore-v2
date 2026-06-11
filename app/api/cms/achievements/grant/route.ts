import { NextResponse } from 'next/server'
import {
  grantAchievementToUser,
  revokeAchievementFromUser,
} from '@/lib/achievements'
import { getCurrentCmsUser } from '@/lib/cms-auth'

export async function POST(request: Request) {
  if (!(await getCurrentCmsUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const achievementId = Number.parseInt(String(body.achievementId ?? ''), 10)
    const userId = String(body.userId ?? '').trim()
    const action = String(body.action ?? 'grant').trim().toLowerCase()

    if (!Number.isFinite(achievementId) || !userId) {
      return NextResponse.json(
        { error: 'Вкажіть achievementId та userId' },
        { status: 400 }
      )
    }

    if (action === 'revoke') {
      await revokeAchievementFromUser(achievementId, userId)
      return NextResponse.json({ ok: true, action: 'revoke' })
    }

    await grantAchievementToUser(achievementId, userId, 'cms')
    return NextResponse.json({ ok: true, action: 'grant' })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Grant failed' },
      { status: 400 }
    )
  }
}
