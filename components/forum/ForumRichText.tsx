'use client'

import { useMemo, useState } from 'react'
import ReactMarkdown, { type UrlTransform } from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import { LightboxTrigger, useImageLightbox } from '@/components/ui/ImageLightbox'
import { parseForumContent, normalizeForumMediaUrl, type ForumContentBlock } from '@/lib/forum-content'
import { toYoutubeEmbedUrl } from '@/lib/youtube'

const OLD_UPLOAD_URL = /^https?:\/\/(?:www\.)?eyzencore\.com\/uploads\/([^?#]+)/i
const SAFE_COLOR = /^#[0-9a-f]{3,8}$/i

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [...(defaultSchema.attributes?.span || []), 'dataColor'],
    img: [...(defaultSchema.attributes?.img || []), 'loading'],
  },
}

function prepareLegacyMarkup(content: string): string {
  return content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(
      /<span\s+style=["']\s*color\s*:\s*(#[0-9a-f]{3,8})\s*;?\s*["']\s*>/gi,
      '<span data-color="$1">'
    )
}

const transformUrl: UrlTransform = (url) => {
  const normalized = normalizeForumMediaUrl(url)
  if (normalized) return normalized
  const oldUpload = url.match(OLD_UPLOAD_URL)
  if (oldUpload) {
    return `/uploads/legacy-nebula/server/uploads/${oldUpload[1]}`
  }
  return url
}

function ForumMarkdownBlock({ text }: { text: string }) {
  return (
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
        img: ({ alt, ...props }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img {...props} alt={alt || 'Зображення допису'} loading="lazy" />
        ),
        span: ({ children, ...props }) => {
          const color = String(
            (props as typeof props & { 'data-color'?: string })['data-color'] || ''
          )
          return (
            <span style={SAFE_COLOR.test(color) ? { color } : undefined}>
              {children}
            </span>
          )
        },
      }}
    >
      {prepareLegacyMarkup(text)}
    </ReactMarkdown>
  )
}

function ForumImageBlock({ url, caption }: { url: string; caption: string }) {
  return (
    <figure className="forum-rich-figure">
      <LightboxTrigger images={url} alt={caption || 'Зображення допису'} className="image-lightbox-trigger">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={caption || 'Зображення допису'} loading="lazy" />
      </LightboxTrigger>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  )
}

function ForumGalleryBlock({ urls, caption }: { urls: string[]; caption: string }) {
  const [active, setActive] = useState(0)
  const { openImage, lightbox } = useImageLightbox()
  const current = urls[active] || urls[0]
  const goPrev = () => setActive((index) => (index - 1 + urls.length) % urls.length)
  const goNext = () => setActive((index) => (index + 1) % urls.length)

  return (
    <figure className="na-gallery forum-rich-gallery">
      {caption ? <h3>{caption}</h3> : null}
      <div className="na-gallery-viewer">
        {urls.length > 1 && (
          <button
            type="button"
            className="na-gallery-nav na-gallery-nav-prev"
            onClick={goPrev}
            aria-label="Попереднє зображення"
          >
            ←
          </button>
        )}
        <button
          type="button"
          className="na-gallery-stage image-lightbox-trigger"
          onClick={() => openImage(urls, active, caption || undefined)}
          aria-label="Відкрити зображення у повному розмірі"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current} alt={caption || `Зображення ${active + 1}`} loading="lazy" />
          {urls.length > 1 ? <span>{active + 1} / {urls.length}</span> : null}
        </button>
        {urls.length > 1 && (
          <button
            type="button"
            className="na-gallery-nav na-gallery-nav-next"
            onClick={goNext}
            aria-label="Наступне зображення"
          >
            →
          </button>
        )}
      </div>
      {urls.length > 1 && (
        <div className="na-gallery-thumbs">
          {urls.map((url, index) => (
            <button
              type="button"
              className={index === active ? 'active' : ''}
              onClick={() => setActive(index)}
              key={`${url}-${index}`}
              aria-label={`Показати зображення ${index + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {lightbox}
    </figure>
  )
}

function ForumVideoBlock({ url, caption }: { url: string; caption: string }) {
  const embedUrl = toYoutubeEmbedUrl(url)
  return (
    <figure className="forum-rich-figure">
      <div className="forum-rich-video">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={caption || 'Відео з допису'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <a href={url} target="_blank" rel="nofollow noreferrer">
            Відкрити відео ↗
          </a>
        )}
      </div>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  )
}

function renderForumBlock(block: ForumContentBlock, index: number) {
  if (block.type === 'markdown') {
    return <ForumMarkdownBlock key={`md-${index}`} text={block.text} />
  }
  if (block.type === 'image') {
    return <ForumImageBlock key={`img-${index}`} url={block.url} caption={block.caption} />
  }
  if (block.type === 'gallery') {
    return <ForumGalleryBlock key={`gal-${index}`} urls={block.urls} caption={block.caption} />
  }
  return <ForumVideoBlock key={`vid-${index}`} url={block.url} caption={block.caption} />
}

export function ForumRichText({ content }: { content: string }) {
  const blocks = useMemo(() => parseForumContent(content), [content])
  return (
    <div className="forum-rich-text">
      {blocks.map((block, index) => renderForumBlock(block, index))}
    </div>
  )
}
