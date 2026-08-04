'use client'

import { useState } from 'react'
import { LightboxTrigger } from '@/components/ui/ImageLightbox'

function isVideoMedia(url: string) {
  return /\.(mp4|webm|ogv|mov)(\?|#|$)/i.test(url)
}

export function ResourceMediaGallery({ media }: { media: string[] }) {
  const [failedMedia, setFailedMedia] = useState<Set<string>>(() => new Set())
  const visibleMedia = media.filter((item) => !failedMedia.has(item))
  const imageUrls = visibleMedia.filter((item) => !isVideoMedia(item))

  const markFailed = (item: string) => {
    setFailedMedia((previous) => {
      const next = new Set(previous)
      next.add(item)
      return next
    })
  }

  if (visibleMedia.length === 0) return null

  return (
    <section className="forum-media-display resource-gallery-display">
      <div className={`forum-media-gallery resource-gallery count-${Math.min(visibleMedia.length, 4)}`}>
      {visibleMedia.map((item) => (
        isVideoMedia(item)
          ? (
            <figure key={item} className="forum-media-item resource-gallery-item video">
              <video src={item} controls preload="metadata" onError={() => markFailed(item)} />
            </figure>
          )
          : (
            <LightboxTrigger
              key={item}
              images={imageUrls}
              index={imageUrls.indexOf(item)}
              alt="Зображення ресурсу"
              className="forum-media-item resource-gallery-item image-lightbox-trigger"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item} alt="" loading="lazy" decoding="async" onError={() => markFailed(item)} />
            </LightboxTrigger>
          )
      ))}
      </div>
    </section>
  )
}
