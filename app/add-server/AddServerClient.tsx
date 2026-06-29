'use client'
import { useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { ServerDashboardHub, type ServerDashboardHubOwnedServer } from '@/components/dashboard/ServerDashboardHub'
import { Icons } from '@/components/ui/Icons'
import { Select } from '@/components/ui/Select'
import { Toggle } from '@/components/ui/Toggle'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { ImageCropModal, type ImageCropAspectRatio } from '@/components/ui/ImageCropModal'
import { buildBannerSurfaceStyle } from '@/lib/banner-display'
import { DISCORD_CATEGORIES, GAME_MODES } from '@/lib/data'
import { mergeMinecraftVersionOptions, MINECRAFT_JAVA_VERSIONS } from '@/lib/minecraft-java-versions'
import {
  MAX_CUSTOM_MODE_LENGTH,
  MAX_CUSTOM_TAG_LENGTH,
  MAX_SERVER_TAGS,
  normalizeCustomMode,
  normalizeCustomTag,
} from '@/lib/server-form-options'
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
const MINECRAFT_TAG_OPTIONS = ['Survival', 'Economy', 'PvP', 'PvE', 'RP', 'SkyBlock', 'Events', 'No P2W', 'Custom mobs', 'WorldEdit', 'Plots', 'Factions', 'Mini-games', 'Quests', 'Raids', 'One-life']
const DISCORD_TAG_OPTIONS = ['Gaming', 'Minecraft', 'Community', 'News', 'Giveaways', 'Voice chat', 'Events', 'Support', 'Marketplace', 'Moderation', 'Memes', 'Ukrainian', 'Looking for team', 'Dev talk', 'Roleplay', 'Content creators']
const MODES = GAME_MODES.filter((mode) => mode !== 'Всі')
const DISCORD_MODES = DISCORD_CATEGORIES.filter((category) => category !== 'Всі')
const DEFAULT_JAVA_VERSION = MINECRAFT_JAVA_VERSIONS[0] || '1.21.11'
const PLATFORM_OPTIONS: { value: ServerPlatform; label: string }[] = [
  { value: 'minecraft', label: 'Minecraft' },
  { value: 'discord', label: 'Discord' },
]
const CORE_OPTIONS: CoreType[] = ['java', 'bedrock', 'java_bedrock']
const MAX_GALLERY_IMAGES = 6
const MAX_VIDEO_LINKS = 2
const MAX_TAGS = MAX_SERVER_TAGS

function buildInitialCustomModes(server: Server | undefined, baseModes: readonly string[]): string[] {
  if (!server?.mode) return []
  return baseModes.includes(server.mode) ? [] : [server.mode]
}

const getDefaultForm = (server?: Server): ServerForm => ({
  platform: server?.platform === 'discord' || server?.core === 'discord' ? 'discord' : 'minecraft',
  name: server?.name || '',
  addr: server?.addr || '',
  mode: server?.mode || (server?.platform === 'discord' ? DISCORD_MODES[0] : MODES[0]),
  minVer: (server?.ver || '').includes('-') ? String(server?.ver || '').split('-')[0] : (server?.ver || DEFAULT_JAVA_VERSION),
  maxVer: (server?.ver || '').includes('-') ? String(server?.ver || '').split('-')[1] : (server?.ver || DEFAULT_JAVA_VERSION),
  ver: server?.ver || DEFAULT_JAVA_VERSION,
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
  lockPlatform?: boolean
  dashboardSlug?: string
  ownedServers?: ServerDashboardHubOwnedServer[]
}) {
  const { initialServer, initialUser, sidebarRole, activeSection, defaultPlatform, lockPlatform = false, dashboardSlug, ownedServers } = input
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
  const [newProjectName, setNewProjectName] = useState('')
  const [creatingProject, setCreatingProject] = useState(false)
  const [isPending, startTransition] = useTransition()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const [cropState, setCropState] = useState<{ src: string; target: ImageCropAspectRatio } | null>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const [submitted, setSubmitted] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [customTagInput, setCustomTagInput] = useState('')
  const [customTagError, setCustomTagError] = useState<string | null>(null)
  const [customModeInput, setCustomModeInput] = useState('')
  const [customMinecraftModes, setCustomMinecraftModes] = useState<string[]>(() => (
    initialServer && initialServer.platform !== 'discord' && initialServer.core !== 'discord'
      ? buildInitialCustomModes(initialServer, MODES)
      : []
  ))
  const [customDiscordModes, setCustomDiscordModes] = useState<string[]>(() => (
    initialServer && (initialServer.platform === 'discord' || initialServer.core === 'discord')
      ? buildInitialCustomModes(initialServer, DISCORD_MODES)
      : []
  ))
  const isEditMode = Boolean(initialServer)
  const isDiscordForm = form.platform === 'discord'
  const tagOptions = isDiscordForm ? DISCORD_TAG_OPTIONS : MINECRAFT_TAG_OPTIONS
  const visibleTagOptions = Array.from(new Set([...tagOptions, ...form.tags])).filter(Boolean)
  const modeOptions = Array.from(new Set([
    ...(isDiscordForm ? DISCORD_MODES : MODES),
    ...(isDiscordForm ? customDiscordModes : customMinecraftModes),
    form.mode,
  ])).filter(Boolean)
  const versionOptions = useMemo(() => mergeMinecraftVersionOptions([
    form.minVer,
    form.maxVer,
    ...String(form.ver || '').split('-'),
  ]), [form.minVer, form.maxVer, form.ver])

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
    if (!normalizedMin && !normalizedMax) return DEFAULT_JAVA_VERSION
    if (!normalizedMin) return normalizedMax
    if (!normalizedMax) return normalizedMin
    if (normalizedMin === normalizedMax) return normalizedMin
    return `${normalizedMin}-${normalizedMax}`
  }
  const setField = <Key extends keyof ServerForm>(key: Key, value: ServerForm[Key]) => setForm((current) => ({ ...current, [key]: value }))
  const toggleTag = (tag: string) => {
    const normalized = normalizeCustomTag(tag)
    if (!normalized) return
    setCustomTagError(null)
    setForm((current) => {
      if (current.tags.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
        return { ...current, tags: current.tags.filter((item) => item.toLowerCase() !== normalized.toLowerCase()) }
      }
      if (current.tags.length >= MAX_TAGS) return current
      return { ...current, tags: [...current.tags, normalized] }
    })
  }
  const clearTags = () => {
    setCustomTagError(null)
    setField('tags', [])
  }
  const handleAddCustomTag = () => {
    const normalized = normalizeCustomTag(customTagInput)
    if (!normalized) {
      setCustomTagError('Введіть назву тегу')
      return
    }
    if (form.tags.length >= MAX_TAGS) {
      setCustomTagError(`Максимум ${MAX_TAGS} тегів`)
      return
    }
    if (form.tags.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
      setCustomTagError('Такий тег вже додано')
      return
    }
    setForm((current) => ({ ...current, tags: [...current.tags, normalized] }))
    setCustomTagInput('')
    setCustomTagError(null)
  }
  const handleAddCustomMode = () => {
    const normalized = normalizeCustomMode(customModeInput)
    if (!normalized) return
    if (isDiscordForm) {
      setCustomDiscordModes((current) => (current.includes(normalized) ? current : [...current, normalized]))
    } else {
      setCustomMinecraftModes((current) => (current.includes(normalized) ? current : [...current, normalized]))
    }
    setField('mode', normalized)
    setCustomModeInput('')
  }
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
    setCropState({ src: imageUrl, target: 'square' })
    event.target.value = ''
  }
  const handleUploadBanner = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const imageUrl = await readFileAsDataUrl(file)
    setCropState({ src: imageUrl, target: 'banner' })
    event.target.value = ''
  }
  const handleCropConfirm = (croppedDataUrl: string) => {
    if (cropState?.target === 'banner') {
      setField('bannerUrl', croppedDataUrl)
    } else {
      setField('avatarUrl', croppedDataUrl)
    }
    setCropState(null)
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
  const currentStepLabel = isDiscordForm && step === 2 ? 'Спільнота' : STEP_LABELS[step]
  const currentStepHint = isDiscordForm && step === 2
    ? 'Назва, категорія, мова, проєкт і короткий опис Discord-спільноти'
    : STEP_HINTS[step]
  const handleCreateProject = async () => {
    const name = newProjectName.trim()
    if (!name) return
    setCreatingProject(true)
    setError(null)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: `Проєкт для ${isDiscordForm ? 'Discord-спільнот' : 'серверів'} ${name}`,
        }),
      })
      const data = (await response.json()) as { project?: Project; error?: string }
      if (!response.ok || !data.project) {
        setError(data.error || 'Не вдалося створити проєкт')
        return
      }
      setProjects((current) => [data.project!, ...current])
      setField('projectId', data.project.id)
      setNewProjectName('')
      setSuccessMessage(`Проєкт «${data.project.name}» створено і вибрано`)
    } finally {
      setCreatingProject(false)
    }
  }

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
                Після схвалення відкрийте Dashboard → Мої сервери → «Верифікувати» (MOTD або DNS TXT), щоб підтвердити власність і отримати API.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => router.push('/dashboard?tab=servers')}>Мої сервери</button>
              <button className="btn btn-secondary" onClick={() => router.push('/service/how-to-add-server')}>Інструкція з верифікації</button>
            </div>
          </div>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell active={activeSection || 'servers'} initialUser={initialUser} sidebarRole={sidebarRole}>
      <div className="page-main">
        {isEditMode && initialServer && dashboardSlug ? (
          <ServerDashboardHub
            activeTab="edit"
            dashboardSlug={dashboardSlug}
            ownedServers={ownedServers}
            server={{
              seed: initialServer.seed,
              name: initialServer.name,
              addr: initialServer.addr,
              avatarUrl: initialServer.avatarUrl,
              verified: Boolean(initialServer.verified),
            }}
            subtitle="Оновіть опис, медіа, теги та посилання сервера."
          />
        ) : (
          <div className="page-topbar">
            <div>
              <Breadcrumbs items={[
                { label: 'Простір', href: '/' },
                { label: 'Сервери', href: isDiscordForm ? '/servers/discord' : '/servers/minecraft' },
                { label: isEditMode ? 'Редагування' : 'Додавання' },
              ]} />
              <h1 className="page-title">{isEditMode ? 'Редагування серверу' : 'Додавання нового серверу'}</h1>
            </div>
          </div>
        )}

        <div className="add-shell">
          <div className="add-steps-card">
            <div className="add-steps">
              {([1, 2, 3, 4, 5, 6, 7] as Step[]).map((currentStep, index) => (
                <div key={currentStep} className="add-step-wrap">
                  <StepIndicator
                    step={currentStep}
                    current={step}
                    label={isDiscordForm && currentStep === 2 ? 'Спільнота' : STEP_LABELS[currentStep]}
                    onSelectStep={goToStep}
                  />
                  {index < 6 && <div className={`add-step-line${step > currentStep ? ' done' : ''}`} />}
                </div>
              ))}
            </div>
          </div>

          <div className="add-body">
            <aside className="add-preview">
              <div className="add-preview-title">Попередній перегляд</div>
              <div className="server-card" style={{ pointerEvents: 'none' }}>
                <div className="sc-banner banner-surface" style={buildBannerSurfaceStyle(form.bannerUrl) || { backgroundImage: 'linear-gradient(135deg, #0c0e13, #1a1f2e)' }}>
                  <div className="sc-banner-decor" />
                </div>
                <div className="sc-body">
                  <div className="sc-top">
                    <div className="sc-icon" style={{ backgroundImage: form.avatarUrl ? `url(${form.avatarUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                      {form.avatarUrl ? '' : form.name ? form.name.slice(0, 2).toUpperCase() : '??'}
                    </div>
                    <div className="sc-info">
                      <div className="sc-name">{form.name || (isDiscordForm ? 'Назва спільноти' : 'Назва серверу')}</div>
                      <div className="sc-mode">
                        {isDiscordForm ? `${form.mode} · Discord` : `${form.mode} · ${CORE_LABELS[form.core]}`}
                      </div>
                    </div>
                    <div className="sc-rank">#{isEditMode ? 'ред.' : 'нов.'}</div>
                  </div>
                  <p className="sc-desc">{form.shortDesc || form.desc || (isDiscordForm ? 'Тут буде короткий опис вашої Discord-спільноти.' : 'Тут буде короткий опис вашого серверу.')}</p>
                  <div className="sc-footer">
                    <span className="sc-ip-text">{form.addr || (isDiscordForm ? 'discord.gg/example' : 'play.example.com')}</span>
                    <span className="sc-ver">{isDiscordForm ? 'Discord' : buildVersionRange(form.minVer, form.maxVer)}</span>
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
              {isEditMode && (
                <div className="add-quick-edit">
                  <div>
                    <b>Швидке редагування</b>
                    <span>Перейди одразу до потрібного блоку без проходження всіх кроків.</span>
                  </div>
                  <div className="add-quick-edit-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => goToStep(5)}>Банер / лого</button>
                    <button type="button" className="btn btn-secondary" onClick={() => goToStep(3)}>Опис</button>
                    <button type="button" className="btn btn-secondary" onClick={() => goToStep(6)}>Теги</button>
                    <button type="button" className="btn btn-primary" onClick={() => void submitServer()} disabled={isPending}>
                      {isPending ? 'Збереження...' : 'Зберегти'}
                    </button>
                  </div>
                </div>
              )}
              <div className="add-form-head">
                <div className="add-form-head-step">Крок {step} з 7</div>
                <h3 className="add-form-head-title">{currentStepLabel}</h3>
                <p className="add-form-head-hint">{currentStepHint}</p>
                {isCheckSkipped && <span className="tag tag-old">Перевірку пропущено</span>}
              </div>

              {error && <div className="auth-feedback auth-feedback-error" style={{ marginBottom: 16 }}>{error}</div>}
              {successMessage && <div className="auth-feedback auth-feedback-success" style={{ marginBottom: 16 }}>{successMessage}</div>}

              {step === 1 && (
                <div className="add-form-section">
                  {lockPlatform ? (
                    <div className="auth-field">
                      <span>Платформа</span>
                      <div className="set-card" style={{ marginTop: 8, padding: 14 }}>
                        <b>{isDiscordForm ? 'Discord-сервер' : 'Minecraft-сервер'}</b>
                        <div style={{ color: 'var(--fg-3)', fontSize: 12, marginTop: 4 }}>
                          Тип зафіксовано для цього сценарію додавання.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="auth-field">
                      <span>Платформа *</span>
                      <div className="filter-bar-chips" style={{ marginTop: 8 }}>
                        {PLATFORM_OPTIONS.map((option) => (
                          <Toggle
                            key={option.value}
                            type="button"
                            variant="outline"
                            size="lg"
                            className="filter-chip"
                            pressed={form.platform === option.value}
                            onPressedChange={() => {
                              setForm((current) => ({
                                ...current,
                                platform: option.value,
                                mode: option.value === 'discord' ? DISCORD_MODES[0] : MODES[0],
                                minVer: option.value === 'discord' ? 'Discord' : DEFAULT_JAVA_VERSION,
                                maxVer: option.value === 'discord' ? 'Discord' : DEFAULT_JAVA_VERSION,
                                ver: option.value === 'discord' ? 'Discord' : DEFAULT_JAVA_VERSION,
                                core: option.value === 'discord' ? 'discord' : 'java',
                                tags: [],
                              }))
                              setChecked(false)
                              setSuccessMessage(null)
                            }}
                          >
                            {option.label}
                          </Toggle>
                        ))}
                      </div>
                    </div>
                  )}
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
                    <span>{isDiscordForm ? 'Назва Discord-спільноти *' : 'Назва серверу *'}</span>
                    <input type="text" placeholder={isDiscordForm ? 'Напр. Eyzencore Community' : 'Напр. SkyMine Reborn'} value={form.name} onChange={(event) => setField('name', event.target.value)} />
                  </label>
                  <div className="add-grid-2">
                    <div className="auth-field">
                      <span>{isDiscordForm ? 'Категорія' : 'Режим гри'}</span>
                      <Select
                        value={form.mode}
                        onChange={(value) => setField('mode', value)}
                        options={modeOptions}
                      />
                      <div className="add-inline-create">
                        <input
                          className="input"
                          type="text"
                          maxLength={MAX_CUSTOM_MODE_LENGTH}
                          placeholder={isDiscordForm ? 'Своя категорія' : 'Свій режим'}
                          value={customModeInput}
                          onChange={(event) => setCustomModeInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              handleAddCustomMode()
                            }
                          }}
                          aria-label={isDiscordForm ? 'Додати свою категорію Discord' : 'Додати свій режим гри'}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleAddCustomMode}
                          disabled={!customModeInput.trim()}
                        >
                          + Додати
                        </button>
                      </div>
                      <small className="add-field-counter">Свій варіант до {MAX_CUSTOM_MODE_LENGTH} символів</small>
                    </div>
                    <label className="auth-field">
                      <span>Країна</span>
                      <input type="text" placeholder={isDiscordForm ? 'Україна / UA' : 'Україна'} value={form.country} onChange={(event) => setField('country', event.target.value)} />
                    </label>
                  </div>
                  <div className="auth-field">
                    <span>Проєкт серверів <span style={{ color: 'var(--fg-3)', fontWeight: 400 }}>(необов&apos;язково)</span></span>
                    <Select
                      value={form.projectId === null ? '' : String(form.projectId)}
                      onChange={(value) => setField('projectId', value ? Number(value) : null)}
                      options={[
                        { value: '', label: 'Без проєкту' },
                        ...projects.map((project) => ({ value: String(project.id), label: project.name })),
                      ]}
                      ariaLabel="Проєкт серверів"
                    />
                    <small style={{ color: 'var(--fg-3)', fontSize: 12 }}>
                      Об&apos;єднуйте Minecraft і Discord сервери в один проєкт або мережу.{' '}
                      <a href="/dashboard/projects" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Керувати проєктами →</a>
                    </small>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, marginTop: 10 }}>
                      <input
                        className="input"
                        type="text"
                        placeholder="Новий проєкт, напр. My Network"
                        value={newProjectName}
                        onChange={(event) => setNewProjectName(event.target.value)}
                      />
                      <button className="btn btn-secondary" type="button" onClick={() => void handleCreateProject()} disabled={!newProjectName.trim() || creatingProject}>
                        {creatingProject ? 'Створення...' : '+ Створити'}
                      </button>
                    </div>
                  </div>
                  {!isDiscordForm && (
                    <div className="add-grid-3">
                      <div className="auth-field">
                        <span>Мін. версія</span>
                        <Select value={form.minVer} onChange={(value) => setField('minVer', value)} options={versionOptions} ariaLabel="Мінімальна версія Minecraft" className="add-version-select" />
                      </div>
                      <div className="auth-field">
                        <span>Макс. версія</span>
                        <Select value={form.maxVer} onChange={(value) => setField('maxVer', value)} options={versionOptions} ariaLabel="Максимальна версія Minecraft" className="add-version-select" />
                      </div>
                      <label className="auth-field">
                        <span>Підсумкова версія</span>
                        <input type="text" value={buildVersionRange(form.minVer, form.maxVer)} readOnly />
                      </label>
                    </div>
                  )}
                  <label className="auth-field">
                    <span>{isDiscordForm ? 'Короткий опис спільноти *' : 'MOTD (короткий опис) *'}</span>
                    <textarea
                      rows={3}
                      maxLength={160}
                      placeholder={isDiscordForm ? 'Спільнота для новин, голосових каналів, івентів та пошуку команди...' : 'Привіт! Заходь до нас і отримай VIP на 7 днів...'}
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
                    <span>{isDiscordForm ? 'Повний опис Discord-спільноти *' : 'Повний опис серверу *'}</span>
                    <textarea
                      rows={12}
                      placeholder={isDiscordForm ? 'Розкажи про тематику спільноти, правила, голосові канали, ролі, івенти, модерацію та для кого цей Discord...' : 'Розкажи про особливості серверу, що чекає на гравців, які режими доступні, події, плагіни тощо...'}
                      value={form.fullDesc}
                      onChange={(event) => setField('fullDesc', event.target.value)}
                    />
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

                  <div className="auth-field">
                    <span>Попередній перегляд банера</span>
                    <div
                      className="banner-surface add-banner-preview"
                      style={buildBannerSurfaceStyle(form.bannerUrl) || { backgroundImage: 'linear-gradient(135deg, #0c0e13, #1a1f2e)' }}
                    />
                    <small className="add-field-counter">Співвідношення 3:1 — так банер виглядатиме в каталозі та на сторінці сервера</small>
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
                    <b>{isDiscordForm ? 'Обери теги Discord-спільноти' : 'Обери теги'}</b>
                    <span>{form.tags.length}/{MAX_TAGS}</span>
                  </div>
                  {form.tags.length > 0 && (
                    <div className="add-selected-tags">
                      <div className="add-selected-tags-head">
                        <span>Вибрані теги</span>
                        <button type="button" onClick={clearTags}>Очистити всі</button>
                      </div>
                      <div className="add-selected-tags-list">
                        {form.tags.map((tag) => (
                          <button type="button" key={tag} onClick={() => toggleTag(tag)} title="Прибрати тег">
                            {tag}
                            <span aria-hidden="true">×</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="add-tags-grid">
                    {visibleTagOptions.map((tag) => (
                      <Toggle
                        key={tag}
                        type="button"
                        variant="outline"
                        className="filter-chip"
                        pressed={form.tags.some((item) => item.toLowerCase() === tag.toLowerCase())}
                        onPressedChange={() => toggleTag(tag)}
                        disabled={!form.tags.some((item) => item.toLowerCase() === tag.toLowerCase()) && form.tags.length >= MAX_TAGS}
                      >
                        {form.tags.some((item) => item.toLowerCase() === tag.toLowerCase()) ? '✓ ' : ''}{tag}
                      </Toggle>
                    ))}
                  </div>
                  <div className="add-inline-create add-inline-create--tags">
                    <input
                      className="input"
                      type="text"
                      maxLength={MAX_CUSTOM_TAG_LENGTH}
                      placeholder="Свій тег"
                      value={customTagInput}
                      onChange={(event) => {
                        setCustomTagInput(event.target.value)
                        setCustomTagError(null)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          handleAddCustomTag()
                        }
                      }}
                      disabled={form.tags.length >= MAX_TAGS}
                      aria-label="Додати свій тег"
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleAddCustomTag}
                      disabled={form.tags.length >= MAX_TAGS || !customTagInput.trim()}
                    >
                      + Додати
                    </button>
                  </div>
                  {customTagError ? <small className="add-field-error">{customTagError}</small> : null}
                  <small className="add-field-counter">Свій тег до {MAX_CUSTOM_TAG_LENGTH} символів · максимум {MAX_TAGS} тегів</small>
                  <div className="add-actions">
                    <button className="btn btn-secondary" onClick={() => goBack(5)}>← Назад</button>
                    <button className="btn btn-primary" onClick={() => goNext(7)}>Далі →</button>
                  </div>
                </div>
              )}

              {step === 7 && (
                <div className="add-form-section">
                  <div className="add-summary">
                    <div className="add-summary-row"><span>{isDiscordForm ? 'Інвайт' : 'Адреса'}</span><b>{form.addr || '-'}</b></div>
                    <div className="add-summary-row"><span>{isDiscordForm ? 'Спільнота' : 'Назва'}</span><b>{form.name || '-'}</b></div>
                    <div className="add-summary-row"><span>{isDiscordForm ? 'Платформа' : 'Ядро'}</span><b>{CORE_LABELS[form.core]}</b></div>
                    <div className="add-summary-row"><span>{isDiscordForm ? 'Тип' : 'Версія'}</span><b>{isDiscordForm ? form.mode : buildVersionRange(form.minVer, form.maxVer)}</b></div>
                    <div className="add-summary-row"><span>Країна</span><b>{form.country || '-'}</b></div>
                    <div className="add-summary-row"><span>{isDiscordForm ? 'Короткий опис' : 'MOTD'}</span><b>{form.motd || '-'}</b></div>
                    {form.projectId && <div className="add-summary-row"><span>Проект</span><b>{projects.find((p) => p.id === form.projectId)?.name || '-'}</b></div>}
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
      <ImageCropModal
        imageSrc={cropState?.src || ''}
        open={Boolean(cropState)}
        title={cropState?.target === 'banner' ? 'Обрізати банер' : 'Обрізати аватарку'}
        aspectRatio={cropState?.target || 'square'}
        onClose={() => setCropState(null)}
        onConfirm={handleCropConfirm}
      />
    </PageShell>
  )
}
