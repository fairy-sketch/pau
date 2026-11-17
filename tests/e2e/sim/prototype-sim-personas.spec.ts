/* eslint-disable @typescript-eslint/no-explicit-any -- the demo is plain browser JS; its test hook (window.PATH_DEMO) has no types. */
import { expect, test } from "@playwright/test";

import { lastCard, say } from "../../helpers/demo";
import { MONDAY_NOON, ZURICH, clock, screen, sim, start } from "./harness";

/** Persona simulations: each one is a person's week, end to end, checked on every screen where it must show. */

test.describe("Athlete Jonas: a regular's week at PAU (played on the demo athlete)", () => {
  test("books his usual Thursday through the coach, and every screen agrees", async ({ page }) => {
    await start(page);
    await screen(page, "athlete", "coach");
    await say(page, "Book my usual");
    await expect(lastCard(page)).toContainText(/Thu 19 Nov/);
    await lastCard(page)
      .getByRole("button", { name: /^Confirm/ })
      .click();
    const st = await sim(page, (d) => ({
      b: !!d.myBooking("pau-track-2026-11-19"),
      pass: d.passState(d.passOf("pau")).text,
    }));
    expect(st).toEqual({ b: true, pass: "4 of 4 used in November" });
    expect(await screen(page, "athlete", "path")).toMatch(
      /Tempo run: 20 min steady From Coach Sara · Booked · 18:30/,
    );
    await sim(page, (d) => {
      d.state.day = "2026-11-19";
    });
    expect(await screen(page, "athlete", "week")).toMatch(
      /THU 19 NOV · 18:30 Track session .{0,80}? Booked/i,
    );
    expect(await screen(page, "athlete", "me")).toMatch(/4 \/ 4 used in November/);
    expect(await screen(page, "admin", "sched")).toMatch(
      /Thu 19 Nov 18:30 Track session Coach Sara[^]*? 26 \/ 30/,
    );
    // The coach finds him on that session.
    await sim(page, (d) => {
      const S = d.state;
      S.role = "coach";
      S.tab.coach = "week";
      S.dash.sess = "pau-track-2026-11-19";
      d.render();
    });
    await expect(page.locator("#attendees")).toContainText("Mia Keller");
  });

  test("out of credits and the session is full: waitlist for free, a held spot, a drop-in to take it", async ({
    page,
  }) => {
    await start(page);
    const sid = "pau-gym-2026-11-24"; // 15 of 15 booked, one person waiting
    const out = await sim(
      page,
      (d, sid) => {
        const S = d.state,
          s = S.sessions[sid];
        d.book("pau-track-2026-11-19", "sheet"); // the fourth and last session on the pass this month
        const direct = d.book(sid, "sheet"); // the pass says no
        const wait = d.book(sid, "sheet", null, { wait: true });
        const first = d.freeSpot(sid); // goes to the person ahead
        const second = d.freeSpot(sid); // now it is his, but he cannot pay with the pass: it is held
        const w = d.myWait(sid);
        return {
          direct: direct.code,
          blocked: direct.blocked,
          wait: wait.status,
          waitMsg: wait.msg,
          first,
          second,
          held: s.held,
          offer: !!(w && w.offer),
          spotsForOthers: d.spots(s),
          nextStep: d.nextStep().title,
        };
      },
      sid,
    );
    expect(out.direct).toBe("LIMIT_REACHED");
    expect(out.blocked).toBe(true);
    expect(out.wait).toBe("waitlisted");
    expect(out.waitMsg).toContain(
      "You are #2 on the waitlist. Nothing is charged until you get a spot.",
    );
    expect(out.first).toContain("went to the next person on the waitlist");
    expect(out.second).toContain("It is held for Mia Keller until");
    expect(out).toMatchObject({ held: 1, offer: true, spotsForOthers: 0 });
    expect(await screen(page, "athlete", "path")).toMatch(/NEXT STEP A spot is held for you/i);

    // He buys one drop-in and takes the spot. The monthly pass is untouched.
    const took = await sim(
      page,
      (d, sid) => {
        d.purchase("dropin", "pau");
        const r = d.acceptOffer(sid);
        return {
          ok: r.ok,
          status: r.status,
          pass: d.passState(d.passOf("pau")).text,
          ticketsLeft: d.passState(d.state.passes.find((p: any) => p.single)).left,
          held: d.state.sessions[sid].held || 0,
          waiting: !!d.myWait(sid),
        };
      },
      sid,
    );
    expect(took).toEqual({
      ok: true,
      status: "confirmed",
      pass: "4 of 4 used in November",
      ticketsLeft: 0,
      held: 0,
      waiting: false,
    });
    // The drop-in is in the pass history, used once.
    expect(
      await sim(page, (d) =>
        d.state.ledger.filter((l: any) => l.pass === "t-pau").map((l: any) => l.delta),
      ),
    ).toEqual([1, -1]);
  });

  test("cancels late: PAU gives the session back, the booking is marked late, the coach's list drops him", async ({
    page,
  }) => {
    await start(page);
    const bid = await sim(page, (d) => d.book("pau-track-2026-11-19", "sheet").bid);
    await clock(page, ZURICH("2026-11-19T17:30")); // one hour before, inside the 2 h window
    const r = await sim(
      page,
      (d, bid) => {
        const c = d.cancel(bid);
        return {
          status: c.status,
          msg: c.msg,
          pass: d.passState(d.passOf("pau")).text,
          again: d.cancel(bid).code,
        };
      },
      bid,
    );
    expect(r.status).toBe("late_cancelled");
    expect(r.msg).toBe(
      "Cancelled: Track session, Thu 19 Nov. It no longer counts towards November.",
    );
    expect(r.pass).toBe("3 of 4 used in November");
    expect(r.again).toBe("NOT_FOUND"); // a second tap changes nothing
    await sim(page, (d) => {
      const S = d.state;
      S.role = "coach";
      S.tab.coach = "week";
      S.dash.sess = "pau-track-2026-11-19";
      d.render();
    });
    await expect(page.locator("#attendees")).not.toContainText("Mia Keller");
  });

  test("logs a session with knee pain: private by default, visible to the coach only once he shares it", async ({
    page,
  }) => {
    await start(page);
    await sim(page, (d) => {
      d.state.entries.unshift({
        id: 9001,
        at: new Date(),
        title: "Track session",
        dur: 90,
        rpe: 8,
        pain: true,
        painWhere: "Knee",
        painLevel: 6,
        notes: "",
        comments: [],
      });
      d.render();
    });
    for (const tab of ["today", "week", "athletes", "review", "alerts"]) {
      const text = (await screen(page, "coach", tab))
        .replace(/Jonas Meier[^.]*knee flag[^.]*/gi, "")
        .replace(/Jonas shared a knee flag[^.]*\./, "");
      expect(text, `coach/${tab} must not show Mia's private pain`).not.toMatch(/knee|level 6/i);
    }
    await sim(page, (d) => {
      const S = d.state;
      S.role = "coach";
      S.tab.coach = "athletes";
      S.dash.athlete = "mia";
      d.render();
    });
    await expect(page.locator("#athlete-detail")).not.toContainText(/knee|pain 6/i);
    await expect(page.locator("#sharing")).toContainText("Private: pain flags");
    // He turns sharing on: the flag reaches the coach at once, with the reason.
    await sim(page, (d) => {
      d.state.consent.pau["alerts.pain"] = true;
    });
    expect(await screen(page, "coach", "athletes")).toMatch(
      /Mia Keller[^]*?Shared a knee flag, level 6/,
    );
  });

  test("asks the coach for an easy week: a confirm card, never a silent change, and the past stays as it was", async ({
    page,
  }) => {
    await start(page);
    const past = await sim(page, (d) =>
      JSON.stringify(d.state.plan.items.filter((i: any) => i.date < "2026-11-16")),
    );
    const all = await sim(page, (d) => JSON.stringify(d.state.plan.items));
    await screen(page, "athlete", "coach");
    await say(page, "I need an easy week");
    await expect(lastCard(page)).toContainText("Easy week: plan change");
    expect(await sim(page, (d) => JSON.stringify(d.state.plan.items))).toBe(all); // nothing changes before the tap
    await lastCard(page).getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(lastCard(page)).toContainText("Confirmed");
    expect(
      await sim(page, (d) =>
        JSON.stringify(d.state.plan.items.filter((i: any) => i.date < "2026-11-16")),
      ),
    ).toBe(past);
    expect(
      await sim(page, (d) => d.state.plan.items.find((i: any) => i.date === "2026-11-19").title),
    ).toMatch(/easy 30 min/i);
  });

  test('understands the same wish in other words: "make this week easy"', async ({ page }) => {
    await start(page);
    await screen(page, "athlete", "coach");
    for (const words of [
      "make this week easy",
      "can we go a bit lighter this week?",
      "I'm exhausted, take it easy on me",
      "ich bin müde, bitte eine leichte Woche",
    ]) {
      await say(page, words);
      await expect(lastCard(page), words).toContainText("Easy week", { timeout: 1500 });
    }
    // German for a booking and a cancel, with the day.
    await say(page, "buche das Bahntraining am Donnerstag");
    await expect(lastCard(page)).toContainText("Track session, Thu 19 Nov 18:30");
    await lastCard(page).getByRole("button", { name: "Confirm", exact: true }).click();
    await say(page, "bitte Donnerstag absagen");
    await expect(lastCard(page)).toContainText("Cancel this booking?");
    // No dead ends: the past, many at once, and prices each get a plain answer and no card.
    const n = await page.locator(".pcard").count();
    await say(page, "book yesterday's track session");
    await expect(page.locator(".msg.coach").last()).toContainText(
      "Sun 15 Nov is over, so there is nothing to book there.",
    );
    await say(page, "book 50 sessions");
    await expect(page.locator(".msg.coach").last()).toContainText("I book one session at a time");
    await say(page, "How much does the season pass cost?");
    await expect(page.locator(".msg.coach").last()).toContainText(
      /Prices at PAU Trackrunning:[^]*Regular season pass: CHF 400\.00[^]*no fees are added/,
    );
    await say(page, "blorp");
    await expect(page.locator(".msg.coach").last()).toContainText("I didn't get that, sorry.");
    expect(await page.locator(".pcard").count()).toBe(n);
  });

  test("after the week is eased, Path shows the eased sessions in his plan", async ({ page }) => {
    await start(page);
    await screen(page, "athlete", "coach");
    await say(page, "I need an easy week");
    await sim(page, (d) => d.book("pau-track-2026-11-19", "t"));
    const before = await screen(page, "athlete", "path");
    expect(before).toMatch(
      /Mon Track: 4 × 1 km at 10K pace, 2 min jog From Coach Sara · Club session · 18:30/,
    );
    expect(before).toMatch(/Thu Tempo run: 20 min steady From Coach Sara · Booked · 18:30/);
    expect(before).toMatch(/Tue Easy run 40 min @ RPE 4 Your own day/);
    await screen(page, "athlete", "coach");
    await say(page, "I need an easy week");
    await lastCard(page).getByRole("button", { name: "Confirm", exact: true }).click();
    const path = await screen(page, "athlete", "path");
    expect(path).not.toMatch(/Mon Track: 4 × 1 km at 10K pace/);
    // One plan, one name, and it says what was changed and by whom.
    expect(path).toMatch(/YOUR PLAN Base block Coach Sara shared this with the Track group/);
    expect(path).toContain("3 days eased by you");
    expect(path).toMatch(/Mon Easy 30 min @ RPE 3 Eased by you/);
    expect(path).toMatch(/Thu Easy 30 min @ RPE 3 Eased by you/);
    expect(path).toMatch(/Sun Easy 30 min @ RPE 3 Eased by you/);
    expect(path).not.toMatch(/Build block|Sharpen block/);
    // The day itself says what it was, and the booking that went with it is gone.
    await page.locator("#plan-days .row", { hasText: "Thu" }).click();
    await expect(page.locator("#planday-source")).toHaveText(
      "Eased by you. It was: Tempo run: 20 min steady.",
    );
    await page.keyboard.press("Escape");
    expect(await sim(page, (d) => !!d.myBooking("pau-track-2026-11-19"))).toBe(false);
    // Week says the same on Thursday's session, and the coach sees the same on her page.
    await sim(page, (d) => {
      d.state.day = "2026-11-19";
    });
    await screen(page, "athlete", "week");
    await expect(page.locator("#plan-note")).toHaveText(
      "Your plan: Easy 30 min @ RPE 3 (eased by you)",
    );
    await sim(page, (d) => {
      const S = d.state;
      S.role = "coach";
      S.tab.coach = "athletes";
      d.render();
      S.dash.athlete = "mia";
      d.render();
    });
    await expect(page.locator("#plan-from-you")).toContainText("Base block");
    await expect(page.locator("#plan-changes-coach")).toHaveText("3 days eased by Mia");
  });
  test("a change the coach approves lands in the same plan, under the same name", async ({
    page,
  }) => {
    await start(page);
    await screen(page, "coach", "review");
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await screen(page, "athlete", "path");
    await page.getByRole("button", { name: "Review plan" }).click();
    await expect(page.locator(".toast")).toContainText(
      /Coach Sara approved "Sharpen block": \d upcoming days? of your plan changed/,
    );
    const path = await screen(page, "athlete", "path");
    expect(path).toMatch(/YOUR PLAN Base block/);
    expect(path).toMatch(/\d days? changed by Coach Sara/);
    expect(await sim(page, (d) => d.planName())).toBe("Base block");
    // When the coach stops sharing, her own days come back, and the changed days keep their change.
    const own = await sim(page, (d) => {
      d.state.coach.pau.plans.forEach((p: any) => (p.shared = []));
      d.render();
      return d.state.plan.items
        .filter((i: any) => i.date >= "2026-11-16" && i.date <= "2026-11-22")
        .map((i: any) => `${i.title}${i.src ? " (review)" : ""}`);
    });
    expect(own).toContain("Easy run 40 min @ RPE 4");
    expect(own.some((t: string) => t.endsWith("(review)"))).toBe(true);
    expect(await screen(page, "athlete", "path")).toContain(
      "Coach Sara has not shared a plan with the Track group yet. These are your own days.",
    );
  });

  test("turning on pain sharing later also shows the open flag under the coach's Alerts", async ({
    page,
  }) => {
    await start(page);
    await sim(page, (d) => {
      d.state.entries.unshift({
        id: 9001,
        at: new Date(),
        title: "Track session",
        dur: 90,
        rpe: 8,
        pain: true,
        painWhere: "Knee",
        painLevel: 6,
        notes: "",
        comments: [],
      });
      d.state.consent.pau["alerts.pain"] = true;
    });
    expect(await screen(page, "coach", "athletes")).toMatch(
      /Mia Keller[^]*?Shared a knee flag, level 6/,
    );
    expect(await screen(page, "coach", "alerts")).toMatch(/Mia Keller/);
  });
});

test.describe("Athlete Lea: new to PATH", () => {
  test("onboarding: club, goal and what the coach may see; pain stays private unless she turns it on", async ({
    page,
  }) => {
    await start(page);
    await screen(page, "athlete", "me");
    await page.getByRole("button", { name: "Go through the welcome again" }).click();
    const ob = page.locator("#onboarding");
    await expect(ob).toHaveAttribute("data-step", "1");
    await expect(page.locator("nav.tabs")).toBeHidden(); // three questions, nothing else
    // 1. The club.
    await page.getByRole("radio", { name: /Studio Demo/ }).click();
    await expect(page.getByRole("radio", { name: /Studio Demo/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page.getByRole("button", { name: "Next" }).click();
    // 2. The goal: it is needed, a day in the past is refused, and what was typed stays.
    await expect(ob).toHaveAttribute("data-step", "2");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.locator("#ob-error")).toHaveText(
      "Say in a few words what you are training for.",
    );
    await page.locator("#ob-title").fill("Hold a handstand for ten seconds");
    await page.locator("#ob-date").fill("2026-11-01");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.locator("#ob-error")).toContainText("Choose a day that is still to come");
    await expect(page.locator("#ob-title")).toHaveValue("Hold a handstand for ten seconds");
    await page.locator("#ob-date").fill("2027-03-01");
    await page.locator("#ob-why").fill("Because I never could as a kid");
    await page.getByRole("button", { name: "Next" }).click();
    // 3. Sharing: pain is off, and says so. She shares her goal and log, not her plans.
    await expect(ob).toHaveAttribute("data-step", "3");
    await expect(page.getByRole("switch", { name: /Pain flags/ })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await expect(page.locator("#ob-pain")).toHaveText(
      "Pain flags stay with you. No club and no coach sees them unless you turn this on.",
    );
    await expect(page.getByRole("switch", { name: /Name and photo/ })).toBeDisabled();
    await page.getByRole("switch", { name: /Coach reviews your plans/ }).click();
    // Back keeps everything.
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.locator("#ob-title")).toHaveValue("Hold a handstand for ten seconds");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("switch", { name: /Coach reviews your plans/ })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.locator(".toast")).toContainText(
      "Welcome to Studio Demo. Your path starts here.",
    );
    await expect(page.locator("nav.tabs")).toBeVisible();
    // Path has her goal; the studio's consent is what she chose; PAU's is untouched.
    const path = await screen(page, "athlete", "path", "studio");
    expect(path).toContain(
      "YOUR GOAL Hold a handstand for ten seconds By 1 March 2027. Because I never could as a kid",
    );
    const c = await sim(page, (d) => [
      d.state.consent.studio,
      d.state.consent.pau["plan.write"],
      d.state.org,
    ]);
    expect(c[0]).toEqual({
      "profile.basic": true,
      "path.read": true,
      "log.read": true,
      "log.comment": true,
      "plan.write": false,
      "alerts.pain": false,
    });
    expect(c.slice(1)).toEqual([true, "studio"]);
    // Her coach at the studio now sees the goal and the log, and nothing of a pain flag she logs.
    await sim(page, (d) => {
      d.state.entries.unshift({
        id: 9100,
        at: new Date(),
        title: "Yoga flow",
        dur: 60,
        rpe: 4,
        pain: true,
        painWhere: "Shoulder or arm",
        painLevel: 5,
        notes: "",
        comments: [],
      });
    });
    await sim(page, (d) => {
      const S = d.state;
      S.role = "coach";
      S.org = "studio";
      S.tab.coach = "athletes";
      d.render();
      S.dash.athlete = "mia";
      d.render();
    });
    const detail = (await page.locator("#athlete-detail").innerText()).replace(/\s+/g, " ");
    expect(detail).toContain("Hold a handstand for ten seconds");
    expect(detail).toContain("Yoga flow");
    expect(detail).not.toMatch(/shoulder|pain 5/i);
    expect(await screen(page, "coach", "review", "studio")).toContain(
      "has not allowed coaches at this club to review plans",
    );
    expect(await screen(page, "coach", "alerts", "studio")).not.toMatch(/Shoulder/);
  });
  test("leaving the welcome changes nothing, and the phone's Back goes one question back", async ({
    page,
  }) => {
    await start(page);
    const before = await sim(page, (d) =>
      JSON.stringify([d.state.goal, d.state.consent, d.state.org]),
    );
    await screen(page, "athlete", "me");
    await page.getByRole("button", { name: "Go through the welcome again" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.locator("#ob-title").fill("Something else");
    await page.goBack();
    await expect(page.locator("#onboarding")).toHaveAttribute("data-step", "1");
    await page.getByRole("button", { name: "Not now" }).click();
    await expect(page.locator("#onboarding")).toHaveCount(0);
    expect(
      await sim(page, (d) => JSON.stringify([d.state.goal, d.state.consent, d.state.org])),
    ).toBe(before);
  });
  test("she changes her goal from Me: Path follows, her progress stays, and her coach sees it only if she shares it", async ({
    page,
  }) => {
    await start(page);
    await screen(page, "athlete", "me");
    await expect(page.locator("#goal-title")).toHaveText("Sub‑40 10K");
    const stage = await sim(page, (d) => [
      d.state.stage,
      d.state.stageSessions,
      d.state.entries.length,
    ]);
    await page.getByRole("button", { name: "Change goal" }).click();
    const sheet = page.getByRole("dialog", { name: "Change your goal" });
    await sheet.locator("#g-title").fill("");
    await sheet.getByRole("button", { name: "Save goal" }).click();
    await expect(page.locator("#goal-error")).toHaveText(
      "Say in a few words what you are training for.",
    );
    await sheet.locator("#g-title").fill("Half marathon in <b>April</b>");
    await sheet.locator("#g-date").fill("2027-04-18");
    await sheet.locator("#g-why").fill("");
    await sheet.getByRole("button", { name: "Save goal" }).click();
    await expect(page.locator(".toast")).toContainText(
      'Your goal is now "Half marathon in <b>April</b>".',
    );
    await expect(page.locator("#goal-date")).toHaveText("By 18 April 2027.");
    expect(await page.locator("#view b").count()).toBe(0); // shown as text
    expect(await screen(page, "athlete", "path")).toContain(
      "YOUR GOAL Half marathon in <b>April</b> By 18 April 2027.",
    );
    expect(
      await sim(page, (d) => [d.state.stage, d.state.stageSessions, d.state.entries.length]),
    ).toEqual(stage);
    // No date is fine too.
    await screen(page, "athlete", "me");
    await page.getByRole("button", { name: "Change goal" }).click();
    await sheet.locator("#g-date").fill("");
    await sheet.getByRole("button", { name: "Save goal" }).click();
    await expect(page.locator("#goal-date")).toHaveText("No date set.");
    // The coach at PAU sees it (she shares her goal there); at the studio she does not share it.
    expect(await screen(page, "coach", "athletes", "pau")).toMatch(
      /Mia Keller Half marathon in <b>April<\/b>/,
    );
    expect(await screen(page, "coach", "athletes", "studio")).toMatch(/Mia Keller Goal not shared/);
  });

  test("explores, puts her name down for a free taster at another club, and finds it in Week and in the chat", async ({
    page,
  }) => {
    await start(page);
    const offer = await sim(page, (d) => {
      const o = d
        .openOffers()
        .filter((x: any) => !x.price)
        .sort((a: any, b: any) => d.offerStart(a) - d.offerStart(b))[0];
      const r = d.signUp(o.id, "lea-1");
      const again = d.signUp(o.id, "lea-1");
      return {
        id: o.id,
        title: o.title,
        club: o.club,
        ok: r.ok,
        same: again.msg === r.msg,
        n: d.state.signups.length,
      };
    });
    expect(offer).toMatchObject({ ok: true, same: true, n: 1 }); // the same tap twice signs her up once
    expect(await screen(page, "athlete", "explore")).toContain(`YOUR LIST · 1`);
    expect(await screen(page, "athlete", "week")).toContain(offer.title);
    await screen(page, "athlete", "coach");
    await say(page, "What's on this week?");
    await expect(page.locator(".msg").last()).toContainText(offer.club);
  });

  test("switches clubs: nothing from PAU shows at Studio Demo, and nothing from the studio at PAU", async ({
    page,
  }) => {
    await start(page);
    const studio = {
      week: await screen(page, "athlete", "week", "studio"),
      me: await screen(page, "athlete", "me", "studio"),
      chat: await screen(page, "athlete", "coach", "studio"),
    };
    expect(studio.week).not.toMatch(
      /Track session|Gym session|Sportanlage|Coach Sara|Drop-in season pass/,
    );
    expect(studio.me).toMatch(/YOUR PASS AT STUDIO DEMO 10 classes/);
    expect(studio.me).not.toMatch(/Drop-in season pass|PAU-2026|Thursday track/);
    expect(studio.chat).toMatch(/Scripted demo coach at Studio Demo/);
    expect(studio.chat).not.toMatch(/Drop-in season pass|PAU Trackrunning/);
    const pau = {
      week: await screen(page, "athlete", "week", "pau"),
      me: await screen(page, "athlete", "me", "pau"),
    };
    expect(pau.week).not.toMatch(/HIIT|Yoga flow|Studio One|10 classes/);
    expect(pau.me).not.toMatch(/10 classes|credits left/);
  });
});

test.describe("Athlete Mia: a member of both clubs", () => {
  test("each club keeps its own bookings, pass, sharing and coach memory; her path is one", async ({
    page,
  }) => {
    await start(page);
    const r = await sim(page, (d) => {
      const S = d.state;
      d.book("pau-track-2026-11-19", "sheet");
      d.book("studio-hiit-2026-11-18", "sheet");
      S.consent.pau["log.read"] = false; // she closes her log at PAU only
      return {
        pau: d.passState(d.passOf("pau")).text,
        studio: d.passState(d.passOf("studio")).text,
        studioLog: S.consent.studio["log.read"],
        memPau: d.memoryFor("pau").map((m: any) => m.org || "pau"),
        memStudio: d.memoryFor("studio").length,
      };
    });
    expect(r.pau).toBe("4 of 4 used in November");
    expect(r.studio).toBe("5 credits left");
    expect(r.studioLog).toBe(false);
    const pathAtPau = (await screen(page, "athlete", "path", "pau")).replace(/\s+/g, " ");
    const pathAtStudio = (await screen(page, "athlete", "path", "studio")).replace(/\s+/g, " ");
    expect(pathAtStudio.slice(0, 120)).toBe(pathAtPau.slice(0, 120)); // same goal, same stage
    // The studio's coach sees a name and her attendance, nothing else.
    await sim(page, (d) => {
      const S = d.state;
      S.role = "coach";
      S.org = "studio";
      S.tab.coach = "athletes";
      S.dash.athlete = "mia";
      d.render();
    });
    await expect(page.locator("#athlete-detail")).toContainText(
      "Goal and progress are not shared.",
    );
    await expect(page.locator("#athlete-detail")).not.toContainText(/Sub.40|Long run|RPE/);
  });

  test("a coach's own notes and plans stay in the club they were written in", async ({ page }) => {
    await start(page);
    await sim(page, (d) => {
      const S = d.state;
      S.role = "coach";
      S.org = "pau";
      S.tab.coach = "athletes";
      d.render();
      S.dash.athlete = "mia";
      d.render();
    });
    await page.locator("#cnote").fill("Starts too fast (PAU note)");
    await page.getByRole("button", { name: "Save note" }).click();
    await expect(page.locator("#athlete-detail")).toContainText("Track group");
    const plans = await screen(page, "coach", "plans", "studio");
    expect(plans).not.toContain("Base block");
    expect(plans).not.toContain("Race week taper");
    await sim(page, (d) => {
      const S = d.state;
      S.tab.coach = "athletes";
      S.dash.athlete = "mia";
      d.render();
    });
    await expect(page.locator("#cnote")).toHaveValue("");
    await expect(page.locator("#athlete-detail")).not.toContainText("Track group");
    await expect(page.locator("#athlete-detail")).toContainText("Yoga group");
    // The other club's coach is a different person, and the note is still there back at PAU.
    expect(await screen(page, "coach", "today", "studio")).toMatch(/^NOOR · STUDIO DEMO/i);
    await sim(page, (d) => {
      const S = d.state;
      S.org = "pau";
      S.tab.coach = "athletes";
      S.dash.athlete = "mia";
      d.render();
    });
    await expect(page.locator("#cnote")).toHaveValue("Starts too fast (PAU note)");
  });
  test("alarming symptoms get one clear answer: stop, get medical help; no plan, no guess", async ({
    page,
  }) => {
    await start(page);
    await screen(page, "athlete", "coach");
    for (const words of [
      "I feel dizzy and my chest hurts",
      "i can't breathe properly after the intervals",
      "mir ist schwindlig und ich habe Brustschmerzen",
    ]) {
      const cardsBefore = await page.locator(".pcard").count();
      await say(page, words);
      const reply = page.locator(".msg.coach").last();
      await expect(reply).toContainText("Stop training now");
      await expect(reply).toContainText("144");
      await expect(reply).toContainText("I can't tell you what it is");
      await expect(reply).not.toContainText(/easy|rest day|walk|probably|might be|sounds like/i);
      expect(await page.locator(".pcard").count(), "no plan change is offered").toBe(cardsBefore);
    }
    // Nothing was changed, and with sharing off nobody was told.
    expect(await sim(page, (d) => d.state.alerts.length)).toBe(0);
    expect(await sim(page, (d) => d.state.form.pain)).toBe(false);
  });
});

test.describe("Coach Sara: a training day", () => {
  test("the Today briefing says what the data says", async ({ page }) => {
    await start(page);
    const facts = await sim(page, (d) => {
      const T = new Date(),
        today = d.sessList("pau").filter((s: any) => s.start.toDateString() === T.toDateString());
      return {
        n: today.length,
        booked: today.reduce((n: number, s: any) => n + s.others + (d.myBooking(s.id) ? 1 : 0), 0),
        needs: d.athletes().filter((a: any) => d.statusOf(a).level === 2).length,
      };
    });
    const text = await screen(page, "coach", "today");
    expect(text).toContain(`${facts.n} session today, ${facts.booked} booked.`);
    expect(text.toLowerCase()).toContain(`who needs what · 5 of ${facts.needs}`);
  });

  test("check-in during the session: present, late, no-show and a walk-in, and the athlete's side follows", async ({
    page,
  }) => {
    await start(page);
    const sid = "pau-track-2026-11-16";
    await sim(
      page,
      (d, sid) => {
        d.book(sid, "sheet");
      },
      sid,
    );
    await clock(page, ZURICH("2026-11-16T18:40"));
    const r = await sim(
      page,
      (d, sid) => {
        const S = d.state,
          names = d.rosterNames(S.sessions[sid]).booked;
        d.markAttendance(sid, names[0], "present");
        d.markAttendance(sid, names[1], "late");
        d.markAttendance(sid, names[2], "absent");
        d.markAttendance(sid, S.me.name, "late");
        const walk = d.addWalkin(sid, "  Nadia   Okafor "),
          dup = d.addWalkin(sid, "nadia okafor"),
          empty = d.addWalkin(sid, "   ");
        return {
          marks: [
            S.attendance[sid][names[0]],
            S.attendance[sid][names[1]],
            S.attendance[sid][names[2]],
          ],
          mine: d.myBooking(sid).status,
          walk: walk.msg,
          dup: dup.code,
          empty: empty.code,
          rows: d.rosterRows(S.sessions[sid]).length,
        };
      },
      sid,
    );
    expect(r.marks).toEqual(["present", "late", "absent"]);
    expect(r.mine).toBe("attended"); // late still counts as there
    expect(r.walk).toBe("Nadia Okafor added as a walk-in and marked present.");
    expect(r).toMatchObject({ dup: "DUPLICATE", empty: "EMPTY", rows: 26 });
    // After the session the athlete is asked how it went.
    await clock(page, ZURICH("2026-11-16T20:30"));
    expect(await screen(page, "athlete", "path")).toMatch(
      /NEXT STEP How did it go\? Track session, Mon 16 Nov 18:30/,
    );
    // A no-show: the booking is kept as missed and still counts on the pass.
    const miss = await sim(
      page,
      (d, sid) => {
        d.markAttendance(sid, d.state.me.name, "absent");
        return {
          status: d.state.bookings.find((b: any) => b.sid === sid).status,
          pass: d.passState(d.passOf("pau")).text,
        };
      },
      sid,
    );
    expect(miss).toEqual({ status: "no_show", pass: "4 of 4 used in November" });
  });
  test("live session: who needs what is on the roster, a note per athlete stays with the coach, and the recap is drafted, approved, then sent", async ({
    page,
  }) => {
    await start(page);
    await sim(page, (d) => d.book("pau-track-2026-11-16", "t"));
    await clock(page, ZURICH("2026-11-16T18:40"));
    await screen(page, "coach", "today");
    await page.locator("[data-today]").getByRole("button", { name: "Check in" }).click();
    await expect(page.locator("#coach-roster")).toHaveAttribute("data-live", "true");
    await expect(page.locator("#live-plan")).toHaveText(
      "Plan: Track: 4 × 1 km at 10K pace, 2 min jog",
    );
    await expect(page.locator("#live-count")).toHaveText(/^0 of \d+ checked in$/);
    // Who needs what, from what they share. Someone who keeps pain private shows nothing of it here.
    const lea = page.locator('#roster [data-row="Lea Brunner"]');
    if (await lea.count())
      await expect(lea.locator("[data-need]")).toContainText(
        "Back after 2 weeks off. A short, easy first session back",
      );
    expect(await page.locator("#roster").innerText()).not.toMatch(/calf or shin/i);
    // No recap before anyone is checked in.
    await expect(page.locator("#recap-entry")).toContainText("Check people in first.");
    await page.getByRole("button", { name: "Mark all present" }).click();
    const n = await sim(page, (d) => d.rosterRows(d.state.sessions["pau-track-2026-11-16"]).length);
    await page
      .locator('#roster [data-row="Mia Keller"]')
      .getByRole("button", { name: "Mia Keller: late" })
      .click();
    await page
      .locator("#roster .row")
      .first()
      .getByRole("button", { name: /: absent$/ })
      .click();
    await expect(page.locator("#live-count")).toHaveText(`${n - 1} of ${n} checked in`);
    // A note on one athlete: one line, saved, only the coach's.
    const mia = page.locator('#roster [data-row="Mia Keller"]');
    await mia.getByRole("button", { name: "Add a note on Mia Keller" }).click();
    await page.locator("#snote").fill("Went out too fast on rep 1, held 3 and 4 well");
    await page.locator("#snote").press("Enter");
    await expect(page.locator(".toast")).toContainText("Note saved. Only you can see it.");
    await expect(mia.locator("[data-note]")).toHaveText(
      "Note: Went out too fast on rep 1, held 3 and 4 well",
    );
    // The recap: drafted from who came and what was planned; it names nobody and repeats no note.
    await page.getByRole("button", { name: "Draft the group recap" }).click();
    await expect(page.locator("#coach-recap h1")).toHaveText(`${n - 1} came, 1 missed it`);
    const draft = await page.locator("#recap-text").inputValue();
    expect(draft).toContain(`Track session, Mon 16 Nov: thank you, all ${n - 1} of you.`);
    expect(draft).toContain("We did track: 4 × 1 km at 10K pace, 2 min jog.");
    expect(draft).toContain("log how it felt");
    expect(draft).not.toMatch(/Mia|Lea|Jonas|too fast|knee|pain/);
    expect(await sim(page, (d) => d.state.outbox.length)).toBe(0);
    // "Not now" sends nothing. Then the coach changes a word and approves.
    await page.getByRole("button", { name: "Not now" }).click();
    expect(await sim(page, (d) => d.state.outbox.length)).toBe(0);
    await page.getByRole("button", { name: "Draft the group recap" }).click();
    await page
      .locator("#recap-text")
      .fill(draft.replace("Good work.", "Strong session, everyone."));
    await page.getByRole("button", { name: `Approve and send to ${n - 1}` }).click();
    await expect(page.locator(".toast")).toContainText(`Recap sent to the ${n - 1} who came.`);
    await expect(page.locator("#recap-sent")).toContainText(`Recap sent to the ${n - 1} who came`);
    await expect(page.getByRole("button", { name: "Draft the group recap" })).toHaveCount(0);
    expect(await sim(page, (d) => d.state.outbox.map((x: any) => x.kind))).toEqual(["recap"]);
    // The athlete: the recap is in her chat with the coach's words, the note is nowhere, and she is asked to log.
    await clock(page, ZURICH("2026-11-16T20:30"));
    const chat = await screen(page, "athlete", "coach");
    expect(chat).toContain("From Coach Sara, to everyone who came: Track session, Mon 16 Nov");
    expect(chat).toContain("Strong session, everyone.");
    for (const [role, tab] of [
      ["athlete", "path"],
      ["athlete", "week"],
      ["athlete", "coach"],
      ["athlete", "me"],
      ["athlete", "log"],
    ] as const)
      expect(await screen(page, role, tab), `${tab}`).not.toContain("too fast");
    expect(await screen(page, "athlete", "path")).toContain("How did it go?");
    // The coach finds the note again on her page; the other club's coach does not.
    const open = async (org: string) => {
      await sim(
        page,
        (d, org) => {
          const S = d.state;
          S.role = "coach";
          S.org = org;
          S.tab.coach = "athletes";
          S.rosterSid = null;
          d.render();
          S.dash.athlete = "mia";
          d.render();
        },
        org,
      );
      return (await page.locator("#athlete-detail").innerText()).replace(/\s+/g, " ");
    };
    expect(await open("pau")).toMatch(
      /YOUR NOTES FROM SESSIONS Went out too fast on rep 1, held 3 and 4 well Track session, Mon 16 Nov/,
    );
    expect(await open("studio")).not.toContain("too fast");
  });
  test("plan changes: approve reaches the athlete with the coach's name; reject reaches nobody", async ({
    page,
  }) => {
    await start(page);
    await screen(page, "coach", "review");
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    expect(await screen(page, "athlete", "path")).toMatch(
      /Your coach approved your plan Sharpen block · approved by Coach Sara/,
    );
    await sim(page, (d) => {
      d.resetDemo();
      d.resetDemo();
    });
    await screen(page, "coach", "review");
    await page.getByRole("button", { name: "Reject", exact: true }).click();
    expect(await screen(page, "athlete", "path")).not.toMatch(/approved|Sharpen/);
    expect(await sim(page, (d) => d.state.plan.title)).not.toBe("Sharpen block");
  });
  test("review queue: every proposal waits; edit before approving, approve the low-risk ones together, and the guardrail holds on what the coach types", async ({
    page,
  }) => {
    await start(page);
    const text = await screen(page, "coach", "review");
    const q = await sim(page, (d) =>
      d.reviewItems().map((x: any) => ({ id: x.id, low: x.low, name: x.a.name })),
    );
    expect(q.length).toBeGreaterThan(3);
    expect(text).toContain(
      `${q.length} waiting for you, ${q.filter((x: any) => x.low).length} of them low risk.`,
    );
    expect(text).toContain("Nothing reaches an athlete before you approve it.");
    // Only what is shared: the athlete who keeps a pain flag private has no proposal that mentions it.
    expect(text).not.toMatch(/calf or shin/i);
    // Edit one first: the coach's words are what gets approved.
    const lea = page.locator('[data-review="rv-a0"]');
    await expect(lea).toContainText("low risk: only reduces load");
    await lea.getByRole("button", { name: "Edit the change for Lea Brunner" }).click();
    await lea.locator("[data-line]").fill("");
    await lea.getByRole("button", { name: "Approve as edited" }).click();
    await expect(page.locator("#rv-error")).toContainText("A day can't be left empty.");
    await lea.locator("[data-line]").fill("15 min easy jog with me before the group starts");
    await lea.getByRole("button", { name: "Approve as edited" }).click();
    await expect(page.locator(".toast")).toContainText(
      "Approved with your changes. Lea now sees it as the next step.",
    );
    await expect(page.locator("#review-done")).toContainText(
      "Approved Mon 16 Nov, with your changes. Lea sees it as the next step.",
    );
    // The one that is not a pure reduction is marked, and is not part of "approve together".
    const swap = page.locator('[data-review][data-low="false"]');
    await expect(swap).toHaveCount(1);
    await expect(swap).toContainText("needs a look");
    await expect(swap).toContainText('Asked: "Can I swap Thursday for Saturday this week?"');
    const lowLeft = q.filter((x: any) => x.low).length - 1;
    await page.getByRole("button", { name: `Approve the ${lowLeft} low-risk changes` }).click();
    await expect(page.locator(".toast")).toContainText(`${lowLeft} low-risk changes approved.`);
    await expect(page.locator("[data-review]")).toHaveCount(1);
    await expect(page.locator("#review-answer")).toContainText(
      "1 waiting for you, 0 of them low risk.",
    );
    // Mia's was low risk (the guardrail had already reduced it), so it went with them, and she sees it.
    expect(await sim(page, (d) => d.state.draftStatus)).toBe("approved");
    expect(await screen(page, "athlete", "path")).toContain("Your coach approved your plan");
    // Reject the last one: the athlete keeps the plan.
    await screen(page, "coach", "review");
    await swap.getByRole("button", { name: /^Reject the change for/ }).click();
    await expect(page.locator(".toast")).toContainText("keeps the plan as it is.");
    await expect(page.locator("#review-answer")).toContainText("Nothing is waiting.");
  });
  test("editing the playable athlete's draft: an easier day is accepted in the coach's words, a harder one is refused while the guardrail is on", async ({
    page,
  }) => {
    await start(page);
    await screen(page, "coach", "review");
    const card = page.locator("#draft");
    await expect(card).toHaveAttribute("data-guarded", "true");
    await card.getByRole("button", { name: "Edit before approving" }).click();
    const first = card.locator("[data-line]").first();
    await first.fill("Track: 8 × 400 m at 5K pace");
    await card.getByRole("button", { name: "Approve as edited" }).click();
    await expect(page.locator("#rv-error")).toContainText(
      /can only be made easier right now: .*"Track: 8 × 400 m at 5K pace" adds intensity\./,
    );
    expect(await sim(page, (d) => d.state.draftStatus)).toBe("pending_review");
    await expect(first).toHaveValue("Track: 8 × 400 m at 5K pace"); // what was typed is still there
    await first.fill("Easy 25 min, then stretch");
    await card.getByRole("button", { name: "Approve as edited" }).click();
    await expect(page.locator(".toast")).toContainText(
      "Approved with your changes. Mia Keller now sees it as the next step.",
    );
    await screen(page, "athlete", "path");
    await page.getByRole("button", { name: "Review plan" }).click();
    expect(await screen(page, "athlete", "path")).toMatch(
      /Easy 25 min, then stretch Changed by Coach Sara/,
    );
    // Without a guardrail the coach may also make a day harder.
    await sim(page, (d) => {
      d.resetDemo();
      d.state.entries = d.state.entries.filter((e: any) => e.at < new Date(Date.now() - 6 * 864e5));
      d.render();
    });
    await screen(page, "coach", "review");
    await expect(page.locator("#draft")).toHaveAttribute("data-guarded", "false");
    await expect(page.locator("#draft")).toContainText("needs a look");
    await page.locator("#draft").getByRole("button", { name: "Edit before approving" }).click();
    await page.locator("#draft [data-line]").first().fill("Track: 8 × 400 m at 5K pace");
    await page.locator("#draft").getByRole("button", { name: "Approve as edited" }).click();
    await expect(page.locator(".toast")).toContainText("Approved with your changes.");
  });

  test("comments and kudos on a log reach the athlete; five taps on Kudos send it once", async ({
    page,
  }) => {
    await start(page);
    await sim(page, (d) => {
      const S = d.state;
      S.role = "coach";
      S.tab.coach = "athletes";
      d.render();
      S.dash.athlete = "mia";
      d.render();
      for (let i = 0; i < 5; i++)
        (document.querySelector('#detail-logs [data-a="kudos"]') as HTMLElement).click();
    });
    expect(
      await sim(
        page,
        (d) => d.state.entries[0].comments.filter((c: any) => /Kudos/.test(c.text)).length,
      ),
    ).toBe(1);
  });
});

test.describe("PT coach: one-to-one work", () => {
  test("the week shows one-to-one sessions and open slots next to the groups", async ({ page }) => {
    await start(page);
    expect(await screen(page, "coach", "week")).toMatch(
      /6 sessions: 3 groups, 3 one-to-one, 1 open slot/,
    );
  });
  test("sells a PT pack to a client: the sessions are hers at once, the invoice is with the office, and it counts in the month", async ({
    page,
  }) => {
    await start(page);
    const before = await sim(page, (d) => d.ptStats());
    await screen(page, "coach", "athletes");
    await page.locator("#athlete-list .row", { hasText: "Sofia Brunner" }).click();
    await expect(page.locator("#member-pass")).not.toContainText("PT 10-pack");
    await page.getByRole("button", { name: "Sell a PT 10-pack" }).click();
    const fx = page.locator("#pt-sell-effects");
    await expect(fx).toContainText("Sofia gets 10 sessions of 60 minutes, ready to book at once.");
    await expect(fx).toContainText(
      "An invoice for CHF 900.00 goes to Sofia. The office sees it under Money.",
    );
    // "Not now" sells nothing.
    await page.getByRole("button", { name: "Not now" }).click();
    expect(await sim(page, (d) => d.ptStats().sold)).toBe(before.sold);
    await page.getByRole("button", { name: "Sell a PT 10-pack" }).click();
    await page.getByRole("button", { name: "Record the sale" }).click();
    await expect(page.locator(".toast")).toContainText(
      /Sold: PT 10-pack to Sofia Brunner\. 10 sessions are ready to book\. Invoice PAU-2026-00\d\d is with the office\./,
    );
    await expect(page.locator("#member-pass")).toContainText("PT 10-pack, 10 of 10 left");
    // The month's numbers follow, the office sees the invoice and the pack, and it is written down.
    const after = await sim(page, (d) => d.ptStats());
    expect([after.sold, after.soldSum]).toEqual([before.sold + 1, before.soldSum + 900]);
    expect(await screen(page, "coach", "week")).toContain(`Packs sold ${before.sold + 1} · CHF`);
    const money = await screen(page, "admin", "money");
    expect(money).toMatch(
      /CHF 900\.00 · Sofia Brunner PAU-2026-00\d\d · PT 10-pack · due Mon 30 Nov/,
    );
    expect(money).toMatch(/AUDIT LOG Coach Sara sold a PT 10-pack to Sofia Brunner/);
    expect(await screen(page, "admin", "members")).toMatch(
      /Sofia Brunner Active [^]*?PT 10-pack, 10 of 10 left/,
    );
    // The other club has no personal training with this coach, and nothing of this.
    const studio = await screen(page, "coach", "week", "studio");
    expect(studio).not.toMatch(/PERSONAL TRAINING|One-to-one ·/);
    expect(await screen(page, "admin", "money", "studio")).not.toContain("Sofia Brunner");
    // One club's audit log is never shown in the other's.
    await sim(page, (d) => {
      d.state.settings.studio.waitlistMode = "auto";
      d.state.audit.unshift({ org: "studio", what: "Studio-only entry", at: new Date() });
    });
    expect(await screen(page, "admin", "money", "pau")).not.toContain("Studio-only entry");
    expect(await screen(page, "admin", "money", "studio")).toContain("Studio-only entry");
  });
  test("books a client into an open slot, moves her, and cancels: the pack follows every step", async ({
    page,
  }) => {
    await start(page);
    await screen(page, "coach", "week");
    // The open slot is a button now. Only people with sessions left can be booked.
    const open = page.locator('#coach-week [data-kind="open"]');
    await expect(open).toContainText("Book a client");
    await open.click();
    const sheet = page.getByRole("dialog", { name: "Open slot" });
    const who = await sheet.locator("#pt-who option").allInnerTexts();
    expect(who.length).toBeGreaterThan(5);
    for (const w of who) expect(w).toMatch(/ · [1-9]\d? left$/);
    await sheet.locator("#pt-who").selectOption({ label: "Lea Brunner · 6 left" });
    await sheet.getByRole("button", { name: "Book this slot" }).click();
    await expect(page.locator(".toast")).toContainText(
      "Booked: Lea Brunner, Thu 19 Nov 12:15. 5 of 10 left on the pack.",
    );
    await expect(page.locator("#week-answer")).toHaveText("7 sessions: 3 groups, 4 one-to-one");
    const thu = page.locator('[data-day="2026-11-19"] [data-kind="one"]');
    await expect(thu).toContainText("Lea Brunner");
    await expect(thu.locator("[data-pack]")).toHaveText("PT 10-pack: 5 of 10 left");
    // Move her to next week's open slot: the pack is untouched and this week's slot is open again.
    await thu.click();
    await page.getByRole("button", { name: "Move to another time" }).click();
    await page.locator("#pt-move .row", { hasText: "Thu 26 Nov" }).click();
    await expect(page.locator(".toast")).toContainText(
      "Moved: Lea Brunner is now on Thu 26 Nov at 12:15. The pack is untouched",
    );
    await expect(page.locator('[data-day="2026-11-19"] [data-kind="open"]')).toHaveCount(1);
    expect(await sim(page, (d) => d.ptPack(d.roster("pau")[0]).left)).toBe(5);
    // Cancel it: she has the session back.
    await page.getByRole("button", { name: "Next week" }).click();
    await page.locator('[data-day="2026-11-26"] [data-kind="one"]').click();
    await page.getByRole("button", { name: "Cancel this session" }).click();
    await expect(page.locator(".toast")).toContainText(
      "Cancelled. Lea has the session back: 6 of 10 left. The slot is open again.",
    );
    // What can't be done is refused: a slot that is taken, a client with nothing left, a session that is over.
    const r = await sim(page, (d) => {
      const slots = d.ptSlots(new Date(2026, 10, 16)),
        taken = slots.find((x: any) => x.athlete),
        free = slots.find((x: any) => !x.athlete),
        none = d.roster("pau").find((a: any) => d.ptPack(a).left === 0);
      return [
        d.ptBook(taken.id, d.roster("pau")[0].m.id).code,
        d.ptBook(free.id, none.m.id).code,
        d.ptMove(taken.id, taken.id).code,
      ];
    });
    expect(r).toEqual(["TAKEN", "NO_PACK", "TAKEN"]);
    await clock(page, ZURICH("2026-11-17T08:00"));
    await sim(page, (d) => {
      d.state.dash.wk = 0;
    });
    await screen(page, "coach", "week");
    await page.locator('[data-day="2026-11-17"] [data-kind="one"]').click();
    await expect(page.getByRole("dialog")).toContainText(
      "This session is over. It counts as given.",
    );
    await expect(page.getByRole("button", { name: "Cancel this session" })).toHaveCount(0);
  });
  test("sees the month: sessions given, how full the slots are, packs sold, and where the numbers are invented", async ({
    page,
  }) => {
    await start(page);
    await screen(page, "coach", "week");
    const card = page.locator("#pt-card");
    await expect(card).toContainText("PERSONAL TRAINING · NOVEMBER", { ignoreCase: true });
    await expect(page.locator("#pt-given")).toHaveText("6 · CHF 540.00"); // two weeks of three sessions, CHF 90 each
    await expect(page.locator("#pt-fill")).toHaveText("12 of 16 · 75%");
    await expect(page.locator("#pt-sold")).toHaveText("3 · CHF 2'700.00");
    await expect(card).toContainText("Packs sold before today are invented.");
    await expect(card).toContainText("DEMO DATA", { ignoreCase: true });
    // A day later one more session has been given; booking the open slot fills the week.
    await clock(page, ZURICH("2026-11-17T09:00"));
    await screen(page, "coach", "week");
    await expect(page.locator("#pt-given")).toHaveText("7 · CHF 630.00");
    await sim(page, (d) => {
      const open: any = d.ptSlots(new Date(2026, 10, 16)).find((x: any) => !x.athlete);
      d.ptBook(open.id, d.roster("pau")[0].m.id);
      d.render();
    });
    await expect(page.locator("#pt-fill")).toHaveText("12 of 15 · 80%");
  });
});

test.describe("The demo data: one member list per club, the same on every layer", () => {
  test("each club has about 120 members and four coaches, and the two clubs are different people", async ({
    page,
  }) => {
    await start(page);
    const d = await sim(page, (d) => {
      const pau = d.members("pau").map((m: any) => m.name),
        studio = d.members("studio").map((m: any) => m.name);
      return {
        pau: pau.length,
        studio: studio.length,
        unique: new Set([...pau, ...studio]).size,
        coaches: [d.ORGS.pau.coaches.length, d.ORGS.studio.coaches.length],
        offCoaches: ["pau", "studio"].map((o) => [
          ...new Set(d.ORGS[o].offerings.map((x: any) => x.coach)),
        ]),
        teams: ["pau", "studio"].map((o) => d.ORGS[o].coaches.map((c: any) => c[0])),
      };
    });
    expect(d).toMatchObject({ pau: 120, studio: 120, unique: 240, coaches: [4, 4] });
    // Every coach on a session is on the club's coach list.
    (d.offCoaches as string[][]).forEach((list, i) =>
      list.forEach((c) => expect(d.teams[i]).toContain(c)),
    );
    for (const org of ["pau", "studio"] as const) {
      const text = await screen(page, "admin", "members", org);
      expect(text).toMatch(/121 members: \d+ active, \d+ on trial, \d+ paused\./);
      expect(text).toContain("COACHES · 4");
      expect(await page.locator("#member-table tbody tr").count()).toBe(121);
    }
  });
  test("the coach's athletes, every session roster and the waitlists are people from the club's member list", async ({
    page,
  }) => {
    await start(page);
    for (const org of ["pau", "studio"] as const) {
      const r = await sim(
        page,
        (d, org) => {
          const S = d.state;
          S.org = org;
          const all = new Set([S.me.name, ...d.members(org).map((m: any) => m.name)]),
            strangers: string[] = [];
          for (const a of d.athletes()) if (!all.has(a.name)) strangers.push(`athlete ${a.name}`);
          for (const s of d.sessList(org)) {
            const n = d.rosterNames(s);
            for (const name of [...n.booked, ...n.queue])
              if (!all.has(name)) strangers.push(`${s.id}: ${name}`);
            if (n.booked.length !== s.others)
              strangers.push(`${s.id}: ${n.booked.length} names for ${s.others} booked`);
            if (new Set(n.booked).size !== n.booked.length) strangers.push(`${s.id}: a name twice`);
          }
          return { strangers, athletes: d.athletes().length, groups: d.ORGS[org].me.groups };
        },
        org,
      );
      expect(r.strangers, org).toEqual([]);
      expect(r.athletes, org).toBe(org === "pau" ? 49 : 25);
      const text = await screen(page, "coach", "athletes", org);
      expect(text).toContain(
        org === "pau"
          ? "Your groups: Track and Technique, 49 of 121 members."
          : "Your group: Yoga, 25 of 121 members.",
      );
    }
    // Someone on a studio session opens as a person, with what they share, from the coach's session view.
    await sim(page, (d) => {
      const S = d.state;
      S.role = "coach";
      S.org = "studio";
      S.tab.coach = "week";
      d.render();
    });
    await page.locator('#coach-week [data-kind="group"]').first().click();
    await page.locator("#attendees .row:not(:has-text('Mia Keller'))").first().click();
    await expect(page.locator("#athlete-detail")).toBeVisible();
    await expect(page.locator("#member-pass")).toContainText(
      /Monthly 15 classes|10 classes|50 classes|Starter 7 classes|Drop-in/,
    );
  });
  test("invoices: open, overdue and paid at both clubs, each for a member of that club; a member sees only her own", async ({
    page,
  }) => {
    await start(page);
    const r = await sim(page, (d) =>
      ["pau", "studio"].map((org) => {
        const inv = d.state.invoices.filter((i: any) => i.org === org),
          names = new Set(["Mia Keller", ...d.members(org).map((m: any) => m.name)]);
        return {
          open: inv.filter((i: any) => i.status === "open" && i.due >= new Date()).length,
          overdue: inv.filter((i: any) => i.status === "open" && i.due < new Date()).length,
          paid: inv.filter((i: any) => i.status === "paid").length,
          strangers: inv.filter((i: any) => !names.has(i.member)).length,
        };
      }),
    );
    expect(r).toEqual([
      { open: 4, overdue: 3, paid: 3, strangers: 0 },
      { open: 2, overdue: 2, paid: 2, strangers: 0 },
    ]);
    const money = await screen(page, "admin", "money");
    expect(money).toMatch(/7 open, 3 of them overdue \(CHF [\d’',.]+\), 3 paid\./);
    expect(money).toMatch(/overdue by 31 days/);
    // Overdue first.
    expect(await page.locator("#invoice-list .row").first().innerText()).toContain("overdue");
    const me = await screen(page, "athlete", "me");
    expect(
      me.match(/CHF /g)!.length,
      "Mia sees her one invoice and the pack price, not the club's",
    ).toBeLessThan(4);
    expect(me).not.toMatch(/overdue|Brunner|Meier|Huber/);
    expect(await sim(page, (d) => d.nextStep().kind)).not.toBe("pay");
  });
  test("personal training is in use, and PAU sells a 10-session pack that books when the season pass is used up", async ({
    page,
  }) => {
    await start(page);
    expect(await sim(page, (d) => d.members("pau").filter((m: any) => m.pt).length)).toBe(10);
    expect(await screen(page, "coach", "week")).toMatch(
      /One-to-one · 60 min[^]*?PT 10-pack: \d+ of 10 left/,
    );
    expect(await screen(page, "admin", "members")).toMatch(/PT 10-pack, \d+ of 10 left/);
    expect(await screen(page, "admin", "products")).toContain("10-session pack");
    // Mia's drop-in pass is at 3 of 4. One more uses it up; the pack takes over after that.
    await screen(page, "athlete", "me");
    await page.getByRole("button", { name: "Buy 10-session pack · CHF 230.00" }).click();
    await page.getByRole("button", { name: "Pay with TWINT" }).click();
    await expect(page.locator("#pack")).toContainText("10-session pack: 10 credits left.");
    const r = await sim(page, (d) => {
      const a = d.book("pau-track-2026-11-19", "t"),
        b = d.book("pau-gym-2026-11-20", "t");
      return {
        a: a.status,
        b: b.status,
        season: d.passState(d.passOf("pau")).text,
        pack: d.passState(d.packOf("pau")).text,
        usedPack: d.state.bookings.find((x: any) => x.id === b.bid).pass,
      };
    });
    expect(r).toEqual({
      a: "confirmed",
      b: "confirmed",
      season: "4 of 4 used in November",
      pack: "9 credits left",
      usedPack: "k-pau",
    });
    // Cancelling gives the pack credit back.
    expect(
      await sim(page, (d) => {
        d.cancel(d.myBooking("pau-gym-2026-11-20").id);
        return d.passState(d.packOf("pau")).text;
      }),
    ).toBe("10 credits left");
  });
});

test.describe("Admin: running the club", () => {
  test("changes the waitlist rule, and the engine follows it", async ({ page }) => {
    await start(page);
    const r = await sim(page, (d) => {
      const S = d.state,
        sid = "pau-gym-2026-11-24",
        s = S.sessions[sid];
      S.settings.pau.waitlistMode = "offer";
      const pass = d.passOf("pau");
      pass.kind = "unlimited"; // so the pass is not what is being tested
      d.book(sid, "sheet");
      d.freeSpot(sid);
      const second = d.freeSpot(sid);
      return { second, held: s.held, booked: !!d.myBooking(sid), rules: null };
    });
    expect(r.second).toContain("It is held for Mia Keller until 14:00");
    expect(r).toMatchObject({ held: 1, booked: false });
    expect(await screen(page, "admin", "dash")).toMatch(
      /Waitlist: a freed spot is held for the next person for 2 h/,
    );
  });
  test("marks an invoice paid: the member sees it, the club's numbers follow, and it is written down", async ({
    page,
  }) => {
    await start(page);
    await screen(page, "admin", "money");
    expect(await screen(page, "admin", "dash")).toMatch(/Open invoices 7, 3 overdue/);
    await screen(page, "admin", "money");
    await page.getByRole("button", { name: "Mark paid: CHF 300.00, Mia Keller" }).click();
    expect(await screen(page, "athlete", "me")).toMatch(/INVOICES CHF 300.00 [^]*? Paid/);
    expect(await screen(page, "admin", "dash")).toMatch(/Open invoices 6, 3 overdue/);
    expect(await screen(page, "admin", "money")).toMatch(
      /AUDIT LOG [^]*(paid|Paid)[^]*Mia Keller|AUDIT LOG [^]*PAU-2026-0042/,
    );
  });
  test("frees a spot on the schedule and the waitlist moves", async ({ page }) => {
    await start(page);
    await screen(page, "admin", "sched");
    await page
      .locator("tr", { hasText: "Wed 18 Nov" })
      .getByRole("button", { name: /Free a spot/ })
      .click();
    await expect(page.locator(".toast")).toContainText("went to the next person on the waitlist");
    await expect(page.locator("tr", { hasText: "Wed 18 Nov" })).toContainText("20 / 20");
  });
  test("reads club health: one sentence, the numbers against last month, and what needs the admin", async ({
    page,
  }) => {
    await start(page);
    for (const org of ["pau", "studio"] as const) {
      const home = await screen(page, "admin", "dash", org),
        c = await sim(
          page,
          (d, org) => {
            const c = d.clubStats(org);
            return {
              active: c.active,
              visits: c.visits,
              od: c.od.length,
              todo: c.todo,
              quiet: c.quiet.length,
              pct: c.visitsPct,
              delta: c.activeDelta,
            };
          },
          org,
        );
      // The sentence says what the numbers say.
      const health = await page.locator("#health").innerText();
      expect(health).toContain(`${c.active} active members`);
      expect(health).toContain(`${c.visits} visits so far in November`);
      expect(health).toContain(`${c.od} invoices are overdue`);
      expect(health).toContain(`${c.todo} members are drifting away`);
      expect(health).toMatch(
        c.delta >= 0 && c.pct >= 0
          ? /doing well/
          : c.delta < 0 && c.pct < 0
            ? /slipping/
            : /holding steady/,
      );
      // Four numbers, each against last month, and the demo data is labelled.
      expect(await page.locator("#health-tiles [data-tile]").count()).toBe(4);
      for (const t of await page.locator("#health-tiles .delta").allInnerTexts())
        expect(t).toMatch(/October|same days/);
      expect(home).toContain("DEMO DATA");
      expect(home).toMatch(
        new RegExp(`NEEDS YOU · ${[c.todo, c.od, c.quiet].filter(Boolean).length}`),
      );
    }
    // The two clubs do not tell the same story, and neither shows the other's numbers.
    const a = await sim(page, (d) => [d.clubSentence("pau"), d.clubSentence("studio")]);
    expect(a[0]).not.toBe(a[1]);
    expect(a[0]).not.toContain("Studio Demo");
    // "Needs you" leads to the place where it is dealt with.
    await screen(page, "admin", "dash", "pau");
    await page.locator("#admin-needs .row", { hasText: "drifting away" }).click();
    await expect(page.locator("#at-risk")).toBeVisible();
  });
  test("a member who is drifting away: the reason comes from bookings only, PATH drafts, and nothing is sent until the admin approves", async ({
    page,
  }) => {
    await start(page);
    const text = await screen(page, "admin", "members");
    expect(text).toContain(
      "From bookings and check-ins only. PATH never reads a training log for this.",
    );
    expect(text).not.toMatch(/RPE|pain|knee|load|Sub-\d/i);
    const first = page.locator("#at-risk .row").first(),
      name = await first.locator(".strong").innerText();
    await expect(first).toContainText(
      /No visit in \d+ days|Came \d times in October, once so far in November/,
    );
    await expect(first).toContainText("Message drafted");
    await first.click();
    const sheet = page.getByRole("dialog", { name: `Message to ${name}` });
    await expect(sheet.locator("#msg-text")).toHaveValue(
      new RegExp(`^Hi ${name.split(" ")[0]}, we haven't seen you`),
    );
    await expect(sheet).toContainText("Nothing is sent until you approve it.");
    expect(await sim(page, (d) => d.state.outbox.length)).toBe(0);
    // "Not now" sends nothing.
    await sheet.getByRole("button", { name: "Not now" }).click();
    expect(await sim(page, (d) => d.state.outbox.length)).toBe(0);
    // The admin changes the words; exactly those words are sent, once.
    await first.click();
    await sheet
      .locator("#msg-text")
      .fill(`Hi ${name.split(" ")[0]}, coffee after track on Thursday? No pressure.`);
    await sheet.getByRole("button", { name: "Approve and send" }).click();
    await expect(page.locator(".toast")).toContainText(
      `Sent to ${name}. Demo: no real message leaves PATH.`,
    );
    const out = await sim(page, (d) => d.state.outbox);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      org: "pau",
      to: name,
      kind: "checkin",
      text: `Hi ${name.split(" ")[0]}, coffee after track on Thursday? No pressure.`,
    });
    await expect(page.locator("#at-risk .row", { hasText: name })).toContainText("Sent Mon 16 Nov");
    await page.locator("#at-risk .row", { hasText: name }).click();
    await expect(page.locator("#msg-sent")).toContainText("approved by you");
    await expect(page.getByRole("button", { name: "Approve and send" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    // An empty message is not sent. The other club knows nothing of any of this.
    await page.locator("#at-risk .row").nth(1).click();
    await page.locator("#msg-text").fill("   ");
    await page.getByRole("button", { name: "Approve and send" }).click();
    await expect(page.getByRole("dialog")).toContainText("Write the message first.");
    expect(await sim(page, (d) => d.state.outbox.length)).toBe(1);
    await page.keyboard.press("Escape");
    expect(await screen(page, "admin", "money")).toMatch(
      new RegExp(`AUDIT LOG Message to ${name}, approved by the admin`),
    );
    const studio = await screen(page, "admin", "members", "studio");
    expect(studio).not.toContain(name);
    expect(studio).not.toMatch(/Sent Mon 16 Nov/);
    expect(await sim(page, (d) => d.clubStats("pau").todo)).toBe(
      (await sim(page, (d) => d.atRisk("pau").length)) - 1,
    );
  });
  test("sends payment reminders for overdue invoices: drafted, readable, changeable, approved, written down", async ({
    page,
  }) => {
    await start(page);
    await screen(page, "admin", "money");
    // One at a time, from the invoice.
    const row = page.locator("#invoice-list .row").first();
    await expect(row).toContainText("overdue by 31 days");
    await row.getByRole("button", { name: /^Remind/ }).click();
    await expect(page.locator("#msg-text")).toHaveValue(
      /a friendly reminder: invoice PAU-2026-0048 .* was due on Fri 16 Oct/,
    );
    await page.getByRole("button", { name: "Approve and send" }).click();
    await expect(row).toContainText("Reminder sent Mon 16 Nov");
    await expect(row.getByRole("button", { name: /^See the reminder/ })).toBeVisible();
    // The rest together: every draft is on the screen; one is changed, one is held back.
    await page.getByRole("button", { name: "Review 2 drafted reminders" }).click();
    await expect(page.locator("#admin-reminders h1")).toHaveText("2 drafted, none sent");
    const cards = page.locator("[data-remind]");
    await expect(cards).toHaveCount(2);
    await cards
      .nth(0)
      .locator("textarea")
      .fill("Short note: the October invoice is still open. Thanks!");
    await cards.nth(1).getByRole("switch").click();
    await expect(cards.nth(0).locator("textarea")).toHaveValue(
      "Short note: the October invoice is still open. Thanks!",
    );
    await page.getByRole("button", { name: "Approve and send 1 reminder" }).click();
    await expect(page.locator(".toast")).toContainText("1 reminder sent, each as you approved it.");
    const out = await sim(page, (d) =>
      d.state.outbox.map((x: any) => [x.kind, x.text.slice(0, 22), !!x.ref]),
    );
    expect(out).toEqual([
      ["reminder", "Hi Jonas, a friendly r", true],
      ["reminder", "Short note: the Octobe", true],
    ]);
    await expect(page.getByRole("button", { name: "Review 1 drafted reminder" })).toBeVisible();
    expect(await screen(page, "admin", "money")).toMatch(
      /AUDIT LOG Payment reminder to .+?, approved by the admin \(PAU-2026-00\d\d\)/,
    );
    // Open invoices that are not overdue have no reminder; paid ones neither.
    expect(await page.locator('#invoice-list [data-a="adm-sheet"]').count()).toBe(3);
    // A reminder to the member you play reaches her chat.
    await clock(page, ZURICH("2026-12-01T09:00"));
    await screen(page, "admin", "money");
    await page.getByRole("button", { name: "Remind: CHF 300.00, Mia Keller" }).click();
    await page.getByRole("button", { name: "Approve and send" }).click();
    expect(await screen(page, "athlete", "coach")).toContain(
      "From PAU Trackrunning: Hi Mia, a friendly reminder: invoice PAU-2026-0042",
    );
  });
  test("edits the schedule: one session, every later one, a new one; booked members are told when the time moves", async ({
    page,
  }) => {
    await start(page);
    await sim(page, (d) => d.book("pau-track-2026-11-19", "t"));
    await screen(page, "admin", "sched");
    await page.locator('[data-v="asess|pau-track-2026-11-19"]').click();
    const sheet = page.getByRole("dialog", { name: "Track session" });
    // Capacity can't go below who is booked.
    await sheet.locator("#e-cap").fill("5");
    await sheet.getByRole("button", { name: "Save changes" }).click();
    await expect(page.locator("#sess-error")).toContainText(
      /already has \d+ booked\. Capacity can't go below that\./,
    );
    // Move it, make it bigger, give it to another coach.
    await sheet.locator("#e-cap").fill("32");
    await sheet.locator("#e-time").fill("19:00");
    await sheet.locator("#e-coach").selectOption("Coach Nina");
    await sheet.getByRole("button", { name: "Save changes" }).click();
    await expect(page.locator(".toast")).toContainText(
      /Saved\. \d+ booked members were told about the new time\./,
    );
    await expect(page.locator('tr[data-sid="pau-track-2026-11-19"]')).toContainText(
      "Thu 19 Nov 19:00",
    );
    await expect(page.locator('tr[data-sid="pau-track-2026-11-19"]')).toContainText("Coach Nina");
    await expect(page.locator('tr[data-sid="pau-track-2026-11-19"]')).toContainText("/ 32");
    // The member is told on Path and in the chat, and her booking stays. The coach's week follows.
    const path = await screen(page, "athlete", "path");
    expect(path).toMatch(
      /Moved by the club: Track session Thu 19 Nov · PAU Trackrunning · Now 19:00, it was 18:30\. Your booking stays\./,
    );
    expect(await sim(page, (d) => d.myBooking("pau-track-2026-11-19").status)).toBe("confirmed");
    expect(await screen(page, "athlete", "coach")).toContain(
      "moved Track session on Thu 19 Nov from 18:30 to 19:00",
    );
    expect(await screen(page, "coach", "week")).not.toMatch(
      /Thursday 19[^]*?Track session[^]*?Friday/,
    );
    // Every later Wednesday: the ones in the schedule now, and the ones that come into it later.
    await screen(page, "admin", "sched");
    await page.locator('[data-v="asess|pau-technique-2026-11-18"]').click();
    await page.locator("#e-time").fill("19:15");
    await page.locator("#e-scope").selectOption("following");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.locator(".toast")).toContainText(/Saved for \d sessions\./);
    await clock(page, ZURICH("2026-12-20T12:00"));
    const later = await sim(page, (d) =>
      d
        .sessList("pau")
        .filter((s: any) => s.off === "technique" && s.start > new Date())
        .map((s: any) => `${s.start.getHours()}:${s.start.getMinutes()}`),
    );
    expect(later.length).toBeGreaterThan(2);
    expect(new Set(later)).toEqual(new Set(["19:15"]));
    await clock(page, MONDAY_NOON);
    // A new session: refused in the past and when it doubles one, then added and bookable.
    await screen(page, "admin", "sched");
    await page.getByRole("button", { name: "Add a session" }).click();
    await page.locator("#a-off").selectOption("community");
    await page.locator("#a-date").fill("2026-11-15");
    await page.getByRole("button", { name: "Add to the schedule" }).click();
    await expect(page.locator("#add-error")).toContainText("That time is already over.");
    await page.locator("#a-date").fill("2026-11-21");
    await page.locator("#a-time").fill("10:00");
    await page.getByRole("button", { name: "Add to the schedule" }).click();
    await expect(page.locator("#add-error")).toContainText(
      "There is already a saturday community session at that time.",
    );
    await page.locator("#a-date").fill("2026-11-18");
    await page.locator("#a-time").fill("07:00");
    await page.locator("#a-cap").fill("8");
    await page.getByRole("button", { name: "Add to the schedule" }).click();
    await expect(page.locator(".toast")).toContainText(
      "Added: Saturday community session, Wed 18 Nov 07:00. Members can book it now.",
    );
    await expect(page.locator("tr", { hasText: "Wed 18 Nov 07:00" })).toContainText("added");
    const b = await sim(page, (d) => {
      const s: any = d.sessList("pau").find((x: any) => x.added);
      return { r: d.book(s.id, "t").status, cap: s.cap };
    });
    expect(b).toEqual({ r: "confirmed", cap: 8 });
    expect(await screen(page, "admin", "money")).toMatch(
      /Added Saturday community session, Wed 18 Nov 07:00, 8 places/,
    );
  });
  test("cancels a session from the schedule: the admin sees what it does first; booked members are told and get the session back", async ({
    page,
  }) => {
    await start(page);
    await sim(page, (d) => d.book("pau-track-2026-11-19", "t"));
    expect(await sim(page, (d) => d.passState(d.passOf("pau")).text)).toBe(
      "4 of 4 used in November",
    );
    await screen(page, "admin", "sched");
    await page.locator('[data-v="asess|pau-track-2026-11-19"]').click();
    await page.getByRole("button", { name: "Cancel this session" }).click();
    const fx = page.locator("#cancel-effects");
    await expect(fx).toContainText(/\d+ booked members are told at once, in the app\./);
    await expect(fx).toContainText("Nobody loses a credit.");
    await expect(fx).toContainText("It can't be undone.");
    // "Keep it" keeps it.
    await page.getByRole("button", { name: "Keep it" }).click();
    expect(await sim(page, (d) => !!d.state.sessions["pau-track-2026-11-19"].cancelled)).toBe(
      false,
    );
    await page.getByRole("button", { name: "Cancel this session" }).click();
    await page.getByRole("button", { name: /^Cancel the session and tell \d+ members$/ }).click();
    await expect(page.locator(".toast")).toContainText(
      /Cancelled\. \d+ booked members were told and got the session back on their pass\./,
    );
    await expect(page.locator('tr[data-sid="pau-track-2026-11-19"]')).toContainText("Cancelled");
    await expect(page.locator('tr[data-sid="pau-track-2026-11-19"] [data-a="free"]')).toHaveCount(
      0,
    );
    // The member: told on Path, the session back on her pass, and it can't be booked.
    expect(await screen(page, "athlete", "path")).toContain("Cancelled by the club: Track session");
    expect(await sim(page, (d) => d.passState(d.passOf("pau")).text)).toBe(
      "3 of 4 used in November",
    );
    expect(await sim(page, (d) => d.book("pau-track-2026-11-19", "t").code)).toBe("CANCELLED");
    // The admin can open it again and sees that it is cancelled; it is in the audit log.
    await screen(page, "admin", "sched");
    await page.locator('[data-v="asess|pau-track-2026-11-19"]').click();
    await expect(page.getByRole("dialog")).toContainText("This session is cancelled.");
    await page.keyboard.press("Escape");
    expect(await screen(page, "admin", "money")).toMatch(
      /Cancelled Track session, Thu 19 Nov 18:30: \d+ booked members told/,
    );
  });
  test("changes the club's booking rules, and the engine follows: booking window, cancel deadline, late cancel, limits, waitlist", async ({
    page,
  }) => {
    await start(page);
    await screen(page, "admin", "dash");
    await page.getByRole("button", { name: "Change the rules" }).click();
    // A rule that makes no sense is refused, and what was typed stays.
    await page.locator("#r-opens").fill("0");
    await page.getByRole("button", { name: "Save rules" }).click();
    await expect(page.locator("#rules-error")).toContainText(
      "The booking window is a whole number of days, from 1 to 365.",
    );
    await expect(page.locator("#r-opens")).toHaveValue("0");
    await page.locator("#r-opens").fill("3");
    await page.locator("#r-cancel").fill("24");
    await page.locator("#r-late").selectOption("forfeit");
    await page.locator("#r-day").fill("1");
    await page.locator("#r-week").fill("2");
    await page.locator("#r-wl").selectOption("offer");
    await page.locator("#r-hold").fill("1");
    await page.getByRole("button", { name: "Save rules" }).click();
    await expect(page.locator(".toast")).toContainText(
      "Rules saved. They hold for every booking from now on",
    );
    const rules =
      "Book up to 3 days ahead. Free cancel until 24 h before. Later than that, the credit is not returned. Max 2 bookings a week and 1 a day. Waitlist: a freed spot is held for the next person for 1 h, then offered on.";
    await expect(page.locator("#rules")).toContainText(rules);
    // Members read the same words, and the engine holds every one of them.
    await screen(page, "athlete", "week");
    await page.locator("summary", { hasText: "Club rules" }).click();
    await expect(page.locator("#weekpane details")).toContainText(rules);
    const r = await sim(page, (d) => {
      const S = d.state,
        far = d.check(S.sessions["pau-gym-2026-11-20"]).msg, // Friday is 4 days ahead
        a = d.book("pau-track-2026-11-16", "t"); // today 18:30: inside the 24 h deadline
      d.addSession("pau", "gym", "2026-11-16", "20:30", 10);
      const second: any = d.sessList("pau").find((x: any) => x.added),
        sameDay = d.check(second),
        late = d.cancel(a.bid);
      return {
        far,
        a: a.status,
        sameDay: sameDay.msg,
        late: late.status,
        lateMsg: late.msg,
        used: d.passState(d.passOf("pau")).text,
      };
    });
    expect(r.far).toContain("Booking opens 3 days before.");
    expect(r.sameDay).toBe("You already have 1 classes on Mon 16 Nov. The club allows 1 a day.");
    expect(r).toMatchObject({
      a: "confirmed",
      late: "late_cancelled",
      used: "4 of 4 used in November",
    });
    expect(r.lateMsg).toContain("the credit is not returned");
    // The studio's rules did not move, and the change is written down.
    expect(await sim(page, (d) => d.policyText("studio"))).toContain(
      "Book up to 6 days ahead. Free cancel until 4 h before.",
    );
    expect(await screen(page, "admin", "money")).toMatch(
      /AUDIT LOG [^]*Booking rules at PAU Trackrunning: Book up to 3 days ahead\./,
    );
    // Saving the same again changes nothing and says so.
    await screen(page, "admin", "dash");
    await page.getByRole("button", { name: "Change the rules" }).click();
    await page.getByRole("button", { name: "Save rules" }).click();
    await expect(page.locator(".toast")).toContainText("Nothing changed.");
  });
  test("imports members from a CSV file: every row is shown first, bad rows are left out, names are text, nobody is written to", async ({
    page,
  }) => {
    await start(page);
    await screen(page, "admin", "members");
    await page.getByRole("button", { name: "Import members" }).click();
    await page.getByRole("button", { name: "Read the list" }).click();
    await expect(page.locator("#import-note")).toContainText("PATH found nobody in that.");
    const csv = [
      "Name;E-Mail;Pass",
      "Lena Vogt;lena.vogt@example.com;Regular season pass",
      "Tom Iten;tom.iten@example.com;Gold card",
      "Lea Brunner;lea.b@example.com;Drop-in season pass",
      ";nobody@example.com;",
      "Ada <img src=x onerror=window.__hit=1>;not-an-email;",
      "Lena Vogt;lena2@example.com;",
      "Ruth Keel;;10-session pack",
    ].join("\n");
    await page
      .locator("#mfile")
      .setInputFiles({ name: "members.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await expect(page.locator("#import-note")).toContainText('Read "members.csv".');
    await page.getByRole("button", { name: "Read the list" }).click();
    await expect(page.locator("#admin-import h1")).toHaveText("3 of 7 can be added");
    const rows = page.locator("#import-rows .row");
    await expect(rows.nth(1)).toContainText(
      '"Gold card" is not one of your passes: added without a pass',
    );
    await expect(rows.nth(2)).toContainText("Already a member");
    await expect(rows.nth(3)).toContainText("No name");
    await expect(rows.nth(4)).toContainText("The email address looks wrong");
    await expect(rows.nth(5)).toContainText("Twice in this file");
    await expect(rows.nth(6)).toContainText("No email: they can't be invited yet");
    expect(await page.locator("img[src='x']").count()).toBe(0);
    expect(await sim(page, (d) => d.members("pau").length)).toBe(120); // nothing is added by looking
    await page.getByRole("button", { name: "Add 3 members" }).click();
    await expect(page.locator(".toast")).toContainText(
      "3 members added. 4 left out. Nobody has been written to",
    );
    await expect(page.locator("#member-count")).toHaveText(/^124 members: .* 3 new\.$/);
    await expect(page.locator("#member-table")).toContainText("Lena Vogt");
    await expect(page.locator("#member-table")).toContainText("Ruth Keel");
    await expect(page.locator("#member-table tbody tr", { hasText: "Ruth Keel" })).toContainText(
      "10-session pack",
    );
    // Nothing went out, the other club is untouched, new members are not "drifting away", and it survives a reload.
    expect(
      await sim(page, (d) => [
        d.state.outbox.length,
        d.members("studio").length,
        d.atRisk("pau").some((x: any) => x.m.status === "New"),
      ]),
    ).toEqual([0, 120, false]);
    expect(await page.evaluate(() => (window as any).__hit)).toBeUndefined();
    await page.reload();
    expect(await sim(page, (d) => d.members("pau").length)).toBe(123);
    expect(await screen(page, "admin", "money")).toMatch(
      /Imported 3 members from a file, 4 left out/,
    );
  });
});
