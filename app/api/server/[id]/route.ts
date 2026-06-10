import { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_COOKIE_NAME,
  deleteServerById,
  getAuthSessionFromToken,
  getServerById,
  resolveUserRole,
  updateServerById,
} from '@/lib/auth-db'

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const serverId = Number(context.params.id)
  if (!Number.isFinite(serverId)) {
    return NextResponse.json({ error: 'Invalid server id' }, { status: 400 })
  }
  const currentServer = await getServerById(serverId)
  if (!currentServer) {
    return NextResponse.json({ error: 'Server not found' }, { status: 404 })
  }
  const role = await resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
  const ownerId = role === 'ADMIN' ? String(currentServer.ownerId || auth.user.id) : auth.user.id
  try {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      addr?: string;
      category?: string;
      images?: string[];
      videos?: string[];
      mode?: string;
      ver?: string;
      platform?: 'minecraft' | 'discord';
      core?: 'java' | 'bedrock' | 'java_bedrock' | 'discord';
      country?: string;
      motd?: string;
      shortDesc?: string;
      fullDesc?: string;
      website?: string;
      discord?: string;
      telegram?: string;
      donate?: string;
      tiktok?: string;
      launcherUrl?: string;
      avatarUrl?: string;
      bannerUrl?: string;
      tags?: string[];
    }
    const name = String(body.name || currentServer.name || '').trim()
    const addr = String(body.addr || currentServer.addr || '').trim()
    if (!name || !addr) {
      return NextResponse.json({ error: 'Server name and address are required' }, { status: 400 })
    }
    const platform = body.platform === 'discord' || body.core === 'discord' || currentServer.platform === 'discord'
      ? 'discord'
      : 'minecraft';
    const server = await updateServerById({
      serverId,
      ownerId,
      name,
      addr,
      platform,
      mode: String(body.category || body.mode || currentServer.mode || (platform === 'discord' ? 'Community' : 'Survival')),
      ver: String(body.ver || currentServer.ver || (platform === 'discord' ? 'Discord' : '1.21.11')),
      core: platform === 'discord' ? 'discord' : (body.core === 'bedrock' || body.core === 'java_bedrock' ? body.core : (currentServer.core === 'discord' ? 'java' : (currentServer.core || 'java'))),
      country: String(body.country || currentServer.country || ''),
      motd: String(body.motd || currentServer.motd || ''),
      shortDesc: String(body.shortDesc || currentServer.shortDesc || ''),
      fullDesc: String(body.fullDesc || body.description || currentServer.fullDesc || ''),
      desc: String(body.description || currentServer.desc || ''),
      website: String(body.website || currentServer.website || ''),
      discord: String(body.discord || currentServer.discord || ''),
      telegram: String(body.telegram || currentServer.telegram || ''),
      donate: String(body.donate || currentServer.donate || ''),
      tiktok: String(body.tiktok || currentServer.tiktok || ''),
      launcherUrl: String(body.launcherUrl || currentServer.launcherUrl || ''),
      avatarUrl: String(body.avatarUrl || currentServer.avatarUrl || ''),
      bannerUrl: String(body.bannerUrl || currentServer.bannerUrl || ''),
      gallery: Array.isArray(body.images) ? body.images.slice(0, 6) : (currentServer.gallery || []).slice(0, 6),
      videos: Array.isArray(body.videos) ? body.videos.slice(0, 2) : (currentServer.videos || []).slice(0, 2),
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 6) : (currentServer.tags || []).slice(0, 6),
    })
    return NextResponse.json({ success: true, server })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update server'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const serverId = Number(context.params.id)
  if (!Number.isFinite(serverId)) {
    return NextResponse.json({ error: 'Invalid server id' }, { status: 400 })
  }
  const role = await resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
  try {
    const result = await deleteServerById({
      serverId,
      userId: auth.user.id,
      isAdmin: role === 'ADMIN',
    })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete server'
    return NextResponse.json({ error: message }, { status: 403 })
  }
}
