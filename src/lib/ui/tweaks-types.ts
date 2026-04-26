export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const RADII = ["sharp", "soft", "pill"] as const;
export type Radius = (typeof RADII)[number];

export type Tweaks = {
  theme: Theme;
  radius: Radius;
};

export const THEME_COOKIE = "dashboard.theme";
export const RADIUS_COOKIE = "dashboard.radius";
