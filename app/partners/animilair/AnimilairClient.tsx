'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AnimilairRatingStars } from '@/components/partners/AnimilairRatingStars'
import { PageShell } from '@/components/layout/PageShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import type { AuthUser } from '@/lib/auth-db'
import type { AnimilairAuthor, AnimilairProduct } from '@/lib/animilair-shared'
import { AnimilairPortfolioUploader } from '@/components/partners/AnimilairPortfolioUploader'
import { IMAGE_PLACEHOLDER } from '@/lib/placeholders'

type Catalog = {
  authors: AnimilairAuthor[]
  products: AnimilairProduct[]
}

type Props = {
  initialUser: AuthUser | null
  catalog: Catalog
  heroDescription: string
}

type ProductForm = {
  title: string
  category: string
  description: string
  priceFrom: string
  deliveryDays: string
  coverUrl: string
  tags: string
  media: string
}

const EMPTY_PRODUCT: ProductForm = {
  title: '',
  category: 'design',
  description: '',
  priceFrom: '',
  deliveryDays: '',
  coverUrl: '',
  tags: '',
  media: '',
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'Усі',
  branding: 'Брендинг',
  render: 'Рендери',
  motion: 'Анімація',
  social: 'Соцмережі',
  design: 'Дизайн',
  discord: 'Discord',
  builds: 'Побудови',
  models: '3D-моделі',
  textures: 'Текстур-паки',
}

function cleanImageUrl(value: string | null | undefined) {
  const url = String(value || '').trim()
  if (!url || url === IMAGE_PLACEHOLDER || url.includes('/images/placeholder-minecraft.jpg')) return ''
  return url
}

function formatPrice(value: number | null) {
  if (!value) return 'за домовленістю'
  return `від ${value.toLocaleString('uk-UA')} грн`
}

function canCreateProduct(user: AuthUser | null) {
  const role = String(user?.user_metadata.role || '').toUpperCase()
  return role === 'DESIGNER' || role === 'ADMIN'
}

export function AnimilairClient({ initialUser, catalog, heroDescription: initialHeroDescription }: Props) {
  const router = useRouter()
  const [category, setCategory] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [productForm, setProductForm] = useState<ProductForm>(EMPTY_PRODUCT)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [heroDescription, setHeroDescription] = useState(initialHeroDescription)
  const [editingHero, setEditingHero] = useState(false)
  const [heroDraft, setHeroDraft] = useState(initialHeroDescription)
  const sellerMode = canCreateProduct(initialUser)

  const categories = useMemo(() => {
    const values = Array.from(new Set(catalog.products.map((product) => product.category)))
    return ['all', ...values]
  }, [catalog.products])

  const products = useMemo(() => {
    if (category === 'all') return catalog.products
    return catalog.products.filter((product) => product.category === category)
  }, [catalog.products, category])

  const submitProduct = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch('/api/partners/animilair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm),
      })
      const payload = await response.json() as { error?: string; product?: AnimilairProduct }
      if (!response.ok) throw new Error(payload.error || 'Не вдалося створити товар')
      setMessage({ type: 'success', text: 'Товар створено. Відкриваю сторінку...' })
      setCreateOpen(false)
      setProductForm(EMPTY_PRODUCT)
      router.push(`/partners/animilair/${payload.product?.slug || ''}`)
      router.refresh()
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Помилка створення товару' })
    } finally {
      setBusy(false)
    }
  }

  const saveHeroDescription = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch('/api/partners/animilair/hero', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: heroDraft }),
      })
      const payload = await response.json() as { description?: string; error?: string }
      if (!response.ok || !payload.description) {
        throw new Error(payload.error || 'Не вдалося зберегти опис')
      }
      setHeroDescription(payload.description)
      setHeroDraft(payload.description)
      setEditingHero(false)
      setMessage({ type: 'success', text: 'Опис маркетплейсу збережено' })
      router.refresh()
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Не вдалося зберегти опис' })
    } finally {
      setBusy(false)
    }
  }

  const uploadCover = async (file: File) => {
    const data = new FormData()
    data.append('file', file)
    data.append('kind', 'misc')
    const response = await fetch('/api/uploads', { method: 'POST', body: data })
    const payload = await response.json() as { url?: string; error?: string }
    if (!response.ok || !payload.url) {
      setMessage({ type: 'error', text: payload.error || 'Не вдалося завантажити зображення' })
      return
    }
    const url = payload.url
    setProductForm((current) => ({
      ...current,
      coverUrl: url,
    }))
  }

  return (
    <PageShell active="animilair" initialUser={initialUser}>
      <main className="page-main animilair-page">
        <Breadcrumbs items={[
          { label: 'Eyzencore', href: '/' },
          { label: 'Партнери' },
          { label: 'AnimiLair Studio' },
        ]} />

        <section className="animilair-hero">
          <div className="animilair-hero-copy">
            <div className="animilair-eyebrow">Партнерський маркетплейс</div>
            <h1>AnimiLair Studio</h1>
            {editingHero ? (
              <div className="animilair-hero-editor">
                <label>
                  Опис маркетплейсу
                  <textarea
                    rows={4}
                    value={heroDraft}
                    onChange={(event) => setHeroDraft(event.target.value)}
                    maxLength={600}
                  />
                </label>
                <div className="animilair-hero-editor-actions">
                  <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void saveHeroDescription()}>
                    Зберегти
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() => {
                      setHeroDraft(heroDescription)
                      setEditingHero(false)
                    }}
                  >
                    Скасувати
                  </button>
                </div>
              </div>
            ) : (
              <p>{heroDescription}</p>
            )}
            <div className="animilair-hero-actions">
              <a href="#works" className="btn btn-primary">Переглянути товари</a>
              <Link href="/partners/animilair/orders" className="btn btn-secondary">Мої замовлення</Link>
              {sellerMode && (
                <button type="button" className="btn btn-secondary" onClick={() => { setCreateOpen(true); setMessage(null) }}>
                  Створити товар
                </button>
              )}
              {sellerMode && !editingHero && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setHeroDraft(heroDescription)
                    setEditingHero(true)
                    setMessage(null)
                  }}
                >
                  Редагувати опис
                </button>
              )}
            </div>
          </div>
          <div className="animilair-hero-logo">
            <img src="/images/animilair-logo.jpg" alt="AnimiLair Studio" />
          </div>
        </section>

        {message && !createOpen && (
          <div className={`animilair-form-message ${message.type}`}>{message.text}</div>
        )}

        {catalog.authors.length > 0 && (
          <section className="animilair-section">
            <div className="animilair-section-head">
              <div>
                <span className="animilair-eyebrow">Автори</span>
                <h2>Дизайнери та студії</h2>
              </div>
            </div>
            <div className="animilair-authors">
              {catalog.authors.map((author) => (
                <article className="animilair-author-card compact" key={author.id}>
                  <div className="animilair-author-main">
                    {cleanImageUrl(author.avatarUrl) ? (
                      <div className="animilair-author-avatar" style={{ backgroundImage: `url(${cleanImageUrl(author.avatarUrl)})` }} />
                    ) : null}
                    <div>
                      <h3>{author.name}</h3>
                      <p>{author.role}</p>
                    </div>
                  </div>
                  {author.bio ? <p className="animilair-author-bio">{author.bio}</p> : null}
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="animilair-section" id="works">
          <div className="animilair-section-head">
            <div>
              <span className="animilair-eyebrow">Каталог</span>
              <h2>Товари та послуги</h2>
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

          <div className="animilair-products animilair-market-grid">
            {products.length === 0 ? (
              <div className="set-card animilair-catalog-empty">
                <p>Тут зʼявляться товари після публікації дизайнерами. Якщо ви дизайнер - натисніть «Створити товар».</p>
              </div>
            ) : products.map((product) => {
              const cover = cleanImageUrl(product.coverUrl)
              return (
                <article
                  className="animilair-product-card"
                  key={product.id}
                  onClick={() => router.push(`/partners/animilair/${product.slug}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      router.push(`/partners/animilair/${product.slug}`)
                    }
                  }}
                  role="link"
                  tabIndex={0}
                  aria-label={product.title}
                >
                  <div className="animilair-product-cover" style={{ backgroundImage: `url(${cover})` }}>
                    <span className="animilair-product-views" aria-label={`${product.viewCount.toLocaleString('uk-UA')} переглядів`}>
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7zm0 11.5A4.5 4.5 0 1 1 12 8a4.5 4.5 0 0 1 0 9zm0-7A2.5 2.5 0 1 0 12 15a2.5 2.5 0 0 0 0-5z" fill="currentColor" />
                      </svg>
                      {product.viewCount.toLocaleString('uk-UA')}
                    </span>
                  </div>
                  <div className="animilair-product-body">
                    <div className="animilair-product-meta">
                      <span>{product.author?.name || 'AnimiLair'}</span>
                      <span>{CATEGORY_LABELS[product.category] || product.category}</span>
                    </div>
                    <h3>{product.title}</h3>
                    <p>{product.shortDesc}</p>
                    {product.ratingCount > 0 && product.ratingAverage && (
                      <div className="animilair-product-rating-inline">
                        <AnimilairRatingStars value={product.ratingAverage} size="sm" />
                        <span>{product.ratingAverage.toFixed(1)} · {product.ratingCount}</span>
                      </div>
                    )}
                    <div className="animilair-product-foot">
                      <span>Термін: {product.deliveryDays ? `${product.deliveryDays} дн.` : 'обговорюється'}</span>
                      <strong>{formatPrice(product.priceFrom)}</strong>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </main>

      {createOpen && (
        <div className="modal-backdrop is-open animilair-order-backdrop" onClick={() => setCreateOpen(false)} role="dialog" aria-modal="true">
          <div className="modal-card is-open animilair-order-modal animilair-product-modal" onClick={(event) => event.stopPropagation()}>
            <header className="modal-head">
              <div>
                <h3>Новий товар AnimiLair</h3>
                <p>Ціну ставить дизайнер, покупець надсилає тільки ТЗ.</p>
              </div>
              <button className="btn btn-ghost modal-close" type="button" onClick={() => setCreateOpen(false)}>×</button>
            </header>
            <div className="modal-body animilair-order-form">
              <label>
                Назва
                <input value={productForm.title} onChange={(event) => setProductForm((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <div className="animilair-form-grid">
                <label>
                  Категорія
                  <input placeholder="design, render, discord..." value={productForm.category} onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))} />
                </label>
                <label>
                  Теги
                  <input placeholder="logo, banner, minecraft" value={productForm.tags} onChange={(event) => setProductForm((current) => ({ ...current, tags: event.target.value }))} />
                </label>
              </div>
              <label>
                Опис
                <textarea
                  rows={8}
                  placeholder="Опишіть послугу: що входить, для кого підходить, що отримає клієнт"
                  value={productForm.description}
                  onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
                />
              </label>
              <div className="animilair-form-grid">
                <label>
                  Ціна від, грн
                  <input type="number" min="0" value={productForm.priceFrom} onChange={(event) => setProductForm((current) => ({ ...current, priceFrom: event.target.value }))} />
                </label>
                <label>
                  Термін, днів
                  <input type="number" min="1" value={productForm.deliveryDays} onChange={(event) => setProductForm((current) => ({ ...current, deliveryDays: event.target.value }))} />
                </label>
              </div>
              <label>
                Обкладинка
                <input type="file" accept="image/*" onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void uploadCover(file)
                }} />
              </label>
              <label>
                Або URL обкладинки
                <input value={productForm.coverUrl} onChange={(event) => setProductForm((current) => ({ ...current, coverUrl: event.target.value }))} />
              </label>
              <AnimilairPortfolioUploader
                value={productForm.media}
                onChange={(media) => setProductForm((current) => ({ ...current, media }))}
                onError={(text) => setMessage({ type: 'error', text })}
                disabled={busy}
              />
              {message && <div className={`animilair-form-message ${message.type}`}>{message.text}</div>}
            </div>
            <footer className="modal-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>Скасувати</button>
              <button type="button" className="btn btn-primary" disabled={busy || !productForm.title.trim() || !productForm.description.trim()} onClick={() => void submitProduct()}>
                {busy ? 'Створюємо...' : 'Опублікувати товар'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </PageShell>
  )
}
