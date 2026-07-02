import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { AUTH_COOKIE_NAME, countServersByOwner, getAuthSessionFromToken, resolveUserRole } from '@/lib/auth-db'
import { buildUploadUrl, getUploadsRoot } from '@/lib/upload-store'

export const runtime = 'nodejs'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024 // 8 MB
const MAX_VIDEO_BYTES = 80 * 1024 * 1024 // 80 MB
const MAX_FILE_BYTES = 25 * 1024 * 1024 // 25 MB

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
const VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'])
const FILE_MIME = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/x-7z-compressed',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/vnd.adobe.photoshop',
  'application/octet-stream',
])

const EXT_TO_MIME: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.mov': 'video/quicktime',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.rar': 'application/vnd.rar',
  '.7z': 'application/x-7z-compressed',
  '.txt': 'text/plain',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.psd': 'image/vnd.adobe.photoshop',
}

const IMAGE_EXT = new Set(['.avif', '.gif', '.jpg', '.jpeg', '.png', '.webp'])
const VIDEO_EXT = new Set(['.mp4', '.webm', '.ogv', '.mov'])
const FILE_EXT = new Set(['.pdf', '.zip', '.rar', '.7z', '.txt', '.doc', '.docx', '.xls', '.xlsx', '.psd'])

function resolveMime(file: File): string {
  const fromType = String(file.type || '').toLowerCase().trim()
  if (fromType && fromType !== 'application/octet-stream') return fromType
  const ext = path.extname(file.name || '').toLowerCase()
  return EXT_TO_MIME[ext] || fromType || 'application/octet-stream'
}

function classifyUpload(file: File, mime: string) {
  const ext = path.extname(file.name || '').toLowerCase()
  const isImage = IMAGE_MIME.has(mime) || IMAGE_EXT.has(ext)
  const isVideo = VIDEO_MIME.has(mime) || VIDEO_EXT.has(ext)
  const isDocument = FILE_MIME.has(mime) || FILE_EXT.has(ext)
  return { isImage, isVideo, isDocument }
}

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
  return '.bin'
}

function safeKind(value: string | null): 'news' | 'forum' | 'avatar' | 'banner' | 'misc' {
  const normalized = String(value || '').toLowerCase()
  if (
    normalized === 'news' ||
    normalized === 'forum' ||
    normalized === 'avatar' ||
    normalized === 'banner' ||
    normalized === 'misc'
  ) {
    return normalized
  }
  return 'misc'
}

export async function POST(request: NextRequest) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value)
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
  const mime = resolveMime(file)
  const { isImage, isVideo, isDocument } = classifyUpload(file, mime)

  const allowsDocuments = kind === 'forum'
  if (!isImage && !isVideo && !(allowsDocuments && isDocument)) {
    return NextResponse.json(
      { error: 'Підтримуються зображення, відео або файли (pdf, zip, doc, txt тощо)' },
      { status: 400 }
    )
  }


  // News videos are reserved for admins or users that actually own a server.
  if (isVideo && kind !== 'forum') {
    const role = await resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
    const serverCount = await countServersByOwner(auth.user.id)
    if (role !== 'ADMIN' && serverCount === 0) {
      return NextResponse.json({ error: 'Завантажувати відео можуть адміністратори або власники серверів' }, { status: 403 })
    }
  }

  const limit = isVideo ? MAX_VIDEO_BYTES : isImage ? MAX_IMAGE_BYTES : MAX_FILE_BYTES
  if (file.size > limit) {
    const limitMb = Math.round(limit / (1024 * 1024))
    return NextResponse.json({ error: `Файл занадто великий - максимум ${limitMb} МБ` }, { status: 413 })
  }

  const now = new Date()
  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const subdir = `${yyyy}-${mm}`
  const ext = safeExtension(file.name || '', mime)
  const filename = `${randomUUID()}${ext}`

  const baseDir = path.join(getUploadsRoot(), kind, subdir)
  try {
    await mkdir(baseDir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(baseDir, filename), buffer)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося зберегти файл'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const url = buildUploadUrl(kind, subdir, filename)
  const responseKind = isImage ? 'image' : isVideo ? 'video' : 'file'
  return NextResponse.json({
    url,
    kind: responseKind,
    mime,
    size: file.size,
    name: file.name,
  })
}
