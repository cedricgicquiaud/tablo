"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  MODE_COOKIE,
  MODES,
  PALETTE_COOKIE,
  PALETTES,
  RADII,
  RADIUS_COOKIE,
  type Mode,
  type Palette,
  type Radius,
  type Tweaks,
} from "./tweaks-types";

const ONE_YEAR_S = 60 * 60 * 24 * 365;

export async function readTweaks(): Promise<Tweaks> {
  const store = await cookies();
  const modeRaw = store.get(MODE_COOKIE)?.value;
  const paletteRaw = store.get(PALETTE_COOKIE)?.value;
  const radiusRaw = store.get(RADIUS_COOKIE)?.value;
  const mode = (MODES as readonly string[]).includes(modeRaw ?? "")
    ? (modeRaw as Mode)
    : "light";
  const palette = (PALETTES as readonly string[]).includes(paletteRaw ?? "")
    ? (paletteRaw as Palette)
    : "steel";
  const radius = (RADII as readonly string[]).includes(radiusRaw ?? "")
    ? (radiusRaw as Radius)
    : "soft";
  return { mode, palette, radius };
}

export async function setMode(mode: Mode): Promise<void> {
  const store = await cookies();
  store.set(MODE_COOKIE, mode, {
    path: "/",
    maxAge: ONE_YEAR_S,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

export async function setPalette(palette: Palette): Promise<void> {
  const store = await cookies();
  store.set(PALETTE_COOKIE, palette, {
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

export async function toggleMode(): Promise<void> {
  const { mode } = await readTweaks();
  await setMode(mode === "light" ? "dark" : "light");
}
