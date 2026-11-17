/* eslint-disable @typescript-eslint/no-explicit-any -- the demo is plain browser JS; its test hook (window.PATH_DEMO) has no types. */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { lastCard, say } from "../../helpers/demo";

import {
  ALL_SCREENS,
  BROKEN_TEXT,
  MONDAY_NOON,
  ZURICH,
  clock,
  layoutProblems,
  screen,
  sim,
  start,
} from "./harness";

/** Stress and edge cases: the booking rules under pressure, time, empty and extreme data, and the device. */

test.describe("Booking rules under pressure", () => {
  test("thirty attempts on the last spot: one booking, one debit; a repeated request returns its first answer", async ({
    page,
  }) => {
    await start(page);
    const r = await sim(page, (d) => {
      const S = d.state,
        sid = "pau-track-2026-11-19",
        s = S.sessions[sid];
      s.others = s.cap - 1;
      const res = [...Array(30)].map((_, i) => d.book(sid, "sheet", `burst-${i}`));
      const first = d.book(sid, "sheet", "burst-0"),
        again = d.book(sid, "sheet", "burst-7");
      return {
        confirmed: res.filter((x) => x.status === "confirmed").length,
        refused: res.filter((x) => x.code === "ALREADY_BOOKED").length,
        bookings: S.bookings.filter((b: any) => b.sid === sid && b.status === "confirmed").length,
        debits: S.ledger.filter((l: any) => l.kind === "debit_booking" && /19 Nov/.test(l.reason))
          .length,
        spots: d.spots(s),
        first: first.status,
        again: again.code,
        over: s.others + 1 > s.cap,
      };
    });
    expect(r).toEqual({
      confirmed: 1,
      refused: 29,
      bookings: 1,
      debits: 1,
      spots: 0,
      first: "confirmed",
      again: "ALREADY_BOOKED",
      over: false,
    });
  });
  test.fixme("thirty different members on the last spot at the same moment", () => {
    // Cannot be tested here: the demo is one person's phone with no server. This belongs to the real backend
    // (one database transaction per booking), which is not built yet (M1).
  });

  test("two thousand random actions over five days never break the books", async ({ page }) => {
    test.setTimeout(120_000);
    await start(page);
    let seed = 20261116;
    const problems: string[] = [];
    for (let batch = 0; batch < 40 && problems.length < 5; batch++) {
      const found = await sim(
        page,
        (d, seed) => {
          let a = seed;
          const rnd = () => {
            a |= 0;
            a = (a + 0x6d2b79f5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          };
          const S = d.state,
            pick = (xs: any[]) => xs[Math.floor(rnd() * xs.length)],
            out: string[] = [],
            HELD = ["confirmed", "attended", "no_show"];
          const upcoming = () =>
            Object.values(S.sessions).filter(
              (s: any) => s.start > new Date() && s.start < new Date(Date.now() + 9 * 864e5),
            );
          for (let i = 0; i < 50; i++) {
            const op = rnd(),
              s: any = pick(upcoming());
            let what = "";
            if (op < 0.34) {
              d.book(s.id, "sim", null, { wait: rnd() < 0.6 });
              what = `book ${s.id}`;
            } else if (op < 0.5) {
              const b: any = pick(S.bookings.filter((x: any) => x.status === "confirmed"));
              if (b) {
                d.cancel(b.id);
                what = `cancel ${b.sid}`;
              }
            } else if (op < 0.72) {
              d.freeSpot(s.id);
              what = `free ${s.id}`;
            } else if (op < 0.8) {
              const w: any = pick(S.waitlist);
              if (w) {
                if (w.offer && rnd() < 0.6) d.acceptOffer(w.sid);
                else if (w.offer) d.declineOffer(w.sid);
                else d.leaveWait(w.sid);
                what = `waitlist ${w.sid}`;
              }
            } else if (op < 0.86) {
              if (rnd() < 0.5) d.purchase("dropin", rnd() < 0.5 ? "pau" : "studio");
              else d.purchase("pack", rnd() < 0.5 ? "pau" : "studio");
              what = "purchase";
            } else if (op < 0.93) {
              s.others = Math.min(
                s.cap - (d.myBooking(s.id) ? 1 : 0) - (s.held || 0),
                s.others + 1 + Math.floor(rnd() * 3),
              );
              what = `others book ${s.id}`;
            } else {
              const b: any = pick(S.bookings.filter((x: any) => HELD.includes(x.status)));
              if (b) {
                d.markAttendance(b.sid, S.me.name, pick(["present", "late", "absent"]));
                what = `attendance ${b.sid}`;
              }
            }
            // The books, after every single action.
            for (const x of Object.values(S.sessions) as any[]) {
              const mine = S.bookings.filter(
                  (b: any) => b.sid === x.id && HELD.includes(b.status),
                ).length,
                w = S.waitlist.filter((q: any) => q.sid === x.id);
              if (mine > 1) out.push(`${what}: booked twice into ${x.id}`);
              if (x.others + mine + (x.held || 0) > x.cap)
                out.push(
                  `${what}: ${x.id} over capacity (${x.others}+${mine}+${x.held || 0} of ${x.cap})`,
                );
              if (x.others < 0 || x.waitOthers < 0 || d.spots(x) < 0)
                out.push(`${what}: negative count in ${x.id}`);
              if (w.length > 1) out.push(`${what}: on the waitlist twice for ${x.id}`);
              if (w.length && mine) out.push(`${what}: booked and waiting for ${x.id}`);
              if (w.some((q: any) => q.pos < 1))
                out.push(`${what}: waitlist position below 1 in ${x.id}`);
              if ((w.some((q: any) => q.offer) ? 1 : 0) + (x.offerTo ? 1 : 0) !== (x.held || 0))
                out.push(`${what}: held spots and offers disagree in ${x.id}`);
              if (x.offerTo && x.waitOthers < 1)
                out.push(`${what}: a spot is held for someone who is not waiting in ${x.id}`);
            }
            for (const p of S.passes) {
              const st = d.passState(p);
              if (p.kind === "credits" && st.left < 0)
                out.push(`${what}: ${p.name} has ${st.left} credits`);
              if (p.kind === "limit" && st.used > st.max)
                out.push(`${what}: ${p.name} at ${st.used} of ${st.max}`);
            }
            for (const b of S.bookings as any[]) {
              if (!b.pass) continue;
              const net = S.ledger
                .filter((l: any) => l.bid === b.id)
                .reduce((n: number, l: any) => n + l.delta, 0);
              if (HELD.includes(b.status) && net !== -1)
                out.push(`${what}: booking ${b.id} (${b.status}) nets ${net} on the pass`);
              if (b.status === "cancelled" && net !== 0)
                out.push(`${what}: cancelled booking ${b.id} nets ${net}`);
            }
            if (out.length) break;
          }
          return { out: out.slice(0, 3), next: Math.floor(rnd() * 1e9) };
        },
        seed,
      );
      problems.push(...found.out);
      seed = found.next;
      await clock(
        page,
        new Date(ZURICH("2026-11-16T12:00").getTime() + (batch + 1) * 3 * 3600_000),
      ); // three hours on: sessions start, holds run out
    }
    expect(problems).toEqual([]);
  });

  test("a double tap on Book books once", async ({ page }) => {
    await start(page);
    await screen(page, "athlete", "week");
    await page.locator("#classcard .btn.acc").first().dblclick();
    expect(
      await sim(page, (d) => ({
        n: d.state.bookings.filter(
          (b: any) => b.sid === "pau-track-2026-11-16" && b.status === "confirmed",
        ).length,
        toast: d.ui.toast,
      })),
    ).toEqual({
      n: 1,
      toast: "Booked: Track session, Mon 16 Nov 18:30. Free cancel until Mon 16 Nov 16:30.",
    });
  });

  test("no booking in the past, none before the window opens, and the studio's daily limit holds", async ({
    page,
  }) => {
    await start(page);
    const r = await sim(page, (d) => {
      const S = d.state,
        day = Object.values(S.sessions)
          .filter((s: any) => s.org === "studio" && s.id.endsWith("2026-11-18"))
          .sort((a: any, b: any) => a.start - b.start) as any[];
      return {
        past: d.book("pau-track-2026-11-12", "t").code,
        early: d.book("studio-hiit-2026-11-25", "t").msg,
        day: day.map((s) => {
          const x = d.book(s.id, "t");
          return x.ok ? x.status : x.code;
        }),
      };
    });
    expect(r.past).toBe("WINDOW_CLOSED");
    expect(r.early).toBe("Booking opens 6 days before. This one opens on Thu 19 Nov.");
    expect(r.day).toEqual(["confirmed", "confirmed", "LIMIT_REACHED", "LIMIT_REACHED"]);
  });

  test("a late cancel at the studio keeps the credit, and says so", async ({ page }) => {
    await start(page);
    await clock(page, ZURICH("2026-11-17T16:00")); // yoga is at 18:45, the deadline was 14:45
    const r = await sim(page, (d) => {
      const b = d.state.bookings.find((x: any) => x.sid === "studio-yoga-2026-11-17"),
        before = d.passState(d.passOf("studio")).left,
        c = d.cancel(b.id);
      return {
        msg: c.msg,
        same: d.passState(d.passOf("studio")).left === before,
        status: c.status,
      };
    });
    expect(r).toEqual({
      msg: "Cancelled: Yoga flow, Tue 17 Nov. This was inside the cancel deadline, so the credit is not returned.",
      same: true,
      status: "late_cancelled",
    });
  });

  test("when a member cancels out of a full session, the spot goes to the next person waiting", async ({
    page,
  }) => {
    await start(page);
    const r = await sim(page, (d) => {
      const S = d.state,
        s = S.sessions["pau-track-2026-11-19"];
      s.others = s.cap - 1;
      s.waitOthers = 2;
      const b = d.book(s.id, "t");
      d.cancel(b.bid);
      return { others: s.others, waiting: s.waitOthers, spots: d.spots(s) };
    });
    expect(r).toEqual({ others: 30, waiting: 1, spots: 0 });
  });
  test("two bookings at the same time in two clubs are not made without a word", async ({
    page,
  }) => {
    await start(page);
    const r = await sim(page, (d) => {
      d.book("pau-track-2026-11-19", "t");
      return d.book("studio-ride-2026-11-19", "t");
    });
    expect(r.ok ? r.msg : "refused").toMatch(/refused|same time|overlap|clash/i);
  });
  test("when the club cancels a session, booked members are told and get the session back", async ({
    page,
  }) => {
    await start(page);
    const r = await sim(page, (d) => {
      const S = d.state,
        b = d.book("pau-track-2026-11-19", "t");
      S.sessions["pau-track-2026-11-19"].cancelled = true;
      d.render();
      return {
        status: S.bookings.find((x: any) => x.id === b.bid).status,
        pass: d.passState(d.passOf("pau")).text,
      };
    });
    expect(r).toEqual({ status: "cancelled", pass: "3 of 4 used in November" });
  });
  test("a pass that has run out cannot book", async ({ page }) => {
    await start(page, new Date("2027-04-06T12:00:00+02:00"));
    const r = await sim(page, (d) => {
      const s: any = Object.values(d.state.sessions)
        .filter((x: any) => x.org === "pau" && x.off === "track" && x.start > new Date())
        .sort((a: any, b: any) => a.start - b.start)[0];
      return d.book(s.id, "t").ok;
    });
    expect(r).toBe(false);
  });
  test("offer mode: a cancelled spot is held for the next person and runs out, like the member's own offer", async ({
    page,
  }) => {
    await start(page);
    const r = await sim(page, (d) => {
      const S = d.state,
        s = S.sessions["studio-ride-2026-11-18"];
      s.others = s.cap - 1;
      s.waitOthers = 2;
      const b = d.book(s.id, "t"),
        msg = d.cancel(b.bid).msg,
        held = { others: s.others, waiting: s.waitOthers, held: s.held, spots: d.spots(s) },
        again = d.book(s.id, "t").status;
      return { msg, held, again, to: s.offerTo.name, names: d.rosterNames(s).waiting };
    });
    expect(r.msg).toContain("Your spot is held for the next person on the waitlist, until 14:00");
    expect(r.msg, "a member is never told who else is waiting").not.toContain(r.to);
    expect(r.held).toEqual({ others: 17, waiting: 2, held: 1, spots: 0 });
    expect(r.again, "the member cannot book past the people waiting").toBe("waitlisted");
    expect(r.names[0]).toBe(r.to);
    await clock(page, ZURICH("2026-11-16T14:01"));
    expect(
      await sim(page, (d) => {
        const s = d.state.sessions["studio-ride-2026-11-18"];
        return [s.others, s.waitOthers, s.held, !!s.offerTo];
      }),
    ).toEqual([18, 1, 0, false]);
  });
  test("the overlap is on the screen before the tap: session sheet, Week card, coach card and Explore", async ({
    page,
  }) => {
    await start(page);
    await sim(page, (d) => {
      d.book("pau-track-2026-11-19", "t");
      d.state.day = "2026-11-19";
    });
    await screen(page, "athlete", "week", "studio");
    await page.locator('.filters .chip:has-text("Cycling")').click();
    await expect(page.locator("#clash-card")).toContainText(
      "Overlaps with Track session at PAU Trackrunning, 18:30 to 20:00.",
    );
    await page.locator("#classcard").getByRole("button", { name: "Book anyway" }).click();
    await expect(page.locator(".toast")).toContainText("Heads up: it overlaps with Track session");
    // No overlap, no warning.
    await sim(page, (d) => {
      d.state.day = "2026-11-18";
      d.state.filter.cat = "all";
      d.render();
    });
    await page.locator('#daylist [data-v="studio-ride-2026-11-18"]').click();
    await expect(page.getByRole("dialog")).not.toContainText("Overlaps");
    await expect(
      page.getByRole("dialog").getByRole("button", { name: "Book", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    // The coach says it on the card, before the confirm.
    await screen(page, "athlete", "coach", "studio");
    await say(page, "book yoga on Thursday");
    await expect(lastCard(page)).toContainText(/Overlaps with (Track session|Ride)/);
    // Explore: a taster at the time of a club session.
    const id = await sim(page, (d) => {
      const o = d.OFFERS.find(
        (x: any) =>
          !d.signedUp(x.id) && d.offerStart(x) > new Date() && x.price === 0 && x.cap > x.taken,
      );
      const s: any = Object.values(d.state.sessions).find(
        (x: any) => x.org === "pau" && x.off === "gym" && x.start > new Date(),
      );
      d.state.bookings.push({
        id: 77001,
        sid: s.id,
        status: "confirmed",
        pass: null,
        source: "t",
        at: new Date(),
      });
      s.start = d.offerStart(o);
      return o.id;
    });
    await sim(
      page,
      (d, id) => {
        d.ui.sheet = { type: "offer", id };
        d.render();
      },
      id,
    );
    await expect(page.locator("#consequence")).toContainText(
      "It overlaps with Gym session at PAU Trackrunning",
    );
  });
  test("a session the club cancelled: the member is told on Path, in Week and in the chat, and her waitlist entries go too", async ({
    page,
  }) => {
    await start(page);
    const msg = await sim(page, (d) => {
      const S = d.state;
      d.book("pau-track-2026-11-19", "t");
      const full = S.sessions["pau-gym-2026-11-20"];
      full.others = full.cap;
      d.book(full.id, "t", null, { wait: true });
      d.cancelSession(full.id);
      return d.cancelSession("pau-track-2026-11-19").msg;
    });
    expect(msg).toMatch(
      /Cancelled\. \d+ booked members were told and got the session back on their pass\./,
    );
    const path = await screen(page, "athlete", "path");
    expect(path).toMatch(/Cancelled by the club: (Track|Gym) session/);
    expect(path).toContain("3 of 4 used in November");
    const week = await screen(page, "athlete", "week");
    expect(week).toMatch(/Thu 19 Track session[^]*?Cancelled/);
    await sim(page, (d) => {
      d.state.day = "2026-11-19";
      d.render();
    });
    await expect(page.locator("#gone-card")).toContainText(
      "The club cancelled this session. It no longer counts towards November.",
    );
    expect(await sim(page, (d) => d.state.waitlist.length)).toBe(0);
    expect(await screen(page, "athlete", "coach")).toContain(
      "PAU Trackrunning cancelled Track session on Thu 19 Nov at 18:30. Your booking is gone",
    );
    // It cannot be booked again, and "Find another session" leads to that day.
    expect(await sim(page, (d) => d.book("pau-track-2026-11-19", "t").code)).toBe("CANCELLED");
    await screen(page, "athlete", "path");
    await page.getByRole("button", { name: "Find another session" }).click();
    await expect(page.locator("#weeklabel")).toBeVisible();
    expect(await sim(page, (d) => d.state.notices.filter((n: any) => !n.seen).length)).toBe(1);
    expect(await screen(page, "admin", "money")).toMatch(
      /Cancelled Track session, Thu 19 Nov 18:30: \d+ booked members told/,
    );
  });
  test("an ended pass says so, offers the renewal, and books again once renewed", async ({
    page,
  }) => {
    await start(page, new Date("2027-04-06T12:00:00+02:00"));
    expect(await screen(page, "athlete", "me")).toContain("Ended 31 Mar 2027");
    await sim(page, (d) => {
      d.state.bookings = []; // nothing left to log, so the pass is the next thing to deal with
    });
    const path = await screen(page, "athlete", "path");
    expect(path).toContain("Your pass has ended");
    expect(path).toContain("Drop-in season pass: ended 31 Mar 2027");
    const sid = await sim(page, (d) => {
      const s: any = Object.values(d.state.sessions)
        .filter((x: any) => x.org === "pau" && x.off === "track" && x.start > new Date())
        .sort((a: any, b: any) => a.start - b.start)[0];
      return s.id;
    });
    const before = await sim(
      page,
      (d, sid) => {
        const s = d.state.sessions[sid];
        return {
          code: d.check(s).code,
          offers: d.offersFor(s).map((o: any) => o.kind),
          free: d.book(
            (
              Object.values(d.state.sessions).find(
                (x: any) => x.org === "pau" && x.off === "community" && x.start > new Date(),
              ) as any
            ).id,
            "t",
          ).ok,
        };
      },
      sid,
    );
    expect(before).toEqual({ code: "PASS_EXPIRED", offers: ["renew", "dropin"], free: true });
    await page.getByRole("button", { name: "Renew for Summer season · CHF 300.00" }).click();
    await page.getByRole("button", { name: "Pay with TWINT" }).click();
    expect(await screen(page, "athlete", "me")).toContain("Valid until 30 Sep 2027");
    expect(await sim(page, (d, sid) => d.book(sid, "t").ok, sid)).toBe(true);
    // A session after the end of a pass that is still running is refused too.
    expect(
      await sim(page, (d) => {
        d.passOf("pau").until = new Date(2027, 3, 7);
        const s: any = Object.values(d.state.sessions)
          .filter((x: any) => x.org === "pau" && x.off === "gym" && x.start > new Date(2027, 3, 8))
          .sort((a: any, b: any) => a.start - b.start)[0];
        return d.check(s).msg;
      }),
    ).toMatch(/is valid until 7 Apr 2027\. This session is after that\./);
  });
});

test.describe("Time: Europe/Zurich", () => {
  test("the monthly pass turns over at midnight, and a December session booked in November counts in December", async ({
    page,
  }) => {
    await start(page, ZURICH("2026-11-30T23:58"));
    const a = await sim(page, (d) => ({
      now: d.passState(d.passOf("pau")).text,
      dec: d.book("pau-track-2026-12-03", "t").ok,
      stillNov: d.passState(d.passOf("pau")).text,
    }));
    expect(a).toEqual({
      now: "3 of 4 used in November",
      dec: true,
      stillNov: "3 of 4 used in November",
    });
    await clock(page, ZURICH("2026-12-01T00:02"));
    expect(await sim(page, (d) => d.passState(d.passOf("pau")).text)).toBe(
      "1 of 4 used in December",
    );
    expect(await screen(page, "athlete", "me")).toMatch(/1 \/ 4 used in December/);
  });
  test("across the switch to summer time, sessions keep their clock time and their cancel deadline", async ({
    page,
  }) => {
    await start(page, ZURICH("2027-03-22T12:00"));
    const r = await sim(page, (d) => {
      const f = (id: string) =>
        d.state.sessions[id].start.toLocaleString("en-GB", {
          timeZone: "Europe/Zurich",
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
      return {
        before: f("pau-track-2027-03-25"),
        after: f("pau-track-2027-03-29"),
        msg: d.book("pau-track-2027-03-29", "t").msg,
      };
    });
    expect(r).toEqual({
      before: "Thu 18:30",
      after: "Mon 18:30",
      msg: "Booked: Track session, Mon 29 Mar 18:30. Free cancel until Mon 29 Mar 16:30.",
    });
  });
  test("across the switch back to winter time too", async ({ page }) => {
    await start(page, new Date("2026-10-19T12:00:00+02:00")); // the Monday before the clocks go back on 25 October 2026
    const r = await sim(page, (d) => {
      const f = (id: string) =>
        d.state.sessions[id] &&
        d.state.sessions[id].start.toLocaleString("en-GB", {
          timeZone: "Europe/Zurich",
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
      return [f("pau-track-2026-10-22"), f("pau-track-2026-10-26")];
    });
    expect(r).toEqual(["Thu 18:30", "Mon 18:30"]);
  });
});

test.describe("Empty, extreme and broken data", () => {
  test("a brand-new member with no bookings, logs or bests: no screen breaks or prints nonsense", async ({
    page,
  }) => {
    await start(page);
    await sim(page, (d) => {
      const S = d.state;
      Object.assign(S, {
        entries: [],
        bookings: [],
        pbs: [],
        ledger: [],
        signups: [],
        tryPlans: [],
        waitlist: [],
        series: [],
      });
      S.chat = S.chat.slice(0, 1);
      S.dash = undefined;
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const org of ["pau", "studio"] as const)
      for (const [role, tab] of ALL_SCREENS)
        expect(await screen(page, role, tab, org), `${org}/${role}/${tab}`).not.toMatch(
          BROKEN_TEXT,
        );
    expect(errors).toEqual([]);
  });
  test("empty lists say what goes there", async ({ page }) => {
    await start(page);
    await sim(page, (d) => {
      const S = d.state;
      Object.assign(S, { entries: [], bookings: [], pbs: [], ledger: [] });
    });
    expect(await screen(page, "athlete", "path")).not.toMatch(/PERSONAL BESTS\s*$/);
    expect(await screen(page, "athlete", "log")).not.toMatch(/RECENT\s*$/);
  });
  test("very long names and titles wrap; nothing is cut off or pushed off the screen, at 360, 390 and 430 px", async ({
    page,
  }) => {
    await start(page);
    await sim(page, (d) => {
      const S = d.state,
        long = "Maximiliane-Alexandra Hohenzollern-Sigmaringen von und zu Liechtenstein";
      S.me.name = long;
      S.goal.title = "Sub-40 10K and the Jungfrau Marathon after it";
      S.entries[0].title =
        "Long run with the whole Saturday community group around the lake and back";
      d.book("pau-track-2026-11-16", "t");
    });
    const bad: string[] = [];
    for (const w of [360, 390, 430]) {
      await page.setViewportSize({ width: w, height: 844 });
      for (const [role, tab] of ALL_SCREENS) {
        await screen(page, role, tab);
        for (const p of await layoutProblems(page)) bad.push(`${w}px ${role}/${tab}: ${p}`);
      }
      await sim(page, (d) => {
        const S = d.state;
        S.role = "coach";
        S.tab.coach = "athletes";
        S.dash.athlete = "mia";
        d.render();
      });
      for (const p of await layoutProblems(page)) bad.push(`${w}px coach/athlete page: ${p}`);
      await sim(page, (d) => {
        const S = d.state;
        S.role = "coach";
        S.tab.coach = "today";
        S.rosterSid = "pau-track-2026-11-16";
        d.render();
      });
      for (const p of await layoutProblems(page)) bad.push(`${w}px coach/check-in: ${p}`);
    }
    expect(bad).toEqual([]);
  });
  test("a log of 99,999 minutes is not accepted", async ({ page }) => {
    await start(page);
    await screen(page, "athlete", "log");
    await page.locator("#view input").first().fill("Run");
    await page.locator("#log-dur").fill("99999");
    await page.locator(".rpe button").nth(4).click();
    const n = await sim(page, (d) => d.state.entries.length);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    expect(await sim(page, (d) => d.state.entries.length)).toBe(n);
  });
  test("what people type is shown as text, never run as code", async ({ page }) => {
    await start(page);
    const X = '<img src=x onerror="window.__hit=1"><i id=inj>i</i>';
    await screen(page, "athlete", "log");
    await page.locator("#view input").first().fill(X);
    await page.locator("#log-dur").fill("30");
    await page.locator(".rpe button").nth(4).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await sim(
      page,
      (d, X) => {
        d.ask(X);
        d.addWalkin("pau-track-2026-11-16", X);
        d.state.dash.notes = { mia: X };
      },
      X,
    );
    for (const [role, tab] of ALL_SCREENS) {
      await screen(page, role, tab);
      expect(await page.locator("#inj, img[src='x']").count(), `${role}/${tab}`).toBe(0);
    }
    expect(await page.evaluate(() => (window as any).__hit)).toBeUndefined();
  });
  test("a member's name is shown as text everywhere too", async ({ page }) => {
    await start(page);
    await sim(page, (d) => {
      d.state.me.name = 'Mia <img src=x onerror="window.__hit=1">';
      d.state.goal.title = 'Sub-40 <img src=x onerror="window.__hit=1">';
      d.state.me.sports = "<img src=x>";
    });
    for (const [role, tab] of ALL_SCREENS) {
      await screen(page, role, tab);
      expect(await page.locator("img[src='x']").count(), `${role}/${tab}`).toBe(0);
    }
    expect(await page.evaluate(() => (window as any).__hit)).toBeUndefined();
    expect(await screen(page, "admin", "members")).toContain(
      'Mia <img src=x onerror="window.__hit=1">',
    );
  });
});

test.describe("The device", () => {
  test("offline: booking and logging still work, and everything is there after a reload", async ({
    page,
    context,
  }) => {
    await start(page);
    await context.setOffline(true);
    await sim(page, (d) => {
      d.book("pau-track-2026-11-19", "t");
      d.render();
    });
    await screen(page, "athlete", "log");
    await page.locator("#view input").first().fill("Easy run");
    await page.locator("#log-dur").fill("30");
    await page.locator(".rpe button").nth(3).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.waitForTimeout(1300);
    const before = await sim(page, (d) =>
      JSON.stringify([d.state.bookings, d.state.ledger, d.state.entries.length]),
    );
    await context.setOffline(false);
    await page.reload();
    expect(
      await sim(page, (d) =>
        JSON.stringify([d.state.bookings, d.state.ledger, d.state.entries.length]),
      ),
    ).toBe(before);
  });
  test("a reload in the middle of a log keeps what was typed", async ({ page }) => {
    await start(page);
    await screen(page, "athlete", "log");
    await page.locator("#view input").first().fill("Half-typed session");
    await page.locator(".rpe button").nth(6).click();
    await page.reload();
    await expect(page.locator("#view input").first()).toHaveValue("Half-typed session");
    await expect(page.locator('.rpe [aria-pressed="true"]')).toHaveText("7");
  });
  test("no screen scrolls sideways or pushes anything off screen at 360, 390 and 430 px, in both clubs", async ({
    page,
  }) => {
    await start(page);
    const bad: string[] = [];
    for (const w of [360, 390, 430]) {
      await page.setViewportSize({ width: w, height: 844 });
      for (const org of ["pau", "studio"] as const)
        for (const [role, tab] of ALL_SCREENS) {
          await screen(page, role, tab, org);
          for (const p of await layoutProblems(page))
            bad.push(`${w}px ${org}/${role}/${tab}: ${p}`);
        }
    }
    expect(bad).toEqual([]);
  });
  test("every control is at least 44 px at 360 px wide", async ({ page }) => {
    await start(page);
    await page.setViewportSize({ width: 360, height: 844 });
    await screen(page, "athlete", "week");
    const small = await page.evaluate(
      () =>
        [...document.querySelectorAll<HTMLElement>("#app button")].filter((b) => {
          const r = b.getBoundingClientRect();
          return r.width && (r.width < 44 || r.height < 44);
        }).length,
    );
    expect(small).toBe(0);
  });
  test("with a keyboard: the focus stays where the person is, and a sheet keeps it inside", async ({
    page,
  }) => {
    await start(page);
    await screen(page, "athlete", "week");
    await page.locator(".filters .chip").nth(1).focus();
    await page.keyboard.press("Enter");
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe("BUTTON");
    await page.locator('#classcard [data-a="sheet"]').first().click();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => !!document.activeElement?.closest(".sheet"))).toBe(true);
    }
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Shift+Tab");
      expect(await page.evaluate(() => !!document.activeElement?.closest(".sheet"))).toBe(true);
    }
    // What is behind the sheet is out of reach, and closing gives the focus back to what opened it.
    expect(await page.locator("#view[inert], nav.tabs[inert], header.top[inert]").count()).toBe(3);
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => (document.activeElement as HTMLElement)?.dataset?.a)).toBe(
      "sheet",
    );
    expect(await page.locator("[inert]").count()).toBe(0);
    // A tab in the bar keeps the focus when it is chosen with the keyboard.
    await page.locator('nav.tabs [data-v="me"]').focus();
    await page.keyboard.press("Enter");
    expect(await page.evaluate(() => (document.activeElement as HTMLElement)?.dataset?.v)).toBe(
      "me",
    );
  });
  test("Escape closes a sheet", async ({ page }) => {
    await start(page);
    await screen(page, "athlete", "week");
    await page.locator('#classcard [data-a="sheet"]').first().click();
    await expect(page.locator(".sheet")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".sheet")).toHaveCount(0);
  });
  test("the phone's Back button closes the sheet or goes one screen back; it does not leave the app", async ({
    page,
  }) => {
    await start(page);
    await screen(page, "athlete", "week");
    await page.locator('#classcard [data-a="sheet"]').first().click();
    await page.goBack().catch(() => {});
    await expect(page.getByRole("navigation", { name: "Sections" })).toBeVisible({ timeout: 1500 });
    await expect(page.locator(".sheet")).toHaveCount(0);
    await expect(page.locator("#weeklabel")).toBeVisible();
    // One screen back at a time: Me, then an athlete's page, each Back undoes one step.
    await page.locator('nav.tabs [data-v="me"]').click();
    await page.goBack();
    await expect(page.locator("#weeklabel")).toBeVisible();
    await page.goForward();
    await expect(page.locator("#view h1")).toHaveText("Mia Keller");
    await screen(page, "coach", "athletes");
    await page.locator("#athlete-list .row").first().click();
    await expect(page.locator("#athlete-detail")).toBeVisible();
    await page.goBack();
    await expect(page.locator("#athlete-list")).toBeVisible();
    // A checkout is never reopened by Back or Forward.
    await screen(page, "athlete", "me");
    await page.getByRole("button", { name: /^Pay$/ }).click();
    await expect(page.getByRole("dialog", { name: "Checkout" })).toBeVisible();
    await page.goBack();
    await expect(page.locator(".sheet")).toHaveCount(0);
    await page.goForward();
    await expect(page.locator(".sheet")).toHaveCount(0);
    await expect(page.locator("#view h1")).toHaveText("Mia Keller");
  });
  test("screens draw fast: under 16 ms each, the heaviest list included", async ({ page }) => {
    await start(page);
    const ms = await sim(page, (d) => {
      const S = d.state,
        out: Record<string, number> = {};
      for (const [r, t] of [
        ["athlete", "path"],
        ["athlete", "explore"],
        ["coach", "athletes"],
        ["admin", "sched"],
      ] as [string, string][]) {
        S.role = r;
        S.tab[r] = t;
        const t0 = performance.now();
        for (let i = 0; i < 20; i++) d.render();
        out[`${r}/${t}`] = (performance.now() - t0) / 20;
      }
      return out;
    });
    for (const [k, v] of Object.entries(ms)) expect(v, k).toBeLessThan(16);
  });
  test("Explore's photos: only what is near the screen is fetched, every tile gets its photo, and nothing is blank on the way back", async ({
    page,
  }) => {
    await start(page);
    await screen(page, "athlete", "explore");
    const tiles = page.locator("#xgrid img");
    const loaded = () =>
      tiles.evaluateAll(
        (els) => els.filter((e) => (e as HTMLImageElement).naturalWidth > 0).length,
      );
    await expect.poll(loaded).toBeGreaterThan(3);
    await page.waitForTimeout(300);
    const first = await loaded(),
      all = await tiles.count();
    expect(first, "tiles far down are not fetched yet").toBeLessThan(all);
    // No browser-native lazy loading, and a calm placeholder behind every tile.
    expect(
      await tiles.evaluateAll((els) => els.filter((e) => e.hasAttribute("loading")).length),
    ).toBe(0);
    expect(
      await page
        .locator("#xgrid .pic")
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    ).not.toBe("rgba(0, 0, 0, 0)");
    // Scrolling brings the rest.
    for (let y = 0; y < 12; y++) {
      await page.locator("#view").evaluate((v) => v.scrollBy(0, 700));
      await page.waitForTimeout(120);
    }
    await expect.poll(loaded).toBe(all);
    // Open a detail and come back: every tile on the screen has its photo in the same moment the page is drawn.
    await page.locator("#view").evaluate((v) => (v.scrollTop = 0));
    await page.locator("#xgrid .tile").nth(2).click();
    await expect(page.locator("#xgrid")).toHaveCount(0);
    const blank = await page.evaluate(() => {
      const d = window.PATH_DEMO;
      d.state.explore.open = null;
      d.render();
      return [...document.querySelectorAll<HTMLImageElement>("#xgrid img")].filter(
        (i) => !i.getAttribute("src") || !i.classList.contains("on"),
      ).length;
    });
    expect(blank).toBe(0);
  });
});

test.describe("Step 0: what Ramon's own test found", () => {
  test("cancel can be undone: the booking and the pass count come back, if the spot is still free", async ({
    page,
  }) => {
    await start(page);
    await sim(page, (d) => {
      d.book("pau-track-2026-11-19", "t");
      d.state.day = "2026-11-19";
    });
    await screen(page, "athlete", "week");
    expect(await sim(page, (d) => d.passState(d.passOf("pau")).text)).toBe(
      "4 of 4 used in November",
    );
    await page.locator('#mybookings [data-v="pau-track-2026-11-19"]').click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancel booking" }).click();
    await expect(page.locator(".toast")).toContainText("Cancelled: Track session, Thu 19 Nov.");
    expect(await sim(page, (d) => d.passState(d.passOf("pau")).text)).toBe(
      "3 of 4 used in November",
    );
    await page.locator(".toast").getByRole("button", { name: "Undo" }).click();
    await expect(page.locator(".toast")).toContainText(
      "Undone. You are booked again: Track session, Thu 19 Nov 18:30. Drop-in season pass: 4 of 4 used in November.",
    );
    await expect(page.locator(".toast").getByRole("button", { name: "Undo" })).toHaveCount(0);
    const r = await sim(page, (d) => {
      const S = d.state,
        mine = S.bookings.filter((b: any) => b.sid === "pau-track-2026-11-19");
      return {
        rows: mine.length,
        status: mine[0].status,
        net: S.ledger
          .filter((l: any) => l.bid === mine[0].id)
          .reduce((n: number, l: any) => n + l.delta, 0),
        again: d.undoCancel(mine[0].id).code,
      };
    });
    expect(r).toEqual({ rows: 1, status: "confirmed", net: -1, again: "NOT_FOUND" });
    await expect(page.locator("#mybookings")).toContainText("Track session");
  });
  test("no Undo when the spot went to the waitlist, and a late cancel at the studio comes back without a second charge", async ({
    page,
  }) => {
    await start(page);
    // The spot goes to the next person: Undo is not offered, and the engine refuses it too.
    const gone = await sim(page, (d) => {
      const S = d.state,
        s = S.sessions["pau-track-2026-11-19"];
      s.others = s.cap - 1;
      s.waitOthers = 2;
      const b = d.book(s.id, "t");
      S.day = "2026-11-19";
      return b.bid;
    });
    await screen(page, "athlete", "week");
    await page.locator('#mybookings [data-v="pau-track-2026-11-19"]').click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancel booking" }).click();
    await expect(page.locator(".toast")).toContainText(
      "Your spot went to the next person on the waitlist.",
    );
    await expect(page.locator(".toast").getByRole("button", { name: "Undo" })).toHaveCount(0);
    expect(await sim(page, (d, bid) => d.undoCancel(bid).code, gone)).toBe("SESSION_FULL");
    // Studio, inside the cancel deadline: the credit was not returned, so Undo does not take another.
    const r = await sim(page, (d) => {
      const S = d.state,
        s = S.sessions["studio-hiit-2026-11-16"];
      s.others = 3;
      const before = d.passState(d.passOf("studio")).left,
        b = d.book(s.id, "t"),
        c = d.cancel(b.bid),
        afterCancel = d.passState(d.passOf("studio")).left,
        u = d.undoCancel(b.bid);
      return {
        before,
        status: c.status,
        afterCancel,
        undone: u.ok,
        after: d.passState(d.passOf("studio")).left,
      };
    });
    expect(r).toEqual({
      before: 6,
      status: "late_cancelled",
      afterCancel: 5,
      undone: true,
      after: 5,
    });
  });
  test("Your plan: every week shows all seven days, each with where it comes from, in one wording", async ({
    page,
  }) => {
    await start(page);
    await screen(page, "athlete", "path");
    const ORIGIN =
      /^(From Coach Sara|Your own day|Eased by you|Changed by Coach Sara)( · (Club session · \d\d:\d\d|Booked · \d\d:\d\d|Done|Missed|any day))?$/;
    for (let n = 1; n <= 4; n++) {
      await expect(page.locator("#plan-week")).toContainText(`Week ${n} of 4`);
      const rows = await page.locator("#plan-days .row").evaluateAll((els) =>
        els.map((el) => ({
          day: (el.querySelector(".lead") as HTMLElement).innerText,
          text: (el.querySelector(".mid span") as HTMLElement).innerText,
          label: (el.querySelector(".mid .sub") as HTMLElement)?.innerText ?? "",
        })),
      );
      expect(
        rows.map((r) => r.day),
        `week ${n}`,
      ).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
      for (const r of rows) expect(r.label, `week ${n} ${r.day}: ${r.text}`).toMatch(ORIGIN);
      expect(rows.find((r) => r.day === "Wed")).toMatchObject({
        text: "Rest day",
        label: "Your own day",
      });
      expect(rows.find((r) => r.day === "Sun")!.label).toBe("From Coach Sara");
      if (n < 4) await page.getByRole("button", { name: "Next week of the plan" }).click();
    }
    expect(await screen(page, "athlete", "path")).not.toMatch(/On your own/);
    // The plan does not run out as the days go by, and a day far out opens like any other.
    await clock(page, ZURICH("2026-12-07T09:00"));
    await sim(page, (d) => {
      d.state.dash.myWeek = 1;
    });
    await screen(page, "athlete", "path");
    await page.getByRole("button", { name: "Next week of the plan" }).click();
    await page.getByRole("button", { name: "Next week of the plan" }).click();
    await page.getByRole("button", { name: "Next week of the plan" }).click();
    await expect(page.locator("#plan-days .row")).toHaveCount(7);
    await page.locator("#plan-days .row").nth(1).click();
    await expect(page.locator("#planday-source")).toHaveText(
      "Your own day. Your coach has not set anything for it.",
    );
  });
  test("a toast never lies on content: it has its own row, and at the end of a page the last line stays readable", async ({
    page,
  }) => {
    await start(page);
    const check = async (what: string) => {
      await expect(page.locator(".toast"), what).toBeVisible();
      const r = await page.evaluate(() => {
        const box = (el: Element) => el.getBoundingClientRect(),
          view = document.getElementById("view")!,
          t = box(document.querySelector(".toast")!),
          v = box(view),
          nav = box(document.querySelector("nav.tabs")!),
          kids = [...view.querySelectorAll("section > *, .chatwrap > *")].filter(
            (e) => box(e).height > 0,
          ),
          last = kids[kids.length - 1];
        return {
          overView: t.top < v.bottom - 0.5,
          overNav: t.bottom > nav.top + 0.5,
          lastHidden: last ? box(last).bottom > v.bottom + 1 : false,
          atEnd: view.scrollHeight - view.scrollTop - view.clientHeight < 2,
        };
      });
      expect(r, what).toEqual({ overView: false, overNav: false, lastHidden: false, atEnd: true });
    };
    const toEnd = () => page.locator("#view").evaluate((v) => (v.scrollTop = v.scrollHeight));
    // Athlete, end of Me: a consent switch.
    await screen(page, "athlete", "me");
    await toEnd();
    await page.getByRole("button", { name: "Reset demo" }).click();
    await check("Me, reset armed");
    // Coach, end of an athlete's page: a note.
    await sim(page, (d) => {
      const S = d.state;
      S.role = "coach";
      S.tab.coach = "athletes";
      d.render();
      S.dash.athlete = "mia";
      d.render();
    });
    await toEnd();
    await page.getByRole("button", { name: "Save note" }).click();
    await check("coach note");
    // Admin, end of Money: mark paid on the last open invoice.
    await screen(page, "admin", "sched");
    await toEnd();
    await page
      .getByRole("button", { name: /Free a spot/ })
      .last()
      .click();
    await check("admin schedule");
    // A long message on a narrow phone still has its own row.
    await page.setViewportSize({ width: 360, height: 640 });
    await screen(page, "athlete", "week");
    await sim(page, (d) => {
      d.ui.toast =
        "Cancelled: Saturday community session, Sat 21 Nov. Your spot is held for the next person on the waitlist, until 14:00. If they pass, it goes to the person after them.";
      d.render();
    });
    await toEnd();
    await sim(page, (d) => d.render());
    await check("long toast at 360");
  });
  test("hosted the way it is published: no console errors, no failed requests, on every screen, also inside the host's frame", async ({
    page,
  }) => {
    const { serveDemo } = await import("./harness");
    const site = await serveDemo();
    try {
      for (const path of ["", "framed"]) {
        const seen: string[] = [];
        page.removeAllListeners("console");
        page.on("console", (m) => {
          // The page that hosts a frame logs one warning of its own about the frame's sandbox. It is not the demo's.
          if (/can escape its sandboxing/.test(m.text())) return;
          if (m.type() === "error" || m.type() === "warning") seen.push(`${m.type()}: ${m.text()}`);
        });
        page.on("pageerror", (e) => seen.push(`pageerror: ${e.message}`));
        page.on("requestfailed", (r) => seen.push(`failed: ${r.url()} ${r.failure()?.errorText}`));
        page.on("response", (r) => {
          if (r.status() >= 400) seen.push(`http ${r.status()}: ${r.url()}`);
        });
        await page.clock.setFixedTime(MONDAY_NOON);
        await page.goto(site.url + path);
        const frame = path ? page.frameLocator("#f") : page;
        const run = (fn: string) => (path ? page.frames()[1]! : page).evaluate(fn);
        await expect(frame.locator("nav.tabs")).toBeVisible();
        for (const org of ["pau", "studio"])
          for (const [role, tab] of ALL_SCREENS) {
            await run(
              `(() => { const d = window.PATH_DEMO, S = d.state; S.role = "${role}"; S.org = "${org}"; S.tab["${role}"] = "${tab}"; d.ui.sheet = null; if (S.dash) Object.assign(S.dash, { athlete: null, sess: null, planView: null }); S.rosterSid = null; d.render(); })()`,
            );
            await page.waitForTimeout(40);
          }
        // The flows that touch the network or the history: Explore's photos, a detail and back, a sheet, the chat.
        await run(
          `(() => { const d = window.PATH_DEMO, S = d.state; S.role = "athlete"; S.org = "pau"; S.tab.athlete = "explore"; d.render(); document.getElementById("view").scrollTop = 99999; })()`,
        );
        await page.waitForTimeout(600);
        await frame.locator("#xgrid .tile").first().click({ force: true });
        await run(`(() => { history.back(); })()`);
        await page.waitForTimeout(300);
        await run(
          `(() => { const d = window.PATH_DEMO; d.state.tab.athlete = "coach"; d.ask("book my usual"); d.render(); d.ui.sheet = { type: "clubs" }; d.render(); d.ui.sheet = null; d.render(); })()`,
        );
        await page.waitForTimeout(300);
        expect(seen, path || "top level").toEqual([]);
        // Over http every photo is kept in memory: a redraw never goes back to the network.
        const srcs = await run(
          `[...document.querySelectorAll("#app img[src]")].map((i) => i.getAttribute("src").slice(0, 5))`,
        );
        expect((srcs as string[]).every((x) => x === "blob:")).toBe(true);
      }
    } finally {
      await site.close();
    }
  });
  test("a photo that fails to arrive is tried again and then appears", async ({ page }) => {
    const { serveDemo } = await import("./harness");
    const site = await serveDemo();
    try {
      let dropped = 0;
      await page.route("**/images/hero-desert-run.jpg", (route) =>
        dropped++ < 2 ? route.abort() : route.continue(),
      );
      await page.goto(site.url);
      const hero = page.locator(".hero img");
      await expect(hero).toHaveClass(/\bon\b/, { timeout: 8000 });
      expect(await hero.evaluate((e) => (e as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      expect(dropped).toBeGreaterThan(2);
    } finally {
      await site.close();
    }
  });
});

test.describe("Steps 5 and 6: the season's end, and Start demo", () => {
  test("the schedule stops at the season's end and says what comes next; it picks up again when the next season starts", async ({
    page,
  }) => {
    await start(page, new Date("2027-03-29T12:00:00+02:00")); // the Monday of the winter season's last week
    const days = await sim(page, (d) =>
      d
        .sessList("pau")
        .filter((s: any) => s.start > new Date())
        .map((s: any) => `${s.start.getMonth() + 1}/${s.start.getDate()}`),
    );
    expect(days.filter((x: string) => /^3\//.test(x)).length).toBeGreaterThan(2); // Mon 29, Tue 30, Wed 31 March
    expect(
      days.some((x: string) => /^4\/([1-9]|1[01])$/.test(x)),
      "nothing from 1 to 11 April",
    ).toBe(false);
    expect(days).toContain("4/12"); // the summer season starts on Monday 12 April
    // Week says so on the week the season ends, and on a day in the break.
    await screen(page, "athlete", "week");
    await expect(page.locator("#season-end")).toHaveText(
      "The winter season ends on Wed 31 Mar. The summer season starts on Mon 12 Apr.",
    );
    await page.getByRole("button", { name: "Thu 1 Apr", exact: true }).click();
    await expect(page.locator("#season-end")).toHaveCount(0); // said once, not twice
    await expect(page.locator("#noresults")).toHaveText(
      "The winter season ended on 31 Mar 2027. The summer season starts on Mon 12 Apr 2027.",
    );
    await page.getByRole("button", { name: "Next week", exact: true }).click();
    await expect(page.locator("#noresults")).toContainText(
      "The summer season starts on Mon 12 Apr 2027.",
    );
    await page.getByRole("button", { name: "Next week", exact: true }).click();
    await page.getByRole("button", { name: "Mon 12 Apr", exact: true }).click();
    await expect(page.locator("#classcard")).toContainText("Track session");
    // The admin reads the same, the studio has its own dates and no break, and the engine refuses a session in the break.
    expect(await screen(page, "admin", "sched")).toContain(
      "Winter season runs until 31 Mar 2027. No session is scheduled after that day until the summer season starts on 12 Apr 2027; it runs until 30 Sep 2027.",
    );
    expect(
      await sim(page, (d) => d.sessList("studio").filter((s: any) => s.start > new Date()).length),
    ).toBeGreaterThan(40);
    expect(
      await sim(page, (d) => [
        d.inSeason("pau", new Date(2027, 3, 5)),
        d.inSeason("pau", new Date(2027, 3, 12)),
        d.inSeason("studio", new Date(2027, 2, 1)),
        d.inSeason("studio", new Date(2027, 5, 1)),
      ]),
    ).toEqual([false, true, true, false]);
    // The plan does not promise a club session on a day the club is closed.
    const path = await screen(page, "athlete", "path");
    expect(path).not.toMatch(/Thu [^]{0,60}Club session · 18:30[^]*Fri/);
  });
  test("Start demo resets the data and walks through the story: the athlete books by chat, the coach sees it, the admin sees club health", async ({
    page,
  }) => {
    await start(page);
    // Something that Start demo has to wipe.
    await sim(page, (d) => {
      d.book("pau-gym-2026-11-17", "t");
      d.state.consent.pau["alerts.pain"] = true;
    });
    await page.locator(".clubbtn").click();
    await page.getByRole("button", { name: "Start demo" }).click();
    expect(
      await sim(page, (d) => [
        d.state.bookings.filter((b: any) => b.sid === "pau-gym-2026-11-17").length,
        d.state.consent.pau["alerts.pain"],
      ]),
    ).toEqual([0, false]);
    const guide = page.locator("#guide");
    // 1. The athlete asks, by hand. The guide moves on by itself.
    await expect(guide).toContainText("Demo · 1 of 6 · Athlete", { ignoreCase: true });
    await expect(guide).toContainText('tap "Book my usual"');
    await expect(guide.getByRole("button", { name: "Do it for me" })).toBeVisible();
    await page.locator(".quick button", { hasText: "Book my usual" }).click();
    await expect(guide).toContainText("2 of 6", { ignoreCase: true });
    await expect(guide).toContainText("Nothing is booked until you tap Confirm.");
    expect(
      await sim(page, (d) => d.state.bookings.filter((b: any) => b.source === "ai_coach").length),
    ).toBe(0);
    // 2. She confirms. Path shows it.
    await lastCard(page).getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(guide).toContainText("3 of 6", { ignoreCase: true });
    await expect(guide).toContainText("Booked: Track session, Thu 19 Nov 18:30.");
    await expect(page.locator("#plan-days")).toContainText("Booked · 18:30");
    // The guide has its own row: it does not lie on the page or on the tab bar.
    const rects = await page.evaluate(() => {
      const r = (q: string) => document.querySelector(q)!.getBoundingClientRect();
      return [
        r("#guide").top >= r("#view").bottom - 0.5,
        r("#guide").bottom <= r("nav.tabs").top + 0.5,
      ];
    });
    expect(rects).toEqual([true, true]);
    // 3. The coach sees her on the session.
    await guide.getByRole("button", { name: "Next" }).click();
    await expect(guide).toContainText("4 of 6 · Coach", { ignoreCase: true });
    await expect(page.locator("#coach-session h1")).toHaveText("Track session, 18:30");
    await expect(page.locator("#attendees")).toContainText("Mia Keller");
    await guide.getByRole("button", { name: "Next" }).click();
    await expect(page.locator("#briefing")).toBeVisible();
    // 4. The admin sees club health. Finish ends the tour.
    await guide.getByRole("button", { name: "Next" }).click();
    await expect(guide).toContainText("6 of 6 · Admin", { ignoreCase: true });
    await expect(page.locator("#health")).toContainText("PAU Trackrunning is");
    await guide.getByRole("button", { name: "Finish" }).click();
    await expect(page.locator("#guide")).toHaveCount(0);
    await expect(page.locator(".toast")).toContainText("That was the tour.");
    // Watching instead of doing: "Do it for me" and Next alone tell the same story, and End tour stops it anywhere.
    await page.locator(".clubbtn").click();
    await page.getByRole("button", { name: "Start demo" }).click();
    await guide.getByRole("button", { name: "Do it for me" }).click();
    await guide.getByRole("button", { name: "Do it for me" }).click();
    await expect(guide).toContainText("Booked: Track session, Thu 19 Nov 18:30.");
    expect(
      await sim(
        page,
        (d) =>
          d.state.bookings.filter((b: any) => b.source === "ai_coach" && b.status === "confirmed")
            .length,
      ),
    ).toBe(1);
    await guide.getByRole("button", { name: "End tour" }).click();
    await expect(page.locator("#guide")).toHaveCount(0);
    expect(await sim(page, (d) => !!d.myBooking("pau-track-2026-11-19"))).toBe(true); // ending the tour keeps the demo as it is
    // It survives a reload mid-tour.
    await page.locator(".clubbtn").click();
    await page.getByRole("button", { name: "Start demo" }).click();
    await page.reload();
    await expect(page.locator("#guide")).toContainText("1 of 6", { ignoreCase: true });
  });
});

test.describe("The small things (QA-19 to QA-24)", () => {
  test("a coach is who the club says, and sees the sessions that coach runs", async ({ page }) => {
    await start(page);
    for (const [org, name, own, other] of [
      ["pau", "COACH SARA", /Track session|Technique session/, /Gym session|community/i],
      ["studio", "NOOR", /Yoga flow/, /Strength|HIIT|Mobility|Ride/],
    ] as const) {
      expect(await screen(page, "coach", "today", org)).toContain(`${name} · `);
      const week = await screen(page, "coach", "week", org);
      expect(week).toMatch(own);
      expect(week.replace(/Tap a group.*?page\./, "")).not.toMatch(other);
      const mine = await sim(
        page,
        (d) =>
          d
            .sessList(d.state.org)
            .filter(
              (s: any) =>
                d.ORGS[s.org].offerings.find((o: any) => o.id === s.off).coach ===
                d.ORGS[s.org].me.coach,
            ).length,
      );
      expect(mine).toBeGreaterThan(3);
    }
  });
  test("attendance on the coach's page is counted from her bookings", async ({ page }) => {
    await start(page);
    const open = async () => {
      await sim(page, (d) => {
        const S = d.state;
        S.role = "coach";
        S.org = "pau";
        S.tab.coach = "athletes";
        d.render();
        S.dash.athlete = "mia";
        d.render();
      });
      return page.locator("#attendance").innerText();
    };
    expect(await open()).toBe("100% · 3 of 3");
    await sim(page, (d) => {
      d.state.bookings.find((b: any) => b.status === "attended").status = "no_show";
    });
    expect(await open()).toBe("67% · 2 of 3");
    await sim(page, (d) => {
      d.state.bookings = [];
    });
    expect(await open()).toBe("No sessions yet");
  });
  test("every screen has one heading, the coach chat included; an open slot is no dead end; Send with nothing typed says so", async ({
    page,
  }) => {
    await start(page);
    for (const org of ["pau", "studio"] as const)
      for (const [role, tab] of ALL_SCREENS) {
        await screen(page, role, tab, org);
        expect(await page.locator("#view h1").count(), `${org}/${role}/${tab}`).toBe(1);
      }
    await screen(page, "coach", "week", "pau");
    // An open slot is no dead end: it is a button that books a client. Once its time is over it is plain information.
    const slot = page.locator('#coach-week [data-kind="open"]');
    expect(await slot.evaluate((el) => el.tagName)).toBe("BUTTON");
    await slot.click();
    await expect(page.getByRole("dialog", { name: "Open slot" })).toBeVisible();
    await page.keyboard.press("Escape");
    await clock(page, ZURICH("2026-11-19T13:00"));
    await screen(page, "coach", "week", "pau");
    expect(
      await slot.evaluate((el) => [
        el.tagName,
        el.classList.contains("quiet"),
        getComputedStyle(el.querySelector(".strong")!).fontWeight,
      ]),
    ).toEqual(["DIV", true, "400"]);
    await clock(page, MONDAY_NOON);
    await screen(page, "athlete", "coach", "pau");
    const before = await sim(page, (d) => d.state.chat.length);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.locator(".toast")).toContainText("Type a message first");
    await expect(page.locator("#chat-input")).toBeFocused();
    expect(await sim(page, (d) => d.state.chat.length)).toBe(before);
  });
  test("the page leaves room for the notch and the home bar, and nothing zooms on focus", async ({
    page,
  }) => {
    await start(page);
    expect(await page.locator('meta[name="viewport"]').getAttribute("content")).toContain(
      "viewport-fit=cover",
    );
    const css = readFileSync(join(process.cwd(), "prototype/styles.css"), "utf8");
    expect(css).toMatch(/\.tabs \{[^}]*safe-area-inset-bottom/);
    expect(css).toMatch(/\.top \{[^}]*safe-area-inset-top/);
    // iOS zooms the page when a field under 16 px takes the focus.
    const small: string[] = [];
    const check = async (where: string) => {
      for (const el of await page.locator("#app input, #app select, #app textarea").all()) {
        const px = await el.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
        if (px < 16) small.push(`${where}: ${px}px`);
      }
    };
    await screen(page, "athlete", "log");
    await check("log");
    await screen(page, "athlete", "coach");
    await check("chat");
    await sim(page, (d) => {
      const S = d.state;
      S.role = "coach";
      S.tab.coach = "plans";
      d.render();
    });
    await page.locator("#plan-list .row").first().click();
    await page.getByRole("button", { name: "Edit plan" }).click();
    await check("plan draft");
    await screen(page, "admin", "members", "studio");
    await check("admin members");
    expect(small).toEqual([]);
  });
});
