'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import type { AuthUser } from '@/lib/auth-db'
import { buildServerDashboardSlug } from '@/lib/server-slug'
import { Area, CartesianGrid, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type DashRange = '24h' | '7d' | '30d' | '90d' | 'all'
type ActivityKind = 'vote' | 'review' | 'view'
type ActorKind = 'mc' | 'profile' | 'guest'
type ActivityItem = {
  kind: ActivityKind
  actor: string
  actorKind: ActorKind
  detail: string
  rating?: number
  createdAt: string
  avatarUrl?: string | null
  profileSlug?: string | null
}
type ChartPoint = { date: string; online: number; peak: number; visitors: number; views: number; votes: number }
type VoteEntry = { id: number; nickname: string; voteCount: number; createdAt: string }
type ReviewItem = {
  id: number
  authorName: string
  avatarUrl: string | null
  profileSlug: string | null
  text: string
  rating: number
  createdAt: string
}
type OwnedServer = { seed: number; name: string; ic: string; addr: string; avatarUrl: string | null }
type CountryEntry = { code: string; visitors: number; percent: number }
type TrafficSourceEntry = { source: string; visitors: number; percent: number }
type ReferralLinkEntry = {
  id: number
  label: string
  code: string
  channel: string
  url: string
  totalViews: number
  uniqueVisitors: number
  views7d: number
  views30d: number
  disabledAt: string | null
}

const COUNTRY_DICT: Record<string, string> = {
  UA: 'Україна', PL: 'Польща', DE: 'Німеччина', CZ: 'Чехія', SK: 'Словаччина',
  US: 'США', GB: 'Велика Британія', RU: 'росія', BY: 'Білорусь', MD: 'Молдова',
  RO: 'Румунія', HU: 'Угорщина', TR: 'Туреччина', FR: 'Франція', ES: 'Іспанія',
  IT: 'Італія', NL: 'Нідерланди', CA: 'Канада', LT: 'Литва', LV: 'Латвія',
  EE: 'Естонія', BG: 'Болгарія',
}
function codeToFlag(code: string): string {
  const normalized = String(code || '').trim().toUpperCase()
  if (normalized.length !== 2 || !/^[A-Z]{2}$/.test(normalized)) return '🌍'
  return String.fromCodePoint(0x1f1e6 + (normalized.charCodeAt(0) - 65), 0x1f1e6 + (normalized.charCodeAt(1) - 65))
}
function describeCountry(code: string): { name: string; flag: string } {
  const normalized = String(code || '').trim().toUpperCase()
  if (!normalized || normalized === 'UN') return { name: 'Невідомо', flag: '🌍' }
  return { name: COUNTRY_DICT[normalized] || normalized, flag: codeToFlag(normalized) }
}

const TRAFFIC_SOURCE_META: Record<string, { label: string; icon: string }> = {
  direct: { label: 'Прямі переходи', icon: '↗' },
  internal: { label: 'Eyzencore', icon: '◆' },
  search: { label: 'Пошукові системи', icon: '⌕' },
  discord: { label: 'Discord', icon: '◉' },
  youtube: { label: 'YouTube', icon: '▶' },
  tiktok: { label: 'TikTok', icon: '♪' },
  social: { label: 'Соціальні мережі', icon: '◎' },
  referral: { label: 'Інші сайти', icon: '↪' },
}

function describeTrafficSource(source: string) {
  const normalized = String(source || 'direct').toLowerCase()
  if (normalized.startsWith('ref:')) {
    return { label: `Ref: ${normalized.slice(4)}`, icon: '↗' }
  }
  return TRAFFIC_SOURCE_META[normalized] || { label: normalized, icon: '↗' }
}

interface DashSnapshot {
  range: DashRange
  days: number
  kpi: {
    votes: { current: number; prior: number }
    visitors: { current: number; prior: number }
    views: { current: number; prior: number }
    reviews: { current: number; prior: number }
    rating: { current: number; prior: number; overall: number }
  }
  live: {
    currentPlayers: number
    currentMax: number
    online: boolean
    peakToday: number
    uptime30: number | null
    lastSampleAt: string | null
  }
  chart: ChartPoint[]
  activity: ActivityItem[]
  topVoters: VoteEntry[]
  reviews: ReviewItem[]
  heatmap: number[][]
  heatMax: number
  ownedServers: OwnedServer[]
  byCountry: CountryEntry[]
  trafficSources: TrafficSourceEntry[]
  referralLinks?: ReferralLinkEntry[]
}

interface Props {
  initialUser: AuthUser | null
  server: { seed: number; name: string; addr: string; ic: string; avatarUrl?: string | null }
  initialSnapshot: DashSnapshot
}

const mcHeadUrl = (nickname: string, size = 64): string =>
  `https://mc-heads.net/avatar/${encodeURIComponent(String(nickname || 'Steve'))}/${size}`

type AvatarSize = 'sm' | 'md'
function Avatar({ kind, name, avatarUrl, seedOffset = 0, size = 'md' }: {
  kind: ActorKind
  name: string
  avatarUrl?: string | null
  seedOffset?: number
  size?: AvatarSize
}) {
  const cls = `av${size === 'sm' ? ' av-sm' : ''}`
  if (kind === 'mc') {
    // Minecraft head from the player's nickname
    const px = size === 'sm' ? 26 : 32
    return (
      <span className={`${cls} av-mc`}>
        <img src={mcHeadUrl(name, px * 2)} alt={name} loading="lazy" />
      </span>
    )
  }
  if (kind === 'profile' && avatarUrl) {
    return (
      <span className={cls} style={{ backgroundImage: `url(${JSON.stringify(avatarUrl).slice(1, -1)})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' }}>
        {initials(name)}
      </span>
    )
  }
  // Fallback: gradient + initials
  return <span className={cls} style={{ background: grad(name, seedOffset) }}>{initials(name)}</span>
}

function ActorName({ name, profileSlug, kind }: { name: string; profileSlug?: string | null; kind: ActorKind }) {
  const display = kind === 'mc' ? name : `@${name}`
  if (kind === 'profile' && profileSlug) {
    return <Link href={`/profile/${profileSlug}`} className="actor-link"><b>{display}</b></Link>
  }
  return <b>{display}</b>
}

const RANGE_LABELS: Record<DashRange, string> = {
  '24h': '24г',
  '7d': '7д',
  '30d': '30д',
  '90d': '90д',
  all: 'Все',
}
const RANGE_FULL: Record<DashRange, string> = {
  '24h': '24 години',
  '7d': '7 днів',
  '30d': '30 днів',
  '90d': '90 днів',
  all: 'Весь час',
}

const AV_GRADS = [
  'linear-gradient(135deg,#fde68a,#f59e0b)',
  'linear-gradient(135deg,#a7f3d0,#10b981)',
  'linear-gradient(135deg,#bfdbfe,#3b82f6)',
  'linear-gradient(135deg,#ddd6fe,#8b5cf6)',
  'linear-gradient(135deg,#fecaca,#ef4444)',
  'linear-gradient(135deg,#fed7aa,#f97316)',
  'linear-gradient(135deg,#bae6fd,#06b6d4)',
  'linear-gradient(135deg,#fbcfe8,#ec4899)',
]
const grad = (seed: string | number, offset = 0): string => {
  const numeric = typeof seed === 'number' ? seed : Array.from(String(seed || 'x')).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return AV_GRADS[Math.abs(numeric + offset) % AV_GRADS.length]
}
const initials = (name: string): string => {
  const cleaned = String(name || '').replace(/^@/, '')
  const parts = cleaned.split(/[._\s-]+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const ACT_TYPES: Record<ActivityKind, { label: string; icon: string }> = {
  vote: { label: 'Голос', icon: '▲' },
  review: { label: 'Відгук', icon: '★' },
  view: { label: 'Перегляд', icon: '◉' },
}

const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat('uk', { numeric: 'auto' })
function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return '—'
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec} с тому`
  const min = Math.floor(sec / 60)
  if (min < 60) return RELATIVE_FORMATTER.format(-min, 'minute')
  const hr = Math.floor(min / 60)
  if (hr < 24) return RELATIVE_FORMATTER.format(-hr, 'hour')
  const days = Math.floor(hr / 24)
  if (days < 30) return RELATIVE_FORMATTER.format(-days, 'day')
  const months = Math.floor(days / 30)
  if (months < 12) return RELATIVE_FORMATTER.format(-months, 'month')
  return RELATIVE_FORMATTER.format(-Math.floor(months / 12), 'year')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function formatNumber(value: number): string {
  return Number(value || 0).toLocaleString('uk-UA')
}

function chartMetricLabel(name: unknown): string {
  switch (String(name)) {
    case 'online':
      return 'Онлайн (середн.)'
    case 'visitors':
      return 'Унік. відвідувачі'
    case 'views':
      return 'Перегляди'
    case 'votes':
      return 'Голоси'
    default:
      return String(name || '')
  }
}

function pctDelta(current: number, prior: number): { sign: '+' | '-' | ''; text: string; negative: boolean } {
  if (prior === 0 && current === 0) return { sign: '', text: '0%', negative: false }
  if (prior === 0) return { sign: '+', text: '∞', negative: false }
  const ratio = ((current - prior) / Math.max(1, prior)) * 100
  const rounded = Math.abs(ratio) >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10
  return {
    sign: ratio === 0 ? '' : ratio > 0 ? '+' : '-',
    text: `${Math.abs(rounded).toFixed(Math.abs(rounded) >= 10 ? 0 : 1)}%`,
    negative: ratio < 0,
  }
}

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

export function DashboardClient({ initialUser, server, initialSnapshot }: Props) {
  const router = useRouter()
  const [snapshot, setSnapshot] = useState<DashSnapshot>(initialSnapshot)
  const [range, setRange] = useState<DashRange>(initialSnapshot.range || '7d')
  const [feedTab, setFeedTab] = useState<'all' | ActivityKind>('all')
  const [loading, setLoading] = useState(false)
  const [updatedAgo, setUpdatedAgo] = useState<string>('щойно')
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close picker on outside click / Escape
  useEffect(() => {
    if (!pickerOpen) return
    const onClick = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) setPickerOpen(false)
    }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setPickerOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [pickerOpen])

  useEffect(() => {
    if (range === initialSnapshot.range) {
      setSnapshot(initialSnapshot)
      return
    }
    let cancelled = false
    setLoading(true)
    void fetch(`/api/servers/${server.seed}/dashboard?range=${range}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return
        if (data?.error) return
        setSnapshot(data as DashSnapshot)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [range, server.seed, initialSnapshot])

  // Auto-refresh every 60s
  useEffect(() => {
    const id = window.setInterval(() => {
      void fetch(`/api/servers/${server.seed}/dashboard?range=${range}`, { cache: 'no-store' })
        .then((response) => response.json())
        .then((data) => {
          if (data?.error) return
          setSnapshot(data as DashSnapshot)
          setUpdatedAgo('щойно')
        })
    }, 60000)
    return () => window.clearInterval(id)
  }, [range, server.seed])

  // Tick "updated X ago" label
  useEffect(() => {
    const id = window.setInterval(() => {
      setUpdatedAgo((current) => {
        if (current === 'щойно') return '< 1 хв тому'
        return current
      })
    }, 30000)
    return () => window.clearInterval(id)
  }, [snapshot])

  const filteredFeed = useMemo(() => {
    if (feedTab === 'all') return snapshot.activity
    return snapshot.activity.filter((a) => a.kind === feedTab)
  }, [snapshot.activity, feedTab])

  const counts = useMemo(() => {
    const acc = { all: snapshot.activity.length, vote: 0, review: 0, view: 0 }
    snapshot.activity.forEach((a) => { acc[a.kind] = (acc[a.kind] || 0) + 1 })
    return acc
  }, [snapshot.activity])

  const totalVotesPeriod = snapshot.kpi.votes.current

  const kpiCards = [
    { label: `Голоси за ${RANGE_FULL[range].toLowerCase()}`, value: formatNumber(snapshot.kpi.votes.current), delta: pctDelta(snapshot.kpi.votes.current, snapshot.kpi.votes.prior) },
    { label: 'Унікальні відвідувачі', value: formatNumber(snapshot.kpi.visitors.current), delta: pctDelta(snapshot.kpi.visitors.current, snapshot.kpi.visitors.prior) },
    { label: 'Перегляди сторінки', value: formatNumber(snapshot.kpi.views.current), delta: pctDelta(snapshot.kpi.views.current, snapshot.kpi.views.prior) },
    { label: 'Середній рейтинг', value: snapshot.kpi.rating.overall > 0 ? `${snapshot.kpi.rating.overall.toFixed(2)} ★` : '—', delta: pctDelta(snapshot.kpi.rating.current * 10, snapshot.kpi.rating.prior * 10) },
  ]

  const liveDot = snapshot.live.online ? 'on' : 'off'

  return (
    <PageShell active="dashboard" initialUser={initialUser}>
      <main className="dash-main">
        <div className="dash-shell">
          {/* Header */}
          <div className="dash-head">
            <div className="dash-head-info">
              <Link href={`/servers/${server.seed}`} className="dash-back">← {server.name}</Link>
              <Breadcrumbs items={[
                { label: 'Простір', href: '/' },
                { label: 'Dashboard', href: '/dashboard' },
                { label: server.name },
              ]} />
              <h1 className="page-title">Дашборд серверу</h1>
            </div>
            <div className="dash-server-pick-wrap" ref={pickerRef}>
              <button
                type="button"
                className={`dash-server-pick${pickerOpen ? ' open' : ''}`}
                onClick={() => setPickerOpen((value) => !value)}
                aria-haspopup="listbox"
                aria-expanded={pickerOpen}
              >
                <span className="ic" style={server.avatarUrl ? { backgroundImage: `url(${JSON.stringify(server.avatarUrl).slice(1, -1)})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}>
                  {server.avatarUrl ? '' : (server.ic || initials(server.name))}
                </span>
                <span className="dash-server-pick-info">
                  <b>{server.name}</b>
                  <span>{server.addr}</span>
                </span>
                <span className={`dash-server-pick-chev${pickerOpen ? ' open' : ''}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </button>
              {pickerOpen && (
                <div className="dash-server-pick-panel" role="listbox">
                  <div className="dash-server-pick-head">Мої сервери</div>
                  {snapshot.ownedServers.length === 0 ? (
                    <div className="dash-server-pick-empty">Жодного серверу ще не додано</div>
                  ) : (
                    snapshot.ownedServers.map((item) => {
                      const isCurrent = item.seed === server.seed
                      return (
                        <button
                          key={item.seed}
                          type="button"
                          role="option"
                          aria-selected={isCurrent}
                          className={`dash-server-pick-item${isCurrent ? ' current' : ''}`}
                          onClick={() => {
                            setPickerOpen(false)
                            if (!isCurrent) router.push(`/dashboard/${buildServerDashboardSlug(item.name)}`)
                          }}
                        >
                          <span className="ic" style={item.avatarUrl ? { backgroundImage: `url(${JSON.stringify(item.avatarUrl).slice(1, -1)})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}>
                            {item.avatarUrl ? '' : item.ic}
                          </span>
                          <span className="info">
                            <b>{item.name}</b>
                            <span>{item.addr}</span>
                          </span>
                          {isCurrent && (
                            <svg className="check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          )}
                        </button>
                      )
                    })
                  )}
                  <div className="dash-server-pick-foot">
                    <Link href="/add-server" className="dash-server-pick-add">+ Додати новий сервер</Link>
                  </div>
                </div>
              )}
            </div>
            <div className="dash-range">
              {(['24h', '7d', '30d', '90d', 'all'] as DashRange[]).map((key) => (
                <button key={key} className={range === key ? 'active' : ''} onClick={() => setRange(key)} disabled={loading && range === key}>
                  {RANGE_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          {/* Live band */}
          <div className={`live-band ${liveDot}`}>
            <span className="dot" />
            <div className="stat-mini">
              <b>{formatNumber(snapshot.live.currentPlayers)}</b>
              <span>зараз онлайн</span>
            </div>
            <span className="live-sep">│</span>
            <div className="stat-mini">
              <b>{formatNumber(snapshot.live.peakToday)}</b>
              <span>пік сьогодні</span>
            </div>
            <span className="live-sep">│</span>
            <div className="stat-mini">
              <b>{formatNumber(snapshot.live.currentMax)}</b>
              <span>максимум слотів</span>
            </div>
            <span className="live-sep">│</span>
            <div className="stat-mini">
              <b style={{ color: 'var(--green)' }}>{snapshot.live.uptime30 == null ? '—' : `${snapshot.live.uptime30.toFixed(1)}%`}</b>
              <span>uptime 30д</span>
            </div>
            <div className="live-updated">оновлено {updatedAgo}</div>
          </div>

          {/* KPI cards */}
          <div className="kpi-grid">
            {kpiCards.map((card) => (
              <div className="kpi" key={card.label}>
                <div className="lbl">{card.label}</div>
                <div className="val">{card.value}</div>
                <div className={`delta${card.delta.negative ? ' neg' : ''}${card.delta.text === '0%' ? ' zero' : ''}`}>
                  {card.delta.sign === '-' ? '▼' : card.delta.sign === '+' ? '▲' : '·'} {card.delta.text} vs минулий період
                </div>
              </div>
            ))}
          </div>

          {/* Main grid: chart + feed */}
          <div className="dash-grid">
            <div className="dash-card">
              <div className="head">
                <h3>Онлайн та відвідуваність · {RANGE_FULL[range]}</h3>
                <div className="legend">
                  <span className="dot" style={{ background: 'var(--accent)' }} /> Онлайн
                  <span className="dot" style={{ background: '#5eead4', marginLeft: 14 }} /> Відвідувачі
                  <span className="dot" style={{ background: '#fbbf24', marginLeft: 14 }} /> Перегляди
                  <span className="dot" style={{ background: '#a78bfa', marginLeft: 14 }} /> Голоси
                </div>
              </div>
              <div className="dash-chart-wrap">
                {snapshot.chart.length === 0 ? (
                  <div className="dash-empty">Дані ще збираються</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={snapshot.chart} margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
                      <defs>
                        <linearGradient id="dashOnlineFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: 'var(--fg-3)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} tickFormatter={(value) => new Date(value).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })} />
                      <YAxis yAxisId="left" tick={{ fill: 'var(--fg-3)', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--fg-3)', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                      <Tooltip
                        cursor={{ stroke: 'var(--accent)', strokeOpacity: 0.45, strokeDasharray: '4 4', strokeWidth: 1.5 }}
                        contentStyle={{ background: 'var(--bg-1)', border: '1px solid var(--line-strong)', borderRadius: 10, color: 'var(--fg)', fontSize: 12.5, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
                        labelFormatter={(label) => new Date(label).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}
                        formatter={(value, name) => [`${formatNumber(Number(value))}`, chartMetricLabel(name)]}
                      />
                      <Area
                        yAxisId="left" type="monotone" dataKey="online"
                        stroke="var(--accent)" strokeWidth={2} fill="url(#dashOnlineFill)"
                        dot={false}
                        activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--bg-1)', strokeWidth: 2 }}
                      />
                      <Line
                        yAxisId="right" type="monotone" dataKey="visitors"
                        stroke="#5eead4" strokeWidth={1.8} strokeDasharray="4 4"
                        dot={false}
                        activeDot={{ r: 4, fill: '#5eead4', stroke: 'var(--bg-1)', strokeWidth: 2 }}
                      />
                      <Line
                        yAxisId="right" type="monotone" dataKey="views"
                        stroke="#fbbf24" strokeWidth={1.8}
                        dot={false}
                        activeDot={{ r: 4, fill: '#fbbf24', stroke: 'var(--bg-1)', strokeWidth: 2 }}
                      />
                      <Line
                        yAxisId="right" type="monotone" dataKey="votes"
                        stroke="#a78bfa" strokeWidth={1.8}
                        dot={false}
                        activeDot={{ r: 4, fill: '#a78bfa', stroke: 'var(--bg-1)', strokeWidth: 2 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="dash-card">
              <div className="head">
                <h3>Стрічка активності</h3>
                <span className="more pulse">live</span>
              </div>
              <div className="feed-tabs">
                {([
                  ['all', 'Все'],
                  ['vote', 'Голоси'],
                  ['review', 'Відгуки'],
                  ['view', 'Перегляди'],
                ] as const).map(([key, label]) => (
                  <button key={key} className={feedTab === key ? 'active' : ''} onClick={() => setFeedTab(key)}>
                    {label} <span className="cnt">{counts[key as keyof typeof counts] ?? 0}</span>
                  </button>
                ))}
              </div>
              <div className="dash-feed">
                {filteredFeed.length === 0 ? (
                  <div className="dash-empty small">Поки що жодної активності</div>
                ) : (
                  filteredFeed.map((item, index) => (
                    <div className="act-item" key={`${item.kind}-${item.createdAt}-${index}`}>
                      <Avatar kind={item.actorKind} name={item.actor} avatarUrl={item.avatarUrl} seedOffset={index} />
                      <div className="body">
                        <p>
                          <span className={`act-tag ${item.kind}`}>{ACT_TYPES[item.kind].icon} {ACT_TYPES[item.kind].label}</span>
                          <ActorName name={item.actor} profileSlug={item.profileSlug} kind={item.actorKind} />
                        </p>
                        <div className="sub">{item.detail}</div>
                      </div>
                      <span className="time">{timeAgo(item.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Two-col: voters + reviews */}
          <div className="dash-col-2">
            <div className="dash-card">
              <div className="head">
                <h3>Топ голосувальники</h3>
                <span className="more">{formatNumber(totalVotesPeriod)} голосів</span>
              </div>
              <div>
                {snapshot.topVoters.length === 0 ? (
                  <div className="dash-empty small">За цей період голосів ще не було</div>
                ) : (
                  snapshot.topVoters.map((voter, index) => (
                    <div className="act-item" key={voter.id}>
                      <Avatar kind="mc" name={voter.nickname} seedOffset={index} />
                      <div className="body">
                        <p><b>{voter.nickname}</b> <span className="muted">· {voter.voteCount} {voter.voteCount === 1 ? 'голос' : voter.voteCount < 5 ? 'голоси' : 'голосів'}</span></p>
                        <div className="sub">останній: {formatDate(voter.createdAt)}</div>
                      </div>
                      <span className="time vote-cnt">▲ {voter.voteCount}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="dash-card">
              <div className="head">
                <h3>Останні відгуки {snapshot.kpi.rating.overall > 0 && <span className="rating-pill">{snapshot.kpi.rating.overall.toFixed(2)} ★</span>}</h3>
                <Link className="more accent" href={`/servers/${server.seed}#reviews`}>усі →</Link>
              </div>
              <div>
                {snapshot.reviews.length === 0 ? (
                  <div className="dash-empty small">Відгуків ще немає</div>
                ) : (
                  snapshot.reviews.map((review, index) => {
                    const kind: ActorKind = review.profileSlug ? 'profile' : 'guest'
                    return (
                      <div className="rev-mini" key={review.id}>
                        <div className="top">
                          <Avatar kind={kind} name={review.authorName} avatarUrl={review.avatarUrl} seedOffset={index} size="sm" />
                          <ActorName name={review.authorName} profileSlug={review.profileSlug} kind={kind} />
                          <span className="stars">{'★'.repeat(Math.max(0, Math.min(5, review.rating)))}{'☆'.repeat(Math.max(0, 5 - review.rating))}</span>
                          <span className="t">{timeAgo(review.createdAt)}</span>
                        </div>
                        <p>{review.text || <span className="muted">— без коментаря —</span>}</p>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Two-col: traffic sources + countries */}
          <div className="dash-col-2">
            <div className="dash-card">
              <div className="head">
                <h3>Джерела трафіку</h3>
                <span className="more">7 днів</span>
              </div>
              {snapshot.trafficSources.length === 0 ? (
                <div className="dash-empty small with-icon">
                  <span className="emoji">📊</span>
                  За цей період переходів ще не було.
                </div>
              ) : (
                <div className="bar-list">
                  {snapshot.trafficSources.map((entry) => {
                    const source = describeTrafficSource(entry.source)
                    return (
                      <div key={entry.source} className="bar-row" style={{ gridTemplateColumns: '160px 1fr 60px' }}>
                        <span className="lbl country-row">
                          <span className="flag">{source.icon}</span>
                          {source.label}
                        </span>
                        <span className="bar">
                          <span className="fill" style={{ width: `${Math.max(2, entry.percent).toFixed(1)}%` }} />
                        </span>
                        <span className="v">{entry.visitors.toLocaleString('uk-UA')}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="dash-card">
              <div className="head">
                <h3>Країни відвідувачів</h3>
                <span className="more">унік. за {RANGE_FULL[range].toLowerCase()}</span>
              </div>
              {snapshot.byCountry.length === 0 ? (
                <div className="dash-empty small with-icon">
                  <span className="emoji">🌍</span>
                  За цей період відвідувачів ще не було.
                </div>
              ) : (
                <div className="bar-list">
                  {snapshot.byCountry.map((entry) => {
                    const country = describeCountry(entry.code)
                    return (
                      <div key={entry.code} className="bar-row" style={{ gridTemplateColumns: '140px 1fr 60px' }}>
                        <span className="lbl country-row">
                          <span className="flag">{country.flag}</span>
                          {country.name}
                        </span>
                        <span className="bar">
                          <span className="fill" style={{ width: `${Math.max(2, entry.percent).toFixed(1)}%` }} />
                        </span>
                        <span className="v">{entry.visitors.toLocaleString('uk-UA')}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="dash-card">
            <div className="head">
              <h3>Реферальні кампанії</h3>
              <Link className="more accent" href={`/dashboard/servers/${server.seed}`}>керувати →</Link>
            </div>
            {!snapshot.referralLinks || snapshot.referralLinks.length === 0 ? (
              <div className="dash-empty small with-icon">
                <span className="emoji">↗</span>
                Створи окремі ref-посилання для Telegram, реклами або партнерів, і тут зʼявиться статистика.
              </div>
            ) : (
              <div className="bar-list">
                {snapshot.referralLinks.slice(0, 8).map((entry) => {
                  const maxViews = Math.max(...(snapshot.referralLinks || []).map((item) => item.views30d), 1)
                  return (
                    <div key={entry.id} className="bar-row" style={{ gridTemplateColumns: '180px 1fr 92px' }}>
                      <span className="lbl country-row">
                        <span className="flag">↗</span>
                        {entry.label}
                      </span>
                      <span className="bar">
                        <span className="fill" style={{ width: `${Math.max(4, (entry.views30d / maxViews) * 100).toFixed(1)}%` }} />
                      </span>
                      <span className="v">{entry.views30d.toLocaleString('uk-UA')} / 30д</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Heatmap */}
          <div className="dash-card">
            <div className="head">
              <h3>Активність по годинах · останні 7 днів</h3>
              <span className="more">UTC · перегляди сторінки</span>
            </div>
            <div className="dash-heatmap-wrap">
              <div className="heatmap">
                <span className="corner" />
                {Array.from({ length: 24 }, (_, h) => (
                  <span className="h-hour" key={h}>{h % 3 === 0 ? h : ''}</span>
                ))}
                {DAY_LABELS.map((dayLabel, dayIndex) => (
                  <Row key={dayLabel} day={dayLabel} cells={snapshot.heatmap[dayIndex] || []} max={snapshot.heatMax} />
                ))}
              </div>
              <div className="heatmap-legend">
                <span>менше</span>
                {[0.06, 0.2, 0.4, 0.6, 0.85].map((opacity, index) => (
                  <span key={index} className="lg" style={{ background: `color-mix(in oklab, var(--accent) ${(opacity * 100).toFixed(0)}%, var(--bg-2))` }} />
                ))}
                <span>більше</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </PageShell>
  )
}

function Row({ day, cells, max }: { day: string; cells: number[]; max: number }) {
  return (
    <>
      <span className="h-day">{day}</span>
      {Array.from({ length: 24 }, (_, hour) => {
        const value = cells[hour] || 0
        const intensity = max > 0 ? Math.min(1, value / max) : 0
        const opacityPct = intensity === 0 ? 4 : 6 + Math.round(intensity * 90)
        return (
          <span
            key={hour}
            className="cell"
            style={{ background: `color-mix(in oklab, var(--accent) ${opacityPct}%, var(--bg-2))` }}
            data-tip={`${day} ${hour}:00 — ${value} ${value === 1 ? 'перегляд' : 'переглядів'}`}
          />
        )
      })}
    </>
  )
}
