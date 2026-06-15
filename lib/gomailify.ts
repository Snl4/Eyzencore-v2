type GomailifyPayload = {
  readonly toEmail: string
  readonly toName?: string
  readonly subject: string
  readonly html: string
  readonly text: string
}

type GomailifyResult = {
  readonly isSent: boolean
  readonly error?: string
}

export async function sendMailWithGomailify(payload: GomailifyPayload): Promise<GomailifyResult> {
  const smtpHost = String(process.env.SMTP_HOST || '').trim()
  const smtpPort = Number(process.env.SMTP_PORT || 465)
  const smtpSecure = String(process.env.SMTP_SECURE || '').toLowerCase() !== 'false'
  const smtpUser = String(process.env.SMTP_USER || '').trim()
  const smtpPass = String(process.env.SMTP_PASS || '')
  const smtpFrom = String(process.env.EMAIL_FROM || smtpUser).trim()

  if (smtpHost && smtpUser && smtpPass && smtpFrom) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })
      await transporter.sendMail({
        from: {
          address: smtpFrom,
          name: process.env.EMAIL_FROM_NAME || 'Eyzencore',
        },
        to: {
          address: payload.toEmail,
          name: payload.toName || '',
        },
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      })
      return { isSent: true }
    } catch (error) {
      return {
        isSent: false,
        error: error instanceof Error ? error.message : 'Failed to send email via SMTP',
      }
    }
  }

  const apiKey = process.env.GOMAILIFY_API_KEY
  const fromEmail = process.env.GOMAILIFY_FROM_EMAIL
  const fromName = process.env.GOMAILIFY_FROM_NAME || 'Eyzencore'
  const apiUrl = process.env.GOMAILIFY_API_URL || 'https://api.gomailify.com/v1/send'
  if (!apiKey || !fromEmail) {
    return {
      isSent: false,
      error: 'SMTP or Gomailify is not configured',
    }
  }
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: { email: fromEmail, name: fromName },
        to: [{ email: payload.toEmail, name: payload.toName || '' }],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    })
    if (!response.ok) {
      return {
        isSent: false,
        error: 'Failed to send email',
      }
    }
    return { isSent: true }
  } catch {
    return {
      isSent: false,
      error: 'Failed to send email',
    }
  }
}
import nodemailer from 'nodemailer'
