import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { AuthIcons } from '@/components/auth/AuthIcons'
import { getCurrentUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'Реєстрація',
  description: 'Створіть акаунт Eyzencore',
}

async function getRegisterSpotlight() {
  const review = await prisma.app_server_reviews.findFirst({
    where: {
      text: { not: '' },
    },
    orderBy: [
      { rating: 'desc' },
      { updated_at: 'desc' },
    ],
    select: {
      text: true,
      rating: true,
      author_name: true,
      app_servers: {
        select: {
          name: true,
          avatar_url: true,
        },
      },
      app_users: {
        select: {
          full_name: true,
        },
      },
    },
  })

  if (!review) {
    return {
      text: 'Додав сервер, отримав відгуки та нормальну аналітику без зайвого шуму. Для української спільноти це реально зручна платформа.',
      author: '@serverowner',
      serverName: 'сервер Eyzencore',
      serverAvatarUrl: '/project-default-logo.png',
      rating: 5,
    }
  }

  return {
    text: review.text,
    author: review.app_users?.full_name || review.author_name || 'Гість',
    serverName: review.app_servers?.name || 'сервер спільноти',
    serverAvatarUrl: review.app_servers?.avatar_url || '/project-default-logo.png',
    rating: Math.max(1, Math.min(5, Number(review.rating || 5))),
  }
}

export default async function RegisterPage() {
  if (await getCurrentUser()) {
    redirect('/settings')
  }

  const spotlight = await getRegisterSpotlight()

  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <Link className="brand" href="/">
          <span className="auth-brand-logo">E</span>
          <span>Eyzencore</span>
        </Link>
        <div className="auth-headline">
          <h2>Приєднуйтесь до<br /><span className="grad">спільноти.</span></h2>
          <p>Створіть безкоштовний акаунт, додавайте сервери, спілкуйтеся у форумі та отримуйте оновлення.</p>
          <div className="auth-bullets">
            {[
              'Безкоштовний моніторинг 24/7 для будь-якого сервера',
              'Власна сторінка автора з рейтингом і відгуками',
              'Без реклами на сторінках серверів',
              'API для інтеграції з власним сайтом',
            ].map((bullet, index) => (
              <div className="auth-bullet" key={index}>
                <span className="check">{AuthIcons.check}</span>
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: 16,
            background: 'color-mix(in oklab, var(--bg-2) 70%, transparent)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Image
            src={spotlight.serverAvatarUrl}
            alt={spotlight.serverName}
            width={42}
            height={42}
            unoptimized
            style={{ borderRadius: 12, flexShrink: 0, objectFit: 'cover' }}
          />
          <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--fg-1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>Відгук про сервер</span>
              <span style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                {'★'.repeat(spotlight.rating)}{'☆'.repeat(Math.max(0, 5 - spotlight.rating))}
              </span>
            </div>
            <span style={{ color: 'var(--fg-2)', fontStyle: 'italic' }}>“{spotlight.text}”</span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', marginTop: 6 }}>
              — {spotlight.author} · сервер {spotlight.serverName}
            </div>
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
