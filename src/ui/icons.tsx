import type { ReactNode } from "react";

/**
 * The PATH icon set: our own icons, drawn for this app (decisions R37 to R39).
 * One round line on a 24 px grid, no fills except small dots. Icons take the
 * colour of the text around them and are never lime.
 */
const paths = {
  path: (
    <>
      <circle cx="5.5" cy="19" r="1.6" />
      <path d="M5.5 17.4V16.5a4 4 0 0 1 4-4h5a4 4 0 0 0 0-8h-2" />
      <circle cx="10" cy="4.5" r="1.6" />
    </>
  ),
  coach: (
    <>
      <path d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-5.5L7 20v-4a3 3 0 0 1-3-3z" />
      <path d="M12 7c.3 1.7 1 2.4 3 3-2 .600-2.7 1.3-3 3-.300-1.7-1-2.4-3-3 2-.600 2.7-1.3 3-3z" />
    </>
  ),
  log: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </>
  ),
  week: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="3.5" />
      <path d="M4 10.5h16M8.5 3.5v4M15.5 3.5v4" />
      <circle className="fill-current stroke-none" cx="9" cy="15" r="1.3" />
    </>
  ),
  me: (
    <>
      <circle cx="12" cy="8.5" r="3.7" />
      <path d="M5 20c.500-3.6 3.3-5.5 7-5.5s6.5 1.9 7 5.5" />
    </>
  ),
  today: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  athletes: (
    <>
      <circle cx="9" cy="9" r="3.2" />
      <path d="M3.5 19.5c.400-3.1 2.6-4.9 5.5-4.9s5.1 1.8 5.5 4.9" />
      <path d="M15.5 6.1a3.2 3.2 0 0 1 0 5.8M17.6 14.8c1.6.700 2.7 2.2 2.9 4.2" />
    </>
  ),
  review: (
    <>
      <rect x="5" y="4.5" width="14" height="16" rx="3" />
      <path d="M9.5 4.5V4A1.5 1.5 0 0 1 11 2.5h2A1.5 1.5 0 0 1 14.5 4v.5" />
      <path d="M9 13l2.2 2.2L15.2 11" />
    </>
  ),
  alerts: (
    <>
      <path d="M6.5 16.5v-5a5.5 5.5 0 0 1 11 0v5l1.5 2h-14z" />
      <path d="M10.2 21h3.6" />
    </>
  ),
  home: (
    <>
      <path d="M4.5 11.2 12 4.5l7.5 6.7V18a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z" />
      <path d="M10 20v-4.5h4V20" />
    </>
  ),
  products: (
    <>
      <path d="M4 6a2 2 0 0 1 2-2h4.8a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.8l-4.8 4.8a2 2 0 0 1-2.8 0L4.6 12.2A2 2 0 0 1 4 10.8z" />
      <circle className="fill-current stroke-none" cx="8.5" cy="8.5" r="1.3" />
    </>
  ),
  money: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 10.5h18M7 15h3" />
    </>
  ),
  check: (
    <>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </>
  ),
  close: (
    <>
      <path d="M7 7l10 10M17 7 7 17" />
    </>
  ),
  add: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  back: (
    <>
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </>
  ),
  send: (
    <>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.2" />
      <path d="M15.6 15.6 20 20" />
    </>
  ),
  goal: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.3" />
      <circle className="fill-current stroke-none" cx="12" cy="12" r="1.3" />
    </>
  ),
  stage: (
    <>
      <path d="M4 19.5h4v-4.5h4v-4.5h4V6h4" />
    </>
  ),
  best: (
    <>
      <path d="M12 3c.900 5.2 3.3 7.7 9 9-5.7 1.3-8.1 3.8-9 9-.900-5.2-3.3-7.7-9-9 5.7-1.3 8.1-3.8 9-9z" />
    </>
  ),
  progress: (
    <>
      <path d="M4 17l5-5 4 3 6.5-7.5" />
      <path d="M15.5 7.5h4v4" />
    </>
  ),
  session: (
    <>
      <circle cx="12" cy="13.5" r="7" />
      <path d="M12 13.5V10M10 3.5h4M12 3.5v3M18.2 7.3l1.3-1.3" />
    </>
  ),
  club: (
    <>
      <path d="M6 21V4" />
      <path d="M6 5h11.5l-3 4 3 4H6" />
    </>
  ),
  place: (
    <>
      <path d="M12 21c4.3-4 6.5-7.6 6.5-11a6.5 6.5 0 0 0-13 0c0 3.4 2.2 7 6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  pass: (
    <>
      <path d="M4 9V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1a3 3 0 0 0 0 6v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1a3 3 0 0 0 0-6z" />
      <path d="M14 9.5v1M14 13.5v1" />
    </>
  ),
  credits: (
    <>
      <ellipse cx="12" cy="7.5" rx="7" ry="3" />
      <path d="M5 7.5V12c0 1.7 3.1 3 7 3s7-1.3 7-3V7.5" />
      <path d="M5 12v4.5c0 1.7 3.1 3 7 3s7-1.3 7-3V12" />
    </>
  ),
  invoice: (
    <>
      <path d="M7.5 3.5H14l4.5 4.5v10.5a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z" />
      <path d="M14 3.5V8h4.5M9 12.5h6M9 16h3.5" />
    </>
  ),
  waitlist: (
    <>
      <path d="M7 4h10M7 20h10" />
      <path d="M8 4c0 4 4 5 4 8s-4 4-4 8M16 4c0 4-4 5-4 8s4 4 4 8" />
    </>
  ),
  pain: (
    <>
      <rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)" />
      <circle className="fill-current stroke-none" cx="10.6" cy="10.6" r="1" />
      <circle className="fill-current stroke-none" cx="13.4" cy="13.4" r="1" />
    </>
  ),
  rest: (
    <>
      <path d="M19.5 14.2A8 8 0 1 1 9.8 4.5a6.3 6.3 0 0 0 9.7 9.7z" />
    </>
  ),
  hold: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5M12 20.5A8.5 8.5 0 0 1 3.5 12" />
    </>
  ),
  privacy: (
    <>
      <rect x="5.5" y="10.5" width="13" height="9.5" rx="2.8" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  settings: (
    <>
      <path d="M4.5 8h8M19 8h.5M4.5 16H5M11.5 16h8" />
      <circle cx="16" cy="8" r="2.5" />
      <circle cx="8.5" cy="16" r="2.5" />
    </>
  ),
  offline: (
    <>
      <path d="M4.5 4.5l15 15" />
      <path d="M8.8 16.2a4.6 4.6 0 0 1 4.9-.9M5.5 12.8a9.3 9.3 0 0 1 3.3-2.2M13.8 9.6a9.3 9.3 0 0 1 4.7 3.2" />
      <circle className="fill-current stroke-none" cx="12" cy="19.3" r="1.2" />
    </>
  ),
  why: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11.2v5" />
      <circle className="fill-current stroke-none" cx="12" cy="7.9" r="1.2" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;

export const iconNames = Object.keys(paths) as IconName[];

/** Icons grouped as on the styleguide. */
export const iconGroups: ReadonlyArray<{ id: string; names: IconName[] }> = [
  { id: "navigation", names: ["path", "coach", "log", "week", "me"] },
  { id: "coach", names: ["today", "athletes", "review", "alerts", "home", "products", "money"] },
  {
    id: "training",
    names: [
      "goal",
      "stage",
      "best",
      "progress",
      "session",
      "club",
      "place",
      "pass",
      "credits",
      "invoice",
      "waitlist",
      "pain",
      "rest",
    ],
  },
  {
    id: "actions",
    names: [
      "check",
      "close",
      "add",
      "back",
      "send",
      "search",
      "hold",
      "privacy",
      "settings",
      "offline",
      "why",
    ],
  },
];

/** Decorative by default: pair it with visible text, or label the control around it. */
export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-icon={name}
    >
      {paths[name]}
    </svg>
  );
}
