import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { resolveUserRole } from '@/lib/auth-db'
import { ADMIN_EMAIL } from '@/lib/constants'

const MAX_TEXT_LENGTH = 16000
const CHUNK_SIZE = 2600

type TranslateRequest = {
  text?: string
  target?: string
}

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  const role = await resolveUserRole({
    userId: user.id,
    role: user.user_metadata.role,
  })
  if (role !== 'ADMIN' && user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Переклад опису доступний тільки адміністратору' }, { status: 403 })
  }
  return null
}

function protectMarkup(value: string) {
  const tokens: string[] = []
  const save = (match: string) => {
    const token = `EYZTOKEN${tokens.length}TOKEN`
    tokens.push(match)
    return token
  }
  const protectedText = value
    .replace(/```[\s\S]*?```/g, save)
    .replace(/`[^`\n]+`/g, save)
    .replace(/<[^>]+>/g, save)
    .replace(/https?:\/\/[^\s)"'>]+/g, save)
    .replace(/\/api\/uploads\/[^\s)"'>]+/g, save)
  return { protectedText, tokens }
}

function restoreMarkup(value: string, tokens: string[]) {
  return tokens.reduce((text, tokenValue, index) => {
    const pattern = new RegExp(`EYZ\\s*TOKEN\\s*${index}\\s*TOKEN|EYZTOKEN${index}TOKEN`, 'gi')
    return text.replace(pattern, tokenValue)
  }, value)
}

function splitText(value: string) {
  const chunks: string[] = []
  let remaining = value
  while (remaining.length > CHUNK_SIZE) {
    const slice = remaining.slice(0, CHUNK_SIZE)
    const splitAt = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('\n'), slice.lastIndexOf('. '))
    const end = splitAt > 800 ? splitAt + (slice[splitAt] === '.' ? 2 : 1) : CHUNK_SIZE
    chunks.push(remaining.slice(0, end))
    remaining = remaining.slice(end)
  }
  if (remaining.trim()) chunks.push(remaining)
  return chunks
}

function readTranslatedText(payload: unknown): string {
  if (!Array.isArray(payload)) return ''
  const segments = payload[0]
  if (!Array.isArray(segments)) return ''
  return segments
    .map((segment) => Array.isArray(segment) ? String(segment[0] || '') : '')
    .join('')
}

async function translateChunk(text: string, target: string) {
  const url = new URL('https://translate.googleapis.com/translate_a/single')
  url.searchParams.set('client', 'gtx')
  url.searchParams.set('sl', 'auto')
  url.searchParams.set('tl', target)
  url.searchParams.set('dt', 't')
  url.searchParams.set('q', text)

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Eyzencore resource translator (https://eyzencore.com)',
    },
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error('Translate service failed')
  }
  return readTranslatedText(await response.json())
}

export async function POST(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError
  try {
    const body = (await request.json()) as TranslateRequest
    const text = String(body.text || '').trim().slice(0, MAX_TEXT_LENGTH)
    const target = String(body.target || 'uk').trim().toLowerCase() || 'uk'
    if (!text) {
      return NextResponse.json({ error: 'Немає тексту для перекладу' }, { status: 400 })
    }
    if (!/^[a-z-]{2,8}$/.test(target)) {
      return NextResponse.json({ error: 'Некоректна мова перекладу' }, { status: 400 })
    }

    const { protectedText, tokens } = protectMarkup(text)
    const translatedRaw = (await Promise.all(splitText(protectedText).map((chunk) => translateChunk(chunk, target)))).join('')
    const translated = restoreMarkup(translatedRaw, tokens)
    return NextResponse.json(
      { translated },
      {
        headers: {
          'Cache-Control': 'private, max-age=0, no-store',
        },
      },
    )
  } catch {
    return NextResponse.json({ error: 'Не вдалося перекласти опис' }, { status: 502 })
  }
}
