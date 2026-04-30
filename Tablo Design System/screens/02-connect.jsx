// Screen 2 · Sources — OAuth modal "Connect Stripe"
function Screen02Connect({ dark, annotations: anno, theme='steel' }) {
  const T = (window.THEMES && window.THEMES[theme]) || window.THEMES.steel;
  const C = dark ? {
    bg:'#0e1116', card:'#151921', sub:'#181c25', line:'#23283340', line2:'#2a303d',
    ink:'#e7eaf0', ink2:'#a5acba', muted:'#6b7280',
    overlay:'rgba(8,10,15,0.55)'
  } : {
    bg:'#fbfbfc', card:'#ffffff', sub:'#f4f5f8', line:'#e4e7ec', line2:'#d6dae1',
    ink:'#0e1116', ink2:'#2a2f3a', muted:'#6b7280',
    overlay:'rgba(14,17,22,0.32)'
  };
  const accent = T.accent;
  const accentSoft = dark ? T.accentSoftD : T.accentSoftL;
  const accentBorder = dark ? T.accentBorderD : T.accentBorderL;

  // Datasets with checked state
  const [picked, setPicked] = React.useState({
    charges: true, customers: true, subscriptions: true,
    invoices: false, disputes: false, payouts: false, refunds: false
  });
  const datasets = [
    { id:'charges', name:'charges', range:'last 365 days', rows:'18,402 rows', desc:'every successful, failed, refunded charge' },
    { id:'customers', name:'customers', range:'all-time', rows:'2,140 rows', desc:'profile, billing email, default payment method' },
    { id:'subscriptions', name:'subscriptions', range:'all-time', rows:'1,238 rows', desc:'plan, status, MRR contribution' },
    { id:'invoices', name:'invoices', range:'last 90 days', rows:'4,610 rows', desc:'issued, paid, void, uncollectible' },
    { id:'disputes', name:'disputes', range:'all-time', rows:'42 rows', desc:'chargebacks + reasons' },
    { id:'payouts', name:'payouts', range:'last 365 days', rows:'365 rows', desc:'transfers to your bank' },
    { id:'refunds', name:'refunds', range:'last 365 days', rows:'310 rows', desc:'with reason and source charge' },
  ];
  const count = Object.values(picked).filter(Boolean).length;

  // Background page (the Sources settings, blurred)
  const Bg = () => (
    <div style={{
      position:'absolute', inset:0,
      filter:'blur(2px) saturate(0.85)', opacity:0.65, pointerEvents:'none',
      display:'flex', flexDirection:'column'
    }}>
      <div style={{ display:'flex', flex:1 }}>
        {/* sidebar */}
        <div style={{ width:200, borderRight:`1px solid ${C.line}`, padding:'14px 12px', background:C.bg }}>
          <TabloLockup height={16} color={C.ink}/>
          <div style={{ height:14 }}/>
          {['Dashboards','Sources','Ad-hoc','Team','Settings'].map((t,i)=>(
            <div key={i} style={{
              display:'flex', gap:8, alignItems:'center', padding:'7px 8px', borderRadius:6,
              background: t==='Sources' ? (dark?'#1a2030':'#eef0f4') : 'transparent',
              fontSize:12.5, color: t==='Sources' ? C.ink : C.ink2
            }}>
              <div style={{ width:14, height:14, borderRadius:3, background:C.line2 }}/>
              {t}
            </div>
          ))}
        </div>
        <div style={{ flex:1, padding:'18px 24px', background:C.bg }}>
          <div className="mono" style={{ fontSize:10, color:C.muted, letterSpacing:'0.08em' }}>SETTINGS / SOURCES</div>
          <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.01em', marginTop:4, color:C.ink }}>Sources</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:14 }}>
            {[
              { name:'Supabase', tag:'production', n:'12 tables', live:true },
              { name:'Stripe',   tag:'live',       n:'connecting…',     live:false },
              { name:'Notion',   tag:'workspace',  n:'',                live:false },
              { name:'Google Sheets', tag:'',      n:'',                live:false },
            ].map((s,i)=>(
              <div key={i} style={{
                padding:'12px 14px', background:C.card, border:`1px solid ${C.line}`, borderRadius:8,
                display:'flex', alignItems:'center', gap:12
              }}>
                <SourceMark name={s.name.toLowerCase().split(' ').join('')==='googlesheets'?'gsheets':s.name.toLowerCase()} size={26}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{s.name} <span className="mono" style={{ color:C.muted, fontSize:11, fontWeight:400, marginLeft:6 }}>{s.tag}</span></div>
                  <div className="mono" style={{ fontSize:11, color:C.muted, marginTop:2 }}>{s.n}</div>
                </div>
                <div style={{
                  width:7, height:7, borderRadius:'50%',
                  background: s.live ? '#1a7f46' : C.line2,
                  boxShadow: s.live ? '0 0 0 3px rgba(26,127,70,0.18)' : 'none'
                }}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const ProgressDots = () => (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      {['authorize','select datasets','review'].map((label,i)=>{
        const done = i < 1, active = i === 1;
        return (
          <React.Fragment key={i}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{
                width:18, height:18, borderRadius:'50%', display:'grid', placeItems:'center', flexShrink:0,
                background: done ? accent : (active ? '#fff' : 'transparent'),
                border: done ? 'none' : `1.5px solid ${active ? accent : C.line2}`,
                color:'#fff'
              }}>
                {done && <IcCheck size={11} color="#fff"/>}
                {active && <div style={{ width:6, height:6, borderRadius:'50%', background:accent }}/>}
              </div>
              <div className="mono" style={{
                fontSize:11, letterSpacing:'0.02em',
                color: active ? C.ink : (done ? C.ink2 : C.muted),
                fontWeight: active ? 600 : 400
              }}>{i+1 < 10 ? `0${i+1}` : i+1} · {label}</div>
            </div>
            {i < 2 && <div style={{ flex:1, height:1, background: i < 1 ? accent : C.line2, margin:'0 4px' }}/>}
          </React.Fragment>
        );
      })}
    </div>
  );

  const Row = ({ d }) => {
    const checked = picked[d.id];
    return (
      <div onClick={() => setPicked(p => ({ ...p, [d.id]: !p[d.id] }))} style={{
        display:'flex', alignItems:'center', gap:12,
        padding:'11px 14px', borderRadius:7, cursor:'pointer',
        background: checked ? accentSoft : C.card,
        border: checked ? `1px solid ${accentBorder}` : `1px solid ${C.line}`,
      }}>
        <div style={{
          width:16, height:16, borderRadius:4, flexShrink:0,
          background: checked ? accent : 'transparent',
          border: checked ? 'none' : `1.5px solid ${C.line2}`,
          display:'grid', placeItems:'center'
        }}>
          {checked && <IcCheck size={11} color="#fff"/>}
        </div>
        <div className="mono" style={{ fontSize:12, fontWeight:600, color:C.ink, minWidth:120 }}>{d.name}</div>
        <div style={{ fontSize:11.5, color:C.muted, flex:1 }}>{d.desc}</div>
        <div className="mono tnum" style={{ fontSize:11, color:C.ink2, minWidth:90, textAlign:'right' }}>{d.rows}</div>
        <div className="mono" style={{ fontSize:11, color:C.muted, minWidth:100, textAlign:'right' }}>{d.range}</div>
        <IcChevronRight size={13} color={C.muted}/>
      </div>
    );
  };

  return (
    <BrowserFrame url="tablo.app/cadran-hq/settings/sources/connect" dark={dark}>
      <div style={{
        position:'relative', width:'100%', height:'100%', background:C.bg, color:C.ink,
        fontFamily:'"Inter Tight", sans-serif', overflow:'hidden'
      }}>
        <Bg/>
        {/* overlay */}
        <div style={{
          position:'absolute', inset:0, background:C.overlay, display:'grid', placeItems:'center',
          padding:24
        }}>
          <div style={{
            width:680, maxWidth:'100%',
            background:C.card, border:`1px solid ${C.line}`, borderRadius:12,
            boxShadow:'0 12px 40px rgba(14,17,22,0.18), 0 2px 6px rgba(14,17,22,0.06)',
            overflow:'hidden', display:'flex', flexDirection:'column'
          }}>
            {/* header */}
            <div style={{
              padding:'18px 22px 14px', display:'flex', alignItems:'center', gap:14,
              borderBottom:`1px solid ${C.line}`
            }}>
              <SourceMark name="stripe" size={36}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:600, letterSpacing:'-0.01em' }}>Connect Stripe</div>
                <div className="mono" style={{ fontSize:11, color:C.muted, marginTop:3 }}>acct_1Q… · live mode · marc@cadran.fr</div>
              </div>
              <button style={{
                width:28, height:28, borderRadius:6, background:'transparent', border:`1px solid ${C.line}`,
                display:'grid', placeItems:'center', cursor:'pointer', color:C.muted
              }}><IcX size={14}/></button>
            </div>

            {/* progress */}
            <div style={{ padding:'14px 22px', borderBottom:`1px solid ${C.line}` }}>
              <ProgressDots/>
            </div>

            {/* body */}
            <div style={{ padding:'18px 22px 8px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div className="mono" style={{ fontSize:11, color:C.muted, letterSpacing:'0.08em' }}>SELECT DATASETS TO SYNC</div>
                <div className="mono tnum" style={{ fontSize:11, color:C.ink2 }}>{count} of {datasets.length} selected</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:300, overflow:'auto', paddingRight:2 }}>
                {datasets.map(d => <Row key={d.id} d={d}/>)}
              </div>
            </div>

            {/* read-only note */}
            <div style={{ margin:'10px 22px 0', padding:'10px 12px', background:C.sub, border:`1px solid ${C.line}`, borderRadius:7, display:'flex', alignItems:'flex-start', gap:10 }}>
              <IcLock size={14} color={C.muted} style={{ marginTop:1 }}/>
              <div>
                <div style={{ fontSize:12, fontWeight:500 }}>Read-only access</div>
                <div className="mono" style={{ fontSize:11, color:C.muted, marginTop:2 }}>Tablo can read these datasets. It cannot create, refund or modify anything in your Stripe account.</div>
              </div>
            </div>

            {/* footer */}
            <div style={{
              marginTop:14, padding:'14px 22px', borderTop:`1px solid ${C.line}`,
              display:'flex', alignItems:'center', gap:10, background:C.sub
            }}>
              <div className="mono" style={{ fontSize:11, color:C.muted }}>Step 02 / 03</div>
              <div style={{ flex:1 }}/>
              <button style={{
                padding:'8px 14px', background:'transparent', color:C.ink2, border:`1px solid ${C.line2}`,
                borderRadius:7, fontSize:12.5, cursor:'pointer', fontFamily:'inherit'
              }}>Back</button>
              <button style={{
                padding:'8px 14px', background:accent, color:'#fff', border:'none',
                borderRadius:7, fontSize:12.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit',
                display:'flex', alignItems:'center', gap:8
              }}>
                Sync {count} dataset{count===1?'':'s'} <IcArrowUpRight size={13}/>
              </button>
            </div>
          </div>
        </div>

        {/* annos */}
        <Anno show={anno} n={1} x={120} y={120} side="right">Settings page · blurred</Anno>
        <Anno show={anno} n={2} x={520} y={92} side="left">3-step OAuth · stepper</Anno>
        <Anno show={anno} n={3} x={520} y={210} side="left">Time range per dataset</Anno>
        <Anno show={anno} n={4} x={520} y={420} side="left">Read-only reassurance</Anno>
      </div>
    </BrowserFrame>
  );
}

window.Screen02Connect = Screen02Connect;
