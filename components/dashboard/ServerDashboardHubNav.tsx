'use client'

import Link from 'next/link'
import type { ServerDashboardTab } from '@/lib/server-dashboard-access'
import { buildServerDashboardTabPath } from '@/lib/server-dashboard-access'

const TAB_LABELS: Record<ServerDashboardTab, string> = {
  analytics: 'Аналітика',
  manage: 'Керування',
  verify: 'Верифікація',
  edit: 'Редагування',
}

export function ServerDashboardHubNav({
  activeTab,
  dashboardSlug,
  isVerified,
}: {
  activeTab: ServerDashboardTab
  dashboardSlug: string
  isVerified: boolean
}) {
  const tabs: ServerDashboardTab[] = ['analytics', 'manage', 'verify', 'edit']

  return (
    <nav className="server-hub-nav" aria-label="Розділи сервера">
      {tabs.map((tab) => {
        const isActive = tab === activeTab
        const needsAttention = tab === 'verify' && !isVerified
        return (
          <Link
            key={tab}
            href={buildServerDashboardTabPath(dashboardSlug, tab)}
            className={`${isActive ? 'active' : ''}${needsAttention ? ' needs-attention' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {TAB_LABELS[tab]}
            {needsAttention ? <span className="server-hub-nav-dot" aria-hidden="true" /> : null}
          </Link>
        )
      })}
    </nav>
  )
}
