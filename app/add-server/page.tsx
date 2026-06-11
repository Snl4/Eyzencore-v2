import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { getCurrentUser } from '@/lib/auth-server'

export const metadata: Metadata = {
  title: 'Додати сервер - Eyzencore',
  description: 'Оберіть тип сервера для додавання в каталог',
}

export default async function AddServerPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  return (
    <>
      <div className="bg-aurora" />
      <PageShell active="add-server" initialUser={user}>
        <div className="page-main">
          <div className="page-topbar">
            <div>
              <Breadcrumbs items={[
                { label: 'Простір', href: '/' },
                { label: 'Сервери', href: '/servers/minecraft' },
                { label: 'Додавання' },
              ]} />
              <h1 className="page-title">Який сервер додаємо?</h1>
              <p style={{ color: 'var(--fg-3)', marginTop: 8 }}>Minecraft і Discord мають окремі поля, перевірку та правила публікації.</p>
            </div>
          </div>
          <div className="projects-grid" style={{ maxWidth: 900 }}>
            <Link href="/add-server/minecraft" className="project-card" style={{ minHeight: 230, display: 'flex', flexDirection: 'column' }}>
              <div className="project-card-logo-placeholder" style={{ width: 58, height: 58, fontSize: 18 }}>MC</div>
              <h2 style={{ fontSize: 22, marginTop: 18 }}>Minecraft-сервер</h2>
              <p style={{ color: 'var(--fg-3)', lineHeight: 1.6, marginTop: 10 }}>
                IP-адреса, Java/Bedrock, версії, ядро, MOTD, лаунчер і перевірка доступності.
              </p>
              <span className="btn btn-primary" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>Додати Minecraft</span>
            </Link>
            <Link href="/add-server/discord" className="project-card" style={{ minHeight: 230, display: 'flex', flexDirection: 'column' }}>
              <div className="project-card-logo-placeholder" style={{ width: 58, height: 58, fontSize: 18 }}>DS</div>
              <h2 style={{ fontSize: 22, marginTop: 18 }}>Discord-сервер</h2>
              <p style={{ color: 'var(--fg-3)', lineHeight: 1.6, marginTop: 10 }}>
                Invite-посилання, категорія спільноти, Discord-верифікація та статистика учасників.
              </p>
              <span className="btn btn-primary" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>Додати Discord</span>
            </Link>
          </div>
        </div>
      </PageShell>
    </>
  )
}
