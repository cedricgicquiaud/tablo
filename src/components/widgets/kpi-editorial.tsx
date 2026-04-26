import { formatCompactCents, formatDeltaPct } from "@/lib/format/cents";
import type { RevenueKpi } from "@/lib/queries/commerce";
import { Icon } from "./icon";
import { Sparkline } from "./sparkline";

export function KpiEditorial({ data }: { data: RevenueKpi }) {
  const isPositive = data.deltaPct >= 0;
  return (
    <div className="w" style={{ minHeight: 160 }}>
      <div className="w-head">
        <div className="w-title">
          <span className="w-icon">
            <Icon name="revenue" size={13} />
          </span>
          Revenu total
        </div>
        <button className="rounded-md p-1 text-[var(--ink-3)] hover:bg-[var(--surface-2)]" aria-label="More">
          <Icon name="more" />
        </button>
      </div>
      <div className="flex items-baseline gap-1 mb-1.5">
        <span className="font-[family-name:var(--font-display)] text-base text-[var(--ink-3)]">€</span>
        <span className="num-xl">{formatCompactCents(data.currentCents)}</span>
      </div>
      <div className="mt-3.5 flex items-center justify-between">
        <span className={`delta-chip ${isPositive ? "delta-chip-pos" : "delta-chip-neg"}`}>
          {isPositive ? "↑" : "↓"} {formatDeltaPct(data.deltaPct).replace(/^[+-]/, "")}
          <span className="ml-0.5 font-normal text-[var(--ink-3)]">vs sem.</span>
        </span>
        <Sparkline data={data.sparklineCents} width={84} height={26} color="var(--accent)" />
      </div>
    </div>
  );
}
