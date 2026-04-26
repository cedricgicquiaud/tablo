// Widgets 9-16: Calendar, Tables, Heatmap, Funnel, Map, Activity, Stacked, Radial

// ============ W09: CALENDRIER VERTICAL ÉVÉNEMENTS ============
function W_Calendar({ title="Calendrier de campagnes" }) {
  const events = [
    { day: 'Lun', date: '05', label: 'Lancement Soldes', time: '09:00', tag: 'Campagne', color: 'var(--accent)' },
    { day: 'Mar', date: '06', label: 'Webinaire produit', time: '14:30', tag: 'Marketing', color: 'var(--c2)', active: true },
    { day: 'Mer', date: '07', label: 'Restock entrepôt A', time: '08:00', tag: 'Stock', color: 'var(--warn)' },
    { day: 'Jeu', date: '08', label: 'Newsletter mensuelle', time: '10:00', tag: 'Email', color: 'var(--c3)' },
  ];
  return (
    <div className="w">
      <div className="w-head">
        <div className="w-title" style={{ fontSize: 15, color: 'var(--ink)' }}>{title}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="w-menu"><Icon name="calendar" size={13} /></button>
          <button className="w-menu"><Icon name="more" /></button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {events.map((e, i) => (
          <div key={i} style={{
            display: 'flex', gap: 14, alignItems: 'flex-start',
            padding: '14px 0',
            borderBottom: i < events.length-1 ? '1px solid var(--line)' : 'none',
            position: 'relative'
          }}>
            <div style={{
              minWidth: 44, textAlign: 'center',
              padding: '6px 0',
              borderRadius: 8,
              background: e.active ? 'var(--ink)' : 'var(--surface-2)',
              color: e.active ? 'var(--bg)' : 'var(--ink)',
              border: '1px solid ' + (e.active ? 'var(--ink)' : 'var(--line)')
            }}>
              <div style={{ fontSize: 9, opacity: 0.7, letterSpacing: '0.08em' }}>{e.day.toUpperCase()}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, lineHeight: 1, marginTop: 2 }}>{e.date}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>{e.label}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="clock" size={10} /> {e.time}
                </span>
                <span className="chip" style={{ borderColor: e.color, color: e.color, fontSize: 10, padding: '2px 7px' }}>
                  <span className="chip-dot" style={{ background: e.color }}></span> {e.tag}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ W10: TABLEAU DE PRODUITS (sortable) ============
function W_Table({ title="Top produits" }) {
  const data = [
    { id: '#A-2401', name: 'T-shirt Userflow', price: 24.90, sales: 412, stock: 105, status: 'En stock', rating: 4.8 },
    { id: '#A-2402', name: 'Veste Winter Wolf', price: 132, sales: 207, stock: 64, status: 'Stock bas', rating: 4.5 },
    { id: '#A-2403', name: 'Sneakers Dune', price: 89, sales: 312, stock: 28, status: 'Stock bas', rating: 4.3 },
    { id: '#A-2404', name: 'Sac à dos Atlas', price: 64.50, sales: 188, stock: 0, status: 'Rupture', rating: 4.6 },
    { id: '#A-2405', name: 'Cap "Solar"', price: 22, sales: 502, stock: 240, status: 'En stock', rating: 4.9 },
  ];
  const [sort, setSort] = useState({ col: 'sales', dir: 'desc' });
  const [filter, setFilter] = useState('');
  const sorted = useMemo(() => {
    let f = data.filter(d => d.name.toLowerCase().includes(filter.toLowerCase()));
    f.sort((a,b) => {
      const va = a[sort.col], vb = b[sort.col];
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return f;
  }, [sort, filter]);
  const sortBtn = (col, label) => (
    <th onClick={() => setSort({ col, dir: sort.col === col && sort.dir === 'desc' ? 'asc' : 'desc' })}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label} {sort.col === col && (sort.dir === 'desc' ? '↓' : '↑')}
      </span>
    </th>
  );
  const statusPill = (s) => {
    if (s === 'En stock') return <span className="pill pill-ok">● {s}</span>;
    if (s === 'Stock bas') return <span className="pill pill-warn">● {s}</span>;
    return <span className="pill pill-bad">● {s}</span>;
  };
  return (
    <div className="w">
      <div className="w-head">
        <div className="w-title" style={{ fontSize: 15, color: 'var(--ink)' }}>{title}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', border: '1px solid var(--line-2)', borderRadius: 8, color: 'var(--ink-3)' }}>
            <Icon name="search" size={12} />
            <input
              value={filter}
              onChange={e=>setFilter(e.target.value)}
              placeholder="Rechercher..."
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, fontFamily: 'inherit', color: 'var(--ink)', width: 100 }}
            />
          </div>
          <button className="btn"><Icon name="download" size={12} /> Exporter</button>
          <button className="btn btn-primary"><Icon name="plus" size={12} /> Nouveau</button>
        </div>
      </div>
      <div style={{ overflow: 'hidden', borderRadius: 8, border: '1px solid var(--line)' }}>
        <table className="tbl">
          <thead>
            <tr>
              {sortBtn('id', 'ID')}
              {sortBtn('name', 'Produit')}
              {sortBtn('price', 'Prix')}
              {sortBtn('sales', 'Ventes')}
              {sortBtn('stock', 'Stock')}
              <th>Statut</th>
              {sortBtn('rating', 'Note')}
            </tr>
          </thead>
          <tbody>
            {sorted.map(d => (
              <tr key={d.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{d.id}</td>
                <td style={{ color: 'var(--ink)', fontWeight: 500 }}>{d.name}</td>
                <td>€{d.price.toFixed(2)}</td>
                <td>{d.sales}</td>
                <td>{d.stock}</td>
                <td>{statusPill(d.status)}</td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: 'var(--accent)' }}>★</span> {d.rating}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============ W11: HEATMAP HORAIRE ============
function W_Heatmap({ title="Activité d'achat (heure × jour)" }) {
  const days = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  const hours = ['00','03','06','09','12','15','18','21'];
  // 7 days × 8 cells
  const data = useMemo(() => days.map((_, di) =>
    hours.map((_, hi) => {
      const peak = (hi === 4 || hi === 5) && di < 5 ? 1 : 0;
      const wknd = di >= 5 && hi >= 4 ? 0.6 : 0;
      return Math.min(1, Math.random() * 0.4 + peak * 0.6 + wknd);
    })
  ), []);
  const [hover, setHover] = useState(null);
  return (
    <div className="w">
      <div className="w-head">
        <div className="w-title" style={{ fontSize: 15, color: 'var(--ink)' }}>{title}</div>
        <span className="chip"><span className="chip-dot"></span> Pic à 15h</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', paddingTop: 14 }}>
          {days.map(d => <div key={d} style={{ fontSize: 10, color: 'var(--ink-3)', height: 28, display: 'flex', alignItems: 'center' }}>{d}</div>)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${hours.length}, 1fr)`, gap: 4, marginBottom: 6 }}>
            {hours.map(h => <div key={h} style={{ fontSize: 10, color: 'var(--ink-3)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{h}h</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateRows: `repeat(${days.length}, 28px)`, gap: 4, position: 'relative' }}>
            {data.map((row, di) => (
              <div key={di} style={{ display: 'grid', gridTemplateColumns: `repeat(${hours.length}, 1fr)`, gap: 4 }}>
                {row.map((v, hi) => (
                  <div key={hi}
                    onMouseEnter={() => setHover({di, hi, v})}
                    onMouseLeave={() => setHover(null)}
                    style={{
                      borderRadius: 4,
                      background: v > 0.05 ? `color-mix(in oklab, var(--accent) ${v*100}%, var(--surface-2))` : 'var(--surface-2)',
                      border: '1px solid var(--line)',
                      cursor: 'pointer',
                      transition: 'transform 0.15s',
                      transform: hover && hover.di===di && hover.hi===hi ? 'scale(1.15)' : 'scale(1)'
                    }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 11, color: 'var(--ink-3)' }}>
        <span>Faible</span>
        <div style={{ display: 'flex', gap: 2 }}>
          {[0.15, 0.35, 0.55, 0.75, 1].map(v => (
            <div key={v} style={{ width: 16, height: 10, borderRadius: 2, background: `color-mix(in oklab, var(--accent) ${v*100}%, var(--surface-2))` }}/>
          ))}
        </div>
        <span>Élevé</span>
        {hover && (
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
            {days[hover.di]} {hours[hover.hi]}h · {Math.round(hover.v*100)}% activité
          </span>
        )}
      </div>
    </div>
  );
}

// ============ W12: FUNNEL DE CONVERSION ============
function W_Funnel({ title="Tunnel de conversion" }) {
  const steps = [
    { name: 'Visiteurs', val: 24891 },
    { name: 'Vue produit', val: 14302 },
    { name: 'Ajouté au panier', val: 5180 },
    { name: 'Checkout entamé', val: 2412 },
    { name: 'Achat finalisé', val: 1284 },
  ];
  const max = steps[0].val;
  return (
    <div className="w">
      <div className="w-head">
        <div className="w-title" style={{ fontSize: 15, color: 'var(--ink)' }}>{title}</div>
        <span className="chip"><span className="chip-dot" style={{ background: 'var(--positive)' }}></span> Taux global 5.2%</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((s, i) => {
          const pct = (s.val/max)*100;
          const dropoff = i > 0 ? Math.round((1 - s.val/steps[i-1].val) * 100) : 0;
          return (
            <div key={i} style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 4, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>{i+1}</span>
                  {s.name}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  {i > 0 && dropoff > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--negative)', fontFamily: 'var(--font-mono)' }}>
                      −{dropoff}%
                    </span>
                  )}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)' }}>
                    {s.val.toLocaleString('fr-FR')}
                    <span style={{ color: 'var(--ink-3)', marginLeft: 8 }}>{Math.round((s.val/max)*100)}%</span>
                  </span>
                </span>
              </div>
              <div style={{ height: 28, background: 'var(--surface-2)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  height: '100%',
                  width: pct + '%',
                  background: `linear-gradient(90deg, var(--accent), var(--accent-3))`,
                  borderRadius: 6,
                  transition: 'width 1s ease-out',
                  display: 'flex', alignItems: 'center', paddingLeft: 10
                }}>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ W13: MAP / EXPÉDITIONS (placeholder créatif sans Google) ============
function W_Map({ title="Expéditions actives" }) {
  // Stylized map with grid + dots
  const dots = [
    { x: 22, y: 35, label: 'Paris', count: 142 },
    { x: 38, y: 48, label: 'Lyon', count: 88 },
    { x: 30, y: 62, label: 'Toulouse', count: 54 },
    { x: 52, y: 32, label: 'Strasbourg', count: 67 },
    { x: 70, y: 55, label: 'Marseille', count: 102 },
    { x: 14, y: 28, label: 'Nantes', count: 41 },
  ];
  return (
    <div className="w" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="w-head" style={{ padding: '22px 22px 0' }}>
        <div className="w-title" style={{ fontSize: 15, color: 'var(--ink)' }}>{title}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn"><Icon name="filter" size={12} /></button>
          <button className="w-menu"><Icon name="more" /></button>
        </div>
      </div>
      <div style={{ position: 'relative', height: 220, margin: '12px 22px 22px', borderRadius: 10, overflow: 'hidden', background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
        <svg width="100%" height="100%" viewBox="0 0 100 80" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute' }}>
          {/* grid */}
          {Array.from({length: 11}).map((_, i) => (
            <line key={'v'+i} x1={i*10} x2={i*10} y1="0" y2="80" stroke="var(--line)" strokeWidth="0.2" />
          ))}
          {Array.from({length: 9}).map((_, i) => (
            <line key={'h'+i} x1="0" x2="100" y1={i*10} y2={i*10} stroke="var(--line)" strokeWidth="0.2" />
          ))}
          {/* abstract land mass */}
          <path d="M 10,20 Q 25,15 40,22 T 70,18 Q 80,25 75,40 Q 80,55 65,65 Q 50,72 30,68 Q 15,60 12,45 Q 5,32 10,20 Z"
            fill="var(--accent-4)" opacity="0.5" stroke="var(--accent-3)" strokeWidth="0.3" strokeDasharray="0.5,0.5" />
          {/* routes */}
          {dots.slice(1).map((d, i) => (
            <line key={i} x1={dots[0].x} y1={dots[0].y} x2={d.x} y2={d.y}
              stroke="var(--accent)" strokeWidth="0.3" strokeDasharray="1,1" opacity="0.5" />
          ))}
          {/* dots */}
          {dots.map((d, i) => (
            <g key={i}>
              <circle cx={d.x} cy={d.y} r={Math.sqrt(d.count)/2 + 1.5} fill="var(--accent)" opacity="0.25"/>
              <circle cx={d.x} cy={d.y} r="1.3" fill="var(--accent)" stroke="var(--surface)" strokeWidth="0.4"/>
            </g>
          ))}
        </svg>
        <div style={{ position: 'absolute', top: 10, left: 10, padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 6, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}>
          494 colis · 6 hubs
        </div>
        <div style={{ position: 'absolute', bottom: 10, right: 10, padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 50, background: 'var(--accent)', boxShadow: '0 0 0 4px color-mix(in oklab, var(--accent) 25%, transparent)' }}></span>
          <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>En transit · maj 2 min</span>
        </div>
      </div>
    </div>
  );
}

// ============ W14: TIMELINE D'ACTIVITÉ ============
function W_Activity({ title="Activité récente" }) {
  const items = [
    { time: '10:24', user: 'M. Lefèvre', action: 'a passé une commande', detail: '#SHA54321 · €1,284', color: 'var(--accent)' },
    { time: '09:58', user: 'Système', action: 'Stock faible détecté', detail: '"Veste Winter Wolf" · 14 unités', color: 'var(--warn)' },
    { time: '09:42', user: 'A. Diop', action: 'a remboursé', detail: '#FAH124541 · €653', color: 'var(--negative)' },
    { time: '09:15', user: 'Auto', action: 'Newsletter envoyée', detail: '12,402 destinataires', color: 'var(--c2)' },
    { time: '08:50', user: 'L. Martin', action: 'a ajouté un produit', detail: '"Sneakers Solar"', color: 'var(--positive)' },
  ];
  return (
    <div className="w">
      <div className="w-head">
        <div className="w-title" style={{ fontSize: 15, color: 'var(--ink)' }}>{title}</div>
        <button className="btn" style={{ padding: '4px 8px', fontSize: 11 }}>Tout voir</button>
      </div>
      <div style={{ position: 'relative', paddingLeft: 4 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: 14, position: 'relative' }}>
            {i < items.length - 1 && (
              <div style={{ position: 'absolute', left: 5, top: 16, bottom: 0, width: 1, background: 'var(--line-2)' }} />
            )}
            <div style={{ position: 'relative', zIndex: 1, width: 11, height: 11, borderRadius: 50, background: it.color, marginTop: 5, boxShadow: '0 0 0 3px var(--surface)' }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 13, color: 'var(--ink)' }}>
                  <strong style={{ fontWeight: 600 }}>{it.user}</strong>
                  <span style={{ color: 'var(--ink-2)', fontWeight: 400 }}> {it.action}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{it.time}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{it.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ W15: STACKED BAR (revenu par produit / temps) ============
function W_Stacked({ title="Revenu par segment" }) {
  const months = ['Jan','Fév','Mar','Avr','Mai','Juin'];
  const data = months.map((m, i) => ({
    month: m,
    a: 20 + Math.sin(i)*5 + Math.random()*8,
    b: 15 + i*1.5 + Math.random()*4,
    c: 10 + Math.cos(i)*4 + Math.random()*3,
  }));
  const max = Math.max(...data.map(d => d.a+d.b+d.c)) * 1.1;
  return (
    <div className="w">
      <div className="w-head">
        <div className="w-title" style={{ fontSize: 15, color: 'var(--ink)' }}>{title}</div>
        <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
          {[
            { label: 'Premium', c: 'var(--accent)' },
            { label: 'Standard', c: 'var(--c2)' },
            { label: 'Basique', c: 'var(--c4)' },
          ].map(s => (
            <span key={s.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.c }}></span>
              <span style={{ color: 'var(--ink-2)' }}>{s.label}</span>
            </span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, height: 200, alignItems: 'flex-end' }}>
        {data.map((d, i) => {
          const total = d.a + d.b + d.c;
          const ha = (d.a/max)*180, hb = (d.b/max)*180, hc = (d.c/max)*180;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: '60%', maxWidth: 38, display: 'flex', flexDirection: 'column-reverse', borderRadius: '6px 6px 2px 2px', overflow: 'hidden' }}>
                <div style={{ height: ha, background: 'var(--accent)' }}></div>
                <div style={{ height: hb, background: 'var(--c2)', marginBottom: 2 }}></div>
                <div style={{ height: hc, background: 'var(--c4)', marginBottom: 2 }}></div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{d.month}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ W16: RADIAL / RANKING (pays) ============
function W_Ranking({ title="Top pays" }) {
  const countries = [
    { flag: '🇫🇷', name: 'France', val: 38420, pct: 70, delta: 4.2 },
    { flag: '🇩🇪', name: 'Allemagne', val: 24180, pct: 44, delta: 2.1 },
    { flag: '🇪🇸', name: 'Espagne', val: 18920, pct: 34, delta: -1.4 },
    { flag: '🇮🇹', name: 'Italie', val: 14210, pct: 26, delta: 0.8 },
    { flag: '🇧🇪', name: 'Belgique', val: 9840, pct: 18, delta: 5.6 },
  ];
  return (
    <div className="w">
      <div className="w-head">
        <div className="w-title" style={{ fontSize: 15, color: 'var(--ink)' }}>{title}</div>
        <span className="muted">Ce trimestre</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {countries.map((c, i) => (
          <div key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 16, width: 22, height: 22, display: 'grid', placeItems: 'center', background: 'var(--surface-2)', borderRadius: 6 }}>{c.flag}</span>
              <span style={{ fontSize: 13, color: 'var(--ink)', flex: 1, fontWeight: 500 }}>{c.name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-2)' }}>€{(c.val/1000).toFixed(1)}k</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: c.delta>=0?'var(--positive)':'var(--negative)', minWidth: 42, textAlign: 'right' }}>
                {c.delta>=0?'+':''}{c.delta.toFixed(1)}%
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: c.pct + '%',
                background: `linear-gradient(90deg, var(--accent) 0%, var(--accent-3) 100%)`,
                borderRadius: 999,
                transition: 'width 1s ease-out'
              }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { W_Calendar, W_Table, W_Heatmap, W_Funnel, W_Map, W_Activity, W_Stacked, W_Ranking });
