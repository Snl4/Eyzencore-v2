import Link from 'next/link';

export interface UserServerCard {
  seed: number;
  ic: string;
  name: string;
  addr: string;
  online: boolean;
  players: number;
  max: number;
  ver: string;
  mode: string;
  uptime: string;
  avatarUrl?: string;
  bannerUrl?: string;
}

interface UserServersTabProps {
  servers: UserServerCard[];
  isOwnerView: boolean;
}

export function UserServersTab({ servers, isOwnerView }: UserServersTabProps) {
  return (
    <div className="pservers-grid">
      {servers.map((s) => (
        <div className="pserver-card" key={s.seed}>
          <div
            className="pserver-banner"
            style={{
              background: s.bannerUrl
                ? `url(${s.bannerUrl}) center/cover`
                : 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
            }}
          >
            <div className="pserver-banner-overlay" />
          </div>
          <div className="pserver-head">
            <div className="pserver-icon" style={s.avatarUrl ? { background: `url(${s.avatarUrl}) center/cover`, color: 'transparent' } : undefined}>{s.avatarUrl ? '' : s.ic}</div>
            <div className="pserver-title">
              <b>{s.name}</b>
              <span>{s.addr}</span>
            </div>
            <span className={`srv-status${s.online ? '' : ' off'}`}>
              <span className="dot" />
              {s.online ? 'онлайн' : 'офлайн'}
            </span>
          </div>
          <div className="pserver-tags">
            <span className="tag">{s.ver}</span>
            <span className="tag">{s.mode}</span>
            <span className="tag">Власник</span>
          </div>
          <div className="pserver-stats">
            <div>
              <span className="lbl">Гравці</span>
              <span className="val">
                {s.players}/{s.max}
              </span>
            </div>
            <div>
              <span className="lbl">Аптайм</span>
              <span className="val">{s.uptime}</span>
            </div>
            <div>
              <span className="lbl">Версія</span>
              <span className="val">{s.ver}</span>
            </div>
          </div>
          <div className="pserver-actions">
            {isOwnerView && (
              <Link href={`/servers/${s.seed}/edit`} className="btn btn-secondary">
                Редагувати
              </Link>
            )}
            <Link href={`/servers/${s.seed}`} className="btn btn-primary">
              Відкрити сервер
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
