import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { ADMIN_EMAIL, approveServerApplication } from '@/lib/auth-db'

type Params = { params: { id: string } }

export async function POST(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const id = Number(params.id)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  try {
    const result = await approveServerApplication(id)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Помилка при схваленні'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
