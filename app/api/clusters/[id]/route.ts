import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, getAuthSessionFromToken } from '@/lib/auth-db'
import { deleteCluster, getClusterById, updateCluster } from '@/lib/cluster-db'

type Context = { params: { id: string } }

export async function GET(_request: NextRequest, { params }: Context) {
  const cluster = await getClusterById(Number(params.id))
  return cluster
    ? NextResponse.json({ cluster })
    : NextResponse.json({ error: 'Кластер не знайдено' }, { status: 404 })
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  try {
    const body = await request.json() as Record<string, unknown>
    const name = String(body.name || '').trim()
    if (!name) return NextResponse.json({ error: 'Вкажіть назву кластера' }, { status: 400 })
    const cluster = await updateCluster({
      id: Number(params.id),
      ownerId: auth.user.id,
      name,
      description: String(body.description || ''),
      logoUrl: body.logoUrl ? String(body.logoUrl) : null,
      bannerUrl: body.bannerUrl ? String(body.bannerUrl) : null,
      website: body.website ? String(body.website) : null,
      discord: body.discord ? String(body.discord) : null,
      serverIds: Array.isArray(body.serverIds) ? body.serverIds.map(Number) : [],
    })
    return NextResponse.json({ cluster })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Не вдалося оновити кластер' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  try {
    await deleteCluster(Number(params.id), auth.user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Не вдалося видалити кластер' }, { status: 404 })
  }
}
