'use client'

import { useState } from 'react'

function isVideoMedia(url: string) {
  return /\.(mp4|webm|ogv|mov)(\?|#|$)/i.test(url)
}

export function ResourceMediaGallery({ media }: { media: string[] }) {
  const [failedMedia, setFailedMedia] = useState<Set<string>>(() => new Set())
  const visibleMedia = media.filter((item) => !failedMedia.has(item))

  const markFailed = (item: string) => {
    setFailedMedia((previous) => {
      const next = new Set(previous)
      next.add(item)
      return next
    })
  }

  if (visibleMedia.length === 0) return null

  return (
    <section className="resource-gallery">
      {visibleMedia.map((item) => (
        isVideoMedia(item)
          ? (
            <figure key={item} className="resource-gallery-item">
              <video src={item} controls preload="metadata" onError={() => markFailed(item)} />
            </figure>
          )
          : (
            <figure key={item} className="resource-gallery-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item} alt="" loading="lazy" decoding="async" onError={() => markFailed(item)} />
            </figure>
          )
      ))}
    </section>
  )
}
