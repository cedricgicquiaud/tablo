export const MODES = ["light", "dark"] as const;
export type Mode = (typeof MODES)[number];

// 5 legacy palettes (e-commerce template) + 4 Tablo Design System palettes.
// Ordre : Tablo en premier (recommandées), puis legacy. Les utilisateurs avec un cookie
// legacy voient leur palette conservée — le défaut SSR est `steel` (cf. tweaks.ts).
export const PALETTES = [
  "steel",
  "spectrum",
  "sunset",
  "citrus",
  "terracotta",
  "editorial",
  "forest",
  "midnight",
  "mono",
] as const;
export type Palette = (typeof PALETTES)[number];

export const RADII = ["sharp", "soft", "pill"] as const;
export type Radius = (typeof RADII)[number];

export type Tweaks = {
  mode: Mode;
  palette: Palette;
  radius: Radius;
};

export const MODE_COOKIE = "dashboard.mode";
export const PALETTE_COOKIE = "dashboard.palette";
export const RADIUS_COOKIE = "dashboard.radius";

export const PALETTE_LABELS: Record<Palette, string> = {
  steel: "Steel",
  spectrum: "Spectrum",
  sunset: "Sunset",
  citrus: "Citrus",
  terracotta: "Terracotta",
  editorial: "Editorial",
  forest: "Forest",
  midnight: "Midnight",
  mono: "Mono",
};

export const PALETTE_DESCRIPTIONS: Record<Palette, string> = {
  steel: "Bleu acier · le plus sobre",
  spectrum: "Indigo + corail + ambre + sarcelle",
  sunset: "Terracotta + prune + or · éditorial chaud",
  citrus: "Menthe + corail + citron · frais",
  terracotta: "Crème chaud + terracotta",
  editorial: "Papier blanc + encre + brique",
  forest: "Vert profond + sable + bronze",
  midnight: "Bleu nuit + cyan électrique",
  mono: "Gris neutre + magenta",
};

// Hex preview pour les swatches sur la page Settings (accent light-mode de chaque palette).
export const PALETTE_SWATCH: Record<Palette, string> = {
  steel: "#1f5fd1",
  spectrum: "#3a44d4",
  sunset: "#c84e2c",
  citrus: "#1aa37a",
  terracotta: "#a86c45",
  editorial: "#a83020",
  forest: "#3d6e4a",
  midnight: "#3a5fb8",
  mono: "#c5377a",
};

// Regroupement visuel pour la page Settings.
export const PALETTE_GROUPS: { tablo: Palette[]; legacy: Palette[] } = {
  tablo: ["steel", "spectrum", "sunset", "citrus"],
  legacy: ["terracotta", "editorial", "forest", "midnight", "mono"],
};
