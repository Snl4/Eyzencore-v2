import type { Metadata } from 'next'
import { PRIVATE_PAGE_ROBOTS } from '@/lib/seo'

export const metadata: Metadata = {
  robots: PRIVATE_PAGE_ROBOTS,
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
