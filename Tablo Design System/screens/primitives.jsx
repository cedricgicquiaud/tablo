// Tablo · shared primitives — logo, icons, micro-charts, frames

// ─── Logo ───────────────────────────────────────────────────────────────
function TabloMark({ size = 22, color = "currentColor", live = false }) {
  // a thin dial: ring + 12/3/6/9 ticks + two minimal hands
  const s = size;
  const c = s / 2;
  const r = s / 2 - 1;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{display:'block'}}>
      <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth="1.2" />
      {/* ticks at 12, 3, 6, 9 */}
      {[0,1,2,3].map(i => {
        const a = -Math.PI/2 + i * Math.PI/2;
        const x1 = c + Math.cos(a) * (r-0.5);
        const y1 = c + Math.sin(a) * (r-0.5);
        const x2 = c + Math.cos(a) * (r-2.5);
        const y2 = c + Math.sin(a) * (r-2.5);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.2" strokeLinecap="round" />;
      })}
      {/* hour hand (≈ 10 o'clock-ish) */}
      <line x1={c} y1={c} x2={c - r*0.45} y2={c - r*0.25} stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      {/* minute hand (≈ 2) */}
      <line x1={c} y1={c} x2={c + r*0.55} y2={c - r*0.45} stroke={live ? "#1f5fd1" : color} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx={c} cy={c} r="0.9" fill={color} />
    </svg>
  );
}

function TabloLockup({ height = 22, color = "#0e1116" }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:8, color }}>
      <TabloMark size={height} color={color} />
      <span style={{
        fontFamily:'"Inter Tight", sans-serif', fontWeight:600,
        fontSize: Math.round(height*0.78), letterSpacing:'-0.01em', lineHeight:1
      }}>Tablo</span>
    </div>
  );
}

// ─── Lucide-style icons (stroke 1.5) ────────────────────────────────────
const Icon = ({ children, size=16, color="currentColor", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
       style={{ display:'block', ...style }}>{children}</svg>
);
const IcCheck = (p) => <Icon {...p}><polyline points="20 6 9 17 4 12"/></Icon>;
const IcX = (p) => <Icon {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Icon>;
const IcChevronRight = (p) => <Icon {...p}><polyline points="9 18 15 12 9 6"/></Icon>;
const IcChevronDown = (p) => <Icon {...p}><polyline points="6 9 12 15 18 9"/></Icon>;
const IcArrowUpRight = (p) => <Icon {...p}><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></Icon>;
const IcPlus = (p) => <Icon {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Icon>;
const IcSearch = (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.65" y2="16.65"/></Icon>;
const IcMic = (p) => <Icon {...p}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="22"/></Icon>;
const IcSparkles = (p) => <Icon {...p}><path d="M12 3l1.6 4.6L18 9l-4.4 1.4L12 15l-1.6-4.6L6 9l4.4-1.4z"/><path d="M19 14l.7 1.8L21.5 16l-1.8.7L19 18l-.7-1.8L16.5 16l1.8-.7z"/></Icon>;
const IcPin = (p) => <Icon {...p}><line x1="12" y1="17" x2="12" y2="22"/><path d="M9 10V3h6v7l3 4H6l3-4z"/></Icon>;
const IcShare = (p) => <Icon {...p}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></Icon>;
const IcCode = (p) => <Icon {...p}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></Icon>;
const IcMore = (p) => <Icon {...p}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></Icon>;
const IcDatabase = (p) => <Icon {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 11v6c0 1.7 4 3 9 3s9-1.3 9-3v-6"/></Icon>;
const IcLock = (p) => <Icon {...p}><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Icon>;
const IcSettings = (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></Icon>;
const IcLayers = (p) => <Icon {...p}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></Icon>;
const IcBolt = (p) => <Icon {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Icon>;
const IcInbox = (p) => <Icon {...p}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.4 5.4L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.4-6.6A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.8 1.4z"/></Icon>;
const IcUsers = (p) => <Icon {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/></Icon>;

// ─── Sparkline ──────────────────────────────────────────────────────────
function Sparkline({ data, w=120, h=28, color="#1f5fd1", fill=true, strokeW=1.4 }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const xs = (i) => (i / (data.length - 1)) * (w-2) + 1;
  const ys = (v) => h - 2 - ((v - min) / (max - min || 1)) * (h - 4);
  const d = data.map((v,i) => `${i===0?'M':'L'} ${xs(i).toFixed(1)} ${ys(v).toFixed(1)}`).join(' ');
  const area = `${d} L ${(w-1).toFixed(1)} ${(h-1)} L 1 ${(h-1)} Z`;
  return (
    <svg width={w} height={h} style={{display:'block', overflow:'visible'}}>
      {fill && <path d={area} fill={color} fillOpacity="0.08" />}
      <path d={d} fill="none" stroke={color} strokeWidth={strokeW} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── Annotation pin (visible only when annotations tweak ON) ───────────
function Anno({ n, x, y, side='right', children, show }) {
  if (!show) return null;
  return (
    <div style={{ position:'absolute', left:x, top:y, zIndex: 50, pointerEvents:'none' }}>
      <div style={{
        display:'flex', alignItems:'center', gap:8,
        flexDirection: side === 'right' ? 'row' : 'row-reverse'
      }}>
        <div style={{
          width:20, height:20, borderRadius:'50%',
          background:'#1f5fd1', color:'#fff',
          fontFamily:'"JetBrains Mono", monospace', fontSize:11, fontWeight:600,
          display:'grid', placeItems:'center',
          boxShadow:'0 1px 2px rgba(31,95,209,0.4), 0 0 0 4px rgba(31,95,209,0.12)'
        }}>{n}</div>
        <div style={{
          background:'#0e1116', color:'#fff',
          fontFamily:'"JetBrains Mono", monospace', fontSize:10, letterSpacing:'0.04em',
          padding:'5px 8px', borderRadius:4, whiteSpace:'nowrap',
          textTransform:'uppercase'
        }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Source badge (for Stripe / Supabase / etc) ────────────────────────
function SourceMark({ name, size=20 }) {
  // Original abstract glyph per-source — NOT a copy of any vendor mark
  const map = {
    stripe:   { bg:'#ecf1ff', fg:'#1f5fd1', glyph: <path d="M6 7h8M6 12h8M9 17h5" stroke="#1f5fd1" strokeWidth="2" strokeLinecap="round"/> },
    supabase: { bg:'#eef7f0', fg:'#1a7f46', glyph: <path d="M12 4 L19 14 H12 L12 20 L5 10 H12 Z" fill="#1a7f46"/> },
    postgres: { bg:'#eef2f7', fg:'#2a3f6a', glyph: <circle cx="12" cy="12" r="6" stroke="#2a3f6a" strokeWidth="1.6" fill="none"/> },
    airtable: { bg:'#fdf2ec', fg:'#b54a18', glyph: <g><rect x="5" y="6" width="14" height="3" fill="#b54a18"/><rect x="5" y="11" width="6" height="7" fill="#b54a18"/><rect x="13" y="11" width="6" height="3" fill="#b54a18"/></g> },
    notion:   { bg:'#f3f3f3', fg:'#0e1116', glyph: <text x="12" y="16" textAnchor="middle" fontFamily="serif" fontSize="14" fontWeight="700" fill="#0e1116">N</text> },
    gsheets:  { bg:'#eef7f0', fg:'#1a7f46', glyph: <g><rect x="6" y="4" width="12" height="16" rx="1.5" stroke="#1a7f46" strokeWidth="1.4" fill="none"/><line x1="6" y1="10" x2="18" y2="10" stroke="#1a7f46" strokeWidth="1.4"/><line x1="6" y1="14" x2="18" y2="14" stroke="#1a7f46" strokeWidth="1.4"/><line x1="12" y1="10" x2="12" y2="20" stroke="#1a7f46" strokeWidth="1.4"/></g> },
  };
  const m = map[name] || map.postgres;
  return (
    <div style={{
      width:size, height:size, borderRadius:6, background:m.bg,
      display:'grid', placeItems:'center', flexShrink:0
    }}>
      <svg width={size*0.7} height={size*0.7} viewBox="0 0 24 24">{m.glyph}</svg>
    </div>
  );
}

// ─── Artboard browser-chrome frame (for desktop screens) ───────────────
function BrowserFrame({ children, url='tablo.app/cadran-hq', dark=false }) {
  const bg = dark ? '#0e1116' : '#fff';
  const chrome = dark ? '#181c23' : '#f4f5f8';
  const line = dark ? '#222732' : '#e4e7ec';
  const text = dark ? '#9aa1ad' : '#6b7280';
  return (
    <div style={{ width:'100%', height:'100%', background:bg, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{
        height:36, background:chrome, borderBottom:`1px solid ${line}`,
        display:'flex', alignItems:'center', gap:10, padding:'0 12px', flexShrink:0
      }}>
        <div style={{ display:'flex', gap:6 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:'#e0644e' }} />
          <div style={{ width:10, height:10, borderRadius:'50%', background:'#e7b145' }} />
          <div style={{ width:10, height:10, borderRadius:'50%', background:'#5fb464' }} />
        </div>
        <div style={{
          marginLeft:8, fontFamily:'"JetBrains Mono", monospace', fontSize:11, color:text,
          background: dark ? '#0e1116' : '#fff', border:`1px solid ${line}`,
          padding:'3px 10px', borderRadius:5, flex:1, maxWidth:340
        }}>{url}</div>
      </div>
      <div style={{ flex:1, minHeight:0, overflow:'hidden' }}>{children}</div>
    </div>
  );
}

Object.assign(window, {
  TabloMark, TabloLockup,
  Icon, IcCheck, IcX, IcChevronRight, IcChevronDown, IcArrowUpRight, IcPlus,
  IcSearch, IcMic, IcSparkles, IcPin, IcShare, IcCode, IcMore, IcDatabase,
  IcLock, IcSettings, IcLayers, IcBolt, IcInbox, IcUsers,
  Sparkline, Anno, SourceMark, BrowserFrame,
});
