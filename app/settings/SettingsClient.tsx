'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { Icons } from '@/components/ui/Icons';
import type { AuthSession, AuthUser } from '@/lib/auth-db';

type Section = 'security' | 'notifications' | 'integrations' | 'sessions' | 'danger';

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
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('discord') === 'linked') {
      setSection('integrations');
      setIntegrationMessage('Discord успішно привʼязано');
    }
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

  return (
    <PageShell active="settings" initialUser={initialUser}>
      <div className="page-main">
        <div className="page-topbar">
          <div>
            <div className="page-crumb">простір / налаштування</div>
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
                  <div className="set-toggle-row">
                    <span>Налаштування сповіщень поки недоступні в цій тестовій збірці.</span>
                  </div>
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
                        Telegram ID: {String(initialUser.user_metadata.telegram || '— якщо прив&apos;язав, ID і @nickname будуть тут')}
                      </div>
                    </div>
                    <button className="btn btn-secondary" type="button">
                      Відв&apos;язати Telegram
                    </button>
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
