/**
 * Mirror of the colour tokens in app/globals.css, for the styleguide and for
 * contrast tests. The CSS is the source of truth; tests/unit/tokens.test.ts
 * fails if the two drift apart.
 */
export const colorTokens = [
  { id: "canvas", name: "canvas", cssVar: "--color-canvas", hex: "#f5f5f3" },
  { id: "surface", name: "surface", cssVar: "--color-surface", hex: "#ffffff" },
  { id: "soft", name: "soft", cssVar: "--color-soft", hex: "#ebebe7" },
  { id: "hairline", name: "hairline", cssVar: "--color-hairline", hex: "#e3e3df" },
  { id: "ink", name: "ink", cssVar: "--color-ink", hex: "#111111" },
  { id: "secondary", name: "secondary", cssVar: "--color-secondary", hex: "#666660" },
  { id: "accent", name: "accent", cssVar: "--color-accent-base", hex: "#c2410c" },
] as const;

export type ColorTokenId = (typeof colorTokens)[number]["id"];

/** Text/background pairs the design system allows. Each must meet WCAG AA (4.5:1). */
export const contrastPairs: ReadonlyArray<{ fg: ColorTokenId; bg: ColorTokenId }> = [
  { fg: "ink", bg: "canvas" },
  { fg: "ink", bg: "surface" },
  { fg: "ink", bg: "soft" },
  { fg: "secondary", bg: "canvas" },
  { fg: "secondary", bg: "surface" },
  { fg: "secondary", bg: "soft" },
  { fg: "surface", bg: "accent" },
  { fg: "surface", bg: "ink" },
];

export const motionTokens = { quickMs: 150 } as const;

export function tokenHex(id: ColorTokenId): string {
  const token = colorTokens.find((t) => t.id === id);
  if (!token) throw new Error(`Unknown colour token: ${id}`);
  return token.hex;
}
