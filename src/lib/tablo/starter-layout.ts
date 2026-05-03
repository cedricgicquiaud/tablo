/**
 * Layout greedy pour pinning automatique des widgets starter.
 *
 * Phase 18 Cycle A T_A4. Algorithme simple :
 * - Grille 12 colonnes, hauteur infinie
 * - Pour chaque y croissant, on cherche le 1er x où le widget rentre
 *   sans chevaucher les widgets existants
 * - Ne fait pas de "perfect packing" : juste un placement raisonnable
 *
 * Les dimensions par kind sont fixes (R6 SPEC).
 */

const GRID_COLS = 12;

export type Position = { x: number; y: number; w: number; h: number };

type WidgetKind =
  | "metric_card"
  | "time_series"
  | "bar_chart"
  | "donut"
  | "gauge"
  | "data_table";

export const KIND_DIMENSIONS: Record<WidgetKind, { w: number; h: number }> = {
  metric_card: { w: 4, h: 2 },
  time_series: { w: 8, h: 4 },
  bar_chart: { w: 8, h: 4 },
  donut: { w: 4, h: 4 },
  gauge: { w: 4, h: 4 },
  data_table: { w: 12, h: 4 },
};

const DEFAULT_DIMS = { w: 4, h: 4 };

function getDimensions(kind: string): { w: number; h: number } {
  return KIND_DIMENSIONS[kind as WidgetKind] ?? DEFAULT_DIMS;
}

function overlaps(a: Position, b: Position): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/**
 * Trouve la prochaine position libre pour un widget de type `kind` dans
 * une grille où `existing` widgets sont déjà placés.
 */
export function nextPosition(existing: Position[], kind: string): Position {
  const { w, h } = getDimensions(kind);

  // Borne supérieure raisonnable : y max actuel + h, garantit une ligne libre
  const maxY =
    existing.length === 0 ? 0 : Math.max(...existing.map((p) => p.y + p.h));

  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x + w <= GRID_COLS; x++) {
      const candidate = { x, y, w, h };
      if (existing.every((e) => !overlaps(candidate, e))) {
        return candidate;
      }
    }
  }

  // Fallback : nouvelle ligne en bas
  return { x: 0, y: maxY, w, h };
}
