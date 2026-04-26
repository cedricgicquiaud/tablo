import type { TargetProgress } from "@/lib/queries/commerce";

const SEGMENTS = 40;
const START_A = -Math.PI * 1.1;
const END_A = Math.PI * 0.1;
const TOTAL_A = END_A - START_A;
const CX = 110;
const CY = 110;
const R = 80;

export function Gauge({ data }: { data: TargetProgress }) {
  const value = Math.max(0, Math.min(100, data.pct));
  const filled = Math.round((value / 100) * SEGMENTS);
  const totalChannel = data.onlineCents + data.storeCents;
  const onlinePct =
    totalChannel === 0 ? 0 : Math.round((data.onlineCents / totalChannel) * 100);
  const storePct =
    totalChannel === 0 ? 0 : Math.round((data.storeCents / totalChannel) * 100);

  return (
    <div className="w">
      <div className="w-head">
        <div className="w-title" style={{ fontSize: 15, color: "var(--ink)" }}>
          Distribution des ventes
        </div>
        <span className="muted">Mois en cours</span>
      </div>
      <div className="flex flex-col items-center">
        <svg width={220} height={150} viewBox="0 0 220 140">
          {Array.from({ length: SEGMENTS }).map((_, i) => {
            const a = START_A + (i / (SEGMENTS - 1)) * TOTAL_A;
            const x1 = CX + Math.cos(a) * R;
            const y1 = CY + Math.sin(a) * R;
            const x2 = CX + Math.cos(a) * (R - 14);
            const y2 = CY + Math.sin(a) * (R - 14);
            const isFilled = i < filled;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isFilled ? "var(--accent)" : "var(--line-2)"}
                strokeWidth="3"
                strokeLinecap="round"
                opacity={isFilled ? 0.5 + (i / SEGMENTS) * 0.5 : 1}
              />
            );
          })}
          <text
            x={CX}
            y={CY}
            textAnchor="middle"
            fontSize="42"
            fill="var(--ink)"
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.03em",
            }}
          >
            {value}
          </text>
          <text
            x={CX}
            y={CY + 18}
            textAnchor="middle"
            fontSize="11"
            fill="var(--ink-3)"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            / 100
          </text>
          <text
            x={CX + Math.cos(START_A) * (R + 10)}
            y={CY + Math.sin(START_A) * (R + 10) + 4}
            textAnchor="middle"
            fontSize="10"
            fill="var(--ink-3)"
          >
            0
          </text>
          <text
            x={CX + Math.cos(END_A) * (R + 10)}
            y={CY + Math.sin(END_A) * (R + 10) + 4}
            textAnchor="middle"
            fontSize="10"
            fill="var(--ink-3)"
          >
            100
          </text>
        </svg>
        <div
          className="mt-2 flex w-full items-stretch justify-around gap-3 rounded-lg px-4 py-3"
          style={{ background: "var(--surface-2)" }}
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--accent)" }}
              />
              <span className="muted">En ligne</span>
            </div>
            <div
              className="mt-0.5 text-[18px] font-semibold tabular text-[var(--ink)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {onlinePct}%
            </div>
          </div>
          <div className="w-px self-stretch bg-[var(--line)]" />
          <div>
            <div className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--c2)" }}
              />
              <span className="muted">Magasin</span>
            </div>
            <div
              className="mt-0.5 text-[18px] font-semibold tabular text-[var(--ink)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {storePct}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
