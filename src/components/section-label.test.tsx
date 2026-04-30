import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionLabel } from "./section-label";

describe("<SectionLabel>", () => {
  it("rend le label principal", () => {
    render(<SectionLabel label="MODE" />);
    expect(screen.getByText("MODE")).toBeInTheDocument();
  });

  it("rend le label de droite quand fourni", () => {
    render(<SectionLabel label="PALETTE" right="9 options" />);
    expect(screen.getByText("PALETTE")).toBeInTheDocument();
    expect(screen.getByText("9 options")).toBeInTheDocument();
  });

  it("a un séparateur ticks (élément avec data-tablo-ticks)", () => {
    const { container } = render(<SectionLabel label="X" />);
    const ticks = container.querySelector("[data-tablo-ticks]");
    expect(ticks).toBeInTheDocument();
  });
});
