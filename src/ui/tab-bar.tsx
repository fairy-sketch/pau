import Link from "next/link";
import { cx } from "./cx";
import { Icon, type IconName } from "./icons";

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
            <Icon name={item.icon} size={22} />
          </span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
