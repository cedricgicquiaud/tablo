import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**", "src/components/**"],
    },
    projects: [
      // === unit : tests purs (jsdom, pas de DB)
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./vitest.setup.ts"],
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
        },
      },
      // === db-integration : tests qui truncate + insert leurs propres fixtures
      // → run sur demande via `bun run test:integration` (pas dans `bun run test`)
      // → laisse la DB e-commerce dans un état vide après. Re-seed nécessaire.
      {
        extends: true,
        test: {
          name: "db-integration",
          environment: "node",
          setupFiles: ["./vitest.setup.ts"],
          include: ["tests/db/**/*.test.ts"],
          exclude: ["tests/db/ecommerce-seed.test.ts"],
          testTimeout: 30000,
          hookTimeout: 30000,
          fileParallelism: false,
        },
      },
      // === db-seed : test reproductibilité du seed e-commerce
      // → lourd (~5s), truncate complète. Run via `bun run test:seed`.
      {
        extends: true,
        test: {
          name: "db-seed",
          environment: "node",
          setupFiles: ["./vitest.setup.ts"],
          include: ["tests/db/ecommerce-seed.test.ts"],
          testTimeout: 180000,
          hookTimeout: 180000,
          fileParallelism: false,
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
