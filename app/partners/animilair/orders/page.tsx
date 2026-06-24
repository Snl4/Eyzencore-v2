import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentAuth } from '@/lib/auth-server'
import { resolveUserRole } from '@/lib/auth-db'
import { getAnimilairOrders } from '@/lib/animilair-db'
import { buildPageMetadata } from '@/lib/seo'
import { AnimilairOrdersClient } from './AnimilairOrdersClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Замовлення AnimiLair Studio',
    description: 'Керуйте замовленнями AnimiLair Studio та спілкуйтесь із виконавцем прямо на Eyzencore.',
    path: '/partners/animilair/orders',
  }),
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AnimilairOrdersPage() {
  const auth = await getCurrentAuth()
  if (!auth) {
    redirect('/login')
  }
  const role = await resolveUserRole({
    userId: auth.user.id,
    role: auth.user.user_metadata.role,
  })
  const orders = await getAnimilairOrders(auth.user, role)

  return (
    <>
      <div className="bg-aurora" />
      <AnimilairOrdersClient initialUser={auth.user} initialOrders={orders} />
    </>
  )
}
