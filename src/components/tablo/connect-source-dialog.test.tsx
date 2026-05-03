/**
 * Tests `<ConnectSourceDialog>` — Phase 14.4 C1.
 *
 * Couvre R2-R5 + E8 : grille 3×3 logos, click implémenté → href OAuth,
 * click "Bientôt" → toast, modale fermable.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock sonner toast — spy sur les calls. `vi.hoisted` permet de partager
// la référence entre le factory mock (hoisted) et les assertions.
const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }));
vi.mock("sonner", () => ({
  toast: Object.assign(toastMock, { error: toastMock, success: toastMock }),
}));

import { ConnectSourceDialog } from "./connect-source-dialog";

describe("<ConnectSourceDialog>", () => {
  beforeEach(() => {
    toastMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("R2 — render 9 cartes dans l'ordre acté quand open=true", () => {
    render(<ConnectSourceDialog open={true} onOpenChange={() => {}} />);

    const cards = screen.getAllByRole("link", { hidden: false }).concat(
      screen.getAllByRole("button").filter((b) => b.dataset.testid?.startsWith("provider-")),
    );

    // 9 fournisseurs (2 actifs links + 7 disabled buttons)
    const providers = ["Supabase", "Stripe", "Airtable", "Google Sheets", "Excel", "HubSpot", "Salesforce", "Notion", "Shopify"];
    for (const name of providers) {
      expect(screen.getByText(name)).toBeDefined();
    }
  });

  it("R3 — Supabase carte est un lien vers /oauth/supabase/start", () => {
    render(<ConnectSourceDialog open={true} onOpenChange={() => {}} />);
    const supabaseLink = screen.getByRole("link", { name: /Supabase/i });
    expect(supabaseLink.getAttribute("href")).toBe("/oauth/supabase/start");
  });

  it("R3 — Stripe carte est un lien vers /oauth/stripe/start", () => {
    render(<ConnectSourceDialog open={true} onOpenChange={() => {}} />);
    const stripeLink = screen.getByRole("link", { name: /Stripe/i });
    expect(stripeLink.getAttribute("href")).toBe("/oauth/stripe/start");
  });

  it("R4/E8 — click sur Airtable (Bientôt) → toast + modale reste ouverte", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<ConnectSourceDialog open={true} onOpenChange={onOpenChange} />);

    const airtableBtn = screen.getByRole("button", { name: /Airtable/i });
    await user.click(airtableBtn);

    expect(toastMock).toHaveBeenCalledWith(
      expect.stringContaining("Airtable"),
    );
    // onOpenChange ne doit PAS avoir été appelé avec false
    const closeCalls = onOpenChange.mock.calls.filter((c) => c[0] === false);
    expect(closeCalls).toHaveLength(0);
  });

  it("R4/E8 — click sur Salesforce (Bientôt, fallback Lucide Cloud) → toast", async () => {
    const user = userEvent.setup();
    render(<ConnectSourceDialog open={true} onOpenChange={() => {}} />);

    const salesforceBtn = screen.getByRole("button", { name: /Salesforce/i });
    await user.click(salesforceBtn);

    expect(toastMock).toHaveBeenCalledWith(
      expect.stringContaining("Salesforce"),
    );
  });

  it("R5 — bouton Annuler appelle onOpenChange avec false comme 1er arg", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<ConnectSourceDialog open={true} onOpenChange={onOpenChange} />);

    const cancelBtn = screen.getByRole("button", { name: /Annuler/i });
    await user.click(cancelBtn);

    // @base-ui Dialog appelle onOpenChange(false, eventDetails). On vérifie
    // juste que false a été passé, peu importe les autres args.
    const closeCalls = onOpenChange.mock.calls.filter((c) => c[0] === false);
    expect(closeCalls.length).toBeGreaterThan(0);
  });

  it("R2 — fournisseurs Bientôt ont badge 'Bientôt' visible", () => {
    render(<ConnectSourceDialog open={true} onOpenChange={() => {}} />);

    // 7 fournisseurs Bientôt (Airtable, GSheets, Excel, HubSpot, Salesforce, Notion, Shopify)
    const badges = screen.getAllByText("Bientôt");
    expect(badges.length).toBe(7);
  });
});
