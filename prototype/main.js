"use strict";
/* PATH clickable demo, part 4 of 4: the shell. Top bar, tabs, actions, events, start-up. */

const TABS = { athlete: [["path", "Path", "flag"], ["coach", "Coach", "chat"], ["log", "Log", "plus"], ["week", "Week", "cal"], ["me", "Me", "user"]], coach: [["today", "Today", "clock"], ["athletes", "Athletes", "users"], ["review", "Review", "check"], ["alerts", "Alerts", "bell"]], admin: [["dash", "Home", "home"], ["sched", "Schedule", "cal"], ["members", "Members", "users"], ["products", "Products", "tag"], ["money", "Money", "card"]] };
let lastKey = "", swipeClickGuard = -1e9;
function render() {
  ensureSessions(); sweep(); sweepProposals(); sweepOffers(); runSeries();
  const app = document.getElementById("app"), tab = S.tab[S.role], key = S.role + tab + S.org + (S.rosterSid || "") + (tab === "explore" ? S.explore.open || "" : ""), old = document.getElementById("view"), top = old && key === lastKey ? old.scrollTop : 0;
  const body = S.role === "athlete" ? { path: vPath, coach: vCoachChat, log: vLog, week: vWeek, me: vMe, explore: vExplore }[tab]() : S.role === "coach" ? vCoach() : vAdmin();
  const badge = S.role === "coach" ? S.alerts.filter((a) => a.status === "open" && (a.info || shares("alerts.pain"))).length : 0;
  app.className = S.role === "admin" ? "wide" : "";
  app.innerHTML = `<header class="top"><button class="name" data-a="home" aria-label="PATH, back to your start page">PATH</button>
      <select id="role" aria-label="View as">${[["athlete", "Athlete"], ["coach", "Coach"], ["admin", "Admin"]].map(([v, l]) => `<option value="${v}" ${S.role === v ? "selected" : ""}>${l}</option>`).join("")}</select>
      <select id="org" aria-label="Club">${Object.entries(ORGS).map(([v, o]) => `<option value="${v}" ${S.org === v ? "selected" : ""}>${o.name}</option>`).join("")}</select>
      ${S.role === "athlete" ? `<button class="x explorebtn" data-a="tab" data-v="explore" aria-label="Explore: try something new" aria-pressed="${tab === "explore"}">${I(P.compass, 22)}</button>` : ""}</header>
    ${S.banner ? `<div class="banner"><span>Made-up data, saved on this device.</span><button class="resetbtn ${UI.resetArmed ? "armed" : ""}" data-a="reset">${UI.resetArmed ? "Tap again" : "Reset demo"}</button>${xBtn("hide-banner", "Hide this notice. Reset demo stays under Me.")}</div>` : ""}
    <main id="view" tabindex="0">${body}</main>
    ${UI.toast ? `<div class="toast" role="status"><span>${esc(UI.toast)}</span>${xBtn("hide-toast", "Dismiss message")}</div>` : ""}
    <nav class="tabs" aria-label="Sections">${TABS[S.role].map(([v, l, ic]) => `<button data-a="tab" data-v="${v}" aria-label="${l}${v === "alerts" && badge ? ` (${badge}), ${badge} open` : ""}" ${tab === v ? 'aria-current="page"' : ""}><span class="ic">${I(P[ic])}</span>${l}${v === "alerts" && badge ? ` (${badge})` : ""}</button>`).join("")}</nav>${vSheet()}`;
  const view = document.getElementById("view"); view.scrollTop = tab === "coach" && S.role === "athlete" ? view.scrollHeight : top; lastKey = key;
  if (UI.sheet) { const b = app.querySelector(".sheet .btn"); if (b) b.focus(); }
  flowLine(); save();
}

const ACT = {
  /* The logo always leads to the start page of the role you are in. */
  home: () => { S.tab[S.role] = { athlete: "path", coach: "today", admin: "dash" }[S.role]; S.rosterSid = null; S.explore.open = null; UI.sheet = null; lastKey = ""; },
  tab: (v) => { S.tab[S.role] = v; S.rosterSid = null; if (v === "explore") S.explore.open = null; }, day: (v) => { S.day = v; }, logtab: (v) => { S.logTab = v; },
  /* Explore */
  "prov-open": (v) => { S.explore.open = v || null; S.tab.athlete = "explore"; UI.sheet = null; }, xkind: (v) => { S.explore.kind = S.explore.kind === v ? "all" : v; S.explore.pin = null; },
  "plan-try": (v) => { UI.toast = tryPlan(v).msg + " Next: book a session with them."; }, "plan-drop": (v) => { UI.toast = dropPlan(v).msg; },
  xview: (v) => { S.explore.view = v; }, xgroup: (v) => { S.explore.group = v; S.explore.pin = null; }, xflag: (v) => { S.explore[v] = !S.explore[v]; S.explore.pin = null; },
  xclear: () => { Object.assign(S.explore, { kind: "all", group: "all", free: false, beginners: false, near: false, pin: null }); }, pin: (v) => { S.explore.pin = S.explore.pin === v ? null : v; },
  "offer-open": (v) => { UI.sheet = { type: "offer", id: v }; },
  "offer-signup": (v) => { const o = offerById(v); if (o.price) UI.sheet = { type: "pay", what: `${o.title}, ${o.club}`, amount: o.price, explore: v, then: true }; else { UI.toast = signUp(v).msg; UI.sheet = null; } },
  "offer-drop": (v) => { UI.toast = dropSignup(v).msg; UI.sheet = null; },
  week: (v) => { shiftWeek(Number(v)); }, fcat: (v) => { S.filter.cat = v; }, fmine: () => { S.filter.mine = !S.filter.mine; }, fclear: () => { S.filter = { cat: "all", mine: false }; },
  /* Out of credits, in context: buying opens the test checkout and books the session when it goes through. */
  offer: (v) => {
    const [kind, sid] = v.split("|"), s = S.sessions[sid];
    if (kind === "waitlist") { UI.toast = book(sid, "app", undefined, { wait: true }).msg; UI.sheet = null; return; }
    const o = offersFor(s).find((x) => x.kind === kind); if (!o) { UI.toast = "That is no longer needed: your pass covers this session now."; return; }
    UI.sheet = { type: "pay", what: o.what, amount: o.amount, note: o.note || "", buy: kind, org: s.org, then: sid };
  },
  "offer-accept": (v) => { UI.toast = acceptOffer(v).msg; UI.sheet = null; }, "offer-pass": (v) => { UI.toast = declineOffer(v).msg; UI.sheet = null; },
  "series-preview": (v) => { UI.sheet = { type: "series", sid: v }; },
  "series-start": (v) => { const s = S.sessions[v], se = createSeries(s.org, s.off, s.start.getDay(), "sheet"); UI.sheet = null; UI.toast = `${seriesLabel(se)} is on. ${seriesSummary(se)}. Pause it any time under Your bookings.`; },
  "series-pause": (v) => { UI.toast = pauseSeries(Number(v)).msg; }, "series-end": (v) => { UI.toast = endSeries(Number(v)).msg; },
  "wl-mode": (v) => { const set = S.settings[v]; set.waitlistMode = set.waitlistMode === "offer" ? "auto" : "offer"; S.audit.unshift({ what: `Waitlist at ${ORGS[v].name}: ${set.waitlistMode === "offer" ? `freed spots are offered with a ${set.offerHoldMin / 60} h hold` : "the next person is booked automatically"}`, at: now() }); UI.toast = set.waitlistMode === "offer" ? `From now on a freed spot is held for the next person for ${set.offerHoldMin / 60} h.` : "From now on the next person on the waitlist is booked automatically."; },
  sheet: (v) => { UI.sheet = { type: "session", sid: v }; }, "close-btn": () => { UI.sheet = null; },
  book: (v) => { UI.toast = book(v, "app").msg; UI.sheet = null; }, cancel: (v) => { UI.toast = cancel(Number(v)).msg; UI.sheet = null; }, leave: (v) => { UI.toast = leaveWait(v).msg; UI.sheet = null; },
  "go-invoices": () => { S.org = "pau"; S.tab.athlete = "me"; setTimeout(() => { const el = document.getElementById("invoices"); if (el) el.scrollIntoView(); }, 0); },
  "review-plan": () => { S.planNews = false; const r = applyDraft(currentDraft()); UI.toast = `Your plan is now "${S.plan.title}", approved by Coach Sara. ${r.applied} upcoming ${r.applied === 1 ? "day" : "days"} changed${r.skipped ? `, ${r.skipped} left alone because ${r.skipped === 1 ? "it was" : "they were"} already under way or done` : ""}. Nothing in the past was touched.`; },
  "clear-pain": () => { S.entries.forEach((e) => { if (e.pain) e.cleared = true; }); UI.toast = "Pain flag cleared. Hard sessions can be suggested again."; },
  logit: (v) => { const s = S.sessions[v], o = offOf(s); S.form = { rpe: 0, pain: false, sid: v, title: o.name, dur: o.dur }; S.logTab = "log"; S.tab.athlete = "log"; UI.sheet = null; },
  "log-clear": () => { S.form = { rpe: 0, pain: false }; },
  rpe: (v) => { S.form.rpe = Number(v); }, pain: () => { S.form.pain = !S.form.pain; if (!S.form.pain) delete S.form.painWhere; }, area: (v) => { S.form.painWhere = v; },
  ask: (v) => ask(v), "prop-yes": (v) => { confirmProposal(Number(v), true); }, "prop-no": (v) => { confirmProposal(Number(v), false); }, "prop-toggle": (v) => { const [id, i] = v.split("|").map(Number); toggleAct(id, i); },
  consent: (v) => { const [o, k] = v.split("|"); if (k !== "profile.basic") { S.consent[o][k] = !S.consent[o][k]; UI.toast = `${ORGS[o].name} ${S.consent[o][k] ? "can now see" : "no longer sees"} this. The change applies immediately.`; } },
  forget: (v) => { S.memory = S.memory.filter((m) => m.id !== Number(v)); UI.toast = "Deleted. Your coach no longer uses it."; },
  buy: () => { const p = ORGS[S.org].products.find((x) => x.buy); UI.sheet = { type: "pay", what: p.name, amount: p.price, credits: p.buy }; },
  "pay-inv": (v) => { const i = S.invoices.find((x) => x.id === v); UI.sheet = { type: "pay", what: i.what, amount: i.amount, inv: v }; },
  "pay-do": (v) => {
    const p = UI.sheet; let after = "";
    if (p.inv) S.invoices.find((x) => x.id === p.inv).status = "paid";
    else if (p.explore) after = " " + signUp(p.explore).msg;
    else if (p.buy) { purchase(p.buy, p.org); if (p.then) { const w = myWait(p.then); after = " " + (w && w.offer ? acceptOffer(p.then) : book(p.then, "app")).msg; } }
    else S.ledger.push({ pass: passOf(S.org).id, delta: p.credits, kind: "grant", reason: `Bought ${p.what}`, at: now() });
    UI.toast = `Test payment by ${v === "twint" ? "TWINT" : "card"} succeeded: ${chf(p.amount)}. No real money moved.${after}`; UI.sheet = null;
  },
  "hide-banner": () => { S.banner = false; }, "hide-toast": () => { UI.toast = ""; },
  /* Two taps, so nobody wipes their demo by accident. */
  reset: () => { if (!UI.resetArmed) { UI.resetArmed = true; UI.toast = "This erases everything you did in the demo. Tap Reset again to confirm."; return "armed"; } resetDemo(); UI.sheet = null; UI.toast = "Demo reset. Everything is back to the start."; },
  roster: (v) => { S.rosterSid = v || null; },
  mark: (v) => { const [sid, i, st] = v.split("|"), r = rosterRows(S.sessions[sid])[Number(i)]; if (r) markAttendance(sid, r.name, st); },
  "all-present": (v) => { for (const r of rosterRows(S.sessions[v])) markAttendance(v, r.name, "present"); UI.toast = "Everyone on the roster marked present."; },
  draft: (v) => { if (v === "approved") { S.draftApproved = guardDraft(RAW_DRAFT); S.planNews = true; } S.draftStatus = v; UI.toast = v === "approved" ? `Approved. ${S.me.name} now sees it as the next step.` : "Rejected. The athlete keeps the current plan."; },
  ack: (v) => { S.alerts.find((a) => a.id === Number(v)).status = "seen"; },
  free: (v) => { UI.toast = freeSpot(v); }, "mark-paid": (v) => { S.invoices.find((x) => x.id === v).status = "paid"; S.audit.unshift({ what: `Marked invoice ${v} paid (bank transfer)`, at: now() }); UI.toast = "Invoice marked paid and recorded in the audit log."; },
};
document.addEventListener("click", (e) => {
  const bg = e.target.classList && e.target.classList.contains("sheetbg");
  if (performance.now() - swipeClickGuard < 350) return; // the tap that ends a swipe is not a tap on what was under the finger
  const el = e.target.closest("[data-a]"); if (!el) return;
  if (el.dataset.a === "close") { if (!bg) return; UI.sheet = null; return render(); }
  if (el.disabled || !ACT[el.dataset.a]) return;
  const keep = el.dataset.a === "hide-banner" ? UI.toast : ""; UI.toast = keep;
  const out = ACT[el.dataset.a](el.dataset.v); if (out !== "armed") UI.resetArmed = false;
  render();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && UI.sheet) { UI.sheet = null; render(); } });
document.addEventListener("input", (e) => { const d = e.target.dataset && e.target.dataset.d; if (d) { S.form[d] = e.target.value; save(); } });
/* Switching club or role keeps the tab you are on. Only a roster closes, because it belongs to one club's session. */
document.addEventListener("change", (e) => {
  if (e.target.id === "role") { S.role = e.target.value; S.rosterSid = null; UI.toast = ""; UI.sheet = null; render(); }
  if (e.target.id === "org") { S.org = e.target.value; S.rosterSid = null; S.filter.cat = "all"; UI.toast = ""; UI.sheet = null; render(); } // kinds of training differ per club; "My pass only" stays
});
function submitLog() {
  const d = S.form, title = (document.getElementById("log-title").value || "").trim(), dur = Number(document.getElementById("log-dur").value);
  if (!title || !dur) return (UI.toast = "Add what you did and how many minutes.");
  if (!d.rpe) return (UI.toast = "Tap how hard it was (RPE 1 to 10).");
  if (d.pain && !d.painWhere) { setTimeout(() => { const el = document.getElementById("pain"); if (el) el.scrollIntoView({ block: "center" }); }, 0); return (UI.toast = "Choose where it hurt, or \"Not sure\". A pain flag needs a location."); }
  const forS = d.sid ? S.sessions[d.sid] : null;
  const e2 = { id: S.seq++, at: forS ? endOf(forS) : now(), sid: d.sid || null, title, dur, rpe: d.rpe, dist: d.dist || "", notes: d.notes || "", comments: [], pain: !!d.pain, painWhere: d.pain ? d.painWhere : "", painLevel: d.pain ? Math.max(0, Math.min(10, Number(d.painLevel || 3))) : 0 };
  S.entries.push(e2); S.entries.sort((a, b) => b.at - a.at);
  let msg = `Saved: ${title}, ${dur} min, RPE ${d.rpe}.`;
  const val = Number(d.value), pb = d.metric && val > 0 && S.pbs.find((p) => p.metric === d.metric);
  if (pb && (pb.better === "lower" ? val < pb.value : val > pb.value)) { msg += ` New personal best: ${pb.metric} ${val} ${pb.unit} (was ${pb.value}).`; pb.value = val; pb.at = now(); pb.isNew = true; }
  if (e2.pain) {
    if (S.consent.pau["alerts.pain"]) { S.alerts.push({ id: S.seq++, kind: `Pain flag: ${e2.painWhere}, level ${e2.painLevel}`, at: now(), status: "open" }); msg += " Coach Sara was alerted."; } else msg += " The pain flag stays private.";
    if (e2.painLevel >= 7) msg += " That is a high level: please see a doctor or physio.";
  }
  UI.lineFrom = { stage: S.stage, inSt: S.stageSessions }; S.stageSessions++;
  if (S.stageSessions >= PER && S.stage < S.stages.length - 1) { msg += ` Stage complete: ${S.stages[S.stage]}. Next up: ${S.stages[S.stage + 1]}.`; S.stage++; S.stageSessions = 0; }
  S.tab.athlete = "path"; UI.toast = msg; S.form = { rpe: 0, pain: false };
}
document.addEventListener("submit", (e) => {
  e.preventDefault(); const f = e.target.dataset.f; UI.toast = ""; UI.resetArmed = false;
  if (f === "chat") { const v = document.getElementById("chat-input").value.trim(); if (v) ask(v); }
  if (f === "log") submitLog();
  if (f === "walkin") UI.toast = addWalkin(e.target.dataset.id, document.getElementById("walkin-name").value).msg;
  if (f === "comment") { const id = Number(e.target.dataset.id), inp = document.getElementById("c-" + id), v = inp.value.trim(); if (v) { S.entries.find((x) => x.id === id).comments.push({ by: "Coach Sara", text: v }); UI.toast = "Comment sent. The athlete sees it in their log."; } }
  if (f === "adjust") { const n = Number(document.getElementById("adj-n").value), r = document.getElementById("adj-r").value.trim(); if (!r) UI.toast = "A reason is required for every credit change."; else if (!n) UI.toast = "Enter a change other than 0."; else { const p = passOf(S.org); S.ledger.push({ pass: p.id, delta: n, kind: "admin_adjust", reason: "Admin: " + r, at: now() }); S.audit.unshift({ what: `Adjusted ${S.me.name}'s credits by ${n > 0 ? "+" : ""}${n}: ${r}`, at: now() }); UI.toast = `Credits adjusted. New balance: ${passState(p).text}.`; } }
  render();
});
/* Hold to log. A plain tap only nudges; keyboard and reduced-motion users get a normal press. */
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
let holdTimer = null;
function releaseHold() {
  const btn = document.querySelector("[data-hold].holding"); if (!btn || !holdTimer) return;
  clearTimeout(holdTimer); holdTimer = null; btn.classList.remove("holding");
  const label = btn.querySelector("span"); label.textContent = "Keep holding to log";
  setTimeout(() => { if (label.isConnected) label.textContent = "Hold to log"; }, 1400);
}
document.addEventListener("pointerdown", (e) => {
  const btn = e.target.closest("[data-hold]"); if (!btn || calm) return;
  btn.classList.add("holding");
  holdTimer = setTimeout(() => { holdTimer = null; btn.classList.remove("holding"); btn.closest("form").requestSubmit(); }, 650);
});
document.addEventListener("pointerup", releaseHold);
document.addEventListener("pointercancel", releaseHold);
document.addEventListener("contextmenu", (e) => { if (e.target.closest("[data-hold]")) e.preventDefault(); });
document.addEventListener("click", (e) => { const btn = e.target.closest("[data-hold]"); if (btn && (e.detail === 0 || calm)) btn.closest("form").requestSubmit(); });

/* A confirm card that runs out while you are looking at it closes by itself. */
setInterval(() => { const a = sweepProposals(), b = sweepOffers(); if (a || b) render(); }, 20000);

/* Week: swipe left or right to change week. Vertical scrolling and the filter row keep working as usual. */
let swipe = null;
document.addEventListener("pointerdown", (e) => { swipe = e.target.closest("#weekpane") && !e.target.closest(".filters") ? { x: e.clientX, y: e.clientY } : null; });
document.addEventListener("pointerup", (e) => {
  if (!swipe) return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; swipe = null;
  if (Math.abs(dx) < 60 || Math.abs(dx) < 1.5 * Math.abs(dy)) return;
  if (shiftWeek(dx < 0 ? 1 : -1)) { swipeClickGuard = performance.now(); UI.toast = ""; render(); }
});
document.addEventListener("pointercancel", () => { swipe = null; });

/* For the tests and for poking around in the console. */
window.PATH_DEMO = {
  get state() { return S; }, ui: UI, ORGS, LOAD_LIMIT, CARD_TTL_MIN, STORE_KEY,
  render, seed, save, load, resetDemo, book, cancel, check, freeSpot, leaveWait, passState, passOf, stats, guard, guardDraft, currentDraft, RAW_DRAFT,
  ask, confirmProposal, toggleAct, runAct, planLocked, nextChangeable, applyDraft, shiftWeek, weekIndex,
  OFFERS, openOffers, exploreList, tryPlan, dropPlan, tryToday, providerOf, signUp, dropSignup, signedUp, offerStart, offerKm, offersFor, purchase, acceptOffer, declineOffer, sweepOffers, waitTotal, createSeries, previewSeries, pauseSeries, endSeries, runSeries, seriesRows, seriesSummary, findSeries, sweepProposals, parseWhen, parseOffering, rosterRows, rosterNames, addWalkin, markAttendance, memoryFor, upcomingBookings, sessList, myBooking, myWait, spots, nextStep,
};
if (!load()) seed();
render();
