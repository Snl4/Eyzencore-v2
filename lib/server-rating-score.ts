export function buildServerRatingScore(input: {
  votesCount?: number
  likesCount?: number
}): number {
  const votesCount = Number(input.votesCount || 0)
  const likesCount = Number(input.likesCount || 0)
  return Number((
    Math.log1p(votesCount) * 4 +
    Math.log1p(likesCount) * 3
  ).toFixed(2))
}
