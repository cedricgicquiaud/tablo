import { setMode, setPalette, setRadius } from "@/lib/ui/tweaks";
import {
  MODES,
  PALETTE_DESCRIPTIONS,
  PALETTE_GROUPS,
  PALETTE_LABELS,
  PALETTE_SWATCH,
  PALETTES,
  RADII,
  type Mode,
  type Palette,
  type Radius,
} from "@/lib/ui/tweaks-types";
import { SectionLabel } from "@/components/section-label";

export function AppearanceForm({
  current,
}: {
  current: { mode: Mode; palette: Palette; radius: Radius };
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* MODE */}
      <SectionLabel label="MODE" right="light · dark" />
      <div className="flex gap-2">
        {MODES.map((m) => (
          <form
            key={m}
            action={async () => {
              "use server";
              await setMode(m);
            }}
          >
            <button
              type="submit"
              aria-pressed={current.mode === m}
              className={`rounded-[var(--radius-md)] border px-4 py-2 text-sm capitalize transition-colors ${
                current.mode === m
                  ? "border-[var(--accent)] bg-[var(--accent-4)] text-[var(--accent-2)]"
                  : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
              }`}
            >
              {m === "light" ? "Light" : "Dark"}
            </button>
          </form>
        ))}
      </div>

      {/* PALETTE */}
      <SectionLabel
        label="PALETTE"
        right={`${PALETTES.length} options · ${current.palette}`}
      />

      <div className="flex flex-col gap-3">
        <PaletteGroup
          title="Tablo Design System"
          palettes={PALETTE_GROUPS.tablo}
          current={current.palette}
        />
        <PaletteGroup
          title="Legacy (template e-commerce)"
          palettes={PALETTE_GROUPS.legacy}
          current={current.palette}
        />
      </div>

      {/* RADIUS */}
      <SectionLabel label="RADIUS" right="sharp · soft · pill" />
      <div className="flex gap-2">
        {RADII.map((r) => (
          <form
            key={r}
            action={async () => {
              "use server";
              await setRadius(r);
            }}
          >
            <button
              type="submit"
              aria-pressed={current.radius === r}
              className={`rounded-[var(--radius-md)] border px-4 py-2 text-sm capitalize transition-colors ${
                current.radius === r
                  ? "border-[var(--accent)] bg-[var(--accent-4)] text-[var(--accent-2)]"
                  : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
              }`}
            >
              {r}
            </button>
          </form>
        ))}
      </div>

      {/* PREVIEW */}
      <SectionLabel label="PREVIEW" right="live · uses your tokens" />
      <PreviewCard />
    </div>
  );
}

function PaletteGroup({
  title,
  palettes,
  current,
}: {
  title: string;
  palettes: Palette[];
  current: Palette;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="font-mono text-[10px] uppercase tracking-[0.08em]"
        style={{ color: "var(--ink-3)" }}
      >
        {title}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {palettes.map((p) => (
          <form
            key={p}
            action={async () => {
              "use server";
              await setPalette(p);
            }}
          >
            <button
              type="submit"
              aria-pressed={current === p}
              className={`group flex w-full flex-col gap-2 rounded-[var(--radius-md)] border p-3 text-left transition-all ${
                current === p
                  ? "border-[var(--accent)] bg-[var(--accent-4)] ring-2 ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]"
                  : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--ink-4)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  aria-hidden
                  className="h-7 w-7 flex-shrink-0 rounded-full ring-1 ring-[var(--line-2)]"
                  style={{ background: PALETTE_SWATCH[p] }}
                />
                <div className="text-sm font-semibold text-[var(--ink)]">
                  {PALETTE_LABELS[p]}
                </div>
              </div>
              <div
                className="font-mono text-[10.5px] leading-snug"
                style={{ color: "var(--ink-3)" }}
              >
                {PALETTE_DESCRIPTIONS[p]}
              </div>
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}

/**
 * Carte preview qui reflète automatiquement les tokens via var(...).
 * Mock KPI : MRR + sparkline + delta chip.
 */
function PreviewCard() {
  const data = [22, 25, 24, 28, 30, 29, 33, 35, 34, 38, 41, 39, 44, 47, 48];
  const w = 360;
  const h = 56;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const xs = (i: number) => (i / (data.length - 1)) * (w - 4) + 2;
  const ys = (v: number) =>
    h - 2 - ((v - min) / (max - min || 1)) * (h - 6);
  const path = data
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xs(i).toFixed(1)} ${ys(v).toFixed(1)}`)
    .join(" ");
  const area = `${path} L ${(w - 2).toFixed(1)} ${h - 1} L 2 ${h - 1} Z`;

  return (
    <div
      className="max-w-[420px] rounded-[var(--radius-lg)] border p-4"
      style={{ background: "var(--surface)", borderColor: "var(--line)" }}
    >
      <div
        className="font-mono text-[10px] uppercase tracking-[0.1em]"
        style={{ color: "var(--ink-3)" }}
      >
        MRR
      </div>
      <div className="mt-2 flex items-baseline gap-3">
        <div
          className="text-[28px] font-semibold leading-none"
          style={{
            color: "var(--accent)",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.02em",
          }}
        >
          €48,210
        </div>
        <span
          className="rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold"
          style={{
            color: "var(--positive)",
            background: "color-mix(in oklab, var(--positive) 14%, transparent)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          +12.4%
        </span>
      </div>
      <svg
        width={w}
        height={h}
        className="mt-3"
        style={{ display: "block", maxWidth: "100%" }}
      >
        <path d={area} fill="var(--accent)" fillOpacity="0.08" />
        <path
          d={path}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.6}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div
        className="mt-2 flex justify-between font-mono text-[10px]"
        style={{ color: "var(--ink-3)" }}
      >
        <span>Apr 1</span>
        <span>Apr 30</span>
      </div>
    </div>
  );
}
