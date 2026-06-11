'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { Toggle } from '@/components/ui/Toggle'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Select } from '@/components/ui/Select'
import type { ApiToken, AuthUser } from '@/lib/auth-db'

type Tab = 'docs' | 'keys' | 'callback' | 'test'
type ServerOption = { id: number; name: string; addr: string }
type QueryKey = 'votes_today' | 'votes_month' | 'votes_prev_month' | 'votes_all' | 'likes' | 'comments'

interface DeveloperHubClientProps {
  initialUser: AuthUser
  serverOptions: ServerOption[]
  selectedServerId: number | null
  initialTokens: ApiToken[]
}

const ENDPOINT = 'https://eyzencore.com/api/external/server'
const QUERY_OPTIONS: Array<{ key: QueryKey; label: string; description: string }> = [
  { key: 'votes_today', label: 'votes_today', description: 'Голоси за сьогодні' },
  { key: 'votes_month', label: 'votes_month', description: 'Голоси за поточний місяць' },
  { key: 'votes_prev_month', label: 'votes_prev_month', description: 'Голоси за попередній місяць' },
  { key: 'votes_all', label: 'votes_all', description: 'Усі голоси за весь час' },
  { key: 'likes', label: 'likes', description: 'Список вподобайок' },
  { key: 'comments', label: 'comments', description: 'Коментарі та оцінки' },
]
const RESPONSE_FIELDS = [
  ['id', 'number', 'Числовий ID сервера'],
  ['slug', 'string', 'URL-slug сервера'],
  ['name', 'string', 'Назва сервера'],
  ['rating', 'float', 'Середній рейтинг від 0 до 5'],
  ['created_at', 'datetime', 'Дата реєстрації на платформі'],
  ['votes_*', 'array', 'Запитані списки голосів'],
  ['likes', 'array', 'Список вподобайок, якщо запитано'],
  ['comments', 'array', 'Коментарі з текстом та рейтингом, якщо запитано'],
]
const ERROR_CODES = [
  ['403', 'Forbidden', 'API-ключ відсутній, відкликаний або неправильний'],
  ['404', 'Not Found', 'Сервер не знайдено або більше недоступний'],
  ['429', 'Too Many Requests', 'Перевищено ліміт 20 запитів за хвилину'],
  ['500', 'Server Error', 'Внутрішня помилка сервера'],
]
const EXAMPLE_RESPONSE = {
  id: 42,
  slug: 'my-server',
  name: 'My Server',
  rating: 4.8,
  created_at: '2026-01-15T10:30:00.000Z',
  votes_today: [
    { user_id: 'user_123', user_nickname: 'PlayerName', created_at: '2026-06-11T09:00:00.000Z' },
  ],
  comments: [
    { user_id: 'user_987', user_nickname: 'AnotherPlayer', created_at: '2026-06-10T20:00:00.000Z', rating: 5, text: 'Чудовий сервер!' },
  ],
}

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(children)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
  return (
    <div className="external-code">
      <button type="button" onClick={() => void copy()}>{copied ? 'Скопійовано' : 'Копіювати'}</button>
      <pre><code>{children}</code></pre>
    </div>
  )
}

function DataTable({ rows, headers }: { rows: string[][]; headers: string[] }) {
  return (
    <div className="external-table-wrap">
      <table className="external-table">
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join(':')}>
              {row.map((cell, index) => <td key={`${cell}-${index}`}><span className={index < 2 ? 'external-code-text' : ''}>{cell}</span></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DocsTab() {
  const curl = `curl "${ENDPOINT}?votes_today=true&likes=true&comments=true" \\\n  -H "X-Eyzencore-API-Key: ваш_api_ключ"`
  return (
    <div className="external-doc-layout">
      <aside className="external-doc-nav">
        <span>На цій сторінці</span>
        <a href="#endpoint">Endpoint</a>
        <a href="#authorization">Авторизація</a>
        <a href="#query">Query-параметри</a>
        <a href="#response">Структура відповіді</a>
        <a href="#example">Приклад</a>
        <a href="#errors">Коди помилок</a>
      </aside>
      <div className="external-doc-content">
        <section id="endpoint" className="external-section external-endpoint-card">
          <div>
            <span className="external-kicker">Зовнішній API</span>
            <h2>Дані сервера для ботів, сайтів та плагінів</h2>
            <p>Отримуйте рейтинг, голоси, вподобайки та відгуки через один захищений endpoint. Базова відповідь компактна, додаткові списки вмикаються query-параметрами.</p>
          </div>
          <div className="external-endpoint-row"><span className="external-method">GET</span><code>{ENDPOINT}</code></div>
          <div className="external-limit"><b>20</b><span>запитів за хвилину для кожного ключа</span></div>
        </section>
        <section id="authorization" className="external-section">
          <div className="external-section-heading"><span>01</span><div><h3>Авторизація</h3><p>Передавайте ключ у заголовку кожного запиту. Ключ створюється окремо для вибраного сервера.</p></div></div>
          <CodeBlock>X-Eyzencore-API-Key: ваш_api_ключ</CodeBlock>
          <div className="external-note">Ключ показується повністю лише один раз. Не додавайте його у frontend-код або публічний репозиторій.</div>
        </section>
        <section id="query" className="external-section">
          <div className="external-section-heading"><span>02</span><div><h3>Query-параметри</h3><p>Передайте <code>true</code> або <code>1</code>. Без параметрів повертаються лише базові поля сервера.</p></div></div>
          <DataTable headers={['Параметр', 'Тип', 'Опис']} rows={QUERY_OPTIONS.map((item) => [item.key, 'boolean', item.description])} />
        </section>
        <section id="response" className="external-section">
          <div className="external-section-heading"><span>03</span><div><h3>Структура відповіді</h3><p>Час повертається в ISO 8601, рейтинг округлюється до двох знаків.</p></div></div>
          <DataTable headers={['Поле', 'Тип', 'Опис']} rows={RESPONSE_FIELDS} />
        </section>
        <section id="example" className="external-section">
          <div className="external-section-heading"><span>04</span><div><h3>Приклад запиту</h3><p>Запит із голосами за сьогодні, вподобайками та коментарями.</p></div></div>
          <CodeBlock>{curl}</CodeBlock>
          <h4>Response 200</h4>
          <CodeBlock>{JSON.stringify(EXAMPLE_RESPONSE, null, 2)}</CodeBlock>
        </section>
        <section id="errors" className="external-section">
          <div className="external-section-heading"><span>05</span><div><h3>Коди помилок</h3><p>Rate-limit заголовки повертаються у кожній авторизованій відповіді.</p></div></div>
          <DataTable headers={['Код', 'Статус', 'Опис']} rows={ERROR_CODES} />
        </section>
      </div>
    </div>
  )
}

function KeysTab({ serverId, initialTokens }: { serverId: number; initialTokens: ApiToken[] }) {
  const [tokens, setTokens] = useState(initialTokens)
  const [name, setName] = useState('Production integration')
  const [createdKey, setCreatedKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function createKey() {
    setBusy(true)
    setError('')
    const response = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, serverId, scopes: ['servers:read'] }),
    })
    const payload = await response.json()
    if (!response.ok) setError(payload.error || 'Не вдалося створити ключ')
    else {
      setTokens((current) => [payload.token, ...current])
      setCreatedKey(payload.plaintext)
      setName('')
    }
    setBusy(false)
  }

  async function revokeKey(id: string) {
    const response = await fetch(`/api/tokens/${id}`, { method: 'DELETE' })
    if (response.ok) setTokens((current) => current.filter((token) => token.id !== id))
  }

  return (
    <div className="external-keys-grid">
      <section className="external-panel">
        <span className="external-kicker">Новий ключ</span>
        <h2>Підключіть інтеграцію</h2>
        <p>Ключ матиме доступ лише до вибраного сервера та публічних даних engagement.</p>
        <label className="external-field"><span>Назва ключа</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Наприклад, Discord bot" /></label>
        {error && <div className="external-error">{error}</div>}
        <button className="btn btn-primary" disabled={busy || !name.trim()} onClick={() => void createKey()}>{busy ? 'Створення…' : 'Створити API-ключ'}</button>
        {createdKey && <div className="external-secret"><div><b>Ключ створено</b><span>Збережіть його зараз. Повторно він не показуватиметься.</span></div><CodeBlock>{createdKey}</CodeBlock></div>}
      </section>
      <section className="external-panel">
        <div className="external-panel-title"><div><span className="external-kicker">Активні ключі</span><h2>{tokens.length} ключів</h2></div></div>
        <div className="external-token-list">
          {tokens.length === 0 && <div className="external-empty">Для цього сервера ще немає API-ключів.</div>}
          {tokens.map((token) => (
            <article key={token.id} className="external-token">
              <div className="external-token-icon">•••</div>
              <div><b>{token.name}</b><span>Створено {new Date(token.createdAt).toLocaleDateString('uk-UA')} · {token.lastUsedAt ? `використано ${new Date(token.lastUsedAt).toLocaleString('uk-UA')}` : 'ще не використовувався'}</span></div>
              <button type="button" onClick={() => void revokeKey(token.id)}>Відкликати</button>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function TestTab() {
  const [apiKey, setApiKey] = useState('')
  const [selected, setSelected] = useState<QueryKey[]>(['votes_today', 'likes'])
  const [response, setResponse] = useState<unknown>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const query = useMemo(() => selected.map((key) => `${key}=true`).join('&'), [selected])

  function toggle(key: QueryKey) {
    setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])
  }
  async function sendRequest() {
    setBusy(true)
    const started = performance.now()
    try {
      const result = await fetch(`/api/external/server${query ? `?${query}` : ''}`, {
        headers: { 'X-Eyzencore-API-Key': apiKey.trim() },
        cache: 'no-store',
      })
      setStatus(result.status)
      setResponse(await result.json())
    } catch {
      setStatus(500)
      setResponse({ error: 'Не вдалося виконати запит' })
    } finally {
      setDuration(Math.round(performance.now() - started))
      setBusy(false)
    }
  }

  return (
    <div className="external-test-grid">
      <section className="external-panel">
        <span className="external-kicker">Live request</span><h2>Тест API</h2>
        <p>Ключ надсилається лише на endpoint Eyzencore і не зберігається у браузері.</p>
        <label className="external-field"><span>API-ключ</span><input type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Вставте створений ключ" /></label>
        <div className="external-query-grid">
          {QUERY_OPTIONS.map((option) => (
            <Toggle key={option.key} variant="outline" pressed={selected.includes(option.key)} onPressedChange={() => toggle(option.key)} className="external-query-toggle">
              <span>{option.label}</span><small>{option.description}</small>
            </Toggle>
          ))}
        </div>
        <button className="btn btn-primary" disabled={busy || !apiKey.trim()} onClick={() => void sendRequest()}>{busy ? 'Надсилання…' : 'Надіслати запит'}</button>
      </section>
      <section className="external-console">
        <header><span>Response</span>{status && <div><b className={status < 400 ? 'ok' : 'bad'}>{status}</b>{duration !== null && <span>{duration} ms</span>}</div>}</header>
        <pre>{response ? JSON.stringify(response, null, 2) : '// Тут з’явиться реальна відповідь API'}</pre>
      </section>
    </div>
  )
}

type CallbackSettings = {
  callbackUrl: string
  authHeader: string
  authToken: string
  events: Array<'vote' | 'comment' | 'like'>
  isActive: boolean
  nuvotifierEnabled: boolean
  nuvotifierHost: string
  nuvotifierPort: number
  nuvotifierToken: string
}

type CallbackDelivery = {
  id: number
  action: string
  destination: string
  status: string
  statusCode: number | null
  error: string | null
  createdAt: string
}

const EMPTY_CALLBACK: CallbackSettings = {
  callbackUrl: '',
  authHeader: 'Authorization',
  authToken: '',
  events: ['vote', 'comment', 'like'],
  isActive: false,
  nuvotifierEnabled: false,
  nuvotifierHost: '',
  nuvotifierPort: 8192,
  nuvotifierToken: '',
}

function CallbackTab({ serverId }: { serverId: number }) {
  const [settings, setSettings] = useState<CallbackSettings>(EMPTY_CALLBACK)
  const [deliveries, setDeliveries] = useState<CallbackDelivery[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState('')
  const [testAction, setTestAction] = useState<'vote' | 'comment' | 'like'>('vote')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const response = await fetch(`/api/callbacks/${serverId}`, { cache: 'no-store' })
      if (response.ok && !cancelled) {
        const payload = await response.json()
        setSettings(payload.settings)
        setDeliveries(payload.deliveries)
      }
      if (!cancelled) setLoading(false)
    }
    void load()
    return () => { cancelled = true }
  }, [serverId])

  function toggleEvent(action: 'vote' | 'comment' | 'like') {
    setSettings((current) => ({
      ...current,
      events: current.events.includes(action)
        ? current.events.filter((item) => item !== action)
        : [...current.events, action],
    }))
  }

  async function save() {
    setSaving(true)
    setMessage('')
    const response = await fetch(`/api/callbacks/${serverId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    const payload = await response.json()
    setMessage(response.ok ? 'Налаштування збережено' : payload.error || 'Не вдалося зберегти')
    if (response.ok) setSettings(payload.settings)
    setSaving(false)
  }

  async function test() {
    setTesting(true)
    setMessage('')
    await save()
    const response = await fetch(`/api/callbacks/${serverId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: testAction }),
    })
    const payload = await response.json()
    setDeliveries(payload.deliveries || [])
    setMessage(payload.success ? 'Тестову подію доставлено' : 'Тест завершився з помилкою. Перевірте журнал.')
    setTesting(false)
  }

  if (loading) return <section className="external-panel external-empty">Завантаження налаштувань…</section>

  return (
    <div className="callback-layout">
      <div className="callback-main">
        <section className="external-panel">
          <div className="callback-section-head">
            <div><span className="external-kicker">HTTP callback</span><h2>Доставка подій</h2><p>Після голосу, коментаря або вподобайки Eyzencore надішле JSON через POST.</p></div>
            <Toggle variant="outline" pressed={settings.isActive} onPressedChange={(value) => setSettings((current) => ({ ...current, isActive: value }))}>
              {settings.isActive ? 'Увімкнено' : 'Вимкнено'}
            </Toggle>
          </div>
          <label className="external-field"><span>Callback URL</span><input value={settings.callbackUrl} onChange={(event) => setSettings((current) => ({ ...current, callbackUrl: event.target.value }))} placeholder="https://example.com/api/eyzencore/callback" /></label>
          <div className="callback-two-columns">
            <label className="external-field"><span>Заголовок авторизації</span><input value={settings.authHeader} onChange={(event) => setSettings((current) => ({ ...current, authHeader: event.target.value }))} placeholder="Authorization" /></label>
            <label className="external-field"><span>Токен / значення</span><input type="password" value={settings.authToken} onChange={(event) => setSettings((current) => ({ ...current, authToken: event.target.value }))} placeholder="Bearer your_secret_token" /></label>
          </div>
          <div className="callback-events">
            <span>Події для доставки</span>
            <div>
              {(['vote', 'comment', 'like'] as const).map((action) => (
                <Toggle key={action} variant="outline" pressed={settings.events.includes(action)} onPressedChange={() => toggleEvent(action)}>{action}</Toggle>
              ))}
            </div>
          </div>
          <CodeBlock>{JSON.stringify({
            id: 123,
            user_id: 'discord_user_id',
            created_at: '2026-06-11T12:00:00.000Z',
            action: 'vote',
            category: 'my-server',
            ip_address: '1.2.3.4',
            user_nickname: 'PlayerName',
          }, null, 2)}</CodeBlock>
        </section>

        <section className="external-panel">
          <div className="callback-section-head">
            <div><span className="external-kicker">Minecraft</span><h2>NuVotifier v2</h2><p>Для події <code>vote</code> пакет буде відправлено напряму до NuVotifier.</p></div>
            <Toggle variant="outline" pressed={settings.nuvotifierEnabled} onPressedChange={(value) => setSettings((current) => ({ ...current, nuvotifierEnabled: value }))}>
              {settings.nuvotifierEnabled ? 'Увімкнено' : 'Вимкнено'}
            </Toggle>
          </div>
          <div className="callback-votifier-grid">
            <label className="external-field"><span>Host</span><input value={settings.nuvotifierHost} onChange={(event) => setSettings((current) => ({ ...current, nuvotifierHost: event.target.value }))} placeholder="play.example.com" /></label>
            <label className="external-field"><span>Port</span><input type="number" min={1} max={65535} value={settings.nuvotifierPort} onChange={(event) => setSettings((current) => ({ ...current, nuvotifierPort: Number(event.target.value) }))} /></label>
            <label className="external-field"><span>NuVotifier token</span><input type="password" value={settings.nuvotifierToken} onChange={(event) => setSettings((current) => ({ ...current, nuvotifierToken: event.target.value }))} placeholder="Token з config.yml" /></label>
          </div>
        </section>

        <div className="callback-actions">
          <button className="btn btn-primary" disabled={saving} onClick={() => void save()}>{saving ? 'Збереження…' : 'Зберегти налаштування'}</button>
          {message && <span>{message}</span>}
        </div>
      </div>

      <aside className="callback-side">
        <section className="external-panel callback-test-panel">
          <span className="external-kicker">Тест доставки</span><h2>Надіслати подію</h2>
          <Select
            value={testAction}
            onChange={(value) => setTestAction(value as typeof testAction)}
            options={[
              { value: 'vote', label: 'Голосування · vote' },
              { value: 'comment', label: 'Коментар · comment' },
              { value: 'like', label: 'Вподобайка · like' },
            ]}
            ariaLabel="Тестова подія"
          />
          <button className="btn btn-primary" disabled={testing} onClick={() => void test()}>{testing ? 'Надсилання…' : 'Запустити тест'}</button>
        </section>
        <section className="external-panel">
          <div className="external-panel-title"><div><span className="external-kicker">Останні спроби</span><h2>Журнал</h2></div></div>
          <div className="callback-log">
            {deliveries.length === 0 && <div className="external-empty">Доставок ще не було.</div>}
            {deliveries.map((delivery) => (
              <article key={delivery.id}>
                <span className={`callback-status ${delivery.status}`}>{delivery.status}</span>
                <div><b>{delivery.action} · {delivery.statusCode || 'TCP'}</b><small>{delivery.destination}</small><small>{new Date(delivery.createdAt).toLocaleString('uk-UA')}</small>{delivery.error && <em>{delivery.error}</em>}</div>
              </article>
            ))}
          </div>
        </section>
      </aside>
    </div>
  )
}

const TABS: Array<{ key: Tab; label: string; description: string }> = [
  { key: 'docs', label: 'Документація', description: 'Endpoint та структура' },
  { key: 'keys', label: 'API-ключі', description: 'Створення і доступ' },
  { key: 'callback', label: 'Callback API', description: 'Події та NuVotifier' },
  { key: 'test', label: 'Тест API', description: 'Живий запит' },
]

export function DeveloperHubClient({ initialUser, serverOptions, selectedServerId, initialTokens }: DeveloperHubClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>('docs')
  const activeTabLabel = TABS.find((item) => item.key === tab)?.label || 'Документація'
  const selectedServer = serverOptions.find((server) => server.id === selectedServerId)
  function selectServer(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('serverId', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <PageShell active="developers" initialUser={initialUser} hiddenKeys={['notifications']}>
      <main className="page-main external-api-page">
        <header className="external-hero">
          <div>
            <Breadcrumbs items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Розробникам', href: '/dashboard/developers' },
              { label: activeTabLabel },
            ]} />
            <span className="external-kicker">Інструменти розробника</span>
            <h1>Зовнішній API</h1>
            <p>Підключайте дані сервера до Discord-бота, власного сайту, лаунчера або Minecraft-плагіна.</p>
          </div>
          {selectedServer && (
            <label className="external-server-select">
              <span>Активний сервер</span>
              <Select
                value={String(selectedServer.id)}
                onChange={selectServer}
                options={serverOptions.map((server) => ({
                  value: String(server.id),
                  label: `${server.name} · ${server.addr}`,
                }))}
                ariaLabel="Активний сервер"
              />
            </label>
          )}
        </header>
        {!selectedServerId ? (
          <section className="external-panel external-empty-state"><h2>Спочатку додайте сервер</h2><p>API-ключ завжди прив’язаний до конкретного сервера.</p><Link href="/add-server" className="btn btn-primary">Додати сервер</Link></section>
        ) : (
          <>
            <nav className="external-tabs">
              {TABS.map((item) => <button key={item.key} className={tab === item.key ? 'active' : ''} onClick={() => setTab(item.key)}><span>{item.label}</span><small>{item.description}</small></button>)}
            </nav>
            {tab === 'docs' && <DocsTab />}
            {tab === 'keys' && <KeysTab key={selectedServerId} serverId={selectedServerId} initialTokens={initialTokens} />}
            {tab === 'callback' && <CallbackTab key={selectedServerId} serverId={selectedServerId} />}
            {tab === 'test' && <TestTab />}
          </>
        )}
      </main>
    </PageShell>
  )
}
