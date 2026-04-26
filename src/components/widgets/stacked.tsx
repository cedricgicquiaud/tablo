import { formatCompactCents } from "@/lib/format/cents";
import type { SegmentMonthlyPoint } from "@/lib/queries/commerce";

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];

const SEGMENT_COLORS: Record<string, string> = {
  premium: "var(--accent)",
  standard: "var(--c2)",
  basic: "var(--c3)",
};

const SEGMENT_LABELS: Record<string, string> = {
  premium: "Premium",
  standard: "Standard",
  basic: "Basique",
};

const SEGMENT_ORDER = ["premium", "standard", "basic"] as const;

export function Stacked({ data }: { data: SegmentMonthlyPoint[] }) {
  // Group by month → segments stack
  const byMonth = new Map<string, Map<string, number>>();
  for (const row of data) {
    const key = row.month.toISOString().slice(0, 10);
    if (!byMonth.has(key)) byMonth.set(key, new Map());
    byMonth.get(key)!.set(row.segment, row.revenueCents);
  }
  const months = Array.from(byMonth.keys()).sort();
  const totalsByMonth = months.map((m) => {
    const segs = byMonth.get(m)!;
    return {
      month: m,
      total: SEGMENT_ORDER.reduce((acc, s) => acc + (segs.get(s) ?? 0), 0),
      segments: SEGMENT_ORDER.map((s) => ({
        segment: s,
        revenueCents: segs.get(s) ?? 0,
      })),
    };
  });
  const max = Math.max(...totalsByMonth.map((m) => m.total), 1);

  return (
    <div className="w">
      <div className="w-head">
        <div>
          <div className="w-title" style={{ fontSize: 15, color: "var(--ink)" }}>
            Revenu par segment
          </div>
          <div className="muted mt-1">6 derniers mois</div>
        </div>
      </div>
      <div className="flex h-[180px] items-end gap-3 border-b border-[var(--line)] pb-1">
        {totalsByMonth.map((m) => {
          const totalH = (m.total / max) * 160;
          return (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="relative flex w-[60%] max-w-[38px] flex-col-reverse overflow-hidden"
                style={{ height: `${totalH}px`, gap: "2px" }}
              >
                {m.segments.map((s) => {
                  const h = m.total === 0 ? 0 : (s.revenueCents / m.total) * totalH;
                  if (h === 0) return null;
                  return (
                    <div
                      key={s.segment}
                      style={{
                        height: `${h}px`,
                        background: SEGMENT_COLORS[s.segment] ?? "var(--c3)",
                      }}
                      title={`${SEGMENT_LABELS[s.segment]}: ${formatCompactCents(s.revenueCents)} €`}
                    />
                  );
                })}
              </div>
              <div className="text-[10px] text-[var(--ink-3)]">
                {MONTH_LABELS[new Date(m.month).getUTCMonth()] ?? m.month}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px]">
        {SEGMENT_ORDER.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 text-[var(--ink-3)]">
            <span
              className="h-2 w-2"
              style={{ background: SEGMENT_COLORS[s] }}
              aria-hidden
            />
            {SEGMENT_LABELS[s]}
          </span>
        ))}
      </div>
    </div>
  );
}
