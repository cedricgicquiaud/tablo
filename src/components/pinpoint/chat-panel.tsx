"use client";

import { useRef, useState, useTransition } from "react";
import { generateWidget } from "@/lib/ai/generate-widget";
import type { GenerateResult } from "@/lib/ai/generate-widget.types";
import { pinWidget } from "@/lib/pinpoint/widget-actions";
import { DynamicWidget } from "@/components/widgets/dynamic-widget";
import { Icon } from "@/components/widgets/icon";
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
  // Découpe sur `- ` ou ` - ` pour récupérer un titre + des bullets éventuels.
  const trimmed = text.trim();
  const parts = trimmed.split(/\s*-\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return <p className="leading-relaxed">{renderInlineBold(trimmed)}</p>;
  }
  const [intro, ...bullets] = parts;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="leading-relaxed">{renderInlineBold(intro.replace(/[:：]\s*$/, ""))}</p>
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
      {/* Bouton toggle flottant */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-30 flex h-12 items-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-medium text-[var(--bg)] shadow-lg transition-all hover:bg-[var(--accent-2)]"
      >
        <span aria-hidden>{open ? "✕" : "✨"}</span>
        {open ? "Fermer" : "Ajouter un widget"}
      </button>

      {/* Backdrop mobile uniquement */}
      {open ? (
        <div
          aria-hidden
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {/* Panel side */}
      <aside
        className={`fixed right-0 top-0 z-30 flex h-screen w-full max-w-[440px] transform flex-col border-l border-[var(--line)] bg-[var(--surface)] transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--ink)]">
              ✨ Générer un widget
            </h2>
            <p className="text-[11px] text-[var(--ink-3)]">
              Décris ce que tu veux voir
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fermer"
            className="rounded-md p-1 text-[var(--ink-3)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
            ✕
          </button>
        </div>

        {/* Conversation history */}
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <p className="text-xs text-[var(--ink-3)]">
              Décris ce que tu veux voir, ou pioche une idée ci-dessous.
            </p>
          ) : (
            messages.map((m) => {
              if (m.kind === "user") {
                return (
                  <div
                    key={m.id}
                    className="self-end max-w-[85%] rounded-2xl bg-[var(--accent)] px-3 py-2 text-sm text-[var(--bg)]"
                  >
                    {m.text}
                  </div>
                );
              }
              if (m.kind === "ai-error") {
                return (
                  <div
                    key={m.id}
                    className="self-start max-w-[90%] rounded-2xl border border-[var(--negative)]/30 bg-[color-mix(in_oklab,var(--negative)_8%,transparent)] px-3 py-2 text-sm text-[var(--negative)]"
                    role="alert"
                  >
                    {m.text}
                  </div>
                );
              }
              const isPinning = pinningId === m.id;
              return (
                <div key={m.id} className="flex flex-col gap-2 self-start w-full">
                  {m.explanation && m.explanation.trim() ? (
                    <div className="max-w-[90%] rounded-2xl bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink-2)]">
                      <ExplanationText text={m.explanation} />
                    </div>
                  ) : null}
                  <div className="group relative w-full">
                    <button
                      type="button"
                      onClick={() => handlePin(m.id)}
                      disabled={isPinning || m.pinned}
                      aria-label={m.pinned ? "Épinglé" : "Épingler"}
                      title={m.pinned ? "Épinglé" : "Épingler"}
                      className={`w-icon absolute z-10 transition-opacity hover:brightness-95 ${
                        m.pinned
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      }`}
                      style={{ top: 12, right: 12 }}
                    >
                      {m.pinned ? (
                        <Icon name="check" size={13} />
                      ) : isPinning ? (
                        <span className="text-[10px]">…</span>
                      ) : (
                        <Icon name="pin" size={13} />
                      )}
                    </button>
                    <DynamicWidget config={m.config} data={m.data} />
                  </div>
                  <span
                    className="self-end text-[10px] text-[var(--ink-4)]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {m.tokens.input + m.tokens.output} tokens
                  </span>
                </div>
              );
            })
          )}
          {isGenerating ? (
            <div className="self-start flex items-center gap-2 rounded-2xl bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink-3)]">
              <span aria-hidden className="relative flex h-3 w-3">
                <span className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)] opacity-60" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--accent)]" />
              </span>
              <span className="text-xs">Réflexion…</span>
            </div>
          ) : null}
        </div>

        {/* Suggestions toujours visibles */}
        <div className="flex flex-wrap gap-1.5 border-t border-[var(--line)] bg-[var(--surface-2)] px-5 py-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={isGenerating}
              onClick={() => handleSubmit(s)}
              className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-left text-[11px] text-[var(--ink-2)] hover:border-[var(--accent)] hover:bg-[var(--surface-3)] disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(prompt);
          }}
          className="flex gap-2 border-t border-[var(--line)] bg-[var(--surface-2)] px-5 py-4"
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="ex: mon revenu mensuel..."
            disabled={isGenerating}
            className="flex-1 rounded-[var(--radius-tag-sm)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isGenerating || !prompt.trim()}
            className="rounded-[var(--radius-tag-sm)] bg-[var(--accent)] px-4 text-sm font-medium text-[var(--bg)] hover:bg-[var(--accent-2)] disabled:opacity-50"
          >
            ↑
          </button>
        </form>
      </aside>
    </>
  );
}
