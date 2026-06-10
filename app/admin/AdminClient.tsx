'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import type { AuthUser } from '@/lib/auth-db'
import type { AdminStatsRow, AdminUserRow, ServerApplication, ServerApplicationStatus } from '@/lib/auth-db'
import type { Server } from '@/lib/types'
import type { NewsPost } from '@/lib/auth-db'

type Tab = 'overview' | 'users' | 'servers' | 'news' | 'applications'

type AdminClientProps = {
  initialUser: AuthUser
  initialStats: AdminStatsRow
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'var(--accent)',
  OWNER: 'var(--accent-2)',
  USER: 'var(--fg-3)',
}

const ROLE_OPTIONS = ['USER', 'OWNER', 'ADMIN'] as const

const formatDate = (iso: string): string => {
  const date = new Date(iso)
  return date.toLocaleDateString('uk-UA', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Stat card ───────────────────────────────────────────────────────────────

type StatCardProps = {
  label: string
  value: number
  color?: string
  icon: string
}

const StatCard = ({ label, value, color = 'var(--accent)', icon }: StatCardProps) => (
  <div className="set-card" style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
    <div style={{
      width: 44, height: 44, borderRadius: 10,
      background: `color-mix(in oklab, ${color} 15%, transparent)`,
      border: `1px solid color-mix(in oklab, ${color} 30%, transparent)`,
      display: 'grid', placeItems: 'center', fontSize: 20, flexShrink: 0,
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 3 }}>{label}</div>
    </div>
  </div>
)

// ── Overview tab ────────────────────────────────────────────────────────────

const OverviewTab = ({ stats }: { stats: AdminStatsRow }) => (
  <div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
      <StatCard label="Користувачів" value={stats.totalUsers} color="var(--accent)" icon="👤" />
      <StatCard label="Серверів" value={stats.totalServers} color="var(--accent-2)" icon="🖥️" />
      <StatCard label="Новин" value={stats.totalNews} color="var(--accent-3)" icon="📰" />
      <StatCard label="Активних сесій" value={stats.activeSessions} color="var(--green)" icon="🔐" />
      <StatCard label="Відгуків" value={stats.totalReviews} color="var(--amber)" icon="⭐" />
      <StatCard label="Голосів" value={stats.totalVotes} color="var(--red)" icon="🗳️" />
    </div>
    <div className="set-card">
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: 'var(--fg-1)' }}>Швидкі посилання</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <a href="/dashboard" className="btn btn-secondary" style={{ fontSize: 13 }}>Dashboard</a>
        <a href="/servers" className="btn btn-secondary" style={{ fontSize: 13 }}>Сервери</a>
        <a href="/news" className="btn btn-secondary" style={{ fontSize: 13 }}>Новини</a>
        <a href="/forum" className="btn btn-secondary" style={{ fontSize: 13 }}>Форум</a>
        <a href="/dashboard/developers" className="btn btn-secondary" style={{ fontSize: 13 }}>API Hub</a>
      </div>
    </div>
  </div>
)

// ── Users tab ───────────────────────────────────────────────────────────────

const UsersTab = ({ currentUserId }: { currentUserId: string }) => {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    const data = await res.json() as AdminUserRow[]
    setUsers(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleRoleChange = async (userId: string, role: string) => {
    setUpdatingId(userId)
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u))
    setUpdatingId(null)
  }

  const handleDelete = async (userId: string) => {
    setDeletingId(userId)
    await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    setUsers((prev) => prev.filter((u) => u.id !== userId))
    setDeletingId(null)
    setConfirmDelete(null)
  }

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.fullName.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="set-card" style={{ color: 'var(--fg-3)' }}>Завантаження...</div>

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <input
          className="btn btn-secondary"
          style={{ flex: 1, maxWidth: 320, textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 13 }}
          placeholder="Пошук по email / імені…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search users"
        />
        <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{filtered.length} / {users.length}</span>
      </div>
      <div className="set-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['Користувач', 'Email', 'Роль', 'Дата', 'Дії'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--line-2)' }}>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, overflow: 'hidden',
                      background: 'var(--bg-3)', flexShrink: 0, display: 'grid', placeItems: 'center',
                      fontSize: 11, fontWeight: 700, color: 'var(--fg-3)',
                      ...(u.avatarUrl ? { backgroundImage: `url(${JSON.stringify(u.avatarUrl)})`, backgroundSize: 'cover' } : {}),
                    }}>
                      {!u.avatarUrl && u.fullName.slice(0, 1).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 500 }}>{u.fullName}</span>
                    {u.id === currentUserId && (
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'color-mix(in oklab, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>ви</span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', fontSize: 12 }}>{u.email}</td>
                <td style={{ padding: '10px 16px' }}>
                  <select
                    value={u.role}
                    disabled={updatingId === u.id}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    aria-label={`Role for ${u.email}`}
                    style={{
                      background: 'var(--bg-3)', border: '1px solid var(--line)',
                      borderRadius: 6, padding: '4px 8px', fontSize: 12,
                      color: ROLE_COLORS[u.role] ?? 'var(--fg)',
                      cursor: 'pointer', fontWeight: 600,
                    }}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '10px 16px', color: 'var(--fg-3)', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(u.createdAt)}</td>
                <td style={{ padding: '10px 16px' }}>
                  {u.id !== currentUserId && (
                    confirmDelete === u.id ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>Видалити?</span>
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: 11, padding: '3px 8px', color: 'var(--red)', borderColor: 'color-mix(in oklab, var(--red) 30%, transparent)' }}
                          onClick={() => handleDelete(u.id)}
                          disabled={deletingId === u.id}
                        >
                          {deletingId === u.id ? '…' : 'Так'}
                        </button>
                        <button className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setConfirmDelete(null)}>Ні</button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: 11, padding: '3px 10px', color: 'var(--red)' }}
                        onClick={() => setConfirmDelete(u.id)}
                      >
                        Видалити
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--fg-3)' }}>Нічого не знайдено</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Servers tab ─────────────────────────────────────────────────────────────

const ServersTab = () => {
  const [servers, setServers] = useState<Server[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const fetchServers = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/servers')
    const data = await res.json() as Server[]
    setServers(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchServers() }, [fetchServers])

  const handleToggleVerify = async (serverId: number, current: boolean) => {
    setTogglingId(serverId)
    await fetch(`/api/admin/servers/${serverId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verified: !current }),
    })
    setServers((prev) => prev.map((s) => s.seed === serverId ? { ...s, verified: !current } : s))
    setTogglingId(null)
  }

  const handleDelete = async (serverId: number) => {
    setDeletingId(serverId)
    await fetch(`/api/admin/servers/${serverId}`, { method: 'DELETE' })
    setServers((prev) => prev.filter((s) => s.seed !== serverId))
    setDeletingId(null)
    setConfirmDelete(null)
  }

  const filtered = servers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.addr.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="set-card" style={{ color: 'var(--fg-3)' }}>Завантаження...</div>

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <input
          className="btn btn-secondary"
          style={{ flex: 1, maxWidth: 320, textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 13 }}
          placeholder="Пошук по назві / адресі…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search servers"
        />
        <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{filtered.length} / {servers.length}</span>
      </div>
      <div className="set-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['Сервер', 'Адреса', 'Власник', 'Онлайн', 'Верифікація', 'Дії'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.seed} style={{ borderBottom: '1px solid var(--line-2)' }}>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {s.avatarUrl && (
                      <div style={{ width: 28, height: 28, borderRadius: 6, overflow: 'hidden', flexShrink: 0, backgroundImage: `url(${JSON.stringify(s.avatarUrl)})`, backgroundSize: 'cover' }} />
                    )}
                    <span style={{ fontWeight: 500 }}>{s.name}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', color: 'var(--fg-2)', fontSize: 12 }}>{s.addr}</td>
                <td style={{ padding: '10px 16px', color: 'var(--fg-2)', fontSize: 12 }}>{s.ownerName}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ color: s.on ? 'var(--green)' : 'var(--fg-3)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {s.players}/{s.max}
                  </span>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <button
                    className="btn btn-secondary"
                    style={{
                      fontSize: 11, padding: '3px 10px',
                      color: s.verified ? 'var(--green)' : 'var(--fg-3)',
                      borderColor: s.verified ? 'color-mix(in oklab, var(--green) 30%, transparent)' : undefined,
                    }}
                    disabled={togglingId === s.seed}
                    onClick={() => handleToggleVerify(s.seed, s.verified)}
                  >
                    {togglingId === s.seed ? '…' : s.verified ? '✓ Верифіковано' : '○ Верифікувати'}
                  </button>
                </td>
                <td style={{ padding: '10px 16px' }}>
                  {confirmDelete === s.seed ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>Видалити?</span>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: 11, padding: '3px 8px', color: 'var(--red)', borderColor: 'color-mix(in oklab, var(--red) 30%, transparent)' }}
                        onClick={() => handleDelete(s.seed)}
                        disabled={deletingId === s.seed}
                      >
                        {deletingId === s.seed ? '…' : 'Так'}
                      </button>
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setConfirmDelete(null)}>Ні</button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: 11, padding: '3px 10px', color: 'var(--red)' }}
                      onClick={() => setConfirmDelete(s.seed)}
                    >
                      Видалити
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--fg-3)' }}>Нічого не знайдено</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── News tab ─────────────────────────────────────────────────────────────────

const NewsTab = () => {
  const [posts, setPosts] = useState<NewsPost[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const fetchNews = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/news')
    const data = await res.json() as NewsPost[]
    setPosts(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchNews() }, [fetchNews])

  const handleDelete = async (newsId: number) => {
    setDeletingId(newsId)
    await fetch(`/api/admin/news/${newsId}`, { method: 'DELETE' })
    setPosts((prev) => prev.filter((p) => p.id !== newsId))
    setDeletingId(null)
    setConfirmDelete(null)
  }

  if (loading) return <div className="set-card" style={{ color: 'var(--fg-3)' }}>Завантаження...</div>

  return (
    <div className="set-card" style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--line)' }}>
            {['Заголовок', 'Категорія', 'Автор', 'Дата', 'Дії'].map((h) => (
              <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid var(--line-2)' }}>
              <td style={{ padding: '10px 16px' }}>
                <a href={`/news/${p.id}`} style={{ color: 'var(--fg-1)', fontWeight: 500, textDecoration: 'none' }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.color = 'var(--accent)' }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.color = 'var(--fg-1)' }}
                >
                  {p.title}
                </a>
              </td>
              <td style={{ padding: '10px 16px' }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-3)', color: 'var(--fg-2)' }}>{p.category}</span>
              </td>
              <td style={{ padding: '10px 16px', color: 'var(--fg-2)', fontSize: 12 }}>{p.authorName}</td>
              <td style={{ padding: '10px 16px', color: 'var(--fg-3)', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(p.createdAt)}</td>
              <td style={{ padding: '10px 16px' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <a href={`/news/${p.id}/edit`} className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 10px' }}>Редагувати</a>
                  {confirmDelete === p.id ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: 11, padding: '3px 8px', color: 'var(--red)', borderColor: 'color-mix(in oklab, var(--red) 30%, transparent)' }}
                        onClick={() => handleDelete(p.id)}
                        disabled={deletingId === p.id}
                      >
                        {deletingId === p.id ? '…' : 'Так'}
                      </button>
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setConfirmDelete(null)}>Ні</button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: 11, padding: '3px 10px', color: 'var(--red)' }}
                      onClick={() => setConfirmDelete(p.id)}
                    >
                      Видалити
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {posts.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--fg-3)' }}>Немає новин</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── Root ─────────────────────────────────────────────────────────────────────

// ── Applications tab ────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ServerApplicationStatus, string> = {
  pending: 'Очікує',
  approved: 'Схвалено',
  rejected: 'Відхилено',
}

const STATUS_COLORS: Record<ServerApplicationStatus, string> = {
  pending: 'var(--amber)',
  approved: 'var(--green)',
  rejected: 'var(--red)',
}

const ApplicationsTab = ({ onPendingCountChange }: { onPendingCountChange: (count: number) => void }) => {
  const [apps, setApps] = useState<ServerApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<ServerApplicationStatus | 'all'>('pending')
  const [actionId, setActionId] = useState<number | null>(null)
  const [rejectTarget, setRejectTarget] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')

  const fetchApps = useCallback(async (filter: ServerApplicationStatus | 'all') => {
    setLoading(true)
    const url = filter === 'all' ? '/api/admin/applications' : `/api/admin/applications?status=${filter}`
    const res = await fetch(url)
    const data = await res.json() as ServerApplication[]
    setApps(data)
    setLoading(false)
    const pendingCount = filter === 'pending' ? data.length : data.filter((a) => a.status === 'pending').length
    onPendingCountChange(pendingCount)
  }, [onPendingCountChange])

  useEffect(() => { fetchApps(statusFilter) }, [fetchApps, statusFilter])

  const handleApprove = async (id: number) => {
    setActionId(id)
    setActionError('')
    try {
      const response = await fetch(`/api/admin/applications/${id}/approve`, { method: 'POST' })
      const payload = await response.json() as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || 'Не вдалося схвалити заявку')
      }
      setApps((prev) => prev.map((a) => a.id === id ? { ...a, status: 'approved' as ServerApplicationStatus } : a))
      onPendingCountChange(apps.filter((a) => a.status === 'pending' && a.id !== id).length)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Не вдалося схвалити заявку')
    } finally {
      setActionId(null)
    }
  }

  const handleReject = async (id: number) => {
    setActionId(id)
    setActionError('')
    try {
      const response = await fetch(`/api/admin/applications/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() || undefined }),
      })
      const payload = await response.json() as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || 'Не вдалося відхилити заявку')
      }
      setApps((prev) => prev.map((a) => a.id === id ? { ...a, status: 'rejected' as ServerApplicationStatus, rejectionReason: rejectReason.trim() || null } : a))
      setRejectTarget(null)
      setRejectReason('')
      onPendingCountChange(apps.filter((a) => a.status === 'pending' && a.id !== id).length)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Не вдалося відхилити заявку')
    } finally {
      setActionId(null)
    }
  }

  const visibleApps = statusFilter === 'all' ? apps : apps.filter((a) => a.status === statusFilter)

  if (loading) return <div className="set-card" style={{ color: 'var(--fg-3)' }}>Завантаження...</div>

  return (
    <div>
      {actionError && (
        <div className="auth-feedback auth-feedback-error" role="alert" style={{ marginBottom: 16 }}>
          {actionError}
        </div>
      )}
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
          <button
            key={s}
            className="btn btn-secondary"
            aria-label={s}
            style={{
              fontSize: 12, padding: '4px 14px',
              color: statusFilter === s ? 'var(--accent)' : 'var(--fg-3)',
              borderColor: statusFilter === s ? 'color-mix(in oklab, var(--accent) 40%, transparent)' : undefined,
            }}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'Усі' : STATUS_LABELS[s]}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--fg-3)', alignSelf: 'center' }}>{visibleApps.length} заявок</span>
      </div>

      {visibleApps.length === 0 && (
        <div className="set-card" style={{ textAlign: 'center', color: 'var(--fg-3)', padding: '32px 16px' }}>
          {statusFilter === 'pending' ? 'Нових заявок немає' : 'Заявок не знайдено'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visibleApps.map((app) => (
          <div key={app.id} className="set-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer' }}
              onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
              tabIndex={0}
              aria-label={`Toggle details for ${app.name}`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpandedId(expandedId === app.id ? null : app.id) }}
            >
              {app.avatarUrl && (
                <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, backgroundImage: `url(${JSON.stringify(app.avatarUrl)})`, backgroundSize: 'cover' }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{app.name}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{app.addr}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                  <span style={{ fontWeight: 500, color: 'var(--fg-2)' }}>{app.ownerName}</span>
                  {' · '}{formatDate(app.createdAt)}
                </div>
                <span style={{
                  fontSize: 11, padding: '3px 8px', borderRadius: 4, fontWeight: 600,
                  background: `color-mix(in oklab, ${STATUS_COLORS[app.status]} 12%, transparent)`,
                  color: STATUS_COLORS[app.status],
                  border: `1px solid color-mix(in oklab, ${STATUS_COLORS[app.status]} 25%, transparent)`,
                }}>
                  {STATUS_LABELS[app.status]}
                </span>
                <span style={{ color: 'var(--fg-3)', fontSize: 13 }}>{expandedId === app.id ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* Expanded details */}
            {expandedId === app.id && (
              <div style={{ borderTop: '1px solid var(--line)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, fontSize: 12 }}>
                  {[
                    ['Режим', app.mode],
                    ['Версія', app.ver],
                    ['Ядро', app.core],
                    ['Країна', app.country || '—'],
                    ['Discord', app.discord || '—'],
                    ['Telegram', app.telegram || '—'],
                    ['Теги', app.tags.join(', ') || '—'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div style={{ color: 'var(--fg-3)', marginBottom: 2 }}>{label}</div>
                      <div style={{ color: 'var(--fg-1)', fontWeight: 500 }}>{value}</div>
                    </div>
                  ))}
                </div>
                {app.shortDesc && (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 4 }}>MOTD / короткий опис</div>
                    <div style={{ fontSize: 13, color: 'var(--fg-1)' }}>{app.shortDesc}</div>
                  </div>
                )}
                {app.rejectionReason && (
                  <div style={{ padding: '8px 12px', borderRadius: 6, background: 'color-mix(in oklab, var(--red) 8%, transparent)', border: '1px solid color-mix(in oklab, var(--red) 20%, transparent)', fontSize: 12 }}>
                    <span style={{ color: 'var(--red)', fontWeight: 600 }}>Причина відхилення: </span>
                    <span style={{ color: 'var(--fg-2)' }}>{app.rejectionReason}</span>
                  </div>
                )}

                {/* Actions */}
                {app.status === 'pending' && (
                  rejectTarget === app.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea
                        rows={2}
                        placeholder="Причина відхилення (опційно)…"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        aria-label="Rejection reason"
                        style={{
                          background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 6,
                          padding: '8px 10px', fontSize: 13, color: 'var(--fg)', resize: 'none', width: '100%',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-secondary"
                          style={{ color: 'var(--red)', borderColor: 'color-mix(in oklab, var(--red) 30%, transparent)', fontSize: 12 }}
                          disabled={actionId === app.id}
                          onClick={() => handleReject(app.id)}
                        >
                          {actionId === app.id ? '…' : 'Підтвердити відхилення'}
                        </button>
                        <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => { setRejectTarget(null); setRejectReason('') }}>Скасувати</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: 12, padding: '6px 16px' }}
                        disabled={actionId === app.id}
                        onClick={() => handleApprove(app.id)}
                      >
                        {actionId === app.id ? '…' : '✓ Схвалити'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: 12, padding: '6px 16px', color: 'var(--red)' }}
                        onClick={() => setRejectTarget(app.id)}
                      >
                        ✕ Відхилити
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Огляд', icon: '◈' },
  { key: 'users', label: 'Користувачі', icon: '👤' },
  { key: 'servers', label: 'Сервери', icon: '🖥️' },
  { key: 'news', label: 'Новини', icon: '📰' },
  { key: 'applications', label: 'Заявки', icon: '📋' },
]

export const AdminClient = ({ initialUser, initialStats }: AdminClientProps) => {
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<AdminStatsRow>(initialStats)
  const [pendingAppsCount, setPendingAppsCount] = useState(0)

  const refreshStats = useCallback(async () => {
    const res = await fetch('/api/admin/stats')
    const data = await res.json() as AdminStatsRow
    setStats(data)
  }, [])

  useEffect(() => {
    if (tab === 'overview') refreshStats()
  }, [tab, refreshStats])

  return (
    <PageShell active="admin" initialUser={initialUser} hiddenKeys={['notifications']}>
      <div className="page-main">
        <div className="page-topbar">
          <div>
            <div className="page-crumb">admin / панель керування</div>
            <h1 className="page-title">Адмін панель</h1>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: 'color-mix(in oklab, var(--accent) 15%, transparent)',
              border: '1px solid color-mix(in oklab, var(--accent) 30%, transparent)',
              color: 'var(--accent)',
            }}>
              SUPER ADMIN
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--line)', paddingBottom: 0 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-label={t.label}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 16px', fontSize: 13, fontWeight: 500,
                color: tab === t.key ? 'var(--accent)' : 'var(--fg-3)',
                borderBottom: `2px solid ${tab === t.key ? 'var(--accent)' : 'transparent'}`,
                marginBottom: -1, display: 'flex', alignItems: 'center', gap: 7,
                transition: 'color 0.15s',
              }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.key === 'applications' && pendingAppsCount > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, borderRadius: 9,
                  background: 'var(--amber)', color: '#000', display: 'grid', placeItems: 'center', padding: '0 5px',
                }}>
                  {pendingAppsCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'overview' && <OverviewTab stats={stats} />}
        {tab === 'users' && <UsersTab currentUserId={initialUser.id} />}
        {tab === 'servers' && <ServersTab />}
        {tab === 'news' && <NewsTab />}
        {tab === 'applications' && <ApplicationsTab onPendingCountChange={setPendingAppsCount} />}
      </div>
    </PageShell>
  )
}
