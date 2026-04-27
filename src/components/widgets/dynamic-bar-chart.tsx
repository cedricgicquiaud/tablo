"use client";

import { useState } from "react";
import { formatCompactCents } from "@/lib/format/cents";
import type { BarChartData } from "@/lib/ai/extract-preview";
import type { BarChartConfig, Format } from "@/lib/ai/widget-schema";

function formatTooltip(value: number, format: Format): string {
  if (format === "currency_eur_compact") return `${formatCompactCents(value)} €`;
  if (format === "percent") return `${value.toFixed(1).replace(".", ",")} %`;
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

export function DynamicBarChart({
  config,
  data,
}: {
  config: BarChartConfig;
  data: BarChartData;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(
    ...data.bars.map((b) => Math.max(b.value, b.target ?? 0)),
  ) * 1.1 || 1;
  const hasTargets = data.bars.some((b) => b.target != null);

  return (
    <div className="w">
      <div className="w-head">
        <div>
          <div className="w-title" style={{ fontSize: 15, color: "var(--ink)" }}>
            {config.title}
          </div>
          <div className="muted mt-1">
            {data.bars.length} catégorie{data.bars.length > 1 ? "s" : ""}
            {hasTargets ? " · réel vs objectif" : ""}
          </div>
        </div>
      </div>
      <div className="flex h-[200px] items-end gap-3 border-b border-[var(--line)] pt-3 pb-1">
        {data.bars.map((bar, i) => {
          const hReal = (bar.value / max) * 180;
          const hTarget = bar.target != null ? (bar.target / max) * 180 : 0;
          const exceeds = bar.target != null ? bar.value >= bar.target : true;
          return (
            <div
              key={`${bar.label}-${i}`}
              className="relative flex flex-1 flex-col items-center gap-2"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="relative flex h-[180px] w-full max-w-[56px] items-end justify-center">
                {bar.target != null ? (
                  <>
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
                  </>
                ) : null}
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
                      {formatTooltip(bar.value, config.format)}
                      {bar.target != null ? (
                        <span className="ml-1.5 text-[10px] opacity-70">
                          / {formatTooltip(bar.target, config.format)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="text-[11px] font-medium text-[var(--ink-2)] truncate max-w-full">
                {bar.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
