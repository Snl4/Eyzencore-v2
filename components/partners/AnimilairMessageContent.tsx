'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLink, faPaperclip } from '@fortawesome/free-solid-svg-icons'
import { LightboxTrigger } from '@/components/ui/ImageLightbox'
import type { AnimilairMessageAttachment } from '@/lib/animilair-shared'
import { formatFileSize } from '@/lib/upload'

export function AnimilairMessageContent({
  body,
  attachments,
}: {
  body: string
  attachments: AnimilairMessageAttachment[]
}) {
  const imageUrls = attachments
    .filter((attachment) => attachment.type === 'image')
    .map((attachment) => attachment.url)

  return (
    <div className="animilair-message-content">
      {body ? <p>{body}</p> : null}
      {attachments.length > 0 && (
        <div className="animilair-message-attachments">
          {attachments.map((attachment, index) => {
            if (attachment.type === 'image') {
              const imageIndex = imageUrls.indexOf(attachment.url)
              return (
                <LightboxTrigger
                  key={`${attachment.url}-${index}`}
                  images={imageUrls}
                  index={imageIndex}
                  alt={attachment.name}
                  className="animilair-message-image image-lightbox-trigger"
                >
                  <img src={attachment.url} alt={attachment.name} />
                </LightboxTrigger>
              )
            }
            if (attachment.type === 'file') {
              return (
                <a
                  key={`${attachment.url}-${index}`}
                  className="animilair-message-file"
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FontAwesomeIcon icon={faPaperclip} />
                  <span>
                    <strong>{attachment.name}</strong>
                    <small>{formatFileSize(attachment.size)}</small>
                  </span>
                </a>
              )
            }
            return (
              <a
                key={`${attachment.url}-${index}`}
                className="animilair-message-link"
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
              >
                <FontAwesomeIcon icon={faLink} />
                <span>
                  <strong>{attachment.caption || 'Посилання на файл'}</strong>
                  <small>{attachment.url}</small>
                </span>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
