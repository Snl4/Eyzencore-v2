'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type ConfirmOptions = {
  title?: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
}

type PendingConfirm = ConfirmOptions & {
  resolve: (confirmed: boolean) => void
}

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({
        title: options.title || 'Підтвердьте дію',
        confirmLabel: options.confirmLabel || 'Підтвердити',
        cancelLabel: options.cancelLabel || 'Скасувати',
        tone: options.tone || 'danger',
        description: options.description,
        resolve,
      })
    })
  }, [])

  const close = useCallback((confirmed: boolean) => {
    setPending((current) => {
      current?.resolve(confirmed)
      return null
    })
  }, [])

  useEffect(() => {
    if (!pending) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timeout = window.setTimeout(() => confirmButtonRef.current?.focus(), 40)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(timeout)
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [close, pending])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="confirm-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close(false)
          }}
        >
          <section
            className={`confirm-dialog confirm-dialog-${pending.tone}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
          >
            <div className="confirm-dialog-icon" aria-hidden="true">!</div>
            <div className="confirm-dialog-copy">
              <span className="confirm-dialog-eyebrow">
                {pending.tone === 'danger' ? 'Небезпечна дія' : 'Потрібне підтвердження'}
              </span>
              <h2 id="confirm-dialog-title">{pending.title}</h2>
              <p id="confirm-dialog-description">{pending.description}</p>
            </div>
            <div className="confirm-dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={() => close(false)}>
                {pending.cancelLabel}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                className={pending.tone === 'danger' ? 'btn confirm-danger-btn' : 'btn btn-primary'}
                onClick={() => close(true)}
              >
                {pending.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('useConfirm must be used within ConfirmProvider')
  return confirm
}
