'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeleteResourceButton({ resourceId }: { resourceId: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const handleDelete = async () => {
    if (!window.confirm('Видалити цей ресурс з каталогу?')) return
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(`/api/resources/${resourceId}`, {
        method: 'DELETE',
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        setMessage(payload.error || 'Не вдалося видалити ресурс')
        return
      }
      router.push('/resources')
      router.refresh()
    } catch {
      setMessage('Помилка мережі під час видалення')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="resource-delete-wrap">
      <button type="button" className="btn btn-secondary resource-delete-btn" disabled={busy} onClick={() => void handleDelete()}>
        {busy ? 'Видаляємо...' : 'Видалити'}
      </button>
      {message && <span className="resource-delete-message">{message}</span>}
    </span>
  )
}
