'use client'

import { useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faImage, faLink, faPaperclip, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons'
import {
  ANIMILAIR_MESSAGE_MAX_ATTACHMENTS,
  ANIMILAIR_MESSAGE_MAX_LENGTH,
  type AnimilairMessageAttachment,
} from '@/lib/animilair-shared'
import { formatFileSize, isImageFile, uploadFile } from '@/lib/upload'

type Props = {
  busy: boolean
  onSend: (payload: { body: string; attachments: AnimilairMessageAttachment[] }) => Promise<void>
}

export function AnimilairChatCompose({ busy, onSend }: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<AnimilairMessageAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkCaption, setLinkCaption] = useState('')
  const [error, setError] = useState('')

  const canSend = !busy && !uploading && (body.trim().length > 0 || attachments.length > 0)
  const charsLeft = ANIMILAIR_MESSAGE_MAX_LENGTH - body.length

  const addUploaded = (uploaded: Awaited<ReturnType<typeof uploadFile>>) => {
    if (attachments.length >= ANIMILAIR_MESSAGE_MAX_ATTACHMENTS) {
      setError(`Максимум ${ANIMILAIR_MESSAGE_MAX_ATTACHMENTS} вкладення в одному повідомленні`)
      return
    }
    if (uploaded.kind === 'image') {
      setAttachments((current) => [...current, {
        type: 'image',
        url: uploaded.url,
        name: uploaded.name,
        mime: uploaded.mime,
        size: uploaded.size,
      }])
      return
    }
    setAttachments((current) => [...current, {
      type: 'file',
      url: uploaded.url,
      name: uploaded.name,
      mime: uploaded.mime,
      size: uploaded.size,
    }])
  }

  const uploadFiles = async (files: File[], asImage: boolean) => {
    const available = ANIMILAIR_MESSAGE_MAX_ATTACHMENTS - attachments.length
    const selected = files.slice(0, available)
    if (!selected.length) {
      setError(`Максимум ${ANIMILAIR_MESSAGE_MAX_ATTACHMENTS} вкладення в одному повідомленні`)
      return
    }
    setUploading(true)
    setError('')
    try {
      for (const file of selected) {
        if (asImage && !isImageFile(file)) {
          throw new Error('Оберіть зображення')
        }
        const uploaded = await uploadFile(file, 'animilair')
        addUploaded(uploaded)
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Не вдалося завантажити файл')
    } finally {
      setUploading(false)
    }
  }

  const addLink = () => {
    const url = linkUrl.trim()
    if (!/^https?:\/\//i.test(url)) {
      setError('Вкажіть коректне посилання (https://...)')
      return
    }
    if (attachments.length >= ANIMILAIR_MESSAGE_MAX_ATTACHMENTS) {
      setError(`Максимум ${ANIMILAIR_MESSAGE_MAX_ATTACHMENTS} вкладення в одному повідомленні`)
      return
    }
    setAttachments((current) => [...current, {
      type: 'link',
      url,
      caption: linkCaption.trim().slice(0, 120),
    }])
    setLinkUrl('')
    setLinkCaption('')
    setLinkOpen(false)
    setError('')
  }

  const handleSend = async () => {
    if (!canSend) return
    setError('')
    await onSend({ body: body.trim(), attachments })
    setBody('')
    setAttachments([])
    setLinkOpen(false)
  }

  return (
    <div className="animilair-chat-compose-panel">
      {linkOpen && (
        <div className="animilair-link-popover">
          <div className="animilair-link-popover-head">
            <strong>Посилання на Google Диск</strong>
            <button type="button" className="btn btn-ghost" aria-label="Закрити" onClick={() => setLinkOpen(false)}>
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
          <input
            type="url"
            placeholder="https://drive.google.com/..."
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
          />
          <input
            type="text"
            placeholder="Підпис (необовʼязково)"
            value={linkCaption}
            onChange={(event) => setLinkCaption(event.target.value)}
          />
          <button type="button" className="btn btn-secondary" onClick={addLink}>
            Додати посилання
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="animilair-compose-attachments">
          {attachments.map((attachment, index) => (
            <div className="animilair-compose-attachment" key={`${attachment.type}-${attachment.url}-${index}`}>
              {attachment.type === 'image' ? (
                <img src={attachment.url} alt={attachment.name} />
              ) : attachment.type === 'file' ? (
                <span className="animilair-compose-file-icon">
                  <FontAwesomeIcon icon={faPaperclip} />
                </span>
              ) : (
                <span className="animilair-compose-file-icon">
                  <FontAwesomeIcon icon={faLink} />
                </span>
              )}
              <div>
                <strong>{attachment.type === 'link' ? (attachment.caption || 'Посилання') : attachment.name}</strong>
                <small>
                  {attachment.type === 'link'
                    ? attachment.url
                    : formatFileSize(attachment.size)}
                </small>
              </div>
              <button
                type="button"
                aria-label="Прибрати вкладення"
                onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <div className="animilair-form-message error">{error}</div>}

      <div className="animilair-chat-compose">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          hidden
          onChange={(event) => {
            void uploadFiles(Array.from(event.target.files || []), true)
            event.target.value = ''
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.zip,.rar,.7z,.doc,.docx,.xls,.xlsx,.txt,.psd,application/pdf,application/zip"
          hidden
          onChange={(event) => {
            void uploadFiles(Array.from(event.target.files || []), false)
            event.target.value = ''
          }}
        />
        <div className="animilair-compose-toolbar">
          <button
            type="button"
            className="animilair-compose-tool"
            aria-label="Додати фото"
            disabled={busy || uploading || attachments.length >= ANIMILAIR_MESSAGE_MAX_ATTACHMENTS}
            onClick={() => imageInputRef.current?.click()}
          >
            <FontAwesomeIcon icon={faImage} />
          </button>
          <button
            type="button"
            className="animilair-compose-tool"
            aria-label="Додати файл"
            disabled={busy || uploading || attachments.length >= ANIMILAIR_MESSAGE_MAX_ATTACHMENTS}
            onClick={() => fileInputRef.current?.click()}
          >
            <FontAwesomeIcon icon={faPaperclip} />
          </button>
          <button
            type="button"
            className={`animilair-compose-tool${linkOpen ? ' active' : ''}`}
            aria-label="Додати посилання"
            disabled={busy || uploading || attachments.length >= ANIMILAIR_MESSAGE_MAX_ATTACHMENTS}
            onClick={() => setLinkOpen((open) => !open)}
          >
            <FontAwesomeIcon icon={faLink} />
          </button>
        </div>
        <textarea
          rows={3}
          maxLength={ANIMILAIR_MESSAGE_MAX_LENGTH}
          placeholder="Напишіть уточнення, посилання на референси або правки..."
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <div className="animilair-compose-foot">
          <span className="animilair-compose-counter">{charsLeft} / {ANIMILAIR_MESSAGE_MAX_LENGTH}</span>
          <button className="btn btn-primary" type="button" disabled={!canSend} onClick={() => void handleSend()}>
            {busy || uploading ? 'Надсилаємо...' : 'Надіслати'}
          </button>
        </div>
      </div>
    </div>
  )
}
