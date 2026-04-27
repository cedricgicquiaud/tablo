"use client";

import { useState } from "react";
import { formatCompactCents } from "@/lib/format/cents";
import type { DonutData } from "@/lib/ai/extract-preview";
import type { DonutConfig, Format } from "@/lib/ai/widget-schema";

const SEGMENT_COLORS = ["var(--accent)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)"];
const RADIUS = 70;
const INNER = 50;
const CX = 100;
const CY = 100;

function formatValue(value: number, format: Format): string {
  if (format === "currency_eur_compact") return `${formatCompactCents(value)} €`;
  if (format === "percent") return `${value.toFixed(1).replace(".", ",")} %`;
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

export function DynamicDonut({
  config,
  data,
}: {
  config: DonutConfig;
  data: DonutData;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.segments.reduce((acc, s) => acc + s.value, 0);

  if (total === 0) {
    return (
      <div className="w">
        <div className="w-head">
          <div className="w-title" style={{ fontSize: 15, color: "var(--ink)" }}>
            {config.title}
          </div>
        </div>
        <div className="text-sm text-[var(--ink-3)] py-12 text-center">
          Aucune donnée à afficher
        </div>
      </div>
    );
  }

  const cumulative = data.segments.reduce<number[]>((arr, s, i) => {
    arr.push((arr[i - 1] ?? 0) + s.value);
    return arr;
  }, []);

  return (
    <div className="w">
      <div className="w-head">
        <div className="w-title" style={{ fontSize: 15, color: "var(--ink)" }}>
          {config.title}
        </div>
        <span className="muted">{data.segments.length} segments</span>
      </div>
      <div className="flex items-center gap-5">
        <svg width={200} height={200} viewBox="0 0 200 200">
          {data.segments.map((s, i) => {
            const before = i === 0 ? 0 : cumulative[i - 1];
            const start = (before / total) * Math.PI * 2 - Math.PI / 2;
            const end = (cumulative[i] / total) * Math.PI * 2 - Math.PI / 2;
            const mid = (start + end) / 2;
            const offset = hover === i ? 8 : 0;
            const ox = Math.cos(mid) * offset;
            const oy = Math.sin(mid) * offset;
            const x1 = CX + ox + Math.cos(start) * RADIUS;
            const y1 = CY + oy + Math.sin(start) * RADIUS;
            const x2 = CX + ox + Math.cos(end) * RADIUS;
            const y2 = CY + oy + Math.sin(end) * RADIUS;
            const x3 = CX + ox + Math.cos(end) * INNER;
            const y3 = CY + oy + Math.sin(end) * INNER;
            const x4 = CX + ox + Math.cos(start) * INNER;
            const y4 = CY + oy + Math.sin(start) * INNER;
            const large = end - start > Math.PI ? 1 : 0;
            return (
              <path
                key={`${s.label}-${i}`}
                d={`M ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${INNER} ${INNER} 0 ${large} 0 ${x4} ${y4} Z`}
                fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                style={{ transition: "transform 0.3s", cursor: "pointer" }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
          <text
            x={CX}
            y={CY - 4}
            textAnchor="middle"
            fontSize="10"
            fill="var(--ink-3)"
            style={{ letterSpacing: "0.05em" }}
          >
            TOTAL
          </text>
          <text
            x={CX}
            y={CY + 18}
            textAnchor="middle"
            fontSize="20"
            fill="var(--ink)"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {formatValue(total, config.format)}
          </text>
        </svg>
        <div className="flex flex-1 flex-col gap-1.5">
          {data.segments.map((s, i) => {
            const pct = Math.round((s.value / total) * 100);
            return (
              <div
                key={`${s.label}-${i}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors ${
                  hover === i ? "bg-[var(--surface-2)]" : ""
                }`}
              >
                <span
                  className="h-2 w-2 rounded-sm flex-shrink-0"
                  style={{ background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
                />
                <span className="flex-1 text-[13px] text-[var(--ink-2)] truncate">
                  {s.label}
                </span>
                <span
                  className="text-xs font-medium tabular text-[var(--ink)]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
