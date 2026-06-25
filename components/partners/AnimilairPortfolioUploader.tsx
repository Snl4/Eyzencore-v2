'use client'

import { useMemo, useRef, useState } from 'react'
import { isImageFile, uploadFile } from '@/lib/upload'
import { LightboxTrigger } from '@/components/ui/ImageLightbox'

type AnimilairPortfolioUploaderProps = {
  value: string
  onChange: (value: string) => void
  onError?: (message: string) => void
  disabled?: boolean
  maxItems?: number
}

const DEFAULT_MAX_ITEMS = 12

function parsePortfolioUrls(value: string): string[] {
  return value
    .split('\n')
    .map((url) => url.trim())
    .filter(Boolean)
}

function serializePortfolioUrls(urls: string[]): string {
  return urls.join('\n')
}

export function AnimilairPortfolioUploader({
  value,
  onChange,
  onError,
  disabled = false,
  maxItems = DEFAULT_MAX_ITEMS,
}: AnimilairPortfolioUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const urls = useMemo(() => parsePortfolioUrls(value), [value])
  const slotsLeft = Math.max(0, maxItems - urls.length)

  const handleRemove = (index: number) => {
    onChange(serializePortfolioUrls(urls.filter((_, itemIndex) => itemIndex !== index)))
  }

  const handleUploadFiles = async (files: FileList | File[] | null) => {
    if (!files || disabled || uploading || slotsLeft === 0) return
    const selected = Array.from(files).filter(isImageFile).slice(0, slotsLeft)
    if (selected.length === 0) {
      onError?.('Додайте зображення у форматі JPG, PNG або WebP')
      return
    }
    setUploading(true)
    try {
      const uploadedUrls: string[] = []
      for (const file of selected) {
        const uploaded = await uploadFile(file, 'misc')
        if (uploaded.kind === 'image') {
          uploadedUrls.push(uploaded.url)
        }
      }
      if (uploadedUrls.length === 0) {
        onError?.('Не вдалося завантажити зображення')
        return
      }
      onChange(serializePortfolioUrls([...urls, ...uploadedUrls]))
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Не вдалося завантажити зображення')
    } finally {
      setUploading(false)
    }
  }

  const handlePickClick = () => {
    if (disabled || uploading || slotsLeft === 0) return
    inputRef.current?.click()
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOver(false)
    if (disabled || uploading || slotsLeft === 0) return
    void handleUploadFiles(event.dataTransfer.files)
  }

  return (
    <div className="animilair-portfolio-uploader">
      <div className="animilair-portfolio-uploader-head">
        <span>Портфоліо</span>
        <small>{urls.length} / {maxItems}</small>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        disabled={disabled || uploading || slotsLeft === 0}
        onChange={(event) => {
          void handleUploadFiles(event.target.files)
          event.target.value = ''
        }}
      />

      <div
        className={`animilair-portfolio-drop${dragOver ? ' is-over' : ''}${uploading ? ' is-uploading' : ''}`}
        onClick={handlePickClick}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled && !uploading && slotsLeft > 0) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={disabled || slotsLeft === 0 ? -1 : 0}
        aria-label="Додати зображення до портфоліо"
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handlePickClick()
          }
        }}
      >
        <strong>
          {uploading
            ? 'Завантажуємо…'
            : slotsLeft === 0
              ? 'Досягнуто ліміт зображень'
              : 'Додайте зображення портфоліо'}
        </strong>
        <span>
          {slotsLeft > 0
            ? 'Перетягніть сюди або натисніть, щоб обрати з ПК'
            : 'Приберіть зайве, щоб додати нові'}
        </span>
      </div>

      {urls.length > 0 && (
        <div className="animilair-portfolio-grid">
          {urls.map((url, index) => (
            <article className="animilair-portfolio-item" key={`${url}-${index}`}>
              <LightboxTrigger images={urls} index={index} className="image-lightbox-trigger">
                <img src={url} alt="" />
              </LightboxTrigger>
              <button
                type="button"
                className="animilair-portfolio-remove"
                aria-label="Прибрати зображення"
                disabled={disabled || uploading}
                onClick={() => handleRemove(index)}
              >
                ×
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
