import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { getBlenderConfig } from '@/lib/avatar-bot/blender-config'
import type { AvatarBackgroundKey, AvatarViewKey } from '@/lib/avatar-bot/types'

const execFileAsync = promisify(execFile)

export async function renderSkinWithBlender(input: {
  skinBuffer: Buffer
  view: AvatarViewKey
  background: AvatarBackgroundKey
  size: number
}): Promise<Buffer> {
  const config = getBlenderConfig()
  if (!config.isEnabled) {
    throw new Error('Blender render is not configured (missing .blend file or AVATAR_BOT_RENDER_MODE=remote)')
  }
  const workDir = await mkdtemp(join(tmpdir(), 'eyzen-avatar-blender-'))
  const skinPath = join(workDir, 'skin.png')
  const outputPath = join(workDir, 'render.png')
  try {
    await writeFile(skinPath, input.skinBuffer)
    await execFileAsync(
      config.blenderPath,
      [
        '--background',
        config.blendFile,
        '--python',
        config.renderScript,
        '--',
        '--skin',
        skinPath,
        '--output',
        outputPath,
        '--pose',
        input.view,
        '--background',
        input.background,
        '--size',
        String(input.size),
      ],
      { timeout: config.renderTimeoutMs, maxBuffer: 1024 * 1024 * 8 },
    )
    return await readFile(outputPath)
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}
