/* eslint-disable @typescript-eslint/no-explicit-any -- the demo is plain browser JS; its test hook (window.PATH_DEMO) has no types. */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  asRole,
  atClub,
  cards,
  lastCard,
  logWithKeyboard,
  minutesLater,
  NOW,
  open,
  passOn,
  say,
  tab,
} from "../helpers/demo";

/**
 * Iteration 2, milestone I2-0: one test (or more) per bug from the test report on prototype v1,
 * plus the fixes from Ramon's review of it.
 */

test.describe("B1 guardrails", () => {
  test("122% load plus a pain flag: the draft only reduces, and the coach sees why", async ({
    page,
  }) => {
    await open(page);
    // What the model proposed does add intensity: a race-pace session and a longer long run.
    const raw = await page.evaluate(() => window.PATH_DEMO.RAW_DRAFT.items);
    expect(raw.some((i: any) => i.intensity === "high" && i.load > 0)).toBe(true);

    // Log a tiny session with a pain flag. Load stays at 122% of the 4-week average.
    await tab(page, "Log");
    await page.getByLabel("What did you do?").fill("Easy jog");
    await page.getByLabel("Minutes").fill("1");
    await page.getByRole("button", { name: "RPE 1", exact: true }).click();
    await page.getByRole("button", { name: "Add details" }).click();
    await page.getByRole("switch", { name: "Something hurt" }).click();
    await page.getByRole("button", { name: "Knee" }).click();
    await page.getByLabel("Level, 0 to 10").fill("4");
    await logWithKeyboard(page);
    await expect(page.locator(".toast")).toContainText("Saved: Easy jog");
    const ratio = await page.evaluate(() => Math.round(window.PATH_DEMO.stats().ratio * 100));
    expect(ratio).toBe(122);

    // Coach, Review tab: the guardrail reason is on the draft, and nothing keeps or adds intensity.
    await asRole(page, "coach");
    await tab(page, "Review");
    const guard = page.locator("#guard");
    await expect(guard).toContainText("Guardrail applied");
    await expect(guard).toContainText("122% of the 4-week average");
    // Pain is health data: the coach learns that a signal is open, not what it is, until it is shared.
    await expect(guard).toContainText("not shared with this club");
    await expect(guard).not.toContainText("Knee");
    const items = page.locator("#draft-items li");
    await expect(items).toHaveCount(4);
    for (const li of await items.all()) {
      expect(await li.getAttribute("data-intensity")).not.toBe("high");
      expect(Number(await li.getAttribute("data-load"))).toBeLessThanOrEqual(0);
    }
    await expect(page.locator("#draft-items .strong")).not.toContainText([/10K pace/]);
    await expect(page.locator("#draft-items .was").first()).toContainText("400 m");

    // Once the athlete shares pain flags, the coach sees the actual reason.
    await asRole(page, "athlete");
    await tab(page, "Me");
    await page.getByRole("switch", { name: /Pain flags/ }).click();
    await asRole(page, "coach");
    await expect(page.locator("#guard")).toContainText("Knee, level 4");

    // Approving keeps the guarded version: the athlete never gets the race-pace session.
    await page.getByRole("button", { name: "Approve" }).click();
    const approved = await page.evaluate(() => window.PATH_DEMO.currentDraft());
    expect(approved.items.every((i: any) => i.intensity !== "high" && i.load <= 0)).toBe(true);
    expect(JSON.stringify(approved.items.map((i: any) => i.to))).not.toContain("10K pace");
  });

  test("each signal alone is enough, and without signals the draft passes untouched", async ({
    page,
  }) => {
    await open(page);
    const out = await page.evaluate(() => {
      const d = window.PATH_DEMO,
        s = d.state;
      const kinds = () => d.guard().reasons.map((r: any) => r.kind);
      const adds = () =>
        d.currentDraft().items.filter((i: any) => i.intensity === "high" || i.load > 0).length;
      const res: Record<string, unknown> = {};
      res.loadOnly = [kinds(), adds()]; // the seeded week is at 122%
      const cut = new Date(Date.now() - 6 * 864e5);
      s.entries = s.entries
        .filter((e: any) => e.at < cut)
        .concat(s.entries.filter((e: any) => e.at >= cut).slice(0, 2));
      res.ratio = d.stats().ratio;
      res.none = [kinds(), adds()];
      s.entries[0].pain = true;
      s.entries[0].painWhere = "Back";
      s.entries[0].painLevel = 3;
      s.entries[0].at = new Date();
      res.painOnly = [kinds(), adds()];
      return res;
    });
    expect(out.loadOnly).toEqual([["load"], 0]);
    expect(out.ratio as number).toBeLessThanOrEqual(1.1);
    expect((out.none as any[])[0]).toEqual([]);
    expect((out.none as any[])[1]).toBeGreaterThan(0);
    expect(out.painOnly).toEqual([["pain"], 0]);
  });
});

test("B1 plan changes never touch a session that is in the past, has started or was attended", async ({
  page,
}) => {
  await open(page);
  const draftDays = () =>
    page.evaluate(() =>
      window.PATH_DEMO.currentDraft().items.map((i: any) => `${i.wd}:${i.date.getDate()}`),
    );
  // Nothing has happened yet today: Monday's change may still apply to tonight.
  expect(await draftDays()).toEqual(["1:16", "4:19", "0:22", "3:18"]);

  // Mia books tonight's track session and is marked present.
  await page.evaluate(() => {
    const d = window.PATH_DEMO;
    d.book("pau-track-2026-11-16", "app");
    d.markAttendance("pau-track-2026-11-16", "Mia Keller", "present");
    d.render();
  });
  // The draft moves Monday's change to next Monday, and the coach sees that date.
  expect(await draftDays()).toEqual(["1:23", "4:19", "0:22", "3:18"]);
  await asRole(page, "coach");
  await tab(page, "Review");
  await expect(page.locator("#draft-items [data-date]").first()).toHaveAttribute(
    "data-date",
    "2026-11-23",
  );
  await expect(page.locator('#draft-items [data-date="2026-11-16"]')).toHaveCount(0);

  // The easy week leaves the attended session out, and confirming it changes nothing on that day.
  await asRole(page, "athlete");
  await tab(page, "Coach");
  await say(page, "I need an easy week");
  await expect(lastCard(page)).toContainText("Thu 19 Nov");
  await expect(lastCard(page)).toContainText("Sun 22 Nov");
  await expect(lastCard(page)).not.toContainText("Mon 16 Nov");
  await lastCard(page).getByRole("button", { name: "Confirm" }).click();
  const monday = await page.evaluate(() => {
    const d = window.PATH_DEMO,
      s = d.state;
    return {
      plan: s.plan.items.find((i: any) => i.date === "2026-11-16"),
      booking: d.myBooking("pau-track-2026-11-16").status,
    };
  });
  expect(monday.plan).toMatchObject({ title: "Track session", kind: "club", status: "planned" });
  expect(monday.booking).toBe("attended");

  // Thursday 19:00: the track session started at 18:30. Past and started days are locked in the engine itself.
  await page.clock.setFixedTime(new Date("2026-11-19T19:00:00+01:00"));
  const locked = await page.evaluate(() => {
    const d = window.PATH_DEMO;
    // Put Thursday's track session back into the plan (the easy week swapped it) to test the lock on a started session.
    Object.assign(
      d.state.plan.items.find((i: any) => i.date === "2026-11-19"),
      { kind: "club", off: "track", title: "Track session", status: "planned" },
    );
    return ["2026-11-17", "2026-11-19"].map(
      (date, n) => d.runAct({ t: "swap", date }, `test-${n}`).code,
    );
  });
  expect(locked).toEqual(["PLAN_LOCKED", "PLAN_LOCKED"]);
  expect(await draftDays()).toEqual(["1:23", "4:26", "0:22", "3:25"]);

  // The coach approves and Mia accepts: every day up to and including today is exactly as before.
  const upToToday = () =>
    page.evaluate(() =>
      JSON.stringify(window.PATH_DEMO.state.plan.items.filter((i: any) => i.date <= "2026-11-19")),
    );
  const before = await upToToday();
  await asRole(page, "coach");
  await tab(page, "Review");
  await page.getByRole("button", { name: "Approve" }).click();
  await asRole(page, "athlete");
  await tab(page, "Path");
  // (Tuesday's yoga class ended two days ago and is not logged, so Path first asks how it went. Log it.)
  await page.getByRole("button", { name: "Log it" }).click();
  await page.getByRole("button", { name: "RPE 3", exact: true }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Review plan" }).click();
  await expect(page.locator(".toast")).toContainText("Nothing in the past was touched");
  expect(await upToToday()).toBe(before);
});

test("Pain reply: offers to make today easy, and only cancels when the athlete asks", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => void window.PATH_DEMO.book("pau-track-2026-11-16", "app"));
  await tab(page, "Coach");
  await say(page, "My knee hurts");
  await expect(page.locator(".msg.coach").last()).toContainText("Want me to make today easy?");
  await expect(cards(page)).toHaveCount(1);
  await expect(lastCard(page).locator(".h2")).toHaveText("Make today easy?");
  await expect(lastCard(page)).toContainText(
    "Your booking for Track session at 18:30 stays as it is",
  );
  await expect(
    cards(page)
      .locator(".h2")
      .filter({ hasText: /cancel/i }),
  ).toHaveCount(0);

  await lastCard(page).getByRole("button", { name: "Confirm" }).click();
  await expect(lastCard(page).locator(".results li")).toHaveText([/Plan: today is now rest/]);
  const after = await page.evaluate(() => {
    const d = window.PATH_DEMO;
    return {
      today: d.state.plan.items.find((i: any) => i.date === "2026-11-16").kind,
      booked: d.myBooking("pau-track-2026-11-16").status,
    };
  });
  expect(after).toEqual({ today: "rest", booked: "confirmed" });

  // Today is easy now: no second card.
  await say(page, "it still hurts");
  await expect(page.locator(".msg.coach").last()).toContainText("Today is already easy");
  await expect(cards(page)).toHaveCount(1);

  // She asks for the cancel herself: now there is a cancel card.
  await say(page, "My knee hurts, please cancel tonight's session");
  await expect(lastCard(page).locator(".h2")).toHaveText("Cancel this booking?");
  await expect(lastCard(page)).toContainText("Track session, Mon 16 Nov 18:30");
});

test("B2 one pass balance: Path, Coach and Me agree before a booking, after it, and after a cancel", async ({
  page,
}) => {
  await open(page);
  const screens = ["Path", "Coach", "Me"];
  const same = (text: string) => Object.fromEntries(screens.map((s) => [s, text]));
  expect(await passOn(page, screens)).toEqual(same("3 of 4 used in November"));

  await tab(page, "Week");
  await page.getByRole("button", { name: "Thu 19 Nov", exact: true }).click();
  await page.locator("#classcard").getByRole("button", { name: "Book", exact: true }).click();
  await expect(page.locator(".toast")).toContainText("Booked: Track session, Thu 19 Nov");
  expect(await passOn(page, screens)).toEqual(same("4 of 4 used in November"));

  await tab(page, "Week");
  await page.locator("#classcard").getByRole("button", { name: "Manage booking" }).click();
  await page.getByRole("button", { name: "Cancel booking" }).click();
  expect(await passOn(page, screens)).toEqual(same("3 of 4 used in November"));

  // The booking sheet, the coach's athlete page and the admin member list read the same number.
  await tab(page, "Week");
  await page.locator('#classcard [data-a="sheet"]').click();
  await expect(page.getByRole("dialog").locator("[data-pass]")).toHaveAttribute(
    "data-text",
    "3 of 4 used in November",
  );
  await page.keyboard.press("Escape");
  await asRole(page, "coach");
  await tab(page, "Athletes");
  await expect(page.locator("#view [data-pass]")).toHaveAttribute(
    "data-text",
    "3 of 4 used in November",
  );
  await asRole(page, "admin");
  await tab(page, "Members");
  await expect(page.locator("#view [data-pass]")).toHaveAttribute(
    "data-text",
    "3 of 4 used in November",
  );

  // And it is the ledger, nothing else: 4 debits and 1 refund for November.
  const ledger = await page.evaluate(() =>
    window.PATH_DEMO.state.ledger
      .filter((l: any) => l.pass === "p-pau" && l.period === "2026-11")
      .map((l: any) => l.delta),
  );
  expect(ledger).toEqual([-1, -1, -1, -1, 1]);
});

test("B3 past sessions cannot be booked, and show attended or missed with Log it", async ({
  page,
}) => {
  await open(page);
  // Studio Demo had Strength at 07:00 today. It is 12:00.
  await atClub(page, "studio");
  await tab(page, "Week");
  const over = page.locator('[data-a="sheet"][data-v="studio-strength-2026-11-16"]');
  await expect(over).toContainText("Over");
  await over.click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toContainText("This session is over");
  await expect(sheet.getByRole("button", { name: /Book|Join waitlist/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  const refused = await page.evaluate(() => {
    const d = window.PATH_DEMO,
      n = d.state.bookings.length,
      r = d.book("studio-strength-2026-11-16", "app");
    return { code: r.code, added: d.state.bookings.length - n };
  });
  expect(refused).toEqual({ code: "WINDOW_CLOSED", added: 0 });

  // A session that is running right now is closed too.
  await page.clock.setFixedTime(minutesLater(20)); // 12:20, HIIT started at 12:15
  await tab(page, "Week");
  const running = page.locator('[data-a="sheet"][data-v="studio-hiit-2026-11-16"]');
  await expect(running).toContainText("Started");
  await running.click();
  await expect(sheet).toContainText("This session has already started");
  await expect(sheet.getByRole("button", { name: /Book|Join waitlist/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.clock.setFixedTime(NOW);

  // PAU: Friday's gym session was attended. Thursday's track was booked but nobody marked Mia present.
  await atClub(page, "pau");
  await page.evaluate(() => {
    const d = window.PATH_DEMO,
      sid = "pau-track-2026-11-12";
    d.state.bookings.find((b: any) => b.sid === sid).status = "confirmed";
    delete d.state.attendance[sid];
    d.render();
  });
  const recent = page.locator("#recent");
  await expect(recent.locator('[data-past="pau-gym-2026-11-13"]')).toContainText("Attended");
  const missed = recent.locator('[data-past="pau-track-2026-11-12"]');
  await expect(missed).toContainText("Missed");
  await missed.getByRole("button", { name: "Log it" }).click();

  // "Log it" opens the log for that session, on that day.
  await expect(page.getByLabel("What did you do?")).toHaveValue("Track session");
  await expect(page.locator("#view")).toContainText("Filled in from your session on Thu 12 Nov");
  await page.getByRole("button", { name: "RPE 7", exact: true }).click();
  await logWithKeyboard(page);
  const entry = await page.evaluate(() => {
    const e = window.PATH_DEMO.state.entries.find((x: any) => x.sid === "pau-track-2026-11-12");
    return e && { title: e.title, day: e.at.getDate(), rpe: e.rpe };
  });
  expect(entry).toEqual({ title: "Track session", day: 12, rpe: 7 });
  await tab(page, "Week");
  await expect(page.locator('#recent [data-past="pau-track-2026-11-12"]')).toContainText("Logged");
});

test.describe("B4 roster", () => {
  const SID = "pau-track-2026-11-16";
  const openRoster = async (page: Page, sid: string) => {
    await asRole(page, "coach");
    await tab(page, "Today");
    await page.locator(`[data-a="roster"][data-v="${sid}"]`).click();
  };
  const headerEqualsRows = async (page: Page) => {
    const n = Number(await page.locator("#roster-count").textContent());
    await expect(page.locator("#roster [data-row]")).toHaveCount(n);
    return n;
  };

  test("only confirmed bookings and walk-ins are listed, and the header counts the rows (with a cancel)", async ({
    page,
  }) => {
    await open(page);
    // Mia has no booking for tonight's track session, so she is not on the roster.
    await openRoster(page, SID);
    const before = await headerEqualsRows(page);
    await expect(page.locator('#roster [data-row="Mia Keller"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Mark all present" }).click();
    expect(
      await page.evaluate((sid) => "Mia Keller" in window.PATH_DEMO.state.attendance[sid], SID),
    ).toBe(false);

    // She books: one more row.
    await asRole(page, "athlete");
    await tab(page, "Week");
    await page.locator("#classcard").getByRole("button", { name: "Book", exact: true }).click();
    await openRoster(page, SID);
    expect(await headerEqualsRows(page)).toBe(before + 1);
    await expect(page.locator('#roster [data-row="Mia Keller"]')).toHaveCount(1);

    // She cancels: the row is gone and the count is back.
    await asRole(page, "athlete");
    await tab(page, "Week");
    await page.locator("#classcard").getByRole("button", { name: "Manage booking" }).click();
    await page.getByRole("button", { name: "Cancel booking" }).click();
    await openRoster(page, SID);
    expect(await headerEqualsRows(page)).toBe(before);
    await expect(page.locator('#roster [data-row="Mia Keller"]')).toHaveCount(0);

    // A walk-in is added explicitly, is labelled, and counts.
    await page.getByLabel("Add a walk-in").fill("Robin Gast");
    await page.getByRole("button", { name: "Add to roster" }).click();
    expect(await headerEqualsRows(page)).toBe(before + 1);
    await expect(page.locator('#roster [data-row="Robin Gast"]')).toContainText("Walk-in");
  });

  test("a waitlist promotion puts the member on the roster, not before", async ({ page }) => {
    await open(page);
    const FULL = "pau-gym-2026-11-20";
    await page.evaluate((sid) => {
      const d = window.PATH_DEMO,
        s = d.state.sessions[sid];
      s.others = s.cap;
      s.waitOthers = 1;
      d.render();
    }, FULL);
    await tab(page, "Week");
    await page.getByRole("button", { name: "Fri 20 Nov", exact: true }).click();
    await page.locator("#classcard").getByRole("button", { name: "Join waitlist" }).click();
    await expect(page.locator(".toast")).toContainText("#2 on the waitlist");

    // Waiting is not being on the roster.
    await openRoster(page, FULL);
    expect(await headerEqualsRows(page)).toBe(15);
    await expect(page.locator('#roster [data-row="Mia Keller"]')).toHaveCount(0);
    await expect(page.locator("#roster-wait li")).toHaveCount(3); // one ahead, Mia, one who joined behind her
    await expect(page.locator("#roster-wait")).toContainText("Mia Keller");

    // Two members cancel: the first spot goes to #1, the second to Mia.
    await asRole(page, "admin");
    await tab(page, "Schedule");
    const free = page.getByRole("button", { name: "Free a spot: Gym session, Fri 20 Nov" });
    await free.click();
    await expect(page.locator(".toast")).toContainText("moved up to #1");
    await free.click();
    await expect(page.locator(".toast")).toContainText("promoted from the waitlist and booked");

    await openRoster(page, FULL);
    expect(await headerEqualsRows(page)).toBe(15);
    await expect(page.locator('#roster [data-row="Mia Keller"]')).toHaveCount(1);
    await expect(page.locator("#roster-wait li")).toHaveCount(1); // the person behind her is still waiting
    await expect(page.locator("#roster-wait")).not.toContainText("Mia Keller");
    expect(
      await page.evaluate(() => window.PATH_DEMO.passState(window.PATH_DEMO.passOf("pau")).text),
    ).toBe("4 of 4 used in November");
  });
});

test.describe("B5 confirm cards", () => {
  test("Confirm checks again: an action that is no longer possible gives a declined card, never Confirmed", async ({
    page,
  }) => {
    await open(page);
    await tab(page, "Coach");
    const notConfirmed = async (reason: RegExp) => {
      const card = lastCard(page);
      await card.getByRole("button", { name: "Confirm" }).click();
      await expect(card).toHaveAttribute("data-state", "declined");
      await expect(card.locator(".results li")).toHaveText([reason]);
      await expect(card.locator(".results li")).toHaveAttribute("data-ok", "false");
      await expect(card).not.toContainText("Confirmed");
      await expect(card).toContainText("Nothing was changed");
      await expect(card.getByRole("button", { name: /Confirm|Not now/ })).toHaveCount(0);
    };

    // The pass fills up between the card and the confirm (4 of 4).
    await say(page, "Book my usual Thursday");
    await page.evaluate(() => void window.PATH_DEMO.book("pau-gym-2026-11-20", "app"));
    await notConfirmed(/^Couldn't book: You've used 4 of 4 drop-in sessions in November/);
    expect(await page.evaluate(() => !!window.PATH_DEMO.myBooking("pau-track-2026-11-19"))).toBe(
      false,
    );

    // The session fills up meanwhile: no silent switch to the waitlist.
    await say(page, "book the community session on Saturday");
    await page.evaluate(() => {
      const s = window.PATH_DEMO.state.sessions["pau-community-2026-11-21"];
      s.others = s.cap;
    });
    await notConfirmed(/^Couldn't book: It filled up since I asked/);
    expect(await page.evaluate(() => window.PATH_DEMO.state.waitlist.length)).toBe(0);

    // The booking was already cancelled somewhere else.
    await say(page, "Cancel my yoga class at Studio Demo");
    await page.evaluate(() => {
      const d = window.PATH_DEMO;
      d.cancel(d.myBooking("studio-yoga-2026-11-17").id);
    });
    await notConfirmed(/^Couldn't cancel: That booking is not active any more/);
  });

  test("a double confirm books once: one idempotency key per proposal", async ({ page }) => {
    await open(page);
    const r = await page.evaluate(() => {
      const d = window.PATH_DEMO,
        s = d.state;
      d.ask("book gym on Friday");
      const id = s.chat[s.chat.length - 1].prop,
        p = s.props[id],
        before = s.bookings.length;
      d.confirmProposal(id, true);
      d.confirmProposal(id, true);
      const again = d.book(p.acts[0].sid, "ai_coach", `${p.key}:0`);
      return {
        key: p.key,
        added: s.bookings.length - before,
        results: p.results.length,
        status: p.status,
        debits: s.ledger.filter((l: any) => l.bid === again.bid).length,
        replay: again.status,
      };
    });
    expect(r.key).toMatch(/^prop-\d+$/);
    expect(r).toMatchObject({
      added: 1,
      results: 1,
      status: "confirmed",
      debits: 1,
      replay: "confirmed",
    });
  });
});

test("B7 a weekday or date in the request overrides the default pattern", async ({ page }) => {
  await open(page);
  await tab(page, "Coach");
  const expectCard = async (ask: string, line: RegExp, why?: RegExp) => {
    await say(page, ask);
    await expect(lastCard(page)).toHaveAttribute("data-state", "pending");
    await expect(lastCard(page)).toContainText(line);
    if (why) await expect(page.locator(".msg.coach").last()).toContainText(why);
  };
  await expectCard(
    "Book my usual",
    /Track session, Thu 19 Nov 18:30/,
    /the Thursday track session 6 times/,
  );
  await expectCard(
    "Book my usual Thursday",
    /Track session, Thu 19 Nov 18:30/,
    /your usual Thursday/,
  );
  await expectCard(
    "book my usual Tuesday",
    /Gym session, Tue 17 Nov 18:00/,
    /the Tuesday gym session 4 times/,
  );
  await expectCard(
    "my usual on friday please",
    /Gym session, Fri 20 Nov 18:00/,
    /your usual Friday/,
  );
  await expectCard("book my usual Saturday", /Saturday community session, Sat 21 Nov 10:00/);
  await expectCard("book track on Monday", /Track session, Mon 16 Nov 18:30/);
  await expectCard("book gym on 20 Nov", /Gym session, Fri 20 Nov 18:00/);
  await say(page, "book track on Wednesday");
  await expect(page.locator(".msg.coach").last()).toContainText("It runs on Mondays, Thursdays");

  const parsed = await page.evaluate(() => {
    const p = window.PATH_DEMO.parseWhen;
    return [
      p("my usual Thursday").weekday,
      p("thurs 18:30").weekday,
      p("on 19 Nov").date?.getDate(),
      p("19.11.").date?.getMonth(),
      p("tomorrow").date?.getDate(),
      p("book my usual").weekday,
    ];
  });
  expect(parsed).toEqual([4, 4, 19, 10, 17, null]);
});

test("B8 coach memory: a club only sees its own items plus general ones, labelled", async ({
  page,
}) => {
  await open(page);
  await tab(page, "Me");
  const mem = page.locator("#memory");
  await expect(mem.locator("[data-mem]")).toHaveCount(3);
  await expect(mem.locator('[data-mem="pau"] .tag')).toHaveText(["PAU Trackrunning"]);
  await expect(mem.locator('[data-mem="general"] .tag')).toHaveText(["General", "General"]);
  await expect(mem).not.toContainText("yoga");
  await expect(mem).toContainText("1 more item belongs to your other clubs");

  // The same person at the other club: that club's item, plus the general ones.
  await atClub(page, "studio");
  await expect(mem.locator("[data-mem]")).toHaveCount(3);
  await expect(mem.locator('[data-mem="studio"] .tag')).toHaveText(["Studio Demo"]);
  await expect(mem).toContainText("Tuesday yoga flow");
  await expect(mem).not.toContainText("Thursday track");

  // The coach chat answers from the same filtered list.
  await tab(page, "Coach");
  await say(page, "What do you remember?");
  const answer = page.locator(".msg.coach").last();
  await expect(answer).toContainText("[Studio Demo] Likes the Tuesday yoga flow");
  await expect(answer).toContainText("[General]");
  await expect(answer).not.toContainText("Thursday track");

  // It stays the person's: deleting works from the club where it shows.
  await tab(page, "Me");
  await page.getByRole("button", { name: /Delete this memory: Likes the Tuesday yoga/ }).click();
  await expect(mem.locator("[data-mem]")).toHaveCount(2);
});

test("B10 switching club keeps the current tab, in every role", async ({ page }) => {
  await open(page);
  const all = {
    athlete: ["Path", "Week", "Explore", "Coach", "Me"],
    coach: ["Today", "Athletes", "Review", "Alerts"],
    admin: ["Home", "Schedule", "Members", "Products", "Money"],
  } as const;
  for (const role of ["athlete", "coach", "admin"] as const) {
    await asRole(page, role);
    for (const name of all[role]) {
      await tab(page, name);
      for (const club of ["studio", "pau"] as const) {
        await atClub(page, club);
        await expect(page.locator('nav [aria-current="page"]')).toHaveText(name);
        await expect(page.locator(".clubbtn")).toHaveAttribute("data-org", club);
      }
    }
  }
  // The day picked in Week survives the switch too.
  await asRole(page, "athlete");
  await tab(page, "Week");
  await page.getByRole("button", { name: "Thu 19 Nov", exact: true }).click();
  await atClub(page, "studio");
  await expect(page.getByRole("button", { name: "Thu 19 Nov", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("B13 the demo survives a reload, and Reset demo starts over", async ({ page }) => {
  await open(page);
  await expect(page.locator(".banner")).toContainText("saved on this device");
  await tab(page, "Week");
  await page.locator("#classcard").getByRole("button", { name: "Book", exact: true }).click();
  await atClub(page, "studio");
  await tab(page, "Coach");
  await say(page, "Book yoga on Thursday");

  await page.reload();
  // Same tab, same club, same booking, same pending card, real dates after the round trip.
  await expect(page.locator('nav [aria-current="page"]')).toHaveText("Coach");
  await expect(page.locator(".clubbtn")).toHaveAttribute("data-org", "studio");
  await expect(lastCard(page)).toHaveAttribute("data-state", "pending");
  await expect(lastCard(page)).toContainText("Yoga flow, Thu 19 Nov 18:45");
  const kept = await page.evaluate(() => {
    const s = window.PATH_DEMO.state;
    return {
      booked: !!window.PATH_DEMO.myBooking("pau-track-2026-11-16"),
      dates: s.sessions["pau-track-2026-11-16"].start instanceof Date,
      pass: window.PATH_DEMO.passState(window.PATH_DEMO.passOf("pau")).text,
    };
  });
  expect(kept).toEqual({ booked: true, dates: true, pass: "4 of 4 used in November" });

  // Reset takes two taps. One tap changes nothing.
  const reset = page.locator(".banner .resetbtn");
  await reset.click();
  await expect(page.locator(".toast")).toContainText("Tap Reset again to confirm");
  expect(await page.evaluate(() => !!window.PATH_DEMO.myBooking("pau-track-2026-11-16"))).toBe(
    true,
  );
  await reset.click();
  await expect(page.locator(".toast")).toContainText("Demo reset");
  expect(await page.evaluate(() => !!window.PATH_DEMO.myBooking("pau-track-2026-11-16"))).toBe(
    false,
  );
  await page.reload();
  expect(await page.evaluate(() => window.PATH_DEMO.state.chat.length)).toBe(1);
  expect(
    await page.evaluate(() => window.PATH_DEMO.passState(window.PATH_DEMO.passOf("pau")).text),
  ).toBe("3 of 4 used in November");

  // Hiding the notice keeps a Reset button under Me.
  await page.getByRole("button", { name: /Hide this notice/ }).click();
  await tab(page, "Me");
  await expect(page.locator("#view").getByRole("button", { name: "Reset demo" })).toBeVisible();
});

test.describe("B11 and B12 accessibility", () => {
  /** Every screen of the demo, with the states that add controls. */
  async function eachScreen(page: Page, check: (name: string) => Promise<void>) {
    for (const club of ["pau", "studio"] as const) {
      await asRole(page, "athlete");
      await atClub(page, club);
      for (const name of ["Path", "Week", "Me"]) {
        await tab(page, name);
        await check(`athlete ${club} ${name}`);
      }
    }
    await atClub(page, "pau");
    await tab(page, "Week");
    await page.locator('#classcard [data-a="sheet"]').click();
    await check("session sheet");
    await page.keyboard.press("Escape");
    await tab(page, "Me");
    await page
      .getByRole("button", { name: /^Buy/ })
      .or(page.getByRole("button", { name: "Pay" }))
      .first()
      .click();
    await check("checkout sheet");
    await page.keyboard.press("Escape");

    await tab(page, "Log");
    await page.getByRole("button", { name: "Add details" }).click();
    await page.getByRole("switch", { name: "Something hurt" }).click();
    await check("log with pain");
    await tab(page, "Path"); // progress lives on Path now (D-3)
    await check("progress");

    // Coach chat with a card in each state.
    await tab(page, "Coach");
    await say(page, "Book my usual");
    await lastCard(page).getByRole("button", { name: "Confirm" }).click();
    await say(page, "Cancel my next session");
    await lastCard(page).getByRole("button", { name: "Not now" }).click();
    await say(page, "book gym on Friday");
    await say(page, "book gym on Friday");
    await say(page, "Cancel everything");
    await check("coach chat with cards");

    await asRole(page, "coach");
    for (const name of ["Today", "Athletes", "Review", "Alerts"]) {
      await tab(page, name);
      await check(`coach ${name}`);
    }
    await tab(page, "Today");
    await page.locator('[data-a="roster"]').first().click();
    await check("coach roster");
    await asRole(page, "admin");
    for (const club of ["pau", "studio"] as const) {
      await atClub(page, club);
      for (const name of ["Home", "Schedule", "Members", "Products", "Money"]) {
        await tab(page, name);
        await check(`admin ${club} ${name}`);
      }
    }
  }

  test("axe finds no WCAG A or AA violations (contrast included) on any screen", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await open(page);
    const problems: string[] = [];
    await eachScreen(page, async (name) => {
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      for (const v of violations)
        problems.push(`${name}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target.join(" ")}`);
    });
    expect(problems).toEqual([]);
  });

  test("every control is at least 44 by 44 px, and all nav and icon buttons have an aria-label, in all three roles", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await open(page);
    const problems: string[] = [];
    await eachScreen(page, async (name) => {
      const found = await page.evaluate(() => {
        const out: string[] = [];
        for (const el of document.querySelectorAll<HTMLElement>(
          "button, select, input, summary, a[href], [role=switch]",
        )) {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height || el.closest("[hidden]")) continue;
          const label = (
            el.getAttribute("aria-label") ||
            el.textContent ||
            (el as HTMLInputElement).placeholder ||
            el.id ||
            ""
          )
            .trim()
            .slice(0, 40);
          if (r.width < 43.5 || r.height < 43.5)
            out.push(
              `small ${el.tagName.toLowerCase()} "${label}" ${Math.round(r.width)}x${Math.round(r.height)}`,
            );
          if (
            el.tagName === "BUTTON" &&
            !(el.textContent || "").trim() &&
            !el.getAttribute("aria-label")
          )
            out.push(`unnamed button ${el.outerHTML.slice(0, 60)}`);
          // Navigation buttons and every button that carries an icon have an explicit aria-label
          // (the tick inside a "Booked" status pill is decoration on a text row, not an icon button).
          if (
            el.tagName === "BUTTON" &&
            (el.closest("nav") || el.querySelector("svg:not(.pill svg)")) &&
            !el.getAttribute("aria-label")
          )
            out.push(`no aria-label: ${el.outerHTML.slice(0, 80)}`);
        }
        return out;
      });
      for (const f of found) problems.push(`${name}: ${f}`);
    });
    expect(problems).toEqual([]);
  });
});
