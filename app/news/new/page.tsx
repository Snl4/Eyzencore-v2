import { redirect } from 'next/navigation'
import { NewsEditorPage } from '@/components/news/NewsEditorPage'
import { getCurrentUser } from '@/lib/auth-server'
import { countServersByOwner, resolveUserRole } from '@/lib/auth-db'

export const dynamic = 'force-dynamic'

export default async function NewsCreatePage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/login')
  }
  const role = await resolveUserRole({
    userId: user.id,
    role: user.user_metadata.role,
  })
  const serverCount = await countServersByOwner(user.id)
  if (role !== 'ADMIN' && serverCount === 0) {
    redirect('/news')
  }
  return (
    <>
      <div className="bg-aurora" />
      <NewsEditorPage mode="create" initialUser={user} />
    </>
  )
}
