const PRODUCTION_FALLBACK = 'https://eyzencore.com'

function normalizePublicAppUrl(value: string): string {
  const trimmed = String(value || '').trim().replace(/\/+$/, '')
  if (!trimmed) {
    return ''
  }
  try {
    const url = new URL(trimmed)
    url.hostname = url.hostname.replace(/^www\./i, '')
    return url.origin
  } catch {
    return trimmed.replace(/^https?:\/\/www\./i, (match) => match.replace('www.', ''))
  }
}

export function normalizePublicSiteUrl(value: string): string {
  const trimmed = String(value || '').trim()
  if (!trimmed) {
    return ''
  }
  try {
    const url = new URL(trimmed)
    url.hostname = url.hostname.replace(/^www\./i, '')
    return url.toString().replace(/\/$/, '')
  } catch {
    return trimmed.replace(/^(https?:\/\/)www\./i, '$1')
  }
}

export function resolvePublicAppUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    process.env.FRONTEND_URL,
    process.env.API_PUBLIC_URL,
  ]
    .map((value) => normalizePublicAppUrl(String(value || '')))
    .filter(Boolean)

  if (process.env.NODE_ENV === 'production') {
    const productionCandidate = candidates.find(
      (value) => !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(value),
    )
    return productionCandidate || PRODUCTION_FALLBACK
  }

  return candidates[0] || 'http://localhost:3000'
}
