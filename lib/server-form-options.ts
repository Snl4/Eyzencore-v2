export const MAX_SERVER_TAGS = 6

export const MAX_CUSTOM_TAG_LENGTH = 12

export const MAX_CUSTOM_MODE_LENGTH = 24

export function normalizeCustomTag(value: string): string {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, MAX_CUSTOM_TAG_LENGTH)
}

export function normalizeCustomMode(value: string): string {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, MAX_CUSTOM_MODE_LENGTH)
}

export function sanitizeServerTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of tags) {
    const normalized = normalizeCustomTag(String(item || ''))
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(normalized)
    if (result.length >= MAX_SERVER_TAGS) break
  }
  return result
}
