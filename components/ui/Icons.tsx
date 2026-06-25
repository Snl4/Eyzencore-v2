import type { ReactNode, SVGProps } from 'react';

interface IcoProps extends Omit<SVGProps<SVGSVGElement>, 'children' | 'fill'> {
  children: ReactNode;
  size?: number;
  filled?: boolean;
}

const Ico = ({ children, size = 16, filled = false, ...rest }: IcoProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke={filled ? 'none' : 'currentColor'}
    strokeWidth={filled ? 0 : 1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    overflow="visible"
    {...rest}
  >
    {children}
  </svg>
);

export const Icons = {
  dashboard: (
    <Ico><><rect x="3" y="3" width="7" height="9" rx="1.2"/><rect x="14" y="3" width="7" height="5" rx="1.2"/><rect x="14" y="12" width="7" height="9" rx="1.2"/><rect x="3" y="16" width="7" height="5" rx="1.2"/></></Ico>
  ),
  servers: (
    <Ico><><rect x="3" y="4" width="18" height="6" rx="1.2"/><rect x="3" y="14" width="18" height="6" rx="1.2"/><circle cx="7" cy="7" r="0.8" fill="currentColor"/><circle cx="7" cy="17" r="0.8" fill="currentColor"/></></Ico>
  ),
  minecraft: (
    <Ico><><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></></Ico>
  ),
  users: (
    <Ico><><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></></Ico>
  ),
  forum: (
    <Ico><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></Ico>
  ),
  news: (
    <Ico><><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8M18 10h-8"/></></Ico>
  ),
  chart: (
    <Ico><><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-7"/></></Ico>
  ),
  search: (
    <Ico><><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></></Ico>
  ),
  bell: (
    <Ico><><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></></Ico>
  ),
  shield: (
    <Ico><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Ico>
  ),
  pulse: (
    <Ico><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></Ico>
  ),
  filter: (
    <Ico><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></Ico>
  ),
  plus: (
    <Ico><path d="M12 5v14M5 12h14"/></Ico>
  ),
  arrow: (
    <Ico><><path d="M5 12h14M13 5l7 7-7 7"/></></Ico>
  ),
  check: (
    <Ico><path d="M20 6 9 17l-5-5"/></Ico>
  ),
  key: (
    <Ico><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></Ico>
  ),
  lock: (
    <Ico><><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></></Ico>
  ),
  trash: (
    <Ico><><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></></Ico>
  ),
  monitor: (
    <Ico><><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></></Ico>
  ),
  x: (
    <Ico><path d="M18 6L6 18M6 6l12 12"/></Ico>
  ),
  globe: (
    <Ico><><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></></Ico>
  ),
  mapPin: (
    <Ico><><path d="M12 22s7-5.6 7-12a7 7 0 1 0-14 0c0 6.4 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></></Ico>
  ),
  discord: (
    <Ico filled><path d="M19.5 5.5a16 16 0 0 0-4-1.2l-.2.4a13 13 0 0 0-3.3-.4 13 13 0 0 0-3.3.4l-.2-.4a16 16 0 0 0-4 1.2C2 9 1.5 12.4 1.7 15.7a16 16 0 0 0 5 2.5l.4-.6a10 10 0 0 1-1.7-.8l.4-.3a11 11 0 0 0 10.4 0l.4.3a10 10 0 0 1-1.7.8l.4.6a16 16 0 0 0 5-2.5c.3-3.8-.5-7.2-2.4-10.2zM8.7 13.7c-1 0-1.7-.9-1.7-2s.8-2 1.7-2 1.8.9 1.7 2c0 1.1-.8 2-1.7 2zm6.6 0c-1 0-1.7-.9-1.7-2s.8-2 1.7-2 1.8.9 1.7 2c0 1.1-.8 2-1.7 2z" stroke="none"/></Ico>
  ),
  telegram: (
    <Ico filled><path d="M22 3L2 11l6 2 2 7 4-4 5 4 3-17z" stroke="none"/></Ico>
  ),
  folder: (
    <Ico><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></Ico>
  ),
} as const;

export type IconKey = keyof typeof Icons;

export function Icon({ name, size = 16 }: { name: IconKey; size?: number }) {
  const icon = Icons[name];
  if (!icon) return null;
  return <span style={{ display: 'inline-flex', width: size, height: size }}>{icon}</span>;
}

export function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

export function CheckBadgeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg className="check-ico" width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/>
      <path d="m9 12 2 2 4-4" stroke="#0a0c14" strokeWidth="3"/>
    </svg>
  );
}

export function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  );
}
