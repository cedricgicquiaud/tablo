import type { WidgetData } from "@/lib/ai/extract-preview";
import type { WidgetConfig } from "@/lib/ai/widget-schema";
import { DynamicBarChart } from "./dynamic-bar-chart";
import { DynamicDataTable } from "./dynamic-data-table";
import { DynamicDonut } from "./dynamic-donut";
import { DynamicEventTimeline } from "./dynamic-event-timeline";
import { DynamicFunnel } from "./dynamic-funnel";
import { DynamicGauge } from "./dynamic-gauge";
import { DynamicLineChart } from "./dynamic-line-chart";
import { DynamicMetricCard } from "./dynamic-metric-card";

export function DynamicWidget({
  config,
  data,
}: {
  config: WidgetConfig;
  data: WidgetData;
}) {
  // Le kind de config et data doivent matcher.
  if (config.kind !== data.kind) {
    return (
      <div
        className="border border-[var(--negative)]/30 p-4 text-xs text-[var(--negative)]"
        style={{ borderRadius: "var(--radius)" }}
      >
        Mismatch kind : config={config.kind}, data={data.kind}
      </div>
    );
  }

  switch (config.kind) {
    case "metric_card":
      if (data.kind !== "metric_card") return null;
      return (
        <DynamicMetricCard
          config={config}
          preview={{ value: data.value, delta: data.delta, sparkline: data.sparkline }}
        />
      );
    case "time_series":
      if (data.kind !== "time_series") return null;
      return <DynamicLineChart config={config} data={data} />;
    case "bar_chart":
      if (data.kind !== "bar_chart") return null;
      return <DynamicBarChart config={config} data={data} />;
    case "donut":
      if (data.kind !== "donut") return null;
      return <DynamicDonut config={config} data={data} />;
    case "gauge":
      if (data.kind !== "gauge") return null;
      return <DynamicGauge config={config} data={data} />;
    case "data_table":
      if (data.kind !== "data_table") return null;
      return <DynamicDataTable config={config} data={data} />;
    case "funnel":
      if (data.kind !== "funnel") return null;
      return <DynamicFunnel config={config} data={data} />;
    case "event_timeline":
      if (data.kind !== "event_timeline") return null;
      return <DynamicEventTimeline config={config} data={data} />;
  }
}
