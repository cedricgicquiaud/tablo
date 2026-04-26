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
            Dashboard demo
          </h1>
          <p className="text-sm text-[var(--ink-3)]">
            Sign in with the demo credentials below.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
