export function buildServerRatingScore(input: {
  averageRating?: number
  votesCount?: number
  likesCount?: number
  reviewsCount?: number
}): number {
  const averageRating = Number(input.averageRating || 0)
  const votesCount = Number(input.votesCount || 0)
  const likesCount = Number(input.likesCount || 0)
  const reviewsCount = Number(input.reviewsCount || 0)
  return Number((
    averageRating * 12 +
    Math.log1p(votesCount) * 4 +
    Math.log1p(likesCount) * 3 +
    Math.log1p(reviewsCount) * 5
  ).toFixed(2))
}
