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
import { buildBannerSurfaceStyle } from '@/lib/banner-display';
import { buildServerPublicPath } from '@/lib/server-slug';
import { buildServerRatingScore } from '@/lib/server-rating-score';

interface Props { s: Server; }

type ServerCardStats = {
  votesCount: number
  likesCount: number
  reviewsCount: number
  averageRating: number
  ratingScore: number
}

function buildInitialStats(server: Server): ServerCardStats {
  const votesCount = Number(server.votesCount || 0)
  const likesCount = Number(server.likesCount || 0)
  const reviewsCount = Number(server.reviewsCount || 0)
  const averageRating = Number(server.averageRating || 0)
  return {
    votesCount,
    likesCount,
    reviewsCount,
    averageRating,
    ratingScore: Number(server.ratingScore || buildServerRatingScore({
      averageRating,
      votesCount,
      likesCount,
      reviewsCount,
    })),
  }
}

export function ServerCard({ s }: Props) {
  const router = useRouter();
  const { copied, copy } = useCopyToClipboard();
  const isDiscord = isDiscordServer(s);
  const projectCount = s.projectCount || s.cluster || 0;
  const [stats, setStats] = useState<ServerCardStats>(() => buildInitialStats(s));
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

  useEffect(() => {
    setStats(buildInitialStats(s));
  }, [s]);

  useEffect(() => {
    let active = true;
    const loadEngagement = async () => {
      try {
        const response = await fetch(`/api/servers/${s.seed}/engagement`, { cache: 'no-store' });
        if (!response.ok || !active) return;
        const payload = await response.json() as {
          summary?: { votes?: number; reviews?: number; averageRating?: number };
        };
        const summary = payload.summary || {};
        const votesCount = Number(summary.votes || 0);
        const reviewsCount = Number(summary.reviews || 0);
        const averageRating = Number(summary.averageRating || 0);
        const likesCount = Number(s.likesCount || 0);
        setStats({
          votesCount,
          likesCount,
          reviewsCount,
          averageRating,
          ratingScore: buildServerRatingScore({
            averageRating,
            votesCount,
            likesCount,
            reviewsCount,
          }),
        });
      } catch {
        // Keep SSR stats when engagement API is unavailable.
      }
    };
    void loadEngagement();
    return () => {
      active = false;
    };
  }, [s.likesCount, s.seed]);

  const displayPlayers = live.online ? Math.max(live.players, s.players || 0) : 0;
  const displayMax = Math.max(live.max, s.max || 0);
  const onlineLabel = displayMax > 0 ? `${displayPlayers}/${displayMax}` : String(displayPlayers);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    copy(isDiscord ? buildDiscordInviteUrl(s.addr) : s.addr);
  };

  return (
    <div className={`server-card${s.boosted ? ' is-boosted' : ''}`} onClick={() => router.push(buildServerPublicPath(s))}>
      {/* Banner */}
      <div className="sc-banner banner-surface" style={buildBannerSurfaceStyle(s.bannerUrl || IMAGE_PLACEHOLDER)}>
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
          <div><div className="l">Рейтинг</div><div className="v">{Math.round(stats.ratingScore)}</div></div>
          <div><div className="l">Оцінка</div><div className="v">{stats.reviewsCount ? `${stats.averageRating.toFixed(1)}★` : '-'}</div></div>
          <div><div className="l">Онлайн</div><div className="v">{live.online ? onlineLabel : 0}</div></div>
          <div><div className="l">Активність</div><div className="v">{stats.votesCount + stats.likesCount + stats.reviewsCount}</div></div>
        </div>
        <div className="sc-engagement">
          <span>▲ {stats.votesCount} голосів</span>
          <span>♥ {stats.likesCount}</span>
          <span>★ {stats.reviewsCount} відгуків</span>
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
