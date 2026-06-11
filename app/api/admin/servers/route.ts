import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { ADMIN_EMAIL, listServers } from '@/lib/auth-db'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const servers = await listServers()
  return NextResponse.json(servers)
}
