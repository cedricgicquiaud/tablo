import { formatCompactCents, formatDeltaPct } from "@/lib/format/cents";
import type { OrdersKpi } from "@/lib/queries/commerce";
import { BarSpark } from "./bar-spark";
import { Icon } from "./icon";

export function KpiBars({ data }: { data: OrdersKpi }) {
  const isPositive = data.deltaPct >= 0;
  return (
    <div className="w" style={{ minHeight: 160 }}>
      <div className="w-head">
        <div className="w-title">
          <span className="w-icon">
            <Icon name="users" size={13} />
          </span>
          Commandes
        </div>
        <span className="muted">7j</span>
      </div>
      <div className="num-xl">{data.count}</div>
      <div className="mt-3.5 flex items-center justify-between">
        <span className={`delta-chip ${isPositive ? "delta-chip-pos" : "delta-chip-neg"}`}>
          {isPositive ? "↑" : "↓"} {formatDeltaPct(data.deltaPct).replace(/^[+-]/, "")}
        </span>
        <BarSpark
          data={data.dailyCents.map((c) => Math.max(c, 1))}
          width={92}
          height={26}
          color="var(--accent)"
          highlightLast
        />
      </div>
      <div className="muted mt-2 text-xs">
        {formatCompactCents(data.dailyCents.reduce((a, b) => a + b, 0))} € sur 7j
      </div>
    </div>
  );
}
