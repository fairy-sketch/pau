/* eslint-disable @typescript-eslint/no-explicit-any -- the demo is plain browser JS; its test hook (window.PATH_DEMO) has no types. */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { asRole, atClub, cards, lastCard, open, say, tab, toast } from "../helpers/demo";

/**
 * Explore: clubs, personal coaches and pro athletes with something open. A photo grid or a map, filters,
 * a page per provider (what they say, try their plan, book), and the coach can look there too.
 */
const explore = (page: Page) =>
  page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: "Explore" });
const tiles = (page: Page) => page.locator("#xgrid .tile");
const chip = (page: Page, name: string) =>
  page.locator("#explore .filters, #xkinds").getByRole("button", { name, exact: true });
const demo = <T>(page: Page, fn: (d: any) => T) =>
  page.evaluate(`(${fn.toString()})(window.PATH_DEMO)`) as Promise<T>;

test("the icon top right opens a photo grid of clubs, coaches and pros", async ({ page }) => {
  await open(page);
  await explore(page).click();
  await expect(page.getByRole("heading", { name: "Try something new" })).toBeVisible();
  await expect(tiles(page)).toHaveCount(38);
  await expect(page.locator("#xcount")).toHaveText("38 of 38");
  // Every tile shows one of the supplied photos, and it loads.
  await expect
    .poll(() =>
      page
        .locator("#xgrid img")
        .evaluateAll((els) => els.every((e) => (e as HTMLImageElement).complete)),
    )
    .toBe(true);
  const imgs = await page.locator("#xgrid img").evaluateAll((els) =>
    els.map((e) => ({
      ok: (e as HTMLImageElement).naturalWidth > 0,
      src: e.getAttribute("src"),
    })),
  );
  expect(
    imgs.every(
      (i) => i.ok && /^images\/(class|hero|people|texture|moment)-[a-z-]+\.jpg$/.test(i.src ?? ""),
    ),
  ).toBe(true);
  // Coaches and pros are marked on their tile.
  await expect(page.locator('#xgrid .tile[data-kind="pro"] .who')).toHaveText([
    "Pro",
    "Pro",
    "Pro",
  ]);
  await expect(page.locator('#xgrid .tile[data-kind="coach"] .who')).toHaveText(["Coach", "Coach"]);
  await chip(page, "Pros").click();
  await expect(tiles(page)).toHaveCount(3);
  await chip(page, "Pros").click();
  // Physio, massage, nutrition, mental coaching, recovery: everything around training is here too.
  await chip(page, "Care").click();
  await expect(tiles(page)).toHaveCount(5);
  await expect(page.locator("#xgrid .tile .who")).toHaveText([
    "Care",
    "Care",
    "Care",
    "Care",
    "Care",
  ]);
  await tiles(page).filter({ hasText: "Runner's check" }).click();
  await expect(page.locator("#provider")).toContainText("Health and recovery");
  await expect(page.locator("#provider")).toContainText(
    "We assess and advise; we don't diagnose in an app.",
  );
  await page.getByRole("button", { name: "Back to Explore" }).click();
  await chip(page, "Care").click();
  // Only the athlete has Explore; the bottom tabs still lead back.
  await tab(page, "Path");
  await expect(page.getByRole("heading", { name: "Try something new" })).toHaveCount(0);
  await asRole(page, "coach");
  await expect(explore(page)).toHaveCount(0);
});

test("a pro's page leads from what they say, to trying their plan, to a booking", async ({
  page,
}) => {
  await open(page);
  await explore(page).click();
  await tiles(page).filter({ hasText: "Small-group session with Nico" }).click();
  const prov = page.locator("#provider");
  await expect(prov.getByRole("heading", { name: "Nico Baumann" })).toBeVisible();
  await expect(prov).toContainText("Pro footballer, central midfield");
  await expect(prov).toContainText("1 · From Nico");
  await expect(prov).toContainText("What a match week really looks like");
  await expect(prov).toContainText("2 · Try their plan");
  await expect(prov).toContainText("Train like a midfielder");
  await expect(prov).toContainText("3 · Book a session");

  // Step 2: the plan goes on the Path, next to her own plan, which is untouched.
  const planBefore = await demo(page, (d) => JSON.stringify(d.state.plan));
  await prov.getByRole("button", { name: "Add to my Path" }).click();
  await expect(toast(page)).toContainText(
    '"Train like a midfielder" by Nico Baumann is on your Path. Your own plan stays as it is. Next: book a session with them.',
  );
  await expect(page.locator("#onpath")).toContainText("On your Path since Mon 16 Nov");
  expect(await demo(page, (d) => JSON.stringify(d.state.plan))).toBe(planBefore);
  await tab(page, "Path");
  const trying = page.locator("#trying");
  await expect(trying).toContainText("Train like a midfielder");
  await expect(trying).toContainText("Day 1 of 5: Ball mastery, 20 min, easy");
  // Day 2 is a hard day, and her load is at 122%: the guardrail holds it back here too.
  await demo(page, (d) => {
    d.state.tryPlans[0].at = new Date(2026, 10, 15, 12); // she added it yesterday
    d.render();
  });
  await expect(trying).toContainText(
    "Day 2 of 5: Easy day. The hard session waits until your load is back in range.",
  );

  // Step 3: from the Path card back to the page, and book (a paid session goes through the test checkout).
  await trying.getByRole("button").click();
  await page.locator("#booknow").getByRole("button", { name: "Book · CHF 45.00" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Put my name down · CHF 45.00" })
    .click();
  expect(await demo(page, (d) => d.signedUp("nico"))).toBe(false);
  await page
    .getByRole("dialog", { name: "Checkout" })
    .getByRole("button", { name: "Pay with TWINT" })
    .click();
  await expect(toast(page)).toContainText(
    "No real money moved. You're in: Small-group session with Nico at Nico Baumann, Mon 23 Nov 18:00",
  );
  await expect(page.locator("#booknow")).toContainText("Your name is down");
  await tab(page, "Path");
  await expect(page.locator("#trying")).toContainText("Booked");
});

test("a club session: put your name down, see it on your list, take it off again", async ({
  page,
}) => {
  await open(page);
  await explore(page).click();
  await tiles(page).filter({ hasText: "First climb" }).click();
  await expect(page.locator("#provider")).toContainText("Block 9 Boulder");
  await expect(page.locator("#provider")).toContainText("Get ready for climbing");
  await page.locator("#booknow").getByRole("button", { name: "Book, free" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toContainText("Thu 19 Nov · 18:30");
  await expect(sheet).toContainText("5 / 12 left");
  await expect(sheet).toContainText("sees your name, nothing else");
  await sheet.getByRole("button", { name: "Put my name down" }).click();
  await expect(toast(page)).toContainText(
    "You're in: First climb, shoes included at Block 9 Boulder, Thu 19 Nov 18:30",
  );
  // It has nothing to do with her passes or her club bookings.
  expect(
    await demo(page, (d) => [d.passState(d.passOf("pau")).text, d.upcomingBookings().length]),
  ).toEqual(["3 of 4 used in November", 1]);

  await page.getByRole("button", { name: "Back to Explore" }).click();
  await expect(page.locator("#mylist")).toContainText("Your list · 1");
  await expect(
    tiles(page).filter({ hasText: "First climb" }).filter({ hasText: "your name is down" }),
  ).toBeVisible();
  // The list survives a reload; taking the name off works from the list.
  await page.reload();
  await expect(page.locator("#mylist .row")).toHaveCount(1);
  await page.getByRole("button", { name: "Take my name off: First climb, shoes included" }).click();
  await expect(page.locator("#mylist")).toHaveCount(0);
  // A full session offers its waitlist, and says what that means.
  await tiles(page).filter({ hasText: "Kickboxing" }).click();
  await expect(page.locator("#booknow")).toContainText("This one is full.");
  await page.locator("#booknow").getByRole("button", { name: "Join waitlist" }).click();
  await expect(page.locator("#consequence")).toContainText("It is full. You can join the waitlist");
  await expect(page.locator("#consequence")).toContainText("nothing is charged until then");
  await page.getByRole("dialog").getByRole("button", { name: "Join waitlist" }).click();
  await expect(toast(page)).toContainText("You are on the waitlist for Kickboxing pad work, intro");
  await expect(page.locator("#booknow")).toContainText("You are on the waitlist.");
});

test("Explore navigation: who offers it first, then the discipline, and the two stay in step", async ({
  page,
}) => {
  await open(page);
  await explore(page).click();
  const kinds = page.getByRole("group", { name: "Who offers it" }).getByRole("button");
  const discs = page.getByRole("group", { name: "Discipline" }).getByRole("button");
  await expect(kinds).toHaveText(["All", "Clubs", "Coaches", "Pros", "Care", "Events"]);
  await expect(page.locator("#map")).toHaveCount(0); // no map any more
  await expect(page.getByRole("button", { name: "Map", exact: true })).toHaveCount(0);
  // All six fit side by side: none is cut off or scrolled away.
  const row = (await page.locator("#xkinds").boundingBox())!;
  for (const box of await kinds.evaluateAll((els) =>
    els.map((e) => e.getBoundingClientRect().toJSON()),
  )) {
    expect(box.left).toBeGreaterThanOrEqual(row.x);
    expect(box.right).toBeLessThanOrEqual(row.x + row.width + 0.5);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }

  // Discipline narrows what is shown; "Free" narrows it further.
  await chip(page, "Water").click();
  await expect(tiles(page)).toHaveCount(2);
  await page.getByRole("button", { name: "Free", exact: true }).click();
  await expect(tiles(page)).toHaveCount(1);
  await expect(tiles(page).first()).toContainText("Swimming");
  await expect(page.locator("#xcount")).toHaveText("1 of 38");
  await page.getByRole("button", { name: "Free", exact: true }).click();

  // The discipline row follows the "who": under Care it is treatments, not sports.
  await kinds.filter({ hasText: "Care" }).click();
  await expect(discs).toHaveText([
    "All",
    "Massage",
    "Mental coaching",
    "Physiotherapy",
    "Recovery",
    "Sports nutrition",
  ]);
  await expect(discs.first()).toHaveAttribute("aria-pressed", "true"); // "Water" no longer exists here, so it fell back to All
  await expect(tiles(page)).toHaveCount(5);
  await chip(page, "Physiotherapy").click();
  await expect(tiles(page)).toHaveCount(1);
  await expect(tiles(page).first().locator(".who")).toHaveText("Care");

  // Every discipline that is offered has something behind it: no dead ends.
  for (const kind of ["All", "Clubs", "Coaches", "Pros", "Events"]) {
    await kinds.filter({ hasText: new RegExp(`^${kind}$`) }).click();
    const names = await discs.allTextContents();
    expect(names.length, kind).toBeGreaterThan(1);
    const empty = await demo(page, (d) => {
      const S = d.state,
        keep = S.explore.group,
        none: string[] = [];
      for (const g of d.disciplines()) {
        S.explore.group = g;
        if (!d.exploreList().length) none.push(g);
      }
      S.explore.group = keep;
      return none;
    });
    expect(empty, kind).toEqual([]);
  }
  // The choice survives a reload.
  await kinds.filter({ hasText: "Pros" }).click();
  await page.reload();
  await expect(kinds.filter({ hasText: "Pros" })).toHaveAttribute("aria-pressed", "true");
});

test("the coach looks in Explore too: suggests, respects the guardrail, and acts only after a confirm", async ({
  page,
}) => {
  await open(page);
  await tab(page, "Coach");
  await say(page, "Suggest something new for me");
  // The seeded week is at 122% of the average, so only easy sessions are suggested.
  await expect(page.locator(".msg.coach").last()).toContainText(
    "Your load is up, so I only looked at easy sessions",
  );
  const picks = page.locator("[data-picks]").last().getByRole("button");
  await expect(picks).toHaveCount(3);
  expect(
    await demo(page, (d) =>
      d.state.chat[d.state.chat.length - 1].picks.every(
        (id: string) => d.OFFERS.find((o: any) => o.id === id).intensity === "low",
      ),
    ),
  ).toBe(true);
  expect(await demo(page, (d) => d.state.signups.length + d.state.tryPlans.length)).toBe(0); // suggesting changes nothing
  // A suggestion opens the provider's page.
  await picks.first().click();
  await expect(page.locator("#provider")).toBeVisible();
  await tab(page, "Coach");

  // With an open pain flag, a physio comes first, and the flag is not passed on.
  await page.evaluate(() => {
    const d = window.PATH_DEMO,
      e = d.state.entries[0];
    Object.assign(e, { pain: true, painWhere: "Knee", painLevel: 4, at: new Date() });
    d.render();
  });
  await say(page, "Suggest something new for me");
  await expect(page.locator(".msg.coach").last()).toContainText("A physio is first on the list");
  await expect(page.locator(".msg.coach").last()).toContainText(
    "They only learn about it if you tell them",
  );
  await expect(page.locator("[data-picks]").last().getByRole("button").first()).toHaveText(
    "View: Physio am Fluss",
  );
  await page.evaluate(() => {
    window.PATH_DEMO.state.entries[0].pain = false;
  });

  // Events: the coach lists them, and puts the 10K first because it fits her goal.
  await say(page, "any events coming up?");
  await expect(page.locator(".msg.coach").last()).toContainText(
    "1. Limmat Night Run, 10K, Stadtlauf Verein: Sat 12 Dec 19:30",
  );
  await expect(page.locator(".msg.coach").last()).toContainText("which fits your goal");
  await expect(page.locator("[data-picks]").last().getByRole("button")).toHaveCount(3);

  // Coaches and pros, and adding a plan through a confirm card.
  await say(page, "any pro athletes or coaches I could train with?");
  await expect(page.locator(".msg.coach").last()).toContainText(
    "Coaches and pros who have something open",
  );
  await say(page, "add Nico's plan");
  await expect(lastCard(page).locator(".h2")).toHaveText("Add this plan to your Path?");
  await expect(lastCard(page)).toContainText("Train like a midfielder, by Nico Baumann");
  await expect(lastCard(page)).toContainText("its hard days are held back");
  await lastCard(page).getByRole("button", { name: "Confirm" }).click();
  await expect(lastCard(page).locator(".results li")).toHaveText([
    /"Train like a midfielder" by Nico Baumann is on your Path/,
  ]);

  // Signing up through the coach needs a confirm card; the coach never pays.
  await say(page, "sign me up for the climbing trial");
  await expect(lastCard(page).locator(".h2")).toHaveText("Put your name down?");
  expect(await demo(page, (d) => d.signedUp("boulder"))).toBe(false);
  await lastCard(page).getByRole("button", { name: "Confirm" }).click();
  await expect(lastCard(page).locator(".results li")).toHaveText([
    /You're in: First climb, shoes included at Block 9 Boulder/,
  ]);
  await say(page, "sign me up for padel");
  await expect(page.locator(".msg.coach").last()).toContainText(
    "costs CHF 15.00. I never pay for you",
  );
  await expect(cards(page)).toHaveCount(2);
  await say(page, "is there any rowing nearby?");
  await expect(page.locator(".msg.coach").last()).toContainText("Learn to row, Ruderclub Limmat");
  // Club sessions are still club sessions: "book gym on Friday" is not an Explore request.
  await say(page, "book gym on Friday");
  await expect(lastCard(page)).toContainText("Gym session, Fri 20 Nov");
});

test("Explore passes axe (WCAG A and AA), has 44 px targets and names on every control", async ({
  page,
}) => {
  await open(page);
  await explore(page).click();
  const problems: string[] = [];
  const check = async (name: string) => {
    const found = await page.evaluate(() => {
      const out: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>("button, select, input, summary")) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const label = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40);
        if (r.width < 43.5 || r.height < 43.5)
          out.push(`small "${label}" ${Math.round(r.width)}x${Math.round(r.height)}`);
        if (!label) out.push(`unnamed ${el.outerHTML.slice(0, 60)}`);
      }
      return out;
    });
    for (const f of found) problems.push(`${name}: ${f}`);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    for (const v of violations) problems.push(`${name}: ${v.id} ${v.nodes[0]?.target.join(" ")}`);
  };
  await check("grid");
  await tiles(page).filter({ hasText: "Slow flow" }).click();
  await check("provider page");
  await page.getByRole("button", { name: "Add to my Path" }).click();
  await page.getByRole("button", { name: "Dismiss message" }).click();
  await page.locator("#booknow").getByRole("button", { name: "Book, free" }).click();
  await check("session sheet");
  await page.getByRole("dialog").getByRole("button", { name: "Put my name down" }).click();
  await page.getByRole("button", { name: "Back to Explore" }).click();
  await check("grid with my list");
  await page
    .getByRole("group", { name: "Who offers it" })
    .getByRole("button", { name: "Care" })
    .click();
  await check("grid, care");
  await tab(page, "Path");
  await check("path with a plan being tried");
  await tab(page, "Coach");
  await say(page, "Suggest something new for me");
  await check("coach suggestions");
  expect(problems).toEqual([]);
});

test("the PATH logo always leads back to the start page of the role", async ({ page }) => {
  await open(page);
  // The wordmark sits on the content edge, 20 px from the left.
  await expect(page.locator(".top .name")).toHaveText("PATH");
  const logo = page.getByRole("button", { name: "PATH, back to your start page" });
  const current = page.locator('nav [aria-current="page"]');
  // From deep inside Explore, with a sheet open.
  await explore(page).click();
  await tiles(page).filter({ hasText: "First climb" }).click();
  await page.locator("#booknow").getByRole("button", { name: "Book, free" }).click();
  await page.keyboard.press("Escape");
  await logo.click();
  await expect(current).toHaveText("Path");
  await expect(page.locator("#view")).toContainText("Your goal");
  await expect(page.locator("#view")).toHaveJSProperty("scrollTop", 0);
  // From any tab, and it keeps the club you are in.
  await atClub(page, "studio");
  await tab(page, "Me");
  await logo.click();
  await expect(current).toHaveText("Path");
  await expect(page.locator(".clubbtn")).toHaveAttribute("data-org", "studio");
  // Coach: from an open roster back to Today. Admin: back to Home.
  await asRole(page, "coach");
  await page.locator('[data-a="roster"]').first().click();
  await logo.click();
  await expect(current).toHaveText("Today");
  await expect(page.locator("#coach-today")).toBeVisible();
  await asRole(page, "admin");
  await tab(page, "Money");
  await logo.click();
  await expect(current).toHaveText("Home");
});

test("events are in Explore too: a race, a tournament, an open day, each with a get-ready plan and a sign-up", async ({
  page,
}) => {
  await open(page);
  await explore(page).click();
  await chip(page, "Events").click();
  await expect(tiles(page)).toHaveCount(7);
  await expect(page.locator("#xgrid .tile .who").first()).toHaveText("Event");
  await tiles(page).filter({ hasText: "Limmat Night Run" }).click();
  const prov = page.locator("#provider");
  await expect(prov.getByRole("heading", { name: "Limmat Night Run, 10K" })).toBeVisible();
  await expect(prov).toContainText("Event · ");
  await expect(prov).toContainText("1 · From the organisers");
  await expect(prov).toContainText("2 · Get ready for it");
  await expect(prov).toContainText("Two weeks to race day");
  await expect(prov).toContainText("3 · Sign up");
  await expect(prov).toContainText("Sat 12 Dec · 19:30");
  await prov.getByRole("button", { name: "Add to my Path" }).click();
  await page.getByRole("button", { name: "Dismiss message" }).click();
  await page.locator("#booknow").getByRole("button", { name: "Book · CHF 38.00" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Put my name down · CHF 38.00" })
    .click();
  await page
    .getByRole("dialog", { name: "Checkout" })
    .getByRole("button", { name: "Pay with card" })
    .click();
  await expect(toast(page)).toContainText(
    "You're in: Limmat Night Run, 10K at Stadtlauf Verein, Sat 12 Dec 19:30",
  );
  await page.getByRole("button", { name: "Back to Explore" }).click();
  await expect(page.locator("#mylist")).toContainText("Limmat Night Run, 10K");
  // Events are one of the six kinds.
  await page
    .getByRole("group", { name: "Who offers it" })
    .getByRole("button", { name: "Events" })
    .click();
  await expect(page.locator("#xgrid .tile")).toHaveCount(7);
});
