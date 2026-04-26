import { formatCompactCents, formatDeltaPct } from "@/lib/format/cents";
import type { CountryRanking } from "@/lib/queries/commerce";

const COUNTRY_FLAGS: Record<string, string> = {
  FR: "🇫🇷",
  DE: "🇩🇪",
  US: "🇺🇸",
  IT: "🇮🇹",
  ES: "🇪🇸",
  BE: "🇧🇪",
};

const COUNTRY_LABELS: Record<string, string> = {
  FR: "France",
  DE: "Allemagne",
  US: "États-Unis",
  IT: "Italie",
  ES: "Espagne",
  BE: "Belgique",
};

export function Ranking({ data }: { data: CountryRanking[] }) {
  const max = Math.max(...data.map((c) => c.revenueCents), 1);

  return (
    <div className="w">
      <div className="w-head">
        <div>
          <div className="w-title" style={{ fontSize: 15, color: "var(--ink)" }}>
            Top pays
          </div>
          <div className="muted mt-1">Revenu mois courant</div>
        </div>
      </div>
      {data.length === 0 ? (
        <div className="py-8 text-center text-sm text-[var(--ink-3)]">
          Aucune vente ce mois
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((c) => {
            const width = (c.revenueCents / max) * 100;
            const isPositive = c.deltaPct >= 0;
            return (
              <div key={c.country} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="grid h-[22px] w-[22px] place-items-center rounded-md text-[14px]"
                      style={{ background: "var(--surface-2)" }}
                      aria-hidden
                    >
                      {COUNTRY_FLAGS[c.country] ?? "🏳"}
                    </span>
                    <span className="text-[var(--ink-2)]">
                      {COUNTRY_LABELS[c.country] ?? c.country}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span
                      className="text-[var(--ink)]"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatCompactCents(c.revenueCents)} €
                    </span>
                    {c.deltaPct !== 0 ? (
                      <span
                        className={`text-[10px] font-semibold ${isPositive ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {formatDeltaPct(c.deltaPct)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full"
                  style={{ background: "var(--surface-2)" }}
                >
                  <div
                    className="h-full transition-[width] duration-1000 ease-out"
                    style={{
                      width: `${width}%`,
                      background:
                        "linear-gradient(90deg, var(--accent), var(--accent-3))",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
