/* eslint-disable @typescript-eslint/no-explicit-any -- the demo is plain browser JS; its test hook (window.PATH_DEMO) has no types. */
import { expect, test } from "@playwright/test";

import { lastCard, say } from "../../helpers/demo";
import { ZURICH, clock, screen, sim, start } from "./harness";

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
    expect(await screen(page, "admin", "sched")).toMatch(/Thu 19 Nov 18:30 Track session 26 \/ 30/);
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
  test.fixme("onboarding: joins a club, is asked for her sports and what she wants to share", () => {
    // Not built: the demo starts with a finished member. There is no first-run flow.
  });
  test.fixme("sets her own goal and date", () => {
    // Not built: the goal ("Sub-40 10K") is fixed. There is nothing to edit under Path or Me.
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
    expect(text.toLowerCase()).toContain(`needs you · 5 of ${facts.needs}`);
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
  test.fixme("a one-line note per athlete during check-in", () => {
    // Not built (dashboard milestone B, live session mode).
  });
  test.fixme("one tap sends a group recap, drafted by PATH and editable, and asks athletes to log", () => {
    // Not built (dashboard milestone B).
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
  test.fixme("edit a proposed change before approving it, and approve low-risk changes in one go", () => {
    // Not built (dashboard milestone B): the queue offers Approve and Reject only.
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
  test.fixme("sells a PT pack to a client", () => {
    // Not built: "PT 10-pack" is listed under Products, but nobody can buy or be given one.
  });
  test.fixme("books and reschedules a client into a slot", () => {
    // Not built: one-to-one sessions are fixed demo rows; "Open slot" cannot be tapped.
  });
  test.fixme("sees earnings and how full the slots are", () => {
    // Not built (brief item 7, My coaching business).
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
    expect(await screen(page, "admin", "dash")).toMatch(/7 Open invoices, 3 overdue/);
    await screen(page, "admin", "money");
    await page.getByRole("button", { name: "Mark paid: CHF 300.00, Mia Keller" }).click();
    expect(await screen(page, "athlete", "me")).toMatch(/INVOICES CHF 300.00 [^]*? Paid/);
    expect(await screen(page, "admin", "dash")).toMatch(/6 Open invoices, 3 overdue/);
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
  test.fixme("edits the schedule and adds a slot", () => {
    // Not built: Schedule is a read-only table with the demo control "Free a spot".
  });
  test.fixme("cancels a session: booked members are told and get their credit back", () => {
    // Not built: nobody can cancel a session. See QA-03 for what happens to bookings if one is.
  });
  test.fixme("changes the club's booking rules (booking window, cancel deadline, late-cancel rule, limits)", () => {
    // Not built: only the waitlist rule can be changed. The other rules are shown, not editable.
  });
  test.fixme("handles a member at risk with a drafted message", () => {
    // Not built (dashboard milestone C, retention radar).
  });
  test.fixme("sends payment reminders for open and overdue invoices", () => {
    // Not built: open and overdue invoices are listed and can be marked paid. Sending a reminder is not built.
  });
  test.fixme("imports members from a CSV file", () => {
    // Not built.
  });
  test.fixme("reads club health: active members, attendance, revenue against last month", () => {
    // Not built (dashboard milestone C): Home shows four numbers and the rules.
  });
});
