/**
 * Re-export du widget-schema legacy pour Phase 17.
 *
 * Stratégie de migration (I10) : les nouveaux modules `ai-engine/` importent
 * depuis ce path final dès le cycle A. La migration des 13 imports legacy
 * (`@/lib/ai/widget-schema`) vers ce path final est faite en bloc en cycle C
 * (T3.8 cleanup), avant suppression de `src/lib/ai/widget-schema.ts`.
 *
 * Permet d'écrire les nouveaux fichiers cycle A/B avec le path correct
 * sans toucher aux 13 fichiers legacy existants → 0 risque de régression.
 */

export {
  WIDGET_KINDS,
  FORMATS,
  ICONS,
  WIDGET_JSON_SCHEMA,
  WidgetSchema,
  MetricCardSchema,
  TimeSeriesSchema,
  BarChartSchema,
  DonutSchema,
  GaugeSchema,
  DataTableSchema,
  FunnelSchema,
  EventTimelineSchema,
} from "@/lib/ai/widget-schema";

export type {
  WidgetKind,
  Format,
  IconName,
  WidgetConfig,
  MetricCardConfig,
  TimeSeriesConfig,
  BarChartConfig,
  DonutConfig,
  GaugeConfig,
  DataTableConfig,
  FunnelConfig,
  EventTimelineConfig,
} from "@/lib/ai/widget-schema";
