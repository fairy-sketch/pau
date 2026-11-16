/**
 * Mirror of the colour tokens in app/globals.css, for the styleguide and for
 * contrast tests. The CSS is the source of truth; tests/unit/tokens.test.ts
 * fails if the two drift apart.
 */
export const colorTokens = [
  { id: "ink", name: "ink", cssVar: "--color-ink", hex: "#000000" },
  { id: "paper", name: "paper", cssVar: "--color-paper", hex: "#ffffff" },
  { id: "grey700", name: "grey-700", cssVar: "--color-grey-700", hex: "#2e2e2e" },
  { id: "grey600", name: "grey-600", cssVar: "--color-grey-600", hex: "#5c5c5c" },
  { id: "grey400", name: "grey-400", cssVar: "--color-grey-400", hex: "#a3a3a3" },
  { id: "grey300", name: "grey-300", cssVar: "--color-grey-300", hex: "#d9d9d9" },
  {
    id: "accentSignal",
    name: "accent-signal",
    cssVar: "--color-accent-signal",
    hex: "#e40513",
  },
  {
    id: "accentElectric",
    name: "accent-electric",
    cssVar: "--color-accent-electric",
    hex: "#0000ff",
  },
] as const;

export type ColorTokenId = (typeof colorTokens)[number]["id"];

/** Text/background pairs the design system allows. Each must meet WCAG AA (4.5:1). */
export const contrastPairs: ReadonlyArray<{ fg: ColorTokenId; bg: ColorTokenId }> = [
  { fg: "ink", bg: "paper" },
  { fg: "paper", bg: "ink" },
  { fg: "grey600", bg: "paper" },
  { fg: "grey400", bg: "ink" },
  { fg: "paper", bg: "accentSignal" },
  { fg: "paper", bg: "accentElectric" },
  { fg: "accentSignal", bg: "paper" },
  { fg: "accentElectric", bg: "paper" },
];

export const motionTokens = { quickMs: 120 } as const;

export function tokenHex(id: ColorTokenId): string {
  const token = colorTokens.find((t) => t.id === id);
  if (!token) throw new Error(`Unknown colour token: ${id}`);
  return token.hex;
}
