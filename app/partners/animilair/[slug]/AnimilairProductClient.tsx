'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageShell } from '@/components/layout/PageShell'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { AnimilairOrderChat } from '@/components/partners/AnimilairOrderChat'
import type { AuthUser } from '@/lib/auth-db'
import type { AnimilairOrder, AnimilairOrderMessage, AnimilairProduct, AnimilairProductReview } from '@/lib/animilair-shared'
import { AnimilairRatingStars } from '@/components/partners/AnimilairRatingStars'
import { formatAnimilairDate } from '@/components/partners/animilair-chat-utils'
import { IMAGE_PLACEHOLDER } from '@/lib/placeholders'

type Props = {
  initialUser: AuthUser | null
  product: AnimilairProduct
  canManage?: boolean
  initialProductOrders?: AnimilairOrder[]
  initialActiveOrderId?: number | null
  initialMessages?: AnimilairOrderMessage[]
  initialReviews?: AnimilairProductReview[]
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

const CATEGORY_LABELS: Record<string, string> = {
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
  if (!value) return 'За домовленістю'
  return `від ${value.toLocaleString('uk-UA')} грн`
}

export function AnimilairProductClient({
  initialUser,
  product,
  canManage = false,
  initialProductOrders = [],
  initialActiveOrderId = null,
  initialMessages = [],
  initialReviews = [],
}: Props) {
  const router = useRouter()
  const confirmAction = useConfirm()
  const [productOrders, setProductOrders] = useState(initialProductOrders)
  const [activeOrderId, setActiveOrderId] = useState<number | null>(initialActiveOrderId)
  const [authorProfile, setAuthorProfile] = useState(product.author)
  const images = useMemo(() => {
    const urls = [
      cleanImageUrl(product.coverUrl),
      ...product.media.map((item) => cleanImageUrl(item.url)),
    ].filter(Boolean)
    return Array.from(new Set(urls))
  }, [product])
  const [activeImage, setActiveImage] = useState(images[0] || '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [reviews, setReviews] = useState(initialReviews)
  const [productForm, setProductForm] = useState<ProductForm>({
    title: product.title,
    category: product.category,
    shortDesc: product.shortDesc,
    description: product.description,
    priceFrom: product.priceFrom ? String(product.priceFrom) : '',
    deliveryDays: product.deliveryDays ? String(product.deliveryDays) : '',
    coverUrl: cleanImageUrl(product.coverUrl),
    tags: product.tags.join(', '),
    media: product.media.map((item) => item.url).filter(Boolean).join('\n'),
  })

  useEffect(() => {
    setReviews(initialReviews)
  }, [initialReviews])

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
      media: current.media ? `${current.media}\n${url}` : url,
    }))
  }

  const submitProductEdit = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/partners/animilair/${product.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm),
      })
      const payload = await response.json() as { error?: string; product?: AnimilairProduct }
      if (!response.ok) throw new Error(payload.error || 'Не вдалося оновити товар')
      setEditOpen(false)
      setMessage({ type: 'success', text: 'Товар оновлено' })
      if (payload.product?.slug && payload.product.slug !== product.slug) {
        router.push(`/partners/animilair/${payload.product.slug}`)
      } else {
        router.refresh()
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Помилка оновлення' })
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteProduct = async () => {
    const confirmed = await confirmAction({
      title: 'Видалити товар?',
      description: `«${product.title}» зникне з каталогу.`,
      confirmLabel: 'Видалити',
    })
    if (!confirmed) return
    setBusy(true)
    try {
      const response = await fetch(`/api/partners/animilair/${product.slug}`, { method: 'DELETE' })
      const payload = await response.json() as { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Не вдалося видалити товар')
      router.push('/partners/animilair/products')
      router.refresh()
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Помилка видалення' })
      setBusy(false)
    }
  }

  const chatAuthor = authorProfile || product.author

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
            <div className="animilair-detail-head">
              <div className="animilair-eyebrow">{CATEGORY_LABELS[product.category] || product.category}</div>
              {canManage && (
                <div className="animilair-detail-manage">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditOpen(true)}>
                    Редагувати
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ color: 'var(--red)' }}
                    disabled={busy}
                    onClick={() => void handleDeleteProduct()}
                  >
                    Видалити
                  </button>
                </div>
              )}
            </div>
            <h1>{product.title}</h1>
            {product.ratingCount > 0 && product.ratingAverage && (
              <div className="animilair-product-rating-head">
                <AnimilairRatingStars value={product.ratingAverage} size="sm" />
                <strong>{product.ratingAverage.toFixed(1)}</strong>
                <span>{product.ratingCount} {product.ratingCount === 1 ? 'відгук' : product.ratingCount < 5 ? 'відгуки' : 'відгуків'}</span>
              </div>
            )}

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
                <li>Ви підтверджуєте виконання та залишаєте оцінку від 1 до 5.</li>
              </ol>
            </section>

            <section className="animilair-detail-section">
              <h2>Відгуки</h2>
              {reviews.length > 0 ? (
                <div className="animilair-review-list">
                  {reviews.map((review) => (
                    <article className="animilair-review-card" key={review.id}>
                      <div className="animilair-review-card-head">
                        <div>
                          <strong>{review.customerName}</strong>
                          <small>{formatAnimilairDate(review.createdAt)}</small>
                        </div>
                        <AnimilairRatingStars value={review.rating} size="sm" />
                      </div>
                      {review.body ? <p>{review.body}</p> : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="animilair-review-empty">
                  Поки немає відгуків по цій послузі. Перші завершені замовлення зʼявляться тут.
                </div>
              )}
            </section>
          </article>

          <aside className="animilair-detail-side">
            <div className="animilair-buy-card animilair-buy-card-compact animilair-buy-card-top">
              <span>Договірна ціна</span>
              <strong>{formatPrice(product.priceFrom)}</strong>
              <div className="animilair-buy-row">
                <span>Термін</span>
                <b>{product.deliveryDays ? `${product.deliveryDays} дн.` : 'обговорюється'}</b>
              </div>
              <p className="animilair-buy-note">Опишіть задачу в чаті — дизайнер відповість і уточнить деталі.</p>
            </div>

            {chatAuthor && (
              <AnimilairOrderChat
                user={initialUser}
                orders={productOrders}
                activeOrderId={activeOrderId}
                onActiveOrderIdChange={setActiveOrderId}
                onOrdersChange={(orders) => {
                  setProductOrders(orders.filter((order) => order.productId === product.id))
                }}
                onOrderCreated={(order) => {
                  setProductOrders((current) => [order, ...current.filter((item) => item.id !== order.id)])
                  setActiveOrderId(order.id)
                }}
                onAuthorUpdated={setAuthorProfile}
                initialMessages={initialMessages}
                embedded
                productPreview={{
                  productId: product.id,
                  author: chatAuthor,
                  canEditWelcome: canManage,
                }}
                onLoginRequest={() => router.push('/login')}
                onReviewSubmitted={() => {
                  router.refresh()
                }}
              />
            )}
          </aside>
        </section>
      </main>

      {editOpen && (
        <div className="modal-backdrop is-open animilair-order-backdrop" onClick={() => setEditOpen(false)} role="dialog" aria-modal="true">
          <div className="modal-card is-open animilair-order-modal animilair-product-modal" onClick={(event) => event.stopPropagation()}>
            <header className="modal-head">
              <div>
                <h3>Редагувати товар</h3>
                <p>Зміни зʼявляться в каталозі одразу після збереження.</p>
              </div>
              <button className="btn btn-ghost modal-close" type="button" onClick={() => setEditOpen(false)}>×</button>
            </header>
            <div className="modal-body animilair-order-form">
              <label>
                Назва
                <input value={productForm.title} onChange={(event) => setProductForm((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <div className="animilair-form-grid">
                <label>
                  Категорія
                  <input value={productForm.category} onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))} />
                </label>
                <label>
                  Теги
                  <input value={productForm.tags} onChange={(event) => setProductForm((current) => ({ ...current, tags: event.target.value }))} />
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
              <button type="button" className="btn btn-secondary" onClick={() => setEditOpen(false)}>Скасувати</button>
              <button type="button" className="btn btn-primary" disabled={busy || !productForm.title.trim() || !productForm.shortDesc.trim() || !productForm.description.trim()} onClick={() => void submitProductEdit()}>
                {busy ? 'Зберігаємо...' : 'Зберегти зміни'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </PageShell>
  )
}
