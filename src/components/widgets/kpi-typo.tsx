import { formatCompactCents, formatDeltaPct } from "@/lib/format/cents";
import type { BasketKpi } from "@/lib/queries/commerce";
import { Icon } from "./icon";

export function KpiTypo({ data }: { data: BasketKpi }) {
  const dark = "oklch(0.18 0 0)";
  const light = "oklch(0.97 0 0)";
  const isPositive = data.deltaPct >= 0;
  return (
    <div
      className="w"
      style={{
        minHeight: 160,
        background: dark,
        color: light,
        borderColor: dark,
      }}
    >
      <div className="w-head">
        <div
          className="w-title"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          <span
            className="w-icon"
            style={{
              background: "rgba(255,255,255,0.1)",
              color: light,
            }}
          >
            <Icon name="cart" size={13} />
          </span>
          Panier moyen
        </div>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>NOW</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 56,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            color: light,
          }}
        >
          {formatCompactCents(data.avgCents)}
        </span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: 22,
            color: "var(--accent)",
          }}
        >
          €
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          vs mois dernier
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: isPositive ? "oklch(0.78 0.19 143)" : "oklch(0.72 0.20 25)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatDeltaPct(data.deltaPct)}
        </span>
      </div>
    </div>
  );
}
