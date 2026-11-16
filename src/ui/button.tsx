import Link from "next/link";
import type { ComponentProps } from "react";
import { cx } from "./cx";

/**
 * primary: the one lime action on a screen (dark text on lime).
 * secondary: everything else that is a button.
 * ghost: quiet actions such as "Close".
 */
export type ButtonVariant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex min-h-12 min-w-touch items-center justify-center gap-2 rounded-control border px-5 " +
  "text-body font-semibold transition-[background-color,opacity] duration-(--duration-quick) " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "border-accent bg-accent text-on-accent hover:opacity-90",
  secondary: "border-hairline bg-surface text-ink hover:bg-soft",
  ghost: "border-transparent bg-transparent text-secondary hover:bg-soft",
};

export function buttonClasses(variant: ButtonVariant = "secondary", className?: string) {
  return cx(base, variants[variant], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant };

export function Button({ variant, className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...rest} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant };

export function ButtonLink({ variant, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, className)} {...rest} />;
}
