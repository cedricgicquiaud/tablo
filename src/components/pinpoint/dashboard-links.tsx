"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DashboardSummary } from "@/lib/queries/pinpoint";

export function DashboardLinks({ dashboards }: { dashboards: DashboardSummary[] }) {
  const pathname = usePathname();

  if (dashboards.length === 0) {
    return (
      <p className="px-2 text-[11px] text-[var(--ink-3)]">
        Aucun dashboard. Crée le premier ↓
      </p>
    );
  }

  return (
    <>
      {dashboards.map((d) => {
        const href = `/app/dashboards/${d.id}`;
        const isActive = pathname === href;
        return (
          <Link
            key={d.id}
            href={href}
            className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
              isActive
                ? "bg-[var(--surface-3)] text-[var(--ink)]"
                : "text-[var(--ink-2)] hover:bg-[var(--surface-3)]"
            }`}
          >
            <span className="truncate">{d.name}</span>
            <span className="ml-2 flex-shrink-0 text-[10px] text-[var(--ink-3)]">
              {d.widgetCount}
            </span>
          </Link>
        );
      })}
    </>
  );
}
