'use client'

import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuthIcons } from '@/components/auth/AuthIcons'

type RegisterStatus = {
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

export function RegisterForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [name, setName] = useState<string>('')
  const [username, setUsername] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [terms, setTerms] = useState<boolean>(false)
  const [news, setNews] = useState<boolean>(true)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [verificationCode, setVerificationCode] = useState<string>('')
  const [verificationSent, setVerificationSent] = useState<boolean>(false)
  const [status, setStatus] = useState<RegisterStatus>({ type: null, message: '' })
  const strength = useMemo(() => getPasswordStrength(password), [password])
  const strengthLabel = useMemo(() => ['Слабкий', 'Середній', 'Сильний'][Math.max(0, strength - 1)] || '', [strength])
  const handleSubmitRegister = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (!terms) {
      setStatus({ type: 'error', message: 'Потрібно прийняти умови використання' })
      return
    }
    setStatus({
      type: 'loading',
      message: verificationSent ? 'Перевіряємо код...' : 'Надсилаємо код підтвердження...',
    })
    setIsLoading(true)
    try {
      const response = await fetch(verificationSent ? '/api/auth/verify-code' : '/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || username,
          email,
          password,
          code: verificationCode,
        }),
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setStatus({ type: 'error', message: data.error || 'Не вдалося створити акаунт' })
        setIsLoading(false)
        return
      }
      if (!verificationSent) {
        setVerificationSent(true)
        setStatus({ type: 'success', message: 'Код надіслано на пошту. Введіть його нижче.' })
        setIsLoading(false)
        return
      }
      setStatus({ type: 'success', message: 'Акаунт створено. Переходимо в кабінет...' })
      router.push('/settings')
      router.refresh()
    } catch {
      setStatus({ type: 'error', message: 'Помилка мережі. Спробуйте ще раз.' })
      setIsLoading(false)
    }
  }
  return (
    <form onSubmit={handleSubmitRegister}>
      <div className="social-row">
        <button
          className="social-btn"
          type="button"
          onClick={() => {
            window.location.href = '/api/auth/google?mode=login'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
          Google
        </button>
        <button className="social-btn" type="button" onClick={() => { window.location.href = '/api/auth/discord?mode=login' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#5865F2' }}><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
          Discord
        </button>
      </div>
      <div className="divider">або email</div>
      <div className="field">
        <label>Ім&apos;я</label>
        <input className="input" type="text" placeholder="Ваше ім'я" value={name} onChange={(event) => setName(event.target.value)} required />
      </div>
      <div className="field">
        <label>Нікнейм</label>
        <div className="input-wrap">
          <span className="ico-l" style={{ color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>@</span>
          <input className="input with-ico" type="text" placeholder="username" value={username} onChange={(event) => setUsername(event.target.value.replace(/[^a-z0-9_]/gi, '').toLowerCase())} required />
        </div>
      </div>
      <div className="field">
        <label>Email</label>
        <input className="input" type="email" placeholder="ваш@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </div>
      {verificationSent && (
        <div className="field">
          <label>Код із пошти</label>
          <input
            className="input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={verificationCode}
            onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            required
          />
        </div>
      )}
      <div className="field">
        <label>
          Пароль
          {password && <span style={{ fontWeight: 400, fontSize: 11.5, color: ['var(--red)', 'var(--amber)', 'var(--green)'][Math.max(0, strength - 1)] || 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>{strengthLabel}</span>}
        </label>
        <div className="input-wrap">
          <input className="input" type={showPassword ? 'text' : 'password'} placeholder="Мінімум 8 символів" value={password} onChange={(event) => setPassword(event.target.value)} required style={{ paddingRight: 40 }} />
          <button type="button" className="ico-r" onClick={() => setShowPassword(!showPassword)}>
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
      <label className="checkbox-row">
        <input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} />
        <span>
          Я приймаю <Link href="/terms" target="_blank">Умови використання</Link> та{' '}
          <Link href="/privacy" target="_blank">Політику конфіденційності</Link>
        </span>
      </label>
      <label className="checkbox-row" style={{ marginBottom: 24 }}>
        <input type="checkbox" checked={news} onChange={(event) => setNews(event.target.checked)} />
        <span style={{ color: 'var(--fg-2)' }}>Надсилати новини про оновлення платформи (раз на місяць)</span>
      </label>
      {status.type && (
        <div className={status.type === 'error' ? 'auth-feedback auth-feedback-error' : 'auth-feedback auth-feedback-success'} style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          {status.type === 'loading' ? AuthIcons.loading : status.type === 'success' ? AuthIcons.success : AuthIcons.error}
          <span>{status.message}</span>
        </div>
      )}
      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={!terms || isLoading || (verificationSent && verificationCode.length !== 6)}
      >
        {isLoading
          ? (verificationSent ? 'Перевіряємо код...' : 'Надсилаємо код...')
          : verificationSent
            ? 'Підтвердити та створити акаунт'
            : 'Отримати код на пошту'}
      </button>
    </form>
  )
}
