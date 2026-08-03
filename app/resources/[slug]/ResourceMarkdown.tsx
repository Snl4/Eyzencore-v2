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
  return (
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
        {content}
      </ReactMarkdown>
    </div>
  )
}
