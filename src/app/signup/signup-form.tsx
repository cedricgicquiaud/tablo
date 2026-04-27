"use client";

import { useActionState } from "react";
import { signUp, type SignUpState } from "./actions";

const initialState: SignUpState = { error: null };

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUp, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[var(--ink-2)]">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="rounded-[var(--radius-tag-sm)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[var(--ink-2)]">Mot de passe</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="new-password"
          minLength={8}
          className="rounded-[var(--radius-tag-sm)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]"
        />
        <span className="text-[11px] text-[var(--ink-3)]">8 caractères minimum</span>
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-[var(--negative)]">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="mt-2 rounded-[var(--radius-tag-sm)] bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--bg)] transition-colors hover:bg-[var(--accent-2)] disabled:opacity-50"
      >
        {isPending ? "Création…" : "Créer mon compte"}
      </button>
    </form>
  );
}
