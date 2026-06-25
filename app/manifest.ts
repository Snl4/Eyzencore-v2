import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Eyzencore - Minecraft and Discord server monitoring',
    short_name: 'Eyzencore',
    description: 'Каталог Minecraft і Discord серверів: онлайн, рейтинг, голосування, відгуки, новини та форум.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#6366f1',
    lang: 'uk-UA',
    categories: ['games', 'social', 'utilities'],
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
