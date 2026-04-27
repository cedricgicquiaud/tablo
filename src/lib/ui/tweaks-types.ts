export const MODES = ["light", "dark"] as const;
export type Mode = (typeof MODES)[number];

export const PALETTES = ["terracotta", "editorial", "forest", "midnight", "mono"] as const;
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
  terracotta: "Terracotta",
  editorial: "Editorial",
  forest: "Forest",
  midnight: "Midnight",
  mono: "Mono",
};
