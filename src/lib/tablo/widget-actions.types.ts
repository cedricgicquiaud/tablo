export type PinResult =
  | { ok: true; widgetId: string }
  | { ok: false; error: string };
