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
      /Tempo run: 20 min steady Booked · 18:30/,
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
    test.fail(
      true,
      'QA-12: the coach only understands a few fixed phrases; "make this week easy" gets the help text',
    );
    await start(page);
    await screen(page, "athlete", "coach");
    await say(page, "make this week easy");
    await expect(lastCard(page)).toContainText("Easy week", { timeout: 1500 });
  });

  test("after the week is eased, Path shows the eased sessions in his plan", async ({ page }) => {
    test.fail(
      true,
      "QA-13: three plans do not know each other: the eased week changes his own plan, Path shows the coach's shared plan unchanged",
    );
    await start(page);
    await screen(page, "athlete", "coach");
    await say(page, "I need an easy week");
    await lastCard(page).getByRole("button", { name: "Confirm", exact: true }).click();
    expect(await screen(page, "athlete", "path")).not.toMatch(/Mon Track: 4 × 1 km at 10K pace/);
  });

  test("turning on pain sharing later also shows the open flag under the coach's Alerts", async ({
    page,
  }) => {
    test.fail(
      true,
      "QA-08: pain has two sources: Athletes reads the log, Alerts only knows flags that were shared at the moment of logging",
    );
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
    test.fail(
      true,
      "QA-07: coach notes and plans are not scoped to a club; PAU's show in the Studio Demo coach view",
    );
    await start(page);
    await sim(page, (d) => {
      const S = d.state;
      S.role = "coach";
      S.org = "pau";
      S.tab.coach = "athletes";
      d.render();
      S.dash.notes = { mia: "Starts too fast (PAU note)" };
    });
    const plans = await screen(page, "coach", "plans", "studio");
    await sim(page, (d) => {
      const S = d.state;
      S.tab.coach = "athletes";
      S.dash.athlete = "mia";
      d.render();
    });
    expect(plans).not.toContain("Base block");
    await expect(page.locator("#cnote")).toHaveValue("");
    await expect(page.locator("#athlete-detail")).not.toContainText("Track group");
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
    test.fail(
      true,
      "QA-16: Kudos can be sent again and again; each tap adds another identical comment",
    );
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
      /9 sessions: 6 groups, 3 one-to-one, 1 open slot/,
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
    await page.getByRole("button", { name: /Mark paid/ }).click();
    expect(await screen(page, "athlete", "me")).toMatch(/INVOICES CHF 300.00 [^]*? Paid/);
    expect(await screen(page, "admin", "dash")).toMatch(
      /0 Open invoices CHF 300.00 Paid in test mode/,
    );
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
    // Not built: there is one open invoice and "Mark paid". No overdue state, no reminders.
  });
  test.fixme("imports members from a CSV file", () => {
    // Not built.
  });
  test.fixme("reads club health: active members, attendance, revenue against last month", () => {
    // Not built (dashboard milestone C): Home shows four numbers and the rules.
  });
});
