import { cx } from "./cx";

export type StageStatus = "done" | "current" | "upcoming";

export interface StageTrackItem {
  id: string;
  /** Stage name, e.g. "Build". */
  label: string;
  status: StageStatus;
  /** Screen-reader text for the status, e.g. "Current stage". */
  statusLabel: string;
}

const bar: Record<StageStatus, string> = {
  done: "bg-accent opacity-35",
  current: "bg-accent",
  upcoming: "bg-hairline",
};

/**
 * Progress towards the goal as a row of thin segments. Only the current stage
 * is named on screen; the full list is there for screen readers.
 */
export function StageTrack({
  stages,
  label,
  position,
  note,
}: {
  stages: StageTrackItem[];
  /** Accessible name, e.g. "Stages towards your goal". */
  label: string;
  /** e.g. "Stage 2 of 5". */
  position: string;
  /** e.g. "12 days left". */
  note?: string;
}) {
  const current = stages.find((s) => s.status === "current");
  return (
    <div>
      <ol aria-label={label} className="flex gap-1.5">
        {stages.map((stage) => (
          <li
            key={stage.id}
            aria-current={stage.status === "current" ? "step" : undefined}
            className={cx("rounded-pill relative h-1 flex-1", bar[stage.status])}
          >
            <span className="sr-only">
              {stage.label} {stage.statusLabel}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-2.5 flex items-baseline justify-between gap-3" aria-hidden="true">
        <span>
          <span className="font-semibold">{current?.label}</span>{" "}
          <span className="text-small text-secondary">{position}</span>
        </span>
        {note ? <span className="type-label text-secondary">{note}</span> : null}
      </div>
    </div>
  );
}
