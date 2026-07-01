import { permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Каталог серверів - Eyzencore',
  description: 'Каталог Minecraft і Discord серверів Eyzencore.',
  alternates: {
    canonical: '/servers/minecraft',
  },
}

export default function ServersPage() {
  permanentRedirect('/servers/minecraft')
}
