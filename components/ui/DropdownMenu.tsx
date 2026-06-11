'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'

export type DropdownMenuItem = {
  label: string
  description?: string
  icon?: ReactNode
  href?: string
  danger?: boolean
  disabled?: boolean
  separatorBefore?: boolean
  onSelect?: () => void
}

export function DropdownMenu({
  trigger,
  items,
  label = 'Меню',
  align = 'end',
  className = '',
}: {
  trigger: (open: boolean) => ReactNode
  items: DropdownMenuItem[]
  label?: string
  align?: 'start' | 'end'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const content = (item: DropdownMenuItem) => (
    <>
      {item.icon && <span className="ui-dropdown-icon">{item.icon}</span>}
      <span className="ui-dropdown-copy">
        <b>{item.label}</b>
        {item.description && <small>{item.description}</small>}
      </span>
    </>
  )

  return (
    <div ref={rootRef} className={`ui-dropdown ${className}`.trim()}>
      <button
        type="button"
        className="ui-dropdown-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {trigger(open)}
      </button>
      {open && (
        <div className={`ui-dropdown-panel ui-dropdown-${align}`} role="menu" aria-label={label}>
          {items.map((item, index) => {
            const itemClass = `ui-dropdown-item${item.danger ? ' danger' : ''}${item.disabled ? ' disabled' : ''}`
            return (
              <div key={`${item.label}-${index}`} className={item.separatorBefore ? 'ui-dropdown-separated' : undefined}>
                {item.href && !item.disabled ? (
                  <Link className={itemClass} href={item.href} role="menuitem" onClick={() => setOpen(false)}>
                    {content(item)}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={itemClass}
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => {
                      item.onSelect?.()
                      setOpen(false)
                    }}
                  >
                    {content(item)}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
