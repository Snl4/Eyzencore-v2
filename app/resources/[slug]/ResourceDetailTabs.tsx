'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ResourceMarkdown } from './ResourceMarkdown'
import { ResourceMediaGallery } from './ResourceMediaGallery'

type ResourceDownloadVersion = {
  id: string
  name: string
  number: string
  type: string
  gameVersions: string[]
  loaders: string[]
  datePublished: string
  fileName: string
  fileUrl: string
  fileSize: number | null
}

type ResourceDetailTabsProps = {
  description: string
  gallery: string[]
  downloadVersions: ResourceDownloadVersion[]
  fallbackDownloadUrl: string
  sourceUrl: string
  gameVersions: string[]
  loaders: string[]
  tags: string[]
  side: string | null
  license: string | null
}

function formatFileSize(value: number | null) {
  if (!value) return ''
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`
  if (value >= 1024) return `${Math.round(value / 1024)} KB`
  return `${value} B`
}

function formatRelativeDate(value: string) {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 'невідомо'
  const diffMs = timestamp - Date.now()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const month = 30 * day
  const year = 365 * day
  const formatter = new Intl.RelativeTimeFormat('uk-UA', { numeric: 'auto' })
  const abs = Math.abs(diffMs)
  if (abs >= year) return formatter.format(Math.round(diffMs / year), 'year')
  if (abs >= month) return formatter.format(Math.round(diffMs / month), 'month')
  if (abs >= day) return formatter.format(Math.round(diffMs / day), 'day')
  if (abs >= hour) return formatter.format(Math.round(diffMs / hour), 'hour')
  return formatter.format(Math.round(diffMs / minute), 'minute')
}

function ResourceList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="resource-list-block">
      <span>{title}</span>
      <div className="resource-chip-row">
        {items.length > 0 ? items.slice(0, 18).map((item) => <span key={item} className="resource-chip">{item}</span>) : <span className="resource-muted">{empty}</span>}
      </div>
    </div>
  )
}

function Panel({ children }: { children: ReactNode }) {
  return <main className="resource-detail-main">{children}</main>
}

export function ResourceDetailTabs({
  description,
  gallery,
  downloadVersions,
  fallbackDownloadUrl,
  sourceUrl,
  gameVersions,
  loaders,
  tags,
  side,
  license,
}: ResourceDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<'description' | 'gallery' | 'versions'>('description')

  return (
    <>
      <div className="resource-detail-tabs" role="tablist" aria-label="Навігація ресурсу">
        <button type="button" className={activeTab === 'description' ? 'active' : ''} onClick={() => setActiveTab('description')}>
          Опис
        </button>
        {gallery.length > 0 && (
          <button type="button" className={activeTab === 'gallery' ? 'active' : ''} onClick={() => setActiveTab('gallery')}>
            Галерея
          </button>
        )}
        <button type="button" className={activeTab === 'versions' ? 'active' : ''} onClick={() => setActiveTab('versions')}>
          Версії
        </button>
      </div>

      <div className="resource-detail-layout">
        {activeTab === 'versions' && (
          <Panel>
            <section className="resource-detail-panel resource-versions-panel">
              <div className="resource-panel-heading">
                <div>
                  <h2>Версії</h2>
                  <p>Файли можна скачати напряму з цієї сторінки.</p>
                </div>
                <span>{downloadVersions.length || 1}</span>
              </div>
              {downloadVersions.length > 0 ? (
                <div className="resource-version-table">
                  <div className="resource-version-head">
                    <span>Версія</span>
                    <span>Гра</span>
                    <span>Платформа</span>
                    <span>Опубліковано</span>
                    <span>Файл</span>
                    <span />
                  </div>
                  {downloadVersions.map((version) => (
                    <article className="resource-version-row" key={version.id}>
                      <div className="resource-version-name">
                        <span>{version.type.slice(0, 1).toUpperCase()}</span>
                        <div>
                          <h3>{version.name}</h3>
                          <p>{version.number}</p>
                        </div>
                      </div>
                      <div className="resource-version-cell">{version.gameVersions[0] || '-'}</div>
                      <div className="resource-chip-row">
                        {version.loaders.slice(0, 2).map((loader) => <span className="resource-chip" key={loader}>{loader}</span>)}
                      </div>
                      <div className="resource-version-cell">{formatRelativeDate(version.datePublished)}</div>
                      <div className="resource-version-cell">{formatFileSize(version.fileSize) || version.fileName}</div>
                      <a className="resource-version-download" href={version.fileUrl} download target="_blank" rel="noopener noreferrer" aria-label={`Скачати ${version.name}`}>
                        ↓
                      </a>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="resource-version-row resource-version-single">
                  <div className="resource-version-name">
                    <span>F</span>
                    <div>
                      <h3>Основний файл</h3>
                      <p>{fallbackDownloadUrl}</p>
                    </div>
                  </div>
                  <a className="btn btn-primary" href={fallbackDownloadUrl} download target="_blank" rel="noopener noreferrer">
                    Скачати
                  </a>
                </div>
              )}
            </section>
          </Panel>
        )}

        {activeTab === 'description' && (
          <Panel>
            <section className="resource-detail-panel">
              <h2>Опис</h2>
              <ResourceMarkdown content={description} />
            </section>
          </Panel>
        )}

        {activeTab === 'gallery' && (
          <Panel>
            <section className="resource-detail-panel">
              <h2>Галерея</h2>
              <ResourceMediaGallery media={gallery} />
            </section>
          </Panel>
        )}

        <aside className="resource-detail-sidebar">
          <section className="resource-detail-panel resource-side-panel">
            <h2>Сумісність</h2>
            <ResourceList title="Minecraft" items={gameVersions} empty="Не вказано" />
            <ResourceList title="Платформи" items={loaders} empty="Не вказано" />
            {side && <p className="resource-fact"><span>Середовище</span><b>{side}</b></p>}
            {license && <p className="resource-fact"><span>Ліцензія</span><b>{license}</b></p>}
          </section>

          <section className="resource-detail-panel resource-links-panel">
            <h2>Посилання</h2>
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer">Відкрити джерело ↗</a>
            <a href={fallbackDownloadUrl} download target="_blank" rel="noopener noreferrer">Скачати файл ↓</a>
            <Link href="/resources">До каталогу</Link>
          </section>

          <section className="resource-detail-panel resource-tags-panel">
            <h2>Теги</h2>
            <div className="resource-chip-row">
              {tags.length > 0
                ? tags.slice(0, 24).map((tag) => <span key={tag} className="resource-chip">{tag}</span>)
                : <span className="resource-muted">Без тегів</span>}
            </div>
          </section>
        </aside>
      </div>
    </>
  )
}
