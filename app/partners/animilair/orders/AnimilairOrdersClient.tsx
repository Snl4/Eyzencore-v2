'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { AnimilairOrderChat } from '@/components/partners/AnimilairOrderChat'
import { formatAnimilairDate, animilairStatusLabel } from '@/components/partners/animilair-chat-utils'
import type { AuthUser } from '@/lib/auth-db'
import {
  groupAnimilairActiveOrdersByProduct,
  isAnimilairOrderClosed,
  type AnimilairOrder,
} from '@/lib/animilair-shared'
import { IMAGE_PLACEHOLDER } from '@/lib/placeholders'

type Props = {
  initialUser: AuthUser
  initialOrders: AnimilairOrder[]
}

function getOrderCoverUrl(order: AnimilairOrder): string {
  const cover = String(order.productCoverUrl || '').trim()
  if (!cover || cover === IMAGE_PLACEHOLDER) return ''
  return cover
}

export function AnimilairOrdersClient({ initialUser, initialOrders }: Props) {
  const searchParams = useSearchParams()
  const queryOrder = Number(searchParams.get('order') || 0)
  const [orders, setOrders] = useState(initialOrders)
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    if (initialOrders.some((order) => order.id === queryOrder)) return queryOrder
    const active = initialOrders.find((order) => !isAnimilairOrderClosed(order.status))
    return active?.id ?? initialOrders[0]?.id ?? null
  })
  const [busy, setBusy] = useState(false)
  const [showClosed, setShowClosed] = useState(false)

  const isDesignerSidebar = useMemo(
    () => orders.some((order) => order.authorUserId === initialUser.id),
    [initialUser.id, orders]
  )
  const activeOrders = useMemo(
    () => orders.filter((order) => !isAnimilairOrderClosed(order.status)),
    [orders]
  )
  const closedOrders = useMemo(
    () => orders.filter((order) => isAnimilairOrderClosed(order.status)),
    [orders]
  )
  const productGroups = useMemo(
    () => (isDesignerSidebar ? groupAnimilairActiveOrdersByProduct(orders) : []),
    [isDesignerSidebar, orders]
  )
  const selected = useMemo(
    () => orders.find((order) => order.id === selectedId) || null,
    [orders, selectedId]
  )

  const archiveOrder = async (orderId: number) => {
    if (busy) return
    setBusy(true)
    try {
      const response = await fetch(`/api/partners/animilair/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      })
      const payload = await response.json() as { success?: boolean; error?: string }
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Не вдалося прибрати замовлення')
      }
      const listResponse = await fetch('/api/partners/animilair/orders', { cache: 'no-store' })
      const listPayload = await listResponse.json() as { orders?: AnimilairOrder[] }
      if (listResponse.ok) {
        const nextOrders = Array.isArray(listPayload.orders) ? listPayload.orders : []
        setOrders(nextOrders)
        setSelectedId((currentSelected) => {
          if (currentSelected !== orderId) return currentSelected
          const nextActive = nextOrders.find((order) => !isAnimilairOrderClosed(order.status))
          return nextActive?.id ?? nextOrders[0]?.id ?? null
        })
      } else {
        setOrders((current) => {
          const nextOrders = current.filter((order) => order.id !== orderId)
          setSelectedId((currentSelected) => {
            if (currentSelected !== orderId) return currentSelected
            const nextActive = nextOrders.find((order) => !isAnimilairOrderClosed(order.status))
            return nextActive?.id ?? nextOrders[0]?.id ?? null
          })
          return nextOrders
        })
      }
    } catch (archiveError) {
      window.alert(archiveError instanceof Error ? archiveError.message : 'Помилка')
    } finally {
      setBusy(false)
    }
  }

  const renderArchiveControl = (orderId: number) => (
    <span
      className="animilair-order-archive"
      role="button"
      tabIndex={busy ? -1 : 0}
      aria-label="Прибрати зі списку"
      aria-disabled={busy}
      onClick={(event) => {
        event.stopPropagation()
        if (busy) return
        void archiveOrder(orderId)
      }}
      onKeyDown={(event) => {
        if (busy) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          event.stopPropagation()
          void archiveOrder(orderId)
        }
      }}
    >
      ×
    </span>
  )

  const renderOrderThumb = (order: AnimilairOrder) => {
    const cover = getOrderCoverUrl(order)
    return (
      <span className="animilair-order-thumb" aria-hidden="true">
        {cover ? (
          <img src={cover} alt="" />
        ) : (
          <span>{order.productTitle.slice(0, 1).toUpperCase()}</span>
        )}
      </span>
    )
  }

  const renderCustomerOrderItem = (order: AnimilairOrder) => (
    <button
      key={order.id}
      type="button"
      className={`animilair-order-item compact${order.id === selectedId ? ' active' : ''}`}
      onClick={() => setSelectedId(order.id)}
    >
      {renderOrderThumb(order)}
      <span className="animilair-order-item-body">
        <strong>{order.productTitle}</strong>
        <small>{formatAnimilairDate(order.updatedAt)}</small>
        <small>Дизайнер: {order.authorName}</small>
      </span>
      <span className="animilair-order-status inline">{animilairStatusLabel(order.status)}</span>
    </button>
  )

  const renderDesignerGroupItem = (group: ReturnType<typeof groupAnimilairActiveOrdersByProduct>[number]) => {
    const order = group.primaryOrder
    const cover = getOrderCoverUrl(order)
    return (
      <button
        key={group.productId}
        type="button"
        className={`animilair-order-item compact${order.id === selectedId ? ' active' : ''}`}
        onClick={() => setSelectedId(order.id)}
      >
        <span className="animilair-order-thumb" aria-hidden="true">
          {cover ? (
            <img src={cover} alt="" />
          ) : (
            <span>{group.productTitle.slice(0, 1).toUpperCase()}</span>
          )}
        </span>
        <span className="animilair-order-item-body">
          <strong>{group.productTitle}</strong>
          <small>{formatAnimilairDate(order.updatedAt)}</small>
          <small>Клієнт: {order.customerName}</small>
        </span>
        {group.activeCount > 1 ? (
          <span className="animilair-order-count" aria-label={`${group.activeCount} активних чатів`}>
            {group.activeCount}
          </span>
        ) : (
          <span className="animilair-order-status inline">{animilairStatusLabel(order.status)}</span>
        )}
      </button>
    )
  }

  const renderClosedOrderItem = (order: AnimilairOrder) => (
    <button
      key={order.id}
      type="button"
      className={`animilair-order-item compact closed${order.id === selectedId ? ' active' : ''}`}
      onClick={() => setSelectedId(order.id)}
    >
      {renderArchiveControl(order.id)}
      {renderOrderThumb(order)}
      <span className="animilair-order-item-body">
        <strong>{order.productTitle}</strong>
        <small>{formatAnimilairDate(order.updatedAt)}</small>
        <small>
          {order.customerId === initialUser.id
            ? `Дизайнер: ${order.authorName}`
            : `Клієнт: ${order.customerName}`}
        </small>
      </span>
      <span className="animilair-order-status inline">{animilairStatusLabel(order.status)}</span>
    </button>
  )

  const hasVisibleOrders = activeOrders.length > 0 || closedOrders.length > 0

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
          <Link href="/partners/animilair" className="page-back-link">
            <span aria-hidden="true">←</span>
            До маркетплейсу
          </Link>
        </div>

        {!hasVisibleOrders ? (
          <section className="set-card animilair-empty-orders">
            <h2>Замовлень поки немає</h2>
            <p>Оберіть послугу AnimiLair Studio та створіть перше замовлення. Після цього тут зʼявиться чат.</p>
            <Link href="/partners/animilair#works" className="btn btn-primary">Переглянути послуги</Link>
          </section>
        ) : (
          <section className="animilair-orders-layout">
            <aside className="animilair-order-list">
              {isDesignerSidebar ? (
                productGroups.length > 0 ? (
                  productGroups.map((group) => renderDesignerGroupItem(group))
                ) : (
                  <p className="animilair-order-list-empty">Активних чатів немає.</p>
                )
              ) : (
                activeOrders.map((order) => renderCustomerOrderItem(order))
              )}

              {closedOrders.length > 0 && (
                <div className="animilair-order-closed-section">
                  <button
                    type="button"
                    className="animilair-order-closed-toggle"
                    onClick={() => setShowClosed((open) => !open)}
                    aria-expanded={showClosed}
                  >
                    Завершені ({closedOrders.length})
                    <span aria-hidden="true">{showClosed ? '▾' : '▸'}</span>
                  </button>
                  {showClosed && closedOrders.map((order) => renderClosedOrderItem(order))}
                </div>
              )}
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
