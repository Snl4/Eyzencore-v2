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

const DEFAULT_GOMAILIFY_API_URL = 'https://api.gomailify.com/v1/send'

export async function sendMailWithGomailify(payload: GomailifyPayload): Promise<GomailifyResult> {
  const apiKey = process.env.GOMAILIFY_API_KEY
  const fromEmail = process.env.GOMAILIFY_FROM_EMAIL
  const fromName = process.env.GOMAILIFY_FROM_NAME || 'Eyzencore'
  const apiUrl = process.env.GOMAILIFY_API_URL || DEFAULT_GOMAILIFY_API_URL
  if (!apiKey || !fromEmail) {
    return {
      isSent: false,
      error: 'GOMAILIFY is not configured',
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
