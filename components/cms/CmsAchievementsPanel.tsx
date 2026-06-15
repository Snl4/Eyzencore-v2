'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Select } from '@/components/ui/Select'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { uploadFile } from '@/lib/upload'
import {
  ACHIEVEMENT_TRIGGER_META,
  ACHIEVEMENT_TRIGGER_TYPES,
  describeAchievementTrigger,
  type AchievementRecord,
  type AchievementTriggerType,
} from '@/lib/achievement-utils'

type CmsUserOption = {
  id: string
  full_name: string
  email: string
}

const EMBLEM_PRESETS = [
  '★', '☆', '✦', '✓', '◆', '◇', '○', '🏰', '⚔', '🛡', '🔥', '💎', '🎯', '🏆', '👑', '🌟',
]

type BuilderState = {
  name: string
  slug: string
  description: string
  emblem: string
  image_url: string
  trigger_type: AchievementTriggerType
  trigger_value: number
  is_active: number
  sort_order: number
}

const emptyBuilder = (): BuilderState => ({
  name: '',
  slug: '',
  description: '',
  emblem: '★',
  image_url: '',
  trigger_type: 'servers_count',
  trigger_value: 1,
  is_active: 1,
  sort_order: 0,
})

function toBuilder(row: AchievementRecord): BuilderState {
  const triggerType = ACHIEVEMENT_TRIGGER_TYPES.includes(
    row.trigger_type as AchievementTriggerType
  )
    ? (row.trigger_type as AchievementTriggerType)
    : 'manual'
  const meta = ACHIEVEMENT_TRIGGER_META[triggerType]
  return {
    name: row.name,
    slug: row.slug,
    description: row.description,
    emblem: row.emblem,
    image_url: row.image_url || '',
    trigger_type: triggerType,
    trigger_value: meta.needsValue ? row.trigger_value : meta.defaultValue,
    is_active: row.is_active,
    sort_order: row.sort_order,
  }
}

export function CmsAchievementsPanel({
  onError,
  onStatsRefresh,
}: {
  onError: (message: string) => void
  onStatsRefresh: () => Promise<void>
}) {
  const confirmAction = useConfirm()
  const [rows, setRows] = useState<AchievementRecord[]>([])
  const [users, setUsers] = useState<CmsUserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [query, setQuery] = useState('')
  const [builder, setBuilder] = useState<BuilderState>(emptyBuilder())
  const [editingId, setEditingId] = useState<number | null>(null)
  const [grantUserId, setGrantUserId] = useState('')
  const [grantAchievementId, setGrantAchievementId] = useState<number | ''>('')
  const [imageUploading, setImageUploading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const triggerMeta = ACHIEVEMENT_TRIGGER_META[builder.trigger_type]

  const loadData = useCallback(async () => {
    setLoading(true)
    const [achievementsRes, usersRes] = await Promise.all([
      fetch('/api/cms/data/achievements', { cache: 'no-store' }),
      fetch('/api/cms/data/users', { cache: 'no-store' }),
    ])
    if (!achievementsRes.ok) {
      onError('Не вдалося завантажити досягнення')
      setLoading(false)
      return
    }
    const achievements = (await achievementsRes.json()) as AchievementRecord[]
    setRows(achievements)
    if (usersRes.ok) {
      const userRows = (await usersRes.json()) as Array<{
        id: string
        full_name: string
        email: string
      }>
      setUsers(
        userRows.map((user) => ({
          id: user.id,
          full_name: user.full_name,
          email: user.email,
        }))
      )
    }
    setLoading(false)
  }, [onError])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((row) =>
      [
        row.name,
        row.slug,
        row.description,
        describeAchievementTrigger(row.trigger_type, row.trigger_value),
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    )
  }, [query, rows])

  function selectTrigger(type: AchievementTriggerType) {
    const meta = ACHIEVEMENT_TRIGGER_META[type]
    setBuilder((prev) => ({
      ...prev,
      trigger_type: type,
      trigger_value: meta.needsValue ? meta.defaultValue : 0,
    }))
  }

  function startCreate() {
    setEditingId(null)
    setBuilder(emptyBuilder())
  }

  function startEdit(row: AchievementRecord) {
    setEditingId(row.id)
    setBuilder(toBuilder(row))
  }

  async function saveAchievement() {
    if (!builder.name.trim()) {
      onError('Вкажіть назву досягнення')
      return
    }
    setSaving(true)
    const payload = {
      ...builder,
      trigger_value: triggerMeta.needsValue ? builder.trigger_value : 0,
    }
    const response = editingId
      ? await fetch(`/api/cms/data/achievements/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/cms/data/achievements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      onError(result.error || 'Не вдалося зберегти')
      setSaving(false)
      return
    }
    setEditingId(null)
    setBuilder(emptyBuilder())
    await Promise.all([loadData(), onStatsRefresh()])
    setSaving(false)
  }

  async function uploadAchievementImage(file: File | null) {
    if (!file) return
    setImageUploading(true)
    try {
      const uploaded = await uploadFile(file, 'misc')
      setBuilder((current) => ({ ...current, image_url: uploaded.url }))
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Не вдалося завантажити зображення')
    } finally {
      setImageUploading(false)
    }
  }

  async function removeAchievement(id: number) {
    if (!await confirmAction({
      title: 'Видалити досягнення?',
      description: 'Користувачі втратять цей бейдж, а налаштування досягнення буде видалено.',
      confirmLabel: 'Видалити досягнення',
    })) return
    const response = await fetch(`/api/cms/data/achievements/${id}`, {
      method: 'DELETE',
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      onError(result.error || 'Не вдалося видалити')
      return
    }
    if (editingId === id) startCreate()
    await Promise.all([loadData(), onStatsRefresh()])
  }

  async function syncAll() {
    setSyncing(true)
    const response = await fetch('/api/cms/achievements/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      onError(result.error || 'Синхронізація не вдалася')
      setSyncing(false)
      return
    }
    await loadData()
    setSyncing(false)
    alert(`Синхронізовано: видано ${result.awarded ?? 0} нових досягнень`)
  }

  async function grantManual(action: 'grant' | 'revoke') {
    if (!grantUserId || grantAchievementId === '') {
      onError('Виберіть користувача та досягнення')
      return
    }
    const response = await fetch('/api/cms/achievements/grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: grantUserId,
        achievementId: grantAchievementId,
        action,
      }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      onError(result.error || 'Не вдалося виконати дію')
      return
    }
    await loadData()
  }

  return (
    <div className="cms-achievements">
      <div className="cms-heading">
        <div>
          <p className="cms-eyebrow">Гейміфікація</p>
          <h1>Досягнення</h1>
          <p>Генератор бейджів: умова, емблема, превʼю та видача вручну.</p>
        </div>
        <div className="cms-heading-actions">
          <input
            aria-label="Пошук досягнень"
            placeholder="Пошук досягнень"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button onClick={() => loadData()} type="button">
            Оновити
          </button>
          <button
            disabled={syncing}
            onClick={() => syncAll()}
            type="button"
          >
            {syncing ? 'Синхронізація...' : 'Синхронізувати всі'}
          </button>
        </div>
      </div>

      <div className="cms-achievements-layout">
        <section className="cms-achievements-builder">
          <header>
            <div>
              <p className="cms-eyebrow">Генератор</p>
              <h2>{editingId ? 'Редагувати досягнення' : 'Нове досягнення'}</h2>
            </div>
            {editingId ? (
              <button onClick={startCreate} type="button">
                + Нове
              </button>
            ) : null}
          </header>

          <div className="cms-achievements-trigger-grid">
            {ACHIEVEMENT_TRIGGER_TYPES.map((type) => {
              const meta = ACHIEVEMENT_TRIGGER_META[type]
              const isActive = builder.trigger_type === type
              return (
                <button
                  className={isActive ? 'active' : ''}
                  key={type}
                  onClick={() => selectTrigger(type)}
                  type="button"
                >
                  <strong>{meta.label}</strong>
                  <span>{meta.hint}</span>
                </button>
              )
            })}
          </div>

          <div className="cms-editor-grid cms-achievements-fields">
            <label>
              <span>Назва</span>
              <input
                placeholder="Перший сервер"
                value={builder.name}
                onChange={(event) =>
                  setBuilder({ ...builder, name: event.target.value })
                }
              />
            </label>
            <label>
              <span>Slug (необовʼязково)</span>
              <input
                placeholder="first-server"
                value={builder.slug}
                onChange={(event) =>
                  setBuilder({ ...builder, slug: event.target.value })
                }
              />
            </label>
            <label className="wide">
              <span>Опис для профілю</span>
              <textarea
                rows={3}
                placeholder="Додав свій перший сервер у моніторинг"
                value={builder.description}
                onChange={(event) =>
                  setBuilder({ ...builder, description: event.target.value })
                }
              />
            </label>
            {triggerMeta.needsValue ? (
              <label>
                <span>
                  Умова: {triggerMeta.label}
                  {triggerMeta.unit ? ` (${triggerMeta.unit})` : ''}
                </span>
                <input
                  min={0}
                  type="number"
                  value={builder.trigger_value}
                  onChange={(event) =>
                    setBuilder({
                      ...builder,
                      trigger_value: Number(event.target.value) || 0,
                    })
                  }
                />
              </label>
            ) : null}
            <label>
              <span>Порядок сортування</span>
              <input
                type="number"
                value={builder.sort_order}
                onChange={(event) =>
                  setBuilder({
                    ...builder,
                    sort_order: Number(event.target.value) || 0,
                  })
                }
              />
            </label>
            <label>
              <span>Статус</span>
              <button
                className={`cms-toggle ${builder.is_active ? 'on' : ''}`}
                onClick={() =>
                  setBuilder({
                    ...builder,
                    is_active: builder.is_active ? 0 : 1,
                  })
                }
                type="button"
              >
                {builder.is_active ? 'Активне' : 'Приховане'}
              </button>
            </label>
          </div>

          <div className="cms-achievements-emblems">
            <span>Емблема</span>
            <div>
              {EMBLEM_PRESETS.map((emblem) => (
                <button
                  className={builder.emblem === emblem ? 'active' : ''}
                  key={emblem}
                  onClick={() => setBuilder({ ...builder, emblem })}
                  type="button"
                >
                  {emblem}
                </button>
              ))}
              <input
                aria-label="Своя емблема"
                maxLength={8}
                placeholder="свій"
                value={builder.emblem}
                onChange={(event) =>
                  setBuilder({ ...builder, emblem: event.target.value })
                }
              />
            </div>
          </div>

          <div className="cms-achievement-image-field">
            <span>Кастомне зображення</span>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              hidden
              onChange={(event) => {
                void uploadAchievementImage(event.target.files?.[0] || null)
                event.target.value = ''
              }}
            />
            {builder.image_url ? (
              <div className="cms-achievement-image-preview">
                <img src={builder.image_url} alt="Превʼю емблеми" />
                <div>
                  <button type="button" onClick={() => imageInputRef.current?.click()}>
                    {imageUploading ? 'Завантаження...' : 'Замінити'}
                  </button>
                  <button
                    className="danger"
                    type="button"
                    onClick={() => setBuilder({ ...builder, image_url: '' })}
                  >
                    Прибрати
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="cms-achievement-image-upload"
                type="button"
                disabled={imageUploading}
                onClick={() => imageInputRef.current?.click()}
              >
                {imageUploading ? 'Завантаження...' : 'Завантажити PNG, JPG, WebP, GIF або AVIF'}
              </button>
            )}
          </div>

          <div className="cms-achievements-preview">
            <p className="cms-eyebrow">Превʼю в профілі</p>
            <div className={`pbadge${builder.is_active ? '' : ' locked'}`}>
              <div className="pbadge-medal">
                {builder.image_url ? <img src={builder.image_url} alt="" /> : builder.emblem || '★'}
              </div>
              <div className="pbadge-name">
                {builder.name || 'Назва досягнення'}
              </div>
              <div className="pbadge-desc">
                {builder.description || 'Короткий опис умови'}
              </div>
            </div>
            <small>
              Умова:{' '}
              {describeAchievementTrigger(
                builder.trigger_type,
                triggerMeta.needsValue ? builder.trigger_value : 0
              )}
            </small>
          </div>

          <div className="cms-achievements-builder-actions">
            <button
              className="cms-primary-button"
              disabled={saving}
              onClick={() => saveAchievement()}
              type="button"
            >
              {saving ? 'Збереження...' : editingId ? 'Зберегти зміни' : 'Створити досягнення'}
            </button>
          </div>
        </section>

        <aside className="cms-achievements-side">
          <section className="cms-achievements-grant">
            <p className="cms-eyebrow">Видача вручну</p>
            <h3>Дати або забрати бейдж</h3>
            <label>
              <span>Користувач</span>
              <Select
                value={grantUserId}
                onChange={setGrantUserId}
                options={[
                  { value: '', label: 'Виберіть користувача' },
                  ...users.map((user) => ({ value: user.id, label: `${user.full_name} (${user.email})` })),
                ]}
                ariaLabel="Користувач"
              />
            </label>
            <label>
              <span>Досягнення</span>
              <Select
                value={grantAchievementId === '' ? '' : String(grantAchievementId)}
                onChange={(value) => setGrantAchievementId(value ? Number(value) : '')}
                options={[
                  { value: '', label: 'Виберіть досягнення' },
                  ...rows.map((row) => ({ value: String(row.id), label: row.name })),
                ]}
                ariaLabel="Досягнення"
              />
            </label>
            <div className="cms-achievements-grant-actions">
              <button
                className="success"
                onClick={() => grantManual('grant')}
                type="button"
              >
                Видати
              </button>
              <button onClick={() => grantManual('revoke')} type="button">
                Забрати
              </button>
            </div>
          </section>

          <section className="cms-achievements-list">
            <p className="cms-eyebrow">Каталог</p>
            <h3>{filteredRows.length} досягнень</h3>
            {loading ? (
              <div className="cms-empty">Завантаження...</div>
            ) : null}
            {!loading && filteredRows.length === 0 ? (
              <div className="cms-empty">Ще немає досягнень</div>
            ) : null}
            <div className="cms-achievements-cards">
              {filteredRows.map((row) => (
                <article
                  className={row.is_active ? '' : 'inactive'}
                  key={row.id}
                >
                  <div className="pbadge-medal">
                    {row.image_url ? <img src={row.image_url} alt="" /> : row.emblem}
                  </div>
                  <div>
                    <strong>{row.name}</strong>
                    <p>{row.description}</p>
                    <small>
                      {describeAchievementTrigger(
                        row.trigger_type,
                        row.trigger_value
                      )}
                      · видано: {row.earned_count ?? 0}
                    </small>
                  </div>
                  <div className="cms-row-actions">
                    <button onClick={() => startEdit(row)} type="button">
                      Редагувати
                    </button>
                    <button
                      className="danger"
                      onClick={() => removeAchievement(row.id)}
                      type="button"
                    >
                      Видалити
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
