'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import type { AuthUser, UserRole } from '@/lib/auth-db'

interface VerifyServerClientProps {
  initialUser: AuthUser
  role: UserRole
  server: { id: number; name: string; addr: string; verified: boolean }
  initialToken: string
  initialVerifiedAt: string | null
}

type VerifyMethod = 'motd' | 'dns'

export function VerifyServerClient({
  initialUser,
  role,
  server,
  initialToken,
  initialVerifiedAt,
}: VerifyServerClientProps) {
  const router = useRouter()
  const [token, setToken] = useState(initialToken)
  const [verifiedAt, setVerifiedAt] = useState<string | null>(initialVerifiedAt)
  const [isVerified, setIsVerified] = useState(server.verified)
  const [activeTab, setActiveTab] = useState<VerifyMethod>('motd')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    setError(null)
    const response = await fetch(`/api/servers/${server.id}/verify?regenerate=1`)
    setIsRegenerating(false)
    if (!response.ok) return
    const data = (await response.json()) as { token: string }
    setToken(data.token)
  }

  const handleVerify = async () => {
    setIsVerifying(true)
    setError(null)
    setSuccessMsg(null)
    const response = await fetch(`/api/servers/${server.id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: activeTab }),
    })
    const data = (await response.json()) as { success?: boolean; error?: string }
    setIsVerifying(false)
    if (!response.ok || !data.success) {
      setError(data.error ?? 'Верифікація не вдалася. Спробуйте знову.')
      return
    }
    setIsVerified(true)
    setVerifiedAt(new Date().toISOString())
    setSuccessMsg('Сервер успішно верифіковано!')
    setTimeout(() => {
      router.push(`/dashboard/servers/${server.id}`)
      router.refresh()
    }, 2000)
  }

  const isIpAddress = /^\d{1,3}(\.\d{1,3}){3}$/.test(server.addr.split(':')[0])

  return (
    <PageShell active="my-servers" initialUser={initialUser} sidebarRole={role}>
      <div className="page-main">
        <div className="page-topbar">
          <div>
            <div className="page-crumb">
              dashboard /{' '}
              <Link href="/dashboard?tab=servers" className="page-crumb-link">мої сервери</Link>
              {' '}/ <Link href={`/dashboard/servers/${server.id}`} className="page-crumb-link">{server.name}</Link>
              {' '}/ верифікація
            </div>
            <h1 className="page-title">
              Верифікація сервера
              {isVerified && (
                <span className="verify-badge verify-badge--verified" style={{ marginLeft: 12 }}>
                  ✓ Верифіковано
                </span>
              )}
            </h1>
          </div>
        </div>

        {isVerified && verifiedAt && (
          <div className="set-card" style={{ borderColor: 'var(--accent)', marginBottom: 0 }}>
            <p style={{ color: 'var(--accent)', fontWeight: 600, margin: 0 }}>
              ✓ Цей сервер верифіковано{' '}
              {new Date(verifiedAt).toLocaleString('uk-UA', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        )}

        <section className="set-card">
          <h3 style={{ marginBottom: 4 }}>Методи верифікації</h3>
          <p style={{ color: 'var(--fg-3)', fontSize: 14, marginBottom: 20 }}>
            Для верифікації того що ви є власником сервером, використайте один з методів описаних нижче.
          </p>

          <div className="verify-token-row">
            <label className="verify-token-label">Рядок для верифікації</label>
            <div className="verify-token-box">
              <code className="verify-token-value">{token}</code>
              <div className="verify-token-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void handleCopy()}
                  disabled={copied}
                >
                  {copied ? 'Скопійовано!' : 'Копіювати'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void handleRegenerate()}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? '...' : 'Оновити'}
                </button>
              </div>
            </div>
          </div>

          <div className="dev-tabs" style={{ marginTop: 24 }}>
            <button
              type="button"
              className={`dev-tab${activeTab === 'motd' ? ' dev-tab--active' : ''}`}
              onClick={() => { setActiveTab('motd'); setError(null) }}
            >
              MOTD
            </button>
            <button
              type="button"
              className={`dev-tab${activeTab === 'dns' ? ' dev-tab--active' : ''}`}
              onClick={() => { setActiveTab('dns'); setError(null) }}
              disabled={isIpAddress}
              title={isIpAddress ? 'DNS TXT верифікація потребує домен, не IP-адресу' : undefined}
            >
              DNS TXT
              {isIpAddress && <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 4 }}>(недоступно)</span>}
            </button>
          </div>

          <div className="verify-method-body">
            {activeTab === 'motd' && (
              <div>
                <h4 className="verify-method-title">Верифікація опису сервера</h4>
                <ol className="verify-steps">
                  <li>
                    Відкрийте файл <code>server.properties</code> на вашому сервері Minecraft.
                  </li>
                  <li>
                    Знайдіть рядок, який починається з <code>motd=</code> та замініть його контент на{' '}
                    <strong>Рядок для верифікації</strong> з форми вище.
                  </li>
                  <li>
                    Після внесення змін збережіть файл <code>server.properties</code> і перезавантажте ваш сервер.
                  </li>
                  <li>Натисніть <strong>Верифікувати</strong>.</li>
                </ol>
                <div className="verify-note">
                  <strong>Примітка:</strong> після успішної верифікації, можете повернути <code>motd=</code> на
                  значення яке було до початку верифікації.
                </div>
              </div>
            )}
            {activeTab === 'dns' && (
              <div>
                <h4 className="verify-method-title">Верифікація домену</h4>
                <p style={{ color: 'var(--fg-3)', fontSize: 14, marginBottom: 12 }}>
                  Переваги цього методу в тому, що не потрібно вносити зміни в налаштування сервера та
                  перезавантажувати його.
                </p>
                <ol className="verify-steps">
                  <li>
                    Увійдіть у систему постачальника свого доменного імені (наприклад, godaddy.com або
                    namecheap.com).
                  </li>
                  <li>
                    Скопіюйте <strong>Рядок для верифікації</strong> з форми вище та створіть запис{' '}
                    <code>TXT</code> в конфігурації DNS вашого домену.
                  </li>
                  <li>Натисніть <strong>Верифікувати</strong>.</li>
                </ol>
                <div className="verify-note">
                  <strong>Примітка:</strong> застосування змін у DNS може зайняти певний час. Якщо запис не
                  знаходиться одразу, спробуйте перевірити через добу.
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="verify-error" role="alert">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="verify-success" role="status">
              {successMsg}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleVerify()}
              disabled={isVerifying || isVerified}
            >
              {isVerifying ? 'Перевіряємо...' : isVerified ? '✓ Верифіковано' : 'Верифікувати'}
            </button>
            <Link href={`/dashboard/servers/${server.id}`} className="btn btn-secondary">
              Назад
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
