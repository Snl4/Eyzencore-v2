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
    completed: 'Готово',
    canceled: 'Скасовано',
  }
  return labels[status] || status
}

export function animilairUserInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'EC'
}
