// Screen 1 · Ops onboarding — checklist on workspace
// Variants: steel | ink | sage | violet — affects accent, dimmed-preview tint,
// and dark-mode foreground brightness for stronger contrast.
function Screen01Onboarding({ dark, annotations: anno, theme = 'steel' }) {
  const T = (window.THEMES && window.THEMES[theme]) || window.THEMES.steel;
  const P = {
    accent: T.accent,
    accentSoftL: T.accentSoftL, accentSoftD: T.accentSoftD,
    previewTintL: dark ? '#11151d' : '#f5f7fb',
    previewTintD: '#13171f',
    previewInkL: '#9aa1ad', previewInkD: '#5a6678',
    activeBgL:'#ffffff', activeBgD:'#1a2640',
    activeBorder: T.accent
  };

  const C = dark ? {
    bg:'#0e1116', card:'#151921', sub:'#181c25', line:'#262b35', line2:'#323845',
    ink:'#f1f3f7', ink2:'#c2c8d2', muted:'#7a818d',
    panel:'#161b25', panelBorder:'#262b35',
    previewTint: P.previewTintD, previewInk: P.previewInkD,
    activeBg: P.activeBgD, accentSoft: P.accentSoftD,
  } : {
    bg:'#fbfbfc', card:'#ffffff', sub:'#f4f5f8', line:'#e4e7ec', line2:'#d6dae1',
    ink:'#0e1116', ink2:'#2a2f3a', muted:'#6b7280',
    panel:'#f4f5f8', panelBorder:'#e4e7ec',
    previewTint: P.previewTintL, previewInk: P.previewInkL,
    activeBg: P.activeBgL, accentSoft: P.accentSoftL,
  };
  const accent = P.accent;

  // dimmed preview = tinted ghost cards with muted ink — much higher contrast
  // than opacity-based dimming, especially in dark mode.
  const Widget = ({ title, value, delta }) => (
    <div style={{
      padding:'14px 16px', background:C.previewTint,
      border:`1px solid ${C.line}`, borderRadius:8, position:'relative'
    }}>
      <div className="mono" style={{ fontSize:10, letterSpacing:'0.08em', color:C.muted, textTransform:'uppercase' }}>{title}</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:8, marginTop:6 }}>
        <div className="tnum" style={{ fontSize:22, fontWeight:600, color:C.previewInk, letterSpacing:'-0.01em' }}>{value}</div>
        {delta && <div className="mono tnum" style={{ fontSize:11, color:C.previewInk, opacity:0.8 }}>{delta}</div>}
      </div>
    </div>
  );

  const Item = ({ state, title, sub }) => {
    const done = state === 'done';
    const active = state === 'active';
    const dimmed = state === 'dim';
    return (
      <div style={{
        display:'flex', gap:10, alignItems:'flex-start',
        padding:'10px 12px', borderRadius:8,
        border: active ? `1.5px solid ${P.activeBorder}` : `1px solid transparent`,
        background: active ? C.activeBg : 'transparent',
        opacity: dimmed ? 0.55 : 1,
      }}>
        <div style={{
          width:18, height:18, borderRadius:'50%', flexShrink:0, marginTop:2,
          border: done ? 'none' : `1.5px solid ${active ? accent : C.line2}`,
          background: done ? C.ink : (active ? (dark?'#0e1116':'#fff') : 'transparent'),
          display:'grid', placeItems:'center'
        }}>
          {done && <IcCheck size={11} color={dark ? '#0e1116' : '#fff'} />}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{
            fontSize:13, fontWeight: active ? 600 : 500,
            color: done ? C.ink2 : C.ink,
            textDecoration: done ? 'line-through' : 'none',
            textDecorationColor: C.muted,
          }}>{title}</div>
          {sub && <div className="mono" style={{ fontSize:11, color: dark ? C.ink2 : C.muted, marginTop:2 }}>{sub}</div>}
        </div>
        {active && <IcChevronRight size={14} color={accent} style={{ marginTop:4 }} />}
      </div>
    );
  };

  return (
    <BrowserFrame url="tablo.app/cadran-hq" dark={dark}>
      <div style={{ display:'flex', height:'100%', background:C.bg, color:C.ink, fontFamily:'"Inter Tight", sans-serif', position:'relative' }}>
        {/* sidebar */}
        <div style={{ width:200, borderRight:`1px solid ${C.line}`, padding:'14px 12px', display:'flex', flexDirection:'column', gap:14, flexShrink:0 }}>
          <TabloLockup height={16} color={C.ink}/>
          <div style={{
            display:'flex', alignItems:'center', gap:8, padding:'7px 8px',
            background: C.sub, borderRadius:6, border:`1px solid ${C.line}`
          }}>
            <div style={{ width:18, height:18, borderRadius:4, background:C.ink, color:dark?'#0e1116':'#fff', display:'grid', placeItems:'center', fontSize:10, fontWeight:600 }}>C</div>
            <div style={{ fontSize:12, fontWeight:500 }}>Cadran HQ</div>
            <IcChevronDown size={12} color={C.muted} style={{ marginLeft:'auto' }}/>
          </div>
          <div>
            <div className="mono" style={{ fontSize:10, color:C.muted, letterSpacing:'0.08em', padding:'0 8px 6px' }}>WORKSPACE</div>
            {[
              { ic: <IcLayers size={14}/>, t:'Dashboards', n:'3' },
              { ic: <IcDatabase size={14}/>, t:'Sources', n:'1', active:true },
              { ic: <IcInbox size={14}/>, t:'Ad-hoc', n:'' },
              { ic: <IcUsers size={14}/>, t:'Team', n:'1' },
              { ic: <IcSettings size={14}/>, t:'Settings', n:'' },
            ].map((it,i)=>(
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:6,
                background: it.active ? (dark?'#1f242e':'#eef0f4') : 'transparent',
                color: it.active ? C.ink : C.ink2, fontSize:12.5, fontWeight: it.active?500:400,
              }}>
                <span style={{ color: it.active ? accent : C.muted }}>{it.ic}</span>
                <span>{it.t}</span>
                {it.n && <span className="mono tnum" style={{ marginLeft:'auto', fontSize:10, color:C.muted }}>{it.n}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* main */}
        <div style={{ flex:1, padding:'18px 24px', overflow:'hidden', display:'flex', flexDirection:'column', minWidth:0 }}>
          <div className="mono" style={{ fontSize:10, color:C.muted, letterSpacing:'0.08em', marginBottom:4 }}>WORKSPACE / DASHBOARD</div>
          <div style={{ display:'flex', alignItems:'baseline', gap:14, marginBottom:18 }}>
            <h1 style={{ margin:0, fontSize:22, fontWeight:600, letterSpacing:'-0.015em', color:C.ink }}>Cadran HQ</h1>
            <div className="mono" style={{ fontSize:11, color:C.muted }}>untitled board · auto-saved 2s ago</div>
          </div>

          {/* preview grid */}
          <div style={{ display:'flex', flexDirection:'column', gap:14, position:'relative' }}>
            {/* placeholder headline bar */}
            <div style={{
              padding:'14px 18px', background:C.previewTint, border:`1px dashed ${C.line2}`, borderRadius:8,
              display:'flex', alignItems:'center', gap:14
            }}>
              <div className="mono" style={{ fontSize:10, color:C.muted, letterSpacing:'0.08em' }}>HEADLINE</div>
              <div style={{ height:8, background:C.line, borderRadius:2, flex:1, maxWidth:280 }}/>
              <div style={{ height:24, width:80 }}>
                <Sparkline data={[3,5,4,6,7,6,8,9,8,10]} w={80} h={24} color={C.previewInk} fill={false}/>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10 }}>
              <Widget title="MRR" value="€48.2k" delta="+12.4%"/>
              <Widget title="New customers" value="38" delta="+6"/>
              <Widget title="Churn" value="2.1%" delta="−0.4%"/>
              <Widget title="NPS" value="62" delta="+3"/>
            </div>

            <div style={{
              background:C.previewTint, border:`1px solid ${C.line}`, borderRadius:8, padding:'14px 16px'
            }}>
              <div className="mono" style={{ fontSize:10, color:C.muted, letterSpacing:'0.08em', marginBottom:8 }}>REVENUE · 30D</div>
              <Sparkline data={[12,15,14,18,17,20,22,20,24,26,25,28,30,29,32]} w={760} h={56} color={C.previewInk}/>
            </div>

            {/* preview banner — pulled to bottom of preview region */}
            <div style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'8px 14px', background:C.card, border:`1px solid ${C.line2}`, borderRadius:999,
              alignSelf:'center', marginTop:4
            }}>
              <span className="mono" style={{ fontSize:10, color:accent, letterSpacing:'0.1em', fontWeight:600 }}>PREVIEW</span>
              <span style={{ width:1, height:10, background:C.line2 }}/>
              <span style={{ fontSize:12, color:C.ink2 }}>Connect a second source to bring this to life.</span>
            </div>
          </div>
        </div>

        {/* setup panel */}
        <div style={{
          width:296, flexShrink:0, background:C.panel, borderLeft:`1px solid ${C.panelBorder}`,
          padding:'18px 18px 22px', display:'flex', flexDirection:'column', gap:14
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <div style={{ fontSize:14, fontWeight:600, letterSpacing:'-0.01em', color:C.ink }}>Setup</div>
            <div className="mono tnum" style={{ fontSize:11, color:C.ink2 }}>2 / 5</div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <svg width="44" height="44" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="18" fill="none" stroke={C.line2} strokeWidth="3"/>
              <circle cx="22" cy="22" r="18" fill="none" stroke={accent} strokeWidth="3"
                strokeDasharray={`${(2/5)*113} 113`} strokeLinecap="round"
                transform="rotate(-90 22 22)"/>
              <text x="22" y="26" textAnchor="middle" fontFamily='"JetBrains Mono",monospace' fontSize="10.5" fontWeight="600" fill={C.ink}>40%</text>
            </svg>
            <div>
              <div className="mono tnum" style={{ fontSize:12, color:C.ink }}>~6 min remaining</div>
              <div className="mono" style={{ fontSize:10, color:C.ink2, marginTop:2, letterSpacing:'0.04em' }}>then your CEO can take over</div>
            </div>
          </div>

          <div style={{ height:1, background:C.line2, margin:'2px 0' }}/>

          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            <Item state="done" title="Create workspace" sub="Cadran HQ"/>
            <Item state="done" title="Connect first source" sub="Supabase · production"/>
            <Item state="active" title="Add a second source" sub="Stripe recommended → boards unlock revenue"/>
            <Item state="todo" title="Invite your CEO + heads" sub="0 / 4 invited"/>
            <Item state="dim" title="Pin first widgets" sub="Marc (CEO) will do this"/>
          </div>

          <div style={{ marginTop:'auto', display:'flex', flexDirection:'column', gap:8 }}>
            <button style={{
              width:'100%', padding:'10px 12px', background:accent, color:'#fff',
              border:'none', borderRadius:7, fontSize:13, fontWeight:500, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              fontFamily:'inherit'
            }}>
              Connect Stripe <IcArrowUpRight size={14}/>
            </button>
            <button style={{
              padding:'8px 12px', background:'transparent', color:C.ink2, border:`1px solid ${C.line2}`,
              borderRadius:7, fontSize:12, cursor:'pointer', fontFamily:'inherit'
            }}>Skip & explore an empty board</button>
          </div>
        </div>

        <Anno show={anno} n={1} x={20} y={70} side="right">Sidebar · workspace shell</Anno>
        <Anno show={anno} n={2} x={300} y={150} side="right">Tinted preview · readable, not muddy</Anno>
        <Anno show={anno} n={3} x={680} y={70} side="left">Persistent Setup panel</Anno>
        <Anno show={anno} n={4} x={680} y={310} side="left">Active step framed in accent</Anno>
      </div>
    </BrowserFrame>
  );
}

window.Screen01Onboarding = Screen01Onboarding;
