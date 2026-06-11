'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/hooks/useTheme';
import { BrandMark } from '@/components/ui/BrandMark';
import { UserProfileDropdown } from '@/components/ui/UserProfileDropdown';
import { SidebarIcon } from '@/components/layout/SidebarIcon';
import { getSidebarSections, getDashboardSidebarSections } from '@/lib/data';
import type { AuthUser } from '@/lib/auth-db';
import { ADMIN_EMAIL } from '@/lib/constants';

interface PageShellProps {
  children: React.ReactNode;
  active: string;
  initialUser?: AuthUser | null;
  sidebarRole?: string;
  hiddenKeys?: string[];
}

export function PageShell({ children, active, initialUser = null, sidebarRole, hiddenKeys = [] }: PageShellProps) {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const user = initialUser;
  const resolvedRole = sidebarRole ?? String(user?.user_metadata.role || 'USER').toUpperCase();
  const isOwner = resolvedRole === 'OWNER' || resolvedRole === 'ADMIN';
  const isAdminUser = user?.email === ADMIN_EMAIL;
  const rawSections = sidebarRole ? getDashboardSidebarSections(sidebarRole) : getSidebarSections(isOwner);
  const allSections = isAdminUser
    ? [...rawSections, { label: 'Адмін', items: [{ ico: 'shield', name: 'CMS панель', key: 'admin', href: '/cms' }] }]
    : rawSections;
  const sections = hiddenKeys.length === 0
    ? allSections
    : allSections.map((s) => ({ ...s, items: s.items.filter((item) => !hiddenKeys.includes(item.key)) })).filter((s) => s.items.length > 0);
  const sidebarPrefetchKey = sections
    .flatMap((section) => section.items.map((item) => item.href || ''))
    .filter(Boolean)
    .join('|');

  useEffect(() => {
    sidebarPrefetchKey.split('|').filter(Boolean).forEach((href) => router.prefetch(href));
  }, [router, sidebarPrefetchKey]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  return (
    <div className="page-shell">
      <aside className="page-side">
        <Link className="brand" href="/">
          <BrandMark />
          <span>Eyzencore</span>
        </Link>

        {sections.map((section) => (
          <div key={section.label} className="side-group">
            <div className="side-section">{section.label}</div>
            {section.items.map((item) => {
              const isActive = item.key === active;
              const inner = (
                <>
                  <span className="ico">
                    <SidebarIcon name={item.ico} />
                  </span>
                  <span>{item.name}</span>
                  {item.badge && <span className="badge">{item.badge}</span>}
                </>
              );
              return item.href ? (
                <Link key={item.key} href={item.href} className={`side-item${isActive ? ' active' : ''}`}>
                  {inner}
                </Link>
              ) : (
                <div key={item.key} className={`side-item${isActive ? ' active' : ''}`}>
                  {inner}
                </div>
              );
            })}
          </div>
        ))}

        <div className="side-user">
          <UserProfileDropdown
            user={user}
            theme={theme}
            onToggleTheme={toggle}
            onLogout={user ? () => void handleLogout() : undefined}
            compact
          />
        </div>
      </aside>

      <main style={{ minWidth: 0, position: 'relative', zIndex: 1 }}>
        {children}
      </main>
    </div>
  );
}
