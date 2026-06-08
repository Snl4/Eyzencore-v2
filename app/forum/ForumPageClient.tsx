'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageShell } from '@/components/layout/PageShell';
import { Icons } from '@/components/ui/Icons';
import { FORUM_CATEGORIES, FORUM_THREADS } from '@/lib/data';
import type { ForumThread } from '@/lib/types';
import type { AuthUser } from '@/lib/auth-db';

const CATEGORY_FILTERS = ['Всі', 'Гайди та туторіали', 'Питання гравців', 'Анонси серверів', 'Технічна підтримка'];

function ThreadRow({ t }: { t: ForumThread }) {
  return (
    <div className="forum-thread">
      <div className="ft-left">
        <div className="ft-av" style={{ background: t.authorColor }}>{t.author[0].toUpperCase()}</div>
        <div className="ft-info">
          <div className="ft-title">
            {t.pinned && <span className="ft-badge ft-pin">📌</span>}
            {t.hot    && <span className="ft-badge ft-hot">🔥</span>}
            {t.solved && <span className="ft-badge ft-solved">✓</span>}
            <Link href={`/forum/${t.id}`}>{t.title}</Link>
          </div>
          <div className="ft-meta">
            <span style={{ color: t.authorColor }}>{t.author}</span>
            <span>·</span>
            <span>{t.category}</span>
            <span>·</span>
            <span>{t.lastActivity}</span>
          </div>
        </div>
      </div>
      <div className="ft-stats">
        <span>{Icons.forum} {t.replies}</span>
        <span>{Icons.users} {t.views}</span>
      </div>
    </div>
  );
}

export function ForumPageClient({ initialUser }: { initialUser: AuthUser | null }) {
  const [cat, setCat] = useState('Всі');
  const [query, setQuery] = useState('');

  const filtered = FORUM_THREADS.filter(t => {
    const matchCat = cat === 'Всі' || t.category === cat;
    const matchQ   = query === '' || t.title.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <PageShell active="forum" initialUser={initialUser}>
      <div className="page-main">
        {/* Top bar */}
        <div className="page-topbar">
          <div>
            <div className="page-crumb">простір / форум</div>
            <h1 className="page-title">Форум спільноти</h1>
          </div>
          <div className="page-search">
            {Icons.search}
            <input
              placeholder="Пошук тем..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <kbd>⌘K</kbd>
          </div>
          <button className="btn btn-primary">
            {Icons.plus} Нова тема
          </button>
        </div>

        {/* Category cards */}
        <div className="forum-cats">
          {FORUM_CATEGORIES.map(c => (
            <button
              key={c.id}
              className={`forum-cat-card${cat === c.name ? ' active' : ''}`}
              onClick={() => setCat(cat === c.name ? 'Всі' : c.name)}
              style={{ '--cat-color': c.color } as React.CSSProperties}
            >
              <span className="fcc-icon">{c.icon}</span>
              <div className="fcc-info">
                <b>{c.name}</b>
                <span>{c.description}</span>
              </div>
              <div className="fcc-meta">
                <span>{c.threads} тем</span>
                <span>{c.lastActivity}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Category filter chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {CATEGORY_FILTERS.map(f => (
            <button
              key={f}
              className={`filter-chip${cat === f ? ' active' : ''}`}
              onClick={() => setCat(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Thread list */}
        <div className="forum-threads">
          <div className="forum-threads-head">
            <span>Тема</span>
            <span className="ft-col-stats">Відповіді / Перегляди</span>
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--fg-3)' }}>
              Теми не знайдено
            </div>
          ) : (
            filtered.map(t => <ThreadRow key={t.id} t={t}/>)
          )}
        </div>
      </div>
    </PageShell>
  );
}
