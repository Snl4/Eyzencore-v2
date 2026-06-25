import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthReviewTicker } from '@/components/auth/AuthReviewTicker'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { AuthIcons } from '@/components/auth/AuthIcons'
import { BrandMark } from '@/components/ui/BrandMark'
import { getAuthReviewTicker } from '@/lib/auth-review-ticker'
import { getCurrentUser } from '@/lib/auth-server'
import { getCachedPublicStats } from '@/lib/public-cache'

export const metadata: Metadata = {
  title: 'Реєстрація',
  description: 'Створіть акаунт Eyzencore',
  robots: {
    index: false,
    follow: true,
  },
}

export default async function RegisterPage() {
  if (await getCurrentUser()) {
    redirect('/settings')
  }

  const stats = await getCachedPublicStats()
  const reviews = await getAuthReviewTicker()
  const authBullets = [
    `${stats.totalServers.toLocaleString('uk-UA')} серверів у каталозі`,
    `${stats.totalUsers.toLocaleString('uk-UA')} користувачів на платформі`,
    `${stats.totalVotes.toLocaleString('uk-UA')} голосів за сервери`,
    `${stats.totalReviews.toLocaleString('uk-UA')} відгуків від спільноти`,
  ]

  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <Link className="brand" href="/">
          <BrandMark size={24} className="auth-brand-logo" />
          <span>Eyzencore</span>
        </Link>
        <div className="auth-headline">
          <h2>Приєднуйтесь до<br /><span className="grad">спільноти.</span></h2>
          <p>Створіть безкоштовний акаунт, додавайте сервери, спілкуйтеся у форумі та отримуйте оновлення.</p>
          <div className="auth-bullets">
            {authBullets.map((bullet, index) => (
              <div className="auth-bullet" key={index}>
                <span className="check">{AuthIcons.check}</span>
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </div>
        <AuthReviewTicker reviews={reviews} />
      </aside>
      <div className="auth-main">
        <div className="auth-top">
          <Link href="/" style={{ color: 'var(--fg-2)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ transform: 'rotate(180deg)', display: 'inline-block' }}>{AuthIcons.arrow}</span>
            На головну
          </Link>
        </div>
        <div className="auth-form-wrap">
          <h1>Створити акаунт</h1>
          <p className="sub">Безкоштовно. Налаштування за 2 хвилини.</p>
          <RegisterForm />
          <div className="auth-switch-link">
            Вже маєте акаунт? <Link href="/login">Увійти</Link>
          </div>
          <div className="auth-footer">
            Реєструючись, ви приймаєте наші <Link href="/terms">Умови</Link> та <Link href="/privacy">Конфіденційність</Link>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-3)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          © 2025-2026 Eyzencore
        </div>
      </div>
    </div>
  )
}
