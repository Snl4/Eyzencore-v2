import { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_COOKIE_NAME,
  deleteProject,
  getAuthSessionFromToken,
  getProjectById,
  updateProject,
} from '@/lib/auth-db'

interface RouteContext {
  params: { id: string }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const auth = getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  const projectId = Number(context.params.id)
  if (!Number.isFinite(projectId)) return NextResponse.json({ error: 'Некоректний ідентифікатор' }, { status: 400 })
  const existing = getProjectById(projectId)
  if (!existing) return NextResponse.json({ error: 'Проект не знайдено' }, { status: 404 })
  if (existing.ownerId !== auth.user.id) return NextResponse.json({ error: 'Немає доступу' }, { status: 403 })
  try {
    const body = (await request.json()) as {
      name?: string
      description?: string
      logoUrl?: string | null
      website?: string | null
      discord?: string | null
    }
    const name = String(body.name || existing.name).trim()
    if (!name) return NextResponse.json({ error: 'Назва проекту є обовʼязковою' }, { status: 400 })
    const project = updateProject({
      projectId,
      ownerId: auth.user.id,
      name,
      description: body.description,
      logoUrl: body.logoUrl,
      website: body.website,
      discord: body.discord,
    })
    return NextResponse.json({ project })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося оновити проект'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const auth = getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  const projectId = Number(context.params.id)
  if (!Number.isFinite(projectId)) return NextResponse.json({ error: 'Некоректний ідентифікатор' }, { status: 400 })
  const existing = getProjectById(projectId)
  if (!existing) return NextResponse.json({ error: 'Проект не знайдено' }, { status: 404 })
  if (existing.ownerId !== auth.user.id) return NextResponse.json({ error: 'Немає доступу' }, { status: 403 })
  deleteProject(projectId, auth.user.id)
  return NextResponse.json({ success: true })
}
