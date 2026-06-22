'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Theme } from '@/lib/types';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    const cookieTheme = document.cookie
      .split('; ')
      .find((part) => part.startsWith('eyzencore-theme='))
      ?.split('=')[1] as Theme | undefined;
    const stored = (localStorage.getItem('eyzencore-theme') || cookieTheme) as Theme | null;
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
      setThemeState(stored);
    }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem('eyzencore-theme', t);
    document.cookie = `eyzencore-theme=${t}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.setAttribute('data-theme', t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return { theme, setTheme, toggle };
}
