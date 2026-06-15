import { getMaintenanceSettings } from '@/lib/maintenance'

export const dynamic = 'force-dynamic'

export default async function MaintenancePage() {
  const settings = await getMaintenanceSettings()
  return (
    <main className="maintenance-page">
      <section className="maintenance-card">
        <div className="maintenance-mark">EC</div>
        <p className="maintenance-eyebrow">Eyzencore · системне оновлення</p>
        <h1>{settings.title}</h1>
        <p>{settings.message}</p>
        <div className="maintenance-status">
          <span />
          Роботи тривають
        </div>
        <a href="/cms/login">Вхід для адміністратора</a>
      </section>
    </main>
  )
}
