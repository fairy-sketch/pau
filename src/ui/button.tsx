import Link from "next/link";
import type { ComponentProps } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "accent" | "outline";

const base =
  "type-label inline-flex min-h-touch min-w-touch items-center justify-center gap-2 px-5 font-bold " +
  "border-2 transition-colors duration-(--duration-quick) ease-(--ease-mechanical) " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "border-fg bg-fg text-bg hover:bg-bg hover:text-fg",
  accent: "border-accent bg-accent text-on-accent hover:border-fg hover:bg-fg hover:text-bg",
  outline: "border-fg bg-transparent text-fg hover:bg-fg hover:text-bg",
};

export function buttonClasses(variant: ButtonVariant = "primary", className?: string) {
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
