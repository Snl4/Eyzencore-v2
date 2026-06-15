import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'
import { AuthIcons } from '@/components/auth/AuthIcons'
import { BrandMark } from '@/components/ui/BrandMark'
import { getCurrentUser } from '@/lib/auth-server'

export const metadata: Metadata = {
  title: 'Відновлення пароля',
  description: 'Отримайте лист для скидання пароля Eyzencore',
}

export default async function ForgotPasswordPage() {
  if (await getCurrentUser()) {
    redirect('/settings')
  }

  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <Link className="brand" href="/">
          <BrandMark size={24} className="auth-brand-logo" />
          <span>Eyzencore</span>
        </Link>
        <div className="auth-headline">
          <h2>Повернемо доступ<br /><span className="grad">до акаунта.</span></h2>
          <p>Вкажіть email, і ми надішлемо захищене посилання для скидання пароля. Усі попередні сесії після зміни пароля буде завершено.</p>
          <div className="auth-bullets">
            {[
              'Лист приходить на адресу, з якою зареєстрований акаунт',
              'Посилання діє обмежений час для безпеки',
              'Після зміни пароля старі входи буде скасовано',
            ].map((bullet, index) => (
              <div className="auth-bullet" key={index}>
                <span className="check">{AuthIcons.check}</span>
                <span>{bullet}</span>
              </div>
            ))}
          </div>
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
          <h1>Забули пароль?</h1>
          <p className="sub">Надішлемо інструкцію на вашу пошту.</p>
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  )
}
