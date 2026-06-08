import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, createProject, getAuthSessionFromToken, listProjectsByOwner } from '@/lib/auth-db'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  const projects = listProjectsByOwner(auth.user.id)
  return NextResponse.json({ projects })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  try {
    const body = (await request.json()) as {
      name?: string
      description?: string
      logoUrl?: string
      website?: string
      discord?: string
    }
    const name = String(body.name || '').trim()
    if (!name) return NextResponse.json({ error: 'Назва проекту є обовʼязковою' }, { status: 400 })
    const project = createProject({
      ownerId: auth.user.id,
      name,
      description: body.description,
      logoUrl: body.logoUrl,
      website: body.website,
      discord: body.discord,
    })
    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося створити проект'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
