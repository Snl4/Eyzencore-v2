import { createHash, randomInt } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { normalizeEmail } from '@/lib/auth-db'

type GlobalVerificationDb = typeof globalThis & {
  __eyzencoreVerificationDb?: DatabaseSync
}

type VerificationRow = {
  email: string
  code_hash: string
  expires_at: string
  sent_at: string
  attempts: number
}

type VerificationState = {
  readonly canResendInSeconds: number
  readonly expiresInSeconds: number
}

const VERIFICATION_CODE_TTL_SECONDS = 10 * 60
const VERIFICATION_RESEND_SECONDS = 60
const VERIFICATION_MAX_ATTEMPTS = 5

function getVerificationDbPath(): string {
  const dataDirectory = path.join(process.cwd(), 'data')
  mkdirSync(dataDirectory, { recursive: true })
  return path.join(dataDirectory, 'eyzencore-auth.sqlite')
}

function getVerificationDb(): DatabaseSync {
  const globalDb = globalThis as GlobalVerificationDb
  if (!globalDb.__eyzencoreVerificationDb) {
    globalDb.__eyzencoreVerificationDb = new DatabaseSync(getVerificationDbPath())
    globalDb.__eyzencoreVerificationDb.exec(`
      CREATE TABLE IF NOT EXISTS email_verification_codes (
        email TEXT PRIMARY KEY,
        code_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        sent_at TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0
      );
    `)
  }
  return globalDb.__eyzencoreVerificationDb
}

function getNowIso(): string {
  return new Date().toISOString()
}

function createCodeHash(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

function getSecondsDiff(targetIso: string): number {
  const diff = Math.ceil((new Date(targetIso).getTime() - Date.now()) / 1000)
  return Math.max(0, diff)
}

export function getVerificationState(emailValue: string): VerificationState {
  const email = normalizeEmail(emailValue)
  const db = getVerificationDb()
  const row = db
    .prepare('SELECT email, code_hash, expires_at, sent_at, attempts FROM email_verification_codes WHERE email = ? LIMIT 1')
    .get(email) as VerificationRow | undefined
  if (!row) {
    return {
      canResendInSeconds: 0,
      expiresInSeconds: 0,
    }
  }
  const sentAtMs = new Date(row.sent_at).getTime()
  const canResendInSeconds = Math.max(0, VERIFICATION_RESEND_SECONDS - Math.ceil((Date.now() - sentAtMs) / 1000))
  return {
    canResendInSeconds,
    expiresInSeconds: getSecondsDiff(row.expires_at),
  }
}

export function generateAndStoreVerificationCode(emailValue: string): { readonly code: string; readonly expiresInSeconds: number } {
  const email = normalizeEmail(emailValue)
  const db = getVerificationDb()
  const currentState = getVerificationState(email)
  if (currentState.canResendInSeconds > 0) {
    throw new Error(`Please wait ${currentState.canResendInSeconds}s before requesting a new code`)
  }
  const code = String(randomInt(100000, 999999))
  const nowIso = getNowIso()
  const expiresAtIso = new Date(Date.now() + VERIFICATION_CODE_TTL_SECONDS * 1000).toISOString()
  db.prepare(
    `INSERT INTO email_verification_codes (email, code_hash, expires_at, sent_at, attempts)
     VALUES (?, ?, ?, ?, 0)
     ON CONFLICT(email) DO UPDATE SET
       code_hash = excluded.code_hash,
       expires_at = excluded.expires_at,
       sent_at = excluded.sent_at,
       attempts = 0`
  ).run(email, createCodeHash(code), expiresAtIso, nowIso)
  return {
    code,
    expiresInSeconds: VERIFICATION_CODE_TTL_SECONDS,
  }
}

export function verifyEmailCode(emailValue: string, code: string): { readonly isValid: boolean; readonly error?: string } {
  const email = normalizeEmail(emailValue)
  const db = getVerificationDb()
  const row = db
    .prepare('SELECT email, code_hash, expires_at, sent_at, attempts FROM email_verification_codes WHERE email = ? LIMIT 1')
    .get(email) as VerificationRow | undefined
  if (!row) {
    return { isValid: false, error: 'Код не знайдено. Запросіть новий код.' }
  }
  if (row.attempts >= VERIFICATION_MAX_ATTEMPTS) {
    return { isValid: false, error: 'Забагато спроб. Запросіть новий код.' }
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { isValid: false, error: 'Термін дії коду минув.' }
  }
  const isCodeValid = createCodeHash(code) === row.code_hash
  if (!isCodeValid) {
    db.prepare('UPDATE email_verification_codes SET attempts = attempts + 1 WHERE email = ?').run(email)
    return { isValid: false, error: 'Невірний код підтвердження.' }
  }
  db.prepare('DELETE FROM email_verification_codes WHERE email = ?').run(email)
  return { isValid: true }
}
