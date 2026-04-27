import { formatCompactCents, formatDeltaPct } from "@/lib/format/cents";
import type { Format, IconName, MetricCardConfig } from "@/lib/ai/widget-schema";
import { Icon } from "./icon";
import { Sparkline } from "./sparkline";

type Preview = {
  value: number;
  delta: number | null;
  sparkline: number[] | null;
};

function formatValueText(value: number, format: Format): string {
  if (format === "currency_eur_compact") return formatCompactCents(value);
  if (format === "percent") return value.toFixed(1).replace(".", ",");
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

export function DynamicMetricCard({
  config,
  preview,
}: {
  config: MetricCardConfig;
  preview: Preview;
}) {
  const isPositive = preview.delta != null && preview.delta >= 0;
  const iconName: IconName = config.icon;
  const isCurrency = config.format === "currency_eur_compact";
  const isPercent = config.format === "percent";

  // Le footer est TOUJOURS rendu pour conserver la hauteur uniforme avec
  // les widgets KPI du design handoff (KpiEditorial W01). Slots vides si
  // pas de delta/sparkline → card reste alignée dans une grille.
  return (
    <div className="w" style={{ minHeight: 160 }}>
      <div className="w-head">
        <div className="w-title">
          <span className="w-icon">
            <Icon name={iconName} size={13} />
          </span>
          {config.title}
        </div>
      </div>

      {/* Valeur principale — layout pixel-perfect KpiEditorial (W01) */}
      <div className="flex items-baseline gap-1 mb-1.5">
        {isCurrency ? (
          <span
            className="text-[var(--ink-3)]"
            style={{ fontFamily: "var(--font-display)", fontSize: 16 }}
          >
            €
          </span>
        ) : null}
        <span className="num-xl">{formatValueText(preview.value, config.format)}</span>
        {isPercent ? (
          <span
            className="text-[var(--ink-3)]"
            style={{ fontFamily: "var(--font-display)", fontSize: 16 }}
          >
            %
          </span>
        ) : null}
      </div>

      {/* Footer : delta-chip + sparkline (slot toujours rendu pour alignement) */}
      <div className="mt-3.5 flex items-center justify-between min-h-[26px]">
        {preview.delta != null ? (
          <span
            className={`delta-chip ${isPositive ? "delta-chip-pos" : "delta-chip-neg"}`}
          >
            {isPositive ? "↑" : "↓"} {formatDeltaPct(preview.delta).replace(/^[+-]/, "")}
            <span className="ml-0.5 font-normal text-[var(--ink-3)]">
              vs préc.
            </span>
          </span>
        ) : (
          <span className="text-[11px] text-[var(--ink-4)]">—</span>
        )}
        {preview.sparkline && preview.sparkline.length > 1 ? (
          <Sparkline
            data={preview.sparkline}
            width={84}
            height={26}
            color="var(--accent)"
          />
        ) : null}
      </div>
    </div>
  );
}
