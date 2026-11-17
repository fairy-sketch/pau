/* eslint-disable @typescript-eslint/no-explicit-any -- the demo is plain browser JS; its test hook (window.PATH_DEMO) has no types. */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { asRole, open, tab } from "../helpers/demo";

/** Coach and club dashboard, milestone A: Today, Athletes, Athlete detail. */
const demo = <T>(page: Page, fn: (d: any) => T) =>
  page.evaluate(`(${fn.toString()})(window.PATH_DEMO)`) as Promise<T>;
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
  await expect(rows.first()).toContainText("Mia Keller");
  await expect(rows.first()).toContainText("Plan draft waiting for you");
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
  await expect(page.locator("#roster-answer")).toHaveText("6 need you, 2 to watch, 20 on track");
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
    const a = d.athletes().find((x: any) => x.id === "a7");
    return { pain: !!a.pain, shared: a.shares.pain, why: d.statusOf(a).why };
  });
  expect(emma.pain).toBe(true);
  expect(emma.shared).toBe(false);
  expect(emma.why).not.toMatch(/flag|pain|calf/i);
  await openAthlete(page, "a7");
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
  await openAthlete(page, "a1");
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
    await expect(page.locator("#draft-sessions")).toContainText("6 × 400 m at 5K pace");
    // PATH helps to be creative, and the coach steers.
    await page.getByRole("button", { name: "A playful session each week" }).click();
    await expect(page.locator("#plan-draft")).toContainText("24 sessions over 6 weeks");
    await expect(page.locator("#draft-sessions")).toContainText("Relay games");
    await page.getByRole("button", { name: "Make it easier" }).click();
    await expect(page.locator("#draft-sessions")).toContainText("4 × 400 m at 5K pace");
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
    await expect(page.locator(".toast")).toContainText("Shared with Track: 19 athletes");
    await expect(page.locator("#personal")).toContainText("waits for your approval in Review");
    await asRole(page, "athlete");
    const card = page.locator("#from-coach [data-plan]", { hasText: "Spring 5K" });
    await expect(card).toContainText("Coach Sara shared this with the Track group");
    await expect(card).toContainText("Relay games");
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
    await expect(page.locator("#draft-sessions .row").first()).toHaveText("Mon5 x 1 km");
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
