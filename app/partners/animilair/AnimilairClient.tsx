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

type ProductForm = {
  title: string
  category: string
  shortDesc: string
  description: string
  priceFrom: string
  deliveryDays: string
  coverUrl: string
  tags: string
  media: string
}

const EMPTY_ORDER: OrderForm = {
  productId: 0,
  title: '',
  brief: '',
  budget: '',
  deadline: '',
  contact: '',
}

const EMPTY_PRODUCT: ProductForm = {
  title: '',
  category: 'design',
  shortDesc: '',
  description: '',
  priceFrom: '',
  deliveryDays: '',
  coverUrl: '',
  tags: '',
  media: '',
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'Усе',
  branding: 'Брендинг',
  render: 'Рендери',
  motion: 'Анімація',
  social: 'Соцмережі',
  design: 'Дизайн',
  discord: 'Discord',
  builds: 'Побудови',
  models: '3D-моделі',
}

function formatPrice(value: number | null) {
  if (!value) return 'за домовленістю'
  return `від ${value.toLocaleString('uk-UA')} грн`
}

function canCreateProduct(user: AuthUser | null) {
  const role = String(user?.user_metadata.role || '').toUpperCase()
  return role === 'DESIGNER' || role === 'ADMIN'
}

export function AnimilairClient({ initialUser, catalog }: Props) {
  const router = useRouter()
  const [category, setCategory] = useState('all')
  const [selected, setSelected] = useState<AnimilairProduct | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<OrderForm>(EMPTY_ORDER)
  const [productForm, setProductForm] = useState<ProductForm>(EMPTY_PRODUCT)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const sellerMode = canCreateProduct(initialUser)

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
      setTimeout(() => router.push('/partners/animilair/orders'), 450)
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Помилка замовлення' })
    } finally {
      setBusy(false)
    }
  }

  const submitProduct = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch('/api/partners/animilair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm),
      })
      const payload = await response.json() as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error || 'Не вдалося створити товар')
      }
      setMessage({ type: 'success', text: 'Товар створено. Оновлюю сторінку...' })
      setCreateOpen(false)
      setProductForm(EMPTY_PRODUCT)
      router.refresh()
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Помилка створення товару' })
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
    setProductForm((current) => ({ ...current, coverUrl: url, media: current.media ? `${current.media}\n${url}` : url }))
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
              Переглядайте портфоліо авторів, замовляйте послугу прямо на сайті та ведіть чат із дизайнером.
            </p>
            <div className="animilair-hero-actions">
              <a href="#works" className="btn btn-primary">Переглянути роботи</a>
              <Link href="/partners/animilair/orders" className="btn btn-secondary">Мої замовлення</Link>
              {sellerMode && (
                <button type="button" className="btn btn-secondary" onClick={() => { setCreateOpen(true); setMessage(null) }}>
                  Створити товар
                </button>
              )}
            </div>
          </div>
          <div className="animilair-hero-card">
            <span className="animilair-live-dot" />
            <p>Creative desk</p>
            <strong>Портфоліо → заявка → чат із замовником</strong>
            <div className="animilair-hero-photos" aria-label="Приклади робіт AnimiLair">
              <span style={{ backgroundImage: "url('/images/animilair-logo.jpg')" }} />
              <span style={{ backgroundImage: "url('/images/placeholder-minecraft.jpg')" }} />
            </div>
          </div>
        </section>

        {message && !selected && !createOpen && (
          <div className={`animilair-form-message ${message.type}`}>{message.text}</div>
        )}

        <section className="animilair-section">
          <div className="animilair-section-head">
            <div>
              <span className="animilair-eyebrow">Автори</span>
              <h2>Команда, яка робить ваш візуал</h2>
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

      {createOpen && (
        <div className="modal-backdrop is-open animilair-order-backdrop" onClick={() => setCreateOpen(false)} role="dialog" aria-modal="true">
          <div className="modal-card is-open animilair-order-modal" onClick={(event) => event.stopPropagation()}>
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
                Короткий опис
                <textarea rows={3} value={productForm.shortDesc} onChange={(event) => setProductForm((current) => ({ ...current, shortDesc: event.target.value }))} />
              </label>
              <label>
                Що входить у послугу
                <textarea rows={6} value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} />
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
              <label>
                Портфоліо, по одному URL в рядок
                <textarea rows={4} value={productForm.media} onChange={(event) => setProductForm((current) => ({ ...current, media: event.target.value }))} />
              </label>
              {message && <div className={`animilair-form-message ${message.type}`}>{message.text}</div>}
            </div>
            <footer className="modal-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>Скасувати</button>
              <button type="button" className="btn btn-primary" disabled={busy || !productForm.title.trim() || !productForm.shortDesc.trim() || !productForm.description.trim()} onClick={() => void submitProduct()}>
                {busy ? 'Створюємо...' : 'Опублікувати товар'}
              </button>
            </footer>
          </div>
        </div>
      )}

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
                Технічне завдання
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
                  <input placeholder="Наприклад: до п’ятниці" value={form.deadline} onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))} />
                </label>
              </div>
              <label>
                Контакт для зв’язку
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
