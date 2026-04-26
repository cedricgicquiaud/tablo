import type { CalendarEntry } from "@/lib/queries/commerce";

const TAG_COLORS: Record<string, { bg: string; fg: string }> = {
  campagne: { bg: "color-mix(in oklab, var(--accent) 15%, transparent)", fg: "var(--accent)" },
  marketing: { bg: "color-mix(in oklab, var(--c2) 20%, transparent)", fg: "var(--c2)" },
  stock: { bg: "color-mix(in oklab, var(--positive) 15%, transparent)", fg: "var(--positive)" },
  email: { bg: "color-mix(in oklab, var(--c5) 18%, transparent)", fg: "var(--c5)" },
};

const TAG_LABELS: Record<string, string> = {
  campagne: "campagne",
  marketing: "marketing",
  stock: "stock",
  email: "email",
};

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function formatTime(d: Date): string {
  return `${String(d.getUTCHours()).padStart(2, "0")}h${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function Calendar({ data }: { data: CalendarEntry[] }) {
  return (
    <div className="w">
      <div className="w-head">
        <div>
          <div className="w-title" style={{ fontSize: 15, color: "var(--ink)" }}>
            Calendrier
          </div>
          <div className="muted mt-1">Prochains événements</div>
        </div>
      </div>
      {data.length === 0 ? (
        <div className="py-6 text-center text-sm text-[var(--ink-3)]">
          Aucun événement programmé
        </div>
      ) : (
        <div className="flex flex-col">
          {data.map((entry, i) => {
            const colors = TAG_COLORS[entry.tag] ?? {
              bg: "var(--surface-2)",
              fg: "var(--ink-2)",
            };
            const isFirst = i === 0;
            return (
              <div
                key={entry.id}
                className={`flex items-center gap-3 py-3 ${
                  i < data.length - 1 ? "border-b border-[var(--line)]" : ""
                }`}
              >
                <div
                  className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-md text-center ${
                    isFirst ? "" : ""
                  }`}
                  style={{
                    background: isFirst ? "var(--ink)" : "var(--surface-2)",
                    color: isFirst ? "var(--bg)" : "var(--ink)",
                  }}
                >
                  <div>
                    <div className="text-[9px] uppercase tracking-wider opacity-70">
                      {DAY_LABELS[entry.startsAt.getUTCDay()]}
                    </div>
                    <div
                      className="text-[18px] font-semibold leading-none"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {entry.startsAt.getUTCDate()}
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium text-[var(--ink)]">
                    {entry.title}
                  </div>
                  <div className="muted mt-0.5 inline-flex items-center gap-1.5">
                    <span aria-hidden>🕐</span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>
                      {formatTime(entry.startsAt)} · {entry.durationMin} min
                    </span>
                  </div>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ background: colors.bg, color: colors.fg }}
                >
                  {TAG_LABELS[entry.tag] ?? entry.tag}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
