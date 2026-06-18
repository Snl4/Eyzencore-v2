import Link from 'next/link'
import { BrandMark } from '@/components/ui/BrandMark'

const LINKS = [
  { href: '/servers/minecraft', label: 'Minecraft сервери' },
  { href: '/servers/discord', label: 'Discord сервери' },
  { href: '/add-server', label: 'Додати сервер' },
  { href: '/news', label: 'Новини' },
  { href: '/forum', label: 'Форум' },
  { href: '/dashboard/developers', label: 'API' },
]

const POLICIES = [
  { href: '/terms', label: 'Умови' },
  { href: '/privacy', label: 'Конфіденційність' },
  { href: '/sla', label: 'SLA' },
]

export function Footer() {
  return (
    <footer className="foot">
      <div className="container">
        <div className="foot-grid foot-grid-compact">
          <div className="foot-brand">
            <Link className="brand" href="/">
              <BrandMark />
              <span>Eyzencore</span>
            </Link>
            <p>Моніторинг Minecraft і Discord серверів, рейтинг, новини та інструменти для власників проєктів.</p>
          </div>

          <nav className="foot-links-compact" aria-label="Навігація футера">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href}>{link.label}</Link>
            ))}
          </nav>

          <nav className="foot-links-compact foot-policies-compact" aria-label="Політики">
            {POLICIES.map((link) => (
              <Link key={link.href} href={link.href}>{link.label}</Link>
            ))}
          </nav>
        </div>

        <div className="foot-bottom">
          <span>© 2025–2026 Eyzencore. Зроблено в Україні</span>
          <div className="right">
            <span>Статус: <span style={{ color: 'var(--green)' }}>● працює стабільно</span></span>
            <span>v2.0.4</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
