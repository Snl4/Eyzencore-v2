import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

const AI_BOTS = [
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'anthropic-ai',
  'PerplexityBot',
  'Google-Extended',
  'CCBot',
  'Amazonbot',
  'Bytespider',
  'meta-externalagent',
  'Diffbot',
] as const

export default function robots(): MetadataRoute.Robots {
  const sharedDisallow = [
    '/api/',
    '/admin/',
    '/cms/',
    '/dashboard/',
    '/settings',
    '/login',
    '/register',
    '/reset-password',
    '/forgot-password',
    '/maintenance',
    '/add-server',
    '/*/edit',
  ]
  const sharedAllow = [
    '/',
    '/servers',
    '/servers/minecraft',
    '/servers/discord',
    '/news',
    '/forum',
    '/terms',
    '/privacy',
    '/sla',
    '/llms.txt',
    '/llms-full.txt',
  ]

  return {
    rules: [
      {
        userAgent: '*',
        allow: sharedAllow,
        disallow: sharedDisallow,
      },
      {
        userAgent: 'Googlebot',
        allow: ['/'],
        disallow: sharedDisallow,
      },
      ...AI_BOTS.map((userAgent) => ({
        userAgent,
        allow: ['/'] as string[],
        disallow: sharedDisallow,
      })),
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
