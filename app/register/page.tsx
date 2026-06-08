import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { AuthIcons } from '@/components/auth/AuthIcons'
import { getCurrentUser } from '@/lib/auth-server'

export const metadata: Metadata = {
  title: 'Реєстрація',
  description: 'Створіть акаунт Eyzencore',
}

export default function RegisterPage() {
  if (getCurrentUser()) {
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
          <h2>Приєднуйтесь до<br /><span className="grad">спільноти.</span></h2>
          <p>Створіть безкоштовний акаунт, додавайте сервери, спілкуйтесь у форумі та отримуйте оновлення.</p>
          <div className="auth-bullets">
            {['Безкоштовний моніторинг 24/7 для будь-якого сервера', 'Власна сторінка автора з рейтингом і відгуками', 'Без реклами на сторінках серверів', 'API для інтеграції з власним сайтом'].map((bullet, index) => (
              <div className="auth-bullet" key={index}>
                <span className="check">{AuthIcons.check}</span>
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'color-mix(in oklab, var(--bg-2) 70%, transparent)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: 32, height: 32, borderRadius: 7, background: 'linear-gradient(135deg, #5eead4, #7b8cff)', flexShrink: 0 }} />
          <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--fg-1)' }}>
            <span style={{ color: 'var(--fg-2)', fontStyle: 'italic' }}>«За тиждень додав 4 сервери. Аналітика — топ. Це найкраща україномовна платформа.»</span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', marginTop: 6 }}>— @serverhunter</div>
          </div>
        </div>
      </aside>
      <div className="auth-main">
        <div className="auth-top">
          <Link href="/" style={{ color: 'var(--fg-2)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ transform: 'rotate(180deg)', display: 'inline-block' }}>{AuthIcons.arrow}</span>
            На головну
          </Link>
          <div className="right">
            Вже маєте акаунт? <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>Увійти</Link>
          </div>
        </div>
        <div className="auth-form-wrap">
          <h1>Створити акаунт</h1>
          <p className="sub">Безкоштовно. Налаштування за 2 хвилини.</p>
          <RegisterForm />
          <div className="auth-footer">
            Реєструючись, ви приймаєте наші <a href="#">Умови</a> та <a href="#">Конфіденційність</a>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-3)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          © 2026 Eyzencore
        </div>
      </div>
    </div>
  )
}
