'use client';

interface LineChartProps {
  data: number[];
  width?: number;
  height?: number;
  padding?: number;
  gradientId?: string;
  lineGradientId?: string;
}

export function LineChart({
  data,
  width = 360,
  height = 180,
  padding = 18,
  gradientId = 'ch1',
  lineGradientId = 'ch2',
}: LineChartProps) {
  const max = Math.max(...data);
  const stepX = (width - padding * 2) / (data.length - 1);
  const points = data.map((v, i) => [
    padding + i * stepX,
    height - padding - (v / max) * (height - padding * 2),
  ]);
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(' ');
  const area = `${path} L${points[points.length - 1][0]},${height - padding} L${padding},${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id={lineGradientId} x1="0" x2="1">
          <stop offset="0%"   stopColor="var(--accent)"/>
          <stop offset="100%" stopColor="var(--accent-2)"/>
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g, i) => (
        <line
          key={i}
          x1={padding} x2={width - padding}
          y1={padding + (height - padding * 2) * g}
          y2={padding + (height - padding * 2) * g}
          stroke="var(--line)" strokeDasharray="2 4"
        />
      ))}
      <path d={area} fill={`url(#${gradientId})`}/>
      <path d={path} fill="none" stroke={`url(#${lineGradientId})`} strokeWidth="2"/>
      {points
        .filter((_, i) => i % Math.ceil(data.length / 6) === 0)
        .map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="3"
            fill="var(--bg-1)" stroke={`url(#${lineGradientId})`} strokeWidth="2"/>
        ))}
    </svg>
  );
}

const HOURS = ['00','06','12','18','24'];

export function DashboardChart() {
  const data = [320,310,280,260,250,290,360,520,780,960,1080,1140,1200,1260,1310,1280,1340,1400,1380,1340,1240,1100,920,720];
  const max  = Math.max(...data);
  const w = 360, h = 180, pad = 18;
  const stepX = (w - pad * 2) / (data.length - 1);
  const points = data.map((v, i) => [pad + i * stepX, h - pad - (v / max) * (h - pad * 2)]);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${path} L${points[points.length - 1][0]},${h - pad} L${pad},${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="180" preserveAspectRatio="none">
      <defs>
        <linearGradient id="dch1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="dch2" x1="0" x2="1">
          <stop offset="0%"   stopColor="var(--accent)"/>
          <stop offset="100%" stopColor="var(--accent-2)"/>
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g, i) => (
        <line key={i} x1={pad} x2={w-pad} y1={pad+(h-pad*2)*g} y2={pad+(h-pad*2)*g}
              stroke="var(--line)" strokeDasharray="2 4"/>
      ))}
      <path d={area} fill="url(#dch1)"/>
      <path d={path} fill="none" stroke="url(#dch2)" strokeWidth="2"/>
      {points.filter((_,i)=>i%6===0).map((p,i)=>(
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="var(--bg-1)" stroke="url(#dch2)" strokeWidth="2"/>
      ))}
      {HOURS.map((t,i)=>(
        <text key={i} x={pad+i*((w-pad*2)/4)} y={h-2} fontSize="9" fill="var(--fg-3)"
              fontFamily="var(--font-mono)" textAnchor="middle">{t}:00</text>
      ))}
    </svg>
  );
}

export function BigChart() {
  const data = Array.from({length: 30}, (_, i) => 4000 + Math.sin(i / 3.4) * 1800 + i * 150 + (i % 5 === 0 ? 900 : 0));
  const max  = Math.max(...data);
  const w = 800, h = 220, pad = 24;
  const stepX = (w - pad * 2) / (data.length - 1);
  const points = data.map((v, i) => [pad + i * stepX, h - pad - (v / max) * (h - pad * 2)]);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${path} L${points[points.length-1][0]},${h-pad} L${pad},${h-pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="220" preserveAspectRatio="none">
      <defs>
        <linearGradient id="bch1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="bch2" x1="0" x2="1">
          <stop offset="0%"   stopColor="var(--accent)"/>
          <stop offset="100%" stopColor="var(--accent-2)"/>
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g,i)=>(
        <line key={i} x1={pad} x2={w-pad} y1={pad+(h-pad*2)*g} y2={pad+(h-pad*2)*g}
              stroke="var(--line)" strokeDasharray="2 4"/>
      ))}
      <path d={area} fill="url(#bch1)"/>
      <path d={path} fill="none" stroke="url(#bch2)" strokeWidth="2"/>
    </svg>
  );
}
