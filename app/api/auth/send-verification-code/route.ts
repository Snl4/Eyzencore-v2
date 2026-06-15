import { NextResponse } from 'next/server'
import { isValidEmail, normalizeEmail } from '@/lib/auth-db'
import { generateAndStoreVerificationCode, getVerificationState } from '@/lib/auth-verification'
import { sendMailWithGomailify } from '@/lib/gomailify'

export async function POST(request: Request) {
  try {
    const { email, name } = (await request.json()) as {
      email?: string
      name?: string
    }
    const normalizedEmail = await normalizeEmail(email || '')
    if (!normalizedEmail || !await isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Вкажіть коректний email' }, { status: 400 })
    }
    const state = await getVerificationState(normalizedEmail)
    if (state.canResendInSeconds > 0) {
      return NextResponse.json(
        { error: `Повторна відправка буде доступна через ${state.canResendInSeconds}с`, retryIn: state.canResendInSeconds },
        { status: 429 }
      )
    }
    const { code, expiresInSeconds } = await generateAndStoreVerificationCode(normalizedEmail)

    const messageResult = await sendMailWithGomailify({
      toEmail: normalizedEmail,
      toName: String(name || '').trim(),
      subject: 'Код підтвердження Eyzencore',
      text: `Ваш код підтвердження: ${code}. Код дійсний ${Math.floor(expiresInSeconds / 60)} хвилин.`,
      html: `<div style="font-family:Arial,sans-serif"><h2>Підтвердження email</h2><p>Ваш код підтвердження:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p><p>Код дійсний ${Math.floor(expiresInSeconds / 60)} хвилин.</p></div>`,
    })
    if (!messageResult.isSent) {
      console.error('Email verification delivery failed:', messageResult.error)
      return NextResponse.json({ error: 'Не вдалося надіслати код. Перевірте налаштування пошти.' }, { status: 500 })
    }
    return NextResponse.json({
      success: true,
      expiresIn: expiresInSeconds,
      resendIn: 60,
    })
  } catch {
    return NextResponse.json({ error: 'Не вдалося надіслати код підтвердження' }, { status: 500 })
  }
}
