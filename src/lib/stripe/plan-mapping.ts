/**
 * Mapping `companies.size` (text) → plan tier Stripe (Phase 14.2 R1).
 *
 * Le CRM démo stocke `size` comme un bucket text ("1-10", "11-50",
 * "51-200", "201-500", "500+") plutôt qu'un int. Le mapping aligne
 * sur la distribution observée (101 starter / 65 business / 34
 * enterprise sur 200 companies).
 *
 * Le mapping est utilisé au seed pour décider quelle Subscription
 * créer côté Stripe. La metadata `crm_company_id` côté Stripe sert
 * de pont avec la DB CRM (DB CRM intouchée).
 *
 * Si une valeur de size inconnue est rencontrée → fallback `enterprise`
 * (prudent : pas d'envoi de Subscription auto-charge sur company suspecte).
 */

export type CompanySize = "1-10" | "11-50" | "51-200" | "201-500" | "500+";
export type StripePlan = "starter" | "business" | "enterprise";

export function companySizeToPlan(size: string): StripePlan {
  if (size === "1-10" || size === "11-50") return "starter";
  if (size === "51-200" || size === "201-500") return "business";
  return "enterprise";
}
