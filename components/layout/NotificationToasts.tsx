'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Icons } from '@/components/ui/Icons'

type NotificationToast = {
  id: number
  serverId: number | null
  type: string
  title: string
  body: string
  createdAt: string
}

const DISPLAY_TIME = 8000
const POLL_TIME = 15000

export function NotificationToasts() {
  const [items, setItems] = useState<NotificationToast[]>([])
  const shownIds = useRef(new Set<number>())
  const timers = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
    const timer = timers.current.get(id)
    if (timer) window.clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  const markRead = useCallback(async (ids: number[]) => {
    if (ids.length === 0) return
    await fetch('/api/auth/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    }).catch(() => undefined)
  }, [])

  const load = useCallback(async () => {
    const response = await fetch('/api/auth/notifications', { cache: 'no-store' }).catch(() => null)
    if (!response?.ok) return

    const data = await response.json().catch(() => null) as { notifications?: NotificationToast[] } | null
    const incoming = (data?.notifications || []).filter((item) => !shownIds.current.has(item.id))
    if (incoming.length === 0) return

    incoming.forEach((item) => {
      shownIds.current.add(item.id)
      const timer = window.setTimeout(() => dismiss(item.id), DISPLAY_TIME)
      timers.current.set(item.id, timer)
    })
    setItems((current) => [...current, ...incoming].slice(-4))
    void markRead(incoming.map((item) => item.id))
  }, [dismiss, markRead])

  useEffect(() => {
    const activeTimers = timers.current
    void load()
    const interval = window.setInterval(() => void load(), POLL_TIME)
    const handleFocus = () => void load()
    window.addEventListener('focus', handleFocus)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      activeTimers.forEach((timer) => window.clearTimeout(timer))
      activeTimers.clear()
    }
  }, [load])

  if (items.length === 0) return null

  return (
    <div className="notification-toast-stack" aria-live="polite" aria-atomic="false">
      {items.map((item) => {
        const content = (
          <>
            <span className={`notification-toast-icon type-${item.type}`}>
              {Icons.bell}
            </span>
            <span className="notification-toast-copy">
              <span className="notification-toast-meta">Нове сповіщення</span>
              <strong>{item.title}</strong>
              <span>{item.body}</span>
            </span>
          </>
        )

        return (
          <article className="notification-toast" key={item.id}>
            {item.serverId ? (
              <Link href={`/servers/${item.serverId}`} onClick={() => dismiss(item.id)}>
                {content}
              </Link>
            ) : (
              <div className="notification-toast-content">{content}</div>
            )}
            <button
              type="button"
              className="notification-toast-close"
              aria-label="Закрити сповіщення"
              onClick={() => dismiss(item.id)}
            >
              {Icons.x}
            </button>
            <span className="notification-toast-progress" />
          </article>
        )
      })}
    </div>
  )
}
