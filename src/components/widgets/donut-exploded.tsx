"use client";

import { useState } from "react";
import { formatCompactCents } from "@/lib/format/cents";
import type { RevenueByCategoryPoint } from "@/lib/queries/commerce";

const CATEGORY_LABELS: Record<string, string> = {
  apparel: "Mode",
  home: "Maison",
  beauty: "Beauté",
  tech: "Tech",
  accessories: "Accessoires",
};

const SEGMENT_COLORS = ["var(--accent)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)"];

const RADIUS = 70;
const INNER = 50;
const CX = 100;
const CY = 100;

export function DonutExploded({ data }: { data: RevenueByCategoryPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((acc, s) => acc + s.revenueCents, 0);
  if (total === 0) {
    return (
      <div className="w">
        <div className="w-head">
          <div className="w-title" style={{ fontSize: 15, color: "var(--ink)" }}>
            Revenu par catégorie
          </div>
        </div>
        <div className="text-sm text-[var(--ink-3)] py-12 text-center">
          Aucune vente cumulée
        </div>
      </div>
    );
  }

  const cumulative = data.reduce<number[]>((arr, s, i) => {
    arr.push((arr[i - 1] ?? 0) + s.revenueCents);
    return arr;
  }, []);
  return (
    <div className="w">
      <div className="w-head">
        <div className="w-title" style={{ fontSize: 15, color: "var(--ink)" }}>
          Revenu par catégorie
        </div>
        <span className="muted">Total cumulé</span>
      </div>
      <div className="flex items-center gap-5">
        <svg width={200} height={200} viewBox="0 0 200 200">
          {data.map((s, i) => {
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
                key={s.category}
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
            fontSize="22"
            fill="var(--ink)"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {formatCompactCents(total)} €
          </text>
        </svg>
        <div className="flex flex-1 flex-col gap-1.5">
          {data.map((s, i) => {
            const pct = Math.round((s.revenueCents / total) * 100);
            return (
              <div
                key={s.category}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors ${
                  hover === i ? "bg-[var(--surface-2)]" : ""
                }`}
              >
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
                />
                <span className="flex-1 text-[13px] text-[var(--ink-2)]">
                  {CATEGORY_LABELS[s.category] ?? s.category}
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
