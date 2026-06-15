'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CmsAchievementsPanel } from '@/components/cms/CmsAchievementsPanel'
import { Select } from '@/components/ui/Select'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import type { CmsEntity } from '@/lib/cms-db'
import type { MaintenanceSettings } from '@/lib/maintenance'

type CmsRow = Record<string, unknown> & { id: string | number }
type CmsStats = Record<CmsEntity, number>
type CmsSection = CmsEntity | 'maintenance'
type Field = {
  key: string
  label: string
  type?: 'text' | 'textarea' | 'number' | 'select' | 'toggle'
  options?: string[]
}
type EntityConfig = {
  label: string
  singular: string
  description: string
  columns: Array<{ key: string; label: string }>
  fields: Field[]
}

const configs: Record<CmsEntity, EntityConfig> = {
  users: {
    label: 'Користувачі',
    singular: 'користувача',
    description: 'Облікові записи, ролі та профілі.',
    columns: [
      { key: 'full_name', label: 'Ім’я' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Роль' },
      { key: 'created_at', label: 'Створено' },
    ],
    fields: [
      { key: 'full_name', label: 'Ім’я' },
      { key: 'email', label: 'Email' },
      { key: 'profile_slug', label: 'Slug профілю' },
      {
        key: 'role',
        label: 'Роль',
        type: 'select',
        options: ['USER', 'OWNER', 'ADMIN'],
      },
      { key: 'bio', label: 'Про користувача', type: 'textarea' },
      { key: 'location', label: 'Локація' },
      { key: 'website', label: 'Сайт' },
      { key: 'telegram', label: 'Telegram' },
      { key: 'discord', label: 'Discord' },
    ],
  },
  servers: {
    label: 'Сервери',
    singular: 'сервер',
    description: 'Картки серверів, адреси, статус і верифікація.',
    columns: [
      { key: 'name', label: 'Назва' },
      { key: 'addr', label: 'Адреса' },
      { key: 'platform', label: 'Платформа' },
      { key: 'players', label: 'Гравці' },
      { key: 'verified', label: 'Перевірено' },
      { key: 'boosted', label: 'Буст' },
    ],
    fields: [
      { key: 'name', label: 'Назва' },
      { key: 'addr', label: 'Адреса' },
      {
        key: 'platform',
        label: 'Платформа',
        type: 'select',
        options: ['minecraft', 'discord'],
      },
      { key: 'mode', label: 'Режим' },
      { key: 'ver', label: 'Версія' },
      { key: 'core', label: 'Ядро' },
      { key: 'country', label: 'Країна' },
      { key: 'short_desc', label: 'Короткий опис', type: 'textarea' },
      { key: 'full_desc', label: 'Повний опис', type: 'textarea' },
      { key: 'website', label: 'Сайт' },
      { key: 'discord', label: 'Discord' },
      { key: 'telegram', label: 'Telegram' },
      { key: 'tags', label: 'Теги JSON', type: 'textarea' },
      { key: 'online', label: 'Онлайн', type: 'toggle' },
      { key: 'players', label: 'Гравців', type: 'number' },
      { key: 'max', label: 'Максимум', type: 'number' },
      { key: 'verified', label: 'Верифікований', type: 'toggle' },
      { key: 'boosted', label: 'Буст / спонсоровано', type: 'toggle' },
      { key: 'project_id', label: 'ID проєкту', type: 'number' },
    ],
  },
  news: {
    label: 'Новини',
    singular: 'новину',
    description: 'Публікації, категорії та обкладинки.',
    columns: [
      { key: 'title', label: 'Заголовок' },
      { key: 'category', label: 'Категорія' },
      { key: 'app_users.full_name', label: 'Автор' },
      { key: 'updated_at', label: 'Оновлено' },
    ],
    fields: [
      { key: 'title', label: 'Заголовок' },
      { key: 'category', label: 'Категорія' },
      { key: 'excerpt', label: 'Анонс', type: 'textarea' },
      { key: 'content', label: 'Текст новини', type: 'textarea' },
      { key: 'cover_url', label: 'URL обкладинки' },
    ],
  },
  projects: {
    label: 'Проєкти',
    singular: 'проєкт',
    description: 'Групи серверів та їхні власники.',
    columns: [
      { key: 'name', label: 'Назва' },
      { key: 'app_users.full_name', label: 'Власник' },
      { key: '_count.app_servers', label: 'Серверів' },
      { key: 'created_at', label: 'Створено' },
    ],
    fields: [
      { key: 'name', label: 'Назва' },
      { key: 'description', label: 'Опис', type: 'textarea' },
      { key: 'logo_url', label: 'URL логотипа' },
      { key: 'website', label: 'Сайт' },
      { key: 'discord', label: 'Discord' },
    ],
  },
  reviews: {
    label: 'Відгуки',
    singular: 'відгук',
    description: 'Оцінки та коментарі користувачів.',
    columns: [
      { key: 'app_servers.name', label: 'Сервер' },
      { key: 'author_name', label: 'Автор' },
      { key: 'rating', label: 'Оцінка' },
      { key: 'text', label: 'Текст' },
    ],
    fields: [
      { key: 'author_name', label: 'Автор' },
      { key: 'rating', label: 'Оцінка 1–5', type: 'number' },
      { key: 'text', label: 'Текст', type: 'textarea' },
    ],
  },
  achievements: {
    label: 'Досягнення',
    singular: 'досягнення',
    description: 'Генератор бейджів для профілів.',
    columns: [],
    fields: [],
  },
  applications: {
    label: 'Заявки',
    singular: 'заявку',
    description: 'Модерація заявок на додавання серверів.',
    columns: [
      { key: 'name', label: 'Сервер' },
      { key: 'addr', label: 'Адреса' },
      { key: 'app_users.full_name', label: 'Власник' },
      { key: 'status', label: 'Статус' },
    ],
    fields: [
      { key: 'name', label: 'Назва' },
      { key: 'addr', label: 'Адреса' },
      { key: 'platform', label: 'Платформа' },
      { key: 'mode', label: 'Режим' },
      { key: 'ver', label: 'Версія' },
      { key: 'core', label: 'Ядро' },
      { key: 'country', label: 'Країна' },
      { key: 'short_desc', label: 'Короткий опис', type: 'textarea' },
      { key: 'full_desc', label: 'Повний опис', type: 'textarea' },
      { key: 'website', label: 'Сайт' },
      { key: 'discord', label: 'Discord' },
      { key: 'telegram', label: 'Telegram' },
      { key: 'project_id', label: 'ID проєкту', type: 'number' },
    ],
  },
}

const entityOrder: CmsEntity[] = [
  'users',
  'servers',
  'news',
  'projects',
  'reviews',
  'applications',
  'achievements',
]

function readPath(row: CmsRow, path: string) {
  let value: unknown = row
  for (const key of path.split('.')) {
    if (!value || typeof value !== 'object') return undefined
    value = (value as Record<string, unknown>)[key]
  }
  return value
}

function renderValue(value: unknown, key: string) {
  if (key.includes('_at') && value) {
    return new Date(String(value)).toLocaleDateString('uk-UA')
  }
  if (key === 'verified' || key === 'online' || key === 'boosted') {
    return Number(value) ? 'Так' : 'Ні'
  }
  const result = String(value ?? '—')
  return result.length > 70 ? `${result.slice(0, 70)}…` : result
}

export function CmsClient({
  admin,
  initialStats,
  initialMaintenance,
}: {
  admin: { email: string; name: string }
  initialStats: CmsStats
  initialMaintenance: MaintenanceSettings
}) {
  const confirmAction = useConfirm()
  const router = useRouter()
  const [entity, setEntity] = useState<CmsSection>('users')
  const [rows, setRows] = useState<CmsRow[]>([])
  const [stats, setStats] = useState(initialStats)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<CmsRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [maintenance, setMaintenance] = useState(initialMaintenance)
  const [maintenanceSaving, setMaintenanceSaving] = useState(false)

  const config = entity === 'maintenance' ? null : configs[entity]

  const loadRows = useCallback(async (currentEntity?: CmsEntity) => {
    const targetEntity = currentEntity || (entity === 'maintenance' ? null : entity)
    if (!targetEntity) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    const response = await fetch(`/api/cms/data/${targetEntity}`, {
      cache: 'no-store',
    })
    if (response.status === 401) {
      router.replace('/cms/login')
      return
    }
    const result = await response.json().catch(() => [])
    if (!response.ok) {
      setError(result.error || 'Не вдалося завантажити дані')
      setLoading(false)
      return
    }
    setRows(result as CmsRow[])
    setLoading(false)
  }, [entity, router])

  async function refreshStats() {
    const response = await fetch('/api/cms/stats', { cache: 'no-store' })
    if (response.ok) setStats(await response.json())
  }

  useEffect(() => {
    if (entity === 'maintenance') {
      setRows([])
      setLoading(false)
      return
    }
    void loadRows(entity)
  }, [entity, loadRows])

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((row) =>
      JSON.stringify(row).toLowerCase().includes(needle)
    )
  }, [query, rows])

  function selectEntity(next: CmsSection) {
    setEntity(next)
    setQuery('')
    setEditing(null)
  }

  async function save() {
    if (!editing) return
    setSaving(true)
    setError('')
    if (entity === 'maintenance') return
    const response = await fetch(`/api/cms/data/${entity}/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(result.error || 'Не вдалося зберегти')
      setSaving(false)
      return
    }
    setEditing(null)
    await Promise.all([loadRows(), refreshStats()])
    setSaving(false)
  }

  async function remove(row: CmsRow) {
    if (!await confirmAction({
      title: `Видалити ${config?.singular || 'запис'}?`,
      description: 'Запис буде видалено без можливості відновлення.',
      confirmLabel: 'Видалити',
    })) {
      return
    }
    if (entity === 'maintenance') return
    const response = await fetch(`/api/cms/data/${entity}/${row.id}`, {
      method: 'DELETE',
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(result.error || 'Не вдалося видалити')
      return
    }
    await Promise.all([loadRows(), refreshStats()])
  }

  async function moderate(action: 'approve' | 'reject', row: CmsRow) {
    const reason =
      action === 'reject'
        ? prompt(
            'Причина відхилення:',
            String(row.rejection_reason || '')
          ) || ''
        : ''
    if (action === 'reject' && !reason) return

    const response = await fetch(`/api/cms/applications/${row.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(result.error || 'Не вдалося виконати дію')
      return
    }
    await Promise.all([loadRows(), refreshStats()])
  }

  async function logout() {
    await fetch('/api/cms/auth/logout', { method: 'POST' })
    router.replace('/cms/login')
    router.refresh()
  }

  async function saveMaintenance(nextSettings: MaintenanceSettings = maintenance) {
    if (nextSettings.enabled && !maintenance.enabled) {
      const confirmed = await confirmAction({
        title: 'Увімкнути технічні роботи?',
        description: 'Усі звичайні сторінки та API стануть недоступними. Адміністратор із чинною сесією збереже доступ.',
        confirmLabel: 'Увімкнути',
      })
      if (!confirmed) return
    }
    setMaintenanceSaving(true)
    setError('')
    const response = await fetch('/api/cms/maintenance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextSettings),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(result.error || 'Не вдалося змінити режим технічних робіт')
    } else {
      setMaintenance(result as MaintenanceSettings)
    }
    setMaintenanceSaving(false)
  }

  return (
    <main className="cms-shell">
      <aside className="cms-sidebar">
        <a className="cms-brand" href="/cms">
          <span>EC</span>
          <div>
            <strong>Eyzencore</strong>
            <small>CMS</small>
          </div>
        </a>
        <nav className="cms-nav">
          {entityOrder.map((item) => (
            <button
              className={item === entity ? 'active' : ''}
              key={item}
              onClick={() => selectEntity(item)}
              type="button"
            >
              <span>{configs[item].label}</span>
              <b>{stats[item]}</b>
            </button>
          ))}
          <button
            className={entity === 'maintenance' ? 'active maintenance' : 'maintenance'}
            onClick={() => selectEntity('maintenance')}
            type="button"
          >
            <span>Технічні роботи</span>
            <b>{maintenance.enabled ? 'ON' : 'OFF'}</b>
          </button>
        </nav>
        <div className="cms-sidebar-footer">
          <a href="/" target="_blank" rel="noreferrer">
            Відкрити сайт ↗
          </a>
          <button onClick={logout} type="button">
            Вийти з CMS
          </button>
        </div>
      </aside>

      <section className="cms-workspace">
        <header className="cms-topbar">
          <div>
            <p>Панель керування</p>
            <strong>{admin.name}</strong>
          </div>
          <span>{admin.email}</span>
        </header>

        <div className="cms-content">
          {error ? <div className="cms-alert">{error}</div> : null}
          {entity === 'maintenance' ? (
            <section className="cms-maintenance-page">
              <div className={`cms-maintenance-hero${maintenance.enabled ? ' active' : ''}`}>
                <div>
                  <p className="cms-eyebrow">Стан платформи</p>
                  <h1>{maintenance.enabled ? 'Технічні роботи активні' : 'Сайт працює'}</h1>
                  <p>
                    {maintenance.enabled
                      ? 'Відвідувачі бачать лише службову сторінку. Для перевірки відкрийте сайт у режимі інкогніто.'
                      : 'Усі сторінки та API доступні відвідувачам.'}
                  </p>
                </div>
                <span className="cms-maintenance-status">
                  <i /> {maintenance.enabled ? 'Maintenance ON' : 'Online'}
                </span>
              </div>

              <div className="cms-maintenance-layout">
                <div className="cms-maintenance-editor">
                  <div>
                    <p className="cms-eyebrow">Налаштування сторінки</p>
                    <h2>Повідомлення для відвідувачів</h2>
                  </div>
                  <label>
                    <span>Заголовок</span>
                    <input
                      value={maintenance.title}
                      maxLength={120}
                      onChange={(event) => setMaintenance((current) => ({ ...current, title: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Опис робіт</span>
                    <textarea
                      rows={6}
                      value={maintenance.message}
                      maxLength={1000}
                      onChange={(event) => setMaintenance((current) => ({ ...current, message: event.target.value }))}
                    />
                  </label>
                  <div className="cms-maintenance-actions">
                    <button
                      className={maintenance.enabled ? 'danger' : 'cms-primary-button'}
                      disabled={maintenanceSaving}
                      onClick={() => void saveMaintenance({ ...maintenance, enabled: !maintenance.enabled })}
                      type="button"
                    >
                      {maintenance.enabled ? 'Вимкнути технічні роботи' : 'Увімкнути технічні роботи'}
                    </button>
                    <button
                      disabled={maintenanceSaving}
                      onClick={() => void saveMaintenance()}
                      type="button"
                    >
                      {maintenanceSaving ? 'Збереження...' : 'Зберегти зміни'}
                    </button>
                  </div>
                </div>

                <div className="cms-maintenance-preview">
                  <p className="cms-eyebrow">Попередній перегляд</p>
                  <div className="maintenance-card">
                    <div className="maintenance-mark">EC</div>
                    <p className="maintenance-eyebrow">Eyzencore · системне оновлення</p>
                    <h1>{maintenance.title || 'Технічні роботи'}</h1>
                    <p>{maintenance.message}</p>
                    <div className="maintenance-status"><span /> Роботи тривають</div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
          {entity === 'achievements' ? (
            <CmsAchievementsPanel
              onError={setError}
              onStatsRefresh={refreshStats}
            />
          ) : null}
          {entity !== 'achievements' && entity !== 'maintenance' && config ? (
          <>
          <div className="cms-heading">
            <div>
              <p className="cms-eyebrow">Контент сайту</p>
              <h1>{config.label}</h1>
              <p>{config.description}</p>
            </div>
            <div className="cms-heading-actions">
              <input
                aria-label="Пошук"
                placeholder={`Пошук: ${config.label.toLowerCase()}`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <button onClick={() => loadRows()} type="button">
                Оновити
              </button>
            </div>
          </div>

          <div className="cms-table-card">
            <div className="cms-table-meta">
              <span>{filteredRows.length} записів</span>
              <small>Дані напряму з Prisma</small>
            </div>
            <div className="cms-table-scroll">
              <table className="cms-table">
                <thead>
                  <tr>
                    {config.columns.map((column) => (
                      <th key={column.key}>{column.label}</th>
                    ))}
                    <th className="cms-actions-column">Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading &&
                    filteredRows.map((row) => (
                      <tr key={row.id}>
                        {config.columns.map((column) => (
                          <td key={column.key}>
                            {renderValue(
                              readPath(row, column.key),
                              column.key
                            )}
                          </td>
                        ))}
                        <td>
                          <div className="cms-row-actions">
                            {entity === 'applications' &&
                            row.status === 'pending' ? (
                              <>
                                <button
                                  className="success"
                                  onClick={() => moderate('approve', row)}
                                  type="button"
                                >
                                  Схвалити
                                </button>
                                <button
                                  onClick={() => moderate('reject', row)}
                                  type="button"
                                >
                                  Відхилити
                                </button>
                              </>
                            ) : null}
                            <button
                              onClick={() => setEditing({ ...row })}
                              type="button"
                            >
                              Редагувати
                            </button>
                            <button
                              className="danger"
                              onClick={() => remove(row)}
                              type="button"
                            >
                              Видалити
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {loading ? (
                    <tr>
                      <td colSpan={config.columns.length + 1}>
                        <div className="cms-empty">Завантаження даних...</div>
                      </td>
                    </tr>
                  ) : null}
                  {!loading && filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={config.columns.length + 1}>
                        <div className="cms-empty">Записів не знайдено</div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
          </>
          ) : null}
        </div>
      </section>

      {editing && config ? (
        <div className="cms-modal-backdrop" onMouseDown={() => setEditing(null)}>
          <section
            className="cms-editor"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p className="cms-eyebrow">Редактор</p>
                <h2>Редагувати {config.singular}</h2>
              </div>
              <div className="cms-editor-actions">
                <button onClick={() => setEditing(null)} type="button">
                  Скасувати
                </button>
                <button
                  className="cms-primary-button"
                  disabled={saving}
                  onClick={save}
                  type="button"
                >
                  {saving ? 'Збереження...' : 'Зберегти'}
                </button>
              </div>
            </header>
            <div className="cms-editor-grid">
              {config.fields.map((field) => (
                <label
                  className={field.type === 'textarea' ? 'wide' : ''}
                  key={field.key}
                >
                  <span>{field.label}</span>
                  {field.type === 'textarea' ? (
                    <textarea
                      rows={field.key === 'content' ? 14 : 5}
                      value={String(editing[field.key] ?? '')}
                      onChange={(event) =>
                        setEditing({
                          ...editing,
                          [field.key]: event.target.value,
                        })
                      }
                    />
                  ) : field.type === 'select' ? (
                    <Select
                      value={String(editing[field.key] ?? '')}
                      onChange={(value) =>
                        setEditing({
                          ...editing,
                          [field.key]: value,
                        })
                      }
                      options={field.options || []}
                      ariaLabel={field.label}
                    />
                  ) : field.type === 'toggle' ? (
                    <button
                      className={`cms-toggle ${
                        Number(editing[field.key]) ? 'on' : ''
                      }`}
                      onClick={() =>
                        setEditing({
                          ...editing,
                          [field.key]: Number(editing[field.key]) ? 0 : 1,
                        })
                      }
                      type="button"
                    >
                      {Number(editing[field.key]) ? 'Увімкнено' : 'Вимкнено'}
                    </button>
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={String(editing[field.key] ?? '')}
                      onChange={(event) =>
                        setEditing({
                          ...editing,
                          [field.key]: event.target.value,
                        })
                      }
                    />
                  )}
                </label>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}
