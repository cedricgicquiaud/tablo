import { readTweaks, setMode, setPalette, setRadius } from "@/lib/ui/tweaks";
import {
  PALETTE_LABELS,
  PALETTES,
  RADII,
  type Palette,
  type Radius,
} from "@/lib/ui/tweaks-types";

export async function TweaksToggle({ compact = false }: { compact?: boolean }) {
  const { mode, palette, radius } = await readTweaks();

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">
          Apparence
        </div>
        <form
          action={async () => {
            "use server";
            await setMode(mode === "light" ? "dark" : "light");
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm text-[var(--ink-2)] hover:bg-[var(--surface-3)]"
          >
            <span>Mode</span>
            <span className="text-[11px]">
              {mode === "light" ? "☀ Light" : "🌙 Dark"}
            </span>
          </button>
        </form>
        <div className="grid grid-cols-5 gap-1">
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
                aria-label={PALETTE_LABELS[p]}
                title={PALETTE_LABELS[p]}
                className={`h-6 w-full rounded-sm border transition-all ${
                  palette === p
                    ? "border-[var(--accent)] ring-2 ring-[color-mix(in_oklab,var(--accent)_40%,transparent)]"
                    : "border-[var(--line)] hover:border-[var(--ink-3)]"
                }`}
                style={{
                  background:
                    p === "terracotta"
                      ? "oklch(0.62 0.07 38)"
                      : p === "editorial"
                        ? "oklch(0.50 0.18 27)"
                        : p === "forest"
                          ? "oklch(0.45 0.10 155)"
                          : p === "midnight"
                            ? "oklch(0.55 0.16 250)"
                            : "oklch(0.58 0.22 340)",
                }}
              />
            </form>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-md border border-[var(--line)] p-1">
          {RADII.map((r: Radius) => (
            <form
              key={r}
              action={async () => {
                "use server";
                await setRadius(r);
              }}
              className="flex-1"
            >
              <button
                type="submit"
                aria-pressed={radius === r}
                className={`w-full rounded-sm py-1 text-[10px] capitalize transition-colors ${
                  radius === r
                    ? "bg-[var(--accent)] text-[var(--bg)]"
                    : "text-[var(--ink-3)] hover:bg-[var(--surface-3)]"
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
