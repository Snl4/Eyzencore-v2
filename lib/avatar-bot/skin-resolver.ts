import { AVATAR_BOT_MAX_SKIN_BYTES } from '@/lib/avatar-bot/constants'

const MINECRAFT_NICK_PATTERN = /^[a-zA-Z0-9_]{3,16}$/

export function isValidMinecraftNick(value: string): boolean {
  return MINECRAFT_NICK_PATTERN.test(value.trim())
}

export async function resolveUsernameSkinUrl(username: string): Promise<string | null> {
  const nick = username.trim()
  const profileResponse = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(nick)}`)
  if (profileResponse.status === 404) {
    return null
  }
  if (!profileResponse.ok) {
    throw new Error(`Mojang profile lookup failed: ${profileResponse.status}`)
  }
  const profile = (await profileResponse.json()) as { id?: string }
  if (!profile.id) {
    return null
  }
  const sessionResponse = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${profile.id}`)
  if (!sessionResponse.ok) {
    throw new Error(`Mojang session lookup failed: ${sessionResponse.status}`)
  }
  const session = (await sessionResponse.json()) as {
    properties?: Array<{ name?: string; value?: string }>
  }
  const texturesProperty = session.properties?.find((item) => item.name === 'textures')
  if (!texturesProperty?.value) {
    return null
  }
  const decoded = JSON.parse(Buffer.from(texturesProperty.value, 'base64').toString('utf8')) as {
    textures?: { SKIN?: { url?: string } }
  }
  return decoded.textures?.SKIN?.url ?? null
}

export function isLikelySkinDocument(mimeType: string | undefined, fileName: string | undefined): boolean {
  const normalizedMime = String(mimeType || '').toLowerCase()
  const normalizedName = String(fileName || '').toLowerCase()
  if (normalizedMime.includes('png')) {
    return true
  }
  return normalizedName.endsWith('.png')
}

export function validateSkinBuffer(buffer: Buffer): boolean {
  if (buffer.length === 0 || buffer.length > AVATAR_BOT_MAX_SKIN_BYTES) {
    return false
  }
  return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
}

export async function uploadSkinForRender(buffer: Buffer): Promise<string> {
  const form = new FormData()
  form.append('file', new Blob([buffer], { type: 'image/png' }), 'skin.png')
  const response = await fetch('https://0x0.st', {
    method: 'POST',
    body: form,
  })
  if (!response.ok) {
    throw new Error(`Skin upload failed: ${response.status}`)
  }
  const url = (await response.text()).trim()
  if (!url.startsWith('http')) {
    throw new Error('Skin upload returned invalid URL')
  }
  return url
}
