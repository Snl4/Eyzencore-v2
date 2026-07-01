import type { MetadataRoute } from 'next'
import { listServicePageSlugs } from '@/lib/service-pages'
import { SITE_URL } from '@/lib/seo'

const now = new Date()

function url(path: string): string {
  return `${SITE_URL}${path}`
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: url('/'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: url('/servers/minecraft'),
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.95,
    },
    {
      url: url('/servers/discord'),
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: url('/news'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.82,
    },
    {
      url: url('/forum'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.72,
    },
    {
      url: url('/partners/animilair'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.74,
    },
    {
      url: url('/terms'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.25,
    },
    {
      url: url('/privacy'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.25,
    },
    {
      url: url('/sla'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.2,
    },
    ...listServicePageSlugs().map((slug) => ({
      url: url(`/service/${slug}`),
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: slug === 'how-to-add-server' ? 0.78 : 0.72,
    })),
  ]
}
