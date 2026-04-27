import type { WidgetData } from "./extract-preview";
import type { WidgetConfig } from "./widget-schema";

export type GenerateResult =
  | {
      ok: true;
      config: WidgetConfig;
      data: WidgetData;
      explanation: string;
      tokens: { input: number; output: number };
    }
  | { ok: false; error: string };
