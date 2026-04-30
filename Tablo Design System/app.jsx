// Tablo · root app · canvas + tweaks · 5 screens × 4 themes matrix
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "darkMode": false,
  "annotations": false,
  "activeTheme": "steel"
}/*EDITMODE-END*/;

const THEME_LIST = [
  { id:'steel',    label:'A · Steel',    sub:'current — single steel-blue accent' },
  { id:'spectrum', label:'B · Spectrum', sub:'indigo + coral + amber + teal' },
  { id:'sunset',   label:'C · Sunset',   sub:'terracotta + plum + gold' },
  { id:'citrus',   label:'D · Citrus',   sub:'mint + coral + lemon' },
];

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const dark = tweaks.darkMode;
  const anno = tweaks.annotations;
  const props = (theme) => ({ dark, annotations: anno, theme });

  return (
    <>
      <DesignCanvas>
        {/* 01 · Onboarding — 4 themes */}
        <DCSection id="onboarding" title="01 · Ops onboarding" subtitle="Half-populated workspace · persistent Setup panel · 4 color directions">
          {THEME_LIST.map(th => (
            <DCArtboard key={th.id} id={`onb-${th.id}`} label={`${th.label} — ${th.sub}`} width={1200} height={760}>
              <Screen01Onboarding {...props(th.id)}/>
            </DCArtboard>
          ))}
        </DCSection>

        {/* 02 · Connect */}
        <DCSection id="connect" title="02 · Sources" subtitle="OAuth · authorize → pick datasets → review">
          {THEME_LIST.map(th => (
            <DCArtboard key={th.id} id={`connect-${th.id}`} label={`${th.label} — ${th.sub}`} width={1200} height={760}>
              <Screen02Connect {...props(th.id)}/>
            </DCArtboard>
          ))}
        </DCSection>

        {/* 03 · Dashboard */}
        <DCSection id="dashboard" title="03 · Executive dashboard" subtitle="Headline · Numbers · Trends · Top movers">
          {THEME_LIST.map(th => (
            <DCArtboard key={th.id} id={`dash-${th.id}`} label={`${th.label} — ${th.sub}`} width={1280} height={920}>
              <Screen03Dashboard {...props(th.id)}/>
            </DCArtboard>
          ))}
        </DCSection>

        {/* 04 · Chat */}
        <DCSection id="chat" title="04 · Ad-hoc query" subtitle="Persistent thread · pin / share / SQL · voice">
          {THEME_LIST.map(th => (
            <DCArtboard key={th.id} id={`chat-${th.id}`} label={`${th.label} — ${th.sub}`} width={1200} height={760}>
              <Screen04Chat {...props(th.id)}/>
            </DCArtboard>
          ))}
        </DCSection>

        {/* 05 · Mobile */}
        <DCSection id="mobile" title="05 · Mobile" subtitle="Stacked feed · sticky ask bar">
          {THEME_LIST.map(th => (
            <DCArtboard key={th.id} id={`mob-${th.id}`} label={`${th.label} — ${th.sub}`} width={520} height={820}>
              <Screen05Mobile {...props(th.id)}/>
            </DCArtboard>
          ))}
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Display">
          <TweakToggle label="Dark mode"
            value={tweaks.darkMode}
            onChange={(v) => setTweak('darkMode', v)}
            hint="Switch every screen to the terminal/voice variant"/>
          <TweakToggle label="Show annotations"
            value={tweaks.annotations}
            onChange={(v) => setTweak('annotations', v)}
            hint="Numbered design notes overlay"/>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
