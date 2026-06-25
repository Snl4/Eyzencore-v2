'use client'

import Link from 'next/link'
import { useMemo, useState, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { PageShell } from '@/components/layout/PageShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { ProjectLogo } from '@/components/ui/ProjectLogo'
import type {
  AuthUser,
  OwnerDashboardPayload,
  OwnerNotification,
  OwnerServerListItem,
  Project,
  UserDashboardPayload,
  UserDashboardReview,
  UserDashboardVote,
  UserRole,
} from '@/lib/auth-db'

interface DashboardClientProps {
  initialUser: AuthUser
  initialRole: UserRole
}

type OwnerServerStatsResponse = {
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

type DashboardChartTooltipProps = {
  active?: boolean
  payload?: ReadonlyArray<{ dataKey?: string | number | ((obj: unknown) => unknown); value?: unknown; color?: string }>
  label?: string | number
}

export function DashboardClient({ initialUser, initialRole }: DashboardClientProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [userDashboard, setUserDashboard] = useState<UserDashboardPayload | null>(null)
  const [ownerDashboard, setOwnerDashboard] = useState<OwnerDashboardPayload | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedServerId, setSelectedServerId] = useState<number | null>(null)
  const [selectedServerStats, setSelectedServerStats] = useState<OwnerServerStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const role = ownerDashboard?.role || userDashboard?.role || initialRole
  const isOwner = role === 'OWNER' || role === 'ADMIN'
  const defaultTab = searchParams.get('tab') === 'servers' ? 'servers' : 'overview'
  const [ownerTab, setOwnerTab] = useState<'overview' | 'servers'>(defaultTab)

  useEffect(() => {
    let isMounted = true
    const loadDashboard = async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const userResponse = await fetch('/api/dashboard/user', { cache: 'no-store' })
        if (userResponse.ok) {
          const userPayload = await userResponse.json() as UserDashboardPayload
          if (isMounted) {
            setUserDashboard(userPayload)
          }
        }
        if (isOwner) {
          const [ownerResponse, projectsResponse] = await Promise.all([
            fetch('/api/dashboard/owner', { cache: 'no-store' }),
            fetch('/api/projects', { cache: 'no-store' }),
          ])
          if (ownerResponse.ok) {
            const ownerPayload = await ownerResponse.json() as OwnerDashboardPayload
            if (isMounted) {
              setOwnerDashboard(ownerPayload)
              if (ownerPayload.ownedServers.length > 0) {
                setSelectedServerId((current) => current || ownerPayload.ownedServers[0].serverId)
              }
            }
          }
          if (projectsResponse.ok) {
            const projectsPayload = await projectsResponse.json() as { projects: Project[] }
            if (isMounted) {
              setProjects(Array.isArray(projectsPayload.projects) ? projectsPayload.projects : [])
            }
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    void loadDashboard()
    const intervalId = window.setInterval(() => {
      void loadDashboard(true)
    }, 5000)
    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [isOwner])

  useEffect(() => {
    if (!isOwner || !selectedServerId) {
      return
    }
    let isMounted = true
    const loadOwnerServerStats = async () => {
      const response = await fetch(`/api/server/${selectedServerId}/stats?days=7`, { cache: 'no-store' })
      if (!response.ok) {
        return
      }
      const payload = await response.json() as OwnerServerStatsResponse
      if (isMounted) {
        setSelectedServerStats(payload)
      }
    }
    void loadOwnerServerStats()
    const intervalId = window.setInterval(() => {
      void loadOwnerServerStats()
    }, 5000)
    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [isOwner, selectedServerId])

  const activeServer = useMemo(() => {
    if (!ownerDashboard || !selectedServerId) {
      return null
    }
    return ownerDashboard.ownedServers.find((server) => server.serverId === selectedServerId) || null
  }, [ownerDashboard, selectedServerId])

  const activeSidebarItem = pathname.startsWith('/dashboard/servers') ? 'my-servers' : 'dashboard'

  return (
    <PageShell active={activeSidebarItem} initialUser={initialUser} sidebarRole={role}>
      <div className="page-main">
        <div className="page-topbar">
          <div>
            <Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Огляд' }]} />
            <h1 className="page-title">{isOwner ? 'Owner Dashboard' : 'User Dashboard'}</h1>
          </div>
        </div>
        {loading && <div className="set-card">Loading dashboard data...</div>}
        {!loading && userDashboard && (
          <>
            <UserProfileCard data={userDashboard} />
            <section className="dashboard-grid">
              <UserReviewsCard reviews={userDashboard.reviews} />
              <UserVotesCard votes={userDashboard.votes} />
            </section>
            {isOwner && ownerDashboard && (
              <section className="owner-dashboard-shell">
                <div className="owner-dashboard-tabs">
                  <button type="button" className={`btn btn-secondary${ownerTab === 'overview' ? ' active' : ''}`} onClick={() => setOwnerTab('overview')}>
                    Overview
                  </button>
                  <button type="button" className={`btn btn-secondary${ownerTab === 'servers' ? ' active' : ''}`} onClick={() => setOwnerTab('servers')}>
                    My Servers
                  </button>
                </div>
                {ownerTab === 'overview' && (
                  <>
                    <OwnerTotalsCard data={ownerDashboard} />
                    <OwnerNotificationsCard notifications={ownerDashboard.notifications} />
                  </>
                )}
                {ownerTab === 'servers' && (
                  <>
                    <OwnerServersCard
                      servers={ownerDashboard.ownedServers}
                      projects={projects}
                      selectedServerId={selectedServerId}
                      onSelectServer={setSelectedServerId}
                      onProjectsChange={setProjects}
                    />
                    {activeServer && (
                      <OwnerServerChartCard server={activeServer} stats={selectedServerStats} />
                    )}
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </PageShell>
  )
}

function UserProfileCard({ data }: { data: UserDashboardPayload }) {
  return (
    <section className="set-card dashboard-profile-card">
      <div>
        <h3>{data.profile.username}</h3>
        <p>@{data.profile.nickname}</p>
      </div>
      <div className="dashboard-profile-meta">
        <span>Email: {data.profile.email || 'Not provided'}</span>
        <span>Joined: {new Date(data.profile.joinedAt).toLocaleDateString()}</span>
        <span>Role: {data.role}</span>
      </div>
    </section>
  )
}

function UserReviewsCard({ reviews }: { reviews: UserDashboardReview[] }) {
  return (
    <section className="set-card">
      <h3>My Reviews</h3>
      {reviews.length === 0 && <p className="dashboard-empty">You have not posted reviews yet.</p>}
      {reviews.length > 0 && (
        <div className="dashboard-table-wrap">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Server</th>
                <th>Rating</th>
                <th>Review</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.id}>
                  <td>{review.serverName}</td>
                  <td>{review.rating.toFixed(1)}★</td>
                  <td>{review.text}</td>
                  <td>{new Date(review.updatedAt).toLocaleString()}</td>
                  <td>
                    <Link className="btn btn-secondary" href={`/servers/${review.serverId}`}>Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function UserVotesCard({ votes }: { votes: UserDashboardVote[] }) {
  return (
    <section className="set-card">
      <h3>My Votes</h3>
      {votes.length === 0 && <p className="dashboard-empty">No votes yet.</p>}
      {votes.length > 0 && (
        <div className="dashboard-table-wrap">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Server</th>
                <th>Last Vote</th>
                <th>Cooldown</th>
              </tr>
            </thead>
            <tbody>
              {votes.map((vote) => (
                <tr key={`${vote.serverId}-${vote.votedAt}`}>
                  <td>{vote.serverName}</td>
                  <td>{new Date(vote.votedAt).toLocaleString()}</td>
                  <td>
                    {vote.isCooldownActive ? `You can vote again in ${vote.cooldownRemainingHours} hour(s)` : 'Ready to vote'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function OwnerTotalsCard({ data }: { data: OwnerDashboardPayload }) {
  return (
    <section className="dashboard-grid">
      <div className="set-card">
        <h3>Total Servers</h3>
        <p className="dashboard-metric">{data.totals.servers.toLocaleString()}</p>
      </div>
      <div className="set-card">
        <h3>Total Views</h3>
        <p className="dashboard-metric">{data.totals.views.toLocaleString()}</p>
      </div>
      <div className="set-card">
        <h3>Total Votes</h3>
        <p className="dashboard-metric">{data.totals.votes.toLocaleString()}</p>
      </div>
      <div className="set-card">
        <h3>Average Rating</h3>
        <p className="dashboard-metric">{data.totals.averageRating > 0 ? `${data.totals.averageRating.toFixed(2)}★` : '-'}</p>
      </div>
    </section>
  )
}

function OwnerNotificationsCard({ notifications }: { notifications: OwnerNotification[] }) {
  return (
    <section className="set-card">
      <h3>Notifications</h3>
      {notifications.length === 0 && <p className="dashboard-empty">No notifications yet.</p>}
      {notifications.length > 0 && (
        <div className="dashboard-feed">
          {notifications.slice(0, 8).map((item) => (
            <article key={item.id} className="dashboard-feed-item">
              <h4>{item.title}</h4>
              <p>{item.body}</p>
              <span>{new Date(item.createdAt).toLocaleString()}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

type ProjectFormState = {
  name: string
  description: string
  logoUrl: string
  website: string
  discord: string
}

function OwnerServersCard(input: {
  servers: OwnerServerListItem[]
  projects: Project[]
  selectedServerId: number | null
  onSelectServer: (serverId: number) => void
  onProjectsChange: (projects: Project[]) => void
}) {
  const { servers, projects, selectedServerId, onSelectServer, onProjectsChange } = input
  const confirmAction = useConfirm()
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [projectForm, setProjectForm] = useState<ProjectFormState>({ name: '', description: '', logoUrl: '', website: '', discord: '' })
  const [isSavingProject, setIsSavingProject] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set(projects.map((p) => p.id)))

  const projectMap = useMemo(() => {
    const map = new Map<number, Project>()
    projects.forEach((p) => map.set(p.id, p))
    return map
  }, [projects])

  const groupedServers = useMemo(() => {
    const inProject = new Map<number, OwnerServerListItem[]>()
    const standalone: OwnerServerListItem[] = []
    servers.forEach((server) => {
      if (server.projectId && projectMap.has(server.projectId)) {
        const existing = inProject.get(server.projectId) || []
        inProject.set(server.projectId, [...existing, server])
      } else {
        standalone.push(server)
      }
    })
    return { inProject, standalone }
  }, [servers, projectMap])

  const toggleExpand = (projectId: number) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  const handleOpenCreateProject = () => {
    setEditingProject(null)
    setProjectForm({ name: '', description: '', logoUrl: '', website: '', discord: '' })
    setShowProjectModal(true)
  }

  const handleOpenEditProject = (project: Project) => {
    setEditingProject(project)
    setProjectForm({ name: project.name, description: project.description, logoUrl: project.logoUrl || '', website: project.website || '', discord: project.discord || '' })
    setShowProjectModal(true)
  }

  const handleSaveProject = async () => {
    if (!projectForm.name.trim()) return
    setIsSavingProject(true)
    const url = editingProject ? `/api/projects/${editingProject.id}` : '/api/projects'
    const method = editingProject ? 'PATCH' : 'POST'
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: projectForm.name.trim(), description: projectForm.description.trim(), logoUrl: projectForm.logoUrl || null, website: projectForm.website || null, discord: projectForm.discord || null }),
    })
    setIsSavingProject(false)
    if (!response.ok) return
    const data = (await response.json()) as { project?: Project }
    if (data.project) {
      if (editingProject) {
        onProjectsChange(projects.map((p) => (p.id === data.project!.id ? data.project! : p)))
      } else {
        onProjectsChange([data.project, ...projects])
        setExpandedProjects((prev) => new Set([...Array.from(prev), data.project!.id]))
      }
    }
    setShowProjectModal(false)
  }

  const handleDeleteProject = async (project: Project) => {
    const confirmed = await confirmAction({
      title: `Видалити проєкт «${project.name}»?`,
      description: 'Сервери залишаться на сайті, але будуть від’єднані від цього проєкту.',
      confirmLabel: 'Видалити проєкт',
    })
    if (!confirmed) return
    const response = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
    if (!response.ok) return
    onProjectsChange(projects.filter((p) => p.id !== project.id))
  }

  const serverTableHead = (
    <thead>
      <tr>
        <th>Сервер</th>
        <th>Статус</th>
        <th>Перегляди</th>
        <th>Голоси</th>
        <th>Рейтинг</th>
        <th>Дії</th>
      </tr>
    </thead>
  )

  const renderServerRow = (server: OwnerServerListItem, indented = false) => (
    <tr key={server.serverId} className={selectedServerId === server.serverId ? 'is-selected' : ''}>
      <td>
        <span style={{ paddingLeft: indented ? 16 : 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          {indented && <span style={{ color: 'var(--fg-3)', fontSize: 12 }}>└</span>}
          {server.serverName}
          {server.status === 'active' && (
            <span className="verify-badge verify-badge--verified" style={{ fontSize: 10, padding: '1px 6px' }}>✓</span>
          )}
        </span>
      </td>
      <td>
        <span style={{ color: server.status === 'active' ? 'var(--accent)' : 'var(--fg-3)', fontSize: 12 }}>
          {server.status === 'active' ? 'Верифіковано' : 'Не верифіковано'}
        </span>
      </td>
      <td>{server.totalViews.toLocaleString()}</td>
      <td>{server.totalVotes.toLocaleString()}</td>
      <td>{server.averageRating > 0 ? server.averageRating.toFixed(2) : '-'}</td>
      <td className="dashboard-table-actions">
        <button type="button" className="btn btn-secondary" onClick={() => onSelectServer(server.serverId)}>
          Аналітика
        </button>
        <Link className="btn btn-secondary" href={`/dashboard/servers/${server.dashboardSlug}`}>Керувати</Link>
      </td>
    </tr>
  )

  return (
    <section className="set-card">
      <div className="dashboard-section-head" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Мої сервери</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/add-server" className="btn btn-secondary">+ Додати сервер</Link>
          <button type="button" className="btn btn-primary" onClick={handleOpenCreateProject}>+ Новий проект</button>
        </div>
      </div>

      {servers.length === 0 && projects.length === 0 && (
        <p className="dashboard-empty">Серверів ще немає. Додайте перший сервер!</p>
      )}

      {projects.map((project) => {
        const projectServers = groupedServers.inProject.get(project.id) || []
        const isExpanded = expandedProjects.has(project.id)
        return (
          <div key={project.id} className="owner-project-group">
            <div className="owner-project-header" role="button" tabIndex={0} aria-expanded={isExpanded} onClick={() => toggleExpand(project.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(project.id) }}>
              <div className="owner-project-header-left">
                <span className="owner-project-chevron">{isExpanded ? '▾' : '▸'}</span>
                <ProjectLogo src={project.logoUrl} alt={project.name} className="owner-project-logo" />
                <span className="owner-project-name">{project.name}</span>
                <span className="owner-project-badge">Проект</span>
                <span className="owner-project-count">{projectServers.length} {projectServers.length === 1 ? 'сервер' : projectServers.length < 5 ? 'сервери' : 'серверів'}</span>
              </div>
              <div className="owner-project-header-actions" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="presentation">
                <button type="button" className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => handleOpenEditProject(project)}>
                  Редагувати
                </button>
                <button type="button" className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => void handleDeleteProject(project)}>
                  Видалити
                </button>
              </div>
            </div>
            {isExpanded && (
              <div className="owner-project-servers">
                {projectServers.length === 0 ? (
                  <p className="dashboard-empty" style={{ fontSize: 13, padding: '8px 16px' }}>
                    Цей проект ще не має серверів. При додаванні/редагуванні сервера оберіть цей проект.
                  </p>
                ) : (
                  <div className="dashboard-table-wrap">
                    <table className="dashboard-table">
                      {serverTableHead}
                      <tbody>{projectServers.map((s) => renderServerRow(s, true))}</tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {groupedServers.standalone.length > 0 && (
        <div style={{ marginTop: projects.length > 0 ? 16 : 0 }}>
          {projects.length > 0 && (
            <div className="owner-project-separator">
              <span>Без проекту</span>
            </div>
          )}
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              {serverTableHead}
              <tbody>{groupedServers.standalone.map((s) => renderServerRow(s))}</tbody>
            </table>
          </div>
        </div>
      )}

      {showProjectModal && (
        <div className="project-form-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setShowProjectModal(false) }}>
          <div className="project-form-modal">
            <h2 className="project-form-title">{editingProject ? 'Редагувати проект' : 'Новий проект'}</h2>
            <label className="auth-field">
              <span>Назва проекту *</span>
              <input type="text" placeholder="Напр. SkyMine Network" value={projectForm.name} onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
            </label>
            <label className="auth-field">
              <span>Опис</span>
              <textarea rows={2} placeholder="Коротко про мережу серверів" value={projectForm.description} onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))} />
            </label>
            <div className="add-grid-2">
              <label className="auth-field">
                <span>Логотип (URL)</span>
                <input type="url" placeholder="https://..." value={projectForm.logoUrl} onChange={(e) => setProjectForm((f) => ({ ...f, logoUrl: e.target.value }))} />
              </label>
              <label className="auth-field">
                <span>Веб-сайт</span>
                <input type="url" placeholder="https://yournetwork.com" value={projectForm.website} onChange={(e) => setProjectForm((f) => ({ ...f, website: e.target.value }))} />
              </label>
            </div>
            <div className="project-form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowProjectModal(false)}>Скасувати</button>
              <button type="button" className="btn btn-primary" disabled={isSavingProject || !projectForm.name.trim()} onClick={() => void handleSaveProject()}>
                {isSavingProject ? 'Збереження...' : editingProject ? 'Зберегти' : 'Створити'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function OwnerServerChartCard({ server, stats }: { server: OwnerServerListItem; stats: OwnerServerStatsResponse | null }) {
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
  return (
    <section className="set-card">
      <div className="dashboard-section-head">
        <div>
          <h3>{server.serverName} Analytics</h3>
          {stats && (
            <p className="dashboard-meta">
              Активність по годинах · останні 7 днів
            </p>
          )}
          {stats && (
            <p className="dashboard-meta">
              Views {stats.summary.views.toLocaleString()} · Votes {stats.summary.votes.toLocaleString()} · Reviews {stats.summary.reviews.toLocaleString()} · Avg rating {stats.summary.averageRating.toFixed(2)}
            </p>
          )}
        </div>
      </div>
      {chartData.length === 0 && <p className="dashboard-empty">No chart data yet.</p>}
      {chartData.length > 0 && (
        <div className="dashboard-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -10, bottom: 2 }}>
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
                content={(props: DashboardChartTooltipProps) => <DashboardChartTooltip {...props} />}
                cursor={{ stroke: 'var(--accent)', strokeDasharray: '4 4', strokeWidth: 1.2 }}
                wrapperStyle={{ outline: 'none' }}
              />
              <Line type="monotone" dataKey="views" stroke="var(--accent)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="votes" stroke="#4ade80" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

function DashboardChartTooltip({ active, payload, label }: DashboardChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }
  const viewsItem = payload.find((item) => item.dataKey === 'views')
  const votesItem = payload.find((item) => item.dataKey === 'votes')
  return (
    <div className="dashboard-tooltip">
      <div className="dashboard-tooltip-title">
        {label ? new Date(label).toLocaleString('uk-UA', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
      </div>
      <div className="dashboard-tooltip-row">
        <span>👁 Перегляди</span>
        <b>{Number(viewsItem?.value || 0).toLocaleString('uk-UA')}</b>
      </div>
      <div className="dashboard-tooltip-row">
        <span>🗳 Голоси</span>
        <b>{Number(votesItem?.value || 0).toLocaleString('uk-UA')}</b>
      </div>
    </div>
  )
}
