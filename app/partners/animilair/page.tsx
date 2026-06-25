import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth-server'
import { getAnimilairCatalog, getAnimilairHeroDescription } from '@/lib/animilair-db'
import { buildPageMetadata } from '@/lib/seo'
import { AnimilairClient } from './AnimilairClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'AnimiLair Studio - дизайн, рендери та анімації для серверів',
    description:
      'Партнерський маркетплейс AnimiLair Studio на Eyzencore: замовляйте логотипи, банери, Minecraft рендери, трейлери та анімації для серверів.',
    path: '/partners/animilair',
    keywords: [
      'AnimiLair Studio',
      'Minecraft дизайн',
      'Minecraft рендер',
      'банер для сервера',
      'логотип Minecraft сервера',
      'Discord дизайн',
      'анімація для сервера',
      'трейлер Minecraft сервера',
    ],
  }),
}

export default async function AnimilairPage() {
  const [initialUser, catalog, heroDescription] = await Promise.all([
    getCurrentUser(),
    getAnimilairCatalog(),
    getAnimilairHeroDescription(),
  ])

  return (
    <>
      <div className="bg-aurora" />
      <AnimilairClient initialUser={initialUser} catalog={catalog} heroDescription={heroDescription} />
    </>
  )
}
