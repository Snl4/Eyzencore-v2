'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { AnimilairChatCompose } from '@/components/partners/AnimilairChatCompose'
import { AnimilairMessageContent } from '@/components/partners/AnimilairMessageContent'
import type { AuthUser } from '@/lib/auth-db'
import type { AnimilairMessageAttachment, AnimilairOrder, AnimilairOrderMessage } from '@/lib/animilair-shared'

type Props = {
  initialUser: AuthUser
  initialOrders: AnimilairOrder[]
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    new: 'Нове',
    in_progress: 'В роботі',
    waiting_customer: 'Чекає відповіді',
    completed: 'Готово',
    canceled: 'Скасовано',
  }
  return labels[status] || status
}

function userInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'EC'
}

export function AnimilairOrdersClient({ initialUser, initialOrders }: Props) {
  const searchParams = useSearchParams()
  const queryOrder = Number(searchParams.get('order') || 0)
  const initialSelected = initialOrders.some((order) => order.id === queryOrder)
    ? queryOrder
    : initialOrders[0]?.id || null
  const [orders, setOrders] = useState(initialOrders)
  const [selectedId, setSelectedId] = useState<number | null>(initialSelected)
  const [messages, setMessages] = useState<AnimilairOrderMessage[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const selected = useMemo(
    () => orders.find((order) => order.id === selectedId) || null,
    [orders, selectedId]
  )
  const role = String(initialUser.user_metadata.role || '').toUpperCase()
  const isAdmin = role === 'ADMIN'
  const isDesignerForSelected = Boolean(selected && selected.authorUserId === initialUser.id)
  const isCustomerForSelected = Boolean(selected && selected.customerId === initialUser.id)

  const reloadOrders = async () => {
    const response = await fetch('/api/partners/animilair/orders', { cache: 'no-store' })
    if (!response.ok) return
    const payload = await response.json() as { orders?: AnimilairOrder[] }
    const nextOrders = Array.isArray(payload.orders) ? payload.orders : []
    setOrders(nextOrders)
    setSelectedId((current) => {
      if (current && nextOrders.some((order) => order.id === current)) return current
      return nextOrders[0]?.id || null
    })
  }

  const loadMessages = async (orderId: number) => {
    setError('')
    const response = await fetch(`/api/partners/animilair/orders/${orderId}/messages`, { cache: 'no-store' })
    const payload = await response.json() as { messages?: AnimilairOrderMessage[]; error?: string }
    if (!response.ok) {
      setError(payload.error || 'Не вдалося завантажити повідомлення')
      return
    }
    setMessages(Array.isArray(payload.messages) ? payload.messages : [])
  }

  useEffect(() => {
    if (!selectedId) return
    void loadMessages(selectedId)
  }, [selectedId])

  const send = async (payload: { body: string; attachments: AnimilairMessageAttachment[] }) => {
    if (!selectedId) return
    if (!payload.body && payload.attachments.length === 0) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/partners/animilair/orders/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json() as { messages?: AnimilairOrderMessage[]; error?: string }
      if (!response.ok) {
        throw new Error(result.error || 'Не вдалося надіслати повідомлення')
      }
      setMessages(Array.isArray(result.messages) ? result.messages : [])
      void reloadOrders()
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Помилка повідомлення')
    } finally {
      setBusy(false)
    }
  }

  const updateStatus = async (status: string) => {
    if (!selectedId) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/partners/animilair/orders/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const payload = await response.json() as { order?: AnimilairOrder; error?: string }
      if (!response.ok || !payload.order) {
        throw new Error(payload.error || 'Не вдалося оновити статус')
      }
      setOrders((current) => current.map((order) => order.id === payload.order?.id ? payload.order : order))
      await loadMessages(selectedId)
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Помилка статусу')
    } finally {
      setBusy(false)
    }
  }

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
                  <span className="animilair-order-status">{statusLabel(order.status)}</span>
                  <strong>{order.title}</strong>
                  <small>{order.productTitle} · {formatDate(order.updatedAt)}</small>
                  <small>{order.customerId === initialUser.id ? `Дизайнер: ${order.authorName}` : `Клієнт: ${order.customerName}`}</small>
                </button>
              ))}
            </aside>

            <div className="animilair-chat-card">
              {selected ? (
                <>
                  <header className="animilair-chat-head">
                    <div>
                      <span className="animilair-eyebrow">Замовлення #{selected.id}</span>
                      <h2>{selected.title}</h2>
                      <p>{selected.productTitle} · {statusLabel(selected.status)}</p>
                    </div>
                    <span className="animilair-order-status large">{statusLabel(selected.status)}</span>
                  </header>

                  <div className="animilair-order-actions">
                    {(isAdmin || isDesignerForSelected) && selected.status === 'new' && (
                      <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void updateStatus('in_progress')}>
                        Прийняти замовлення
                      </button>
                    )}
                    {(isAdmin || isDesignerForSelected) && selected.status === 'in_progress' && (
                      <>
                        <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void updateStatus('waiting_customer')}>
                          Чекаю відповідь
                        </button>
                        <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void updateStatus('completed')}>
                          Завершити
                        </button>
                      </>
                    )}
                    {isCustomerForSelected && !['completed', 'canceled'].includes(selected.status) && (
                      <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void updateStatus('canceled')}>
                        Скасувати
                      </button>
                    )}
                  </div>

                  <div className="animilair-chat-messages">
                    {messages.map((message) => {
                      const own = !message.isSystem && message.userId === initialUser.id
                      return (
                        <article key={message.id} className={`animilair-message${own ? ' own' : ''}${message.isSystem ? ' system' : ''}`}>
                          {message.authorAvatarUrl ? (
                            <img src={message.authorAvatarUrl} alt="" />
                          ) : (
                            <span className="animilair-message-avatar">{userInitials(message.authorName)}</span>
                          )}
                          <div>
                            <div className="animilair-message-meta">
                              <strong>{message.authorName}</strong>
                              <span>{formatDate(message.createdAt)}</span>
                            </div>
                            <AnimilairMessageContent body={message.body} attachments={message.attachments} />
                          </div>
                        </article>
                      )
                    })}
                    {messages.length === 0 && <p className="animilair-chat-empty">Повідомлень ще немає.</p>}
                  </div>

                  {error && <div className="animilair-form-message error">{error}</div>}

                  <AnimilairChatCompose busy={busy} onSend={send} />
                </>
              ) : (
                <p className="animilair-chat-empty">Оберіть замовлення.</p>
              )}
            </div>
          </section>
        )}
      </main>
    </PageShell>
  )
}
