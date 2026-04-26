import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <h1 className="text-xl font-semibold">Dashboard demo</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Sign in with the demo credentials below.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
