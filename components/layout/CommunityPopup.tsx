'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Icons } from '@/components/ui/Icons'
import type { CommunityPopupSettings } from '@/lib/community-popup'

const STORAGE_PREFIX = 'eyzencore-community-popup'

const VARIANT_LABELS: Record<CommunityPopupSettings['variant'], string> = {
  telegram: 'Telegram',
  discord: 'Discord',
  forum: 'Форум',
  update: 'Оновлення',
  custom: 'Eyzencore',
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function buildStorageKey(settings: CommunityPopupSettings) {
  if (settings.frequency === 'version') {
    return `${STORAGE_PREFIX}:version:${settings.version || settings.updatedAt || 'global'}`
  }
  return `${STORAGE_PREFIX}:daily:${todayKey()}`
}

function isExternalUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

function PopupLink({ href, children, className, onClick }: { href: string; children: React.ReactNode; className: string; onClick: () => void }) {
  if (isExternalUrl(href)) {
    return <a className={className} href={href} target="_blank" rel="noreferrer" onClick={onClick}>{children}</a>
  }
  return <Link className={className} href={href || '/'} onClick={onClick}>{children}</Link>
}

function PopupIcon({ variant }: { variant: CommunityPopupSettings['variant'] }) {
  if (variant === 'discord') return Icons.discord
  if (variant === 'forum') return Icons.forum
  if (variant === 'update') return Icons.bell
  if (variant === 'custom') return Icons.globe
  return Icons.telegram
}

export function CommunityPopup() {
  const [settings, setSettings] = useState<CommunityPopupSettings | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/community-popup', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((payload: CommunityPopupSettings | null) => {
        if (cancelled || !payload?.enabled) return
        const key = buildStorageKey(payload)
        if (localStorage.getItem(key)) return
        setSettings(payload)
        window.setTimeout(() => {
          if (!cancelled) setVisible(true)
        }, 900)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const storageKey = useMemo(() => settings ? buildStorageKey(settings) : '', [settings])

  const close = () => {
    if (storageKey) {
      localStorage.setItem(storageKey, String(Date.now()))
    }
    setVisible(false)
  }

  if (!settings || !visible) return null

  return (
    <div className={`community-popup community-popup-${settings.variant}`} role="dialog" aria-live="polite" aria-label={settings.title}>
      <div className="community-popup-mark" aria-hidden="true">
        {PopupIcon({ variant: settings.variant })}
      </div>
      <div className="community-popup-body">
        <span>{VARIANT_LABELS[settings.variant]}</span>
        <h2>{settings.title}</h2>
        <p>{settings.message}</p>
        <div className="community-popup-actions">
          <PopupLink href={settings.primaryUrl} className="community-popup-primary" onClick={close}>
            {settings.primaryLabel}
          </PopupLink>
          {settings.secondaryLabel && settings.secondaryUrl ? (
            <PopupLink href={settings.secondaryUrl} className="community-popup-secondary" onClick={close}>
              {settings.secondaryLabel}
            </PopupLink>
          ) : null}
        </div>
      </div>
      <button type="button" className="community-popup-close" aria-label="Закрити" onClick={close}>
        {Icons.x}
      </button>
    </div>
  )
}
