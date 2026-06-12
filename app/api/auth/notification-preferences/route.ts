import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const defaults = {
  enabled: true,
  votesEnabled: true,
  reviewsEnabled: true,
  systemEnabled: true,
}

function serialize(row: {
  enabled: number
  votes_enabled: number
  reviews_enabled: number
  system_enabled: number
}) {
  return {
    enabled: Boolean(row.enabled),
    votesEnabled: Boolean(row.votes_enabled),
    reviewsEnabled: Boolean(row.reviews_enabled),
    systemEnabled: Boolean(row.system_enabled),
  }
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }

  const preferences = await prisma.app_notification_preferences.findUnique({
    where: { user_id: user.id },
  })

  return NextResponse.json(preferences ? serialize(preferences) : defaults)
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as Partial<typeof defaults> | null
  if (!body) {
    return NextResponse.json({ error: 'Некоректний JSON' }, { status: 400 })
  }

  const current = await prisma.app_notification_preferences.findUnique({
    where: { user_id: user.id },
  })
  const values = {
    enabled: typeof body.enabled === 'boolean' ? body.enabled : Boolean(current?.enabled ?? 1),
    votesEnabled: typeof body.votesEnabled === 'boolean' ? body.votesEnabled : Boolean(current?.votes_enabled ?? 1),
    reviewsEnabled: typeof body.reviewsEnabled === 'boolean' ? body.reviewsEnabled : Boolean(current?.reviews_enabled ?? 1),
    systemEnabled: typeof body.systemEnabled === 'boolean' ? body.systemEnabled : Boolean(current?.system_enabled ?? 1),
  }

  const preferences = await prisma.app_notification_preferences.upsert({
    where: { user_id: user.id },
    create: {
      user_id: user.id,
      enabled: values.enabled ? 1 : 0,
      votes_enabled: values.votesEnabled ? 1 : 0,
      reviews_enabled: values.reviewsEnabled ? 1 : 0,
      system_enabled: values.systemEnabled ? 1 : 0,
      updated_at: new Date().toISOString(),
    },
    update: {
      enabled: values.enabled ? 1 : 0,
      votes_enabled: values.votesEnabled ? 1 : 0,
      reviews_enabled: values.reviewsEnabled ? 1 : 0,
      system_enabled: values.systemEnabled ? 1 : 0,
      updated_at: new Date().toISOString(),
    },
  })

  return NextResponse.json({ success: true, ...serialize(preferences) })
}
