/* eslint-disable @typescript-eslint/no-explicit-any -- the demo is plain browser JS; its test hook (window.PATH_DEMO) has no types. */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  asRole,
  at,
  atClub,
  cards,
  day,
  lastCard,
  minutesLater,
  NOW,
  open,
  openSession,
  say,
  tab,
  toast,
} from "../helpers/demo";

/**
 * Iteration 2, milestone I2-1: booking. Multi-week Week view with filters, waitlist offers with expiry,
 * recurring holds, and the ways out when a pass blocks a booking.
 */

const demo = <T>(page: Page, fn: (d: any) => T) =>
  page.evaluate(`(${fn.toString()})(window.PATH_DEMO)`) as Promise<T>;
const weekLabel = (page: Page) => page.locator("#weeklabel");
const next = (page: Page) => page.getByRole("button", { name: "Next week" });
const prev = (page: Page) => page.getByRole("button", { name: "Previous week" });
const chip = (page: Page, name: string) =>
  page.locator(".filters").getByRole("button", { name, exact: true });
/** Makes a session full, with `ahead` people already waiting. */
const fill = (page: Page, sid: string, ahead: number) =>
  page.evaluate(
    ([id, n]) => {
      const d = window.PATH_DEMO,
        s = d.state.sessions[id as string];
      s.others = s.cap;
      s.waitOthers = n as number;
      d.render();
    },
    [sid, ahead],
  );
/** Makes sure sessions have free spots (the made-up occupancy fills some of them). */
const room = (page: Page, ...sids: string[]) =>
  page.evaluate((ids) => {
    const d = window.PATH_DEMO;
    for (const id of ids) Object.assign(d.state.sessions[id], { others: 5, waitOthers: 0 });
    d.render();
  }, sids);
const freeSpot = async (page: Page, label: string) => {
  await asRole(page, "admin");
  await tab(page, "Schedule");
  await page.getByRole("button", { name: `Free a spot: ${label}` }).click();
};

test.describe("Week: this week and the next three, with filters", () => {
  test("arrows and swipes move between four weeks, and sessions weeks ahead can be booked", async ({
    page,
  }) => {
    await open(page);
    await tab(page, "Week");
    await expect(weekLabel(page)).toContainText("This week");
    await expect(weekLabel(page)).toContainText("16 to 22 Nov");
    await expect(page.locator(".days button")).toHaveCount(7);
    await expect(day(page, "Mon 16 Nov")).toHaveAttribute("aria-pressed", "true");
    await expect(prev(page)).toBeDisabled();

    await next(page).click();
    await expect(weekLabel(page)).toContainText("Next week");
    await expect(weekLabel(page)).toContainText("23 to 29 Nov");
    await expect(day(page, "Mon 23 Nov")).toHaveAttribute("aria-pressed", "true"); // same weekday, next week
    await next(page).click();
    await expect(weekLabel(page)).toContainText("30 Nov to 6 Dec");
    await next(page).click();
    await expect(weekLabel(page)).toContainText("In 3 weeks");
    await expect(weekLabel(page)).toContainText("7 to 13 Dec");
    await expect(next(page)).toBeDisabled();

    // Three weeks out: PAU books up to 60 days ahead, so this is bookable. It counts towards December.
    await day(page, "Thu 10 Dec").click();
    await page.locator("#classcard").getByRole("button", { name: "Book", exact: true }).click();
    await expect(toast(page)).toContainText("Booked: Track session, Thu 10 Dec 18:30");
    expect(await demo(page, (d) => d.passState(d.passOf("pau"), new Date(2026, 11, 10)).text)).toBe(
      "1 of 4 used in December",
    );
    await expect(day(page, "Thu 10 Dec").locator(".mk.on")).toHaveCount(1); // the day is marked as booked

    // Swipe right twice, then left once. A vertical drag does nothing.
    const pane = page.locator("#weekpane");
    const drag = async (fromX: number, toX: number, dy = 6) => {
      await pane.dispatchEvent("pointerdown", { clientX: fromX, clientY: 300 });
      await pane.dispatchEvent("pointerup", { clientX: toX, clientY: 300 + dy });
    };
    await drag(80, 300);
    await expect(weekLabel(page)).toContainText("In 2 weeks");
    await drag(80, 300);
    await expect(weekLabel(page)).toContainText("Next week");
    await drag(300, 80);
    await expect(weekLabel(page)).toContainText("In 2 weeks");
    await drag(200, 190, 200);
    await expect(weekLabel(page)).toContainText("In 2 weeks");

    await page.waitForTimeout(400); // a tap straight after a swipe is ignored, so wait as a person would
    // Back to this week never lands on a day that is over: pick Sunday, go forward, come back from a Monday.
    await prev(page).click();
    await prev(page).click();
    await expect(weekLabel(page)).toContainText("This week");
    await page.clock.setFixedTime(at("2026-11-18T12:00")); // Wednesday
    await next(page).click();
    await day(page, "Mon 23 Nov").click();
    await prev(page).click();
    await expect(day(page, "Wed 18 Nov")).toHaveAttribute("aria-pressed", "true");
  });

  test("filter by kind of training and by My pass only", async ({ page }) => {
    await open(page);
    await tab(page, "Week");
    await expect(page.locator(".filters .chip")).toHaveText([
      "All",
      "Running",
      "Strength",
      "My pass only",
    ]);

    // Strength: Mondays have track only, so Monday shows nothing and is quieter in the strip; Tuesday has gym.
    await chip(page, "Strength").click();
    await expect(chip(page, "Strength")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#noresults")).toHaveText(
      "No sessions match your filters on this day.",
    );
    await expect(day(page, "Mon 16 Nov")).toHaveClass(/none/);
    await expect(day(page, "Tue 17 Nov")).not.toHaveClass(/none/);
    await day(page, "Tue 17 Nov").click();
    await expect(page.locator("#classcard")).toContainText("Gym session");
    await page
      .getByRole("button", { name: /Clear filters/ })
      .or(chip(page, "All"))
      .first()
      .click();

    // My pass only: the drop-in pass covers track and gym. Wednesday's technique session is not covered.
    await day(page, "Wed 18 Nov").click();
    await expect(page.locator("#classcard")).toContainText("Technique session");
    await chip(page, "My pass only").click();
    await expect(page.locator("#classcard")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Clear filters · 1 hidden" })).toBeVisible();
    await day(page, "Sat 21 Nov").click(); // free sessions need no pass, so they stay
    await expect(page.locator("#classcard")).toContainText("Saturday community session");

    // The filters hold across weeks and a reload; the other club has its own kinds, and "My pass only" stays on.
    await next(page).click();
    await day(page, "Wed 25 Nov").click();
    await expect(page.locator("#classcard")).toHaveCount(0);
    await page.reload();
    await expect(chip(page, "My pass only")).toHaveAttribute("aria-pressed", "true");
    await atClub(page, "studio");
    await expect(page.locator(".filters .chip")).toHaveText([
      "All",
      "Strength",
      "HIIT",
      "Mobility",
      "Yoga",
      "Cycling",
      "My pass only",
    ]);
    await chip(page, "Yoga").click();
    await day(page, "Thu 26 Nov").click();
    await expect(page.locator("#classcard")).toContainText("Yoga flow");
    // Studio Demo opens booking 6 days ahead: the class is listed with the day it opens, not with a Book button.
    await expect(page.locator("#classcard")).toContainText("Opens Fri 20");
    await expect(
      page.locator("#classcard").getByRole("button", { name: /^Book$|Join waitlist/ }),
    ).toHaveCount(0);
  });
});

test.describe("Waitlist: offer with expiry", () => {
  const YOGA = "studio-yoga-2026-11-19";
  /** Mia is #2 on the waitlist of a full yoga class at Studio Demo (offer mode, 2 h hold). */
  async function waiting(page: Page) {
    await open(page);
    await fill(page, YOGA, 1);
    await atClub(page, "studio");
    await tab(page, "Week");
    await day(page, "Thu 19 Nov").click();
    await openSession(page, YOGA);
    await page.getByRole("dialog").getByRole("button", { name: "Join waitlist" }).click();
    await expect(toast(page)).toContainText("You are #2 on the waitlist");
  }
  /** Two members cancel: the first spot is held for #1 (who takes it), the second is held for Mia. */
  async function offered(page: Page) {
    await waiting(page);
    await freeSpot(page, "Yoga flow, Thu 19 Nov");
    await expect(toast(page)).toContainText(
      /It is held for \w+ \w+, next on the waitlist, until 14:00/,
    );
    await page.getByRole("button", { name: "Free a spot: Yoga flow, Thu 19 Nov" }).click();
    await expect(toast(page)).toContainText(
      "It is held for Mia Keller until 14:00, then it goes to the next person",
    );
    await asRole(page, "athlete");
  }

  test("position, hold, and expiry to the next person", async ({ page }) => {
    await waiting(page);
    await openSession(page, YOGA);
    await expect(page.getByRole("dialog")).toContainText("You are #2 of 3 on the waitlist");
    await expect(page.getByRole("dialog")).toContainText("the spot is held for you for 2 h");
    await page.keyboard.press("Escape");

    await freeSpot(page, "Yoga flow, Thu 19 Nov");
    await page.getByRole("button", { name: "Free a spot: Yoga flow, Thu 19 Nov" }).click();
    await asRole(page, "athlete");

    // The spot is held: nobody else can take it, nothing is booked or charged yet.
    const held = await demo(page, (d) => {
      const s = d.state.sessions["studio-yoga-2026-11-19"];
      return {
        spots: d.spots(s),
        held: s.held,
        booked: !!d.myBooking(s.id),
        credits: d.passState(d.passOf("studio")).text,
      };
    });
    expect(held).toEqual({ spots: 0, held: 1, booked: false, credits: "6 credits left" });
    await expect(page.locator(`#weekpane [data-v="${YOGA}"]`).first()).toContainText(
      "Held until 14:00",
    );
    await tab(page, "Path");
    await expect(page.locator("#view")).toContainText("A spot is held for you: Yoga flow");
    await expect(page.locator("#view")).toContainText("held until 14:00");

    // 13:59: still held. 14:01: gone, to the person behind her, and the coach says so.
    await page.clock.setFixedTime(minutesLater(119));
    await tab(page, "Path");
    await expect(page.locator("#view")).toContainText("A spot is held for you");
    await page.clock.setFixedTime(minutesLater(121));
    await tab(page, "Coach");
    await expect(page.locator(".msg.coach").last()).toContainText(
      "ran out at 14:00. It is held for the next person on the waitlist, until 16:01",
    );
    const after = await demo(page, (d) => {
      const s = d.state.sessions["studio-yoga-2026-11-19"];
      return {
        waiting: !!d.myWait(s.id),
        booked: !!d.myBooking(s.id),
        others: s.others,
        cap: s.cap,
        held: s.held,
        queue: s.waitOthers,
      };
    });
    // The person behind her now has it held, for 2 h, like she had. Nobody can book past them.
    expect(after).toEqual({
      waiting: false,
      booked: false,
      others: 19,
      cap: 20,
      held: 1,
      queue: 1,
    });
    await tab(page, "Path");
    await expect(page.locator("#view")).not.toContainText("A spot is held for you");
    await page.clock.setFixedTime(minutesLater(245));
    await tab(page, "Path");
    expect(
      await demo(page, (d) => {
        const s = d.state.sessions["studio-yoga-2026-11-19"];
        return [s.others, s.held, s.waitOthers, d.spots(s)];
      }),
    ).toEqual([20, 0, 0, 0]);
  });

  test("take the spot from Path, or pass it on from the sheet", async ({ page }) => {
    await offered(page);
    await tab(page, "Path");
    await page.getByRole("button", { name: "Take the spot" }).click();
    await expect(toast(page)).toContainText("Booked: Yoga flow, Thu 19 Nov 18:45");
    const took = await demo(page, (d) => {
      const s = d.state.sessions["studio-yoga-2026-11-19"];
      return {
        booked: d.myBooking(s.id).status,
        held: s.held,
        credits: d.passState(d.passOf("studio")).text,
        stillWaiting: s.waitOthers,
      };
    });
    expect(took).toEqual({
      booked: "confirmed",
      held: 0,
      credits: "5 credits left",
      stillWaiting: 1,
    });
  });

  test("pass it on: it is held for the next person at once", async ({ page }) => {
    await offered(page);
    await tab(page, "Week");
    await openSession(page, YOGA);
    await expect(page.locator("#held")).toContainText(
      "A spot is held for you until Mon 16 Nov, 14:00",
    );
    await page.getByRole("dialog").getByRole("button", { name: "Pass it on" }).click();
    await expect(toast(page)).toContainText(
      /You passed on the spot\. It is held for the next person on the waitlist, until \d\d:\d\d/,
    );
    expect(
      await demo(page, (d) => {
        const s = d.state.sessions["studio-yoga-2026-11-19"];
        return [!!d.myWait(s.id), s.others, s.held, d.spots(s)];
      }),
    ).toEqual([false, 19, 1, 0]);
  });

  test("the hold is a club setting: an admin switches PAU from automatic booking to offers", async ({
    page,
  }) => {
    await open(page);
    await asRole(page, "admin");
    const sw = page.getByRole("switch", { name: /Offer freed spots with a 2 h hold/ });
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await expect(page.locator("#view")).toContainText(
      "Waitlist: the next person is booked automatically.",
    );
    await sw.click();
    await expect(sw).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("#view")).toContainText(
      "Waitlist: a freed spot is held for the next person for 2 h",
    );
    await tab(page, "Money");
    await expect(page.locator("#view")).toContainText("freed spots are offered with a 2 h hold");

    // Now a freed spot at PAU is held instead of booked.
    await fill(page, "pau-gym-2026-11-20", 0);
    await demo(page, (d) => void d.book("pau-gym-2026-11-20", "app"));
    await tab(page, "Schedule");
    await page.getByRole("button", { name: "Free a spot: Gym session, Fri 20 Nov" }).click();
    await expect(toast(page)).toContainText("It is held for Mia Keller until 14:00");
    expect(await demo(page, (d) => !!d.myBooking("pau-gym-2026-11-20"))).toBe(false);
  });

  test("the coach shows your position, joins a waitlist for you, and takes a held spot, each with a confirm card", async ({
    page,
  }) => {
    await open(page);
    await fill(page, "pau-gym-2026-11-20", 1);
    await tab(page, "Coach");
    await say(page, "Where am I on the waitlist?");
    await expect(page.locator(".msg.coach").last()).toContainText("You are not on any waitlist");

    // Not full: no waitlist needed, the coach says so and offers the booking instead.
    await say(page, "join the waitlist for track on Thursday");
    await expect(page.locator(".msg.coach").last()).toContainText("so you don't need the waitlist");
    await expect(lastCard(page).locator(".h2")).toHaveText("Book this session?");

    // Full: a card to join, and only the confirm puts her in the queue.
    await say(page, "join the waitlist for gym on Friday");
    await expect(lastCard(page).locator(".h2")).toHaveText("Join the waitlist?");
    await expect(lastCard(page)).toContainText("You would be #2 on the waitlist");
    expect(await demo(page, (d) => d.state.waitlist.length)).toBe(0);
    await lastCard(page).getByRole("button", { name: "Confirm" }).click();
    await expect(lastCard(page).locator(".results li")).toHaveText([/You are #2 on the waitlist/]);

    await say(page, "Where am I on the waitlist?");
    await expect(page.locator(".msg.coach").last()).toContainText(
      "Gym session, Fri 20 Nov 18:00, PAU Trackrunning: you are #2 of 3 waiting.",
    );

    // Her turn comes while PAU is in offer mode: the coach can take the held spot for her, after a confirm.
    await demo(page, (d) => {
      d.state.settings.pau.waitlistMode = "offer";
      d.freeSpot("pau-gym-2026-11-20");
      d.freeSpot("pau-gym-2026-11-20");
      d.render();
    });
    await expect(page.locator(".msg.coach").last()).toContainText(
      "A spot opened in Gym session, Fri 20 Nov 18:00",
    );
    await say(page, "take my spot");
    await expect(lastCard(page).locator(".h2")).toHaveText("Take the held spot?");
    await lastCard(page).getByRole("button", { name: "Confirm" }).click();
    await expect(lastCard(page)).toHaveAttribute("data-state", "confirmed");
    await expect(lastCard(page).locator(".results li")).toHaveText([
      /Booked: Gym session, Fri 20 Nov 18:00/,
    ]);
    expect(await demo(page, (d) => d.myBooking("pau-gym-2026-11-20").status)).toBe("confirmed");
  });
});

test.describe("Recurring holds", () => {
  test("from the session sheet: preview, start, report, one-tap pause, resume, end", async ({
    page,
  }) => {
    await open(page);
    await tab(page, "Week");
    await day(page, "Thu 19 Nov").click();
    await page.locator('#classcard [data-a="sheet"]').click();
    await page.getByRole("button", { name: "Book every Thursday 18:30 this season" }).click();

    // The preview says what will happen, date by date, and books nothing.
    const sheet = page.getByRole("dialog");
    await expect(sheet).toContainText("Until Wed 31 Mar 2027");
    const rows = sheet.locator("#series-preview .row");
    await expect(rows).toHaveText([
      /Thu 19 Nov\s*Book/,
      /Thu 26 Nov\s*Skip\s*You've used 4 of 4 drop-in sessions in November/,
      /Thu 3 Dec\s*Book/,
      /Thu 10 Dec\s*Book/,
    ]);
    expect(await demo(page, (d) => [d.upcomingBookings().length, d.state.series.length])).toEqual([
      1, 0,
    ]);

    await sheet.getByRole("button", { name: "Start repeating" }).click();
    await expect(toast(page)).toContainText("Every Thursday 18:30 is on. 3 booked, 1 skipped.");
    const booked = await demo(page, (d) =>
      d.state.bookings
        .filter((b: any) => b.source === "series")
        .map((b: any) => `${b.sid}:${b.status}`),
    );
    expect(booked).toEqual([
      "pau-track-2026-11-19:confirmed",
      "pau-track-2026-12-03:confirmed",
      "pau-track-2026-12-10:confirmed",
    ]);

    // It shows under Week, with the report.
    const card = page.locator("#series [data-series]");
    await expect(card).toHaveCount(1);
    const sw = card.getByRole("switch");
    await expect(sw).toHaveAttribute("aria-checked", "true");
    await expect(sw).toContainText("Every Thursday 18:30 · Track session");
    await expect(sw).toContainText("3 booked, 1 skipped · until Wed 31 Mar 2027");
    await expect(card.locator('li[data-status="skipped"]')).toContainText("Thu 26 Nov");
    // The sheet of any Thursday track session now says it repeats, instead of offering it again.
    await page.locator('#classcard [data-a="sheet"]').first().click();
    await expect(page.locator("#repeats")).toContainText("Repeats every thursday 18:30");
    await expect(page.getByRole("button", { name: /Book every Thursday/ })).toHaveCount(0);
    await page.keyboard.press("Escape");

    // One tap pauses. Bookings stay. A new Thursday comes into the schedule and is left alone.
    await sw.click();
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await expect(toast(page)).toContainText("is paused. Your existing bookings stay.");
    await page.clock.setFixedTime(at("2026-11-20T09:00")); // Friday: Thu 17 Dec is now within the four weeks
    await tab(page, "Week");
    expect(
      await demo(page, (d) => [
        !!d.state.sessions["pau-track-2026-12-17"],
        !!d.myBooking("pau-track-2026-12-17"),
        !!d.myBooking("pau-track-2026-12-10"),
      ]),
    ).toEqual([true, false, true]);

    // One tap resumes: the new date is booked, and the skipped date is tried again (still over the limit).
    await sw.click();
    await expect(sw).toHaveAttribute("aria-checked", "true");
    expect(
      await demo(page, (d) => [
        !!d.myBooking("pau-track-2026-12-17"),
        !!d.myBooking("pau-track-2026-11-26"),
      ]),
    ).toEqual([true, false]);
    await expect(card.locator('li[data-status="skipped"]')).toContainText("Thu 26 Nov");

    // Ending the series keeps what is booked.
    await card.locator("summary").click();
    await card.getByRole("button", { name: "End this series" }).click();
    await expect(page.locator("#series")).toHaveCount(0);
    expect(
      await demo(page, (d) => d.upcomingBookings().filter((r: any) => r.s.off === "track").length),
    ).toBe(3);
  });

  test("books each date as it opens, and skips and reports a clash", async ({ page }) => {
    await open(page);
    // Wednesday. Mia has PAU gym next Tuesday 18:00 to 19:00. Studio Demo opens booking 6 days ahead.
    await page.clock.setFixedTime(at("2026-11-18T12:00"));
    await room(page, "pau-gym-2026-11-24", "studio-yoga-2026-11-24", "studio-yoga-2026-12-01");
    await demo(page, (d) => {
      d.book("pau-gym-2026-11-24", "app");
      d.render();
    });
    await atClub(page, "studio");
    await tab(page, "Week");
    await next(page).click();
    await day(page, "Tue 24 Nov").click();
    await openSession(page, "studio-yoga-2026-11-24");
    await page.getByRole("button", { name: "Book every Tuesday 18:45 this season" }).click();
    const rows = page.locator("#series-preview .row");
    await expect(rows.nth(0)).toContainText("Tue 24 Nov");
    await expect(rows.nth(0)).toContainText("Skip");
    await expect(rows.nth(0)).toContainText("Clashes with Gym session at 18:00");
    await expect(rows.nth(1)).toContainText("Tue 1 Dec");
    await expect(rows.nth(1)).toContainText("Books itself when booking opens on Wed 25 Nov");
    await page.getByRole("button", { name: "Start repeating" }).click();
    await expect(toast(page)).toContainText(
      "Every Tuesday 18:45 is on. 1 skipped, 3 waiting to open.",
    );
    expect(
      await demo(page, (d) => d.state.bookings.filter((b: any) => b.source === "series").length),
    ).toBe(0);

    // A week later the next date has opened: it is booked without anyone doing anything.
    await page.clock.setFixedTime(at("2026-11-25T12:00"));
    await tab(page, "Week");
    const made = await demo(page, (d) =>
      d.state.bookings
        .filter((b: any) => b.source === "series")
        .map((b: any) => `${b.sid}:${b.status}`),
    );
    expect(made).toEqual(["studio-yoga-2026-12-01:confirmed"]);
    await expect(page.locator("#series [data-series]").getByRole("switch")).toContainText(
      "1 booked",
    );
    // Each date is booked once, however often the screen is drawn.
    await tab(page, "Path");
    await tab(page, "Week");
    expect(
      await demo(page, (d) => d.state.bookings.filter((b: any) => b.source === "series").length),
    ).toBe(1);
  });

  test("from chat: a confirm card with the date-by-date plan, then pause by chat", async ({
    page,
  }) => {
    await open(page);
    await tab(page, "Coach");
    await say(page, "Book every Thursday 18:30 this season");
    const card = lastCard(page);
    await expect(card.locator(".h2")).toHaveText("Book every Thursday 18:30 this season?");
    await expect(card).toContainText("Track session, Sportanlage Fronwald, PAU Trackrunning");
    await expect(card).toContainText("Thu 19 Nov: book");
    await expect(card).toContainText(
      "Thu 26 Nov: skip. You've used 4 of 4 drop-in sessions in November",
    );
    await expect(card).toContainText("Then every Thursday until Wed 31 Mar 2027");
    expect(await demo(page, (d) => d.state.series.length)).toBe(0); // nothing happens before the confirm

    await card.getByRole("button", { name: "Confirm" }).click();
    await expect(card).toHaveAttribute("data-state", "confirmed");
    await expect(card.locator(".results li")).toHaveText([
      /Every Thursday 18:30 is on until Wed 31 Mar 2027/,
      /Thu 19 Nov: Booked/,
      /Thu 26 Nov: skipped\. You've used 4 of 4/,
      /Thu 3 Dec: Booked/,
      /Thu 10 Dec: Booked/,
    ]);
    expect(
      await demo(page, (d) =>
        d.state.series.map((s: any) => `${s.org}:${s.off}:${s.weekday}:${s.paused}`),
      ),
    ).toEqual(["pau:track:4:false"]);

    // Asking again does not make a second series.
    await say(page, "book track every Thursday");
    await expect(page.locator(".msg.coach").last()).toContainText(
      "already repeats: 3 booked, 1 skipped",
    );
    await expect(cards(page)).toHaveCount(1);

    // A day with several sessions and no usual: the coach asks instead of guessing.
    await atClub(page, "studio");
    await say(page, "book every Monday this season");
    await expect(page.locator(".msg.coach").last()).toContainText(
      "Several sessions run on Mondays at Studio Demo",
    );
    await atClub(page, "pau");

    await say(page, "pause my Thursday series");
    await expect(lastCard(page).locator(".h2")).toHaveText("Pause this series?");
    await lastCard(page).getByRole("button", { name: "Confirm" }).click();
    await expect(lastCard(page).locator(".results li")).toHaveText([
      /Every Thursday 18:30 is paused\. Your existing bookings stay\./,
    ]);
    expect(
      await demo(page, (d) => [
        d.state.series[0].paused,
        d.upcomingBookings().filter((r: any) => r.s.off === "track").length,
      ]),
    ).toEqual([true, 3]);
  });
});

test.describe("Out of credits, in context", () => {
  /** The drop-in pass is at 4 of 4 for November. */
  async function passFull(page: Page) {
    await open(page);
    await demo(page, (d) => {
      d.book("pau-track-2026-11-19", "app");
      d.render();
    });
  }
  const offers = (page: Page) => page.locator("#offers").getByRole("button");

  test("the sheet offers a drop-in or an upgrade; buying the drop-in books the session", async ({
    page,
  }) => {
    await passFull(page);
    await room(page, "pau-gym-2026-11-20", "pau-gym-2026-11-24");
    await tab(page, "Week");
    await day(page, "Fri 20 Nov").click();
    await expect(page.locator("#classcard")).toContainText(
      "You've used 4 of 4 drop-in sessions in November",
    );
    await page.locator("#classcard").getByRole("button", { name: "See your options" }).click();
    await expect(offers(page)).toHaveText([
      "Buy 1 drop-in · CHF 25.00",
      "Upgrade to Regular · CHF 100.00",
    ]); // not full: no waitlist

    await offers(page).first().click();
    const pay = page.getByRole("dialog", { name: "Checkout" });
    await expect(pay).toContainText("Single session: Gym session, Fri 20 Nov");
    await expect(pay).toContainText("CHF 25.00");
    await expect(pay).toContainText("no money moves");
    expect(await demo(page, (d) => !!d.myBooking("pau-gym-2026-11-20"))).toBe(false); // nothing before the payment
    await pay.getByRole("button", { name: "Pay with TWINT" }).click();
    await expect(toast(page)).toContainText(
      "Test payment by TWINT succeeded: CHF 25.00. No real money moved. Booked: Gym session, Fri 20 Nov 18:00",
    );
    const state = await demo(page, (d) => ({
      pass: d.myBooking("pau-gym-2026-11-20").pass,
      main: d.passState(d.passOf("pau")).text,
      single: d.passState(
        d.ticketOf ? d.ticketOf("pau") : d.state.passes.find((p: any) => p.single),
      ).text,
    }));
    expect(state).toEqual({
      pass: "t-pau",
      main: "4 of 4 used in November",
      single: "0 credits left",
    });

    // Cancelling gives the single session back as a credit, and the next blocked session can simply be booked with it.
    await page.locator("#classcard").getByRole("button", { name: "Manage booking" }).click();
    await page.getByRole("button", { name: "Cancel booking" }).click();
    await tab(page, "Me");
    await expect(page.locator("#tickets")).toHaveText("Single session: 1 credit left.");
    await tab(page, "Week");
    await next(page).click();
    await day(page, "Tue 24 Nov").click();
    await expect(page.locator("#classcard")).toContainText("Single session: 1 credit left.");
    await page.locator("#classcard").getByRole("button", { name: "Book", exact: true }).click();
    await expect(toast(page)).toContainText("Booked: Gym session, Tue 24 Nov");
  });

  test("upgrade to Regular: unlimited from then on, on every screen", async ({ page }) => {
    await open(page);
    await room(
      page,
      "pau-technique-2026-11-18",
      "pau-gym-2026-11-17",
      "pau-gym-2026-11-20",
      "pau-gym-2026-11-24",
    );
    await tab(page, "Week");
    await day(page, "Wed 18 Nov").click(); // the technique session is not covered by the drop-in pass
    await page.locator("#classcard").getByRole("button", { name: "See your options" }).click();
    await expect(page.getByRole("dialog")).toContainText(
      "Your Drop-in season pass covers track sessions and gym sessions only.",
    );
    await offers(page).filter({ hasText: "Upgrade to Regular" }).click();
    const pay = page.getByRole("dialog", { name: "Checkout" });
    await expect(pay).toContainText("Upgrade to Regular season pass");
    await expect(pay).toContainText("the difference is CHF 100");
    await pay.getByRole("button", { name: "Pay with card" }).click();
    await expect(toast(page)).toContainText("Booked: Technique session, Wed 18 Nov 18:30");

    for (const t of ["Path", "Coach", "Me"]) {
      await tab(page, t);
      await expect(page.locator('#view [data-pass="p-pau"]').first()).toHaveAttribute(
        "data-text",
        "Unlimited group sessions",
      );
    }
    await expect(page.locator("#view")).toContainText("Regular season pass");
    // No monthly limit any more: five more sessions this month go through, and nothing offers an upgrade again.
    const more = await demo(page, (d) =>
      [
        "pau-track-2026-11-16",
        "pau-gym-2026-11-17",
        "pau-track-2026-11-19",
        "pau-gym-2026-11-20",
        "pau-track-2026-11-23",
      ].map((sid) => d.book(sid, "app").status),
    );
    expect(more).toEqual(Array(5).fill("confirmed"));
    expect(
      await demo(page, (d) => d.offersFor(d.state.sessions["pau-gym-2026-11-24"]).length),
    ).toBe(0);
  });

  test("full and out of credits: join the waitlist for free; when the spot comes it is held with the ways to pay", async ({
    page,
  }) => {
    await passFull(page);
    await fill(page, "pau-gym-2026-11-27", 0);
    await tab(page, "Week");
    await next(page).click();
    await day(page, "Fri 27 Nov").click();
    await page.locator("#classcard").getByRole("button", { name: "See your options" }).click();
    await expect(page.getByRole("dialog")).toContainText("The session is full, too");
    await expect(offers(page)).toHaveText(["Join waitlist", "Upgrade to Regular · CHF 100.00"]); // full: no drop-in for a spot that isn't there
    await offers(page).first().click();
    await expect(toast(page)).toContainText(
      "You are #1 on the waitlist. Nothing is charged until you get a spot. Your pass is used up",
    );

    // PAU books the next person automatically, but Mia's pass is used up: the spot is held for her instead.
    await freeSpot(page, "Gym session, Fri 27 Nov");
    await expect(toast(page)).toContainText("It is held for Mia Keller until 14:00");
    await asRole(page, "athlete");
    await tab(page, "Path");
    await page.getByRole("button", { name: "See your options" }).click();
    await expect(offers(page)).toHaveText([
      "Buy 1 drop-in · CHF 25.00",
      "Upgrade to Regular · CHF 100.00",
      "Pass it on",
    ]);
    await offers(page).first().click();
    await page.getByRole("button", { name: "Pay with TWINT" }).click();
    await expect(toast(page)).toContainText("Booked: Gym session, Fri 27 Nov 18:00");
    expect(
      await demo(page, (d) => [
        d.myBooking("pau-gym-2026-11-27").status,
        !!d.myWait("pau-gym-2026-11-27"),
        d.state.sessions["pau-gym-2026-11-27"].held,
      ]),
    ).toEqual(["confirmed", false, 0]);
  });

  test("the coach offers the same ways out, in the chat and on a card that failed on the pass", async ({
    page,
  }) => {
    await open(page);
    await room(page, "pau-gym-2026-11-20");
    await tab(page, "Coach");
    // A card made while the pass still had room...
    await say(page, "book gym on Friday");
    await expect(lastCard(page)).toHaveAttribute("data-state", "pending");
    // ...then the pass fills up, and the confirm fails: the card itself shows what she can do.
    await demo(page, (d) => void d.book("pau-track-2026-11-19", "app"));
    await lastCard(page).getByRole("button", { name: "Confirm" }).click();
    await expect(lastCard(page)).toHaveAttribute("data-state", "declined");
    await expect(lastCard(page).locator(".opts").getByRole("button")).toHaveText([
      "Buy 1 drop-in · CHF 25.00",
      "Upgrade to Regular · CHF 100.00",
    ]);

    // Asking again: no card that cannot work, but the reason, the ways out, and a free alternative.
    await say(page, "book gym on Friday");
    const msg = page.locator(".msg.coach").last();
    await expect(msg).toContainText(
      "I can't book Gym session on Fri 20 Nov. You've used 4 of 4 drop-in sessions in November",
    );
    await expect(msg).toContainText("Or train for free: Saturday community session");
    const opts = page.locator(".opts").last().getByRole("button");
    await expect(opts).toHaveText(["Buy 1 drop-in · CHF 25.00", "Upgrade to Regular · CHF 100.00"]);
    await expect(cards(page)).toHaveCount(1);

    // The coach never pays for her: the button opens the checkout, and she pays there.
    await opts.first().click();
    await page
      .getByRole("dialog", { name: "Checkout" })
      .getByRole("button", { name: "Pay with TWINT" })
      .click();
    await expect(toast(page)).toContainText("Booked: Gym session, Fri 20 Nov 18:00");
    await expect(page.locator(".opts")).toHaveCount(0); // solved: the offers are gone from the chat
  });

  test("Studio Demo, no credits left: a drop-in or a new pack", async ({ page }) => {
    await open(page);
    await room(page, "studio-strength-2026-11-18");
    await demo(page, (d) => {
      d.state.ledger.push({
        pass: "p-studio",
        delta: -6,
        kind: "admin_adjust",
        reason: "Test",
        at: new Date(),
      });
      d.render();
    });
    await atClub(page, "studio");
    await tab(page, "Week");
    await day(page, "Wed 18 Nov").click();
    await page.locator("#classcard").getByRole("button", { name: "See your options" }).click();
    await expect(page.getByRole("dialog")).toContainText(
      "No credits left on your 10 classes pack.",
    );
    await expect(offers(page)).toHaveText([
      "Buy 1 drop-in · CHF 33.00",
      "Buy 10 classes · CHF 290.00",
    ]);
    await offers(page).nth(1).click();
    await page.getByRole("button", { name: "Pay with card" }).click();
    await expect(toast(page)).toContainText("Booked: Strength, Wed 18 Nov 07:00");
    expect(await demo(page, (d) => d.passState(d.passOf("studio")).text)).toBe("9 credits left");
  });
});

test("I2-1 screens pass the same checks: axe (WCAG A and AA), 44 px targets, labels on icon buttons", async ({
  page,
}) => {
  await open(page);
  const problems: string[] = [];
  const check = async (name: string) => {
    const found = await page.evaluate(() => {
      const out: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>(
        "button, select, input, summary, [role=switch]",
      )) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const label = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40);
        if (r.width < 43.5 || r.height < 43.5)
          out.push(`small "${label}" ${Math.round(r.width)}x${Math.round(r.height)}`);
        if (
          el.tagName === "BUTTON" &&
          (el.closest("nav") || el.querySelector("svg:not(.pill svg)")) &&
          !el.getAttribute("aria-label")
        )
          out.push(`no aria-label "${label}"`);
      }
      return out;
    });
    for (const f of found) problems.push(`${name}: ${f}`);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    for (const v of violations) problems.push(`${name}: ${v.id} ${v.nodes[0]?.target.join(" ")}`);
  };
  await tab(page, "Week");
  await check("week");
  await page.locator('#classcard [data-a="sheet"]').click();
  await page.getByRole("button", { name: /Book every Monday/ }).click();
  await check("series preview");
  await page.getByRole("button", { name: "Start repeating" }).click();
  await page.locator("#series summary").click();
  await check("week with a series");
  // Out of credits, a held spot, and the coach's offers.
  await page.evaluate(() => {
    const d = window.PATH_DEMO,
      s = d.state.sessions["pau-gym-2026-11-20"];
    d.book("pau-track-2026-11-19", "app");
    Object.assign(s, { others: s.cap, waitOthers: 0 });
    d.book(s.id, "app", undefined, { wait: true });
    d.freeSpot(s.id);
    d.render();
  });
  await page.getByRole("button", { name: "Fri 20 Nov", exact: true }).click();
  await page.locator('#weekpane [data-a="sheet"][data-v="pau-gym-2026-11-20"]').first().click();
  await check("held spot, out of credits");
  await page.keyboard.press("Escape");
  await tab(page, "Coach");
  await check("coach chat with a held spot");
  await asRole(page, "admin");
  await check("admin home with the waitlist setting");
  expect(NOW.getDay()).toBe(1);
  expect(problems).toEqual([]);
});
