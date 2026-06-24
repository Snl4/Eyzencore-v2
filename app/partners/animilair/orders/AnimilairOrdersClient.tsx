'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import type { AuthUser } from '@/lib/auth-db'
import type { AnimilairOrder, AnimilairOrderMessage } from '@/lib/animilair-db'
import { IMAGE_PLACEHOLDER } from '@/lib/placeholders'

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

export function AnimilairOrdersClient({ initialUser, initialOrders }: Props) {
  const [orders, setOrders] = useState(initialOrders)
  const [selectedId, setSelectedId] = useState<number | null>(initialOrders[0]?.id || null)
  const [messages, setMessages] = useState<AnimilairOrderMessage[]>([])
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const selected = useMemo(
    () => orders.find((order) => order.id === selectedId) || null,
    [orders, selectedId]
  )

  const reloadOrders = async () => {
    const response = await fetch('/api/partners/animilair/orders', { cache: 'no-store' })
    if (!response.ok) return
    const payload = await response.json() as { orders?: AnimilairOrder[] }
    const nextOrders = Array.isArray(payload.orders) ? payload.orders : []
    setOrders(nextOrders)
    setSelectedId((current) => current || nextOrders[0]?.id || null)
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

  const send = async () => {
    if (!selectedId || !body.trim()) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/partners/animilair/orders/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const payload = await response.json() as { messages?: AnimilairOrderMessage[]; error?: string }
      if (!response.ok) {
        throw new Error(payload.error || 'Не вдалося надіслати повідомлення')
      }
      setMessages(Array.isArray(payload.messages) ? payload.messages : [])
      setBody('')
      void reloadOrders()
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Помилка повідомлення')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell active="animilair" initialUser={initialUser}>
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
            <p>Оберіть послугу AnimiLair Studio та створіть перше замовлення. Після цього тут з’явиться чат.</p>
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

                  <div className="animilair-chat-messages">
                    {messages.map((message) => {
                      const own = message.userId === initialUser.id
                      return (
                        <article key={message.id} className={`animilair-message${own ? ' own' : ''}`}>
                          <img src={message.authorAvatarUrl || IMAGE_PLACEHOLDER} alt="" />
                          <div>
                            <div className="animilair-message-meta">
                              <strong>{message.authorName}</strong>
                              <span>{formatDate(message.createdAt)}</span>
                            </div>
                            <p>{message.body}</p>
                          </div>
                        </article>
                      )
                    })}
                    {messages.length === 0 && <p className="animilair-chat-empty">Повідомлень ще немає.</p>}
                  </div>

                  {error && <div className="animilair-form-message error">{error}</div>}

                  <div className="animilair-chat-compose">
                    <textarea
                      rows={3}
                      placeholder="Напишіть уточнення, посилання на референси або правки..."
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                    />
                    <button className="btn btn-primary" type="button" disabled={busy || !body.trim()} onClick={() => void send()}>
                      {busy ? 'Надсилаємо...' : 'Надіслати'}
                    </button>
                  </div>
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
