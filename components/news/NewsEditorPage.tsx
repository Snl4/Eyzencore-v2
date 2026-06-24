'use client'

import { useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Select } from '@/components/ui/Select'
import { uploadFile, formatFileSize } from '@/lib/upload'
import type { AuthUser, NewsContentBlock, NewsPost } from '@/lib/auth-db'
import { buildNewsPath } from '@/lib/news-slug'

type NewsEditorMode = 'create' | 'edit'

type NewsEditorPageProps = {
  mode: NewsEditorMode
  initialUser: AuthUser | null
  initialPost?: NewsPost
}

type NewsEditorForm = {
  title: string
  category: string
  excerpt: string
  coverUrl: string
  blocks: NewsContentBlock[]
}

type BlockTypeMeta = {
  value: NewsContentBlock['type']
  label: string
  hint: string
  icon: ReactNode
}

const HeadingIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4v16M18 4v16M6 12h12"/></svg>
)
const ParagraphIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h12"/></svg>
)
const QuoteIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11h6v6H3zM15 11h6v6h-6zM3 11V7a4 4 0 014-4M15 11V7a4 4 0 014-4"/></svg>
)
const ImageIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.5-3.5L10 19"/></svg>
)
const VideoIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4z"/></svg>
)
const GalleryIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="14" height="14" rx="2"/><path d="m7 15 3-3 3 3 2-2 2 2"/><path d="M7 5V3h14v14h-4"/></svg>
)
const TrashIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>
)
const UploadIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
)
const ArrowUpIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
)
const ArrowDownIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
)
const BoldIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 010 8H6z"/><path d="M6 12h9a4 4 0 010 8H6z"/></svg>
)
const ItalicIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
)
const StrikeIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4H9a3 3 0 00-2.83 4"/><path d="M14 12a4 4 0 010 8H6"/><line x1="4" y1="12" x2="20" y2="12"/></svg>
)
const InlineCodeIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
)
const LinkIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
)

const BLOCK_TYPES: BlockTypeMeta[] = [
  { value: 'heading', label: 'Заголовок', hint: 'Розділ або підзаголовок', icon: HeadingIcon },
  { value: 'paragraph', label: 'Абзац', hint: 'Звичайний текст', icon: ParagraphIcon },
  { value: 'quote', label: 'Цитата', hint: 'Виділена фраза', icon: QuoteIcon },
  { value: 'image', label: 'Зображення', hint: 'Завантаж з ПК або встав посилання', icon: ImageIcon },
  { value: 'video', label: 'Відео', hint: 'Файл або посилання YouTube', icon: VideoIcon },
  { value: 'gallery', label: 'Галерея', hint: 'Слайдер із кількох зображень', icon: GalleryIcon },
]

const CATEGORIES = ['Новини', 'Оновлення', 'Гайд', 'Подія', 'Анонс', 'Інтервʼю', 'Реліз']

function createBlockId(): string {
  return `news-block-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function createEmptyBlock(type: NewsContentBlock['type']): NewsContentBlock {
  if (type === 'gallery') {
    return { id: createBlockId(), type, urls: [], caption: '' }
  }
  if (type === 'image' || type === 'video') {
    return { id: createBlockId(), type, url: '', caption: '' }
  }
  return { id: createBlockId(), type, text: '' }
}

function normalizeImportedUrl(value: string): string {
  return value.trim().replace('https://eyzencore.com//uploads/', '/uploads/')
}

function parseLegacyNewsContent(raw: string): NewsContentBlock[] {
  const source = raw.replace(/\r\n/g, '\n').trim()
  if (!source) return []
  const blocks: NewsContentBlock[] = []
  const tokenPattern = /::slider::\s*([\s\S]*?)\s*::\/slider::|::video::\s*([\s\S]*?)\s*::\/video::/gi
  let cursor = 0

  const appendText = (text: string) => {
    text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean).forEach((part) => {
      const imageMatch = part.match(/^!\[[^\]]*\]\((https?:\/\/[^)]+)\)$/)
      if (imageMatch) {
        blocks.push({ id: createBlockId(), type: 'image', url: normalizeImportedUrl(imageMatch[1]), caption: '' })
      } else {
        blocks.push({ id: createBlockId(), type: 'paragraph', text: part })
      }
    })
  }

  let match: RegExpExecArray | null
  while ((match = tokenPattern.exec(source)) !== null) {
    appendText(source.slice(cursor, match.index))
    if (match[1] != null) {
      const lines = match[1].split('\n').map((line) => line.trim()).filter(Boolean)
      const caption = lines[0] && !/^https?:\/\//i.test(lines[0]) ? lines.shift() || '' : ''
      const urls = lines.filter((line) => /^https?:\/\//i.test(line)).map(normalizeImportedUrl)
      if (urls.length) blocks.push({ id: createBlockId(), type: 'gallery', urls, caption })
    } else if (match[2] != null) {
      const url = match[2].split('\n').map((line) => line.trim()).find((line) => /^https?:\/\//i.test(line))
      if (url) blocks.push({ id: createBlockId(), type: 'video', url, caption: '' })
    }
    cursor = tokenPattern.lastIndex
  }
  appendText(source.slice(cursor))
  return blocks
}

function buildInitialForm(input: { mode: NewsEditorMode; initialPost?: NewsPost }): NewsEditorForm {
  if (input.mode === 'edit' && input.initialPost) {
    return {
      title: input.initialPost.title,
      category: input.initialPost.category || 'Новини',
      excerpt: input.initialPost.excerpt,
      coverUrl: input.initialPost.coverUrl || '',
      blocks:
        input.initialPost.blocks.length > 0
          ? input.initialPost.blocks
          : [{ id: createBlockId(), type: 'paragraph', text: input.initialPost.content }],
    }
  }
  return {
    title: '',
    category: 'Новини',
    excerpt: '',
    coverUrl: '',
    blocks: [{ id: createBlockId(), type: 'paragraph', text: '' }],
  }
}

function isVideoFileUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|ogv|mov)(\?.*)?$/i.test(url)
}

function getYoutubeEmbed(url: string): string | null {
  const trimmed = String(url || '').trim()
  if (!trimmed) return null
  const match = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([A-Za-z0-9_-]+)/i)
  return match?.[1] ? `https://www.youtube.com/embed/${match[1]}` : null
}

export function NewsEditorPage({ mode, initialUser, initialPost }: NewsEditorPageProps) {
  const router = useRouter()
  const [form, setForm] = useState<NewsEditorForm>(buildInitialForm({ mode, initialPost }))
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverDragOver, setCoverDragOver] = useState(false)
  const [blockUploading, setBlockUploading] = useState<string | null>(null)
  const [legacyImportOpen, setLegacyImportOpen] = useState(false)
  const [legacyContent, setLegacyContent] = useState('')
  const coverInputRef = useRef<HTMLInputElement>(null)

  const isEditMode = mode === 'edit'
  const pageTitle = isEditMode ? 'Редагування новини' : 'Створення новини'
  const endpoint = isEditMode ? `/api/news/${initialPost?.id}` : '/api/news'
  const method = isEditMode ? 'PATCH' : 'POST'
  const submitLabel = isEditMode ? 'Зберегти зміни' : 'Опублікувати'

  const stats = useMemo(() => {
    const plain = form.blocks
      .map((block) => `${block.text || ''} ${block.caption || ''}`)
      .join(' ')
      .trim()
    const wordCount = plain.length === 0 ? 0 : plain.split(/\s+/).filter(Boolean).length
    const charCount = plain.length
    const minutes = Math.max(1, Math.ceil(wordCount / 180))
    return { wordCount, charCount, minutes }
  }, [form.blocks])

  const blocksByType = useMemo(() => {
    const acc: Record<NewsContentBlock['type'], number> = { heading: 0, paragraph: 0, quote: 0, image: 0, video: 0, gallery: 0 }
    form.blocks.forEach((block) => { acc[block.type] = (acc[block.type] || 0) + 1 })
    return acc
  }, [form.blocks])

  const isValid = form.title.trim().length > 0 && form.excerpt.trim().length > 0

  const handleField = (key: keyof Omit<NewsEditorForm, 'blocks'>, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  const handleAddBlock = (type: NewsContentBlock['type']) => {
    setForm((previous) => ({ ...previous, blocks: [...previous.blocks, createEmptyBlock(type)] }))
  }

  const handleUpdateBlock = (blockId: string, patch: Partial<NewsContentBlock>) => {
    setForm((previous) => ({
      ...previous,
      blocks: previous.blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
    }))
  }

  const handleRemoveBlock = (blockId: string) => {
    setForm((previous) => {
      const nextBlocks = previous.blocks.filter((block) => block.id !== blockId)
      return nextBlocks.length > 0
        ? { ...previous, blocks: nextBlocks }
        : { ...previous, blocks: [createEmptyBlock('paragraph')] }
    })
  }

  const handleMoveBlock = (blockId: string, direction: 'up' | 'down') => {
    setForm((previous) => {
      const index = previous.blocks.findIndex((block) => block.id === blockId)
      if (index < 0) return previous
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= previous.blocks.length) return previous
      const next = [...previous.blocks]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return { ...previous, blocks: next }
    })
  }

  const handleCoverPick = async (file: File | null) => {
    if (!file) return
    setErrorMessage('')
    setCoverUploading(true)
    try {
      const uploaded = await uploadFile(file, 'news')
      handleField('coverUrl', uploaded.url)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не вдалося завантажити обкладинку')
    } finally {
      setCoverUploading(false)
    }
  }

  const handleCoverDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setCoverDragOver(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void handleCoverPick(file)
  }

  const handleBlockFile = async (blockId: string, file: File | null) => {
    if (!file) return
    setErrorMessage('')
    setBlockUploading(blockId)
    try {
      const uploaded = await uploadFile(file, 'news')
      handleUpdateBlock(blockId, { url: uploaded.url })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не вдалося завантажити файл')
    } finally {
      setBlockUploading(null)
    }
  }

  const handleGalleryFiles = async (blockId: string, fileList: FileList | null) => {
    if (!fileList?.length) return
    setErrorMessage('')
    setBlockUploading(blockId)
    try {
      const block = form.blocks.find((item) => item.id === blockId)
      const current = block?.urls || []
      const slotsLeft = Math.max(0, 20 - current.length)
      const files = Array.from(fileList).slice(0, slotsLeft)
      const uploadedUrls: string[] = []
      for (const file of files) {
        const uploaded = await uploadFile(file, 'news')
        uploadedUrls.push(uploaded.url)
      }
      handleUpdateBlock(blockId, { urls: [...current, ...uploadedUrls].slice(0, 20) })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не вдалося завантажити зображення')
    } finally {
      setBlockUploading(null)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          category: form.category,
          excerpt: form.excerpt,
          coverUrl: form.coverUrl || null,
          blocks: form.blocks,
        }),
      })
      const payload = (await response.json()) as { post?: NewsPost; error?: string }
      if (!response.ok || !payload.post) {
        setErrorMessage(payload.error || 'Не вдалося зберегти новину')
        return
      }
      router.push(buildNewsPath(payload.post))
      router.refresh()
    } catch {
      setErrorMessage('Помилка мережі. Спробуйте ще раз')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageShell active="news" initialUser={initialUser}>
      <div className="page-main">
        <div className="page-topbar">
          <div>
            <Breadcrumbs items={[
              { label: 'Простір', href: '/' },
              { label: 'Новини', href: '/news' },
              { label: isEditMode ? 'Редагування' : 'Нова публікація' },
            ]} />
            <h1 className="page-title">{pageTitle}</h1>
          </div>
          <div className="news-edit-actions">
            <Link href={isEditMode && initialPost ? buildNewsPath(initialPost) : '/news'} className="page-back-link">
              <span aria-hidden="true">←</span>
              {isEditMode ? 'До новини' : 'До новин'}
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              form="news-editor-form"
              disabled={isSubmitting || !isValid}
              title={!isValid ? 'Заповніть заголовок та короткий опис' : undefined}
            >
              {isSubmitting ? 'Зберігаємо…' : submitLabel}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="news-edit-error" role="alert">
            <span aria-hidden>⚠</span> {errorMessage}
          </div>
        )}

        <form id="news-editor-form" onSubmit={handleSubmit} className="news-edit-shell">
          <div className="news-edit-main">
            {/* Cover */}
            <section className="news-edit-card">
              <header className="news-edit-card-head">
                <div>
                  <h3>Обкладинка</h3>
                  <p>Перше враження статті — велике зображення зверху картки.</p>
                </div>
              </header>

              <div className="news-legacy-import">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setLegacyImportOpen((open) => !open)}
                >
                  {legacyImportOpen ? 'Закрити імпорт' : 'Імпортувати старий текст'}
                </button>
                {legacyImportOpen && (
                  <div className="news-legacy-import-panel">
                    <textarea
                      className="news-input"
                      rows={10}
                      value={legacyContent}
                      onChange={(event) => setLegacyContent(event.target.value)}
                      placeholder="Вставте старий текст із ::slider:: та ::video::"
                    />
                    <div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={!legacyContent.trim()}
                        onClick={() => {
                          const imported = parseLegacyNewsContent(legacyContent)
                          if (!imported.length) {
                            setErrorMessage('Не вдалося знайти контент для імпорту')
                            return
                          }
                          setForm((previous) => ({ ...previous, blocks: imported }))
                          setLegacyContent('')
                          setLegacyImportOpen(false)
                          setErrorMessage('')
                        }}
                      >
                        Розібрати на блоки
                      </button>
                      <span>{legacyContent.length} символів</span>
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const file = event.target.files?.[0] ?? null
                  void handleCoverPick(file)
                  event.target.value = ''
                }}
                hidden
              />

              {form.coverUrl ? (
                <div className="news-cover-preview" style={{ backgroundImage: `url(${JSON.stringify(form.coverUrl).slice(1, -1)})` }}>
                  <div className="news-cover-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => coverInputRef.current?.click()} disabled={coverUploading}>
                      {UploadIcon} {coverUploading ? 'Завантаження…' : 'Замінити'}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => handleField('coverUrl', '')}>
                      {TrashIcon} Прибрати
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`news-cover-drop${coverDragOver ? ' is-over' : ''}${coverUploading ? ' is-uploading' : ''}`}
                  onClick={() => coverInputRef.current?.click()}
                  onDragOver={(event) => { event.preventDefault(); setCoverDragOver(true) }}
                  onDragLeave={() => setCoverDragOver(false)}
                  onDrop={handleCoverDrop}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') coverInputRef.current?.click() }}
                >
                  <span className="news-cover-icon" aria-hidden>{UploadIcon}</span>
                  <b>{coverUploading ? 'Завантажуємо…' : 'Перетягніть зображення сюди'}</b>
                  <span>або натисніть, щоб обрати з ПК · до 8 МБ · jpg/png/webp</span>
                </div>
              )}

              <label className="news-edit-field">
                <span>Або вкажіть посилання</span>
                <input
                  type="text"
                  inputMode="url"
                  className="news-input"
                  placeholder="https://… або /api/uploads/…"
                  value={form.coverUrl}
                  onChange={(event) => handleField('coverUrl', event.target.value)}
                  maxLength={2048}
                />
              </label>
            </section>

            {/* Basic info */}
            <section className="news-edit-card">
              <header className="news-edit-card-head">
                <div>
                  <h3>Основне</h3>
                  <p>Заголовок і короткий опис показуються у каталозі та шерах.</p>
                </div>
              </header>

              <label className="news-edit-field">
                <span>Заголовок <em>обовʼязково</em></span>
                <input
                  type="text"
                  className="news-input news-input-large"
                  placeholder="Що відбулося?"
                  value={form.title}
                  onChange={(event) => handleField('title', event.target.value)}
                  maxLength={140}
                  required
                />
                <small className="news-edit-counter">{form.title.length}/140</small>
              </label>

              <div className="news-edit-row">
                <div className="news-edit-field">
                  <span>Категорія</span>
                  <Select
                    value={form.category}
                    onChange={(value) => handleField('category', value)}
                    options={CATEGORIES}
                  />
                </div>
                <div className="news-edit-field news-edit-stat">
                  <span>Статистика</span>
                  <div className="news-edit-stat-grid">
                    <div><b>{stats.wordCount}</b><span>слів</span></div>
                    <div><b>{stats.charCount}</b><span>символів</span></div>
                    <div><b>{stats.minutes}</b><span>хв читання</span></div>
                  </div>
                </div>
              </div>

              <label className="news-edit-field">
                <span>Короткий опис <em>обовʼязково</em></span>
                <textarea
                  className="news-input"
                  placeholder="2–3 речення про головне"
                  value={form.excerpt}
                  onChange={(event) => handleField('excerpt', event.target.value)}
                  maxLength={320}
                  rows={3}
                  required
                />
                <small className="news-edit-counter">{form.excerpt.length}/320</small>
              </label>
            </section>

            {/* Blocks */}
            <section className="news-edit-card">
              <header className="news-edit-card-head">
                <div>
                  <h3>Контент <span className="news-edit-pill">{form.blocks.length} {form.blocks.length === 1 ? 'блок' : form.blocks.length < 5 ? 'блоки' : 'блоків'}</span></h3>
                  <p>Збирайте новину з блоків — текст, цитати, медіа.</p>
                </div>
              </header>

              <div className="news-block-add">
                {BLOCK_TYPES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="news-block-add-btn"
                    onClick={() => handleAddBlock(option.value)}
                    title={option.hint}
                  >
                    <span className="ico">{option.icon}</span>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>

              <div className="news-block-stack">
                {form.blocks.map((block, index) => {
                  const meta = BLOCK_TYPES.find((option) => option.value === block.type) || BLOCK_TYPES[1]
                  const isFirst = index === 0
                  const isLast = index === form.blocks.length - 1
                  return (
                    <article key={block.id} className={`news-block news-block-${block.type}`}>
                      <header className="news-block-bar">
                        <span className="news-block-tag">
                          <span className="ico" aria-hidden>{meta.icon}</span>
                          <b>{index + 1}.</b> {meta.label}
                        </span>
                        <div className="news-block-tools">
                          <button type="button" className="news-icon-btn" onClick={() => handleMoveBlock(block.id, 'up')} disabled={isFirst} aria-label="Вгору">
                            {ArrowUpIcon}
                          </button>
                          <button type="button" className="news-icon-btn" onClick={() => handleMoveBlock(block.id, 'down')} disabled={isLast} aria-label="Вниз">
                            {ArrowDownIcon}
                          </button>
                          <button type="button" className="news-icon-btn news-icon-danger" onClick={() => handleRemoveBlock(block.id)} aria-label="Видалити">
                            {TrashIcon}
                          </button>
                        </div>
                      </header>

                      {block.type === 'heading' && (
                        <input
                          className="news-input news-input-heading"
                          placeholder="Заголовок розділу"
                          value={block.text || ''}
                          onChange={(event) => handleUpdateBlock(block.id, { text: event.target.value })}
                          maxLength={140}
                        />
                      )}

                      {block.type === 'paragraph' && (
                        <RichTextarea
                          className="news-input"
                          placeholder="Розкажи більше про подію — деталі, цитати, факти…"
                          value={block.text || ''}
                          onChange={(v) => handleUpdateBlock(block.id, { text: v })}
                          rows={5}
                        />
                      )}

                      {block.type === 'quote' && (
                        <RichTextarea
                          className="news-input news-input-quote"
                          placeholder="«Виділена цитата або важлива думка»"
                          value={block.text || ''}
                          onChange={(v) => handleUpdateBlock(block.id, { text: v })}
                          rows={3}
                        />
                      )}

                      {(block.type === 'image' || block.type === 'video') && (
                        <BlockMedia
                          block={block}
                          onUpdate={(patch) => handleUpdateBlock(block.id, patch)}
                          onPickFile={(file) => void handleBlockFile(block.id, file)}
                          uploading={blockUploading === block.id}
                        />
                      )}

                      {block.type === 'gallery' && (
                        <GalleryBlockEditor
                          block={block}
                          onUpdate={(patch) => handleUpdateBlock(block.id, patch)}
                          onPickFiles={(files) => void handleGalleryFiles(block.id, files)}
                          uploading={blockUploading === block.id}
                        />
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          </div>

          {/* Sidebar utilities */}
          <aside className="news-edit-aside">
            <div className="news-edit-card news-edit-aside-card">
              <header className="news-edit-card-head">
                <div>
                  <h3>Перегляд</h3>
                  <p>Як новина виглядатиме у каталозі.</p>
                </div>
              </header>
              <div className="news-edit-preview">
                <div className="news-edit-preview-cover" style={{ backgroundImage: form.coverUrl ? `url(${JSON.stringify(form.coverUrl).slice(1, -1)})` : undefined }}>
                  {!form.coverUrl && <span>немає обкладинки</span>}
                </div>
                <div className="news-edit-preview-body">
                  <span className="news-edit-preview-cat">{form.category || 'Новини'}</span>
                  <h4>{form.title || 'Заголовок майбутньої статті'}</h4>
                  <p>{form.excerpt || 'Короткий опис зʼявиться тут після того, як ви його напишете.'}</p>
                  <div className="news-edit-preview-meta">
                    <span>{stats.minutes} хв · {stats.wordCount} слів</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="news-edit-card news-edit-aside-card">
              <header className="news-edit-card-head">
                <div>
                  <h3>Структура</h3>
                  <p>Скільки блоків кожного типу у статті.</p>
                </div>
              </header>
              <ul className="news-edit-structure">
                {BLOCK_TYPES.map((option) => (
                  <li key={option.value}>
                    <span className="ico" aria-hidden>{option.icon}</span>
                    <span className="lbl">{option.label}</span>
                    <span className="cnt">{blocksByType[option.value] || 0}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="news-edit-card news-edit-aside-card news-edit-tips">
              <header className="news-edit-card-head">
                <div>
                  <h3>Поради</h3>
                </div>
              </header>
              <ul>
                <li>Заголовок — до 80 символів, цікавий і конкретний.</li>
                <li>Перетягуйте обкладинку прямо у форму — швидше, ніж копіювати посилання.</li>
                <li>Ділимо текст на короткі абзаци та додаємо медіа кожні 2–3 блоки.</li>
                <li>Для відео можна вставити посилання на YouTube — ми покажемо плеєр.</li>
              </ul>
            </div>
          </aside>
        </form>
      </div>
    </PageShell>
  )
}

function RichTextarea({
  value,
  onChange,
  placeholder,
  rows,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  className?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const format = (before: string, after: string) => {
    const el = ref.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e, value: v } = el
    const sel = v.slice(s, e) || 'текст'
    const chunk = before + sel + after
    const next = v.slice(0, s) + chunk + v.slice(e)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + before.length, s + before.length + sel.length)
    })
  }

  const insertLink = () => {
    const el = ref.current
    if (!el) return
    const { selectionStart: s, selectionEnd: e, value: v } = el
    const sel = v.slice(s, e)
    const url = window.prompt('URL посилання:', 'https://')
    if (!url?.trim()) return
    const text = sel || 'текст посилання'
    const chunk = `[${text}](${url.trim()})`
    const next = v.slice(0, s) + chunk + v.slice(e)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s, s + chunk.length)
    })
  }

  return (
    <div className="rich-wrap">
      <div className="rich-toolbar">
        <button type="button" className="rich-btn" onClick={() => format('**', '**')} title="Жирний">
          {BoldIcon}
        </button>
        <button type="button" className="rich-btn" onClick={() => format('*', '*')} title="Курсив">
          {ItalicIcon}
        </button>
        <button type="button" className="rich-btn" onClick={() => format('~~', '~~')} title="Закреслений">
          {StrikeIcon}
        </button>
        <button type="button" className="rich-btn" onClick={() => format('`', '`')} title="Код">
          {InlineCodeIcon}
        </button>
        <span className="rich-sep" />
        <button type="button" className="rich-btn" onClick={insertLink} title="Посилання">
          {LinkIcon}
        </button>
      </div>
      <textarea
        ref={ref}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
      />
    </div>
  )
}

function BlockMedia({
  block,
  onUpdate,
  onPickFile,
  uploading,
}: {
  block: NewsContentBlock
  onUpdate: (patch: Partial<NewsContentBlock>) => void
  onPickFile: (file: File | null) => void
  uploading: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const isImage = block.type === 'image'
  const accept = isImage ? 'image/*' : 'video/*'
  const url = block.url || ''
  const youtube = !isImage ? getYoutubeEmbed(url) : null

  return (
    <div className="news-block-media">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null
          onPickFile(file)
          event.target.value = ''
        }}
      />

      {url ? (
        <div className="news-block-media-frame">
          {isImage && (
            <div
              aria-hidden
              className="news-block-media-image"
              style={{ backgroundImage: `url(${JSON.stringify(url).slice(1, -1)})` }}
            />
          )}
          {!isImage && youtube && (
            <iframe className="news-block-media-iframe" src={youtube} allowFullScreen title="Перегляд відео" />
          )}
          {!isImage && !youtube && isVideoFileUrl(url) && (
            <video src={url} controls preload="metadata" className="news-block-media-video" />
          )}
          {!isImage && !youtube && !isVideoFileUrl(url) && (
            <div className="news-block-media-fallback">
              <a href={url} target="_blank" rel="noreferrer" className="btn btn-secondary">Відкрити за посиланням</a>
            </div>
          )}
          <div className="news-block-media-actions">
            <button type="button" className="btn btn-secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {UploadIcon} {uploading ? 'Завантаження…' : 'Замінити файл'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => onUpdate({ url: '' })}>
              {TrashIcon} Прибрати
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`news-block-drop${dragOver ? ' is-over' : ''}${uploading ? ' is-uploading' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragOver(false)
            const file = event.dataTransfer.files?.[0] ?? null
            onPickFile(file)
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click() }}
        >
          <span className="ico" aria-hidden>{UploadIcon}</span>
          <b>{uploading ? 'Завантажуємо…' : isImage ? 'Перетягніть зображення сюди' : 'Перетягніть відео сюди'}</b>
          <span>
            або натисніть, щоб обрати з ПК {isImage ? '· до 8 МБ' : '· до 80 МБ'}
            {!isImage && ' · також можна вставити посилання YouTube нижче'}
          </span>
        </div>
      )}

      <div className="news-block-media-fields">
        <label className="news-edit-field">
          <span>Посилання {url && (url.startsWith('/uploads/') || url.startsWith('/api/uploads/')) ? '(збережено локально)' : '(або зовнішнє)'}</span>
          <input
            type="text"
            inputMode="url"
            className="news-input"
            placeholder={isImage ? 'https://… або /api/uploads/…' : 'https://youtube.com/… або /api/uploads/…'}
            value={url}
            onChange={(event) => onUpdate({ url: event.target.value })}
          />
          {url && (url.startsWith('/uploads/') || url.startsWith('/api/uploads/')) && (
            <small className="news-edit-counter news-edit-pill-mini">локальний файл · {formatFileSize(0)}</small>
          )}
        </label>
        <label className="news-edit-field">
          <span>Підпис</span>
          <input
            type="text"
            className="news-input"
            placeholder="Що зображено / звідки відео"
            value={block.caption || ''}
            onChange={(event) => onUpdate({ caption: event.target.value })}
            maxLength={220}
          />
        </label>
      </div>
    </div>
  )
}

function GalleryBlockEditor({
  block,
  onUpdate,
  onPickFiles,
  uploading,
}: {
  block: NewsContentBlock
  onUpdate: (patch: Partial<NewsContentBlock>) => void
  onPickFiles: (files: FileList | null) => void
  uploading: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const urls = block.urls || []
  const slotsLeft = Math.max(0, 20 - urls.length)

  return (
    <div className="news-gallery-editor">
      <label className="news-edit-field">
        <span>Назва галереї</span>
        <input
          className="news-input"
          value={block.caption || ''}
          onChange={(event) => onUpdate({ caption: event.target.value })}
          placeholder="Наприклад: Фото моду"
          maxLength={220}
        />
      </label>

      <div className="news-gallery-editor-upload">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          disabled={slotsLeft === 0}
          onChange={(event) => {
            onPickFiles(event.target.files)
            event.target.value = ''
          }}
        />
        <div
          className={`news-block-drop${dragOver ? ' is-over' : ''}${uploading ? ' is-uploading' : ''}`}
          onClick={() => slotsLeft > 0 && inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            if (slotsLeft > 0) setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragOver(false)
            if (slotsLeft > 0) onPickFiles(event.dataTransfer.files)
          }}
          role="button"
          tabIndex={slotsLeft > 0 ? 0 : -1}
          onKeyDown={(event) => {
            if ((event.key === 'Enter' || event.key === ' ') && slotsLeft > 0) inputRef.current?.click()
          }}
        >
          <span className="ico" aria-hidden>{UploadIcon}</span>
          <b>
            {uploading
              ? 'Завантажуємо…'
              : slotsLeft === 0
                ? 'Досягнуто ліміт 20 зображень'
                : 'Перетягніть зображення сюди'}
          </b>
          <span>
            {slotsLeft > 0 && (
              <>
                або натисніть, щоб обрати декілька з ПК · до 8 МБ кожне · ще {slotsLeft} з 20
              </>
            )}
          </span>
        </div>
      </div>

      <label className="news-edit-field">
        <span>Посилання (одне на рядок, необов&apos;язково)</span>
        <textarea
          className="news-input"
          rows={5}
          value={urls.join('\n')}
          onChange={(event) => onUpdate({
            urls: event.target.value.split('\n').map(normalizeImportedUrl).filter(Boolean).slice(0, 20),
          })}
          placeholder={'https://example.com/image-1.webp\nhttps://example.com/image-2.png'}
        />
      </label>
      {urls.length > 0 && (
        <div className="news-gallery-editor-preview">
          {urls.slice(0, 8).map((url, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" key={`${url}-${index}`} />
          ))}
        </div>
      )}
    </div>
  )
}
