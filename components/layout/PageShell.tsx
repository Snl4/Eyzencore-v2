'use client';

import Link from 'next/link';
import { useTheme } from '@/hooks/useTheme';
import { Icons, SunIcon, MoonIcon } from '@/components/ui/Icons';
import { BrandMark } from '@/components/ui/BrandMark';
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
  const { theme, toggle } = useTheme();
  const user = initialUser;
  const resolvedRole = sidebarRole ?? String(user?.user_metadata.role || 'USER').toUpperCase();
  const isOwner = resolvedRole === 'OWNER' || resolvedRole === 'ADMIN';
  const isAdminUser = user?.email === ADMIN_EMAIL;
  const rawSections = sidebarRole ? getDashboardSidebarSections(sidebarRole) : getSidebarSections(isOwner);
  const allSections = isAdminUser
    ? [...rawSections, { label: 'Адмін', items: [{ ico: 'shield', name: 'Панель', key: 'admin', href: '/admin' }] }]
    : rawSections;
  const sections = hiddenKeys.length === 0
    ? allSections
    : allSections.map((s) => ({ ...s, items: s.items.filter((item) => !hiddenKeys.includes(item.key)) })).filter((s) => s.items.length > 0);

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
              const icon = Icons[item.ico as keyof typeof Icons];
              const inner = (
                <>
                  <span className="ico">{icon}</span>
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

        <div className="side-user" style={{ marginTop: 'auto', padding: '10px 8px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <div
            style={
              user?.user_metadata.avatar_url
                ? { width: 32, height: 32, borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--line)', overflow: 'hidden', display: 'grid', placeItems: 'center', color: 'transparent', fontSize: 12, fontWeight: 700, userSelect: 'none', backgroundImage: `url(${JSON.stringify(user.user_metadata.avatar_url).slice(1, -1)})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { width: 32, height: 32, borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--line)', overflow: 'hidden', display: 'grid', placeItems: 'center', color: '#0a0c14', fontSize: 12, fontWeight: 700, userSelect: 'none' }
            }
          >
            {(user?.user_metadata.full_name || 'U').slice(0, 1).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.user_metadata.full_name || 'Guest user'}
            </div>
            <div style={{ fontSize: 10.5, lineHeight: 1.2, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              @{user?.user_metadata.profile_slug || 'user'}
            </div>
          </div>
          <button className="btn btn-ghost" onClick={toggle} aria-label="Toggle theme" style={{ padding: '0 8px', height: 30, width: 30, justifyContent: 'center' }}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </aside>

      <main style={{ minWidth: 0, position: 'relative', zIndex: 1 }}>
        {children}
      </main>
    </div>
  );
}
