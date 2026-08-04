import { buildResourceSlug } from '@/lib/resource-slug'

export function buildForumThreadSlug(input: { id: number; title: string }) {
  return buildResourceSlug({ id: input.id, name: input.title || 'forum-topic' })
}

export function buildForumThreadPath(input: { id: number; title: string }) {
  return `/forum/${buildForumThreadSlug(input)}`
}

export function parseForumThreadIdFromSlug(value: string): number | null {
  const raw = String(value || '').trim()
  if (/^\d+$/.test(raw)) return Number(raw)
  const match = raw.match(/-(\d+)$/)
  return match ? Number(match[1]) : null
}
