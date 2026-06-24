import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentAuth } from '@/lib/auth-server'
import { resolveUserRole } from '@/lib/auth-db'
import { getAnimilairProductsForManager } from '@/lib/animilair-db'
import { buildPageMetadata } from '@/lib/seo'
import { AnimilairProductsClient } from './AnimilairProductsClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Мої товари AnimiLair',
    description: 'Керуйте товарами та послугами AnimiLair Studio на Eyzencore.',
    path: '/partners/animilair/products',
  }),
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AnimilairProductsPage() {
  const auth = await getCurrentAuth()
  if (!auth) {
    redirect('/login')
  }
  const role = await resolveUserRole({
    userId: auth.user.id,
    role: auth.user.user_metadata.role,
  })
  if (role !== 'DESIGNER' && role !== 'ADMIN') {
    redirect('/partners/animilair')
  }
  const products = await getAnimilairProductsForManager(auth.user, role)
  return (
    <>
      <div className="bg-aurora" />
      <AnimilairProductsClient initialUser={auth.user} initialProducts={products} />
    </>
  )
}
