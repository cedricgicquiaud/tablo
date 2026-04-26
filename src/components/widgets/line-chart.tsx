"use client";

import { useState } from "react";
import { formatCompactCents } from "@/lib/format/cents";
import type { RevenueMonthlyPoint } from "@/lib/queries/commerce";

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];

const W = 600;
const H = 260;
const PAD_L = 40;
const PAD_R = 16;
const PAD_T = 24;
const PAD_B = 28;
const CW = W - PAD_L - PAD_R;
const CH = H - PAD_T - PAD_B;

export function LineChartWidget({ data }: { data: RevenueMonthlyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return null;

  const values = data.map((d) => d.revenueCents);
  const max = Math.max(...values) * 1.1 || 1;
  const xs = data.map((_, i) => PAD_L + (i / (data.length - 1 || 1)) * CW);
  const ys = values.map((v) => PAD_T + CH - (v / max) * CH);
  const linePath = data
    .map((_, i) => `${i === 0 ? "M" : "L"} ${xs[i]},${ys[i]}`)
    .join(" ");
  const areaPath = `${linePath} L ${xs[xs.length - 1]},${PAD_T + CH} L ${xs[0]},${PAD_T + CH} Z`;
  const labels = data.map((d) => MONTH_LABELS[d.month.getUTCMonth()] ?? "");

  return (
    <div className="w" style={{ minHeight: H + 80 }}>
      <div className="w-head">
        <div>
          <div className="w-title" style={{ fontSize: 15, color: "var(--ink)" }}>
            Analyse des ventes
          </div>
          <div className="muted mt-1">Revenu mensuel · 12 derniers mois</div>
        </div>
        <span className="muted">€</span>
      </div>
      <div className="relative">
        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: "block" }}
          preserveAspectRatio="xMidYMid meet"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = PAD_T + t * CH;
            return (
              <g key={t}>
                <line
                  x1={PAD_L}
                  x2={W - PAD_R}
                  y1={y}
                  y2={y}
                  stroke="var(--line)"
                  strokeWidth="1"
                  strokeDasharray={t === 1 ? undefined : "2,3"}
                />
                <text
                  x={PAD_L - 8}
                  y={y + 4}
                  fontSize="10"
                  fill="var(--ink-3)"
                  textAnchor="end"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {formatCompactCents(max * (1 - t))}
                </text>
              </g>
            );
          })}
          <path d={areaPath} fill="var(--accent)" opacity="0.08" />
          <path
            d={linePath}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {xs.map((x, i) => (
            <g
              key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <rect
                x={x - CW / (data.length * 2)}
                y={PAD_T}
                width={CW / data.length}
                height={CH}
                fill="transparent"
              />
              <circle
                cx={x}
                cy={ys[i]}
                r={hover === i ? 5 : 3}
                fill="var(--surface)"
                stroke="var(--accent)"
                strokeWidth="2"
              />
            </g>
          ))}
          {xs.map((x, i) => (
            <text
              key={i}
              x={x}
              y={H - 8}
              fontSize="10"
              fill="var(--ink-3)"
              textAnchor="middle"
            >
              {labels[i]}
            </text>
          ))}
          {hover !== null && (
            <line
              x1={xs[hover]}
              x2={xs[hover]}
              y1={PAD_T}
              y2={PAD_T + CH}
              stroke="var(--ink)"
              strokeWidth="1"
              strokeDasharray="3,3"
              opacity="0.3"
            />
          )}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute z-10 rounded-md bg-[var(--ink)] px-2 py-1.5 text-[var(--bg)] shadow-lg"
            style={{
              left: `${(xs[hover] / W) * 100}%`,
              top: `${(ys[hover] / H) * 100}%`,
              transform: "translate(-50%, calc(-100% - 12px))",
            }}
          >
            <div className="text-[10px] opacity-70">
              {labels[hover]} {data[hover].month.getUTCFullYear()}
            </div>
            <div
              className="text-sm font-semibold tabular"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {formatCompactCents(values[hover])} €
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
