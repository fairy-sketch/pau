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

  it("has exactly one accent colour", () => {
    const accents = [...css.matchAll(/--color-accent[\w-]*:\s*#[0-9a-f]{6}/g)];
    expect(accents).toHaveLength(1);
    expect(colorTokens.filter((t) => t.id.startsWith("accent"))).toHaveLength(1);
  });

  it("drops Tailwind's default palette and sets soft radii", () => {
    expect(css).toContain("--color-*: initial;");
    expect(css).toContain("--radius-*: initial;");
    expect(css).toContain("--radius-control: 0.75rem;");
    expect(css).toContain("--radius-card: 1rem;");
  });

  it("self-hosts the Fontshare fonts unmodified", () => {
    expect(css).toContain('url("/fonts/Satoshi-Variable.woff2")');
    expect(css).toContain('url("/fonts/Switzer-Variable.woff2")');
    expect(css).not.toContain("Archivo");
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
