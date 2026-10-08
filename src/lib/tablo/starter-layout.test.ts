/**
 * Tests `starter-layout` — Phase 18 Cycle A T_A4.
 *
 * Helper greedy qui place un nouveau widget au prochain slot libre dans
 * une grille 12 colonnes (infinie en hauteur).
 */

import { describe, it, expect } from "vitest";
import { nextPosition, KIND_DIMENSIONS } from "./starter-layout";

describe("nextPosition", () => {
  it("T_A4.1 — layout vide + metric_card → { x:0, y:0, w:4, h:2 }", () => {
    const pos = nextPosition([], "metric_card");
    expect(pos).toEqual({ x: 0, y: 0, w: 4, h: 2 });
  });

  it("T_A4.2 — après metric_card en (0,0,4,2), time_series (w:8) rentre en (4,0,8,4)", () => {
    const existing = [{ x: 0, y: 0, w: 4, h: 2 }];
    const pos = nextPosition(existing, "time_series");
    expect(pos).toEqual({ x: 4, y: 0, w: 8, h: 4 });
  });

  it("T_A4.3 — ligne pleine (12 col occupées) → next widget va à la ligne suivante", () => {
    const existing = [
      { x: 0, y: 0, w: 4, h: 2 },
      { x: 4, y: 0, w: 8, h: 4 },
    ];
    // metric_card (w:4) ne rentre pas sous metric_card (h:2 → libre à y=2 mais x=0..4)
    // mais time_series (h:4) bloque jusqu'à y=4 sur x=4..12
    // donc metric_card peut aller en (0, 2, 4, 2) car y=2..4 libre
    const pos = nextPosition(existing, "metric_card");
    expect(pos).toEqual({ x: 0, y: 2, w: 4, h: 2 });
  });

  it("T_A4.4 — data_table (w:12) prend toute la ligne suivante", () => {
    const existing = [
      { x: 0, y: 0, w: 4, h: 2 },
      { x: 4, y: 0, w: 8, h: 4 },
    ];
    // data_table w=12 ne rentre nulle part avant y=4 (time_series bloque)
    const pos = nextPosition(existing, "data_table");
    expect(pos).toEqual({ x: 0, y: 4, w: 12, h: 4 });
  });

  it("T_A4.5 — KIND_DIMENSIONS expose les tailles par kind", () => {
    expect(KIND_DIMENSIONS.metric_card).toEqual({ w: 4, h: 2 });
    expect(KIND_DIMENSIONS.time_series).toEqual({ w: 8, h: 4 });
    expect(KIND_DIMENSIONS.donut).toEqual({ w: 4, h: 4 });
    expect(KIND_DIMENSIONS.data_table).toEqual({ w: 12, h: 4 });
  });

  it("T_A4.6 — kind inconnu → fallback dimensions raisonnables", () => {
    // nextPosition accepte n'importe quel kind (string) : le fallback est typé.
    const pos = nextPosition([], "unknown_kind");
    // Doit retourner une position valide (pas crash)
    expect(pos.w).toBeGreaterThan(0);
    expect(pos.h).toBeGreaterThan(0);
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(0);
  });
});
