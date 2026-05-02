import type {
  BarChartConfig,
  DataTableConfig,
  DonutConfig,
  EventTimelineConfig,
  FunnelConfig,
  GaugeConfig,
  MetricCardConfig,
  TimeSeriesConfig,
  WidgetConfig,
} from "./widget-schema";

export type MetricCardData = {
  kind: "metric_card";
  value: number;
  delta: number | null;
  sparkline: number[] | null;
};

export type TimeSeriesData = {
  kind: "time_series";
  points: { x: string; y: number }[];
};

export type BarChartData = {
  kind: "bar_chart";
  bars: { label: string; value: number; target: number | null }[];
};

export type DonutData = {
  kind: "donut";
  segments: { label: string; value: number }[];
};

export type GaugeData = {
  kind: "gauge";
  value: number;
  target: number;
};

export type DataTableData = {
  kind: "data_table";
  columns: string[];
  rows: Record<string, string | number | null>[];
};

export type FunnelData = {
  kind: "funnel";
  steps: { stage: string; count: number }[];
};

export type EventTimelineData = {
  kind: "event_timeline";
  events: { timestamp: string; label: string; type: string | null }[];
};

export type WidgetData =
  | MetricCardData
  | TimeSeriesData
  | BarChartData
  | DonutData
  | GaugeData
  | DataTableData
  | FunnelData
  | EventTimelineData;
export type ExtractError = { error: string };

type Row = Record<string, unknown>;

function getNumber(row: Row, col: string): number | null {
  const raw = row[col];
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

function getString(row: Row, col: string): string {
  const raw = row[col];
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (raw instanceof Date) return raw.toISOString();
  return String(raw);
}

export function extractMetricCard(
  config: MetricCardConfig,
  rows: Row[],
): MetricCardData | ExtractError {
  if (rows.length === 0) return { error: "Aucune ligne retournée" };
  const row = rows[0];
  const value = getNumber(row, config.mapping.value);
  if (value === null) {
    return { error: `Colonne '${config.mapping.value}' absente ou non numérique` };
  }
  const delta = config.mapping.delta ? getNumber(row, config.mapping.delta) : null;
  const sparkline =
    config.mapping.sparkline && Array.isArray(row[config.mapping.sparkline])
      ? (row[config.mapping.sparkline] as unknown[]).map((v) => Number(v))
      : null;
  return { kind: "metric_card", value, delta, sparkline };
}

export function extractTimeSeries(
  config: TimeSeriesConfig,
  rows: Row[],
): TimeSeriesData | ExtractError {
  if (rows.length === 0) return { error: "Aucune ligne retournée" };
  const points: { x: string; y: number }[] = [];
  for (const row of rows) {
    const y = getNumber(row, config.mapping.y);
    if (y === null) continue;
    points.push({ x: getString(row, config.mapping.x), y });
  }
  if (points.length === 0) return { error: "Aucun point valide" };
  return { kind: "time_series", points };
}

export function extractBarChart(
  config: BarChartConfig,
  rows: Row[],
): BarChartData | ExtractError {
  if (rows.length === 0) return { error: "Aucune ligne retournée" };
  const bars: BarChartData["bars"] = [];
  for (const row of rows) {
    const value = getNumber(row, config.mapping.value);
    if (value === null) continue;
    const target = config.mapping.target ? getNumber(row, config.mapping.target) : null;
    bars.push({
      label: getString(row, config.mapping.label),
      value,
      target,
    });
  }
  if (bars.length === 0) return { error: "Aucune barre valide" };
  return { kind: "bar_chart", bars };
}

export function extractDonut(
  config: DonutConfig,
  rows: Row[],
): DonutData | ExtractError {
  if (rows.length === 0) return { error: "Aucune ligne retournée" };
  const segments: DonutData["segments"] = [];
  for (const row of rows) {
    const value = getNumber(row, config.mapping.value);
    if (value === null) continue;
    segments.push({
      label: getString(row, config.mapping.label),
      value,
    });
  }
  if (segments.length === 0) return { error: "Aucun segment valide" };
  return { kind: "donut", segments };
}

export function extractGauge(
  config: GaugeConfig,
  rows: Row[],
): GaugeData | ExtractError {
  if (rows.length === 0) return { error: "Aucune ligne retournée" };
  const row = rows[0];
  const value = getNumber(row, config.mapping.value);
  const target = getNumber(row, config.mapping.target);
  if (value === null) {
    return { error: `Colonne '${config.mapping.value}' absente ou non numérique` };
  }
  if (target === null || target <= 0) {
    return { error: `Colonne '${config.mapping.target}' absente, non numérique ou nulle` };
  }
  return { kind: "gauge", value, target };
}

export function extractDataTable(
  config: DataTableConfig,
  rows: Row[],
): DataTableData | ExtractError {
  if (rows.length === 0) return { error: "Aucune ligne retournée" };
  const columns = config.mapping.columns
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 5);
  if (columns.length === 0) return { error: "Aucune colonne spécifiée" };
  const tableRows = rows.slice(0, 50).map((row) => {
    const out: Record<string, string | number | null> = {};
    for (const col of columns) {
      const raw = row[col];
      if (raw == null) {
        out[col] = null;
      } else if (typeof raw === "number") {
        out[col] = raw;
      } else if (raw instanceof Date) {
        out[col] = raw.toISOString();
      } else {
        out[col] = String(raw);
      }
    }
    return out;
  });
  return { kind: "data_table", columns, rows: tableRows };
}

export function extractFunnel(
  config: FunnelConfig,
  rows: Row[],
): FunnelData | ExtractError {
  if (rows.length === 0) return { error: "Aucune ligne retournée" };
  const steps: FunnelData["steps"] = [];
  for (const row of rows) {
    const count = getNumber(row, config.mapping.count);
    if (count === null) continue;
    steps.push({ stage: getString(row, config.mapping.stage), count });
  }
  // R45 (Phase 17 cycle C T3.4) : funnel 3-7 étapes
  if (steps.length < 3) {
    return { error: `Funnel nécessite au moins 3 étapes (reçu : ${steps.length})` };
  }
  return { kind: "funnel", steps: steps.slice(0, 7) };
}

export function extractEventTimeline(
  config: EventTimelineConfig,
  rows: Row[],
): EventTimelineData | ExtractError {
  if (rows.length === 0) return { error: "Aucune ligne retournée" };
  const events: EventTimelineData["events"] = [];
  for (const row of rows.slice(0, 30)) {
    const label = getString(row, config.mapping.label);
    const timestamp = getString(row, config.mapping.timestamp);
    if (!label || !timestamp) continue;
    events.push({
      timestamp,
      label,
      type: config.mapping.type ? getString(row, config.mapping.type) || null : null,
    });
  }
  if (events.length === 0) return { error: "Aucun événement valide" };
  return { kind: "event_timeline", events };
}

export function extractData(
  config: WidgetConfig,
  rows: Row[],
): WidgetData | ExtractError {
  switch (config.kind) {
    case "metric_card":
      return extractMetricCard(config, rows);
    case "time_series":
      return extractTimeSeries(config, rows);
    case "bar_chart":
      return extractBarChart(config, rows);
    case "donut":
      return extractDonut(config, rows);
    case "gauge":
      return extractGauge(config, rows);
    case "data_table":
      return extractDataTable(config, rows);
    case "funnel":
      return extractFunnel(config, rows);
    case "event_timeline":
      return extractEventTimeline(config, rows);
  }
}
