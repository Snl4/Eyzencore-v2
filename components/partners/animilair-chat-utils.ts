export function formatAnimilairDate(value: string) {
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function animilairStatusLabel(status: string) {
  const labels: Record<string, string> = {
    new: 'Нове',
    in_progress: 'В роботі',
    waiting_customer: 'Чекає відповіді',
    awaiting_confirmation: 'Очікує підтвердження',
    completed: 'Завершено',
    canceled: 'Скасовано',
  }
  return labels[status] || status
}

export function formatAnimilairRating(value: number | null | undefined) {
  if (!value || value <= 0) return '—'
  return value.toFixed(1)
}

export function animilairRatingStars(value: number | null | undefined) {
  const rating = Math.max(0, Math.min(5, Number(value) || 0))
  const full = Math.round(rating)
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}

export function animilairUserInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'EC'
}
