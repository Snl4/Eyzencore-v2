import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME, getAuthSessionFromToken, getServerById, updateServerById } from '@/lib/auth-db'

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  const serverId = Number(context.params.id)
  if (!Number.isFinite(serverId)) {
    return NextResponse.json({ error: 'Некоректний ідентифікатор сервера' }, { status: 400 })
  }
  try {
    const body = (await request.json()) as {
      name?: string;
      addr?: string;
      platform?: 'minecraft' | 'discord';
      mode?: string;
      ver?: string;
      core?: 'java' | 'bedrock' | 'java_bedrock' | 'discord';
      country?: string;
      motd?: string;
      shortDesc?: string;
      fullDesc?: string;
      desc?: string;
      website?: string;
      discord?: string;
      telegram?: string;
      donate?: string;
      tiktok?: string;
      launcherUrl?: string;
      avatarUrl?: string;
      bannerUrl?: string;
      gallery?: string[];
      videos?: string[];
      tags?: string[];
      projectId?: number | null;
    }
    const name = String(body.name || '').trim()
    const addr = String(body.addr || '').trim()
    if (!name || !addr) {
      return NextResponse.json({ error: 'Назва та адреса сервера є обовʼязковими' }, { status: 400 })
    }
    const platform = body.platform === 'discord' || body.core === 'discord' ? 'discord' : 'minecraft';
    const server = await updateServerById({
      serverId,
      ownerId: auth.user.id,
      name,
      addr,
      platform,
      mode: String(body.mode || (platform === 'discord' ? 'Community' : 'Survival')),
      ver: String(body.ver || (platform === 'discord' ? 'Discord' : '1.21.11')),
      core: platform === 'discord' ? 'discord' : (body.core === 'bedrock' || body.core === 'java_bedrock' ? body.core : 'java'),
      country: String(body.country || ''),
      motd: String(body.motd || ''),
      shortDesc: String(body.shortDesc || ''),
      fullDesc: String(body.fullDesc || ''),
      desc: String(body.desc || ''),
      website: String(body.website || ''),
      discord: String(body.discord || ''),
      telegram: String(body.telegram || ''),
      donate: String(body.donate || ''),
      tiktok: String(body.tiktok || ''),
      launcherUrl: String(body.launcherUrl || ''),
      avatarUrl: String(body.avatarUrl || ''),
      bannerUrl: String(body.bannerUrl || ''),
      gallery: Array.isArray(body.gallery) ? body.gallery.slice(0, 6) : [],
      videos: Array.isArray(body.videos) ? body.videos.slice(0, 2) : [],
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 6) : [],
      projectId: typeof body.projectId === 'number' ? body.projectId : null,
    })
    return NextResponse.json({ success: true, server })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося оновити сервер'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
export async function GET(_request: NextRequest, context: { params: { id: string } }) {
  const server = await getServerById(Number(context.params.id))
  if (!server) {
    return NextResponse.json({ error: 'Сервер не знайдено' }, { status: 404 })
  }
  return NextResponse.json(server)
}
