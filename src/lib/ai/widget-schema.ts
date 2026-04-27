import { z } from "zod";

// DSL JSON pour les widgets. Validation stricte via Zod.
// Phase 16 : 4 kinds initiaux (metric_card, time_series, bar_chart, donut).
// Phase 16bis : 4 kinds en plus (gauge, data_table, funnel, event_timeline).
// Schema lu par Anthropic (en JSON Schema) puis revalidé côté serveur.

export const FORMATS = ["currency_eur_compact", "count", "percent"] as const;
export type Format = (typeof FORMATS)[number];

export const ICONS = ["revenue", "users", "cart", "trend"] as const;
export type IconName = (typeof ICONS)[number];

export const WIDGET_KINDS = [
  "metric_card",
  "time_series",
  "bar_chart",
  "donut",
  "gauge",
  "data_table",
  "funnel",
  "event_timeline",
] as const;
export type WidgetKind = (typeof WIDGET_KINDS)[number];

const QuerySchema = z.object({
  type: z.literal("sql"),
  sql: z.string().min(10),
});

// ===== metric_card : 1 ligne, valeur + delta optionnel + sparkline optionnelle
export const MetricCardSchema = z.object({
  kind: z.literal("metric_card"),
  title: z.string().min(1).max(80),
  icon: z.enum(ICONS).default("trend"),
  query: QuerySchema,
  mapping: z.object({
    value: z.string().min(1),
    delta: z.string().optional(),
    sparkline: z.string().optional(),
  }),
  format: z.enum(FORMATS).default("count"),
});

// ===== time_series : N lignes (date + valeur) — line chart
export const TimeSeriesSchema = z.object({
  kind: z.literal("time_series"),
  title: z.string().min(1).max(80),
  query: QuerySchema,
  mapping: z.object({
    x: z.string().min(1).describe("Colonne x-axis (date ou label string)"),
    y: z.string().min(1).describe("Colonne y-axis (numérique)"),
  }),
  format: z.enum(FORMATS).default("count"),
});

// ===== bar_chart : N catégories (label + value, target optionnel)
export const BarChartSchema = z.object({
  kind: z.literal("bar_chart"),
  title: z.string().min(1).max(80),
  query: QuerySchema,
  mapping: z.object({
    label: z.string().min(1),
    value: z.string().min(1),
    target: z.string().optional(),
  }),
  format: z.enum(FORMATS).default("count"),
});

// ===== donut : N segments (label + value)
export const DonutSchema = z.object({
  kind: z.literal("donut"),
  title: z.string().min(1).max(80),
  query: QuerySchema,
  mapping: z.object({
    label: z.string().min(1),
    value: z.string().min(1),
  }),
  format: z.enum(FORMATS).default("count"),
});

// ===== gauge : 1 ligne, value + target — arc circulaire de progression
export const GaugeSchema = z.object({
  kind: z.literal("gauge"),
  title: z.string().min(1).max(80),
  query: QuerySchema,
  mapping: z.object({
    value: z.string().min(1),
    target: z.string().min(1),
  }),
  format: z.enum(FORMATS).default("count"),
});

// ===== data_table : N lignes, colonnes définies en CSV
// mapping.columns = "col1,col2,col3" — limité à 5 colonnes max après split.
export const DataTableSchema = z.object({
  kind: z.literal("data_table"),
  title: z.string().min(1).max(80),
  query: QuerySchema,
  mapping: z.object({
    columns: z
      .string()
      .min(1)
      .describe("Liste de colonnes séparées par des virgules : 'id,email,plan'"),
  }),
  format: z.enum(FORMATS).default("count"),
});

// ===== funnel : N étapes (label + count), ordonnées décroissantes
export const FunnelSchema = z.object({
  kind: z.literal("funnel"),
  title: z.string().min(1).max(80),
  query: QuerySchema,
  mapping: z.object({
    stage: z.string().min(1),
    count: z.string().min(1),
  }),
  format: z.enum(FORMATS).default("count"),
});

// ===== event_timeline : N événements (timestamp + label, type optionnel)
export const EventTimelineSchema = z.object({
  kind: z.literal("event_timeline"),
  title: z.string().min(1).max(80),
  query: QuerySchema,
  mapping: z.object({
    timestamp: z.string().min(1),
    label: z.string().min(1),
    type: z.string().optional(),
  }),
  format: z.enum(FORMATS).default("count"),
});

// Discriminated union sur le kind.
export const WidgetSchema = z.discriminatedUnion("kind", [
  MetricCardSchema,
  TimeSeriesSchema,
  BarChartSchema,
  DonutSchema,
  GaugeSchema,
  DataTableSchema,
  FunnelSchema,
  EventTimelineSchema,
]);

export type MetricCardConfig = z.infer<typeof MetricCardSchema>;
export type TimeSeriesConfig = z.infer<typeof TimeSeriesSchema>;
export type BarChartConfig = z.infer<typeof BarChartSchema>;
export type DonutConfig = z.infer<typeof DonutSchema>;
export type GaugeConfig = z.infer<typeof GaugeSchema>;
export type DataTableConfig = z.infer<typeof DataTableSchema>;
export type FunnelConfig = z.infer<typeof FunnelSchema>;
export type EventTimelineConfig = z.infer<typeof EventTimelineSchema>;
export type WidgetConfig = z.infer<typeof WidgetSchema>;

// JSON Schema pour Anthropic tool-use.
// Approche : 1 seul tool propose_widget avec discriminator par kind.
export const WIDGET_JSON_SCHEMA = {
  type: "object",
  properties: {
    kind: {
      type: "string",
      enum: [...WIDGET_KINDS],
      description:
        "Type de widget : metric_card (1 valeur), time_series (courbe), bar_chart (barres), donut (parts %), gauge (jauge value/target), data_table (tableau), funnel (entonnoir étapes), event_timeline (chronologie d'événements).",
    },
    title: {
      type: "string",
      description: "Titre court (max 80 chars).",
    },
    icon: {
      type: "string",
      enum: [...ICONS],
      description:
        "Pictogramme (metric_card uniquement) : revenue, users, cart, trend.",
    },
    query: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["sql"] },
        sql: {
          type: "string",
          description:
            "Requête SQL SELECT/WITH. Lecture seule. Pour metric_card : retourne 1 ligne. Pour time_series/bar_chart/donut : retourne N lignes.",
        },
      },
      required: ["type", "sql"],
    },
    mapping: {
      type: "object",
      description:
        "Selon kind : metric_card={value, delta?, sparkline?} | time_series={x, y} | bar_chart={label, value, target?} | donut={label, value} | gauge={value, target} | data_table={columns: 'col1,col2,col3'} | funnel={stage, count} | event_timeline={timestamp, label, type?}.",
      additionalProperties: { type: "string" },
    },
    format: {
      type: "string",
      enum: [...FORMATS],
      description:
        "Format des valeurs : currency_eur_compact (cents → '123 K €'), count (entier), percent (number → '12,4%').",
    },
  },
  required: ["kind", "title", "query", "mapping", "format"],
} as const;
