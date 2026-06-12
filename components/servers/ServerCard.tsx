'use client';

import { useRouter } from 'next/navigation';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { CheckBadgeIcon, CopyIcon } from '@/components/ui/Icons';
import { buildDiscordInviteUrl } from '@/lib/discord';
import {
  getAddressLabel,
  getMaxCountLabel,
  getOnlineCountLabel,
  getServerPlatformLabel,
  isDiscordServer,
} from '@/lib/server-platform';
import type { Server } from '@/lib/types';

const ICON_GRADIENTS = [
  'linear-gradient(135deg, #7b8cff, #a78bfa)',
  'linear-gradient(135deg, #a78bfa, #5eead4)',
  'linear-gradient(135deg, #5eead4, #7b8cff)',
  'linear-gradient(135deg, #f59e0b, #f87171)',
  'linear-gradient(135deg, #34d399, #5eead4)',
  'linear-gradient(135deg, #7b8cff, #34d399)',
  'linear-gradient(135deg, #f87171, #f59e0b)',
  'linear-gradient(135deg, #a78bfa, #f87171)',
];

const BANNER_GRADIENTS = [
  'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f1729 100%)',
  'linear-gradient(135deg, #0c1a2e 0%, #1e3a5f 100%)',
  'linear-gradient(135deg, #0d1f1d 0%, #1a4a3a 100%)',
  'linear-gradient(135deg, #1a0c0c 0%, #3a1a1a 100%)',
  'linear-gradient(135deg, #0c1a0c 0%, #1a3a1a 100%)',
  'linear-gradient(135deg, #1a1a0c 0%, #2a2a0c 100%)',
  'linear-gradient(135deg, #12091a 0%, #2a1a3a 100%)',
  'linear-gradient(135deg, #0c0e13 0%, #1a1f2e 100%)',
];

function BannerDecor({ seed }: { seed: number }) {
  const i = (seed - 1) % 4;
  if (i === 0) return (
    <svg width="100%" height="100%" viewBox="0 0 400 130" preserveAspectRatio="xMidYMid slice">
      <g opacity="0.4">
        {Array.from({length:3}).map((_,r)=>Array.from({length:8}).map((_,c)=>(
          <rect key={`${r}-${c}`} x={c*52+(r%2?26:0)} y={r*44} width="44" height="44" rx="4"
                fill={(r+c)%3===0?'var(--accent)':'rgba(255,255,255,0.06)'} opacity={(r+c)%4===0?0.6:0.2}/>
        )))}
      </g>
    </svg>
  );
  if (i === 1) return (
    <svg width="100%" height="100%" viewBox="0 0 400 130" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id={`bg${seed}`} x1="0" x2="1"><stop offset="0" stopColor="var(--accent)"/><stop offset="1" stopColor="var(--accent-2)"/></linearGradient></defs>
      <path d={`M0 80 Q 100 30, 200 60 T 400 40 L 400 130 L 0 130 Z`} fill={`url(#bg${seed})`} opacity="0.3"/>
      <path d={`M0 80 Q 100 30, 200 60 T 400 40`} stroke={`url(#bg${seed})`} strokeWidth="2" fill="none"/>
    </svg>
  );
  if (i === 2) return (
    <svg width="100%" height="100%" viewBox="0 0 400 130" preserveAspectRatio="xMidYMid slice">
      <g fontFamily="monospace" fontSize="11" fill="var(--accent-3)" opacity="0.5">
        <text x="20" y="30">$ ping {'{server_addr}'}</text>
        <text x="20" y="50" opacity="0.6">→ 28ms latency</text>
        <text x="20" y="70" opacity="0.6">→ 247/2000 онлайн</text>
        <text x="20" y="90" opacity="0.6">→ 99.9% аптайм</text>
      </g>
    </svg>
  );
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 130" preserveAspectRatio="xMidYMid slice">
      {[0,1,2,3,4].map(i=><circle key={i} cx={80+i*60} cy={65} r={30-i*4} fill="none" stroke="var(--accent-2)" strokeWidth="1" opacity={0.15+i*0.05}/>)}
      <circle cx="200" cy="65" r="24" fill="var(--accent)" opacity="0.2"/>
    </svg>
  );
}

interface Props { s: Server; }

export function ServerCard({ s }: Props) {
  const router = useRouter();
  const { copied, copy } = useCopyToClipboard();
  const isDiscord = isDiscordServer(s);

  const iconBg   = ICON_GRADIENTS[(s.seed - 1) % ICON_GRADIENTS.length];
  const bannerBg = isDiscord
    ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)'
    : BANNER_GRADIENTS[(s.seed - 1) % BANNER_GRADIENTS.length];

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    copy(isDiscord ? buildDiscordInviteUrl(s.addr) : s.addr);
  };

  return (
    <div className={`server-card${s.boosted ? ' is-boosted' : ''}`} onClick={() => router.push(`/servers/${s.seed}`)}>
      {/* Banner */}
      <div className="sc-banner" style={{ background: s.bannerUrl ? `url(${s.bannerUrl}) center/cover` : bannerBg }}>
        {!s.bannerUrl && <BannerDecor seed={s.seed}/>}
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
        <span className={`sc-status${s.on ? '' : ' off'}`}>
          <span className="dot"/>
          {s.on ? 'Онлайн' : 'Офлайн'}
        </span>
        {s.cluster && !s.boosted && (
          <span className="sc-cluster">⊞ {s.cluster} серв.</span>
        )}
      </div>

      {/* Head */}
      <div className="sc-head">
        <div className="sc-icon" style={{ background: s.avatarUrl ? `url(${s.avatarUrl}) center/cover` : iconBg }}>{s.avatarUrl ? '' : s.ic}</div>
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
          <div><div className="l">{getOnlineCountLabel(s)}</div><div className="v">{s.players.toLocaleString('uk-UA')}</div></div>
          <div><div className="l">{getMaxCountLabel(s)}</div><div className="v">{s.max.toLocaleString('uk-UA')}</div></div>
          <div><div className="l">Рейтинг</div><div className="v">#{s.rank}</div></div>
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
