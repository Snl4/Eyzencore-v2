'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Icons } from '@/components/ui/Icons'
import type { AuthUser } from '@/lib/auth-db'
import type { CommunityResource, CommunityResourceType } from '@/lib/resources-db'
import { buildResourcePath } from '@/lib/resource-slug'
import { uploadFile } from '@/lib/upload'

type ResourceDraft = {
  name: string
  type: CommunityResourceType
  summary: string
  description: string
  iconUrl: string
  galleryText: string
  sourceUrl: string
  downloadUrl: string
  sourceHost: string
  projectId: string
  authorName: string
  license: string
  loadersText: string
  gameVersionsText: string
  tagsText: string
  side: string
}

const EMPTY_DRAFT: ResourceDraft = {
  name: '',
  type: 'mod',
  summary: '',
  description: '',
  iconUrl: '',
  galleryText: '',
  sourceUrl: '',
  downloadUrl: '',
  sourceHost: '',
  projectId: '',
  authorName: '',
  license: '',
  loadersText: '',
  gameVersionsText: '',
  tagsText: '',
  side: '',
}

const TYPE_OPTIONS: Array<{ value: CommunityResourceType; label: string }> = [
  { value: 'mod', label: 'Мод' },
  { value: 'plugin', label: 'Плагін' },
  { value: 'resourcepack', label: 'Ресурспак' },
  { value: 'shader', label: 'Шейдер' },
  { value: 'datapack', label: 'Датапак' },
  { value: 'modpack', label: 'Збірка' },
  { value: 'tool', label: 'Інструмент' },
]

function linesToList(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function listToText(value: unknown) {
  return Array.isArray(value) ? value.filter(Boolean).join(', ') : ''
}

type ResourceEditorClientProps = {
  initialUser: AuthUser
  initialResource?: CommunityResource
}

function resourceToDraft(resource: CommunityResource): ResourceDraft {
  return {
    name: resource.name,
    type: resource.type,
    summary: resource.summary,
    description: resource.description,
    iconUrl: resource.iconUrl || '',
    galleryText: resource.gallery.join('\n'),
    sourceUrl: resource.sourceUrl,
    downloadUrl: resource.downloadUrl || resource.sourceUrl,
    sourceHost: resource.sourceHost || '',
    projectId: resource.projectId || '',
    authorName: resource.authorName || '',
    license: resource.license || '',
    loadersText: resource.loaders.join(', '),
    gameVersionsText: resource.gameVersions.join(', '),
    tagsText: resource.tags.join(', '),
    side: resource.side || '',
  }
}

export function ResourceEditorClient({ initialUser, initialResource }: ResourceEditorClientProps) {
  const router = useRouter()
  const [importUrl, setImportUrl] = useState('')
  const [form, setForm] = useState<ResourceDraft>(() => initialResource ? resourceToDraft(initialResource) : EMPTY_DRAFT)
  const [message, setMessage] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingIcon, setIsUploadingIcon] = useState(false)
  const [isUploadingGallery, setIsUploadingGallery] = useState(false)
  const [isUploadingDownload, setIsUploadingDownload] = useState(false)

  const setField = <K extends keyof ResourceDraft>(key: K, value: ResourceDraft[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  const appendGalleryUrls = (urls: string[]) => {
    setForm((previous) => {
      const current = linesToList(previous.galleryText)
      const next = Array.from(new Set([...current, ...urls]))
      return { ...previous, galleryText: next.join('\n') }
    })
  }

  const handleIconUpload = async (file: File | null) => {
    if (!file) return
    setMessage('')
    setIsUploadingIcon(true)
    try {
      const uploaded = await uploadFile(file, 'resource')
      if (uploaded.kind !== 'image') {
        setMessage('Для іконки оберіть зображення')
        return
      }
      setField('iconUrl', uploaded.url)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не вдалося завантажити іконку')
    } finally {
      setIsUploadingIcon(false)
    }
  }

  const handleGalleryUpload = async (files: FileList | null) => {
    const selectedFiles = Array.from(files || [])
    if (selectedFiles.length === 0) return
    setMessage('')
    setIsUploadingGallery(true)
    try {
      const uploaded = await Promise.all(selectedFiles.map((file) => uploadFile(file, 'resource')))
      appendGalleryUrls(uploaded.map((file) => file.url))
      setMessage(`Додано файлів: ${uploaded.length}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не вдалося завантажити медіа')
    } finally {
      setIsUploadingGallery(false)
    }
  }

  const handleDownloadUpload = async (file: File | null) => {
    if (!file) return
    setMessage('')
    setIsUploadingDownload(true)
    try {
      const uploaded = await uploadFile(file, 'resource')
      setField('downloadUrl', uploaded.url)
      setMessage(`Файл для завантаження додано: ${uploaded.name}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не вдалося завантажити файл')
    } finally {
      setIsUploadingDownload(false)
    }
  }

  const handleImport = async () => {
    setMessage('')
    setIsImporting(true)
    try {
      const response = await fetch('/api/resources/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl }),
      })
      const payload = (await response.json()) as { draft?: Record<string, unknown>; error?: string }
      if (!response.ok || !payload.draft) {
        setMessage(payload.error || 'Не вдалося імпортувати ресурс')
        return
      }
      const draft = payload.draft
      setForm({
        name: String(draft.name || ''),
        type: (String(draft.type || 'mod') as CommunityResourceType),
        summary: String(draft.summary || ''),
        description: String(draft.description || draft.summary || ''),
        iconUrl: String(draft.iconUrl || ''),
        galleryText: listToText(draft.gallery),
        sourceUrl: String(draft.sourceUrl || importUrl),
        downloadUrl: String(draft.downloadUrl || draft.sourceUrl || importUrl),
        sourceHost: String(draft.sourceHost || ''),
        projectId: String(draft.projectId || ''),
        authorName: String(draft.authorName || ''),
        license: String(draft.license || ''),
        loadersText: listToText(draft.loaders),
        gameVersionsText: listToText(draft.gameVersions),
        tagsText: listToText(draft.tags),
        side: String(draft.side || ''),
      })
      setMessage('Дані підтягнулися. Перевір український опис і публікуй.')
    } catch {
      setMessage('Помилка мережі під час імпорту')
    } finally {
      setIsImporting(false)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    setIsSubmitting(true)
    try {
      const response = await fetch(initialResource ? `/api/resources/${initialResource.id}` : '/api/resources', {
        method: initialResource ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          summary: form.summary,
          description: form.description,
          iconUrl: form.iconUrl || null,
          gallery: linesToList(form.galleryText),
          sourceUrl: form.sourceUrl,
          downloadUrl: form.downloadUrl || form.sourceUrl,
          sourceHost: form.sourceHost,
          projectId: form.projectId,
          authorName: form.authorName,
          license: form.license,
          loaders: linesToList(form.loadersText),
          gameVersions: linesToList(form.gameVersionsText),
          tags: linesToList(form.tagsText),
          side: form.side,
          status: 'published',
          verified: true,
        }),
      })
      const payload = (await response.json()) as { resource?: { slug: string; name: string }; error?: string }
      if (!response.ok || !payload.resource) {
        setMessage(payload.error || 'Не вдалося створити ресурс')
        return
      }
      router.push(buildResourcePath(payload.resource))
      router.refresh()
    } catch {
      setMessage('Помилка мережі під час публікації')
    } finally {
      setIsSubmitting(false)
    }
  }

  const previewChips = [
    form.side,
    form.license,
    ...linesToList(form.loadersText),
    ...linesToList(form.gameVersionsText),
    ...linesToList(form.tagsText),
  ].filter(Boolean).slice(0, 6)

  return (
    <PageShell active="resources" initialUser={initialUser}>
      <div className="page-main resource-editor-page">
        <div className="page-topbar">
          <div>
            <Breadcrumbs items={[{ label: 'Спільнота', href: '/forum' }, { label: 'Ресурси', href: '/resources' }, { label: 'Новий ресурс' }]} />
            <h1 className="page-title">Додати ресурс</h1>
          </div>
          <Link href="/resources" className="btn btn-secondary">До каталогу</Link>
        </div>

        {message && <div className="resource-editor-message">{message}</div>}

        <form id="resource-editor-form" className="news-edit-shell resource-edit-shell" onSubmit={handleSubmit}>
          <main className="news-edit-main">
            <section className="news-edit-card resource-import-panel">
              <div className="news-edit-card-head">
                <div>
                  <h3>{Icons.globe} Імпорт із посилання</h3>
                  <p>Найкраще працює з Modrinth. Для інших сайтів підтягнуться базові OpenGraph-дані.</p>
                </div>
                <span className="news-edit-pill">URL</span>
              </div>
              <div className="resource-import-row">
                <input
                  className="news-input"
                  value={importUrl}
                  onChange={(event) => setImportUrl(event.target.value)}
                  placeholder="https://modrinth.com/mod/..."
                />
                <button type="button" className="btn btn-primary" onClick={() => void handleImport()} disabled={isImporting || !importUrl.trim()}>
                  {isImporting ? 'Імпортуємо...' : 'Підтягнути'}
                </button>
              </div>
            </section>

            <section className="news-edit-card">
              <div className="news-edit-card-head">
                <div>
                  <h3>{Icons.folder} Основне</h3>
                  <p>Назва, тип і короткий опис, який буде видно у списку ресурсів.</p>
                </div>
              </div>
              <label className="news-edit-field">
                <span>Назва <em>потрібно</em></span>
                <input className="news-input news-input-large" value={form.name} onChange={(event) => setField('name', event.target.value)} maxLength={140} required />
              </label>
              <div className="news-edit-row">
                <label className="news-edit-field">
                  <span>Тип</span>
                  <select className="news-input" value={form.type} onChange={(event) => setField('type', event.target.value as CommunityResourceType)}>
                    {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="news-edit-field">
                  <span>Сторона</span>
                  <input className="news-input" value={form.side} onChange={(event) => setField('side', event.target.value)} placeholder="Client, Server або Client/server" />
                </label>
              </div>
              <label className="news-edit-field">
                <span>Короткий опис українською <em>{form.summary.length}/500</em></span>
                <textarea className="news-input" value={form.summary} onChange={(event) => setField('summary', event.target.value)} rows={3} maxLength={500} required />
              </label>
              <label className="news-edit-field">
                <span>Повний опис українською</span>
                <textarea className="news-input resource-description-input" value={form.description} onChange={(event) => setField('description', event.target.value)} rows={10} required />
              </label>
            </section>

            <section className="news-edit-card">
              <div className="news-edit-card-head">
                <div>
                  <h3>{Icons.monitor} Медіа й джерело</h3>
                  <p>Іконка, галерея, сторінка автора та файл для завантаження.</p>
                </div>
              </div>
              <div className="resource-media-grid">
                <label className={`news-block-drop resource-upload-drop ${isUploadingIcon ? 'is-uploading' : ''}`}>
                  <span className="ico">{Icons.plus}</span>
                  <b>{isUploadingIcon ? 'Завантажуємо іконку...' : 'Завантажити іконку'}</b>
                  <span>PNG, JPG, WEBP, GIF або AVIF до 8 МБ</span>
                  <input type="file" accept="image/*" onChange={(event) => void handleIconUpload(event.target.files?.[0] || null)} disabled={isUploadingIcon} />
                </label>
                <label className={`news-block-drop resource-upload-drop ${isUploadingGallery ? 'is-uploading' : ''}`}>
                  <span className="ico">{Icons.plus}</span>
                  <b>{isUploadingGallery ? 'Завантажуємо медіа...' : 'Додати галерею'}</b>
                  <span>Фото до 8 МБ, відео до 80 МБ</span>
                  <input type="file" accept="image/*,video/*" multiple onChange={(event) => void handleGalleryUpload(event.target.files)} disabled={isUploadingGallery} />
                </label>
              </div>
              <label className="news-edit-field">
                <span>URL іконки</span>
                <input className="news-input" value={form.iconUrl} onChange={(event) => setField('iconUrl', event.target.value)} placeholder="/api/uploads/resource/..." />
              </label>
              <label className="news-edit-field">
                <span>Галерея</span>
                <textarea className="news-input" value={form.galleryText} onChange={(event) => setField('galleryText', event.target.value)} rows={4} placeholder="Один URL на рядок або через кому" />
              </label>
              <div className="news-edit-row">
                <label className="news-edit-field">
                  <span>Посилання на джерело <em>потрібно</em></span>
                  <input className="news-input" value={form.sourceUrl} onChange={(event) => setField('sourceUrl', event.target.value)} placeholder="https://modrinth.com/mod/..." required />
                </label>
                <label className="news-edit-field">
                  <span>Посилання на завантаження</span>
                  <input className="news-input" value={form.downloadUrl} onChange={(event) => setField('downloadUrl', event.target.value)} placeholder="Якщо пусто, буде source URL" />
                </label>
              </div>
              <label className={`news-block-drop resource-upload-drop resource-file-drop ${isUploadingDownload ? 'is-uploading' : ''}`}>
                <span className="ico">{Icons.plus}</span>
                <b>{isUploadingDownload ? 'Завантажуємо файл...' : 'Завантажити файл ресурсу'}</b>
                <span>JAR, ZIP, RAR, 7Z, MRPACK, MCPACK до 25 МБ</span>
                <input
                  type="file"
                  accept=".jar,.zip,.rar,.7z,.mrpack,.mcpack,.mcaddon,.mcworld"
                  onChange={(event) => void handleDownloadUpload(event.target.files?.[0] || null)}
                  disabled={isUploadingDownload}
                />
              </label>
            </section>

            <section className="news-edit-card">
              <div className="news-edit-card-head">
                <div>
                  <h3>{Icons.filter} Сумісність і мета</h3>
                  <p>Списки можна вводити через кому або з нового рядка.</p>
                </div>
              </div>
              <div className="news-edit-row">
                <label className="news-edit-field">
                  <span>Loader-и</span>
                  <input className="news-input" value={form.loadersText} onChange={(event) => setField('loadersText', event.target.value)} placeholder="Fabric, Forge, Paper" />
                </label>
                <label className="news-edit-field">
                  <span>Версії Minecraft</span>
                  <input className="news-input" value={form.gameVersionsText} onChange={(event) => setField('gameVersionsText', event.target.value)} placeholder="1.21.8, 1.20.1" />
                </label>
              </div>
              <div className="news-edit-row">
                <label className="news-edit-field">
                  <span>Теги</span>
                  <input className="news-input" value={form.tagsText} onChange={(event) => setField('tagsText', event.target.value)} placeholder="Optimization, Library, Utility" />
                </label>
                <label className="news-edit-field">
                  <span>Ліцензія</span>
                  <input className="news-input" value={form.license} onChange={(event) => setField('license', event.target.value)} placeholder="MIT, ARR, LGPL..." />
                </label>
              </div>
              <div className="news-edit-row">
                <label className="news-edit-field">
                  <span>Автор / команда</span>
                  <input className="news-input" value={form.authorName} onChange={(event) => setField('authorName', event.target.value)} placeholder="modmuss50" />
                </label>
                <label className="news-edit-field">
                  <span>Source host</span>
                  <input className="news-input" value={form.sourceHost} onChange={(event) => setField('sourceHost', event.target.value)} placeholder="modrinth.com" />
                </label>
              </div>
            </section>
          </main>

          <aside className="news-edit-aside resource-edit-aside">
            <section className="news-edit-card news-edit-aside-card">
              <div className="news-edit-card-head">
                <div>
                  <h3>Попередній вигляд</h3>
                  <p>Так ресурс буде виглядати у списку.</p>
                </div>
                <span className="news-edit-pill-mini">live</span>
              </div>
              <div className="resource-editor-preview-card">
                <div className="resource-editor-preview-icon">
                  {form.iconUrl ? <img src={form.iconUrl} alt="" loading="lazy" decoding="async" /> : Icons.folder}
                </div>
                <div className="resource-editor-preview-body">
                  <div className="resource-title-line">
                    <h3>{form.name || 'Назва ресурсу'}</h3>
                    <span className="resource-verified">✓</span>
                    <span className="resource-author">by {form.authorName || form.sourceHost || 'Eyzencore'}</span>
                  </div>
                  <p>{form.summary || 'Короткий опис з’явиться тут.'}</p>
                  <div className="resource-chip-row">
                    <span className="resource-type-pill">{TYPE_OPTIONS.find((option) => option.value === form.type)?.label}</span>
                    {previewChips.map((item) => <span key={item} className="resource-chip">{item}</span>)}
                  </div>
                </div>
              </div>
            </section>

            <section className="news-edit-card news-edit-aside-card">
              <div className="news-edit-card-head">
                <div>
                  <h3>Публікація</h3>
                  <p>Перевір потрібні поля перед додаванням у каталог.</p>
                </div>
              </div>
              <ul className="news-edit-structure">
                <li><span className="ico">{Icons.check}</span><span className="lbl">Назва</span><span className="cnt">{form.name.trim() ? 'ok' : '0'}</span></li>
                <li><span className="ico">{Icons.check}</span><span className="lbl">Опис</span><span className="cnt">{form.summary.trim() && form.description.trim() ? 'ok' : '0'}</span></li>
                <li><span className="ico">{Icons.check}</span><span className="lbl">Джерело</span><span className="cnt">{form.sourceUrl.trim() ? 'ok' : '0'}</span></li>
              </ul>
              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={isSubmitting || !form.name.trim() || !form.summary.trim() || !form.description.trim() || !form.sourceUrl.trim()}
              >
                {isSubmitting ? 'Публікуємо...' : 'Опублікувати ресурс'}
              </button>
            </section>
          </aside>
        </form>
      </div>
    </PageShell>
  )
}
