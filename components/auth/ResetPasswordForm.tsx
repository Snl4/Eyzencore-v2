'use client'

import type { FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { AuthIcons } from '@/components/auth/AuthIcons'

type ResetPasswordStatus = {
  readonly type: 'success' | 'error' | 'loading' | null
  readonly message: string
}

function getPasswordStrength(password: string): number {
  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/\d/.test(password) && /[^a-zA-Z\d]/.test(password)) score += 1
  return score
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<ResetPasswordStatus>({ type: null, message: '' })
  const strength = useMemo(() => getPasswordStrength(password), [password])
  const strengthLabel = useMemo(() => ['Слабкий', 'Середній', 'Сильний'][Math.max(0, strength - 1)] || '', [strength])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (password.length < 8) {
      setStatus({ type: 'error', message: 'Пароль має містити щонайменше 8 символів.' })
      return
    }

    if (password !== confirmPassword) {
      setStatus({ type: 'error', message: 'Паролі не співпадають.' })
      return
    }

    setIsLoading(true)
    setStatus({ type: 'loading', message: 'Оновлюємо пароль...' })

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        setStatus({ type: 'error', message: data.error || 'Не вдалося змінити пароль.' })
        setIsLoading(false)
        return
      }

      setStatus({ type: 'success', message: 'Пароль оновлено. Перенаправляємо на вхід...' })
      setTimeout(() => {
        router.push('/login')
        router.refresh()
      }, 900)
    } catch {
      setStatus({ type: 'error', message: 'Помилка мережі. Спробуйте ще раз.' })
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label>
          Новий пароль
          {password && <span style={{ fontWeight: 400, fontSize: 11.5, color: ['var(--red)', 'var(--amber)', 'var(--green)'][Math.max(0, strength - 1)] || 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>{strengthLabel}</span>}
        </label>
        <div className="input-wrap">
          <input
            className="input"
            type={showPassword ? 'text' : 'password'}
            placeholder="Мінімум 8 символів"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            style={{ paddingRight: 40 }}
          />
          <button type="button" className="ico-r" onClick={() => setShowPassword((value) => !value)}>
            {showPassword ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" /></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
          </button>
        </div>
        {password && (
          <div className="password-strength">
            <span className={strength >= 1 ? `s${strength}` : ''} />
            <span className={strength >= 2 ? `s${strength}` : ''} />
            <span className={strength >= 3 ? `s${strength}` : ''} />
          </div>
        )}
      </div>

      <div className="field">
        <label>Підтвердіть пароль</label>
        <input
          className="input"
          type={showPassword ? 'text' : 'password'}
          placeholder="Повторіть новий пароль"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
      </div>

      {status.type && (
        <div className={status.type === 'error' ? 'auth-feedback auth-feedback-error' : 'auth-feedback auth-feedback-success'} style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          {status.type === 'loading' ? AuthIcons.loading : status.type === 'success' ? AuthIcons.success : AuthIcons.error}
          <span>{status.message}</span>
        </div>
      )}

      <button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
        {isLoading ? 'Оновлюємо пароль...' : 'Зберегти новий пароль'}
      </button>

      <div className="auth-footer" style={{ marginTop: 16 }}>
        <Link href="/login">Повернутися до входу</Link>
      </div>
    </form>
  )
}
