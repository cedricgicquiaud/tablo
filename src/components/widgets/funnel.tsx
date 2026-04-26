import type { FunnelStep } from "@/lib/queries/commerce";

const STEP_LABELS: Record<string, string> = {
  visit: "Visites",
  add_to_cart: "Panier",
  checkout: "Checkout",
  paid: "Achat",
};

export function Funnel({ data }: { data: FunnelStep[] }) {
  const sorted = [...data].sort((a, b) => a.stepOrder - b.stepOrder);
  const top = sorted[0]?.count ?? 0;

  return (
    <div className="w">
      <div className="w-head">
        <div>
          <div className="w-title" style={{ fontSize: 15, color: "var(--ink)" }}>
            Tunnel de conversion
          </div>
          <div className="muted mt-1">30 derniers jours</div>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {sorted.map((s, i) => {
          const width = top === 0 ? 0 : (Number(s.count) / Number(top)) * 100;
          const prev = sorted[i - 1];
          const dropoff =
            prev && Number(prev.count) > 0
              ? Math.round(
                  ((Number(prev.count) - Number(s.count)) / Number(prev.count)) * 100,
                )
              : 0;
          return (
            <div key={s.step} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="grid h-[18px] w-[18px] place-items-center rounded-[4px] text-[10px] text-[var(--ink-2)]"
                    style={{ background: "var(--surface-2)" }}
                  >
                    {s.stepOrder}
                  </span>
                  <span className="text-[var(--ink-2)]">
                    {STEP_LABELS[s.step] ?? s.step}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[var(--ink)]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {Number(s.count).toLocaleString("fr-FR")}
                  </span>
                  {dropoff > 0 ? (
                    <span
                      className="text-[10px] text-[var(--negative)]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      −{dropoff}%
                    </span>
                  ) : null}
                </div>
              </div>
              <div
                className="h-7 overflow-hidden rounded-[6px]"
                style={{ background: "var(--surface-2)" }}
              >
                <div
                  className="h-full transition-[width] duration-1000 ease-out"
                  style={{
                    width: `${width}%`,
                    background:
                      "linear-gradient(90deg, var(--accent), var(--accent-3))",
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
