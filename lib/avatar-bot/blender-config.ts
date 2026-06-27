import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export type BlenderConfig = {
  readonly isEnabled: boolean
  readonly blenderPath: string
  readonly blendFile: string
  readonly renderScript: string
  readonly generateScript: string
  readonly renderTimeoutMs: number
}

export function getBlenderConfig(): BlenderConfig {
  const blenderPath = String(process.env.AVATAR_BOT_BLENDER_PATH || 'blender').trim()
  const blendFile = resolve(
    process.cwd(),
    String(process.env.AVATAR_BOT_BLEND_FILE || 'avatar-bot/blender/minecraft_avatar.blend').trim(),
  )
  const renderScript = resolve(process.cwd(), 'avatar-bot/blender/render_skin.py')
  const generateScript = resolve(process.cwd(), 'avatar-bot/blender/generate_scene.py')
  const renderTimeoutMs = Math.max(30000, Number(process.env.AVATAR_BOT_BLENDER_TIMEOUT_MS || 120000))
  const mode = String(process.env.AVATAR_BOT_RENDER_MODE || 'blender').trim().toLowerCase()
  const isEnabled = mode !== 'remote' && existsSync(blendFile) && existsSync(renderScript)
  return {
    isEnabled,
    blenderPath,
    blendFile,
    renderScript,
    generateScript,
    renderTimeoutMs,
  }
}
