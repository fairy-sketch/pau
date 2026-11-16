import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/src/domain/contrast";
import { colorTokens, contrastPairs, motionTokens, tokenHex } from "@/src/ui/tokens";

const css = readFileSync("app/globals.css", "utf8");

describe("design tokens", () => {
  it("matches the colour values in globals.css", () => {
    for (const token of colorTokens) {
      expect(css, token.name).toContain(`${token.cssVar}: ${token.hex};`);
    }
  });

  it("defines the two accent tokens named in the brief", () => {
    expect(css).toContain("--color-accent-signal:");
    expect(css).toContain("--color-accent-electric:");
  });

  it("drops Tailwind's default palette and radii", () => {
    expect(css).toContain("--color-*: initial;");
    expect(css).toContain("--radius-*: initial;");
    expect(css).toContain("--radius-none: 0;");
  });

  it("keeps the motion token in sync", () => {
    expect(css).toContain(`--duration-quick: ${motionTokens.quickMs}ms;`);
  });

  it("uses no gradients", () => {
    expect(css).not.toMatch(/gradient\(/);
  });

  it("meets WCAG AA for every allowed text/background pair", () => {
    for (const pair of contrastPairs) {
      const ratio = contrastRatio(tokenHex(pair.fg), tokenHex(pair.bg));
      expect(ratio, `${pair.fg} on ${pair.bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("computes known contrast ratios", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });
});
