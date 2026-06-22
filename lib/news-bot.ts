import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createNewsPost, type NewsContentBlock } from '@/lib/auth-db'
import { prisma } from '@/lib/prisma'

type NewsSourceKind = 'rss' | 'reddit' | 'telegram' | 'web' | 'x'

type NewsSource = {
  kind: NewsSourceKind
  url: string
  label: string
}

type Candidate = {
  id: string
  title: string
  excerpt: string
  url: string
  source: string
  publishedAt?: string | null
}

type BotState = {
  seen: string[]
}

type ComposedNews = {
  title: string
  excerpt: string
  blocks: NewsContentBlock[]
  telegramText: string
}

const DEFAULT_SOURCES: NewsSource[] = [
  { kind: 'rss', label: 'Modrinth Blog', url: 'https://modrinth.com/news/feed/rss.xml' },
  { kind: 'rss', label: 'PaperMC', url: 'https://papermc.io/news/rss.xml' },
  { kind: 'rss', label: 'Modrinth Legacy Feed', url: 'https://blog.modrinth.com/rss.xml' },
]

const SUPPORTED_SOURCE_KINDS: NewsSourceKind[] = ['rss', 'reddit', 'telegram', 'web', 'x']

const KEYWORDS = [
  'minecraft',
  'server',
  'servers',
  'mod',
  'plugin',
  'paper',
  'spigot',
  'bedrock',
  'java',
  'discord',
  'update',
  'snapshot',
  'release',
  'launcher',
  'майнкрафт',
  'сервер',
  'мод',
  'плагін',
  'оновлення',
  'діскорд',
]

function cleanText(value: string, max = 2000) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function escapeTelegramHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function createBlockId() {
  return `bot-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function getPublicOrigin() {
  return String(process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://www.eyzencore.com').replace(/\/+$/, '')
}

function parseSources(): NewsSource[] {
  const custom = String(process.env.NEWS_BOT_SOURCES || '').trim()
  if (!custom) return DEFAULT_SOURCES

  return custom
    .split('\n')
    .flatMap((line) => line.split(','))
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((entry): NewsSource => {
      const [kindRaw, labelRaw, ...urlParts] = entry.split('|')
      const parsedKind = (kindRaw || 'rss').trim().toLowerCase() as NewsSourceKind
      const kind = SUPPORTED_SOURCE_KINDS.includes(parsedKind) ? parsedKind : 'rss'
      const label = (labelRaw || kind).trim()
      const url = urlParts.join('|').trim() || label
      return { kind, label, url }
    })
}

function isRelevant(candidate: Candidate) {
  const text = `${candidate.title} ${candidate.excerpt} ${candidate.source}`.toLowerCase()
  return KEYWORDS.some((keyword) => text.includes(keyword))
}

async function fetchText(url: string) {
  const timeoutMs = Math.max(3000, Number(process.env.NEWS_BOT_FETCH_TIMEOUT_MS || 12000))
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 EyzencoreNewsBot/1.0 (+https://www.eyzencore.com)',
        Accept: 'text/html,application/rss+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
      },
    })
    if (!response.ok) throw new Error(`Fetch failed ${response.status}: ${url}`)
    return response.text()
  } finally {
    clearTimeout(timeout)
  }
}

function parseRssItems(xml: string, source: NewsSource): Candidate[] {
  const itemPattern = /<(item|entry)\b[\s\S]*?<\/\1>/gi
  const items = xml.match(itemPattern) || []

  return items
    .map((item) => {
      const read = (tag: string) => {
        const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
        return cleanText(match?.[1] || '')
      }
      const link =
        read('link') ||
        cleanText(item.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] || '')
      const title = read('title')
      const excerpt = read('description') || read('summary') || read('content:encoded') || read('content')

      return {
        id: hash(`${source.label}:${link || title}`),
        title,
        excerpt,
        url: link,
        source: source.label,
        publishedAt: read('pubDate') || read('updated') || read('published') || null,
      }
    })
    .filter((item) => item.title && item.url)
}

async function fetchReddit(source: NewsSource): Promise<Candidate[]> {
  const raw = await fetchText(source.url)
  const json = JSON.parse(raw) as {
    data?: {
      children?: Array<{
        data?: {
          id?: string
          title?: string
          selftext?: string
          url?: string
          permalink?: string
          created_utc?: number
        }
      }>
    }
  }

  return (json.data?.children || [])
    .map((child) => child.data)
    .filter(Boolean)
    .map((item) => {
      const url = item?.permalink ? `https://www.reddit.com${item.permalink}` : String(item?.url || source.url)
      return {
        id: hash(`reddit:${item?.id || url}`),
        title: cleanText(String(item?.title || ''), 220),
        excerpt: cleanText(String(item?.selftext || ''), 900),
        url,
        source: source.label,
        publishedAt: item?.created_utc ? new Date(item.created_utc * 1000).toISOString() : null,
      }
    })
    .filter((item) => item.title && item.url)
}

function parseTelegramPage(html: string, source: NewsSource): Candidate[] {
  const messagePattern = /<div class="tgme_widget_message(?:\s|")[\s\S]*?(?=<div class="tgme_widget_message(?:\s|")|<\/section>|$)/gi
  const messages = html.match(messagePattern) || []

  return messages
    .slice(0, 12)
    .map((message) => {
      const textBlock = message.match(/<div class="tgme_widget_message_text[^"]*"[\s\S]*?<\/div>/i)?.[0] || ''
      const text = cleanText(textBlock, 1200)
      const link = cleanText(message.match(/<a class="tgme_widget_message_date" href="([^"]+)"/i)?.[1] || source.url)
      const title = text.split(/[.!?]/)[0]?.slice(0, 120) || `${source.label}: оновлення`

      return {
        id: hash(`${link}:${text}`),
        title,
        excerpt: text,
        url: link,
        source: source.label,
        publishedAt: null,
      }
    })
    .filter((item) => item.excerpt.length > 40)
}

async function collectFromSource(source: NewsSource): Promise<Candidate[]> {
  try {
    if (source.kind === 'reddit') return await fetchReddit(source)

    const raw = await fetchText(source.url)
    if (source.kind === 'telegram') return parseTelegramPage(raw, source)
    if (source.kind === 'web' || source.kind === 'x') {
      const title = cleanText(raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || source.label, 160)
      const description = cleanText(
        raw.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
          raw.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
          raw,
        1000,
      )
      return [{ id: hash(source.url), title, excerpt: description, url: source.url, source: source.label, publishedAt: null }]
    }

    return parseRssItems(raw, source)
  } catch (error) {
    console.warn(`[news-bot] source skipped: ${source.label}`, error instanceof Error ? error.message : error)
    return []
  }
}

async function loadState(statePath: string): Promise<BotState> {
  try {
    return JSON.parse(await readFile(statePath, 'utf8')) as BotState
  } catch {
    return { seen: [] }
  }
}

async function saveState(statePath: string, state: BotState) {
  await mkdir(path.dirname(statePath), { recursive: true })
  await writeFile(statePath, JSON.stringify({ seen: state.seen.slice(-500) }, null, 2), 'utf8')
}

function extractResponseText(payload: unknown) {
  const outputText = (payload as { output_text?: unknown })?.output_text
  if (typeof outputText === 'string') return outputText

  const output = (payload as { output?: Array<{ content?: Array<{ text?: string; type?: string }> }> })?.output
  return (output || [])
    .flatMap((item) => item.content || [])
    .map((item) => item.text || '')
    .filter(Boolean)
    .join('\n')
}

async function composeWithOpenAI(candidate: Candidate): Promise<ComposedNews | null> {
  const apiKey = String(process.env.NEWS_BOT_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '').trim()
  if (!apiKey) return null

  const model = String(process.env.NEWS_BOT_OPENAI_MODEL || 'gpt-4o-mini')
  const prompt = [
    'Ти редактор українського сайту Eyzencore про Minecraft і Discord сервери.',
    'Створи коротку новину тільки українською мовою.',
    'Не вигадуй фактів. Якщо даних мало, пиши обережно.',
    'Поверни JSON: {"title": "...", "excerpt": "...", "paragraphs": ["...", "..."], "telegramText": "..."}',
    '',
    `Джерело: ${candidate.source}`,
    `URL: ${candidate.url}`,
    `Заголовок: ${candidate.title}`,
    `Текст: ${candidate.excerpt}`,
  ].join('\n')

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: prompt,
      text: { format: { type: 'json_object' } },
    }),
  })

  if (!response.ok) {
    console.warn(`[news-bot] OpenAI compose failed: ${response.status}`)
    return null
  }

  const payload = await response.json()
  const text = extractResponseText(payload)
  const parsed = JSON.parse(text || '{}') as {
    title?: string
    excerpt?: string
    paragraphs?: string[]
    telegramText?: string
  }
  const paragraphs = Array.isArray(parsed.paragraphs) ? parsed.paragraphs.map((item) => cleanText(item, 1200)).filter(Boolean) : []
  if (!parsed.title || paragraphs.length === 0) return null

  return {
    title: cleanText(parsed.title, 140),
    excerpt: cleanText(parsed.excerpt || paragraphs[0], 320),
    telegramText: cleanText(parsed.telegramText || `${parsed.title}\n\n${paragraphs[0]}`, 3500),
    blocks: [
      { id: createBlockId(), type: 'paragraph', text: paragraphs[0] },
      ...paragraphs.slice(1).map((text) => ({ id: createBlockId(), type: 'paragraph' as const, text })),
      { id: createBlockId(), type: 'quote', text: `Джерело: ${candidate.source} - ${candidate.url}` },
    ],
  }
}

function composeFallback(candidate: Candidate): ComposedNews {
  const sourceTitle = cleanText(candidate.title, 110)
  const title = sourceTitle.match(/[а-яіїєґ]/i) ? sourceTitle : `Нове оновлення у світі Minecraft: ${sourceTitle}`
  const excerpt = `Eyzencore знайшов нову тему з джерела ${candidate.source}. Ми додали її у стрічку, щоб власники серверів і гравці могли швидко відстежувати важливі оновлення.`
  const paragraph = [
    `У спільноті Minecraft та серверних проєктів з'явилася нова тема: ${sourceTitle}.`,
    `Джерело повідомляє деталі за посиланням нижче. Якщо новина важлива для власників серверів, її варто перевірити та врахувати у своїх проєктах.`,
    'Для красивого автоматичного переказу українською підключіть NEWS_BOT_OPENAI_API_KEY у .env.',
  ]

  return {
    title,
    excerpt,
    telegramText: `Новина Eyzencore\n\n${title}\n\n${excerpt}`,
    blocks: [
      ...paragraph.map((text) => ({ id: createBlockId(), type: 'paragraph' as const, text })),
      { id: createBlockId(), type: 'quote', text: `Джерело: ${candidate.source} - ${candidate.url}` },
    ],
  }
}

async function postToTelegram(input: { postId: number; news: ComposedNews }) {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim()
  const chatId = String(process.env.TELEGRAM_NEWS_CHANNEL_ID || process.env.NEWS_BOT_TELEGRAM_CHAT_ID || '').trim()
  if (!token || !chatId) return

  const url = `${getPublicOrigin()}/news/${input.postId}`
  const text = [
    escapeTelegramHtml(input.news.telegramText),
    '',
    `<a href="${url}">Читати повністю на Eyzencore</a>`,
  ].join('\n')

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    }),
  })

  if (!response.ok) {
    console.warn(`[news-bot] Telegram post failed: ${response.status} ${await response.text().catch(() => '')}`)
  }
}

async function findAuthorId() {
  const email = String(process.env.NEWS_BOT_AUTHOR_EMAIL || process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const user = email
    ? await prisma.app_users.findFirst({ where: { email }, select: { id: true } })
    : await prisma.app_users.findFirst({ where: { role: 'ADMIN' }, orderBy: { created_at: 'asc' }, select: { id: true } })

  if (!user) throw new Error('NEWS_BOT_AUTHOR_EMAIL або ADMIN_EMAIL не знайдено серед користувачів сайту')
  return user.id
}

export async function runNewsBot() {
  const dryRun = process.argv.includes('--dry-run') || process.env.NEWS_BOT_DRY_RUN === '1'
  const limit = Math.max(1, Math.min(Number(process.env.NEWS_BOT_LIMIT || 1), 5))
  const statePath = path.join(process.cwd(), 'data', 'news-bot-state.json')
  const state = await loadState(statePath)
  const seen = new Set(state.seen)
  const sources = parseSources()
  const collected = (await Promise.all(sources.map(collectFromSource)))
    .flat()
    .filter(isRelevant)
    .filter((candidate) => !seen.has(candidate.id))
    .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())

  console.log(`[news-bot] collected=${collected.length} sources=${sources.length}`)
  if (collected.length === 0) return { created: 0 }

  const authorUserId = dryRun ? '' : await findAuthorId()
  let created = 0

  for (const candidate of collected.slice(0, limit)) {
    const composed = (await composeWithOpenAI(candidate).catch(() => null)) || composeFallback(candidate)

    if (dryRun) {
      console.log('[news-bot] dry-run candidate:', { title: composed.title, source: candidate.source, url: candidate.url })
      continue
    }

    const post = await createNewsPost({
      authorUserId,
      title: composed.title,
      excerpt: composed.excerpt,
      blocks: composed.blocks,
      category: 'Новини',
      coverUrl: null,
    })
    await postToTelegram({ postId: post.id, news: composed })
    seen.add(candidate.id)
    created += 1
    console.log(`[news-bot] created news #${post.id}: ${post.title}`)
  }

  if (!dryRun) await saveState(statePath, { seen: Array.from(seen) })
  return { created }
}
