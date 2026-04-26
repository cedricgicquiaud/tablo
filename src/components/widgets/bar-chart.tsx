"use client";

import { useState } from "react";
import { formatCompactCents } from "@/lib/format/cents";
import type { TargetVsActualPoint } from "@/lib/queries/commerce";

const CATEGORY_LABELS: Record<string, string> = {
  apparel: "Mode",
  home: "Maison",
  beauty: "Beauté",
  tech: "Tech",
  accessories: "Accessoires",
};

export function BarChartWidget({ data }: { data: TargetVsActualPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => Math.max(d.actualCents, d.targetCents))) * 1.1 || 1;
  return (
    <div className="w">
      <div className="w-head">
        <div>
          <div className="w-title" style={{ fontSize: 15, color: "var(--ink)" }}>
            Ventes par catégorie
          </div>
          <div className="muted mt-1">Réel vs objectif · ce mois</div>
        </div>
      </div>
      <div className="flex h-[200px] items-end gap-3 border-b border-[var(--line)] pt-3 pb-1">
        {data.map((c, i) => {
          const hReal = (c.actualCents / max) * 180;
          const hTarget = (c.targetCents / max) * 180;
          const exceeds = c.actualCents >= c.targetCents;
          return (
            <div
              key={c.category}
              className="relative flex flex-1 flex-col items-center gap-2"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="relative flex h-[180px] w-full max-w-[56px] items-end justify-center">
                <div
                  className="absolute -left-1 -right-1 z-10 border-t-[1.5px] border-dashed border-[var(--ink-3)]"
                  style={{ bottom: `${hTarget}px` }}
                />
                <div
                  className="absolute -right-1 text-[9px] text-[var(--ink-3)]"
                  style={{
                    bottom: `${hTarget + 2}px`,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  obj
                </div>
                <div
                  className="relative w-[70%] transition-[height] duration-700 ease-out"
                  style={{
                    height: `${hReal}px`,
                    background: exceeds ? "var(--accent)" : "var(--c3)",
                    borderRadius: "6px 6px 2px 2px",
                  }}
                >
                  {hover === i ? (
                    <div
                      className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-2 rounded-md bg-[var(--ink)] px-2 py-1 text-xs text-[var(--bg)] shadow-lg"
                      style={{ bottom: "100%", whiteSpace: "nowrap" }}
                    >
                      {formatCompactCents(c.actualCents)} €
                      <span className="ml-1.5 text-[10px] opacity-70">
                        / {formatCompactCents(c.targetCents)} €
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="text-[11px] font-medium text-[var(--ink-2)]">
                {CATEGORY_LABELS[c.category] ?? c.category}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-[var(--ink-3)]">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-sm"
            style={{ background: "var(--accent)" }}
          />
          Atteint
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-sm"
            style={{ background: "var(--c3)" }}
          />
          Sous objectif
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-px w-5 border-t border-dashed border-[var(--ink-3)]" />
          Objectif
        </span>
      </div>
    </div>
  );
}
