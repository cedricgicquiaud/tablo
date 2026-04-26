// Widgets 1-8: KPIs, Lines, Bars, Donuts
const { useState: uS1, useEffect: uE1, useRef: uR1, useMemo: uM1 } = React;

// ============ W01: KPI ÉDITORIAL avec sparkline intégrée ============
function W_KpiEditorial({ title="Revenu total", value="278K", currency="€", delta=12.4, data=MOCK.monthly, accent="var(--accent)" }) {
  return (
    <div className="w" style={{ minHeight: 160 }}>
      <div className="w-head">
        <div className="w-title">
          <span style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--accent-4)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
            <Icon name="revenue" size={13} />
          </span>
          {title}
        </div>
        <button className="w-menu"><Icon name="more" /></button>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--ink-3)' }}>{currency}</span>
        <span className="num-xl">{value}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <span className={'delta delta-bg ' + (delta>=0 ? 'pos' : 'neg')}>
          {delta>=0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}% <span style={{ color: 'var(--ink-3)', fontWeight: 400, marginLeft: 2 }}>vs sem.</span>
        </span>
        <Sparkline data={data} width={84} height={26} color={accent} />
      </div>
    </div>
  );
}

// ============ W02: KPI BARRES ============
function W_KpiBars({ title="Visiteurs", value="61.1K", delta=3.5, data=MOCK.weekly }) {
  return (
    <div className="w" style={{ minHeight: 160 }}>
      <div className="w-head">
        <div className="w-title">
          <span style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--accent-4)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
            <Icon name="users" size={13} />
          </span>
          {title}
        </div>
        <span className="muted" style={{ fontSize: 11 }}>7j</span>
      </div>
      <div className="num-xl">{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <span className={'delta ' + (delta>=0 ? 'pos' : 'neg')}>
          {delta>=0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
        </span>
        <BarSpark data={data} width={92} height={26} color="var(--accent)" highlightLast />
      </div>
    </div>
  );
}

// ============ W03: KPI MINIMAL TYPOGRAPHIC (no chart) ============
function W_KpiTypo({ title="Panier moyen", value="121", currency="€", delta=-4.7 }) {
  // Anchor to a fixed dark surface in both themes so the inverted card always reads
  const dark = 'oklch(0.18 0 0)';
  const light = 'oklch(0.97 0 0)';
  return (
    <div className="w" style={{ minHeight: 160, background: dark, color: light, borderColor: dark }}>
      <div className="w-head">
        <div className="w-title" style={{ color: 'rgba(255,255,255,0.7)' }}>
          <span style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.1)', display: 'grid', placeItems: 'center', color: light }}>
            <Icon name="cart" size={13} />
          </span>
          {title}
        </div>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>NOW</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 56, lineHeight: 1, letterSpacing: '-0.04em', color: light }}>
          {value}
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, color: 'var(--accent)' }}>{currency}</span>
      </div>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>vs semaine</span>
        <span style={{ fontSize: 13, color: delta>=0 ? 'oklch(0.78 0.19 143)' : 'oklch(0.72 0.20 25)', fontWeight: 600 }}>
          {delta>=0?'+':''}{delta.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// ============ W04: KPI WITH PROGRESS RING ============
function W_KpiRing({ title="Objectif mensuel", value="84.2K", target="100K", pct=84 }) {
  const r = 32, c = 2*Math.PI*r;
  const off = c * (1 - pct/100);
  return (
    <div className="w" style={{ minHeight: 160 }}>
      <div className="w-head">
        <div className="w-title">
          <span style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--accent-4)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
            <Icon name="trend" size={13} />
          </span>
          {title}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <svg width={80} height={80} viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
          <circle cx="40" cy="40" r={r} fill="none" stroke="var(--accent)" strokeWidth="6"
            strokeDasharray={c} strokeDashoffset={off}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
          <text x="40" y="44" textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--ink)">{pct}%</text>
        </svg>
        <div>
          <div className="num-l">{value}</div>
          <div className="muted" style={{ marginTop: 4 }}>de {target}</div>
        </div>
      </div>
    </div>
  );
}

// ============ W05: LINE CHART INTERACTIF ============
function W_LineChart({ title="Analyse des ventes", data=MOCK.monthly, height=260 }) {
  const [hover, setHover] = useState(null);
  const [period, setPeriod] = useState('Mensuel');
  const labels = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
  const w = 600, h = height;
  const padL = 36, padR = 16, padT = 24, padB = 28;
  const cw = w - padL - padR, ch = h - padT - padB;
  const max = Math.max(...data) * 1.1;
  const xs = data.map((_, i) => padL + (i / (data.length-1)) * cw);
  const ys = data.map(v => padT + ch - (v/max) * ch);
  const linePath = data.map((_, i) => (i===0?'M':'L') + xs[i] + ',' + ys[i]).join(' ');
  const areaPath = linePath + ` L ${xs[xs.length-1]},${padT+ch} L ${xs[0]},${padT+ch} Z`;

  return (
    <div className="w" style={{ minHeight: h + 80 }}>
      <div className="w-head">
        <div>
          <div className="w-title" style={{ fontSize: 15, color: 'var(--ink)' }}>{title}</div>
          <div style={{ display: 'flex', gap: 14, marginTop: 8, alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--ink)' }}></span> Revenu
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-3)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--c4)' }}></span> Objectif
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="muted">Période</span>
          <select value={period} onChange={e=>setPeriod(e.target.value)} className="btn" style={{ padding: '5px 8px', fontSize: 12 }}>
            <option>Mensuel</option><option>Hebdo</option><option>Annuel</option>
          </select>
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
          {/* y-grid */}
          {[0,0.25,0.5,0.75,1].map(t => (
            <g key={t}>
              <line x1={padL} x2={w-padR} y1={padT + t*ch} y2={padT + t*ch} stroke="var(--line)" strokeWidth="1" strokeDasharray={t===1?undefined:"2,3"} />
              <text x={padL-8} y={padT + t*ch + 4} fontSize="10" fill="var(--ink-3)" textAnchor="end" fontFamily="var(--font-mono)">
                €{Math.round(max*(1-t)/1000)}k
              </text>
            </g>
          ))}
          {/* area */}
          <path d={areaPath} fill="var(--accent)" opacity="0.08" />
          {/* line */}
          <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {/* points */}
          {xs.map((x, i) => (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x - cw/(data.length*2)} y={padT} width={cw/data.length} height={ch} fill="transparent" />
              <circle cx={x} cy={ys[i]} r={hover===i ? 5 : 3} fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
            </g>
          ))}
          {/* x labels */}
          {xs.map((x, i) => (
            <text key={i} x={x} y={h-8} fontSize="10" fill="var(--ink-3)" textAnchor="middle">{labels[i]}</text>
          ))}
          {/* hover crosshair */}
          {hover !== null && (
            <g>
              <line x1={xs[hover]} x2={xs[hover]} y1={padT} y2={padT+ch} stroke="var(--ink)" strokeWidth="1" strokeDasharray="3,3" opacity="0.3" />
            </g>
          )}
        </svg>
        {hover !== null && (
          <div className="tooltip" style={{
            left: `${(xs[hover]/w)*100}%`,
            top: `${(ys[hover]/h)*100}%`,
            transform: 'translate(-50%, calc(-100% - 12px))'
          }}>
            <div style={{ fontSize: 10, opacity: 0.7 }}>{labels[hover]} 2026</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>€{(data[hover]).toLocaleString('fr-FR')}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ W06: BAR CHART (verticales avec target) ============
function W_BarChart({ title="Ventes par catégorie" }) {
  const cats = [
    { name: 'Mode', val: 42000, target: 50000 },
    { name: 'Élec.', val: 38000, target: 35000 },
    { name: 'Maison', val: 28000, target: 30000 },
    { name: 'Beauté', val: 19000, target: 22000 },
    { name: 'Sport', val: 31000, target: 28000 },
    { name: 'Livres', val: 12000, target: 15000 },
  ];
  const max = Math.max(...cats.map(c => Math.max(c.val, c.target))) * 1.1;
  const [hover, setHover] = useState(null);
  return (
    <div className="w">
      <div className="w-head">
        <div>
          <div className="w-title" style={{ fontSize: 15, color: 'var(--ink)' }}>{title}</div>
          <div className="muted" style={{ marginTop: 4 }}>Réel vs objectif · ce mois</div>
        </div>
        <div className="tabs">
          <button className="active">Barres</button>
          <button>Empilées</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 200, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
        {cats.map((c, i) => {
          const hReal = (c.val/max) * 180;
          const hTarget = (c.target/max) * 180;
          const exceeds = c.val >= c.target;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative' }}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <div style={{ position: 'relative', width: '100%', maxWidth: 56, height: 180, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                {/* target line */}
                <div style={{ position: 'absolute', bottom: hTarget, left: -4, right: -4, height: 1, borderTop: '1.5px dashed var(--ink-3)', zIndex: 2 }} />
                <div style={{ position: 'absolute', bottom: hTarget+2, right: -4, fontSize: 9, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>obj</div>
                {/* bar */}
                <div style={{
                  width: '70%',
                  height: hReal,
                  background: exceeds ? 'var(--accent)' : 'var(--c3)',
                  borderRadius: '6px 6px 2px 2px',
                  transition: 'height 0.6s ease-out',
                  position: 'relative'
                }}>
                  {hover === i && (
                    <div className="tooltip" style={{ bottom: '100%', left: '50%', transform: 'translate(-50%, -8px)', position: 'absolute' }}>
                      €{c.val.toLocaleString('fr-FR')}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 500 }}>{c.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ W07: DONUT ÉCLATÉ ============
function W_DonutExploded({ title="Canaux de vente" }) {
  const segs = [
    { name: 'En ligne', val: 45, color: 'var(--accent)' },
    { name: 'Magasin', val: 25, color: 'var(--c2)' },
    { name: 'Référé', val: 20, color: 'var(--c3)' },
    { name: 'Autres', val: 10, color: 'var(--c5)' },
  ];
  const total = segs.reduce((s,x)=>s+x.val,0);
  const [hover, setHover] = useState(null);
  let acc = 0;
  const radius = 70, inner = 50, cx = 100, cy = 100;
  return (
    <div className="w">
      <div className="w-head">
        <div className="w-title" style={{ fontSize: 15, color: 'var(--ink)' }}>{title}</div>
        <button className="w-menu"><Icon name="more" /></button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <svg width={200} height={200} viewBox="0 0 200 200">
          {segs.map((s, i) => {
            const start = (acc/total) * Math.PI * 2 - Math.PI/2;
            acc += s.val;
            const end = (acc/total) * Math.PI * 2 - Math.PI/2;
            const mid = (start+end)/2;
            const offset = hover === i ? 8 : 0;
            const ox = Math.cos(mid)*offset, oy = Math.sin(mid)*offset;
            const x1 = cx + ox + Math.cos(start)*radius;
            const y1 = cy + oy + Math.sin(start)*radius;
            const x2 = cx + ox + Math.cos(end)*radius;
            const y2 = cy + oy + Math.sin(end)*radius;
            const x3 = cx + ox + Math.cos(end)*inner;
            const y3 = cy + oy + Math.sin(end)*inner;
            const x4 = cx + ox + Math.cos(start)*inner;
            const y4 = cy + oy + Math.sin(start)*inner;
            const large = (end - start) > Math.PI ? 1 : 0;
            return (
              <path key={i}
                d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4} Z`}
                fill={s.color}
                style={{ transition: 'transform 0.3s', cursor: 'pointer' }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
          <text x={cx} y={cy-2} textAnchor="middle" fontSize="10" fill="var(--ink-3)" letterSpacing="0.05em">TOTAL</text>
          <text x={cx} y={cy+18} textAnchor="middle" fontFamily="var(--font-display)" fontSize="22" fill="var(--ink)">100K€</text>
        </svg>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {segs.map((s, i) => (
            <div key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 6, background: hover===i ? 'var(--surface-2)' : 'transparent', cursor: 'pointer' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }}></span>
              <span style={{ fontSize: 13, color: 'var(--ink-2)', flex: 1 }}>{s.name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)', fontWeight: 500 }}>{s.val}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ W08: GAUGE ARC SEGMENTÉ ============
function W_Gauge({ title="Distribution des ventes", value=75, max=100 }) {
  const segments = 40;
  const startA = -Math.PI * 1.1;
  const endA = Math.PI * 0.1;
  const totalA = endA - startA;
  const filledSegs = Math.round((value/max) * segments);
  const cx = 110, cy = 110, r = 80;
  const [tab, setTab] = useState('Aujourd\'hui');
  return (
    <div className="w">
      <div className="w-head">
        <div className="w-title" style={{ fontSize: 15, color: 'var(--ink)' }}>{title}</div>
        <div className="tabs">
          {['Aujourd\'hui','Semaine','Mois'].map(t => (
            <button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <svg width={220} height={150} viewBox="0 0 220 140">
          {Array.from({length: segments}).map((_, i) => {
            const a = startA + (i/(segments-1)) * totalA;
            const x1 = cx + Math.cos(a)*r;
            const y1 = cy + Math.sin(a)*r;
            const x2 = cx + Math.cos(a)*(r-14);
            const y2 = cy + Math.sin(a)*(r-14);
            const filled = i < filledSegs;
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={filled ? 'var(--accent)' : 'var(--line-2)'}
                strokeWidth="3" strokeLinecap="round"
                opacity={filled ? (0.5 + (i/segments)*0.5) : 1}
              />
            );
          })}
          <text x={cx} y={cy} textAnchor="middle" fontFamily="var(--font-display)" fontSize="42" fill="var(--ink)" letterSpacing="-0.03em">{value}</text>
          <text x={cx} y={cy+18} textAnchor="middle" fontSize="11" fill="var(--ink-3)" fontFamily="var(--font-mono)">/ {max}</text>
          <text x={cx + Math.cos(startA)*(r+10)} y={cy + Math.sin(startA)*(r+10) + 4} textAnchor="middle" fontSize="10" fill="var(--ink-3)">0</text>
          <text x={cx + Math.cos(endA)*(r+10)} y={cy + Math.sin(endA)*(r+10) + 4} textAnchor="middle" fontSize="10" fill="var(--ink-3)">{max}</text>
        </svg>
        <div style={{ display: 'flex', gap: 20, marginTop: 8, padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 8, width: '100%', justifyContent: 'space-around' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 50, background: 'var(--accent)' }}></span>
              <span className="muted">En ligne</span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginTop: 2 }}>75%</div>
          </div>
          <div style={{ width: 1, background: 'var(--line)' }}></div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 50, background: 'var(--c2)' }}></span>
              <span className="muted">Magasin</span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginTop: 2 }}>25%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { W_KpiEditorial, W_KpiBars, W_KpiTypo, W_KpiRing, W_LineChart, W_BarChart, W_DonutExploded, W_Gauge });
