"use strict";
/* PATH clickable demo: the coach and club dashboard (milestone A: Today, Athletes, Athlete detail).
   The athlete you can play (Mia) is read live from the shared state, so everything she does shows up here and
   everything the coach does shows up on her side. The other athletes are invented demo data, made the same way
   on every start. A coach only ever sees what an athlete shares with this club. */

const COACH_ME = "Coach Sara";
const DASH0 = () => ({ athlete: null, att: "all", group: "all", notes: {}, kudos: {}, answered: {} });
const dash = () => (S.dash ||= DASH0());

/* ---------- invented athletes ---------- */
function rng(seed) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const GOALS = [["Sub-40 10K", "10K"], ["First 10K", "10K"], ["Sub-20 5K", "5K"], ["Sub-25 5K", "5K"], ["Half marathon in April", "Half marathon"], ["Sub-60 400 m", "Track"], ["Run three times a week", "Habit"]];
const LOG_TITLES = ["Track session", "Easy run", "Long run", "Technique session", "Gym session", "Tempo run"];
/* The eight athletes with a story, spread over the list so they are not all one family. */
const STORY_AT = [0, 9, 18, 27, 36, 45, 6, 15];
let ROSTER = null;
function roster() {
  if (ROSTER) return ROSTER;
  const r = rng(11), pick = (a) => a[Math.floor(r() * a.length)], T = today();
  /* A few fixed stories on top, so the screen always has something worth a coach's time; the rest is quiet. */
  const story = { 0: { away: 15, back: true }, 1: { pain: { where: "Knee", level: 6 }, load: 1.38 }, 2: { load: 1.41 }, 3: { away: 12 }, 4: { ask: "Can I swap Thursday for Saturday this week?" }, 5: { load: 1.22 }, 6: { away: 8 }, 7: { pain: { where: "Calf or shin", level: 4 }, sharePain: false } };
  ROSTER = NAMES.map((name, i) => { const first = name.split(" ")[0];
    const st = story[STORY_AT.indexOf(i)] || {}, g = pick(GOALS), stage = Math.floor(r() * 4), inSt = 1 + Math.floor(r() * 11), away = st.away ?? Math.floor(r() * 5), load = st.load ?? 0.82 + r() * 0.28;
    const shareLog = i % 9 !== 8, sharePain = st.sharePain ?? (!!st.pain || r() > 0.5);
    const logs = [0, 1, 2].map((k) => ({ id: `r${i}-${k}`, title: pick(LOG_TITLES), at: addDays(T, -(away + k * 2 + (k ? 1 : 0))), dur: 40 + Math.floor(r() * 6) * 10, rpe: 4 + Math.floor(r() * 5), ask: k === 0 ? st.ask : null }));
    return { id: "a" + i, live: false, name, first, group: i % 3 === 2 ? "Technique" : "Track", goal: g[0], goalKind: g[1], stage, inSt, away, back: !!st.back, load, pain: st.pain || null, ask: st.ask || null,
      attend: Math.round(62 + r() * 36), shares: { path: true, log: shareLog, pain: sharePain }, logs, pbs: [["5K", (19 + r() * 8).toFixed(1), "min"], ["400 m", (62 + r() * 20).toFixed(1), "s"]],
      pts: [...Array(10)].map((_, k) => ({ l: "W" + (37 + k), v: Math.round(900 + r() * 500 + (k === 9 ? (load - 1) * 1400 : 0)) })) };
  });
  return ROSTER;
}
/* Mia, as her coach is allowed to see her. */
function liveAthlete() {
  const st = stats(), op = shares("alerts.pain") ? S.entries.find((e) => e.pain && !e.cleared) : null, last = S.entries[0];
  return { id: "mia", live: true, name: S.me.name, first: S.me.name.split(" ")[0], group: "Track", goal: S.goal.title, goalKind: "10K", stage: S.stage, inSt: S.stageSessions,
    away: last ? Math.max(0, Math.round((today() - new Date(last.at)) / 864e5)) : 30, back: false, load: st.ratio, pain: op ? { where: op.painWhere, level: op.painLevel } : null, ask: null, attend: 88,
    shares: { path: shares("path.read"), log: shares("log.read"), pain: shares("alerts.pain") }, draft: shares("plan.write") && S.draftStatus === "pending_review" };
}
const athletes = () => (S.org === "pau" ? [liveAthlete(), ...roster()] : [liveAthlete()]);
const athleteById = (id) => athletes().find((a) => a.id === id);

/* ---------- status: always with the reason, in plain words, and only from what is shared ---------- */
function statusOf(a) {
  const pct = Math.round(a.load * 100), reasons = [];
  if (a.pain && a.shares.pain) reasons.push([2, `Shared a ${a.pain.where.toLowerCase()} flag, level ${a.pain.level}`, "pain"]);
  if (a.draft) reasons.push([2, "Plan draft waiting for you", "draft"]);
  if (a.ask && !dash().answered[a.id]) reasons.push([2, "Asked you a question", "ask"]);
  if (a.shares.log && a.load >= 1.35) reasons.push([2, `Load ${pct}% of usual`, "load"]);
  if (a.away >= 12) reasons.push([2, a.back ? `Back after ${Math.round(a.away / 7)} weeks off` : `No session in ${a.away} days`, "away"]);
  if (a.shares.log && a.load >= 1.15 && a.load < 1.35) reasons.push([1, `Load ${pct}% of usual`, "load"]);
  if (a.away >= 7 && a.away < 12) reasons.push([1, `No session in ${a.away} days`, "away"]);
  reasons.sort((x, y) => y[0] - x[0]);
  const level = reasons.length ? reasons[0][0] : 0;
  return { level, key: ["ok", "watch", "needs"][level], label: ["On track", "Watch", "Needs you"][level], why: reasons.length ? reasons.map((x) => x[1]).join(" · ") : a.shares.log ? "On track" : "On track (shares attendance only)", kinds: reasons.map((x) => x[2]) };
}
const sdot = (st) => `<i class="sdot ${st.key}" title="${st.label}"></i><span class="sr">${st.label}: </span>`;
const lastLogText = (a) => (!a.shares.log ? "Log not shared" : a.away === 0 ? "Logged today" : a.away === 1 ? "Logged yesterday" : `Last log ${a.away} days ago`);
const pbar = (a) => `<span class="pline" role="img" aria-label="Stage ${a.stage + 1} of 5, session ${a.inSt} of ${PER}"><b style="width:${Math.round(((a.stage * PER + a.inSt) / (5 * PER)) * 100)}%"></b></span>`;

/* ---------- Today ---------- */
function vCoachToday() {
  const T = today(), all = sessList(S.org), todays = all.filter((s) => ymd(s.start) === ymd(T)), next = all.filter((s) => s.start > addDays(T, 1)).slice(0, 5);
  const list = athletes().map((a) => ({ a, st: statusOf(a) })), needs = list.filter((x) => x.st.level === 2).sort((x, y) => y.st.kinds.length - x.st.kinds.length || (x.a.live ? -1 : 1));
  const back = list.find((x) => x.a.back), pain = list.find((x) => x.st.kinds.includes("pain"));
  const brief = [`${todays.length} ${todays.length === 1 ? "session" : "sessions"} today, ${todays.reduce((n, s) => n + booked(s), 0)} booked.`, back ? `${back.a.first} is back after ${Math.round(back.a.away / 7)} weeks off.` : "", pain ? `${pain.a.first} shared a ${pain.a.pain.where.toLowerCase()} flag, so a lighter option is ready for the next hard session.` : needs.length ? `${needs.length} ${needs.length === 1 ? "athlete needs" : "athletes need"} you.` : "Nobody needs you right now."].filter(Boolean).join(" ");
  const card = (s) => `<div class="card stack" data-today="${s.id}" style="gap:12px"><div class="between" style="align-items:flex-start"><span><span class="h2" style="display:block">${fTime(s.start)} · ${offOf(s).name}</span><span class="sub">${offOf(s).loc} · ${offOf(s).coach}</span></span><span class="end"><span class="num">${booked(s)}<span class="sub" style="font-weight:400"> / ${s.cap}</span></span>${waitTotal(s) ? `<span class="sub" style="display:block">${waitTotal(s)} waiting</span>` : ""}</span></div><button class="btn acc full" data-a="roster" data-v="${s.id}">Check in</button></div>`;
  return `<section class="pad stack-l" id="coach-today"><div><div class="eyebrow">${COACH_ME} · ${esc(ORGS[S.org].name)}</div><h1 class="h1">${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][T.getDay()]}, ${T.getDate()} ${MOL[T.getMonth()]}</h1></div>
    <div class="stack" style="gap:8px"><p id="briefing" style="font-size:18px;line-height:28px">${esc(brief)}</p><p class="sub">Drafted by PATH from bookings and from what athletes share with this club.</p></div>
    <div class="stack"><div class="eyebrow">Today</div>${todays.length ? todays.map(card).join("") : `<p class="sub">No sessions today.</p>`}</div>
    <div class="stack" id="needs"><div class="between" style="align-items:center"><span class="eyebrow">Needs you · ${needs.length > 5 ? `5 of ${needs.length}` : needs.length}</span><button class="btn sm" data-a="tab" data-v="alerts">Alerts</button></div>${needs.length ? `<div class="card rows">${needs.slice(0, 5).map(({ a, st }) => `<button class="row" data-a="${st.kinds[0] === "draft" ? "tab" : "athlete"}" data-v="${st.kinds[0] === "draft" ? "review" : a.id}"><span class="mid"><span class="strong">${sdot(st)}${esc(a.name)}</span><span class="sub">${esc(st.why)}</span></span><span class="end sub">${st.kinds[0] === "draft" ? "Review" : "Open"}</span></button>`).join("")}</div>${needs.length > 5 ? `<button class="btn sm link" data-a="needs-all">See all ${needs.length} in Athletes</button>` : ""}` : `<p class="sub">Nothing is waiting for you.</p>`}</div>
    <div class="stack"><div class="eyebrow">Coming up</div><div class="card rows">${next.map((s) => `<button class="row" data-a="roster" data-v="${s.id}"><span class="lead time" style="width:64px">${WD[s.start.getDay()]} ${s.start.getDate()}</span><span class="mid"><span class="strong">${offOf(s).name}</span><span class="sub">${fTime(s.start)} · ${offOf(s).loc}</span></span><span class="end">${booked(s)} / ${s.cap}${waitTotal(s) ? `<span class="sub" style="display:block">${waitTotal(s)} waiting</span>` : ""}${(S.walkins[s.id] || []).length ? `<span class="sub" style="display:block">+${S.walkins[s.id].length} walk-in</span>` : ""}</span></button>`).join("")}</div></div>
    <p class="sub">Demo data: the athletes besides ${esc(S.me.name)} are invented.</p></section>`;
}

/* ---------- Athletes ---------- */
function vCoachAthletes() {
  const d = dash(); if (d.athlete && athleteById(d.athlete)) return vAthleteDetail(athleteById(d.athlete));
  const all = athletes().map((a) => ({ a, st: statusOf(a) })), n = (k) => all.filter((x) => x.st.key === k).length;
  const groups = [...new Set(all.map((x) => x.a.group))], kinds = [...new Set(all.map((x) => x.a.goalKind))];
  const list = all.filter((x) => (d.att === "all" || x.st.key === d.att) && (d.group === "all" || x.a.group === d.group || x.a.goalKind === d.group)).sort((x, y) => y.st.level - x.st.level || y.st.kinds.length - x.st.kinds.length || x.a.name.localeCompare(y.a.name));
  const chip = (a, v, label, on) => `<button class="chip" data-a="${a}" data-v="${v}" aria-pressed="${on}">${label}</button>`;
  return `<section class="pad stack-l" id="coach-athletes"><div><div class="eyebrow">Athletes · ${all.length}</div><h1 class="h1" id="roster-answer">${n("needs")} ${n("needs") === 1 ? "needs" : "need"} you, ${n("watch")} to watch, ${n("ok")} on track</h1><p class="sub" style="margin-top:4px">You see only what each athlete shares with ${esc(ORGS[S.org].name)}.</p></div>
    <div class="stack"><div class="filters" role="group" aria-label="Filter by attention">${chip("att", "all", "All", d.att === "all")}${chip("att", "needs", "Needs you", d.att === "needs")}${chip("att", "watch", "Watch", d.att === "watch")}${chip("att", "ok", "On track", d.att === "ok")}</div>
    <div class="filters" role="group" aria-label="Filter by group or goal">${chip("agroup", "all", "Everyone", d.group === "all")}${groups.map((g) => chip("agroup", g, g, d.group === g)).join("")}${kinds.map((g) => chip("agroup", g, g, d.group === g)).join("")}</div>
    ${list.length ? `<div class="card rows" id="athlete-list">${list.map(({ a, st }) => `<button class="row" data-a="athlete" data-v="${a.id}" data-status="${st.key}" style="align-items:flex-start"><span class="mid"><span class="strong">${sdot(st)}${esc(a.name)}</span><span class="sub">${a.shares.path ? esc(a.goal) : "Goal not shared"} · ${lastLogText(a)}</span>${a.shares.path ? pbar(a) : ""}<span class="sub why" ${st.level ? 'style="color:var(--text)"' : ""}>${esc(st.why)}</span></span></button>`).join("")}</div>` : `<p class="sub" id="athletes-none">Nobody matches these filters.</p>`}</div>
    <p class="sub">Demo data: the athletes besides ${esc(S.me.name)} are invented.</p></section>`;
}

/* ---------- Athlete detail ---------- */
function vAthleteDetail(a) {
  const d = dash(), st = statusOf(a), M = a.live, org = esc(ORGS[S.org].name);
  const shared = [["Goal and progress", a.shares.path], ["Training log", a.shares.log], ["Pain flags", a.shares.pain]];
  const logs = M ? S.entries.slice(0, 5).map((e) => ({ id: e.id, title: e.title, at: e.at, dur: e.dur, rpe: e.rpe, pain: e.pain && a.shares.pain ? `pain ${e.painLevel}, ${e.painWhere}` : "", comments: e.comments, real: true })) : a.logs.map((l) => ({ ...l, pain: "", comments: [...(l.ask ? [{ by: a.first, text: l.ask }] : []), ...(d.kudos[l.id] || [])] }));
  const canComment = M ? shares("log.comment") : true;
  const logRow = (e) => `<div class="row" data-log="${e.id}" style="align-items:flex-start"><span class="mid"><span class="strong">${esc(e.title)}</span><span class="sub">${fDay(e.at)} · ${e.dur} min · RPE ${e.rpe}${e.pain ? " · " + esc(e.pain) : ""}</span>${e.comments.map((c) => `<span class="note" style="margin-top:8px"><span class="strong" style="color:var(--text)">${esc(c.by)}</span> ${esc(c.text)}</span>`).join("")}${canComment ? `<form data-f="${e.real ? "comment" : "dcomment"}" data-id="${e.id}" data-ath="${a.id}" style="display:flex;gap:8px;margin-top:8px;align-items:center"><input class="inp" style="min-height:44px" id="c-${e.id}" aria-label="Comment on ${esc(e.title)}, ${fDay(e.at)}" placeholder="Add a comment"><button class="btn sm" type="submit">Send</button><button class="btn sm" type="button" data-a="kudos" data-v="${a.id}|${e.id}" aria-label="Kudos for ${esc(e.title)}, ${fDay(e.at)}">Kudos</button></form>` : ""}</span></div>`;
  const nextStep = M ? nextStep0() : st.kinds.includes("pain") ? "Easy session, then check the flag" : a.back ? "Comeback session, short and easy" : `${["Track", "Technique", "Long run"][a.inSt % 3]} session`;
  const draft = M && a.draft ? currentDraft() : null;
  const proposal = draft ? `<div class="stack" style="gap:8px" id="proposal"><p class="strong">PATH proposes: ${esc(draft.title)}</p><p class="sub">${esc(draft.rationale)}</p><ul class="stack" style="gap:4px">${draft.items.filter((i) => i.changed).slice(0, 4).map((i) => `<li><span class="sub">${i.day}:</span> ${esc(i.to)}</li>`).join("")}</ul><button class="btn sm link" data-a="tab" data-v="review">Open in Review</button></div>`
    : !M && (st.kinds.includes("pain") || st.kinds.includes("load")) ? `<div class="stack" style="gap:8px" id="proposal"><p class="strong">PATH proposes: make Thursday easy</p><p class="sub">Why: ${esc(st.why.toLowerCase())}. The change waits in your review queue; ${esc(a.first)} sees nothing until you approve.</p></div>`
    : `<p class="sub">No changes proposed.</p>`;
  return `<section class="pad stack-l" id="athlete-detail" data-ath="${a.id}"><div><button class="btn sm link ghost" data-a="athlete-back" aria-label="Back to ${d.from === "week" ? "the session" : "athletes"}">${I(P.back, 16)}${d.from === "week" ? "Back" : "Athletes"}</button><div class="eyebrow" style="margin-top:8px">${esc(a.group)} group${M ? "" : " · demo data"}</div><h1 class="h1">${esc(a.name)}</h1><p class="sub" style="margin-top:4px" id="detail-status">${sdot(st)}${esc(st.why)}</p>${M && passOf(S.org) ? `<p class="sub" style="margin-top:4px">${passLine(passOf(S.org))}</p>` : ""}</div>
    <div class="stack"><div class="eyebrow">Path at a glance</div>${a.shares.path ? `<div class="card stack"><div><p class="h2">${esc(a.goal)}</p><div style="margin-top:12px">${pbar(a)}</div><p class="sub" style="margin-top:8px">${S.stages[a.stage]} · session ${a.inSt} of ${PER}</p></div>
      <div class="rows"><div class="row"><span class="mid sub">Next step</span><span class="strong" style="text-align:right">${esc(nextStep)}</span></div><div class="row"><span class="mid sub">Attendance this season</span><span class="strong">${a.attend}%</span></div>${a.shares.log ? (M ? S.pbs.map((p) => [p.metric, p.value, p.unit]) : a.pbs).slice(0, 2).map((p) => `<div class="row"><span class="mid sub">Best ${p[0]}</span><span class="strong">${p[1]} ${p[2]}</span></div>`).join("") : ""}</div></div>` : `<p class="sub">Goal and progress are not shared.</p>`}</div>
    ${a.shares.log ? `<div class="stack"><div class="between"><span class="eyebrow">Weekly load</span><span class="sub">${Math.round(a.load * 100)}% of usual</span></div>${M ? lineChart(loadPts(stats()), stats().wl.length - 1) : lineChart(a.pts, a.pts.length - 1)}</div>
    <div class="stack"><div class="eyebrow">Training log</div><div class="card rows" id="detail-logs">${logs.map(logRow).join("")}</div></div>` : `<p class="sub" id="log-private">Training log not shared.</p>`}
    <div class="stack"><div class="eyebrow">Plan</div><div class="card stack"><p class="sub" id="plan-from-you">From you: <span class="strong" style="color:var(--text)">${esc(planNames(a))}</span></p>${M ? `<p class="sub">Own plan: <span class="strong" style="color:var(--text)">${esc(S.plan.title)}</span></p>` : ""}${proposal}</div></div>
    <form class="stack" data-f="cnote" data-ath="${a.id}" style="gap:8px"><label class="f">Your private notes<input id="cnote" value="${esc(d.notes[a.id] || "")}" placeholder="Only you see this" autocomplete="off"></label><div class="between" style="align-items:center"><span class="sub">${esc(a.first)} never sees these notes.</span><button class="btn sm" type="submit">Save note</button></div></form>
    <p class="note" id="sharing">${esc(a.first)} shares with ${org}: ${shared.filter((x) => x[1]).map((x) => x[0].toLowerCase()).join(", ") || "name only"}. ${shared.some((x) => !x[1]) ? `Private: ${shared.filter((x) => !x[1]).map((x) => x[0].toLowerCase()).join(", ")}.` : "Nothing is held back."}</p></section>`;
}
const nextStep0 = () => { const n = nextStep(); return n.title; };

/* ---------- actions (merged into the shell's action map) ---------- */
const DASH_ACT = {
  athlete: (v) => { const d = dash(); d.from = S.tab.coach === "week" ? "week" : "athletes"; d.athlete = v || null; S.tab.coach = "athletes"; lastKey = ""; },
  "athlete-back": () => { const d = dash(); d.athlete = null; if (d.from === "week") S.tab.coach = "week"; lastKey = ""; },
  att: (v) => { dash().att = v; }, agroup: (v) => { dash().group = v; },
  "needs-all": () => { Object.assign(dash(), { att: "needs", group: "all", athlete: null }); S.tab.coach = "athletes"; },
  kudos: (v) => {
    const [aid, lid] = v.split("|"), a = athleteById(aid);
    if (a.live) S.entries.find((e) => String(e.id) === lid).comments.push({ by: COACH_ME, text: "Kudos. Well done." });
    else (dash().kudos[lid] ||= []).push({ by: COACH_ME, text: "Kudos. Well done." });
    UI.toast = `Kudos sent to ${a.first}.`;
  },
};
document.addEventListener("submit", (e) => {
  const f = e.target.dataset.f; if (f !== "cnote" && f !== "dcomment") return;
  e.preventDefault(); const a = athleteById(e.target.dataset.ath);
  if (f === "cnote") { dash().notes[a.id] = document.getElementById("cnote").value.trim(); UI.toast = `Note saved. Only you can see it.`; }
  else { const inp = e.target.querySelector("input"), v = inp.value.trim(); if (!v) return; (dash().kudos[e.target.dataset.id] ||= []).push({ by: COACH_ME, text: v }); if (a.ask) dash().answered[a.id] = true; UI.toast = `Sent to ${a.first}.`; }
  render();
});

/* ================= Plans (K-7 to K-11): upload or paste a plan, or build one with PATH, then share it with a group ================= */
const PLAN_SEED = () => [
  { id: "p1", title: "Base block", source: "Yours", sessions: genPlan({ kind: "10k", weeks: 4, level: 0, fun: false }), shared: ["Track"] },
  { id: "p2", title: "Race week taper", source: "Yours", sessions: genPlan({ kind: "taper", weeks: 1, level: 0, fun: false }), shared: [] },
];
const plans = () => (dash().plans ||= PLAN_SEED());
const planById = (id) => plans().find((p) => p.id === id);
const weeksOf = (p) => Math.max(1, ...p.sessions.map((s) => s.week));
const planMeta = (p) => `${weeksOf(p)} ${weeksOf(p) === 1 ? "week" : "weeks"} · ${p.sessions.length} sessions`;
const groupSize = (g) => athletes().filter((a) => a.group === g).length;

/* PATH's draft: simple, readable rules. The coach changes anything before saving; nothing is sent to anyone here. */
/* Weekdays the coach names ("my Tuesday and Saturday group") become the days of the plan. */
function daysIn(t) {
  const names = [["Mon", /\b(monday|mondays|montag|montags)\b/], ["Tue", /\b(tuesday|tuesdays|dienstag|dienstags)\b/], ["Wed", /\b(wednesday|wednesdays|mittwoch|mittwochs)\b/], ["Thu", /\b(thursday|thursdays|donnerstag|donnerstags)\b/], ["Fri", /\b(friday|fridays|freitag|freitags)\b/], ["Sat", /\b(saturday|saturdays|samstag|samstags)\b/], ["Sun", /\b(sunday|sundays|sonntag|sonntags)\b/]];
  return names.filter(([, re]) => re.test(t)).map(([d]) => d);
}
function planParams(text) {
  const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, eine: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12 };
  const t = text.toLowerCase().replace(/[a-zäöü]+/g, (x) => (NUM[x] ? String(NUM[x]) : x)), w = t.match(/(\d+)[\s-]*(?:weeks?|wochen?)/);
  const kind = /taper|race week|wettkampfwoche/.test(t) ? "taper" : /strength|kraft|gym/.test(t) ? "strength" : /\b5\s?k/.test(t) ? "5k" : /half|halbmarathon/.test(t) ? "half" : "10k";
  return { kind, weeks: kind === "taper" ? 1 : Math.min(12, Math.max(1, w ? Number(w[1]) : 4)), level: 0, fun: /fun|playful|play\b|bored|variety|spass|spiel|abwechslung|game|relay|staffel/.test(t), days: daysIn(t) };
}
function genPlan({ kind, weeks, level, fun, days = [] }) {
  const out = [], add = (week, day, text) => out.push({ week, day, text });
  for (let w = 1; w <= weeks; w++) {
    const easy = weeks >= 4 && w === weeks, k = w - 1 + level - (easy ? 2 : 0);
    if (kind === "taper") { add(w, "Mon", "Track: 4 × 400 m at race pace, long rests"); add(w, "Wed", "Easy run 30 min, then 4 relaxed strides"); add(w, "Fri", "Rest, or 20 min very easy"); add(w, "Sun", "Race day. Warm up 15 min, then enjoy it"); }
    else if (kind === "strength") { add(w, "Tue", `Gym: squats, lunges, calf raises, ${3 + Math.min(k, 2)} × 8`); add(w, "Thu", `Core circuit, ${15 + 5 * Math.min(k, 3)} min`); add(w, "Sat", "Hops and bounds on grass, 15 min, full rest between sets"); }
    else if (kind === "5k") { add(w, "Mon", `Track: ${Math.max(4, 6 + 2 * k)} × 400 m at 5K pace, 90 s jog`); add(w, "Thu", `Hills: ${Math.max(4, 6 + k)} × 60 s, walk down`); add(w, "Sat", `Easy run ${40 + 5 * k} min, then strides`); }
    else if (kind === "half") { add(w, "Tue", `Tempo run: ${Math.max(15, 20 + 5 * k)} min steady`); add(w, "Thu", `Track: ${Math.max(3, 4 + k)} × 1 km at 10K pace, 2 min jog`); add(w, "Sun", `Long run: ${Math.max(60, 75 + 10 * k)} min easy`); }
    else { add(w, "Mon", `Track: ${Math.max(3, 4 + k)} × 1 km at 10K pace, 2 min jog`); add(w, "Thu", `Tempo run: ${Math.max(15, 20 + 5 * k)} min steady`); add(w, "Sat", `Long run: ${Math.max(50, 60 + 10 * k)} min easy`); }
    if (days.length && kind !== "taper") {
      const base = out.filter((x) => x.week === w), keep = days.length >= base.length ? base : days.length === 1 ? [base[0]] : [base[0], ...base.slice(-(days.length - 1))];
      out.splice(out.length - base.length, base.length, ...keep.map((x, i) => ({ ...x, day: days[i] })));
    }
    if (fun) add(w, days.length ? "" : "Wed", ["Relay games in mixed teams, 4 × 200 m handovers", "Partner runs: one talks, one listens, swap every 5 min", "Hill tag and a sprint ladder, laughing allowed", "Parkour loop: benches, steps and balance lines"][(w - 1) % 4]);
    const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", ""], wk = out.filter((x) => x.week === w).sort((x, y) => order.indexOf(x.day) - order.indexOf(y.day)); out.splice(out.length - wk.length, wk.length, ...wk);
    if (easy && kind !== "taper") out.filter((s) => s.week === w).forEach((s) => { s.text += " (recovery week)"; });
  }
  return out;
}
/* A pasted or uploaded plan: "Week 2" starts a week, every other line is a session; a leading weekday is kept. */
function parsePlan(text) {
  let week = 1; const out = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^[\s\-*•\d.)]+(?=\D)/, "").trim(); if (!line) continue;
    const wk = raw.trim().match(/^(?:week|woche|wk)\s*(\d+)/i); if (wk) { week = Number(wk[1]); continue; }
    /* A weekday counts only when it is clearly a label: "Mon: ...", "Di - ...", or "Mon 5 x 1 km". "Dienstag wird hart" stays a sentence. */
    const d = line.match(/^(mon|tue|wed|thu|fri|sat|sun|mo|di|mi|do|fr|sa|so)[a-zäöü]*(?:\s*[:,.\-–]\s*|\s+(?=\d))(.+)$/i);
    const map = { mo: "Mon", di: "Tue", mi: "Wed", do: "Thu", fr: "Fri", sa: "Sat", so: "Sun" };
    out.push(d ? { week, day: map[d[1].toLowerCase()] || d[1][0].toUpperCase() + d[1].slice(1, 3).toLowerCase(), text: d[2].trim() } : { week, day: "", text: line });
  }
  return out;
}
/* The draft stays open: every line can be changed, removed or added to before saving. */
const DAYS7 = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function editRows(dr) {
  const weeks = [...new Set(dr.sessions.map((s) => s.week))].sort((a, b) => a - b);
  return weeks.map((w) => `<div class="stack" style="gap:8px" data-week="${w}"><div class="sub">Week ${w}</div><div class="card stack" style="gap:8px;padding:12px">${dr.sessions.map((s, i) => (s.week !== w ? "" : `<div class="srow" data-i="${i}"><select class="sday" aria-label="Day, week ${w}">${DAYS7.map((d) => `<option value="${d}" ${d === s.day ? "selected" : ""}>${d || "Any"}</option>`).join("")}</select><textarea class="inp stext" rows="1" aria-label="Session, week ${w}" placeholder="What happens in this session">${esc(s.text)}</textarea><button class="x" type="button" data-a="plan-rm" data-v="${i}" aria-label="Remove this session">${I(P.x, 18)}</button></div>`)).join("")}<button class="btn sm link" data-a="plan-add" data-v="${w}">Add a session</button></div></div>`).join("") + `<button class="btn sm link" data-a="plan-addweek">Add a week</button>`;
}
const sessionRows = (list) => [...new Set(list.map((s) => s.week))].map((w) => `<div class="stack" style="gap:8px"><div class="sub">Week ${w}</div><div class="card rows">${list.filter((s) => s.week === w).map((s) => `<div class="row"><span class="lead time" style="width:40px">${s.day || "·"}</span><span class="mid">${esc(s.text)}</span></div>`).join("")}</div></div>`).join("");
/* Who would get a personal version, and why. Only from what they share. The coach approves each one in Review. */
const personalFor = (p) => athletes().filter((a) => p.shared.includes(a.group)).map((a) => ({ a, st: statusOf(a) })).filter((x) => x.st.kinds.some((k) => k === "pain" || k === "load" || k === "away"));

function vCoachPlans() {
  const d = dash(), list = plans();
  if (d.planView === "new") return vPlanNew();
  if (d.planView && planById(d.planView)) return vPlanDetail(planById(d.planView));
  const shared = list.filter((p) => p.shared.length);
  return `<section class="pad stack-l" id="coach-plans"><div><div class="eyebrow">Plans</div><h1 class="h1" id="plans-answer">${list.length} ${list.length === 1 ? "plan" : "plans"}, ${shared.length} shared with your groups</h1><p class="sub" style="margin-top:4px">Bring your own plans or build one with PATH. Your athletes see a plan only after you share it.</p></div>
    <button class="btn acc full" data-a="plan-new">Add a plan</button>
    ${list.length ? `<div class="card rows" id="plan-list">${list.map((p) => `<button class="row" data-a="plan-open" data-v="${p.id}"><span class="mid"><span class="strong">${esc(p.title)}</span><span class="sub">${planMeta(p)} · ${p.shared.length ? "Shared with " + p.shared.join(", ") : "Not shared"}</span></span><span class="end sub">Open</span></button>`).join("")}</div>` : `<p class="sub">No plans yet.</p>`}</section>`;
}
function vPlanNew() {
  const d = dash(), dr = d.pdraft, mode = d.pmode || "path";
  const back = `<button class="btn sm link ghost" data-a="plan-open" data-v="" aria-label="Back to plans">${I(P.back, 16)}Plans</button>`;
  if (dr) return `<section class="pad stack-l" id="plan-draft">${back}<div><div class="eyebrow">${dr.editId ? "Editing" : dr.source === "path" ? "Drafted by PATH" : "Structured from your words"}</div><h1 class="h1">${dr.sessions.length} sessions over ${Math.max(1, ...dr.sessions.map((s) => s.week))} ${Math.max(1, ...dr.sessions.map((s) => s.week)) === 1 ? "week" : "weeks"}</h1><p class="sub" style="margin-top:4px">${dr.editId ? "Change anything. Athletes see the new version once you save." : dr.source === "path" ? "A starting point, not a prescription. Change any line, add or remove sessions; you know your group." : "PATH put your words into weeks and sessions. Change any line before you save."}</p></div>
    <label class="f">Name<input id="ptitle" value="${esc(dr.title)}" autocomplete="off"></label>
    ${dr.source === "path" && !dr.edited ? `<div class="filters" role="group" aria-label="Change the draft"><button class="chip" data-a="plan-refine" data-v="easier">Make it easier</button><button class="chip" data-a="plan-refine" data-v="harder">Make it harder</button><button class="chip" data-a="plan-refine" data-v="fun" aria-pressed="${dr.params.fun}">A playful session each week</button><button class="chip" data-a="plan-refine" data-v="longer">One more week</button></div>` : ""}
    <div class="stack" id="draft-sessions">${editRows(dr)}</div>
    <div class="stack" style="gap:8px"><button class="btn acc full" data-a="plan-save">Save plan</button><button class="btn full ghost" data-a="plan-reset">Start over</button></div></section>`;
  return `<section class="pad stack-l" id="plan-new">${back}<div><div class="eyebrow">Add a plan</div><h1 class="h1">${mode === "path" ? "Tell PATH what you want to coach" : "Bring a plan you already have"}</h1></div>
    <div class="seg full" role="group" aria-label="How to add a plan"><button data-a="plan-mode" data-v="path" aria-pressed="${mode === "path"}">Build with PATH</button><button data-a="plan-mode" data-v="own" aria-pressed="${mode === "own"}">Upload or paste</button></div>
    ${mode === "path" ? `<form class="stack" data-f="pgen"><label class="f">In your own words<textarea id="pprompt" class="inp big" rows="9" placeholder="Write it however you think of it.&#10;&#10;For example: six weeks for my Tuesday group towards a 5K, three sessions a week, one playful session, easy last week.&#10;&#10;Or type the sessions themselves, one per line. PATH puts it into weeks and sessions.">${esc(d.pwords || "")}</textarea></label><div class="filters" role="group" aria-label="Ideas"><button class="chip" type="button" data-a="plan-gen" data-v="4 weeks 10K build">4 weeks 10K build</button><button class="chip" type="button" data-a="plan-gen" data-v="6 weeks 5K with fun sessions">6 weeks 5K, playful</button><button class="chip" type="button" data-a="plan-gen" data-v="Race week taper">Race week taper</button><button class="chip" type="button" data-a="plan-gen" data-v="6 weeks strength for runners">Strength for runners</button></div><button class="btn acc full" type="submit">Draft it</button><p class="sub">PATH puts it into a plan you can still change, line by line. Nothing reaches an athlete from here.</p></form>`
    : `<form class="stack" data-f="ppaste"><label class="btn full filebtn" for="pfile">Choose a file</label><input class="sr" type="file" id="pfile" accept=".txt,.csv,.md,text/plain" aria-label="Choose a plan file"><label class="f">Or paste it here<textarea id="ptext" class="inp" rows="7" placeholder="Week 1&#10;Mon: 5 × 1 km at 10K pace&#10;Thu: tempo 25 min&#10;Sat: long run 70 min">${esc(d.ptext || "")}</textarea></label>${d.pnote ? `<p class="note" id="pnote">${esc(d.pnote)}</p>` : ""}<button class="btn acc full" type="submit">Read my plan</button><p class="sub">One session per line. "Week 2" starts a new week. In this demo PATH reads text files; PDFs, photos and spreadsheets come with the real app.</p></form>`}</section>`;
}
function vPlanDetail(p) {
  const d = dash(), groups = [...new Set(athletes().map((a) => a.group))], pick = d.pgroups || [], pers = personalFor(p);
  return `<section class="pad stack-l" id="plan-detail" data-plan="${p.id}"><div><button class="btn sm link ghost" data-a="plan-open" data-v="" aria-label="Back to plans">${I(P.back, 16)}Plans</button><div class="eyebrow" style="margin-top:8px">${p.source === "path" ? "Built with PATH" : p.source === "own" ? "Your upload" : "Your plan"}</div><h1 class="h1">${esc(p.title)}</h1><p class="sub" style="margin-top:4px" id="plan-status">${planMeta(p)} · ${p.shared.length ? `Shared with ${p.shared.map((g) => `${g} (${groupSize(g)})`).join(", ")}` : "Not shared yet"}</p></div>
    <div class="stack" id="share"><div class="eyebrow">Share with a group</div><div class="filters" role="group" aria-label="Groups">${groups.map((g) => `<button class="chip" data-a="plan-group" data-v="${g}" aria-pressed="${p.shared.includes(g) || pick.includes(g)}" ${p.shared.includes(g) ? "disabled" : ""}>${g} · ${groupSize(g)}</button>`).join("")}</div>
      ${pick.length ? `<button class="btn acc full" data-a="plan-share">Share with ${pick.join(" and ")}</button>` : `<p class="sub">${p.shared.length ? "Everyone in these groups sees it on their Path." : "Pick a group. Athletes see the plan on their Path once you share it."}</p>`}
      ${p.shared.length ? `<button class="btn sm link ghost" data-a="plan-unshare">Stop sharing</button>` : ""}</div>
    ${p.shared.length && pers.length ? `<div class="stack" id="personal"><div class="eyebrow">Personal versions</div><p class="sub">PATH suggests a lighter version for ${pers.length} ${pers.length === 1 ? "athlete" : "athletes"}, from what they share. Each one waits for your approval in Review; until then they get the plan as it is.</p><div class="card rows">${pers.slice(0, 5).map(({ a, st }) => `<button class="row" data-a="athlete" data-v="${a.id}"><span class="mid"><span class="strong">${esc(a.name)}</span><span class="sub">${esc(st.why)}</span></span><span class="end sub">Open</span></button>`).join("")}</div></div>` : ""}
    <div class="stack"><div class="between" style="align-items:center"><span class="eyebrow">Sessions</span><button class="btn sm" data-a="plan-edit">Edit plan</button></div>${sessionRows(p.sessions)}</div>
    ${p.shared.length ? "" : `<button class="btn full ghost" data-a="plan-del">Delete plan</button>`}</section>`;
}
/* What the athlete sees: only plans shared with their group, by their coach, at this club. */
function coachPlansCard() {
  if (S.org !== "pau") return "";
  const mine = plans().filter((p) => p.shared.includes("Track")); if (!mine.length) return "";
  return `<div class="stack" id="from-coach"><div class="eyebrow">From your coach</div>${mine.map((p) => `<div class="card stack" data-plan="${p.id}" style="gap:12px"><div><p class="h2">${esc(p.title)}</p><p class="sub">${COACH_ME} shared this with the Track group · ${planMeta(p)}</p></div><div class="rows">${p.sessions.filter((s) => s.week === 1).map((s) => `<div class="row"><span class="lead time" style="width:40px">${s.day || "·"}</span><span class="mid">${esc(s.text)}</span></div>`).join("")}</div></div>`).join("")}</div>`;
}
/* Free words in, structure out. If the coach wrote the sessions themselves (several lines, weekdays or "Week 2"), PATH keeps
   their words and only sorts them into weeks; if they described what they want, PATH drafts it. Either way it stays editable. */
function draftFromWords(text) {
  const d = dash(), parsed = parsePlan(text), lines = text.split(/\r?\n/).filter((l) => l.trim()).length;
  d.pwords = text;
  if (lines >= 2 && parsed.length >= 2 && (parsed.some((s) => s.day) || /(^|\n)\s*(week|woche|wk)\s*\d/i.test(text) || lines >= 3)) d.pdraft = { source: "own", title: "My plan", sessions: parsed };
  else newDraft(text);
}
const newDraft = (prompt) => { const params = planParams(prompt), names = { "10k": "10K build", "5k": "5K build", half: "Half marathon build", taper: "Race week taper", strength: "Strength for runners" }; dash().pdraft = { source: "path", params, title: `${names[params.kind]}${params.kind === "taper" ? "" : `, ${params.weeks} weeks`}`, sessions: genPlan(params) }; };
Object.assign(DASH_ACT, {
  "plan-open": (v) => { Object.assign(dash(), { planView: v || null, pdraft: null, pgroups: [], pnote: "" }); S.tab.coach = "plans"; lastKey = ""; },
  "plan-new": () => { Object.assign(dash(), { planView: "new", pdraft: null, pnote: "", ptext: "" }); lastKey = ""; },
  "plan-mode": (v) => { dash().pmode = v; }, "plan-gen": (v) => { newDraft(v); lastKey = ""; },
  "plan-refine": (v) => { const dr = dash().pdraft, p = dr.params; if (v === "easier") p.level -= 1; if (v === "harder") p.level += 1; if (v === "fun") p.fun = !p.fun; if (v === "longer" && p.kind !== "taper") p.weeks = Math.min(12, p.weeks + 1); dr.title = (document.getElementById("ptitle") || {}).value || dr.title; dr.sessions = genPlan(p); },
  "plan-reset": () => { dash().pdraft = null; lastKey = ""; },
  "plan-save": () => {
    const d = dash(), dr = d.pdraft, title = (document.getElementById("ptitle").value || "").trim() || dr.title, sessions = dr.sessions.filter((x) => x.text.trim()).map((x) => ({ ...x, text: x.text.trim() }));
    if (!sessions.length) { UI.toast = "Add at least one session before you save."; return; }
    const old = dr.editId && planById(dr.editId), id = old ? old.id : "p" + Date.now().toString(36);
    if (old) Object.assign(old, { title, sessions }); else plans().unshift({ id, title, source: dr.source, sessions, shared: [] });
    Object.assign(d, { pdraft: null, planView: id, pgroups: [] }); UI.toast = old ? (old.shared.length ? `Saved. ${old.shared.join(" and ")} see the new version.` : "Saved.") : "Plan saved. Only you can see it until you share it."; lastKey = "";
  },
  "plan-edit": () => { const d = dash(), p = planById(d.planView); d.pdraft = { source: p.source, editId: p.id, edited: true, title: p.title, sessions: p.sessions.map((x) => ({ ...x })) }; d.planView = "new"; lastKey = ""; },
  "plan-rm": (v) => { const dr = dash().pdraft; dr.sessions.splice(Number(v), 1); dr.edited = true; },
  "plan-add": (v) => { const dr = dash().pdraft, w = Number(v), at = dr.sessions.reduce((n, x, i) => (x.week === w ? i + 1 : n), dr.sessions.length); dr.sessions.splice(at, 0, { week: w, day: "", text: "" }); dr.edited = true; UI.focus = at; },
  "plan-addweek": () => { const dr = dash().pdraft; dr.sessions.push({ week: Math.max(0, ...dr.sessions.map((x) => x.week)) + 1, day: "", text: "" }); dr.edited = true; UI.focus = dr.sessions.length - 1; },
  "plan-group": (v) => { const d = dash(); d.pgroups = (d.pgroups || []).includes(v) ? d.pgroups.filter((g) => g !== v) : [...(d.pgroups || []), v]; },
  "plan-share": () => { const d = dash(), p = planById(d.planView), n = d.pgroups.reduce((s, g) => s + groupSize(g), 0); p.shared.push(...d.pgroups); UI.toast = `Shared with ${d.pgroups.join(" and ")}: ${n} athletes see it on their Path.`; d.pgroups = []; },
  "plan-unshare": () => { const p = planById(dash().planView); p.shared = []; UI.toast = "Sharing stopped. Athletes no longer see this plan."; },
  "plan-del": () => { const d = dash(); d.plans = plans().filter((p) => p.id !== d.planView); d.planView = null; UI.toast = "Plan deleted."; },
});
document.addEventListener("submit", (e) => {
  const f = e.target.dataset.f; if (f !== "pgen" && f !== "ppaste") return; e.preventDefault(); const d = dash();
  if (f === "pgen") { const v = document.getElementById("pprompt").value.trim(); if (!v) { document.getElementById("pprompt").focus(); return; } draftFromWords(v); }
  else { d.ptext = document.getElementById("ptext").value; const s = parsePlan(d.ptext); if (!s.length) { d.pnote = "PATH found no sessions. Put one session on each line."; } else { d.pnote = ""; d.pdraft = { source: "own", title: d.pfileName ? d.pfileName.replace(/\.[^.]+$/, "") : "My plan", sessions: s }; } }
  lastKey = ""; render();
});
document.addEventListener("change", (e) => {
  if (e.target.id !== "pfile" || !e.target.files[0]) return; const file = e.target.files[0], d = dash(); d.ptext = document.getElementById("ptext").value;
  if (!/\.(txt|csv|md)$/i.test(file.name) && !file.type.startsWith("text/")) { d.pnote = `"${file.name}" is not a text file. In this demo PATH reads .txt, .csv and .md; PDFs, photos and spreadsheets come with the real app.`; render(); return; }
  file.text().then((t) => { d.ptext = t.slice(0, 20000); d.pfileName = file.name; d.pnote = `Read "${file.name}". Check it below, then tap Read my plan.`; render(); });
});
/* Typing in the draft is kept as you type, with no redraw, so nothing is lost when a chip or button is tapped next. */
document.addEventListener("input", (e) => {
  const dr = dash().pdraft, t = e.target; if (!dr) return;
  if (t.id === "ptitle") { dr.title = t.value; return; }
  if (t.id === "pprompt") { dash().pwords = t.value; return; }
  const row = t.closest && t.closest(".srow"); if (!row) return;
  const x = dr.sessions[Number(row.dataset.i)]; if (!x) return;
  if (t.classList.contains("stext")) { x.text = t.value; t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; } else if (t.classList.contains("sday")) x.day = t.value;
  if (!dr.edited) { dr.edited = true; const chips = document.querySelector('#plan-draft [aria-label="Change the draft"]'); if (chips) chips.remove(); }
});
document.addEventListener("input", (e) => { if (e.target.id === "pprompt") dash().pwords = e.target.value; });

/* ================= Week (K-14 to K-18): every session the coach runs, groups and one-to-one, in one list ================= */
const planFor = (a) => plans().filter((p) => p.shared.includes(a.group));
const planNames = (a) => planFor(a).map((p) => p.title).join(", ") || "No plan from you yet";
const groupOf = (s) => (/technique/i.test(offOf(s).name) ? "Technique" : /track/i.test(offOf(s).name) ? "Track" : null);
/* What the shared plan says for this session: the plan of the session's group, its week, this weekday. */
function planLine(s, wk) {
  const g = groupOf(s), p = g && plans().find((x) => x.shared.includes(g)); if (!p) return null;
  const n = Math.min(weeksOf(p), wk + 1), hit = p.sessions.find((x) => x.week === n && x.day === WD[s.start.getDay()]);
  return hit ? { p, n, text: hit.text } : { p, n, text: "" };
}
/* One-to-one sessions. Invented, the same every week: three booked, one open slot. Only at the club where this coach has them. */
function oneToOnes(mon) {
  if (S.org !== "pau") return [];
  const at = (d, h, m) => { const x = addDays(mon, d); x.setHours(h, m, 0, 0); return x; }, R = roster();
  return [[1, 7, 0, R[9]], [2, 12, 15, R[27]], [3, 12, 15, null], [4, 7, 0, R[0]]].map(([d, h, m, a]) => ({ id: `pt-${d}`, one: true, start: at(d, h, m), athlete: a, dur: 60, loc: "Letzigrund" }));
}
function coachWeek(wk) {
  const mon = addDays(monday(today()), 7 * wk), end = addDays(mon, 7);
  const groups = sessList(S.org).filter((s) => s.start >= mon && s.start < end).map((s) => ({ id: s.id, one: false, start: s.start, s }));
  return { mon, items: [...groups, ...oneToOnes(mon)].sort((a, b) => a.start - b.start) };
}
function vCoachWeek() {
  const d = dash(), wk = d.wk || 0, kind = d.wkind || "all";
  if (d.sess && S.sessions[d.sess]) return vCoachSession(S.sessions[d.sess], wk);
  const { mon, items } = coachWeek(wk), g = items.filter((x) => !x.one), o = items.filter((x) => x.one && x.athlete), open = items.filter((x) => x.one && !x.athlete);
  const list = items.filter((x) => kind === "all" || (kind === "one") === x.one), T = today();
  const chip = (v, l) => `<button class="chip" data-a="wkind" data-v="${v}" aria-pressed="${kind === v}">${l}</button>`;
  const row = (x) => {
    if (!x.one) { const s = x.s, pl = planLine(s, wk); return `<button class="row" data-a="sess" data-v="${s.id}" data-kind="group" style="align-items:flex-start"><span class="lead time">${fTime(s.start)}</span><span class="mid"><span class="strong">${offOf(s).name}</span><span class="sub">Group · ${booked(s)} of ${s.cap} booked${waitTotal(s) ? ` · ${waitTotal(s)} waiting` : ""}</span><span class="sub">${pl ? `${esc(pl.p.title)}, week ${pl.n}${pl.text ? ": " + esc(pl.text) : ""}` : "No plan shared with this group"}</span></span></button>`; }
    if (!x.athlete) return `<div class="row" data-kind="open" style="align-items:flex-start"><span class="lead time">${fTime(x.start)}</span><span class="mid"><span class="strong">Open slot</span><span class="sub">One-to-one · ${x.dur} min · nobody has booked it yet</span></span></div>`;
    const st = statusOf(x.athlete);
    return `<button class="row" data-a="athlete" data-v="${x.athlete.id}" data-kind="one" style="align-items:flex-start"><span class="lead time">${fTime(x.start)}</span><span class="mid"><span class="strong">${sdot(st)}${esc(x.athlete.name)}</span><span class="sub">One-to-one · ${x.dur} min · ${esc(st.why)}</span><span class="sub">${esc(planNames(x.athlete))}</span></span></button>`;
  };
  const days = [...Array(7)].map((_, i) => addDays(mon, i)).map((day) => ({ day, rows: list.filter((x) => ymd(x.start) === ymd(day)) })).filter((x) => x.rows.length);
  return `<section class="pad stack-l" id="coach-week"><div><div class="weeknav"><button class="x" data-a="cwk" data-v="-1" aria-label="Previous week" ${wk <= 0 ? "disabled" : ""}>${I(P.back, 18)}</button><span class="eyebrow" aria-live="polite">${wk === 0 ? "This week" : wk === 1 ? "Next week" : `In ${wk} weeks`} · ${mon.getDate()} ${MOL[mon.getMonth()].slice(0, 3)} to ${addDays(mon, 6).getDate()} ${MOL[addDays(mon, 6).getMonth()].slice(0, 3)}</span><button class="x" data-a="cwk" data-v="1" aria-label="Next week" ${wk >= WEEKS - 1 ? "disabled" : ""}>${I(P.fwd, 18)}</button></div>
    <h1 class="h1" id="week-answer">${g.length + o.length} sessions: ${g.length} ${g.length === 1 ? "group" : "groups"}, ${o.length} one-to-one${open.length ? `, ${open.length} open ${open.length === 1 ? "slot" : "slots"}` : ""}</h1><p class="sub" style="margin-top:4px">Everything you coach this week. Tap a group for its plan and who is coming, or a person for their page.</p></div>
    <div class="stack"><div class="filters" role="group" aria-label="Show">${chip("all", "All")}${chip("group", "Groups")}${chip("one", "One-to-one")}</div>
    ${days.length ? days.map(({ day, rows }) => `<div class="stack" style="gap:8px" data-day="${ymd(day)}"><div class="sub" ${ymd(day) === ymd(T) ? 'style="color:var(--text);font-weight:500"' : ""}>${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day.getDay()]} ${day.getDate()}${ymd(day) === ymd(T) ? " · today" : ""}</div><div class="card rows">${rows.map(row).join("")}</div></div>`).join("") : `<p class="sub">Nothing here this week.</p>`}</div></section>`;
}
function vCoachSession(s, wk) {
  const pl = planLine(s, wk), names = rosterNames(s), mine = myBooking(s.id), R = roster();
  const people = [...(mine && HELD.includes(mine.status) ? [liveAthlete()] : []), ...names.booked.map((n) => R.find((a) => a.name === n)).filter(Boolean)].map((a) => ({ a, st: statusOf(a) })).sort((x, y) => y.st.level - x.st.level);
  const needs = people.filter((x) => x.st.level === 2).length;
  return `<section class="pad stack-l" id="coach-session" data-sid="${s.id}"><div><button class="btn sm link ghost" data-a="sess" data-v="" aria-label="Back to the week">${I(P.back, 16)}Week</button><div class="eyebrow" style="margin-top:8px">Group session · ${fDay(s.start)}</div><h1 class="h1">${offOf(s).name}, ${fTime(s.start)}</h1><p class="sub" style="margin-top:4px">${offOf(s).loc} · ${booked(s)} of ${s.cap} booked${waitTotal(s) ? ` · ${waitTotal(s)} waiting` : ""}</p></div>
    <button class="btn acc full" data-a="roster" data-v="${s.id}">Check in</button>
    <div class="stack" id="session-plan"><div class="eyebrow">Plan for this session</div>${pl && pl.text ? `<div class="card stack" style="gap:8px"><p style="font-size:18px;line-height:28px">${esc(pl.text)}</p><button class="btn sm link" data-a="plan-open" data-v="${pl.p.id}">${esc(pl.p.title)}, week ${pl.n}</button></div>` : `<p class="sub">${pl ? `${esc(pl.p.title)} has nothing on this day.` : "No plan is shared with this group."}</p><button class="btn sm link" data-a="tab" data-v="plans">Open Plans</button>`}</div>
    <div class="stack" id="attendees"><div class="between"><span class="eyebrow">Coming</span><span class="sub">${needs ? `${needs} ${needs === 1 ? "needs" : "need"} you` : "all on track"}</span></div><div class="card rows">${people.map(({ a, st }) => `<button class="row" data-a="athlete" data-v="${a.id}" style="align-items:flex-start"><span class="mid"><span class="strong">${sdot(st)}${esc(a.name)}</span><span class="sub" ${st.level ? 'style="color:var(--text)"' : ""}>${esc(st.why)}</span></span></button>`).join("")}</div>
    ${names.waiting.length ? `<p class="sub">Waiting: ${names.waiting.map(esc).join(", ")}.</p>` : ""}</div></section>`;
}
Object.assign(DASH_ACT, {
  sess: (v) => { dash().sess = v || null; S.tab.coach = "week"; lastKey = ""; },
  cwk: (v) => { const d = dash(); d.wk = Math.min(WEEKS - 1, Math.max(0, (d.wk || 0) + Number(v))); },
  wkind: (v) => { dash().wkind = v; },
});
