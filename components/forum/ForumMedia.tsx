'use client'

import { useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { LightboxTrigger } from '@/components/ui/ImageLightbox'
import {
  faFilm,
  faImage,
  faPaperclip,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import {
  formatFileSize,
  uploadFile,
} from '@/lib/upload'

export type ForumAttachment = {
  url: string
  kind: 'image' | 'video' | 'file'
  mime: string
  size: number
  name: string
}

const FORUM_DOCUMENT_ACCEPT =
  '.pdf,.zip,.rar,.7z,.doc,.docx,.xls,.xlsx,.txt,.psd,application/pdf,application/zip'

const FORUM_MEDIA_ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/ogg,video/quicktime'

export function ForumMediaUploader({
  attachments,
  onChange,
  onError,
}: {
  attachments: ForumAttachment[]
  onChange: (attachments: ForumAttachment[]) => void
  onError: (message: string) => void
}) {
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)

  async function addFiles(files: File[], mode: 'media' | 'document') {
    const available = Math.max(0, 6 - attachments.length)
    const selected = files.slice(0, available)
    if (!selected.length) {
      onError('До одного допису можна додати максимум 6 файлів')
      return
    }
    setUploading(true)
    onError('')
    try {
      const uploaded: ForumAttachment[] = []
      for (const file of selected) {
        const item = await uploadFile(file, 'forum')
        if (mode === 'media' && item.kind !== 'image' && item.kind !== 'video') {
          throw new Error('Оберіть зображення або відео')
        }
        if (mode === 'document' && item.kind !== 'file') {
          throw new Error('Оберіть документ (pdf, zip, doc, txt тощо)')
        }
        if (item.kind === 'image' || item.kind === 'video' || item.kind === 'file') {
          uploaded.push({
            url: item.url,
            kind: item.kind,
            mime: item.mime,
            size: item.size,
            name: item.name,
          })
        }
      }
      onChange([...attachments, ...uploaded])
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Не вдалося завантажити файл')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="forum-media-editor">
      <input
        ref={mediaInputRef}
        type="file"
        accept={FORUM_MEDIA_ACCEPT}
        multiple
        hidden
        onChange={(event) => {
          void addFiles(Array.from(event.target.files || []), 'media')
          event.target.value = ''
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={FORUM_DOCUMENT_ACCEPT}
        multiple
        hidden
        onChange={(event) => {
          void addFiles(Array.from(event.target.files || []), 'document')
          event.target.value = ''
        }}
      />
      <div className="forum-media-upload-actions">
        <button
          className={`forum-media-drop ${dragging ? 'dragging' : ''}`}
          disabled={uploading || attachments.length >= 6}
          onClick={() => mediaInputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            void addFiles(Array.from(event.dataTransfer.files || []), 'media')
          }}
          type="button"
        >
          <FontAwesomeIcon icon={faImage} />
          <span>
            <strong>{uploading ? 'Завантаження...' : 'Додати фото, GIF або відео'}</strong>
            <small>Зображення до 8 МБ, відео до 80 МБ · {attachments.length}/6</small>
          </span>
        </button>
        <button
          className="forum-media-drop forum-media-drop-file"
          disabled={uploading || attachments.length >= 6}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <FontAwesomeIcon icon={faPaperclip} />
          <span>
            <strong>Додати файл</strong>
            <small>PDF, ZIP, DOC, TXT тощо · до 25 МБ</small>
          </span>
        </button>
      </div>
      {attachments.length ? (
        <div className="forum-media-drafts">
          {attachments.map((attachment, index) => (
            <div className="forum-media-draft" key={`${attachment.url}-${index}`}>
              {attachment.kind === 'image' ? (
                <img src={attachment.url} alt={attachment.name} />
              ) : attachment.kind === 'video' ? (
                <div className="forum-media-video-icon">
                  <FontAwesomeIcon icon={faFilm} />
                </div>
              ) : (
                <div className="forum-media-file-icon">
                  <FontAwesomeIcon icon={faPaperclip} />
                </div>
              )}
              <div>
                <strong>{attachment.name}</strong>
                <small>
                  {attachment.kind === 'image' ? (
                    <FontAwesomeIcon icon={faImage} />
                  ) : attachment.kind === 'video' ? (
                    <FontAwesomeIcon icon={faFilm} />
                  ) : (
                    <FontAwesomeIcon icon={faPaperclip} />
                  )}{' '}
                  {formatFileSize(attachment.size)}
                </small>
              </div>
              <button
                aria-label="Прибрати вкладення"
                onClick={() =>
                  onChange(attachments.filter((_, itemIndex) => itemIndex !== index))
                }
                type="button"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function ForumMediaGallery({
  attachments,
}: {
  attachments: ForumAttachment[]
}) {
  if (!attachments.length) return null
  const mediaItems = attachments.filter((item) => item.kind !== 'file')
  const fileItems = attachments.filter((item) => item.kind === 'file')
  const imageUrls = mediaItems.filter((item) => item.kind === 'image').map((item) => item.url)

  return (
    <div className="forum-media-display">
      {mediaItems.length > 0 ? (
        <div className={`forum-media-gallery count-${Math.min(mediaItems.length, 4)}`}>
          {mediaItems.map((attachment, index) =>
            attachment.kind === 'video' ? (
              <figure className="forum-media-item video" key={`${attachment.url}-${index}`}>
                <video controls preload="metadata" src={attachment.url}>
                  Ваш браузер не підтримує відео.
                </video>
                <figcaption>{attachment.name}</figcaption>
              </figure>
            ) : (
              <LightboxTrigger
                key={`${attachment.url}-${index}`}
                images={imageUrls}
                index={imageUrls.indexOf(attachment.url)}
                alt={attachment.name}
                className="forum-media-item image-lightbox-trigger"
              >
                <img loading="lazy" src={attachment.url} alt={attachment.name} />
              </LightboxTrigger>
            )
          )}
        </div>
      ) : null}
      {fileItems.length > 0 ? (
        <div className="forum-media-files">
          {fileItems.map((attachment, index) => (
            <a
              className="forum-media-file"
              download={attachment.name}
              href={attachment.url}
              key={`${attachment.url}-${index}`}
              rel="noreferrer"
              target="_blank"
            >
              <FontAwesomeIcon icon={faPaperclip} />
              <span>
                <strong>{attachment.name}</strong>
                <small>{formatFileSize(attachment.size)}</small>
              </span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  )
}
