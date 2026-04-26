"use client";

import { useState, useTransition, useMemo } from "react";
import { formatCompactCents } from "@/lib/format/cents";
import type { ProductsPage, ProductRow } from "@/lib/queries/commerce";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getProductsPaginated } from "@/lib/queries/commerce";

type SortCol = "created_at" | "price_cents" | "stock" | "rating" | "name";
type SortDir = "asc" | "desc";

const STATUS_PILLS: Record<string, { bg: string; fg: string; label: string }> = {
  active: { bg: "color-mix(in oklab, var(--positive) 15%, transparent)", fg: "var(--positive)", label: "Actif" },
  draft: { bg: "color-mix(in oklab, var(--warn) 15%, transparent)", fg: "var(--warn)", label: "Brouillon" },
  sold_out: { bg: "color-mix(in oklab, var(--negative) 15%, transparent)", fg: "var(--negative)", label: "Épuisé" },
};

const CATEGORY_LABELS: Record<string, string> = {
  apparel: "Mode",
  home: "Maison",
  beauty: "Beauté",
  tech: "Tech",
  accessories: "Accessoires",
};

export function ProductsTable({ initialPage }: { initialPage: ProductsPage }) {
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [isPending, startTransition] = useTransition();

  const browser = useMemo(() => createSupabaseBrowserClient(), []);

  function refetch(next: { search?: string; sortCol?: SortCol; sortDir?: SortDir }) {
    const newSearch = next.search ?? search;
    const newSortCol = next.sortCol ?? sortCol;
    const newSortDir = next.sortDir ?? sortDir;
    setSearch(newSearch);
    setSortCol(newSortCol);
    setSortDir(newSortDir);
    startTransition(async () => {
      const result = await getProductsPaginated(browser, {
        search: newSearch,
        sortCol: newSortCol,
        sortDir: newSortDir,
        limit: 10,
      });
      setPage(result);
    });
  }

  function toggleSort(col: SortCol) {
    if (sortCol === col) {
      refetch({ sortDir: sortDir === "asc" ? "desc" : "asc" });
    } else {
      refetch({ sortCol: col, sortDir: "desc" });
    }
  }

  function sortIndicator(col: SortCol) {
    if (sortCol !== col) return null;
    return <span aria-hidden>{sortDir === "asc" ? " ↑" : " ↓"}</span>;
  }

  return (
    <div className="w">
      <div className="w-head">
        <div>
          <div className="w-title" style={{ fontSize: 15, color: "var(--ink)" }}>
            Top produits
          </div>
          <div className="muted mt-1">{page.total} produits</div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={search}
            placeholder="Rechercher..."
            onChange={(e) => refetch({ search: e.target.value })}
            className="rounded-[var(--radius-tag-sm)] border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            className="rounded-[var(--radius-tag-sm)] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--ink-2)] hover:bg-[var(--surface-3)]"
          >
            Exporter
          </button>
          <button
            type="button"
            className="rounded-[var(--radius-tag-sm)] bg-[var(--ink)] px-3 py-1.5 text-xs font-medium text-[var(--bg)] hover:opacity-90"
          >
            Nouveau
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead style={{ background: "var(--surface-2)" }}>
            <tr className="text-left text-[11px] uppercase text-[var(--ink-3)]" style={{ letterSpacing: "0.04em" }}>
              <th className="px-3 py-2.5 font-semibold">SKU</th>
              <th
                className="cursor-pointer px-3 py-2.5 font-semibold hover:text-[var(--ink)]"
                onClick={() => toggleSort("name")}
              >
                Nom{sortIndicator("name")}
              </th>
              <th className="px-3 py-2.5 font-semibold">Catégorie</th>
              <th
                className="cursor-pointer px-3 py-2.5 font-semibold hover:text-[var(--ink)]"
                onClick={() => toggleSort("price_cents")}
              >
                Prix{sortIndicator("price_cents")}
              </th>
              <th
                className="cursor-pointer px-3 py-2.5 font-semibold hover:text-[var(--ink)]"
                onClick={() => toggleSort("stock")}
              >
                Stock{sortIndicator("stock")}
              </th>
              <th
                className="cursor-pointer px-3 py-2.5 font-semibold hover:text-[var(--ink)]"
                onClick={() => toggleSort("rating")}
              >
                ★{sortIndicator("rating")}
              </th>
              <th className="px-3 py-2.5 font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody>
            {page.rows.map((row: ProductRow) => {
              const pill = STATUS_PILLS[row.status] ?? STATUS_PILLS.active;
              return (
                <tr
                  key={row.id}
                  className="border-b border-[var(--line)] text-[13px] hover:bg-[var(--surface-2)]"
                >
                  <td
                    className="px-3 py-2.5 text-[11px] text-[var(--ink-3)]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {row.sku}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--ink)]">{row.name}</td>
                  <td className="px-3 py-2.5 text-[var(--ink-2)]">
                    {CATEGORY_LABELS[row.category] ?? row.category}
                  </td>
                  <td
                    className="px-3 py-2.5 text-[var(--ink)]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatCompactCents(row.priceCents)} €
                  </td>
                  <td
                    className="px-3 py-2.5 text-[var(--ink-2)]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {row.stock}
                  </td>
                  <td className="px-3 py-2.5">
                    <span style={{ color: "var(--accent)" }} aria-label={`${row.rating} étoiles`}>
                      ★
                    </span>
                    <span
                      className="ml-1 text-[var(--ink-2)]"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {row.rating.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ background: pill.bg, color: pill.fg }}
                    >
                      {pill.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {isPending ? (
        <div className="muted mt-2 text-center text-[11px]">Chargement…</div>
      ) : null}
    </div>
  );
}
