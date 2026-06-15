'use client'

import ReactMarkdown, { type UrlTransform } from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

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
  const oldUpload = url.match(OLD_UPLOAD_URL)
  if (oldUpload) {
    return `/uploads/legacy-nebula/server/uploads/${oldUpload[1]}`
  }
  return url
}

export function ForumRichText({ content }: { content: string }) {
  return (
    <div className="forum-rich-text">
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
        {prepareLegacyMarkup(content)}
      </ReactMarkdown>
    </div>
  )
}
