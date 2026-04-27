"use client";

import { useState } from "react";
import { formatCompactCents } from "@/lib/format/cents";
import type { TimeSeriesData } from "@/lib/ai/extract-preview";
import type { Format, TimeSeriesConfig } from "@/lib/ai/widget-schema";

const W = 600;
const H = 220;
const PAD_L = 40;
const PAD_R = 16;
const PAD_T = 24;
const PAD_B = 32;
const CW = W - PAD_L - PAD_R;
const CH = H - PAD_T - PAD_B;

function formatY(value: number, format: Format): string {
  if (format === "currency_eur_compact") return formatCompactCents(value);
  if (format === "percent") return `${value.toFixed(0)}%`;
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

function shortLabel(x: string): string {
  // Si c'est une date ISO type "2026-04-01", on extrait "Avr"
  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
  const m = /^(\d{4})-(\d{2})/.exec(x);
  if (m) {
    const monthIdx = Number(m[2]) - 1;
    return months[monthIdx] ?? x.slice(5, 7);
  }
  if (x.length > 6) return x.slice(0, 6);
  return x;
}

export function DynamicLineChart({
  config,
  data,
}: {
  config: TimeSeriesConfig;
  data: TimeSeriesData;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const ys = data.points.map((p) => p.y);
  const max = Math.max(...ys) * 1.1 || 1;
  const min = Math.min(0, Math.min(...ys));
  const range = max - min || 1;
  const xs = data.points.map((_, i) => PAD_L + (i / (data.points.length - 1 || 1)) * CW);
  const yPos = ys.map((y) => PAD_T + CH - ((y - min) / range) * CH);
  const linePath = data.points
    .map((_, i) => `${i === 0 ? "M" : "L"} ${xs[i]},${yPos[i]}`)
    .join(" ");
  const areaPath = `${linePath} L ${xs[xs.length - 1]},${PAD_T + CH} L ${xs[0]},${PAD_T + CH} Z`;
  const labels = data.points.map((p) => shortLabel(p.x));

  return (
    <div className="w" style={{ minHeight: H + 80 }}>
      <div className="w-head">
        <div>
          <div className="w-title" style={{ fontSize: 15, color: "var(--ink)" }}>
            {config.title}
          </div>
          <div className="muted mt-1">{data.points.length} points</div>
        </div>
      </div>
      <div className="relative">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
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
                  {formatY(min + range * (1 - t), config.format)}
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
                x={x - CW / (data.points.length * 2)}
                y={PAD_T}
                width={CW / data.points.length}
                height={CH}
                fill="transparent"
              />
              <circle
                cx={x}
                cy={yPos[i]}
                r={hover === i ? 5 : 3}
                fill="var(--surface)"
                stroke="var(--accent)"
                strokeWidth="2"
              />
            </g>
          ))}
          {xs.map((x, i) => {
            // N'affiche qu'1 label sur 2 si trop dense (max 12 lisibles).
            const skip = data.points.length > 12 && i % 2 !== 0;
            if (skip) return null;
            return (
              <text
                key={i}
                x={x}
                y={H - 10}
                fontSize="10"
                fill="var(--ink-3)"
                textAnchor="middle"
              >
                {labels[i]}
              </text>
            );
          })}
          {hover !== null && (
            <line
              x1={xs[hover]}
              x2={xs[hover]}
              y1={PAD_T}
              y2={PAD_T + CH}
              stroke="var(--ink)"
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
              top: `${(yPos[hover] / H) * 100}%`,
              transform: "translate(-50%, calc(-100% - 12px))",
            }}
          >
            <div className="text-[10px] opacity-70">{data.points[hover].x}</div>
            <div
              className="text-sm font-semibold tabular"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {formatY(data.points[hover].y, config.format)}
              {config.format === "currency_eur_compact" ? " €" : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
