"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "./actions";

const initialState: SignInState = { error: null };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[var(--ink-2)]">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          defaultValue="demo@demo.io"
          className="rounded-[var(--radius-tag-sm)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[var(--ink-2)]">Password</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          defaultValue="demodemo"
          className="rounded-[var(--radius-tag-sm)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_30%,transparent)]"
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-[var(--negative)]">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="mt-2 rounded-[var(--radius-tag-sm)] bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[oklch(0.99_0.001_106.4231)] transition-colors hover:bg-[var(--accent-2)] disabled:opacity-50"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
