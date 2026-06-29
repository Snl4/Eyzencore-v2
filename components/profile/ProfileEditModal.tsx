'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { AuthUser } from '@/lib/auth-db';
import { buildBannerSurfaceStyle } from '@/lib/banner-display';
import { ImageCropModal, type ImageCropAspectRatio } from '@/components/ui/ImageCropModal';

const MAX_AVATAR_BYTES = 800 * 1024;
const MAX_BANNER_BYTES = 1_400 * 1024;
const MAX_BIO_LENGTH = 250;
const MODAL_CLOSE_ANIMATION_MS = 220;
const MODAL_OPEN_ANIMATION_DELAY_MS = 20;

function normalizeBioText(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trimStart();
}

interface Props {
  user: AuthUser;
  open: boolean;
  onClose: () => void;
  onSaved: (user: AuthUser) => void;
}

function readFileAsDataUrl(file: File, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(new Error(`Файл завеликий (макс. ${Math.round(maxBytes / 1024)} КБ)`));
      return;
    }
    if (!file.type.startsWith('image/')) {
      reject(new Error('Дозволені лише зображення'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не вдалося прочитати файл'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}

interface CropState {
  src: string;
  target: ImageCropAspectRatio;
}

export function ProfileEditModal({ user, open, onClose, onSaved }: Props) {
  const meta = user.user_metadata;
  const [fullName, setFullName] = useState(meta.full_name);
  const [handle, setHandle] = useState(meta.profile_slug || '');
  const [bio, setBio] = useState(meta.bio);
  const [website, setWebsite] = useState(meta.website || '');
  const [telegram, setTelegram] = useState(meta.telegram || '');
  const [discord, setDiscord] = useState(meta.discord || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(meta.avatar_url);
  const [bannerUrl, setBannerUrl] = useState<string | null>(meta.banner_url);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cropState, setCropState] = useState<CropState | null>(null);
  const [shouldRender, setShouldRender] = useState(open);
  const [isVisible, setIsVisible] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const bioTextAreaRef = useRef<HTMLTextAreaElement>(null);

  function adjustBioHeight(textArea: HTMLTextAreaElement): void {
    textArea.style.height = 'auto'
    textArea.style.height = `${textArea.scrollHeight}px`
  }

  useEffect(() => {
    if (!open) return;
    setFullName(meta.full_name);
    setHandle(meta.profile_slug || '');
    setBio(normalizeBioText(meta.bio));
    setWebsite(meta.website || '');
    setTelegram(meta.telegram || '');
    setDiscord(meta.discord || '');
    setAvatarUrl(meta.avatar_url);
    setBannerUrl(meta.banner_url);
    setCropState(null);
    setError(null);
  }, [open, meta]);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setIsVisible(false);
      const timeoutId = window.setTimeout(() => {
        setIsVisible(true);
      }, MODAL_OPEN_ANIMATION_DELAY_MS);
      return () => window.clearTimeout(timeoutId);
    }
    setIsVisible(false);
    const timeoutId = window.setTimeout(() => {
      setShouldRender(false);
    }, MODAL_CLOSE_ANIMATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [open]);

  useEffect(() => {
    const textArea = bioTextAreaRef.current;
    if (!textArea) return;
    adjustBioHeight(textArea)
    const timeoutId = window.setTimeout(() => adjustBioHeight(textArea), 0)
    return () => window.clearTimeout(timeoutId)
  }, [bio, open, shouldRender]);

  if (!shouldRender) return null;

  async function handleBannerFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file, MAX_BANNER_BYTES);
      setCropState({ src: dataUrl, target: 'banner' });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження файлу');
    }
  }

  async function handleAvatarFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file, MAX_AVATAR_BYTES);
      setCropState({ src: dataUrl, target: 'square' });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження файлу');
    }
  }

  function handleAvatarCropped(croppedDataUrl: string): void {
    setAvatarUrl(croppedDataUrl);
    setCropState(null);
    setError(null);
  }

  function handleBannerCropped(croppedDataUrl: string): void {
    setBannerUrl(croppedDataUrl);
    setCropState(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          profile_slug: handle,
          bio,
          website,
          telegram,
          discord,
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
        }),
      });
      const data = (await res.json()) as { user?: AuthUser; error?: string };
      if (!res.ok || !data.user) {
        throw new Error(data.error || 'Не вдалося зберегти профіль');
      }
      onSaved(data.user);
      window.setTimeout(() => {
        onClose()
      }, 700)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Помилка збереження'
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`modal-backdrop${isVisible ? ' is-open' : ''}`}
      onClick={() => {
        if (!cropState) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className={`modal-card${isVisible ? ' is-open' : ''}`} onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>Редагувати профіль</h3>
          <button type="button" className="btn btn-ghost modal-close" onClick={onClose} aria-label="Закрити">
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="modal-body modal-profile-grid">
          <section className="modal-section-card">
            <div className="modal-section-title">Основне</div>
            <div className="field">
              <label>Імʼя</label>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} required />
            </div>
            <div className="field">
              <label>Нікнейм</label>
              <div className="input-wrap">
                <span className="ico-l" style={{ fontFamily: 'var(--font-mono)' }}>@</span>
                <input className="input with-ico" value={handle} onChange={(e) => setHandle(e.target.value)} maxLength={32} pattern="[a-zA-Z0-9_]+" required />
              </div>
            </div>
            <div className="field">
              <label>
                Біо
                <span>{bio.length}/{MAX_BIO_LENGTH}</span>
              </label>
              <textarea
                ref={bioTextAreaRef}
                className="input"
                style={{ minHeight: 86, padding: '10px 12px', resize: 'none', overflow: 'hidden' }}
                value={bio}
                onChange={(e) => {
                  const normalizedBio = normalizeBioText(e.target.value).slice(0, MAX_BIO_LENGTH)
                  adjustBioHeight(e.currentTarget)
                  setBio(normalizedBio)
                }}
                maxLength={MAX_BIO_LENGTH}
              />
            </div>
          </section>

          <section className="modal-section-card">
            <div className="modal-section-title">Зовнішній вигляд та посилання</div>
            <div className="modal-banner banner-surface" style={buildBannerSurfaceStyle(bannerUrl)}>
              <button type="button" className="btn btn-secondary modal-banner-btn" onClick={() => bannerInputRef.current?.click()}>Змінити банер</button>
              {bannerUrl && <button type="button" className="btn btn-ghost modal-banner-clear modal-remove-btn" onClick={() => setBannerUrl(null)} aria-label="Видалити банер">Видалити</button>}
              <input ref={bannerInputRef} type="file" accept="image/*" hidden onChange={(e) => void handleBannerFile(e)} />
            </div>
            <div className="modal-avatar-row">
              <div className="modal-avatar" style={avatarUrl ? { backgroundImage: `url(${JSON.stringify(avatarUrl).slice(1, -1)})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}>
                {!avatarUrl && (fullName.trim()[0] || 'U').toUpperCase()}
              </div>
              <div className="modal-avatar-actions">
                <button type="button" className="btn btn-secondary" onClick={() => avatarInputRef.current?.click()}>Завантажити аватарку</button>
                {avatarUrl && <button type="button" className="btn btn-ghost modal-remove-btn" onClick={() => setAvatarUrl(null)} aria-label="Видалити аватар">Видалити</button>}
                <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={(e) => void handleAvatarFile(e)} />
              </div>
            </div>
            <div className="modal-links-card">
              <div className="modal-section-title">Посилання профілю</div>
              <div className="field">
                <label>Сайт</label>
                <input className="input" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={240} placeholder="https://example.com" />
              </div>
              <div className="field">
                <label>Telegram</label>
                <input className="input" type="url" value={telegram} onChange={(e) => setTelegram(e.target.value)} maxLength={240} placeholder="https://t.me/username" />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Discord</label>
                <input className="input" type="url" value={discord} onChange={(e) => setDiscord(e.target.value)} maxLength={240} placeholder="https://discord.gg/invite" />
              </div>
            </div>
          </section>

          {error && <div className="auth-feedback auth-feedback-error" style={{ gridColumn: '1 / -1' }}>{error}</div>}
          <div className="modal-foot" style={{ gridColumn: '1 / -1', marginTop: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Скасувати</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Збереження…' : 'Зберегти'}</button>
          </div>
        </form>
      </div>
      <ImageCropModal
        imageSrc={cropState?.src || ''}
        open={Boolean(cropState)}
        title={cropState?.target === 'banner' ? 'Обрізати банер' : 'Обрізати аватарку'}
        aspectRatio={cropState?.target || 'square'}
        onClose={() => setCropState(null)}
        onConfirm={cropState?.target === 'banner' ? handleBannerCropped : handleAvatarCropped}
      />
    </div>
  );
}
