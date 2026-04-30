"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DashboardSummary } from "@/lib/queries/pinpoint";

export function DashboardLinks({ dashboards }: { dashboards: DashboardSummary[] }) {
  const pathname = usePathname();

  if (dashboards.length === 0) {
    return (
      <p className="px-2 font-mono text-[10.5px] text-[var(--ink-3)]">
        Aucun dashboard. Crée le premier ↓
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {dashboards.map((d) => {
        const href = `/app/dashboards/${d.id}`;
        const isActive = pathname === href;
        return (
          <Link
            key={d.id}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] transition-colors ${
              isActive
                ? "bg-[var(--surface-2)] font-medium text-[var(--ink)]"
                : "text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
            }`}
          >
            <span
              className={
                isActive ? "text-[var(--accent)]" : "text-[var(--ink-3)]"
              }
            >
              <LayersIcon />
            </span>
            <span className="truncate">{d.name}</span>
            <span className="ml-auto flex-shrink-0 font-mono text-[10px] tabular-nums text-[var(--ink-3)]">
              {d.widgetCount}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function LayersIcon() {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
