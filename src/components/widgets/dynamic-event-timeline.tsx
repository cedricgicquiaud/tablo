"use client";

import type { EventTimelineData } from "@/lib/ai/extract-preview";
import type { EventTimelineConfig } from "@/lib/ai/widget-schema";

function formatTimestamp(raw: string): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DynamicEventTimeline({
  config,
  data,
}: {
  config: EventTimelineConfig;
  data: EventTimelineData;
}) {
  return (
    <div className="w" style={{ minHeight: 160 }}>
      <div className="w-head">
        <div className="w-title" style={{ fontSize: 15, color: "var(--ink)" }}>
          {config.title}
        </div>
        <span className="muted">{data.events.length} événements</span>
      </div>
      <div className="max-h-[280px] overflow-auto">
        <ol className="relative flex flex-col gap-3 pl-5">
          <span
            aria-hidden
            className="absolute bottom-1 left-1.5 top-1 w-px bg-[var(--line)]"
          />
          {data.events.map((ev, i) => (
            <li key={i} className="relative flex flex-col gap-0.5">
              <span
                aria-hidden
                className="absolute -left-3.5 top-1.5 h-2 w-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--surface)]"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-[var(--ink)]">
                  {ev.label}
                </span>
                {ev.type ? (
                  <span
                    className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--ink-3)]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {ev.type}
                  </span>
                ) : null}
              </div>
              <span
                className="text-[11px] text-[var(--ink-3)]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {formatTimestamp(ev.timestamp)}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
