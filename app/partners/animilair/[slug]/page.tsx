import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth-server'
import { getAnimilairProduct } from '@/lib/animilair-db'
import { buildPageMetadata } from '@/lib/seo'
import { AnimilairProductClient } from './AnimilairProductClient'

type Props = {
  params: { slug: string }
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getAnimilairProduct(params.slug)
  if (!product) {
    return buildPageMetadata({
      title: 'Послугу не знайдено',
      description: 'Послуга AnimiLair Studio недоступна або була видалена.',
      path: '/partners/animilair',
    })
  }
  return buildPageMetadata({
    title: `${product.title} — AnimiLair Studio`,
    description: product.shortDesc || product.description,
    path: `/partners/animilair/${product.slug}`,
    image: product.coverUrl || undefined,
    keywords: ['AnimiLair Studio', product.category, ...product.tags],
  })
}

export default async function AnimilairProductPage({ params }: Props) {
  const [initialUser, product] = await Promise.all([
    getCurrentUser(),
    getAnimilairProduct(params.slug),
  ])

  if (!product) notFound()

  return (
    <>
      <div className="bg-aurora" />
      <AnimilairProductClient initialUser={initialUser} product={product} />
    </>
  )
}
