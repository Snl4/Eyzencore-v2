'use client'

import { useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFilm,
  faImage,
  faPaperclip,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import {
  formatFileSize,
  uploadFile,
  type UploadedFile,
} from '@/lib/upload'

export type ForumAttachment = UploadedFile

export function ForumMediaUploader({
  attachments,
  onChange,
  onError,
}: {
  attachments: ForumAttachment[]
  onChange: (attachments: ForumAttachment[]) => void
  onError: (message: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)

  async function addFiles(files: File[]) {
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
        uploaded.push(await uploadFile(file, 'forum'))
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
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/ogg,video/quicktime"
        multiple
        hidden
        onChange={(event) => {
          void addFiles(Array.from(event.target.files || []))
          event.target.value = ''
        }}
      />
      <button
        className={`forum-media-drop ${dragging ? 'dragging' : ''}`}
        disabled={uploading || attachments.length >= 6}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void addFiles(Array.from(event.dataTransfer.files || []))
        }}
        type="button"
      >
        <FontAwesomeIcon icon={faPaperclip} />
        <span>
          <strong>{uploading ? 'Завантаження...' : 'Додати фото, GIF або відео'}</strong>
          <small>Зображення до 8 МБ, відео до 80 МБ · {attachments.length}/6</small>
        </span>
      </button>
      {attachments.length ? (
        <div className="forum-media-drafts">
          {attachments.map((attachment, index) => (
            <div className="forum-media-draft" key={`${attachment.url}-${index}`}>
              {attachment.kind === 'image' ? (
                <img src={attachment.url} alt={attachment.name} />
              ) : (
                <div className="forum-media-video-icon">
                  <FontAwesomeIcon icon={faFilm} />
                </div>
              )}
              <div>
                <strong>{attachment.name}</strong>
                <small>
                  {attachment.kind === 'image' ? (
                    <FontAwesomeIcon icon={faImage} />
                  ) : (
                    <FontAwesomeIcon icon={faFilm} />
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

  return (
    <div className={`forum-media-gallery count-${Math.min(attachments.length, 4)}`}>
      {attachments.map((attachment, index) =>
        attachment.kind === 'video' ? (
          <figure className="forum-media-item video" key={`${attachment.url}-${index}`}>
            <video controls preload="metadata" src={attachment.url}>
              Ваш браузер не підтримує відео.
            </video>
            <figcaption>{attachment.name}</figcaption>
          </figure>
        ) : (
          <a
            className="forum-media-item"
            href={attachment.url}
            key={`${attachment.url}-${index}`}
            rel="noreferrer"
            target="_blank"
          >
            <img loading="lazy" src={attachment.url} alt={attachment.name} />
          </a>
        )
      )}
    </div>
  )
}
