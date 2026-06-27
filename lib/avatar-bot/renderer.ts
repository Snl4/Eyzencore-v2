import { AVATAR_BOT_RENDER_SIZE, AVATAR_VIEWS } from '@/lib/avatar-bot/constants'
import type { AvatarViewKey, RenderAvatarInput } from '@/lib/avatar-bot/types'

const RENDER_FETCH_TIMEOUT_MS = 15000

export type AvatarRenderCandidate = {
  label: string
  url: string
}

function buildVisageUsernameUrl(input: { view: AvatarViewKey; username: string; size: number }): string {
  const path = AVATAR_VIEWS[input.view]?.path ?? 'bust'
  return `https://visage.surgeplay.com/${path}/${input.size}/${encodeURIComponent(input.username)}?overlay=true`
}

function buildVisageSkinUrl(input: { view: AvatarViewKey; skinUrl: string; size: number }): string {
  const path = AVATAR_VIEWS[input.view]?.path ?? 'bust'
  return `https://visage.surgeplay.com/${path}/${input.size}?skin=${encodeURIComponent(input.skinUrl)}&overlay=true`
}

function buildMcHeadsUrl(username: string, size: number): string {
  return `https://mc-heads.net/player/${encodeURIComponent(username)}/${size}.png`
}

export function buildAvatarRenderCandidates(input: RenderAvatarInput): AvatarRenderCandidate[] {
  const username = String(input.username || '').trim()
  const skinUrl = String(input.skinUrl || '').trim()
  const size = input.size ?? AVATAR_BOT_RENDER_SIZE
  const candidates: AvatarRenderCandidate[] = []
  if (username) {
    candidates.push({
      label: 'visage-username',
      url: buildVisageUsernameUrl({ view: input.view, username, size }),
    })
  }
  if (skinUrl) {
    candidates.push({
      label: 'visage-skin',
      url: buildVisageSkinUrl({ view: input.view, skinUrl, size }),
    })
  }
  if (username) {
    candidates.push({
      label: 'mc-heads-fallback',
      url: buildMcHeadsUrl(username, size),
    })
  }
  return candidates
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'EyzencoreAvatarBot/1.0' },
    })
  } finally {
    clearTimeout(timer)
  }
}

export async function downloadAvatarImage(input: RenderAvatarInput): Promise<Buffer> {
  const candidates = buildAvatarRenderCandidates(input)
  if (candidates.length === 0) {
    throw new Error('Username or skin URL is required')
  }
  const errors: string[] = []
  for (const candidate of candidates) {
    try {
      const response = await fetchWithTimeout(candidate.url, RENDER_FETCH_TIMEOUT_MS)
      const contentType = String(response.headers.get('content-type') || '').toLowerCase()
      if (!response.ok) {
        errors.push(`${candidate.label}: HTTP ${response.status}`)
        continue
      }
      if (!contentType.includes('image')) {
        errors.push(`${candidate.label}: not an image`)
        continue
      }
      const buffer = Buffer.from(await response.arrayBuffer())
      if (buffer.length < 128) {
        errors.push(`${candidate.label}: empty image`)
        continue
      }
      return buffer
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`${candidate.label}: ${message}`)
    }
  }
  throw new Error(errors.join('; ') || 'Render failed')
}
