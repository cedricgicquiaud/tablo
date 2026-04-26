"use client";

import { useState } from "react";
import type { HourDowCell } from "@/lib/queries/commerce";

const DOW_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const HOUR_BUCKETS = [0, 3, 6, 9, 12, 15, 18, 21];

export function Heatmap({ data }: { data: HourDowCell[] }) {
  const [hover, setHover] = useState<HourDowCell | null>(null);
  const max = Math.max(...data.map((d) => d.ordersCount), 1);
  const cellByKey = new Map(
    data.map((d) => [`${d.dow}-${d.hourBucket}`, d] as const),
  );

  return (
    <div className="w">
      <div className="w-head">
        <div>
          <div className="w-title" style={{ fontSize: 15, color: "var(--ink)" }}>
            Activité d&apos;achat
          </div>
          <div className="muted mt-1">Heure × jour · 90 derniers jours</div>
        </div>
      </div>
      <div className="flex gap-1.5">
        <div className="flex flex-col justify-around pt-5 pr-1 text-[9px] text-[var(--ink-3)]">
          {DOW_LABELS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-8 gap-1 mb-1 text-[9px] text-[var(--ink-3)] text-center">
            {HOUR_BUCKETS.map((h) => (
              <div key={h}>{String(h).padStart(2, "0")}h</div>
            ))}
          </div>
          <div className="grid grid-cols-8 grid-rows-7 gap-1">
            {DOW_LABELS.map((_label, dowIdx) =>
              HOUR_BUCKETS.map((bucket) => {
                const cell = cellByKey.get(`${dowIdx + 1}-${bucket}`) ?? {
                  dow: dowIdx + 1,
                  hourBucket: bucket,
                  ordersCount: 0,
                };
                const intensity = cell.ordersCount / max;
                return (
                  <div
                    key={`${dowIdx}-${bucket}`}
                    onMouseEnter={() => setHover(cell)}
                    onMouseLeave={() => setHover(null)}
                    className="h-7 rounded-[4px] transition-transform duration-150 hover:scale-110"
                    style={{
                      background:
                        intensity === 0
                          ? "var(--surface-2)"
                          : `color-mix(in oklab, var(--accent) ${Math.max(8, Math.round(intensity * 100))}%, var(--surface-2))`,
                      border: "1px solid var(--line)",
                    }}
                  />
                );
              }),
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-[var(--ink-3)]">
          <span>0</span>
          <div
            className="h-2 w-24 rounded-sm"
            style={{
              background:
                "linear-gradient(to right, var(--surface-2), var(--accent))",
            }}
          />
          <span>{max}</span>
        </div>
        <div
          className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[var(--ink-2)]"
          style={{
            background:
              hover && hover.ordersCount > 0
                ? "var(--surface-2)"
                : "transparent",
            minHeight: 20,
            minWidth: 100,
            textAlign: "right",
          }}
        >
          {hover
            ? `${DOW_LABELS[hover.dow - 1]} ${String(hover.hourBucket).padStart(2, "0")}h · ${hover.ordersCount}`
            : "Survolez une cellule"}
        </div>
      </div>
    </div>
  );
}
