import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { getCurrentAuth } from '@/lib/auth-server'
import { resolveUserRole } from '@/lib/auth-db'
import {
  buildAnimilairViewFingerprint,
  canManageAnimilairProduct,
  getAnimilairMessages,
  getAnimilairOrdersForProduct,
  getAnimilairProduct,
  getAnimilairRequestIp,
  recordAnimilairProductView,
} from '@/lib/animilair-db'
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
  const auth = await getCurrentAuth()
  const initialUser = auth?.user || null
  const product = await getAnimilairProduct(params.slug)
  if (!product) notFound()
  const requestHeaders = headers()
  const userId = auth?.user?.id ?? null
  const ipAddress = getAnimilairRequestIp(requestHeaders)
  const userAgent = requestHeaders.get('user-agent')
  const viewRecorded = await recordAnimilairProductView({
    productId: product.id,
    userId,
    fingerprint: buildAnimilairViewFingerprint({ userId, ipAddress, userAgent }),
    ipAddress,
    userAgent,
  })
  const displayProduct = viewRecorded
    ? { ...product, viewCount: product.viewCount + 1 }
    : product
  const role = auth
    ? await resolveUserRole({ userId: auth.user.id, role: auth.user.user_metadata.role })
    : 'USER'
  const canManage = canManageAnimilairProduct(initialUser, role, product.author?.userId || null)
  if (auth?.user?.id && product.author?.userId === auth.user.id) {
    const { touchAnimilairAuthorPresence } = await import('@/lib/animilair-db')
    await touchAnimilairAuthorPresence(auth.user.id)
  }
  const productOrders = auth
    ? await getAnimilairOrdersForProduct(product.id, auth.user, role)
    : []
  const activeOrder = productOrders.find((order) => order.status !== 'canceled') || productOrders[0] || null
  const initialMessages = auth && activeOrder
    ? await getAnimilairMessages(activeOrder.id, auth.user, role)
    : []

  return (
    <>
      <div className="bg-aurora" />
      <AnimilairProductClient
        initialUser={initialUser}
        product={displayProduct}
        canManage={canManage}
        initialProductOrders={productOrders}
        initialActiveOrderId={activeOrder?.id ?? null}
        initialMessages={initialMessages}
      />
    </>
  )
}
