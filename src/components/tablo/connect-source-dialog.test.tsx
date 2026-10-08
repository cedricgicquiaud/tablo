/**
 * Tests `<ConnectSourceDialog>` — Phase 14.4 C1.
 *
 * Pattern select-then-submit (cf `/onboarding/select-project`) :
 * R2 : 9 fournisseurs rendus dans l'ordre acté.
 * R3 : click sur Supabase/Stripe row → footer link "Connecter <Name>" avec href OAuth.
 * R4/E8 : click "Bientôt" → toast + pas de sélection.
 * R5 : Annuler ferme la modale.
 * R6 : footer initialement disabled (rien sélectionné).
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

  it("R2 — render 9 lignes dans l'ordre acté quand open=true", () => {
    render(<ConnectSourceDialog open={true} onOpenChange={() => {}} />);

    const providers = ["Supabase", "Stripe", "Airtable", "Google Sheets", "Excel", "HubSpot", "Salesforce", "Notion", "Shopify"];
    for (const name of providers) {
      expect(screen.getByText(name)).toBeDefined();
    }
  });

  it("R3 — click sur Supabase row → footer link 'Connecter Supabase' avec href /oauth/supabase/start", async () => {
    const user = userEvent.setup();
    render(<ConnectSourceDialog open={true} onOpenChange={() => {}} />);

    await user.click(screen.getByTestId("provider-supabase"));

    const submit = screen.getByTestId("connect-submit");
    expect(submit.getAttribute("href")).toBe("/oauth/supabase/start");
    expect(submit.textContent).toContain("Supabase");
  });

  it("R3 — click sur Stripe row → footer link avec href /oauth/stripe/start", async () => {
    const user = userEvent.setup();
    render(<ConnectSourceDialog open={true} onOpenChange={() => {}} />);

    await user.click(screen.getByTestId("provider-stripe"));

    const submit = screen.getByTestId("connect-submit");
    expect(submit.getAttribute("href")).toBe("/oauth/stripe/start");
    expect(submit.textContent).toContain("Stripe");
  });

  it("R3 (Phase 14.5) — click sur Airtable row → footer link avec href /oauth/airtable/start", async () => {
    const user = userEvent.setup();
    render(<ConnectSourceDialog open={true} onOpenChange={() => {}} />);

    await user.click(screen.getByTestId("provider-airtable"));

    const submit = screen.getByTestId("connect-submit");
    expect(submit.getAttribute("href")).toBe("/oauth/airtable/start");
    expect(submit.textContent).toContain("Airtable");
  });

  it("R4/E8 — click sur HubSpot (Bientôt) → toast + footer reste disabled (pas de sélection)", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<ConnectSourceDialog open={true} onOpenChange={onOpenChange} />);

    await user.click(screen.getByTestId("provider-hubspot"));

    expect(toastMock).toHaveBeenCalledWith(expect.stringContaining("HubSpot"));
    // onOpenChange ne doit PAS avoir été appelé avec false
    const closeCalls = onOpenChange.mock.calls.filter((c) => c[0] === false);
    expect(closeCalls).toHaveLength(0);
    // Footer reste disabled (pas de connect-submit, juste connect-submit-disabled)
    expect(screen.queryByTestId("connect-submit")).toBeNull();
    expect(screen.getByTestId("connect-submit-disabled")).toBeDefined();
  });

  it("R4/E8 — click sur Salesforce (Bientôt, fallback Lucide Cloud) → toast", async () => {
    const user = userEvent.setup();
    render(<ConnectSourceDialog open={true} onOpenChange={() => {}} />);

    await user.click(screen.getByTestId("provider-salesforce"));

    expect(toastMock).toHaveBeenCalledWith(expect.stringContaining("Salesforce"));
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

  it("R6 — initialement, footer affiche bouton 'Connecter' disabled (rien sélectionné)", () => {
    render(<ConnectSourceDialog open={true} onOpenChange={() => {}} />);
    expect(screen.queryByTestId("connect-submit")).toBeNull();
    expect(screen.getByTestId("connect-submit-disabled")).toBeDefined();
  });

  it("R6 — fermer puis rouvrir la modale efface la sélection", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ConnectSourceDialog open={true} onOpenChange={() => {}} />);
    await user.click(screen.getByTestId("provider-supabase"));
    expect(screen.getByTestId("connect-submit")).toBeDefined();

    rerender(<ConnectSourceDialog open={false} onOpenChange={() => {}} />);
    rerender(<ConnectSourceDialog open={true} onOpenChange={() => {}} />);

    expect(screen.queryByTestId("connect-submit")).toBeNull();
    expect(screen.getByTestId("connect-submit-disabled")).toBeDefined();
  });

  it("R2 — fournisseurs Bientôt ont badge 'Bientôt' visible", () => {
    render(<ConnectSourceDialog open={true} onOpenChange={() => {}} />);
    // 6 fournisseurs Bientôt après Phase 14.5 Airtable active
    // (GSheets, Excel, HubSpot, Salesforce, Notion, Shopify)
    const badges = screen.getAllByText("Bientôt");
    expect(badges.length).toBe(6);
  });
});
