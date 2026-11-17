"use strict";
/* PATH clickable demo: the athlete's first five minutes (N-01), and changing the goal later.
   Three questions, one per screen: which club, what you are training for, what your coach may see.
   Pain flags are health data: they are off, and stay off unless the athlete turns them on herself. */

const SHARE_SCOPES = [
  ["path.read", "Goal and stage", "So your coach knows what you are training for"],
  ["log.read", "Training log and progress", "What you did and how hard it felt"],
  ["log.comment", "Coach comments on your log", ""],
  ["plan.write", "Coach reviews your plans", "A change PATH drafts goes to your coach first"],
  ["alerts.pain", "Pain flags", "Health data. Private unless you turn this on"],
];
const GOAL_IDEAS = ["Sub-40 10K", "First 10K", "Run three times a week", "Get stronger", "Half marathon"];
const goalDateText = (g) => (g.date ? `By ${g.date.getDate()} ${MOL[g.date.getMonth()]} ${g.date.getFullYear()}.` : "No date set.");
/* A goal is a few words, with an optional day in the future and an optional reason. */
function checkGoal(title, date) {
  const t = String(title || "").trim().replace(/\s+/g, " ");
  if (t.length < 3) return err("NO_GOAL", "Say in a few words what you are training for.");
  if (t.length > 60) return err("LONG_GOAL", "Keep it to 60 characters. The details can go in the reason.");
  if (date) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date), d = m && new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); if (!d || isNaN(d)) return err("BAD_DATE", "That date does not exist."); if (d <= today()) return err("PAST_DATE", "Choose a day that is still to come, or leave the date empty."); return { ok: true, title: t, date: d }; }
  return { ok: true, title: t, date: null };
}
function setGoal(title, date, why) {
  const c = checkGoal(title, date); if (!c.ok) return c;
  S.goal = { title: c.title, date: c.date, why: String(why || "").trim().replace(/\s+/g, " ").slice(0, 160) };
  return { ok: true, msg: `Your goal is now "${c.title}". Your stage and what you have logged stay as they are.` };
}
const startOnboarding = () => { S.ob = { step: 1, org: S.org, title: "", date: "", why: "", share: { "path.read": true, "log.read": true, "log.comment": true, "plan.write": true, "alerts.pain": false }, error: "" }; };
function finishOnboarding() {
  const o = S.ob, c = checkGoal(o.title, o.date); if (!c.ok) return c;
  S.org = o.org; setGoal(o.title, o.date, o.why);
  S.consent[o.org] = { "profile.basic": true, ...Object.fromEntries(SHARE_SCOPES.map(([k]) => [k, !!o.share[k]])) };
  S.onboarded = true; S.ob = null; S.tab.athlete = "path";
  return { ok: true, msg: `Welcome to ${ORGS[S.org].name}. Your path starts here.` };
}
function vOnboarding() {
  const o = S.ob, club = ORGS[o.org], dots = `<div class="wkdots" aria-hidden="true" style="justify-content:flex-start">${[1, 2, 3].map((i) => `<i class="${i === o.step ? "on" : ""}"></i>`).join("")}</div>`;
  const head = (q, sub) => `<div><div class="eyebrow">Welcome · step ${o.step} of 3</div><h1 class="h1" style="margin-top:8px">${q}</h1>${sub ? `<p class="sub" style="margin-top:8px">${sub}</p>` : ""}</div>`;
  const nav = (next) => `<div class="stack" style="gap:8px">${o.error ? `<p class="err" role="alert" id="ob-error">${esc(o.error)}</p>` : ""}<button class="btn acc full" ${o.step === 2 ? 'type="submit"' : `data-a="ob-next"`}>${next}</button><button class="btn full ghost" type="button" data-a="${o.step === 1 ? "ob-quit" : "ob-back"}">${o.step === 1 ? "Not now" : "Back"}</button></div>`;
  if (o.step === 1) return `<section class="pad stack-l" id="onboarding" data-step="1">${dots}${head("Which club do you train at?", "Your club sets the sessions you can book. You can be a member of more than one; each keeps its own bookings, pass and coach.")}
    <div class="stack" style="gap:8px" role="radiogroup" aria-label="Club">${Object.entries(ORGS).map(([k, c]) => `<button class="clubrow" role="radio" aria-checked="${o.org === k}" data-a="ob-club" data-v="${k}"><span class="mono36" aria-hidden="true">${mono(k)}</span><span class="mid">${esc(c.name)}<span class="sub" style="display:block">${c.kind}</span></span><span class="ck">${o.org === k ? I(P.tick, 22) : ""}</span></button>`).join("")}</div>${nav("Next")}</section>`;
  if (o.step === 2) return `<section class="pad stack-l" id="onboarding" data-step="2">${dots}${head("What are you training for?", "A few words are enough. Your path, your plan and your coach's suggestions all point at it. You can change it at any time.")}
    <form class="stack" data-f="obgoal" novalidate><label class="f">Your goal<input id="ob-title" maxlength="60" autocomplete="off" placeholder="Sub-40 10K" value="${esc(o.title)}"></label>
      <div class="filters" role="group" aria-label="Ideas">${GOAL_IDEAS.map((g) => `<button class="chip" type="button" data-a="ob-idea" data-v="${g}" aria-pressed="${o.title === g}">${g}</button>`).join("")}</div>
      <label class="f">By when (if there is a day)<input id="ob-date" type="date" min="${ymd(addDays(today(), 1))}" value="${esc(o.date)}"></label>
      <label class="f">Why it matters to you (optional)<input id="ob-why" maxlength="160" autocomplete="off" placeholder="I want to race the Zurich 10K with my club" value="${esc(o.why)}"></label>${nav("Next")}</form></section>`;
  return `<section class="pad stack-l" id="onboarding" data-step="3">${dots}${head(`What may your coach at ${esc(club.name)} see?`, "Your coach sees only what you switch on here, and only at this club. You can change each one later under Me, and it takes effect at once.")}
    <div class="card rows" id="ob-share">${sw(true, "ob-share", "profile.basic", "Name and photo", "Always shared, so coaches can run a roster", true)}${SHARE_SCOPES.map(([k, label, sub]) => sw(o.share[k], "ob-share", k, label, sub, false)).join("")}</div>
    <p class="note" id="ob-pain">${o.share["alerts.pain"] ? `Your coach at ${esc(club.name)} will see a pain flag when you log one. Nobody else does.` : "Pain flags stay with you. No club and no coach sees them unless you turn this on."}</p>${nav("Start")}</section>`;
}
/* Me: the goal, and the way to change it. */
const vGoalCard = () => `<div class="stack" id="my-goal"><div class="eyebrow">Your goal</div><div class="card stack" style="gap:12px"><div><p class="h2" id="goal-title">${esc(S.goal.title)}</p><p class="sub" id="goal-date">${goalDateText(S.goal)}${S.goal.why ? " " + esc(S.goal.why) : ""}</p></div><button class="btn full" data-a="goal-edit">Change goal</button></div></div>`;
function vGoalSheet() {
  const sh = UI.sheet, g = S.goal, f = sh.form || { title: g.title, date: g.date ? ymd(g.date) : "", why: g.why || "" };
  return `<div class="sheetbg" data-a="close"><div class="sheet stack" role="dialog" aria-modal="true" aria-label="Change your goal"><div><div class="eyebrow">Your goal</div><h2 class="h1">What are you training for?</h2><p class="sub" style="margin-top:4px">Your stage and everything you logged stay as they are. Your coach sees the new goal if you share your goal with them.</p></div>
    <form class="stack" data-f="goal" novalidate><label class="f">Your goal<input id="g-title" maxlength="60" autocomplete="off" value="${esc(f.title)}"></label><label class="f">By when (if there is a day)<input id="g-date" type="date" min="${ymd(addDays(today(), 1))}" value="${esc(f.date)}"></label><label class="f">Why it matters to you (optional)<input id="g-why" maxlength="160" autocomplete="off" value="${esc(f.why)}"></label>
      ${sh.error ? `<p class="err" role="alert" id="goal-error">${esc(sh.error)}</p>` : ""}<button class="btn acc full" type="submit">Save goal</button></form><button class="btn ghost full" data-a="close-btn">Close</button></div></div>`;
}
const ONBOARD_ACT = {
  "ob-start": () => { startOnboarding(); S.role = "athlete"; UI.sheet = null; lastKey = ""; },
  "ob-quit": () => { S.ob = null; lastKey = ""; },
  "ob-club": (v) => { if (ORGS[v]) S.ob.org = v; },
  "ob-idea": (v) => { keepGoalInputs(); S.ob.title = v; S.ob.error = ""; },
  "ob-share": (v) => { if (v !== "profile.basic") S.ob.share[v] = !S.ob.share[v]; },
  "ob-back": () => { keepGoalInputs(); S.ob.step = Math.max(1, S.ob.step - 1); S.ob.error = ""; lastKey = ""; },
  "ob-next": () => { const o = S.ob; if (o.step === 3) { const r = finishOnboarding(); if (r.ok) UI.toast = r.msg; else o.error = r.msg; } else { o.step++; o.error = ""; } lastKey = ""; },
  "goal-edit": () => { UI.sheet = { type: "goal" }; },
};
function keepGoalInputs() { const o = S.ob, v = (id) => (document.getElementById(id) || {}).value; if (!o || o.step !== 2) return; if (v("ob-title") !== undefined) Object.assign(o, { title: v("ob-title"), date: v("ob-date") || "", why: v("ob-why") || "" }); }
document.addEventListener("submit", (e) => {
  const f = e.target.dataset.f; if (f !== "obgoal" && f !== "goal") return; e.preventDefault(); UI.toast = "";
  const v = (id) => (document.getElementById(id) || {}).value || "";
  if (f === "obgoal") { keepGoalInputs(); const c = checkGoal(S.ob.title, S.ob.date); if (c.ok) { S.ob.step = 3; S.ob.error = ""; } else S.ob.error = c.msg; lastKey = ""; }
  else { const form = { title: v("g-title"), date: v("g-date"), why: v("g-why") }, r = setGoal(form.title, form.date, form.why); if (r.ok) { UI.toast = r.msg; UI.sheet = null; } else UI.sheet = { type: "goal", form, error: r.msg }; }
  render();
});
