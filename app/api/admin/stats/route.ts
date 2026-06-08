import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { ADMIN_EMAIL, getAdminStats } from '@/lib/auth-db'

export function GET(): NextResponse {
  const user = getCurrentUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const stats = getAdminStats()
  return NextResponse.json(stats)
}
