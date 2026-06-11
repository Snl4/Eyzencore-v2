import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { AddServerClient } from '../AddServerClient'

export const metadata: Metadata = {
  title: 'Додати Discord-сервер - Eyzencore',
  description: 'Додайте Discord-сервер до каталогу Eyzencore',
}

export default async function AddDiscordServerPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  return (
    <>
      <div className="bg-aurora" />
      <AddServerClient initialUser={user} defaultPlatform="discord" lockPlatform />
    </>
  )
}
