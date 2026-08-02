export const IMAGE_PLACEHOLDER = '/images/placeholder-minecraft.jpg'
export const SERVER_BANNER_PLACEHOLDER = '/images/server-unknown-banner.png'
export const SERVER_AVATAR_PLACEHOLDER = '/images/server-unknown-avatar.png'

const LEGACY_EMPTY_SERVER_IMAGES = new Set([
  IMAGE_PLACEHOLDER,
  '/project-default-logo.png',
])

function getCleanServerImage(url?: string | null) {
  const image = url?.trim()
  if (!image || LEGACY_EMPTY_SERVER_IMAGES.has(image)) return null
  return image
}

export function getServerBannerImage(url?: string | null) {
  return getCleanServerImage(url) || SERVER_BANNER_PLACEHOLDER
}

export function getServerAvatarImage(url?: string | null) {
  return getCleanServerImage(url) || SERVER_AVATAR_PLACEHOLDER
}
