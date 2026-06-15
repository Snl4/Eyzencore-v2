import { NextResponse } from 'next/server'
import { isValidEmail, normalizeEmail } from '@/lib/auth-db'
import { generateAndStoreVerificationCode, getVerificationState } from '@/lib/auth-verification'
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

function buildVerificationHtml(input: { code: string; expiresInMinutes: number }) {
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
              <div style="font-size:22px;line-height:1.25;font-weight:700;color:#ffffff;">Підтвердження email</div>
            </div>
          </div>
        </div>

        <div style="background:linear-gradient(180deg,rgba(15,23,42,.96),rgba(15,23,42,.92));border:1px solid rgba(125,181,255,.18);border-radius:24px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.42);">
          <div style="padding:28px 28px 12px;border-bottom:1px solid rgba(125,181,255,.1);">
            <div style="display:inline-block;padding:7px 12px;border-radius:999px;background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.18);font-size:12px;font-weight:600;color:#8ed8ff;">
              Код доступу до акаунта
            </div>
            <h1 style="margin:16px 0 10px;font-size:30px;line-height:1.15;color:#ffffff;">Завершіть реєстрацію в Eyzencore</h1>
            <p style="margin:0;font-size:15px;line-height:1.7;color:#b8c7de;">
              Введіть цей код на сторінці реєстрації, щоб підтвердити вашу пошту та активувати акаунт.
            </p>
          </div>

          <div style="padding:28px;">
            <div style="padding:20px;border-radius:22px;background:linear-gradient(135deg,rgba(34,197,94,.08),rgba(56,189,248,.1));border:1px solid rgba(109,209,255,.2);">
              <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8fb4d9;margin-bottom:10px;">Ваш код підтвердження</div>
              <div style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:40px;line-height:1;font-weight:800;letter-spacing:.22em;color:#ffffff;">
                ${input.code}
              </div>
            </div>

            <div style="margin-top:18px;display:flex;gap:12px;flex-wrap:wrap;">
              <div style="padding:12px 14px;border-radius:16px;background:rgba(148,163,184,.08);border:1px solid rgba(148,163,184,.14);font-size:13px;color:#d3deee;">
                Дійсний ${input.expiresInMinutes} хвилин
              </div>
              <div style="padding:12px 14px;border-radius:16px;background:rgba(148,163,184,.08);border:1px solid rgba(148,163,184,.14);font-size:13px;color:#d3deee;">
                Не передавайте код іншим
              </div>
            </div>

            <p style="margin:22px 0 0;font-size:13px;line-height:1.7;color:#8fa4bf;">
              Якщо ви не запитували цей лист, просто проігноруйте його. Акаунт не буде створено без введення коду.
            </p>
          </div>
        </div>
      </div>
    </div>
  `
}

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
    const expiresInMinutes = Math.floor(expiresInSeconds / 60)

    const messageResult = await sendMailWithGomailify({
      toEmail: normalizedEmail,
      toName: String(name || '').trim(),
      subject: 'Код підтвердження Eyzencore',
      text: `Ваш код підтвердження: ${code}. Код дійсний ${expiresInMinutes} хвилин.`,
      html: buildVerificationHtml({ code, expiresInMinutes }),
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
