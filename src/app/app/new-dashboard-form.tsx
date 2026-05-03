"use client";

import { useActionState } from "react";
import {
  createDashboard,
  type CreateDashboardState,
} from "@/lib/tablo/dashboard-actions";

const initialState: CreateDashboardState = { error: null };

export function NewDashboardForm({ compact = false }: { compact?: boolean }) {
  const [state, formAction, isPending] = useActionState(createDashboard, initialState);

  if (compact) {
    return (
      <form action={formAction} className="flex w-full flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            name="name"
            required
            maxLength={80}
            placeholder="Nom du dashboard"
            className="flex-1 rounded-[var(--radius-tag-sm)] border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={isPending}
            aria-label="Créer un dashboard"
            className="flex h-[28px] w-[28px] items-center justify-center rounded-[var(--radius-tag-sm)] bg-[var(--accent)] text-[var(--bg)] hover:bg-[var(--accent-2)] disabled:opacity-50"
          >
            {isPending ? "…" : "+"}
          </button>
        </div>
        {state.error ? (
          <span className="px-1 text-[10px] text-[var(--negative)]" role="alert">
            {state.error}
          </span>
        ) : null}
      </form>
    );
  }

  return (
    <form action={formAction} className="flex w-full max-w-md items-start gap-2">
      <label className="flex flex-1 flex-col gap-1.5">
        <input
          type="text"
          name="name"
          required
          maxLength={80}
          placeholder="Nom du dashboard (ex : Métriques produit)"
          className="rounded-[var(--radius-tag-sm)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]"
        />
        {state.error ? (
          <span className="text-xs text-[var(--negative)]" role="alert">
            {state.error}
          </span>
        ) : null}
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-[var(--radius-tag-sm)] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--bg)] hover:bg-[var(--accent-2)] disabled:opacity-50"
      >
        {isPending ? "…" : "Créer"}
      </button>
    </form>
  );
}
