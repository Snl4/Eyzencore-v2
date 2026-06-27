import { closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const LOCK_FILE_NAME = 'avatar-bot.lock'

function getLockPath(): string {
  return resolve(process.cwd(), 'data', LOCK_FILE_NAME)
}

function readLockPid(lockPath: string): number | null {
  if (!existsSync(lockPath)) {
    return null
  }
  const raw = readFileSync(lockPath, 'utf8').trim()
  const pid = Number(raw)
  return Number.isFinite(pid) && pid > 0 ? pid : null
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function removeLock(lockPath: string): void {
  try {
    unlinkSync(lockPath)
  } catch {
    return
  }
}

/**
 * Ensures only one avatar-bot polling process runs per machine.
 */
export function acquireAvatarBotInstanceLock(): void {
  const lockPath = getLockPath()
  mkdirSync(dirname(lockPath), { recursive: true })
  const existingPid = readLockPid(lockPath)
  if (existingPid && existingPid !== process.pid && isProcessAlive(existingPid)) {
    console.error(`[avatar-bot] another instance is already running (pid ${existingPid})`)
    process.exit(1)
  }
  if (existingPid && existingPid !== process.pid) {
    removeLock(lockPath)
  }
  try {
    const fileDescriptor = openSync(lockPath, 'wx')
    writeSync(fileDescriptor, String(process.pid))
    closeSync(fileDescriptor)
  } catch {
    const lockedPid = readLockPid(lockPath)
    if (lockedPid && lockedPid !== process.pid && isProcessAlive(lockedPid)) {
      console.error(`[avatar-bot] another instance is already running (pid ${lockedPid})`)
      process.exit(1)
    }
    removeLock(lockPath)
    const fileDescriptor = openSync(lockPath, 'wx')
    writeSync(fileDescriptor, String(process.pid))
    closeSync(fileDescriptor)
  }
  process.on('exit', () => {
    const lockedPid = readLockPid(lockPath)
    if (lockedPid === process.pid) {
      removeLock(lockPath)
    }
  })
}
