import { getCachedForumThreads, getCachedPublicNews, getCachedPublicServers } from '@/lib/public-cache'
import { listMinecraftSeoLandingSlugs } from '@/lib/minecraft-seo-pages'
import { listServicePageSlugs } from '@/lib/service-pages'
import { buildNewsPath } from '@/lib/news-slug'
import { isDiscordServer, getServerPlatformLabel } from '@/lib/server-platform'
import { absoluteUrl, SITE_NAME, SITE_URL, truncateSeo } from '@/lib/seo'
import { buildServerPublicPath } from '@/lib/server-slug'
import type { Server } from '@/lib/types'

interface BuildSiteCatalogOptions {
  full?: boolean
}

function serverDescription(server: Server, full: boolean): string {
  const base = server.fullDesc || server.shortDesc || server.desc || `${server.name} у каталозі ${SITE_NAME}.`
  return full ? base : truncateSeo(base, 220)
}

function renderServerSection(servers: Server[], title: string, full: boolean): string[] {
  const lines: string[] = [`## ${title}`, '']
  if (servers.length === 0) {
    lines.push('Поки що немає опублікованих серверів у цій категорії.', '')
    return lines
  }
  servers.forEach((server) => {
    const path = buildServerPublicPath(server)
    const url = absoluteUrl(path)
    const platform = getServerPlatformLabel(server)
    const online = server.on ? `${server.players}/${server.max} онлайн` : 'офлайн'
    lines.push(`### [${server.name}](${url})`)
    lines.push(serverDescription(server, full))
    lines.push(`Платформа: ${platform} · Режим: ${server.mode} · Версія: ${server.ver} · ${online}`)
    if (server.tags.length > 0) {
      lines.push(`Теги: ${server.tags.join(', ')}`)
    }
    lines.push('')
  })
  return lines
}

/**
 * Builds catalog.txt or catalog-full.txt for search engines and directory parsers.
 */
export async function buildSiteCatalog(options: BuildSiteCatalogOptions = {}): Promise<string> {
  const full = Boolean(options.full)
  const [servers, news, forumThreads] = await Promise.all([
    getCachedPublicServers(),
    getCachedPublicNews(full ? 40 : 12),
    getCachedForumThreads(full ? 40 : 12),
  ])
  const minecraftServers = servers.filter((server) => !isDiscordServer(server))
  const discordServers = servers.filter((server) => isDiscordServer(server))
  const lines: string[] = [
    `# ${SITE_NAME} - Моніторинг українських Minecraft і Discord серверів`,
    '',
    `> Каталог українських серверів майнкрафт і Discord спільнот з живим онлайном, рейтингом, голосами, відгуками, новинами та форумом. Додавай свій сервер безкоштовно.`,
    '',
    full
      ? 'Це розширена версія catalog.txt з повними описами серверів, новин і форуму.'
      : 'Компактна версія каталогу. Повний файл: https://eyzencore.com/catalog-full.txt',
    '',
    '## Що таке Eyzencore?',
    '',
    `${SITE_NAME} - українська платформа моніторингу Minecraft і Discord серверів. Сайт допомагає гравцям знаходити активні спільноти, а власникам - просувати проєкти, збирати відгуки та дивитися статистику.`,
    '',
    '## Статистика платформи',
    '',
    `- Опублікованих серверів: ${servers.length}`,
    `- Minecraft серверів: ${minecraftServers.length}`,
    `- Discord серверів: ${discordServers.length}`,
    `- Новин у каталозі: ${news.length}`,
    `- Тем на форумі: ${forumThreads.length}`,
    `- Мова інтерфейсу: Українська (uk-UA)`,
    `- Сайт: ${SITE_URL}`,
    '',
    '## Основні розділи',
    '',
    `- Minecraft сервери: ${absoluteUrl('/servers/minecraft')}`,
    `- Discord сервери: ${absoluteUrl('/servers/discord')}`,
    `- Новини: ${absoluteUrl('/news')}`,
    `- Форум: ${absoluteUrl('/forum')}`,
    `- API для розробників: ${absoluteUrl('/dashboard/developers')}`,
    `- FAQ і довідка: ${absoluteUrl('/service/faq')}`,
    `- Як додати сервер: ${absoluteUrl('/service/how-to-add-server')}`,
    '',
    '## SEO-розділи Minecraft',
    '',
  ]
  listMinecraftSeoLandingSlugs().forEach((slug) => {
    lines.push(`- ${absoluteUrl(`/servers/minecraft/${slug}`)}`)
  })
  lines.push('', ...renderServerSection(minecraftServers, 'Українські сервери Майнкрафт', full))
  lines.push(...renderServerSection(discordServers, 'Українські сервери Discord', full))
  if (news.length > 0) {
    lines.push('## Новини', '')
    news.forEach((post) => {
      lines.push(`### [${post.title}](${absoluteUrl(buildNewsPath(post))})`)
      lines.push(truncateSeo(post.excerpt || post.content, full ? 500 : 180))
      lines.push('')
    })
  }
  if (forumThreads.length > 0) {
    lines.push('## Форум', '')
    forumThreads.forEach((thread) => {
      lines.push(`- [${thread.title}](${absoluteUrl(`/forum/${thread.id}`)}) - ${thread.category.name}`)
    })
    lines.push('')
  }
  lines.push(
    '## Карта сайту',
    '',
    `- ${absoluteUrl('/sitemap.xml')}`,
    `- ${absoluteUrl('/sitemap-servers.xml')}`,
    `- ${absoluteUrl('/sitemap-news.xml')}`,
    `- ${absoluteUrl('/sitemap-forum.xml')}`,
    `- ${absoluteUrl('/sitemap-tags.xml')}`,
    '',
    '## Довідкові сторінки',
    '',
    ...listServicePageSlugs().map((slug) => `- ${absoluteUrl(`/service/${slug}`)}`),
    '',
    '## Поширені запитання',
    '',
    'Як додати сервер?',
    `Покрокова інструкція: ${absoluteUrl('/service/how-to-add-server')}. Потрібен акаунт на ${SITE_URL}.`,
    '',
    'Як знайти український Minecraft сервер?',
    `Відкрийте ${absoluteUrl('/servers/minecraft')} або тематичні розділи survival, bedrock, no-p2w та ukraine.`,
    '',
  )
  return lines.join('\n')
}
