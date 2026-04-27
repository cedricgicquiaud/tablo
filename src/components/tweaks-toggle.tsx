import { readTweaks, setMode, setPalette, setRadius } from "@/lib/ui/tweaks";
import {
  PALETTE_LABELS,
  PALETTES,
  RADII,
  type Palette,
  type Radius,
} from "@/lib/ui/tweaks-types";

export async function TweaksToggle() {
  const { mode, palette, radius } = await readTweaks();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        action={async () => {
          "use server";
          await setMode(mode === "light" ? "dark" : "light");
        }}
      >
        <button
          type="submit"
          className="rounded-[var(--radius-tag-sm)] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--ink-2)] hover:bg-[var(--surface-3)]"
          aria-label="Toggle mode"
        >
          {mode === "light" ? "🌙 Dark" : "☀ Light"}
        </button>
      </form>

      <div className="flex overflow-hidden rounded-[var(--radius-tag-sm)] border border-[var(--line)]">
        {PALETTES.map((p: Palette) => (
          <form
            key={p}
            action={async () => {
              "use server";
              await setPalette(p);
            }}
          >
            <button
              type="submit"
              aria-pressed={palette === p}
              className={`px-2.5 py-1.5 text-[11px] transition-colors ${
                palette === p
                  ? "bg-[var(--accent)] text-[var(--bg)]"
                  : "bg-[var(--surface-2)] text-[var(--ink-3)] hover:bg-[var(--surface-3)]"
              }`}
            >
              {PALETTE_LABELS[p]}
            </button>
          </form>
        ))}
      </div>

      <div className="flex overflow-hidden rounded-[var(--radius-tag-sm)] border border-[var(--line)]">
        {RADII.map((r: Radius) => (
          <form
            key={r}
            action={async () => {
              "use server";
              await setRadius(r);
            }}
          >
            <button
              type="submit"
              aria-pressed={radius === r}
              className={`px-3 py-1.5 text-xs transition-colors ${
                radius === r
                  ? "bg-[var(--accent)] text-[var(--bg)]"
                  : "bg-[var(--surface-2)] text-[var(--ink-3)] hover:bg-[var(--surface-3)]"
              }`}
            >
              {r}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
