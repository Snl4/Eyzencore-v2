export function toYoutubeEmbedUrl(url: string): string | null {
  const normalized = String(url || '').trim()
  if (!normalized) return null

  try {
    const parsed = new URL(normalized)
    const host = parsed.hostname.replace(/^www\./i, '').replace(/^m\./i, '')

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0]
      return id ? `https://www.youtube.com/embed/${id}` : null
    }

    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (parsed.pathname === '/watch') {
        const id = parsed.searchParams.get('v')
        return id ? `https://www.youtube.com/embed/${id}` : null
      }

      const [kind, id] = parsed.pathname.split('/').filter(Boolean)
      if ((kind === 'shorts' || kind === 'embed' || kind === 'live') && id) {
        return `https://www.youtube.com/embed/${id}`
      }
    }
  } catch {
    // Fall back to regex for pasted fragments or slightly malformed links.
  }

  const match = normalized.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/i)

  return match?.[1] ? `https://www.youtube.com/embed/${match[1]}` : null
}
