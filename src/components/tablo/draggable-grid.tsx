"use client";

import { useMemo, useRef, useState } from "react";
import {
  Responsive as ResponsiveGrid,
  useContainerWidth,
  type Layout,
  type LayoutItem,
} from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import type { PinnedWidget } from "@/lib/queries/pinned-widgets";
import {
  updateWidgetsLayout,
  type WidgetPosition,
} from "@/lib/tablo/layout-actions";
import { DynamicWidget } from "@/components/widgets/dynamic-widget";
import { Icon } from "@/components/widgets/icon";
import { deleteWidget } from "@/lib/tablo/widget-actions";

const COLS = { lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 };
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const ROW_HEIGHT = 64;

const MIN_SIZE: Record<string, { w: number; h: number }> = {
  metric_card: { w: 2, h: 2 },
  time_series: { w: 4, h: 3 },
  bar_chart: { w: 3, h: 3 },
  donut: { w: 3, h: 3 },
  gauge: { w: 3, h: 3 },
  data_table: { w: 4, h: 4 },
  funnel: { w: 3, h: 3 },
  event_timeline: { w: 3, h: 4 },
};

export function DraggableGrid({
  widgets,
  dashboardId,
}: {
  widgets: PinnedWidget[];
  dashboardId: string;
}) {
  const { width, containerRef, mounted } = useContainerWidth();

  const initialLayout: LayoutItem[] = useMemo(
    () =>
      widgets.map((w, i) => {
        const min = MIN_SIZE[w.config.kind] ?? { w: 2, h: 2 };
        const fallbackX = (i * 4) % 12;
        const fallbackY = Math.floor((i * 4) / 12) * 4;
        return {
          i: w.id,
          x: w.position?.x ?? fallbackX,
          y: w.position?.y ?? fallbackY,
          w: w.position?.w ?? Math.max(4, min.w),
          h: w.position?.h ?? Math.max(3, min.h),
          minW: min.w,
          minH: min.h,
        };
      }),
    [widgets],
  );

  const [layout, setLayout] = useState<LayoutItem[]>(initialLayout);
  const [prevSig, setPrevSig] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset layout quand la liste des widgets change (add/delete) — pattern
  // "Adjusting State Based on Props" via in-render setState. Pas de useEffect.
  // https://react.dev/learn/you-might-not-need-an-effect
  const sig = widgets.map((w) => w.id).join(",");
  if (sig !== prevSig) {
    setPrevSig(sig);
    setLayout(initialLayout);
  }

  function handleLayoutChange(newLayout: Layout) {
    setLayout([...newLayout]);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const positions: WidgetPosition[] = newLayout.map((l) => ({
        id: l.i,
        x: l.x,
        y: l.y,
        w: l.w,
        h: l.h,
      }));
      await updateWidgetsLayout(dashboardId, positions);
    }, 600);
  }

  if (widgets.length === 0) return null;

  return (
    <div ref={containerRef} className="w-full">
      {mounted ? (
        <ResponsiveGrid
          className="tablo-grid"
          layouts={{
            lg: layout,
            md: layout,
            sm: layout,
            xs: layout,
            xxs: layout,
          }}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          width={width}
          onLayoutChange={handleLayoutChange}
          dragConfig={{
            enabled: true,
            bounded: false,
            threshold: 3,
            handle: ".widget-drag-handle",
          }}
          resizeConfig={{
            enabled: true,
            handles: ["se"],
          }}
        >
          {widgets.map((w) => (
            <div key={w.id} className="group relative">
              <div
                className="widget-drag-handle absolute left-2 top-2 z-10 hidden h-6 w-6 cursor-grab items-center justify-center rounded-md bg-[var(--surface-2)] text-[var(--ink-3)] opacity-0 transition-opacity group-hover:flex group-hover:opacity-90 active:cursor-grabbing"
                aria-label="Glisser pour déplacer"
                title="Glisser pour déplacer"
              >
                <Icon name="more" size={14} />
              </div>
              <form action={deleteWidget} className="absolute right-2 top-2 z-10">
                <input type="hidden" name="id" value={w.id} />
                <input type="hidden" name="dashboardId" value={dashboardId} />
                <button
                  type="submit"
                  className="hidden h-6 w-6 items-center justify-center rounded-md bg-[var(--surface-2)] text-[var(--ink-3)] opacity-0 transition-opacity group-hover:flex group-hover:opacity-90 hover:bg-[var(--negative)]/20 hover:text-[var(--negative)]"
                  aria-label="Supprimer"
                  title="Supprimer"
                >
                  <Icon name="close" size={14} />
                </button>
              </form>
              <div className="h-full w-full overflow-hidden">
                {w.data ? (
                  <DynamicWidget config={w.config} data={w.data} />
                ) : (
                  <div
                    className="flex h-full flex-col justify-center border border-[var(--negative)]/30 bg-[color-mix(in_oklab,var(--negative)_5%,transparent)] p-4 text-xs text-[var(--negative)]"
                    style={{ borderRadius: "var(--radius)" }}
                  >
                    Erreur : {w.error}
                    <div className="mt-1 text-[var(--ink-3)]">{w.config.title}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </ResponsiveGrid>
      ) : (
        <div className="flex min-h-[200px] items-center justify-center text-sm text-[var(--ink-3)]">
          Chargement…
        </div>
      )}
    </div>
  );
}
