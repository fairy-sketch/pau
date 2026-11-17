"use strict";
/* PATH clickable demo: the coach and club dashboard (milestone A: Today, Athletes, Athlete detail).
   The athlete you can play (Mia) is read live from the shared state, so everything she does shows up here and
   everything the coach does shows up on her side. The other athletes are invented demo data, made the same way
   on every start. A coach only ever sees what an athlete shares with this club. */

/* Who you are as a coach depends on the club you are looking at (QA-19). */
const coachMe = () => ORGS[S.org].me.coach;
/* Where the coach is on the screen: which athlete, plan or session is open, and the filters. */
const DASH0 = () => ({ athlete: null, att: "all", group: "all" });
const dash = () => (S.dash ||= DASH0());
/* What the coach wrote and made: private notes, comments, answers, plans. Kept per club and never shown in another club (QA-07). */
const clubData = (org = S.org) => ((S.coach ||= {})[org] ||= { notes: {}, kudos: {}, answered: {}, plans: null, seq: 0 });

/* ---------- invented athletes ---------- */
function rng(seed) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/* What the invented athletes of a club train for and log. A running club and a studio are different people. */
const FLAVOUR = {
  pau: { seed: 11, goals: [["Sub-40 10K", "10K"], ["First 10K", "10K"], ["Sub-20 5K", "5K"], ["Sub-25 5K", "5K"], ["Half marathon in April", "Half marathon"], ["Sub-60 400 m", "Track"], ["Run three times a week", "Habit"]],
    logs: ["Track session", "Easy run", "Long run", "Technique session", "Gym session", "Tempo run"], pbs: (r) => [["5K", (19 + r() * 8).toFixed(1), "min"], ["400 m", (62 + r() * 20).toFixed(1), "s"]], next: ["Track", "Technique", "Long run"],
    /* The eight athletes with a story, spread over the list so they are not all one family. */
    story: { 0: { away: 15, back: true }, 9: { pain: { where: "Knee", level: 6 }, load: 1.38 }, 18: { load: 1.41 }, 27: { away: 12 }, 36: { ask: "Can I swap Thursday for Saturday this week?" }, 45: { load: 1.22 }, 6: { away: 8 }, 15: { pain: { where: "Calf or shin", level: 4 }, sharePain: false } } },
  studio: { seed: 23, goals: [["Three classes a week", "Habit"], ["Touch my toes", "Mobility"], ["Hold a handstand", "Strength"], ["First pull-up", "Strength"], ["Ride 40 km without a break", "Ride"], ["Feel fresh on Mondays", "Habit"]],
    logs: ["Yoga flow", "Strength", "Mobility", "HIIT", "Ride", "Walk"], pbs: (r) => [["Plank", (1.5 + r() * 2.5).toFixed(1), "min"], ["Classes in a row", String(3 + Math.floor(r() * 9)), "weeks"]], next: ["Yoga flow", "Mobility", "Strength"],
    story: { 3: { away: 13 }, 18: { ask: "Can I bring a friend to try Thursday's class?" }, 33: { load: 1.24 }, 48: { away: 16, back: true } } },
};
/* Every member of a club as their coach may see them. Built from the club's one member list (engine.js), the same on every start. */
const ROSTERS = {};
function roster(org = S.org) {
  if (ROSTERS[org]) return ROSTERS[org];
  const F = FLAVOUR[org], r = rng(F.seed), pick = (a) => a[Math.floor(r() * a.length)], T = today();
  /* A few fixed stories on top, so the screen always has something worth a coach's time; the rest is quiet. */
  ROSTERS[org] = baseMembers(org).map((m, i) => {
    const st = F.story[i] || {}, g = pick(F.goals), stage = Math.floor(r() * 4), inSt = 1 + Math.floor(r() * 11), away = st.away ?? Math.floor(r() * 5), load = st.load ?? 0.82 + r() * 0.28;
    const shareLog = i % 9 !== 8, sharePain = st.sharePain ?? (!!st.pain || r() > 0.5);
    const logs = [0, 1, 2].map((k) => ({ id: `${org === "pau" ? "r" : "q"}${i}-${k}`, title: pick(F.logs), at: addDays(T, -(away + k * 2 + (k ? 1 : 0))), dur: 40 + Math.floor(r() * 6) * 10, rpe: 4 + Math.floor(r() * 5), ask: k === 0 ? st.ask : null }));
    return { id: (org === "pau" ? "a" : "b") + i, live: false, m, name: m.name, first: m.first, group: m.group, goal: g[0], goalKind: g[1], stage, inSt, away, back: !!st.back, load, pain: st.pain || null, ask: st.ask || null,
      attend: Math.round(62 + r() * 36), shares: { path: true, log: shareLog, pain: sharePain }, logs, pbs: F.pbs(r), next: F.next,
      pts: [...Array(10)].map((_, k) => ({ l: "W" + (37 + k), v: Math.round(900 + r() * 500 + (k === 9 ? (load - 1) * 1400 : 0)) })) };
  });
  return ROSTERS[org];
}
/* Mia, as her coach is allowed to see her. */
function liveAthlete() {
  const st = stats(), op = shares("alerts.pain") ? openPain() : null, last = S.entries[0];
  return { id: "mia", live: true, name: S.me.name, first: S.me.name.split(" ")[0], group: ORGS[S.org].me.myGroup, goal: S.goal.title, goalKind: /10\s?k/i.test(S.goal.title) ? "10K" : /5\s?k/i.test(S.goal.title) ? "5K" : /half/i.test(S.goal.title) ? "Half marathon" : "Own goal", stage: S.stage, inSt: S.stageSessions,
    away: last ? Math.max(0, Math.round((today() - new Date(last.at)) / 864e5)) : 30, back: false, load: st.ratio, pain: op ? { where: op.painWhere, level: op.painLevel } : null, ask: null, attend: attendance(S.org),
    shares: { path: shares("path.read"), log: shares("log.read"), pain: shares("alerts.pain") }, draft: shares("plan.write") && S.draftStatus === "pending_review" };
}
/* A coach's athletes: the members in the coach's own groups at this club, and the athlete you play. */
const athletes = () => [liveAthlete(), ...roster().filter((a) => ORGS[S.org].me.groups.includes(a.group))];
/* Anyone at this club can be opened from a session they come to, whichever group they are in. */
const athleteById = (id) => (id === "mia" ? liveAthlete() : roster().find((a) => a.id === id));

/* ---------- status: always with the reason, in plain words, and only from what is shared ---------- */
function statusOf(a) {
  const pct = Math.round(a.load * 100), reasons = [];
  if (a.pain && a.shares.pain) reasons.push([2, `Shared a ${a.pain.where.toLowerCase()} flag, level ${a.pain.level}`, "pain"]);
  if (a.draft) reasons.push([2, "Plan draft waiting for you", "draft"]);
  if (a.ask && !clubData().answered[a.id]) reasons.push([2, "Asked you a question", "ask"]);
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

/* The sessions this coach runs. Colleagues' sessions are the admin's to see, not "yours" (QA-19). */
const mySessions = () => sessList(S.org).filter((s) => coachOf(s) === coachMe());
/* ---------- Today ---------- */
function vCoachToday() {
  const T = today(), all = mySessions(), todays = all.filter((s) => ymd(s.start) === ymd(T)), next = all.filter((s) => s.start > addDays(T, 1)).slice(0, 5);
  const coming = comingToday(), list = athletes().map((a) => ({ a, st: statusOf(a) })), needs = list.filter((x) => x.st.level === 2).sort((x, y) => Number(coming.has(y.a.name)) - Number(coming.has(x.a.name)) || y.st.kinds.length - x.st.kinds.length || (x.a.live ? -1 : 1));
  const back = list.find((x) => x.a.back), pain = list.find((x) => x.st.kinds.includes("pain"));
  const brief = [`${todays.length} ${todays.length === 1 ? "session" : "sessions"} today, ${todays.reduce((n, s) => n + booked(s), 0)} booked.`, back ? `${back.a.first} is back after ${Math.round(back.a.away / 7)} weeks off.` : "", pain ? `${pain.a.first} shared a ${pain.a.pain.where.toLowerCase()} flag, so a lighter option is ready for the next hard session.` : needs.length ? `${needs.length} ${needs.length === 1 ? "athlete needs" : "athletes need"} you.` : "Nobody needs you right now."].filter(Boolean).join(" ");
  const card = (s) => `<div class="card stack" data-today="${s.id}" style="gap:12px"><div class="between" style="align-items:flex-start"><span><span class="h2" style="display:block">${fTime(s.start)} · ${offOf(s).name}</span><span class="sub">${offOf(s).loc} · ${coachOf(s)}</span></span><span class="end"><span class="num">${booked(s)}<span class="sub" style="font-weight:400"> / ${s.cap}</span></span>${waitTotal(s) ? `<span class="sub" style="display:block">${waitTotal(s)} waiting</span>` : ""}</span></div><button class="btn acc full" data-a="roster" data-v="${s.id}">Check in</button></div>`;
  return `<section class="pad stack-l" id="coach-today"><div><div class="eyebrow">${esc(coachMe())} · ${esc(ORGS[S.org].name)}</div><h1 class="h1">${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][T.getDay()]}, ${T.getDate()} ${MOL[T.getMonth()]}</h1></div>
    <div class="stack" style="gap:8px"><p id="briefing" style="font-size:18px;line-height:28px">${esc(brief)}</p><p class="sub">Drafted by PATH from bookings and from what athletes share with this club.</p></div>
    <div class="stack"><div class="eyebrow">Today</div>${todays.length ? todays.map(card).join("") : `<p class="sub">No sessions today.</p>`}</div>
    <div class="stack" id="needs"><div class="between" style="align-items:center"><span class="eyebrow">Who needs what · ${needs.length > 5 ? `5 of ${needs.length}` : needs.length}</span><button class="btn sm" data-a="tab" data-v="alerts">Alerts</button></div>${needs.length ? `<div class="card rows">${needs.slice(0, 5).map(({ a, st }) => `<button class="row" data-a="${st.kinds[0] === "draft" ? "tab" : "athlete"}" data-v="${st.kinds[0] === "draft" ? "review" : a.id}"><span class="mid"><span class="strong">${sdot(st)}${esc(a.name)}</span><span class="sub">${esc(st.why)}</span><span class="sub" data-what style="color:var(--text)">${coming.has(a.name) ? "Coming today. " : ""}${esc(whatFor(a, st))}</span></span><span class="end sub">${st.kinds[0] === "draft" ? "Review" : "Open"}</span></button>`).join("")}</div>${needs.length > 5 ? `<button class="btn sm link" data-a="needs-all">See all ${needs.length} in Athletes</button>` : ""}` : `<p class="sub">Nothing is waiting for you.</p>`}</div>
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
  return `<section class="pad stack-l" id="coach-athletes"><div><div class="eyebrow">Athletes · ${all.length}</div><h1 class="h1" id="roster-answer">${n("needs")} ${n("needs") === 1 ? "needs" : "need"} you, ${n("watch")} to watch, ${n("ok")} on track</h1><p class="sub" style="margin-top:4px" id="your-groups">Your ${ORGS[S.org].me.groups.length === 1 ? "group" : "groups"}: ${ORGS[S.org].me.groups.join(" and ")}, ${all.length} of ${members(S.org).length + 1} members. You see only what each athlete shares with ${esc(ORGS[S.org].name)}.</p></div>
    <div class="stack"><div class="filters" role="group" aria-label="Filter by attention">${chip("att", "all", "All", d.att === "all")}${chip("att", "needs", "Needs you", d.att === "needs")}${chip("att", "watch", "Watch", d.att === "watch")}${chip("att", "ok", "On track", d.att === "ok")}</div>
    <div class="filters" role="group" aria-label="Filter by group or goal">${chip("agroup", "all", "Everyone", d.group === "all")}${groups.map((g) => chip("agroup", g, g, d.group === g)).join("")}${kinds.map((g) => chip("agroup", g, g, d.group === g)).join("")}</div>
    ${list.length ? `<div class="card rows" id="athlete-list">${list.map(({ a, st }) => `<button class="row" data-a="athlete" data-v="${a.id}" data-status="${st.key}" style="align-items:flex-start"><span class="mid"><span class="strong">${sdot(st)}${esc(a.name)}</span><span class="sub">${a.shares.path ? esc(a.goal) : "Goal not shared"} · ${lastLogText(a)}</span>${a.shares.path ? pbar(a) : ""}<span class="sub why" ${st.level ? 'style="color:var(--text)"' : ""}>${esc(st.why)}</span></span></button>`).join("")}</div>` : `<p class="sub" id="athletes-none">Nobody matches these filters.</p>`}</div>
    <p class="sub">Demo data: the athletes besides ${esc(S.me.name)} are invented.</p></section>`;
}

/* ---------- Athlete detail ---------- */
function vAthleteDetail(a) {
  const d = dash(), st = statusOf(a), M = a.live, org = esc(ORGS[S.org].name);
  const shared = [["Goal and progress", a.shares.path], ["Training log", a.shares.log], ["Pain flags", a.shares.pain]];
  const logs = M ? S.entries.slice(0, 5).map((e) => ({ id: e.id, title: e.title, at: e.at, dur: e.dur, rpe: e.rpe, pain: e.pain && a.shares.pain ? `pain ${e.painLevel}, ${e.painWhere}` : "", comments: e.comments, real: true })) : a.logs.map((l) => ({ ...l, pain: "", comments: [...(l.ask ? [{ by: a.first, text: l.ask }] : []), ...(clubData().kudos[l.id] || [])] }));
  const canComment = M ? shares("log.comment") : true;
  const logRow = (e) => `<div class="row" data-log="${e.id}" style="align-items:flex-start"><span class="mid"><span class="strong">${esc(e.title)}</span><span class="sub">${fDay(e.at)} · ${e.dur} min · RPE ${e.rpe}${e.pain ? " · " + esc(e.pain) : ""}</span>${e.comments.map((c) => `<span class="note" style="margin-top:8px"><span class="strong" style="color:var(--text)">${esc(c.by)}</span> ${esc(c.text)}</span>`).join("")}${canComment ? `<form data-f="${e.real ? "comment" : "dcomment"}" data-id="${e.id}" data-ath="${a.id}" style="display:flex;gap:8px;margin-top:8px;align-items:center"><input class="inp" style="min-height:44px" id="c-${e.id}" aria-label="Comment on ${esc(e.title)}, ${fDay(e.at)}" placeholder="Add a comment"><button class="btn sm" type="submit">Send</button><button class="btn sm" type="button" data-a="kudos" data-v="${a.id}|${e.id}" aria-label="Kudos for ${esc(e.title)}, ${fDay(e.at)}${kudosSent(a, e.id) ? ": sent" : ""}" ${kudosSent(a, e.id) ? "disabled" : ""}>${kudosSent(a, e.id) ? "Kudos sent" : "Kudos"}</button></form>` : ""}</span></div>`;
  const nextStep = M ? nextStep0() : st.kinds.includes("pain") ? "Easy session, then check the flag" : a.back ? "Comeback session, short and easy" : `${a.next[a.inSt % 3]}${org === "PAU Trackrunning" ? " session" : ""}`;
  const draft = M && a.draft ? currentDraft() : null;
  const proposal = draft ? `<div class="stack" style="gap:8px" id="proposal"><p class="strong">PATH proposes: ${esc(draft.title)}</p><p class="sub">${esc(draft.rationale)}</p><ul class="stack" style="gap:4px">${draft.items.filter((i) => i.changed).slice(0, 4).map((i) => `<li><span class="sub">${i.day}:</span> ${esc(i.to)}</li>`).join("")}</ul><button class="btn sm link" data-a="tab" data-v="review">Open in Review</button></div>`
    : !M && (st.kinds.includes("pain") || st.kinds.includes("load")) ? `<div class="stack" style="gap:8px" id="proposal"><p class="strong">PATH proposes: make Thursday easy</p><p class="sub">Why: ${esc(st.why.toLowerCase())}. The change waits in your review queue; ${esc(a.first)} sees nothing until you approve.</p></div>`
    : `<p class="sub">No changes proposed.</p>`;
  return `<section class="pad stack-l" id="athlete-detail" data-ath="${a.id}"><div><button class="btn sm link ghost" data-a="athlete-back" aria-label="Back to ${d.from === "week" ? "the session" : "athletes"}">${I(P.back, 16)}${d.from === "week" ? "Back" : "Athletes"}</button><div class="eyebrow" style="margin-top:8px">${esc(a.group)} group${M ? "" : " · demo data"}</div><h1 class="h1">${esc(a.name)}</h1><p class="sub" style="margin-top:4px" id="detail-status">${sdot(st)}${esc(st.why)}</p>${M && passOf(S.org) ? `<p class="sub" style="margin-top:4px">${passLine(passOf(S.org))}</p>` : ""}${!M ? `<p class="sub" style="margin-top:4px" id="member-pass">${esc(a.m.product)}${a.m.left != null ? ` · ${a.m.left} left` : ""}${hasPT() && ptPack(a).of ? ` · PT 10-pack, ${ptPack(a).left} of ${ptPack(a).of} left` : ""}</p>` : ""}${!M && hasPT() ? `<button class="btn sm" style="margin-top:12px" data-a="pt-sell" data-v="${a.m.id}">Sell a PT 10-pack</button>` : ""}</div>
    <div class="stack"><div class="eyebrow">Path at a glance</div>${a.shares.path ? `<div class="card stack"><div><p class="h2">${esc(a.goal)}</p><div style="margin-top:12px">${pbar(a)}</div><p class="sub" style="margin-top:8px">${S.stages[a.stage]} · session ${a.inSt} of ${PER}</p></div>
      <div class="rows"><div class="row"><span class="mid sub">Next step</span><span class="strong" style="text-align:right">${esc(nextStep)}</span></div><div class="row"><span class="mid sub">Attendance this season</span><span class="strong" id="attendance">${M ? (a.attend ? `${a.attend.pct}% · ${a.attend.came} of ${a.attend.of}` : "No sessions yet") : a.attend + "%"}</span></div>${a.shares.log ? (M ? S.pbs.map((p) => [p.metric, p.value, p.unit]) : a.pbs).slice(0, 2).map((p) => `<div class="row"><span class="mid sub">Best ${p[0]}</span><span class="strong">${p[1]} ${p[2]}</span></div>`).join("") : ""}</div></div>` : `<p class="sub">Goal and progress are not shared.</p>`}</div>
    ${a.shares.log ? `<div class="stack"><div class="between"><span class="eyebrow">Weekly load</span><span class="sub">${Math.round(a.load * 100)}% of usual</span></div>${M ? lineChart(loadPts(stats()), stats().wl.length - 1) : lineChart(a.pts, a.pts.length - 1)}</div>
    <div class="stack"><div class="eyebrow">Training log</div>${logs.length ? "" : `<p class="sub">No sessions logged yet.</p>`}<div class="card rows" id="detail-logs" ${logs.length ? "" : "hidden"}>${logs.map(logRow).join("")}</div></div>` : `<p class="sub" id="log-private">Training log not shared.</p>`}
    <div class="stack"><div class="eyebrow">Plan</div><div class="card stack"><p class="sub" id="plan-from-you">From you: <span class="strong" style="color:var(--text)">${esc(planNames(a))}</span></p>${M && shares("path.read") ? `<p class="sub" id="plan-changes-coach">${(() => { const ch = S.plan.items.filter((x) => planWeekOf(x.date) >= 1 && planChanged(x)), you = ch.filter((x) => planChanged(x) === "you").length; return ch.length ? [you ? `${you} ${you === 1 ? "day" : "days"} eased by ${esc(a.first)}` : "", ch.length - you ? `${ch.length - you} changed by you in review` : ""].filter(Boolean).join(" · ") : `${esc(a.first)} follows it as you set it.`; })()}</p>` : ""}${proposal}</div></div>
    <form class="stack" data-f="cnote" data-ath="${a.id}" style="gap:8px"><label class="f">Your private notes<input id="cnote" value="${esc(clubData().notes[a.id] || "")}" placeholder="Only you see this" autocomplete="off"></label><div class="between" style="align-items:center"><span class="sub">${esc(a.first)} never sees these notes.</span><button class="btn sm" type="submit">Save note</button></div></form>
    ${(() => { const ns = Object.entries(clubData().sessNotes || {}).filter(([k]) => k.split("|")[1] === a.name).map(([k, v]) => ({ s: S.sessions[k.split("|")[0]], v })).filter((x) => x.s).sort((x, y) => y.s.start - x.s.start); return ns.length ? `<div class="stack" id="session-notes" style="gap:8px"><div class="eyebrow">Your notes from sessions</div><div class="card rows">${ns.map((x) => `<div class="row"><span class="mid"><span>${esc(x.v)}</span><span class="sub">${offOf(x.s).name}, ${fDay(x.s.start)}</span></span></div>`).join("")}</div></div>` : ""; })()}
    <p class="note" id="sharing">${esc(a.first)} shares with ${org}: ${shared.filter((x) => x[1]).map((x) => x[0].toLowerCase()).join(", ") || "name only"}. ${shared.some((x) => !x[1]) ? `Private: ${shared.filter((x) => !x[1]).map((x) => x[0].toLowerCase()).join(", ")}.` : "Nothing is held back."}</p></section>`;
}
const isKudos = (c) => c.by === coachMe() && c.text === "Kudos. Well done.";
const kudosSent = (a, lid) => (a.live ? ((S.entries.find((e) => String(e.id) === String(lid)) || {}).comments || []).some(isKudos) : (clubData().kudos[lid] || []).some(isKudos));
const nextStep0 = () => { const n = nextStep(); return n.title; };

/* ---------- actions (merged into the shell's action map) ---------- */
const DASH_ACT = {
  athlete: (v) => { const d = dash(); d.from = S.tab.coach === "week" ? "week" : "athletes"; d.athlete = v || null; S.tab.coach = "athletes"; UI.sheet = null; lastKey = ""; },
  "athlete-back": () => { const d = dash(); d.athlete = null; if (d.from === "week") S.tab.coach = "week"; lastKey = ""; },
  att: (v) => { dash().att = v; }, agroup: (v) => { dash().group = v; },
  "needs-all": () => { Object.assign(dash(), { att: "needs", group: "all", athlete: null }); S.tab.coach = "athletes"; },
  kudos: (v) => {
    const [aid, lid] = v.split("|"), a = athleteById(aid);
    if (kudosSent(a, lid)) { UI.toast = "Kudos already sent for this one."; return; }
    if (a.live) S.entries.find((e) => String(e.id) === lid).comments.push({ by: coachMe(), text: "Kudos. Well done." });
    else (clubData().kudos[lid] ||= []).push({ by: coachMe(), text: "Kudos. Well done." });
    UI.toast = `Kudos sent to ${a.first}.`;
  },
};
document.addEventListener("submit", (e) => {
  const f = e.target.dataset.f; if (f !== "cnote" && f !== "dcomment") return;
  e.preventDefault(); const a = athleteById(e.target.dataset.ath);
  if (f === "cnote") { clubData().notes[a.id] = document.getElementById("cnote").value.trim(); UI.toast = `Note saved. Only you can see it, and only at ${ORGS[S.org].name}.`; }
  else { const inp = e.target.querySelector("input"), v = inp.value.trim(); if (!v) return; (clubData().kudos[e.target.dataset.id] ||= []).push({ by: coachMe(), text: v }); if (a.ask) clubData().answered[a.id] = true; UI.toast = `Sent to ${a.first}.`; }
  render();
});

/* ================= Plans (K-7 to K-11): upload or paste a plan, or build one with PATH, then share it with a group ================= */
const PLAN_SEED = (org) => (org === "pau" ? [
  { id: "p1", title: "Base block", source: "Yours", sessions: genPlan({ kind: "10k", weeks: 4, level: 0, fun: false }), shared: ["Track"] },
  { id: "p2", title: "Race week taper", source: "Yours", sessions: genPlan({ kind: "taper", weeks: 1, level: 0, fun: false }), shared: [] },
] : [
  { id: "s1", title: "Hips and hamstrings, 4 weeks", source: "Yours", sessions: [1, 2, 3, 4].flatMap((w) => [{ week: w, day: "Tue", text: `Flow: ${["hip openers, long holds", "hamstrings and calves", "twists and side body", "slow full sequence"][w - 1]}` }, { week: w, day: "Thu", text: `Flow: balance and core, ${15 + 5 * w} min standing work` }]), shared: [] },
]);
/* A club's plans. Each club has its own list; nothing crosses over. */
const plans = (org = S.org) => (clubData(org).plans ||= PLAN_SEED(org));
/* The plans a group has, the one shared last first: that one is the plan the group follows now. */
const plansOf = (g, org = S.org) => plans(org).filter((p) => p.shared.includes(g)).sort((a, b) => (b.seq || 0) - (a.seq || 0));
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
    else { add(w, "Mon", `Track: ${Math.max(3, 4 + k)} × 1 km at 10K pace, 2 min jog`); add(w, "Thu", `Tempo run: ${Math.max(15, 20 + 5 * k)} min steady`); add(w, "Sun", `Long run: ${Math.max(50, 60 + 10 * k)} min easy`); }
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
    ${d.pnote ? `<p class="note" id="pnote">${esc(d.pnote)}</p>` : ""}
    ${dr.ai ? `<form class="stack" data-f="predo" style="gap:8px"><label class="f">Tell PATH what to change<textarea id="pchange" class="inp" rows="2" style="min-height:72px" placeholder="More hills in week 3, and make Saturdays shorter"></textarea></label><button class="btn sm link" type="submit" ${d.pbusy ? "disabled" : ""}>${d.pbusy ? "Redrafting…" : "Redraft"}</button></form>` : ""}
    ${dr.source === "path" && !dr.ai && !dr.edited ? `<div class="filters" role="group" aria-label="Change the draft"><button class="chip" data-a="plan-refine" data-v="easier">Make it easier</button><button class="chip" data-a="plan-refine" data-v="harder">Make it harder</button><button class="chip" data-a="plan-refine" data-v="fun" aria-pressed="${dr.params.fun}">A playful session each week</button><button class="chip" data-a="plan-refine" data-v="longer">One more week</button></div>` : ""}
    <div class="stack" id="draft-sessions">${editRows(dr)}</div>
    <div class="stack" style="gap:8px"><button class="btn acc full" data-a="plan-save">Save plan</button><button class="btn full ghost" data-a="plan-reset">Start over</button></div></section>`;
  return `<section class="pad stack-l" id="plan-new">${back}<div><div class="eyebrow">Add a plan</div><h1 class="h1">${mode === "path" ? "Tell PATH what you want to coach" : "Bring a plan you already have"}</h1></div>
    <div class="seg full" role="group" aria-label="How to add a plan"><button data-a="plan-mode" data-v="path" aria-pressed="${mode === "path"}">Build with PATH</button><button data-a="plan-mode" data-v="own" aria-pressed="${mode === "own"}">Upload or paste</button></div>
    ${mode === "path" ? `<form class="stack" data-f="pgen"><label class="f">In your own words<textarea id="pprompt" class="inp big" rows="9" placeholder="Write it however you think of it.&#10;&#10;For example: six weeks for my Tuesday group towards a 5K, three sessions a week, one playful session, easy last week.&#10;&#10;Or type the sessions themselves, one per line. PATH puts it into weeks and sessions.">${esc(d.pwords || "")}</textarea></label><div class="filters" role="group" aria-label="Ideas"><button class="chip" type="button" data-a="plan-gen" data-v="4 weeks 10K build">4 weeks 10K build</button><button class="chip" type="button" data-a="plan-gen" data-v="6 weeks 5K with fun sessions">6 weeks 5K, playful</button><button class="chip" type="button" data-a="plan-gen" data-v="Race week taper">Race week taper</button><button class="chip" type="button" data-a="plan-gen" data-v="6 weeks strength for runners">Strength for runners</button></div><button class="btn acc full" type="submit" ${d.pbusy ? "disabled" : ""}>${d.pbusy ? "Drafting…" : "Draft it"}</button><p class="sub">PATH puts it into a plan you can still change, line by line. Nothing reaches an athlete from here.</p></form>`
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
/* ---- ONE plan (QA-13, replaces K-19 to K-21's separate card) ----
   S.plan.items is the athlete's plan, day by day, and the only place a plan lives on her side. Three layers go into it:
   1. the days her coach set: the newest plan shared with her group at PAU (week 1 of it is this week);
   2. her own days in between (what each day is without a coach's plan is kept in `base`);
   3. changes on top: a day she eased herself, or a change her coach approved in Review. A changed day keeps its change.
   Path, Week, the next step, the easy week, the guardrails and the coach's view of her all read these same items. */
const MY_GROUP = ORGS.pau.me.myGroup, MY_COACH = ORGS.pau.me.coach;
const myPlans = () => plansOf(MY_GROUP, "pau");
const planName = () => (myPlans()[0] ? myPlans()[0].title : S.plan.title);
const planWeekOf = (date) => Math.floor((sod(new Date(date + "T12:00")) - monday(today())) / 6048e5) + 1;
/* Lays the coach's plan over the days nobody changed. Runs before every draw, so sharing, unsharing or editing a plan shows at once. */
function syncPlan() {
  const p = myPlans()[0]; ensurePlan(p ? weeksOf(p) : WEEKS);
  for (const it of S.plan.items) {
    if (!it.base) it.base = { kind: it.kind, title: it.title, off: it.off };
    if (planChanged(it) || it.date < ymd(today())) continue;
    const wk = planWeekOf(it.date), line = p && wk >= 1 && wk <= weeksOf(p) ? p.sessions.find((x) => x.week === wk && x.day === WD[new Date(it.date + "T12:00").getDay()]) : null;
    if (!line) { Object.assign(it, { ...it.base, what: "", from: "" }); continue; }
    const s = sessList("pau").find((x) => ymd(x.start) === it.date && groupOf(x) === MY_GROUP);
    if (s) Object.assign(it, { kind: "club", off: s.off, title: offOf(s).name, what: line.text, from: p.id }); // her group trains that day: the coach's line is what happens in that session
    else Object.assign(it, { kind: /^rest\b/i.test(line.text) ? "rest" : "workout", off: null, title: line.text, what: "", from: p.id });
  }
}
/* One week of the plan as rows: its seven days, then the coach's lines that have no day. */
function planWeekRows(n) {
  const p = myPlans()[0], mon = addDays(monday(today()), 7 * (n - 1)), rows = [];
  for (let i = 0; i < 7; i++) { const d = addDays(mon, i), it = S.plan.items.find((x) => x.date === ymd(d)); if (it) rows.push({ key: it.date, day: WD[d.getDay()], date: d, it, text: planText(it), n }); }
  if (p) p.sessions.forEach((x, i) => { if (x.week === n && !x.day) rows.push({ key: `any-${i}`, day: "", date: null, it: null, text: x.text, n }); });
  return rows;
}
/* Every row of the plan says two things, always in the same words (step 0):
   where the day comes from: "From Coach Sara", "Your own day", "Eased by you" or "Changed by Coach Sara";
   and, if there is something to say, where it stands: "Club session · 18:30", "Booked · 18:30", "Done" or "Missed". */
function planRowState(r) {
  const it = r.it, who = it ? planChanged(it) : "";
  const base = it && it.base && it.base.kind === "club" ? it.base.off : null, s = it && (it.off || (who && base)) ? S.sessions[`pau-${it.off || base}-${it.date}`] : null, mineB = s && myBooking(s.id);
  const done = it && S.entries.some((e) => ymd(e.at) === it.date), club = it && it.kind === "club" && s;
  const origin = who === "you" ? "Eased by you" : who === "coach" ? `Changed by ${MY_COACH}` : !it || it.from ? `From ${MY_COACH}` : "Your own day";
  const stands = !it ? "any day" : who ? "" : done ? "Done" : club ? (mineB ? `Booked · ${fTime(s.start)}` : s.start < now() ? "Missed" : `Club session · ${fTime(s.start)}`) : "";
  return { s: club ? s : null, was: who && s ? s : null, mineB, done, origin, stands, label: stands ? `${origin} · ${stands}` : origin, who };
}
/* Your plan on Path: one week at a time, every day a row you can open. */
function coachPlansCard() {
  const mine = myPlans(), p = mine[0], N = Math.max(p ? weeksOf(p) : 1, WEEKS), n = Math.min(N, Math.max(1, dash().myWeek || 1));
  const changed = S.plan.items.filter((x) => planWeekOf(x.date) >= 1 && planChanged(x)), byYou = changed.filter((x) => planChanged(x) === "you").length, byCoach = changed.length - byYou;
  const rows = planWeekRows(n).map((r) => { const st = planRowState(r); return `<button class="row" data-a="planday" data-v="${r.key}" data-origin="${st.who || (r.it && !r.it.from ? "own" : "coach")}" style="align-items:flex-start"><span class="lead time" style="width:40px">${r.day || "·"}</span><span class="mid"><span>${esc(r.text)}</span><span class="sub">${st.label}</span></span></button>`; }).join("");
  return `<div class="stack" id="from-coach"><div class="eyebrow">Your plan</div><div class="card stack" data-plan="${p ? p.id : "own"}" style="gap:12px"><div><p class="h2">${esc(planName())}</p><p class="sub">${p ? `${MY_COACH} shared this with the ${MY_GROUP} group · ${esc(ORGS.pau.name)}` : `${MY_COACH} has not shared a plan with the ${MY_GROUP} group yet. These are your own days.`}</p>${changed.length ? `<p class="sub" id="plan-changes">${[byYou ? `${byYou} ${byYou === 1 ? "day" : "days"} eased by you` : "", byCoach ? `${byCoach} ${byCoach === 1 ? "day" : "days"} changed by ${MY_COACH}` : ""].filter(Boolean).join(" · ")}</p>` : ""}</div>
    <div class="weeknav" style="margin:0 -12px"><button class="x" data-a="myweek" data-v="-1" aria-label="Previous week of the plan" ${n <= 1 ? "disabled" : ""}>${I(P.back, 18)}</button><span class="sub" id="plan-week" aria-live="polite"><span class="strong" style="color:var(--text)">Week ${n} of ${N}</span>${n === 1 ? " · this week" : ""}</span><button class="x" data-a="myweek" data-v="1" aria-label="Next week of the plan" ${n >= N ? "disabled" : ""}>${I(P.fwd, 18)}</button></div>
    <div class="rows" id="plan-days" style="margin-top:-12px">${rows}</div></div>
    ${mine.length > 1 ? `<p class="sub" id="also-shared">Also from your coach: ${mine.slice(1).map((x) => esc(x.title)).join(", ")}.</p>` : ""}</div>`;
}
/* One day of the plan, opened: what to do, where it comes from, and the one thing to do next. */
function vPlanDaySheet() {
  const p = myPlans()[0], N = Math.max(p ? weeksOf(p) : 1, WEEKS), all = [...Array(N)].flatMap((_, k) => planWeekRows(k + 1)), r = all.find((x) => x.key === UI.sheet.key); if (!r) return "";
  const st = planRowState(r), s = st.s, it = r.it, full = r.date ? WDL[r.date.getDay()] : "Any day";
  const source = st.who ? `${st.origin}.${it.was ? ` It was: ${esc(it.was)}.` : ""}` : st.origin === "Your own day" ? "Your own day. Your coach has not set anything for it." : `${st.origin} · ${esc(p.title)}`;
  const upcoming = s && s.start > now();
  const next = st.done ? `<p class="sub">Logged. Well done.</p>` : s && st.mineB ? `<button class="btn acc full" data-a="sheet" data-v="${s.id}">Manage booking</button>` : upcoming ? `<button class="btn acc full" data-a="sheet" data-v="${s.id}">Book this session</button>` : it && it.kind !== "rest" && r.n === 1 ? `<button class="btn acc full" data-a="tab" data-v="log">Log it</button>` : "";
  const still = st.was && myBooking(st.was.id) && st.was.start > now() ? `<div class="card stack" style="gap:8px"><p class="sub">You are still booked for ${offOf(st.was).name} at ${fTime(st.was.start)}.</p><button class="btn full" data-a="sheet" data-v="${st.was.id}">Manage booking</button></div>` : "";
  return `<div class="sheetbg" data-a="close"><div class="sheet stack-l" id="planday" role="dialog" aria-modal="true" aria-label="${full}, week ${r.n}"><div><div class="eyebrow">${full} · week ${r.n} of ${N}</div><p class="h1" style="margin-top:8px">${esc(r.text)}</p><p class="sub" style="margin-top:8px" id="planday-source">${source}</p></div>
    ${s ? `<div class="card stack" style="gap:4px"><p class="h2">${offOf(s).name}, ${fTime(s.start)}</p><p class="sub">${fDay(s.start)} · ${offOf(s).loc} · ${coachOf(s)}</p><p class="sub">${st.stands}</p></div>` : still || (it && it.kind === "rest" ? "" : r.n === 1 ? `<p class="sub">The club has no session for this one. Do it on your own, then log it.</p>` : `<p class="sub">Comes up in week ${r.n}.</p>`)}
    <div class="stack" style="gap:8px">${next}<button class="btn full ghost" data-a="planday-close">Close</button></div></div></div>`;
}
/* On a session in the athlete's Week: what the plan says for it, changes included. */
function myPlanNote(s) {
  if (s.org !== "pau") return "";
  const it = S.plan.items.find((x) => x.date === ymd(s.start) && (x.off === s.off || (planChanged(x) && x.base && x.base.off === s.off)));
  if (!it || !(it.what || planChanged(it))) return "";
  return `<p class="note" id="plan-note" style="margin-top:-4px"><span class="strong" style="color:var(--text)">Your plan:</span> ${esc(planText(it))}${planChanged(it) === "you" ? " (eased by you)" : planChanged(it) === "coach" ? ` (changed by ${MY_COACH})` : ""}</p>`;
}
/* The real language model (K-23): on the hosted demo, "Draft it" asks PATH's server function, which holds the key.
   Anywhere else (opened as a file, in tests, in the Claude artifact) there is no server, and the written rules below draft instead. */
const llmUrl = () => (window.PATH_LLM_URL !== undefined ? window.PATH_LLM_URL : /(^|\.)netlify\.app$|^localhost$|^127\.0\.0\.1$/.test(location.hostname) ? "/api/coach" : null);
async function askModel(payload) {
  const res = await fetch(llmUrl(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(28000) });
  if (!res.ok) throw new Error("model " + res.status);
  const plan = await res.json(); if (!plan || !Array.isArray(plan.sessions) || !plan.sessions.length) throw new Error("format");
  return plan;
}
/* Draft with the model if there is one; fall back to the rules, and say so, if it cannot be reached. */
async function draftWithPath(words, change) {
  const d = dash(), cur = d.pdraft; d.pwords = words;
  if (!llmUrl()) { draftFromWords(words); return; }
  d.pbusy = true; d.pnote = ""; render();
  try {
    const plan = await askModel(change ? { words, change, current: { title: cur.title, sessions: cur.sessions } } : { words });
    d.pdraft = { source: "path", ai: true, edited: false, title: plan.title, sessions: plan.sessions, editId: cur && cur.editId };
  } catch (e) {
    if (change) d.pnote = "PATH could not redraft just now. Your draft is unchanged; try again in a moment.";
    else { draftFromWords(words); d.pnote = "PATH's writer could not be reached, so this draft follows simple rules. Try again in a moment for a fuller one."; }
  }
  d.pbusy = false; lastKey = ""; render();
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
  "plan-mode": (v) => { dash().pmode = v; }, "plan-gen": (v) => { if (llmUrl()) { draftWithPath(v); return; } newDraft(v); lastKey = ""; },
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
  "plan-share": () => { const d = dash(), p = planById(d.planView), n = d.pgroups.reduce((s, g) => s + groupSize(g), 0); p.shared.push(...d.pgroups); p.seq = clubData().seq = (clubData().seq || 0) + 1; UI.toast = `Shared with ${d.pgroups.join(" and ")}: ${n} athletes see it on their Path.`; d.pgroups = []; },
  "plan-unshare": () => { const p = planById(dash().planView); p.shared = []; UI.toast = "Sharing stopped. Athletes no longer see this plan."; },
  "plan-del": () => { const d = dash(); clubData().plans = plans().filter((p) => p.id !== d.planView); d.planView = null; UI.toast = "Plan deleted."; },
});
document.addEventListener("submit", (e) => {
  const f = e.target.dataset.f; if (f !== "pgen" && f !== "ppaste" && f !== "predo") return; e.preventDefault(); const d = dash();
  if (f === "predo") { const v = document.getElementById("pchange").value.trim(); if (!v || d.pbusy) return; draftWithPath(d.pwords || d.pdraft.title, v); return; }
  if (f === "pgen") { const v = document.getElementById("pprompt").value.trim(); if (!v) { document.getElementById("pprompt").focus(); return; } if (d.pbusy) return; if (llmUrl()) { draftWithPath(v); return; } draftFromWords(v); }
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
const planFor = (a) => plansOf(a.group);
const planNames = (a) => planFor(a).map((p) => p.title).join(", ") || "No plan from you yet";
const groupOf = (s) => offOf(s).group;
/* What the shared plan says for this session: the plan of the session's group, its week, this weekday. */
function planLine(s, wk) {
  const g = groupOf(s), p = g && plansOf(g)[0]; if (!p) return null;
  const n = Math.min(weeksOf(p), wk + 1), hit = p.sessions.find((x) => x.week === n && x.day === WD[s.start.getDay()]);
  return hit ? { p, n, text: hit.text } : { p, n, text: "" };
}
/* ---------- Personal training (N-03): one-to-one slots, packs, earnings. Only where this coach gives it (PAU). ----------
   A slot is a time the coach offers. It is open, or one client has it. Booking a client takes one session off their PT pack;
   cancelling gives it back; moving keeps it. A pack is sold from the client's page: the sessions are theirs at once and the
   invoice goes to the office. Slots in the past count as given. */
const PT_RATE = (ORGS.pau.products.find((p) => /^PT/.test(p.name)) || { price: 900 }).price / 10;
const PT_WEEK = [[1, 7, 0, 9], [2, 12, 15, 27], [3, 12, 15, null], [4, 7, 0, 0]]; // Tue, Wed, Thu, Fri; the usual client by member number, or open
const hasPT = () => S.org === "pau";
const ptData = () => (clubData("pau").pt ||= { slots: {}, packs: {}, sales: [] });
const ptClient = (id) => (id == null ? null : roster("pau").find((a) => a.m.id === id) || null);
/* What a client has left on their PT pack: what they started the demo with, plus and minus what happened since. */
function ptPack(a) { const base = a.m.pt || { left: 0, of: 0 }, d = ptData().packs[a.m.id] || { delta: 0, of: 0 }; return { left: base.left + d.delta, of: base.of + d.of }; }
const ptAdjust = (a, delta, of = 0) => { const p = (ptData().packs[a.m.id] ||= { delta: 0, of: 0 }); p.delta += delta; p.of += of; };
function ptSlots(mon) {
  if (!hasPT()) return [];
  return PT_WEEK.map(([d, h, m, usual]) => {
    const start = addDays(mon, d); start.setHours(h, m, 0, 0);
    const id = `pt-${ymd(start)}-${pad(h)}${pad(m)}`, ov = ptData().slots[id], cid = ov ? ov.client : usual == null ? null : baseMembers("pau")[usual].id;
    return { id, one: true, start, athlete: ptClient(cid), dur: 60, loc: "Letzigrund" };
  });
}
const ptAll = (from, weeks) => [...Array(weeks)].flatMap((_, k) => ptSlots(addDays(from, 7 * k)));
const ptSlot = (id) => ptAll(addDays(monday(today()), -35), 5 + WEEKS).find((x) => x.id === id) || null;
const ptClients = () => roster("pau").filter((a) => ptPack(a).left > 0).sort((x, y) => x.name.localeCompare(y.name));
function ptBook(slotId, memberId) {
  const sl = ptSlot(slotId), a = ptClient(memberId);
  if (!sl || sl.start <= now()) return err("WINDOW_CLOSED", "That time is already over.");
  if (sl.athlete) return err("TAKEN", `That slot is ${sl.athlete.first}'s.`);
  if (!a) return err("NO_CLIENT", "Choose who it is for.");
  if (ptPack(a).left <= 0) return err("NO_PACK", `${a.first} has no PT sessions left. Sell a pack on their page first.`);
  ptData().slots[slotId] = { client: a.m.id }; ptAdjust(a, -1);
  return { ok: true, msg: `Booked: ${a.name}, ${fDay(sl.start)} ${fTime(sl.start)}. ${ptPack(a).left} of ${ptPack(a).of} left on the pack. ${a.first} sees it in the app.` };
}
function ptCancel(slotId) {
  const sl = ptSlot(slotId); if (!sl || !sl.athlete) return err("NOT_FOUND", "Nobody is booked there.");
  if (sl.start <= now()) return err("WINDOW_CLOSED", "That session has already started.");
  ptData().slots[slotId] = { client: null }; ptAdjust(sl.athlete, 1);
  return { ok: true, msg: `Cancelled. ${sl.athlete.first} has the session back: ${ptPack(sl.athlete).left} of ${ptPack(sl.athlete).of} left. The slot is open again.` };
}
function ptMove(fromId, toId) {
  const a = ptSlot(fromId), b = ptSlot(toId);
  if (!a || !a.athlete || !b) return err("NOT_FOUND", "That session is not there any more.");
  if (a.start <= now() || b.start <= now()) return err("WINDOW_CLOSED", "A session that has started can't be moved.");
  if (b.athlete) return err("TAKEN", `That slot is ${b.athlete.first}'s.`);
  ptData().slots[toId] = { client: a.athlete.m.id }; ptData().slots[fromId] = { client: null };
  return { ok: true, msg: `Moved: ${a.athlete.name} is now on ${fDay(b.start)} at ${fTime(b.start)}. The pack is untouched, and ${a.athlete.first} sees the new time in the app.` };
}
/* Selling a pack: the sessions are the client's at once; the invoice goes to the office, where the admin sees it under Money. */
function ptSell(memberId) {
  const a = ptClient(memberId), prod = ORGS.pau.products.find((p) => /^PT/.test(p.name)); if (!a || !prod) return err("NOT_FOUND", "That is not possible here.");
  ptAdjust(a, 10, 10);
  const n = 1 + Math.max(0, ...S.invoices.filter((i) => i.org === "pau").map((i) => Number(i.id.slice(-4)))), id = `PAU-2026-${String(n).padStart(4, "0")}`;
  S.invoices.push({ id, org: "pau", member: a.name, what: prod.name, amount: prod.price, due: addDays(today(), 14), status: "open" });
  ptData().sales.push({ member: a.m.id, amount: prod.price, at: now(), invoice: id });
  S.audit.unshift({ org: "pau", what: `${coachMe()} sold a ${prod.name} to ${a.name} (${id}, ${chf(prod.price)})`, at: now() });
  return { ok: true, msg: `Sold: ${prod.name} to ${a.name}. ${ptPack(a).left} sessions are ready to book. Invoice ${id} is with the office.` };
}
/* The month in personal training. Sessions given and packs sold here are counted; the packs sold before the demo began are invented. */
function ptStats() {
  const first = new Date(now().getFullYear(), now().getMonth(), 1), month = ptAll(monday(first), 6).filter((x) => x.start >= first && x.start.getMonth() === first.getMonth()), ahead = ptAll(monday(today()), WEEKS).filter((x) => x.start > now());
  const given = month.filter((x) => x.athlete && x.start <= now()).length, seeded = baseMembers("pau").filter((m) => m.pt && m.pt.left >= 8).length, sold = seeded + ptData().sales.length, price = PT_RATE * 10;
  return { given, earned: given * PT_RATE, booked: ahead.filter((x) => x.athlete).length, slots: ahead.length, sold, soldSum: sold * price };
}
const vPtCard = () => { if (!hasPT()) return ""; const p = ptStats(); return `<div class="stack" id="pt-card"><div class="eyebrow">Personal training · ${monthName()}</div><div class="card rows"><div class="row"><span class="mid"><span class="sub">Sessions given</span></span><span class="strong" id="pt-given">${p.given} · ${chf(p.earned)}</span></div><div class="row"><span class="mid"><span class="sub">Slots filled, next ${WEEKS} weeks</span></span><span class="strong" id="pt-fill">${p.booked} of ${p.slots} · ${Math.round((p.booked / Math.max(1, p.slots)) * 100)}%</span></div><div class="row"><span class="mid"><span class="sub">Packs sold</span></span><span class="strong" id="pt-sold">${p.sold} · ${chf(p.soldSum)}</span></div></div><p class="sub demo">A session given counts ${chf(PT_RATE)}, a tenth of a pack. Packs sold before today are invented. <span class="eyebrow" style="display:inline;margin-left:4px">Demo data</span></p></div>`; };
function vPtSheet() {
  const sh = UI.sheet, sl = ptSlot(sh.id); if (!sl) return "";
  const a = sl.athlete, over = sl.start <= now(), head = `<div><div class="eyebrow">One-to-one · ${fDay(sl.start)} · ${fTime(sl.start)}</div><h2 class="h1">${a ? esc(a.name) : "Open slot"}</h2><p class="sub" style="margin-top:4px">${sl.dur} min · ${sl.loc}${a ? ` · PT 10-pack: ${ptPack(a).left} of ${ptPack(a).of} left` : ""}</p></div>`;
  const wrap = (body) => `<div class="sheetbg" data-a="close"><div class="sheet stack" role="dialog" aria-modal="true" aria-label="${a ? `One-to-one with ${esc(a.name)}` : "Open slot"}">${head}${body}<button class="btn ghost full" data-a="close-btn">Close</button></div></div>`;
  if (!a) {
    const cs = ptClients();
    return wrap(over ? `<p class="note">This slot is over. Nobody had it.</p>` : cs.length ? `<form class="stack" data-f="ptbook" data-id="${sl.id}" novalidate><label class="f">Who is it for?<select id="pt-who">${cs.map((c) => `<option value="${c.m.id}">${esc(c.name)} · ${ptPack(c).left} left</option>`).join("")}</select></label>${sh.error ? `<p class="err" role="alert">${esc(sh.error)}</p>` : ""}<button class="btn acc full" type="submit">Book this slot</button><p class="sub">It takes one session off their PT pack. To book someone who has no sessions left, sell them a pack on their page first.</p></form>` : `<p class="note">Nobody has PT sessions left. Sell a pack on an athlete's page first.</p>`);
  }
  if (sh.move) { const open = ptAll(monday(today()), WEEKS).filter((x) => !x.athlete && x.start > now()); return wrap(`<div class="stack" id="pt-move" style="gap:8px"><div class="eyebrow">Move ${esc(a.first)} to</div>${open.length ? `<div class="card rows">${open.map((x) => `<button class="row" data-a="pt-move-to" data-v="${sl.id}|${x.id}"><span class="lead time" style="width:92px">${fDay(x.start)}</span><span class="mid"><span class="strong">${fTime(x.start)}</span><span class="sub">${x.dur} min · ${x.loc}</span></span></button>`).join("")}</div>` : `<p class="sub">There is no open slot in the next ${WEEKS} weeks.</p>`}</div><button class="btn full" data-a="pt-open" data-v="${sl.id}">Back</button>`); }
  return wrap(`${over ? `<p class="note">This session is over. It counts as given.</p>` : `<button class="btn acc full" data-a="pt-move" data-v="${sl.id}">Move to another time</button><button class="btn full" data-a="pt-cancel" data-v="${sl.id}">Cancel this session</button><p class="sub">Moving keeps the pack as it is. Cancelling gives ${esc(a.first)} the session back.</p>`}<button class="btn full" data-a="athlete" data-v="${a.id}">Open ${esc(a.name)}'s page</button>`);
}
function vPtSellSheet() {
  const a = ptClient(UI.sheet.id), prod = ORGS.pau.products.find((p) => /^PT/.test(p.name)); if (!a) return "";
  return `<div class="sheetbg" data-a="close"><div class="sheet stack" role="dialog" aria-modal="true" aria-label="Sell a PT pack"><div><div class="eyebrow">Personal training</div><h2 class="h1">${esc(prod.name)} for ${esc(a.name)}</h2><p class="num" style="margin-top:8px">${chf(prod.price)}</p></div>
    <ul class="sub stack" id="pt-sell-effects" style="gap:4px;padding-left:18px;list-style:disc"><li>${esc(a.first)} gets 10 sessions of 60 minutes, ready to book at once.</li><li>An invoice for ${chf(prod.price)} goes to ${esc(a.first)}. The office sees it under Money.</li><li>This is the full price. No fees are added. Demo: no real money moves.</li></ul>
    <button class="btn acc full" data-a="pt-sell-do" data-v="${a.m.id}">Record the sale</button><button class="btn ghost full" data-a="close-btn">Not now</button></div></div>`;
}
Object.assign(DASH_ACT, {
  "pt-open": (v) => { UI.sheet = { type: "pt", id: v }; },
  "pt-move": (v) => { UI.sheet = { type: "pt", id: v, move: true }; },
  "pt-move-to": (v) => { const [a, b] = v.split("|"); UI.toast = ptMove(a, b).msg; UI.sheet = null; },
  "pt-cancel": (v) => { UI.toast = ptCancel(v).msg; UI.sheet = null; },
  "pt-sell": (v) => { UI.sheet = { type: "ptsell", id: v }; },
  "pt-sell-do": (v) => { UI.toast = ptSell(v).msg; UI.sheet = null; },
});
document.addEventListener("submit", (e) => {
  if (e.target.dataset.f !== "ptbook") return; e.preventDefault();
  const r = ptBook(e.target.dataset.id, document.getElementById("pt-who").value);
  if (r.ok) { UI.toast = r.msg; UI.sheet = null; } else UI.sheet = { ...UI.sheet, error: r.msg };
  render();
});
function coachWeek(wk) {
  const mon = addDays(monday(today()), 7 * wk), end = addDays(mon, 7);
  const groups = mySessions().filter((s) => s.start >= mon && s.start < end).map((s) => ({ id: s.id, one: false, start: s.start, s }));
  return { mon, items: [...groups, ...ptSlots(mon)].sort((a, b) => a.start - b.start) };
}
function vCoachWeek() {
  const d = dash(), wk = d.wk || 0, kind = d.wkind || "all";
  if (d.sess && S.sessions[d.sess]) return vCoachSession(S.sessions[d.sess], wk);
  const { mon, items } = coachWeek(wk), g = items.filter((x) => !x.one), o = items.filter((x) => x.one && x.athlete), open = items.filter((x) => x.one && !x.athlete);
  const list = items.filter((x) => kind === "all" || (kind === "one") === x.one), T = today();
  const chip = (v, l) => `<button class="chip" data-a="wkind" data-v="${v}" aria-pressed="${kind === v}">${l}</button>`;
  const row = (x) => {
    if (!x.one) { const s = x.s, pl = planLine(s, wk); return `<button class="row" data-a="sess" data-v="${s.id}" data-kind="group" style="align-items:flex-start"><span class="lead time">${fTime(s.start)}</span><span class="mid"><span class="strong">${offOf(s).name}</span><span class="sub">Group · ${booked(s)} of ${s.cap} booked${waitTotal(s) ? ` · ${waitTotal(s)} waiting` : ""}</span><span class="sub">${pl ? `${esc(pl.p.title)}, week ${pl.n}${pl.text ? ": " + esc(pl.text) : ""}` : "No plan shared with this group"}</span></span></button>`; }
    if (!x.athlete) return x.start <= now() ? `<div class="row quiet" data-kind="open" style="align-items:flex-start"><span class="lead time">${fTime(x.start)}</span><span class="mid"><span class="strong">Open slot</span><span class="sub">One-to-one · ${x.dur} min · nobody had it</span></span></div>` : `<button class="row" data-a="pt-open" data-v="${x.id}" data-kind="open" style="align-items:flex-start"><span class="lead time">${fTime(x.start)}</span><span class="mid"><span class="strong">Open slot</span><span class="sub">One-to-one · ${x.dur} min · nobody has booked it yet</span><span class="sub" style="color:var(--text)">Book a client</span></span></button>`;
    const st = statusOf(x.athlete);
    return `<button class="row" data-a="pt-open" data-v="${x.id}" data-kind="one" style="align-items:flex-start"><span class="lead time">${fTime(x.start)}</span><span class="mid"><span class="strong">${sdot(st)}${esc(x.athlete.name)}</span><span class="sub">One-to-one · ${x.dur} min · ${esc(st.why)}</span><span class="sub" data-pack>PT 10-pack: ${ptPack(x.athlete).left} of ${ptPack(x.athlete).of} left</span><span class="sub">${esc(planNames(x.athlete))}</span></span></button>`;
  };
  const days = [...Array(7)].map((_, i) => addDays(mon, i)).map((day) => ({ day, rows: list.filter((x) => ymd(x.start) === ymd(day)) })).filter((x) => x.rows.length);
  return `<section class="pad stack-l" id="coach-week"><div><div class="weeknav"><button class="x" data-a="cwk" data-v="-1" aria-label="Previous week" ${wk <= 0 ? "disabled" : ""}>${I(P.back, 18)}</button><span class="eyebrow" aria-live="polite">${wk === 0 ? "This week" : wk === 1 ? "Next week" : `In ${wk} weeks`} · ${mon.getDate()} ${MOL[mon.getMonth()].slice(0, 3)} to ${addDays(mon, 6).getDate()} ${MOL[addDays(mon, 6).getMonth()].slice(0, 3)}</span><button class="x" data-a="cwk" data-v="1" aria-label="Next week" ${wk >= WEEKS - 1 ? "disabled" : ""}>${I(P.fwd, 18)}</button></div>
    <h1 class="h1" id="week-answer">${g.length + o.length} sessions: ${g.length} ${g.length === 1 ? "group" : "groups"}, ${o.length} one-to-one${open.length ? `, ${open.length} open ${open.length === 1 ? "slot" : "slots"}` : ""}</h1><p class="sub" style="margin-top:4px">Everything you coach at ${esc(ORGS[S.org].name)} this week. Tap a group for its plan and who is coming, or a person for their page.</p></div>
    <div class="stack"><div class="filters" role="group" aria-label="Show">${chip("all", "All")}${chip("group", "Groups")}${chip("one", "One-to-one")}</div>
    ${days.length ? days.map(({ day, rows }) => `<div class="stack" style="gap:8px" data-day="${ymd(day)}"><div class="sub" ${ymd(day) === ymd(T) ? 'style="color:var(--text);font-weight:500"' : ""}>${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day.getDay()]} ${day.getDate()}${ymd(day) === ymd(T) ? " · today" : ""}</div><div class="card rows">${rows.map(row).join("")}</div></div>`).join("") : `<p class="sub">Nothing here this week.</p>`}</div>${vPtCard()}</section>`;
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
  planday: (v) => { UI.sheet = { type: "planday", key: v }; }, "planday-close": () => { UI.sheet = null; },
  myweek: (v) => { const d = dash(); d.myWeek = Math.max(1, (d.myWeek || 1) + Number(v)); }, // the card clamps it to the weeks there are
  sess: (v) => { dash().sess = v || null; S.tab.coach = "week"; lastKey = ""; },
  cwk: (v) => { const d = dash(); d.wk = Math.min(WEEKS - 1, Math.max(0, (d.wk || 0) + Number(v))); },
  wkind: (v) => { dash().wkind = v; },
});

/* ================= Coach, milestone B (N-02): who needs what today, the live session, the group recap, the review queue =================
   The rules of the house hold here too: PATH drafts, the coach approves every word that reaches an athlete; and the coach
   sees only what an athlete shares with this club. A group message never says anything about one person. */

/* What an athlete needs from the coach today, in the coach's words. One line, from the first reason. */
const WHAT = {
  pain: (a) => `A lighter option for the next hard session; ask how the ${a.pain.where.toLowerCase()} feels`,
  draft: () => "Look at the plan change PATH drafted",
  ask: () => "Answer the question",
  load: () => "Ease the next hard session",
  away: (a) => (a.back ? "A short, easy first session back" : "A short hello, no pressure"),
};
const whatFor = (a, st) => (WHAT[st.kinds[0]] ? WHAT[st.kinds[0]](a) : "");
/* Who is coming to one of this coach's sessions today. */
function comingToday() {
  const names = new Set();
  for (const s of mySessions().filter((x) => ymd(x.start) === ymd(today()) && !x.cancelled)) { for (const n of rosterNames(s).booked) names.add(n); if (myBooking(s.id)) names.add(S.me.name); }
  return names;
}

/* ---------- Live session: check-in, who needs what, a note per athlete, then the recap ---------- */
const noteKey = (sid, name) => `${sid}|${name}`;
const sessNotes = () => (clubData().sessNotes ||= {});
const checkedIn = (s) => { const att = S.attendance[s.id] || {}; return rosterRows(s).filter((r) => att[r.name] === "present" || att[r.name] === "late"); };
function vCoachRoster(s) {
  const d = dash(), rows = rosterRows(s), att = S.attendance[s.id] || {}, wait = rosterNames(s).queue, R = roster(), pl = planLine(s, Math.max(0, planWeekOf(ymd(s.start)) - 1));
  const came = checkedIn(s).length, live = s.start <= now() && endOf(s) > now(), rc = (clubData().recaps || {})[s.id];
  const person = (name) => (name === S.me.name ? liveAthlete() : R.find((a) => a.name === name));
  const row = (r, i) => {
    const a = person(r.name), st = a ? statusOf(a) : null, note = sessNotes()[noteKey(s.id, r.name)] || "", editing = d.noteFor === r.name;
    return `<div class="row" data-row="${esc(r.name)}" style="align-items:flex-start;flex-wrap:wrap"><span class="mid"><span class="strong">${st ? sdot(st) : ""}${esc(r.name)}</span>${r.kind === "walkin" ? `<span class="sub">Walk-in</span>` : ""}</span><span class="btns">${["present", "late", "absent"].map((x) => `<button class="btn sm ${att[r.name] === x ? "on" : ""}" aria-pressed="${att[r.name] === x}" aria-label="${esc(r.name)}: ${x}" data-a="mark" data-v="${s.id}|${i}|${x}">${x[0].toUpperCase() + x.slice(1)}</button>`).join("")}</span>
      <span style="flex-basis:100%">${st && st.level ? `<span class="sub" data-need style="display:block;margin-bottom:4px">${esc(st.why)}${whatFor(a, st) ? `. ${esc(whatFor(a, st))}` : ""}</span>` : ""}${editing ? `<form data-f="snote" data-sid="${s.id}" data-name="${esc(r.name)}" style="display:flex;gap:8px;align-items:center"><input class="inp" style="min-height:44px" id="snote" maxlength="160" aria-label="Note on ${esc(r.name)} for this session" placeholder="One line, only you see it" value="${esc(note)}"><button class="btn sm" type="submit">Save</button></form>` : `<button class="btn sm link ghost" style="padding-left:0;text-align:left" data-a="snote" data-v="${i}" aria-label="${note ? "Change the note on" : "Add a note on"} ${esc(r.name)}">${note ? `<span class="sub" data-note>Note: ${esc(note)}</span>` : "Add a note"}</button>`}</span></div>`;
  };
  return `<section class="pad stack-l" id="coach-roster" data-live="${live}"><div><button class="btn sm ghost" style="padding-left:0" data-a="roster" data-v="" aria-label="Back to sessions">${I(P.back, 16)}Sessions</button><div class="eyebrow" style="margin-top:8px">${live ? "Live now · " : ""}${fDay(s.start)} · ${fTime(s.start)} · <span id="roster-count">${rows.length}</span> on the roster</div><h1 class="h1">${offOf(s).name}</h1>${pl && pl.text ? `<p class="sub" style="margin-top:4px" id="live-plan">Plan: ${esc(pl.text)}</p>` : ""}<p class="sub" style="margin-top:4px" id="live-count">${came} of ${rows.length} checked in</p></div>
    <div class="stack">${rows.length ? `<button class="btn acc full" data-a="all-present" data-v="${s.id}">Mark all present</button><div class="card rows" id="roster">${rows.map(row).join("")}</div>` : `<p class="sub">Nobody is booked for this session.</p>`}
      <form class="stack" data-f="walkin" data-id="${s.id}" style="gap:8px"><label class="f">Add a walk-in<input id="walkin-name" placeholder="Name" autocomplete="off"></label><button class="btn full" type="submit">Add to roster</button></form>
      <p class="sub">${rows.filter((r) => r.kind === "booked").length} booked${rows.some((r) => r.kind === "walkin") ? ` and ${rows.filter((r) => r.kind === "walkin").length} walk-in` : ""}, capacity ${s.cap}. Only people with a confirmed booking or added here as a walk-in appear.</p>
      ${wait.length ? `<div class="stack" style="gap:8px"><div class="eyebrow">Waitlist · not on the roster</div><ol class="sub" id="roster-wait" style="padding-left:20px">${wait.map((n) => `<li>${esc(n)}${s.offerTo && s.offerTo.name === n ? ` · a spot is held until ${fTime(s.offerTo.expiresAt)}` : ""}</li>`).join("")}</ol></div>` : ""}
      <div class="stack" id="recap-entry" style="gap:8px"><div class="eyebrow">After the session</div>${rc ? `<p class="note" id="recap-sent">Recap sent to the ${rc.to} who came, ${fDay(rc.at)} at ${fTime(rc.at)}.</p><button class="btn sm link" data-a="recap" data-v="${s.id}">Read it</button>` : came ? `<button class="btn full" data-a="recap" data-v="${s.id}">Draft the group recap</button><p class="sub">PATH drafts it from who came and what was planned. Nothing is sent until you approve it.</p>` : `<p class="sub">Check people in first. The recap goes to those who came.</p>`}</div></div></section>`;
}
/* PATH's draft of the recap: group facts only. No names, no notes, nothing anybody shared. */
function draftRecap(s) {
  const came = checkedIn(s).length, pl = planLine(s, Math.max(0, planWeekOf(ymd(s.start)) - 1)), next = mySessions().find((x) => x.start > endOf(s) && !x.cancelled);
  const did = pl && pl.text ? ` We did ${pl.text.charAt(0).toLowerCase() + pl.text.slice(1).replace(/\.$/, "")}.` : "";
  return `${offOf(s).name}, ${fDay(s.start)}: thank you, all ${came} of you.${did} Good work. Take a moment to log how it felt: one tap in PATH, and it helps me plan the next one.${next ? ` Next session: ${offOf(next).name}, ${WDL[next.start.getDay()]} ${fTime(next.start)}.` : ""} ${coachMe()}`;
}
function vCoachRecap(s) {
  const d = dash(), came = checkedIn(s), missed = rosterRows(s).length - came.length, rc = (clubData().recaps || {})[s.id];
  const back = `<button class="btn sm link ghost" data-a="recap" data-v="" aria-label="Back to the session">${I(P.back, 16)}${offOf(s).name}</button>`;
  if (rc) return `<section class="pad stack-l" id="coach-recap">${back}<div><div class="eyebrow">Group recap · sent</div><h1 class="h1">Sent to the ${rc.to} who came</h1><p class="sub" style="margin-top:4px">${fDay(rc.at)} at ${fTime(rc.at)}, approved by you.</p></div><p id="recap-text">${esc(rc.text)}</p></section>`;
  return `<section class="pad stack-l" id="coach-recap">${back}<div><div class="eyebrow">Group recap · drafted by PATH</div><h1 class="h1">${came.length} came, ${missed} missed it</h1><p class="sub" style="margin-top:4px">It goes to the ${came.length} who came, as one message to the group. It says nothing about any one person.</p></div>
    <form class="stack" data-f="recap" data-sid="${s.id}" novalidate><label class="f">Message<textarea id="recap-text" class="inp" rows="8" maxlength="900">${esc(d.recapText ?? draftRecap(s))}</textarea></label>${d.recapError ? `<p class="err" role="alert">${esc(d.recapError)}</p>` : ""}<p class="sub">Change any word. Nothing is sent until you approve it. Demo: no real message leaves PATH.</p><button class="btn acc full" type="submit" ${came.length ? "" : "disabled"}>Approve and send to ${came.length}</button></form>
    <button class="btn full ghost" data-a="recap" data-v="">Not now</button></section>`;
}

/* ---------- Review queue: every change PATH proposes waits here. Approve, edit first, or reject; low-risk ones can go together. ---------- */
/* A line that only makes a day easier. Used to sort the queue and to hold the guardrail on what a coach types. */
const isEasier = (t) => /\b(easy|rest|walk|recover\w*|stretch\w*|mobility|off)\b/i.test(t) && !/\d\s*[×x]\s*\d|interval|tempo|race|threshold|hill|sprint|all.?out|RPE\s*(?:[5-9]|10)\b/i.test(t);
const reviewState = (id) => ((clubData().reviews ||= {})[id] ||= { status: "pending", edit: {} });
function reviewItems() {
  const items = [], thu = nextChangeable(4), mon = nextChangeable(1), sat = nextChangeable(6);
  if (shares("plan.write") && S.draftStatus === "pending_review") { const d = currentDraft(); items.push({ id: "mia", live: true, a: liveAthlete(), d, low: !!d.guard || d.items.every((i) => i.load <= 0 && i.intensity !== "high"), why: d.guard ? d.guard.reasons.map(guardReasonForCoach).join(" ") : d.rationale }); }
  for (const a of athletes()) {
    if (a.live) continue;
    const st = statusOf(a), p = plansOf(a.group)[0], lineOn = (day) => (p && (p.sessions.find((x) => x.week === 1 && x.day === day) || {}).text) || `${a.group} session`;
    if (st.kinds.includes("pain") || (st.kinds.includes("load") && st.level === 2)) items.push({ id: "rv-" + a.id, a, why: st.why, low: true, lines: [{ day: fDay(thu), from: lineOn("Thu"), to: "Easy 30 min @ RPE 3" }] });
    else if (a.back) items.push({ id: "rv-" + a.id, a, why: st.why, low: true, lines: [{ day: fDay(mon), from: lineOn("Mon"), to: "First session back: 20 min easy, then 4 relaxed strides" }] });
    else if (a.ask && /swap/i.test(a.ask) && !clubData().answered[a.id]) items.push({ id: "rv-" + a.id, a, why: `Asked: "${a.ask}"`, low: false, lines: [{ day: fDay(thu), from: lineOn("Thu"), to: "Rest day" }, { day: fDay(sat), from: "Rest day", to: lineOn("Thu") }] });
  }
  return items.map((it) => ({ ...it, state: it.live ? { status: "pending", edit: (clubData().reviews || {}).mia ? clubData().reviews.mia.edit : {} } : reviewState(it.id) }));
}
function vCoachReview() {
  const d = dash(), all = reviewItems(), open = all.filter((x) => x.state.status === "pending"), low = open.filter((x) => x.low), done = all.filter((x) => x.state.status !== "pending");
  const noShare = !shares("plan.write") ? `<p class="sub" id="no-plan-share">${esc(S.me.name)} has not allowed coaches at this club to review plans.</p>` : "";
  const miaDone = shares("plan.write") && S.draftStatus !== "pending_review" ? `<p class="sub" id="mia-decided">${esc(S.me.name)}: you ${S.draftStatus} "${esc(currentDraft().title)}".</p>` : "";
  const card = (it) => {
    const editing = d.rvEdit === it.id, name = esc(it.a.name), lbl = it.live ? "" : ` the change for ${name}`;
    if (it.live) {
      const dr = it.d;
      return `<div class="card stack" id="draft" data-review="mia" data-guarded="${!!dr.guard}" data-low="${it.low}"><div><div class="eyebrow">${name} · AI draft · ${it.low ? "low risk: only reduces load" : "needs a look"}</div><p class="h2" style="font-size:22px;margin-top:6px">${esc(dr.title)}</p></div>
        ${dr.guard ? `<div class="guard" role="note" id="guard"><b>Guardrail applied: this draft can only reduce load</b><ul class="stack" style="gap:4px">${dr.guard.reasons.map((r) => `<li>${esc(guardReasonForCoach(r))}</li>`).join("")}</ul></div>` : ""}
        <p class="sub">${esc(dr.rationale)}</p>
        ${editing ? `<form class="stack" data-f="rvedit" data-id="mia" novalidate style="gap:12px">${dr.items.map((x, i) => (x.from === x.to && !x.changed ? "" : `<label class="f">${x.day}<span class="sub" style="display:block">was: ${esc(x.changed ? x.from : x.from)}</span><textarea class="inp grow" rows="1" data-line="${i}" maxlength="120">${esc((it.state.edit || {})[i] ?? x.to)}</textarea></label>`)).join("")}${d.rvError ? `<p class="err" role="alert" id="rv-error">${esc(d.rvError)}</p>` : ""}<div class="btns"><button class="btn acc" style="flex:1" type="submit">Approve as edited</button><button class="btn" type="button" data-a="rv-edit" data-v="">Cancel</button></div></form>`
        : `<ul class="stack" style="gap:8px" id="draft-items">${dr.items.map((x) => `<li data-intensity="${x.intensity}" data-load="${x.load}"><span class="eyebrow" data-date="${ymd(x.date)}">${x.day}</span><br>${x.changed ? `<span class="was">${esc(x.was)}</span> <span class="strong">${esc(x.to)}</span>` : x.from === x.to ? `${esc(x.to)} <span class="sub">(unchanged)</span>` : `<span class="sub">${esc(x.from)} becomes</span> <span class="strong">${esc(x.to)}</span>`}</li>`).join("")}</ul>
        <div class="btns"><button class="btn acc" style="flex:1" data-a="draft" data-v="approved">Approve</button><button class="btn" data-a="rv-edit" data-v="mia" aria-label="Edit before approving">Edit</button><button class="btn" data-a="draft" data-v="rejected">Reject</button></div>`}
        <p class="sub">A drafted plan never reaches the athlete until a coach approves it. Guardrails are applied in code before you see it, and again on approval.</p></div>`;
    }
    const lines = it.lines.map((x, i) => ({ ...x, to: (it.state.edit || {})[i] ?? x.to }));
    return `<div class="card stack" data-review="${it.id}" data-low="${it.low}"><div><div class="eyebrow">${name} · ${it.low ? "low risk: only reduces load" : "needs a look"}</div><p class="sub" style="margin-top:4px">${esc(it.why)}</p></div>
      ${editing ? `<form class="stack" data-f="rvedit" data-id="${it.id}" novalidate style="gap:12px">${lines.map((x, i) => `<label class="f">${x.day}<span class="sub" style="display:block">was: ${esc(x.from)}</span><textarea class="inp grow" rows="1" data-line="${i}" maxlength="120">${esc(x.to)}</textarea></label>`).join("")}${d.rvError ? `<p class="err" role="alert" id="rv-error">${esc(d.rvError)}</p>` : ""}<div class="btns"><button class="btn acc" style="flex:1" type="submit">Approve as edited</button><button class="btn" type="button" data-a="rv-edit" data-v="">Cancel</button></div></form>`
      : `<ul class="stack" style="gap:8px">${lines.map((x) => `<li><span class="eyebrow">${x.day}</span><br><span class="sub">${esc(x.from)} becomes</span> <span class="strong">${esc(x.to)}</span></li>`).join("")}</ul>
      <div class="btns"><button class="btn" style="flex:1" data-a="rv-approve" data-v="${it.id}" aria-label="Approve${lbl}">Approve</button><button class="btn" data-a="rv-edit" data-v="${it.id}" aria-label="Edit${lbl}">Edit</button><button class="btn" data-a="rv-reject" data-v="${it.id}" aria-label="Reject${lbl}">Reject</button></div>`}</div>`;
  };
  return `<section class="pad stack-l" id="coach-review"><div><h1 class="h1">Review queue</h1><p class="sub" style="margin-top:4px" id="review-answer">${open.length ? `${open.length} waiting for you, ${low.length} of them low risk.` : "Nothing is waiting."} Nothing reaches an athlete before you approve it.</p></div>
    ${noShare}${low.length >= 2 ? `<button class="btn acc full" data-a="rv-bulk" id="rv-bulk">Approve the ${low.length} low-risk changes</button>` : ""}
    ${open.map(card).join("")}
    ${miaDone || done.length ? `<div class="stack" id="review-done" style="gap:8px"><div class="eyebrow">Decided</div>${miaDone}${done.length ? `<div class="card rows">${done.map((it) => `<button class="row" data-a="athlete" data-v="${it.a.id}" style="align-items:flex-start"><span class="mid"><span class="strong">${esc(it.a.name)}</span><span class="sub">${it.state.status === "approved" ? `Approved ${fDay(it.state.at)}${Object.keys(it.state.edit || {}).length ? ", with your changes" : ""}. ${esc(it.a.first)} sees it as the next step.` : `Rejected ${fDay(it.state.at)}. ${esc(it.a.first)} keeps the plan as it is.`}</span></span></button>`).join("")}</div>` : ""}</div>` : ""}
    <p class="sub">Demo data: the athletes besides ${esc(S.me.name)} are invented.</p></section>`;
}
/* Approving Mia's draft with the coach's own words. The guardrail is held again, on what the coach typed. */
function approveEdited(edits) {
  const d = guardDraft(RAW_DRAFT), g = guard();
  for (const [k, raw] of Object.entries(edits)) {
    const i = Number(k), it = d.items[i], text = String(raw || "").trim().slice(0, 120); if (!it || !text || text === it.to) continue;
    if (g.active && !isEasier(text)) return err("GUARDRAIL", `${it.day} can only be made easier right now: ${g.reasons.map(guardReasonForCoach).join(" ")} "${text}" adds intensity.`);
    d.items[i] = { ...it, to: text, edited: true, changed: it.changed, was: it.changed ? it.was : undefined, intensity: isEasier(text) ? "low" : it.intensity, load: isEasier(text) ? -1 : it.load };
  }
  S.draftApproved = d; S.draftStatus = "approved"; S.planNews = true;
  return { ok: true, msg: `Approved with your changes. ${S.me.name} now sees it as the next step.` };
}
Object.assign(DASH_ACT, {
  snote: (v) => { const s = S.sessions[S.rosterSid], r = s && rosterRows(s)[Number(v)]; dash().noteFor = r ? r.name : null; },
  recap: (v) => { Object.assign(dash(), { recap: v || null, recapText: null, recapError: "" }); lastKey = ""; },
  "rv-edit": (v) => { Object.assign(dash(), { rvEdit: v || null, rvError: "" }); },
  "rv-approve": (v) => { const it = reviewItems().find((x) => x.id === v); if (!it) return; Object.assign(reviewState(v), { status: "approved", at: now() }); UI.toast = `Approved. ${it.a.first} now sees it as the next step.`; },
  "rv-reject": (v) => { const it = reviewItems().find((x) => x.id === v); if (!it) return; Object.assign(reviewState(v), { status: "rejected", at: now() }); UI.toast = `Rejected. ${it.a.first} keeps the plan as it is.`; },
  "rv-bulk": () => {
    const low = reviewItems().filter((x) => x.state.status === "pending" && x.low); let n = 0;
    for (const it of low) { if (it.live) ACT.draft("approved"); else Object.assign(reviewState(it.id), { status: "approved", at: now() }); n++; }
    UI.toast = `${n} low-risk changes approved. Each athlete sees theirs as the next step. The ones that need a look are still here.`;
  },
});
document.addEventListener("submit", (e) => {
  const f = e.target.dataset.f; if (!["snote", "recap", "rvedit"].includes(f)) return; e.preventDefault(); const d = dash(); UI.toast = "";
  if (f === "snote") {
    const v = document.getElementById("snote").value.trim().slice(0, 160), k = noteKey(e.target.dataset.sid, e.target.dataset.name);
    if (v) sessNotes()[k] = v; else delete sessNotes()[k];
    d.noteFor = null; UI.toast = v ? "Note saved. Only you can see it." : "Note removed.";
  }
  if (f === "recap") {
    const s = S.sessions[e.target.dataset.sid], text = document.getElementById("recap-text").value, came = checkedIn(s), r = sendApproved(S.org, `the ${came.length} who came to ${offOf(s).name}, ${fDay(s.start)}`, "recap", text, s.id, coachMe());
    if (!r.ok) { d.recapText = text; d.recapError = r.msg; }
    else {
      (clubData().recaps ||= {})[s.id] = { text: text.trim(), at: now(), to: came.length };
      if (came.some((x) => x.name === S.me.name)) S.chat.push({ who: "coach", text: `From ${coachMe()}, to everyone who came: ${text.trim()}` });
      Object.assign(d, { recap: null, recapText: null, recapError: "" }); UI.toast = `Recap sent to the ${came.length} who came. Demo: no real message leaves PATH.`; lastKey = "";
    }
  }
  if (f === "rvedit") {
    const id = e.target.dataset.id, edits = {}; e.target.querySelectorAll("[data-line]").forEach((el) => { edits[el.dataset.line] = el.value.replace(/\s+/g, " "); });
    if (Object.values(edits).some((v) => !String(v).trim())) { d.rvError = "A day can't be left empty. Write what it should be, or Cancel."; (clubData().reviews ||= {})[id] = { ...(clubData().reviews[id] || { status: "pending" }), edit: edits }; }
    else if (id === "mia") { const r = approveEdited(edits); if (r.ok) { UI.toast = r.msg; Object.assign(d, { rvEdit: null, rvError: "" }); delete (clubData().reviews || {}).mia; } else { d.rvError = r.msg; (clubData().reviews ||= {}).mia = { status: "pending", edit: edits }; } }
    else { const it = reviewItems().find((x) => x.id === id); Object.assign(reviewState(id), { status: "approved", at: now(), edit: edits }); Object.assign(d, { rvEdit: null, rvError: "" }); UI.toast = `Approved with your changes. ${it.a.first} now sees it as the next step.`; }
  }
  render();
});
