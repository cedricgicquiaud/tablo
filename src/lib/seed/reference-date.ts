/**
 * Date de référence du seed de démo : le jour courant à midi UTC, pour que les
 * widgets « 7 derniers jours » aient toujours des données. `override` (variable
 * SEED_NOW, format AAAA-MM-JJ) impose un jour pour rejouer un jeu identique.
 */
export function seedReferenceDate(now: Date, override?: string): Date {
  const day = override ?? now.toISOString().slice(0, 10);
  const ref = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(ref.getTime())) {
    throw new Error(`SEED_NOW illisible (« ${override} ») : format attendu AAAA-MM-JJ`);
  }
  return ref;
}
