import { getMaintenanceSettings } from '@/lib/maintenance'

export const dynamic = 'force-dynamic'

export default async function MaintenancePage() {
  const settings = await getMaintenanceSettings()

  return (
    <main className="maintenance-page">
      <div className="maintenance-orb maintenance-orb-one" />
      <div className="maintenance-orb maintenance-orb-two" />

      <section className="maintenance-card">
        <div className="maintenance-brand">
          <div className="maintenance-mark">EC</div>
          <div>
            <strong>Eyzencore</strong>
            <span>Monitoring platform</span>
          </div>
        </div>

        <div className="maintenance-visual" aria-hidden="true">
          <span className="maintenance-visual-ring" />
          <span className="maintenance-visual-core">01</span>
        </div>

        <p className="maintenance-eyebrow">Системне оновлення</p>
        <h1>{settings.title}</h1>
        <p className="maintenance-description">{settings.message}</p>

        <div className="maintenance-meta">
          <div className="maintenance-status">
            <span />
            Роботи тривають
          </div>
          <p>Ми повернемо платформу онлайн якнайшвидше.</p>
        </div>

        <a className="maintenance-admin-link" href="/cms/login">
          Вхід для адміністратора
          <span aria-hidden="true">→</span>
        </a>
      </section>

      <p className="maintenance-footer">© 2026 Eyzencore · Дякуємо за терпіння</p>
    </main>
  )
}
