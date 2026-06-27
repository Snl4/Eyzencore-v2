import { AVATAR_BOT_RENDER_SIZE } from '@/lib/avatar-bot/constants'
import type { AvatarBackgroundKey } from '@/lib/avatar-bot/types'

type ProcessAvatarImageInput = {
  renderBuffer: Buffer
  background: AvatarBackgroundKey
  size?: number
}

/**
 * Visage fallback passthrough. Blender path applies background inside .blend render.
 */
export async function processAvatarImage(input: ProcessAvatarImageInput): Promise<Buffer> {
  return input.renderBuffer
}
