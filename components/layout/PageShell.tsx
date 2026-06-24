'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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

type SidebarItem = {
  ico: string;
  name: string;
  key: string;
  href: string | null;
  badge?: string;
};

type SidebarSection = {
  label: string;
  items: SidebarItem[];
};

export function PageShell({ children, active, initialUser = null, sidebarRole, hiddenKeys = [] }: PageShellProps) {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [forumThreadCount, setForumThreadCount] = useState<number | null>(null);
  const user = initialUser;
  const resolvedRole = sidebarRole ?? String(user?.user_metadata.role || 'USER').toUpperCase();
  const isOwnerNavigation = resolvedRole === 'ADMIN' || Boolean(sidebarRole && resolvedRole === 'OWNER');
  const isAdminUser = user?.email === ADMIN_EMAIL;
  const rawSections = sidebarRole ? getDashboardSidebarSections(sidebarRole) : getSidebarSections(isOwnerNavigation);
  const partnerSection: SidebarSection = {
    label: 'Партнери',
    items: [
      { ico: 'bullhorn', name: 'AnimiLair Studio', key: 'animilair', href: '/partners/animilair' },
    ],
  };
  const sectionsWithPartners = [partnerSection, ...rawSections];
  const allSections = isAdminUser
    ? [...sectionsWithPartners, { label: 'Адмін', items: [{ ico: 'shield', name: 'CMS панель', key: 'admin', href: '/cms' }] }]
    : sectionsWithPartners;
  const sections = hiddenKeys.length === 0
    ? allSections
    : allSections.map((section) => ({
        ...section,
        items: section.items.filter((item) => !hiddenKeys.includes(item.key)),
      })).filter((section) => section.items.length > 0);
  const sidebarPrefetchKey = sections
    .flatMap((section) => section.items.map((item) => item.href || ''))
    .filter(Boolean)
    .join('|');

  useEffect(() => {
    sidebarPrefetchKey.split('|').filter(Boolean).forEach((href) => router.prefetch(href));
  }, [router, sidebarPrefetchKey]);

  useEffect(() => {
    let activeRequest = true;
    fetch('/api/forum/stats', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((result: { activeThreads?: number } | null) => {
        if (activeRequest && typeof result?.activeThreads === 'number') {
          setForumThreadCount(result.activeThreads);
        }
      })
      .catch(() => undefined);
    return () => {
      activeRequest = false;
    };
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  return (
    <div className="page-shell">
      <button
        type="button"
        className="mobile-menu-toggle"
        aria-label={mobileMenuOpen ? 'Закрити меню' : 'Відкрити меню'}
        aria-expanded={mobileMenuOpen}
        onClick={() => setMobileMenuOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>
      {mobileMenuOpen && (
        <button
          type="button"
          className="mobile-menu-backdrop"
          aria-label="Закрити меню"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside className={`page-side${mobileMenuOpen ? ' mobile-open' : ''}`}>
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
                  {item.key === 'forum' && forumThreadCount !== null
                    ? forumThreadCount > 0 && <span className="badge">{forumThreadCount.toLocaleString('uk-UA')}</span>
                    : item.badge && <span className="badge">{item.badge}</span>}
                </>
              );
              return item.href ? (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`side-item${isActive ? ' active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
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
