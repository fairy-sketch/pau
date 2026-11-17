import { APP_NAME } from "@/src/config/app";
import { cx } from "./cx";
import { LOGO_PATH, LOGO_VIEWBOX } from "./logo-path";

/**
 * The PATH logo: the word in Satoshi Black capitals, set tight (decision L-9).
 * Drawn from outlines, so it looks the same everywhere and needs no font. Colour comes from `currentColor`.
 */
export function Logo({ className, title = APP_NAME }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      role="img"
      aria-label={title}
      className={cx("h-6 w-auto", className)}
      data-logo
    >
      <path d={LOGO_PATH} fill="currentColor" />
    </svg>
  );
}

/**
 * The app icon for now (decision L-10): the wordmark on a tile. `scripts/generate-icons.mjs`
 * draws the same thing for the install icons. A symbol may replace it later.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  const [x, y, w, h] = LOGO_VIEWBOX.split(" ").map(Number) as [number, number, number, number];
  const s = 64 / w;
  return (
    <svg
      viewBox="0 0 100 100"
      className={cx("size-8", className)}
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}
      data-logo-mark
    >
      <g transform={`translate(18 ${(100 - h * s) / 2}) scale(${s}) translate(${-x} ${-y})`}>
        <path d={LOGO_PATH} fill="currentColor" />
      </g>
    </svg>
  );
}
