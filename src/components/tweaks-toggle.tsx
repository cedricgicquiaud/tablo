import { readTweaks, setRadius, setTheme } from "@/lib/ui/tweaks";
import { RADII, THEMES } from "@/lib/ui/tweaks-types";

export async function TweaksToggle() {
  const { theme, radius } = await readTweaks();
  return (
    <div className="flex items-center gap-2">
      <form action={async () => {
        "use server";
        await setTheme(theme === "light" ? "dark" : "light");
      }}>
        <button
          type="submit"
          className="rounded-[var(--radius-tag-sm)] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--ink-2)] hover:bg-[var(--surface-3)]"
          aria-label="Toggle theme"
        >
          {theme === "light" ? "🌙 Dark" : "☀ Light"}
        </button>
      </form>
      <div className="flex overflow-hidden rounded-[var(--radius-tag-sm)] border border-[var(--line)]">
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
              aria-pressed={radius === r}
              className={`px-3 py-1.5 text-xs transition-colors ${
                radius === r
                  ? "bg-[var(--accent)] text-[oklch(0.99_0.001_106.4231)]"
                  : "bg-[var(--surface-2)] text-[var(--ink-3)] hover:bg-[var(--surface-3)]"
              }`}
            >
              {r}
            </button>
          </form>
        ))}
      </div>
      <span className="sr-only" aria-live="polite">
        Theme {theme}, radius {radius}, available themes {THEMES.join(", ")}
      </span>
    </div>
  );
}
