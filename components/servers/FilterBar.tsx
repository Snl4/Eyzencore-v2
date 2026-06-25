'use client';

import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';

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
  lockMode?: boolean;
  lockVer?: boolean;
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
  lockMode = false,
  lockVer = false,
}: FilterBarProps) {
  return (
    <div className="filter-bar">
      {platforms.length > 0 && onPlatform && (
        <>
          <span className="filter-bar-label">Платформа</span>
          <div className="filter-bar-chips">
            {platforms.map((item) => (
              <Toggle
                key={item}
                variant="outline"
                size="sm"
                className="filter-chip"
                pressed={platform === item}
                onPressedChange={() => onPlatform(item)}
              >
                {item}
              </Toggle>
            ))}
          </div>
          <span className="filter-bar-divider" />
        </>
      )}
      <span className="filter-bar-label">Режим</span>
      <div className="filter-bar-chips">
        {modes.map(m => (
          <Toggle
            key={m}
            size="sm"
            className="filter-chip"
            pressed={mode === m}
            onPressedChange={() => onMode(m)}
            disabled={lockMode && m !== mode}
          >
            {m}
          </Toggle>
        ))}
      </div>
      {!hideVersions && (
        <>
          <span className="filter-bar-divider" />
          <span className="filter-bar-label">Версія</span>
          <div style={{ minWidth: 150 }}>
            <Select value={ver} onChange={onVer} options={versions} size="sm" disabled={lockVer} />
          </div>
        </>
      )}
    </div>
  );
}
