/* eslint-disable @typescript-eslint/no-explicit-any -- the demo is plain browser JS; its test hook (window.PATH_DEMO) has no types. */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { lastCard, say } from "../../helpers/demo";

import {
  ALL_SCREENS,
  BROKEN_TEXT,
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
    await start(page, new Date("2027-10-25T12:00:00+02:00"));
    const r = await sim(page, (d) => {
      const f = (id: string) =>
        d.state.sessions[id] &&
        d.state.sessions[id].start.toLocaleString("en-GB", {
          timeZone: "Europe/Zurich",
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
      return [f("pau-track-2027-10-28"), f("pau-track-2027-11-01")];
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
  test("Explore loads its photos as they come into view", async ({ page }) => {
    await start(page);
    await screen(page, "athlete", "explore");
    const lazy = await page.evaluate(
      () =>
        [...document.querySelectorAll<HTMLImageElement>("#xgrid img")].filter(
          (i) => i.loading === "lazy",
        ).length,
    );
    expect(lazy).toBeGreaterThan(20);
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
  test("every screen has one heading, the coach chat included; an open slot is not a button; Send with nothing typed says so", async ({
    page,
  }) => {
    await start(page);
    for (const org of ["pau", "studio"] as const)
      for (const [role, tab] of ALL_SCREENS) {
        await screen(page, role, tab, org);
        expect(await page.locator("#view h1").count(), `${org}/${role}/${tab}`).toBe(1);
      }
    await screen(page, "coach", "week", "pau");
    const slot = page.locator('#coach-week [data-kind="open"]');
    expect(await slot.evaluate((el) => [el.tagName, el.classList.contains("quiet")])).toEqual([
      "DIV",
      true,
    ]);
    expect(await slot.locator(".strong").evaluate((el) => getComputedStyle(el).fontWeight)).toBe(
      "400",
    );
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
