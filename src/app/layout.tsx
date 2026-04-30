import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { readTweaks } from "@/lib/ui/tweaks";

// Tablo Design System : Inter Tight (UI display) + JetBrains Mono (code/labels mono).
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dashboard demo — E-commerce",
  description: "Template Next.js + Supabase pour dashboards e-commerce.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { mode, palette, radius } = await readTweaks();
  return (
    <html
      lang="fr"
      data-mode={mode}
      data-palette={palette}
      data-radius={radius}
      className={`${interTight.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
