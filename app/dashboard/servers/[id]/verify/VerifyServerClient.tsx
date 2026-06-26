'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ServerOwnerPageShell } from '@/components/dashboard/ServerOwnerPageShell'
import { ServerDashboardHub, type ServerDashboardHubOwnedServer } from '@/components/dashboard/ServerDashboardHub'
import type { AuthUser, UserRole } from '@/lib/auth-db'
import { extractServerHost, isIpv4Host, normalizeDnsHostname } from '@/lib/server-dns-verify'

interface VerifyServerClientProps {
  initialUser: AuthUser
  role: UserRole
  dashboardSlug: string
  ownedServers: ServerDashboardHubOwnedServer[]
  server: {
    id: number
    name: string
    addr: string
    verified: boolean
    platform: 'minecraft' | 'discord'
    discordVerifyCode: string | null
  }
  initialToken: string
  initialVerifiedAt: string | null
}

type VerifyMethod = 'motd' | 'dns'

export function VerifyServerClient({
  initialUser,
  role,
  dashboardSlug,
  ownedServers,
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
  const serverHost = extractServerHost(server.addr)
  const isIpAddress = isIpv4Host(serverHost)
  const defaultDnsHostname = isIpAddress ? '' : (normalizeDnsHostname(serverHost) ?? '')
  const [dnsHostname, setDnsHostname] = useState(defaultDnsHostname)

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
    if (activeTab === 'dns') {
      const normalizedHostname = normalizeDnsHostname(dnsHostname)
      if (!normalizedHostname) {
        setIsVerifying(false)
        setError('Вкажіть коректне доменне імʼя для DNS TXT (наприклад play.example.com).')
        return
      }
    }
    const response = await fetch(`/api/servers/${server.id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: activeTab,
        ...(activeTab === 'dns' ? { hostname: dnsHostname.trim() } : {}),
      }),
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
      router.push(`/dashboard/servers/${dashboardSlug}`)
      router.refresh()
    }, 2000)
  }

  const isDiscordServer = server.platform === 'discord'

  return (
    <ServerOwnerPageShell initialUser={initialUser} role={role}>
      <div className="page-main">
        <ServerDashboardHub
          activeTab="verify"
          dashboardSlug={dashboardSlug}
          ownedServers={ownedServers}
          server={{
            seed: server.id,
            name: server.name,
            addr: server.addr,
            verified: isVerified,
          }}
          subtitle="Підтвердіть власність сервера через MOTD, DNS TXT або Discord-бота."
        />

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
            {isDiscordServer
              ? 'Підтвердіть власність Discord-спільноти через бота Eyzencore.'
              : 'Для верифікації того що ви є власником сервером, використайте один з методів описаних нижче.'}
          </p>

          {isDiscordServer ? (
            <div className="verify-method-body">
              <h4 className="verify-method-title">Верифікація через Discord-бота</h4>
              <ol className="verify-steps">
                <li>Додайте бота Eyzencore на свій Discord-сервер з правами адміністратора.</li>
                <li>
                  На сервері виконайте команду:{' '}
                  <code>/link {server.discordVerifyCode || 'КОД'}</code>
                </li>
                <li>Після успішного зв’язку статус зміниться на «Верифіковано».</li>
              </ol>
              {server.discordVerifyCode ? (
                <div className="verify-token-row">
                  <label className="verify-token-label">Код верифікації</label>
                  <div className="verify-token-box">
                    <code className="verify-token-value">{server.discordVerifyCode}</code>
                    <div className="verify-token-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => void navigator.clipboard.writeText(`/link ${server.discordVerifyCode}`)}
                      >
                        Копіювати команду
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <>
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
            >
              DNS TXT
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
                <h4 className="verify-method-title">Верифікація через DNS TXT</h4>
                <p style={{ color: 'var(--fg-3)', fontSize: 14, marginBottom: 12 }}>
                  {isIpAddress
                    ? 'Адреса сервера — IP. Додайте TXT-запис на домені, яким ви володієте (наприклад play.example.com), навіть якщо гравці підключаються за IP.'
                    : 'Переваги цього методу в тому, що не потрібно вносити зміни в налаштування сервера та перезавантажувати його.'}
                </p>
                <label className="verify-token-row" style={{ marginBottom: 16 }}>
                  <span className="verify-token-label">Домен для DNS TXT</span>
                  <input
                    className="input"
                    type="text"
                    value={dnsHostname}
                    onChange={(event) => setDnsHostname(event.target.value)}
                    placeholder="play.example.com"
                    aria-label="Домен для DNS TXT верифікації"
                  />
                </label>
                <ol className="verify-steps">
                  <li>
                    Увійдіть у панель DNS вашого домену (наприклад, Cloudflare, GoDaddy, Namecheap).
                  </li>
                  <li>
                    На домені <strong>{dnsHostname.trim() || 'вашого домену'}</strong> створіть запис{' '}
                    <code>TXT</code> зі значенням <strong>Рядок для верифікації</strong> з форми вище.
                  </li>
                  <li>Дочекайтесь поширення DNS (зазвичай від кількох хвилин до кількох годин).</li>
                  <li>Натисніть <strong>Верифікувати</strong>.</li>
                </ol>
                <div className="verify-note">
                  <strong>Примітка:</strong> домен не обовʼязково має збігатися з IP-адресою сервера — достатньо довести,
                  що ви керуєте DNS цього імені.
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
            </>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            {isDiscordServer ? (
              <Link href={`/servers/${server.id}`} className="btn btn-primary">
                Відкрити сторінку спільноти
              </Link>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleVerify()}
                disabled={isVerifying || isVerified}
              >
                {isVerifying ? 'Перевіряємо...' : isVerified ? '✓ Верифіковано' : 'Верифікувати'}
              </button>
            )}
            <Link href={`/dashboard/servers/${dashboardSlug}`} className="btn btn-secondary">
              Назад
            </Link>
          </div>
        </section>
      </div>
    </ServerOwnerPageShell>
  )
}
