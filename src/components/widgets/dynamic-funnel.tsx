"use client";

import { formatCompactCents } from "@/lib/format/cents";
import type { FunnelData } from "@/lib/ai/extract-preview";
import type { Format, FunnelConfig } from "@/lib/ai/widget-schema";

function formatValue(value: number, format: Format): string {
  if (format === "currency_eur_compact") return `${formatCompactCents(value)} €`;
  if (format === "percent") return `${value.toFixed(1).replace(".", ",")} %`;
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

export function DynamicFunnel({
  config,
  data,
}: {
  config: FunnelConfig;
  data: FunnelData;
}) {
  const max = Math.max(...data.steps.map((s) => s.count), 1);
  const first = data.steps[0]?.count ?? 0;

  return (
    <div className="w" style={{ minHeight: 160 }}>
      <div className="w-head">
        <div className="w-title" style={{ fontSize: 15, color: "var(--ink)" }}>
          {config.title}
        </div>
        <span className="muted">{data.steps.length} étapes</span>
      </div>
      <div className="flex flex-col gap-2">
        {data.steps.map((step, i) => {
          const ratio = step.count / max;
          const conversionFromFirst = first > 0 ? (step.count / first) * 100 : 0;
          return (
            <div key={`${step.stage}-${i}`} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[var(--ink-2)] truncate">{step.stage}</span>
                <span
                  className="text-[var(--ink-3)] tabular-nums"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {formatValue(step.count, config.format)}
                  {i > 0 ? (
                    <span className="ml-2 text-[10px] text-[var(--ink-4)]">
                      {Math.round(conversionFromFirst)}%
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="h-6 w-full overflow-hidden rounded-md bg-[var(--surface-3)]">
                <div
                  className="h-full rounded-md"
                  style={{
                    width: `${Math.max(ratio * 100, 2)}%`,
                    background: `color-mix(in oklab, var(--accent) ${100 - i * 12}%, var(--surface-2))`,
                    transition: "width 0.6s ease-out",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
