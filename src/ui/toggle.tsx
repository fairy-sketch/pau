"use client";

import { useState } from "react";
import { cx } from "./cx";

/**
 * On/off switch for settings such as consent scopes. Replaces checkboxes.
 * "On" is near-black: the accent is reserved for the primary action.
 */
export function Toggle({
  label,
  description,
  defaultChecked = false,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        setChecked(!checked);
        onChange?.(!checked);
      }}
      className="flex min-h-14 w-full items-center gap-4 py-2.5 text-left disabled:opacity-55"
    >
      <span className="flex-1">
        <span className="block font-semibold">{label}</span>
        {description ? (
          <span className="text-small text-secondary block">{description}</span>
        ) : null}
      </span>
      <span
        aria-hidden="true"
        className={cx(
          "rounded-pill relative h-6.5 w-11 shrink-0 transition-colors duration-(--duration-quick)",
          checked ? "bg-ink" : "bg-hairline",
        )}
      >
        <span
          className={cx(
            "rounded-pill bg-surface absolute top-0.75 left-0.75 size-5 shadow-card transition-transform duration-(--duration-quick)",
            checked && "translate-x-4.5",
          )}
        />
      </span>
    </button>
  );
}
