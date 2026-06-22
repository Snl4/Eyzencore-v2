import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/servers',
          '/servers/minecraft',
          '/servers/discord',
          '/news',
          '/forum',
          '/terms',
          '/privacy',
          '/sla',
        ],
        disallow: [
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
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
