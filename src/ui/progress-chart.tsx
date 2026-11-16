"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

export interface ProgressPoint {
  /** Already formatted x label, e.g. "W46". */
  label: string;
  value: number;
  /** The current week or a new personal best: gets the accent. */
  highlight?: boolean;
}

const tick = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fill: "var(--color-secondary)",
};

function HighlightDot(props: { cx?: number; cy?: number; payload?: ProgressPoint }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload?.highlight) return null;
  return <circle cx={cx} cy={cy} r={5} fill="var(--org-accent)" />;
}

/**
 * Quiet progress line: one thin near-black line on hairline rules, mono axis
 * labels, and a single accent dot on the point that matters. No animation.
 * The same data is offered as a table for screen readers.
 */
export function ProgressChart({
  points,
  title,
  unit,
  columnLabels,
}: {
  points: ProgressPoint[];
  title: string;
  unit: string;
  columnLabels: { period: string; value: string };
}) {
  return (
    <figure>
      <figcaption className="mb-3 flex items-baseline justify-between gap-4">
        <span className="type-label text-secondary">{title}</span>
        <span className="text-secondary text-xs">{unit}</span>
      </figcaption>
      <div className="h-44" aria-hidden="true" data-chart>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            accessibilityLayer={false}
            data={points}
            margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
          >
            <CartesianGrid vertical={false} stroke="var(--color-hairline)" />
            <XAxis
              dataKey="label"
              tick={tick}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis tick={tick} tickLine={false} axisLine={false} width={56} />
            <Line
              dataKey="value"
              type="linear"
              stroke="var(--color-ink)"
              strokeWidth={1.75}
              strokeLinejoin="round"
              isAnimationActive={false}
              dot={(dotProps) => {
                const { key, ...rest } = dotProps as { key?: string } & Parameters<
                  typeof HighlightDot
                >[0];
                return <HighlightDot key={key} {...rest} />;
              }}
              activeDot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{columnLabels.period}</th>
            <th scope="col">{columnLabels.value}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.label}>
              <th scope="row">{point.label}</th>
              <td>{point.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
