/**
 * Kits de prompts pré-définis par type de business.
 *
 * Phase 18 Cycle A T_A3. Pour chaque SourceKind détecté, l'auto-starter
 * dashboard exécute la liste de prompts comme s'ils étaient tapés par
 * l'utilisateur dans le chat. Chaque prompt produit un widget pinné.
 *
 * Limite : 4-5 prompts par kit pour respecter RNF1 (≤ 45s) et RNF2 (≤ $0.15).
 */

import type { SourceKind } from "@/lib/ai-engine/utils/detect-source-type";

export type StarterKit = {
  prompts: string[];
};

export const STARTER_KITS: Record<SourceKind, StarterKit> = {
  ecommerce: {
    prompts: [
      "Mon revenu de ce mois",
      "Évolution du revenu sur 12 mois",
      "Top 5 catégories par revenu",
      "Top 10 produits par revenu",
      "10 dernières commandes",
    ],
  },
  crm: {
    prompts: [
      "Pipeline en cours par étape",
      "Taux de conversion des deals",
      "Top 5 deals ouverts par valeur",
      "Revenu fermé par mois sur 12 mois",
      "Top 5 owners par CA généré",
    ],
  },
  saas: {
    prompts: [
      "MRR de ce mois",
      "Évolution du churn sur 12 mois",
      "Répartition par plan",
      "Top 10 customers par MRR",
      "Nouveaux signups par mois sur 12 mois",
    ],
  },
  finance: {
    prompts: [
      "Solde total des comptes",
      "Évolution des dépenses sur 12 mois",
      "Répartition par catégorie",
      "10 dernières transactions",
    ],
  },
  generic: {
    prompts: [
      "Volume de lignes par table (top 5)",
      "Activité sur les 30 derniers jours",
      "Distribution de la principale colonne catégorielle",
      "10 dernières entrées de la plus grosse table",
    ],
  },
};
