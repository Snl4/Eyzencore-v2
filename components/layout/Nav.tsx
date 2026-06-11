'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/hooks/useTheme';
import { BrandMark } from '@/components/ui/BrandMark';
import { UserProfileDropdown } from '@/components/ui/UserProfileDropdown';
import { Toggle } from '@/components/ui/Toggle';
import { MoonIcon, SunIcon } from '@/components/ui/Icons';
import type { AuthUser } from '@/lib/auth-db';

export function Nav() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadUser() {
      const response = await fetch('/api/auth/me', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      setUser(data.user || null);
    }

    void loadUser();
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    startTransition(() => {
      router.push('/');
      router.refresh();
    });
  }

  return (
    <nav className="nav" style={{ position: 'sticky', top: 12, zIndex: 50, margin: '12px auto 0', maxWidth: 1100, padding: '0 16px' }}>
      <div className="nav-inner">
        <Link className="brand" href="/">
          <BrandMark />
          <span>Eyzencore</span>
        </Link>

        <div className="nav-links" style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          {[
            { href: '/servers/minecraft', label: 'Minecraft' },
            { href: '/servers/discord', label: 'Discord' },
            { href: '/news', label: 'Новини' },
            { href: '/dashboard', label: 'Кабінет' },
            { href: '/add-server', label: 'Додати сервер' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{ padding: '6px 12px', fontSize: '13.5px', color: 'var(--fg-1)', borderRadius: 999, transition: 'color .15s, background .15s' }}
              onMouseEnter={(event) => {
                (event.target as HTMLAnchorElement).style.color = 'var(--fg)';
                (event.target as HTMLAnchorElement).style.background = 'var(--bg-2)';
              }}
              onMouseLeave={(event) => {
                (event.target as HTMLAnchorElement).style.color = 'var(--fg-1)';
                (event.target as HTMLAnchorElement).style.background = 'transparent';
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <div className="nav-cta" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {user ? (
            <UserProfileDropdown
              user={user}
              theme={theme}
              onToggleTheme={toggle}
              onLogout={() => void handleLogout()}
            />
          ) : (
            <>
              <Toggle
                variant="outline"
                size="sm"
                pressed={theme === 'light'}
                onPressedChange={toggle}
                aria-label="Перемкнути тему"
                className="nav-theme-toggle"
              >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              </Toggle>
              <Link className="btn btn-secondary" href="/auth/login">Увійти</Link>
              <Link className="btn btn-primary" href="/auth/register">
                Реєстрація <span style={{ opacity: 0.6 }}>→</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
