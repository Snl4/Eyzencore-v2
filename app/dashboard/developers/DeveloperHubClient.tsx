'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import type { AuthUser, UserRole, ApiToken, ApiTokenScope } from '@/lib/auth-db'

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = 'docs' | 'keys' | 'events' | 'integrations'

type IntegrationChannelInfo = {
  enabled: boolean
  webhook_url?: string | null
  bot_username?: string | null
  endpoint?: string
  api_version?: string
  signature_type?: string
  retries?: number
}
type IntegrationServerPayload = {
  id: string; name: string; slug: string; ip_or_domain: string
  game_edition: string; status: string; regions: string[]; is_verified: boolean
  online_state: string; trust_state: string; last_online_players: number
  last_max_players: number; last_version: string; score: number
  votes_monthly: number; events_monthly: number
  integrations: {
    discord: IntegrationChannelInfo; telegram: IntegrationChannelInfo
    plugin: IntegrationChannelInfo; webhook: IntegrationChannelInfo
  }
  rate_limit: { requests_per_minute: number; requests_today: number; reset_at: string }
  health_state: string; created_at: string
}
type IntegrationEvent = {
  id: string; type: string; created_at: string; payload: Record<string, string | number>
}
type IntegrationEventsPayload = {
  server_id: string; total: number; events: IntegrationEvent[]
}
type ServerOption = { id: number; name: string; addr: string }

interface DeveloperHubClientProps {
  initialUser: AuthUser
  role: UserRole
  serverOptions: ServerOption[]
  selectedServerId: number | null
  serverPayload: IntegrationServerPayload | null
  eventsPayload: IntegrationEventsPayload | null
  initialTokens: ApiToken[]
}

const API_BASE = 'https://api.eyzencore.com'

// ─── Small helpers ───────────────────────────────────────────────────────────

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short', year: 'numeric' })

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('uk-UA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

const EVENT_COLORS: Record<string, string> = {
  'vote.received': 'var(--green)',
  'review.created': 'var(--accent)',
  'view.tracked': 'var(--accent-3)',
}
const EVENT_LABELS: Record<string, string> = {
  'vote.received': 'Голос',
  'review.created': 'Відгук',
  'view.tracked': 'Перегляд',
}

// ─── Primitives ──────────────────────────────────────────────────────────────

const MethodBadge = ({ method }: { method: 'GET' | 'POST' | 'DELETE' }) => {
  const colors: Record<string, [string, string]> = {
    GET: ['#6ee7b7', 'color-mix(in oklab,#6ee7b7 8%,transparent)'],
    POST: ['#93c5fd', 'color-mix(in oklab,#93c5fd 8%,transparent)'],
    DELETE: ['#fca5a5', 'color-mix(in oklab,#fca5a5 8%,transparent)'],
  }
  const [color, bg] = colors[method] ?? colors.GET
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 9px',
      borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700,
      letterSpacing: '0.06em', border: `1px solid color-mix(in oklab,${color} 40%,var(--line))`,
      color, background: bg, flexShrink: 0,
    }}>
      {method}
    </span>
  )
}

const CopyBtn = ({ text, label = 'Копіювати' }: { text: string; label?: string }) => {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="btn btn-ghost"
      style={{ height: 26, padding: '0 10px', fontSize: 11, gap: 4, flexShrink: 0 }}
    >
      {copied ? '✓ Скопійовано' : label}
    </button>
  )
}

// Syntax-colored JSON renderer (client-side only)
const JsonBlock = ({ value }: { value: unknown }) => {
  const str = JSON.stringify(value, null, 2)
  const highlighted = str.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      if (/^".*":$/.test(match)) return `<span style="color:var(--fg-3)">${match}</span>`
      if (/^"/.test(match)) return `<span style="color:var(--accent-3)">${match}</span>`
      if (/true|false/.test(match)) return `<span style="color:var(--green)">${match}</span>`
      if (/null/.test(match)) return `<span style="color:var(--fg-3)">${match}</span>`
      return `<span style="color:var(--accent-2)">${match}</span>`
    }
  )
  return (
    <pre
      style={{
        margin: 0, padding: '12px 14px', borderRadius: 8, border: '1px solid var(--line)',
        background: 'color-mix(in oklab,var(--bg) 70%,#000)', fontFamily: 'var(--font-mono)',
        fontSize: 11.5, overflowX: 'auto', overflowY: 'auto', maxHeight: 320, whiteSpace: 'pre',
      }}
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  )
}

const CurlBlock = ({ snippet }: { snippet: string }) => (
  <div style={{ position: 'relative' }}>
    <pre style={{
      margin: 0, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line)',
      background: 'color-mix(in oklab,var(--bg) 70%,#000)', fontFamily: 'var(--font-mono)',
      fontSize: 11.5, color: 'var(--accent-3)', overflowX: 'auto', whiteSpace: 'pre',
    }}>
      {snippet}
    </pre>
    <div style={{ position: 'absolute', top: 6, right: 8 }}>
      <CopyBtn text={snippet} />
    </div>
  </div>
)

// ─── Docs tab ─────────────────────────────────────────────────────────────────

type DocSection = 'list' | 'get' | 'online' | 'events' | 'auth'

const PARAM_TABLE = ({ params }: { params: { name: string; type: string; desc: string; required?: boolean }[] }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 }}>
    <thead>
      <tr style={{ borderBottom: '1px solid var(--line)' }}>
        {['Параметр', 'Тип', 'Опис'].map((h) => (
          <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--fg-3)', fontWeight: 600, fontSize: 11 }}>{h}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {params.map((p) => (
        <tr key={p.name} style={{ borderBottom: '1px solid var(--line-2)' }}>
          <td style={{ padding: '7px 10px' }}>
            <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: 12 }}>{p.name}</code>
            {p.required && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--red)', fontWeight: 600 }}>*</span>}
          </td>
          <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', color: 'var(--fg-3)', fontSize: 11 }}>{p.type}</td>
          <td style={{ padding: '7px 10px', color: 'var(--fg-2)', fontSize: 12 }}>{p.desc}</td>
        </tr>
      ))}
    </tbody>
  </table>
)

const SectionTitle = ({ method, path, summary }: { method: 'GET' | 'POST' | 'DELETE'; path: string; summary: string }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <MethodBadge method={method} />
      <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-1)', fontWeight: 600 }}>{path}</code>
    </div>
    <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-2)' }}>{summary}</p>
  </div>
)

const Divider = () => <div style={{ borderTop: '1px solid var(--line)', margin: '24px 0' }} />

const serverListExample = {
  data: [
    { id: '148', name: 'SkyMine UA', slug: 'skymine-ua', addr: 'play.skymine.ua', game_edition: 'java', regions: ['ua'], is_verified: true, last_online_players: 5, last_max_players: 50, last_version: '1.21.11', online_state: 'live', trust_state: 'verified', mode: 'Survival', tags: ['Economy', 'PvP'] },
  ],
  total: 1, page: 1, limit: 20, pages: 1,
}
const serverGetExample = {
  id: '148', name: 'SkyMine UA', slug: 'skymine-ua', addr: 'play.skymine.ua',
  game_edition: 'java', regions: ['ua'], is_verified: true, last_online_players: 5,
  last_max_players: 50, last_version: '1.21.11', online_state: 'live', trust_state: 'verified',
  mode: 'Survival', votes_monthly: 24, score: 31.6, tags: ['Economy', 'PvP'], created_at: '2026-01-01T00:00:00Z',
}
const onlineExample = {
  server_id: '148', hours: 24,
  samples: [
    { players: 5, max: 50, online: true, recorded_at: '2026-05-10T22:00:00Z' },
    { players: 12, max: 50, online: true, recorded_at: '2026-05-10T23:00:00Z' },
  ],
}

const DocsTab = ({ serverId }: { serverId: string }) => {
  const [active, setActive] = useState<DocSection>('list')

  const nav: { key: DocSection; label: string; group: string }[] = [
    { key: 'list', label: 'GET /v1/servers', group: 'Сервери' },
    { key: 'get', label: 'GET /v1/servers/:id', group: 'Сервери' },
    { key: 'online', label: 'GET /v1/servers/:id/online', group: 'Сервери' },
    { key: 'events', label: 'GET /v1/integrations/…/events', group: 'Events' },
    { key: 'auth', label: 'Авторизація', group: 'Auth' },
  ]

  const groups = [...new Set(nav.map((n) => n.group))]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>
      {/* Sidebar nav */}
      <nav style={{ position: 'sticky', top: 24, height: 'fit-content' }}>
        {groups.map((group) => (
          <div key={group} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, paddingLeft: 8 }}>{group}</div>
            {nav.filter((n) => n.group === group).map((n) => (
              <button
                key={n.key}
                onClick={() => setActive(n.key)}
                aria-label={n.label}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '6px 10px', borderRadius: 6, marginBottom: 2,
                  background: active === n.key ? 'color-mix(in oklab,var(--accent) 12%,transparent)' : 'none',
                  border: active === n.key ? '1px solid color-mix(in oklab,var(--accent) 20%,transparent)' : '1px solid transparent',
                  color: active === n.key ? 'var(--accent)' : 'var(--fg-3)',
                  fontFamily: 'var(--font-mono)', fontSize: 11.5, cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
              >
                {n.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Content */}
      <div className="set-card" style={{ minHeight: 400 }}>
        {active === 'list' && (
          <div>
            <SectionTitle method="GET" path="/api/v1/servers" summary="Список усіх серверів Eyzencore з підтримкою фільтрів і пагінації." />
            <PARAM_TABLE params={[
              { name: 'mode', type: 'string', desc: 'Фільтр по режиму гри (Survival, SkyBlock…)' },
              { name: 'ver', type: 'string', desc: 'Фільтр по версії (1.21.11, 1.20…)' },
              { name: 'q', type: 'string', desc: 'Пошук по назві, адресі або опису' },
              { name: 'page', type: 'number', desc: 'Номер сторінки, за замовчуванням 1' },
              { name: 'limit', type: 'number', desc: 'Кількість на сторінці, max 100' },
            ]} />
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>Request</div>
            <CurlBlock snippet={`curl "${API_BASE}/api/v1/servers?mode=Survival&page=1"`} />
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', margin: '12px 0 8px', fontFamily: 'var(--font-mono)' }}>Response 200</div>
            <JsonBlock value={serverListExample} />
          </div>
        )}

        {active === 'get' && (
          <div>
            <SectionTitle method="GET" path="/api/v1/servers/:id" summary="Публічний профіль одного сервера: онлайн, версія, верифікація, теги, score." />
            <PARAM_TABLE params={[
              { name: 'id', type: 'number', desc: 'Числовий ID сервера', required: true },
            ]} />
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>Request</div>
            <CurlBlock snippet={`curl "${API_BASE}/api/v1/servers/${serverId}"`} />
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', margin: '12px 0 8px', fontFamily: 'var(--font-mono)' }}>Response 200</div>
            <JsonBlock value={serverGetExample} />
          </div>
        )}

        {active === 'online' && (
          <div>
            <SectionTitle method="GET" path="/api/v1/servers/:id/online" summary="Масив зразків онлайну за останні N годин для побудови графіків." />
            <PARAM_TABLE params={[
              { name: 'id', type: 'number', desc: 'Числовий ID сервера', required: true },
              { name: 'hours', type: 'number', desc: 'Глибина вибірки: 1–168 год (за замовч. 24)' },
            ]} />
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>Request</div>
            <CurlBlock snippet={`curl "${API_BASE}/api/v1/servers/${serverId}/online?hours=24"`} />
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', margin: '12px 0 8px', fontFamily: 'var(--font-mono)' }}>Response 200</div>
            <JsonBlock value={onlineExample} />
          </div>
        )}

        {active === 'events' && (
          <div>
            <SectionTitle method="GET" path="/api/v1/integrations/servers/:id/events" summary="Лог останніх подій (голоси, відгуки, перегляди) для вашого сервера." />
            <PARAM_TABLE params={[
              { name: 'id', type: 'number', desc: 'Числовий ID сервера', required: true },
              { name: 'limit', type: 'number', desc: 'Кількість подій, max 100' },
            ]} />
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>Request</div>
            <CurlBlock snippet={`curl "${API_BASE}/api/v1/integrations/servers/${serverId}/events?limit=20"`} />
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', margin: '12px 0 8px', fontFamily: 'var(--font-mono)' }}>Response 200</div>
            <JsonBlock value={{ server_id: serverId, total: 2, events: [{ id: 'vote-1', type: 'vote.received', created_at: new Date().toISOString(), payload: { nickname: 'Alex' } }] }} />
          </div>
        )}

        {active === 'auth' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>Personal Access Tokens</h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6 }}>
                Публічні ендпоінти <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>/api/v1/servers/*</code> не потребують авторизації.
                PAT токени зарезервовані для майбутніх приватних ендпоінтів.
              </p>
            </div>
            <Divider />
            <SectionTitle method="GET" path="/api/tokens" summary="Список ваших активних API-ключів (без plaintext значення)." />
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>Request</div>
            <CurlBlock snippet={`curl "${API_BASE}/api/tokens" \\\n  -H "Cookie: eyzencore_session=<your_session>"`} />
            <Divider />
            <SectionTitle method="POST" path="/api/tokens" summary="Створити новий API-ключ. Plaintext показується лише один раз." />
            <CurlBlock snippet={`curl -X POST "${API_BASE}/api/tokens" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"My Bot","scopes":["servers:read","events:read"]}'`} />
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', margin: '12px 0 8px', fontFamily: 'var(--font-mono)' }}>Response 201</div>
            <JsonBlock value={{ token: { id: 'uuid', name: 'My Bot', scopes: ['servers:read'], createdAt: new Date().toISOString() }, plaintext: 'eyzencore_pat_xxxxxxxx' }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── API Keys tab ─────────────────────────────────────────────────────────────

const SCOPE_LABELS: Record<ApiTokenScope, string> = {
  'servers:read': 'Читання серверів',
  'events:read': 'Читання подій',
}

const ApiKeysTab = ({ initialTokens }: { initialTokens: ApiToken[] }) => {
  const [tokens, setTokens] = useState<ApiToken[]>(initialTokens)
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<ApiTokenScope[]>(['servers:read'])
  const [creating, setCreating] = useState(false)
  const [newPlaintext, setNewPlaintext] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)
  const plaintextRef = useRef<HTMLInputElement>(null)

  const handleCreate = async () => {
    if (!name.trim()) return
    setCreating(true)
    const res = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), scopes }),
    })
    const data = await res.json() as { token: ApiToken; plaintext: string }
    setTokens((prev) => [data.token, ...prev])
    setNewPlaintext(data.plaintext)
    setName('')
    setScopes(['servers:read'])
    setCreating(false)
    setTimeout(() => plaintextRef.current?.select(), 100)
  }

  const handleRevoke = async (id: string) => {
    setRevokingId(id)
    await fetch(`/api/tokens/${id}`, { method: 'DELETE' })
    setTokens((prev) => prev.filter((t) => t.id !== id))
    setRevokingId(null)
    setConfirmRevoke(null)
  }

  const toggleScope = (s: ApiTokenScope) =>
    setScopes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* New token form */}
      <div className="set-card">
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Новий API ключ</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 200 }}>
            <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Назва ключа</span>
            <input
              className="btn btn-secondary"
              style={{ textAlign: 'left', fontFamily: 'inherit', fontSize: 13, height: 36 }}
              placeholder="Наприклад: Discord bot"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Token name"
              onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate() }}
            />
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Scopes</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['servers:read', 'events:read'] as ApiTokenScope[]).map((s) => (
                <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={scopes.includes(s)}
                    onChange={() => toggleScope(s)}
                    aria-label={SCOPE_LABELS[s]}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-2)' }}>{s}</code>
                </label>
              ))}
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ height: 36, padding: '0 20px', fontSize: 13 }}
            disabled={!name.trim() || creating || scopes.length === 0}
            onClick={() => void handleCreate()}
          >
            {creating ? 'Створення…' : '+ Створити ключ'}
          </button>
        </div>
      </div>

      {/* One-time plaintext reveal */}
      {newPlaintext && (
        <div className="set-card" style={{ borderColor: 'color-mix(in oklab,var(--green) 30%,transparent)', background: 'color-mix(in oklab,var(--green) 5%,var(--bg-2))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--green)' }}>✓ Ключ створено</div>
              <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2 }}>Збережи його зараз — більше не буде показано</div>
            </div>
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setNewPlaintext(null)}>Закрити ✕</button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              ref={plaintextRef}
              readOnly
              value={newPlaintext}
              aria-label="New API token"
              style={{
                flex: 1, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 6,
                padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-1)',
              }}
            />
            <CopyBtn text={newPlaintext} label="Копіювати ключ" />
          </div>
        </div>
      )}

      {/* Token list */}
      {tokens.length === 0 ? (
        <div className="set-card" style={{ textAlign: 'center', color: 'var(--fg-3)', padding: '32px 0' }}>Ключів ще немає</div>
      ) : (
        <div className="set-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Назва', 'Scopes', 'Остання активність', 'Створено', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--line-2)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>{t.name}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {t.scopes.map((s) => (
                        <code key={s} style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, padding: '2px 7px', borderRadius: 4, background: 'var(--bg-3)', color: 'var(--accent)', border: '1px solid var(--line)' }}>{s}</code>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--fg-3)', fontSize: 12 }}>{t.lastUsedAt ? fmtDate(t.lastUsedAt) : '—'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--fg-3)', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(t.createdAt)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {confirmRevoke === t.id ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: 11, padding: '3px 8px', color: 'var(--red)', borderColor: 'color-mix(in oklab,var(--red) 30%,transparent)' }}
                          disabled={revokingId === t.id}
                          onClick={() => handleRevoke(t.id)}
                        >
                          {revokingId === t.id ? '…' : 'Так'}
                        </button>
                        <button className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setConfirmRevoke(null)}>Ні</button>
                      </div>
                    ) : (
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 10px', color: 'var(--red)' }} onClick={() => setConfirmRevoke(t.id)}>
                        Відкликати
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Events tab ───────────────────────────────────────────────────────────────

type EventFilter = 'all' | 'vote.received' | 'review.created' | 'view.tracked'

const EventsTab = ({ initialPayload, serverId }: { initialPayload: IntegrationEventsPayload | null; serverId: string }) => {
  const [payload, setPayload] = useState(initialPayload)
  const [filter, setFilter] = useState<EventFilter>('all')
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    const res = await fetch(`/api/v1/integrations/servers/${serverId}/events?limit=20`)
    if (res.ok) setPayload(await res.json() as IntegrationEventsPayload)
    setRefreshing(false)
  }, [serverId])

  useEffect(() => {
    if (!serverId || serverId === '0') return
    const interval = setInterval(() => void handleRefresh(), 30_000)
    return () => clearInterval(interval)
  }, [serverId, handleRefresh])

  const events = (payload?.events ?? []).filter((e) => filter === 'all' || e.type === filter)

  const FILTERS: { key: EventFilter; label: string }[] = [
    { key: 'all', label: 'Усі' },
    { key: 'vote.received', label: 'Голоси' },
    { key: 'review.created', label: 'Відгуки' },
    { key: 'view.tracked', label: 'Перегляди' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className="btn btn-secondary"
            aria-label={f.label}
            style={{ fontSize: 12, padding: '4px 14px', color: filter === f.key ? 'var(--accent)' : 'var(--fg-3)', borderColor: filter === f.key ? 'color-mix(in oklab,var(--accent) 40%,transparent)' : undefined }}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
        <button
          className="btn btn-ghost"
          style={{ marginLeft: 'auto', fontSize: 12 }}
          disabled={refreshing}
          onClick={() => void handleRefresh()}
        >
          {refreshing ? '↻ Оновлення…' : '↻ Оновити'}
        </button>
        <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{events.length} подій · авто-refresh 30 сек</span>
      </div>

      <div className="set-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['Тип події', 'Payload', 'Час'].map((h) => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--fg-3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--fg-3)' }}>Подій не знайдено</td></tr>
            ) : events.map((e) => (
              <tr key={e.id} style={{ borderBottom: '1px solid var(--line-2)' }}>
                <td style={{ padding: '9px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: EVENT_COLORS[e.type] ?? 'var(--fg-3)', flexShrink: 0, boxShadow: `0 0 5px ${EVENT_COLORS[e.type] ?? 'transparent'}` }} />
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{EVENT_LABELS[e.type] ?? e.type}</code>
                  </div>
                </td>
                <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-2)', maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {Object.entries(e.payload).map(([k, v]) => `${k}: ${String(v)}`).join(' · ') || '—'}
                </td>
                <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{fmtTime(e.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Integrations tab ─────────────────────────────────────────────────────────

const StatusDot = ({ on }: { on: boolean }) => (
  <span style={{ width: 7, height: 7, borderRadius: '50%', display: 'inline-block', flexShrink: 0, background: on ? 'var(--green)' : 'var(--fg-3)', boxShadow: on ? '0 0 6px var(--green)' : 'none' }} />
)

const ChannelCard = ({ icon, label, enabled, detail }: { icon: string; label: string; enabled: boolean; detail?: string | null }) => (
  <div className="set-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
    <div style={{ fontSize: 20, flexShrink: 0 }}>{icon}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
      {detail && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail}</div>}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, border: '1px solid var(--line)', background: enabled ? 'color-mix(in oklab,var(--green) 8%,transparent)' : 'transparent', fontSize: 12, color: enabled ? 'var(--green)' : 'var(--fg-3)', flexShrink: 0 }}>
      <StatusDot on={enabled} />
      {enabled ? 'enabled' : 'disabled'}
    </div>
  </div>
)

const IntegrationsTab = ({ payload }: { payload: IntegrationServerPayload | null }) => {
  if (!payload) return <div className="set-card" style={{ color: 'var(--fg-3)' }}>Немає даних</div>
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 10 }}>
        <ChannelCard icon="💬" label="Discord" enabled={payload.integrations.discord.enabled} detail={payload.integrations.discord.webhook_url} />
        <ChannelCard icon="✈️" label="Telegram" enabled={payload.integrations.telegram.enabled} detail={payload.integrations.telegram.bot_username ? `@${payload.integrations.telegram.bot_username}` : null} />
        <ChannelCard icon="🔌" label="Plugin API" enabled={payload.integrations.plugin.enabled} detail={payload.integrations.plugin.endpoint} />
        <ChannelCard icon="🪝" label="Webhook" enabled={payload.integrations.webhook.enabled} detail={payload.integrations.webhook.signature_type ? `sig: ${payload.integrations.webhook.signature_type}` : null} />
      </div>

      <div className="set-card">
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>Rate Limits</div>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {[
            { label: 'Запитів / хвилину', value: String(payload.rate_limit.requests_per_minute) },
            { label: 'Запитів сьогодні', value: String(payload.rate_limit.requests_today) },
            { label: 'Скидання о', value: new Date(payload.rate_limit.reset_at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) },
          ].map((item) => (
            <div key={item.label}>
              <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--fg)' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="set-card">
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>Тест ендпоінту</div>
        <CurlBlock snippet={`curl -X POST "${API_BASE}/api/v1/integrations/servers/${payload.id}/test" \\\n  -H "Content-Type: application/json" \\\n  -d '{"channel":"discord"}'`} />
      </div>
    </div>
  )
}

// ─── Root component ───────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'docs', label: 'API Docs' },
  { key: 'keys', label: 'API Keys' },
  { key: 'events', label: 'Events' },
  { key: 'integrations', label: 'Integrations' },
]

export function DeveloperHubClient({
  initialUser,
  role,
  serverOptions,
  selectedServerId,
  serverPayload,
  eventsPayload,
  initialTokens,
}: DeveloperHubClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>('docs')

  const serverId = String(selectedServerId ?? serverOptions[0]?.id ?? '0')
  const isEmptyState = !selectedServerId || serverOptions.length === 0

  const handleServerChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('serverId', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  const metricTiles = useMemo(() => serverPayload ? [
    { label: 'Статус', value: serverPayload.health_state === 'healthy' ? 'Healthy' : 'Warning', color: serverPayload.health_state === 'healthy' ? 'var(--green)' : 'var(--amber)' },
    { label: 'Подій / місяць', value: serverPayload.events_monthly.toLocaleString('uk-UA'), color: 'var(--accent)' },
    { label: 'Голосів / місяць', value: serverPayload.votes_monthly.toLocaleString('uk-UA'), color: 'var(--accent-3)' },
    { label: 'Score', value: serverPayload.score.toFixed(2), color: 'var(--accent-2)' },
  ] : [], [serverPayload])

  return (
    <PageShell active="developers" initialUser={initialUser} hiddenKeys={['notifications']}>
      <div className="page-main">

        {/* Topbar */}
        <div className="page-topbar" style={{ flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div className="page-crumb">dashboard / developers</div>
            <h1 className="page-title">API для розробників</h1>
            <p style={{ margin: '5px 0 0', color: 'var(--fg-2)', fontSize: 13 }}>
              REST API · PAT токени · Webhook події · Документація
            </p>
          </div>
          {serverOptions.length > 1 && (
            <label style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 5, minWidth: 260, fontSize: 11.5, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
              АКТИВНИЙ СЕРВЕР
              <select
                className="select-pretty"
                style={{ minWidth: 260 }}
                value={String(selectedServerId ?? '')}
                onChange={(e) => handleServerChange(e.target.value)}
                aria-label="Select server"
              >
                {serverOptions.map((srv) => (
                  <option key={srv.id} value={String(srv.id)}>{srv.name}  ·  {srv.addr}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        {/* Empty state */}
        {isEmptyState && (
          <section className="set-card" style={{ display: 'grid', gap: 12 }}>
            <h3 style={{ margin: 0 }}>Ще немає сервера</h3>
            <p style={{ margin: 0, color: 'var(--fg-2)', fontSize: 13 }}>Додай сервер, щоб отримати live endpoint-и та приклади curl.</p>
            <div><Link href="/add-server" className="btn btn-primary">Подати заявку →</Link></div>
          </section>
        )}

        {!isEmptyState && (
          <>
            {/* Metric tiles */}
            {serverPayload && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10, marginBottom: 20 }}>
                {metricTiles.map((t) => (
                  <div key={t.label} className="set-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: t.color, lineHeight: 1 }}>{t.value}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 0 }}>
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  aria-label={t.label}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '8px 18px', fontSize: 13, fontWeight: 500,
                    color: tab === t.key ? 'var(--accent)' : 'var(--fg-3)',
                    borderBottom: `2px solid ${tab === t.key ? 'var(--accent)' : 'transparent'}`,
                    marginBottom: -1, transition: 'color 0.12s',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {tab === 'docs' && <DocsTab serverId={serverId} />}
            {tab === 'keys' && <ApiKeysTab initialTokens={initialTokens} />}
            {tab === 'events' && <EventsTab initialPayload={eventsPayload} serverId={serverId} />}
            {tab === 'integrations' && <IntegrationsTab payload={serverPayload} />}
          </>
        )}
      </div>
    </PageShell>
  )
}
