import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/lib/crypto/encryption";
import { Icon } from "@/components/widgets/icon";
import { createConnectionFromAirtableBase } from "./actions";
import type { AirtableSessionPayload } from "./create-connection-from-airtable-base";

const SESSION_COOKIE = "tablo_airtable_oauth_session";

export default async function SelectAirtableBasePage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionCookie) redirect("/oauth/airtable/start");

  let session: AirtableSessionPayload;
  try {
    session = JSON.parse(decrypt(sessionCookie)) as AirtableSessionPayload;
  } catch {
    redirect("/oauth/airtable/start");
  }

  // E8 — 0 base accessible
  if (session.bases.length === 0) {
    return (
      <Overlay>
        <ModalCard>
          <ModalHeader subtitle="Aucune base trouvée sur ton compte Airtable" />
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-[var(--ink-2)]">
              Crée une base sur{" "}
              <a
                href="https://airtable.com"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                airtable.com
              </a>{" "}
              puis reviens connecter.
            </p>
          </div>
          <ModalFooter step={2} cancelHref="/app" submitDisabled />
        </ModalCard>
      </Overlay>
    );
  }

  const baseCount = session.bases.length;
  const s = baseCount > 1 ? "s" : "";
  const headerHint =
    baseCount === 1 ? "auto-select possible" : "choisis laquelle connecter";

  return (
    <Overlay>
      <ModalCard>
        <ModalHeader
          subtitle={`${baseCount} base${s} disponible${s} · oauth · ${headerHint}`}
        />

        <div className="border-b px-6 py-4" style={{ borderColor: "var(--line)" }}>
          <ProgressDots step={2} />
        </div>

        <form
          action={createConnectionFromAirtableBase}
          className="flex flex-1 flex-col"
        >
          <div className="flex flex-col gap-3 px-6 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--ink-3)]">
                SELECT A BASE TO SYNC
              </span>
              <span className="font-mono text-[10.5px] tabular-nums text-[var(--ink-2)]">
                {baseCount} base{s}
              </span>
            </div>

            <div className="flex max-h-[300px] flex-col gap-1.5 overflow-auto">
              {session.bases.map((b, i) => (
                <BaseRow
                  key={b.id}
                  base={b}
                  defaultChecked={i === 0}
                />
              ))}
            </div>
          </div>

          <div
            className="mx-6 mt-1 flex items-start gap-2.5 rounded-md border px-3 py-2.5"
            style={{
              background: "var(--surface-2)",
              borderColor: "var(--line)",
            }}
          >
            <span className="mt-px text-[var(--ink-3)]">
              <LockIcon />
            </span>
            <div>
              <div className="text-[12px] font-medium text-[var(--ink)]">
                Read-only access
              </div>
              <p
                className="mt-0.5 font-mono text-[10.5px] leading-relaxed text-[var(--ink-3)]"
              >
                Tablo peut lire les tables de cette base. Aucune écriture, aucun
                schéma modifié.
              </p>
            </div>
          </div>

          <ModalFooter step={2} cancelHref="/app" />
        </form>
      </ModalCard>
    </Overlay>
  );
}

/* ─────────── Sub-components ─────────── */

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 grid place-items-center px-4 py-6"
      style={{
        background: "color-mix(in oklab, var(--ink) 32%, transparent)",
      }}
    >
      {children}
    </div>
  );
}

function ModalCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex w-full max-w-[680px] flex-col overflow-hidden rounded-[12px] border shadow-2xl"
      style={{
        background: "var(--surface)",
        borderColor: "var(--line)",
      }}
    >
      {children}
    </div>
  );
}

function ModalHeader({ subtitle }: { subtitle: string }) {
  return (
    <div
      className="flex items-center gap-3.5 border-b px-6 py-4"
      style={{ borderColor: "var(--line)" }}
    >
      <AirtableMark size={36} />
      <div className="flex-1">
        <div className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--ink)]">
          Connect Airtable
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-[var(--ink-3)]">
          {subtitle}
        </div>
      </div>
      <a
        href="/app"
        aria-label="Fermer"
        className="grid h-7 w-7 place-items-center rounded-md border text-[var(--ink-3)] hover:bg-[var(--surface-2)]"
        style={{ borderColor: "var(--line)" }}
      >
        <Icon name="close" size={14} />
      </a>
    </div>
  );
}

function ProgressDots({ step }: { step: 1 | 2 | 3 }) {
  const labels = ["authorize", "select base", "review"];
  return (
    <div className="flex items-center gap-2">
      {labels.map((label, i) => {
        const idx = (i + 1) as 1 | 2 | 3;
        const done = idx < step;
        const active = idx === step;
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className="grid h-[18px] w-[18px] flex-shrink-0 place-items-center rounded-full"
              style={{
                background: done ? "var(--accent)" : active ? "var(--surface)" : "transparent",
                border: done
                  ? "none"
                  : `1.5px solid ${active ? "var(--accent)" : "var(--line-2)"}`,
                color: "var(--bg)",
              }}
            >
              {done ? (
                <Icon name="check" size={11} />
              ) : active ? (
                <div
                  className="h-[5px] w-[5px] rounded-full"
                  style={{ background: "var(--accent)" }}
                />
              ) : null}
            </div>
            <span
              className="font-mono text-[11px] tracking-[0.02em]"
              style={{
                color: active
                  ? "var(--ink)"
                  : done
                    ? "var(--ink-2)"
                    : "var(--ink-3)",
                fontWeight: active ? 600 : 400,
              }}
            >
              {String(idx).padStart(2, "0")} · {label}
            </span>
            {idx < 3 ? (
              <div
                className="h-px flex-1"
                style={{ background: done ? "var(--accent)" : "var(--line-2)" }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function BaseRow({
  base,
  defaultChecked,
}: {
  base: { id: string; name: string; permissionLevel: string };
  defaultChecked: boolean;
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-3 rounded-md border bg-[var(--surface)] px-3.5 py-2.5 transition-colors hover:border-[var(--ink-4)] has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-4)]">
      <span
        className="grid h-4 w-4 flex-shrink-0 place-items-center rounded-[4px] border-2 transition-colors group-has-[:checked]:border-[var(--accent)] group-has-[:checked]:bg-[var(--accent)]"
        style={{ borderColor: "var(--line-2)" }}
      >
        <span className="hidden text-[var(--bg)] group-has-[:checked]:block">
          <Icon name="check" size={11} />
        </span>
      </span>
      <input
        type="radio"
        name="base_id"
        value={base.id}
        defaultChecked={defaultChecked}
        required
        className="sr-only"
      />
      <span className="font-mono text-[12px] font-semibold text-[var(--ink)]">
        {base.name}
      </span>
      <span className="flex-1" />
      <span className="font-mono text-[10.5px] text-[var(--ink-3)]">
        {base.permissionLevel}
      </span>
      <ChevronRightIcon />
    </label>
  );
}

function ModalFooter({
  step,
  cancelHref,
  submitDisabled = false,
}: {
  step: number;
  cancelHref: string;
  submitDisabled?: boolean;
}) {
  return (
    <div
      className="mt-3 flex items-center gap-2.5 border-t px-6 py-3.5"
      style={{
        background: "var(--surface-2)",
        borderColor: "var(--line)",
      }}
    >
      <span className="font-mono text-[11px] text-[var(--ink-3)]">
        Step {String(step).padStart(2, "0")} / 03
      </span>
      <span className="flex-1" />
      <a
        href={cancelHref}
        className="rounded-md border px-3 py-1.5 text-[12.5px] text-[var(--ink-2)] hover:bg-[var(--surface)]"
        style={{ borderColor: "var(--line-2)" }}
      >
        Annuler
      </a>
      <button
        type="submit"
        disabled={submitDisabled}
        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-[12.5px] font-medium text-[var(--bg)] disabled:opacity-50"
        style={{ background: "var(--accent)" }}
      >
        Connecter cette base
        <ArrowUpRightIcon />
      </button>
    </div>
  );
}

/* ─────────── Icons + marks ─────────── */

function AirtableMark({ size = 36 }: { size?: number }) {
  // Logo Airtable simplifié : 4 quadrants colorés (jaune/rouge/bleu/turquoise).
  // Approximation pour le moment ; remplacement par un vrai SVG officiel possible.
  return (
    <div
      className="grid flex-shrink-0 place-items-center rounded-md"
      style={{
        width: size,
        height: size,
        background: "color-mix(in oklab, var(--accent) 14%, transparent)",
      }}
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        aria-hidden
      >
        <rect x="2" y="3" width="20" height="6" rx="1" fill="#FCB400" />
        <rect x="2" y="11" width="9" height="10" rx="1" fill="#18BFFF" />
        <rect x="13" y="11" width="9" height="4" rx="1" fill="#F82B60" />
        <rect x="13" y="17" width="9" height="4" rx="1" fill="#19C597" />
      </svg>
    </div>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--ink-3)"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}
