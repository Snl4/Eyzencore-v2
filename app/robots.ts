import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

/** Intentionally blocked from crawling/indexing (auth, owner tools, forms). */
const PRIVATE_PATHS = [
  '/api/',
  '/admin/',
  '/cms/',
  '/auth/',
  '/dashboard/',
  '/settings',
  '/profile',
  '/login',
  '/register',
  '/reset-password',
  '/forgot-password',
  '/maintenance',
  '/add-server',
  '/*/edit',
]

const EXTRA_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'anthropic-ai',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'Bingbot',
  'CCBot',
  'Amazonbot',
  'Bytespider',
  'meta-externalagent',
  'FacebookBot',
  'Diffbot',
] as const

export default function robots(): MetadataRoute.Robots {
  const sharedRule = {
    allow: '/',
    disallow: PRIVATE_PATHS,
  }

  return {
    rules: [
      { userAgent: '*', ...sharedRule },
      { userAgent: 'Googlebot', ...sharedRule },
      ...EXTRA_CRAWLERS.map((userAgent) => ({ userAgent, ...sharedRule })),
    ],
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/sitemap-servers.xml`,
      `${SITE_URL}/sitemap-news.xml`,
      `${SITE_URL}/sitemap-forum.xml`,
      `${SITE_URL}/sitemap-tags.xml`,
    ],
    host: SITE_URL,
  }
}
