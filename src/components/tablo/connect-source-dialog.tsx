"use client";

/**
 * `<ConnectSourceDialog>` — Phase 14.4 C1.
 *
 * Modale "Connecter une source" : liste verticale de 9 fournisseurs.
 * Pattern select-then-submit (cf `/onboarding/select-project`) :
 *  - Click sur un fournisseur actif → état sélectionné (checkbox + border accent)
 *  - Click sur "Connecter <Name>" footer → redirect /oauth/<provider>/start
 *  - Click sur fournisseur "soon" → toast, pas de sélection.
 *
 * Logos via `simple-icons` (render manuel SVG path) sauf Salesforce + Excel
 * fallback Lucide (politique brand simple-icons).
 */

import * as React from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Cloud, FileSpreadsheet, Plug2 } from "lucide-react";
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
  href?: string;
  icon:
    | { kind: "simple-icon"; data: SimpleIcon }
    | { kind: "lucide"; component: React.ComponentType<{ className?: string }> };
};

const PROVIDERS: ProviderEntry[] = [
  { slug: "supabase",     name: "Supabase",      status: "active", href: "/oauth/supabase/start", icon: { kind: "simple-icon", data: siSupabase } },
  { slug: "stripe",       name: "Stripe",        status: "active", href: "/oauth/stripe/start",   icon: { kind: "simple-icon", data: siStripe } },
  { slug: "airtable",     name: "Airtable",      status: "active", href: "/oauth/airtable/start", icon: { kind: "simple-icon", data: siAirtable } },
  { slug: "googlesheets", name: "Google Sheets", status: "soon",   icon: { kind: "simple-icon", data: siGooglesheets } },
  { slug: "excel",        name: "Excel",         status: "soon",   icon: { kind: "lucide", component: FileSpreadsheet } },
  { slug: "hubspot",      name: "HubSpot",       status: "soon",   icon: { kind: "simple-icon", data: siHubspot } },
  { slug: "salesforce",   name: "Salesforce",    status: "soon",   icon: { kind: "lucide", component: Cloud } },
  { slug: "notion",       name: "Notion",        status: "soon",   icon: { kind: "simple-icon", data: siNotion } },
  { slug: "shopify",      name: "Shopify",       status: "soon",   icon: { kind: "simple-icon", data: siShopify } },
];

const ACTIVE_COUNT = PROVIDERS.filter((p) => p.status === "active").length;

function ProviderIcon({ provider, size = 18 }: { provider: ProviderEntry; size?: number }) {
  if (provider.icon.kind === "simple-icon") {
    const { hex, path } = provider.icon.data;
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill={`#${hex}`} aria-hidden="true">
        <path d={path} />
      </svg>
    );
  }
  const LucideIcon = provider.icon.component;
  return <LucideIcon className="h-[18px] w-[18px]" />;
}

function ProviderMark({ provider }: { provider: ProviderEntry }) {
  return (
    <div
      className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-md"
      style={{ background: "var(--surface-2)" }}
    >
      <ProviderIcon provider={provider} />
    </div>
  );
}

export type ConnectSourceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ConnectSourceDialog({ open, onOpenChange }: ConnectSourceDialogProps) {
  const [selectedSlug, setSelectedSlug] = React.useState<string | null>(null);

  // Reset selection à chaque ouverture pour éviter une sélection persistante.
  React.useEffect(() => {
    if (!open) setSelectedSlug(null);
  }, [open]);

  const selected = React.useMemo(
    () => PROVIDERS.find((p) => p.slug === selectedSlug && p.status === "active") ?? null,
    [selectedSlug],
  );

  const handleSoonClick = (name: string) => {
    toast(`Connecteur ${name} en développement, dispo prochainement`);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className="fixed inset-0 z-40"
          style={{ background: "color-mix(in oklab, var(--ink) 32%, transparent)" }}
        />
        <Dialog.Popup
          className="fixed left-1/2 top-1/2 z-50 flex w-[min(580px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[12px] border shadow-2xl outline-none"
          style={{ background: "var(--surface)", borderColor: "var(--line)" }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3.5 border-b px-6 py-4"
            style={{ borderColor: "var(--line)" }}
          >
            <div
              className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-md"
              style={{ background: "color-mix(in oklab, var(--accent) 14%, transparent)" }}
            >
              <Plug2 className="h-[18px] w-[18px]" style={{ color: "var(--accent)" }} />
            </div>
            <div className="flex-1">
              <Dialog.Title
                className="text-[15px] font-semibold tracking-[-0.01em]"
                style={{ color: "var(--ink)" }}
              >
                Connecter une source
              </Dialog.Title>
              <Dialog.Description
                className="mt-0.5 font-mono text-[11px]"
                style={{ color: "var(--ink-3)" }}
              >
                {PROVIDERS.length} connecteurs · {ACTIVE_COUNT} disponibles · choisis un fournisseur
              </Dialog.Description>
            </div>
            <Dialog.Close
              render={(props) => (
                <button
                  {...props}
                  type="button"
                  aria-label="Fermer"
                  className="grid h-7 w-7 place-items-center rounded-md border transition-colors"
                  style={{
                    borderColor: "var(--line)",
                    color: "var(--ink-3)",
                    background: "transparent",
                  }}
                >
                  <CloseIcon />
                </button>
              )}
            />
          </div>

          {/* Section + liste */}
          <div className="flex flex-col gap-3 px-6 pt-5 pb-4">
            <div className="flex items-center justify-between">
              <span
                className="font-mono text-[10.5px] uppercase tracking-[0.08em]"
                style={{ color: "var(--ink-3)" }}
              >
                SELECT A SOURCE TO CONNECT
              </span>
              <span
                className="font-mono text-[10.5px] tabular-nums"
                style={{ color: "var(--ink-2)" }}
              >
                {PROVIDERS.length} sources
              </span>
            </div>

            <div className="grid max-h-[420px] grid-cols-2 gap-2 overflow-auto">
              {PROVIDERS.map((p) => (
                <ProviderRow
                  key={p.slug}
                  provider={p}
                  selected={selectedSlug === p.slug}
                  onSelect={() => {
                    if (p.status === "soon") {
                      handleSoonClick(p.name);
                      return;
                    }
                    setSelectedSlug(p.slug);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center gap-2.5 border-t px-6 py-3.5"
            style={{ background: "var(--surface-2)", borderColor: "var(--line)" }}
          >
            <span
              className="font-mono text-[11px]"
              style={{ color: "var(--ink-3)" }}
            >
              {selected ? `${selected.name} ready` : "select a source to connect"}
            </span>
            <span className="flex-1" />
            <Dialog.Close
              render={(props) => (
                <button
                  {...props}
                  type="button"
                  className="rounded-md border px-3 py-1.5 text-[12.5px]"
                  style={{
                    borderColor: "var(--line-2)",
                    color: "var(--ink-2)",
                    background: "var(--surface)",
                  }}
                >
                  Annuler
                </button>
              )}
            />
            {selected ? (
              <a
                href={selected.href}
                data-testid="connect-submit"
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-[12.5px] font-medium"
                style={{
                  background: "var(--accent)",
                  color: "var(--bg)",
                }}
              >
                Connecter {selected.name}
                <ArrowUpRightIcon />
              </a>
            ) : (
              <button
                type="button"
                disabled
                data-testid="connect-submit-disabled"
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-[12.5px] font-medium opacity-50"
                style={{
                  background: "var(--accent)",
                  color: "var(--bg)",
                }}
              >
                Connecter
                <ArrowUpRightIcon />
              </button>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ─────────── Row ─────────── */

function ProviderRow({
  provider,
  selected,
  onSelect,
}: {
  provider: ProviderEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  const isSoon = provider.status === "soon";
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`provider-${provider.slug}`}
      aria-pressed={selected}
      className={`group flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-left transition-colors ${
        isSoon ? "cursor-not-allowed" : ""
      }`}
      style={{
        background: selected ? "var(--accent-4)" : "var(--surface)",
        borderColor: selected ? "var(--accent)" : "var(--line)",
        opacity: isSoon ? 0.6 : 1,
      }}
    >
      <CheckboxMark checked={selected} dim={isSoon} />
      <ProviderMark provider={provider} />
      <span
        className="font-mono text-[12.5px] font-semibold"
        style={{ color: isSoon ? "var(--ink-2)" : "var(--ink)" }}
      >
        {provider.name}
      </span>
      <span className="flex-1" />
      {isSoon ? (
        <span
          className="rounded-[3px] px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.08em]"
          style={{
            background: "var(--surface-2)",
            color: "var(--ink-3)",
            border: "1px solid var(--line)",
          }}
        >
          Bientôt
        </span>
      ) : null}
    </button>
  );
}

function CheckboxMark({ checked, dim }: { checked: boolean; dim: boolean }) {
  return (
    <span
      className="grid h-4 w-4 flex-shrink-0 place-items-center rounded-[4px] border-2 transition-colors"
      style={{
        borderColor: checked ? "var(--accent)" : "var(--line-2)",
        background: checked ? "var(--accent)" : "transparent",
        opacity: dim ? 0.7 : 1,
      }}
    >
      {checked ? (
        <svg
          width={11}
          height={11}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--bg)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : null}
    </span>
  );
}

/* ─────────── Icons ─────────── */

function CloseIcon() {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}
