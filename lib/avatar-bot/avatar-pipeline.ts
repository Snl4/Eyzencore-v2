import { processAvatarImage } from '@/lib/avatar-bot/image-processor'
import { renderSkinWithBlender } from '@/lib/avatar-bot/blender-render'
import { getBlenderConfig } from '@/lib/avatar-bot/blender-config'
import { AVATAR_BOT_RENDER_SIZE } from '@/lib/avatar-bot/constants'
import { downloadAvatarImage } from '@/lib/avatar-bot/renderer'
import { downloadSkinBuffer } from '@/lib/avatar-bot/skin-buffer'
import type { AvatarBackgroundKey, AvatarViewKey } from '@/lib/avatar-bot/types'

export type AvatarPipelineInput = {
  view: AvatarViewKey
  background: AvatarBackgroundKey
  username?: string | null
  skinUrl?: string | null
  size?: number
}

async function resolveSkinBuffer(input: AvatarPipelineInput): Promise<Buffer> {
  const skinUrl = String(input.skinUrl || '').trim()
  if (!skinUrl) {
    throw new Error('Skin URL is required for Blender render')
  }
  return downloadSkinBuffer(skinUrl)
}

export async function renderAvatarPipeline(input: AvatarPipelineInput): Promise<Buffer> {
  const size = input.size ?? AVATAR_BOT_RENDER_SIZE
  const config = getBlenderConfig()
  if (config.isEnabled) {
    try {
      const skinBuffer = await resolveSkinBuffer(input)
      return await renderSkinWithBlender({
        skinBuffer,
        view: input.view,
        background: input.background,
        size,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[avatar-bot] blender pipeline failed: ${message}`)
    }
  }
  const remoteRender = await downloadAvatarImage({
    view: input.view,
    username: input.username,
    skinUrl: input.skinUrl,
    size,
  })
  return processAvatarImage({
    renderBuffer: remoteRender,
    background: input.background,
    size,
  })
}
