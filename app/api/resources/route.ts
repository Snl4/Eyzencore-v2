import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { resolveUserRole } from '@/lib/auth-db'
import { ADMIN_EMAIL } from '@/lib/constants'
import { buildResourcePath } from '@/lib/resource-slug'
import { createCommunityResource, listCommunityResources, type CommunityResourceInput } from '@/lib/resources-db'
import { revalidatePublicResources } from '@/lib/public-cache'

type CreateResourceRequestBody = Omit<CommunityResourceInput, 'authorUserId'>

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) return { user: null, error: NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 }) }
  const role = await resolveUserRole({
    userId: user.id,
    role: user.user_metadata.role,
  })
  if (role !== 'ADMIN' && user.email !== ADMIN_EMAIL) {
    return { user: null, error: NextResponse.json({ error: 'Додавати ресурси може тільки адміністратор' }, { status: 403 }) }
  }
  return { user, error: null }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const resources = await listCommunityResources({
    limit: Number(url.searchParams.get('limit') || 80),
    search: url.searchParams.get('search') || '',
    type: url.searchParams.get('type') || 'all',
  })
  return NextResponse.json({ resources })
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth.error || !auth.user) return auth.error
  try {
    const body = (await request.json()) as CreateResourceRequestBody
    const resource = await createCommunityResource({
      ...body,
      authorUserId: auth.user.id,
      status: body.status || 'published',
      verified: body.verified !== false,
    })
    revalidatePublicResources(buildResourcePath(resource))
    return NextResponse.json({ resource }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося створити ресурс'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
