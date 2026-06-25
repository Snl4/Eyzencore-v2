'use client'

import { useEffect, useState, type ReactNode } from 'react'

export type ImageLightboxProps = {
  images: string[]
  index: number
  alt?: string
  onClose: () => void
  onIndexChange?: (index: number) => void
}

export function ImageLightbox({
  images,
  index,
  alt,
  onClose,
  onIndexChange,
}: ImageLightboxProps) {
  const safeIndex = Math.min(Math.max(index, 0), Math.max(images.length - 1, 0))
  const src = images[safeIndex]
  const hasMultiple = images.length > 1

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (!hasMultiple || !onIndexChange) return
      if (event.key === 'ArrowLeft') {
        onIndexChange((safeIndex - 1 + images.length) % images.length)
      }
      if (event.key === 'ArrowRight') {
        onIndexChange((safeIndex + 1) % images.length)
      }
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [hasMultiple, images.length, onClose, onIndexChange, safeIndex])

  if (!src) return null

  return (
    <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={alt || 'Перегляд зображення'}>
      <button
        type="button"
        className="image-lightbox-backdrop"
        aria-label="Закрити перегляд"
        onClick={onClose}
      />
      <button
        type="button"
        className="image-lightbox-close"
        aria-label="Закрити"
        onClick={onClose}
      >
        ×
      </button>
      {hasMultiple && onIndexChange && (
        <>
          <button
            type="button"
            className="image-lightbox-nav image-lightbox-nav-prev"
            aria-label="Попереднє зображення"
            onClick={() => onIndexChange((safeIndex - 1 + images.length) % images.length)}
          >
            ‹
          </button>
          <button
            type="button"
            className="image-lightbox-nav image-lightbox-nav-next"
            aria-label="Наступне зображення"
            onClick={() => onIndexChange((safeIndex + 1) % images.length)}
          >
            ›
          </button>
        </>
      )}
      <div
        className="image-lightbox-stage"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={() => undefined}
        role="presentation"
      >
        <img src={src} alt={alt || `Зображення ${safeIndex + 1}`} />
        {hasMultiple && (
          <span className="image-lightbox-counter">{safeIndex + 1} / {images.length}</span>
        )}
      </div>
    </div>
  )
}

type LightboxTriggerProps = {
  images: string | string[]
  index?: number
  alt?: string
  className?: string
  children: ReactNode
}

export function LightboxTrigger({
  images,
  index = 0,
  alt,
  className,
  children,
}: LightboxTriggerProps) {
  const imageList = Array.isArray(images) ? images.filter(Boolean) : [images].filter(Boolean)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(index)

  const handleOpen = () => {
    if (imageList.length === 0) return
    setActiveIndex(Math.min(Math.max(index, 0), imageList.length - 1))
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        className={className || 'image-lightbox-trigger'}
        aria-label={alt || 'Відкрити зображення'}
        onClick={handleOpen}
      >
        {children}
      </button>
      {open && (
        <ImageLightbox
          images={imageList}
          index={activeIndex}
          alt={alt}
          onClose={() => setOpen(false)}
          onIndexChange={imageList.length > 1 ? setActiveIndex : undefined}
        />
      )}
    </>
  )
}

export function useImageLightbox() {
  const [viewer, setViewer] = useState<{ images: string[]; index: number; alt?: string } | null>(null)

  const openImage = (images: string | string[], index = 0, alt?: string) => {
    const imageList = (Array.isArray(images) ? images : [images]).filter(Boolean)
    if (imageList.length === 0) return
    setViewer({
      images: imageList,
      index: Math.min(Math.max(index, 0), imageList.length - 1),
      alt,
    })
  }

  const closeImage = () => setViewer(null)

  const lightbox = viewer ? (
    <ImageLightbox
      images={viewer.images}
      index={viewer.index}
      alt={viewer.alt}
      onClose={closeImage}
      onIndexChange={viewer.images.length > 1
        ? (nextIndex) => setViewer((current) => current ? { ...current, index: nextIndex } : current)
        : undefined}
    />
  ) : null

  return { openImage, closeImage, lightbox }
}
