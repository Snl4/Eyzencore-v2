'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Icons } from '@/components/ui/Icons'
import type { AuthUser } from '@/lib/auth-db'
import type { CommunityResourceType } from '@/lib/resources-db'
import { buildResourcePath } from '@/lib/resource-slug'

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

export function ResourceEditorClient({ initialUser }: { initialUser: AuthUser }) {
  const router = useRouter()
  const [importUrl, setImportUrl] = useState('')
  const [form, setForm] = useState<ResourceDraft>(EMPTY_DRAFT)
  const [message, setMessage] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const setField = <K extends keyof ResourceDraft>(key: K, value: ResourceDraft[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }))
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
      setMessage('Дані підтягнулись. Перевір український опис і публікуй.')
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
      const response = await fetch('/api/resources', {
        method: 'POST',
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

        <section className="resource-import-panel">
          <div>
            <h2>Імпорт із посилання</h2>
            <p>Найкраще працює з Modrinth. Для інших сайтів підтягнуться базові OpenGraph-дані.</p>
          </div>
          <div className="resource-import-row">
            <input value={importUrl} onChange={(event) => setImportUrl(event.target.value)} placeholder="https://modrinth.com/mod/..." />
            <button type="button" className="btn btn-primary" onClick={() => void handleImport()} disabled={isImporting || !importUrl.trim()}>
              {isImporting ? 'Імпортуємо...' : 'Підтягнути'}
            </button>
          </div>
        </section>

        {message && <div className="resource-editor-message">{message}</div>}

        <form className="resource-editor-grid" onSubmit={handleSubmit}>
          <section className="resource-editor-card">
            <h2>Основне</h2>
            <label>
              <span>Назва</span>
              <input value={form.name} onChange={(event) => setField('name', event.target.value)} maxLength={140} required />
            </label>
            <label>
              <span>Тип</span>
              <select value={form.type} onChange={(event) => setField('type', event.target.value as CommunityResourceType)}>
                {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label>
              <span>Короткий опис українською</span>
              <textarea value={form.summary} onChange={(event) => setField('summary', event.target.value)} rows={3} maxLength={500} required />
            </label>
            <label>
              <span>Повний опис українською</span>
              <textarea value={form.description} onChange={(event) => setField('description', event.target.value)} rows={10} required />
            </label>
          </section>

          <section className="resource-editor-card">
            <h2>Медіа й джерело</h2>
            <label>
              <span>Іконка</span>
              <input value={form.iconUrl} onChange={(event) => setField('iconUrl', event.target.value)} />
            </label>
            <label>
              <span>Галерея</span>
              <textarea value={form.galleryText} onChange={(event) => setField('galleryText', event.target.value)} rows={4} placeholder="URL через кому або з нового рядка" />
            </label>
            <label>
              <span>Посилання на джерело</span>
              <input value={form.sourceUrl} onChange={(event) => setField('sourceUrl', event.target.value)} required />
            </label>
            <label>
              <span>Посилання на завантаження</span>
              <input value={form.downloadUrl} onChange={(event) => setField('downloadUrl', event.target.value)} />
            </label>
          </section>

          <section className="resource-editor-card">
            <h2>Сумісність</h2>
            <label>
              <span>Loader-и</span>
              <input value={form.loadersText} onChange={(event) => setField('loadersText', event.target.value)} placeholder="Fabric, Forge, Paper" />
            </label>
            <label>
              <span>Версії Minecraft</span>
              <input value={form.gameVersionsText} onChange={(event) => setField('gameVersionsText', event.target.value)} placeholder="1.21.8, 1.20.1" />
            </label>
            <label>
              <span>Теги</span>
              <input value={form.tagsText} onChange={(event) => setField('tagsText', event.target.value)} placeholder="optimization, adventure, server" />
            </label>
            <label>
              <span>Автор / команда</span>
              <input value={form.authorName} onChange={(event) => setField('authorName', event.target.value)} />
            </label>
            <label>
              <span>Ліцензія</span>
              <input value={form.license} onChange={(event) => setField('license', event.target.value)} />
            </label>
          </section>

          <section className="resource-editor-preview">
            <div className="resource-card">
              <div className="resource-card-media">
                {form.iconUrl ? <img src={form.iconUrl} alt="" /> : <span className="resource-preview-empty">{Icons.folder}</span>}
                <span className="resource-type-pill">{TYPE_OPTIONS.find((option) => option.value === form.type)?.label}</span>
              </div>
              <div className="resource-card-body">
                <div className="resource-card-title-row">
                  <h3>{form.name || 'Назва ресурсу'}</h3>
                  <span className="resource-verified">✓</span>
                </div>
                <p>{form.summary || 'Короткий опис зʼявиться тут.'}</p>
                <div className="resource-chip-row">
                  {[...linesToList(form.loadersText), ...linesToList(form.gameVersionsText)].slice(0, 6).map((item) => (
                    <span key={item} className="resource-chip">{item}</span>
                  ))}
                </div>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting || !form.name.trim() || !form.summary.trim() || !form.description.trim() || !form.sourceUrl.trim()}>
              {isSubmitting ? 'Публікуємо...' : 'Опублікувати ресурс'}
            </button>
          </section>
        </form>
      </div>
    </PageShell>
  )
}
