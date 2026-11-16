"use client";

import { useState } from "react";
import { cx } from "./cx";

/**
 * Thin scrolling line of short items. It can be paused (WCAG 2.2.2), and with
 * reduced motion it does not move at all: the items become a scrollable row.
 */
export function Ticker({
  items,
  label,
  pauseLabel,
  playLabel,
}: {
  items: string[];
  label: string;
  pauseLabel: string;
  playLabel: string;
}) {
  const [paused, setPaused] = useState(false);

  const row = (duplicate: boolean) => (
    <ul
      aria-hidden={duplicate || undefined}
      className={cx("flex shrink-0", duplicate && "motion-reduce:hidden")}
    >
      {items.map((item) => (
        <li
          key={item}
          className="type-label py-2 pl-4 font-bold whitespace-nowrap after:pl-4 after:content-['—']"
        >
          {item}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="border-fg flex items-stretch border-y">
      <div
        role="group"
        aria-label={label}
        className="min-w-0 flex-1 overflow-hidden motion-reduce:overflow-x-auto"
      >
        <div
          data-ticker-track
          className={cx(
            "animate-ticker flex w-max motion-reduce:animate-none",
            paused && "[animation-play-state:paused]",
          )}
        >
          {row(false)}
          {row(true)}
        </div>
      </div>
      <button
        type="button"
        aria-pressed={paused}
        onClick={() => setPaused((p) => !p)}
        className="type-label border-fg bg-bg min-h-touch shrink-0 border-l px-3 font-bold motion-reduce:hidden"
      >
        {paused ? playLabel : pauseLabel}
      </button>
    </div>
  );
}
