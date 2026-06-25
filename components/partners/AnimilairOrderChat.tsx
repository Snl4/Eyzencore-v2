'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimilairChatCompose } from '@/components/partners/AnimilairChatCompose'
import { AnimilairMessageContent } from '@/components/partners/AnimilairMessageContent'
import {
  animilairStatusLabel,
  animilairUserInitials,
  formatAnimilairDate,
} from '@/components/partners/animilair-chat-utils'
import type { AuthUser } from '@/lib/auth-db'
import type { AnimilairAuthor, AnimilairMessageAttachment, AnimilairOrder, AnimilairOrderMessage, AnimilairProductReview } from '@/lib/animilair-shared'
import { isAnimilairOrderClosed } from '@/lib/animilair-shared'
import { AnimilairRatingStars } from '@/components/partners/AnimilairRatingStars'

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
  onActiveOrderIdChange?: (orderId: number | null) => void
  onOrdersChange?: (orders: AnimilairOrder[]) => void
  onOrderCreated?: (order: AnimilairOrder) => void
  onAuthorUpdated?: (author: AnimilairAuthor) => void
  initialMessages?: AnimilairOrderMessage[]
  embedded?: boolean
  productPreview?: ProductPreview
  onLoginRequest?: () => void
  onReviewSubmitted?: () => void
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
  onReviewSubmitted,
}: Props) {
  const [messages, setMessages] = useState<AnimilairOrderMessage[]>(initialMessages)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [orderReview, setOrderReview] = useState<AnimilairProductReview | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewBody, setReviewBody] = useState('')
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
      ? activeOrder.authorUserId === user?.id || productPreview?.canEditWelcome
      : productPreview?.canEditWelcome
  )
  const isCustomerForSelected = Boolean(activeOrder && activeOrder.customerId === user?.id)
  const chatOrders = useMemo(() => {
    if (!productPreview) return orders
    if (productPreview.canEditWelcome || isAdmin) return orders
    return orders.filter((order) => order.customerId === user?.id)
  }, [isAdmin, orders, productPreview, user?.id])
  const reviewOrder = activeOrder?.status === 'completed' && isCustomerForSelected ? activeOrder : null
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
    if (activeOrderId && activeOrder && !isAnimilairOrderClosed(activeOrder.status)) {
      return activeOrderId
    }
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
  }, [activeOrder, activeOrderId, onActiveOrderIdChange, onOrderCreated, productPreview, user])

  const syncProductPageAfterClose = useCallback((closedOrder: AnimilairOrder) => {
    if (!productPreview) return
    if (closedOrder.status === 'completed' && closedOrder.customerId === user?.id) {
      return
    }
    const remaining = orders.filter((order) => order.id !== closedOrder.id)
    onOrdersChange?.(remaining)
    const nextActive = remaining.find((order) => !isAnimilairOrderClosed(order.status)) || null
    onActiveOrderIdChange?.(nextActive?.id ?? null)
    lastMessageIdRef.current = 0
    messagesLengthRef.current = 0
    setMessages([])
  }, [onActiveOrderIdChange, onOrdersChange, orders, productPreview, user?.id])

  useEffect(() => {
    const orderId = reviewOrder?.id
    if (!orderId || !user) {
      setOrderReview(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch(`/api/partners/animilair/orders/${orderId}/review`, { cache: 'no-store' })
        const payload = await response.json() as { review?: AnimilairProductReview | null }
        if (!cancelled && response.ok) {
          setOrderReview(payload.review || null)
        }
      } catch {
        if (!cancelled) setOrderReview(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reviewOrder?.id, user])

  const submitReview = async () => {
    const orderId = reviewOrder?.id
    if (!orderId || !user) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/partners/animilair/orders/${orderId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, body: reviewBody }),
      })
      const payload = await response.json() as { review?: AnimilairProductReview; error?: string }
      if (!response.ok || !payload.review) {
        throw new Error(payload.error || 'Не вдалося зберегти відгук')
      }
      setOrderReview(payload.review)
      setReviewBody('')
      onReviewSubmitted?.()
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Не вдалося зберегти відгук')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    setWelcomeMessage(productPreview?.author.welcomeMessage || '')
    setWelcomeDraft(productPreview?.author.welcomeMessage || '')
    setIsOnline(productPreview?.author.isOnline || false)
  }, [productPreview?.author.welcomeMessage, productPreview?.author.isOnline])

  useEffect(() => {
    if (!activeOrderId || !user || sendingRef.current) return
    if (activeOrder && isAnimilairOrderClosed(activeOrder.status) && productPreview?.canEditWelcome) return
    void loadMessages(activeOrderId)
  }, [activeOrder, activeOrderId, loadMessages, productPreview?.canEditWelcome, user])

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
      if (orderId && activeOrder && isAnimilairOrderClosed(activeOrder.status)) {
        orderId = null
      }
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
      if (productPreview && payload.order && isAnimilairOrderClosed(payload.order.status)) {
        syncProductPageAfterClose(payload.order)
        if (payload.order.status === 'completed' && payload.order.customerId === user?.id) {
          await loadMessages(payload.order.id)
        }
      } else if (activeOrderId) {
        await loadMessages(activeOrderId)
      }
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Помилка статусу')
    } finally {
      setBusy(false)
    }
  }

  const archiveOrder = async () => {
    if (!activeOrderId || !user) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/partners/animilair/orders/${activeOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      })
      const payload = await response.json() as { success?: boolean; error?: string }
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Не вдалося прибрати замовлення')
      }
      const listResponse = await fetch('/api/partners/animilair/orders', { cache: 'no-store' })
      if (listResponse.ok) {
        const listPayload = await listResponse.json() as { orders?: AnimilairOrder[] }
        const nextOrders = Array.isArray(listPayload.orders) ? listPayload.orders : []
        onOrdersChange?.(nextOrders)
        onActiveOrderIdChange?.(nextOrders[0]?.id ?? null)
      } else {
        const nextOrders = orders.filter((order) => order.id !== activeOrderId)
        onOrdersChange?.(nextOrders)
        onActiveOrderIdChange?.(nextOrders[0]?.id ?? null)
      }
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'Помилка')
    } finally {
      setBusy(false)
    }
  }

  const cardClass = `animilair-chat-card${embedded ? ' animilair-detail-chat-panel' : ''}`
  const avatarUrl = author?.avatarUrl || ''
  const authorName = author?.name || activeOrder?.authorName || 'Дизайнер'
  const canCompose = Boolean(
    user
    && (
      productPreview
        ? !productPreview.canEditWelcome && (!activeOrder || !isAnimilairOrderClosed(activeOrder.status))
        : activeOrder && !isAnimilairOrderClosed(activeOrder.status)
    )
  )
  const showReviewForm = Boolean(reviewOrder && !orderReview)

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

      {activeOrder && (
        <header className={`animilair-chat-head${productPreview ? ' compact' : ''}`}>
          <div>
            <span className="animilair-eyebrow">Замовлення #{activeOrder.id}</span>
            <h2>{activeOrder.title}</h2>
            <p>
              {isCustomerForSelected ? `Дизайнер: ${activeOrder.authorName}` : `Клієнт: ${activeOrder.customerName}`}
              {!productPreview && (
                <>
                  {' · '}
                  {animilairStatusLabel(activeOrder.status)}
                </>
              )}
            </p>
          </div>
          {!productPreview && (
            <span className="animilair-order-status large">{animilairStatusLabel(activeOrder.status)}</span>
          )}
        </header>
      )}

      {chatOrders.length > 1 && !productPreview && (
        <div className="animilair-detail-chat-orders">
          {chatOrders.map((order) => (
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
        <div className="animilair-order-status-bar">
          <div className="animilair-order-status-bar-head">
            <strong>Керування замовленням</strong>
            <span className="animilair-order-status">{animilairStatusLabel(activeOrder.status)}</span>
          </div>
          <div className="animilair-order-actions">
            {(isAdmin || isDesignerForSelected) && activeOrder.status === 'new' && (
              <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void updateStatus('in_progress')}>
                Прийняти в роботу
              </button>
            )}
            {(isAdmin || isDesignerForSelected) && activeOrder.status === 'in_progress' && (
              <>
                <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void updateStatus('waiting_customer')}>
                  Чекаю відповідь
                </button>
                <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void updateStatus('awaiting_confirmation')}>
                  Роботу завершено
                </button>
              </>
            )}
            {(isAdmin || isDesignerForSelected) && activeOrder.status === 'waiting_customer' && (
              <>
                <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void updateStatus('in_progress')}>
                  В роботі
                </button>
                <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void updateStatus('awaiting_confirmation')}>
                  Роботу завершено
                </button>
              </>
            )}
            {(isAdmin || isDesignerForSelected) && activeOrder.status === 'awaiting_confirmation' && (
              <p className="animilair-order-status-hint">Очікуємо підтвердження від клієнта.</p>
            )}
            {isCustomerForSelected && activeOrder.status === 'awaiting_confirmation' && (
              <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void updateStatus('completed')}>
                Підтвердити виконання
              </button>
            )}
            {isCustomerForSelected && !isAnimilairOrderClosed(activeOrder.status) && (
              <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void updateStatus('canceled')}>
                Скасувати
              </button>
            )}
          </div>
        </div>
      )}

      {showReviewForm && (
        <div className="animilair-review-form">
          <strong>Залиште відгук про послугу</strong>
          <p>Оцініть роботу дизайнера від 1 до 5 зірок.</p>
          <AnimilairRatingStars value={reviewRating} onChange={setReviewRating} />
          <label>
            Коментар (необовʼязково)
            <textarea
              rows={3}
              value={reviewBody}
              onChange={(event) => setReviewBody(event.target.value)}
              maxLength={2000}
              placeholder="Що сподобалось або що можна покращити"
            />
          </label>
          <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void submitReview()}>
            Надіслати відгук
          </button>
        </div>
      )}

      {orderReview && (
        <div className="animilair-review-summary">
          <strong>Ваш відгук збережено</strong>
          <AnimilairRatingStars value={orderReview.rating} size="sm" />
          {orderReview.body ? <p>{orderReview.body}</p> : null}
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
          <p className="animilair-chat-empty">
            {productPreview && !productPreview.canEditWelcome && !activeOrder
              ? 'Напишіть повідомлення — створиться нове замовлення, і дизайнер відповість у чаті.'
              : 'Напишіть перше повідомлення — обговоріть ТЗ прямо тут.'}
          </p>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && <div className="animilair-form-message error animilair-chat-error">{error}</div>}

      {canCompose ? (
        <AnimilairChatCompose busy={busy} onSend={send} />
      ) : productPreview?.canEditWelcome && !activeOrder ? (
        <div className="animilair-detail-chat-closed">Очікуйте повідомлення від клієнта або оберіть замовлення вище.</div>
      ) : activeOrder && isAnimilairOrderClosed(activeOrder.status) && !productPreview ? (
        <div className="animilair-detail-chat-closed">
          <p>Замовлення закрито. Нові повідомлення недоступні.</p>
          <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void archiveOrder()}>
            Прибрати зі списку
          </button>
        </div>
      ) : null}
    </div>
  )
}
