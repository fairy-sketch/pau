import { cx } from "./cx";

export type StageStatus = "done" | "current" | "upcoming";

export interface StageTrackItem {
  id: string;
  /** Already formatted, e.g. "[02] Build". */
  label: string;
  status: StageStatus;
  /** Screen-reader text for the status, e.g. "Current stage". */
  statusLabel: string;
  /** Optional line under the label, e.g. "12 days left". */
  note?: string;
}

const bar: Record<StageStatus, string> = {
  done: "border-fg border-solid",
  current: "border-accent border-solid",
  upcoming: "border-fg border-dotted",
};

/**
 * The path as one bold horizontal rule. Done stages are solid, the current
 * stage carries the accent and an inverted label, upcoming stages are dotted.
 * Scrolls sideways on narrow phones; the region is focusable for keyboards.
 */
export function StageTrack({ stages, label }: { stages: StageTrackItem[]; label: string }) {
  return (
    <div role="group" aria-label={label} tabIndex={0} className="relative overflow-x-auto">
      <ol className="flex min-w-max md:min-w-0">
        {stages.map((stage) => (
          <li
            key={stage.id}
            aria-current={stage.status === "current" ? "step" : undefined}
            className={cx("min-w-32 flex-1 border-t-8 pt-2 pr-3", bar[stage.status])}
          >
            <span
              className={cx(
                "type-label inline-block font-bold",
                stage.status === "current" && "bg-fg text-bg px-1",
                stage.status === "upcoming" && "text-muted",
              )}
            >
              {stage.label}
            </span>
            <span className="sr-only">{stage.statusLabel}</span>
            {stage.note ? <span className="type-label mt-1 block">{stage.note}</span> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
