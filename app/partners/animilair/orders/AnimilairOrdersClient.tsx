'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { AnimilairOrderChat } from '@/components/partners/AnimilairOrderChat'
import { formatAnimilairDate, animilairStatusLabel } from '@/components/partners/animilair-chat-utils'
import type { AuthUser } from '@/lib/auth-db'
import type { AnimilairOrder } from '@/lib/animilair-shared'

type Props = {
  initialUser: AuthUser
  initialOrders: AnimilairOrder[]
}

export function AnimilairOrdersClient({ initialUser, initialOrders }: Props) {
  const searchParams = useSearchParams()
  const queryOrder = Number(searchParams.get('order') || 0)
  const initialSelected = initialOrders.some((order) => order.id === queryOrder)
    ? queryOrder
    : initialOrders[0]?.id || null
  const [orders, setOrders] = useState(initialOrders)
  const [selectedId, setSelectedId] = useState<number | null>(initialSelected)

  const selected = useMemo(
    () => orders.find((order) => order.id === selectedId) || null,
    [orders, selectedId]
  )

  return (
    <PageShell active="animilair-orders" initialUser={initialUser}>
      <main className="page-main animilair-orders-page">
        <div className="page-topbar">
          <div>
            <Breadcrumbs items={[
              { label: 'Eyzencore', href: '/' },
              { label: 'AnimiLair Studio', href: '/partners/animilair' },
              { label: 'Замовлення' },
            ]} />
            <h1 className="page-title">Замовлення AnimiLair</h1>
          </div>
          <Link href="/partners/animilair" className="btn btn-secondary">До маркетплейсу</Link>
        </div>

        {orders.length === 0 ? (
          <section className="set-card animilair-empty-orders">
            <h2>Замовлень поки немає</h2>
            <p>Оберіть послугу AnimiLair Studio та створіть перше замовлення. Після цього тут зʼявиться чат.</p>
            <Link href="/partners/animilair#works" className="btn btn-primary">Переглянути послуги</Link>
          </section>
        ) : (
          <section className="animilair-orders-layout">
            <aside className="animilair-order-list">
              {orders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  className={`animilair-order-item${order.id === selectedId ? ' active' : ''}`}
                  onClick={() => setSelectedId(order.id)}
                >
                  <span className="animilair-order-status">{animilairStatusLabel(order.status)}</span>
                  <strong>{order.title}</strong>
                  <small>{order.productTitle} · {formatAnimilairDate(order.updatedAt)}</small>
                  <small>{order.customerId === initialUser.id ? `Дизайнер: ${order.authorName}` : `Клієнт: ${order.customerName}`}</small>
                </button>
              ))}
            </aside>

            {selected ? (
              <AnimilairOrderChat
                key={selected.id}
                user={initialUser}
                orders={orders}
                activeOrderId={selectedId}
                onActiveOrderIdChange={setSelectedId}
                onOrdersChange={setOrders}
              />
            ) : (
              <div className="animilair-chat-card">
                <p className="animilair-chat-empty">Оберіть замовлення.</p>
              </div>
            )}
          </section>
        )}
      </main>
    </PageShell>
  )
}
