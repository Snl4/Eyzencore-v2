'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { CheckBadgeIcon, CopyIcon } from '@/components/ui/Icons';
import { buildDiscordInviteUrl } from '@/lib/discord';
import {
  getAddressLabel,
  getServerPlatformLabel,
  isDiscordServer,
} from '@/lib/server-platform';
import type { Server } from '@/lib/types';
import { IMAGE_PLACEHOLDER } from '@/lib/placeholders';
import { buildServerPublicPath } from '@/lib/server-slug';

interface Props { s: Server; }

export function ServerCard({ s }: Props) {
  const router = useRouter();
  const { copied, copy } = useCopyToClipboard();
  const isDiscord = isDiscordServer(s);
  const projectCount = s.projectCount || s.cluster || 0;
  const [live, setLive] = useState({
    online: s.on,
    players: s.players,
    max: s.max,
  });

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch('/api/servers/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            addr: s.addr,
            platform: s.platform || 'minecraft',
            core: s.core || 'java',
            serverId: s.seed,
            allowExisting: true,
          }),
          cache: 'no-store',
        });
        const payload = await response.json() as {
          probe?: { online?: boolean; players?: number; max?: number };
        };
        if (!response.ok || !active || !payload.probe) return;
        setLive({
          online: Boolean(payload.probe.online),
          players: Math.max(0, Number(payload.probe.players || 0)),
          max: Math.max(0, Number(payload.probe.max || 0)),
        });
      } catch {
        // Keep the most recently known status when a provider is unavailable.
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [s.addr, s.core, s.platform, s.seed]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    copy(isDiscord ? buildDiscordInviteUrl(s.addr) : s.addr);
  };

  return (
    <div className={`server-card${s.boosted ? ' is-boosted' : ''}`} onClick={() => router.push(buildServerPublicPath(s))}>
      {/* Banner */}
      <div className="sc-banner" style={{ background: `url(${s.bannerUrl || IMAGE_PLACEHOLDER}) center/cover` }}>
        {s.boosted && (
          <span className="sc-sponsored">
            <span className="sc-sponsored-star">★</span>
            Спонсоровано
          </span>
        )}
        <span className="sc-platform-badge" style={{
          position: 'absolute',
          top: 10,
          left: 10,
          fontSize: 11,
          fontWeight: 600,
          padding: '4px 8px',
          borderRadius: 6,
          background: isDiscord ? 'rgba(88,101,242,0.9)' : 'rgba(0,0,0,0.45)',
          color: '#fff',
        }}>
          {getServerPlatformLabel(s)}
        </span>
        <span className={`sc-status${live.online ? '' : ' off'}`}>
          <span className="dot"/>
          {live.online ? 'Онлайн' : 'Офлайн'}
        </span>
        {projectCount > 1 && !s.boosted && (
          <span className="sc-cluster">Проєкт · {projectCount} серв.</span>
        )}
      </div>

      {/* Head */}
      <div className="sc-head">
        <div className="sc-icon" style={{ background: `url(${s.avatarUrl || IMAGE_PLACEHOLDER}) center/cover` }} />
        <div className="sc-title">
          <b className="sc-name-line">
            <span className="sc-name-text">{s.name}</span>
            {s.verified && <CheckBadgeIcon/>}
          </b>
          <span className="sub">
            {isDiscord ? `${s.mode} · Discord` : `${s.mode} · ${s.ver} · ${s.core || 'java'}`}
          </span>
        </div>
        <span className="sc-rank">#{s.rank}</span>
      </div>

      {/* Content */}
      <div className="sc-content">
        <p className="sc-desc">{s.shortDesc || s.desc}</p>
        <div className="sc-tags">
          {s.tags.slice(0, 4).map(t => <span key={t} className="sc-tag">{t}</span>)}
        </div>
        <div className="sc-stats">
          <div><div className="l">Рейтинг</div><div className="v">{Math.round(s.ratingScore || 0)}</div></div>
          <div><div className="l">Оцінка</div><div className="v">{s.reviewsCount ? `${(s.averageRating || 0).toFixed(1)}★` : '—'}</div></div>
          <div><div className="l">Онлайн</div><div className="v">{live.online ? live.players : 0}</div></div>
          <div><div className="l">Активність</div><div className="v">{(s.votesCount || 0) + (s.likesCount || 0) + (s.reviewsCount || 0)}</div></div>
        </div>
        <div className="sc-engagement">
          <span>▲ {s.votesCount || 0} голосів</span>
          <span>♥ {s.likesCount || 0}</span>
          <span>★ {s.reviewsCount || 0} відгуків</span>
        </div>
      </div>

      {/* Footer */}
      <div className="sc-foot">
        <div className="sc-ip">
          <span className="lbl">{getAddressLabel(s)}</span>
          {s.addr}
        </div>
        <button className="sc-copy" onClick={handleCopy}>
          <CopyIcon/>
          {copied ? 'Скопійовано!' : 'Копіювати'}
        </button>
      </div>
    </div>
  );
}
