// Screen 3 · Executive dashboard — narrative sections
function Screen03Dashboard({ dark, annotations: anno, theme='steel' }) {
  const T = (window.THEMES && window.THEMES[theme]) || window.THEMES.steel;
  const C = dark ? {
    bg:'#0e1116', card:'#151921', sub:'#181c25', line:'#23283340', line2:'#2a303d',
    ink:'#e7eaf0', ink2:'#a5acba', muted:'#6b7280',
  } : {
    bg:'#fbfbfc', card:'#ffffff', sub:'#f4f5f8', line:'#e4e7ec', line2:'#d6dae1',
    ink:'#0e1116', ink2:'#2a2f3a', muted:'#6b7280',
  };
  const accent = T.accent;
  const series = dark ? T.seriesD : T.series;

  const SectionLabel = ({ children, right }) => (
    <div style={{ display:'flex', alignItems:'center', gap:14, margin:'18px 0 12px' }}>
      <div className="mono" style={{ fontSize:10.5, color:C.muted, letterSpacing:'0.14em' }}>{children}</div>
      <div style={{ flex:1, height:1, background:C.line, position:'relative' }}>
        {/* tiny ticks */}
        {[...Array(20)].map((_,i)=>(
          <div key={i} style={{
            position:'absolute', left:`${(i+1)*5}%`, top:-2, width:1, height:5,
            background: i%4===0 ? C.line2 : 'transparent'
          }}/>
        ))}
      </div>
      {right && <div className="mono" style={{ fontSize:10.5, color:C.muted, letterSpacing:'0.08em' }}>{right}</div>}
    </div>
  );

  const KPI = ({ label, value, delta, accentVal=false, deltaPos=true }) => (
    <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:8, padding:'14px 16px' }}>
      <div className="mono" style={{ fontSize:10, color:C.muted, letterSpacing:'0.1em', textTransform:'uppercase' }}>{label}</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:10, marginTop:8 }}>
        <div className="tnum" style={{
          fontSize:26, fontWeight:600, letterSpacing:'-0.02em',
          color: accentVal ? accent : C.ink
        }}>{value}</div>
        <div className="mono tnum" style={{ fontSize:11.5, color: deltaPos ? accent : '#b54141', fontWeight:500 }}>{delta}</div>
      </div>
    </div>
  );

  // bars revenue-by-week
  const bars = [38, 42, 36, 48, 44, 52, 56, 50, 58, 62, 60, 67, 64];
  const maxBar = Math.max(...bars);

  const Sidebar = () => (
    <div style={{ width:200, borderRight:`1px solid ${C.line}`, padding:'14px 12px', display:'flex', flexDirection:'column', gap:14, flexShrink:0, background:C.bg }}>
      <TabloLockup height={16} color={C.ink}/>
      <div style={{
        display:'flex', alignItems:'center', gap:8, padding:'7px 8px',
        background:C.sub, borderRadius:6, border:`1px solid ${C.line}`
      }}>
        <div style={{ width:18, height:18, borderRadius:4, background:C.ink, color:dark?'#0e1116':'#fff', display:'grid', placeItems:'center', fontSize:10, fontWeight:600 }}>T</div>
        <div style={{ fontSize:12, fontWeight:500 }}>Tablo HQ</div>
        <IcChevronDown size={12} color={C.muted} style={{ marginLeft:'auto' }}/>
      </div>
      <div>
        <div className="mono" style={{ fontSize:10, color:C.muted, letterSpacing:'0.08em', padding:'0 8px 6px' }}>DASHBOARDS</div>
        {['CEO daily','Revenue · weekly','Ops health','Hiring funnel'].map((t,i)=>(
          <div key={i} style={{
            display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:6,
            background: i===0 ? (dark?'#1a2030':'#eef0f4') : 'transparent',
            color: i===0 ? C.ink : C.ink2, fontSize:12.5, fontWeight: i===0?500:400,
          }}>
            <span style={{ color: i===0 ? accent : C.muted }}><IcLayers size={13}/></span>
            {t}
          </div>
        ))}
      </div>
      <div>
        <div className="mono" style={{ fontSize:10, color:C.muted, letterSpacing:'0.08em', padding:'0 8px 6px' }}>PINNED</div>
        {['MRR · live','Top customers','Stripe charges'].map((t,i)=>(
          <div key={i} style={{ display:'flex', gap:8, alignItems:'center', padding:'6px 8px', fontSize:12, color:C.ink2 }}>
            <IcPin size={11} color={C.muted}/>{t}
          </div>
        ))}
      </div>
      <div style={{ marginTop:'auto', display:'flex', flexDirection:'column', gap:4 }}>
        <div style={{ display:'flex', gap:8, alignItems:'center', padding:'6px 8px', fontSize:12, color:C.ink2 }}>
          <IcDatabase size={13} color={C.muted}/> Sources <span className="mono" style={{ marginLeft:'auto', fontSize:10, color:C.muted }}>2</span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', padding:'6px 8px', fontSize:12, color:C.ink2 }}>
          <IcSettings size={13} color={C.muted}/> Settings
        </div>
      </div>
    </div>
  );

  return (
    <BrowserFrame url="tablo.app/tablo-hq/ceo-daily" dark={dark}>
      <div style={{ display:'flex', height:'100%', background:C.bg, color:C.ink, fontFamily:'"Inter Tight", sans-serif', position:'relative' }}>
        <Sidebar/>

        {/* main */}
        <div style={{ flex:1, padding:'18px 28px 28px', overflow:'auto', minWidth:0 }}>
          {/* topbar */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
            <TabloMark size={26} live/>
            <div>
              <div style={{ fontSize:14, fontWeight:600, letterSpacing:'-0.01em' }}>Tuesday morning <span className="mono" style={{ color:C.muted, fontWeight:400, marginLeft:6 }}>· 8:42</span></div>
              <div className="mono" style={{ fontSize:11, color:C.muted, marginTop:2 }}>Tablo HQ / CEO daily · live · Apr 30, 2026</div>
            </div>
            <div style={{ flex:1 }}/>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 9px', border:`1px solid ${C.line}`, borderRadius:6, background:C.card }}>
              <div style={{ width:18, height:18, borderRadius:'50%', background:'#dfe5ee', display:'grid', placeItems:'center', fontSize:10, fontWeight:600, color:'#3a4150' }}>M</div>
              <div style={{ fontSize:12 }}>Marc</div>
              <span className="mono" style={{ fontSize:10, color:C.muted }}>· CEO</span>
            </div>
            <button style={{
              display:'flex', alignItems:'center', gap:6, padding:'6px 10px',
              background: C.card, border:`1px dashed ${accent}`, borderRadius:6, color:accent,
              fontSize:12, fontFamily:'inherit', cursor:'pointer'
            }}>
              <IcSparkles size={13}/> Ask <span className="mono" style={{ marginLeft:4, padding:'1px 5px', background:dark?'#1a2640':'#eef3fc', borderRadius:3, fontSize:10 }}>⌘K</span>
            </button>
          </div>

          <div style={{ height:1, background:C.line, marginBottom:18 }}/>

          {/* headline */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 240px', gap:30, alignItems:'flex-end' }}>
            <div>
              <div className="mono" style={{ fontSize:10, color:C.muted, letterSpacing:'0.12em', marginBottom:8 }}>GOOD MORNING, MARC</div>
              <h1 style={{
                margin:0, fontSize:36, fontWeight:600, letterSpacing:'-0.025em', lineHeight:1.1, color:C.ink,
                textWrap:'pretty'
              }}>
                Revenue is up <span style={{ color:accent }}>12.4%</span> this week.
              </h1>
              <div style={{ marginTop:10, fontSize:13.5, color:C.ink2, display:'flex', gap:14, flexWrap:'wrap' }}>
                <span><span className="mono tnum" style={{ color:C.ink, fontWeight:500 }}>€48,210</span> booked</span>
                <span style={{ color:C.line2 }}>·</span>
                <span><span className="mono tnum" style={{ color:C.ink, fontWeight:500 }}>3 days</span> ahead of pace</span>
                <span style={{ color:C.line2 }}>·</span>
                <span>driven by <span style={{ color:C.ink, fontWeight:500 }}>Acme Corp</span> upgrade to Scale plan</span>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
              <Sparkline data={[18,20,19,22,21,24,23,26,25,28,30,29,32,34,36]} w={220} h={56} color={accent}/>
              <div style={{ display:'flex', justifyContent:'space-between', width:220 }}>
                <span className="mono" style={{ fontSize:10, color:C.muted }}>Apr 1</span>
                <span className="mono" style={{ fontSize:10, color:C.muted }}>Apr 30</span>
              </div>
            </div>
          </div>

          {/* NUMBERS */}
          <SectionLabel right="4 widgets">NUMBERS</SectionLabel>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            <KPI label="MRR" value="€48.2k" delta="+12.4%" accentVal/>
            <KPI label="New customers" value="38" delta="+6"/>
            <KPI label="Churn" value="2.1%" delta="−0.4%" deltaPos/>
            <KPI label="NPS" value="62" delta="+3"/>
          </div>

          {/* TRENDS */}
          <SectionLabel right="2 widgets">TRENDS · 30D</SectionLabel>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:10 }}>
            <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:8, padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:14 }}>
                <div className="mono" style={{ fontSize:10, color:C.muted, letterSpacing:'0.1em' }}>REVENUE BY WEEK</div>
                <div className="mono tnum" style={{ fontSize:11, color:C.ink2 }}>13 weeks</div>
                <div style={{ flex:1 }}/>
                <IcMore size={14} color={C.muted}/>
              </div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:120 }}>
                {bars.map((v,i)=>{
                  const isLast = i === bars.length-1;
                  const isHi = i === bars.length-2;
                  return (
                    <div key={i} style={{
                      flex:1, height:`${(v/maxBar)*100}%`, borderRadius:'2px 2px 0 0',
                      background: isLast ? accent : (isHi ? series[2] || (dark?'#5a6678':'#9aa1ad') : C.ink),
                      position:'relative'
                    }}>
                      {isLast && (
                        <div style={{
                          position:'absolute', top:-22, left:'50%', transform:'translateX(-50%)',
                          fontSize:10, fontWeight:600, color:accent
                        }} className="mono tnum">€67k</div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:8 }}>
                <span className="mono" style={{ fontSize:9.5, color:C.muted }}>W05</span>
                <span className="mono" style={{ fontSize:9.5, color:C.muted }}>W17</span>
              </div>
            </div>
            <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:8, padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:8 }}>
                <div className="mono" style={{ fontSize:10, color:C.muted, letterSpacing:'0.1em' }}>SOURCE MIX</div>
                <div style={{ flex:1 }}/>
                <IcMore size={14} color={C.muted}/>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <svg width="92" height="92" viewBox="0 0 92 92">
                  {/* donut: direct 55, search 25, social 12, other 8 */}
                  {(()=>{
                    const segs = [
                      { v:55, c: series[0] || C.ink },
                      { v:25, c: series[1] || accent },
                      { v:12, c: series[2] || (dark?'#5a6678':'#9aa1ad') },
                      { v:8,  c: series[3] || C.line2 },
                    ];
                    let acc = 0;
                    const r = 36;
                    return segs.map((s,i)=>{
                      const a0 = (acc/100)*Math.PI*2 - Math.PI/2;
                      acc += s.v;
                      const a1 = (acc/100)*Math.PI*2 - Math.PI/2;
                      const x0 = 46+Math.cos(a0)*r, y0 = 46+Math.sin(a0)*r;
                      const x1 = 46+Math.cos(a1)*r, y1 = 46+Math.sin(a1)*r;
                      const large = s.v > 50 ? 1 : 0;
                      return <path key={i} d={`M 46 46 L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`} fill={s.c}/>;
                    });
                  })()}
                  <circle cx="46" cy="46" r="22" fill={C.card}/>
                </svg>
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                  {[
                    { k:'Direct', v:'55%', c: series[0] || C.ink },
                    { k:'Search', v:'25%', c: series[1] || accent },
                    { k:'Social', v:'12%', c: series[2] || (dark?'#5a6678':'#9aa1ad') },
                    { k:'Other',  v:'8%',  c: series[3] || C.line2 },
                  ].map((r,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
                      <div style={{ width:8, height:8, borderRadius:2, background:r.c }}/>
                      <span style={{ color:C.ink2 }}>{r.k}</span>
                      <span className="mono tnum" style={{ marginLeft:'auto', color:C.ink, fontWeight:500 }}>{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* TOP MOVERS */}
          <SectionLabel right="customers · highest growth">TOP MOVERS</SectionLabel>
          <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:8, padding:'4px 0', overflow:'hidden' }}>
            {[
              { n:'Acme Corp',     v:'€12,400', d:'+38%', plan:'Scale', spark:[10,12,11,14,16,15,18] },
              { n:'Lumen Studio',  v:'€9,820',  d:'+24%', plan:'Pro',   spark:[8,9,10,11,12,13,14] },
              { n:'Voltaic',       v:'€7,500',  d:'+18%', plan:'Pro',   spark:[6,7,8,8,9,10,11] },
              { n:'Petit Atelier', v:'€4,210',  d:'+12%', plan:'Starter', spark:[3,4,4,5,5,6,6] },
            ].map((r,i,arr)=>(
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:14, padding:'12px 16px',
                borderBottom: i < arr.length-1 ? `1px solid ${C.line}` : 'none'
              }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background: i===0 ? accent : C.ink, flexShrink:0 }}/>
                <div style={{ fontSize:13, fontWeight:500, color:C.ink, minWidth:140 }}>{r.n}</div>
                <div className="mono" style={{ fontSize:10.5, color:C.muted, padding:'2px 6px', border:`1px solid ${C.line2}`, borderRadius:3 }}>{r.plan}</div>
                <div style={{ flex:1 }}>
                  <Sparkline data={r.spark} w={140} h={20} color={accent} fill={false}/>
                </div>
                <div className="mono tnum" style={{ fontSize:11.5, color:accent, fontWeight:500, minWidth:48, textAlign:'right' }}>{r.d}</div>
                <div className="mono tnum" style={{ fontSize:13, fontWeight:600, color:C.ink, minWidth:80, textAlign:'right' }}>{r.v}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop:18, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div className="mono" style={{ fontSize:10.5, color:C.muted, letterSpacing:'0.08em' }}>UPDATED 2 MIN AGO · SUPABASE + STRIPE</div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <button style={{ padding:'6px 10px', background:C.card, border:`1px solid ${C.line}`, borderRadius:6, fontSize:12, color:C.ink2, fontFamily:'inherit', cursor:'pointer', display:'flex', gap:6, alignItems:'center' }}>
                <IcShare size={12}/> Share
              </button>
              <button style={{ padding:'6px 10px', background:accent, border:'none', borderRadius:6, fontSize:12, color:'#fff', fontFamily:'inherit', cursor:'pointer', display:'flex', gap:6, alignItems:'center' }}>
                <IcSparkles size={12}/> Ask a follow-up
              </button>
            </div>
          </div>
        </div>

        {/* annos */}
        <Anno show={anno} n={1} x={230} y={140} side="right">Conversational headline + sparkline</Anno>
        <Anno show={anno} n={2} x={230} y={300} side="right">Section labels w/ tablo ticks</Anno>
        <Anno show={anno} n={3} x={230} y={500} side="right">Steel-blue = live week</Anno>
        <Anno show={anno} n={4} x={760} y={140} side="left">⌘K — voice or text query</Anno>
      </div>
    </BrowserFrame>
  );
}

window.Screen03Dashboard = Screen03Dashboard;
