export type ForumContentBlock =
  | { type: 'markdown'; text: string }
  | { type: 'image'; url: string; caption: string }
  | { type: 'gallery'; urls: string[]; caption: string }
  | { type: 'video'; url: string; caption: string }

const LEGACY_TOKEN_PATTERN = /::slider::\s*([\s\S]*?)\s*::\/slider::|::video::\s*([\s\S]*?)\s*::\/video::/gi
const MARKDOWN_IMAGE_PATTERN = /^!\[([^\]]*)\]\(([^)]+)\)$/
const BROKEN_HASH_LINE_PATTERN = /^!\[[^\]]*\]\(![a-f0-9]+\)$/i
const BROKEN_HASH_ONLY_PATTERN = /^![a-f0-9]{32,}$/i

/** Normalize legacy forum media URLs to local paths. */
export function normalizeForumMediaUrl(value: string): string {
  const trimmed = String(value || '').trim()
  if (!trimmed || trimmed.startsWith('!')) return ''
  const withoutDoubleSlash = trimmed.replace(
    /https?:\/\/(?:www\.)?eyzencore\.com\/\/uploads\//gi,
    '/uploads/'
  )
  const legacyUpload = withoutDoubleSlash.match(
    /^https?:\/\/(?:www\.)?eyzencore\.com\/uploads\/([^?#]+)/i
  )
  if (legacyUpload?.[1]) {
    return `/uploads/legacy-nebula/server/uploads/${legacyUpload[1]}`
  }
  return withoutDoubleSlash
}

function cleanBrokenLegacyMarkup(text: string): string {
  return text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      if (!trimmed) return true
      if (BROKEN_HASH_ONLY_PATTERN.test(trimmed)) return false
      if (BROKEN_HASH_LINE_PATTERN.test(trimmed)) return false
      return true
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function appendForumText(text: string, blocks: ForumContentBlock[]): void {
  if (!text.trim()) return
  const lines = text.split('\n')
  let buffer: string[] = []
  const flushBuffer = (): void => {
    const joined = cleanBrokenLegacyMarkup(buffer.join('\n'))
    buffer = []
    if (joined) blocks.push({ type: 'markdown', text: joined })
  }
  for (const line of lines) {
    const trimmed = line.trim()
    const imageMatch = trimmed.match(MARKDOWN_IMAGE_PATTERN)
    if (imageMatch) {
      flushBuffer()
      const url = normalizeForumMediaUrl(imageMatch[2])
      if (url) {
        blocks.push({ type: 'image', url, caption: imageMatch[1] || '' })
      }
      continue
    }
    buffer.push(line)
  }
  flushBuffer()
}

/** Parse legacy forum markup with sliders, videos, and markdown images. */
export function parseForumContent(raw: string): ForumContentBlock[] {
  const source = String(raw || '').replace(/\r\n/g, '\n').trim()
  if (!source) return []
  const blocks: ForumContentBlock[] = []
  let cursor = 0
  let match: RegExpExecArray | null
  const tokenPattern = new RegExp(LEGACY_TOKEN_PATTERN.source, LEGACY_TOKEN_PATTERN.flags)
  while ((match = tokenPattern.exec(source)) !== null) {
    appendForumText(source.slice(cursor, match.index), blocks)
    if (match[1] != null) {
      const lines = match[1].split('\n').map((line) => line.trim()).filter(Boolean)
      const caption = lines[0] && !/^https?:\/\//i.test(lines[0]) ? lines.shift() || '' : ''
      const urls = lines
        .filter((line) => /^https?:\/\//i.test(line))
        .map(normalizeForumMediaUrl)
        .filter(Boolean)
      if (urls.length) blocks.push({ type: 'gallery', urls, caption })
    } else if (match[2] != null) {
      const url = match[2]
        .split('\n')
        .map((line) => line.trim())
        .find((line) => /^https?:\/\//i.test(line))
      if (url) blocks.push({ type: 'video', url, caption: '' })
    }
    cursor = tokenPattern.lastIndex
  }
  appendForumText(source.slice(cursor), blocks)
  return blocks
}
