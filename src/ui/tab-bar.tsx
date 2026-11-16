import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "./cx";

export type IconName = "path" | "coach" | "log" | "week" | "me";

const paths: Record<IconName, ReactNode> = {
  path: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h12l-2.5 4 2.5 4H5" />
    </>
  ),
  coach: <path d="M4 5h16v11H10l-6 4z" />,
  log: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  week: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="3" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  me: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
};

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export interface TabItem {
  href: string;
  label: string;
  icon: IconName;
  current?: boolean;
}

/** Bottom navigation: four or five icon-and-label tabs with a soft active state. */
export function TabBar({ items, label }: { items: TabItem[]; label: string }) {
  return (
    <nav aria-label={label} className="border-hairline bg-surface flex border-t px-2 pt-1.5 pb-2">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          aria-current={item.current ? "page" : undefined}
          className={cx(
            "rounded-control flex min-h-13 flex-1 flex-col items-center gap-0.5 text-[0.6875rem]",
            item.current ? "text-ink font-semibold" : "text-secondary font-medium",
          )}
        >
          <span
            className={cx(
              "rounded-pill grid h-7.5 w-13 place-items-center transition-colors duration-(--duration-quick)",
              item.current && "bg-soft",
            )}
          >
            <Icon name={item.icon} />
          </span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
