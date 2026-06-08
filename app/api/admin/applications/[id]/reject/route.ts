import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { ADMIN_EMAIL, rejectServerApplication } from '@/lib/auth-db'

type Params = { params: { id: string } }

export async function POST(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const user = getCurrentUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const id = Number(params.id)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  const body = await request.json() as { reason?: string }
  try {
    const result = rejectServerApplication(id, body.reason)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Помилка при відхиленні'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
