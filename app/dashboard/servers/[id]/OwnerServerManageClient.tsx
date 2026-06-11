'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import { PageShell } from '@/components/layout/PageShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import type { AuthUser, ServerReview, ServerVoteEntry, UserRole } from '@/lib/auth-db'

interface OwnerServerManageClientProps {
  initialUser: AuthUser
  role: UserRole
  serverId: number
}

type ServerData = {
  seed: number
  name: string
  desc: string
  addr: string
  mode: string
  verified: boolean
  gallery?: string[]
  videos?: string[]
}

type StatsResponse = {
  summary: {
    views: number
    votes: number
    reviews: number
    averageRating: number
  }
  charts: {
    views: Array<{ date: string; value: number }>
    votes: Array<{ date: string; value: number }>
  }
}

type ActivityResponse = {
  latestVotes: ServerVoteEntry[]
  latestReviews: ServerReview[]
  geolocation: Array<{
    countryCode: string
    visitors: number
  }>
}

type ManageChartTooltipProps = {
  active?: boolean
  payload?: ReadonlyArray<{ dataKey?: string | number | ((obj: unknown) => unknown); value?: unknown }>
  label?: string | number
}

export function OwnerServerManageClient({ initialUser, role, serverId }: OwnerServerManageClientProps) {
  const router = useRouter()
  const [server, setServer] = useState<ServerData | null>(null)
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [activity, setActivity] = useState<ActivityResponse | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      const [serverResponse, statsResponse, activityResponse] = await Promise.all([
        fetch(`/api/servers/${serverId}`, { cache: 'no-store' }),
        fetch(`/api/server/${serverId}/stats?days=7`, { cache: 'no-store' }),
        fetch(`/api/server/${serverId}/activity?limit=20`, { cache: 'no-store' }),
      ])
      if (serverResponse.ok) {
        const serverPayload = await serverResponse.json() as ServerData
        if (isMounted) {
          setServer(serverPayload)
        }
      }
      if (statsResponse.ok) {
        const statsPayload = await statsResponse.json() as StatsResponse
        if (isMounted) {
          setStats(statsPayload)
        }
      }
      if (activityResponse.ok) {
        const activityPayload = await activityResponse.json() as ActivityResponse
        if (isMounted) {
          setActivity(activityPayload)
        }
      }
    }
    void loadData()
    const intervalId = window.setInterval(() => {
      void loadData()
    }, 5000)
    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [serverId])

  const chartData = useMemo(() => {
    if (!stats) {
      return []
    }
    return stats.charts.views.map((item, index) => ({
      date: item.date,
      views: item.value,
      votes: Number(stats.charts.votes[index]?.value || 0),
    }))
  }, [stats])

  const handleDeleteServer = async () => {
    if (!server) {
      return
    }
    const shouldDelete = window.confirm(`Delete "${server.name}"? This action cannot be undone.`)
    if (!shouldDelete) {
      return
    }
    setIsDeleting(true)
    const response = await fetch(`/api/server/${server.seed}`, { method: 'DELETE' })
    setIsDeleting(false)
    if (!response.ok) {
      window.alert('Failed to delete server')
      return
    }
    router.push('/dashboard?tab=servers')
    router.refresh()
  }

  const handleDeleteReview = async (reviewId: number) => {
    const shouldDelete = window.confirm('Delete this review?')
    if (!shouldDelete) {
      return
    }
    const response = await fetch(`/api/server/${serverId}/activity?reviewId=${reviewId}`, { method: 'DELETE' })
    if (!response.ok) {
      window.alert('Failed to delete review')
      return
    }
    setActivity((current) => {
      if (!current) {
        return current
      }
      return {
        ...current,
        latestReviews: current.latestReviews.filter((review) => review.id !== reviewId),
      }
    })
  }

  return (
    <PageShell active="my-servers" initialUser={initialUser} sidebarRole={role}>
      <div className="page-main">
        <div className="page-topbar">
          <div>
            <Breadcrumbs items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Мої сервери', href: '/dashboard?tab=servers' },
              { label: server?.name || 'Деталі' },
            ]} />
            <h1 className="page-title">
              {server ? server.name : 'Server Details'}
              {server && (
                <span
                  className={`verify-badge ${server.verified ? 'verify-badge--verified' : 'verify-badge--unverified'}`}
                  style={{ marginLeft: 10, fontSize: 11 }}
                >
                  {server.verified ? '✓ Верифіковано' : '○ Не верифіковано'}
                </span>
              )}
            </h1>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {server && !server.verified && (
              <Link href={`/dashboard/servers/${server.seed}/verify`} className="btn btn-primary">
                Верифікувати сервер
              </Link>
            )}
            {server && <Link href={`/dashboard/servers/${server.seed}/edit`} className="btn btn-secondary">Редагувати</Link>}
            <button type="button" className="btn btn-secondary" disabled={isDeleting} onClick={() => void handleDeleteServer()}>
              {isDeleting ? 'Видалення...' : 'Видалити'}
            </button>
          </div>
        </div>
        {stats && (
          <section className="dashboard-grid">
            <div className="set-card">
              <h3>Views</h3>
              <p className="dashboard-metric">{stats.summary.views.toLocaleString()}</p>
            </div>
            <div className="set-card">
              <h3>Votes</h3>
              <p className="dashboard-metric">{stats.summary.votes.toLocaleString()}</p>
            </div>
            <div className="set-card">
              <h3>Reviews</h3>
              <p className="dashboard-metric">{stats.summary.reviews.toLocaleString()}</p>
            </div>
            <div className="set-card">
              <h3>Average Rating</h3>
              <p className="dashboard-metric">{stats.summary.averageRating > 0 ? `${stats.summary.averageRating.toFixed(2)}★` : '—'}</p>
            </div>
          </section>
        )}
        <section className="set-card">
          <h3>Активність по годинах · останні 7 днів</h3>
          {chartData.length === 0 && <p className="dashboard-empty">No analytics data available yet.</p>}
          {chartData.length > 0 && (
            <div className="dashboard-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 2 }}>
                  <defs>
                    <linearGradient id="viewsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 4" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--fg-3)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value: string) => new Date(value).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit' })}
                    minTickGap={28}
                  />
                  <YAxis tick={{ fill: 'var(--fg-3)', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip
                    content={(props: ManageChartTooltipProps) => <ManageChartTooltip {...props} />}
                    cursor={{ stroke: 'var(--accent)', strokeDasharray: '4 4', strokeWidth: 1.2 }}
                    wrapperStyle={{ outline: 'none' }}
                  />
                  <Area type="monotone" dataKey="views" stroke="var(--accent)" fill="url(#viewsAreaGradient)" strokeWidth={2} />
                  <Area type="monotone" dataKey="votes" stroke="#4ade80" fill="transparent" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        <section className="dashboard-grid">
          <div className="set-card">
            <h3>Latest Votes</h3>
            {!activity || activity.latestVotes.length === 0 ? (
              <p className="dashboard-empty">No votes recorded yet.</p>
            ) : (
              <div className="dashboard-feed">
                {activity.latestVotes.map((vote) => (
                  <article key={`${vote.id}-${vote.nickname}`} className="dashboard-feed-item">
                    <h4>{vote.nickname}</h4>
                    <p>Vote registered</p>
                    <span>{new Date(vote.createdAt).toLocaleString()}</span>
                  </article>
                ))}
              </div>
            )}
          </div>
          <div className="set-card">
            <h3>Геолокація відвідувачів</h3>
            {!activity || activity.geolocation.length === 0 ? (
              <p className="dashboard-empty">Геолокація відвідувачів ще не підключена.</p>
            ) : (
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Country</th>
                      <th>Visitors (30d)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.geolocation.map((row) => (
                      <tr key={row.countryCode}>
                        <td>{row.countryCode}</td>
                        <td>{row.visitors.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="set-card">
            <h3>Reviews Management</h3>
            {!activity || activity.latestReviews.length === 0 ? (
              <p className="dashboard-empty">No reviews available.</p>
            ) : (
              <div className="dashboard-feed">
                {activity.latestReviews.map((review) => (
                  <article key={review.id} className="dashboard-feed-item">
                    <div className="dashboard-section-head">
                      <h4>{review.authorName}</h4>
                      <button type="button" className="btn btn-secondary" onClick={() => void handleDeleteReview(review.id)}>
                        Delete
                      </button>
                    </div>
                    <p>{review.rating.toFixed(1)}★ · {review.text}</p>
                    <span>{new Date(review.updatedAt).toLocaleString()}</span>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  )
}

function ManageChartTooltip({ active, payload, label }: ManageChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }
  const views = Number(payload.find((item) => item.dataKey === 'views')?.value || 0)
  const votes = Number(payload.find((item) => item.dataKey === 'votes')?.value || 0)
  return (
    <div className="dashboard-tooltip">
      <div className="dashboard-tooltip-title">
        {label ? new Date(label).toLocaleString('uk-UA', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
      </div>
      <div className="dashboard-tooltip-row">
        <span>👁 Перегляди</span>
        <b>{views.toLocaleString('uk-UA')}</b>
      </div>
      <div className="dashboard-tooltip-row">
        <span>🗳 Голоси</span>
        <b>{votes.toLocaleString('uk-UA')}</b>
      </div>
    </div>
  )
}
