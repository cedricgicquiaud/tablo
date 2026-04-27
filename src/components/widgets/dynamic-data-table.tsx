"use client";

import type { DataTableData } from "@/lib/ai/extract-preview";
import type { DataTableConfig } from "@/lib/ai/widget-schema";

function formatCell(v: string | number | null): string {
  if (v == null) return "—";
  if (typeof v === "number") return new Intl.NumberFormat("fr-FR").format(v);
  return v;
}

export function DynamicDataTable({
  config,
  data,
}: {
  config: DataTableConfig;
  data: DataTableData;
}) {
  return (
    <div className="w" style={{ minHeight: 160 }}>
      <div className="w-head">
        <div className="w-title" style={{ fontSize: 15, color: "var(--ink)" }}>
          {config.title}
        </div>
        <span className="muted">{data.rows.length} lignes</span>
      </div>
      <div className="max-h-[280px] overflow-auto rounded-md border border-[var(--line)]">
        <table className="w-full text-[13px]">
          <thead className="sticky top-0 bg-[var(--surface-2)] text-[11px] uppercase tracking-wider text-[var(--ink-3)]">
            <tr>
              {data.columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-semibold"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr
                key={i}
                className="border-t border-[var(--line)] hover:bg-[var(--surface-2)]"
              >
                {data.columns.map((col) => (
                  <td
                    key={col}
                    className="px-3 py-2 text-[var(--ink-2)] tabular-nums"
                  >
                    {formatCell(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
