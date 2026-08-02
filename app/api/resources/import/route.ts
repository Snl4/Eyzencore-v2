import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { resolveUserRole } from '@/lib/auth-db'
import { ADMIN_EMAIL } from '@/lib/constants'
import { importCommunityResourceFromUrl } from '@/lib/resource-import'

type ImportResourceRequestBody = {
  url?: string
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  const role = await resolveUserRole({
    userId: user.id,
    role: user.user_metadata.role,
  })
  if (role !== 'ADMIN' && user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Імпортувати ресурси може тільки адміністратор' }, { status: 403 })
  }
  try {
    const body = (await request.json()) as ImportResourceRequestBody
    const draft = await importCommunityResourceFromUrl(String(body.url || ''))
    return NextResponse.json({ draft })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося імпортувати ресурс'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
