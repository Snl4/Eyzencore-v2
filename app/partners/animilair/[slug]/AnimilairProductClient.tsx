'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import type { AuthUser } from '@/lib/auth-db'
import type { AnimilairProduct } from '@/lib/animilair-db'
import { IMAGE_PLACEHOLDER } from '@/lib/placeholders'

type Props = {
  initialUser: AuthUser | null
  product: AnimilairProduct
}

type OrderForm = {
  title: string
  brief: string
  budget: string
  deadline: string
  contact: string
}

const CATEGORY_LABELS: Record<string, string> = {
  branding: 'Брендинг',
  render: 'Рендери',
  motion: 'Анімація',
  social: 'Соцмережі',
  design: 'Дизайн',
  discord: 'Discord',
  builds: 'Побудови',
  models: '3D-моделі',
  plugins: 'Плагіни',
  textures: 'Текстур-паки',
}

function cleanImageUrl(value: string | null | undefined) {
  const url = String(value || '').trim()
  if (!url || url === IMAGE_PLACEHOLDER || url.includes('/images/placeholder-minecraft.jpg')) return ''
  return url
}

function formatPrice(value: number | null) {
  if (!value) return 'За домовленістю'
  return `від ${value.toLocaleString('uk-UA')} грн`
}

export function AnimilairProductClient({ initialUser, product }: Props) {
  const router = useRouter()
  const images = useMemo(() => {
    const urls = [
      cleanImageUrl(product.coverUrl),
      ...product.media.map((item) => cleanImageUrl(item.url)),
    ].filter(Boolean)
    return Array.from(new Set(urls))
  }, [product])
  const [activeImage, setActiveImage] = useState(images[0] || '')
  const [form, setForm] = useState<OrderForm>({
    title: `Замовлення: ${product.title}`,
    brief: '',
    budget: product.priceFrom ? `${product.priceFrom} грн` : '',
    deadline: product.deliveryDays ? `${product.deliveryDays} дн.` : '',
    contact: '',
  })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const submitOrder = async () => {
    if (!initialUser) {
      router.push('/login')
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch('/api/partners/animilair/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, ...form }),
      })
      const payload = await response.json() as { error?: string; order?: { id: number } }
      if (!response.ok || !payload.order?.id) {
        throw new Error(payload.error || 'Не вдалося створити замовлення')
      }
      setMessage({ type: 'success', text: 'Замовлення створено. Відкриваю чат...' })
      setTimeout(() => router.push(`/partners/animilair/orders?order=${payload.order?.id}`), 350)
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Помилка замовлення' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell active="animilair" initialUser={initialUser}>
      <main className="page-main animilair-detail-page">
        <Breadcrumbs items={[
          { label: 'Eyzencore', href: '/' },
          { label: 'AnimiLair Studio', href: '/partners/animilair' },
          { label: product.title },
        ]} />

        <section className="animilair-detail-layout">
          <article className="animilair-detail-main">
            <div className="animilair-eyebrow">{CATEGORY_LABELS[product.category] || product.category}</div>
            <h1>{product.title}</h1>

            <div className="animilair-detail-gallery">
              {activeImage ? (
                <div className="animilair-detail-image" style={{ backgroundImage: `url(${activeImage})` }} />
              ) : (
                <div className="animilair-detail-noimage">
                  <strong>{product.title}</strong>
                  <span>Автор ще не додав зображення портфоліо</span>
                </div>
              )}
              {images.length > 1 && (
                <div className="animilair-detail-thumbs">
                  {images.map((url) => (
                    <button
                      key={url}
                      type="button"
                      className={url === activeImage ? 'active' : ''}
                      style={{ backgroundImage: `url(${url})` }}
                      onClick={() => setActiveImage(url)}
                      aria-label="Показати фото"
                    />
                  ))}
                </div>
              )}
            </div>

            <section className="animilair-detail-section">
              <h2>Що входить</h2>
              <p>{product.description}</p>
              {product.tags.length > 0 && (
                <div className="animilair-tags">
                  {product.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
              )}
            </section>

            <section className="animilair-detail-section">
              <h2>Як проходить замовлення</h2>
              <ol className="animilair-steps">
                <li>Ви описуєте задачу та додаєте референси.</li>
                <li>Дизайнер приймає замовлення і уточнює деталі в чаті.</li>
                <li>Усі правки та обговорення залишаються прямо на Eyzencore.</li>
                <li>Після готовності дизайнер передає результат у чаті.</li>
              </ol>
            </section>

            <section className="animilair-detail-section">
              <h2>Відгуки</h2>
              <div className="animilair-review-empty">
                Поки немає відгуків по цій послузі. Перші завершені замовлення зʼявляться тут.
              </div>
            </section>
          </article>

          <aside className="animilair-detail-side">
            <div className="animilair-buy-card">
              <span>Договірна ціна</span>
              <strong>{formatPrice(product.priceFrom)}</strong>
              <div className="animilair-buy-row">
                <span>Термін</span>
                <b>{product.deliveryDays ? `${product.deliveryDays} дн.` : 'обговорюється'}</b>
              </div>
              <button className="btn btn-primary" type="button" disabled={busy || !form.brief.trim()} onClick={() => void submitOrder()}>
                {busy ? 'Створюємо...' : 'Створити замовлення'}
              </button>
              <a className="btn btn-secondary" href="#brief">Обговорити замовлення</a>
              <ul>
                <li>Чат з автором відкриється одразу після заявки.</li>
                <li>Контакти можна додати в ТЗ, але деталі краще вести тут.</li>
                <li>Адміністратор бачить замовлення для модерації.</li>
              </ul>
            </div>

            <div className="animilair-author-panel">
              {cleanImageUrl(product.author?.avatarUrl) && (
                <img src={cleanImageUrl(product.author?.avatarUrl)} alt="" />
              )}
              <div>
                <h3>{product.author?.name || 'AnimiLair Studio'}</h3>
                <p>{product.author?.role || 'Designer'}</p>
              </div>
              <span className="animilair-online">зазвичай відповідає швидко</span>
            </div>

            <div className="animilair-brief-card" id="brief">
              <h3>ТЗ для замовлення</h3>
              <label>
                Назва
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label>
                Опишіть, що треба зробити
                <textarea
                  rows={7}
                  value={form.brief}
                  onChange={(event) => setForm((current) => ({ ...current, brief: event.target.value }))}
                  placeholder="Стиль, розміри, текст, кольори, дедлайн, посилання на сервер і референси..."
                />
              </label>
              <label>
                Бюджет
                <input value={form.budget} onChange={(event) => setForm((current) => ({ ...current, budget: event.target.value }))} />
              </label>
              <label>
                Дедлайн
                <input value={form.deadline} onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))} />
              </label>
              <label>
                Контакт
                <input value={form.contact} onChange={(event) => setForm((current) => ({ ...current, contact: event.target.value }))} placeholder="Discord або Telegram" />
              </label>
              {message && <div className={`animilair-form-message ${message.type}`}>{message.text}</div>}
            </div>
          </aside>
        </section>

        <Link href="/partners/animilair" className="btn btn-secondary">← До всіх послуг</Link>
      </main>
    </PageShell>
  )
}
