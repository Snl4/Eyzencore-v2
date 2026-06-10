import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/LoginForm'
import { AuthIcons } from '@/components/auth/AuthIcons'
import { getCurrentUser } from '@/lib/auth-server'

export const metadata: Metadata = {
  title: 'Увійти',
  description: 'Увійдіть в акаунт Eyzencore',
}

export default async function LoginPage() {
  if (await getCurrentUser()) {
    redirect('/settings')
  }
  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <Link className="brand" href="/">
          <span className="auth-brand-logo">E</span>
          <span>Eyzencore</span>
        </Link>
        <div className="auth-headline">
          <h2>Вітаємо знову<br /><span className="grad">у спільноті.</span></h2>
          <p>Заходьте, щоб керувати своїми серверами, читати форум і отримувати сповіщення про активність.</p>
          <div className="auth-bullets">
            {['248 активних серверів у моніторингу', 'Live-статистика та повідомлення про падіння', 'Pro-функції: розширена аналітика та брендинг'].map((bullet, index) => (
              <div className="auth-bullet" key={index}>
                <span className="check">{AuthIcons.check}</span>
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', display: 'flex', gap: 16 }}>
          <span>● status: operational</span>
          <span>v2.0.4</span>
        </div>
      </aside>
      <div className="auth-main">
        <div className="auth-top">
          <Link href="/" style={{ color: 'var(--fg-2)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ transform: 'rotate(180deg)', display: 'inline-block' }}>{AuthIcons.arrow}</span>
            На головну
          </Link>
          <div className="right">
            Немає акаунту? <Link href="/register" style={{ color: 'var(--accent)', fontWeight: 500 }}>Зареєструватись</Link>
          </div>
        </div>
        <div className="auth-form-wrap">
          <h1>Увійти в Eyzencore</h1>
          <p className="sub">Введіть свої дані, щоб продовжити роботу.</p>
          <LoginForm />
          <div className="auth-footer">
            Захищено reCAPTCHA · <a href="#">Умови</a> · <a href="#">Конфіденційність</a>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-3)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          © 2026 Eyzencore
        </div>
      </div>
    </div>
  )
}
