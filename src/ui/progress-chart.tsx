"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

export interface ProgressPoint {
  /** Already formatted x label, e.g. "W46". */
  label: string;
  value: number;
  /** The current week or a new personal best: gets the one accent. */
  highlight?: boolean;
}

const tick = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fill: "var(--surface-muted)",
};

function SquareDot(props: { cx?: number; cy?: number; payload?: ProgressPoint }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const size = payload?.highlight ? 10 : 6;
  return (
    <rect
      x={cx - size / 2}
      y={cy - size / 2}
      width={size}
      height={size}
      fill={payload?.highlight ? "var(--org-accent)" : "var(--surface-fg)"}
    />
  );
}

/**
 * Progress line in the house style: one black line, square markers, thin
 * dotted rules, monospace axes, no animation. The same data is offered as a
 * table for screen readers, since the SVG itself is hidden from them.
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
      <figcaption className="type-label mb-3 flex justify-between gap-4 font-bold">
        <span>{title}</span>
        <span className="text-muted">{unit}</span>
      </figcaption>
      <div className="h-52" aria-hidden="true" data-chart>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            accessibilityLayer={false}
            data={points}
            margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
          >
            <CartesianGrid vertical={false} stroke="var(--surface-fg)" strokeDasharray="1 4" />
            <XAxis
              dataKey="label"
              tick={tick}
              tickLine={false}
              axisLine={{ stroke: "var(--surface-fg)", strokeWidth: 2 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={tick} tickLine={false} axisLine={false} width={56} />
            <Line
              dataKey="value"
              type="linear"
              stroke="var(--surface-fg)"
              strokeWidth={2}
              isAnimationActive={false}
              dot={(dotProps) => {
                const { key, ...rest } = dotProps as { key?: string } & Parameters<
                  typeof SquareDot
                >[0];
                return <SquareDot key={key} {...rest} />;
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
