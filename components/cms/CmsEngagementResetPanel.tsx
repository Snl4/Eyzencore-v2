'use client'

import { useCallback, useEffect, useState } from 'react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import type { EngagementResetBatch, EngagementResetPreview } from '@/lib/engagement-reset'

const CONFIRM_PHRASE = 'СКИНУТИ'

type CmsEngagementResetPanelProps = {
  onError: (message: string) => void
}

export function CmsEngagementResetPanel({ onError }: CmsEngagementResetPanelProps) {
  const confirmAction = useConfirm()
  const [preview, setPreview] = useState<EngagementResetPreview | null>(null)
  const [history, setHistory] = useState<EngagementResetBatch[]>([])
  const [label, setLabel] = useState('')
  const [confirmPhrase, setConfirmPhrase] = useState('')
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)

  const loadState = useCallback(async () => {
    setLoading(true)
    const response = await fetch('/api/cms/engagement-reset', { cache: 'no-store' })
    const payload = await response.json() as {
      preview?: EngagementResetPreview
      history?: EngagementResetBatch[]
      error?: string
    }
    if (!response.ok) {
      onError(payload.error || 'Не вдалося завантажити дані скидання')
      setLoading(false)
      return
    }
    setPreview(payload.preview || null)
    setHistory(Array.isArray(payload.history) ? payload.history : [])
    setLoading(false)
  }, [onError])

  useEffect(() => {
    void loadState()
  }, [loadState])

  const handleReset = async () => {
    if (!preview) return
    if (preview.totalVotes === 0 && preview.likes === 0) {
      onError('Немає активних голосів або лайків для скидання')
      return
    }
    if (confirmPhrase.trim() !== CONFIRM_PHRASE) {
      onError(`Введіть ${CONFIRM_PHRASE} для підтвердження`)
      return
    }
    const approved = await confirmAction({
      title: 'Скинути голоси та лайки на всіх серверах?',
      description: 'Поточні голоси й лайки будуть збережені в історії. Відгуки, перегляди та рейтинг відгуків не зміняться. Дію не можна скасувати.',
      confirmLabel: 'Скинути зараз',
    })
    if (!approved) return
    setResetting(true)
    onError('')
    const response = await fetch('/api/cms/engagement-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        confirmPhrase: confirmPhrase.trim(),
        label: label.trim() || undefined,
      }),
    })
    const payload = await response.json() as {
      preview?: EngagementResetPreview
      history?: EngagementResetBatch[]
      error?: string
    }
    if (!response.ok) {
      onError(payload.error || 'Не вдалося скинути статистику')
      setResetting(false)
      return
    }
    setPreview(payload.preview || null)
    setHistory(Array.isArray(payload.history) ? payload.history : [])
    setConfirmPhrase('')
    setLabel('')
    setResetting(false)
  }

  if (loading) {
    return <div className="set-card" style={{ color: 'var(--fg-3)' }}>Завантаження...</div>
  }

  return (
    <section className="cms-maintenance-page">
      <div className="cms-maintenance-hero">
        <div>
          <p className="cms-eyebrow">Рейтинг і активність</p>
          <h1>Скидання голосів та лайків</h1>
          <p>
            Ручне місячне (або сезонне) обнулення голосів і лайків на всіх серверах.
            Дані зберігаються в історії, після скидання гравці зможуть голосувати знову.
          </p>
        </div>
      </div>

      <div className="cms-maintenance-layout">
        <div className="cms-maintenance-editor">
          <div>
            <p className="cms-eyebrow">Поточний стан</p>
            <h2>Що буде скинуто</h2>
          </div>
          <div className="cms-reset-stats">
            <div><span>Голоси (нік)</span><b>{preview?.nicknameVotes ?? 0}</b></div>
            <div><span>Голоси (акаунт)</span><b>{preview?.accountVotes ?? 0}</b></div>
            <div><span>Лайки</span><b>{preview?.likes ?? 0}</b></div>
            <div><span>Серверів</span><b>{preview?.serversCount ?? 0}</b></div>
          </div>
          <p style={{ color: 'var(--fg-3)', fontSize: 13, lineHeight: 1.5 }}>
            Не скидаються: відгуки, середній рейтинг, перегляди, онлайн-статистика.
          </p>
          <label>
            <span>Назва сезону (необовʼязково)</span>
            <input
              value={label}
              maxLength={120}
              placeholder="Наприклад: Квітень 2026"
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>
          <label>
            <span>Підтвердження: введіть {CONFIRM_PHRASE}</span>
            <input
              value={confirmPhrase}
              maxLength={20}
              placeholder={CONFIRM_PHRASE}
              onChange={(event) => setConfirmPhrase(event.target.value)}
            />
          </label>
          <div className="cms-maintenance-actions">
            <button
              className="danger"
              disabled={resetting || !preview || (preview.totalVotes === 0 && preview.likes === 0)}
              onClick={() => void handleReset()}
              type="button"
            >
              {resetting ? 'Скидання...' : 'Скинути голоси та лайки'}
            </button>
            <button disabled={resetting} onClick={() => void loadState()} type="button">
              Оновити
            </button>
          </div>
        </div>

        <div className="cms-maintenance-preview">
          <p className="cms-eyebrow">Історія скидань</p>
          {history.length === 0 ? (
            <div className="set-card" style={{ color: 'var(--fg-3)' }}>
              Ще не було жодного скидання.
            </div>
          ) : (
            <div className="cms-reset-history">
              {history.map((batch) => (
                <article className="cms-reset-history-item" key={batch.id}>
                  <b>{batch.label}</b>
                  <span>{new Date(batch.performedAt).toLocaleString('uk-UA')}</span>
                  <span>
                    ▲ {batch.nicknameVotesArchived + batch.accountVotesArchived} голосів ·
                    {' '}♥ {batch.likesArchived} лайків · {batch.serversCount} серверів
                  </span>
                  {batch.performedByEmail ? <small>{batch.performedByEmail}</small> : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
