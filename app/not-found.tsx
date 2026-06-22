import Link from 'next/link'
import { BrandMark } from '@/components/ui/BrandMark'

export default function NotFoundPage() {
  return (
    <main className="not-found-page">
      <div className="not-found-grid" aria-hidden="true" />
      <div className="not-found-orb one" aria-hidden="true" />
      <div className="not-found-orb two" aria-hidden="true" />

      <section className="not-found-card">
        <div className="not-found-brand">
          <BrandMark />
          <span>Eyzencore</span>
        </div>

        <div className="not-found-scene" aria-hidden="true">
          <div className="not-found-cube">
            <span />
            <span />
            <span />
          </div>
          <div className="not-found-signal">
            <i />
            <i />
            <i />
          </div>
        </div>

        <p className="not-found-kicker">404 · сервер не відповідає</p>
        <h1>Ця сторінка загубилась між чанками</h1>
        <p className="not-found-copy">
          Посилання могло змінитися, сторінку могли видалити, або портал відкрився не туди. Але каталог серверів,
          новини й кабінет на місці.
        </p>

        <div className="not-found-actions">
          <Link href="/" className="btn btn-primary">На головну</Link>
          <Link href="/servers/minecraft" className="btn btn-secondary">Minecraft сервери</Link>
          <Link href="/servers/discord" className="btn btn-secondary">Discord сервери</Link>
        </div>

        <div className="not-found-hints">
          <Link href="/news">Новини</Link>
          <span />
          <Link href="/forum">Форум</Link>
          <span />
          <Link href="/dashboard">Кабінет</Link>
        </div>
      </section>
    </main>
  )
}
