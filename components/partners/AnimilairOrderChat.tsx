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
import type { AnimilairAuthor, AnimilairMessageAttachment, AnimilairOrder, AnimilairOrderMessage } from '@/lib/animilair-shared'

const CHAT_POLL_MS = 2000
const PRESENCE_POLL_MS = 30000

type ProductPreview = {
  productId: number
  author: AnimilairAuthor
  canEditWelcome: boolean
}

type Props = {
  user: AuthUser | null
  orders: AnimilairOrder[]
  activeOrderId: number | null
  onActiveOrderIdChange?: (orderId: number) => void
  onOrdersChange?: (orders: AnimilairOrder[]) => void
  onOrderCreated?: (order: AnimilairOrder) => void
  onAuthorUpdated?: (author: AnimilairAuthor) => void
  initialMessages?: AnimilairOrderMessage[]
  embedded?: boolean
  productPreview?: ProductPreview
  onLoginRequest?: () => void
}

export function AnimilairOrderChat({
  user,
  orders,
  activeOrderId,
  onActiveOrderIdChange,
  onOrdersChange,
  onOrderCreated,
  onAuthorUpdated,
  initialMessages = [],
  embedded = false,
  productPreview,
  onLoginRequest,
}: Props) {
  const [messages, setMessages] = useState<AnimilairOrderMessage[]>(initialMessages)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState(productPreview?.author.welcomeMessage || '')
  const [isOnline, setIsOnline] = useState(productPreview?.author.isOnline || false)
  const [editingWelcome, setEditingWelcome] = useState(false)
  const [welcomeDraft, setWelcomeDraft] = useState(productPreview?.author.welcomeMessage || '')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastMessageIdRef = useRef(initialMessages.at(-1)?.id || 0)
  const sendingRef = useRef(false)
  const loadRequestRef = useRef(0)
  const messagesLengthRef = useRef(initialMessages.length)

  const activeOrder = orders.find((order) => order.id === activeOrderId) || null
  const role = String(user?.user_metadata.role || '').toUpperCase()
  const isAdmin = role === 'ADMIN'
  const isDesignerForSelected = Boolean(
    activeOrder
      ? activeOrder.authorUserId === user?.id
      : productPreview?.canEditWelcome
  )
  const isCustomerForSelected = Boolean(activeOrder && activeOrder.customerId === user?.id)
  const author = productPreview?.author || null
  const showWelcome = Boolean(productPreview && welcomeMessage)

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' })
  }, [])

  const loadMessages = useCallback(async (orderId: number, silent = false) => {
    if (!user) return
    const requestId = ++loadRequestRef.current
    if (!silent) setError('')
    try {
      const response = await fetch(`/api/partners/animilair/orders/${orderId}/messages`, { cache: 'no-store' })
      const payload = await response.json() as { messages?: AnimilairOrderMessage[]; error?: string }
      if (requestId !== loadRequestRef.current) return
      if (!response.ok) {
        if (!silent) setError(payload.error || 'Не вдалося завантажити повідомлення')
        return
      }
      const nextMessages = Array.isArray(payload.messages) ? payload.messages : []
      const latestId = nextMessages.at(-1)?.id || 0
      if (silent && sendingRef.current) return
      if (silent && latestId === lastMessageIdRef.current && nextMessages.length === messagesLengthRef.current) return
      lastMessageIdRef.current = latestId
      messagesLengthRef.current = nextMessages.length
      setMessages(nextMessages)
      if (latestId > 0) {
        requestAnimationFrame(() => scrollToBottom(!silent))
      }
    } catch {
      if (requestId !== loadRequestRef.current) return
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

  const refreshPresence = useCallback(async () => {
    const authorUserId = author?.userId
    if (!authorUserId) return
    try {
      const response = await fetch(`/api/partners/animilair/presence?authorUserId=${encodeURIComponent(authorUserId)}`, {
        cache: 'no-store',
      })
      const payload = await response.json() as { isOnline?: boolean }
      if (response.ok) setIsOnline(Boolean(payload.isOnline))
    } catch {
      // ignore
    }
  }, [author?.userId])

  const ensureOrder = useCallback(async (): Promise<number | null> => {
    if (!user || !productPreview) return activeOrderId
    if (activeOrderId) return activeOrderId
    const response = await fetch('/api/partners/animilair/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: productPreview.productId, ensure: true }),
    })
    const payload = await response.json() as { order?: AnimilairOrder; error?: string }
    if (!response.ok || !payload.order?.id) {
      throw new Error(payload.error || 'Не вдалося створити замовлення')
    }
    onOrderCreated?.(payload.order)
    onActiveOrderIdChange?.(payload.order.id)
    return payload.order.id
  }, [activeOrderId, onActiveOrderIdChange, onOrderCreated, productPreview, user])

  useEffect(() => {
    setWelcomeMessage(productPreview?.author.welcomeMessage || '')
    setWelcomeDraft(productPreview?.author.welcomeMessage || '')
    setIsOnline(productPreview?.author.isOnline || false)
  }, [productPreview?.author.welcomeMessage, productPreview?.author.isOnline])

  useEffect(() => {
    if (!activeOrderId || !user || sendingRef.current) return
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

  useEffect(() => {
    if (!author?.userId) return
    void refreshPresence()
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void refreshPresence()
    }, PRESENCE_POLL_MS)
    return () => window.clearInterval(interval)
  }, [author?.userId, refreshPresence])

  useEffect(() => {
    if (!user || !productPreview?.canEditWelcome) return
    void fetch('/api/partners/animilair/presence', { method: 'POST' })
  }, [productPreview?.canEditWelcome, user])

  const send = async (payload: { body: string; attachments: AnimilairMessageAttachment[] }) => {
    if (!user) {
      onLoginRequest?.()
      return
    }
    if (!payload.body && payload.attachments.length === 0) return
    setBusy(true)
    setError('')
    sendingRef.current = true
    try {
      let orderId = activeOrderId
      if (!orderId && productPreview) {
        orderId = await ensureOrder()
      }
      if (!orderId) return

      const response = await fetch(`/api/partners/animilair/orders/${orderId}/messages`, {
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
      messagesLengthRef.current = nextMessages.length
      setMessages(nextMessages)
      void reloadOrders()
      requestAnimationFrame(() => scrollToBottom())
      void loadMessages(orderId, false)
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Помилка повідомлення')
    } finally {
      sendingRef.current = false
      setBusy(false)
    }
  }

  const saveWelcome = async () => {
    if (!author || !productPreview?.canEditWelcome) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/partners/animilair/authors/welcome', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorId: author.id, welcomeMessage: welcomeDraft }),
      })
      const payload = await response.json() as { author?: AnimilairAuthor; error?: string }
      if (!response.ok || !payload.author) {
        throw new Error(payload.error || 'Не вдалося зберегти вітання')
      }
      setWelcomeMessage(payload.author.welcomeMessage)
      setWelcomeDraft(payload.author.welcomeMessage)
      onAuthorUpdated?.(payload.author)
      setEditingWelcome(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Помилка збереження')
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
  const avatarUrl = author?.avatarUrl || ''
  const authorName = author?.name || activeOrder?.authorName || 'Дизайнер'
  const canCompose = Boolean(
    user && (
      !activeOrder
        ? productPreview && !productPreview.canEditWelcome
        : !['completed', 'canceled'].includes(activeOrder.status)
    )
  )

  const authorHeader = author ? (
    <header className="animilair-chat-author-head">
      <div className="animilair-chat-author-profile">
        <span className={`animilair-chat-avatar-wrap${isOnline ? ' online' : ''}`}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" />
          ) : (
            <span className="animilair-message-avatar">{animilairUserInitials(authorName)}</span>
          )}
        </span>
        <div>
          <strong>{authorName}</strong>
          <p>{author.role || 'Designer'}</p>
          <span className={`animilair-chat-presence${isOnline ? ' online' : ''}`}>
            {isOnline ? 'онлайн' : 'офлайн'}
          </span>
        </div>
      </div>
      {productPreview?.canEditWelcome && (
        <button
          type="button"
          className="btn btn-secondary animilair-welcome-edit-btn"
          disabled={busy}
          onClick={() => setEditingWelcome((open) => !open)}
        >
          {editingWelcome ? 'Закрити' : 'Редагувати вітання'}
        </button>
      )}
    </header>
  ) : null

  if (!user && productPreview) {
    return (
      <div className={cardClass}>
        {authorHeader}
        {showWelcome && (
          <article className="animilair-message welcome">
            <span className="animilair-message-avatar">{animilairUserInitials(authorName)}</span>
            <div>
              <div className="animilair-message-meta">
                <strong>{authorName}</strong>
                <span>вітання</span>
              </div>
              <p>{welcomeMessage}</p>
            </div>
          </article>
        )}
        <div className="animilair-detail-chat-placeholder compact">
          <p>Увійдіть, щоб написати дизайнеру та обговорити замовлення.</p>
          <button type="button" className="btn btn-primary" onClick={onLoginRequest}>
            Увійти
          </button>
        </div>
      </div>
    )
  }

  if (!user && !productPreview) {
    return (
      <div className={cardClass}>
        <div className="animilair-detail-chat-placeholder">
          <strong>Чат з дизайнером</strong>
          <p>Увійдіть в акаунт, щоб обговорити замовлення.</p>
          <button type="button" className="btn btn-primary" onClick={onLoginRequest}>
            Увійти
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cardClass}>
      {authorHeader}

      {editingWelcome && productPreview?.canEditWelcome && (
        <div className="animilair-welcome-editor">
          <label>
            Вітальне повідомлення для клієнтів
            <textarea
              rows={4}
              value={welcomeDraft}
              onChange={(event) => setWelcomeDraft(event.target.value)}
              maxLength={600}
            />
          </label>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void saveWelcome()}>
            Зберегти вітання
          </button>
        </div>
      )}

      {activeOrder && !productPreview && (
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
      )}

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

      {activeOrder && (
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
      )}

      <div className={`animilair-chat-messages${embedded ? ' embedded' : ''}`}>
        {showWelcome && author && (
          <article className="animilair-message welcome">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" />
            ) : (
              <span className="animilair-message-avatar">{animilairUserInitials(authorName)}</span>
            )}
            <div>
              <div className="animilair-message-meta">
                <strong>{authorName}</strong>
                <span>вітання</span>
              </div>
              <p>{welcomeMessage}</p>
            </div>
          </article>
        )}

        {messages.map((message) => {
          const own = !message.isSystem && message.userId === user?.id
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

        {messages.length === 0 && !showWelcome && (
          <p className="animilair-chat-empty">Напишіть перше повідомлення — обговоріть ТЗ прямо тут.</p>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && <div className="animilair-form-message error animilair-chat-error">{error}</div>}

      {canCompose ? (
        <AnimilairChatCompose busy={busy} onSend={send} />
      ) : productPreview?.canEditWelcome && !activeOrder ? (
        <div className="animilair-detail-chat-closed">Очікуйте повідомлення від клієнта або оберіть замовлення вище.</div>
      ) : activeOrder && ['completed', 'canceled'].includes(activeOrder.status) ? (
        <div className="animilair-detail-chat-closed">Замовлення закрито. Нові повідомлення недоступні.</div>
      ) : null}
    </div>
  )
}
