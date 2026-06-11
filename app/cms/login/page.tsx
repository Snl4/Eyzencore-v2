import { redirect } from 'next/navigation'
import { getCurrentCmsUser } from '@/lib/cms-auth'
import { CmsLoginForm } from './CmsLoginForm'

export default async function CmsLoginPage() {
  if (await getCurrentCmsUser()) {
    redirect('/cms')
  }

  return (
    <main className="cms-login-page">
      <div className="bg-aurora" />
      <a className="cms-back-link" href="/">
        ← Повернутися на сайт
      </a>
      <section className="cms-login-card">
        <div className="cms-login-mark">EC</div>
        <p className="cms-eyebrow">Eyzencore CMS</p>
        <h1>Вхід до панелі</h1>
        <p className="cms-login-copy">
          Окрема захищена сесія для керування контентом і даними сайту.
        </p>
        <CmsLoginForm />
      </section>
    </main>
  )
}
