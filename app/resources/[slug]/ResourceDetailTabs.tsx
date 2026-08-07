'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ResourceMarkdown } from './ResourceMarkdown'
import { ResourceMediaGallery } from './ResourceMediaGallery'

export type ResourceDownloadVersion = {
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
  changelog?: string | null
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
  authorName?: string | null
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
        {items.length > 0 ? (
          items.slice(0, 24).map((item) => (
            <span key={item} className="resource-chip">
              {item}
            </span>
          ))
        ) : (
          <span className="resource-muted">{empty}</span>
        )}
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
  authorName,
}: ResourceDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<'description' | 'gallery' | 'versions'>('description')
  const [selectedChangelog, setSelectedChangelog] = useState<string | null>(null)

  return (
    <>
      <div className="resource-detail-tabs" role="tablist" aria-label="Навігація ресурсу">
        <button
          type="button"
          className={activeTab === 'description' ? 'active' : ''}
          onClick={() => setActiveTab('description')}
        >
          Опис
        </button>
        {gallery.length > 0 && (
          <button
            type="button"
            className={activeTab === 'gallery' ? 'active' : ''}
            onClick={() => setActiveTab('gallery')}
          >
            Галерея ({gallery.length})
          </button>
        )}
        <button
          type="button"
          className={activeTab === 'versions' ? 'active' : ''}
          onClick={() => setActiveTab('versions')}
        >
          Версії ({downloadVersions.length})
        </button>
      </div>

      <div className="resource-detail-layout">
        {activeTab === 'versions' && (
          <Panel>
            <section className="resource-detail-panel resource-versions-panel">
              <div className="resource-panel-heading">
                <div>
                  <h2>Доступні версії та завантаження</h2>
                  <p>Прямі завантаження файлів з офіційного джерела Modrinth.</p>
                </div>
                <span>{downloadVersions.length} версій</span>
              </div>
              {downloadVersions.length > 0 ? (
                <div className="resource-version-table">
                  <div className="resource-version-head">
                    <span>Версія / Назва</span>
                    <span>Гра</span>
                    <span>Лоадери</span>
                    <span>Опубліковано</span>
                    <span>Розмір</span>
                    <span style={{ textAlign: 'right' }}>Дія</span>
                  </div>
                  {downloadVersions.map((version) => (
                    <article className="resource-version-row" key={version.id}>
                      <div className="resource-version-name">
                        <span
                          className={`resource-version-type-badge ${version.type}`}
                          title={`Тип релізу: ${version.type}`}
                        >
                          {version.type.slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <h3>{version.name || version.number}</h3>
                          <p>{version.number} • {version.fileName}</p>
                          {version.changelog && (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedChangelog(
                                  selectedChangelog === version.id ? null : version.id,
                                )
                              }
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-primary, #38bdf8)',
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                padding: 0,
                                textAlign: 'left',
                                marginTop: 4,
                              }}
                            >
                              {selectedChangelog === version.id ? 'Приховати зміни ▲' : 'Список змін ▼'}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="resource-version-cell">
                        {version.gameVersions.slice(0, 2).join(', ') || '-'}
                      </div>
                      <div className="resource-chip-row">
                        {version.loaders.slice(0, 3).map((loader) => (
                          <span className="resource-chip" key={loader}>
                            {loader}
                          </span>
                        ))}
                      </div>
                      <div className="resource-version-cell">{formatRelativeDate(version.datePublished)}</div>
                      <div className="resource-version-cell">{formatFileSize(version.fileSize) || '-'}</div>
                      <div style={{ textAlign: 'right' }}>
                        <a
                          className="btn btn-primary btn-sm resource-version-download"
                          href={version.fileUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Скачати ${version.name}`}
                        >
                          ↓ Скачати
                        </a>
                      </div>

                      {selectedChangelog === version.id && version.changelog && (
                        <div
                          style={{
                            gridColumn: '1 / -1',
                            marginTop: 12,
                            padding: 12,
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: 8,
                            fontSize: '0.85rem',
                          }}
                        >
                          <h4 style={{ margin: '0 0 6px', fontSize: '0.9rem', color: '#e2e8f0' }}>Зміни у версії:</h4>
                          <ResourceMarkdown content={version.changelog} />
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="resource-version-row resource-version-single">
                  <div className="resource-version-name">
                    <span>F</span>
                    <div>
                      <h3>Основний файл ресурсу</h3>
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
              <h2>Опис ресурсу</h2>
              <ResourceMarkdown content={description} />
            </section>
          </Panel>
        )}

        {activeTab === 'gallery' && (
          <Panel>
            <section className="resource-detail-panel">
              <h2>Галерея та скріншоти</h2>
              <ResourceMediaGallery media={gallery} />
            </section>
          </Panel>
        )}

        <aside className="resource-detail-sidebar">
          <section className="resource-detail-panel resource-side-panel">
            <h2>Сумісність та деталі</h2>
            {authorName && (
              <p className="resource-fact">
                <span>Автор / Студія</span>
                <b>{authorName}</b>
              </p>
            )}
            <ResourceList title="Minecraft версії" items={gameVersions} empty="Не вказано" />
            <ResourceList title="Завантажувачі (Loaders)" items={loaders} empty="Не вказано" />
            {side && (
              <p className="resource-fact">
                <span>Середовище</span>
                <b>{side}</b>
              </p>
            )}
            {license && (
              <p className="resource-fact">
                <span>Ліцензія</span>
                <b>{license}</b>
              </p>
            )}
          </section>

          <section className="resource-detail-panel resource-links-panel">
            <h2>Корисні посилання</h2>
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
              Оригінал на Modrinth ↗
            </a>
            <a href={fallbackDownloadUrl} download target="_blank" rel="noopener noreferrer">
              Пряме завантаження ↓
            </a>
            <Link href="/resources">До списку всіх ресурсів</Link>
          </section>

          <section className="resource-detail-panel resource-tags-panel">
            <h2>Категорії та теги</h2>
            <div className="resource-chip-row">
              {tags.length > 0 ? (
                tags.slice(0, 24).map((tag) => (
                  <span key={tag} className="resource-chip">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="resource-muted">Без тегів</span>
              )}
            </div>
          </section>
        </aside>
      </div>
    </>
  )
}
