"use client";

/**
 * Écran "Génération en cours" pour le starter dashboard — Phase 18 Cycle C.
 *
 * Affiché quand `starter_generating_at` est posée et `starter_generated_at`
 * est encore NULL. Polling 2s via `router.refresh()` qui re-fetch le Server
 * Component parent (page.tsx). Disparaît automatiquement quand la génération
 * termine (re-render avec `starter_generated_at` posée).
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SectionLabel } from "@/components/section-label";

const POLL_INTERVAL_MS = 2000;
const EXPECTED_TOTAL = 5; // Cf. STARTER_KITS — affichage indicatif.

export function StarterProgress({ widgetsPinned }: { widgetsPinned: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  const progress = Math.min(widgetsPinned, EXPECTED_TOTAL);
  const percentage = Math.round((progress / EXPECTED_TOTAL) * 100);

  return (
    <>
      <SectionLabel
        label="GÉNÉRATION"
        right={`${progress}/${EXPECTED_TOTAL} widgets`}
      />
      <section
        className="flex min-h-[55vh] flex-col items-center justify-center gap-6 border border-dashed p-10 text-center"
        style={{
          borderColor: "var(--line-2)",
          borderRadius: "var(--radius)",
          background: "var(--surface-2)",
        }}
        aria-live="polite"
        aria-busy="true"
      >
        <div
          className="grid h-12 w-12 place-items-center rounded-full animate-pulse"
          style={{
            background: "var(--accent-4)",
            color: "var(--accent)",
          }}
          aria-hidden
        >
          <SparkleIcon />
        </div>

        <div className="flex flex-col items-center gap-2">
          <h2 className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--ink-3)]">
            GÉNÉRATION EN COURS
          </h2>
          <p className="max-w-md text-sm text-[var(--ink-2)]">
            L&apos;IA construit ton dashboard de base à partir de tes données.
            <br />
            <span className="text-xs text-[var(--ink-3)]">
              Cela prend ~30 secondes.
            </span>
          </p>
        </div>

        <div className="w-full max-w-xs">
          <div
            className="h-2 w-full overflow-hidden rounded-full"
            style={{ background: "var(--line-2)" }}
          >
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{
                width: `${percentage}%`,
                background: "var(--accent)",
              }}
            />
          </div>
          <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-3)]">
            {progress}/{EXPECTED_TOTAL} widgets épinglés
          </div>
        </div>
      </section>
    </>
  );
}

function SparkleIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3l1.6 4.6L18 9l-4.4 1.4L12 15l-1.6-4.6L6 9l4.4-1.4z" />
      <path d="M19 14l.7 1.8L21.5 16l-1.8.7L19 18l-.7-1.8L16.5 16l1.8-.7z" />
    </svg>
  );
}
