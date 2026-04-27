"use client";

import { formatCompactCents } from "@/lib/format/cents";
import type { GaugeData } from "@/lib/ai/extract-preview";
import type { Format, GaugeConfig } from "@/lib/ai/widget-schema";

const RADIUS = 70;
const STROKE = 14;
const CX = 100;
const CY = 100;

function formatValue(value: number, format: Format): string {
  if (format === "currency_eur_compact") return `${formatCompactCents(value)} €`;
  if (format === "percent") return `${value.toFixed(1).replace(".", ",")} %`;
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

export function DynamicGauge({
  config,
  data,
}: {
  config: GaugeConfig;
  data: GaugeData;
}) {
  const ratio = Math.min(Math.max(data.value / data.target, 0), 1);
  const pct = Math.round(ratio * 100);
  // Demi-arc supérieur : start (-π) → end (0). Longueur = π · RADIUS.
  const circumference = Math.PI * RADIUS;
  const filled = circumference * ratio;

  return (
    <div className="w" style={{ minHeight: 160 }}>
      <div className="w-head">
        <div className="w-title" style={{ fontSize: 15, color: "var(--ink)" }}>
          {config.title}
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <svg width={200} height={120} viewBox="0 0 200 120">
          <path
            d={`M ${CX - RADIUS} ${CY} A ${RADIUS} ${RADIUS} 0 0 1 ${CX + RADIUS} ${CY}`}
            fill="none"
            stroke="var(--surface-3)"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
          <path
            d={`M ${CX - RADIUS} ${CY} A ${RADIUS} ${RADIUS} 0 0 1 ${CX + RADIUS} ${CY}`}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            style={{ transition: "stroke-dasharray 0.6s ease-out" }}
          />
          <text
            x={CX}
            y={CY - 8}
            textAnchor="middle"
            fontSize="28"
            fill="var(--ink)"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
          >
            {pct}%
          </text>
          <text
            x={CX}
            y={CY + 14}
            textAnchor="middle"
            fontSize="11"
            fill="var(--ink-3)"
          >
            {formatValue(data.value, config.format)} / {formatValue(data.target, config.format)}
          </text>
        </svg>
      </div>
    </div>
  );
}
