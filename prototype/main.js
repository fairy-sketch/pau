"use strict";
/* PATH clickable demo, part 4 of 4: the shell. Top bar, tabs, actions, events, start-up. */

const TABS = { athlete: [["path", "Path", "flag"], ["week", "Week", "cal"], ["explore", "Explore", "compass"], ["coach", "Coach", "chat"], ["me", "Me", "user"]], coach: [["today", "Today", "clock"], ["week", "Week", "cal"], ["athletes", "Athletes", "users"], ["plans", "Plans", "plan"], ["review", "Review", "check"]], admin: [["dash", "Home", "home"], ["sched", "Schedule", "cal"], ["members", "Members", "users"], ["products", "Products", "tag"], ["money", "Money", "card"]] };
/* The wordmark in the header (D-2, L-9, B-22): PATH in Satoshi Black, 24 px, set tight, 16 px from the screen edge (B-23). */
const mono = (o) => esc(ORGS[o].name.trim()[0].toUpperCase());
/* Your colour (S-9): one accent, chosen by each person. All six sit at the same lightness as sage, so black text reads on every one. */
const ACCENTS = { sage: ["Sage", "#8e9a80"], rose: ["Rose", "#c99aa0"], sky: ["Sky", "#8a9fb5"], lavender: ["Lavender", "#a397bd"], sand: ["Sand", "#bfa27c"], clay: ["Clay", "#c4917a"] };
/* Your background (S-11): six very light grounds at one lightness, so the soft shadows and the grey text work on each. */
const GROUNDS = { stone: ["Stone", "#ecebe7"], blush: ["Blush", "#efe8e8"], mist: ["Mist", "#e6eaee"], lilac: ["Lilac", "#eae8ef"], sand: ["Sand", "#eee9e0"], mint: ["Mint", "#e7ece5"] };
let lastKey = "", swipeClickGuard = -1e9;
function render() {
  document.documentElement.style.setProperty("--accent", (ACCENTS[S.accent] || ACCENTS.sage)[1]);
  for (const v of ["--bg", "--surface", "--soft"]) document.documentElement.style.setProperty(v, (GROUNDS[S.ground] || GROUNDS.stone)[1]);
  const tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.content = (GROUNDS[S.ground] || GROUNDS.stone)[1]; // the phone's status bar takes the ground colour
  tourTick(); ensureSessions(); syncPlan(); sweepCancelled(); sweep(); sweepProposals(); sweepOffers(); runSeries();
  const had = focusKey(document.activeElement), hadSheet = !!document.querySelector(".sheet");
  const oldView = document.getElementById("view"), oldH = oldView ? oldView.clientHeight : 0, oldGap = oldView ? oldView.scrollHeight - oldView.scrollTop - oldH : 0; // where the keyboard was, before the screen is redrawn
  const app = document.getElementById("app"), tab = S.tab[S.role], key = S.role + tab + S.org + (S.ob ? "ob" + S.ob.step : "") + (S.tour ? "t" + S.tour.step : "") + (S.rosterSid || "") + ((S.dash && (S.dash.athlete || S.dash.planView || S.dash.sess)) || "") + ((S.role === "admin" && S.adm && S.adm.view) || "") + ((S.dash && S.dash.recap) || "") + (tab === "explore" ? S.explore.open || "" : ""), old = document.getElementById("view"), top = old && key === lastKey ? old.scrollTop : 0;
  const welcome = S.role === "athlete" && !!S.ob; // the first five minutes: three questions, nothing else on the screen
  const body = welcome ? vOnboarding() : S.role === "athlete" ? { path: vPath, coach: vCoachChat, log: vLog, week: vWeek, me: vMe, explore: vExplore }[tab]() : S.role === "coach" ? vCoach() : vAdmin();
  const badge = S.role === "coach" ? coachAlerts().filter((a) => a.status === "open").length : 0;
  app.className = S.role === "admin" ? "wide" : "";
  const behind = UI.sheet ? "inert" : ""; // with a sheet open, what is behind it can't be reached by keyboard or screen reader
  app.innerHTML = `<header class="top" ${behind}><button class="name" data-a="home" aria-label="PATH, back to your start page">PATH</button>
      <button class="clubbtn" data-a="clubs" data-org="${S.org}" aria-label="Settings: your clubs, colours and the demo view. You are at ${esc(ORGS[S.org].name)}" aria-haspopup="dialog"><span class="mono36" aria-hidden="true">${I(P.sliders, 20)}</span></button></header>
    <main id="view" tabindex="0" ${behind}>${body}</main>
    ${vGuide()}${UI.toast ? `<div class="toast" role="status"><span>${esc(UI.toast)}</span>${UI.undo ? `<button class="btn sm" data-a="undo">Undo</button>` : ""}${xBtn("hide-toast", "Dismiss message")}</div>` : ""}
    <nav class="tabs" aria-label="Sections" ${behind} ${welcome ? "hidden" : ""}>${TABS[S.role].map(([v, l, ic]) => `<button data-a="tab" data-v="${v}" aria-label="${l}${v === "alerts" && badge ? ` (${badge}), ${badge} open` : ""}" ${tab === v ? 'aria-current="page"' : ""}><span class="ic">${I(P[ic])}</span>${l}${v === "alerts" && badge ? ` (${badge})` : ""}</button>`).join("")}</nav>${vSheet()}`;
  /* A toast sits in its own row between the page and the tab bar, so it never lies on top of anything. That makes the page a little
     shorter. If the person was at the end of the page, the page stays at its end: the last line is still readable, above the toast. */
  const view = document.getElementById("view"), shrunk = key === lastKey && oldH ? Math.max(0, oldH - view.clientHeight) : 0;
  view.scrollTop = tab === "coach" && S.role === "athlete" ? view.scrollHeight : shrunk && oldGap < shrunk ? view.scrollHeight : top; lastKey = key;
  app.querySelectorAll("textarea.stext, textarea.grow").forEach((t) => { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }); // a session line grows with its text, never cut off
  let placed = false; // a screen that asks for the focus itself (a new line in a plan draft) gets it
  if (UI.focus != null) { const el = app.querySelector(`.srow[data-i="${UI.focus}"] .stext`); UI.focus = null; if (el) { el.focus(); placed = true; } }
  /* Keyboard focus (QA-09). A sheet takes the focus when it opens and gives it back to the control that opened it when it closes.
     Anything else that redraws the screen leaves the focus on the control the person was on. */
  const sheetEl = app.querySelector(".sheet");
  if (sheetEl) {
    sheetEl.setAttribute("tabindex", "-1");
    if (!hadSheet) UI.opener = had;
    const back = hadSheet && had && had.box === ".sheet" ? findFocus(had) : null;
    (back || app.querySelector(".sheet .btn") || sheetEl).focus({ preventScroll: true });
  } else if (!placed && (hadSheet || had)) {
    const to = findFocus(hadSheet ? UI.opener : had) || (hadSheet && UI.opener ? null : view);
    UI.opener = hadSheet ? null : UI.opener;
    if (to === view) view.classList.add("quiet-focus"); // the page takes the focus so the keyboard is not lost; it does not need a ring for that
    if (to) to.focus({ preventScroll: true });
  }
  /* One accent per screen (D-7): only the first primary button in the page, and in a sheet, keeps the accent. */
  for (const box of [view, app.querySelector(".sheet")]) if (box) [...box.querySelectorAll(".btn.acc")].slice(1).forEach((el) => el.classList.add("demoted"));
  loadPhotos(); flowLine(); syncHistory(); save();
}
/* Which control has the focus, in a form that survives a redraw: its id, or its action and value and which one of those it is. */
function focusKey(el) {
  if (!el || !el.closest || !el.closest("#app") || el.id === "view") return null;
  if (el.id) return { sel: "#" + CSS.escape(el.id), box: "", i: 0 };
  if (!el.dataset || !el.dataset.a) return null;
  const box = el.closest(".sheet") ? ".sheet" : el.closest("nav.tabs") ? "nav.tabs" : el.closest("header.top") ? "header.top" : "#view";
  const sel = `[data-a="${el.dataset.a}"]` + (el.dataset.v !== undefined ? `[data-v="${CSS.escape(el.dataset.v)}"]` : "");
  return { sel, box, i: Math.max(0, [...document.querySelectorAll(`${box} ${sel}`)].indexOf(el)) };
}
function findFocus(k) {
  if (!k) return null;
  const all = [...document.querySelectorAll(`${k.box} ${k.sel}`)], el = all[k.i] || all[0];
  return el && !el.disabled && !el.closest("[inert]") ? el : null;
}
/* Tab stays inside an open sheet (QA-09). */
document.addEventListener("keydown", (e) => {
  const sh = e.key === "Tab" && UI.sheet && document.querySelector(".sheet"); if (!sh) return;
  const f = [...sh.querySelectorAll("button:not([disabled]), a[href], input:not([disabled]), select, textarea, summary")].filter((el) => el.offsetParent !== null);
  const a = document.activeElement, first = f[0] || sh, last = f[f.length - 1] || sh;
  if (!sh.contains(a) || a === sh) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
  else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
});

/* ---------- Back (QA-10): the phone's Back button closes a sheet, then goes one screen back. ----------
   Every place you can be (role, club, tab, an open athlete, plan, session, provider or sheet) is one entry in the browser's history. */
const navSnap = () => ({ role: S.role, org: S.org, tab: S.tab[S.role], roster: S.rosterSid || null, ath: (S.dash && S.dash.athlete) || null, plan: (S.dash && S.dash.planView) || null, sess: (S.dash && S.dash.sess) || null, open: S.explore.open || null, adm: (S.adm && S.adm.view) || null, rc: (S.dash && S.dash.recap) || null, ob: S.ob ? S.ob.step : null,
  sheet: !UI.sheet ? null : ["session", "clubs", "offer", "planday", "series", "asess", "aadd", "amsg", "goal", "pt", "ptsell"].includes(UI.sheet.type) ? UI.sheet : { type: "other" } }); // a checkout is never reopened by Back or Forward
let navKey = null, navFromPop = false;
function syncHistory() {
  const snap = navSnap(), key = JSON.stringify(snap); if (key === navKey) return;
  try { if (navKey === null || navFromPop) history.replaceState(snap, ""); else history.pushState(snap, ""); } catch (e) { /* no history here (a sandboxed frame): the app works as before */ }
  navKey = key; navFromPop = false;
}
window.addEventListener("popstate", (e) => {
  const n = e.state; if (!n || !n.role) return;
  S.role = n.role; S.org = n.org; S.tab[n.role] = n.tab; S.rosterSid = n.roster && S.sessions[n.roster] ? n.roster : null; S.explore.open = n.open;
  if (S.dash || n.ath || n.plan || n.sess) Object.assign(dash(), { athlete: n.ath, planView: n.plan, sess: n.sess });
  if (S.adm || n.adm) adm().view = n.adm || null;
  if (S.dash) S.dash.recap = n.rc || null;
  if (S.ob) { if (n.ob) S.ob.step = n.ob; else S.ob = null; } // Back from the first question leaves the welcome
  UI.sheet = n.sheet && n.sheet.type !== "other" && (!n.sheet.sid || S.sessions[n.sheet.sid]) ? n.sheet : null; UI.toast = ""; UI.undo = null;
  navFromPop = true; lastKey = ""; render();
});

const ACT = {
  /* The logo always leads to the start page of the role you are in. */
  home: () => { S.tab[S.role] = { athlete: "path", coach: "today", admin: "dash" }[S.role]; S.rosterSid = null; S.explore.open = null; UI.sheet = null; lastKey = ""; },
  clubs: () => { UI.sheet = { type: "clubs" }; }, accent: (v) => { if (ACCENTS[v]) S.accent = v; }, ground: (v) => { if (GROUNDS[v]) S.ground = v; },
  org: (v) => { S.org = v; S.rosterSid = null; S.filter.cat = "all"; UI.toast = ""; UI.sheet = null; }, // kinds of training differ per club; "My pass only" stays
  role: (v) => { S.role = v; S.rosterSid = null; UI.toast = ""; UI.sheet = null; },
  tab: (v) => { S.tab[S.role] = v; S.rosterSid = null; if (v === "explore") S.explore.open = null; if (v === "log" && S.role === "athlete" && S.form.pristine && !S.form.editId) S.form = newForm(); }, day: (v) => { S.day = v; }, logtab: (v) => { S.logTab = v; },
  /* Explore */
  "prov-open": (v) => { S.explore.open = v || null; S.tab.athlete = "explore"; UI.sheet = null; }, xkind: (v) => { S.explore.kind = v; if (S.explore.group !== "all" && !disciplines(v).includes(S.explore.group)) S.explore.group = "all"; }, // the discipline row follows the "who"; a choice that no longer exists falls back to All
  "plan-try": (v) => { UI.toast = tryPlan(v).msg + " Next: book a session with them."; }, "plan-drop": (v) => { UI.toast = dropPlan(v).msg; },
  xview: (v) => { S.explore.view = v; }, xgroup: (v) => { S.explore.group = v; S.explore.pin = null; }, xflag: (v) => { S.explore[v] = !S.explore[v]; S.explore.pin = null; },
  xclear: () => { Object.assign(S.explore, { kind: "all", group: "all", free: false, beginners: false, near: false, pin: null }); }, pin: (v) => { S.explore.pin = S.explore.pin === v ? null : v; },
  "offer-open": (v) => { UI.sheet = { type: "offer", id: v }; },
  "offer-signup": (v) => { const o = offerById(v); if (o.price) UI.sheet = { type: "pay", what: `${o.title}, ${o.club}`, amount: o.price, explore: v, then: true }; else { UI.toast = signUp(v).msg; UI.sheet = null; } },
  "offer-wait": (v) => { UI.toast = signUp(v, undefined, { wait: true }).msg; UI.sheet = null; },
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
  "wl-mode": (v) => { const set = S.settings[v]; set.waitlistMode = set.waitlistMode === "offer" ? "auto" : "offer"; S.audit.unshift({ org: v, what: `Waitlist at ${ORGS[v].name}: ${set.waitlistMode === "offer" ? `freed spots are offered with a ${set.offerHoldMin / 60} h hold` : "the next person is booked automatically"}`, at: now() }); UI.toast = set.waitlistMode === "offer" ? `From now on a freed spot is held for the next person for ${set.offerHoldMin / 60} h.` : "From now on the next person on the waitlist is booked automatically."; },
  sheet: (v) => { UI.sheet = { type: "session", sid: v }; }, "close-btn": () => { UI.sheet = null; },
  book: (v) => { UI.toast = book(v, "app").msg; UI.sheet = null; }, cancel: (v) => { const r = cancel(Number(v)); UI.toast = r.msg; UI.sheet = null; if (r.ok && canUndoCancel(S.bookings.find((b) => b.id === r.bid))) return (UI.undo = { cancel: r.bid }), "undo"; }, leave: (v) => { UI.toast = leaveWait(v).msg; UI.sheet = null; },
  "go-invoices": () => { S.org = "pau"; S.tab.athlete = "me"; setTimeout(() => { const el = document.getElementById("invoices"); if (el) el.scrollIntoView(); }, 0); },
  /* A session the club cancelled: "Find another session" opens Week on that day, at that club. */
  "notice-ok": (v) => { const n = (S.notices || []).find((x) => x.id === Number(v)); if (!n) return; n.seen = true; const s = S.sessions[n.sid]; S.org = s.org; S.tab.athlete = "week"; S.filter = { cat: "all", mine: false }; if (s.start < addDays(monday(today()), 7 * WEEKS)) S.day = ymd(s.start); },
  renew: (v) => { const p = S.passes.find((x) => x.id === v) || passOf(S.org), r = p && renewalOf(p); if (r) UI.sheet = { type: "pay", what: `${p.name}, ${r.season.name}`, amount: r.price, note: `Valid until ${fDate(r.season.end)}.`, buy: "renew", org: p.org }; },
  "review-plan": () => { S.planNews = false; const r = applyDraft(currentDraft()); UI.toast = `Coach Sara approved "${currentDraft().title}": ${r.applied} upcoming ${r.applied === 1 ? "day" : "days"} of your plan changed${r.skipped ? `, ${r.skipped} left alone because ${r.skipped === 1 ? "it was" : "they were"} already under way or done` : ""}. Nothing in the past was touched.`; },
  "clear-pain": () => { S.entries.forEach((e) => { if (e.pain) e.cleared = true; }); UI.toast = "Pain flag cleared. Hard sessions can be suggested again."; },
  logit: (v) => { S.form = newForm(v); S.logTab = "log"; S.tab.athlete = "log"; UI.sheet = null; },
  "log-clear": () => { S.form = { rpe: 0, pain: false, title: "", dur: "" }; },
  more: () => { const f = S.form; f.more = !(f.more || f.pain || f.dist || f.metric || f.notes); if (!f.more) Object.assign(f, { pain: false, dist: "", metric: "", value: "", notes: "" }), delete f.painWhere; },
  rpe: (v) => { S.form.rpe = Number(v); touch("rpe"); }, pain: () => { S.form.pain = !S.form.pain; S.form.more = true; if (!S.form.pain) delete S.form.painWhere; touch("pain"); }, area: (v) => { S.form.painWhere = v; touch("pain"); },
  /* Edit or delete an entry. Both can be undone from the toast. */
  "log-edit": (v) => { const e = S.entries.find((x) => x.id === Number(v)); if (!e) return; S.form = { editId: e.id, sid: e.sid || null, title: e.title, dur: String(e.dur), rpe: e.rpe, dist: e.dist || "", notes: e.notes || "", pain: !!e.pain, painWhere: e.painWhere || undefined, painLevel: e.painLevel || 3 }; S.logTab = "log"; S.tab.athlete = "log"; lastKey = ""; },
  "log-delete": (v) => { const e = S.entries.find((x) => x.id === Number(v)); if (!e) return; const snap = logSnapshot(), form = structuredClone(S.form); S.entries = S.entries.filter((x) => x !== e); S.stageSessions = Math.max(0, S.stageSessions - 1); S.form = { rpe: 0, pain: false, title: "", dur: "" }; UI.toast = `Deleted: ${e.title}, ${fDay(e.at)}.`; return (UI.undo = { snap, form }), "undo"; },
  undo: () => { const u = UI.undo; if (!u) return; if (u.cancel) { UI.toast = undoCancel(u.cancel).msg; return; } Object.assign(S, u.snap); S.form = u.form; delete S.form.errors; S.tab.athlete = "log"; S.logTab = "log"; UI.toast = "Undone. Your entry is back in the form, nothing was lost."; },
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
    else purchase("pack", S.org);
    UI.toast = `Test payment by ${v === "twint" ? "TWINT" : "card"} succeeded: ${chf(p.amount)}. No real money moved.${after}`; UI.sheet = null;
  },
  "hide-banner": () => { S.banner = false; }, "hide-toast": () => { UI.toast = ""; },
  /* Two taps, so nobody wipes their demo by accident. */
  reset: () => { if (!UI.resetArmed) { UI.resetArmed = true; UI.toast = "This erases everything you did in the demo. Tap Reset again to confirm."; return "armed"; } resetDemo(); UI.sheet = null; UI.toast = "Demo reset. Everything is back to the start."; },
  roster: (v) => { S.rosterSid = v || null; if (S.dash) Object.assign(S.dash, { recap: null, noteFor: null }); },
  mark: (v) => { const [sid, i, st] = v.split("|"), r = rosterRows(S.sessions[sid])[Number(i)]; if (r) markAttendance(sid, r.name, st); },
  "all-present": (v) => { for (const r of rosterRows(S.sessions[v])) markAttendance(v, r.name, "present"); UI.toast = "Everyone on the roster marked present."; },
  draft: (v) => { if (v === "approved") { S.draftApproved = guardDraft(RAW_DRAFT); S.planNews = true; } S.draftStatus = v; UI.toast = v === "approved" ? `Approved. ${S.me.name} now sees it as the next step.` : "Rejected. The athlete keeps the current plan."; },
  ack: (v) => { if (String(v)[0] === "e") { const e = S.entries.find((x) => x.id === Number(String(v).slice(1))); if (e) e.seenByCoach = true; } else S.alerts.find((a) => a.id === Number(v)).status = "seen"; },
  free: (v) => { UI.toast = freeSpot(v); }, "mark-paid": (v) => { S.invoices.find((x) => x.id === v).status = "paid"; S.audit.unshift({ org: S.invoices.find((x) => x.id === v).org, what: `Marked invoice ${v} paid (bank transfer)`, at: now() }); UI.toast = "Invoice marked paid and recorded in the audit log."; },
};
document.addEventListener("click", (e) => {
  const bg = e.target.classList && e.target.classList.contains("sheetbg");
  if (performance.now() - swipeClickGuard < 350) return; // the tap that ends a swipe is not a tap on what was under the finger
  const el = e.target.closest("[data-a]"); if (!el) return;
  if (el.dataset.a === "close") { if (!bg) return; UI.sheet = null; return render(); }
  if (el.disabled || !ACT[el.dataset.a]) return;
  const keep = el.dataset.a === "hide-banner" ? UI.toast : ""; UI.toast = keep;
  const out = ACT[el.dataset.a](el.dataset.v); if (out !== "armed") UI.resetArmed = false;
  if (out !== "undo") UI.undo = null; // Undo is offered once, right after the change
  render();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && UI.sheet) { UI.sheet = null; render(); } });
/* A line that grows with what is typed into it, so nothing is ever cut off. */
document.addEventListener("input", (e) => { const t = e.target; if (t.classList && t.classList.contains("grow")) { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; } });
/* Typing in the log form is kept as typed. An inline error goes away as soon as its field is touched. */
function touch(k) { S.form.pristine = false; if (S.form.errors) delete S.form.errors[k]; }
document.addEventListener("input", (e) => {
  const d = e.target.dataset && e.target.dataset.d; if (!d) return;
  S.form[d] = e.target.value; touch(d);
  const msg = document.getElementById("err-" + d); if (msg) { msg.remove(); e.target.removeAttribute("aria-invalid"); }
  save();
});
const logSnapshot = () => structuredClone({ entries: S.entries, stage: S.stage, stageSessions: S.stageSessions, pbs: S.pbs, alerts: S.alerts });
/* Switching club or role keeps the tab you are on. Only a roster closes, because it belongs to one club's session. */
document.addEventListener("change", (e) => {
  if (e.target.id === "role") { S.role = e.target.value; S.rosterSid = null; UI.toast = ""; UI.sheet = null; render(); }
  if (e.target.id === "org") { S.org = e.target.value; S.rosterSid = null; S.filter.cat = "all"; UI.toast = ""; UI.sheet = null; render(); } // kinds of training differ per club; "My pass only" stays
});
/* Save. Only the effort is required when the form was filled from a session; nothing is refilled after a failed save. */
function submitLog() {
  const d = S.form, errors = {};
  for (const el of document.querySelectorAll('form[data-f="log"] [data-d]')) d[el.dataset.d] = el.value;
  const title = String(d.title || "").trim().slice(0, 80), dur = Number(d.dur);
  if (!title) errors.title = "Say what you did.";
  if (!(dur > 0)) errors.dur = "Add how many minutes it took.";
  else if (dur > 600) errors.dur = "That is more than 10 hours. Check the minutes.";
  if (!d.rpe) errors.rpe = "Tap how hard it was, from 1 to 10.";
  if (d.pain && !d.painWhere) errors.pain = 'Choose where it hurt, or "Not sure". A pain flag needs a location.';
  d.pristine = false;
  if (Object.keys(errors).length) { d.errors = errors; setTimeout(() => { const el = document.querySelector(".err"); if (el) el.scrollIntoView({ block: "center" }); }, 0); return; }
  const snap = logSnapshot(), form = structuredClone(d);
  const fields = { title, dur, rpe: d.rpe, dist: d.dist || "", notes: d.notes || "", pain: !!d.pain, painWhere: d.pain ? d.painWhere : "", painLevel: d.pain ? Math.max(0, Math.min(10, Number(d.painLevel || 3))) : 0 };
  let msg;
  if (d.editId) {
    const e = S.entries.find((x) => x.id === d.editId); Object.assign(e, fields); if (!fields.pain) delete e.cleared;
    msg = `Updated: ${title}, ${dur} min, RPE ${d.rpe}.`;
  } else {
    const forS = d.sid ? S.sessions[d.sid] : null;
    const e2 = { id: S.seq++, at: forS ? endOf(forS) : now(), sid: d.sid || null, comments: [], ...fields };
    S.entries.push(e2); S.entries.sort((a, b) => b.at - a.at);
    msg = `Saved: ${title}, ${dur} min, RPE ${d.rpe}.`;
    const val = Number(d.value), pb = d.metric && val > 0 && S.pbs.find((p) => p.metric === d.metric);
    if (pb && (pb.better === "lower" ? val < pb.value : val > pb.value)) { msg += ` New personal best: ${pb.metric} ${val} ${pb.unit} (was ${pb.value}).`; pb.value = val; pb.at = now(); pb.isNew = true; }
    if (e2.pain) {
      msg += S.consent.pau["alerts.pain"] ? " Coach Sara was alerted." : " The pain flag stays private."; // the alert is read from the flag itself, so it follows every later change
      if (e2.painLevel >= 7) msg += " That is a high level: please see a doctor or physio.";
    }
    UI.lineFrom = { stage: S.stage, inSt: S.stageSessions }; S.stageSessions++;
    if (S.stageSessions >= PER && S.stage < S.stages.length - 1) { msg += ` Stage complete: ${S.stages[S.stage]}. Next up: ${S.stages[S.stage + 1]}.`; S.stage++; S.stageSessions = 0; }
    S.tab.athlete = "path";
  }
  UI.toast = msg; UI.undo = { snap, form }; S.form = { rpe: 0, pain: false, title: "", dur: "", pristine: true };
}
document.addEventListener("submit", (e) => {
  e.preventDefault(); const f = e.target.dataset.f;
  if (["cnote", "dcomment", "pgen", "ppaste", "predo", "snote", "recap", "rvedit", "obgoal", "goal", "ptbook"].includes(f) || ADMIN_FORMS.includes(f)) return; // the coach dashboard's own forms (dash.js) answer for themselves; clearing here wiped their confirmation
  UI.toast = ""; UI.resetArmed = false; UI.undo = null;
  if (f === "chat") { const v = document.getElementById("chat-input").value.trim(); if (v) ask(v); else UI.toast = "Type a message first, or tap one of the suggestions."; setTimeout(() => { const el = document.getElementById("chat-input"); if (el) el.focus(); }, 0); }
  if (f === "log") submitLog();
  if (f === "walkin") UI.toast = addWalkin(e.target.dataset.id, document.getElementById("walkin-name").value).msg;
  if (f === "comment") { const id = Number(e.target.dataset.id), inp = document.getElementById("c-" + id), v = inp.value.trim(); if (v) { S.entries.find((x) => x.id === id).comments.push({ by: coachMe(), text: v }); UI.toast = "Comment sent. The athlete sees it in their log."; } }
  if (f === "adjust") { const n = Number(document.getElementById("adj-n").value), r = document.getElementById("adj-r").value.trim(); if (!r) UI.toast = "A reason is required for every credit change."; else if (!n) UI.toast = "Enter a change other than 0."; else { const p = passOf(S.org); S.ledger.push({ pass: p.id, delta: n, kind: "admin_adjust", reason: "Admin: " + r, at: now() }); S.audit.unshift({ org: S.org, what: `Adjusted ${S.me.name}'s credits by ${n > 0 ? "+" : ""}${n}: ${r}`, at: now() }); UI.toast = `Credits adjusted. New balance: ${passState(p).text}.`; } }
  render();
});
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

/* The coach and club dashboard brings its own actions (dash.js). Leaving a tab or going home also leaves an open athlete. */
Object.assign(ACT, DASH_ACT, ADMIN_ACT, ONBOARD_ACT, TOUR_ACT);
for (const k of ["home", "tab"]) { const f = ACT[k]; ACT[k] = (v) => { const r = f(v); if (S.dash) Object.assign(S.dash, { athlete: null, planView: null, pdraft: null, sess: null, myWeek: 1, recap: null, noteFor: null, rvEdit: null, rvError: "" }); if (S.adm) Object.assign(S.adm, { view: null, error: "", form: null, rows: null }); return r; }; }
/* For the tests and for poking around in the console. */
window.PATH_DEMO = {
  get state() { return S; }, disciplines, ACCENTS, GROUNDS, athletes, statusOf, roster, members, memberPass, ui: UI, ORGS, LOAD_LIMIT, CARD_TTL_MIN, STORE_KEY,
  render, seed, save, load, resetDemo, undoCancel, canUndoCancel, ensurePlan, TOUR, tourGo, inSeason, ptSlots, ptStats, ptPack, ptBook, ptCancel, ptMove, ptSell, ptClients, startOnboarding, finishOnboarding, setGoal, checkGoal, reviewItems, isEasier, draftRecap, checkedIn, comingToday, whatFor, clubStats, clubSentence, atRisk, riskOf, sentTo, draftCheckin, draftReminder, sendApproved, editSession, addSession, setRules, policyOf, policyText, parseMembersCsv, importMembers, baseMembers, coachOf, loadPhotos, PHOTOS, planWeekRows, planRowState, syncPlan, planText, planName, coachAlerts, openPains, book, cancel, cancelSession, clashAt, passEnded, renewalOf, check, freeSpot, leaveWait, passState, passOf, stats, guard, guardDraft, currentDraft, RAW_DRAFT,
  newForm, toLog, ask, confirmProposal, toggleAct, runAct, planLocked, nextChangeable, applyDraft, shiftWeek, weekIndex,
  parseClub, agenda, openPain, OFFERS, openOffers, exploreList, tryPlan, dropPlan, tryToday, providerOf, signUp, dropSignup, signedUp, offerStart, offerKm, offersFor, purchase, acceptOffer, declineOffer, sweepOffers, waitTotal, createSeries, previewSeries, pauseSeries, endSeries, runSeries, seriesRows, seriesSummary, findSeries, sweepProposals, parseWhen, parseOffering, rosterRows, rosterNames, addWalkin, markAttendance, memoryFor, upcomingBookings, sessList, attendance, myBooking, myWait, spots, nextStep, offerById, packOf, ticketOf, myInvoices,
};
if (!load()) seed();
render();
