import { formatCompactCents } from "@/lib/format/cents";
import type { TargetProgress } from "@/lib/queries/commerce";
import { Icon } from "./icon";

const RADIUS = 32;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function KpiRing({ data }: { data: TargetProgress }) {
  const pct = Math.max(0, Math.min(100, data.pct));
  const offset = CIRCUMFERENCE * (1 - pct / 100);
  return (
    <div className="w" style={{ minHeight: 160 }}>
      <div className="w-head">
        <div className="w-title">
          <span className="w-icon">
            <Icon name="trend" size={13} />
          </span>
          Objectif mensuel
        </div>
      </div>
      <div className="flex items-center gap-4">
        <svg width={80} height={80} viewBox="0 0 80 80" aria-hidden>
          <circle
            cx="40"
            cy="40"
            r={RADIUS}
            fill="none"
            stroke="var(--line)"
            strokeWidth="6"
          />
          <circle
            cx="40"
            cy="40"
            r={RADIUS}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="6"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
          <text
            x="40"
            y="44"
            textAnchor="middle"
            fontSize="14"
            fontWeight="600"
            fill="var(--ink)"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {pct}%
          </text>
        </svg>
        <div>
          <div className="num-l text-[var(--ink)]">{formatCompactCents(data.currentCents)}</div>
          <div className="muted mt-1">de {formatCompactCents(data.targetCents)} €</div>
        </div>
      </div>
    </div>
  );
}
