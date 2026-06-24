'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimilairChatCompose } from '@/components/partners/AnimilairChatCompose'
import { AnimilairMessageContent } from '@/components/partners/AnimilairMessageContent'
import {
  animilairStatusLabel,
  animilairUserInitials,
  formatAnimilairDate,
} from '@/components/partners/animilair-chat-utils'
import type { AuthUser } from '@/lib/auth-db'
import type { AnimilairMessageAttachment, AnimilairOrder, AnimilairOrderMessage } from '@/lib/animilair-shared'

const CHAT_POLL_MS = 4000

type Props = {
  user: AuthUser | null
  orders: AnimilairOrder[]
  activeOrderId: number | null
  onActiveOrderIdChange?: (orderId: number) => void
  onOrdersChange?: (orders: AnimilairOrder[]) => void
  initialMessages?: AnimilairOrderMessage[]
  embedded?: boolean
  onLoginRequest?: () => void
}

export function AnimilairOrderChat({
  user,
  orders,
  activeOrderId,
  onActiveOrderIdChange,
  onOrdersChange,
  initialMessages = [],
  embedded = false,
  onLoginRequest,
}: Props) {
  const [messages, setMessages] = useState<AnimilairOrderMessage[]>(initialMessages)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastMessageIdRef = useRef(initialMessages.at(-1)?.id || 0)

  const activeOrder = orders.find((order) => order.id === activeOrderId) || null
  const role = String(user?.user_metadata.role || '').toUpperCase()
  const isAdmin = role === 'ADMIN'
  const isDesignerForSelected = Boolean(activeOrder && activeOrder.authorUserId === user?.id)
  const isCustomerForSelected = Boolean(activeOrder && activeOrder.customerId === user?.id)

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' })
  }, [])

  const loadMessages = useCallback(async (orderId: number, silent = false) => {
    if (!user) return
    if (!silent) setError('')
    try {
      const response = await fetch(`/api/partners/animilair/orders/${orderId}/messages`, { cache: 'no-store' })
      const payload = await response.json() as { messages?: AnimilairOrderMessage[]; error?: string }
      if (!response.ok) {
        if (!silent) setError(payload.error || 'Не вдалося завантажити повідомлення')
        return
      }
      const nextMessages = Array.isArray(payload.messages) ? payload.messages : []
      const latestId = nextMessages.at(-1)?.id || 0
      if (latestId !== lastMessageIdRef.current) {
        lastMessageIdRef.current = latestId
        setMessages(nextMessages)
        if (latestId > 0) {
          requestAnimationFrame(() => scrollToBottom(!silent))
        }
      } else if (!silent) {
        setMessages(nextMessages)
      }
    } catch {
      if (!silent) setError('Не вдалося завантажити повідомлення')
    }
  }, [scrollToBottom, user])

  const reloadOrders = useCallback(async () => {
    if (!user) return
    const response = await fetch('/api/partners/animilair/orders', { cache: 'no-store' })
    if (!response.ok) return
    const payload = await response.json() as { orders?: AnimilairOrder[] }
    const nextOrders = Array.isArray(payload.orders) ? payload.orders : []
    onOrdersChange?.(nextOrders)
  }, [onOrdersChange, user])

  useEffect(() => {
    if (!activeOrderId || !user) return
    void loadMessages(activeOrderId)
  }, [activeOrderId, loadMessages, user])

  useEffect(() => {
    if (!activeOrderId || !user) return
    const tick = () => {
      if (document.visibilityState !== 'visible') return
      void loadMessages(activeOrderId, true)
      void reloadOrders()
    }
    const interval = window.setInterval(tick, CHAT_POLL_MS)
    return () => window.clearInterval(interval)
  }, [activeOrderId, loadMessages, reloadOrders, user])

  const send = async (payload: { body: string; attachments: AnimilairMessageAttachment[] }) => {
    if (!activeOrderId || !user) return
    if (!payload.body && payload.attachments.length === 0) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/partners/animilair/orders/${activeOrderId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json() as { messages?: AnimilairOrderMessage[]; error?: string }
      if (!response.ok) {
        throw new Error(result.error || 'Не вдалося надіслати повідомлення')
      }
      const nextMessages = Array.isArray(result.messages) ? result.messages : []
      lastMessageIdRef.current = nextMessages.at(-1)?.id || lastMessageIdRef.current
      setMessages(nextMessages)
      void reloadOrders()
      requestAnimationFrame(() => scrollToBottom())
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Помилка повідомлення')
    } finally {
      setBusy(false)
    }
  }

  const updateStatus = async (status: string) => {
    if (!activeOrderId || !user) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/partners/animilair/orders/${activeOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const payload = await response.json() as { order?: AnimilairOrder; error?: string }
      if (!response.ok || !payload.order) {
        throw new Error(payload.error || 'Не вдалося оновити статус')
      }
      onOrdersChange?.(orders.map((order) => order.id === payload.order?.id ? payload.order : order))
      await loadMessages(activeOrderId)
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Помилка статусу')
    } finally {
      setBusy(false)
    }
  }

  const cardClass = `animilair-chat-card${embedded ? ' animilair-detail-chat-panel' : ''}`

  if (!user) {
    return (
      <div className={cardClass}>
        <div className="animilair-detail-chat-placeholder">
          <strong>Чат з дизайнером</strong>
          <p>Увійдіть в акаунт, щоб обговорити замовлення прямо тут — без переходу на іншу сторінку.</p>
          <button type="button" className="btn btn-primary" onClick={onLoginRequest}>
            Увійти
          </button>
        </div>
      </div>
    )
  }

  if (!activeOrder) {
    return (
      <div className={cardClass}>
        <div className="animilair-detail-chat-placeholder">
          <strong>Чат відкриється після заявки</strong>
          <p>Заповніть ТЗ зліва та натисніть «Створити замовлення». Листування з дизайнером зʼявиться тут одразу.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cardClass}>
      <header className="animilair-chat-head">
        <div>
          <span className="animilair-eyebrow">Замовлення #{activeOrder.id}</span>
          <h2>{activeOrder.title}</h2>
          <p>
            {isCustomerForSelected ? `Дизайнер: ${activeOrder.authorName}` : `Клієнт: ${activeOrder.customerName}`}
            {' · '}
            {animilairStatusLabel(activeOrder.status)}
          </p>
        </div>
        <span className="animilair-order-status large">{animilairStatusLabel(activeOrder.status)}</span>
      </header>

      {orders.length > 1 && (
        <div className="animilair-detail-chat-orders">
          {orders.map((order) => (
            <button
              key={order.id}
              type="button"
              className={`animilair-detail-chat-order${order.id === activeOrderId ? ' active' : ''}`}
              onClick={() => onActiveOrderIdChange?.(order.id)}
            >
              #{order.id} · {order.customerName}
            </button>
          ))}
        </div>
      )}

      <div className="animilair-order-actions">
        {(isAdmin || isDesignerForSelected) && activeOrder.status === 'new' && (
          <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void updateStatus('in_progress')}>
            Прийняти замовлення
          </button>
        )}
        {(isAdmin || isDesignerForSelected) && activeOrder.status === 'in_progress' && (
          <>
            <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void updateStatus('waiting_customer')}>
              Чекаю відповідь
            </button>
            <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void updateStatus('completed')}>
              Завершити
            </button>
          </>
        )}
        {isCustomerForSelected && !['completed', 'canceled'].includes(activeOrder.status) && (
          <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void updateStatus('canceled')}>
            Скасувати
          </button>
        )}
      </div>

      <div className={`animilair-chat-messages${embedded ? ' embedded' : ''}`}>
        {messages.map((message) => {
          const own = !message.isSystem && message.userId === user.id
          return (
            <article key={message.id} className={`animilair-message${own ? ' own' : ''}${message.isSystem ? ' system' : ''}`}>
              {message.authorAvatarUrl ? (
                <img src={message.authorAvatarUrl} alt="" />
              ) : (
                <span className="animilair-message-avatar">{animilairUserInitials(message.authorName)}</span>
              )}
              <div>
                <div className="animilair-message-meta">
                  <strong>{message.authorName}</strong>
                  <span>{formatAnimilairDate(message.createdAt)}</span>
                </div>
                <AnimilairMessageContent body={message.body} attachments={message.attachments} />
              </div>
            </article>
          )
        })}
        {messages.length === 0 && <p className="animilair-chat-empty">Напишіть перше повідомлення в чаті.</p>}
        <div ref={messagesEndRef} />
      </div>

      {error && <div className="animilair-form-message error animilair-chat-error">{error}</div>}

      {!['completed', 'canceled'].includes(activeOrder.status) ? (
        <AnimilairChatCompose busy={busy} onSend={send} />
      ) : (
        <div className="animilair-detail-chat-closed">Замовлення закрито. Нові повідомлення недоступні.</div>
      )}
    </div>
  )
}
