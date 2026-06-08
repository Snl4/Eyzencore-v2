// Server-side IP → country lookup with in-memory cache.
// Uses ip-api.com (free, no API key, ~45 req/min limit per IP).
// Falls back gracefully on local/private IPs and lookup failures.

type GeoEntry = { code: string; name: string; expiresAt: number }

const CACHE = new Map<string, GeoEntry>()
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24h

function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip) return true
  const trimmed = ip.trim().toLowerCase()
  if (!trimmed) return true
  if (trimmed === '::1' || trimmed === 'localhost' || trimmed === '127.0.0.1') return true
  if (trimmed.startsWith('::ffff:')) {
    return isPrivateOrLocalIp(trimmed.slice(7))
  }
  // IPv4 private ranges
  if (/^10\./.test(trimmed)) return true
  if (/^192\.168\./.test(trimmed)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(trimmed)) return true
  if (/^169\.254\./.test(trimmed)) return true
  // IPv6 link-local / unique local
  if (trimmed.startsWith('fe80:') || trimmed.startsWith('fc') || trimmed.startsWith('fd')) return true
  return false
}

export async function lookupCountry(ip: string): Promise<{ code: string; name: string } | null> {
  const normalized = String(ip || '').trim()
  if (!normalized || isPrivateOrLocalIp(normalized)) return null
  const cached = CACHE.get(normalized)
  const now = Date.now()
  if (cached && cached.expiresAt > now) {
    return cached.code ? { code: cached.code, name: cached.name } : null
  }
  try {
    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(normalized)}?fields=status,country,countryCode`,
      { cache: 'no-store' }
    )
    if (!response.ok) {
      CACHE.set(normalized, { code: '', name: '', expiresAt: now + 1000 * 60 * 5 })
      return null
    }
    const payload = (await response.json()) as { status?: string; country?: string; countryCode?: string }
    if (payload.status !== 'success') {
      CACHE.set(normalized, { code: '', name: '', expiresAt: now + 1000 * 60 * 60 })
      return null
    }
    const code = String(payload.countryCode || '').trim().toUpperCase()
    const name = String(payload.country || '').trim()
    CACHE.set(normalized, { code, name, expiresAt: now + CACHE_TTL_MS })
    return code ? { code, name } : null
  } catch {
    CACHE.set(normalized, { code: '', name: '', expiresAt: now + 1000 * 60 * 5 })
    return null
  }
}

// Country code → readable name + flag emoji.
// Used as fallback display when only the code is stored in DB.
const COUNTRY_DICT: Record<string, { name: string; flag: string }> = {
  UA: { name: 'Україна', flag: '🇺🇦' },
  PL: { name: 'Польща', flag: '🇵🇱' },
  DE: { name: 'Німеччина', flag: '🇩🇪' },
  CZ: { name: 'Чехія', flag: '🇨🇿' },
  SK: { name: 'Словаччина', flag: '🇸🇰' },
  US: { name: 'США', flag: '🇺🇸' },
  GB: { name: 'Велика Британія', flag: '🇬🇧' },
  RU: { name: 'росія', flag: '🇷🇺' },
  BY: { name: 'Білорусь', flag: '🇧🇾' },
  MD: { name: 'Молдова', flag: '🇲🇩' },
  RO: { name: 'Румунія', flag: '🇷🇴' },
  HU: { name: 'Угорщина', flag: '🇭🇺' },
  TR: { name: 'Туреччина', flag: '🇹🇷' },
  FR: { name: 'Франція', flag: '🇫🇷' },
  ES: { name: 'Іспанія', flag: '🇪🇸' },
  IT: { name: 'Італія', flag: '🇮🇹' },
  NL: { name: 'Нідерланди', flag: '🇳🇱' },
  CA: { name: 'Канада', flag: '🇨🇦' },
  LT: { name: 'Литва', flag: '🇱🇹' },
  LV: { name: 'Латвія', flag: '🇱🇻' },
  EE: { name: 'Естонія', flag: '🇪🇪' },
  BG: { name: 'Болгарія', flag: '🇧🇬' },
}

// Convert any uppercase ISO 3166-1 alpha-2 code into a flag emoji
// (regional indicator codepoints A=🇦, etc.). Falls back to globe.
function codeToFlag(code: string): string {
  const normalized = String(code || '').trim().toUpperCase()
  if (normalized.length !== 2 || !/^[A-Z]{2}$/.test(normalized)) return '🌍'
  const base = 0x1f1e6
  const a = base + (normalized.charCodeAt(0) - 65)
  const b = base + (normalized.charCodeAt(1) - 65)
  return String.fromCodePoint(a, b)
}

export function describeCountry(code: string | null | undefined): { name: string; flag: string; code: string } {
  const normalized = String(code || '').trim().toUpperCase()
  if (!normalized || normalized === 'UN') {
    return { name: 'Невідомо', flag: '🌍', code: 'UN' }
  }
  const entry = COUNTRY_DICT[normalized]
  if (entry) return { name: entry.name, flag: entry.flag, code: normalized }
  return { name: normalized, flag: codeToFlag(normalized), code: normalized }
}
