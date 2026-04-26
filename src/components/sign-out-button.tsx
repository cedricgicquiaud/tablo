import { signOut } from "@/app/login/actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-[var(--radius-tag-sm)] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--ink-2)] hover:bg-[var(--surface-3)]"
      >
        Sign out
      </button>
    </form>
  );
}
