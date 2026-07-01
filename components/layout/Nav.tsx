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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [, startTransition] = useTransition();

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
    <nav className={`nav${mobileOpen ? ' mobile-open' : ''}`}>
      <div className="nav-inner">
        <Link className="brand" href="/">
          <BrandMark />
          <span>Eyzencore</span>
        </Link>

        <button
          type="button"
          className="nav-mobile-toggle"
          aria-label={mobileOpen ? 'Закрити меню' : 'Відкрити меню'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className="nav-links">
          {[
            { href: '/servers/minecraft', label: 'Minecraft' },
            { href: '/servers/discord', label: 'Discord' },
            { href: '/news', label: 'Новини' },
            { href: '/dashboard', label: 'Кабінет', nofollow: true },
            { href: '/add-server', label: 'Додати сервер', nofollow: true },
          ].map(({ href, label, nofollow }) => (
            <Link
              key={href}
              href={href}
              rel={nofollow ? 'nofollow' : undefined}
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="nav-spacer" />

        <div className="nav-cta">
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
              <Link className="btn btn-secondary" href="/login" rel="nofollow">Увійти</Link>
              <Link className="btn btn-primary" href="/register" rel="nofollow">
                Реєстрація <span style={{ opacity: 0.6 }}>→</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
