import type { ConnectionSummary } from "@/lib/queries/pinpoint";

const KIND_LABELS: Record<string, string> = {
  demo: "Demo",
  supabase: "Supabase",
  postgres: "Postgres",
  csv: "CSV",
};

export function ConnectionsList({ connections }: { connections: ConnectionSummary[] }) {
  return (
    <div className="flex flex-col gap-0.5">
      {connections.map((c) => (
        <div
          key={c.id}
          className="flex items-center justify-between rounded-md px-2 py-1 text-[12px] text-[var(--ink-2)]"
        >
          <span className="flex items-center gap-1.5 truncate">
            <span
              aria-hidden
              className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                c.status === "active" ? "bg-[var(--positive)]" : "bg-[var(--negative)]"
              }`}
            />
            <span className="truncate">{c.name}</span>
          </span>
          <span
            className="ml-2 flex-shrink-0 text-[10px] uppercase tracking-wider text-[var(--ink-4)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {KIND_LABELS[c.kind] ?? c.kind}
          </span>
        </div>
      ))}
      <a
        href="/oauth/supabase/start"
        className="mt-1 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] text-[var(--ink-3)] hover:bg-[var(--surface-3)] hover:text-[var(--ink)]"
      >
        <span aria-hidden>+</span>
        <span>Connecter Supabase</span>
      </a>
    </div>
  );
}
