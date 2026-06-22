'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { Icons, CheckBadgeIcon } from '@/components/ui/Icons';
import { Select } from '@/components/ui/Select';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { buildDiscordInviteUrl } from '@/lib/discord';
import {
  getOnlineCountLabel,
  isDiscordServer,
} from '@/lib/server-platform';
import { IMAGE_PLACEHOLDER } from '@/lib/placeholders';
import type { Server } from '@/lib/types';
import { formatPlural } from '@/lib/format-plural';
import { toYoutubeEmbedUrl } from '@/lib/youtube';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AuthUser } from '@/lib/auth-db';
import type { Cluster } from '@/lib/cluster-db';

type Tab = 'about' | 'stats' | 'cluster';
type MetricKey = 'online' | 'votes' | 'views';
type PeriodKey = 'day' | 'week' | 'month' | 'min_month' | 'year' | 'min_year' | 'all';
type ReviewItem = { id: number; authorName: string; avatarUrl: string | null; text: string; rating: number; createdAt: string; updatedAt: string };
type VoteEntry = { id: number; nickname: string; ipAddress: string; voteCount: number; createdAt: string };

interface Props { server: Server; cluster: Cluster | null; canEdit: boolean; initialUser: AuthUser | null }
type ChartPoint = { time: string; online: number; votes: number; views: number; rawTime: string }

const METRIC_LABELS: Record<MetricKey, string> = { online: 'Онлайн', votes: 'Голоси', views: 'Перегляди' }
const METRIC_UNITS: Record<MetricKey, string> = { online: 'гравців', votes: 'голосів', views: 'переглядів' }
const METRIC_FORMS: Record<Exclude<MetricKey, 'online'>, readonly [string, string, string]> = {
  votes: ['голос', 'голоси', 'голосів'],
  views: ['перегляд', 'перегляди', 'переглядів'],
}
const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Тиждень' },
  { value: 'month', label: 'Місяць' },
  { value: 'min_month', label: 'Мін. місяць' },
  { value: 'year', label: 'Рік' },
  { value: 'min_year', label: 'Мін. рік' },
  { value: 'all', label: 'Весь час' },
]

export function ServerOverviewClient({ server: s, cluster, canEdit, initialUser }: Props) {
  const searchParams = useSearchParams();
  const isDiscord = isDiscordServer(s);
  const canVote = Boolean(initialUser);
  const [tab, setTab] = useState<Tab>('about');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [metric, setMetric] = useState<MetricKey>('online');
  const [period, setPeriod] = useState<PeriodKey>('day');
  const [liveInfo, setLiveInfo] = useState<{ online: boolean; players: number; max: number; version: string }>({
    online: Boolean(s.on),
    players: Number(s.players || 0),
    max: Number(s.max || 0),
    version: s.ver,
  });
  const { copied, copy } = useCopyToClipboard();
  const ownerHandle = s.ownerSlug
    ? String(s.ownerSlug)
    : String(s.ownerName || '')
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '')
  const [nickname, setNickname] = useState('')
  const [voteMessage, setVoteMessage] = useState<string | null>(null)
  const [lastVoteAt, setLastVoteAt] = useState<string | null>(null)
  const [engagement, setEngagement] = useState<{ views: number; votes: number; reviews: number; averageRating: number }>({
    views: 0,
    votes: 0,
    reviews: 0,
    averageRating: 0,
  })
  const [topVoters, setTopVoters] = useState<VoteEntry[]>([])
  const [latestVoters, setLatestVoters] = useState<VoteEntry[]>([])
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [rating, setRating] = useState<number>(5)
  const [reviewText, setReviewText] = useState<string>('')
  const [reviewMessage, setReviewMessage] = useState<string | null>(null)
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(0)
  const [likeBusy, setLikeBusy] = useState(false)
  const [botInviteUrl, setBotInviteUrl] = useState<string | null>(null)
  const isValidNickname = (value: string): boolean => /^[A-Za-z0-9_]{3,16}$/.test(String(value || '').trim())
  const catalogHref = isDiscord ? '/servers/discord' : '/servers/minecraft'
  const referralCode = searchParams.get('ref') || searchParams.get('utm_source') || ''

  useEffect(() => {
    if (!isDiscord || !canEdit) return
    void fetch('/api/discord/bot/invite')
      .then(async (response) => {
        if (!response.ok) return
        const payload = await response.json() as { inviteUrl?: string }
        setBotInviteUrl(payload.inviteUrl || null)
      })
  }, [isDiscord, canEdit])
  useEffect(() => {
    void fetch(`/api/servers/${s.seed}/like`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return
        const payload = await response.json() as { liked?: boolean; likes?: number }
        setLiked(Boolean(payload.liked))
        setLikes(Number(payload.likes || 0))
      })
  }, [s.seed])
  const loadEngagement = async () => {
    const response = await fetch(`/api/servers/${s.seed}/engagement`, { cache: 'no-store' })
    if (!response.ok) return
    const payload = await response.json() as {
      summary?: { views?: number; votes?: number; reviews?: number; averageRating?: number }
      topVoters?: VoteEntry[]
      latestVotes?: VoteEntry[]
      reviews?: ReviewItem[]
      user?: { review?: { text?: string; rating?: number } | null }
    }
    const summary = payload.summary || {}
    setEngagement({
      views: Number(summary.views || 0),
      votes: Number(summary.votes || 0),
      reviews: Number(summary.reviews || 0),
      averageRating: Number(summary.averageRating || 0),
    })
    setTopVoters(Array.isArray(payload.topVoters) ? payload.topVoters : [])
    setLatestVoters(Array.isArray(payload.latestVotes) ? payload.latestVotes : [])
    setReviews(Array.isArray(payload.reviews) ? payload.reviews : [])
    if (payload.user?.review) {
      setReviewText(String(payload.user.review.text || ''))
      setRating(Math.max(1, Math.min(5, Number(payload.user.review.rating || 5))))
    }
  }

  const chartSummary = useMemo(() => {
    if (chartData.length === 0) return { current: 0, peak: 0, average: 0, totalLabel: '—', totalValue: 0, totalSub: '' }
    const values = chartData.map((point) => Number(point[metric] || 0))
    const peak = Math.max(...values)
    // Estimate the bucket duration from the first two raw timestamps.
    // The /stats API uses different bucket sizes per period (15m/1h/3h/...).
    let bucketHours = 1
    if (chartData.length >= 2) {
      const t0 = new Date(chartData[0].rawTime || '').getTime()
      const t1 = new Date(chartData[1].rawTime || '').getTime()
      if (Number.isFinite(t0) && Number.isFinite(t1) && t1 > t0) {
        bucketHours = (t1 - t0) / (1000 * 60 * 60)
      }
    }
    // Average across non-zero buckets — the API zero-fills empty buckets which
    // would otherwise drag the average artificially toward 0.
    const nonZero = values.filter((value) => value > 0)
    const average = nonZero.length > 0
      ? Math.round(nonZero.reduce((sum, value) => sum + value, 0) / nonZero.length)
      : 0
    const current = values[values.length - 1] || 0

    // Online values are time-averages, while votes/views are bucket event counts.
    // Use a metric-appropriate total so the cards match what the chart shows.
    let totalLabel = 'Сумарно'
    let totalValue = 0
    let totalSub = ''
    if (metric === 'online') {
      // Player-hours: sum of (avg players × bucket duration) over non-zero buckets.
      const playerHours = values.reduce((sum, value) => sum + value * bucketHours, 0)
      totalLabel = 'Player-години'
      totalValue = Math.round(playerHours)
      totalSub = 'оцінка часу гри'
    } else {
      // Votes/views are bucket counts, so the period total is their sum.
      totalLabel = 'За період'
      totalValue = values.reduce((sum, value) => sum + value, 0)
      totalSub = `нових ${METRIC_UNITS[metric]}`
    }
    return { current, peak, average, totalLabel, totalValue, totalSub }
  }, [chartData, metric])

  const statsData = [
    { label: 'Голоси', value: String(Math.max(0, engagement.votes)) },
    { label: 'Відгуки', value: String(Math.max(0, engagement.reviews)) },
    { label: 'Перегляди', value: String(Math.max(0, engagement.views)) },
    { label: 'Сер. рейтинг', value: engagement.averageRating > 0 ? `${engagement.averageRating.toFixed(1)}★` : '—' },
    { label: 'Позиція', value: `#${s.rank}` },
  ]
  const getEmbedVideoUrl = (url: string): string | null => toYoutubeEmbedUrl(url)
  useEffect(() => {
    let isMounted = true
    const loadLiveStatus = async () => {
      try {
        const response = await fetch('/api/servers/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            addr: s.addr,
            core: s.core || 'java',
            platform: s.platform || 'minecraft',
            serverId: s.seed,
            allowExisting: true,
          }),
        })
        const data = await response.json() as { probe?: { online?: boolean; players?: number; max?: number; version?: string } }
        if (!response.ok || !isMounted) return
        const probe = data.probe || {}
        const normalizedVersion = (() => {
          const candidate = String(probe.version || '').trim()
          if (!candidate) return s.ver
          if (/^\d+$/.test(candidate)) return s.ver
          return candidate
        })()
        setLiveInfo({
          online: Boolean(probe.online),
          players: Number(probe.players || 0),
          max: Number(probe.max || 0),
          version: normalizedVersion,
        })
      } catch {
        // keep stored values
      }
    }
    void loadLiveStatus()
    const intervalId = window.setInterval(() => {
      void loadLiveStatus()
    }, 45000)
    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [s.addr, s.core, s.ver])
  useEffect(() => {
    let isMounted = true
    const loadStats = async () => {
      try {
        const response = await fetch(`/api/servers/${s.seed}/stats?period=${period}`, { cache: 'no-store' })
        const payload = await response.json() as { samples?: Array<{ players: number; votes: number; views: number; recordedAt: string }> }
        if (!response.ok || !isMounted) return
        const samples = payload.samples || []
        const points = samples.map((sample) => {
          const date = new Date(sample.recordedAt)
          const label = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
          return {
            time: label,
            online: Number(sample.players || 0),
            votes: Number(sample.votes || 0),
            views: Number(sample.views || 0),
            rawTime: sample.recordedAt,
          }
        })
        setChartData(points)
      } catch {
        // ignore and keep chart empty
      }
    }
    void loadStats()
    const intervalId = window.setInterval(() => {
      void loadStats()
    }, 45000)
    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [s.seed, period])
  useEffect(() => {
    let isMounted = true
    const loadEngagementSafe = async () => {
      try {
        if (!isMounted) return
        await loadEngagement()
      } catch {
        // ignore engagement loading failures
      }
    }
    const registerView = async () => {
      try {
        await fetch(`/api/servers/${s.seed}/engagement`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'view',
            cooldownMinutes: 15,
            referrer: document.referrer || '',
            referralCode,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
          }),
        })
      } catch {
        // ignore view tracking errors
      }
    }
    void registerView()
    void loadEngagementSafe()
    return () => {
      isMounted = false
    }
  }, [s.seed, referralCode])
  useEffect(() => {
    if (!voteMessage) return
    const timeoutId = window.setTimeout(() => setVoteMessage(null), 2400)
    return () => window.clearTimeout(timeoutId)
  }, [voteMessage])
  useEffect(() => {
    if (!reviewMessage) return
    const timeoutId = window.setTimeout(() => setReviewMessage(null), 2600)
    return () => window.clearTimeout(timeoutId)
  }, [reviewMessage])
  const handleVote = async () => {
    if (!canVote) {
      setVoteMessage('Увійдіть в акаунт, щоб голосувати за сервер')
      return
    }
    const normalizedNickname = nickname.trim()
    if (!isValidNickname(normalizedNickname)) {
      setVoteMessage('Нікнейм: 3-16 символів, лише англійські літери, цифри або _')
      return
    }
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId: s.seed, nickname: normalizedNickname }),
      })
      const payload = await response.json() as {
        error?: string
      }
      if (!response.ok) {
        setVoteMessage(payload.error || 'Не вдалося зарахувати голос')
        return
      }
      await loadEngagement()
      setVoteMessage('Голос зараховано. Дякуємо за підтримку серверу!')
      setLastVoteAt(new Date().toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }))
    } catch {
      setVoteMessage('Не вдалося зарахувати голос')
    }
  }
  const handleReviewSubmit = async () => {
    if (!reviewText.trim()) {
      setReviewMessage('Напиши текст відгуку')
      return
    }
    try {
      const response = await fetch(`/api/servers/${s.seed}/engagement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review', text: reviewText.trim(), rating }),
      })
      const payload = await response.json() as {
        error?: string
        summary?: { views?: number; votes?: number; reviews?: number; averageRating?: number }
        reviews?: ReviewItem[]
      }
      if (!response.ok) {
        setReviewMessage(payload.error || 'Не вдалося зберегти відгук')
        return
      }
      const summary = payload.summary || {}
      setEngagement({
        views: Number(summary.views || engagement.views),
        votes: Number(summary.votes || engagement.votes),
        reviews: Number(summary.reviews || engagement.reviews),
        averageRating: Number(summary.averageRating || engagement.averageRating),
      })
      setReviews(Array.isArray(payload.reviews) ? payload.reviews : reviews)
      await loadEngagement()
      setReviewMessage('Відгук збережено')
    } catch {
      setReviewMessage('Не вдалося зберегти відгук')
    }
  }
  const handleLike = async () => {
    setLikeBusy(true)
    try {
      const response = await fetch(`/api/servers/${s.seed}/like`, { method: 'POST' })
      if (!response.ok) return
      const payload = await response.json() as { liked?: boolean; likes?: number }
      setLiked(Boolean(payload.liked))
      setLikes(Number(payload.likes || 0))
    } finally {
      setLikeBusy(false)
    }
  }

  return (
    <PageShell active="servers" initialUser={initialUser}>
      <div className="so-shell">
        {/* Back */}
        <Link href={catalogHref} className="so-back">
          ← Назад до каталогу
        </Link>

        {/* Hero banner */}
        <div
          className="so-hero"
          style={{
            background: `linear-gradient(180deg, rgba(10,12,20,0.86) 0%, rgba(10,12,20,0.74) 42%, rgba(10,12,20,0.9) 100%), url(${s.bannerUrl || IMAGE_PLACEHOLDER}) center/cover`,
          }}
        >
          <div className="so-hero-content">
            <div className="so-icon" style={{ background: `url(${s.avatarUrl || IMAGE_PLACEHOLDER}) center/cover` }} />
            <div className="so-titles">
              <h1>
                <span className="so-titles-name">{s.name}</span>
                {s.verified && <CheckBadgeIcon size={22}/>}
                <span className={`so-status-pill${liveInfo.online ? ' online' : ''}`}>
                  <span className="dot" />
                  {liveInfo.online ? 'онлайн' : 'офлайн'}
                </span>
              </h1>
              <div className="so-titles-meta">
                <span>{s.mode}</span>
                <span className="dot-sep">·</span>
                <span>{s.ver}</span>
                <span className="dot-sep">·</span>
                <span>{s.core || 'java'}</span>
                {s.country && <><span className="dot-sep">·</span><span>{s.country}</span></>}
              </div>
            </div>
            <div className="so-hero-actions">
              <button type="button" className={`btn ${liked ? 'btn-primary' : 'btn-secondary'}`} disabled={likeBusy} onClick={() => void handleLike()}>
                {liked ? '♥ Подобається' : '♡ Вподобати'} · {likes}
              </button>
              {canEdit && <Link href={`/servers/${s.seed}/edit`} className="btn btn-secondary">{Icons.shield} Редагувати</Link>}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="so-grid">
          {/* Main */}
          <div className="so-main">
            <div className="so-tabs">
              {(['about','stats', ...(cluster ? ['cluster' as const] : [])] as Tab[]).map(t=>(
                <button key={t} className={`so-tab${tab===t?' active':''}`} onClick={()=>setTab(t)}>
                  {{ about:'Про сервер', stats:'Статистика', cluster:'Проєкт' }[t]}
                </button>
              ))}
            </div>

            {tab === 'about' && (
              <>
                <div className="so-block-title">Про сервер</div>
                <div className="so-section">
                  <p className="so-text">{s.fullDesc || s.desc || s.shortDesc || 'Опис ще не додано.'}</p>
                  {s.motd && <p className="so-text"><b>MOTD:</b> {s.motd}</p>}
                  {s.launcherUrl && <p className="so-text"><b>Лаунчер:</b> <a href={s.launcherUrl} target="_blank" rel="noreferrer" className="so-link">{s.launcherUrl}</a></p>}
                </div>

                {s.gallery && s.gallery.length > 0 && (
                  <>
                    <div className="so-block-title">Галерея</div>
                    <div className="so-section">
                      <div className="so-media-grid">
                        {s.gallery.map((image, index) => (
                          <button key={`${image}-${index}`} type="button" className="so-media-item" onClick={() => setPreviewImage(image)}>
                            <img src={image} alt={`${s.name} gallery ${index + 1}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {s.videos && s.videos.length > 0 && (
                  <>
                    <div className="so-block-title">Відео</div>
                    <div className="so-section">
                      <div className="so-media-grid">
                        {s.videos.map((video) => {
                          const embed = getEmbedVideoUrl(video)
                          return (
                            <div key={video} className="so-media-item so-media-video">
                              {embed ? (
                                <iframe src={embed} title={video} allowFullScreen />
                              ) : (
                                <video src={video} controls preload="metadata" />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}

                <div className="so-block-title">Теги</div>
                <div className="so-section">
                  <div className="so-tags">
                    {s.tags.length > 0 ? s.tags.map(t=><span key={t} className="so-tag-big">{t}</span>) : <span className="so-empty">Тегів ще не додано</span>}
                  </div>
                </div>
                <div className="so-block-title">Відгуки</div>
                <div className="so-section">
                  <div className="so-reviews-summary">
                    <b>{engagement.averageRating > 0 ? `${engagement.averageRating.toFixed(1)}★` : '—'}</b>
                    <span>{formatPlural(engagement.reviews, ['відгук', 'відгуки', 'відгуків'])}</span>
                  </div>
                  <div className="so-review-form">
                    <div className="so-review-rating">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className={`so-review-star${rating >= star ? ' active' : ''}`}
                          onClick={() => setRating(star)}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="so-review-textarea"
                      rows={4}
                      maxLength={250}
                      value={reviewText}
                      onChange={(event) => setReviewText(event.target.value)}
                      placeholder="Поділися враженням про сервер"
                    />
                    <div className="so-vote-meta">{reviewText.length}/250</div>
                    <button type="button" className="btn btn-primary" onClick={handleReviewSubmit}>
                      Зберегти відгук
                    </button>
                    {reviewMessage && <div className="so-vote-feedback">{reviewMessage}</div>}
                  </div>
                  <div className="so-reviews-list">
                    {reviews.length === 0 && <span className="so-empty">Відгуків поки немає</span>}
                    {reviews.map((review) => (
                      <div key={review.id} className="so-review-item">
                        <div className="so-review-head">
                          <div className="so-voter-avatar" style={review.avatarUrl ? { backgroundImage: `url(${review.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />
                          <div className="so-review-author">
                            <b>{review.authorName}</b>
                            <span>{new Date(review.updatedAt).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="so-review-rating-pill">{review.rating.toFixed(1)}★</div>
                        </div>
                        <p>{review.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {tab === 'stats' && (
              <>
                <div className="so-block-title">Статистика</div>

                {/* Live band — поточний стан */}
                <div className={`live-band ${liveInfo.online ? 'on' : 'off'}`}>
                  <span className="dot" />
                  <div className="stat-mini">
                    <b>{Number(liveInfo.players || 0).toLocaleString('uk-UA')}</b>
                    <span>{isDiscord ? 'учасників онлайн' : 'зараз онлайн'}</span>
                  </div>
                  <span className="live-sep">│</span>
                  <div className="stat-mini">
                    <b>{Number(chartSummary.peak || 0).toLocaleString('uk-UA')}</b>
                    <span>пік за період</span>
                  </div>
                  <span className="live-sep">│</span>
                  <div className="stat-mini">
                    <b>{Number(liveInfo.max || 0).toLocaleString('uk-UA')}</b>
                    <span>{isDiscord ? 'усього учасників' : 'максимум слотів'}</span>
                  </div>
                  <span className="live-sep">│</span>
                  <div className="stat-mini">
                    <b style={{ color: 'var(--green)' }}>{s.uptime || 'new'}</b>
                    <span>аптайм</span>
                  </div>
                  <div className="live-updated">оновлюється авт.</div>
                </div>

                {/* KPI картки з дельтою (перша половина періоду vs друга) */}
                <div className="kpi-grid">
                  {(() => {
                    const half = Math.floor(chartData.length / 2) || 1
                    const firstHalf = chartData.slice(0, half).map((p) => Number(p[metric] || 0))
                    const secondHalf = chartData.slice(half).map((p) => Number(p[metric] || 0))
                    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
                    const avg = (arr: number[]) => (arr.length ? sum(arr) / arr.length : 0)
                    const diff = avg(secondHalf) - avg(firstHalf)
                    const base = Math.max(1, avg(firstHalf))
                    const ratio = (diff / base) * 100
                    const deltaText = `${ratio >= 0 ? '▲' : '▼'} ${Math.abs(ratio).toFixed(Math.abs(ratio) >= 10 ? 0 : 1)}%`
                    const cards = [
                      { label: 'Поточне значення', value: chartSummary.current, sub: METRIC_LABELS[metric], delta: deltaText, neg: ratio < 0 },
                      { label: 'Пік за період', value: chartSummary.peak, sub: METRIC_UNITS[metric] },
                      { label: 'Середнє', value: chartSummary.average, sub: METRIC_UNITS[metric] },
                      { label: chartSummary.totalLabel, value: chartSummary.totalValue, sub: chartSummary.totalSub },
                    ]
                    return cards.map((card) => (
                      <div className="kpi" key={card.label}>
                        <div className="lbl">{card.label}</div>
                        <div className="val">{card.value.toLocaleString('uk-UA')}</div>
                        <div className={`delta${card.neg ? ' neg' : ''}${!card.delta ? ' zero' : ''}`}>
                          {card.delta || `· ${card.sub}`}
                        </div>
                      </div>
                    ))
                  })()}
                </div>

                {/* Картка графіка у стилі дашборду */}
                <div className="dash-card">
                  <div className="head">
                    <h3>
                      {METRIC_LABELS[metric]}
                      <span className="dash-head-sub">· {PERIOD_OPTIONS.find((p) => p.value === period)?.label}</span>
                    </h3>
                    <div className="dash-head-tools">
                      <span className="more pulse">live</span>
                      <div className="dash-head-period">
                        <Select
                          value={period}
                          onChange={(value) => setPeriod(value as PeriodKey)}
                          options={PERIOD_OPTIONS}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="so-segmented" style={{ marginBottom: 14 }}>
                    {(['online', 'votes', 'views'] as MetricKey[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        className={`so-segmented-item${metric === key ? ' active' : ''}`}
                        onClick={() => setMetric(key)}
                      >
                        {METRIC_LABELS[key]}
                      </button>
                    ))}
                  </div>

                  <div className="dash-chart-wrap">
                    {chartData.length === 0 ? (
                      <div className="dash-empty">Дані ще збираються — зайди трохи пізніше</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
                          <defs>
                            <linearGradient id="overviewAreaFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.42} />
                              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="var(--line)" strokeDasharray="2 4" vertical={false} />
                          <XAxis
                            dataKey="rawTime"
                            tick={{ fill: 'var(--fg-3)', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            minTickGap={24}
                            tickFormatter={(value) => {
                              const date = new Date(value)
                              if (Number.isNaN(date.getTime())) return ''
                              return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
                            }}
                          />
                          <YAxis tick={{ fill: 'var(--fg-3)', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                          <Tooltip
                            cursor={{ stroke: 'var(--accent)', strokeOpacity: 0.45, strokeDasharray: '4 4', strokeWidth: 1.5 }}
                            contentStyle={{
                              background: 'var(--bg-1)',
                              border: '1px solid var(--line-strong)',
                              borderRadius: 10,
                              color: 'var(--fg)',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                              fontSize: 12.5,
                            }}
                            labelStyle={{ color: 'var(--fg-2)', fontFamily: 'var(--font-mono)' }}
                            formatter={(value) => {
                              const normalizedValue = Number(value || 0)
                              const formattedNumber = normalizedValue.toLocaleString('uk-UA')
                              if (metric === 'online') return [`${formattedNumber} ${METRIC_UNITS[metric]}`, METRIC_LABELS[metric]]
                              return [formatPlural(normalizedValue, METRIC_FORMS[metric]), METRIC_LABELS[metric]]
                            }}
                            labelFormatter={(label) => {
                              const date = new Date(label)
                              if (Number.isNaN(date.getTime())) return `Час: ${label}`
                              const hh = String(date.getHours()).padStart(2, '0')
                              const mm = String(date.getMinutes()).padStart(2, '0')
                              const dd = date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
                              return `${dd}, ${hh}:${mm}`
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey={metric}
                            stroke="var(--accent)"
                            strokeWidth={2.4}
                            fill="url(#overviewAreaFill)"
                            dot={false}
                            activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--bg-1)', strokeWidth: 2 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </>
            )}

            {tab === 'cluster' && cluster && (
              <>
                <div className="so-block-title">Сервери проєкту · {cluster.name}</div>
                <div className="so-section">
                  {cluster.description && <p className="so-text" style={{ marginBottom: 16 }}>{cluster.description}</p>}
                  {cluster.servers.map((server) => (
                    <Link key={server.id} href={`/servers/${server.id}`} className="project-cluster">
                      <div className="ic">{server.platform === 'discord' ? 'DS' : 'MC'}</div>
                      <div style={{flex:1, minWidth: 0}}>
                        <b>{server.name}</b>
                        <div style={{ color: 'var(--fg-3)', fontSize: 11 }}>{server.addr}</div>
                      </div>
                      <span className={server.online ? 'pc-on' : ''}>{server.online ? '● онлайн' : '○ офлайн'}</span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          <aside className="so-side">
            <div className="so-widget">
              <h4>Інформація</h4>
              <div className="so-ip-box">
                <span className="ip">{s.addr}</span>
                <button className="btn btn-secondary" style={{height:28,fontSize:12}} onClick={()=>copy(isDiscord ? buildDiscordInviteUrl(s.addr) : s.addr)}>
                  {copied ? '✓ Скопійовано' : 'Копіювати'}
                </button>
              </div>
              <div className="so-info-list">
                <div className="so-info-row"><span>{getOnlineCountLabel(s)}</span><b>{liveInfo.players.toLocaleString('uk-UA')}</b></div>
                {!isDiscord && <div className="so-info-row"><span>Версія</span><b>{s.ver}</b></div>}
                {!isDiscord && <div className="so-info-row"><span>Ядро</span><b>{s.core || 'java'}</b></div>}
                <div className="so-info-row"><span>{isDiscord ? 'Категорія' : 'Режим'}</span><b>{s.mode}</b></div>
                {s.country && <div className="so-info-row"><span>Країна</span><b>{s.country}</b></div>}
              </div>
              <div className="so-mini-stats">
                {statsData.map((item) => (
                  <div key={item.label} className="so-mini-stat">
                    <div className="lbl">{item.label}</div>
                    <div className="val">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {isDiscord && canEdit && !s.discordBotVerified && s.discordVerifyCode && (
              <div className="so-widget" style={{ borderColor: 'rgba(88,101,242,0.35)' }}>
                <h4>Верифікація Discord-ботом</h4>
                <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6, marginBottom: 12 }}>
                  Додайте бота на сервер і виконайте команду <code>/link</code> з кодом нижче для точного моніторингу онлайну.
                </p>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: 2,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'var(--bg-2)',
                  border: '1px solid var(--line)',
                  marginBottom: 12,
                  textAlign: 'center',
                }}>
                  {s.discordVerifyCode}
                </div>
                {botInviteUrl && (
                  <a href={botInviteUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}>
                    Додати бота на сервер
                  </a>
                )}
                <p style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                  У Discord: <code>/link {s.discordVerifyCode}</code>
                </p>
              </div>
            )}

            {isDiscord && s.discordBotVerified && (
              <div className="so-widget" style={{ borderColor: 'rgba(52,211,153,0.35)' }}>
                <h4 style={{ color: 'var(--green)' }}>✓ Бот підключено</h4>
                <p style={{ fontSize: 13, color: 'var(--fg-2)', margin: 0 }}>
                  Моніторинг оновлюється через Discord-бота кожну хвилину.
                </p>
              </div>
            )}

            <div className="so-widget">
              <h4>Власник</h4>
              <Link href={ownerHandle ? `/profile/${ownerHandle}` : '/profile'} className="so-owner">
                <div
                  className="av"
                  style={s.ownerAvatarUrl ? {
                    backgroundImage: `url(${JSON.stringify(s.ownerAvatarUrl).slice(1, -1)})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    color: 'transparent',
                  } : undefined}
                >
                  {s.ownerAvatarUrl ? '' : (s.ownerName || 'U').slice(0, 1).toUpperCase()}
                </div>
                <div className="info">
                  <b>{s.ownerName || 'Невідомо'}</b>
                  <span>{ownerHandle ? `@${ownerHandle}` : 'Натисни для переходу в профіль'}</span>
                </div>
              </Link>
            </div>

            <div className="so-widget">
              <h4>Посилання</h4>
              <div className="so-links">
                {s.website && <a href={s.website} target="_blank" rel="noreferrer" className="so-link-pill website">Вебсайт</a>}
                {s.discord && <a href={s.discord} target="_blank" rel="noreferrer" className="so-link-pill discord">Discord</a>}
                {s.telegram && <a href={s.telegram} target="_blank" rel="noreferrer" className="so-link-pill telegram">Telegram</a>}
                {s.donate && <a href={s.donate} target="_blank" rel="noreferrer" className="so-link-pill donate">Донат</a>}
                {s.tiktok && <a href={s.tiktok} target="_blank" rel="noreferrer" className="so-link-pill tiktok">TikTok</a>}
                {!s.website && !s.discord && !s.telegram && !s.donate && !s.tiktok && <span className="so-empty">Посилання ще не додані.</span>}
              </div>
            </div>
            <div className="so-widget so-vote-widget">
              <h4>Голосувати за сервер</h4>
              <div className="so-vote-form">
                <input
                  className="so-vote-input"
                  type="text"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  disabled={!canVote}
                  placeholder="Нікнейм у Minecraft"
                />
                <button className="btn btn-primary so-vote-submit" type="button" onClick={handleVote} disabled={!canVote}>
                  {Icons.pulse} Голосувати
                </button>
                {!canVote && (
                  <div className="so-vote-feedback">
                    Увійдіть в акаунт, щоб голосувати за сервер. <Link href="/login">Увійти</Link>
                  </div>
                )}
                {voteMessage && <div className="so-vote-feedback">{voteMessage}</div>}
                {lastVoteAt && <div className="so-vote-meta">Останній голос: {lastVoteAt}</div>}
              </div>
              <div className="so-voters-block">
                <div className="so-voters-title">Топ голосувальників</div>
                <div className="so-voters-list">
                  {topVoters.map((user) => (
                    <div key={`top-${user.nickname}-${user.id}`} className="so-voter-item">
                      <div className="so-voter-avatar" style={{ backgroundImage: `url(https://mc-heads.net/avatar/${encodeURIComponent(user.nickname)}/64)`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                      <div className="so-voter-info">
                        <b>{user.nickname}</b>
                        <span>{formatPlural(user.voteCount, ['голос', 'голоси', 'голосів'])}</span>
                      </div>
                      <div className="so-voter-date">{new Date(user.createdAt).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="so-voters-block">
                <div className="so-voters-title">Останні 10 голосувальників</div>
                <div className="so-voters-list">
                  {latestVoters.map((user, index) => (
                    <div key={`last-${user.nickname}-${index}`} className="so-voter-item">
                      <div className="so-voter-avatar" style={{ backgroundImage: `url(https://mc-heads.net/avatar/${encodeURIComponent(user.nickname)}/64)`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                      <div className="so-voter-info">
                        <b>{user.nickname}</b>
                        <span>Голос зараховано</span>
                      </div>
                      <div className="so-voter-date">{new Date(user.createdAt).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {previewImage && (
        <div className="modal-backdrop is-open" onClick={() => setPreviewImage(null)}>
          <div className="modal-card is-open so-preview-card" onClick={(event) => event.stopPropagation()}>
            <div className="so-preview-head">
              <button className="btn btn-secondary" onClick={() => setPreviewImage(null)}>Закрити</button>
            </div>
            <img src={previewImage} alt="Перегляд зображення" className="so-preview-image" />
          </div>
        </div>
      )}
    </PageShell>
  );
}
