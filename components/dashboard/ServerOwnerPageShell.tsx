'use client'

import type { ReactNode } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import type { AuthUser, UserRole } from '@/lib/auth-db'

export const SERVER_OWNER_SIDEBAR_ACTIVE = 'my-servers' as const

export function ServerOwnerPageShell({
  children,
  initialUser,
  role,
}: {
  children: ReactNode
  initialUser: AuthUser | null
  role: UserRole
}) {
  return (
    <PageShell
      active={SERVER_OWNER_SIDEBAR_ACTIVE}
      initialUser={initialUser}
      sidebarRole={role}
    >
      {children}
    </PageShell>
  )
}
