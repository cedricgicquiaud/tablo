// Shared utilities for charts & widgets
const { useState, useEffect, useRef, useMemo } = React;

// ===== Helpers =====
const fmt = {
  money: (n) => '€' + n.toLocaleString('fr-FR'),
  k: (n) => n >= 1000 ? (n/1000).toFixed(1).replace('.0','') + 'k' : String(n),
  pct: (n) => (n>0?'+':'') + n.toFixed(1) + '%',
};

const useHover = () => {
  const [h, setH] = useState(null);
  return [h, setH];
};

// ===== Tiny SVG sparkline (line) =====
function Sparkline({ data, width=100, height=28, color='currentColor', fill=true, strokeWidth=1.5 }) {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => [i*step, height - ((v-min)/range)*height*0.85 - height*0.075]);
  const d = points.map((p, i) => (i===0?'M':'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const dFill = d + ` L ${width},${height} L 0,${height} Z`;
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      {fill && <path d={dFill} fill={color} opacity="0.12" />}
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ===== Tiny bar sparkline =====
function BarSpark({ data, width=100, height=28, color='currentColor', highlightLast=false }) {
  const max = Math.max(...data) || 1;
  const bw = (width / data.length) * 0.6;
  const gap = (width / data.length) * 0.4;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {data.map((v, i) => {
        const h = (v / max) * height * 0.95;
        const x = i * (bw + gap);
        const isLast = i === data.length - 1;
        return (
          <rect key={i}
            x={x} y={height - h}
            width={bw} height={h}
            rx={1.5}
            fill={highlightLast && isLast ? color : color}
            opacity={highlightLast && !isLast ? 0.25 : 1}
          />
        );
      })}
    </svg>
  );
}

// ===== Icons (inline, monochrome) =====
const Icon = ({ name, size=14 }) => {
  const paths = {
    revenue: <><path d="M3 6h14v10H3z M3 9h14"/><circle cx="10" cy="12.5" r="1.5"/></>,
    users: <><circle cx="7" cy="7" r="3"/><path d="M2 17c0-3 2-5 5-5s5 2 5 5 M13 9a3 3 0 100-6 M13 17c0-2 1-4 3-4"/></>,
    cart: <><path d="M2 3h2l2 10h10l2-7H6"/><circle cx="8" cy="16" r="1"/><circle cx="14" cy="16" r="1"/></>,
    box: <><path d="M10 2L2 6v8l8 4 8-4V6z M2 6l8 4 8-4 M10 10v8"/></>,
    chart: <><path d="M3 17V7 M9 17V3 M15 17v-7"/></>,
    star: <path d="M10 2l2.4 5 5.6.8-4 4 1 5.6-5-2.6-5 2.6 1-5.6-4-4 5.6-.8z"/>,
    arrow: <><path d="M5 10h10 M11 6l4 4-4 4"/></>,
    refresh: <><path d="M3 10a7 7 0 0112-5l2 2 M17 10a7 7 0 01-12 5l-2-2 M15 3v4h-4 M5 17v-4h4"/></>,
    plus: <><path d="M10 4v12 M4 10h12"/></>,
    more: <><circle cx="5" cy="10" r="1"/><circle cx="10" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></>,
    search: <><circle cx="9" cy="9" r="5"/><path d="M13 13l4 4"/></>,
    filter: <path d="M3 5h14 M5 10h10 M8 15h4"/>,
    download: <><path d="M10 3v10 M5 9l5 5 5-5 M3 17h14"/></>,
    calendar: <><rect x="3" y="4" width="14" height="13" rx="1.5"/><path d="M3 8h14 M7 2v4 M13 2v4"/></>,
    bell: <><path d="M5 8a5 5 0 0110 0v4l1 2H4l1-2z M8 16a2 2 0 004 0"/></>,
    home: <><path d="M3 9l7-6 7 6v8a1 1 0 01-1 1h-3v-6H7v6H4a1 1 0 01-1-1z"/></>,
    settings: <><circle cx="10" cy="10" r="2.5"/><path d="M10 2v2 M10 16v2 M2 10h2 M16 10h2 M4 4l1.5 1.5 M14.5 14.5L16 16 M4 16l1.5-1.5 M14.5 5.5L16 4"/></>,
    map: <><path d="M2 5l5-2 6 2 5-2v12l-5 2-6-2-5 2z M7 3v12 M13 5v12"/></>,
    pin: <><path d="M10 2a5 5 0 015 5c0 4-5 11-5 11S5 11 5 7a5 5 0 015-5z"/><circle cx="10" cy="7" r="1.5"/></>,
    check: <path d="M3 10l5 5 9-11"/>,
    x: <path d="M4 4l12 12 M16 4L4 16"/>,
    clock: <><circle cx="10" cy="10" r="7"/><path d="M10 5v5l3 2"/></>,
    sparkle: <path d="M10 2v6 M10 12v6 M2 10h6 M12 10h6 M5 5l3 3 M12 12l3 3 M15 5l-3 3 M8 12l-3 3"/>,
    tag: <><path d="M2 2h6l9 9-6 6-9-9z"/><circle cx="6" cy="6" r="1.5"/></>,
    layers: <><path d="M10 2l8 4-8 4-8-4z M2 10l8 4 8-4 M2 14l8 4 8-4"/></>,
    trend: <><path d="M2 14l5-5 3 3 7-7 M13 5h4v4"/></>,
    dot: <circle cx="10" cy="10" r="3"/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || null}
    </svg>
  );
};

// ===== Mock data =====
const MOCK = {
  monthly: [4200, 5100, 4800, 6200, 5800, 6900, 7400, 6800, 8100, 7600, 8900, 9400],
  weekly:  [820, 940, 760, 1020, 1140, 980, 1280],
  daily:   [120, 145, 132, 168, 158, 192, 184, 215, 198, 235, 224, 256, 248, 284],
  bars:    [3.2, 4.1, 2.8, 5.4, 4.6, 6.1, 5.3, 7.2, 6.4, 8.1, 7.6, 9.3],
  hours:   Array.from({length: 24}, (_,i) => Math.round(40 + Math.sin(i/3)*30 + Math.random()*20 + (i>9 && i<20 ? 30 : 0))),
};

window.fmt = fmt;
window.useHover = useHover;
window.Sparkline = Sparkline;
window.BarSpark = BarSpark;
window.Icon = Icon;
window.MOCK = MOCK;
