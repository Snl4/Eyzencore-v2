import { createHash, randomInt } from 'node:crypto'
import { normalizeEmail } from '@/lib/auth-db'
import { prisma } from '@/lib/prisma'

type VerificationState = {
  readonly canResendInSeconds: number
  readonly expiresInSeconds: number
}

const VERIFICATION_CODE_TTL_SECONDS = 10 * 60
const VERIFICATION_RESEND_SECONDS = 60
const VERIFICATION_MAX_ATTEMPTS = 5

function createCodeHash(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

function getSecondsDiff(targetIso: string): number {
  const diff = Math.ceil((new Date(targetIso).getTime() - Date.now()) / 1000)
  return Math.max(0, diff)
}

export async function getVerificationState(emailValue: string): Promise<VerificationState> {
  const email = await normalizeEmail(emailValue)
  const row = await prisma.email_verification_codes.findUnique({ where: { email } })
  if (!row) {
    return {
      canResendInSeconds: 0,
      expiresInSeconds: 0,
    }
  }
  const sentAtMs = new Date(row.sent_at).getTime()
  const canResendInSeconds = Math.max(
    0,
    VERIFICATION_RESEND_SECONDS - Math.ceil((Date.now() - sentAtMs) / 1000)
  )
  return {
    canResendInSeconds,
    expiresInSeconds: getSecondsDiff(row.expires_at),
  }
}

export async function generateAndStoreVerificationCode(
  emailValue: string
) {
  const email = await normalizeEmail(emailValue)
  const currentState = await getVerificationState(email)
  if (currentState.canResendInSeconds > 0) {
    throw new Error(`Please wait ${currentState.canResendInSeconds}s before requesting a new code`)
  }
  const code = String(randomInt(100000, 999999))
  const sentAt = new Date()
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_SECONDS * 1000)
  await prisma.email_verification_codes.upsert({
    where: { email },
    create: {
      email,
      code_hash: createCodeHash(code),
      expires_at: expiresAt.toISOString(),
      sent_at: sentAt.toISOString(),
      attempts: 0,
    },
    update: {
      code_hash: createCodeHash(code),
      expires_at: expiresAt.toISOString(),
      sent_at: sentAt.toISOString(),
      attempts: 0,
    },
  })
  return {
    code,
    expiresInSeconds: VERIFICATION_CODE_TTL_SECONDS,
  }
}

export async function verifyEmailCode(
  emailValue: string,
  code: string
) {
  const email = await normalizeEmail(emailValue)
  const row = await prisma.email_verification_codes.findUnique({ where: { email } })
  if (!row) {
    return { isValid: false, error: 'Код не знайдено. Запросіть новий код.' }
  }
  if (row.attempts >= VERIFICATION_MAX_ATTEMPTS) {
    return { isValid: false, error: 'Забагато спроб. Запросіть новий код.' }
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { isValid: false, error: 'Термін дії коду минув.' }
  }
  if (createCodeHash(code) !== row.code_hash) {
    await prisma.email_verification_codes.update({
      where: { email },
      data: { attempts: { increment: 1 } },
    })
    return { isValid: false, error: 'Невірний код підтвердження.' }
  }
  await prisma.email_verification_codes.delete({ where: { email } })
  return { isValid: true }
}
