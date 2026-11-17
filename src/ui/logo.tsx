import { APP_NAME } from "@/src/config/app";
import { cx } from "./cx";

/**
 * The PATH logo, "Clean cut" (decision L-1): the word in Satoshi Black with one straight cut through it.
 * The cut is a mask, so whatever is behind the logo shows through it. Colour comes from `currentColor`.
 */
export const LOGO_CUT = { top: 56, height: 6, baseline: 92, fontSize: 104 } as const;

export function Logo({ className, title = APP_NAME }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 290 110"
      role="img"
      aria-label={title}
      className={cx("h-7 w-auto", className)}
      data-logo
    >
      <defs>
        <mask
          id="path-logo-cut"
          maskUnits="userSpaceOnUse"
          x="-40"
          y="-20"
          width="370"
          height="150"
        >
          <rect x="-40" y="-20" width="370" height="150" fill="#fff" />
          <rect x="-10" y={LOGO_CUT.top} width="310" height={LOGO_CUT.height} fill="#000" />
        </mask>
      </defs>
      <text
        x="4"
        y={LOGO_CUT.baseline}
        fontFamily="Satoshi"
        fontWeight={900}
        fontSize={LOGO_CUT.fontSize}
        letterSpacing="-2"
        fill="currentColor"
        mask="url(#path-logo-cut)"
      >
        {APP_NAME}
      </text>
    </svg>
  );
}

/**
 * The app icon's mark, "Just the cut" (decision L-5): a solid block with the logo's cut through it,
 * at the same height and in the same proportion to the block as the cut has to the capitals of the word.
 * `scripts/generate-icons.mjs` draws the same geometry for the PWA icons.
 */
export const MARK = { block: [24, 24, 52, 52], radius: 4, cut: [50.35, 4.3] } as const;

export function LogoMark({ className, title }: { className?: string; title?: string }) {
  const [x, y, w, h] = MARK.block;
  return (
    <svg
      viewBox="0 0 100 100"
      className={cx("size-8", className)}
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}
      data-logo-mark
    >
      <defs>
        <mask id="path-mark-cut">
          <rect width="100" height="100" fill="#fff" />
          <rect x="0" y={MARK.cut[0]} width="100" height={MARK.cut[1]} fill="#000" />
        </mask>
      </defs>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={MARK.radius}
        fill="currentColor"
        mask="url(#path-mark-cut)"
      />
    </svg>
  );
}
