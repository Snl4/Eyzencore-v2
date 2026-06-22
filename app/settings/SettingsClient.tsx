'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Icons } from '@/components/ui/Icons';
import type { AuthSession, AuthUser } from '@/lib/auth-db';

type Section = 'security' | 'notifications' | 'integrations' | 'sessions' | 'danger';
type NotificationPreferences = {
  enabled: boolean;
  votesEnabled: boolean;
  reviewsEnabled: boolean;
  systemEnabled: boolean;
};

const NAV: { key: Section; label: string; icon: keyof typeof Icons }[] = [
  { key: 'security', label: 'Безпека', icon: 'shield' },
  { key: 'notifications', label: 'Сповіщення', icon: 'bell' },
  { key: 'integrations', label: 'Інтеграції', icon: 'globe' },
  { key: 'sessions', label: 'Сеанси', icon: 'monitor' },
  { key: 'danger', label: 'Небезпечна зона', icon: 'trash' },
];

function formatSessionDate(value: string) {
  return new Date(value).toLocaleString('uk-UA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SettingsClient({ user: initialUser }: { user: AuthUser }) {
  const router = useRouter();
  const [section, setSection] = useState<Section>('security');
  const [integrationMessage, setIntegrationMessage] = useState<string | null>(null);
  const isDiscordLinked = Boolean(initialUser.user_metadata.discord_user_id);
  const isTelegramLinked = Boolean(initialUser.user_metadata.telegram_user_id || initialUser.user_metadata.telegram);
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({
    enabled: true,
    votesEnabled: true,
    reviewsEnabled: true,
    systemEnabled: true,
  });
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsSaving, setNotificationsSaving] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('discord') === 'linked') {
      setSection('integrations');
      setIntegrationMessage('Discord успішно привʼязано');
    } else if (window.location.hash === '#notifications') {
      setSection('notifications');
    }
  }, []);

  useEffect(() => {
    async function loadNotificationPreferences() {
      const response = await fetch('/api/auth/notification-preferences', { cache: 'no-store' });
      const data = await response.json().catch(() => null);
      if (response.ok && data) {
        setNotificationPreferences(data);
      }
      setNotificationsLoading(false);
    }

    void loadNotificationPreferences();
  }, []);

  useEffect(() => {
    async function loadSessions() {
      const response = await fetch('/api/auth/sessions', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      setSessions(data.sessions || []);
    }

    void loadSessions();
  }, []);

  async function savePassword(formData: FormData) {
    setError(null);
    setPasswordMessage(null);

    const currentPassword = String(formData.get('current_password') || '');
    const newPassword = String(formData.get('new_password') || '');
    const confirmPassword = String(formData.get('confirm_password') || '');

    if (newPassword !== confirmPassword) {
      setError('Нові паролі не збігаються');
      return;
    }

    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Не вдалося оновити пароль');
      return;
    }
    setPasswordMessage('Пароль оновлено');
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    startTransition(() => {
      router.push('/');
      router.refresh();
    });
  }

  async function revokeSession(sessionId: string) {
    setError(null);
    setSessionMessage(null);
    const response = await fetch('/api/auth/revoke-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Не вдалося завершити сеанс');
      return;
    }
    setSessions((current) => current.filter((session) => session.id !== sessionId));
    setSessionMessage('Сеанс завершено');
  }

  async function revokeOther() {
    setError(null);
    setSessionMessage(null);
    const response = await fetch('/api/auth/revoke-other-sessions', { method: 'POST' });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Не вдалося завершити інші сеанси');
      return;
    }
    setSessions((current) => current.filter((session) => session.current));
    setSessionMessage('Інші сеанси завершено');
  }

  async function beginTelegramLink() {
    setError(null);
    setIntegrationMessage(null);
    const response = await fetch('/api/auth/telegram/link', { cache: 'no-store' });
    const data = await response.json().catch(() => null) as { url?: string; error?: string } | null;
    if (!response.ok || !data?.url) {
      setError(data?.error || 'Не вдалося створити Telegram-посилання');
      return;
    }
    window.open(data.url, '_blank', 'noopener,noreferrer');
    setIntegrationMessage('Відкрийте Telegram-бота та натисніть Start. Після підтвердження оновіть сторінку.');
  }

  async function unlinkTelegram() {
    setError(null);
    const response = await fetch('/api/auth/telegram/unlink', { method: 'POST' });
    if (!response.ok) {
      const data = await response.json().catch(() => null) as { error?: string } | null;
      setError(data?.error || 'Не вдалося відвʼязати Telegram');
      return;
    }
    setIntegrationMessage('Telegram відвʼязано');
    router.refresh();
  }

  async function updateNotificationPreference(
    key: keyof NotificationPreferences,
    value: boolean
  ) {
    const previous = notificationPreferences;
    const next = { ...previous, [key]: value };
    setNotificationPreferences(next);
    setNotificationsSaving(true);
    setNotificationMessage(null);
    setError(null);

    const response = await fetch('/api/auth/notification-preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setNotificationPreferences(previous);
      setError(data?.error || 'Не вдалося зберегти налаштування сповіщень');
      setNotificationsSaving(false);
      return;
    }

    setNotificationPreferences({
      enabled: Boolean(data.enabled),
      votesEnabled: Boolean(data.votesEnabled),
      reviewsEnabled: Boolean(data.reviewsEnabled),
      systemEnabled: Boolean(data.systemEnabled),
    });
    setNotificationsSaving(false);
    setNotificationMessage('Налаштування збережено');
  }

  return (
    <PageShell active="settings" initialUser={initialUser}>
      <div className="page-main">
        <div className="page-topbar">
          <div>
            <Breadcrumbs items={[{ label: 'Простір', href: '/' }, { label: 'Налаштування' }]} />
            <h1 className="page-title">Налаштування</h1>
          </div>
        </div>

        {error && <div className="auth-feedback auth-feedback-error" style={{ marginBottom: 16 }}>{error}</div>}

        <div className="set-shell">
          <nav className="set-nav">
            {NAV.map((item) => (
              <button
                key={item.key}
                className={`set-nav-item${section === item.key ? ' active' : ''}${item.key === 'danger' ? ' danger' : ''}`}
                onClick={() => setSection(item.key)}
              >
                {Icons[item.icon]} {item.label}
              </button>
            ))}
          </nav>

          <div className="set-content">
            {section === 'security' && (
              <div>
                <h2 className="set-heading">Безпека</h2>
                <div className="set-card">
                  <h3>Зміна пароля</h3>
                  <form
                    className="set-fields"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void savePassword(new FormData(event.currentTarget));
                    }}
                  >
                    <label className="auth-field">
                      <span>Поточний пароль</span>
                      <input name="current_password" type="password" />
                    </label>
                    <label className="auth-field">
                      <span>Новий пароль</span>
                      <input name="new_password" type="password" />
                    </label>
                    <label className="auth-field">
                      <span>Повтори новий пароль</span>
                      <input name="confirm_password" type="password" />
                    </label>
                    {passwordMessage && <div className="auth-feedback auth-feedback-success">{passwordMessage}</div>}
                    <button className="btn btn-primary" type="submit">Оновити пароль</button>
                  </form>
                </div>
              </div>
            )}

            {section === 'notifications' && (
              <div>
                <h2 className="set-heading">Сповіщення</h2>
                <div className="set-card">
                  <div className="set-notification-intro">
                    <div>
                      <h3>Сповіщення в кабінеті</h3>
                      <p>Оберіть, які події зберігати у вашій стрічці сповіщень.</p>
                    </div>
                    {notificationsSaving && <span>Збереження…</span>}
                  </div>

                  {notificationsLoading ? (
                    <div className="set-notification-loading">Завантаження налаштувань…</div>
                  ) : (
                    <>
                      <NotificationToggle
                        title="Усі сповіщення"
                        description="Головний перемикач для нових сповіщень у кабінеті."
                        checked={notificationPreferences.enabled}
                        onChange={(value) => void updateNotificationPreference('enabled', value)}
                      />
                      <NotificationToggle
                        title="Голоси за сервер"
                        description="Новий голос користувача за один із ваших серверів."
                        checked={notificationPreferences.votesEnabled}
                        disabled={!notificationPreferences.enabled}
                        onChange={(value) => void updateNotificationPreference('votesEnabled', value)}
                      />
                      <NotificationToggle
                        title="Нові відгуки"
                        description="Оцінка або коментар, залишений на сторінці вашого сервера."
                        checked={notificationPreferences.reviewsEnabled}
                        disabled={!notificationPreferences.enabled}
                        onChange={(value) => void updateNotificationPreference('reviewsEnabled', value)}
                      />
                      <NotificationToggle
                        title="Системні події"
                        description="Схвалення або відхилення заявки та важливі повідомлення платформи."
                        checked={notificationPreferences.systemEnabled}
                        disabled={!notificationPreferences.enabled}
                        onChange={(value) => void updateNotificationPreference('systemEnabled', value)}
                      />
                    </>
                  )}

                  {notificationMessage && (
                    <div className="auth-feedback auth-feedback-success set-notification-message">
                      {notificationMessage}
                    </div>
                  )}
                </div>
              </div>
            )}

            {section === 'integrations' && (
              <div>
                <h2 className="set-heading">Інтеграції</h2>
                <div className="set-card">
                  {integrationMessage && (
                    <div className="auth-feedback auth-feedback-success" style={{ marginBottom: 14 }}>{integrationMessage}</div>
                  )}
                  <div style={{ fontSize: 14, color: 'var(--fg-1)', marginBottom: 14 }}>
                    Підключення Discord та Telegram
                  </div>
                  <div className="integ-card">
                    <div className="integ-icon discord">{Icons.discord}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>Прив&apos;язка Discord</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>
                        {isDiscordLinked
                          ? `Discord ID: ${initialUser.user_metadata.discord_user_id}`
                          : 'Увійдіть через Discord або привʼяжіть акаунт для керування серверами'}
                      </div>
                    </div>
                    {isDiscordLinked ? (
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={async () => {
                          const response = await fetch('/api/auth/discord/unlink', { method: 'POST' });
                          if (!response.ok) {
                            setError('Не вдалося відвʼязати Discord');
                            return;
                          }
                          setIntegrationMessage('Discord відвʼязано');
                          router.refresh();
                        }}
                      >
                        Відв&apos;язати Discord
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary"
                        type="button"
                        onClick={() => { window.location.href = '/api/auth/discord?mode=link' }}
                      >
                        Привʼязати Discord
                      </button>
                    )}
                  </div>
                  <div className="integ-card">
                    <div className="integ-icon telegram">{Icons.telegram}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>Telegram</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>
                        {isTelegramLinked
                          ? `Telegram ID: ${initialUser.user_metadata.telegram_user_id || '—'}${initialUser.user_metadata.telegram_username ? ` · @${initialUser.user_metadata.telegram_username}` : ''}`
                          : 'Привʼяжіть Telegram через бота, щоб отримувати системні повідомлення й швидко підтверджувати акаунт'}
                      </div>
                    </div>
                    {isTelegramLinked ? (
                      <button className="btn btn-secondary" type="button" onClick={() => void unlinkTelegram()}>
                        Відв&apos;язати Telegram
                      </button>
                    ) : (
                      <button className="btn btn-primary" type="button" onClick={() => void beginTelegramLink()}>
                        Прив&apos;язати Telegram
                      </button>
                    )}
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 12.5,
                      color: 'var(--fg-2)',
                      background: 'var(--bg-2)',
                      border: '1px solid var(--line)',
                      borderRadius: 8,
                      padding: '10px 12px',
                    }}
                  >
                    Якщо у вас є сервер(и), у Discord буде видана роль &quot;Власник серверу&quot;.
                  </div>
                </div>
              </div>
            )}

            {section === 'sessions' && (
              <div>
                <h2 className="set-heading">Сеанси</h2>
                <div className="set-card">
                  {sessions.map((session) => (
                    <div key={session.id} className="set-row">
                      <div>
                        <b>
                          {session.user_agent || 'Невідомий пристрій'}{' '}
                          {session.current && (
                            <span style={{ color: 'var(--green)', fontSize: 11, background: 'rgba(52,211,153,0.15)', padding: '2px 8px', borderRadius: 999 }}>
                              Поточний
                            </span>
                          )}
                        </b>
                        <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>{formatSessionDate(session.created_at)}</p>
                      </div>
                      {!session.current && (
                        <button className="btn btn-secondary" onClick={() => void revokeSession(session.id)}>
                          Завершити
                        </button>
                      )}
                    </div>
                  ))}

                  {sessionMessage && <div className="auth-feedback auth-feedback-success" style={{ marginTop: 12 }}>{sessionMessage}</div>}
                  <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => void revokeOther()}>
                    Завершити інші сеанси
                  </button>
                </div>
              </div>
            )}

            {section === 'danger' && (
              <div>
                <h2 className="set-heading" style={{ color: 'var(--red)' }}>Небезпечна зона</h2>
                <div className="set-card" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
                  <div className="set-row">
                    <div>
                      <b>Вийти з акаунта</b>
                      <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>Завершити поточний сеанс на цьому пристрої.</p>
                    </div>
                    <button className="btn btn-secondary" onClick={() => void logout()}>
                      {Icons.x} Вийти
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function NotificationToggle({
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className={`set-toggle-row set-notification-row${disabled ? ' disabled' : ''}`}>
      <span>
        <b>{title}</b>
        <small>{description}</small>
      </span>
      <label className="set-toggle">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="set-toggle-slider" />
      </label>
    </div>
  );
}
