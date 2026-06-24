'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import type { AuthUser } from '@/lib/auth-db'
import type { AnimilairProduct, AnimilairAuthor } from '@/lib/animilair-db'
import { IMAGE_PLACEHOLDER } from '@/lib/placeholders'

type Catalog = {
  authors: AnimilairAuthor[]
  products: AnimilairProduct[]
}

type Props = {
  initialUser: AuthUser | null
  catalog: Catalog
}

type OrderForm = {
  productId: number
  title: string
  brief: string
  budget: string
  deadline: string
  contact: string
}

const EMPTY_ORDER: OrderForm = {
  productId: 0,
  title: '',
  brief: '',
  budget: '',
  deadline: '',
  contact: '',
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'Усе',
  branding: 'Брендинг',
  render: 'Рендери',
  motion: 'Анімація',
  social: 'Соцмережі',
  design: 'Дизайн',
}

function formatPrice(value: number | null) {
  if (!value) return 'за домовленістю'
  return `від ${value.toLocaleString('uk-UA')} грн`
}

export function AnimilairClient({ initialUser, catalog }: Props) {
  const router = useRouter()
  const [category, setCategory] = useState('all')
  const [selected, setSelected] = useState<AnimilairProduct | null>(null)
  const [form, setForm] = useState<OrderForm>(EMPTY_ORDER)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const categories = useMemo(() => {
    const values = Array.from(new Set(catalog.products.map((product) => product.category)))
    return ['all', ...values]
  }, [catalog.products])

  const products = useMemo(() => {
    if (category === 'all') return catalog.products
    return catalog.products.filter((product) => product.category === category)
  }, [catalog.products, category])

  const openOrder = (product: AnimilairProduct) => {
    if (!initialUser) {
      router.push('/login')
      return
    }
    setSelected(product)
    setForm({
      ...EMPTY_ORDER,
      productId: product.id,
      title: `Замовлення: ${product.title}`,
    })
    setMessage(null)
  }

  const submitOrder = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch('/api/partners/animilair/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await response.json() as { error?: string; order?: { id: number } }
      if (!response.ok) {
        throw new Error(payload.error || 'Не вдалося створити замовлення')
      }
      setMessage({ type: 'success', text: 'Замовлення створено. Відкриваю чат...' })
      setTimeout(() => {
        router.push('/partners/animilair/orders')
      }, 500)
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Помилка замовлення' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell active="animilair" initialUser={initialUser}>
      <main className="page-main animilair-page">
        <section className="animilair-hero">
          <div className="animilair-hero-copy">
            <Breadcrumbs items={[
              { label: 'Eyzencore', href: '/' },
              { label: 'Партнери' },
              { label: 'AnimiLair Studio' },
            ]} />
            <div className="animilair-eyebrow">Партнерський маркетплейс</div>
            <h1>AnimiLair Studio</h1>
            <p>
              Дизайн, Minecraft-реклама, рендери, банери, логотипи й анімації для серверів.
              Оберіть послугу, перегляньте портфоліо автора і створіть замовлення прямо на Eyzencore.
            </p>
            <div className="animilair-hero-actions">
              <a href="#works" className="btn btn-primary">Переглянути роботи</a>
              <Link href="/partners/animilair/orders" className="btn btn-secondary">Мої замовлення</Link>
            </div>
          </div>
          <div className="animilair-hero-card">
            <span className="animilair-live-dot" />
            <p>Creative desk</p>
            <strong>Портфоліо → заявка → чат із замовником</strong>
            <div className="animilair-mini-grid">
              <span>Logo</span>
              <span>Render</span>
              <span>Motion</span>
              <span>Promo</span>
            </div>
          </div>
        </section>

        <section className="animilair-section">
          <div className="animilair-section-head">
            <div>
              <span className="animilair-eyebrow">Автори</span>
              <h2>Команда, яка буде робити ваш візуал</h2>
            </div>
          </div>
          <div className="animilair-authors">
            {catalog.authors.map((author) => (
              <article className="animilair-author-card" key={author.id}>
                <div className="animilair-author-banner" style={{ backgroundImage: `url(${author.bannerUrl || IMAGE_PLACEHOLDER})` }} />
                <div className="animilair-author-main">
                  <div className="animilair-author-avatar" style={{ backgroundImage: `url(${author.avatarUrl || IMAGE_PLACEHOLDER})` }} />
                  <div>
                    <h3>{author.name}</h3>
                    <p>{author.role}</p>
                  </div>
                </div>
                <p className="animilair-author-bio">{author.bio}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="animilair-section" id="works">
          <div className="animilair-section-head">
            <div>
              <span className="animilair-eyebrow">Послуги</span>
              <h2>Що можна замовити</h2>
            </div>
            <div className="forum-sort animilair-category-tabs">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={category === item ? 'active' : ''}
                  onClick={() => setCategory(item)}
                >
                  {CATEGORY_LABELS[item] || item}
                </button>
              ))}
            </div>
          </div>

          <div className="animilair-products">
            {products.map((product) => (
              <article className="animilair-product-card" key={product.id}>
                <div className="animilair-product-cover" style={{ backgroundImage: `url(${product.coverUrl || IMAGE_PLACEHOLDER})` }}>
                  {product.featured && <span>Рекомендовано</span>}
                </div>
                <div className="animilair-product-body">
                  <div className="animilair-product-meta">
                    <span>{CATEGORY_LABELS[product.category] || product.category}</span>
                    <span>{formatPrice(product.priceFrom)}</span>
                  </div>
                  <h3>{product.title}</h3>
                  <p>{product.shortDesc}</p>
                  <div className="animilair-tags">
                    {product.tags.slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                  <div className="animilair-portfolio-strip">
                    {(product.media.length ? product.media : [{ id: 0, url: product.coverUrl || IMAGE_PLACEHOLDER, type: 'image', caption: '' }]).slice(0, 3).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="animilair-portfolio-thumb"
                        style={{ backgroundImage: `url(${item.url || IMAGE_PLACEHOLDER})` }}
                        aria-label={item.caption || product.title}
                      />
                    ))}
                  </div>
                  <div className="animilair-product-foot">
                    <div>
                      <span>Автор</span>
                      <strong>{product.author?.name || 'AnimiLair'}</strong>
                    </div>
                    <button type="button" className="btn btn-primary" onClick={() => openOrder(product)}>
                      Замовити
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {selected && (
        <div className="modal-backdrop is-open animilair-order-backdrop" onClick={() => setSelected(null)} role="dialog" aria-modal="true">
          <div className="modal-card is-open animilair-order-modal" onClick={(event) => event.stopPropagation()}>
            <header className="modal-head">
              <div>
                <h3>Замовити: {selected.title}</h3>
                <p>{formatPrice(selected.priceFrom)} · {selected.deliveryDays ? `${selected.deliveryDays} дн.` : 'термін обговорюється'}</p>
              </div>
              <button className="btn btn-ghost modal-close" type="button" onClick={() => setSelected(null)}>×</button>
            </header>
            <div className="modal-body animilair-order-form">
              <label>
                Назва замовлення
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label>
                Опис задачі
                <textarea
                  rows={7}
                  placeholder="Опишіть сервер, стиль, кольори, що саме треба зробити, де буде використовуватись робота."
                  value={form.brief}
                  onChange={(event) => setForm((current) => ({ ...current, brief: event.target.value }))}
                />
              </label>
              <div className="animilair-form-grid">
                <label>
                  Бюджет
                  <input placeholder="Наприклад: 1500 грн" value={form.budget} onChange={(event) => setForm((current) => ({ ...current, budget: event.target.value }))} />
                </label>
                <label>
                  Дедлайн
                  <input placeholder="Наприклад: до пʼятниці" value={form.deadline} onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))} />
                </label>
              </div>
              <label>
                Контакт для звʼязку
                <input placeholder="Telegram або Discord" value={form.contact} onChange={(event) => setForm((current) => ({ ...current, contact: event.target.value }))} />
              </label>
              {message && <div className={`animilair-form-message ${message.type}`}>{message.text}</div>}
            </div>
            <footer className="modal-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>Скасувати</button>
              <button type="button" className="btn btn-primary" disabled={busy || !form.title.trim() || !form.brief.trim()} onClick={() => void submitOrder()}>
                {busy ? 'Створюємо...' : 'Створити замовлення'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </PageShell>
  )
}
