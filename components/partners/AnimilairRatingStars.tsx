'use client'

type Props = {
  value: number
  max?: number
  size?: 'sm' | 'md'
  onChange?: (value: number) => void
}

export function AnimilairRatingStars({ value, max = 5, size = 'md', onChange }: Props) {
  const rating = Math.max(0, Math.min(max, Number(value) || 0))
  const interactive = typeof onChange === 'function'

  return (
    <div className={`animilair-rating-stars${size === 'sm' ? ' sm' : ''}${interactive ? ' interactive' : ''}`} aria-label={`Оцінка ${rating} з ${max}`}>
      {Array.from({ length: max }, (_, index) => {
        const starValue = index + 1
        const active = starValue <= rating
        if (!interactive) {
          return (
            <span key={starValue} className={active ? 'active' : ''} aria-hidden="true">
              {active ? '★' : '☆'}
            </span>
          )
        }
        return (
          <button
            key={starValue}
            type="button"
            className={active ? 'active' : ''}
            aria-label={`${starValue} з ${max}`}
            onClick={() => onChange?.(starValue)}
          >
            {active ? '★' : '☆'}
          </button>
        )
      })}
    </div>
  )
}
