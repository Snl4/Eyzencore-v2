const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh',
  з: 'z', и: 'y', і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n',
  о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'yu', я: 'ya', ы: 'y', э: 'e', ё: 'yo',
}

function transliterate(value: string): string {
  return Array.from(value).map((char) => CYRILLIC_TO_LATIN[char] ?? char).join('')
}

export function buildNewsSlug(input: { id?: number; title: string }): string {
  const normalized = transliterate(String(input.title || '').trim().toLowerCase().replace(/[’'`]/g, ''))
    .replace(/[\/\\?#%]+/g, ' ')
    .replace(/[^a-z0-9\s-]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  const base = normalized || 'news'
  const id = Number(input.id || 0)
  return id > 0 ? `${base}-${id}` : base
}

export function buildNewsPath(input: { id?: number; title: string }): string {
  return `/news/${buildNewsSlug(input)}`
}

export function parseNewsIdFromSlug(value: string): number | null {
  const raw = String(value || '').trim()
  if (/^\d+$/.test(raw)) return Number(raw)
  const match = raw.match(/-(\d+)$/)
  return match ? Number(match[1]) : null
}
