'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { ServerDashboardHubNav } from '@/components/dashboard/ServerDashboardHubNav'
import type { ServerDashboardTab } from '@/lib/server-dashboard-routes'
import { buildServerDashboardTabPath } from '@/lib/server-dashboard-routes'
import { buildServerDashboardSlug, buildServerPublicPath } from '@/lib/server-slug'

export type ServerDashboardHubServer = {
  seed: number
  name: string
  addr: string
  ic?: string
  avatarUrl?: string | null
  verified: boolean
}

export type ServerDashboardHubOwnedServer = {
  seed: number
  name: string
  addr: string
  ic?: string
  avatarUrl?: string | null
}

function serverInitials(name: string): string {
  const cleaned = String(name || '').replace(/^@/, '')
  const parts = cleaned.split(/[._\s-]+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function ServerDashboardHub({
  activeTab,
  server,
  dashboardSlug,
  ownedServers,
  actions,
  subtitle,
}: {
  activeTab: ServerDashboardTab
  server: ServerDashboardHubServer
  dashboardSlug: string
  ownedServers?: ServerDashboardHubOwnedServer[]
  actions?: ReactNode
  subtitle?: string
}) {
  const router = useRouter()
  const pickerRef = useRef<HTMLDivElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [servers, setServers] = useState<ServerDashboardHubOwnedServer[]>(ownedServers || [])

  useEffect(() => {
    if (ownedServers && ownedServers.length > 0) {
      setServers(ownedServers)
    }
  }, [ownedServers])

  useEffect(() => {
    if (servers.length > 0) return
    let isMounted = true
    void fetch('/api/dashboard/owner', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { ownedServers?: Array<{ serverId: number; serverName: string; dashboardSlug: string }> } | null) => {
        if (!isMounted || !payload?.ownedServers) return
        setServers(payload.ownedServers.map((item) => ({
          seed: item.serverId,
          name: item.serverName,
          addr: '',
          ic: item.serverName.slice(0, 2).toUpperCase(),
        })))
      })
      .catch(() => undefined)
    return () => {
      isMounted = false
    }
  }, [servers.length])

  useEffect(() => {
    if (!pickerOpen) return
    const handleClick = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setPickerOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPickerOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [pickerOpen])

  const handleSwitchServer = (nextServer: ServerDashboardHubOwnedServer) => {
    setPickerOpen(false)
    if (nextServer.seed === server.seed) return
    const nextSlug = buildServerDashboardSlug(nextServer.name)
    router.push(buildServerDashboardTabPath(nextSlug, activeTab))
  }

  return (
    <section className="server-hub">
      <div className="server-hub-top">
        <div className="server-hub-info">
          <Breadcrumbs items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Мої сервери', href: '/dashboard?tab=servers' },
            { label: server.name },
          ]} />
          <div className="server-hub-title-row">
            <h1 className="page-title">{server.name}</h1>
            <span className={`verify-badge ${server.verified ? 'verify-badge--verified' : 'verify-badge--unverified'}`}>
              {server.verified ? '✓ Верифіковано' : '○ Потрібна верифікація'}
            </span>
          </div>
          {subtitle ? <p className="server-hub-subtitle">{subtitle}</p> : null}
          <div className="server-hub-links">
            <Link href={buildServerPublicPath(server)} className="server-hub-public-link">
              Публічна сторінка →
            </Link>
            <span className="server-hub-meta">{server.addr}</span>
          </div>
        </div>
        <div className="server-hub-side">
          <div className="dash-server-pick-wrap" ref={pickerRef}>
            <button
              type="button"
              className={`dash-server-pick${pickerOpen ? ' open' : ''}`}
              onClick={() => setPickerOpen((value) => !value)}
              aria-haspopup="listbox"
              aria-expanded={pickerOpen}
              aria-label="Обрати інший сервер"
            >
              <span
                className="ic"
                style={server.avatarUrl ? {
                  backgroundImage: `url(${JSON.stringify(server.avatarUrl).slice(1, -1)})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  color: 'transparent',
                } : undefined}
              >
                {server.avatarUrl ? '' : (server.ic || serverInitials(server.name))}
              </span>
              <span className="dash-server-pick-info">
                <b>Змінити сервер</b>
                <span>{servers.length > 0 ? `${servers.length} у кабінеті` : server.name}</span>
              </span>
              <span className={`dash-server-pick-chev${pickerOpen ? ' open' : ''}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </span>
            </button>
            {pickerOpen ? (
              <div className="dash-server-pick-panel" role="listbox">
                <div className="dash-server-pick-head">Мої сервери</div>
                {servers.length === 0 ? (
                  <div className="dash-server-pick-empty">Завантаження...</div>
                ) : (
                  servers.map((item) => {
                    const isCurrent = item.seed === server.seed
                    return (
                      <button
                        key={item.seed}
                        type="button"
                        role="option"
                        aria-selected={isCurrent}
                        className={`dash-server-pick-item${isCurrent ? ' current' : ''}`}
                        onClick={() => handleSwitchServer(item)}
                      >
                        <span className="ic">{item.ic || serverInitials(item.name)}</span>
                        <span className="info">
                          <b>{item.name}</b>
                          <span>{item.addr || 'Сервер у кабінеті'}</span>
                        </span>
                        {isCurrent ? (
                          <svg className="check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : null}
                      </button>
                    )
                  })
                )}
                <div className="dash-server-pick-foot">
                  <Link href="/add-server" className="dash-server-pick-add">+ Додати новий сервер</Link>
                </div>
              </div>
            ) : null}
          </div>
          {actions ? <div className="server-hub-actions">{actions}</div> : null}
        </div>
      </div>
      <ServerDashboardHubNav
        activeTab={activeTab}
        dashboardSlug={dashboardSlug}
        isVerified={server.verified}
      />
    </section>
  )
}
