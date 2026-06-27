const SKIN_FETCH_TIMEOUT_MS = 15000

export async function downloadSkinBuffer(skinUrl: string): Promise<Buffer> {
  const url = String(skinUrl || '').trim()
  if (!url) {
    throw new Error('Skin URL is missing')
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SKIN_FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'EyzencoreAvatarBot/1.0' },
    })
    if (!response.ok) {
      throw new Error(`Skin download failed: ${response.status}`)
    }
    return Buffer.from(await response.arrayBuffer())
  } finally {
    clearTimeout(timer)
  }
}
