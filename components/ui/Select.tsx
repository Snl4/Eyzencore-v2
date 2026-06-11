'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export type SelectOption = { value: string; label: ReactNode } | string

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: readonly SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  size?: 'md' | 'sm'
  fullWidth?: boolean
  ariaLabel?: string
}

const normalize = (option: SelectOption): { value: string; label: ReactNode } =>
  typeof option === 'string' ? { value: option, label: option } : option

export function Select({ value, onChange, options, placeholder = 'Обрати...', disabled, className = '', size = 'md', fullWidth = true, ariaLabel }: SelectProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<number>(-1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const items = useMemo(() => options.map(normalize), [options])
  const selected = items.find((option) => option.value === value)

  const close = useCallback(() => { setOpen(false); setActive(-1) }, [])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) close()
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { close(); return }
      if (event.key === 'ArrowDown') { event.preventDefault(); setActive((current) => Math.min(items.length - 1, current + 1)) }
      if (event.key === 'ArrowUp') { event.preventDefault(); setActive((current) => Math.max(0, current - 1)) }
      if (event.key === 'Enter') {
        event.preventDefault()
        if (active >= 0 && active < items.length) {
          onChange(items[active].value)
          close()
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, items, active, onChange, close])

  useEffect(() => {
    if (open && panelRef.current && active >= 0) {
      const node = panelRef.current.querySelector<HTMLElement>(`[data-index="${active}"]`)
      node?.scrollIntoView({ block: 'nearest' })
    }
  }, [active, open])

  const toggle = () => {
    if (disabled) return
    if (open) { close(); return }
    setOpen(true)
    const currentIndex = items.findIndex((option) => option.value === value)
    setActive(currentIndex >= 0 ? currentIndex : 0)
  }

  return (
    <div ref={wrapRef} className={`cs-wrap${fullWidth ? ' cs-wrap-full' : ''} ${className}`.trim()}>
      <button
        type="button"
        className={`cs-trigger cs-${size}${open ? ' open' : ''}${disabled ? ' disabled' : ''}`}
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className={`cs-value${selected ? '' : ' placeholder'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className={`cs-chevron${open ? ' open' : ''}`} aria-hidden>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </span>
      </button>
      {open && (
        <div ref={panelRef} className="cs-panel" role="listbox" aria-label={ariaLabel}>
          {items.map((option, index) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              data-index={index}
              className={`cs-option${option.value === value ? ' selected' : ''}${index === active ? ' active' : ''}`}
              onMouseEnter={() => setActive(index)}
              onClick={() => { onChange(option.value); close() }}
            >
              <span className="cs-option-label">{option.label}</span>
              {option.value === value && (
                <svg className="cs-option-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
