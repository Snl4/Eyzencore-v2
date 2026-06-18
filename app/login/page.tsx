import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/LoginForm'
import { AuthIcons } from '@/components/auth/AuthIcons'
import { BrandMark } from '@/components/ui/BrandMark'
import { getCurrentUser } from '@/lib/auth-server'
import { getCachedPublicStats } from '@/lib/public-cache'
import { prisma } from '@/lib/prisma'

async function getLoginReviewTicker() {
  const reviews = await prisma.app_server_reviews.findMany({
    where: {
      text: { not: '' },
    },
    orderBy: [
      { updated_at: 'desc' },
      { rating: 'desc' },
    ],
    take: 8,
    select: {
      id: true,
      text: true,
      rating: true,
      author_name: true,
      app_servers: {
        select: {
          name: true,
          avatar_url: true,
          platform: true,
          core: true,
        },
      },
      app_users: {
        select: {
          full_name: true,
        },
      },
    },
  })

  return reviews.map((review) => ({
    id: review.id,
    text: review.text,
    rating: Math.max(1, Math.min(5, Number(review.rating || 5))),
    author: review.app_users?.full_name || review.author_name || 'Гість',
    serverName: review.app_servers?.name || 'сервер спільноти',
    serverAvatarUrl: review.app_servers?.avatar_url || '/project-default-logo.png',
    platform: review.app_servers?.platform === 'discord' || review.app_servers?.core === 'discord' ? 'Discord' : 'Minecraft',
  }))
}

export const metadata: Metadata = {
  title: 'Увійти',
  description: 'Увійдіть в акаунт Eyzencore',
  robots: {
    index: false,
    follow: true,
  },
}

export default async function LoginPage() {
  if (await getCurrentUser()) {
    redirect('/settings')
  }
  const stats = await getCachedPublicStats()
  const reviews = await getLoginReviewTicker()
  const tickerReviews = reviews.length > 1 ? [...reviews, ...reviews] : reviews
  const authBullets = [
    `${stats.totalServers.toLocaleString('uk-UA')} серверів у моніторингу`,
    `${stats.totalVotes.toLocaleString('uk-UA')} голосів від спільноти`,
    `${stats.totalReviews.toLocaleString('uk-UA')} відгуків на серверах`,
  ]
  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <Link className="brand" href="/">
          <BrandMark size={24} className="auth-brand-logo" />
          <span>Eyzencore</span>
        </Link>
        <div className="auth-headline">
          <h2>Вітаємо знову<br /><span className="grad">у спільноті.</span></h2>
          <p>Заходьте, щоб керувати своїми серверами, читати форум і отримувати сповіщення про активність.</p>
          <div className="auth-bullets">
            {authBullets.map((bullet, index) => (
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
        {tickerReviews.length > 0 && (
          <div className="auth-review-ticker" aria-label="Відгуки серверів">
            <div className="auth-review-track">
              {tickerReviews.map((review, index) => (
                <div className="auth-review-card" key={`${review.id}-${index}`}>
                  <Image src={review.serverAvatarUrl} alt="" width={42} height={42} unoptimized />
                  <div>
                    <div className="auth-review-top">
                      <span>Відгук про сервер</span>
                      <b>{'★'.repeat(review.rating)}{'☆'.repeat(Math.max(0, 5 - review.rating))}</b>
                      <em>{review.platform}</em>
                    </div>
                    <p>“{review.text}”</p>
                    <small>— {review.author} · сервер {review.serverName}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
            Захищено reCAPTCHA · <Link href="/terms">Умови</Link> · <Link href="/privacy">Конфіденційність</Link>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-3)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          © 2026 Eyzencore
        </div>
      </div>
    </div>
  )
}
