import Link from "next/link";
import { ROUTES } from "@/lib/auth/routes";
import { LoginForm } from "./login-form";

export default function LoginPage() {
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
            Tablo
          </h1>
          <p className="text-sm text-[var(--ink-3)]">
            Connecte-toi pour accéder à tes dashboards.
          </p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-[var(--ink-3)]">
          Pas encore de compte ?{" "}
          <Link
            href={ROUTES.SIGNUP}
            className="text-[var(--accent)] hover:underline"
          >
            S&apos;inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}
