"use strict";
/* PATH clickable demo, part 3 of 4: the screens. Pure functions from state to HTML. */

/* ---------- photography: sport -> photo, in one place (mirrors src/config/images.ts in the app) ---------- */
const SPORT_IMAGE = {
  running: ["hero-track-runner-silhouette", "30% 40%"], gym: ["class-gym-barbell", "55% 55%"], yoga: ["class-yoga-window", "60% 50%"], pilates: ["hero-pilates-studio", "50% 70%"],
  swimming: ["class-swimmer-underwater", "75% 65%"], climbing: ["class-climber-indoor", "80% 45%"], tennis: ["class-tennis-courts-empty", "45% 60%"], padel: ["class-padel-court", "50% 60%"],
  football: ["class-football-pitch-aerial", "50% 50%"], boxing: ["class-boxing-silhouette", "35% 45%"], crossfit: ["class-crossfit-ropes", "50% 60%"], cycling: ["hero-cyclist-mountain-path", "50% 60%"],
};
const FALLBACK_IMAGE = ["texture-chalk-hands", "50% 60%"]; // sports without a photo
const HERO_IMAGE = ["hero-desert-run", "42% 38%"], TEXTURE_IMAGE = ["texture-foam-roller", "45% 55%"];
const sportPhoto = (sport) => SPORT_IMAGE[sport] || FALLBACK_IMAGE;
const photo = ([file, focus]) => `<img class="ph" src="images/${file}.jpg" alt="" style="object-position:${focus}">`;
const texture = (inner) => `<div class="tex"><img src="images/${TEXTURE_IMAGE[0]}.jpg" alt="">${inner}</div>`;

/* ---------- small pieces ---------- */
const I = (d, s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
/* PATH icon set (same drawings as src/ui/icons.tsx in the app). Places carry one solid sparkle (Y-1). */
const P = {
  flag: '<circle cx="5.5" cy="19" r="1.6"/><path d="M5.5 17.4V16.5a4 4 0 0 1 4-4h5a4 4 0 0 0 0-8h-1.5"/><path fill="currentColor" stroke="none" d="M9 0.5Q9.8 3.7 13 4.5Q9.8 5.3 9 8.5Q8.2 5.3 5 4.5Q8.2 3.7 9 0.5Z"/>',
  chat: '<path d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-5.5L7 20v-4a3 3 0 0 1-3-3z"/><path fill="currentColor" stroke="none" d="M12 6Q12.8 9.2 16 10Q12.8 10.8 12 14Q11.2 10.8 8 10Q11.2 9.2 12 6Z"/>',
  plus: '<circle cx="12" cy="12" r="8.5"/><path fill="currentColor" stroke="none" d="M12 6.4Q13.1 10.9 17.6 12Q13.1 13.1 12 17.6Q10.9 13.1 6.4 12Q10.9 10.9 12 6.4Z"/>',
  cal: '<rect x="4" y="5.5" width="16" height="14.5" rx="3.5"/><path d="M4 10.5h16M8.5 3.5v4M15.5 3.5v4"/><path fill="currentColor" stroke="none" d="M9.6 12Q10.25 14.55 12.8 15.2Q10.25 15.85 9.6 18.4Q8.95 15.85 6.4 15.2Q8.95 14.55 9.6 12Z"/>',
  user: '<circle cx="11" cy="8.5" r="3.7"/><path d="M4 20c.5-3.6 3.3-5.5 7-5.5s6.5 1.9 7 5.5"/><path fill="currentColor" stroke="none" d="M19.3 1.8Q20 4.5 22.7 5.2Q20 5.9 19.3 8.6Q18.6 5.9 15.9 5.2Q18.6 4.5 19.3 1.8Z"/>',
  users: '<circle cx="9" cy="9" r="3.2"/><path d="M3.5 19.5c.4-3.1 2.6-4.9 5.5-4.900s5.1 1.8 5.5 4.9"/><path d="M17.6 14.8c1.6.7 2.7 2.2 2.9 4.2"/><path fill="currentColor" stroke="none" d="M18.4 3.2Q19.15 6.25 22.2 7Q19.15 7.75 18.4 10.8Q17.65 7.75 14.6 7Q17.65 6.25 18.4 3.2Z"/>',
  check: '<rect x="5" y="4.5" width="14" height="16" rx="3"/><path d="M9.5 4.5V4A1.5 1.5 0 0 1 11 2.5h2A1.5 1.5 0 0 1 14.5 4v.5"/><path fill="currentColor" stroke="none" d="M12 9.2Q12.75 12.25 15.8 13Q12.75 13.75 12 16.8Q11.25 13.75 8.2 13Q11.25 12.25 12 9.2Z"/>',
  bell: '<path d="M5 17v-5a5.5 5.5 0 0 1 11 0v5l1.5 2h-14z"/><path d="M8.7 21.500h3.6"/><path fill="currentColor" stroke="none" d="M19.4 1.7Q20.05 4.35 22.7 5Q20.05 5.65 19.4 8.3Q18.75 5.65 16.1 5Q18.75 4.35 19.4 1.7Z"/>',
  home: '<path d="M4.5 11.2 12 4.5l7.5 6.7V18a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z"/><path fill="currentColor" stroke="none" d="M12 10.6Q12.7 13.3 15.4 14Q12.7 14.7 12 17.4Q11.3 14.7 8.6 14Q11.3 13.3 12 10.6Z"/>',
  tag: '<path d="M4 6a2 2 0 0 1 2-2h4.8a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.8l-4.8 4.8a2 2 0 0 1-2.8 0L4.6 12.2A2 2 0 0 1 4 10.8z"/><path fill="currentColor" stroke="none" d="M10.6 7.3Q11.25 9.95 13.9 10.6Q11.25 11.25 10.6 13.9Q9.95 11.25 7.3 10.6Q9.95 9.95 10.6 7.3Z"/>',
  card: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10.5h18"/><path fill="currentColor" stroke="none" d="M8.2 12Q8.75 14.25 11 14.8Q8.75 15.35 8.2 17.6Q7.65 15.35 5.4 14.8Q7.65 14.25 8.2 12Z"/>',
  x: '<path d="M7 7l10 10M17 7 7 17"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path fill="currentColor" stroke="none" d="M12 6Q12.6 11.4 14.2 12Q12.6 12.6 12 18Q11.4 12.6 9.8 12Q11.4 11.4 12 6Z" transform="rotate(45 12 12)"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  tick: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  back: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  fwd: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
  clock: '<circle cx="10.5" cy="13.5" r="7"/><path d="M10.5 9.5v4l2.7 1.8"/><path fill="currentColor" stroke="none" d="M19.4 1.8Q20.1 4.5 22.8 5.2Q20.1 5.9 19.4 8.6Q18.7 5.9 16 5.2Q18.7 4.5 19.4 1.8Z"/>',
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
  if (w) return pill(w.offer ? `Held until ${fTime(w.offer.expiresAt)}` : `Waitlist #${w.pos}`, true);
  if (now() < opensAt(s)) return `<span class="sub">Opens ${WD[opensAt(s).getDay()]} ${opensAt(s).getDate()}</span>`;
  return `<span class="sub">${spots(s) === 0 ? "Full" : spots(s) + " spots"}</span>`;
}
const sw = (on, a, v, label, sub, disabled) => `<button class="sw" role="switch" aria-checked="${!!on}" data-a="${a}" data-v="${v}" ${disabled ? "disabled" : ""}><span class="l"><span class="strong" style="display:block">${label}</span>${sub ? `<span class="sub">${sub}</span>` : ""}</span><span class="t"></span></button>`;
const passLine = (pass, when) => { const t = passState(pass, when).text; return `<span data-pass="${pass.id}" data-text="${t}">${pass.name}: ${t}</span>`; };
/* The ways out when a pass says no, and the two answers to a held spot. Used by the session sheet, the coach chat and a failed confirm card. */
const offerBtns = (s) => offersFor(s).map((o, i) => `<button class="btn ${i === 0 ? "acc" : ""} full" data-a="offer" data-v="${o.kind}|${s.id}">${o.label}</button>`).join("");
function heldBtns(s) {
  const w = myWait(s.id); if (!w || !w.offer) return "";
  const can = check(s, { ignoreWait: true }).ok;
  return `${can ? `<button class="btn acc full" data-a="offer-accept" data-v="${s.id}">Take the spot</button>` : offerBtns(s)}<button class="btn full" data-a="offer-pass" data-v="${s.id}">Pass it on</button>`;
}
const optBtns = (sid) => { const s = S.sessions[sid]; if (!s || s.start <= now()) return ""; const h = heldBtns(s) || offerBtns(s); return h ? `<div class="opts" data-opts="${sid}">${h}</div>` : ""; };
/* Under the coach's reply about an open pain flag: update it or clear it. Gone once the flag is. */
const painBtns = (id) => { const e = S.entries.find((x) => x.id === id); return e && e.pain && !e.cleared ? `<div class="opts" data-painflag="${id}"><button class="btn full" data-a="log-edit" data-v="${id}">Update the flag</button><button class="btn full" data-a="clear-pain">It's gone: clear the flag</button></div>` : ""; };
const loggedFor = (sid) => S.entries.some((e) => e.sid === sid);
const logItBtn = (s, cls = "btn sm") => (loggedFor(s.id) ? `<span class="sub">Logged</span>` : `<button class="${cls}" data-a="logit" data-v="${s.id}">Log it</button>`);
function lineChart(points, hi) {
  const W = 420, H = 140, L = 34, B = 18, max = Math.max(...points.map((p) => p.v), 1) * 1.1, x = (i) => L + (i * (W - L - 8)) / (points.length - 1), y = (v) => H - B - (v / max) * (H - B - 8);
  const grid = [0, 0.5, 1].map((f) => `<line x1="${L}" x2="${W}" y1="${y((max * f) / 1.1)}" y2="${y((max * f) / 1.1)}" stroke="var(--hairline)"/><text x="0" y="${y((max * f) / 1.1) + 3}">${Math.round((max * f) / 1.1)}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(points.map((p) => p.l + " " + p.v).join(", "))}">${grid}<polyline fill="none" stroke="var(--text)" stroke-width="1.5" stroke-linejoin="round" points="${points.map((p, i) => x(i) + "," + y(p.v)).join(" ")}"/><circle cx="${x(hi)}" cy="${y(points[hi].v)}" r="4" fill="var(--text)"/>${points.map((p, i) => (i % 3 === 0 || i === points.length - 1 ? `<text x="${x(i) - 8}" y="${H - 4}">${p.l}</text>` : "")).join("")}</svg>`;
}
const isoWeek = (d) => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)); return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7); };
const loadPts = (st) => st.wl.map((w) => ({ l: "W" + isoWeek(w.start), v: w.load }));

/* The path as one thin bar of five segments, filled up to today (D-5). */
const segPct = (k, at) => (k < at.stage ? 100 : k === at.stage ? Math.round((at.inSt / PER) * 100) : 0);
function pathLine() {
  const at = UI.lineFrom ?? { stage: S.stage, inSt: S.stageSessions }, n = S.stages.length;
  return `<div id="phases" role="img" aria-label="Stage ${at.stage + 1} of ${n}: ${S.stages[at.stage]}. ${at.inSt} of ${PER} sessions done."><div class="phases">${S.stages.map((name, k) => `<i title="${name}"><b data-k="${k}" style="width:${segPct(k, at)}%"></b></i>`).join("")}</div>
    <p class="sub" style="margin-top:12px"><span class="strong" style="color:var(--text)">${S.stages[at.stage]}</span> · session ${at.inSt} of ${PER}</p></div>`;
}
/* After a log: the bar grows to the new position. */
function flowLine() {
  if (UI.lineFrom == null) return;
  const el = document.getElementById("phases"); UI.lineFrom = null; if (!el) return;
  const to = { stage: S.stage, inSt: S.stageSessions };
  setTimeout(() => { el.querySelectorAll("b").forEach((b) => { b.style.width = segPct(Number(b.dataset.k), to) + "%"; }); }, 250);
  setTimeout(() => { if (S.role === "athlete" && S.tab.athlete === "path") render(); }, 1100);
}

/* ---------- athlete ---------- */
function vPath() {
  const n = nextStep(), st = stats(), T = today(), wk = monday(T), pass = passOf("pau");
  const week = [...Array(7)].map((_, i) => { const d = addDays(wk, i), done = S.entries.some((e) => ymd(e.at) === ymd(d)), bk = S.bookings.some((b) => HELD.includes(b.status) && ymd(S.sessions[b.sid].start) === ymd(d)), isToday = ymd(d) === ymd(T); return `<div class="d"><span class="eyebrow ${isToday ? "today" : ""}">${WD[d.getDay()][0]}</span><span class="dot ${done ? "done" : bk ? "booked" : ""}" title="${done ? "Done" : bk ? "Booked" : "Open"}"></span></div>`; }).join("");
  return `<div class="hero">${photo(HERO_IMAGE)}</div><section class="pad stack-l" style="position:relative;margin-top:-24px">
    <div class="stack" style="gap:24px"><div><div class="eyebrow">Your goal</div><h1 class="goal">${S.goal.title}</h1><p class="sub">By ${S.goal.date.getDate()} ${MOL[S.goal.date.getMonth()]} ${S.goal.date.getFullYear()}. ${esc(S.goal.why)}</p></div>
      ${pathLine()}</div>
    <div class="card stack"><div><div class="eyebrow">Next step</div><p class="h1">${esc(n.title)}</p><p class="sub" style="margin-top:4px">${n.meta}</p></div>
      <button class="btn acc full" data-a="${n.a}" data-v="${n.v || ""}">${n.cta}</button>
      <details style="margin:-8px 0 -12px"><summary>Why this?</summary><p class="sub" style="margin-bottom:8px">${n.reason}</p><ul style="margin-bottom:12px">${n.factors.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></details></div>
    ${S.tryPlans.length ? `<div class="stack" id="trying" style="gap:8px"><div class="eyebrow">You're trying</div><div class="card rows">${S.tryPlans.map(tryToday).map((t) => `<button class="row" data-a="prov-open" data-v="${t.o.id}"><span class="mid"><span class="strong">${esc(providerOf(t.o).plan.title)} <span class="sub" style="font-weight:400">· ${esc(t.o.club)}</span></span><span class="sub">Day ${t.n} of ${t.of}: ${esc(t.text)}</span></span><span class="end sub">${signedUp(t.o.id) ? "Booked" : "Book"}</span></button>`).join("")}</div></div>` : ""}
    <div class="stack"><div class="between"><span class="eyebrow">This week</span><span class="sub">${S.entries.filter((e) => e.at >= wk).length} done</span></div><div class="week7">${week}</div><div><p class="sub">${passLine(pass)}</p><button class="btn sm link" data-a="tab" data-v="log">Log a session</button></div></div>
    <div class="stack" id="progress"><div class="between"><span class="eyebrow">Weekly load</span><span class="sub">${Math.round(st.ratio * 100)}% of your average</span></div>${lineChart(loadPts(st), st.wl.length - 1)}<p class="sub">Duration × effort. A simple guide, not a medical measure.</p></div>
    <div class="stack" id="pbs"><div class="eyebrow">Personal bests</div><div class="card rows">${S.pbs.map((p) => `<div class="row"><span class="mid"><span class="strong">${p.metric}</span><span class="sub">${fDay(p.at)}${p.isNew ? " · new" : ""}</span></span><span class="num">${p.value}<span class="sub" style="font-weight:400"> ${p.unit}</span></span></div>`).join("")}</div></div></section>`;
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
    ${p.note ? `<p class="sub">${esc(p.note)}</p>` : ""}${p.failed && p.offerSid ? optBtns(p.offerSid) : ""}</div>`;
}
function vCoachChat() {
  const pass = passOf(S.org);
  return `<div class="chatwrap"><div class="chatlog"><p class="sub" style="text-align:center;">Scripted demo coach at ${esc(ORGS[S.org].name)}. It only acts after you confirm.${pass ? `<br>${passLine(pass)}` : ""}</p>${S.chat.map((m) => `<div class="msg ${m.who}">${esc(m.text)}</div>${m.opts ? optBtns(m.opts.sid) : ""}${m.picks ? pickBtns(m.picks) : ""}${m.pain ? painBtns(m.pain) : ""}${m.prop && S.props[m.prop] ? propCard(S.props[m.prop]) : ""}`).join("")}</div>
  <div class="quick">${["Book my usual", "Suggest something new for me", "Book every Thursday this season", "What's on this week?", "Where am I on the waitlist?", "I need an easy week", "How am I doing?", "Cancel my next session", "Cancel everything this week", "My knee hurts"].map((q) => `<button data-a="ask" data-v="${esc(q)}">${esc(q)}</button>`).join("")}</div>
  <form class="chatform" data-f="chat"><input id="chat-input" aria-label="Message your coach" placeholder="Talk to your coach" autocomplete="off"><button type="submit" aria-label="Send message">${I(P.up, 20)}</button></form></div>`;
}
const AREAS = ["Foot or ankle", "Calf or shin", "Knee", "Thigh or hamstring", "Hip or groin", "Back", "Shoulder or arm", "Other", "Not sure"];
function vLog() {
  const f = S.form, st = stats(), forS = f.sid ? S.sessions[f.sid] : null;
  const sub = `<button class="btn sm link ghost" data-a="home" aria-label="Back to Path">${I(P.back, 16)}Path</button>`;
  const er = f.errors || {}, edit = f.editId ? S.entries.find((e) => e.id === f.editId) : null, open = !!(f.more || f.pain || f.dist || f.metric || f.notes || er.pain);
  const err = (k) => (er[k] ? `<span class="err" id="err-${k}" role="alert">${er[k]}</span>` : "");
  const bad = (k) => (er[k] ? `aria-invalid="true" aria-describedby="err-${k}"` : "");
  return `<section class="pad stack-l">${sub}<form class="stack" data-f="log" novalidate><h1 class="h1">${edit ? "Edit entry" : "How did it go?"}</h1>
    ${edit ? `<p class="sub">${fDay(edit.at)}. Changes are saved to this entry.</p>` : forS ? `<div class="between" style="align-items:center"><span class="sub" id="log-for">Filled in from your session on ${fDay(forS.start)}, ${fTime(forS.start)}. Just tap the effort.</span>${xBtn("log-clear", "Log something else instead")}</div>` : ""}
    <label class="f">What did you do?<input id="log-title" data-d="title" value="${esc(f.title || "")}" ${bad("title")}>${err("title")}</label>
    <label class="f">Minutes<input id="log-dur" data-d="dur" type="number" inputmode="numeric" min="1" value="${esc(f.dur || "")}" ${bad("dur")}>${err("dur")}</label>
    <div role="group" aria-labelledby="rpe-q"><span class="sub" id="rpe-q">How hard was it? ${f.rpe ? `<span class="strong" style="color:var(--text)">RPE ${f.rpe}</span>` : "1 is very easy, 10 is all out"}</span><div class="rpe">${[...Array(10)].map((_, i) => `<button type="button" aria-pressed="${f.rpe === i + 1}" aria-label="RPE ${i + 1}" data-a="rpe" data-v="${i + 1}">${i + 1}</button>`).join("")}</div>${err("rpe")}</div>
    <button type="button" class="btn sm link ghost" data-a="more" aria-expanded="${open}">${open ? "Hide details" : "Add details"}</button>
    ${open ? `<div class="stack" id="details">
    <label class="f">Distance in km<input id="log-dist" data-d="dist" type="number" inputmode="decimal" step="0.1" value="${esc(f.dist || "")}"></label>
    <div class="two"><label class="f">Result<select id="log-metric" data-d="metric">${["", "400 m", "5K", "Squat 1RM"].map((m) => `<option ${f.metric === m ? "selected" : ""} value="${m}">${m || "None"}</option>`).join("")}</select></label><label class="f">Value (s, min or kg)<input id="log-value" data-d="value" type="number" inputmode="decimal" step="0.1" value="${esc(f.value || "")}"></label></div>
    ${sw(f.pain, "pain", "", "Something hurt", "", false)}
    ${f.pain ? `<div class="stack" id="pain"><div role="group" aria-labelledby="pain-q"><span class="sub" id="pain-q">Where did it hurt? <span class="strong" style="color:var(--text)">${f.painWhere ? esc(f.painWhere) : "Pick one to save the flag"}</span></span><div class="chips" style="margin-top:8px">${AREAS.map((a) => `<button type="button" class="chip" aria-pressed="${f.painWhere === a}" data-a="area" data-v="${a}">${a}</button>`).join("")}</div>${err("pain")}</div>
      <label class="f">Level, 0 to 10<input id="log-level" data-d="painLevel" type="number" inputmode="numeric" min="0" max="10" value="${esc(f.painLevel || 3)}"></label>
      <p class="note">Pain is health data. It is stored only because you enter it here. ${S.consent.pau["alerts.pain"] ? "Coach Sara at PAU will see it, because you share pain alerts." : "No club or coach sees it. You can share pain alerts with a club under Me."}</p></div>` : ""}
    <label class="f">Notes<input id="log-notes" data-d="notes" value="${esc(f.notes || "")}"></label></div>` : ""}
    <button class="btn acc full" type="submit">${edit ? "Save changes" : "Save"}</button>
    ${edit ? `<div class="btns"><button type="button" class="btn" style="flex:1" data-a="log-delete" data-v="${edit.id}">Delete entry</button><button type="button" class="btn ghost" style="flex:1" data-a="log-clear">Cancel</button></div>` : ""}</form>
    <div class="stack"><div class="eyebrow">Recent</div><div class="card rows" id="entries">${S.entries.slice(0, 6).map((e) => `<div class="row" data-entry="${e.id}" style="align-items:flex-start"><span class="mid"><span class="strong">${esc(e.title)}${e.pain ? ` <span class="pill line">Pain ${e.painLevel} · ${esc(e.painWhere)}${e.cleared ? " · cleared" : ""}</span>` : ""}</span><span class="sub">${fDay(e.at)} · ${e.dur} min · RPE ${e.rpe}${e.dist ? " · " + esc(e.dist) + " km" : ""}${e.notes ? " · " + esc(e.notes) : ""}</span>${e.comments.map((c) => `<span class="note" style="margin-top:8px"><span class="strong" style="color:var(--text)">${esc(c.by)}</span> ${esc(c.text)}</span>`).join("")}</span><button class="btn sm" data-a="log-edit" data-v="${e.id}" aria-label="Edit ${esc(e.title)}, ${fDay(e.at)}">Edit</button></div>`).join("")}</div></div></section>`;
}
/* Week shows one week at a time, this week and the next three. S.day is the day picked; the week follows from it. */
const weekIndex = () => Math.max(0, Math.min(WEEKS - 1, Math.round((monday(new Date(S.day + "T12:00")) - monday(today())) / 6048e5)));
function shiftWeek(n) {
  const wi = weekIndex(), to = Math.max(0, Math.min(WEEKS - 1, wi + n)); if (to === wi) return false;
  const d = addDays(new Date(S.day + "T12:00"), 7 * (to - wi));
  S.day = ymd(d < today() ? today() : d); // going back to this week never lands on a day that is over
  return true;
}
const matchesFilter = (s) => (S.filter.cat === "all" || CAT[s.off] === S.filter.cat) && (!S.filter.mine || coveredByMe(s));
function vWeek() {
  const T = today(), wi = weekIndex(), wk = addDays(monday(T), 7 * wi), end = addDays(wk, 6), days = [...Array(7)].map((_, i) => addDays(wk, i));
  const all = sessList(S.org), cats = [...new Set(ORGS[S.org].offerings.map((o) => CAT[o.id]))], f = S.filter, filtered = f.cat !== "all" || f.mine;
  const onDay = all.filter((s) => ymd(s.start) === S.day), list = onDay.filter(matchesFilter);
  const mine = upcomingBookings().filter((r) => r.s.org === S.org), waits = S.waitlist.map((w) => ({ w, s: S.sessions[w.sid] })).filter((r) => r.s.org === S.org), series = S.series.filter((x) => x.org === S.org);
  const recent = S.bookings.map((b) => ({ b, s: S.sessions[b.sid] })).filter((r) => HELD.includes(r.b.status) && r.s.org === S.org && r.s.start <= now() && r.s.start > addDays(now(), -14)).sort((a, c) => c.s.start - a.s.start).slice(0, 4);
  const row = (s, lead) => { const o = offOf(s), plan = s.org === "pau" && S.plan.items.some((i) => i.date === ymd(s.start) && i.off === s.off); return `<button class="row" data-a="sheet" data-v="${s.id}"><span class="lead time">${lead || fTime(s.start)}</span><span class="mid"><span class="strong">${o.name}</span><span class="sub">${lead ? fTime(s.start) + " · " : ""}${o.loc}${plan && !lead ? " · in your plan" : ""}</span></span><span class="end">${status(s)}</span></button>`; };
  const xmine = S.signups.map((x) => offerById(x.id)).filter((o) => o && offerStart(o) > now()).sort((a, b) => offerStart(a) - offerStart(b));
  const xrow = (o) => `<button class="row" data-a="prov-open" data-v="${o.id}"><span class="lead time">${WD[offerStart(o).getDay()]} ${offerStart(o).getDate()}</span><span class="mid"><span class="strong">${esc(o.title)}</span><span class="sub">${fTime(offerStart(o))} · ${esc(o.club)} · from Explore</span></span><span class="end">${pill(S.signups.find((x) => x.id === o.id).wait ? "Waitlist" : "Booked", !!S.signups.find((x) => x.id === o.id).wait)}</span></button>`;
  const feat = list.find((s) => s.start > now()) || list[0], rest = list.filter((s) => s !== feat);
  let card = "";
  if (feat) {
    const o = offOf(feat), b = myBooking(feat.id), w = myWait(feat.id), c = check(feat, { ignoreWait: !!(w && w.offer) }), over = feat.start <= now(), plan = feat.org === "pau" && S.plan.items.some((i) => i.date === ymd(feat.start) && i.off === feat.off);
    const btn = over ? (b ? logItBtn(feat, "btn full") : `<p class="note">${c.msg}</p>`)
      : w && w.offer ? `<button class="btn acc full" data-a="sheet" data-v="${feat.id}">A spot is held for you</button>`
      : b || w ? `<button class="btn full" data-a="sheet" data-v="${feat.id}">Manage booking</button>`
      : c.ok ? `<button class="btn acc full" data-a="book" data-v="${feat.id}">${spots(feat) ? "Book" : "Join waitlist"}</button>`
      : `<p class="note">${c.msg}</p>${c.blocked ? `<button class="btn full" data-a="sheet" data-v="${feat.id}">See your options</button>` : ""}`;
    card = `<article class="ccard" id="classcard"><div class="pic">${photo(sportPhoto(o.sport))}</div><div class="body"><button class="between" style="align-items:flex-start;width:100%" data-a="sheet" data-v="${feat.id}"><span><span class="eyebrow">${fDay(feat.start)} · ${fTime(feat.start)}</span><span class="h2" style="display:block;margin-top:4px">${o.name}</span><span class="sub" style="display:block">${o.loc} · ${o.coach}${plan ? " · in your plan" : ""}</span></span><span>${status(feat)}</span></button>${c.ok && !b && !w ? `<p class="sub" style="margin-top:-8px">${c.note}</p>` : ""}${btn}</div></article>`;
  }
  const range = `${wk.getDate()}${wk.getMonth() !== end.getMonth() ? " " + MO[wk.getMonth()] : ""} to ${end.getDate()} ${MO[end.getMonth()]}`;
  const dayBtn = (d) => { const k = ymd(d), any = all.some((x) => ymd(x.start) === k && matchesFilter(x)), bk = mine.some((r) => ymd(r.s.start) === k) || waits.some((r) => ymd(r.s.start) === k) || xmine.some((o) => ymd(offerStart(o)) === k); return `<button data-a="day" data-v="${k}" class="${d < T ? "past" : ""} ${any ? "" : "none"}" aria-pressed="${k === S.day}" aria-label="${fDay(d)}"><span class="eyebrow" style="color:inherit">${WD[d.getDay()]}</span> <span class="n">${d.getDate()}</span><i class="mk ${bk ? "on" : ""}"></i></button>`; };
  const chip = (a, v, label, on) => `<button class="chip" data-a="${a}" data-v="${v}" aria-pressed="${on}">${label}</button>`;
  return `<section class="pad stack-l"><div><div class="eyebrow">${ORGS[S.org].kind}</div><h1 class="h1">${esc(ORGS[S.org].name)}</h1></div>
    <div class="stack" id="weekpane">
      <div class="weeknav"><button class="x" data-a="week" data-v="-1" aria-label="Previous week" ${wi === 0 ? "disabled" : ""}>${I(P.back, 18)}</button><div class="wk" id="weeklabel" aria-live="polite"><span class="strong">${["This week", "Next week", "In 2 weeks", "In 3 weeks"][wi]}</span><span class="sub">${range}</span><span class="wkdots" aria-hidden="true">${[...Array(WEEKS)].map((_, i) => `<i class="${i === wi ? "on" : ""}"></i>`).join("")}</span></div><button class="x" data-a="week" data-v="1" aria-label="Next week" ${wi === WEEKS - 1 ? "disabled" : ""}>${I(P.fwd, 18)}</button></div>
      <div class="days">${days.map(dayBtn).join("")}</div>
      <div class="filters" role="group" aria-label="Filter sessions">${chip("fcat", "all", "All", f.cat === "all")}${cats.map((c) => chip("fcat", c, c, f.cat === c)).join("")}${chip("fmine", "", "My pass only", f.mine)}</div>
      ${card}${rest.length ? `<div class="card rows" id="daylist">${rest.map((s) => row(s)).join("")}</div>` : ""}${list.length ? "" : `<p class="sub" id="noresults">${onDay.length ? "No sessions match your filters on this day." : "No sessions on this day."}</p>`}${filtered && onDay.length > list.length ? `<button class="btn sm link ghost" data-a="fclear">Clear filters · ${onDay.length - list.length} hidden</button>` : ""}
      <details><summary>Club rules</summary><p class="sub">${policyText(S.org)}</p></details></div>
    <div class="stack"><div class="eyebrow">Your bookings</div>${mine.length || waits.length ? `<div class="card rows" id="mybookings">${mine.map((r) => row(r.s, WD[r.s.start.getDay()] + " " + r.s.start.getDate())).join("")}${waits.map((r) => row(r.s, WD[r.s.start.getDay()] + " " + r.s.start.getDate())).join("")}</div>` : `<p class="sub">Nothing booked at this club yet.</p>`}${xmine.length ? `<div class="eyebrow" style="margin-top:8px">From Explore</div><div class="card rows" id="xbookings">${xmine.map(xrow).join("")}</div>` : ""}</div>
    ${series.length ? `<div class="stack" id="series"><div class="eyebrow">Repeating</div>${series.map((se) => `<div class="card stack" data-series="${se.id}" style="gap:8px">${sw(!se.paused, "series-pause", se.id, `${seriesLabel(se)} · ${seriesOff(se).name}`, se.paused ? "Paused. Nothing new is booked; your bookings stay." : `${seriesSummary(se)} · until ${fDay(se.until)} ${se.until.getFullYear()}`, false)}<details><summary>Date by date</summary><ul class="sub stack" style="gap:6px;margin-bottom:12px">${seriesRows(se).map((r) => `<li data-status="${r.status}"><span class="strong" style="color:var(--text)">${fDay(r.date)}</span> ${esc(r.text)}</li>`).join("")}<li>Later dates are added as they come into the schedule.</li></ul><button class="btn sm" data-a="series-end" data-v="${se.id}">End this series</button></details></div>`).join("")}</div>` : ""}
    ${recent.length ? `<div class="stack" id="recent"><div class="eyebrow">Recent sessions</div><div class="card rows">${recent.map((r) => `<div class="row" data-past="${r.s.id}"><span class="lead time">${WD[r.s.start.getDay()]} ${r.s.start.getDate()}</span><span class="mid"><span class="strong">${offOf(r.s).name}</span><span class="sub">${fTime(r.s.start)} · ${pastLabel(r.b, r.s)}</span></span><span class="end">${logItBtn(r.s)}</span></div>`).join("")}</div></div>` : ""}</section>`;
}
function vSheet() {
  if (!UI.sheet) return "";
  if (UI.sheet.type === "offer") return vOfferSheet();
  if (UI.sheet.type === "clubs") return `<div class="sheetbg" data-a="close"><div class="sheet stack-l" tabindex="-1" role="dialog" aria-modal="true" aria-label="Your clubs"><div class="stack" style="gap:8px"><h2 class="h1" style="margin:0 0 8px">Your clubs</h2>${Object.entries(ORGS).map(([k, o]) => `<button class="clubrow" data-a="org" data-v="${k}" aria-current="${S.org === k}"><span class="mono36" aria-hidden="true">${mono(k)}</span><span class="mid">${esc(o.name)}</span><span class="ck">${S.org === k ? I(P.tick, 22) : ""}</span></button>`).join("")}</div>
    <div class="stack" style="gap:8px"><span class="eyebrow" id="yourcolour">Your colour</span><div class="swatches" role="group" aria-labelledby="yourcolour">${Object.entries(ACCENTS).map(([k, [name, hex]]) => `<button class="swatch" data-a="accent" data-v="${k}" aria-pressed="${(S.accent || "sage") === k}" aria-label="${name}"><i style="background:${hex}">${(S.accent || "sage") === k ? I(P.tick, 16) : ""}</i></button>`).join("")}</div></div>
    <div class="stack" style="gap:12px"><span class="eyebrow" id="viewas">Demo: view as</span><div class="seg full" role="group" aria-labelledby="viewas">${[["athlete", "Athlete"], ["coach", "Coach"], ["admin", "Admin"]].map(([r, l]) => `<button data-a="role" data-v="${r}" aria-pressed="${S.role === r}">${l}</button>`).join("")}</div></div></div></div>`;
  if (UI.sheet.type === "pay") { const p = UI.sheet; return `<div class="sheetbg" data-a="close"><div class="sheet stack" role="dialog" aria-modal="true" aria-label="Checkout"><div><div class="eyebrow">Test checkout · no money moves</div><h2 class="h1">${esc(p.what)}</h2></div><p class="num">${chf(p.amount)}</p><p class="sub">${p.note ? esc(p.note) + " " : ""}This is the full price. No fees are added.${p.then ? " Your session is booked as soon as the payment goes through." : ""}</p><button class="btn acc full" data-a="pay-do" data-v="twint">Pay with TWINT</button><button class="btn full" data-a="pay-do" data-v="card">Pay with card</button><button class="btn ghost full" data-a="close-btn">Close</button></div></div>`; }
  const s = S.sessions[UI.sheet.sid], o = offOf(s), wd = s.start.getDay();
  if (UI.sheet.type === "series") {
    const rows = previewSeries(s.org, s.off, wd), until = ORGS[s.org].season.end;
    const what = (r) => (r.status === "booked" ? ["Book", ""] : r.status === "skipped" ? ["Skip", r.text] : r.status === "opens" ? ["Later", r.text] : [r.text, ""]);
    return `<div class="sheetbg" data-a="close"><div class="sheet stack" role="dialog" aria-modal="true" aria-label="Repeat this booking"><div><div class="eyebrow">${o.name} · ${ORGS[s.org].season.name}</div><h2 class="h1">Every ${WDL[wd]} ${fTime(s.start)}</h2><p class="sub" style="margin-top:4px">Until ${fDay(until)} ${until.getFullYear()}. Each date is booked through the normal rules as soon as booking opens.</p></div>
      <div class="card rows" id="series-preview">${rows.map((r) => `<div class="row" data-status="${r.status}"><span class="lead time" style="width:92px">${fDay(r.date)}</span><span class="mid"><span class="strong">${what(r)[0]}</span>${what(r)[1] ? `<span class="sub">${esc(what(r)[1])}</span>` : ""}</span></div>`).join("")}</div>
      <p class="sub">Later dates are added as they come into the schedule. A date that clashes with another booking or goes over your pass is skipped and reported. You can pause with one tap.</p>
      <button class="btn acc full" data-a="series-start" data-v="${s.id}">Start repeating</button><button class="btn ghost full" data-a="sheet" data-v="${s.id}">Back</button></div></div>`;
  }
  const b = myBooking(s.id), w = myWait(s.id), c = check(s, { ignoreWait: !!(w && w.offer) }), late = b && now() > deadline(s), over = s.start <= now(), se = findSeries(s.org, s.off, wd);
  let action = "";
  if (over) action = b ? `<p class="sub">${b.status === "attended" ? "You attended this session." : endOf(s) <= now() ? "You were booked, and nobody marked you present." : "This session is running now."}</p>${logItBtn(s, "btn acc full")}` : `<p class="note">${c.msg}</p>`;
  else if (b) action = `<p class="sub">${late && ORGS[s.org].policy.lateCancel === "forfeit" ? "You are inside the cancel deadline, so the credit is not returned." : `Free to cancel until ${fDay(deadline(s))}, ${fTime(deadline(s))}.`}</p><button class="btn full" data-a="cancel" data-v="${b.id}">Cancel booking</button>`;
  else if (w && w.offer) action = `<p class="sub" id="held">A spot is held for you until ${fDay(w.offer.expiresAt)}, ${fTime(w.offer.expiresAt)}. After that it goes to the next person.</p>${c.ok ? "" : `<p class="note">${c.msg}</p>`}<div class="stack" id="offers" style="gap:8px">${heldBtns(s)}</div>`;
  else if (w) action = `<p class="sub">You are #${w.pos} of ${waitTotal(s)} on the waitlist. Nothing is charged until you get a spot.${S.settings[s.org].waitlistMode === "offer" ? ` When it is your turn, the spot is held for you for ${S.settings[s.org].offerHoldMin / 60} h.` : " When it is your turn, you are booked automatically."}</p><button class="btn full" data-a="leave" data-v="${s.id}">Leave waitlist</button>`;
  else if (c.ok) action = `<p class="sub">${c.pass ? passLine(c.pass, s.start) + "." : c.note} Free to cancel until ${fDay(deadline(s))}, ${fTime(deadline(s))}.</p><button class="btn acc full" data-a="book" data-v="${s.id}">${spots(s) ? "Book" : "Join waitlist"}</button>`;
  else if (c.blocked) action = `<p class="note">${c.msg}${spots(s) === 0 ? " The session is full, too: the waitlist costs nothing until a spot comes up." : ""}</p><div class="stack" id="offers" style="gap:8px">${offerBtns(s)}</div>`;
  else action = `<p class="note">${c.msg}</p>`;
  const repeat = over ? "" : se ? `<p class="sub" id="repeats">Repeats ${seriesLabel(se).toLowerCase()}${se.paused ? " (paused)" : ""}. Manage it under Your bookings.</p>` : `<button class="btn full" data-a="series-preview" data-v="${s.id}">Book every ${WDL[wd]} ${fTime(s.start)} this season</button>`;
  return `<div class="sheetbg" data-a="close"><div class="sheet stack" role="dialog" aria-modal="true" aria-label="${o.name}"><div class="between" style="align-items:flex-start"><div><div class="eyebrow">${fDay(s.start)} · ${fTime(s.start)}</div><h2 class="h1">${o.name}</h2><p class="sub" style="margin-top:4px">${o.loc} · ${o.coach}</p></div><span style="margin-top:4px">${status(s)}</span></div>
    <div class="card rows"><div class="row"><span class="mid sub">Length</span><span class="strong">${o.dur} min · ${o.intensity} intensity</span></div><div class="row"><span class="mid sub">Booked</span><span class="strong mono">${booked(s)} / ${s.cap}${waitTotal(s) ? ` <span class="sub">· ${waitTotal(s)} waiting</span>` : ""}</span></div></div>
    ${action}${repeat}<button class="btn ghost full" data-a="close-btn">Close</button></div></div>`;
}
function vMe() {
  const pass = passOf(S.org), inv = S.invoices.filter((i) => i.org === S.org), prod = ORGS[S.org].products.find((p) => p.buy), club = ORGS[S.org].name, st = pass ? passState(pass) : null;
  const scopes = { "profile.basic": ["Name and photo", "Always shared, so coaches can run a roster"], "path.read": ["Goal and stage"], "log.read": ["Training log and progress"], "log.comment": ["Coach comments on your log"], "plan.write": ["Coach reviews your plans"], "alerts.pain": ["Pain flags", "Health data. Off unless you turn it on"] };
  const mem = memoryFor(S.org), hidden = S.memory.length - mem.length;
  return `<section class="pad stack-l"><div><div class="eyebrow">Me</div><h1 class="h1">${esc(S.me.name)}</h1><p class="sub" style="margin-top:4px">${S.me.sports}</p></div>
    <div class="stack"><div class="eyebrow">Your pass at ${club}</div><div class="card stack">${pass ? `<div class="between" style="align-items:center"><span><span class="strong" style="display:block">${pass.name}</span><span class="sub">${pass.valid}</span></span><span style="text-align:right" data-pass="${pass.id}" data-text="${st.text}"><span class="num">${pass.kind === "limit" ? `${st.used}<span class="sub" style="font-weight:400"> / ${st.max}</span>` : pass.kind === "unlimited" ? "All" : st.left}</span><span class="sub" style="display:block">${pass.kind === "limit" ? "used in " + MOL[now().getMonth()] : pass.kind === "unlimited" ? "group sessions" : "credits left"}</span></span></div>${ticketOf(S.org) && passState(ticketOf(S.org)).left > 0 ? `<p class="sub" id="tickets">${ticketOf(S.org).name}: ${passState(ticketOf(S.org)).text}.</p>` : ""}` : ""}
      ${prod ? `<button class="btn full" data-a="buy">Buy ${prod.name} · ${chf(prod.price)}</button>` : ""}
      ${pass ? `<details><summary>${pass.kind === "credits" ? "Credit history" : "Pass history"}</summary><div class="scroll" tabindex="0" role="region" aria-label="Pass history"><table><tbody>${S.ledger.filter((l) => l.pass === pass.id).map((l) => `<tr><td class="mono">${fDay(l.at)}</td><td>${esc(l.reason)}</td><td class="mono strong">${l.delta > 0 ? "+" : ""}${l.delta}</td></tr>`).join("")}</tbody></table></div></details>` : ""}</div></div>
    ${inv.length ? `<div class="stack" id="invoices"><div class="eyebrow">Invoices</div><div class="card rows">${inv.map((i) => `<div class="row"><span class="mid"><span class="strong">${chf(i.amount)}</span><span class="sub">${esc(i.what)} · due ${fDay(i.due)}</span></span>${i.status === "paid" ? pill("Paid") : `<button class="btn sm" data-a="pay-inv" data-v="${i.id}">Pay</button>`}</div>`).join("")}</div></div>` : ""}
    <div class="stack"><div><div class="eyebrow">Privacy</div><p class="sub" style="margin-top:4px">What ${club} can see. Changes apply at once.</p></div><div class="card rows">${Object.entries(scopes).map(([k, [label, sub]]) => sw(S.consent[S.org][k], "consent", S.org + "|" + k, label, sub || "", k === "profile.basic")).join("")}</div></div>
    <div class="stack" id="memory"><div><div class="eyebrow">Coach memory</div><p class="sub" style="margin-top:4px">What your coach uses at ${club}. It is yours, and yours to delete.</p></div>${mem.length ? `<div class="card rows">${mem.map((m) => `<div class="row" data-mem="${m.org || "general"}"><span class="mid"><span>${esc(m.text)}</span><span class="sub">${esc(m.why)}</span><span><span class="tag">${esc(memoryLabel(m))}</span></span></span>${xBtn("forget", "Delete this memory: " + m.text, m.id)}</div>`).join("")}</div>` : `<p class="sub">Your coach remembers nothing here.</p>`}${hidden ? `<p class="sub">${hidden} more ${hidden === 1 ? "item belongs" : "items belong"} to your other clubs. Switch club to see or delete ${hidden === 1 ? "it" : "them"}; nothing from there is used here.</p>` : ""}</div>
    <button class="btn ghost full ${UI.resetArmed ? "on" : ""}" data-a="reset">${UI.resetArmed ? "Tap again to erase and start over" : "Reset demo"}</button></section>`;
}

/* ---------- coach (human) ---------- */
const shares = (k) => S.consent[S.org][k];
/* The coach sees the guardrail reason, but never more of the athlete's data than she shares with this club. */
const guardReasonForCoach = (r) => (r.kind === "pain" ? (shares("alerts.pain") ? r.text : `${S.me.name} has an open recovery signal that is not shared with this club.`) : shares("log.read") ? r.text : "Recent training load is above the limit (the log is not shared with this club).");
function vCoach() {
  const t = S.tab.coach;
  if (S.rosterSid && S.sessions[S.rosterSid]) {
    const s = S.sessions[S.rosterSid], rows = rosterRows(s), att = S.attendance[s.id] || {}, wait = rosterNames(s).queue;
    return `<section class="pad stack-l"><div><button class="btn sm ghost" style="padding-left:0" data-a="roster" data-v="" aria-label="Back to sessions">${I(P.back, 16)}Sessions</button><div class="eyebrow" style="margin-top:8px">${fDay(s.start)} · ${fTime(s.start)} · <span id="roster-count">${rows.length}</span> on the roster</div><h1 class="h1">${offOf(s).name}</h1></div>
      <div class="stack">${rows.length ? `<button class="btn acc full" data-a="all-present" data-v="${s.id}">Mark all present</button><div class="card rows" id="roster">${rows.map((r, i) => `<div class="row" data-row="${esc(r.name)}"><span class="mid"><span class="strong">${esc(r.name)}</span>${r.kind === "walkin" ? `<span class="sub">Walk-in</span>` : ""}</span><span class="btns">${["present", "late", "absent"].map((x) => `<button class="btn sm ${att[r.name] === x ? "on" : ""}" aria-pressed="${att[r.name] === x}" aria-label="${esc(r.name)}: ${x}" data-a="mark" data-v="${s.id}|${i}|${x}">${x[0].toUpperCase() + x.slice(1)}</button>`).join("")}</span></div>`).join("")}</div>` : `<p class="sub">Nobody is booked for this session.</p>`}
        <form class="stack" data-f="walkin" data-id="${s.id}" style="gap:8px"><label class="f">Add a walk-in<input id="walkin-name" placeholder="Name" autocomplete="off"></label><button class="btn full" type="submit">Add to roster</button></form>
        <p class="sub">${rows.filter((r) => r.kind === "booked").length} booked${rows.some((r) => r.kind === "walkin") ? ` and ${rows.filter((r) => r.kind === "walkin").length} walk-in` : ""}, capacity ${s.cap}. Only people with a confirmed booking or added here as a walk-in appear.</p>
        ${wait.length ? `<div class="stack" style="gap:8px"><div class="eyebrow">Waitlist · not on the roster</div><ol class="sub" id="roster-wait" style="padding-left:20px">${wait.map((n) => `<li>${esc(n)}</li>`).join("")}</ol></div>` : ""}</div></section>`;
  }
  if (t === "today") return vCoachToday();
  if (t === "athletes") return vCoachAthletes();
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
  return `<section class="pad stack-l"><h1 class="h1">Alerts</h1>${al.length ? `<div class="card rows">${al.map((a) => `<div class="row"><span class="mid"><span class="strong">${esc(a.kind)}</span><span class="sub">${S.me.name} · ${fDay(a.at)}</span></span>${a.status === "open" ? `<button class="btn sm" data-a="ack" data-v="${a.id}">Got it</button>` : `<span class="sub">Seen</span>`}</div>`).join("")}</div>` : texture(`<p class="h2">No alerts</p><p class="sub" style="margin-top:6px">Pain alerts appear only for athletes who share them.</p>`)}</section>`;
}

/* ---------- admin ---------- */
function vAdmin() {
  const t = S.tab.admin, o = ORGS[S.org], T = today(), up = sessList(S.org).filter((s) => s.start > now());
  const tile = (n, l) => `<div class="card"><div class="num">${n}</div><div class="sub" style="margin-top:6px">${l}</div></div>`;
  if (t === "dash") { const wk = up.filter((s) => s.start < addDays(T, 7)), fill = wk.reduce((n, s) => n + booked(s), 0) / Math.max(1, wk.reduce((n, s) => n + s.cap, 0)), open = S.invoices.filter((i) => i.org === S.org && i.status === "open"); return `<section class="pad stack-l"><div><div class="eyebrow">Admin · ${o.kind}</div><h1 class="h1">${o.name}</h1></div><div class="tiles">${tile(up.filter((s) => ymd(s.start) === ymd(T)).length, "Sessions left today")}${tile(Math.round(fill * 100) + "%", "Fill rate, next 7 days")}${tile(open.length, "Open invoices")}${tile(chf(S.invoices.filter((i) => i.org === S.org && i.status === "paid").reduce((n, i) => n + i.amount, 0) + (S.org === "studio" ? (S.ledger.filter((l) => l.kind === "grant").length - 1) * 290 : 0)), "Paid in test mode")}</div><div class="stack"><div class="eyebrow">Rules for this club</div><p>${policyText(S.org)}</p><div class="card rows">${sw(S.settings[S.org].waitlistMode === "offer", "wl-mode", S.org, `Offer freed spots with a ${S.settings[S.org].offerHoldMin / 60} h hold`, "On: the next person on the waitlist gets the spot held, then it moves on. Off: they are booked automatically.", false)}</div><p class="sub">Both clubs run on the same engine. Only this data differs.</p></div></section>`; }
  if (t === "sched") return `<section class="pad stack-l"><div><h1 class="h1">Schedule</h1><p class="sub" style="margin-top:4px">"Free a spot" simulates another member cancelling, so you can watch the waitlist move.</p></div><div class="card scroll" tabindex="0" role="region" aria-label="Upcoming sessions"><table><thead><tr><th>When</th><th>Session</th><th>Booked</th><th>Waiting</th><th><span class="sr">Action</span></th></tr></thead><tbody>${up.slice(0, 14).map((s) => `<tr><td class="mono">${fDay(s.start)} ${fTime(s.start)}</td><td class="strong">${offOf(s).name}</td><td class="mono">${booked(s)} / ${s.cap}</td><td class="mono">${waitTotal(s)}${s.held ? " · 1 held" : ""}</td><td><button class="btn sm" data-a="free" data-v="${s.id}" aria-label="Free a spot: ${offOf(s).name}, ${fDay(s.start)}">Free a spot</button></td></tr>`).join("")}</tbody></table></div></section>`;
  if (t === "members") { const pass = passOf(S.org); return `<section class="pad stack-l"><h1 class="h1">Members</h1><div class="card scroll" tabindex="0" role="region" aria-label="Members"><table><thead><tr><th>Name</th><th>Status</th><th>Pass</th></tr></thead><tbody><tr><td class="strong">${S.me.name}</td><td>Active</td><td>${passLine(pass)}</td></tr>${NAMES.slice(0, 12).map((n, i) => `<tr><td class="strong">${n}</td><td>${["Active", "Active", "Trial", "Active", "Paused"][i % 5]}</td><td>${o.products[i % o.products.length].name}</td></tr>`).join("")}</tbody></table></div>${pass.kind === "credits" ? `<form class="card stack" data-f="adjust"><p class="h2">Adjust ${S.me.name}'s credits</p><div class="two"><label class="f">Change (+ or −)<input id="adj-n" type="number" value="1"></label><label class="f">Reason (required)<input id="adj-r" placeholder="Class cancelled late"></label></div><button class="btn full" type="submit">Adjust credits</button></form>` : `<p class="sub">This pass has a monthly limit and no credits to adjust.</p>`}</section>`; }
  if (t === "products") return `<section class="pad stack-l"><h1 class="h1">Products</h1><div class="card rows">${o.products.map((p) => `<div class="row"><span class="mid"><span class="strong">${p.name}</span><span class="sub">${p.rule}</span></span><span class="mono strong">${chf(p.price)}</span></div>`).join("")}</div></section>`;
  const inv = S.invoices.filter((i) => i.org === S.org);
  return `<section class="pad stack-l"><h1 class="h1">Money</h1><div class="stack"><div class="eyebrow">Invoices</div>${inv.length ? `<div class="card rows">${inv.map((i) => `<div class="row"><span class="mid"><span class="strong">${chf(i.amount)} · ${S.me.name}</span><span class="sub">${i.id} · due ${fDay(i.due)}${i.status === "open" && i.due < T ? " · overdue" : ""}</span></span>${i.status === "paid" ? pill("Paid") : `<button class="btn sm" data-a="mark-paid" data-v="${i.id}">Mark paid</button>`}</div>`).join("")}</div>` : `<p class="sub">No invoices at this club.</p>`}</div><div class="stack"><div class="eyebrow">Audit log</div>${S.audit.length ? `<div class="card rows">${S.audit.map((a) => `<div class="row"><span class="mid"><span>${esc(a.what)}</span><span class="sub">${fDay(a.at)} ${fTime(a.at)} · Admin</span></span></div>`).join("")}</div>` : `<p class="sub">Overrides, credit changes and manual payments are recorded here.</p>`}</div></section>`;
}
