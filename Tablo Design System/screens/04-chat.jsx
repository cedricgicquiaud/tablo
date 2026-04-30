// Screen 4 · Ad-hoc query — side panel chat persistent
function Screen04Chat({ dark, annotations: anno, theme='steel' }) {
  const T = (window.THEMES && window.THEMES[theme]) || window.THEMES.steel;
  const C = dark ? {
    bg:'#0e1116', card:'#151921', sub:'#181c25', line:'#23283340', line2:'#2a303d',
    ink:'#e7eaf0', ink2:'#a5acba', muted:'#6b7280',
    chatBg:'#0e1116', chatPanel:'#151921'
  } : {
    bg:'#fbfbfc', card:'#ffffff', sub:'#f4f5f8', line:'#e4e7ec', line2:'#d6dae1',
    ink:'#0e1116', ink2:'#2a2f3a', muted:'#6b7280',
    chatBg:'#f4f5f8', chatPanel:'#fff'
  };
  const accent = T.accent;
  const accentSoft = dark ? T.accentSoftD : T.accentSoftL;
  const accentBorder = dark ? T.accentBorderD : T.accentBorderL;

  const KPI = ({ label, value, delta, accentVal=false }) => (
    <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:8, padding:'12px 14px' }}>
      <div className="mono" style={{ fontSize:9.5, color:C.muted, letterSpacing:'0.1em', textTransform:'uppercase' }}>{label}</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:8, marginTop:6 }}>
        <div className="tnum" style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.02em', color: accentVal ? accent : C.ink }}>{value}</div>
        <div className="mono tnum" style={{ fontSize:10.5, color:accent }}>{delta}</div>
      </div>
    </div>
  );

  // bubble for user
  const UserBubble = ({ children }) => (
    <div style={{ display:'flex', justifyContent:'flex-end' }}>
      <div style={{
        background: C.ink, color: dark ? '#0e1116':'#fff',
        padding:'9px 13px', borderRadius:'10px 10px 2px 10px',
        fontSize:12.5, maxWidth:'85%'
      }}>{children}</div>
    </div>
  );

  return (
    <BrowserFrame url="tablo.app/tablo-hq/ceo-daily" dark={dark}>
      <div style={{ display:'flex', height:'100%', background:C.bg, color:C.ink, fontFamily:'"Inter Tight", sans-serif', position:'relative' }}>
        {/* left dashboard */}
        <div style={{ flex:1, padding:'18px 24px', overflow:'auto', minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
            <TabloMark size={24} live/>
            <div>
              <div style={{ fontSize:14, fontWeight:600 }}>CEO daily</div>
              <div className="mono" style={{ fontSize:10.5, color:C.muted }}>Apr 30 · live · 2 sources</div>
            </div>
            <div style={{ flex:1 }}/>
            <div className="mono" style={{ fontSize:10.5, padding:'4px 8px', border:`1px solid ${C.line}`, borderRadius:4, color:C.ink2 }}>Apr 30</div>
          </div>

          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
            <KPI label="MRR" value="€48,210" delta="+12.4%" accentVal/>
            <KPI label="New customers" value="38" delta="+6"/>
            <KPI label="Churn" value="2.1%" delta="−0.4%"/>
          </div>

          {/* big chart */}
          <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:8, padding:'14px 16px', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:10 }}>
              <div className="mono" style={{ fontSize:10, color:C.muted, letterSpacing:'0.1em' }}>REVENUE · 30D</div>
              <div className="mono tnum" style={{ fontSize:10.5, color:C.ink2 }}>€1.46M total</div>
              <div style={{ flex:1 }}/>
              <IcMore size={14} color={C.muted}/>
            </div>
            <Sparkline data={[18,20,19,22,21,23,24,23,26,25,27,29,28,31,30,32,31,33,35,34,36,38,37,40,39,41,40,42,44,46]} w={520} h={86} color={accent}/>
          </div>

          {/* fresh widget — dashed steel-blue border */}
          <div style={{
            background: C.card,
            border: `1.5px dashed ${accent}`, borderRadius:8, padding:'14px 16px',
            position:'relative'
          }}>
            <div style={{
              position:'absolute', top:-9, left:14, padding:'2px 8px',
              background:accent, color:'#fff', borderRadius:4,
              fontFamily:'"JetBrains Mono", monospace', fontSize:9.5, letterSpacing:'0.08em', fontWeight:600
            }}>JUST GENERATED</div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div className="mono" style={{ fontSize:10, color:C.muted, letterSpacing:'0.1em' }}>TOP 5 CUSTOMERS · THIS QUARTER</div>
              <div style={{ flex:1 }}/>
              <button style={{
                display:'flex', alignItems:'center', gap:5, padding:'3px 8px', background:accentSoft,
                border:`1px solid ${accentBorder}`, borderRadius:4, color:accent,
                fontSize:10.5, fontFamily:'inherit', cursor:'pointer'
              }}><IcPin size={10}/> Pin</button>
              <IcMore size={14} color={C.muted}/>
            </div>
            {[
              { n:'Acme Corp',     v:'€38,200' },
              { n:'Lumen Studio',  v:'€24,840' },
              { n:'Voltaic',       v:'€19,520' },
              { n:'Petit Atelier', v:'€11,640' },
              { n:'Mistral SARL',  v:'€8,900'  },
            ].map((r,i,arr)=>(
              <div key={i} style={{
                display:'flex', alignItems:'center', padding:'7px 0',
                borderBottom: i<arr.length-1 ? `1px dashed ${C.line}` : 'none'
              }}>
                <div className="mono tnum" style={{ fontSize:10.5, color:C.muted, width:24 }}>0{i+1}</div>
                <div style={{ flex:1, fontSize:12.5, color:C.ink }}>{r.n}</div>
                <div style={{ width:120, marginRight:14 }}>
                  <Sparkline data={[1,2,2,3,3,4,5].map(x => x + (5-i))} w={120} h={14} color={accent} fill={false} strokeW={1.2}/>
                </div>
                <div className="mono tnum" style={{ fontSize:12.5, fontWeight:500, color:C.ink }}>{r.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* right chat panel */}
        <div style={{
          width:344, flexShrink:0, background:C.chatPanel, borderLeft:`1px solid ${C.line}`,
          display:'flex', flexDirection:'column', minHeight:0
        }}>
          {/* chat header */}
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.line}`, display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:24, height:24, borderRadius:'50%', background:accent,
              display:'grid', placeItems:'center'
            }}><IcSparkles size={13} color="#fff"/></div>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>Ask Tablo</div>
              <div className="mono" style={{ fontSize:10, color:C.muted }}>thread · 4 messages</div>
            </div>
            <div style={{ flex:1 }}/>
            <IcMore size={15} color={C.muted}/>
          </div>

          {/* thread */}
          <div style={{ flex:1, overflow:'auto', padding:'14px 14px 8px', display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ flex:1, height:1, background:C.line }}/>
              <div className="mono" style={{ fontSize:10, color:C.muted, letterSpacing:'0.08em' }}>TODAY · 8:42</div>
              <div style={{ flex:1, height:1, background:C.line }}/>
            </div>

            <UserBubble>top 5 customers by revenue this quarter</UserBubble>

            {/* assistant reply with widget preview */}
            <div style={{
              background:C.bg, border:`1px solid ${C.line}`, borderRadius:'10px 10px 10px 2px',
              padding:'10px 12px', maxWidth:'92%'
            }}>
              <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:6 }}>
                <IcSparkles size={11} color={accent}/>
                <span className="mono" style={{ fontSize:9.5, color:C.muted, letterSpacing:'0.06em' }}>TABLO · 1.2s · 8 rows scanned</span>
              </div>
              <div style={{ fontSize:12.5, color:C.ink, lineHeight:1.45, marginBottom:10 }}>
                Here's the top 5 by booked revenue this quarter — Acme Corp leads at <span className="mono" style={{ fontWeight:500 }}>€38.2k</span>, well clear of Lumen Studio.
              </div>
              {/* mini preview */}
              <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:6, padding:'8px 10px' }}>
                <div className="mono" style={{ fontSize:9, color:C.muted, letterSpacing:'0.08em', marginBottom:4 }}>PREVIEW</div>
                {['Acme Corp','Lumen Studio','Voltaic'].map((n,i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'3px 0', fontSize:11 }}>
                    <span style={{ flex:1, color:C.ink2 }}>{n}</span>
                    <div style={{ flex:1, height:6, background:C.sub, borderRadius:1, position:'relative' }}>
                      <div style={{ position:'absolute', inset:0, width: `${[100,65,52][i]}%`, background:accent, borderRadius:1 }}/>
                    </div>
                    <span className="mono tnum" style={{ fontSize:10, color:C.ink, fontWeight:500, width:48, textAlign:'right' }}>{['€38.2k','€24.8k','€19.5k'][i]}</span>
                  </div>
                ))}
                <div className="mono" style={{ fontSize:9.5, color:C.muted, marginTop:4 }}>+ 2 more</div>
              </div>
              {/* actions */}
              <div style={{ display:'flex', gap:6, marginTop:10 }}>
                <button style={{
                  display:'flex', alignItems:'center', gap:4, padding:'4px 8px',
                  background:accent, color:'#fff', border:'none', borderRadius:4,
                  fontSize:10.5, fontFamily:'inherit', cursor:'pointer', fontWeight:500
                }}><IcPin size={10}/> Pin to dashboard</button>
                <button style={{
                  display:'flex', alignItems:'center', gap:4, padding:'4px 8px',
                  background:'transparent', color:C.ink2, border:`1px solid ${C.line2}`, borderRadius:4,
                  fontSize:10.5, fontFamily:'inherit', cursor:'pointer'
                }}><IcShare size={10}/> Share</button>
                <button style={{
                  display:'flex', alignItems:'center', gap:4, padding:'4px 8px',
                  background:'transparent', color:C.ink2, border:`1px solid ${C.line2}`, borderRadius:4,
                  fontSize:10.5, fontFamily:'inherit', cursor:'pointer'
                }}><IcCode size={10}/> SQL</button>
              </div>
            </div>

            {/* voice user message */}
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <div style={{
                background: C.ink, color: dark ? '#0e1116':'#fff',
                padding:'8px 12px', borderRadius:'10px 10px 2px 10px',
                display:'flex', alignItems:'center', gap:8, maxWidth:'85%'
              }}>
                <IcMic size={11} color={accent}/>
                {/* waveform */}
                <div style={{ display:'flex', alignItems:'center', gap:1.5, height:18 }}>
                  {[5,8,12,7,14,10,16,9,12,7,11,14,8,10,6,12,9,5,11,7,4].map((h,i)=>(
                    <div key={i} style={{
                      width:1.5, height:h, borderRadius:1,
                      background: i < 14 ? accent : (dark?'#3a4150':'#5a6678')
                    }}/>
                  ))}
                </div>
                <span className="mono tnum" style={{ fontSize:10, color: dark?'#5a6678':'#9aa1ad' }}>0:04</span>
              </div>
            </div>
            <div style={{ alignSelf:'flex-end', maxWidth:'85%' }}>
              <div style={{ fontSize:11.5, color:C.muted, fontStyle:'italic', textAlign:'right' }}>
                "and break it down by country"
              </div>
            </div>

            {/* typing reply */}
            <div style={{
              display:'flex', alignItems:'center', gap:6, padding:'7px 10px',
              background:C.bg, border:`1px solid ${C.line}`, borderRadius:'10px 10px 10px 2px',
              alignSelf:'flex-start'
            }}>
              <IcSparkles size={11} color={accent}/>
              <div style={{ display:'flex', gap:3 }}>
                {[0,1,2].map(i=>(
                  <div key={i} style={{
                    width:5, height:5, borderRadius:'50%', background:C.muted,
                    opacity:[0.3,0.6,0.9][i]
                  }}/>
                ))}
              </div>
              <span className="mono" style={{ fontSize:10, color:C.muted }}>tablo is querying…</span>
            </div>
          </div>

          {/* input */}
          <div style={{ borderTop:`1px solid ${C.line}`, padding:'10px 12px 12px' }}>
            {/* context chips */}
            <div style={{ display:'flex', gap:5, marginBottom:8, flexWrap:'wrap' }}>
              {[
                { t:'last 7d', x:true },
                { t:'customers', x:true },
                { t:'EUR', x:true },
              ].map((c,i)=>(
                <div key={i} style={{
                  display:'inline-flex', alignItems:'center', gap:5,
                  padding:'3px 7px', background:C.sub, border:`1px solid ${C.line}`, borderRadius:999,
                  fontSize:10.5, color:C.ink2, fontFamily:'"JetBrains Mono", monospace'
                }}>
                  {c.t} <IcX size={9} color={C.muted}/>
                </div>
              ))}
              <button style={{
                display:'inline-flex', alignItems:'center', gap:4, padding:'3px 7px',
                background:'transparent', border:`1px dashed ${C.line2}`, borderRadius:999,
                fontSize:10.5, color:C.muted, fontFamily:'"JetBrains Mono", monospace', cursor:'pointer'
              }}><IcPlus size={9}/> add context</button>
            </div>
            {/* input row */}
            <div style={{
              display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
              background:C.card, border:`1px solid ${C.line2}`, borderRadius:8
            }}>
              <IcSparkles size={13} color={accent}/>
              <div style={{ flex:1, fontSize:12.5, color:C.muted }}>Ask anything about your data…</div>
              <button style={{
                width:30, height:30, borderRadius:'50%', background:accent, border:'none',
                display:'grid', placeItems:'center', cursor:'pointer',
                boxShadow: '0 0 0 4px rgba(31,95,209,0.12)'
              }}><IcMic size={13} color="#fff"/></button>
            </div>
            <div className="mono" style={{ fontSize:9.5, color:C.muted, marginTop:6, textAlign:'center', letterSpacing:'0.04em' }}>
              ⌘↵ to send · ⌘⇧V for voice
            </div>
          </div>
        </div>

        {/* annos */}
        <Anno show={anno} n={1} x={300} y={310} side="right">Newly generated widget · dashed steel-blue</Anno>
        <Anno show={anno} n={2} x={620} y={210} side="left">Persistent thread · pin / share / SQL</Anno>
        <Anno show={anno} n={3} x={620} y={400} side="left">Voice · waveform + transcript</Anno>
        <Anno show={anno} n={4} x={620} y={560} side="left">Context chips constrain the query</Anno>
      </div>
    </BrowserFrame>
  );
}

window.Screen04Chat = Screen04Chat;
