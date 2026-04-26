"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  RADII,
  RADIUS_COOKIE,
  THEME_COOKIE,
  THEMES,
  type Radius,
  type Theme,
  type Tweaks,
} from "./tweaks-types";

const ONE_YEAR_S = 60 * 60 * 24 * 365;

export async function readTweaks(): Promise<Tweaks> {
  const store = await cookies();
  const themeRaw = store.get(THEME_COOKIE)?.value;
  const radiusRaw = store.get(RADIUS_COOKIE)?.value;
  const theme = (THEMES as readonly string[]).includes(themeRaw ?? "")
    ? (themeRaw as Theme)
    : "light";
  const radius = (RADII as readonly string[]).includes(radiusRaw ?? "")
    ? (radiusRaw as Radius)
    : "soft";
  return { theme, radius };
}

export async function setTheme(theme: Theme): Promise<void> {
  const store = await cookies();
  store.set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: ONE_YEAR_S,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

export async function setRadius(radius: Radius): Promise<void> {
  const store = await cookies();
  store.set(RADIUS_COOKIE, radius, {
    path: "/",
    maxAge: ONE_YEAR_S,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

export async function toggleTheme(): Promise<void> {
  const { theme } = await readTweaks();
  await setTheme(theme === "light" ? "dark" : "light");
}
