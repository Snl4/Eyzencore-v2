import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Merriweather } from 'next/font/google';
import { Suspense } from 'react';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import './globals.css';
import './external-api.css';
import { RouteTransitionLoader } from '@/components/layout/RouteTransitionLoader';
import { NotificationToasts } from '@/components/layout/NotificationToasts';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';

config.autoAddCss = false;

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

const merriweather = Merriweather({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '700'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Eyzencore — Моніторинг Minecraft-серверів',
    template: '%s — Eyzencore',
  },
  description:
    'Eyzencore відстежує онлайн серверів 24/7, веде рейтинги та об\'єднує гравців і авторів проєктів у єдиному просторі.',
  keywords: ['minecraft', 'сервери', 'моніторинг', 'україна', 'форум'],
  openGraph: {
    title: 'Eyzencore — Моніторинг Minecraft-серверів',
    description: 'Платформа моніторингу серверів для української Minecraft-спільноти.',
    siteName: 'Eyzencore',
    locale: 'uk_UA',
    type: 'website',
  },
  metadataBase: new URL('https://eyzencore.com'),
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
    ],
    shortcut: ['/icon.png'],
    apple: [{ url: '/icon.png', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Prevent flash of incorrect theme — runs synchronously before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('eyzencore-theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${merriweather.variable}`}>
        <ConfirmProvider>
          <Suspense fallback={null}>
            <RouteTransitionLoader />
          </Suspense>
          <NotificationToasts />
          {children}
        </ConfirmProvider>
      </body>
    </html>
  );
}
