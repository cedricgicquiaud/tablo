/**
 * Détection du type de business à partir d'un schéma de tables.
 *
 * Phase 18 Cycle A T_A2. Appel Haiku light (~150 tokens system + 1 mot
 * de réponse) pour identifier le SourceKind. Fallback `generic` si :
 * - Réponse hors whitelist
 * - Erreur réseau (1 retry max)
 * - Aucune table fournie
 *
 * Coût attendu : ~$0.0005 / appel. Latence : ~1s.
 */

import { getAnthropicClient, AI_MODEL } from "@/lib/ai/anthropic";

export type SourceKind = "ecommerce" | "crm" | "saas" | "finance" | "generic";

const SOURCE_KINDS: readonly SourceKind[] = [
  "ecommerce",
  "crm",
  "saas",
  "finance",
  "generic",
];

const SYSTEM_PROMPT = `Tu identifies le type de business d'un schéma de base \
de données à partir de la liste des tables. Réponds avec UN SEUL MOT, \
exactement parmi cette whitelist :

- ecommerce : tables de type orders, products, customers, order_items, shipments
- crm : tables de type deals, companies, contacts, opportunities, leads
- saas : tables de type subscriptions, plans, customers, mrr_events, churn
- finance : tables de type transactions, accounts, balances, invoices
- generic : sinon (cas non couverts)

Réponse attendue : un seul mot de la whitelist, tout en minuscules, sans \
ponctuation.`;

function parseSourceKind(raw: string): SourceKind {
  // Tolère espaces, ponctuation, capitalisation : "Ecommerce. " → "ecommerce"
  const normalized = raw.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (SOURCE_KINDS.includes(normalized as SourceKind)) {
    return normalized as SourceKind;
  }
  return "generic";
}

async function callAnthropic(
  tables: { name: string; rowCount: number }[],
): Promise<SourceKind> {
  const client = getAnthropicClient();
  // Top 10 tables par row_count (R3 SPEC : si schémas > 100 tables, on tronque)
  const top = [...tables]
    .sort((a, b) => b.rowCount - a.rowCount)
    .slice(0, 10);

  const userMessage = top
    .map((t) => `- ${t.name} (${t.rowCount} rows)`)
    .join("\n");

  const res = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 5,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("");

  return parseSourceKind(text);
}

/**
 * Identifie le SourceKind d'un schéma. Retourne 'generic' en cas d'erreur
 * ou de schéma vide. Garantit pas de throw.
 */
export async function detectSourceType(
  tables: { name: string; rowCount: number }[],
): Promise<SourceKind> {
  if (tables.length === 0) return "generic";

  try {
    return await callAnthropic(tables);
  } catch (err) {
    // Retry 1× sur erreur réseau (timeout, 429, 500)
    console.warn(
      `[detectSourceType] retry après erreur : ${err instanceof Error ? err.message : "unknown"}`,
    );
    try {
      return await callAnthropic(tables);
    } catch {
      return "generic";
    }
  }
}
