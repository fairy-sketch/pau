"use strict";
/* PATH clickable demo, part 3 of 4: the screens. Pure functions from state to HTML. */

/* ---------- photography: sport -> photo, in one place (mirrors src/config/images.ts in the app) ---------- */
const SPORT_IMAGE = {
  running: ["hero-track-runner-silhouette", "30% 40%"], gym: ["class-gym-barbell", "55% 55%"], yoga: ["class-yoga-window", "60% 50%"], pilates: ["hero-pilates-studio", "50% 70%"],
  swimming: ["class-swimmer-underwater", "75% 65%"], climbing: ["class-climber-indoor", "80% 45%"], tennis: ["class-tennis-courts-empty", "45% 60%"], padel: ["class-padel-court", "50% 60%"],
  football: ["class-football-pitch-aerial", "50% 50%"], boxing: ["class-boxing-silhouette", "35% 45%"], crossfit: ["class-crossfit-ropes", "50% 60%"], cycling: ["hero-cyclist-mountain-path", "50% 60%"],
};
const FALLBACK_IMAGE = ["texture-chalk-hands", "50% 60%"]; // sports without a photo
const HERO_IMAGE = ["hero-track-runner-silhouette", "30% 40%"], TEXTURE_IMAGE = ["texture-foam-roller", "45% 55%"];
const sportPhoto = (sport) => SPORT_IMAGE[sport] || FALLBACK_IMAGE;
const photo = ([file, focus]) => `<img class="ph" src="images/${file}.jpg" alt="" style="object-position:${focus}">`;
const texture = (inner) => `<div class="tex"><img src="images/${TEXTURE_IMAGE[0]}.jpg" alt="">${inner}</div>`;

/* ---------- small pieces ---------- */
const I = (d, s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
/* PATH icon set (same drawings as src/ui/icons.tsx in the app). */
const P = {
  flag: '<circle cx="5.5" cy="19" r="1.6"/><path d="M5.5 17.4V16.5a4 4 0 0 1 4-4h5a4 4 0 0 0 0-8h-2"/><circle cx="10" cy="4.5" r="1.6"/>',
  chat: '<path d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-5.5L7 20v-4a3 3 0 0 1-3-3z"/><path d="M12 7c.3 1.7 1 2.4 3 3-2 .600-2.7 1.3-3 3-.300-1.7-1-2.4-3-3 2-.600 2.7-1.3 3-3z"/>',
  plus: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8.5v7M8.5 12h7"/>',
  cal: '<rect x="4" y="5.5" width="16" height="14.5" rx="3.5"/><path d="M4 10.5h16M8.5 3.5v4M15.5 3.5v4"/><circle fill="currentColor" stroke="none" cx="9" cy="15" r="1.3"/>',
  user: '<circle cx="12" cy="8.5" r="3.7"/><path d="M5 20c.500-3.6 3.3-5.5 7-5.5s6.5 1.9 7 5.5"/>',
  users: '<circle cx="9" cy="9" r="3.2"/><path d="M3.5 19.5c.400-3.1 2.6-4.9 5.5-4.9s5.1 1.8 5.5 4.9"/><path d="M15.5 6.1a3.2 3.2 0 0 1 0 5.8M17.6 14.8c1.6.700 2.7 2.2 2.9 4.2"/>',
  check: '<rect x="5" y="4.5" width="14" height="16" rx="3"/><path d="M9.5 4.5V4A1.5 1.5 0 0 1 11 2.5h2A1.5 1.5 0 0 1 14.5 4v.5"/><path d="M9 13l2.2 2.2L15.2 11"/>',
  bell: '<path d="M6.5 16.5v-5a5.5 5.5 0 0 1 11 0v5l1.5 2h-14z"/><path d="M10.2 21h3.6"/>',
  home: '<path d="M4.5 11.2 12 4.5l7.5 6.7V18a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z"/><path d="M10 20v-4.5h4V20"/>',
  tag: '<path d="M4 6a2 2 0 0 1 2-2h4.8a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.8l-4.8 4.8a2 2 0 0 1-2.8 0L4.6 12.2A2 2 0 0 1 4 10.8z"/><circle fill="currentColor" stroke="none" cx="8.5" cy="8.5" r="1.3"/>',
  card: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10.5h18M7 15h3"/>',
  x: '<path d="M7 7l10 10M17 7 7 17"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  tick: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  back: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  hold: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5M12 20.5A8.5 8.5 0 0 1 3.5 12"/>',
};
const xBtn = (a, label, v = "") => `<button class="x" data-a="${a}" data-v="${esc(v)}" aria-label="${esc(label)}">${I(P.x, 16)}</button>`;
const pill = (text, line) => `<span class="pill ${line ? "line" : ""}">${line ? "" : I(P.tick, 14)}${text}</span>`;
/* One status for a session, everywhere it is listed. A session that has started can never read as bookable. */
function status(s) {
  const w = myWait(s.id), b = myBooking(s.id);
  if (s.cancelled) return `<span class="sub">Cancelled</span>`;
  if (s.start <= now()) return b ? pill(pastLabel(b, s), b.status !== "attended") : `<span class="sub">${endOf(s) <= now() ? "Over" : "Started"}</span>`;
  if (b) return pill("Booked");
  if (w) return pill(`Waitlist #${w.pos}`, true);
  return `<span class="sub">${spots(s) === 0 ? "Full" : spots(s) + " spots"}</span>`;
}
const sw = (on, a, v, label, sub, disabled) => `<button class="sw" role="switch" aria-checked="${!!on}" data-a="${a}" data-v="${v}" ${disabled ? "disabled" : ""}><span class="l"><span class="strong" style="display:block">${label}</span>${sub ? `<span class="sub">${sub}</span>` : ""}</span><span class="t"></span></button>`;
const passLine = (pass, when) => { const t = passState(pass, when).text; return `<span data-pass="${pass.id}" data-text="${t}">${pass.name}: ${t}</span>`; };
const loggedFor = (sid) => S.entries.some((e) => e.sid === sid);
const logItBtn = (s, cls = "btn sm") => (loggedFor(s.id) ? `<span class="sub">Logged</span>` : `<button class="${cls}" data-a="logit" data-v="${s.id}">Log it</button>`);
function lineChart(points, hi) {
  const W = 420, H = 140, L = 34, B = 18, max = Math.max(...points.map((p) => p.v), 1) * 1.1, x = (i) => L + (i * (W - L - 8)) / (points.length - 1), y = (v) => H - B - (v / max) * (H - B - 8);
  const grid = [0, 0.5, 1].map((f) => `<line x1="${L}" x2="${W}" y1="${y((max * f) / 1.1)}" y2="${y((max * f) / 1.1)}" stroke="var(--hairline)"/><text x="0" y="${y((max * f) / 1.1) + 3}">${Math.round((max * f) / 1.1)}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(points.map((p) => p.l + " " + p.v).join(", "))}">${grid}<polyline fill="none" stroke="var(--text)" stroke-width="1.75" stroke-linejoin="round" points="${points.map((p, i) => x(i) + "," + y(p.v)).join(" ")}"/><circle cx="${x(hi)}" cy="${y(points[hi].v)}" r="5" fill="var(--accent)" stroke="var(--text)" stroke-width="1.75"/>${points.map((p, i) => (i % 3 === 0 || i === points.length - 1 ? `<text x="${x(i) - 8}" y="${H - 4}">${p.l}</text>` : "")).join("")}</svg>`;
}
const isoWeek = (d) => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)); return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7); };
const loadPts = (st) => st.wl.map((w) => ({ l: "W" + isoWeek(w.start), v: w.load }));

/* The stage as blocks: one per session, grouped by stage, laid out as ONE row that fills the width.
   Works for any plan: pick the fewest rows per group that keep the whole plan within about 30 columns, so the blocks stay small and the strip stays low. */
function blockCols(sizes) {
  for (let rows = 1; rows <= 8; rows++) { const cols = sizes.map((n) => Math.ceil(n / rows)); if (cols.reduce((a, b) => a + b, 0) <= 30) return cols; }
  return sizes.map((n) => Math.ceil(n / 8));
}
function pathLine() {
  const at = UI.lineFrom ?? { stage: S.stage, inSt: S.stageSessions }, n = S.stages.length, doneCount = at.stage * PER + at.inSt, cols = blockCols(S.stages.map(() => PER));
  return `<div id="blocks" style="margin-top:28px" role="img" aria-label="Stage ${at.stage + 1} of ${n}: ${S.stages[at.stage]}. ${at.inSt} of ${PER} sessions done."><div class="groups">${S.stages.map((name, k) => `<div class="grp ${k === at.stage ? "now" : ""}" style="--cols:${cols[k]}"><span class="eyebrow">${name}</span><div class="blocks">${[...Array(PER)].map((_, j) => { const i = k * PER + j; return `<i class="blk ${i < doneCount ? "done" : i === doneCount ? "next" : ""}" data-i="${i}"></i>`; }).join("")}</div></div>`).join("")}</div>
    <div class="between" style="margin-top:18px"><span class="strong">${S.stages[at.stage]} <span class="sub">· ${at.inSt} of ${PER} sessions</span></span><span class="eyebrow">${doneCount} / ${n * PER}</span></div></div>`;
}
/* After a log: the sage block turns solid with a pop, and the next one becomes sage. */
function flowLine() {
  if (UI.lineFrom == null) return;
  const from = UI.lineFrom, el = document.getElementById("blocks"); UI.lineFrom = null; if (!el) return;
  const i = from.stage * PER + from.inSt, cur = el.querySelector(`[data-i="${i}"]`), nxt = el.querySelector(`[data-i="${i + 1}"]`);
  setTimeout(() => { if (!cur || !cur.isConnected) return; cur.classList.remove("next"); cur.classList.add("done", "pop"); if (nxt) nxt.classList.add("next"); }, 250);
  setTimeout(() => { if (S.role === "athlete" && S.tab.athlete === "path") render(); }, 1100);
}

/* ---------- athlete ---------- */
function vPath() {
  const n = nextStep(), st = stats(), T = today(), wk = monday(T), pass = passOf("pau");
  const week = [...Array(7)].map((_, i) => { const d = addDays(wk, i), done = S.entries.some((e) => ymd(e.at) === ymd(d)), bk = S.bookings.some((b) => HELD.includes(b.status) && ymd(S.sessions[b.sid].start) === ymd(d)), isToday = ymd(d) === ymd(T); return `<div class="d"><span class="eyebrow" style="${isToday ? "color:var(--text);font-weight:700" : ""}">${WD[d.getDay()][0]}</span><span class="dot ${done ? "done" : bk ? "booked" : ""}" title="${done ? "Done" : bk ? "Booked" : "Open"}"></span></div>`; }).join("");
  return `<div class="hero">${photo(HERO_IMAGE)}</div><section class="pad stack-l" style="position:relative;margin-top:-48px">
    <div><div class="eyebrow">Your goal</div><h1 class="goal">${S.goal.title}</h1><p class="sub" style="font-size:15px">By ${S.goal.date.getDate()} ${MOL[S.goal.date.getMonth()]} ${S.goal.date.getFullYear()}. ${esc(S.goal.why)}</p>
      ${pathLine()}</div>
    <div class="card stack"><div><div class="eyebrow">Next step</div><p class="h2" style="font-size:22px;margin-top:6px">${esc(n.title)}</p><p class="sub" style="margin-top:4px">${n.meta}</p></div>
      <button class="btn acc full" data-a="${n.a}" data-v="${n.v || ""}">${n.cta}</button>
      <details><summary>Why this?</summary><p class="sub" style="margin-bottom:8px">${n.reason}</p><ul>${n.factors.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></details></div>
    <div class="stack"><div class="between"><span class="eyebrow">This week</span><span class="sub" style="font-size:12px">${S.entries.filter((e) => e.at >= wk).length} done</span></div><div class="week7">${week}</div><p class="sub" style="font-size:12px">${passLine(pass)}</p></div>
    <div class="stack"><div class="between"><span class="eyebrow">Weekly load</span><span class="sub" style="font-size:12px">${Math.round(st.ratio * 100)}% of your average</span></div>${lineChart(loadPts(st), st.wl.length - 1)}</div></section>`;
}
/* A confirm card. Its result is printed under the card itself, never further down the chat. */
function propCard(p) {
  const live = p.status === "pending", chosen = p.acts.filter((a) => a.on !== false).length;
  const head = live ? `Needs your OK · expires ${fTime(p.expiresAt)}` : p.failed ? "Couldn't be done" : p.partial ? "Confirmed in part" : { confirmed: "Confirmed", declined: "Declined", expired: "Expired", replaced: "Replaced" }[p.status];
  const off = p.status === "replaced" ? "disabled" : ""; // a replaced card keeps its buttons, switched off
  const body = p.batch
    ? live
      ? `<div class="rows">${p.acts.map((a, i) => sw(a.on !== false, "prop-toggle", `${p.id}|${i}`, esc(a.label), "", false)).join("")}</div>`
      : `<ul class="sub stack" style="gap:4px">${p.acts.map((a) => `<li>${esc(a.label)}${a.on === false ? " (kept)" : ""}</li>`).join("")}</ul>`
    : `<ul class="sub stack" style="gap:4px">${p.lines.map((l) => (l && l.pass ? (live ? passLine(S.passes.find((x) => x.id === l.pass), S.sessions[l.sid].start) + "." : "") : l ? esc(l) : "")).filter(Boolean).map((l) => `<li>${l}</li>`).join("")}</ul>`;
  // A pass balance on a card is read from the ledger while the card is live, and dropped once it is decided, so no card ever shows a stale number.
  const yes = p.batch ? (chosen ? `Cancel ${chosen} ${chosen === 1 ? "booking" : "bookings"}` : "Nothing selected") : "Confirm";
  return `<div class="card stack pcard ${live ? "" : "off"}" data-prop="${p.id}" data-state="${p.status}"><div><div class="eyebrow">${head}</div><p class="h2" style="margin-top:4px">${esc(p.title)}</p></div>${body}
    ${live || off ? `<div class="btns"><button class="btn acc" style="flex:1" data-a="prop-yes" data-v="${p.id}" ${chosen && !off ? "" : "disabled"}>${yes}</button><button class="btn" data-a="prop-no" data-v="${p.id}" ${off}>Not now</button></div>` : ""}
    ${p.results.length ? `<ul class="results">${p.results.map((r) => `<li data-ok="${r.ok}">${I(r.ok ? P.tick : P.x, 14)}<span>${esc(r.msg)}</span></li>`).join("")}</ul>` : ""}
    ${p.note ? `<p class="sub" style="font-size:13px">${esc(p.note)}</p>` : ""}</div>`;
}
function vCoachChat() {
  const pass = passOf(S.org);
  return `<div class="chatwrap"><div class="chatlog"><p class="sub" style="text-align:center;font-size:12px">Scripted demo coach at ${esc(ORGS[S.org].name)}. It only acts after you confirm.${pass ? `<br>${passLine(pass)}` : ""}</p>${S.chat.map((m) => `<div class="msg ${m.who}">${esc(m.text)}</div>${m.prop && S.props[m.prop] ? propCard(S.props[m.prop]) : ""}`).join("")}</div>
  <div class="quick">${["Book my usual", "What's on this week?", "I need an easy week", "How am I doing?", "Cancel my next session", "Cancel everything this week", "My knee hurts"].map((q) => `<button data-a="ask" data-v="${esc(q)}">${esc(q)}</button>`).join("")}</div>
  <form class="chatform" data-f="chat"><input id="chat-input" aria-label="Message your coach" placeholder="Talk to your coach" autocomplete="off"><button type="submit" aria-label="Send message">${I(P.up, 20)}</button></form></div>`;
}
const AREAS = ["Foot or ankle", "Calf or shin", "Knee", "Thigh or hamstring", "Hip or groin", "Back", "Shoulder or arm", "Other", "Not sure"];
function vLog() {
  const f = S.form, st = stats(), forS = f.sid ? S.sessions[f.sid] : null;
  const sub = `<div class="btns"><button class="btn sm ${S.logTab === "log" ? "on" : ""}" aria-pressed="${S.logTab === "log"}" data-a="logtab" data-v="log">Log</button><button class="btn sm ${S.logTab === "progress" ? "on" : ""}" aria-pressed="${S.logTab === "progress"}" data-a="logtab" data-v="progress">Progress</button></div>`;
  if (S.logTab === "progress") return `<section class="pad stack-l">${sub}<div class="stack"><div class="eyebrow">Weekly load · duration × RPE</div>${lineChart(loadPts(st), st.wl.length - 1)}<p class="sub">Your last 7 days are at ${Math.round(st.ratio * 100)}% of your 4-week average. A simple guide, not a medical measure.</p></div>
    <div class="stack"><div class="eyebrow">Personal bests</div><div class="card rows">${S.pbs.map((p) => `<div class="row"><span class="mid"><span class="strong">${p.metric}</span><span class="sub">${fDay(p.at)}${p.isNew ? " · new" : ""}</span></span><span class="num">${p.value}<span class="sub" style="font-weight:400"> ${p.unit}</span></span></div>`).join("")}</div></div></section>`;
  return `<section class="pad stack-l">${sub}<form class="stack" data-f="log"><h1 class="h1">How did it go?</h1>
    ${forS ? `<div class="between" style="align-items:center"><span class="sub">Logging your session from ${fDay(forS.start)}, ${fTime(forS.start)}.</span>${xBtn("log-clear", "Log something else instead")}</div>` : ""}
    <label class="f">What did you do?<input id="log-title" data-d="title" value="${esc(f.title || (S.plan.items.find((i) => i.date === ymd(today())) || {}).title || "")}"></label>
    <div class="two"><label class="f">Minutes<input id="log-dur" data-d="dur" type="number" inputmode="numeric" min="1" value="${esc(f.dur || 60)}"></label><label class="f">Distance in km (optional)<input id="log-dist" data-d="dist" type="number" inputmode="decimal" step="0.1" value="${esc(f.dist || "")}"></label></div>
    <div><span class="sub">How hard was it? ${f.rpe ? `<span class="strong" style="color:var(--text)">RPE ${f.rpe}</span>` : "1 is very easy, 10 is all out"}</span><div class="rpe">${[...Array(10)].map((_, i) => `<button type="button" aria-pressed="${f.rpe === i + 1}" aria-label="RPE ${i + 1}" data-a="rpe" data-v="${i + 1}">${i + 1}</button>`).join("")}</div></div>
    <div class="two"><label class="f">Result (optional)<select id="log-metric" data-d="metric">${["", "400 m", "5K", "Squat 1RM"].map((m) => `<option ${f.metric === m ? "selected" : ""} value="${m}">${m || "None"}</option>`).join("")}</select></label><label class="f">Value (s, min or kg)<input id="log-value" data-d="value" type="number" inputmode="decimal" step="0.1" value="${esc(f.value || "")}"></label></div>
    ${sw(f.pain, "pain", "", "Something hurt", "", false)}
    ${f.pain ? `<div class="stack" id="pain"><div role="group" aria-labelledby="pain-q"><span class="sub" id="pain-q">Where did it hurt? <span class="strong" style="color:var(--text)">${f.painWhere ? esc(f.painWhere) : "Pick one to save the flag"}</span></span><div class="chips" style="margin-top:8px">${AREAS.map((a) => `<button type="button" class="chip" aria-pressed="${f.painWhere === a}" data-a="area" data-v="${a}">${a}</button>`).join("")}</div></div>
      <label class="f">Level, 0 to 10<input id="log-level" data-d="painLevel" type="number" inputmode="numeric" min="0" max="10" value="${esc(f.painLevel || 3)}"></label>
      <p class="note">Pain is health data. It is stored only because you enter it here. ${S.consent.pau["alerts.pain"] ? "Coach Sara at PAU will see it, because you share pain alerts." : "No club or coach sees it. You can share pain alerts with a club under Me."}</p></div>` : ""}
    <label class="f">Notes<input id="log-notes" data-d="notes" value="${esc(f.notes || "")}"></label>
    <button class="hold" type="button" data-hold aria-label="Hold to log this session">${I(P.hold, 20)}<span>Hold to log</span></button></form>
    <div class="stack"><div class="eyebrow">Recent</div><div class="card rows">${S.entries.slice(0, 6).map((e) => `<div class="row" style="align-items:flex-start"><span class="mid"><span class="strong">${esc(e.title)}${e.pain ? ` <span class="pill line">Pain ${e.painLevel} · ${esc(e.painWhere)}</span>` : ""}</span><span class="sub">${fDay(e.at)} · ${e.dur} min · RPE ${e.rpe}${e.dist ? " · " + esc(e.dist) + " km" : ""}${e.notes ? " · " + esc(e.notes) : ""}</span>${e.comments.map((c) => `<span class="note" style="margin-top:8px"><span class="strong" style="color:var(--text)">${esc(c.by)}</span> ${esc(c.text)}</span>`).join("")}</span></div>`).join("")}</div></div></section>`;
}
function vWeek() {
  const T = today(), days = [...Array(7)].map((_, i) => addDays(T, i)), list = sessList(S.org).filter((s) => ymd(s.start) === S.day);
  const mine = upcomingBookings().filter((r) => r.s.org === S.org), waits = S.waitlist.map((w) => ({ w, s: S.sessions[w.sid] })).filter((r) => r.s.org === S.org);
  const recent = S.bookings.map((b) => ({ b, s: S.sessions[b.sid] })).filter((r) => HELD.includes(r.b.status) && r.s.org === S.org && r.s.start <= now() && r.s.start > addDays(now(), -14)).sort((a, c) => c.s.start - a.s.start).slice(0, 4);
  const row = (s, lead) => { const o = offOf(s), plan = s.org === "pau" && S.plan.items.some((i) => i.date === ymd(s.start) && i.off === s.off); return `<button class="row" data-a="sheet" data-v="${s.id}"><span class="lead time">${lead || fTime(s.start)}</span><span class="mid"><span class="strong">${o.name}</span><span class="sub">${lead ? fTime(s.start) + " · " : ""}${o.loc}${plan && !lead ? " · in your plan" : ""}</span></span><span class="end">${status(s)}</span></button>`; };
  const feat = list.find((s) => s.start > now()) || list[0], rest = list.filter((s) => s !== feat);
  let card = "";
  if (feat) {
    const o = offOf(feat), c = check(feat), b = myBooking(feat.id), w = myWait(feat.id), over = feat.start <= now(), plan = feat.org === "pau" && S.plan.items.some((i) => i.date === ymd(feat.start) && i.off === feat.off);
    const btn = over ? (b ? logItBtn(feat, "btn full") : `<p class="note">${c.msg}</p>`) : b || w ? `<button class="btn full" data-a="sheet" data-v="${feat.id}">Manage booking</button>` : c.ok ? `<button class="btn acc full" data-a="book" data-v="${feat.id}">${spots(feat) ? "Book" : "Join waitlist"}</button>` : `<p class="note">${c.msg}</p>`;
    card = `<article class="ccard" id="classcard"><div class="pic">${photo(sportPhoto(o.sport))}</div><div class="body"><button class="between" style="align-items:flex-start;width:100%" data-a="sheet" data-v="${feat.id}"><span><span class="eyebrow">${fDay(feat.start)} · ${fTime(feat.start)}</span><span class="h2" style="display:block;margin-top:4px">${o.name}</span><span class="sub" style="display:block">${o.loc} · ${o.coach}${plan ? " · in your plan" : ""}</span></span><span>${status(feat)}</span></button>${c.ok && !b && !w ? `<p class="sub" style="margin-top:-8px">${c.note}</p>` : ""}${btn}</div></article>`;
  }
  return `<section class="pad stack-l"><div><div class="eyebrow">${ORGS[S.org].kind}</div><h1 class="h1">${esc(ORGS[S.org].name)}</h1></div>
    <div class="stack"><div class="days">${days.map((d) => `<button data-a="day" data-v="${ymd(d)}" aria-pressed="${ymd(d) === S.day}" aria-label="${fDay(d)}"><span class="eyebrow" style="color:inherit">${WD[d.getDay()]}</span> <span class="n">${d.getDate()}</span></button>`).join("")}</div>
      ${card}${rest.length ? `<div class="card rows flat">${rest.map((s) => row(s)).join("")}</div>` : ""}${list.length ? "" : `<p class="sub">No sessions on this day.</p>`}
      <details><summary>Club rules</summary><p class="sub">${policyText(ORGS[S.org])}</p></details></div>
    <div class="stack"><div class="eyebrow">Your bookings</div>${mine.length || waits.length ? `<div class="card rows flat">${mine.map((r) => row(r.s, WD[r.s.start.getDay()] + " " + r.s.start.getDate())).join("")}${waits.map((r) => row(r.s, WD[r.s.start.getDay()] + " " + r.s.start.getDate())).join("")}</div>` : `<p class="sub">Nothing booked at this club yet.</p>`}</div>
    ${recent.length ? `<div class="stack" id="recent"><div class="eyebrow">Recent sessions</div><div class="card rows flat">${recent.map((r) => `<div class="row" data-past="${r.s.id}"><span class="lead time">${WD[r.s.start.getDay()]} ${r.s.start.getDate()}</span><span class="mid"><span class="strong">${offOf(r.s).name}</span><span class="sub">${fTime(r.s.start)} · ${pastLabel(r.b, r.s)}</span></span><span class="end">${logItBtn(r.s)}</span></div>`).join("")}</div></div>` : ""}</section>`;
}
function vSheet() {
  if (!UI.sheet) return "";
  if (UI.sheet.type === "pay") { const p = UI.sheet; return `<div class="sheetbg" data-a="close"><div class="sheet stack" role="dialog" aria-modal="true" aria-label="Checkout"><div><div class="eyebrow">Test checkout · no money moves</div><h2 class="h1">${esc(p.what)}</h2></div><p class="num">${chf(p.amount)}</p><p class="sub">This is the full price. No fees are added.</p><button class="btn acc full" data-a="pay-do" data-v="twint">Pay with TWINT</button><button class="btn full" data-a="pay-do" data-v="card">Pay with card</button><button class="btn ghost full" data-a="close-btn">Close</button></div></div>`; }
  const s = S.sessions[UI.sheet.sid], o = offOf(s), b = myBooking(s.id), w = myWait(s.id), c = check(s), late = b && now() > deadline(s), over = s.start <= now();
  let action = "";
  if (over) action = b ? `<p class="sub">${b.status === "attended" ? "You attended this session." : endOf(s) <= now() ? "You were booked, and nobody marked you present." : "This session is running now."}</p>${logItBtn(s, "btn acc full")}` : `<p class="note">${c.msg}</p>`;
  else if (b) action = `<p class="sub">${late && ORGS[s.org].policy.lateCancel === "forfeit" ? "You are inside the cancel deadline, so the credit is not returned." : `Free to cancel until ${fDay(deadline(s))}, ${fTime(deadline(s))}.`}</p><button class="btn full" data-a="cancel" data-v="${b.id}">Cancel booking</button>`;
  else if (w) action = `<p class="sub">You are #${w.pos} on the waitlist. Nothing is charged until you get a spot.</p><button class="btn full" data-a="leave" data-v="${s.id}">Leave waitlist</button>`;
  else if (c.ok) action = `<p class="sub">${c.pass ? passLine(c.pass, s.start) + "." : c.note} Free to cancel until ${fDay(deadline(s))}, ${fTime(deadline(s))}.</p><button class="btn acc full" data-a="book" data-v="${s.id}">${spots(s) ? "Book" : "Join waitlist"}</button>`;
  else action = `<p class="note">${c.msg}</p>`;
  return `<div class="sheetbg" data-a="close"><div class="sheet stack" role="dialog" aria-modal="true" aria-label="${o.name}"><div class="between" style="align-items:flex-start"><div><div class="eyebrow">${fDay(s.start)} · ${fTime(s.start)}</div><h2 class="h1">${o.name}</h2><p class="sub" style="margin-top:4px">${o.loc} · ${o.coach}</p></div><span style="margin-top:4px">${status(s)}</span></div>
    <div class="card rows flat"><div class="row"><span class="mid sub">Length</span><span class="strong">${o.dur} min · ${o.intensity} intensity</span></div><div class="row"><span class="mid sub">Booked</span><span class="strong mono">${booked(s)} / ${s.cap}${s.waitOthers + (w ? 1 : 0) ? ` <span class="sub">· ${s.waitOthers + (w ? 1 : 0)} waiting</span>` : ""}</span></div></div>
    ${action}<button class="btn ghost full" data-a="close-btn">Close</button></div></div>`;
}
function vMe() {
  const pass = passOf(S.org), inv = S.invoices.filter((i) => i.org === S.org), prod = ORGS[S.org].products.find((p) => p.buy), club = ORGS[S.org].name, st = pass ? passState(pass) : null;
  const scopes = { "profile.basic": ["Name and photo", "Always shared, so coaches can run a roster"], "path.read": ["Goal and stage"], "log.read": ["Training log and progress"], "log.comment": ["Coach comments on your log"], "plan.write": ["Coach reviews your plans"], "alerts.pain": ["Pain flags", "Health data. Off unless you turn it on"] };
  const mem = memoryFor(S.org), hidden = S.memory.length - mem.length;
  return `<section class="pad stack-l"><div><div class="eyebrow">Me</div><h1 class="h1">${esc(S.me.name)}</h1><p class="sub" style="margin-top:4px">${S.me.sports}</p></div>
    <div class="stack"><div class="eyebrow">Your pass at ${club}</div><div class="card stack">${pass ? `<div class="between" style="align-items:center"><span><span class="strong" style="display:block">${pass.name}</span><span class="sub">${pass.valid}</span></span><span style="text-align:right" data-pass="${pass.id}" data-text="${st.text}"><span class="num">${pass.kind === "limit" ? `${st.used}<span class="sub" style="font-weight:400"> / ${st.max}</span>` : st.left}</span><span class="sub" style="display:block">${pass.kind === "limit" ? "used in " + MOL[now().getMonth()] : "credits left"}</span></span></div>` : ""}
      ${prod ? `<button class="btn full" data-a="buy">Buy ${prod.name} · ${chf(prod.price)}</button>` : ""}
      ${pass ? `<details><summary>${pass.kind === "credits" ? "Credit history" : "Pass history"}</summary><div class="scroll" tabindex="0" role="region" aria-label="Pass history"><table><tbody>${S.ledger.filter((l) => l.pass === pass.id).map((l) => `<tr><td class="mono">${fDay(l.at)}</td><td>${esc(l.reason)}</td><td class="mono strong">${l.delta > 0 ? "+" : ""}${l.delta}</td></tr>`).join("")}</tbody></table></div></details>` : ""}</div></div>
    ${inv.length ? `<div class="stack" id="invoices"><div class="eyebrow">Invoices</div><div class="card rows flat">${inv.map((i) => `<div class="row"><span class="mid"><span class="strong">${chf(i.amount)}</span><span class="sub">${esc(i.what)} · due ${fDay(i.due)}</span></span>${i.status === "paid" ? pill("Paid") : `<button class="btn sm" data-a="pay-inv" data-v="${i.id}">Pay</button>`}</div>`).join("")}</div></div>` : ""}
    <div class="stack"><div><div class="eyebrow">Privacy</div><p class="sub" style="margin-top:4px">What ${club} can see. Changes apply at once.</p></div><div class="card rows flat">${Object.entries(scopes).map(([k, [label, sub]]) => sw(S.consent[S.org][k], "consent", S.org + "|" + k, label, sub || "", k === "profile.basic")).join("")}</div></div>
    <div class="stack" id="memory"><div><div class="eyebrow">Coach memory</div><p class="sub" style="margin-top:4px">What your coach uses at ${club}. It is yours, and yours to delete.</p></div>${mem.length ? `<div class="card rows flat">${mem.map((m) => `<div class="row" data-mem="${m.org || "general"}"><span class="mid"><span>${esc(m.text)}</span><span class="sub">${esc(m.why)}</span><span><span class="tag">${esc(memoryLabel(m))}</span></span></span>${xBtn("forget", "Delete this memory: " + m.text, m.id)}</div>`).join("")}</div>` : `<p class="sub">Your coach remembers nothing here.</p>`}${hidden ? `<p class="sub" style="font-size:13px">${hidden} more ${hidden === 1 ? "item belongs" : "items belong"} to your other clubs. Switch club to see or delete ${hidden === 1 ? "it" : "them"}; nothing from there is used here.</p>` : ""}</div>
    <button class="btn ghost full ${UI.resetArmed ? "on" : ""}" data-a="reset">${UI.resetArmed ? "Tap again to erase and start over" : "Reset demo"}</button></section>`;
}

/* ---------- coach (human) ---------- */
const shares = (k) => S.consent[S.org][k];
/* The coach sees the guardrail reason, but never more of the athlete's data than she shares with this club. */
const guardReasonForCoach = (r) => (r.kind === "pain" ? (shares("alerts.pain") ? r.text : `${S.me.name} has an open recovery signal that is not shared with this club.`) : shares("log.read") ? r.text : "Recent training load is above the limit (the log is not shared with this club).");
function vCoach() {
  const t = S.tab.coach;
  if (S.rosterSid && S.sessions[S.rosterSid]) {
    const s = S.sessions[S.rosterSid], rows = rosterRows(s), att = S.attendance[s.id] || {}, wait = rosterNames(s).waiting.concat(myWait(s.id) ? [S.me.name] : []);
    return `<section class="pad stack-l"><div><button class="btn sm ghost" style="padding-left:0" data-a="roster" data-v="" aria-label="Back to sessions">${I(P.back, 16)}Sessions</button><div class="eyebrow" style="margin-top:8px">${fDay(s.start)} · ${fTime(s.start)} · <span id="roster-count">${rows.length}</span> on the roster</div><h1 class="h1">${offOf(s).name}</h1></div>
      <div class="stack">${rows.length ? `<button class="btn acc full" data-a="all-present" data-v="${s.id}">Mark all present</button><div class="card rows flat" id="roster">${rows.map((r, i) => `<div class="row" data-row="${esc(r.name)}"><span class="mid"><span class="strong">${esc(r.name)}</span>${r.kind === "walkin" ? `<span class="sub">Walk-in</span>` : ""}</span><span class="btns">${["present", "late", "absent"].map((x) => `<button class="btn sm ${att[r.name] === x ? "on" : ""}" aria-pressed="${att[r.name] === x}" aria-label="${esc(r.name)}: ${x}" data-a="mark" data-v="${s.id}|${i}|${x}">${x[0].toUpperCase() + x.slice(1)}</button>`).join("")}</span></div>`).join("")}</div>` : `<p class="sub">Nobody is booked for this session.</p>`}
        <form class="stack" data-f="walkin" data-id="${s.id}" style="gap:8px"><label class="f">Add a walk-in<input id="walkin-name" placeholder="Name" autocomplete="off"></label><button class="btn full" type="submit">Add to roster</button></form>
        <p class="sub">${rows.filter((r) => r.kind === "booked").length} booked${rows.some((r) => r.kind === "walkin") ? ` and ${rows.filter((r) => r.kind === "walkin").length} walk-in` : ""}, capacity ${s.cap}. Only people with a confirmed booking or added here as a walk-in appear.</p>
        ${wait.length ? `<div class="stack" style="gap:8px"><div class="eyebrow">Waitlist · not on the roster</div><ol class="sub" id="roster-wait" style="padding-left:20px">${wait.map((n) => `<li>${esc(n)}</li>`).join("")}</ol></div>` : ""}</div></section>`;
  }
  if (t === "today") return `<section class="pad stack-l"><div><div class="eyebrow">Coach · ${ORGS[S.org].name}</div><h1 class="h1">Your sessions</h1></div><div class="card rows">${sessList(S.org).filter((s) => s.start > addDays(now(), -1)).slice(0, 8).map((s) => `<button class="row" data-a="roster" data-v="${s.id}"><span class="lead time" style="width:64px">${WD[s.start.getDay()]} ${s.start.getDate()}</span><span class="mid"><span class="strong">${offOf(s).name}</span><span class="sub">${fTime(s.start)} · ${offOf(s).loc}</span></span><span class="end mono">${booked(s)} / ${s.cap}${s.waitOthers + (myWait(s.id) ? 1 : 0) ? `<span class="sub" style="display:block">${s.waitOthers + (myWait(s.id) ? 1 : 0)} waiting</span>` : ""}${(S.walkins[s.id] || []).length ? `<span class="sub" style="display:block">+${S.walkins[s.id].length} walk-in</span>` : ""}</span></button>`).join("")}</div></section>`;
  if (t === "athletes") {
    if (!shares("path.read") && !shares("log.read")) return `<section class="pad stack"><h1 class="h1">Your athletes</h1>${texture(`<p class="h2">Nobody is sharing yet</p><p class="sub" style="margin-top:6px">Coaches only see what an athlete chooses to share with ${ORGS[S.org].name}.</p>`)}<p class="note">Try it: switch to Athlete, open Me, and change what this club sees.</p></section>`;
    const pass = passOf(S.org);
    return `<section class="pad stack-l"><div><div class="eyebrow">Shared with ${ORGS[S.org].name}</div><h1 class="h1">${S.me.name}</h1>${shares("path.read") ? `<p class="sub" style="margin-top:4px">${S.goal.title} · ${S.stages[S.stage]}, ${S.stageSessions} of ${PER} sessions</p>` : `<p class="sub" style="margin-top:4px">Path not shared.</p>`}${pass ? `<p class="sub" style="margin-top:4px">${passLine(pass)}</p>` : ""}</div>
      ${shares("log.read") ? `<div class="stack"><div class="eyebrow">Training log</div><div class="card rows flat">${S.entries.slice(0, 5).map((e) => `<div class="row" style="align-items:flex-start"><span class="mid"><span class="strong">${esc(e.title)}</span><span class="sub">${fDay(e.at)} · ${e.dur} min · RPE ${e.rpe}${e.pain && shares("alerts.pain") ? ` · pain ${e.painLevel}, ${esc(e.painWhere)}` : ""}</span>${e.comments.map((c) => `<span class="note" style="margin-top:8px"><span class="strong" style="color:var(--text)">${esc(c.by)}</span> ${esc(c.text)}</span>`).join("")}${shares("log.comment") ? `<form data-f="comment" data-id="${e.id}" style="display:flex;gap:8px;margin-top:8px"><input class="inp" style="min-height:44px" id="c-${e.id}" aria-label="Comment on ${esc(e.title)}, ${fDay(e.at)}" placeholder="Add a comment"><button class="btn sm" type="submit">Send</button></form>` : ""}</span></div>`).join("")}</div></div>` : `<p class="sub">Training log not shared.</p>`}</section>`;
  }
  if (t === "review") {
    const d = currentDraft();
    const body = !shares("plan.write") ? `<p>${S.me.name} has not allowed coaches at this club to review plans.</p>` : S.draftStatus !== "pending_review" ? `<p class="sub">Nothing is waiting. You ${S.draftStatus} "${d.title}".</p>`
      : `<div class="card stack" id="draft" data-guarded="${!!d.guard}"><div><div class="eyebrow">${S.me.name} · AI draft · waiting for you</div><p class="h2" style="font-size:22px;margin-top:6px">${d.title}</p></div>
        ${d.guard ? `<div class="guard" role="note" id="guard"><b>Guardrail applied: this draft can only reduce load</b><ul class="stack" style="gap:4px">${d.guard.reasons.map((r) => `<li>${esc(guardReasonForCoach(r))}</li>`).join("")}</ul></div>` : ""}
        <p class="sub">${d.rationale}</p>
        <ul class="stack" style="gap:8px" id="draft-items">${d.items.map((it) => `<li data-intensity="${it.intensity}" data-load="${it.load}"><span class="eyebrow" data-date="${ymd(it.date)}">${it.day}</span><br>${it.changed ? `<span class="was">${esc(it.was)}</span> <span class="strong">${esc(it.to)}</span>` : it.from === it.to ? `${esc(it.to)} <span class="sub">(unchanged)</span>` : `<span class="sub">${esc(it.from)} becomes</span> <span class="strong">${esc(it.to)}</span>`}</li>`).join("")}</ul>
        <div class="btns"><button class="btn acc" style="flex:1" data-a="draft" data-v="approved">Approve</button><button class="btn" data-a="draft" data-v="rejected">Reject</button></div><p class="sub">A drafted plan never reaches the athlete until a coach approves it. Guardrails are applied in code before you see it, and again on approval.</p></div>`;
    return `<section class="pad stack-l"><h1 class="h1">Review queue</h1>${body}</section>`;
  }
  const al = S.alerts.filter((a) => a.info || shares("alerts.pain"));
  return `<section class="pad stack-l"><h1 class="h1">Alerts</h1>${al.length ? `<div class="card rows flat">${al.map((a) => `<div class="row"><span class="mid"><span class="strong">${esc(a.kind)}</span><span class="sub">${S.me.name} · ${fDay(a.at)}</span></span>${a.status === "open" ? `<button class="btn sm" data-a="ack" data-v="${a.id}">Got it</button>` : `<span class="sub">Seen</span>`}</div>`).join("")}</div>` : texture(`<p class="h2">No alerts</p><p class="sub" style="margin-top:6px">Pain alerts appear only for athletes who share them.</p>`)}</section>`;
}

/* ---------- admin ---------- */
function vAdmin() {
  const t = S.tab.admin, o = ORGS[S.org], T = today(), up = sessList(S.org).filter((s) => s.start > now());
  const tile = (n, l) => `<div class="card flat"><div class="num">${n}</div><div class="sub" style="margin-top:6px">${l}</div></div>`;
  if (t === "dash") { const wk = up.filter((s) => s.start < addDays(T, 7)), fill = wk.reduce((n, s) => n + booked(s), 0) / Math.max(1, wk.reduce((n, s) => n + s.cap, 0)), open = S.invoices.filter((i) => i.org === S.org && i.status === "open"); return `<section class="pad stack-l"><div><div class="eyebrow">Admin · ${o.kind}</div><h1 class="h1">${o.name}</h1></div><div class="tiles">${tile(up.filter((s) => ymd(s.start) === ymd(T)).length, "Sessions left today")}${tile(Math.round(fill * 100) + "%", "Fill rate, next 7 days")}${tile(open.length, "Open invoices")}${tile(chf(S.invoices.filter((i) => i.org === S.org && i.status === "paid").reduce((n, i) => n + i.amount, 0) + (S.org === "studio" ? (S.ledger.filter((l) => l.kind === "grant").length - 1) * 290 : 0)), "Paid in test mode")}</div><div class="stack"><div class="eyebrow">Rules for this club</div><p>${policyText(o)}</p><p class="sub">Both clubs run on the same engine. Only this data differs.</p></div></section>`; }
  if (t === "sched") return `<section class="pad stack-l"><div><h1 class="h1">Schedule</h1><p class="sub" style="margin-top:4px">"Free a spot" simulates another member cancelling, so you can watch the waitlist move.</p></div><div class="card flat scroll" tabindex="0" role="region" aria-label="Upcoming sessions"><table><thead><tr><th>When</th><th>Session</th><th>Booked</th><th>Waiting</th><th><span class="sr">Action</span></th></tr></thead><tbody>${up.slice(0, 14).map((s) => `<tr><td class="mono">${fDay(s.start)} ${fTime(s.start)}</td><td class="strong">${offOf(s).name}</td><td class="mono">${booked(s)} / ${s.cap}</td><td class="mono">${s.waitOthers + (myWait(s.id) ? 1 : 0)}</td><td><button class="btn sm" data-a="free" data-v="${s.id}" aria-label="Free a spot: ${offOf(s).name}, ${fDay(s.start)}">Free a spot</button></td></tr>`).join("")}</tbody></table></div></section>`;
  if (t === "members") { const pass = passOf(S.org); return `<section class="pad stack-l"><h1 class="h1">Members</h1><div class="card flat scroll" tabindex="0" role="region" aria-label="Members"><table><thead><tr><th>Name</th><th>Status</th><th>Pass</th></tr></thead><tbody><tr><td class="strong">${S.me.name}</td><td>Active</td><td>${passLine(pass)}</td></tr>${NAMES.slice(0, 12).map((n, i) => `<tr><td class="strong">${n}</td><td>${["Active", "Active", "Trial", "Active", "Paused"][i % 5]}</td><td>${o.products[i % o.products.length].name}</td></tr>`).join("")}</tbody></table></div>${pass.kind === "credits" ? `<form class="card stack" data-f="adjust"><p class="h2">Adjust ${S.me.name}'s credits</p><div class="two"><label class="f">Change (+ or −)<input id="adj-n" type="number" value="1"></label><label class="f">Reason (required)<input id="adj-r" placeholder="Class cancelled late"></label></div><button class="btn full" type="submit">Adjust credits</button></form>` : `<p class="sub">This pass has a monthly limit and no credits to adjust.</p>`}</section>`; }
  if (t === "products") return `<section class="pad stack-l"><h1 class="h1">Products</h1><div class="card rows flat">${o.products.map((p) => `<div class="row"><span class="mid"><span class="strong">${p.name}</span><span class="sub">${p.rule}</span></span><span class="mono strong">${chf(p.price)}</span></div>`).join("")}</div></section>`;
  const inv = S.invoices.filter((i) => i.org === S.org);
  return `<section class="pad stack-l"><h1 class="h1">Money</h1><div class="stack"><div class="eyebrow">Invoices</div>${inv.length ? `<div class="card rows flat">${inv.map((i) => `<div class="row"><span class="mid"><span class="strong">${chf(i.amount)} · ${S.me.name}</span><span class="sub">${i.id} · due ${fDay(i.due)}${i.status === "open" && i.due < T ? " · overdue" : ""}</span></span>${i.status === "paid" ? pill("Paid") : `<button class="btn sm" data-a="mark-paid" data-v="${i.id}">Mark paid</button>`}</div>`).join("")}</div>` : `<p class="sub">No invoices at this club.</p>`}</div><div class="stack"><div class="eyebrow">Audit log</div>${S.audit.length ? `<div class="card rows flat">${S.audit.map((a) => `<div class="row"><span class="mid"><span>${esc(a.what)}</span><span class="sub">${fDay(a.at)} ${fTime(a.at)} · Admin</span></span></div>`).join("")}</div>` : `<p class="sub">Overrides, credit changes and manual payments are recorded here.</p>`}</div></section>`;
}
