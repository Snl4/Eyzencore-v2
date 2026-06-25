export interface SitemapEntry {
  url: string
  lastModified?: Date
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Builds a sitemap urlset XML document.
 */
export function buildSitemapXml(entries: SitemapEntry[]): string {
  const items = entries.map((entry) => {
    const parts = [`    <loc>${escapeXml(entry.url)}</loc>`]
    if (entry.lastModified && !Number.isNaN(entry.lastModified.getTime())) {
      parts.push(`    <lastmod>${entry.lastModified.toISOString()}</lastmod>`)
    }
    if (entry.changeFrequency) {
      parts.push(`    <changefreq>${entry.changeFrequency}</changefreq>`)
    }
    if (typeof entry.priority === 'number') {
      parts.push(`    <priority>${entry.priority.toFixed(2)}</priority>`)
    }
    return `  <url>\n${parts.join('\n')}\n  </url>`
  })
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...items,
    '</urlset>',
  ].join('\n')
}

/**
 * Builds a sitemap index XML document.
 */
export function buildSitemapIndexXml(entries: Array<{ url: string; lastModified?: Date }>): string {
  const items = entries.map((entry) => {
    const parts = [`    <loc>${escapeXml(entry.url)}</loc>`]
    if (entry.lastModified && !Number.isNaN(entry.lastModified.getTime())) {
      parts.push(`    <lastmod>${entry.lastModified.toISOString()}</lastmod>`)
    }
    return `  <sitemap>\n${parts.join('\n')}\n  </sitemap>`
  })
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...items,
    '</sitemapindex>',
  ].join('\n')
}

export function safeLastModified(value?: string | Date | null, fallback = new Date()): Date {
  if (!value) return fallback
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date
}
