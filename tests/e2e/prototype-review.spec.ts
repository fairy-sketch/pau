/* eslint-disable @typescript-eslint/no-explicit-any -- the demo is plain browser JS; its test hook (window.PATH_DEMO) has no types. */
import { expect, test, type Page } from "@playwright/test";

import { asRole, at, atClub, cards, lastCard, open, say, tab, toast } from "../helpers/demo";

/** Ramon's review of Log and Explore (17 Nov 2026): points 1, 3, 4 and 5 have their own tests here, 2, 6 and 7 are covered alongside. */
const demo = <T>(page: Page, fn: (d: any) => T) =>
  page.evaluate(`(${fn.toString()})(window.PATH_DEMO)`) as Promise<T>;
const save = (page: Page) => page.getByRole("button", { name: "Save", exact: true });
const entries = (page: Page) => demo(page, (d) => d.state.entries.length);

test.describe("1 Log: a normal Save, only the effort required, inline errors, Undo", () => {
  test("an empty save keeps the fields empty and shows errors next to them", async ({ page }) => {
    await open(page);
    await tab(page, "Log");
    await expect(page.getByRole("button", { name: /hold/i })).toHaveCount(0);
    // Nothing to fill in from: the form is empty, and the details are folded away.
    await expect(page.getByLabel("What did you do?")).toHaveValue("");
    await expect(page.getByLabel("Minutes")).toHaveValue("");
    await expect(page.locator("#details")).toHaveCount(0);
    const before = await entries(page);
    await save(page).click();
    await expect(page.locator("#err-title")).toHaveText("Say what you did.");
    await expect(page.locator("#err-dur")).toHaveText("Add how many minutes it took.");
    await expect(page.locator("#err-rpe")).toHaveText("Tap how hard it was, from 1 to 10.");
    await expect(page.getByLabel("What did you do?")).toHaveAttribute("aria-invalid", "true");
    // Never refilled with defaults, also not after a reload.
    await expect(page.getByLabel("What did you do?")).toHaveValue("");
    await expect(page.getByLabel("Minutes")).toHaveValue("");
    await page.reload();
    await expect(page.getByLabel("What did you do?")).toHaveValue("");
    await expect(page.getByLabel("Minutes")).toHaveValue("");
    expect(await entries(page)).toBe(before);
    await expect(toast(page)).toHaveCount(0);
    // An error goes away as soon as its field is touched.
    await page.getByLabel("What did you do?").fill("Easy run");
    await expect(page.locator("#err-title")).toHaveCount(0);
    await expect(page.locator("#err-dur")).toHaveCount(1);
  });

  test("after a booked session the form is filled in and one tap on the effort is enough; Undo takes it back", async ({
    page,
  }) => {
    await open(page);
    await demo(page, (d) => void d.book("pau-track-2026-11-16", "app"));
    await page.clock.setFixedTime(at("2026-11-16T20:30")); // the session ended at 20:00
    await tab(page, "Path");
    // 7: Path asks how it went.
    await expect(page.locator("#view")).toContainText("How did it go?");
    await expect(page.locator("#view")).toContainText("Track session, Mon 16 Nov 18:30");
    await page.getByRole("button", { name: "Log it" }).click();
    await expect(page.locator("#log-for")).toContainText(
      "Filled in from your session on Mon 16 Nov, 18:30",
    );
    await expect(page.getByLabel("What did you do?")).toHaveValue("Track session");
    await expect(page.getByLabel("Minutes")).toHaveValue("90");
    // Only the effort is missing.
    await save(page).click();
    await expect(page.locator(".err")).toHaveCount(1);
    await expect(page.locator("#err-rpe")).toBeVisible();
    await page.getByRole("button", { name: "RPE 8", exact: true }).click();
    const before = await entries(page);
    await save(page).click();
    await expect(toast(page)).toContainText("Saved: Track session, 90 min, RPE 8.");
    expect(await entries(page)).toBe(before + 1);
    expect(
      await demo(
        page,
        (d) => d.state.entries.find((e: any) => e.sid === "pau-track-2026-11-16").rpe,
      ),
    ).toBe(8);
    await expect(page.locator("#view")).not.toContainText("How did it go?");

    // Undo: the entry is gone, the stage count is back, and the form holds what she had typed.
    const stage = await demo(page, (d) => d.state.stageSessions);
    await toast(page).getByRole("button", { name: "Undo" }).click();
    expect(await entries(page)).toBe(before);
    expect(await demo(page, (d) => d.state.stageSessions)).toBe(stage - 1);
    await expect(page.getByLabel("What did you do?")).toHaveValue("Track session");
    await expect(page.getByRole("button", { name: "RPE 8", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(toast(page).getByRole("button", { name: "Undo" })).toHaveCount(0); // offered once
  });

  test("details are optional and folded away; a pain flag still needs a location (B9)", async ({
    page,
  }) => {
    await open(page);
    await tab(page, "Log");
    await page.getByLabel("What did you do?").fill("Easy run");
    await page.getByLabel("Minutes").fill("40");
    await page.getByRole("button", { name: "RPE 4", exact: true }).click();
    await page.getByRole("button", { name: "Add details" }).click();
    await expect(page.getByLabel("Distance in km")).toBeVisible();
    await expect(page.getByLabel("Notes")).toBeVisible();
    await page.getByRole("switch", { name: "Something hurt" }).click();
    await expect(page.locator("#pain .chip")).toHaveText([
      "Foot or ankle",
      "Calf or shin",
      "Knee",
      "Thigh or hamstring",
      "Hip or groin",
      "Back",
      "Shoulder or arm",
      "Other",
      "Not sure",
    ]);
    const before = await entries(page);
    await save(page).click();
    await expect(page.locator("#err-pain")).toContainText("A pain flag needs a location");
    expect(await entries(page)).toBe(before);
    await page.getByRole("button", { name: "Not sure" }).click();
    await save(page).click();
    await expect(toast(page)).toContainText("Saved: Easy run, 40 min, RPE 4.");
    expect(
      await demo(page, (d) => [
        d.state.entries[0].pain,
        d.state.entries[0].painWhere,
        d.state.entries[0].painLevel,
      ]),
    ).toEqual([true, "Not sure", 3]);
  });

  test("7: entries can be edited and deleted, both with Undo", async ({ page }) => {
    await open(page);
    await tab(page, "Log");
    const first = page.locator("#entries [data-entry]").first();
    const title = await first.locator(".strong").first().textContent();
    await first.getByRole("button", { name: /^Edit/ }).click();
    await expect(page.getByRole("heading", { name: "Edit entry" })).toBeVisible();
    await page.getByLabel("Minutes").fill("55");
    await page.getByRole("button", { name: "RPE 6", exact: true }).click();
    const before = await entries(page);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(toast(page)).toContainText(`Updated: ${title}, 55 min, RPE 6.`);
    expect(await entries(page)).toBe(before);
    await expect(first).toContainText("55 min · RPE 6");
    await first.getByRole("button", { name: /^Edit/ }).click();
    await page.getByRole("button", { name: "Delete entry" }).click();
    await expect(toast(page)).toContainText(`Deleted: ${title}`);
    expect(await entries(page)).toBe(before - 1);
    await toast(page).getByRole("button", { name: "Undo" }).click();
    expect(await entries(page)).toBe(before);
  });
});

test("2 a toast never lies on a primary button", async ({ page }) => {
  await open(page);
  const clear = async () => {
    const t = await toast(page).boundingBox();
    expect(t).not.toBeNull();
    const hits = await page.locator("#view .btn.acc, #view .btn.full").evaluateAll(
      (els, t) =>
        els
          .map((e) => e.getBoundingClientRect())
          // Only the part of a button that shows counts: the page clips whatever is scrolled below it.
          .map((r) => ({
            width: r.width,
            top: r.top,
            bottom: Math.min(
              r.bottom,
              document.getElementById("view")!.getBoundingClientRect().bottom,
            ),
          }))
          .filter(
            (r) =>
              r.width &&
              r.bottom > t!.y &&
              r.top < t!.y + t!.height &&
              r.bottom <= window.innerHeight,
          ).length,
      t,
    );
    expect(hits).toBe(0);
    // It sits right above the tab bar.
    const nav = await page.getByRole("navigation", { name: "Sections" }).boundingBox();
    expect(Math.round(t!.y + t!.height)).toBeLessThanOrEqual(Math.round(nav!.y));
  };
  await tab(page, "Week");
  await page.locator("#classcard").getByRole("button", { name: "Book", exact: true }).click();
  await clear();
  await page
    .getByRole("navigation", { name: "Sections" })
    .getByRole("button", { name: "Explore" })
    .click();
  await page.locator("#xgrid .tile").filter({ hasText: "Slow flow" }).click();
  await page.getByRole("button", { name: "Add to my Path" }).click();
  await clear();
  // The Book button under the toast can be tapped straight away.
  await page.locator("#booknow").getByRole("button", { name: "Book, free" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test.describe("3 one booking source of truth, and the coach stays in the active club", () => {
  test("an Explore booking shows in Week and in chat, and the coach can cancel it", async ({
    page,
  }) => {
    await open(page);
    await page
      .getByRole("navigation", { name: "Sections" })
      .getByRole("button", { name: "Explore" })
      .click();
    await page.locator("#xgrid .tile").filter({ hasText: "First climb" }).click();
    await page.locator("#booknow").getByRole("button", { name: "Book, free" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Put my name down" }).click();

    // Week: under Your bookings, and the day is marked.
    await tab(page, "Week");
    await expect(page.locator("#xbookings")).toContainText("First climb, shoes included");
    await expect(page.locator("#xbookings")).toContainText(
      "18:30 · Block 9 Boulder · from Explore",
    );
    await expect(
      page.getByRole("button", { name: "Thu 19 Nov", exact: true }).locator(".mk.on"),
    ).toHaveCount(1);

    // Chat: "what's on this week" lists it; "cancel my next session" finds it (it is her next one at PAU).
    await tab(page, "Coach");
    await say(page, "What's on this week?");
    await expect(page.locator(".msg.coach").last()).toContainText("Yours this week:");
    await expect(page.locator(".msg.coach").last()).toContainText(
      "First climb, shoes included, Thu 19 Nov 18:30, Block 9 Boulder (Explore)",
    );
    await say(page, "Cancel my next session");
    await expect(lastCard(page).locator(".h2")).toHaveText("Take your name off?");
    await expect(lastCard(page)).toContainText("First climb, shoes included");
    await lastCard(page).getByRole("button", { name: "Confirm" }).click();
    await expect(lastCard(page)).toHaveAttribute("data-state", "confirmed");
    expect(await demo(page, (d) => d.signedUp("boulder"))).toBe(false);
    await tab(page, "Week");
    await expect(page.locator("#xbookings")).toHaveCount(0);
  });

  test("chat actions are scoped to the active club unless another one is named", async ({
    page,
  }) => {
    await open(page);
    await demo(page, (d) => {
      for (const sid of [
        "pau-track-2026-11-16",
        "pau-community-2026-11-21",
        "pau-community-2026-11-28",
      ])
        d.book(sid, "app");
      d.render();
    });
    await tab(page, "Coach");
    // At PAU. The yoga class at Studio Demo is not touched, and the coach says it is there.
    await say(page, "Cancel everything this week");
    const card = lastCard(page);
    await expect(card).toContainText("Cancel these 2 bookings?");
    const rows = card.getByRole("switch");
    await expect(rows).toHaveText([
      /Track session, Mon 16 Nov/,
      /Saturday community session, Sat 21 Nov/,
    ]);
    await expect(card).not.toContainText("Yoga flow");
    await expect(page.locator(".msg.coach").last()).toContainText(
      'You also have 1 at Studio Demo; say "at all my clubs" to include it.',
    );
    // B6 still holds: deselect one, confirm the rest.
    await rows.nth(0).click();
    await card.getByRole("button", { name: "Cancel 1 booking" }).click();
    await expect(card.locator(".results li")).toHaveText([
      /Cancelled: Saturday community session, Sat 21 Nov/,
    ]);
    await expect(card).toContainText("(kept)");

    // A session type only the other club has: the coach does not reach across.
    await say(page, "cancel my yoga class");
    await expect(page.locator(".msg.coach").last()).toContainText(
      "Your yoga flow on Tue 17 Nov is at Studio Demo. Here I only act at PAU Trackrunning.",
    );
    await say(page, "book yoga on Thursday");
    await expect(page.locator(".msg.coach").last()).toContainText(
      "Yoga flow is at Studio Demo, not at PAU Trackrunning.",
    );
    await expect(cards(page)).toHaveCount(1);

    // Naming the club is enough, from anywhere.
    await say(page, "cancel my yoga class at Studio Demo");
    await expect(lastCard(page)).toContainText("Yoga flow, Tue 17 Nov 18:45, Studio Demo");
    await say(page, "cancel everything at all my clubs");
    await expect(lastCard(page).getByRole("switch")).toHaveText([
      /Track session, Mon 16 Nov/,
      /Yoga flow, Tue 17 Nov/,
      /Saturday community session, Sat 28 Nov/,
    ]);
    await lastCard(page).getByRole("button", { name: "Not now" }).click();

    // In the other club the same words mean that club.
    await atClub(page, "studio");
    await say(page, "Cancel my next session");
    await expect(lastCard(page)).toContainText("Yoga flow, Tue 17 Nov 18:45, Studio Demo");
    await say(page, "What's on this week?");
    await expect(page.locator(".msg.coach").last()).toContainText("Next at Studio Demo");
    await expect(page.locator(".msg.coach").last()).not.toContainText("Track session");
  });
});

test("4 the coach reads the open pain flag, and offers to update or clear it instead of opening a new one", async ({
  page,
}) => {
  await open(page);
  await tab(page, "Log");
  await page.getByLabel("What did you do?").fill("Track session");
  await page.getByLabel("Minutes").fill("60");
  await page.getByRole("button", { name: "RPE 7", exact: true }).click();
  await page.getByRole("button", { name: "Add details" }).click();
  await page.getByRole("switch", { name: "Something hurt" }).click();
  await page.getByRole("button", { name: "Knee" }).click();
  await page.getByLabel("Level, 0 to 10").fill("8");
  await save(page).click();

  await tab(page, "Coach");
  await say(page, "my knee hurts again");
  const msg = page.locator(".msg.coach").last();
  await expect(msg).toContainText("Your knee flag from today is still on, level 8.");
  await expect(msg).toContainText("please see a doctor or physio");
  await expect(msg).toContainText("I won't open a second flag");
  const btns = page.locator("[data-painflag]").last().getByRole("button");
  await expect(btns).toHaveText(["Update the flag", "It's gone: clear the flag"]);
  // No second flag is started: no new card, and the log form is not switched to "Something hurt".
  await expect(cards(page)).toHaveCount(0);
  expect(
    await demo(page, (d) => [
      !!d.state.form.pain,
      d.state.entries.filter((e: any) => e.pain && !e.cleared).length,
    ]),
  ).toEqual([false, 1]);

  // Update by chat: one flag, new level, after a confirm.
  await say(page, "the knee pain is at level 5 now");
  await expect(lastCard(page).locator(".h2")).toHaveText("Update your pain flag to level 5?");
  await lastCard(page).getByRole("button", { name: "Confirm" }).click();
  await expect(lastCard(page).locator(".results li")).toHaveText([
    /Pain flag updated: Knee, level 5\./,
  ]);
  await say(page, "knee still hurts");
  await expect(page.locator(".msg.coach").last()).toContainText(
    "Your knee flag from today is still on, level 5.",
  );
  // "Update the flag" opens that entry in Log.
  await page
    .locator("[data-painflag]")
    .last()
    .getByRole("button", { name: "Update the flag" })
    .click();
  await expect(page.getByRole("heading", { name: "Edit entry" })).toBeVisible();
  await expect(page.getByLabel("Level, 0 to 10")).toHaveValue("5");

  // Clear by chat, after a confirm. Then a new mention starts fresh.
  await tab(page, "Coach");
  await say(page, "the pain is gone, clear it");
  await expect(lastCard(page).locator(".h2")).toHaveText("Clear your pain flag?");
  await lastCard(page).getByRole("button", { name: "Confirm" }).click();
  expect(await demo(page, (d) => !!d.openPain())).toBe(false);
  await say(page, "my calf hurts");
  await expect(page.locator(".msg.coach").last()).toContainText("Sorry to hear that");
  await expect(page.locator(".msg.coach").last()).not.toContainText("is still on");
});

test.describe("5 confirm cards (B5)", () => {
  test("a newer card switches every older pending card off as Replaced", async ({ page }) => {
    await open(page);
    await tab(page, "Coach");
    await say(page, "Book my usual Thursday");
    await say(page, "book gym on Friday"); // a different request
    await say(page, "Cancel my next session at Studio Demo"); // and another
    await expect(cards(page)).toHaveCount(3);
    for (const i of [0, 1]) {
      const old = cards(page).nth(i);
      await expect(old).toHaveAttribute("data-state", "replaced");
      await expect(old.locator(".eyebrow")).toHaveText("Replaced");
      await expect(old).toContainText("Replaced by a newer card. Nothing was changed.");
      await expect(old.getByRole("button")).toHaveCount(2);
      for (const b of await old.getByRole("button").all()) await expect(b).toBeDisabled();
    }
    await expect(cards(page).nth(2)).toHaveAttribute("data-state", "pending");
    await expect(cards(page).nth(2)).toContainText("expires 12:15");
    // A replaced card cannot be confirmed, not even behind the screen's back.
    const sneaky = await demo(page, (d) => {
      const s = d.state,
        first = Number(Object.keys(s.props)[0]),
        n = s.bookings.length;
      d.confirmProposal(first, true);
      return [s.props[first].status, s.bookings.length - n];
    });
    expect(sneaky).toEqual(["replaced", 0]);

    // The live one: confirmed, with its result inside it and nothing added to the chat.
    const chat = await demo(page, (d) => d.state.chat.length);
    await cards(page).nth(2).getByRole("button", { name: "Confirm" }).click();
    await expect(cards(page).nth(2)).toHaveAttribute("data-state", "confirmed");
    await expect(cards(page).nth(2).locator(".results li")).toHaveText([
      /Cancelled: Yoga flow, Tue 17 Nov/,
    ]);
    expect(await demo(page, (d) => d.state.chat.length)).toBe(chat);

    // Declined, and expired after 15 minutes.
    await say(page, "Book my usual");
    await lastCard(page).getByRole("button", { name: "Not now" }).click();
    await expect(lastCard(page)).toHaveAttribute("data-state", "declined");
    await say(page, "book my usual Saturday");
    await page.clock.setFixedTime(at("2026-11-16T12:16"));
    await tab(page, "Coach");
    await expect(lastCard(page)).toHaveAttribute("data-state", "expired");
    await expect(lastCard(page).getByRole("button")).toHaveCount(0);
  });

  test("Confirm checks again: no longer possible means Couldn't book, never Confirmed", async ({
    page,
  }) => {
    await open(page);
    await tab(page, "Coach");
    await say(page, "Book my usual Thursday");
    await demo(page, (d) => void d.book("pau-gym-2026-11-20", "app")); // the pass fills up meanwhile
    const card = lastCard(page);
    await card.getByRole("button", { name: "Confirm" }).click();
    await expect(card).toHaveAttribute("data-state", "declined");
    await expect(card.locator(".eyebrow")).toHaveText("Couldn't be done");
    await expect(card.locator(".results li")).toHaveText([
      /^Couldn't book: You've used 4 of 4 drop-in sessions in November/,
    ]);
    await expect(card).not.toContainText("Confirmed");
    expect(await demo(page, (d) => !!d.myBooking("pau-track-2026-11-19"))).toBe(false);
    // The same for an Explore sign-up that filled up.
    await say(page, "sign me up for the climbing trial");
    await demo(page, (d) => {
      d.OFFERS.find((o: any) => o.id === "boulder").taken = 12;
    });
    await lastCard(page).getByRole("button", { name: "Confirm" }).click();
    await expect(lastCard(page)).toHaveAttribute("data-state", "declined");
    await expect(lastCard(page).locator(".results li")).toHaveText([
      /^Couldn't put your name down: This one is full/,
    ]);
    await expect(lastCard(page)).not.toContainText("Confirmed");
  });
});

test("6 Explore: dots coloured by kind with a legend, Reset filters, and what booking does on the sheet", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("navigation", { name: "Sections" })
    .getByRole("button", { name: "Explore" })
    .click();
  await expect(page.getByRole("button", { name: "Reset filters" })).toHaveCount(0);
  await page
    .locator("#explore .filters")
    .getByRole("button", { name: "Free", exact: true })
    .click();
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.locator("#legend li")).toHaveText([
    /Clubs \d+/,
    /Coaches \d+/,
    /Pros \d+/,
    /Care \d+/,
    /Events \d+/,
  ]);
  const colours = await page.locator("#map .pin").evaluateAll((els) => {
    const by: Record<string, Set<string>> = {};
    for (const e of els) {
      const kind = (e as HTMLElement).dataset.kind ?? "";
      (by[kind] ??= new Set()).add(
        getComputedStyle(e.querySelector("i") as Element).backgroundColor,
      );
    }
    return Object.fromEntries(Object.entries(by).map(([k, v]) => [k, [...v]]));
  });
  expect(Object.values(colours).every((v) => v.length === 1)).toBe(true); // one colour per kind
  expect(new Set(Object.values(colours).map((v) => v[0])).size).toBe(Object.keys(colours).length); // and each kind its own
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page.locator("#map .pin")).toHaveCount(38);

  await page.getByRole("button", { name: "Grid", exact: true }).click();
  await page.locator("#xgrid .tile").filter({ hasText: "Open doubles" }).click();
  await page.locator("#booknow").getByRole("button", { name: /^Book/ }).click();
  const c = page.locator("#consequence");
  await expect(c).toContainText("You take 1 of the 3 spots left; 2 remain.");
  await expect(c).toContainText("It uses none of your passes or credits.");
  await expect(c).toContainText("You pay CHF 15.00 once, in the test checkout.");
  await expect(c).toContainText("It shows up in your Week");
});

test.describe("Design pass (D-1 to D-12)", () => {
  test("one club button opens the sheet: clubs with a check, and the demo view switch", async ({
    page,
  }) => {
    await open(page);
    await expect(page.locator(".top select")).toHaveCount(0);
    await expect(page.locator(".top button")).toHaveCount(2);
    await page.locator(".clubbtn").click();
    const sheet = page.getByRole("dialog", { name: "Your clubs" });
    await expect(sheet.locator(".clubrow")).toHaveText(["PPAU Trackrunning", "SStudio Demo"]);
    await expect(sheet.locator('.clubrow[aria-current="true"] .ck svg')).toHaveCount(1);
    await expect(
      sheet.getByRole("group", { name: "Demo: view as" }).getByRole("button"),
    ).toHaveText(["Athlete", "Coach", "Admin"]);
    await sheet.getByRole("button", { name: "Coach" }).click();
    await expect(page.locator('nav [aria-current="page"]')).toHaveText("Today");
  });

  test("everything sits on the 20 px edge, and the path is one bar of five segments", async ({
    page,
  }) => {
    await open(page);
    const left = (sel: string) =>
      page
        .locator(sel)
        .first()
        .evaluate((el) => Math.round(el.getBoundingClientRect().left));
    expect(await left(".top .name")).toBe(20);
    expect(await left(".goal")).toBe(20);
    expect(await left("#phases")).toBe(20);
    expect(await left("#view .card")).toBe(20);
    await expect(page.locator("#phases .phases i")).toHaveCount(5);
    await expect(page.locator("#phases")).toContainText("Build · session 5 of 12");
    // The hero runs edge to edge, and no scrollbar shows.
    const hero = await page.locator(".hero").boundingBox();
    expect(hero!.x).toBe(0);
    expect(hero!.height).toBe(240);
    expect(await page.locator("#view").evaluate((el) => getComputedStyle(el).scrollbarWidth)).toBe(
      "none",
    );
    // Tabs in the new order; Log is reached from Path.
    await expect(page.locator("nav.tabs button")).toHaveText([
      "Path",
      "Week",
      "Explore",
      "Coach",
      "Me",
    ]);
    await page.getByRole("button", { name: "Log a session" }).click();
    await expect(page.getByRole("heading", { name: "How did it go?" })).toBeVisible();
  });

  test("no label is cut off, on any main screen", async ({ page }) => {
    await open(page);
    for (const name of ["Path", "Week", "Explore", "Coach", "Me"]) {
      await tab(page, name);
      const cut = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("#app button, #app .h1, #app .h2, #app .strong")]
          .filter(
            (el) =>
              getComputedStyle(el).textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth,
          )
          .map((el) => el.textContent),
      );
      expect(cut, name).toEqual([]);
    }
  });
});

test("soft shadows are never cut off: rows that scroll sideways leave room for them (S-5)", async ({
  page,
}) => {
  await open(page);
  for (const name of ["Week", "Explore", "Coach"]) {
    await tab(page, name);
    const tight = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("#view *")]
        .filter(
          (el) =>
            getComputedStyle(el).overflowX === "auto" &&
            el.querySelector(".chip, .quick button, button"),
        )
        .filter((el) => el.matches(".filters, .quick"))
        .map(
          (el) =>
            [
              el.className,
              parseFloat(getComputedStyle(el).paddingTop),
              parseFloat(getComputedStyle(el).paddingBottom),
            ] as const,
        )
        .filter(([, t, b]) => t < 20 || b < 20),
    );
    expect(tight, name).toEqual([]);
  }
});

test("your colour: six accents in the club sheet, applied everywhere, kept after a reload, readable on each (S-9)", async ({
  page,
}) => {
  await open(page);
  const acc = () =>
    page
      .locator("#view .btn.acc")
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await acc()).toBe("rgb(142, 154, 128)");
  await page.locator(".clubbtn").click();
  const sheet = page.getByRole("dialog", { name: "Your clubs" });
  await expect(sheet.getByRole("group", { name: "Your colour" }).getByRole("button")).toHaveCount(
    6,
  );
  await sheet.getByRole("button", { name: "Rose" }).click();
  await expect(sheet.getByRole("button", { name: "Rose" })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await page.reload();
  expect(await acc()).toBe("rgb(201, 154, 160)");
  // Black text must read on every colour: at least 4.5:1.
  const ratios = await page.evaluate(() => {
    const lum = (hex: string) => {
      const c = [1, 3, 5]
        .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
    };
    return Object.values(window.PATH_DEMO.ACCENTS as Record<string, [string, string]>).map(
      ([, hex]) => (lum(hex) + 0.05) / (lum("#111111") + 0.05),
    );
  });
  expect(ratios.every((r) => r >= 4.5)).toBe(true);
  // The coach and the admin see the same colour: it belongs to the person, not the club.
  await asRole(page, "coach");
  expect(await acc()).toBe("rgb(201, 154, 160)");
});
