'use client'

import { useState } from 'react'
import ReactMarkdown, { type UrlTransform } from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), 'u', 'center'],
  attributes: {
    ...defaultSchema.attributes,
    img: [...(defaultSchema.attributes?.img || []), 'loading'],
  },
}

const transformUrl: UrlTransform = (url) => {
  if (url.startsWith('//')) return `https:${url}`
  return url
}

function ResourceMarkdownImage({ src, alt }: { src?: string; alt?: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null

  return (
    <span className="resource-description-figure">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt || 'Зображення ресурсу'}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
      {alt ? <span className="resource-description-caption">{alt}</span> : null}
    </span>
  )
}

export function ResourceMarkdown({ content }: { content: string }) {
  const [translatedContent, setTranslatedContent] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationError, setTranslationError] = useState('')
  const [showTranslation, setShowTranslation] = useState(false)
  const visibleContent = showTranslation && translatedContent ? translatedContent : content

  const translateDescription = async () => {
    if (translatedContent) {
      setShowTranslation(true)
      return
    }
    setIsTranslating(true)
    setTranslationError('')
    try {
      const response = await fetch('/api/resources/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, target: 'uk' }),
      })
      const payload = (await response.json()) as { translated?: string; error?: string }
      if (!response.ok || !payload.translated) {
        setTranslationError(payload.error || 'Не вдалося перекласти опис')
        return
      }
      setTranslatedContent(payload.translated)
      setShowTranslation(true)
    } catch {
      setTranslationError('Не вдалося перекласти опис')
    } finally {
      setIsTranslating(false)
    }
  }

  return (
    <div className="resource-description-wrap">
      <div className="resource-description-toolbar">
        <div>
          <b>{showTranslation ? 'Український переклад' : 'Оригінальний опис'}</b>
          <span>{showTranslation ? 'Автоматичний переклад може мати неточності.' : 'Можна швидко перекласти текст опису українською.'}</span>
        </div>
        <div className="resource-description-actions">
          {showTranslation && (
            <button type="button" onClick={() => setShowTranslation(false)}>
              Оригінал
            </button>
          )}
          <button type="button" onClick={translateDescription} disabled={isTranslating}>
            {isTranslating ? 'Перекладаємо...' : translatedContent ? 'Показати переклад' : 'Перекласти українською'}
          </button>
        </div>
      </div>
      {translationError ? <p className="resource-description-error">{translationError}</p> : null}
      <div className="resource-description">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        urlTransform={transformUrl}
        components={{
          a: ({ children, ...props }) => (
            <a {...props} target="_blank" rel="nofollow noreferrer">
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="resource-md-strong">{children}</strong>,
          em: ({ children }) => <em className="resource-md-em">{children}</em>,
          u: ({ children }) => <u className="resource-md-underline">{children}</u>,
          li: ({ children }) => <li><span>{children}</span></li>,
          img: ({ src, alt }) => <ResourceMarkdownImage src={src} alt={alt} />,
        }}
      >
        {visibleContent}
      </ReactMarkdown>
      </div>
    </div>
  )
}
