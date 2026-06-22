import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { resolveUploadPath } from '@/lib/upload-store'

export const runtime = 'nodejs'

const MIME_BY_EXT: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.ogv': 'video/ogg',
  '.png': 'image/png',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
}

export async function GET(
  _request: NextRequest,
  context: { params: { path?: string[] } }
) {
  const filePath = resolveUploadPath(context.params.path || [])
  if (!filePath) {
    return NextResponse.json({ error: 'Invalid upload path' }, { status: 400 })
  }

  try {
    const info = await stat(filePath)
    if (!info.isFile()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const body = await readFile(filePath)
    const contentType = MIME_BY_EXT[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
    return new NextResponse(body, {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': String(body.length),
        'Content-Type': contentType,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
