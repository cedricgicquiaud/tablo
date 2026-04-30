import { describe, it, expect, vi, beforeEach } from "vitest";

type CookieValue = { value: string };
type CookieStore = {
  get: (name: string) => CookieValue | undefined;
  set: (name: string, value: string, opts?: unknown) => void;
};

// Mocking next/headers : un store en mémoire qu'on contrôle par test.
const cookieStore: Map<string, string> = new Map();
const fakeCookies = (): CookieStore => ({
  get: (name) => {
    const v = cookieStore.get(name);
    return v === undefined ? undefined : { value: v };
  },
  set: (name, value) => {
    cookieStore.set(name, value);
  },
});

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => fakeCookies()),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

beforeEach(() => {
  cookieStore.clear();
});

describe("readTweaks · fallbacks", () => {
  it("renvoie steel/light/soft sans cookies", async () => {
    const { readTweaks } = await import("./tweaks");
    const t = await readTweaks();
    expect(t.palette).toBe("steel");
    expect(t.mode).toBe("light");
    expect(t.radius).toBe("soft");
  });

  it("retombe sur steel si cookie palette inconnu", async () => {
    cookieStore.set("dashboard.palette", "foo-bar");
    const { readTweaks } = await import("./tweaks");
    const t = await readTweaks();
    expect(t.palette).toBe("steel");
  });

  it("retombe sur light si cookie mode inconnu", async () => {
    cookieStore.set("dashboard.mode", "neon");
    const { readTweaks } = await import("./tweaks");
    const t = await readTweaks();
    expect(t.mode).toBe("light");
  });

  it("retombe sur soft si cookie radius inconnu", async () => {
    cookieStore.set("dashboard.radius", "round");
    const { readTweaks } = await import("./tweaks");
    const t = await readTweaks();
    expect(t.radius).toBe("soft");
  });

  it("conserve un cookie palette legacy valide (terracotta)", async () => {
    cookieStore.set("dashboard.palette", "terracotta");
    const { readTweaks } = await import("./tweaks");
    const t = await readTweaks();
    expect(t.palette).toBe("terracotta");
  });

  it("conserve un cookie palette Tablo valide (sunset)", async () => {
    cookieStore.set("dashboard.palette", "sunset");
    const { readTweaks } = await import("./tweaks");
    const t = await readTweaks();
    expect(t.palette).toBe("sunset");
  });
});
