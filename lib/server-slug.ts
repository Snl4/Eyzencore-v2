const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh',
  з: 'z', и: 'y', і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n',
  о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'yu', я: 'ya', ъ: '', ы: 'y',
  э: 'e', ё: 'yo'
}

function transliterateCyrillic(value: string): string {
  return Array.from(value).map((char) => CYRILLIC_TO_LATIN[char] ?? char).join('')
}

function normalizeSlugText(value: string): string {
  const transliterated = transliterateCyrillic(
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[’'`]/g, '')
  )
  return transliterated
    .replace(/[\/\\?#%]+/g, ' ')
    .replace(/[^a-z0-9\s-]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildServerDashboardSlug(name: string): string {
  const normalizedName = normalizeSlugText(name)
  if (normalizedName) {
    return normalizedName
  }
  return 'server'
}

export function buildServerPublicSlug(input: { seed?: number; id?: number; name: string }): string {
  const id = Number(input.seed ?? input.id ?? 0)
  const name = buildServerDashboardSlug(input.name)
  return id > 0 ? `${name}-${id}` : name
}

export function buildServerPublicPath(input: { seed?: number; id?: number; name: string }): string {
  return `/servers/${buildServerPublicSlug(input)}`
}

export function parseServerIdFromPublicSlug(value: string): number | null {
  const raw = String(value || '').trim()
  if (/^\d+$/.test(raw)) {
    return Number(raw)
  }
  const match = raw.match(/-(\d+)$/)
  return match ? Number(match[1]) : null
}

export function isMatchingServerSlug(input: { name: string; slug: string }): boolean {
  return buildServerDashboardSlug(input.name) === normalizeSlugText(input.slug)
}
