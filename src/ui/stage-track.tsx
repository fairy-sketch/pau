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

const R = 12;
const C = 2 * Math.PI * R;
const Y = 16;
const WIDTH = 320;

/**
 * The path as five named stops ("Steps", decisions R34 to R36). Flat, no glow.
 * Finished stages are filled and ticked, upcoming ones are hollow, and the
 * current one is a ring that closes as the stage progresses, with the accent
 * dot in its centre. The drawing is decorative; the list of names underneath
 * carries the meaning for screen readers.
 */
export function StageTrack({
  stages,
  label,
  position,
  note,
  progress = 0,
}: {
  stages: StageTrackItem[];
  /** Accessible name, e.g. "Stages towards your goal". */
  label: string;
  /** e.g. "· stage 2 of 5". */
  position: string;
  /** e.g. "12 days left". */
  note?: string;
  /** How far through the current stage, from 0 to 1. */
  progress?: number;
}) {
  const n = stages.length;
  const step = WIDTH / n;
  const x = (k: number) => step / 2 + step * k;
  const currentIndex = stages.findIndex((s) => s.status === "current");
  const current = stages[currentIndex];
  const reached = currentIndex === -1 ? n - 1 : currentIndex;
  const done = Math.min(1, Math.max(0, progress));

  return (
    <div data-stage-track>
      <svg
        viewBox={`0 0 ${WIDTH} ${Y * 2}`}
        className="block w-full overflow-visible"
        aria-hidden="true"
      >
        <path
          d={`M${x(0)} ${Y}H${x(n - 1)}`}
          className="stroke-track"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        {reached > 0 ? (
          <path
            d={`M${x(0)} ${Y}H${x(reached)}`}
            className="stroke-ink"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        ) : null}
        {stages.map((stage, k) => (
          <g key={stage.id} transform={`translate(${x(k)} ${Y})`}>
            {stage.status === "done" ? (
              <>
                <circle r={R} className="fill-ink" />
                <path
                  d="M-5 0.5 L-1.5 4 L5.5 -3.5"
                  className="stroke-surface"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </>
            ) : stage.status === "current" ? (
              <>
                <circle r={R} className="fill-surface stroke-track" strokeWidth="4" />
                <circle
                  r={R}
                  className="stroke-ink"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={C}
                  strokeDashoffset={C * (1 - done)}
                  transform="rotate(-90)"
                  data-stage-ring
                />
                <circle r="5" className="fill-accent stroke-ink" strokeWidth="2" />
              </>
            ) : (
              <circle r={R} className="fill-canvas stroke-track" strokeWidth="2" />
            )}
          </g>
        ))}
      </svg>
      <ol
        aria-label={label}
        className="mt-2 grid text-center"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      >
        {stages.map((stage) => (
          <li
            key={stage.id}
            aria-current={stage.status === "current" ? "step" : undefined}
            className={cx(
              "type-label",
              stage.status === "current" ? "text-ink font-bold" : "text-secondary",
            )}
            style={{ fontSize: "0.59375rem", letterSpacing: "0.03em" }}
          >
            {stage.label}
            <span className="sr-only"> {stage.statusLabel}</span>
          </li>
        ))}
      </ol>
      <div className="mt-3.5 flex items-baseline justify-between gap-3">
        <span>
          <span className="font-semibold">{current?.label}</span>{" "}
          <span className="text-small text-secondary">{position}</span>
        </span>
        {note ? <span className="type-label text-secondary">{note}</span> : null}
      </div>
    </div>
  );
}
