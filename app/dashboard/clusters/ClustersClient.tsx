'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import type { AuthUser, UserRole } from '@/lib/auth-db'
import type { Cluster } from '@/lib/cluster-db'
import type { Server } from '@/lib/types'

type Form = {
  name: string
  description: string
  logoUrl: string
  bannerUrl: string
  website: string
  discord: string
  serverIds: number[]
}

const emptyForm = (): Form => ({
  name: '', description: '', logoUrl: '', bannerUrl: '', website: '', discord: '', serverIds: [],
})

export function ClustersClient({
  initialUser, role, initialClusters, servers,
}: {
  initialUser: AuthUser
  role: UserRole
  initialClusters: Cluster[]
  servers: Server[]
}) {
  const [clusters, setClusters] = useState(initialClusters)
  const [editing, setEditing] = useState<Cluster | null>(null)
  const [form, setForm] = useState<Form>(emptyForm())
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setError(null)
    setOpen(true)
  }
  const showEdit = (cluster: Cluster) => {
    setEditing(cluster)
    setForm({
      name: cluster.name,
      description: cluster.description,
      logoUrl: cluster.logoUrl || '',
      bannerUrl: cluster.bannerUrl || '',
      website: cluster.website || '',
      discord: cluster.discord || '',
      serverIds: cluster.servers.map((server) => server.id),
    })
    setError(null)
    setOpen(true)
  }
  const toggleServer = (id: number) => setForm((current) => ({
    ...current,
    serverIds: current.serverIds.includes(id)
      ? current.serverIds.filter((serverId) => serverId !== id)
      : [...current.serverIds, id],
  }))
  const save = async () => {
    if (!form.name.trim()) return setError('Вкажіть назву кластера')
    setBusy(true)
    setError(null)
    const response = await fetch(editing ? `/api/clusters/${editing.id}` : '/api/clusters', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const payload = await response.json() as { cluster?: Cluster; error?: string }
    setBusy(false)
    if (!response.ok || !payload.cluster) return setError(payload.error || 'Не вдалося зберегти кластер')
    setClusters((current) => editing
      ? current.map((cluster) => cluster.id === payload.cluster!.id ? payload.cluster! : cluster)
      : [payload.cluster!, ...current])
    setOpen(false)
  }
  const remove = async (cluster: Cluster) => {
    if (!window.confirm(`Видалити кластер «${cluster.name}»? Сервери залишаться на сайті.`)) return
    const response = await fetch(`/api/clusters/${cluster.id}`, { method: 'DELETE' })
    if (response.ok) setClusters((current) => current.filter((item) => item.id !== cluster.id))
  }

  return (
    <PageShell active="clusters" initialUser={initialUser} sidebarRole={role}>
      <div className="page-main">
        <div className="page-topbar">
          <div>
            <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Кластери' }]} />
            <h1 className="page-title">Кластери серверів</h1>
            <p style={{ color: 'var(--fg-3)', marginTop: 8, maxWidth: 650 }}>
              Об’єднуйте пов’язані Minecraft і Discord сервери. Кластер показується на сторінці кожного учасника.
            </p>
          </div>
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={showCreate}>+ Створити кластер</button>
        </div>

        {clusters.length === 0 ? (
          <div className="set-card" style={{ padding: 48, textAlign: 'center' }}>
            <h2 style={{ marginBottom: 10 }}>Кластерів ще немає</h2>
            <p style={{ color: 'var(--fg-3)', marginBottom: 20 }}>Створіть кластер і виберіть сервери, які до нього входять.</p>
            <button className="btn btn-primary" onClick={showCreate}>Створити перший кластер</button>
          </div>
        ) : (
          <div className="projects-grid">
            {clusters.map((cluster) => (
              <article className="project-card" key={cluster.id}>
                {cluster.bannerUrl && (
                  <div style={{ height: 100, margin: '-20px -20px 18px', overflow: 'hidden', borderRadius: '12px 12px 0 0', position: 'relative' }}>
                    <Image src={cluster.bannerUrl} alt="" fill unoptimized style={{ objectFit: 'cover' }} />
                  </div>
                )}
                <div className="project-card-header">
                  {cluster.logoUrl ? (
                    <Image className="project-card-logo" src={cluster.logoUrl} alt="" width={44} height={44} unoptimized />
                  ) : <div className="project-card-logo-placeholder">CL</div>}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h2 className="project-card-name">{cluster.name}</h2>
                    <span style={{ color: 'var(--fg-3)', fontSize: 12 }}>{cluster.serverCount} серверів</span>
                  </div>
                </div>
                {cluster.description && <p className="project-card-desc">{cluster.description}</p>}
                <div style={{ display: 'grid', gap: 8, margin: '16px 0' }}>
                  {cluster.servers.map((server) => (
                    <Link className="project-cluster" href={`/servers/${server.id}`} key={server.id}>
                      <div className="ic">{server.platform === 'discord' ? 'DS' : 'MC'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <b>{server.name}</b>
                        <div style={{ color: 'var(--fg-3)', fontSize: 11 }}>{server.addr}</div>
                      </div>
                      <span className={server.online ? 'pc-on' : ''}>{server.online ? 'онлайн' : 'офлайн'}</span>
                    </Link>
                  ))}
                </div>
                <div className="project-card-actions">
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => showEdit(cluster)}>Редагувати</button>
                  <button className="btn btn-secondary" onClick={() => void remove(cluster)}>Видалити</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="project-form-overlay" role="dialog" aria-modal="true" onClick={(event) => event.target === event.currentTarget && setOpen(false)}>
          <div className="project-form-modal" style={{ maxWidth: 720 }}>
            <h2 className="project-form-title">{editing ? 'Редагування кластера' : 'Новий кластер'}</h2>
            {error && <div className="verify-error">{error}</div>}
            <label className="auth-field"><span>Назва *</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Eyzencore Network" autoFocus /></label>
            <label className="auth-field"><span>Опис</span><textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <div className="add-grid-2">
              {(['logoUrl', 'bannerUrl', 'website', 'discord'] as const).map((field) => (
                <label className="auth-field" key={field}>
                  <span>{{ logoUrl: 'Логотип URL', bannerUrl: 'Банер URL', website: 'Сайт', discord: 'Discord' }[field]}</span>
                  <input value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} placeholder="https://..." />
                </label>
              ))}
            </div>
            <div className="auth-field">
              <span>Сервери кластера</span>
              <div style={{ display: 'grid', gap: 8, maxHeight: 230, overflowY: 'auto', padding: 4 }}>
                {servers.length === 0 && <p style={{ color: 'var(--fg-3)' }}>Спочатку додайте та дочекайтеся схвалення сервера.</p>}
                {servers.map((server) => (
                  <label className="project-cluster" key={server.seed} style={{ cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.serverIds.includes(server.seed)} onChange={() => toggleServer(server.seed)} />
                    <div className="ic">{server.platform === 'discord' ? 'DS' : 'MC'}</div>
                    <span style={{ flex: 1 }}><b>{server.name}</b><br /><small>{server.addr}</small></span>
                    {server.clusterId && server.clusterId !== editing?.id && <small>буде перенесено</small>}
                  </label>
                ))}
              </div>
            </div>
            <div className="project-form-actions">
              <button className="btn btn-secondary" onClick={() => setOpen(false)}>Скасувати</button>
              <button className="btn btn-primary" disabled={busy} onClick={() => void save()}>{busy ? 'Збереження...' : 'Зберегти'}</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
