'use client'
import { useEffect, useRef, useState, useTransition, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { Icons } from '@/components/ui/Icons'
import { Select } from '@/components/ui/Select'
import { DISCORD_CATEGORIES, GAME_MODES, VERSIONS } from '@/lib/data'
import type { Server, ServerPlatform } from '@/lib/types'
import type { AuthUser, Project } from '@/lib/auth-db'

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7
type CoreType = 'java' | 'bedrock' | 'java_bedrock' | 'discord'
type ServerForm = {
  platform: ServerPlatform
  name: string
  addr: string
  mode: string
  minVer: string
  maxVer: string
  ver: string
  core: CoreType
  country: string
  motd: string
  shortDesc: string
  fullDesc: string
  desc: string
  launcherUrl: string
  website: string
  discord: string
  telegram: string
  donate: string
  tiktok: string
  avatarUrl: string
  bannerUrl: string
  gallery: string[]
  videos: string[]
  tags: string[]
  projectId: number | null
}

const STEP_LABELS: Record<Step, string> = {
  1: 'Підключення',
  2: 'Основне',
  3: 'Опис',
  4: 'Посилання',
  5: 'Медіа',
  6: 'Теги',
  7: 'Підтвердження',
}
const STEP_HINTS: Record<Step, string> = {
  1: 'Перевіримо твій сервер та автоматично підтягнемо метадані',
  2: 'Назва, режим, підтримувані версії та країна',
  3: 'Розкажи гравцям про свій сервер',
  4: 'Лаунчер, сайт та соцмережі',
  5: 'Аватар, банер, скріншоти та відео',
  6: 'Обери до 6 тегів, які найкраще описують сервер',
  7: 'Перевір дані перед збереженням',
}
const CORE_LABELS: Record<CoreType, string> = {
  java: 'Java-версія',
  bedrock: 'Bedrock-версія',
  java_bedrock: 'Java + Bedrock',
  discord: 'Discord',
}
const TAG_OPTIONS = ['Survival', 'Economy', 'PvP', 'PvE', 'RP', 'SkyBlock', 'Events', 'No P2W', 'Custom mobs', 'WorldEdit', 'Plots', 'Factions', 'Mini-games', 'Quests', 'Raids', 'One-life']
const MODES = GAME_MODES.filter((mode) => mode !== 'Всі')
const DISCORD_MODES = DISCORD_CATEGORIES.filter((category) => category !== 'Всі')
const VERS = VERSIONS.filter((version) => version !== 'Всі')
const PLATFORM_OPTIONS: { value: ServerPlatform; label: string }[] = [
  { value: 'minecraft', label: 'Minecraft' },
  { value: 'discord', label: 'Discord' },
]
const CORE_OPTIONS: CoreType[] = ['java', 'bedrock', 'java_bedrock']
const MAX_GALLERY_IMAGES = 6
const MAX_VIDEO_LINKS = 2
const MAX_TAGS = 6

const getDefaultForm = (server?: Server): ServerForm => ({
  platform: server?.platform === 'discord' || server?.core === 'discord' ? 'discord' : 'minecraft',
  name: server?.name || '',
  addr: server?.addr || '',
  mode: server?.mode || (server?.platform === 'discord' ? DISCORD_MODES[0] : MODES[0]),
  minVer: (server?.ver || '').includes('-') ? String(server?.ver || '').split('-')[0] : (server?.ver || VERS[0]),
  maxVer: (server?.ver || '').includes('-') ? String(server?.ver || '').split('-')[1] : (server?.ver || VERS[0]),
  ver: server?.ver || VERS[0],
  core: server?.core || 'java',
  country: server?.country || '',
  motd: server?.motd || '',
  shortDesc: server?.shortDesc || '',
  fullDesc: server?.fullDesc || '',
  desc: server?.desc || '',
  launcherUrl: server?.launcherUrl || '',
  website: server?.website || '',
  discord: server?.discord || '',
  telegram: server?.telegram || '',
  donate: server?.donate || '',
  tiktok: server?.tiktok || '',
  avatarUrl: server?.avatarUrl || '',
  bannerUrl: server?.bannerUrl || '',
  gallery: (server?.gallery || []).slice(0, MAX_GALLERY_IMAGES),
  videos: (server?.videos || []).slice(0, MAX_VIDEO_LINKS),
  tags: (server?.tags || []).slice(0, MAX_TAGS),
  projectId: server?.projectId ?? null,
})

const readFileAsDataUrl = async (file: File): Promise<string> => {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Не вдалося прочитати зображення'))
    reader.readAsDataURL(file)
  })
}

function StepIndicator(input: { step: Step; current: Step; label: string; onSelectStep: (step: Step) => void }) {
  const { step, current, label, onSelectStep } = input
  const done = current > step
  const active = current === step
  return (
    <button type="button" className="add-step add-step-button" onClick={() => onSelectStep(step)}>
      <div className={`add-step-dot${active ? ' active' : ''}${done ? ' done' : ''}`}>{done ? '✓' : step}</div>
      <span className={`add-step-label${active ? ' active' : ''}${done ? ' done' : ''}`}>{label}</span>
    </button>
  )
}

export function AddServerClient(input: {
  initialServer?: Server
  initialUser: AuthUser | null
  sidebarRole?: string
  activeSection?: string
  defaultPlatform?: ServerPlatform
}) {
  const { initialServer, initialUser, sidebarRole, activeSection, defaultPlatform } = input
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<ServerForm>(() => {
    const base = getDefaultForm(initialServer)
    if (!initialServer && defaultPlatform === 'discord') {
      return {
        ...base,
        platform: 'discord',
        mode: DISCORD_MODES[0],
        minVer: 'Discord',
        maxVer: 'Discord',
        ver: 'Discord',
        core: 'discord',
      }
    }
    return base
  })
  const [checking, setChecking] = useState(false)
  const [checked, setChecked] = useState(Boolean(initialServer))
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const [submitted, setSubmitted] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const isEditMode = Boolean(initialServer)
  const isDiscordForm = form.platform === 'discord'

  useEffect(() => {
    void fetch('/api/projects')
      .then(async (res) => {
        if (!res.ok) return
        const data = (await res.json()) as { projects: Project[] }
        setProjects(data.projects)
      })
  }, [])
  const normalizedAddress = form.addr.trim()
  const canCheckServer = normalizedAddress.length > 0
  const isCheckSkipped = !isEditMode && !checked && step > 1
  const checkHelperText = canCheckServer
    ? 'Перевірка необовʼязкова. Можеш продовжити без неї.'
    : 'Щоб запустити перевірку, вкажи адресу серверу у полі вище.'
  const buildVersionRange = (minVer: string, maxVer: string): string => {
    const normalizedMin = String(minVer || '').trim()
    const normalizedMax = String(maxVer || '').trim()
    if (!normalizedMin && !normalizedMax) return VERS[0]
    if (!normalizedMin) return normalizedMax
    if (!normalizedMax) return normalizedMin
    if (normalizedMin === normalizedMax) return normalizedMin
    return `${normalizedMin}-${normalizedMax}`
  }
  const setField = <Key extends keyof ServerForm>(key: Key, value: ServerForm[Key]) => setForm((current) => ({ ...current, [key]: value }))
  const toggleTag = (tag: string) => setForm((current) => ({ ...current, tags: current.tags.includes(tag) ? current.tags.filter((item) => item !== tag) : [...current.tags, tag] }))
  const upsertArrayUrl = (key: 'gallery' | 'videos', index: number, value: string) => setForm((current) => {
    const nextArray = [...current[key]]
    nextArray[index] = value
    return { ...current, [key]: nextArray.filter((item) => item.trim()) }
  })
  const appendArrayUrl = (key: 'gallery' | 'videos') => setForm((current) => ({ ...current, [key]: [...current[key], ''] }))
  const removeArrayUrl = (key: 'gallery' | 'videos', index: number) => setForm((current) => ({ ...current, [key]: current[key].filter((_, idx) => idx !== index) }))
  const handleUploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const imageUrl = await readFileAsDataUrl(file)
    setField('avatarUrl', imageUrl)
    event.target.value = ''
  }
  const handleUploadBanner = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const imageUrl = await readFileAsDataUrl(file)
    setField('bannerUrl', imageUrl)
    event.target.value = ''
  }
  const handleUploadGallery = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    const remainingSlots = MAX_GALLERY_IMAGES - form.gallery.length
    const filesToRead = files.slice(0, remainingSlots)
    const dataUrls = await Promise.all(filesToRead.map(async (file) => await readFileAsDataUrl(file)))
    setField('gallery', [...form.gallery, ...dataUrls].slice(0, MAX_GALLERY_IMAGES))
    event.target.value = ''
  }

  const handleCheck = async () => {
    setError(null)
    setSuccessMessage(null)
    setChecking(true)
    const response = await fetch('/api/servers/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addr: form.addr, core: form.core, platform: form.platform }),
    })
    const data = await response.json()
    setChecking(false)
    if (!response.ok) {
      setChecked(false)
      setError(data.error || 'Не вдалося перевірити адресу серверу')
      return
    }
    const probe = data.probe as {
      version?: string
      name?: string
      motd?: string
      country?: string
      iconUrl?: string | null
    }
    setForm((current) => ({
      ...current,
      name: current.name || String(probe.name || ''),
      minVer: current.platform === 'discord' ? 'Discord' : (current.minVer || String(probe.version || '')),
      maxVer: current.platform === 'discord' ? 'Discord' : (current.maxVer || String(probe.version || '')),
      ver: current.platform === 'discord' ? 'Discord' : (current.ver || String(probe.version || '')),
      motd: current.motd || String(probe.motd || '').slice(0, 160),
      shortDesc: current.shortDesc || String(probe.motd || '').slice(0, 160),
      country: current.country || String(probe.country || ''),
      avatarUrl: current.avatarUrl || String(probe.iconUrl || ''),
    }))
    setChecked(true)
    setSuccessMessage(
      form.platform === 'discord'
        ? 'Discord-сервер знайдено, дані підтягнуто автоматично'
        : 'Сервер перевірено, метадані визначені автоматично'
    )
  }

  const submitServer = async () => {
    setError(null)
    setSuccessMessage(null)
    const payload = {
      ...form,
      ver: isDiscordForm ? 'Discord' : buildVersionRange(form.minVer, form.maxVer),
      core: isDiscordForm ? 'discord' : form.core,
      projectId: form.projectId,
    }
    const url = isEditMode ? `/api/servers/${initialServer?.seed}` : '/api/servers'
    const method = isEditMode ? 'PATCH' : 'POST'
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await response.json() as { pending?: boolean; server?: { seed: number }; error?: string }
    if (!response.ok) {
      setError(data.error || 'Не вдалося зберегти сервер')
      return
    }
    if (!isEditMode && data.pending) {
      setSubmitted(true)
      return
    }
    startTransition(() => {
      router.push(`/servers/${data.server?.seed}`)
      router.refresh()
    })
  }

  const goNext = (next: Step) => { setStep(next); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const goBack = (prev: Step) => { setStep(prev); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const goToStep = (target: Step) => { setStep(target); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  if (submitted) {
    return (
      <PageShell active={activeSection || 'servers'} initialUser={initialUser} sidebarRole={sidebarRole}>
        <div className="page-main">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 24, textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 32,
              background: 'color-mix(in oklab, var(--green) 15%, transparent)',
              border: '1px solid color-mix(in oklab, var(--green) 30%, transparent)',
            }}>
              ✓
            </div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Заявку відправлено!</h2>
              <p style={{ color: 'var(--fg-2)', fontSize: 14, maxWidth: 420, lineHeight: 1.6 }}>
                Ваш сервер <b style={{ color: 'var(--fg-1)' }}>{form.name}</b> відправлено на розгляд адміністратором.
                Ви отримаєте сповіщення після схвалення або відхилення заявки.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => router.push('/dashboard')}>На дашборд</button>
              <button className="btn btn-secondary" onClick={() => router.push('/servers')}>Каталог серверів</button>
            </div>
          </div>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell active={activeSection || 'servers'} initialUser={initialUser} sidebarRole={sidebarRole}>
      <div className="page-main">
        <div className="page-topbar">
          <div>
            <div className="page-crumb">простір / сервери / {isEditMode ? 'редагування' : 'додавання'}</div>
            <h1 className="page-title">{isEditMode ? 'Редагування серверу' : 'Додавання нового серверу'}</h1>
          </div>
        </div>

        <div className="add-shell">
          <div className="add-steps-card">
            <div className="add-steps">
              {([1, 2, 3, 4, 5, 6, 7] as Step[]).map((currentStep, index) => (
                <div key={currentStep} className="add-step-wrap">
                  <StepIndicator step={currentStep} current={step} label={STEP_LABELS[currentStep]} onSelectStep={goToStep} />
                  {index < 6 && <div className={`add-step-line${step > currentStep ? ' done' : ''}`} />}
                </div>
              ))}
            </div>
          </div>

          <div className="add-body">
            <aside className="add-preview">
              <div className="add-preview-title">Попередній перегляд</div>
              <div className="server-card" style={{ pointerEvents: 'none' }}>
                <div className="sc-banner" style={{ backgroundImage: form.bannerUrl ? `url(${form.bannerUrl})` : 'linear-gradient(135deg, #0c0e13, #1a1f2e)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                  <div className="sc-banner-decor" />
                </div>
                <div className="sc-body">
                  <div className="sc-top">
                    <div className="sc-icon" style={{ backgroundImage: form.avatarUrl ? `url(${form.avatarUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                      {form.avatarUrl ? '' : form.name ? form.name.slice(0, 2).toUpperCase() : '??'}
                    </div>
                    <div className="sc-info">
                      <div className="sc-name">{form.name || 'Назва серверу'}</div>
                      <div className="sc-mode">
                        {isDiscordForm ? `${form.mode} · Discord` : `${form.mode} · ${CORE_LABELS[form.core]}`}
                      </div>
                    </div>
                    <div className="sc-rank">#{isEditMode ? 'ред.' : 'нов.'}</div>
                  </div>
                  <p className="sc-desc">{form.shortDesc || form.desc || 'Тут буде короткий опис вашого серверу.'}</p>
                  <div className="sc-footer">
                    <span className="sc-ip-text">{form.addr || 'play.example.com'}</span>
                    <span className="sc-ver">{buildVersionRange(form.minVer, form.maxVer)}</span>
                  </div>
                </div>
              </div>
              <div className="add-preview-meta">
                <div className="add-preview-meta-row">
                  <span>Теги</span>
                  <b>{form.tags.length}/{MAX_TAGS}</b>
                </div>
                <div className="add-preview-meta-row">
                  <span>Галерея</span>
                  <b>{form.gallery.length}/{MAX_GALLERY_IMAGES}</b>
                </div>
                <div className="add-preview-meta-row">
                  <span>Відео</span>
                  <b>{form.videos.length}/{MAX_VIDEO_LINKS}</b>
                </div>
              </div>
            </aside>

            <div className="add-form">
              <div className="add-form-head">
                <div className="add-form-head-step">Крок {step} з 7</div>
                <h3 className="add-form-head-title">{STEP_LABELS[step]}</h3>
                <p className="add-form-head-hint">{STEP_HINTS[step]}</p>
                {isCheckSkipped && <span className="tag tag-old">Перевірку пропущено</span>}
              </div>

              {error && <div className="auth-feedback auth-feedback-error" style={{ marginBottom: 16 }}>{error}</div>}
              {successMessage && <div className="auth-feedback auth-feedback-success" style={{ marginBottom: 16 }}>{successMessage}</div>}

              {step === 1 && (
                <div className="add-form-section">
                  <div className="auth-field">
                    <span>Платформа *</span>
                    <div className="filter-bar-chips" style={{ marginTop: 8 }}>
                      {PLATFORM_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`filter-chip${form.platform === option.value ? ' active' : ''}`}
                          onClick={() => {
                            setForm((current) => ({
                              ...current,
                              platform: option.value,
                              mode: option.value === 'discord' ? DISCORD_MODES[0] : MODES[0],
                              minVer: option.value === 'discord' ? 'Discord' : VERS[0],
                              maxVer: option.value === 'discord' ? 'Discord' : VERS[0],
                              ver: option.value === 'discord' ? 'Discord' : VERS[0],
                              core: option.value === 'discord' ? 'discord' : 'java',
                            }))
                            setChecked(false)
                            setSuccessMessage(null)
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="add-grid-2">
                    <label className="auth-field">
                      <span>{isDiscordForm ? 'Посилання на Discord *' : 'Адреса серверу *'}</span>
                      <input
                        type="text"
                        placeholder={isDiscordForm ? 'https://discord.gg/your-server' : 'play.yourserver.com:25565'}
                        value={form.addr}
                        onChange={(event) => { setField('addr', event.target.value); setChecked(false); setSuccessMessage(null) }}
                      />
                    </label>
                    {!isDiscordForm && (
                      <div className="auth-field">
                        <span>Тип ядра *</span>
                        <Select
                          value={form.core}
                          onChange={(value) => setField('core', value as CoreType)}
                          options={CORE_OPTIONS.map((core) => ({ value: core, label: CORE_LABELS[core] }))}
                        />
                      </div>
                    )}
                  </div>
                  {!isEditMode && (
                    <div className="add-check-zone">
                      <div className="add-check-zone-text">
                        <b>{isDiscordForm ? 'Перевірка Discord' : 'Перевірка серверу'}</b>
                        <span>
                          {isDiscordForm
                            ? 'Ми отримаємо назву, опис, іконку та кількість учасників через публічний API Discord. Цей крок не обовʼязковий.'
                            : 'Ми спробуємо підключитися та автоматично визначити версію, MOTD та країну. Цей крок не обовʼязковий.'}
                        </span>
                        <span>{checkHelperText}</span>
                      </div>
                      <button className="btn btn-secondary" onClick={() => void handleCheck()} disabled={!canCheckServer || checking}>
                        {checking ? 'Перевірка...' : checked ? '✓ Перевірено' : <>{Icons.pulse} {isDiscordForm ? 'Перевірити Discord' : 'Перевірити сервер'}</>}
                      </button>
                    </div>
                  )}
                  <div className="add-actions">
                    <span />
                    <button className="btn btn-primary" onClick={() => goNext(2)}>Далі →</button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="add-form-section">
                  <label className="auth-field">
                    <span>Назва серверу *</span>
                    <input type="text" placeholder="Напр. SkyMine Reborn" value={form.name} onChange={(event) => setField('name', event.target.value)} />
                  </label>
                  <div className="add-grid-2">
                    <div className="auth-field">
                      <span>{isDiscordForm ? 'Категорія' : 'Режим гри'}</span>
                      <Select
                        value={form.mode}
                        onChange={(value) => setField('mode', value)}
                        options={isDiscordForm ? DISCORD_MODES : MODES}
                      />
                    </div>
                    <label className="auth-field">
                      <span>Країна</span>
                      <input type="text" placeholder="Україна" value={form.country} onChange={(event) => setField('country', event.target.value)} />
                    </label>
                  </div>
                  {projects.length > 0 && (
                    <div className="auth-field">
                      <span>Проект <span style={{ color: 'var(--fg-3)', fontWeight: 400 }}>(необов&apos;язково)</span></span>
                      <select
                        className="input"
                        value={form.projectId ?? ''}
                        onChange={(event) => setField('projectId', event.target.value ? Number(event.target.value) : null)}
                        style={{ height: 42 }}
                      >
                        <option value="">— Без проекту —</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                      </select>
                      <small style={{ color: 'var(--fg-3)', fontSize: 12 }}>
                        Згрупуйте кілька серверів в один проект (мережу).{' '}
                        <a href="/dashboard/projects" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Керувати проектами →</a>
                      </small>
                    </div>
                  )}
                  {!isDiscordForm && (
                    <div className="add-grid-3">
                      <div className="auth-field">
                        <span>Мін. версія</span>
                        <Select value={form.minVer} onChange={(value) => setField('minVer', value)} options={VERS} />
                      </div>
                      <div className="auth-field">
                        <span>Макс. версія</span>
                        <Select value={form.maxVer} onChange={(value) => setField('maxVer', value)} options={VERS} />
                      </div>
                      <label className="auth-field">
                        <span>Підсумкова версія</span>
                        <input type="text" value={buildVersionRange(form.minVer, form.maxVer)} readOnly />
                      </label>
                    </div>
                  )}
                  <label className="auth-field">
                    <span>{isDiscordForm ? 'Короткий опис *' : 'MOTD (короткий опис) *'}</span>
                    <textarea
                      rows={3}
                      maxLength={160}
                      placeholder={isDiscordForm ? 'Спільнота для українських геймерів...' : 'Привіт! Заходь до нас і отримай VIP на 7 днів...'}
                      value={form.motd}
                      onChange={(event) => { setField('motd', event.target.value); setField('shortDesc', event.target.value) }}
                    />
                    <small className="add-field-counter">{form.motd.length}/160</small>
                  </label>
                  <div className="add-actions">
                    <button className="btn btn-secondary" onClick={() => goBack(1)}>← Назад</button>
                    <button className="btn btn-primary" disabled={!form.name || !form.motd} onClick={() => goNext(3)}>Далі →</button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="add-form-section">
                  <label className="auth-field">
                    <span>Повний опис серверу *</span>
                    <textarea rows={12} placeholder="Розкажи про особливості серверу, що чекає на гравців, які режими доступні, події, плагіни тощо..." value={form.fullDesc} onChange={(event) => setField('fullDesc', event.target.value)} />
                    <small className="add-field-counter">{form.fullDesc.length} символів</small>
                  </label>
                  <div className="add-actions">
                    <button className="btn btn-secondary" onClick={() => goBack(2)}>← Назад</button>
                    <button className="btn btn-primary" disabled={!form.fullDesc} onClick={() => goNext(4)}>Далі →</button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="add-form-section">
                  <div className="add-grid-2">
                    <label className="auth-field">
                      <span>Лаунчер</span>
                      <input type="url" placeholder="https://launcher.example.com" value={form.launcherUrl} onChange={(event) => setField('launcherUrl', event.target.value)} />
                    </label>
                    <label className="auth-field">
                      <span>Веб-сайт</span>
                      <input type="url" placeholder="https://yourserver.com" value={form.website} onChange={(event) => setField('website', event.target.value)} />
                    </label>
                    <label className="auth-field">
                      <span>Discord</span>
                      <input type="url" placeholder="https://discord.gg/..." value={form.discord} onChange={(event) => setField('discord', event.target.value)} />
                    </label>
                    <label className="auth-field">
                      <span>Telegram</span>
                      <input type="url" placeholder="https://t.me/..." value={form.telegram} onChange={(event) => setField('telegram', event.target.value)} />
                    </label>
                    <label className="auth-field">
                      <span>Сайт донату</span>
                      <input type="url" placeholder="https://donate.yourserver.com" value={form.donate} onChange={(event) => setField('donate', event.target.value)} />
                    </label>
                    <label className="auth-field">
                      <span>TikTok</span>
                      <input type="url" placeholder="https://tiktok.com/@..." value={form.tiktok} onChange={(event) => setField('tiktok', event.target.value)} />
                    </label>
                  </div>
                  <div className="add-actions">
                    <button className="btn btn-secondary" onClick={() => goBack(3)}>← Назад</button>
                    <button className="btn btn-primary" onClick={() => goNext(5)}>Далі →</button>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="add-form-section">
                  <input ref={avatarInputRef} type="file" accept="image/*" onChange={(event) => void handleUploadAvatar(event)} style={{ display: 'none' }} />
                  <input ref={bannerInputRef} type="file" accept="image/*" onChange={(event) => void handleUploadBanner(event)} style={{ display: 'none' }} />
                  <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={(event) => void handleUploadGallery(event)} style={{ display: 'none' }} />

                  <div className="add-media-grid">
                    <button type="button" className="add-upload-card" onClick={() => avatarInputRef.current?.click()}>
                      <div className="add-upload-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
                      </div>
                      <div className="add-upload-text">
                        <b>Аватар</b>
                        <span>Квадратне зображення серверу</span>
                      </div>
                    </button>
                    <button type="button" className="add-upload-card" onClick={() => bannerInputRef.current?.click()}>
                      <div className="add-upload-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="8" cy="11" r="1.5"/><path d="m21 16-5-5-7 7"/></svg>
                      </div>
                      <div className="add-upload-text">
                        <b>Банер</b>
                        <span>Широке зображення (16:9)</span>
                      </div>
                    </button>
                    <button type="button" className="add-upload-card" onClick={() => galleryInputRef.current?.click()} disabled={form.gallery.length >= MAX_GALLERY_IMAGES}>
                      <div className="add-upload-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.5-3.5L10 19"/></svg>
                      </div>
                      <div className="add-upload-text">
                        <b>Галерея</b>
                        <span>До {MAX_GALLERY_IMAGES} скріншотів</span>
                      </div>
                    </button>
                  </div>

                  <div className="add-grid-2">
                    <label className="auth-field">
                      <span>URL аватара (опційно)</span>
                      <input type="url" value={form.avatarUrl} onChange={(event) => setField('avatarUrl', event.target.value)} />
                    </label>
                    <label className="auth-field">
                      <span>URL банера (опційно)</span>
                      <input type="url" value={form.bannerUrl} onChange={(event) => setField('bannerUrl', event.target.value)} />
                    </label>
                  </div>

                  <div className="add-list-section">
                    <div className="add-list-head">
                      <b>Скріншоти серверу</b>
                      <span>{form.gallery.length}/{MAX_GALLERY_IMAGES}</span>
                    </div>
                    {form.gallery.length === 0 && <p className="add-list-empty">Додай скріншоти, натиснувши «Галерея» вище, або встав посилання нижче</p>}
                    {form.gallery.map((url, index) => (
                      <div key={`${url}-${index}`} className="add-list-row">
                        <input className="input" value={url} onChange={(event) => upsertArrayUrl('gallery', index, event.target.value)} placeholder="https://... або завантажене зображення" />
                        <button className="btn btn-secondary" onClick={() => removeArrayUrl('gallery', index)}>Видалити</button>
                      </div>
                    ))}
                  </div>

                  <div className="add-list-section">
                    <div className="add-list-head">
                      <b>Відео-посилання</b>
                      <span>{form.videos.length}/{MAX_VIDEO_LINKS}</span>
                    </div>
                    {form.videos.length === 0 && <p className="add-list-empty">Відео з YouTube або іншої платформи про твій сервер</p>}
                    {form.videos.map((url, index) => (
                      <div key={`${url}-${index}`} className="add-list-row">
                        <input className="input" value={url} onChange={(event) => upsertArrayUrl('videos', index, event.target.value)} placeholder="https://youtube.com/..." />
                        <button className="btn btn-secondary" onClick={() => removeArrayUrl('videos', index)}>Видалити</button>
                      </div>
                    ))}
                    <button className="btn btn-secondary" disabled={form.videos.length >= MAX_VIDEO_LINKS} onClick={() => appendArrayUrl('videos')}>+ Додати відео</button>
                  </div>

                  <div className="add-actions">
                    <button className="btn btn-secondary" onClick={() => goBack(4)}>← Назад</button>
                    <button className="btn btn-primary" onClick={() => goNext(6)}>Далі →</button>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="add-form-section">
                  <div className="add-list-head">
                    <b>Обери теги</b>
                    <span>{form.tags.length}/{MAX_TAGS}</span>
                  </div>
                  <div className="add-tags-grid">
                    {TAG_OPTIONS.map((tag) => (
                      <button
                        key={tag}
                        className={`filter-chip${form.tags.includes(tag) ? ' active' : ''}`}
                        onClick={() => toggleTag(tag)}
                        disabled={!form.tags.includes(tag) && form.tags.length >= MAX_TAGS}
                      >
                        {form.tags.includes(tag) ? '✓ ' : ''}{tag}
                      </button>
                    ))}
                  </div>
                  <div className="add-actions">
                    <button className="btn btn-secondary" onClick={() => goBack(5)}>← Назад</button>
                    <button className="btn btn-primary" onClick={() => goNext(7)}>Далі →</button>
                  </div>
                </div>
              )}

              {step === 7 && (
                <div className="add-form-section">
                  <div className="add-summary">
                    <div className="add-summary-row"><span>Адреса</span><b>{form.addr || '—'}</b></div>
                    <div className="add-summary-row"><span>Назва</span><b>{form.name || '—'}</b></div>
                    <div className="add-summary-row"><span>Ядро</span><b>{CORE_LABELS[form.core]}</b></div>
                    <div className="add-summary-row"><span>Версія</span><b>{buildVersionRange(form.minVer, form.maxVer)}</b></div>
                    <div className="add-summary-row"><span>Країна</span><b>{form.country || '—'}</b></div>
                    <div className="add-summary-row"><span>MOTD</span><b>{form.motd || '—'}</b></div>
                    {form.projectId && <div className="add-summary-row"><span>Проект</span><b>{projects.find((p) => p.id === form.projectId)?.name || '—'}</b></div>}
                    <div className="add-summary-row"><span>Відео</span><b>{form.videos.length}</b></div>
                    <div className="add-summary-row"><span>Галерея</span><b>{form.gallery.length}</b></div>
                    {form.tags.length > 0 && <div className="add-summary-row"><span>Теги</span><b>{form.tags.join(', ')}</b></div>}
                  </div>
                  <div className="add-actions">
                    <button className="btn btn-secondary" onClick={() => goBack(6)}>← Назад</button>
                    <button className="btn btn-primary" onClick={() => void submitServer()} disabled={isPending}>
                      {Icons.plus} {isPending ? (isEditMode ? 'Збереження...' : 'Відправка...') : isEditMode ? 'Зберегти зміни' : 'Подати заявку'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
