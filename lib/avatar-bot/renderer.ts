import { AVATAR_BOT_RENDER_SIZE, AVATAR_VIEWS } from '@/lib/avatar-bot/constants'
import type { RenderAvatarInput } from '@/lib/avatar-bot/types'

function buildVisageUrl(input: RenderAvatarInput): string {
  const view = AVATAR_VIEWS[input.view]?.path ?? 'bust'
  const size = input.size ?? AVATAR_BOT_RENDER_SIZE
  const username = String(input.username || '').trim()
  const skinUrl = String(input.skinUrl || '').trim()
  const base = `https://visage.surgeplay.com/${view}/${size}`
  if (skinUrl) {
    return `${base}?skin=${encodeURIComponent(skinUrl)}&overlay=true`
  }
  return `${base}/${encodeURIComponent(username)}?overlay=true`
}

export async function renderAvatarImage(input: RenderAvatarInput): Promise<Buffer> {
  const username = String(input.username || '').trim()
  const skinUrl = String(input.skinUrl || '').trim()
  if (!username && !skinUrl) {
    throw new Error('Username or skin URL is required')
  }
  const url = buildVisageUrl(input)
  const response = await fetch(url, {
    headers: { 'User-Agent': 'EyzencoreAvatarBot/1.0' },
  })
  if (!response.ok) {
    throw new Error(`Render failed: ${response.status}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length < 128) {
    throw new Error('Render returned empty image')
  }
  return buffer
}
