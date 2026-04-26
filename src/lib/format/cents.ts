const NBSP = " ";

export function formatCents(cents: number): string {
  if (cents === 0) return "0";
  const value = cents / 100;
  if (Number.isInteger(value)) return String(Math.trunc(value));
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

function compact(value: number, suffix: string): string {
  if (value >= 100 || Number.isInteger(value)) {
    return `${Math.round(value)}${suffix}`;
  }
  return `${value.toFixed(1).replace(".", ",")}${suffix}`;
}

export function formatCompactCents(cents: number): string {
  if (cents === 0) return "0";
  const value = cents / 100;
  if (value >= 1_000_000) return compact(value / 1_000_000, "M");
  if (value >= 1_000) return compact(value / 1_000, "K");
  return Math.round(value).toString();
}

export function formatDeltaPct(deltaPct: number): string {
  const fixed = deltaPct.toFixed(1).replace(".", ",");
  const signed = deltaPct >= 0 ? `+${fixed}` : fixed;
  return `${signed}%`;
}

export function formatCentsWithCurrency(cents: number, currency = "€"): string {
  return `${formatCompactCents(cents)}${NBSP}${currency}`;
}
