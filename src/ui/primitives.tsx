import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

/** The goal headline. Use once per screen, at most. */
export function Display({
  as: Tag = "h1",
  className,
  ...rest
}: ComponentProps<"h1"> & { as?: "h1" | "h2" | "p" }) {
  return <Tag className={cx("type-goal text-balance", className)} {...rest} />;
}

/** Screen title (lg) or section title (md). Sentence case. */
export function Heading({
  as: Tag = "h2",
  size = "md",
  className,
  ...rest
}: ComponentProps<"h2"> & { as?: "h1" | "h2" | "h3" | "p"; size?: "md" | "lg" }) {
  return (
    <Tag
      className={cx(
        "type-heading text-balance",
        size === "lg" ? "text-heading" : "text-title",
        className,
      )}
      {...rest}
    />
  );
}

/** Tiny uppercase mono label above a heading or a group. */
export function Label({ className, ...rest }: ComponentProps<"span">) {
  return <span className={cx("type-label text-secondary", className)} {...rest} />;
}

/** White surface with a hairline and a soft shadow. `flat` drops the shadow. */
export function Card({ flat, className, ...rest }: ComponentProps<"div"> & { flat?: boolean }) {
  return (
    <div
      className={cx(
        "rounded-card border-hairline bg-surface border p-5",
        !flat && "shadow-card",
        className,
      )}
      {...rest}
    />
  );
}

export type PillTone = "soft" | "line";

const pillTones: Record<PillTone, string> = {
  soft: "bg-soft text-ink",
  line: "border border-hairline text-secondary",
};

/** Quiet state marker ("Booked", "Waitlist #2"). The text carries the meaning. */
export function StatusPill({
  tone = "soft",
  className,
  ...rest
}: ComponentProps<"span"> & { tone?: PillTone }) {
  return (
    <span
      className={cx(
        "rounded-pill inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        pillTones[tone],
        className,
      )}
      {...rest}
    />
  );
}

/** Marks demo organisations and demo data. */
export function DemoBadge({ className, ...rest }: ComponentProps<"span">) {
  return <StatusPill tone="line" className={className} {...rest} />;
}

/** A card of rows separated by one hairline. */
export function DataList({ className, ...rest }: ComponentProps<"ul">) {
  return (
    <ul
      className={cx(
        "rounded-card border-hairline bg-surface shadow-card divide-hairline divide-y border px-5",
        className,
      )}
      {...rest}
    />
  );
}

export function DataRow({
  lead,
  title,
  meta,
  trailing,
}: {
  lead?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <li className="flex min-h-14 items-center gap-4 py-3.5">
      {lead ? <span className="type-data w-13 shrink-0">{lead}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        {meta ? <span className="text-small text-secondary block">{meta}</span> : null}
      </span>
      {trailing ? <span className="text-small text-secondary shrink-0">{trailing}</span> : null}
    </li>
  );
}
