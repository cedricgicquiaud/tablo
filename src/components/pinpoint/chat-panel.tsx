"use client";

import { useRef, useState, useTransition } from "react";
import { generateWidget } from "@/lib/ai/generate-widget";
import type { GenerateResult } from "@/lib/ai/generate-widget.types";
import { pinWidget } from "@/lib/pinpoint/widget-actions";
import { DynamicWidget } from "@/components/widgets/dynamic-widget";
import type { WidgetConfig } from "@/lib/ai/widget-schema";
import type { WidgetData } from "@/lib/ai/extract-preview";

const SUGGESTIONS = [
  "Mon revenu de ce mois",
  "Évolution du revenu sur 12 mois",
  "Top catégories par revenu (donut)",
  "Ventes par catégorie réel vs objectif",
];

function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-[var(--ink)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function ExplanationText({ text }: { text: string }) {
  const trimmed = text.trim();
  const parts = trimmed.split(/\s*-\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return <p className="leading-relaxed">{renderInlineBold(trimmed)}</p>;
  }
  const [intro, ...bullets] = parts;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="leading-relaxed">
        {renderInlineBold(intro.replace(/[:：]\s*$/, ""))}
      </p>
      <ul className="flex flex-col gap-0.5 pl-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-1.5 leading-relaxed">
            <span className="text-[var(--ink-3)]">·</span>
            <span>{renderInlineBold(b)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Message =
  | { kind: "user"; text: string; id: number }
  | { kind: "ai-error"; text: string; id: number }
  | {
      kind: "ai-widget";
      explanation: string;
      config: WidgetConfig;
      data: WidgetData;
      tokens: { input: number; output: number };
      pinned: boolean;
      id: number;
    };

export function ChatPanel({ dashboardId }: { dashboardId: string }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, startGenerating] = useTransition();
  const [pinningId, setPinningId] = useState<number | null>(null);
  const [, startPinning] = useTransition();
  const idCounter = useRef(0);

  function nextId(): number {
    idCounter.current += 1;
    return idCounter.current;
  }

  function handleSubmit(text: string) {
    if (!text.trim() || isGenerating) return;
    const userMsg: Message = { kind: "user", text, id: nextId() };
    setMessages((m) => [...m, userMsg]);
    setPrompt("");

    startGenerating(async () => {
      const r: GenerateResult = await generateWidget(text);
      setMessages((m) => {
        if (!r.ok) {
          return [...m, { kind: "ai-error", text: r.error, id: nextId() }];
        }
        return [
          ...m,
          {
            kind: "ai-widget",
            explanation: r.explanation,
            config: r.config,
            data: r.data,
            tokens: r.tokens,
            pinned: false,
            id: nextId(),
          },
        ];
      });
    });
  }

  function handlePin(messageId: number) {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg || msg.kind !== "ai-widget" || msg.pinned) return;
    setPinningId(messageId);
    startPinning(async () => {
      const r = await pinWidget(dashboardId, msg.config);
      setPinningId(null);
      if (r.ok) {
        setMessages((arr) =>
          arr.map((m) =>
            m.id === messageId && m.kind === "ai-widget" ? { ...m, pinned: true } : m,
          ),
        );
      } else {
        setMessages((arr) => [
          ...arr,
          { kind: "ai-error", text: r.error, id: nextId() },
        ]);
      }
    });
  }

  return (
    <>
      {/* Bouton toggle flottant — pill accent avec sparkle, pattern Tablo */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-30 flex h-11 items-center gap-2 rounded-full px-4 text-[13px] font-medium shadow-lg transition-all hover:brightness-110"
        style={{
          background: open ? "var(--surface-2)" : "var(--accent)",
          color: open ? "var(--ink-2)" : "var(--bg)",
          border: open ? "1px solid var(--line)" : "none",
          boxShadow: open
            ? "0 4px 12px -2px rgba(0,0,0,0.1)"
            : "0 6px 16px -4px color-mix(in oklab, var(--accent) 40%, transparent)",
        }}
      >
        {open ? <CloseIcon /> : <SparklesIcon size={14} />}
        {open ? "Fermer" : "Ask"}
        {!open && (
          <span
            className="ml-1 rounded-[3px] px-1.5 font-mono text-[10px]"
            style={{
              background: "color-mix(in oklab, var(--bg) 22%, transparent)",
              color: "var(--bg)",
            }}
          >
            ⌘K
          </span>
        )}
      </button>

      {/* Backdrop mobile uniquement */}
      {open ? (
        <div
          aria-hidden
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {/* Panel side — pattern Tablo 04-chat */}
      <aside
        className={`fixed right-0 top-0 z-30 flex h-screen w-full max-w-[400px] transform flex-col border-l transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          background: "var(--surface)",
          borderColor: "var(--line)",
        }}
      >
        {/* Header — accent circle + Ask Tablo + thread metadata mono */}
        <div
          className="flex items-center gap-2.5 border-b px-4 py-3"
          style={{ borderColor: "var(--line)" }}
        >
          <div
            className="grid h-6 w-6 place-items-center rounded-full"
            style={{ background: "var(--accent)" }}
          >
            <SparklesIcon size={13} color="var(--bg)" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-semibold text-[var(--ink)]">
              Ask
            </span>
            <span className="font-mono text-[10px] text-[var(--ink-3)]">
              thread · {messages.length} message{messages.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fermer"
            className="rounded-md p-1 text-[var(--ink-3)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Conversation thread */}
        <div
          className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-3.5 py-4"
          style={{ background: "var(--surface-2)" }}
        >
          {messages.length === 0 ? (
            <EmptyHint />
          ) : (
            <>
              <ThreadDivider label="MAINTENANT" />
              {messages.map((m) => {
                if (m.kind === "user") {
                  return <UserBubble key={m.id} text={m.text} />;
                }
                if (m.kind === "ai-error") {
                  return <ErrorBubble key={m.id} text={m.text} />;
                }
                const isPinning = pinningId === m.id;
                return (
                  <AiWidgetBubble
                    key={m.id}
                    message={m}
                    isPinning={isPinning}
                    onPin={() => handlePin(m.id)}
                  />
                );
              })}
            </>
          )}
          {isGenerating ? <TypingBubble /> : null}
        </div>

        {/* Footer : context chips (suggestions) + input + hint */}
        <div
          className="border-t px-3 pb-3 pt-2.5"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          {/* Suggestions / context chips */}
          {messages.length === 0 ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handleSubmit(s)}
                  className="rounded-full border px-2.5 py-1 font-mono text-[10.5px] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
                  style={{
                    borderColor: "var(--line-2)",
                    color: "var(--ink-3)",
                    background: "var(--surface-2)",
                    borderStyle: "dashed",
                  }}
                >
                  + {s}
                </button>
              ))}
            </div>
          ) : null}

          {/* Input row */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(prompt);
            }}
            className="flex items-center gap-2 rounded-[var(--radius-md)] border px-2.5 py-2"
            style={{
              borderColor: "var(--line-2)",
              background: "var(--bg)",
            }}
          >
            <SparklesIcon size={13} color="var(--accent)" />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask anything about your data…"
              disabled={isGenerating}
              className="flex-1 bg-transparent text-[12.5px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-3)] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              aria-label="Envoyer"
              className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full transition-colors disabled:opacity-50"
              style={{
                background: "var(--accent)",
                color: "var(--bg)",
                boxShadow:
                  "0 0 0 4px color-mix(in oklab, var(--accent) 12%, transparent)",
              }}
            >
              <ArrowUpIcon />
            </button>
          </form>

          <div
            className="mt-2 text-center font-mono text-[9.5px] tracking-[0.04em]"
            style={{ color: "var(--ink-3)" }}
          >
            ⌘↵ pour envoyer
          </div>
        </div>
      </aside>
    </>
  );
}

/* ─────────── Sub-components ─────────── */

function EmptyHint() {
  return (
    <div
      className="rounded-[var(--radius-md)] border border-dashed p-4 text-center"
      style={{ borderColor: "var(--line-2)" }}
    >
      <div
        className="mx-auto grid h-8 w-8 place-items-center rounded-full"
        style={{ background: "var(--accent-4)", color: "var(--accent)" }}
      >
        <SparklesIcon size={14} />
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink-3)]">
        DEMANDE EN FRANÇAIS
      </p>
      <p className="mt-1 text-[12px] text-[var(--ink-2)]">
        Pioche une suggestion ↓ ou tape ta question.
      </p>
    </div>
  );
}

function ThreadDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      <span
        className="font-mono text-[9.5px] uppercase tracking-[0.08em]"
        style={{ color: "var(--ink-3)" }}
      >
        {label}
      </span>
      <div className="h-px flex-1" style={{ background: "var(--line)" }} />
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[85%] px-3 py-2 text-[12.5px]"
        style={{
          background: "var(--ink)",
          color: "var(--bg)",
          borderRadius: "10px 10px 2px 10px",
        }}
      >
        {text}
      </div>
    </div>
  );
}

function ErrorBubble({ text }: { text: string }) {
  return (
    <div
      role="alert"
      className="max-w-[90%] self-start px-3 py-2 text-[12.5px]"
      style={{
        background: "color-mix(in oklab, var(--negative) 10%, transparent)",
        color: "var(--negative)",
        border: "1px solid color-mix(in oklab, var(--negative) 30%, transparent)",
        borderRadius: "10px 10px 10px 2px",
      }}
    >
      {text}
    </div>
  );
}

type AiWidgetMessage = Extract<Message, { kind: "ai-widget" }>;

function AiWidgetBubble({
  message,
  isPinning,
  onPin,
}: {
  message: AiWidgetMessage;
  isPinning: boolean;
  onPin: () => void;
}) {
  const totalTokens = message.tokens.input + message.tokens.output;
  return (
    <div className="flex w-full flex-col gap-2 self-start">
      {/* AI header inline (sparkle + meta mono) */}
      <div className="flex items-center gap-1.5">
        <SparklesIcon size={11} color="var(--accent)" />
        <span
          className="font-mono text-[9.5px] uppercase tracking-[0.06em]"
          style={{ color: "var(--ink-3)" }}
        >
          TABLO · {totalTokens} tokens
        </span>
      </div>

      {message.explanation?.trim() ? (
        <div
          className="max-w-[92%] px-3 py-2 text-[12.5px]"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            color: "var(--ink-2)",
            borderRadius: "10px 10px 10px 2px",
          }}
        >
          <ExplanationText text={message.explanation} />
        </div>
      ) : null}

      {/* Widget preview */}
      <div className="w-full overflow-hidden rounded-[var(--radius-md)] border" style={{ borderColor: "var(--line)" }}>
        <DynamicWidget config={message.config} data={message.data} />
      </div>

      {/* Action buttons — Tablo style (Pin / Share / SQL) */}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={onPin}
          disabled={isPinning || message.pinned}
          className="flex items-center gap-1 rounded-[4px] px-2 py-1 text-[10.5px] font-medium transition-colors disabled:opacity-60"
          style={{
            background: message.pinned ? "var(--accent-4)" : "var(--accent)",
            color: message.pinned ? "var(--accent-2)" : "var(--bg)",
            border: message.pinned ? "1px solid var(--accent-3)" : "none",
          }}
        >
          {message.pinned ? <CheckIcon /> : <PinIcon />}
          {message.pinned ? "Épinglé" : "Pin to dashboard"}
        </button>
        <button
          type="button"
          disabled
          className="flex items-center gap-1 rounded-[4px] border px-2 py-1 text-[10.5px] opacity-60"
          style={{ borderColor: "var(--line-2)", color: "var(--ink-3)" }}
          title="Bientôt"
        >
          <ShareIcon /> Share
        </button>
        <button
          type="button"
          disabled
          className="flex items-center gap-1 rounded-[4px] border px-2 py-1 text-[10.5px] opacity-60"
          style={{ borderColor: "var(--line-2)", color: "var(--ink-3)" }}
          title="Bientôt"
        >
          <CodeIcon /> SQL
        </button>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div
      className="flex items-center gap-1.5 self-start px-2.5 py-1.5"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "10px 10px 10px 2px",
      }}
    >
      <SparklesIcon size={11} color="var(--accent)" />
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-1 w-1 animate-pulse rounded-full"
            style={{
              background: "var(--ink-3)",
              animationDelay: `${i * 150}ms`,
            }}
          />
        ))}
      </span>
      <span
        className="font-mono text-[10px]"
        style={{ color: "var(--ink-3)" }}
      >
        tablo réfléchit…
      </span>
    </div>
  );
}

/* ─────────── Icons (Lucide-style stroke 1.5) ─────────── */

function SparklesIcon({
  size = 13,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3l1.6 4.6L18 9l-4.4 1.4L12 15l-1.6-4.6L6 9l4.4-1.4z" />
      <path d="M19 14l.7 1.8L21.5 16l-1.8.7L19 18l-.7-1.8L16.5 16l1.8-.7z" />
    </svg>
  );
}

function CloseIcon() {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M9 10V3h6v7l3 4H6l3-4z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
