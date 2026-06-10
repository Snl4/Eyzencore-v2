import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { ADMIN_EMAIL, listServerApplications } from '@/lib/auth-db'
import type { ServerApplicationStatus } from '@/lib/auth-db'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as ServerApplicationStatus | null
  const validStatuses: ServerApplicationStatus[] = ['pending', 'approved', 'rejected']
  const filtered = status && validStatuses.includes(status) ? status : undefined
  const applications = await listServerApplications(filtered)
  return NextResponse.json(applications)
}
