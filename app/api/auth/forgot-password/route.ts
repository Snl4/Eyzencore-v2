import { NextResponse } from 'next/server'
import { createPasswordResetRequest, getPasswordResetTokenTtlSeconds, isValidEmail, normalizeEmail } from '@/lib/auth-db'
import { sendMailWithGomailify } from '@/lib/gomailify'

function getAppUrl() {
  return String(
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.FRONTEND_URL ||
    process.env.API_PUBLIC_URL ||
    'http://localhost:3000'
  ).trim().replace(/\/$/, '')
}

function buildPasswordResetHtml(input: { resetUrl: string; expiresInMinutes: number }) {
  const appUrl = getAppUrl()
  const logoUrl = `${appUrl}/project-default-logo.png`

  return `
    <div style="margin:0;padding:32px 16px;background:#0b1220;background-image:radial-gradient(circle at top,#143a66 0%,#0b1220 55%);font-family:Inter,Segoe UI,Arial,sans-serif;color:#e5eefb;">
      <div style="max-width:640px;margin:0 auto;">
        <div style="margin-bottom:18px;padding:0 8px;">
          <div style="display:inline-flex;align-items:center;gap:12px;">
            <img src="${logoUrl}" alt="Eyzencore" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:14px;box-shadow:0 10px 25px rgba(45,166,255,.28);" />
            <div>
              <div style="font-size:11px;line-height:1.2;letter-spacing:.14em;text-transform:uppercase;color:#7fc8ff;">Eyzencore Security</div>
              <div style="font-size:22px;line-height:1.25;font-weight:700;color:#ffffff;">Відновлення пароля</div>
            </div>
          </div>
        </div>

        <div style="background:linear-gradient(180deg,rgba(15,23,42,.96),rgba(15,23,42,.92));border:1px solid rgba(125,181,255,.18);border-radius:24px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.42);">
          <div style="padding:28px 28px 12px;border-bottom:1px solid rgba(125,181,255,.1);">
            <div style="display:inline-block;padding:7px 12px;border-radius:999px;background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.18);font-size:12px;font-weight:600;color:#8ed8ff;">
              Безпечне скидання доступу
            </div>
            <h1 style="margin:16px 0 10px;font-size:30px;line-height:1.15;color:#ffffff;">Задайте новий пароль для Eyzencore</h1>
            <p style="margin:0;font-size:15px;line-height:1.7;color:#b8c7de;">
              Натисніть кнопку нижче, щоб перейти до сторінки скидання пароля. Після зміни пароля всі активні сесії буде завершено.
            </p>
          </div>

          <div style="padding:28px;">
            <a href="${input.resetUrl}" style="display:inline-block;padding:15px 22px;border-radius:16px;background:linear-gradient(135deg,#38bdf8,#0ea5e9);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;box-shadow:0 16px 34px rgba(14,165,233,.28);">
              Скинути пароль
            </a>

            <div style="margin-top:18px;padding:16px 18px;border-radius:18px;background:rgba(148,163,184,.08);border:1px solid rgba(148,163,184,.14);">
              <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8fb4d9;margin-bottom:8px;">Посилання дійсне</div>
              <div style="font-size:14px;line-height:1.7;color:#d3deee;">${input.expiresInMinutes} хвилин</div>
            </div>

            <p style="margin:22px 0 8px;font-size:13px;line-height:1.7;color:#8fa4bf;">
              Якщо кнопка не працює, відкрийте це посилання вручну:
            </p>
            <p style="margin:0;font-size:13px;line-height:1.7;word-break:break-all;">
              <a href="${input.resetUrl}" style="color:#8ed8ff;text-decoration:none;">${input.resetUrl}</a>
            </p>

            <p style="margin:22px 0 0;font-size:13px;line-height:1.7;color:#8fa4bf;">
              Якщо ви не запитували відновлення пароля, просто проігноруйте цей лист. Пароль не буде змінено без вашого підтвердження.
            </p>
          </div>
        </div>
      </div>
    </div>
  `
}

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string }
    const normalizedEmail = normalizeEmail(email || '')

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Вкажіть коректний email.' }, { status: 400 })
    }

    const passwordReset = await createPasswordResetRequest(normalizedEmail)
    if (passwordReset) {
      const appUrl = getAppUrl()
      const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(passwordReset.token)}`
      const expiresInMinutes = Math.floor(getPasswordResetTokenTtlSeconds() / 60)

      const messageResult = await sendMailWithGomailify({
        toEmail: passwordReset.email,
        toName: passwordReset.fullName,
        subject: 'Відновлення пароля Eyzencore',
        text: `Щоб скинути пароль, відкрийте посилання: ${resetUrl}. Посилання дійсне ${expiresInMinutes} хвилин.`,
        html: buildPasswordResetHtml({ resetUrl, expiresInMinutes }),
      })

      if (!messageResult.isSent) {
        console.error('Password reset delivery failed:', messageResult.error)
        return NextResponse.json({ error: 'Не вдалося надіслати лист. Перевірте налаштування пошти.' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Якщо акаунт з таким email існує, ми надіслали інструкцію для відновлення пароля.',
    })
  } catch {
    return NextResponse.json({ error: 'Не вдалося обробити запит на відновлення пароля.' }, { status: 500 })
  }
}
