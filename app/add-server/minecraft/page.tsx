import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { AddServerClient } from '../AddServerClient'

export const metadata: Metadata = {
  title: 'Додати Minecraft-сервер - Eyzencore',
  description: 'Додайте Minecraft-сервер до каталогу Eyzencore',
}

export default async function AddMinecraftServerPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  return (
    <>
      <div className="bg-aurora" />
      <AddServerClient initialUser={user} defaultPlatform="minecraft" lockPlatform />
    </>
  )
}
