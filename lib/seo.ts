import type { Metadata } from 'next'
import type { NewsPost } from '@/lib/auth-db'
import { buildNewsPath } from '@/lib/news-slug'
import type { Server } from '@/lib/types'
import { buildServerPublicPath } from '@/lib/server-slug'

export const SITE_URL = 'https://eyzencore.com'
export const SITE_NAME = 'Eyzencore'

/** Private/auth pages: blocked in robots.txt and excluded from indexing. */
export const PRIVATE_PAGE_ROBOTS: NonNullable<Metadata['robots']> = {
  index: false,
  follow: true,
  googleBot: {
    index: false,
    follow: true,
  },
}

export const SEO_KEYWORDS = [
  'Eyzencore',
  'Minecraft сервери',
  'Minecraft servers',
  'моніторинг Minecraft серверів',
  'мониторинг майнкрафт серверов',
  'Minecraft server list',
  'українські сервера майнкрафт',
  'українські Minecraft сервери',
  'украинские Minecraft сервера',
  'майнкрафт сервери',
  'сервери майнкрафт',
  'сервера майнкрафт',
  'топ майнкрафт серверів',
  'рейтинг майнкрафт серверів',
  'моніторинг серверів',
  'мониторинг серверов',
  'best Minecraft servers',
  'Minecraft survival server',
  'Minecraft Bedrock servers',
  'Minecraft Java servers',
  'Minecraft Ukraine',
  'Discord сервери',
  'Discord servers',
  'українські Discord спільноти',
  'Discord communities Ukraine',
  'моніторинг Discord серверів',
  'рейтинг серверів',
  'голосування за сервер',
  'Minecraft рейтинг',
  'сервер майнкрафт Україна',
  'minecraft сервер без донату',
  'minecraft survival україна',
  'ігрові сервери',
  'gaming communities',
]

export function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) {
    return path.replace(/([^:]\/)\/+/g, '$1')
  }
  const normalizedPath = `/${String(path).replace(/^\/+/, '').replace(/\/+/g, '/')}`
  if (normalizedPath === '/') {
    return SITE_URL
  }
  return `${SITE_URL}${normalizedPath}`
}

export function truncateSeo(value: string, max = 155) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max - 1).trim()}…`
}

const LISTING_FILTER_KEYS = ['version', 'mode', 'tag', 'sort', 'q', 'search', 'page'] as const

export function hasPublicListingFilters(
  searchParams: Record<string, string | string[] | undefined> = {},
): boolean {
  return LISTING_FILTER_KEYS.some((key) => {
    const value = searchParams[key]
    if (Array.isArray(value)) {
      return value.some((item) => String(item || '').trim().length > 0)
    }
    return String(value || '').trim().length > 0
  })
}

export const FILTERED_LISTING_ROBOTS: NonNullable<Metadata['robots']> = {
  index: false,
  follow: true,
  googleBot: {
    index: false,
    follow: true,
  },
}

export function buildPageMetadata(input: {
  title: string
  description: string
  path?: string
  image?: string | null
  keywords?: string[]
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
}): Metadata {
  const url = absoluteUrl(input.path || '/')
  const image = absoluteUrl(input.image || '/icon.png')
  const description = truncateSeo(input.description)
  const title = input.title.includes(SITE_NAME) ? input.title : `${input.title} - ${SITE_NAME}`

  return {
    title,
    description,
    keywords: Array.from(new Set([...(input.keywords || []), ...SEO_KEYWORDS])),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'uk_UA',
      type: input.type || 'website',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export function buildServerMetadata(server: Server): Metadata {
  const platform = server.platform === 'discord' || server.core === 'discord' ? 'Discord' : 'Minecraft'
  const online = server.on ? `${server.players}/${server.max} онлайн` : 'статус оновлюється'
  const description = truncateSeo(
    server.fullDesc ||
      server.shortDesc ||
      server.desc ||
      `${server.name}: ${platform} сервер у каталозі Eyzencore. Онлайн, рейтинг, голоси, відгуки та інформація для гравців.`
  )

  return buildPageMetadata({
    title: `${server.name} - ${platform} сервер`,
    description: `${description} ${online}. Рейтинг: ${Math.round(server.ratingScore || 0)}.`,
    path: buildServerPublicPath(server),
    image: server.bannerUrl || server.avatarUrl || '/icon.png',
    keywords: [
      server.name,
      server.addr,
      platform,
      `${platform} server`,
      `${platform} сервер`,
      server.mode,
      server.ver,
      ...(server.tags || []),
    ],
  })
}

export function buildNewsMetadata(post: NewsPost): Metadata {
  return buildPageMetadata({
    title: `${post.title} - Новини Eyzencore`,
    description: post.excerpt || post.content,
    path: buildNewsPath(post),
    image: post.coverUrl || '/icon.png',
    type: 'article',
    publishedTime: post.createdAt,
    modifiedTime: post.updatedAt,
    keywords: [post.title, post.category, 'новини Minecraft', 'Minecraft news', 'Discord news'],
  })
}

export function siteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'uk-UA',
    description: 'Моніторинг Minecraft і Discord серверів, рейтинг, голосування, відгуки, новини та форум спільноти.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/servers/minecraft?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    sameAs: [
      'https://discord.gg/5ENJnx8GVR',
    ],
  }
}

export function serverJsonLd(server: Server) {
  const platform = server.platform === 'discord' || server.core === 'discord' ? 'Discord' : 'Minecraft'
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: server.name,
    url: `${SITE_URL}${buildServerPublicPath(server)}`,
    image: absoluteUrl(server.avatarUrl || server.bannerUrl || '/icon.png'),
    description: truncateSeo(server.fullDesc || server.shortDesc || server.desc || `${platform} server on Eyzencore`, 500),
    category: `${platform} server`,
    brand: {
      '@type': 'Brand',
      name: SITE_NAME,
    },
    aggregateRating: server.reviewsCount
      ? {
          '@type': 'AggregateRating',
          ratingValue: Number(server.averageRating || 0).toFixed(1),
          reviewCount: server.reviewsCount,
          bestRating: '5',
          worstRating: '1',
        }
      : undefined,
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Platform', value: platform },
      { '@type': 'PropertyValue', name: 'Mode', value: server.mode },
      { '@type': 'PropertyValue', name: 'Address', value: server.addr },
      { '@type': 'PropertyValue', name: 'Online players', value: String(server.players || 0) },
    ],
  }
}

export function itemListJsonLd(input: {
  name: string
  path: string
  items: Array<{ name: string; url: string; item?: Record<string, unknown> }>
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: input.name,
    url: absoluteUrl(input.path),
    numberOfItems: input.items.length,
    itemListElement: input.items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.url),
      ...(item.item ? { item: item.item } : {}),
    })),
  }
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

export function faqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

export function howToJsonLd(input: {
  name: string
  description: string
  path: string
  steps: Array<{ name: string; text: string }>
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    step: input.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  }
}

export function newsJsonLd(post: NewsPost) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: truncateSeo(post.excerpt || post.content),
    image: [absoluteUrl(post.coverUrl || '/icon.png')],
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    author: {
      '@type': 'Person',
      name: post.authorName || SITE_NAME,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/icon.png`,
      },
    },
    mainEntityOfPage: `${SITE_URL}${buildNewsPath(post)}`,
  }
}
