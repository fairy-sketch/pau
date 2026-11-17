// Screenshots of every screen of the demo at 390 px, for before/after comparison.
// Usage: node scripts/qa-shots.mjs <out-dir>
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const out = process.argv[2] || "shots";
mkdirSync(out, { recursive: true });
const TABS = {
  athlete: ["path", "week", "explore", "coach", "me", "log"],
  coach: ["today", "week", "athletes", "plans", "review", "alerts"],
  admin: ["dash", "sched", "members", "products", "money"],
};
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: "Europe/Zurich", locale: "en-GB" });
const p = await c.newPage();
await p.clock.setFixedTime(new Date("2026-11-16T12:00:00+01:00"));
await p.goto(new URL("../prototype/index.html", import.meta.url).href);
await p.waitForSelector("nav");
for (const org of ["pau", "studio"])
  for (const [role, tabs] of Object.entries(TABS))
    for (const tab of tabs) {
      await p.evaluate(([role, tab, org]) => {
        const d = window.PATH_DEMO, S = d.state;
        S.role = role; S.org = org; S.tab[role] = tab; d.ui.sheet = null;
        if (S.dash) Object.assign(S.dash, { athlete: null, sess: null, planView: null });
        S.rosterSid = null; d.render(); scrollTo(0, 0);
      }, [role, tab, org]);
      await p.waitForTimeout(150);
      await p.screenshot({ path: `${out}/${org}-${role}-${tab}.png`, fullPage: true });
    }
await b.close();
console.log("saved to", out);
