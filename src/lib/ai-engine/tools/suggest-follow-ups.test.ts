/**
 * TC8 — Tool suggest_follow_ups (feature flag).
 *
 * Phase 17 cycle C T3.5 (R60-R64).
 */

import { describe, it, expect } from "vitest";
import { executeSuggestFollowUps, isSuggestFollowUpsEnabled } from "./suggest-follow-ups";

describe("executeSuggestFollowUps", () => {
  it("Accepte suggestions valides → ok + content sérialisé", () => {
    const result = executeSuggestFollowUps({
      suggestions: ["Voir le détail par owner ?", "Comparer Q1 ?", "Top 10 deals ?"],
    });
    expect(result.is_error).toBe(false);
    const parsed = JSON.parse(result.content) as { suggestions: string[] };
    expect(parsed.suggestions).toHaveLength(3);
  });

  it("Accepte 1 suggestion (min)", () => {
    const result = executeSuggestFollowUps({ suggestions: ["Et après ?"] });
    expect(result.is_error).toBe(false);
  });

  it("Tronque à 3 si LLM en envoie plus", () => {
    const result = executeSuggestFollowUps({
      suggestions: ["a", "b", "c", "d", "e"],
    });
    const parsed = JSON.parse(result.content) as { suggestions: string[] };
    expect(parsed.suggestions).toHaveLength(3);
  });

  it("Filtre suggestions vides ou whitespace only", () => {
    const result = executeSuggestFollowUps({
      suggestions: ["valid", "  ", "", "another"],
    });
    const parsed = JSON.parse(result.content) as { suggestions: string[] };
    expect(parsed.suggestions).toEqual(["valid", "another"]);
  });

  it("Suggestions vides → is_error", () => {
    const result = executeSuggestFollowUps({ suggestions: [] });
    expect(result.is_error).toBe(true);
  });
});

describe("isSuggestFollowUpsEnabled", () => {
  it("Default → true (feature flag activé par défaut)", () => {
    delete process.env.AI_ENGINE_FOLLOW_UPS_ENABLED;
    expect(isSuggestFollowUpsEnabled()).toBe(true);
  });

  it("Env var = 'false' → false", () => {
    process.env.AI_ENGINE_FOLLOW_UPS_ENABLED = "false";
    expect(isSuggestFollowUpsEnabled()).toBe(false);
    delete process.env.AI_ENGINE_FOLLOW_UPS_ENABLED;
  });

  it("Env var = 'true' → true", () => {
    process.env.AI_ENGINE_FOLLOW_UPS_ENABLED = "true";
    expect(isSuggestFollowUpsEnabled()).toBe(true);
    delete process.env.AI_ENGINE_FOLLOW_UPS_ENABLED;
  });
});
