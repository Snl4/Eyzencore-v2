import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { AUTH_COOKIE_NAME, getAuthSessionFromToken, resolveUserRole } from '@/lib/auth-db'

export const runtime = 'nodejs'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024 // 8 MB
const MAX_VIDEO_BYTES = 80 * 1024 * 1024 // 80 MB

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
const VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'])

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/ogg': '.ogv',
  'video/quicktime': '.mov',
}

function safeExtension(filename: string, mime: string): string {
  const fromMime = EXT_BY_MIME[mime]
  if (fromMime) return fromMime
  const guessed = path.extname(String(filename || '')).toLowerCase()
  if (/^\.[a-z0-9]{2,5}$/.test(guessed)) return guessed
  return mime.startsWith('image/') ? '.bin' : '.bin'
}

function safeKind(value: string | null): 'news' | 'avatar' | 'banner' | 'misc' {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'news' || normalized === 'avatar' || normalized === 'banner' || normalized === 'misc') {
    return normalized
  }
  return 'misc'
}

export async function POST(request: NextRequest) {
  const auth = getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
  if (!auth) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Неправильний формат запиту' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Файл не знайдено у запиті' }, { status: 400 })
  }

  const kind = safeKind(String(formData.get('kind') || 'news'))
  const mime = String(file.type || '').toLowerCase()
  const isImage = IMAGE_MIME.has(mime)
  const isVideo = VIDEO_MIME.has(mime)

  if (!isImage && !isVideo) {
    return NextResponse.json(
      { error: 'Підтримуються лише зображення (jpg/png/webp/gif/avif) та відео (mp4/webm/ogg/mov)' },
      { status: 400 }
    )
  }

  // Editor blocks for video are reserved for OWNER/ADMIN
  if (isVideo) {
    const role = resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
    if (role !== 'OWNER' && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Завантажувати відео можуть лише автори новин' }, { status: 403 })
    }
  }

  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
  if (file.size > limit) {
    const limitMb = Math.round(limit / (1024 * 1024))
    return NextResponse.json({ error: `Файл занадто великий — максимум ${limitMb} МБ` }, { status: 413 })
  }

  const now = new Date()
  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const subdir = `${yyyy}-${mm}`
  const ext = safeExtension(file.name || '', mime)
  const filename = `${randomUUID()}${ext}`

  const baseDir = path.join(process.cwd(), 'public', 'uploads', kind, subdir)
  try {
    await mkdir(baseDir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(baseDir, filename), buffer)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося зберегти файл'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const url = `/uploads/${kind}/${subdir}/${filename}`
  return NextResponse.json({
    url,
    kind: isImage ? 'image' : 'video',
    mime,
    size: file.size,
    name: file.name,
  })
}
