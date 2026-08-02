import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { resolveUserRole } from '@/lib/auth-db'
import { ADMIN_EMAIL } from '@/lib/constants'
import { buildResourcePath } from '@/lib/resource-slug'
import { deleteCommunityResource } from '@/lib/resources-db'
import { revalidatePublicResources } from '@/lib/public-cache'

type ResourceParams = {
  params: {
    id: string
  }
}

function parseResourceId(value: string) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function DELETE(_request: Request, { params }: ResourceParams) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  const role = await resolveUserRole({
    userId: user.id,
    role: user.user_metadata.role,
  })
  if (role !== 'ADMIN' && user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Видаляти ресурси може тільки адміністратор' }, { status: 403 })
  }
  const resourceId = parseResourceId(params.id)
  if (!resourceId) {
    return NextResponse.json({ error: 'Некоректний ID ресурсу' }, { status: 400 })
  }
  try {
    const deleted = await deleteCommunityResource(resourceId)
    revalidatePublicResources(buildResourcePath(deleted))
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося видалити ресурс'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
