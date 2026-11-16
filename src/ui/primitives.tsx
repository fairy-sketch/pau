import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

/** Big editorial headline. */
export function Display({
  as: Tag = "h1",
  size = "md",
  className,
  ...rest
}: ComponentProps<"h1"> & { as?: "h1" | "h2" | "h3" | "p"; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-display-sm", md: "text-display-md", lg: "text-display-lg" };
  return <Tag className={cx("type-display text-balance", sizes[size], className)} {...rest} />;
}

/** Small uppercase label. */
export function Label({ className, ...rest }: ComponentProps<"span">) {
  return <span className={cx("type-label", className)} {...rest} />;
}

/** Numbered section heading with a heavy rule, e.g. "[02] TYPE". */
export function SectionHeading({ className, ...rest }: ComponentProps<"h2">) {
  return (
    <h2 className={cx("type-label border-fg border-b-2 pb-1 font-bold", className)} {...rest} />
  );
}

/** Switches the semantic tokens for everything inside it. */
export function Surface({
  tone,
  as: Tag = "div",
  ...rest
}: ComponentProps<"div"> & { tone: "ink" | "paper"; as?: "div" | "section" | "header" }) {
  return <Tag data-surface={tone} {...rest} />;
}

export type ChipTone = "neutral" | "booked" | "live" | "alert";

const chipTones: Record<ChipTone, string> = {
  neutral: "border-fg text-fg",
  booked: "border-accent-electric bg-accent-electric text-paper",
  live: "border-fg bg-fg text-bg",
  alert: "border-accent-signal bg-accent-signal text-paper",
};

/** State marker. Colour is never the only signal: the text says the state. */
export function StatusChip({
  tone = "neutral",
  className,
  ...rest
}: ComponentProps<"span"> & { tone?: ChipTone }) {
  return (
    <span
      className={cx(
        "type-label inline-flex items-center border px-1.5 py-0.5 font-bold whitespace-nowrap",
        chipTones[tone],
        className,
      )}
      {...rest}
    />
  );
}

/** Marks demo organisations and demo data. */
export function DemoBadge({ className, ...rest }: ComponentProps<"span">) {
  return (
    <span
      className={cx(
        "type-label border-fg inline-flex items-center border border-dashed px-1.5 py-0.5",
        className,
      )}
      {...rest}
    />
  );
}

/** Dense editorial list with dotted dividers, instead of rounded cards. */
export function DataList({ className, ...rest }: ComponentProps<"ul">) {
  return <ul className={cx("border-fg border-t-2", className)} {...rest} />;
}

export function DataRow({
  lead,
  title,
  meta,
  trailing,
}: {
  lead: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <li className="border-fg flex min-h-touch items-center gap-4 border-b border-dotted py-3">
      <span className="type-data text-data-lg shrink-0">{lead}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold uppercase">{title}</span>
        {meta ? <span className="type-label text-muted block">{meta}</span> : null}
      </span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </li>
  );
}
