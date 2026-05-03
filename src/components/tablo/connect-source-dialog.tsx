"use client";

/**
 * `<ConnectSourceDialog>` — Phase 14.4 C1.
 *
 * Modale "Connecter une source" : grille 3×3 logos (9 fournisseurs).
 * 2 implémentés (Supabase, Stripe) → liens directs vers `/oauth/<provider>/start`.
 * 7 "Bientôt" → toast neutre, modale reste ouverte.
 *
 * Logos via `simple-icons` (render manuel SVG path) sauf Salesforce + Excel
 * fallback Lucide (politique brand simple-icons).
 */

import * as React from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Cloud, FileSpreadsheet } from "lucide-react";
import {
  siAirtable,
  siGooglesheets,
  siHubspot,
  siNotion,
  siShopify,
  siStripe,
  siSupabase,
} from "simple-icons";
import { toast } from "sonner";

type SimpleIcon = { hex: string; path: string; title?: string };

type ProviderEntry = {
  slug: string;
  name: string;
  status: "active" | "soon";
  href?: string; // si active
  icon: { kind: "simple-icon"; data: SimpleIcon } | { kind: "lucide"; component: React.ComponentType<{ className?: string }> };
};

// Ordre acté SPEC R2 : implémentés en haut, alphabétique pour Bientôt.
const PROVIDERS: ProviderEntry[] = [
  { slug: "supabase", name: "Supabase", status: "active", href: "/oauth/supabase/start", icon: { kind: "simple-icon", data: siSupabase } },
  { slug: "stripe", name: "Stripe", status: "active", href: "/oauth/stripe/start", icon: { kind: "simple-icon", data: siStripe } },
  { slug: "airtable", name: "Airtable", status: "soon", icon: { kind: "simple-icon", data: siAirtable } },
  { slug: "googlesheets", name: "Google Sheets", status: "soon", icon: { kind: "simple-icon", data: siGooglesheets } },
  { slug: "excel", name: "Excel", status: "soon", icon: { kind: "lucide", component: FileSpreadsheet } },
  { slug: "hubspot", name: "HubSpot", status: "soon", icon: { kind: "simple-icon", data: siHubspot } },
  { slug: "salesforce", name: "Salesforce", status: "soon", icon: { kind: "lucide", component: Cloud } },
  { slug: "notion", name: "Notion", status: "soon", icon: { kind: "simple-icon", data: siNotion } },
  { slug: "shopify", name: "Shopify", status: "soon", icon: { kind: "simple-icon", data: siShopify } },
];

function ProviderIcon({ provider }: { provider: ProviderEntry }) {
  if (provider.icon.kind === "simple-icon") {
    const { hex, path } = provider.icon.data;
    return (
      <svg
        viewBox="0 0 24 24"
        width={40}
        height={40}
        fill={`#${hex}`}
        aria-hidden="true"
      >
        <path d={path} />
      </svg>
    );
  }
  const LucideIcon = provider.icon.component;
  return <LucideIcon className="h-10 w-10" />;
}

export type ConnectSourceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ConnectSourceDialog({ open, onOpenChange }: ConnectSourceDialogProps) {
  const handleSoonClick = (name: string) => {
    toast(`Connecteur ${name} en développement, dispo prochainement`);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-xl outline-none">
          <Dialog.Title className="text-lg font-semibold mb-1">
            Connecter une source
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground mb-5">
            Choisis le fournisseur de données à connecter.
          </Dialog.Description>

          <div className="grid grid-cols-3 gap-3 mb-5">
            {PROVIDERS.map((p) =>
              p.status === "active" ? (
                <a
                  key={p.slug}
                  href={p.href}
                  className="flex flex-col items-center gap-2 rounded-md border p-4 transition-colors hover:bg-accent hover:border-accent focus:outline-none focus:ring-2 focus:ring-ring"
                  data-testid={`provider-${p.slug}`}
                >
                  <ProviderIcon provider={p} />
                  <span className="text-sm font-medium">{p.name}</span>
                </a>
              ) : (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => handleSoonClick(p.name)}
                  className="relative flex flex-col items-center gap-2 rounded-md border p-4 opacity-50 cursor-not-allowed transition-opacity hover:opacity-60"
                  data-testid={`provider-${p.slug}`}
                >
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Bientôt
                  </span>
                  <ProviderIcon provider={p} />
                  <span className="text-sm font-medium">{p.name}</span>
                </button>
              ),
            )}
          </div>

          <div className="flex justify-end">
            <Dialog.Close
              render={(props) => (
                <button
                  {...props}
                  type="button"
                  className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
                >
                  Annuler
                </button>
              )}
            />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
