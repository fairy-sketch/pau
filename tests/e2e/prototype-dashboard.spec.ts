/* eslint-disable @typescript-eslint/no-explicit-any -- the demo is plain browser JS; its test hook (window.PATH_DEMO) has no types. */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { asRole, open, tab } from "../helpers/demo";

/** Coach and club dashboard, milestone A: Today, Athletes, Athlete detail. */
const demo = <T>(page: Page, fn: (d: any) => T) =>
  page.evaluate(`(${fn.toString()})(window.PATH_DEMO)`) as Promise<T>;
const drafted = (page: Page) =>
  page
    .locator("#draft-sessions .stext")
    .evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value).join(" | "));
const openAthlete = (page: Page, id: string) =>
  page.locator(`[data-a="athlete"][data-v="${id}"]`).first().click();

test("Today opens with a briefing, today's session with a check-in, and at most five things that need the coach", async ({
  page,
}) => {
  await open(page);
  await asRole(page, "coach");
  await expect(page.locator("#briefing")).toContainText("1 session today");
  await expect(page.locator("#briefing")).toContainText("Lea is back after 2 weeks off");
  await expect(page.locator("#briefing")).toContainText("Jonas shared a knee flag");
  const card = page.locator("[data-today]");
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("18:30 · Track session");
  const rows = page.locator("#needs .row");
  expect(await rows.count()).toBeLessThanOrEqual(5);
  // Who needs what today: the people coming to today's session first, each with what they need.
  await expect(rows.first()).toContainText("Coming today.");
  await expect(rows.first().locator("[data-what]")).not.toBeEmpty();
  const mia = page.locator("#needs .row", { hasText: "Mia Keller" });
  await expect(mia).toContainText("Plan draft waiting for you");
  await expect(mia.locator("[data-what]")).toHaveText("Look at the plan change PATH drafted");
  // The check-in button opens the roster that was already there.
  await card.getByRole("button", { name: "Check in" }).click();
  await expect(page.getByRole("button", { name: "Mark all present" })).toBeVisible();
});

test("Athletes: needs-attention first, every status says why, filters narrow the list", async ({
  page,
}) => {
  await open(page);
  await asRole(page, "coach");
  await tab(page, "Athletes");
  await expect(page.locator("#roster-answer")).toHaveText("6 need you, 2 to watch, 41 on track");
  const order = await page
    .locator("#athlete-list .row")
    .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.status));
  expect(order).toEqual(
    [...order].sort(
      (a, b) => ["needs", "watch", "ok"].indexOf(a!) - ["needs", "watch", "ok"].indexOf(b!),
    ),
  );
  const whys = await page.locator("#athlete-list .why").allTextContents();
  expect(whys.every((w) => w.trim().length > 0)).toBe(true);
  expect(whys).toContain("Shared a knee flag, level 6 · Load 138% of usual");
  expect(whys).toContain("No session in 12 days");
  await page.getByRole("button", { name: "Needs you", exact: true }).click();
  await expect(page.locator("#athlete-list .row")).toHaveCount(6);
  await page.getByRole("button", { name: "Technique", exact: true }).click();
  expect(await page.locator("#athlete-list .row").count()).toBeLessThan(6);
  await page.getByRole("button", { name: "Half marathon", exact: true }).click();
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(page.locator("#athlete-list .row").first()).toBeVisible();
});

test("a coach sees only what is shared: private pain never shows, an unshared log stays closed", async ({
  page,
}) => {
  await open(page);
  await asRole(page, "coach");
  await tab(page, "Athletes");
  // Emma has a pain flag she does not share: her status must not mention it.
  const emma = await demo(page, (d) => {
    const a = d.athletes().find((x: any) => x.id === "a15");
    return { pain: !!a.pain, shared: a.shares.pain, why: d.statusOf(a).why };
  });
  expect(emma.pain).toBe(true);
  expect(emma.shared).toBe(false);
  expect(emma.why).not.toMatch(/flag|pain|calf/i);
  await openAthlete(page, "a15");
  await expect(page.locator("#athlete-detail")).not.toContainText(/calf|level 4/i);
  await expect(page.locator("#sharing")).toContainText("Private: pain flags");
  // An athlete who keeps the log to themselves.
  await page.getByRole("button", { name: "Back to athletes" }).click();
  await openAthlete(page, "a8");
  await expect(page.locator("#log-private")).toHaveText("Training log not shared.");
  await expect(page.locator("#detail-logs")).toHaveCount(0);
  // Mia turns off what PAU sees: the coach's view follows at once.
  await asRole(page, "athlete");
  await tab(page, "Me");
  await page.getByRole("switch", { name: /Training log and progress/ }).click();
  await asRole(page, "coach");
  await tab(page, "Athletes");
  await openAthlete(page, "mia");
  await expect(page.locator("#log-private")).toBeVisible();
});

test("what the coach does reaches the athlete, except the private notes", async ({ page }) => {
  await open(page);
  await asRole(page, "coach");
  await tab(page, "Athletes");
  await openAthlete(page, "mia");
  await expect(page.locator("#proposal")).toContainText("PATH proposes");
  await page
    .locator("#detail-logs .row")
    .first()
    .getByRole("button", { name: /^Kudos/ })
    .click();
  await page.locator("#cnote").fill("Tends to start too fast. Talk about pacing.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.locator("#cnote")).toHaveValue("Tends to start too fast. Talk about pacing.");
  await asRole(page, "athlete");
  await tab(page, "Log");
  await expect(page.locator("#entries")).toContainText("Coach Sara Kudos. Well done.");
  for (const name of ["Path", "Week", "Coach", "Me", "Log"]) {
    await tab(page, name);
    await expect(page.locator("#view")).not.toContainText("Talk about pacing");
  }
  // The note survives a reload, for the coach only.
  await page.reload();
  await asRole(page, "coach");
  await tab(page, "Athletes");
  await openAthlete(page, "mia");
  await expect(page.locator("#cnote")).toHaveValue("Tends to start too fast. Talk about pacing.");
});

test("the coach screens pass axe (WCAG A and AA) and keep 44 px targets", async ({ page }) => {
  await open(page);
  await asRole(page, "coach");
  const check = async (name: string) => {
    const r = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      r.violations.map((v) => `${name}: ${v.id}`),
      name,
    ).toEqual([]);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("#app button, #app input")]
        .map((el) => ({
          r: el.getBoundingClientRect(),
          t: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30),
        }))
        .filter((x) => x.r.width && (x.r.width < 44 || x.r.height < 44))
        .map((x) => `${x.t} ${Math.round(x.r.width)}x${Math.round(x.r.height)}`),
    );
    expect(small, name).toEqual([]);
  };
  await check("today");
  await tab(page, "Athletes");
  await check("athletes");
  await openAthlete(page, "a9");
  await check("detail, invented athlete");
  await page.getByRole("button", { name: "Back to athletes" }).click();
  await openAthlete(page, "mia");
  await check("detail, Mia");
});

test.describe("Plans (K-7 to K-11)", () => {
  test("build a plan with PATH, change it, save it, share it: the athlete sees it only after sharing", async ({
    page,
  }) => {
    await open(page);
    await asRole(page, "coach");
    await tab(page, "Plans");
    await expect(page.locator("#plans-answer")).toHaveText("2 plans, 1 shared with your groups");
    await page.getByRole("button", { name: "Add a plan" }).click();
    await page.locator("#pprompt").fill("6 weeks towards a 5K");
    await page.getByRole("button", { name: "Draft it" }).click();
    await expect(page.locator("#plan-draft")).toContainText("18 sessions over 6 weeks");
    expect(await drafted(page)).toContain("6 × 400 m at 5K pace");
    // PATH helps to be creative, and the coach steers.
    await page.getByRole("button", { name: "A playful session each week" }).click();
    await expect(page.locator("#plan-draft")).toContainText("24 sessions over 6 weeks");
    expect(await drafted(page)).toContain("Relay games");
    await page.getByRole("button", { name: "Make it easier" }).click();
    expect(await drafted(page)).toContain("4 × 400 m at 5K pace");
    // The draft stays open: change a line, remove one, add one.
    await page
      .locator("#draft-sessions .stext")
      .first()
      .fill("Track: 5 × 300 m, relaxed, full recovery");
    await expect(page.getByRole("group", { name: "Change the draft" })).toHaveCount(0); // hand edits are never overwritten
    await page
      .locator('[data-week="1"]')
      .getByRole("button", { name: "Remove this session" })
      .last()
      .click();
    await page.locator('[data-week="1"]').getByRole("button", { name: "Add a session" }).click();
    await expect(page.locator('[data-week="1"] .stext').last()).toBeFocused();
    await page
      .locator('[data-week="1"] .stext')
      .last()
      .fill("Coffee run, 30 min, all paces together");
    await page.locator('[data-week="1"] .sday').last().selectOption("Sun");
    await page.locator("#ptitle").fill("Spring 5K");
    await page.getByRole("button", { name: "Save plan" }).click();
    await expect(page.locator("#plan-status")).toContainText("Not shared yet");

    // Not shared: Mia sees nothing of it.
    await asRole(page, "athlete");
    await expect(page.locator("#from-coach")).not.toContainText("Spring 5K");
    await asRole(page, "coach");
    await tab(page, "Plans");
    await page.locator("#plan-list .row", { hasText: "Spring 5K" }).click();
    await page.getByRole("button", { name: /^Track/ }).click();
    await page.getByRole("button", { name: "Share with Track" }).click();
    await expect(page.locator(".toast")).toContainText("Shared with Track: 33 athletes");
    await expect(page.locator("#personal")).toContainText("waits for your approval in Review");
    await asRole(page, "athlete");
    const card = page.locator("#from-coach [data-plan]", { hasText: "Spring 5K" });
    await expect(card).toContainText("Coach Sara shared this with the Track group");
    await expect(card).toContainText("Relay games");
    await expect(card).toContainText("Track: 5 × 300 m, relaxed, full recovery");
    await expect(card).toContainText("Coffee run, 30 min, all paces together");
    // And it goes away when the coach stops sharing. It survives a reload until then.
    await page.reload();
    await expect(page.locator("#from-coach")).toContainText("Spring 5K");
    await asRole(page, "coach");
    await tab(page, "Plans");
    await page.locator("#plan-list .row", { hasText: "Spring 5K" }).click();
    await page.getByRole("button", { name: "Stop sharing" }).click();
    await asRole(page, "athlete");
    await expect(page.locator("#from-coach")).not.toContainText("Spring 5K");
  });

  test("bring your own plan: pasted text and a text file are read into weeks and sessions", async ({
    page,
  }) => {
    await open(page);
    await asRole(page, "coach");
    await tab(page, "Plans");
    await page.getByRole("button", { name: "Add a plan" }).click();
    await page.getByRole("button", { name: "Upload or paste" }).click();
    await page.getByRole("button", { name: "Read my plan" }).click();
    await expect(page.locator("#pnote")).toContainText("found no sessions");
    await page
      .locator("#ptext")
      .fill("Woche 1\nMo: 5 x 1 km\n- Do: Tempolauf 25 min\nWeek 2\nSat: long run 80 min");
    await page.getByRole("button", { name: "Read my plan" }).click();
    await expect(page.locator("#plan-draft")).toContainText("3 sessions over 2 weeks");
    expect(await drafted(page)).toBe("5 x 1 km | Tempolauf 25 min | long run 80 min");
    await expect(page.locator("#draft-sessions .sday").first()).toHaveValue("Mon");
    await page.getByRole("button", { name: "Start over" }).click();
    await page.locator("#pfile").setInputFiles({
      name: "herbst-block.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Mon: hills\nThu: track"),
    });
    await expect(page.locator("#pnote")).toContainText('Read "herbst-block.txt"');
    await page.getByRole("button", { name: "Read my plan" }).click();
    await expect(page.locator("#ptitle")).toHaveValue("herbst-block");
    // A file PATH cannot read in the demo says so plainly.
    await page.getByRole("button", { name: "Start over" }).click();
    await page.locator("#pfile").setInputFiles({
      name: "plan.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF"),
    });
    await expect(page.locator("#pnote")).toContainText("is not a text file");
  });

  test("the Plans screens pass axe and keep 44 px targets", async ({ page }) => {
    await open(page);
    await asRole(page, "coach");
    await tab(page, "Plans");
    const check = async (name: string) => {
      const r = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        r.violations.map((v) => `${name}: ${v.id}`),
        name,
      ).toEqual([]);
      const small = await page.evaluate(() =>
        [
          ...document.querySelectorAll<HTMLElement>(
            "#app button, #app input:not(.sr), #app textarea, #app label.btn",
          ),
        ]
          .map((el) => ({
            r: el.getBoundingClientRect(),
            t: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30),
          }))
          .filter((x) => x.r.width && (x.r.width < 44 || x.r.height < 44))
          .map((x) => `${x.t} ${Math.round(x.r.width)}x${Math.round(x.r.height)}`),
      );
      expect(small, name).toEqual([]);
    };
    await check("list");
    await page.getByRole("button", { name: "Add a plan" }).click();
    await check("new, with PATH");
    await page.getByRole("button", { name: "Upload or paste" }).click();
    await check("new, own");
    await page.getByRole("button", { name: "Build with PATH" }).click();
    await page.getByRole("button", { name: "Race week taper" }).click();
    await check("draft");
    await page.getByRole("button", { name: "Save plan" }).click();
    await check("detail");
  });
});

test("free words: a description becomes a draft, written-out sessions keep the coach's words, and a saved plan can be edited", async ({
  page,
}) => {
  await open(page);
  await asRole(page, "coach");
  await tab(page, "Plans");
  await page.getByRole("button", { name: "Add a plan" }).click();
  const box = page.locator("#pprompt");
  expect((await box.boundingBox())!.height).toBeGreaterThanOrEqual(240); // room to write freely
  // Written-out sessions: PATH only sorts them.
  await box.fill(
    "Dienstag wird hart, Samstag locker.\nDi: 8 x 200 m Bergsprints, viel Pause\nSa: 50 min locker mit der ganzen Gruppe\nWoche 2\nDi: Staffelspiele",
  );
  await page.getByRole("button", { name: "Draft it" }).click();
  await expect(page.locator("#plan-draft")).toContainText("Structured from your words");
  expect(await drafted(page)).toBe(
    "Dienstag wird hart, Samstag locker. | 8 x 200 m Bergsprints, viel Pause | 50 min locker mit der ganzen Gruppe | Staffelspiele",
  );
  await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.locator("#pprompt")).toHaveValue(/Bergsprints/); // the words are kept
  // A description: PATH drafts.
  await page
    .locator("#pprompt")
    .fill("eight weeks towards a half marathon for my long run group, keep it fun");
  await page.getByRole("button", { name: "Draft it" }).click();
  await expect(page.locator("#plan-draft")).toContainText("Drafted by PATH");
  await expect(page.locator("#ptitle")).toHaveValue("Half marathon build, 8 weeks");
  await page.getByRole("button", { name: "Add a week" }).click();
  await page.locator('[data-week="9"] .stext').fill("Race rehearsal: 10 km at goal pace");
  await page.getByRole("button", { name: "Save plan" }).click();
  await expect(page.locator("#plan-detail")).toContainText("Race rehearsal: 10 km at goal pace");
  // Still flexible after saving.
  await page.getByRole("button", { name: "Edit plan" }).click();
  await page.locator("#draft-sessions .stext").first().fill("Tempo run, by feel");
  await page.getByRole("button", { name: "Save plan" }).click();
  await expect(page.locator("#plan-detail")).toContainText("Tempo run, by feel");
});

test.describe("Week: groups and one-to-one in one place (K-14 to K-18)", () => {
  test("the week lists every session, a group opens its plan and who is coming, a person opens their page", async ({
    page,
  }) => {
    await open(page);
    await asRole(page, "coach");
    await tab(page, "Week");
    await expect(page.locator("#week-answer")).toHaveText(
      "6 sessions: 3 groups, 3 one-to-one, 1 open slot",
    );
    await expect(page.locator('#coach-week [data-kind="group"]')).toHaveCount(3);
    // Only the sessions this coach runs: a colleague's Gym session is not "yours".
    await expect(page.locator("#coach-week")).not.toContainText("Gym session");
    await expect(page.locator('#coach-week [data-kind="one"]')).toHaveCount(3);
    await expect(page.locator('#coach-week [data-kind="open"]')).toHaveCount(1);
    // Each session says which plan it runs on.
    const monday = page.locator('[data-day="2026-11-16"] [data-kind="group"]');
    await expect(monday).toContainText("Track session");
    await expect(monday).toContainText("Base block, week 1: Track: 4 × 1 km at 10K pace");
    await expect(page.locator('#coach-week [data-kind="one"]').first()).toContainText(
      "Jonas Meier",
    );
    await expect(page.locator('#coach-week [data-kind="one"]').first()).toContainText("Base block");

    // A group: the plan for that session and everyone who is coming, each one a tap away.
    await monday.click();
    await expect(page.locator("#session-plan")).toContainText(
      "Track: 4 × 1 km at 10K pace, 2 min jog",
    );
    const people = page.locator("#attendees .row");
    expect(await people.count()).toBeGreaterThan(10);
    const id = await people.nth(3).getAttribute("data-v");
    const name = await page.evaluate(
      (id) => window.PATH_DEMO.athletes().find((a: any) => a.id === id).name,
      id,
    );
    await people.nth(3).click();
    await expect(page.locator("#athlete-detail h1")).toHaveText(name);
    await expect(page.locator("#plan-from-you")).toContainText(/Base block|No plan from you yet/);
    await page.getByRole("button", { name: "Back to the session" }).click();
    await expect(page.locator("#coach-session")).toBeVisible();
    await page.getByRole("button", { name: "Check in" }).click();
    await expect(page.getByRole("button", { name: "Mark all present" })).toBeVisible();

    // A private coach sees the same screen with only people on it.
    await tab(page, "Week");
    await page.getByRole("button", { name: "One-to-one", exact: true }).click();
    await expect(page.locator('#coach-week [data-kind="group"]')).toHaveCount(0);
    await page.locator('#coach-week [data-kind="one"]').first().click();
    await page.getByRole("button", { name: "Open Jonas Meier's page" }).click();
    await expect(page.locator("#athlete-detail h1")).toHaveText("Jonas Meier");
    // Next week is there too.
    await page.getByRole("button", { name: "Back to the session" }).click();
    await page.getByRole("button", { name: "Next week" }).click();
    await expect(page.locator("#coach-week")).toContainText("Next week");
  });

  test("Mia shows up in the session she booked, and the Week screens pass axe with 44 px targets", async ({
    page,
  }) => {
    await open(page);
    await demo(page, (d) => {
      d.book("pau-track-2026-11-16", "sheet");
      d.render();
    });
    await asRole(page, "coach");
    await tab(page, "Week");
    const check = async (label: string) => {
      const r = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        r.violations.map((v) => `${label}: ${v.id}`),
        label,
      ).toEqual([]);
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("#app button")]
          .map((el) => ({
            r: el.getBoundingClientRect(),
            t: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30),
          }))
          .filter((x) => x.r.width && (x.r.width < 44 || x.r.height < 44))
          .map((x) => `${x.t} ${Math.round(x.r.width)}x${Math.round(x.r.height)}`),
      );
      expect(small, label).toEqual([]);
    };
    await check("week");
    await page.locator('[data-day="2026-11-16"] [data-kind="group"]').click();
    await expect(page.locator("#attendees")).toContainText("Mia Keller");
    await check("session");
  });
});

test("the athlete's Path shows the plan they follow, and it mirrors what the coach set (K-19 to K-21)", async ({
  page,
}) => {
  await open(page);
  const plan = page.locator("#from-coach");
  await expect(plan).toContainText("Your plan");
  await expect(page.locator("#plan-week")).toHaveText("Week 1 of 4 · this week");
  await expect(plan.locator("[data-plan] .h2")).toHaveText("Base block");
  await expect(plan).toContainText("Coach Sara shared this with the Track group");
  await expect(plan.locator("details")).toHaveCount(0); // no folded-away "whole plan"
  // Every day opens: what to do, who set it, and the one next thing to do.
  const monday = plan.locator("#plan-days .row", { hasText: "Track: 4 × 1 km at 10K pace" });
  await expect(monday).toContainText("Club session · 18:30");
  await monday.click();
  const day = page.getByRole("dialog", { name: "Monday, week 1" });
  await expect(day.locator(".h1")).toHaveText("Track: 4 × 1 km at 10K pace, 2 min jog");
  await expect(day).toContainText("From Coach Sara · Base block");
  await expect(day).toContainText("Track session, 18:30");
  await day.getByRole("button", { name: "Book this session" }).click();
  await expect(page.locator(".sheet")).toContainText("Track session");
  await demo(page, (d) => {
    d.ui.sheet = null;
    d.book("pau-track-2026-11-16", "sheet");
    d.render();
  });
  await expect(monday).toContainText("Booked · 18:30");
  // A day with no club session is done on your own and logged.
  await plan.locator("#plan-days .row", { hasText: "Long run" }).click();
  await expect(page.getByRole("dialog", { name: "Sunday, week 1" })).toContainText(
    "Do it on your own, then log it",
  );
  await page
    .getByRole("dialog", { name: "Sunday, week 1" })
    .getByRole("button", { name: "Close" })
    .click();
  // The other weeks are one step away, each day just as open.
  await page.getByRole("button", { name: "Next week of the plan" }).click();
  await expect(page.locator("#plan-week")).toHaveText("Week 2 of 4");
  await plan.locator("#plan-days .row").first().click();
  await expect(page.getByRole("dialog", { name: "Monday, week 2" })).toContainText(
    "Track: 5 × 1 km at 10K pace",
  );
  await page
    .getByRole("dialog", { name: "Monday, week 2" })
    .getByRole("button", { name: "Close" })
    .click();
  // The same line shows on the session in Week.
  await tab(page, "Week");
  await expect(page.locator("#plan-note")).toHaveText(
    "Your plan: Track: 4 × 1 km at 10K pace, 2 min jog",
  );

  // The coach sees the same plan on Mia's page and on the session; a newer shared plan becomes the one she follows.
  await asRole(page, "coach");
  await tab(page, "Athletes");
  await openAthlete(page, "mia");
  await expect(page.locator("#plan-from-you")).toContainText("Base block");
  await tab(page, "Plans");
  await page.locator("#plan-list .row", { hasText: "Race week taper" }).click();
  await page.getByRole("button", { name: /^Track/ }).click();
  await page.getByRole("button", { name: "Share with Track" }).click();
  await tab(page, "Week");
  await expect(page.locator('[data-day="2026-11-16"] [data-kind="group"]')).toContainText(
    "Race week taper, week 1: Track: 4 × 400 m at race pace",
  );
  await asRole(page, "athlete");
  await tab(page, "Path");
  await expect(plan.locator("[data-plan] .h2")).toHaveText("Race week taper");
  await expect(page.locator("#also-shared")).toHaveText("Also from your coach: Base block.");
  // One plan: the newer plan's days replace the older plan's, and the days it leaves free are her own again.
  await expect(plan.locator("#plan-days")).toContainText(
    "Track: 4 × 400 m at race pace, long rests",
  );
  await expect(plan.locator("#plan-days")).not.toContainText("4 × 1 km at 10K pace");
  await expect(plan.locator("#plan-days .row", { hasText: "Easy run 40 min" })).toContainText(
    "Your own day",
  );
});

test.describe("Build with PATH, with the real model behind it (K-23)", () => {
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
  };
  test("the draft comes from the server function, can be redrafted in words, and falls back to the rules if it fails", async ({
    page,
  }) => {
    const asked: any[] = [];
    let fail = false;
    await page.addInitScript(() => {
      (window as any).PATH_LLM_URL = "http://path.test/api/coach";
    });
    await page.route("http://path.test/api/coach", async (route) => {
      if (route.request().method() === "OPTIONS")
        return route.fulfill({ status: 204, headers: cors });
      const body = route.request().postDataJSON();
      asked.push(body);
      if (fail)
        return route.fulfill({
          status: 502,
          headers: cors,
          contentType: "application/json",
          body: '{"error":"model"}',
        });
      const sessions = body.change
        ? [{ week: 1, day: "Tue", text: "Hill sprints, 8 × 30 s" }]
        : [
            { week: 1, day: "Tue", text: "Fartlek through the forest, by feel" },
            { week: 1, day: "Sat", text: "Long run with coffee stop" },
          ];
      await route.fulfill({
        status: 200,
        headers: cors,
        contentType: "application/json",
        body: JSON.stringify({ title: "Forest block", sessions }),
      });
    });
    await open(page);
    await asRole(page, "coach");
    await tab(page, "Plans");
    await page.getByRole("button", { name: "Add a plan" }).click();
    await page.locator("#pprompt").fill("Something wild for my Tuesday group, lots of forest");
    await page.getByRole("button", { name: "Draft it" }).click();
    await expect(page.locator("#ptitle")).toHaveValue("Forest block");
    expect(await drafted(page)).toBe(
      "Fartlek through the forest, by feel | Long run with coffee stop",
    );
    expect(asked[0]).toEqual({ words: "Something wild for my Tuesday group, lots of forest" });
    // Redraft in words: the current draft and the wish go to the model.
    await page.locator("#pchange").fill("make it hills only");
    await page.getByRole("button", { name: "Redraft" }).click();
    await expect(page.locator("#draft-sessions .stext")).toHaveCount(1);
    expect(asked[1].change).toBe("make it hills only");
    expect(asked[1].current.sessions).toHaveLength(2);
    // The key never comes near the browser: the page sends words only.
    expect(JSON.stringify(asked)).not.toMatch(/sk-|api[-_]?key/i);
    // If the model cannot be reached, the coach still gets a draft, and is told which kind.
    fail = true;
    await page.getByRole("button", { name: "Start over" }).click();
    await page.locator("#pprompt").fill("4 weeks towards a 10K");
    await page.getByRole("button", { name: "Draft it" }).click();
    await expect(page.locator("#pnote")).toContainText(
      "could not be reached, so this draft follows simple rules",
    );
    await expect(page.locator("#ptitle")).toHaveValue("10K build, 4 weeks");
  });
});
