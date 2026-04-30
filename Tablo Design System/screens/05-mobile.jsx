// Screen 5 · Mobile — stacked feed
function Screen05Mobile({ dark, annotations: anno, theme='steel' }) {
  const T = (window.THEMES && window.THEMES[theme]) || window.THEMES.steel;
  const C = dark ? {
    bg:'#0e1116', card:'#151921', sub:'#181c25', line:'#23283340', line2:'#2a303d',
    ink:'#e7eaf0', ink2:'#a5acba', muted:'#6b7280',
  } : {
    bg:'#fbfbfc', card:'#ffffff', sub:'#f4f5f8', line:'#e4e7ec', line2:'#d6dae1',
    ink:'#0e1116', ink2:'#2a2f3a', muted:'#6b7280',
  };
  const accent = T.accent;
  const accentSoft = dark ? T.accentSoftD : T.accentSoftL;

  // device size
  const W = 360, H = 740;

  return (
    <div style={{
      width:'100%', height:'100%', background: dark ? '#181c23' : '#eceef2',
      display:'flex', alignItems:'center', justifyContent:'center', padding:30, position:'relative',
      backgroundImage: dark
        ? 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)'
        : 'radial-gradient(circle at 1px 1px, rgba(14,17,22,0.06) 1px, transparent 0)',
      backgroundSize:'12px 12px'
    }}>
      {/* phone frame */}
      <div style={{
        width:W, height:H, background: dark ? '#0a0c10' : '#0e1116',
        borderRadius:46, padding:9,
        boxShadow:'0 30px 60px -20px rgba(14,17,22,0.35), 0 0 0 1px rgba(255,255,255,0.05) inset',
        position:'relative'
      }}>
        {/* screen */}
        <div style={{
          width:'100%', height:'100%', background:C.bg, borderRadius:38, overflow:'hidden',
          position:'relative', display:'flex', flexDirection:'column'
        }}>
          {/* status bar */}
          <div style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'14px 24px 4px', flexShrink:0
          }}>
            <span className="mono tnum" style={{ fontSize:13, fontWeight:600, color:C.ink }}>8:42</span>
            <div style={{ display:'flex', gap:5, alignItems:'center', color:C.ink }}>
              {/* signal */}
              <svg width="16" height="10" viewBox="0 0 16 10"><g fill="currentColor">
                <rect x="0" y="7" width="2.5" height="3" rx="0.4"/>
                <rect x="4" y="5" width="2.5" height="5" rx="0.4"/>
                <rect x="8" y="2.5" width="2.5" height="7.5" rx="0.4"/>
                <rect x="12" y="0" width="2.5" height="10" rx="0.4"/>
              </g></svg>
              {/* battery */}
              <svg width="22" height="11" viewBox="0 0 22 11"><rect x="0.5" y="0.5" width="18" height="10" rx="2.5" fill="none" stroke="currentColor" opacity="0.5"/><rect x="2" y="2" width="13" height="7" rx="1" fill="currentColor"/><rect x="19.5" y="3.5" width="2" height="4" rx="1" fill="currentColor" opacity="0.5"/></svg>
            </div>
          </div>
          {/* notch */}
          <div style={{
            position:'absolute', top:8, left:'50%', transform:'translateX(-50%)',
            width:96, height:28, background:'#0a0c10', borderRadius:99
          }}/>

          {/* scrollable content */}
          <div style={{ flex:1, overflow:'auto', padding:'14px 18px 130px' }}>
            {/* header */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
              <TabloMark size={26} live/>
              <div>
                <div style={{ fontSize:15, fontWeight:600, letterSpacing:'-0.01em' }}>CEO daily</div>
                <div className="mono" style={{ fontSize:10.5, color:C.muted }}>Apr 30 · Tuesday · 8:42</div>
              </div>
              <div style={{ flex:1 }}/>
              <div style={{
                width:30, height:30, borderRadius:'50%', background:C.sub, border:`1px solid ${C.line}`,
                display:'grid', placeItems:'center', color:C.ink2
              }}><IcSearch size={13}/></div>
            </div>

            {/* greeting */}
            <div className="mono" style={{ fontSize:10, color:C.muted, letterSpacing:'0.12em', marginBottom:6 }}>GOOD MORNING</div>
            <h1 style={{
              margin:'0 0 16px', fontSize:24, fontWeight:600, letterSpacing:'-0.025em', lineHeight:1.15, color:C.ink, textWrap:'pretty'
            }}>
              Revenue is up <span style={{ color:accent }}>12.4%</span> this week.
            </h1>

            {/* hero KPI */}
            <div style={{
              background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:'14px 16px', marginBottom:10,
              position:'relative'
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <div className="mono" style={{ fontSize:9.5, color:C.muted, letterSpacing:'0.1em' }}>MRR</div>
                <div style={{ display:'flex', alignItems:'center', gap:5, padding:'1px 6px', background:accentSoft, borderRadius:99 }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:accent, boxShadow:'0 0 0 2px rgba(31,95,209,0.18)' }}/>
                  <span className="mono" style={{ fontSize:9, color:accent, fontWeight:600, letterSpacing:'0.06em' }}>LIVE</span>
                </div>
                <div style={{ flex:1 }}/>
                <IcMore size={14} color={C.muted}/>
              </div>
              <div className="tnum" style={{ fontSize:36, fontWeight:600, letterSpacing:'-0.025em', color:accent, lineHeight:1 }}>
                €48.2k
              </div>
              <div style={{ marginTop:10 }}>
                <Sparkline data={[18,20,19,22,21,24,23,26,25,28,30,29,32,34,36]} w={W-72} h={48} color={accent}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
                <span className="mono tnum" style={{ fontSize:11, color:accent, fontWeight:600 }}>+12.4% vs last week</span>
                <span className="mono" style={{ fontSize:9.5, color:C.muted }}>3 days ahead of pace</span>
              </div>
            </div>

            {/* mini KPI grid 2x2 */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
              {[
                { k:'NEW', v:'38', d:'+6', sub:'customers' },
                { k:'CHURN', v:'2.1%', d:'−0.4%', sub:'monthly' },
                { k:'NPS', v:'62', d:'+3', sub:'last 30d' },
                { k:'BURN', v:'€84k', d:'−5%', sub:'monthly' },
              ].map((m,i)=>(
                <div key={i} style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:10, padding:'10px 12px' }}>
                  <div className="mono" style={{ fontSize:9, color:C.muted, letterSpacing:'0.1em' }}>{m.k}</div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:6, marginTop:4 }}>
                    <div className="tnum" style={{ fontSize:18, fontWeight:600, letterSpacing:'-0.02em', color:C.ink }}>{m.v}</div>
                    <div className="mono tnum" style={{ fontSize:9.5, color:accent }}>{m.d}</div>
                  </div>
                  <div className="mono" style={{ fontSize:9, color:C.muted, marginTop:2, letterSpacing:'0.04em' }}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* top customers */}
            <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div className="mono" style={{ fontSize:9.5, color:C.muted, letterSpacing:'0.1em' }}>TOP CUSTOMERS</div>
                <div style={{ flex:1 }}/>
                <span className="mono" style={{ fontSize:9, color:C.muted }}>this quarter</span>
              </div>
              {[
                { n:'Acme Corp',     v:'€12.4k', d:'+38%' },
                { n:'Lumen Studio',  v:'€9.8k',  d:'+24%' },
                { n:'Voltaic',       v:'€7.5k',  d:'+18%' },
                { n:'Petit Atelier', v:'€4.2k',  d:'+12%' },
              ].map((r,i,arr)=>(
                <div key={i} style={{
                  display:'flex', alignItems:'center', padding:'7px 0',
                  borderBottom: i<arr.length-1 ? `1px solid ${C.line}` : 'none'
                }}>
                  <div className="mono tnum" style={{ fontSize:9.5, color:C.muted, width:18 }}>0{i+1}</div>
                  <div style={{ flex:1, fontSize:12.5, color:C.ink }}>{r.n}</div>
                  <div className="mono tnum" style={{ fontSize:10, color:accent, width:42, textAlign:'right' }}>{r.d}</div>
                  <div className="mono tnum" style={{ fontSize:12, fontWeight:500, color:C.ink, width:54, textAlign:'right' }}>{r.v}</div>
                </div>
              ))}
            </div>

            {/* source mix card */}
            <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:10, padding:'12px 14px' }}>
              <div className="mono" style={{ fontSize:9.5, color:C.muted, letterSpacing:'0.1em', marginBottom:8 }}>SOURCE MIX · 30D</div>
              <div style={{ display:'flex', height:8, borderRadius:2, overflow:'hidden', marginBottom:8 }}>
                <div style={{ flex:55, background:C.ink }}/>
                <div style={{ flex:25, background:accent }}/>
                <div style={{ flex:12, background: dark?'#5a6678':'#9aa1ad' }}/>
                <div style={{ flex:8, background: C.line2 }}/>
              </div>
              <div style={{ display:'flex', gap:10, fontSize:10, color:C.ink2, flexWrap:'wrap' }}>
                <span><span style={{ display:'inline-block', width:7, height:7, background:C.ink, borderRadius:1, marginRight:4 }}/>Direct 55%</span>
                <span><span style={{ display:'inline-block', width:7, height:7, background:accent, borderRadius:1, marginRight:4 }}/>Search 25%</span>
                <span><span style={{ display:'inline-block', width:7, height:7, background: dark?'#5a6678':'#9aa1ad', borderRadius:1, marginRight:4 }}/>Social 12%</span>
              </div>
            </div>
          </div>

          {/* sticky ask bar */}
          <div style={{
            position:'absolute', bottom:0, left:0, right:0,
            padding:'12px 14px 22px',
            background: dark ? 'linear-gradient(to top, #0e1116 60%, rgba(14,17,22,0))'
                             : 'linear-gradient(to top, #fbfbfc 60%, rgba(251,251,252,0))'
          }}>
            <div style={{
              display:'flex', alignItems:'center', gap:8, padding:'9px 9px 9px 14px',
              background:C.card, border:`1px solid ${C.line2}`, borderRadius:99,
              boxShadow: dark ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(14,17,22,0.06)'
            }}>
              <IcSparkles size={14} color={accent}/>
              <div style={{ flex:1, fontSize:13, color:C.muted }}>Ask Tablo…</div>
              <button style={{
                width:36, height:36, borderRadius:'50%', background:accent, border:'none',
                display:'grid', placeItems:'center', cursor:'pointer',
                boxShadow:'0 0 0 4px rgba(31,95,209,0.14)'
              }}><IcMic size={15} color="#fff"/></button>
            </div>
            {/* home indicator */}
            <div style={{
              width:120, height:4, borderRadius:2, background: dark?'#3a4150':'#0e1116',
              opacity:0.6, margin:'10px auto 0'
            }}/>
          </div>
        </div>
      </div>

      {/* annos */}
      <Anno show={anno} n={1} x={20} y={60} side="right">Mini-dial · live indicator</Anno>
      <Anno show={anno} n={2} x={20} y={220} side="right">Hero KPI · steel-blue accent</Anno>
      <Anno show={anno} n={3} x={20} y={420} side="right">2×2 grid · scannable</Anno>
      <Anno show={anno} n={4} x={20} y={620} side="right">Sticky ask bar · voice CTA</Anno>
    </div>
  );
}

window.Screen05Mobile = Screen05Mobile;
