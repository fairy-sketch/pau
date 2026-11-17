/* eslint-disable @typescript-eslint/no-explicit-any -- the demo is plain browser JS; its test hook (window.PATH_DEMO) has no types. */
import { expect, type Page } from "@playwright/test";

import { DEMO } from "../../helpers/demo";

/**
 * The simulation harness for the clickable demo (QA pass, November 2026).
 *
 * Personas drive the same engine the screens use (through window.PATH_DEMO) and then read every screen where the
 * result has to show up. One athlete can be played in the demo (Mia Keller, a member of both clubs), so the
 * scripts written for "Jonas" and "Lea" in the QA brief run on her account; what they need that is not built yet
 * is listed with test.fixme. Known defects are marked test.fail with their QA number: the suite stays green, and
 * a marker has to be removed the moment its defect is fixed.
 */
export type Role = "athlete" | "coach" | "admin";
export type Org = "pau" | "studio";
export const ZURICH = (iso: string) => new Date(iso.length === 16 ? `${iso}:00+01:00` : iso);
export const MONDAY_NOON = ZURICH("2026-11-16T12:00");

export async function start(page: Page, when: Date = MONDAY_NOON) {
  await page.clock.setFixedTime(when);
  await page.goto(DEMO);
  await expect(page.getByRole("navigation", { name: "Sections" })).toBeVisible();
}
/** Moves the clock and lets the app catch up (sweeps, offers running out, series). */
export async function clock(page: Page, when: Date) {
  await page.clock.setFixedTime(when);
  await page.evaluate(() => window.PATH_DEMO.render());
}
/** Runs a function inside the page with the demo's test hook. */
export const sim = <T>(page: Page, fn: (d: any, arg?: any) => T, arg?: unknown) =>
  page.evaluate(
    `(${fn.toString()})(window.PATH_DEMO, ${JSON.stringify(arg ?? null)})`,
  ) as Promise<T>;
/** The text of one screen, as a person in that role at that club reads it. */
export const screen = (page: Page, role: Role, tab: string, org: Org = "pau") =>
  page.evaluate(
    ([role, tab, org]) => {
      const d = window.PATH_DEMO,
        S = d.state;
      S.role = role;
      S.org = org;
      S.tab[role] = tab;
      d.ui.sheet = null;
      if (S.dash) Object.assign(S.dash, { athlete: null, sess: null, planView: null });
      S.rosterSid = null;
      d.render();
      return (document.getElementById("view") as HTMLElement).innerText.replace(/\s+/g, " ");
    },
    [role, tab, org] as const,
  );
export const ALL_SCREENS: [Role, string][] = [
  ["athlete", "path"],
  ["athlete", "week"],
  ["athlete", "explore"],
  ["athlete", "coach"],
  ["athlete", "me"],
  ["athlete", "log"],
  ["coach", "today"],
  ["coach", "week"],
  ["coach", "athletes"],
  ["coach", "plans"],
  ["coach", "review"],
  ["coach", "alerts"],
  ["admin", "dash"],
  ["admin", "sched"],
  ["admin", "members"],
  ["admin", "products"],
  ["admin", "money"],
];
/** Layout problems on the screen as it stands: sideways overflow, text or controls pushed off the screen, cut-off text. */
export const layoutProblems = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [],
      vw = innerWidth;
    const name = (el: Element) =>
      `${el.tagName.toLowerCase()} "${((el as HTMLElement).innerText || "").replace(/\s+/g, " ").trim().slice(0, 30)}"`;
    const scrolls = (el: Element) => {
      for (let n = el.parentElement; n; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (
          (s.overflowX === "auto" || s.overflowX === "scroll") &&
          n.scrollWidth > n.clientWidth + 1
        )
          return true;
      }
      return false;
    };
    if (document.documentElement.scrollWidth > vw + 1)
      out.push(`page is ${document.documentElement.scrollWidth}px wide`);
    const root = document.querySelector(".sheet") || document.getElementById("app")!;
    for (const el of root.querySelectorAll<HTMLElement>("*")) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || el.closest(".sr")) continue;
      const cs = getComputedStyle(el);
      if (el.children.length === 0 && (r.right > vw + 1 || r.left < -1) && !scrolls(el))
        out.push(`off screen: ${name(el)}`);
      if (
        el.children.length === 0 &&
        el.innerText &&
        el.scrollWidth > el.clientWidth + 1 &&
        (cs.overflowX === "hidden" || cs.textOverflow === "ellipsis") &&
        cs.display !== "inline"
      )
        out.push(`cut off: ${name(el)}`);
    }
    return [...new Set(out)];
  });
/** Words that must never reach a screen. */
export const BROKEN_TEXT = /NaN|undefined|Invalid Date|\[object|Infinity/;
