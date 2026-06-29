import type { CSSProperties } from 'react'

export const BANNER_ASPECT_WIDTH = 3

export const BANNER_ASPECT_HEIGHT = 1

export const BANNER_CROP_WIDTH = 1200

export const BANNER_CROP_HEIGHT = 400

export const BANNER_ASPECT_RATIO = BANNER_ASPECT_WIDTH / BANNER_ASPECT_HEIGHT

export function buildBannerSurfaceStyle(bannerUrl?: string | null): CSSProperties | undefined {
  if (!bannerUrl) return undefined
  return {
    backgroundImage: `url(${JSON.stringify(bannerUrl).slice(1, -1)})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }
}
