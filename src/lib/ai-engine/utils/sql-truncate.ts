/**
 * Tronque un résultat de query pour rester sous une limite de chars JSON.
 *
 * Phase 17 cycle C T3.1 (R33, B4). Garantit que le JSON renvoyé au LLM
 * reste parseable même tronqué.
 *
 * Stratégie :
 * 1. Si JSON.stringify(rows) <= maxChars → return { rows, _truncated: false }
 * 2. Sinon → tronquer rows progressivement (slice) jusqu'à passer sous le seuil
 * 3. Si UNE seule row dépasse maxChars → return { _error }
 */

export type TruncatedResult = {
  rows: Array<Record<string, unknown>>;
  _truncated: boolean;
  _truncated_reason?: string;
  _total_rows?: number;
  _error?: string;
};

export function truncateJsonResult(
  rows: Array<Record<string, unknown>>,
  maxChars: number,
): TruncatedResult {
  const fullJson = JSON.stringify(rows);
  if (fullJson.length <= maxChars) {
    return { rows, _truncated: false };
  }

  // Test single row dépasse maxChars
  if (rows.length > 0) {
    const firstRowJson = JSON.stringify(rows[0]);
    if (firstRowJson.length > maxChars) {
      return {
        rows: [],
        _truncated: true,
        _error: `single row too large to display (${firstRowJson.length} chars > ${maxChars} max)`,
      };
    }
  }

  // Tronque en slice : trouve le nombre max de rows qui passent sous le seuil
  // (binary search pour efficacité, mais linéaire suffit pour < 1000 rows)
  let kept = rows.length;
  for (let i = rows.length; i > 0; i--) {
    const partial = rows.slice(0, i);
    if (JSON.stringify(partial).length <= maxChars) {
      kept = i;
      break;
    }
    kept = 0;
  }

  return {
    rows: rows.slice(0, kept),
    _truncated: true,
    _truncated_reason: `${maxChars} chars limit (${rows.length - kept} rows omitted)`,
    _total_rows: rows.length,
  };
}
