'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import type { AuthUser } from '@/lib/auth-db'
import type { AnimilairProduct } from '@/lib/animilair-shared'
import { AnimilairPortfolioUploader } from '@/components/partners/AnimilairPortfolioUploader'
import { IMAGE_PLACEHOLDER } from '@/lib/placeholders'

type Props = {
  initialUser: AuthUser
  initialProducts: AnimilairProduct[]
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

function getProductFormDescription(product: { shortDesc: string; description: string }): string {
  const full = String(product.description || '').trim()
  if (full) return full
  return String(product.shortDesc || '').trim()
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

function productToForm(product: AnimilairProduct): ProductForm {
  return {
    title: product.title,
    category: product.category,
    description: getProductFormDescription(product),
    priceFrom: product.priceFrom ? String(product.priceFrom) : '',
    deliveryDays: product.deliveryDays ? String(product.deliveryDays) : '',
    coverUrl: cleanImageUrl(product.coverUrl),
    tags: product.tags.join(', '),
    media: product.media.map((item) => item.url).filter(Boolean).join('\n'),
  }
}

export function AnimilairProductsClient({ initialUser, initialProducts }: Props) {
  const router = useRouter()
  const confirmAction = useConfirm()
  const [products, setProducts] = useState(initialProducts)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [productForm, setProductForm] = useState<ProductForm>(EMPTY_PRODUCT)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const openCreate = () => {
    setEditingSlug(null)
    setProductForm(EMPTY_PRODUCT)
    setMessage(null)
    setModalOpen(true)
  }

  const openEdit = (product: AnimilairProduct) => {
    setEditingSlug(product.slug)
    setProductForm(productToForm(product))
    setMessage(null)
    setModalOpen(true)
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

  const submitProduct = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch(
        editingSlug ? `/api/partners/animilair/${editingSlug}` : '/api/partners/animilair',
        {
          method: editingSlug ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productForm),
        }
      )
      const payload = await response.json() as { error?: string; product?: AnimilairProduct }
      if (!response.ok) throw new Error(payload.error || 'Не вдалося зберегти товар')
      setModalOpen(false)
      setProductForm(EMPTY_PRODUCT)
      setEditingSlug(null)
      if (payload.product) {
        setProducts((current) => {
          const next = current.filter((item) => item.id !== payload.product?.id)
          return [payload.product as AnimilairProduct, ...next]
        })
      }
      router.refresh()
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Помилка збереження' })
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (product: AnimilairProduct) => {
    const confirmed = await confirmAction({
      title: 'Видалити товар?',
      description: `«${product.title}» зникне з каталогу. Замовлення по ньому залишаться в історії.`,
      confirmLabel: 'Видалити',
    })
    if (!confirmed) return
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/partners/animilair/${product.slug}`, { method: 'DELETE' })
      const payload = await response.json() as { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Не вдалося видалити товар')
      setProducts((current) => current.filter((item) => item.id !== product.id))
      router.refresh()
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Помилка видалення' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell active="animilair-products" initialUser={initialUser}>
      <main className="page-main animilair-products-page">
        <div className="page-topbar">
          <div>
            <Breadcrumbs items={[
              { label: 'Eyzencore', href: '/' },
              { label: 'AnimiLair Studio', href: '/partners/animilair' },
              { label: 'Товари' },
            ]} />
            <h1 className="page-title">Мої товари</h1>
          </div>
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Створити товар
          </button>
        </div>

        {message && !modalOpen && (
          <div className={`animilair-form-message ${message.type}`}>{message.text}</div>
        )}

        {products.length === 0 ? (
          <section className="set-card animilair-catalog-empty">
            <p>У вас ще немає опублікованих товарів. Створіть перший - він зʼявиться в каталозі AnimiLair.</p>
            <button type="button" className="btn btn-primary" onClick={openCreate}>Створити товар</button>
          </section>
        ) : (
          <section className="animilair-products animilair-manage-grid">
            {products.map((product) => {
              const cover = cleanImageUrl(product.coverUrl)
              return (
                <article className="animilair-product-card animilair-manage-card" key={product.id}>
                  <div
                    className="animilair-product-cover"
                    style={cover ? { backgroundImage: `url(${cover})` } : undefined}
                  />
                  <div className="animilair-product-body">
                    <h3>{product.title}</h3>
                    <p>{product.shortDesc}</p>
                    <div className="animilair-product-foot">
                      <span>{formatPrice(product.priceFrom)}</span>
                      <div className="animilair-manage-actions">
                        <Link href={`/partners/animilair/${product.slug}`} className="btn btn-secondary">
                          Відкрити
                        </Link>
                        <button type="button" className="btn btn-secondary" onClick={() => openEdit(product)}>
                          Редагувати
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ color: 'var(--red)' }}
                          disabled={busy}
                          onClick={() => void handleDelete(product)}
                        >
                          Видалити
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </main>

      {modalOpen && (
        <div className="modal-backdrop is-open animilair-order-backdrop" onClick={() => setModalOpen(false)} role="dialog" aria-modal="true">
          <div className="modal-card is-open animilair-order-modal animilair-product-modal" onClick={(event) => event.stopPropagation()}>
            <header className="modal-head">
              <div>
                <h3>{editingSlug ? 'Редагувати товар' : 'Новий товар AnimiLair'}</h3>
                <p>Ціну ставить дизайнер, покупець надсилає тільки ТЗ.</p>
              </div>
              <button className="btn btn-ghost modal-close" type="button" onClick={() => setModalOpen(false)}>×</button>
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
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Скасувати</button>
              <button type="button" className="btn btn-primary" disabled={busy || !productForm.title.trim() || !productForm.description.trim()} onClick={() => void submitProduct()}>
                {busy ? 'Зберігаємо...' : editingSlug ? 'Зберегти зміни' : 'Опублікувати товар'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </PageShell>
  )
}
