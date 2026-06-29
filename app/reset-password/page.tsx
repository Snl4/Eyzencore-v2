import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'
import { AuthIcons } from '@/components/auth/AuthIcons'
import { BrandMark } from '@/components/ui/BrandMark'
import { getPasswordResetRequest } from '@/lib/auth-db'
import { getCurrentUser } from '@/lib/auth-server'

import { PRIVATE_PAGE_ROBOTS } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Новий пароль',
  description: 'Встановіть новий пароль для акаунта Eyzencore',
  robots: PRIVATE_PAGE_ROBOTS,
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: { token?: string }
}) {
  if (await getCurrentUser()) {
    redirect('/settings')
  }

  const token = String(searchParams?.token || '').trim()
  if (!token) {
    notFound()
  }

  const request = await getPasswordResetRequest(token)
  if (!request) {
    return (
      <div className="auth-page">
        <aside className="auth-aside">
          <Link className="brand" href="/">
            <BrandMark size={24} className="auth-brand-logo" />
            <span>Eyzencore</span>
          </Link>
          <div className="auth-headline">
            <h2>Посилання вже<br /><span className="grad">неактивне.</span></h2>
            <p>Термін дії посилання міг завершитися або воно вже було використане. Запросіть новий лист для відновлення пароля.</p>
          </div>
        </aside>
        <div className="auth-main">
          <div className="auth-top">
            <Link href="/forgot-password" style={{ color: 'var(--fg-2)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ transform: 'rotate(180deg)', display: 'inline-block' }}>{AuthIcons.arrow}</span>
              Запросити нове посилання
            </Link>
          </div>
          <div className="auth-form-wrap">
            <h1>Посилання недійсне</h1>
            <p className="sub">Спробуйте ще раз через форму відновлення пароля.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <Link className="brand" href="/">
          <BrandMark size={24} className="auth-brand-logo" />
          <span>Eyzencore</span>
        </Link>
        <div className="auth-headline">
          <h2>Створіть новий<br /><span className="grad">безпечний пароль.</span></h2>
          <p>Оберіть новий пароль для {request.email}. Після підтвердження всі попередні сесії на інших пристроях буде завершено.</p>
        </div>
      </aside>
      <div className="auth-main">
        <div className="auth-top">
          <Link href="/login" style={{ color: 'var(--fg-2)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ transform: 'rotate(180deg)', display: 'inline-block' }}>{AuthIcons.arrow}</span>
            До входу
          </Link>
        </div>
        <div className="auth-form-wrap">
          <h1>Новий пароль</h1>
          <p className="sub">Використайте щонайменше 8 символів.</p>
          <ResetPasswordForm token={token} />
        </div>
      </div>
    </div>
  )
}
