import Image from 'next/image'
import type { AuthReviewTickerItem } from '@/lib/auth-review-ticker'

type AuthReviewTickerProps = {
  reviews: AuthReviewTickerItem[]
}

export function AuthReviewTicker({ reviews }: AuthReviewTickerProps) {
  const tickerReviews = reviews.length > 1 ? [...reviews, ...reviews] : reviews

  if (tickerReviews.length === 0) {
    return null
  }

  return (
    <div className="auth-review-ticker" aria-label="Відгуки серверів">
      <div className="auth-review-track">
        {tickerReviews.map((review, index) => (
          <div className="auth-review-card" key={`${review.id}-${index}`}>
            <Image src={review.serverAvatarUrl} alt="" width={42} height={42} unoptimized />
            <div>
              <div className="auth-review-top">
                <span>Відгук про сервер</span>
                <b>{'★'.repeat(review.rating)}{'☆'.repeat(Math.max(0, 5 - review.rating))}</b>
                <em>{review.platform}</em>
              </div>
              <p>“{review.text}”</p>
              <small>— {review.author} · сервер {review.serverName}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
