"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { TabloWordmark } from "@/components/tablo-wordmark";

/**
 * Shell mobile : sidebar en drawer caché par défaut < lg, top-bar mobile
 * avec hamburger + wordmark. Sur lg+, sidebar visible inline et top-bar
 * masquée.
 *
 * Sidebar passée en prop (Server Component résolu) — rendue une seule fois
 * comme nœud React, mais son markup apparaît dans deux conteneurs (un
 * desktop hidden < lg, un mobile drawer hidden ≥ lg). React optimise.
 */
export function MobileShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Ferme le drawer à chaque changement de route — pattern "Adjusting State
  // Based on Props" via in-render setState.
  // https://react.dev/learn/you-might-not-need-an-effect
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  // Bloque le scroll du body quand le drawer est ouvert (mobile UX).
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [open]);

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar desktop — visible inline ≥ lg */}
      <div className="hidden lg:block">{sidebar}</div>

      {/* Sidebar mobile — drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-40 lg:hidden transform transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
      >
        {sidebar}
      </div>

      {/* Backdrop mobile */}
      {open ? (
        <div
          aria-hidden
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {/* Main column — content + top-bar mobile */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        {/* Top-bar mobile (uniquement < lg) */}
        <header
          className="sticky top-0 z-20 flex items-center gap-3 border-b px-4 py-2.5 lg:hidden"
          style={{
            background: "var(--bg)",
            borderColor: "var(--line)",
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Ouvrir le menu"
            aria-expanded={open}
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-[var(--surface-2)]"
            style={{ color: "var(--ink-2)" }}
          >
            <MenuIcon />
          </button>
          <TabloWordmark size="sm" />
          <div className="ml-auto" />
        </header>
        {children}
      </div>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
