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
const FIRST = ["Lea", "Jonas", "Noah", "Lina", "Elias", "Nora", "Luca", "Emma", "Jan", "Sofia", "Tim", "Anna", "David", "Lara", "Samuel", "Elin", "Nico", "Mara", "Ben", "Chiara", "Fabio", "Selina", "Tariq", "Yara", "Milan", "Alina", "Robin"];
const LAST = ["Brunner", "Frei", "Weber", "Graf", "Suter", "Hofer", "Baumann", "Gerber", "Roth", "Zaugg", "Marti", "Egli", "Wyss", "Lüthi", "Kunz", "Arnold", "Steiner", "Bieri", "Aebi", "Hug", "Imhof", "Stucki", "Rahmani", "Haddad", "Novak", "Keller", "Moser"];
const GOALS = [["Sub-40 10K", "10K"], ["First 10K", "10K"], ["Sub-20 5K", "5K"], ["Sub-25 5K", "5K"], ["Half marathon in April", "Half marathon"], ["Sub-60 400 m", "Track"], ["Run three times a week", "Habit"]];
const LOG_TITLES = ["Track session", "Easy run", "Long run", "Technique session", "Gym session", "Tempo run"];
let ROSTER = null;
function roster() {
  if (ROSTER) return ROSTER;
  const r = rng(11), pick = (a) => a[Math.floor(r() * a.length)], T = today();
  /* A few fixed stories on top, so the screen always has something worth a coach's time; the rest is quiet. */
  const story = { 0: { away: 15, back: true }, 1: { pain: { where: "Knee", level: 6 }, load: 1.38 }, 2: { load: 1.41 }, 3: { away: 12 }, 4: { ask: "Can I swap Thursday for Saturday this week?" }, 5: { load: 1.22 }, 6: { away: 8 }, 7: { pain: { where: "Calf or shin", level: 4 }, sharePain: false } };
  ROSTER = FIRST.map((first, i) => {
    const st = story[i] || {}, g = pick(GOALS), stage = Math.floor(r() * 4), inSt = 1 + Math.floor(r() * 11), away = st.away ?? Math.floor(r() * 5), load = st.load ?? 0.82 + r() * 0.28;
    const shareLog = i % 9 !== 8, sharePain = st.sharePain ?? (!!st.pain || r() > 0.5);
    const logs = [0, 1, 2].map((k) => ({ id: `r${i}-${k}`, title: pick(LOG_TITLES), at: addDays(T, -(away + k * 2 + (k ? 1 : 0))), dur: 40 + Math.floor(r() * 6) * 10, rpe: 4 + Math.floor(r() * 5), ask: k === 0 ? st.ask : null }));
    return { id: "a" + i, live: false, name: `${first} ${LAST[i]}`, first, group: i % 3 === 2 ? "Technique" : "Track", goal: g[0], goalKind: g[1], stage, inSt, away, back: !!st.back, load, pain: st.pain || null, ask: st.ask || null,
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
    <div class="stack" id="needs"><div class="between"><span class="eyebrow">Needs you</span><span class="sub">${needs.length > 5 ? `5 of ${needs.length}` : needs.length}</span></div>${needs.length ? `<div class="card rows">${needs.slice(0, 5).map(({ a, st }) => `<button class="row" data-a="${st.kinds[0] === "draft" ? "tab" : "athlete"}" data-v="${st.kinds[0] === "draft" ? "review" : a.id}"><span class="mid"><span class="strong">${sdot(st)}${esc(a.name)}</span><span class="sub">${esc(st.why)}</span></span><span class="end sub">${st.kinds[0] === "draft" ? "Review" : "Open"}</span></button>`).join("")}</div>${needs.length > 5 ? `<button class="btn sm link" data-a="needs-all">See all ${needs.length} in Athletes</button>` : ""}` : `<p class="sub">Nothing is waiting for you.</p>`}</div>
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
  return `<section class="pad stack-l" id="athlete-detail" data-ath="${a.id}"><div><button class="btn sm link ghost" data-a="athlete" data-v="" aria-label="Back to athletes">${I(P.back, 16)}Athletes</button><div class="eyebrow" style="margin-top:8px">${esc(a.group)} group${M ? "" : " · demo data"}</div><h1 class="h1">${esc(a.name)}</h1><p class="sub" style="margin-top:4px" id="detail-status">${sdot(st)}${esc(st.why)}</p>${M && passOf(S.org) ? `<p class="sub" style="margin-top:4px">${passLine(passOf(S.org))}</p>` : ""}</div>
    <div class="stack"><div class="eyebrow">Path at a glance</div>${a.shares.path ? `<div class="card stack"><div><p class="h2">${esc(a.goal)}</p><div style="margin-top:12px">${pbar(a)}</div><p class="sub" style="margin-top:8px">${S.stages[a.stage]} · session ${a.inSt} of ${PER}</p></div>
      <div class="rows"><div class="row"><span class="mid sub">Next step</span><span class="strong" style="text-align:right">${esc(nextStep)}</span></div><div class="row"><span class="mid sub">Attendance this season</span><span class="strong">${a.attend}%</span></div>${a.shares.log ? (M ? S.pbs.map((p) => [p.metric, p.value, p.unit]) : a.pbs).slice(0, 2).map((p) => `<div class="row"><span class="mid sub">Best ${p[0]}</span><span class="strong">${p[1]} ${p[2]}</span></div>`).join("") : ""}</div></div>` : `<p class="sub">Goal and progress are not shared.</p>`}</div>
    ${a.shares.log ? `<div class="stack"><div class="between"><span class="eyebrow">Weekly load</span><span class="sub">${Math.round(a.load * 100)}% of usual</span></div>${M ? lineChart(loadPts(stats()), stats().wl.length - 1) : lineChart(a.pts, a.pts.length - 1)}</div>
    <div class="stack"><div class="eyebrow">Training log</div><div class="card rows" id="detail-logs">${logs.map(logRow).join("")}</div></div>` : `<p class="sub" id="log-private">Training log not shared.</p>`}
    <div class="stack"><div class="eyebrow">Plan</div><div class="card stack"><p class="sub">Current: <span class="strong" style="color:var(--text)">${M ? esc(S.plan.title) : ["Base block", "Build block", "Race block", "Recovery block"][a.stage % 4]}</span></p>${proposal}</div></div>
    <form class="stack" data-f="cnote" data-ath="${a.id}" style="gap:8px"><label class="f">Your private notes<input id="cnote" value="${esc(d.notes[a.id] || "")}" placeholder="Only you see this" autocomplete="off"></label><div class="between" style="align-items:center"><span class="sub">${esc(a.first)} never sees these notes.</span><button class="btn sm" type="submit">Save note</button></div></form>
    <p class="note" id="sharing">${esc(a.first)} shares with ${org}: ${shared.filter((x) => x[1]).map((x) => x[0].toLowerCase()).join(", ") || "name only"}. ${shared.some((x) => !x[1]) ? `Private: ${shared.filter((x) => !x[1]).map((x) => x[0].toLowerCase()).join(", ")}.` : "Nothing is held back."}</p></section>`;
}
const nextStep0 = () => { const n = nextStep(); return n.title; };

/* ---------- actions (merged into the shell's action map) ---------- */
const DASH_ACT = {
  athlete: (v) => { dash().athlete = v || null; S.tab.coach = "athletes"; lastKey = ""; },
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
