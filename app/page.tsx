import type { Metadata } from 'next'
import Link from 'next/link'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { getAdminStats, listNewsPosts, listServers } from '@/lib/auth-db'
import type { Server } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Eyzencore — моніторинг Minecraft та Discord серверів',
  description:
    'Живий каталог Minecraft і Discord серверів, реальна статистика онлайну, новини спільноти та інструменти для власників проєктів.',
}

const numberFormat = new Intl.NumberFormat('uk-UA')
const dateFormat = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function isDiscord(server: Server) {
  return server.platform === 'discord' || server.core === 'discord'
}

function ServerSpotlight({ server }: { server: Server }) {
  const discord = isDiscord(server)
  const fill = server.max > 0 ? Math.min(100, Math.round((server.players / server.max) * 100)) : 0

  return (
    <Link href={`/servers/${server.seed}`} className="home-server-row">
      <span
        className="home-server-avatar"
        style={server.avatarUrl ? { backgroundImage: `url(${server.avatarUrl})` } : undefined}
      >
        {server.avatarUrl ? '' : server.ic}
      </span>
      <span className="home-server-copy">
        <span className="home-server-name">
          {server.name}
          {server.verified && <span className="home-verified" title="Перевірений сервер">✓</span>}
        </span>
        <span>{discord ? 'Discord' : `${server.mode} · ${server.ver}`}</span>
      </span>
      <span className="home-server-live">
        <span className={`home-live-dot${server.on ? '' : ' is-offline'}`} />
        {server.on ? numberFormat.format(server.players) : 'офлайн'}
      </span>
      <span className="home-server-meter" aria-label={`Заповнено на ${fill}%`}>
        <span style={{ width: `${fill}%` }} />
      </span>
    </Link>
  )
}

export default async function LandingPage() {
  const [servers, news, siteStats] = await Promise.all([
    listServers(),
    listNewsPosts(4),
    getAdminStats(),
  ])

  const onlineServers = servers.filter((server) => server.on)
  const minecraftServers = servers.filter((server) => !isDiscord(server))
  const discordServers = servers.filter(isDiscord)
  const minecraftPlayers = minecraftServers.reduce((sum, server) => sum + server.players, 0)
  const discordOnline = discordServers.reduce((sum, server) => sum + server.players, 0)
  const discordMembers = discordServers.reduce((sum, server) => sum + server.max, 0)
  const verifiedServers = servers.filter((server) => server.verified).length
  const featuredServers = [...servers]
    .sort((a, b) => Number(b.on) - Number(a.on) || b.players - a.players || a.rank - b.rank)
    .slice(0, 5)

  const stats = [
    { value: servers.length, label: 'серверів у каталозі', detail: `${onlineServers.length} зараз онлайн` },
    { value: minecraftPlayers, label: 'гравців Minecraft', detail: `${minecraftServers.length} проєктів` },
    { value: discordMembers, label: 'учасників Discord', detail: `${discordOnline} зараз онлайн` },
    { value: verifiedServers, label: 'перевірених серверів', detail: `${siteStats.totalUsers} користувачів` },
  ]

  return (
    <>
      <div className="bg-aurora" />
      <div className="bg-grid" />
      <Nav />

      <main className="home-main">
        <section className="home-hero">
          <div className="container home-hero-grid">
            <div className="home-hero-copy">
              <div className="eyebrow">
                <span className="pill">LIVE</span>
                <span>Статистика оновлюється з реальних серверів</span>
              </div>
              <h1>
                Знайди свою
                <span>ігрову спільноту</span>
              </h1>
              <p>
                Minecraft і Discord сервери в одному каталозі. Перевіряй онлайн,
                порівнюй проєкти, читай новини та керуй власним сервером.
              </p>
              <div className="home-hero-actions">
                <Link href="/servers/minecraft" className="btn btn-primary btn-lg">
                  Переглянути сервери <span aria-hidden="true">→</span>
                </Link>
                <Link href="/add-server" className="btn btn-secondary btn-lg">
                  Додати свій сервер
                </Link>
              </div>
              <div className="home-platform-links">
                <Link href="/servers/minecraft">
                  <span className="home-platform-icon">M</span>
                  <span><b>Minecraft</b><small>{minecraftServers.length} у каталозі</small></span>
                  <span aria-hidden="true">→</span>
                </Link>
                <Link href="/servers/discord">
                  <span className="home-platform-icon home-platform-discord">D</span>
                  <span><b>Discord</b><small>{discordServers.length} у каталозі</small></span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>

            <div className="home-live-panel">
              <div className="home-panel-head">
                <div>
                  <span className="home-kicker">Моніторинг наживо</span>
                  <h2>Активні сервери</h2>
                </div>
                <span className="home-live-label"><i /> наживо</span>
              </div>

              {featuredServers.length > 0 ? (
                <div className="home-server-list">
                  {featuredServers.map((server) => <ServerSpotlight key={server.seed} server={server} />)}
                </div>
              ) : (
                <div className="home-empty">
                  <span className="home-empty-mark">+</span>
                  <h3>Каталог чекає на перший сервер</h3>
                  <p>Додайте Minecraft або Discord проєкт, і його актуальний онлайн з’явиться тут.</p>
                  <Link href="/add-server" className="btn btn-primary">Додати сервер</Link>
                </div>
              )}

              <Link href="/servers/minecraft" className="home-panel-link">
                Відкрити повний каталог <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="home-stats" aria-label="Статистика платформи">
          <div className="container home-stats-grid">
            {stats.map((stat) => (
              <div className="home-stat" key={stat.label}>
                <strong>{numberFormat.format(stat.value)}</strong>
                <span>{stat.label}</span>
                <small>{stat.detail}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="home-section">
          <div className="container">
            <div className="home-section-head">
              <div>
                <span className="section-tag">Усе вже працює</span>
                <h2>Один простір для гравців і власників</h2>
              </div>
              <p>Кожен блок веде до готового розділу платформи, без декоративних демо та порожніх обіцянок.</p>
            </div>

            <div className="home-feature-grid">
              <Link href="/servers/minecraft" className="home-feature home-feature-wide">
                <span className="home-feature-index">01</span>
                <div>
                  <span className="home-feature-tag">Каталог</span>
                  <h3>Minecraft сервери</h3>
                  <p>Фільтри за режимом і версією, статус онлайн, адреса, рейтинг та сторінка кожного проєкту.</p>
                </div>
                <span className="home-feature-arrow">→</span>
              </Link>
              <Link href="/servers/discord" className="home-feature">
                <span className="home-feature-index">02</span>
                <div>
                  <span className="home-feature-tag">Спільноти</span>
                  <h3>Discord сервери</h3>
                  <p>Учасники, онлайн та швидкий перехід за інвайтом.</p>
                </div>
                <span className="home-feature-arrow">→</span>
              </Link>
              <Link href="/news" className="home-feature">
                <span className="home-feature-index">03</span>
                <div>
                  <span className="home-feature-tag">Редакція</span>
                  <h3>Новини</h3>
                  <p>Оновлення платформи, гайди й матеріали спільноти.</p>
                </div>
                <span className="home-feature-arrow">→</span>
              </Link>
              <Link href="/dashboard" className="home-feature">
                <span className="home-feature-index">04</span>
                <div>
                  <span className="home-feature-tag">Для власників</span>
                  <h3>Кабінет і статистика</h3>
                  <p>Керування сторінкою сервера, перегляди, голоси та аналітика активності.</p>
                </div>
                <span className="home-feature-arrow">→</span>
              </Link>
              <Link href="/dashboard/developers" className="home-feature">
                <span className="home-feature-index">05</span>
                <div>
                  <span className="home-feature-tag">Інтеграції</span>
                  <h3>API для розробників</h3>
                  <p>Токени й endpoints для синхронізації серверних даних.</p>
                </div>
                <span className="home-feature-arrow">→</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="home-section home-news-section" id="news">
          <div className="container">
            <div className="home-section-head home-section-head-row">
              <div>
                <span className="section-tag">Останнє на платформі</span>
                <h2>Новини та оновлення</h2>
              </div>
              <Link href="/news" className="btn btn-secondary">Усі новини →</Link>
            </div>

            {news.length > 0 ? (
              <div className="home-news-grid">
                {news.map((post, index) => (
                  <Link
                    href={`/news/${post.id}`}
                    className={`home-news-card${index === 0 ? ' is-featured' : ''}`}
                    key={post.id}
                  >
                    <span
                      className="home-news-cover"
                      style={post.coverUrl ? { backgroundImage: `url(${post.coverUrl})` } : undefined}
                    >
                      {!post.coverUrl && <span>EYZENCORE</span>}
                    </span>
                    <span className="home-news-content">
                      <span className="home-news-meta">
                        <b>{post.category}</b>
                        <time dateTime={post.createdAt}>{dateFormat.format(new Date(post.createdAt))}</time>
                      </span>
                      <strong>{post.title}</strong>
                      <span className="home-news-excerpt">{post.excerpt || post.content.slice(0, 180)}</span>
                      <span className="home-news-more">Читати новину →</span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="home-news-empty">
                <p>Новин поки немає. Перша публікація з’явиться тут автоматично.</p>
              </div>
            )}
          </div>
        </section>

        <section className="home-cta-section">
          <div className="container">
            <div className="home-cta">
              <div>
                <span className="section-tag">Приєднуйся до каталогу</span>
                <h2>Покажи свій сервер спільноті</h2>
                <p>Створи сторінку проєкту, підключи актуальний онлайн і отримай власну панель керування.</p>
              </div>
              <div className="home-cta-actions">
                <Link href="/add-server" className="btn btn-primary btn-lg">Додати сервер →</Link>
                <Link href="/auth/register" className="btn btn-secondary btn-lg">Створити акаунт</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
