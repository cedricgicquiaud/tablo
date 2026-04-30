import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Design handoff bundle: prototype JSX/CSS, not production code.
    "design_handoff_dashboard_widgets/**",
    // Tablo Design System: prototype JSX (refs visuelles), non builé.
    "Tablo Design System/**",
  ]),
]);

export default eslintConfig;
