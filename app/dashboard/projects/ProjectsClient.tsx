'use client'

import Image from 'next/image'
import { useState } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import type { AuthUser, Project, UserRole } from '@/lib/auth-db'

interface ProjectsClientProps {
  initialUser: AuthUser
  role: UserRole
  initialProjects: Project[]
}

type ProjectFormData = {
  name: string
  description: string
  logoUrl: string
  website: string
  discord: string
}

const emptyForm = (): ProjectFormData => ({
  name: '',
  description: '',
  logoUrl: '',
  website: '',
  discord: '',
})

export function ProjectsClient({ initialUser, role, initialProjects }: ProjectsClientProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [form, setForm] = useState<ProjectFormData>(emptyForm())
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleOpenCreate = () => {
    setEditingProject(null)
    setForm(emptyForm())
    setError(null)
    setShowModal(true)
  }

  const handleOpenEdit = (project: Project) => {
    setEditingProject(project)
    setForm({
      name: project.name,
      description: project.description,
      logoUrl: project.logoUrl || '',
      website: project.website || '',
      discord: project.discord || '',
    })
    setError(null)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingProject(null)
    setError(null)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Назва проекту є обовʼязковою')
      return
    }
    setIsSaving(true)
    setError(null)
    const url = editingProject ? `/api/projects/${editingProject.id}` : '/api/projects'
    const method = editingProject ? 'PATCH' : 'POST'
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        description: form.description.trim(),
        logoUrl: form.logoUrl.trim() || null,
        website: form.website.trim() || null,
        discord: form.discord.trim() || null,
      }),
    })
    const data = (await response.json()) as { project?: Project; error?: string }
    setIsSaving(false)
    if (!response.ok) {
      setError(data.error ?? 'Помилка збереження')
      return
    }
    if (data.project) {
      if (editingProject) {
        setProjects((prev) => prev.map((p) => (p.id === data.project!.id ? data.project! : p)))
      } else {
        setProjects((prev) => [data.project!, ...prev])
      }
    }
    handleCloseModal()
  }

  const handleDelete = async (projectId: number, projectName: string) => {
    const confirmed = window.confirm(`Видалити проект "${projectName}"? Сервери не будуть видалені, але відʼєднаються від проекту.`)
    if (!confirmed) return
    setDeletingId(projectId)
    const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
    setDeletingId(null)
    if (!response.ok) {
      window.alert('Не вдалося видалити проект')
      return
    }
    setProjects((prev) => prev.filter((p) => p.id !== projectId))
  }

  return (
    <PageShell active="projects" initialUser={initialUser} sidebarRole={role}>
      <div className="page-main">
        <div className="page-topbar">
          <div>
            <div className="page-crumb">dashboard / проекти</div>
            <h1 className="page-title">Мої проекти</h1>
          </div>
          <button type="button" className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={handleOpenCreate}>
            + Новий проект
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="set-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Проектів ще немає</h3>
            <p style={{ color: 'var(--fg-3)', fontSize: 14, marginBottom: 20 }}>
              Проекти дозволяють групувати кілька серверів під одним брендом або мережею
            </p>
            <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
              Створити перший проект
            </button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((project) => (
              <article key={project.id} className="project-card">
                <div className="project-card-header">
                  {project.logoUrl ? (
                    <Image
                      src={project.logoUrl}
                      alt={project.name}
                      width={44}
                      height={44}
                      className="project-card-logo"
                      unoptimized
                    />
                  ) : (
                    <div className="project-card-logo-placeholder">🌐</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="project-card-name">{project.name}</p>
                    <div className="project-card-meta">
                      <span>{project.serverCount} {project.serverCount === 1 ? 'сервер' : project.serverCount < 5 ? 'сервери' : 'серверів'}</span>
                      {project.website && (
                        <a
                          href={project.website}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--accent)', fontSize: 11 }}
                          tabIndex={0}
                          aria-label={`Відкрити сайт проекту ${project.name}`}
                        >
                          ↗ Сайт
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                {project.description && (
                  <p className="project-card-desc">{project.description}</p>
                )}
                <div className="project-card-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => handleOpenEdit(project)}
                  >
                    Редагувати
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={deletingId === project.id}
                    onClick={() => void handleDelete(project.id, project.name)}
                    aria-label={`Видалити проект ${project.name}`}
                  >
                    {deletingId === project.id ? '...' : 'Видалити'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div
          className="project-form-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={editingProject ? 'Редагування проекту' : 'Новий проект'}
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal() }}
        >
          <div className="project-form-modal">
            <h2 className="project-form-title">
              {editingProject ? 'Редагування проекту' : 'Новий проект'}
            </h2>

            {error && (
              <div className="verify-error" role="alert">{error}</div>
            )}

            <label className="auth-field">
              <span>Назва проекту *</span>
              <input
                type="text"
                placeholder="Напр. SkyMine Network"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </label>
            <label className="auth-field">
              <span>Опис</span>
              <textarea
                rows={3}
                placeholder="Коротко про вашу мережу серверів"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <div className="add-grid-2">
              <label className="auth-field">
                <span>Логотип (URL)</span>
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.logoUrl}
                  onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
                />
              </label>
              <label className="auth-field">
                <span>Веб-сайт</span>
                <input
                  type="url"
                  placeholder="https://yournetwork.com"
                  value={form.website}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                />
              </label>
              <label className="auth-field">
                <span>Discord</span>
                <input
                  type="url"
                  placeholder="https://discord.gg/..."
                  value={form.discord}
                  onChange={(e) => setForm((f) => ({ ...f, discord: e.target.value }))}
                />
              </label>
            </div>

            <div className="project-form-actions">
              <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                Скасувати
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={isSaving || !form.name.trim()}
                onClick={() => void handleSave()}
              >
                {isSaving ? 'Збереження...' : editingProject ? 'Зберегти зміни' : 'Створити проект'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
