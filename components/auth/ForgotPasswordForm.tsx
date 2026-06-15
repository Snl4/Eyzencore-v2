'use client'

import type { FormEvent } from 'react'
import Link from 'next/link'
import { useState } from 'react'
import { AuthIcons } from '@/components/auth/AuthIcons'

type ForgotPasswordStatus = {
  readonly type: 'success' | 'error' | 'loading' | null
  readonly message: string
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<ForgotPasswordStatus>({ type: null, message: '' })

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setStatus({ type: 'loading', message: 'Надсилаємо інструкцію для відновлення пароля...' })

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = (await response.json()) as { error?: string; message?: string }

      if (!response.ok) {
        setStatus({ type: 'error', message: data.error || 'Не вдалося надіслати лист.' })
        setIsLoading(false)
        return
      }

      setStatus({
        type: 'success',
        message: data.message || 'Якщо акаунт існує, ми вже надіслали лист з інструкцією.',
      })
    } catch {
      setStatus({ type: 'error', message: 'Помилка мережі. Спробуйте ще раз.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label>Email</label>
        <div className="input-wrap">
          <span className="ico-l">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" /></svg>
          </span>
          <input
            className="input with-ico"
            type="email"
            placeholder="ваш@email.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
      </div>

      {status.type && (
        <div className={status.type === 'error' ? 'auth-feedback auth-feedback-error' : 'auth-feedback auth-feedback-success'} style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          {status.type === 'loading' ? AuthIcons.loading : status.type === 'success' ? AuthIcons.success : AuthIcons.error}
          <span>{status.message}</span>
        </div>
      )}

      <button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
        {isLoading ? 'Надсилаємо лист...' : 'Надіслати інструкцію'}
      </button>

      <div className="auth-footer" style={{ marginTop: 16 }}>
        Пам&apos;ятаєте пароль? <Link href="/login">Увійти</Link>
      </div>
    </form>
  )
}
