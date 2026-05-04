import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // alasql (Phase 14.3) require()s `react-native-fetch-blob` côté code RN
  // jamais appelé en serveur Node. On l'exclut du bundling Next.js pour
  // éviter "Module not found" au build (Next.js le require()ra
  // dynamiquement depuis node_modules au runtime, où le code RN ne
  // s'exécute jamais).
  serverExternalPackages: ["alasql"],
};

export default nextConfig;
