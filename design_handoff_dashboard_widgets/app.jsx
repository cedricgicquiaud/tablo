// Main app: design canvas + assembled dashboard tab + tweaks
const { useState: uSm, useEffect: uEm } = React;

function App() {
  const defaults = /*EDITMODE-BEGIN*/{
    "theme": "light",
    "radius": "soft",
    "typo": "system"
  }/*EDITMODE-END*/;
  const [tweaks, setTweak] = useTweaks(defaults);
  const [view, setView] = useState('canvas');

  uEm(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    document.documentElement.dataset.radius = tweaks.radius;
    document.documentElement.dataset.typo = tweaks.typo;
  }, [tweaks]);

  return (
    <>
      {/* Top switcher */}
      <div style={{
        position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000,
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 999, padding: 4, display: 'flex', gap: 2,
        boxShadow: 'var(--shadow-md)'
      }}>
        {[
          { id: 'canvas', label: 'Galerie de widgets' },
          { id: 'dashboard', label: 'Dashboard assemblé' }
        ].map(t => (
          <button key={t.id}
            onClick={() => setView(t.id)}
            style={{
              border: 'none', background: view === t.id ? 'var(--ink)' : 'transparent',
              color: view === t.id ? 'var(--bg)' : 'var(--ink-2)',
              padding: '7px 16px', borderRadius: 999,
              fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
              cursor: 'pointer'
            }}>{t.label}</button>
        ))}
      </div>

      {view === 'canvas' ? <CanvasView /> : <DashboardView />}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Apparence">
          <TweakRadio label="Thème" value={tweaks.theme} onChange={v => setTweak('theme', v)}
            options={[{value:'light',label:'Clair'},{value:'dark',label:'Sombre'}]} />
          <TweakRadio label="Coins arrondis" value={tweaks.radius} onChange={v => setTweak('radius', v)}
            options={[{value:'sharp',label:'Net'},{value:'soft',label:'Doux'},{value:'pill',label:'Pilule'}]} />
        </TweakSection>
        <TweakSection title="Typographie">
          <TweakRadio label="Famille" value={tweaks.typo} onChange={v => setTweak('typo', v)}
            options={[
              {value:'system',label:'Système'},
              {value:'inter',label:'Inter'},
              {value:'ibm',label:'IBM Plex'},
              {value:'geist',label:'Geist'},
            ]} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

// ============ CANVAS GALLERY ============
function CanvasView() {
  return (
    <DesignCanvas pad={60}>
      <DCSection id="kpi" title="01 — KPI / Métriques">
        <DCArtboard id="k1" label="KPI éditorial · sparkline" width={300} height={200}>
          <div style={{ padding: 16, background: 'var(--bg)', height: '100%' }}><W_KpiEditorial /></div>
        </DCArtboard>
        <DCArtboard id="k2" label="KPI barres · 7 jours" width={300} height={200}>
          <div style={{ padding: 16, background: 'var(--bg)', height: '100%' }}><W_KpiBars /></div>
        </DCArtboard>
        <DCArtboard id="k3" label="KPI typographique inversé" width={300} height={200}>
          <div style={{ padding: 16, background: 'var(--bg)', height: '100%' }}><W_KpiTypo /></div>
        </DCArtboard>
        <DCArtboard id="k4" label="KPI avec anneau de progression" width={300} height={200}>
          <div style={{ padding: 16, background: 'var(--bg)', height: '100%' }}><W_KpiRing /></div>
        </DCArtboard>
      </DCSection>

      <DCSection id="charts" title="02 — Graphiques (ligne · barres)">
        <DCArtboard id="c1" label="Courbe interactive avec tooltip" width={680} height={380}>
          <div style={{ padding: 16, background: 'var(--bg)', height: '100%' }}><W_LineChart /></div>
        </DCArtboard>
        <DCArtboard id="c2" label="Barres réel vs objectif" width={520} height={380}>
          <div style={{ padding: 16, background: 'var(--bg)', height: '100%' }}><W_BarChart /></div>
        </DCArtboard>
        <DCArtboard id="c3" label="Barres empilées par segment" width={520} height={380}>
          <div style={{ padding: 16, background: 'var(--bg)', height: '100%' }}><W_Stacked /></div>
        </DCArtboard>
      </DCSection>

      <DCSection id="circular" title="03 — Donuts & jauges">
        <DCArtboard id="d1" label="Donut éclaté au survol" width={460} height={340}>
          <div style={{ padding: 16, background: 'var(--bg)', height: '100%' }}><W_DonutExploded /></div>
        </DCArtboard>
        <DCArtboard id="d2" label="Jauge arc segmenté" width={460} height={340}>
          <div style={{ padding: 16, background: 'var(--bg)', height: '100%' }}><W_Gauge /></div>
        </DCArtboard>
      </DCSection>

      <DCSection id="advanced" title="04 — Avancés (heatmap · funnel · map · ranking)">
        <DCArtboard id="a1" label="Heatmap horaire" width={520} height={340}>
          <div style={{ padding: 16, background: 'var(--bg)', height: '100%' }}><W_Heatmap /></div>
        </DCArtboard>
        <DCArtboard id="a2" label="Tunnel de conversion" width={520} height={340}>
          <div style={{ padding: 16, background: 'var(--bg)', height: '100%' }}><W_Funnel /></div>
        </DCArtboard>
        <DCArtboard id="a3" label="Carte expéditions" width={520} height={340}>
          <div style={{ padding: 16, background: 'var(--bg)', height: '100%' }}><W_Map /></div>
        </DCArtboard>
        <DCArtboard id="a4" label="Classement pays" width={460} height={360}>
          <div style={{ padding: 16, background: 'var(--bg)', height: '100%' }}><W_Ranking /></div>
        </DCArtboard>
      </DCSection>

      <DCSection id="content" title="05 — Listes & contenus">
        <DCArtboard id="l1" label="Calendrier de campagnes" width={460} height={420}>
          <div style={{ padding: 16, background: 'var(--bg)', height: '100%' }}><W_Calendar /></div>
        </DCArtboard>
        <DCArtboard id="l2" label="Activité récente / timeline" width={460} height={420}>
          <div style={{ padding: 16, background: 'var(--bg)', height: '100%' }}><W_Activity /></div>
        </DCArtboard>
        <DCArtboard id="l3" label="Tableau triable + recherche" width={780} height={420}>
          <div style={{ padding: 16, background: 'var(--bg)', height: '100%' }}><W_Table /></div>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

// ============ ASSEMBLED DASHBOARD ============
function DashboardView() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '70px 28px 40px' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Lundi 26 avril 2026</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 38, margin: 0, letterSpacing: '-0.02em' }}>
                Bonjour, <span style={{ color: 'var(--accent)' }}>Ali</span>
              </h1>
            </div>
            <div className="muted" style={{ marginTop: 4 }}>Aperçu de votre activité commerciale</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn"><Icon name="calendar" size={12} /> 7 derniers jours</button>
            <button className="btn"><Icon name="download" size={12} /> Exporter</button>
            <button className="btn btn-primary"><Icon name="plus" size={12} /> Nouveau produit</button>
          </div>
        </div>

        {/* Row 1: 4 KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
          <W_KpiEditorial title="Revenu total" value="278K" delta={2.1} />
          <W_KpiBars title="Visiteurs" value="61.1K" delta={3.5} />
          <W_KpiTypo title="Panier moyen" value="121" delta={-4.7} />
          <W_KpiRing title="Objectif mensuel" value="84.2K" target="100K" pct={84} />
        </div>

        {/* Row 2: chart + gauge */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
          <W_LineChart />
          <W_Gauge />
        </div>

        {/* Row 3: donut + bar + ranking */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr 1fr', gap: 16, marginBottom: 16 }}>
          <W_DonutExploded />
          <W_BarChart />
          <W_Ranking />
        </div>

        {/* Row 4: heatmap + funnel + map */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
          <W_Heatmap />
          <W_Funnel />
          <W_Map />
        </div>

        {/* Row 5: stacked + calendar + activity */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
          <W_Stacked />
          <W_Calendar />
          <W_Activity />
        </div>

        {/* Row 6: full table */}
        <W_Table />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
