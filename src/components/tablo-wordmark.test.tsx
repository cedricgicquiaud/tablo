import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TabloWordmark } from "./tablo-wordmark";

describe("<TabloWordmark>", () => {
  it("rend le texte 'tablo' dans un <svg>", () => {
    const { container } = render(<TabloWordmark />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(screen.getByText("tablo")).toBeInTheDocument();
  });

  it("inclut un terminator block utilisant var(--accent)", () => {
    const { container } = render(<TabloWordmark />);
    const accentEl = container.querySelector('[data-tablo-terminator="true"]');
    expect(accentEl).toBeInTheDocument();
    // le rect / div terminator doit être coloré via var(--accent), inline
    const fillOrBg = accentEl?.getAttribute("fill") || (accentEl as HTMLElement)?.style.background;
    expect(fillOrBg).toContain("var(--accent)");
  });

  it("accepte une size prop ('sm' | 'md' | 'lg')", () => {
    const { rerender, container } = render(<TabloWordmark size="sm" />);
    const svgSm = container.querySelector("svg");
    const heightSm = svgSm?.getAttribute("height");

    rerender(<TabloWordmark size="lg" />);
    const svgLg = container.querySelector("svg");
    const heightLg = svgLg?.getAttribute("height");

    expect(heightSm).not.toBe(heightLg);
    expect(Number(heightLg)).toBeGreaterThan(Number(heightSm));
  });
});
