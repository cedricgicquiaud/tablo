import type { ActivityEntry } from "@/lib/queries/commerce";

const TYPE_COLORS: Record<string, string> = {
  paid: "var(--positive)",
  add_to_cart: "var(--accent)",
  checkout: "var(--c2)",
  visit: "var(--ink-3)",
  login: "var(--c4)",
  signup: "var(--c5)",
};

function relativeTime(d: Date): string {
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `il y a ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

export function Activity({ data }: { data: ActivityEntry[] }) {
  return (
    <div className="w">
      <div className="w-head">
        <div>
          <div className="w-title" style={{ fontSize: 15, color: "var(--ink)" }}>
            Activité récente
          </div>
          <div className="muted mt-1">Derniers événements</div>
        </div>
      </div>
      {data.length === 0 ? (
        <div className="py-6 text-center text-sm text-[var(--ink-3)]">
          Aucune activité
        </div>
      ) : (
        <div className="relative flex flex-col gap-3">
          <div
            aria-hidden
            className="absolute left-[5px] top-2 bottom-2 w-px"
            style={{ background: "var(--line-2)" }}
          />
          {data.map((entry) => {
            const color = TYPE_COLORS[entry.type] ?? "var(--ink-3)";
            return (
              <div key={`${entry.occurredAt.toISOString()}-${entry.customerEmail}`} className="relative flex gap-3 pl-0">
                <div
                  className="relative z-10 mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{
                    background: color,
                    boxShadow: "0 0 0 3px var(--surface)",
                  }}
                />
                <div className="flex-1 min-w-0 text-xs leading-relaxed">
                  <span className="font-semibold text-[var(--ink)]">
                    {entry.customerEmail.length > 20
                      ? `${entry.customerEmail.slice(0, 18)}…`
                      : entry.customerEmail}
                  </span>
                  <span className="text-[var(--ink-2)]"> {entry.actionLabel}</span>
                  <span className="text-[var(--ink-3)]"> · {entry.detail}</span>
                  <span
                    className="ml-1.5 text-[10px] text-[var(--ink-3)]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {relativeTime(entry.occurredAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
