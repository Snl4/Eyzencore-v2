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
import { SEO_KEYWORDS, SITE_NAME, SITE_URL, organizationJsonLd, siteJsonLd } from '@/lib/seo';

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
    default: 'Eyzencore — Minecraft і Discord сервери, моніторинг, рейтинг, голосування',
    template: `%s — ${SITE_NAME}`,
  },
  description:
    'Eyzencore — каталог і моніторинг Minecraft та Discord серверів: онлайн 24/7, рейтинги, голосування, відгуки, новини, форум і API для власників проєктів.',
  keywords: SEO_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'gaming',
  alternates: {
    canonical: SITE_URL,
    languages: {
      uk: SITE_URL,
      en: SITE_URL,
      'x-default': SITE_URL,
    },
  },
  openGraph: {
    title: 'Eyzencore — Minecraft і Discord сервери',
    description: 'Моніторинг Minecraft і Discord серверів, рейтинг, голосування, відгуки, новини та форум спільноти.',
    siteName: 'Eyzencore',
    locale: 'uk_UA',
    type: 'website',
    url: SITE_URL,
    images: [{ url: '/icon.png', width: 512, height: 512, alt: 'Eyzencore' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Eyzencore — Minecraft і Discord сервери',
    description: 'Каталог серверів, live-моніторинг, рейтинг, голосування і новини Minecraft/Discord.',
    images: ['/icon.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    other: {
      ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
        ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
        : {}),
    },
  },
  metadataBase: new URL(SITE_URL),
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
            __html: `(function(){try{var m=document.cookie.match(/(?:^|; )eyzencore-theme=(light|dark)/);var t=localStorage.getItem('eyzencore-theme')||(m&&m[1])||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}})()`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
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
