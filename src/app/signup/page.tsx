import Link from "next/link";
import { ROUTES } from "@/lib/auth/routes";
import { SignUpForm } from "./signup-form";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div
        className="flex w-full max-w-sm flex-col gap-6 border border-[var(--line)] bg-[var(--surface)] p-8"
        style={{
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-[var(--ink)]">
            Créer un compte
          </h1>
          <p className="text-sm text-[var(--ink-3)]">
            Construis ton premier dashboard en quelques minutes.
          </p>
        </div>
        <SignUpForm />
        <p className="text-center text-sm text-[var(--ink-3)]">
          Déjà inscrit ?{" "}
          <Link
            href={ROUTES.LOGIN}
            className="text-[var(--accent)] hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
