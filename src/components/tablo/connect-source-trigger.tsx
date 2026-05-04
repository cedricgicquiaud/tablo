"use client";

/**
 * `<ConnectSourceTrigger>` — Phase 14.4 C1 T1.0.
 *
 * Wrapper client mince qui :
 *  - Lazy-loade `<ConnectSourceDialog>` via `dynamic()` (RNF2 — pas de gonflement
 *    bundle initial sidebar tant que la modale n'est pas ouverte).
 *  - Tient le state `open` local (Server Component `connections-list.tsx`
 *    importe juste ce composant et reste server, pas de "use client" cascade).
 *  - Affiche le bouton "+ Connecter une source" en sidebar.
 */

import * as React from "react";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";

const ConnectSourceDialog = dynamic(
  () => import("./connect-source-dialog").then((m) => m.ConnectSourceDialog),
  { ssr: false },
);

export function ConnectSourceTrigger() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Connecter une source"
      >
        <Plus className="h-4 w-4" />
        <span>Connecter une source</span>
      </button>
      {open ? <ConnectSourceDialog open={open} onOpenChange={setOpen} /> : null}
    </>
  );
}
