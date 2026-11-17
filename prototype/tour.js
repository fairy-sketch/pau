"use strict";
/* PATH clickable demo: "Start demo" (step 6). It resets the demo data and walks through the investor story in six steps:
   the athlete books by chat, the coach sees it, the admin sees how the club is doing. The guide sits in its own row above
   the tab bar and never covers the screen. Every step can be done by hand; "Next" does it for you if you would rather watch. */
const tourBooking = () => S.bookings.find((b) => b.source === "ai_coach" && b.status === "confirmed") || null;
const tourCard = () => Object.values(S.props).find((p) => p.status === "pending" && /^book:/.test(p.intent || "")) || null;
const TOUR = [
  { who: "Athlete", enter: () => { S.role = "athlete"; S.org = "pau"; S.tab.athlete = "coach"; },
    text: () => `You are ${S.me.name}, a member of ${ORGS.pau.name}. Ask your coach for your usual session: tap "Book my usual".`,
    done: () => !!tourCard() || !!tourBooking(), auto: () => ask("Book my usual") },
  { who: "Athlete", enter: () => { S.role = "athlete"; S.tab.athlete = "coach"; },
    text: () => "The coach found your usual session and asks first. Nothing is booked until you tap Confirm.",
    done: () => !!tourBooking(), auto: () => { const p = tourCard(); if (p) confirmProposal(p.id, true); } },
  { who: "Athlete", enter: () => { S.role = "athlete"; S.tab.athlete = "path"; dash().planOpen = true; }, // the whole week, so the booked day shows
    text: () => { const b = tourBooking(), s = b && S.sessions[b.sid]; return s ? `Booked: ${offOf(s).name}, ${fDay(s.start)} ${fTime(s.start)}. Your plan shows it on that day and your pass counts it.` : "Path is the athlete's home: the goal, the next step, the plan."; } },
  { who: "Coach", enter: () => { const b = tourBooking(); S.role = "coach"; S.org = "pau"; S.tab.coach = "week"; dash().sess = b && coachOf(S.sessions[b.sid]) === coachMe() ? b.sid : null; },
    text: () => `Now you are ${ORGS.pau.me.coach}. ${S.me.name.split(" ")[0]} is on the session she just booked, with only what she shares. The plan for the session is at the top.` },
  { who: "Coach", enter: () => { S.role = "coach"; dash().sess = null; S.tab.coach = "today"; },
    text: () => "The coach's day starts with who needs what. PATH drafts the briefing, the recap and plan changes; nothing reaches an athlete before the coach approves it." },
  { who: "Admin", enter: () => { S.role = "admin"; S.org = "pau"; S.tab.admin = "dash"; if (S.adm) S.adm.view = null; },
    text: () => `Now you run the club. One sentence says how it is doing, four numbers stand against last month, and "Needs you" leads to what waits. That was the tour: everything is yours to try.` },
];
const tourStep = () => (S.tour ? TOUR[S.tour.step] : null);
function tourGo(i) {
  if (i >= TOUR.length) { S.tour = null; UI.toast = "That was the tour. Start demo runs it again."; return; }
  S.tour = { step: i }; S.rosterSid = null; UI.sheet = null; TOUR[i].enter(); lastKey = "";
}
/* Before every draw: a step that the person did by hand moves on by itself. */
function tourTick() { const st = tourStep(); if (st && st.done && st.done() && S.tour.step < TOUR.length - 1) tourGo(S.tour.step + 1); }
function vGuide() {
  const st = tourStep(); if (!st) return "";
  const i = S.tour.step, last = i === TOUR.length - 1, waits = st.done && !st.done();
  return `<div class="guide" id="guide" role="status" aria-live="polite"><div class="eyebrow">Demo · ${i + 1} of ${TOUR.length} · ${st.who}</div><p id="guide-text">${esc(st.text())}</p><div class="btns"><button class="btn sm" data-a="tour-next">${last ? "Finish" : waits ? "Do it for me" : "Next"}</button>${last ? "" : `<button class="btn sm ghost" data-a="tour-end">End tour</button>`}</div></div>`;
}
const TOUR_ACT = {
  "tour-start": () => { resetDemo(); UI.toast = ""; tourGo(0); },
  "tour-next": () => { const st = tourStep(); if (!st) return; if (st.auto && st.done && !st.done()) st.auto(); tourGo(S.tour.step + 1); },
  "tour-end": () => { S.tour = null; UI.toast = "Tour ended. The demo stays as it is."; },
};
