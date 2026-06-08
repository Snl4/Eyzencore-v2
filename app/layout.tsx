import type { Metadata } from 'next';
import { Mulish, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { RouteTransitionLoader } from '@/components/layout/RouteTransitionLoader';

const mulish = Mulish({
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
      <body className={`${mulish.variable} ${jetbrainsMono.variable}`}>
        <RouteTransitionLoader />
        {children}
      </body>
    </html>
  );
}
