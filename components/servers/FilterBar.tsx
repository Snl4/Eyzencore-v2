'use client';

import { Select } from '@/components/ui/Select';

interface FilterBarProps {
  platforms?: string[];
  platform?: string;
  onPlatform?: (value: string) => void;
  modes:    string[];
  versions: string[];
  mode:     string;
  ver:      string;
  onMode:   (m: string) => void;
  onVer:    (v: string) => void;
  hideVersions?: boolean;
}

export function FilterBar({
  platforms = [],
  platform = 'Всі',
  onPlatform,
  modes,
  versions,
  mode,
  ver,
  onMode,
  onVer,
  hideVersions = false,
}: FilterBarProps) {
  return (
    <div className="filter-bar">
      {platforms.length > 0 && onPlatform && (
        <>
          <span className="filter-bar-label">Платформа</span>
          <div className="filter-bar-chips">
            {platforms.map((item) => (
              <button key={item} className={`filter-chip${platform === item ? ' active' : ''}`} onClick={() => onPlatform(item)}>{item}</button>
            ))}
          </div>
          <span className="filter-bar-divider" />
        </>
      )}
      <span className="filter-bar-label">Режим</span>
      <div className="filter-bar-chips">
        {modes.map(m => (
          <button key={m} className={`filter-chip${mode === m ? ' active' : ''}`} onClick={() => onMode(m)}>{m}</button>
        ))}
      </div>
      {!hideVersions && (
        <>
          <span className="filter-bar-divider" />
          <span className="filter-bar-label">Версія</span>
          <div style={{ minWidth: 150 }}>
            <Select value={ver} onChange={onVer} options={versions} size="sm" />
          </div>
        </>
      )}
    </div>
  );
}
