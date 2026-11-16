"use strict";
/* PATH clickable demo, part 1 of 4: the engine. State, rules and persistence. No DOM in here. */

/* ---------- helpers ---------- */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const pad = (n) => String(n).padStart(2, "0");
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WDL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MOL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const now = () => new Date();
const sod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const today = () => sod(now());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ym = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const fDay = (d) => `${WD[d.getDay()]} ${d.getDate()} ${MO[d.getMonth()]}`;
const fTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const chf = (n) => "CHF " + Number(n).toLocaleString("en-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const monday = (d) => addDays(sod(d), -((d.getDay() + 6) % 7));
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000; };
const err = (code, msg) => ({ ok: false, code, msg });

/* ---------- clubs: configured purely by data ---------- */
const ORGS = {
  pau: {
    name: "PAU Trackrunning", kind: "Athletics club",
    policy: { opensDays: 60, cancelMin: 120, lateCancel: "none", waitlist: true },
    offerings: [
      { id: "track", sport: "running", name: "Track session", days: [1, 4], time: [18, 30], dur: 90, cap: 30, loc: "Sportanlage Fronwald", coach: "Coach Sara", intensity: "high" },
      { id: "gym", sport: "gym", name: "Gym session", days: [2, 5], time: [18, 0], dur: 60, cap: 15, loc: "Balboa Underground", coach: "Coach Jonas", intensity: "medium" },
      { id: "community", sport: "running", name: "Saturday community session", days: [6], time: [10, 0], dur: 75, cap: 40, loc: "Sportanlage Fronwald", coach: "Open to everyone", intensity: "low", free: true },
    ],
    products: [
      { name: "Performance season pass", price: 600, rule: "Unlimited group sessions, valid for the season." },
      { name: "Regular season pass", price: 400, rule: "Unlimited group sessions, valid for the season." },
      { name: "Drop-in season pass", price: 300, rule: "Track and Gym sessions, max 4 per calendar month, valid for the season." },
      { name: "Free trial", price: 0, rule: "All group sessions for 7 days from the first booking. Once per person." },
      { name: "PT 10-pack", price: 900, rule: "10 personal training sessions of 90 minutes." },
    ],
  },
  studio: {
    name: "Studio Demo", kind: "Boutique studio",
    policy: { opensDays: 6, cancelMin: 240, lateCancel: "forfeit", waitlist: true, maxDay: 2, maxWeek: 7 },
    offerings: [
      { id: "strength", sport: "gym", name: "Strength", days: [1, 2, 3, 4, 5], time: [7, 0], dur: 50, cap: 14, loc: "Studio One", coach: "Lena", intensity: "high" },
      { id: "hiit", sport: "crossfit", name: "HIIT", days: [1, 2, 3, 4, 5, 0], time: [12, 15], dur: 45, cap: 16, loc: "Studio One", coach: "Marco", intensity: "high" },
      { id: "mobility", sport: "pilates", name: "Mobility", days: [1, 3, 5], time: [17, 30], dur: 45, cap: 12, loc: "Studio Two", coach: "Aylin", intensity: "low" },
      { id: "yoga", sport: "yoga", name: "Yoga flow", days: [2, 4, 0, 6], time: [18, 45], dur: 60, cap: 20, loc: "Studio Two", coach: "Noor", intensity: "low" },
      { id: "ride", sport: "cycling", name: "Ride", days: [1, 2, 3, 4], time: [19, 0], dur: 45, cap: 18, loc: "Studio One", coach: "Tim", intensity: "high" },
    ],
    products: [
      { name: "Drop-in", price: 33, rule: "1 class." },
      { name: "Starter 7 classes", price: 77, rule: "7 classes, valid 30 days. Once per person." },
      { name: "10 classes", price: 290, rule: "10 classes.", buy: 10 },
      { name: "50 classes", price: 1250, rule: "50 classes." },
      { name: "Monthly 15 classes", price: 240, rule: "15 classes a month." },
    ],
  },
};
const policyText = (o) => {
  const p = o.policy, out = [`Book up to ${p.opensDays} days ahead.`, `Free cancel until ${p.cancelMin / 60} h before.`];
  out.push(p.lateCancel === "forfeit" ? "Later than that, the credit is not returned." : "No penalty for late cancels.");
  if (p.maxDay) out.push(`Max ${p.maxWeek} bookings a week and ${p.maxDay} a day.`);
  return out.join(" ");
};
/* Made-up members. Each session's roster is a deterministic slice of this list. */
const NAMES = [];
for (const last of ["Brunner", "Meier", "Rossi", "Frei", "Sutter", "Aziz"]) for (const first of ["Jana", "Luca", "Sofia", "Noah", "Elin", "Tariq", "Mara", "Ben"]) NAMES.push(`${first} ${last}`);

/* ---------- state ---------- */
const STORE_KEY = "path-demo-v2", PER = 12, LOAD_LIMIT = 1.1, CARD_TTL_MIN = 15;
let S;
/* Things that belong to the open screen, not to the demo's data. Never saved. */
const UI = { sheet: null, toast: "", lineFrom: null, justDone: null, resetArmed: false };

function ensureSessions() {
  const T = today();
  for (const [oid, o] of Object.entries(ORGS)) for (const off of o.offerings) for (let i = -21; i <= 27; i++) {
    const d = addDays(T, i); if (!off.days.includes(d.getDay())) continue;
    const id = `${oid}-${off.id}-${ymd(d)}`; if (S.sessions[id]) continue;
    const h = hash(id), h2 = hash(id + "w");
    let others = oid === "pau" ? (off.id === "track" ? 17 + Math.floor(h * 10) : off.id === "gym" ? 11 + Math.floor(h * 5) : 12 + Math.floor(h * 15)) : Math.min(off.cap, Math.floor(off.cap * (0.55 + h * 0.5)));
    others = Math.min(others, off.cap);
    S.sessions[id] = { id, org: oid, off: off.id, start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), off.time[0], off.time[1]), cap: off.cap, others, waitOthers: others >= off.cap ? 1 + Math.floor(h2 * 3) : 0, left: 0 };
  }
}
function seed() {
  const T = today();
  S = {
    v: 2, role: "athlete", org: "pau", tab: { athlete: "path", coach: "today", admin: "dash" }, banner: true, day: ymd(T), logTab: "log", rosterSid: null,
    me: { name: "Mia Keller", sports: "Running · Strength" },
    goal: { title: "Sub‑40 10K", date: new Date(2027, 4, 9), why: "Because I want to race the Zurich 10K with my club." },
    stages: ["Foundation", "Build", "Sharpen", "Test", "Recover"], stage: 1, stageSessions: 5,
    sessions: {}, bookings: [], waitlist: [], ledger: [], entries: [], pbs: [], chat: [], props: {}, audit: [], alerts: [], attendance: {}, walkins: {}, idem: {},
    passes: [
      { id: "p-pau", org: "pau", name: "Drop-in season pass", kind: "limit", max: 4, valid: "Valid until 31 Mar 2027" },
      { id: "p-studio", org: "studio", name: "10 classes", kind: "credits", valid: "No expiry in this demo" },
    ],
    invoices: [{ id: "PAU-2026-0042", org: "pau", what: "Drop-in season pass, winter season", amount: 300, due: addDays(T, 9), status: "open" }],
    consent: { pau: { "profile.basic": true, "path.read": true, "log.read": true, "log.comment": true, "plan.write": true, "alerts.pain": false }, studio: { "profile.basic": true, "path.read": false, "log.read": false, "log.comment": false, "plan.write": false, "alerts.pain": false } },
    /* The memory is the person's, but every item says which club it came from (null = general). */
    memory: [
      { id: 1, org: "pau", text: "Usually trains Thursday track at 18:30.", why: "Based on 6 Thursday sessions since October." },
      { id: 2, org: null, text: "Handles about 1,700 load a week comfortably.", why: "Based on your last 4 weeks of logged sessions." },
      { id: 3, org: null, text: "Prefers easy runs in the morning.", why: "You said so on 2 November." },
      { id: 4, org: "studio", text: "Likes the Tuesday yoga flow with Noor.", why: "Based on 3 Tuesday classes in October." },
    ],
    /* Output of the pattern job: which session the person usually does on which weekday. */
    patterns: [
      { org: "pau", off: "track", weekday: 4, count: 6 }, { org: "pau", off: "gym", weekday: 2, count: 4 }, { org: "pau", off: "track", weekday: 1, count: 3 },
      { org: "pau", off: "gym", weekday: 5, count: 3 }, { org: "pau", off: "community", weekday: 6, count: 2 }, { org: "studio", off: "yoga", weekday: 2, count: 3 },
    ],
    plan: { title: "Build block", by: "Coach Sara", items: [] },
    draftStatus: "pending_review", draftApproved: null, planNews: false, form: { rpe: 0, pain: false }, seq: 100,
  };
  ensureSessions();
  // Mia's history: 3 PAU drop-ins this calendar month, and a studio pack with 6 of 10 left. Every one of them is a ledger row.
  const paid = sessList("pau").filter((s) => !offOf(s).free && ym(s.start) === ym(T));
  const past = paid.filter((s) => s.start < now()).slice(-3), fut = paid.filter((s) => s.start > now() && s.off === "gym");
  for (const s of [...past, ...fut.slice(0, 3 - past.length)]) {
    s.others = Math.min(s.others, s.cap - 1);
    const b = { id: S.seq++, sid: s.id, status: s.start < now() ? "attended" : "confirmed", pass: "p-pau", source: "app", at: addDays(s.start, -2) };
    S.bookings.push(b); debit(passOf("pau"), s, b);
    if (b.status === "attended") (S.attendance[s.id] = {})[S.me.name] = "present";
  }
  S.ledger.push({ pass: "p-studio", delta: 10, kind: "grant", reason: "Bought 10 classes", at: addDays(T, -20) });
  for (let i = 0; i < 3; i++) S.ledger.push({ pass: "p-studio", delta: -1, kind: "debit_booking", reason: "Class attended", at: addDays(T, -14 + i * 4) });
  const yoga = sessList("studio").find((s) => s.off === "yoga" && s.start > addDays(now(), 1) && s.others < s.cap);
  if (yoga) book(yoga.id, "app");
  // training log: 10 weeks
  const kinds = [["Track session", 90, 8], ["Easy run", 40, 4], ["Gym session", 60, 6], ["Long run", 75, 5]];
  for (let w = 10; w >= 1; w--) for (let k = 0; k < 4; k++) {
    if (k === 2 && w % 3 === 0) continue;
    const d = addDays(monday(T), -7 * w + [0, 1, 3, 6][k]); if (d >= T) continue;
    const [title, dur, rpe] = kinds[k], bump = (10 - w) * 2;
    S.entries.push({ id: S.seq++, at: d, title, dur: dur + (k === 3 ? bump : 0), rpe: Math.min(10, rpe + (hash(ymd(d)) > 0.8 ? 1 : 0)), notes: "", comments: [] });
  }
  for (let i = 1; i <= 2; i++) { const d = addDays(T, -i - 1); S.entries.push({ id: S.seq++, at: d, title: i === 1 ? "Easy run" : "Track session", dur: i === 1 ? 40 : 90, rpe: i === 1 ? 4 : 8, notes: "", comments: [] }); }
  S.entries.sort((a, b) => b.at - a.at);
  S.entries[1].comments.push({ by: "Coach Sara", text: "Strong last two reps. Keep the first lap calmer next time." });
  S.pbs = [{ metric: "400 m", value: 63.2, unit: "s", better: "lower", at: addDays(T, -23) }, { metric: "5K", value: 20.4, unit: "min", better: "lower", at: addDays(T, -44) }, { metric: "Squat 1RM", value: 82.5, unit: "kg", better: "higher", at: addDays(T, -31) }];
  const tpl = { 1: ["club", "Track session", "track"], 2: ["workout", "Easy run 40 min @ RPE 4"], 3: ["rest", "Rest day"], 4: ["club", "Track session", "track"], 5: ["club", "Gym session", "gym"], 6: ["club", "Saturday community session", "community"], 0: ["workout", "Long run 75 min @ RPE 5"] };
  for (let i = 0; i < 14; i++) { const d = addDays(monday(T), i), t = tpl[d.getDay()]; S.plan.items.push({ date: ymd(d), kind: t[0], title: t[1], off: t[2] || null, status: "planned" }); }
  S.chat = [{ who: "coach", text: "Hi Mia. I can book or cancel sessions, look at your week, ease your plan or tell you how you are doing. I always ask before I change anything." }];
}

/* ---------- persistence: the demo survives a reload; "Reset demo" starts over ---------- */
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S, function (k, v) { return this[k] instanceof Date ? { $d: this[k].getTime() } : v; })); } catch (e) { /* storage unavailable: the demo still works, it just won't persist */ }
}
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY); if (!raw) return false;
    const data = JSON.parse(raw, (k, v) => (v && typeof v === "object" && typeof v.$d === "number" ? new Date(v.$d) : v));
    if (!data || data.v !== 2 || !data.sessions) return false;
    S = data; ensureSessions();
    if (S.day < ymd(today())) S.day = ymd(today());
    return true;
  } catch (e) { return false; }
}
function resetDemo() { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ } seed(); save(); }

/* ---------- queries ---------- */
const sessList = (org) => Object.values(S.sessions).filter((s) => s.org === org).sort((a, b) => a.start - b.start);
const offOf = (s) => ORGS[s.org].offerings.find((o) => o.id === s.off);
const endOf = (s) => new Date(s.start.getTime() + offOf(s).dur * 60000);
const HELD = ["confirmed", "attended", "no_show"];
const myBooking = (sid) => S.bookings.find((b) => b.sid === sid && HELD.includes(b.status));
const myWait = (sid) => S.waitlist.find((w) => w.sid === sid);
const booked = (s) => s.others + (myBooking(s.id) ? 1 : 0);
const spots = (s) => Math.max(0, s.cap - booked(s));
const deadline = (s) => new Date(s.start.getTime() - ORGS[s.org].policy.cancelMin * 60000);
const passOf = (org) => S.passes.find((p) => p.org === org);
const heldIn = (org) => S.bookings.filter((b) => HELD.includes(b.status) && S.sessions[b.sid].org === org);
const upcomingBookings = () => S.bookings.filter((b) => b.status === "confirmed").map((b) => ({ b, s: S.sessions[b.sid] })).filter((r) => r.s.start > now()).sort((a, c) => a.s.start - c.s.start);

/* THE pass balance. Path, Me, Coach, the session sheet and the admin list all call this and nothing else.
   It is computed from the ledger: a booking writes -1, a refunded cancel writes +1. */
function passState(pass, when = now()) {
  if (pass.kind === "limit") {
    const used = -S.ledger.filter((l) => l.pass === pass.id && l.period === ym(when)).reduce((n, l) => n + l.delta, 0);
    return { used, max: pass.max, left: pass.max - used, text: `${used} of ${pass.max} used in ${MOL[when.getMonth()]}` };
  }
  const left = S.ledger.filter((l) => l.pass === pass.id).reduce((n, l) => n + l.delta, 0);
  return { left, text: `${left} ${left === 1 ? "credit" : "credits"} left` };
}
function debit(pass, s, b) { S.ledger.push({ pass: pass.id, delta: -1, kind: "debit_booking", reason: `${offOf(s).name}, ${fDay(s.start)}`, at: now(), period: ym(s.start), bid: b.id }); }
/* A booking whose session is over and that nobody marked present counts as missed. */
function sweep() { for (const b of S.bookings) if (b.status === "confirmed" && endOf(S.sessions[b.sid]) <= now()) b.status = "no_show"; }
const pastLabel = (b, s) => (b.status === "attended" ? "Attended" : endOf(s) <= now() ? "Missed" : "In progress");

/* ---------- booking engine: one path for the app, the coach chat and the waitlist ---------- */
function check(s) {
  const o = ORGS[s.org], p = o.policy, off = offOf(s);
  if (s.cancelled) return err("CANCELLED", "The club cancelled this session.");
  if (s.start <= now()) return err("WINDOW_CLOSED", endOf(s) <= now() ? "This session is over. It can't be booked any more." : "This session has already started.");
  if (myBooking(s.id)) return err("ALREADY_BOOKED", "You are already booked for this session.");
  if (myWait(s.id)) return err("ALREADY_BOOKED", "You are already on the waitlist for this session.");
  const opens = addDays(sod(s.start), -p.opensDays);
  if (now() < opens) return err("WINDOW_CLOSED", `Booking opens ${p.opensDays} days before. This one opens on ${fDay(opens)}.`);
  if (p.maxDay) {
    const sameDay = heldIn(s.org).filter((b) => ymd(S.sessions[b.sid].start) === ymd(s.start)).length;
    if (sameDay >= p.maxDay) return err("LIMIT_REACHED", `You already have ${sameDay} classes on ${fDay(s.start)}. The studio allows ${p.maxDay} a day.`);
    const wk = ymd(monday(s.start)), inWeek = heldIn(s.org).filter((b) => ymd(monday(S.sessions[b.sid].start)) === wk).length;
    if (inWeek >= p.maxWeek) return err("LIMIT_REACHED", `You already have ${inWeek} classes that week. The studio allows ${p.maxWeek} a week.`);
  }
  if (off.free) return { ok: true, pass: null, note: "Free session. No pass needed." };
  const pass = passOf(s.org);
  if (!pass) return err("NO_VALID_PASS", "You have no pass for this club. Buy one under Me.");
  const st = passState(pass, s.start);
  if (pass.kind === "limit" && st.left <= 0) { const nx = new Date(s.start.getFullYear(), s.start.getMonth() + 1, 1); return err("LIMIT_REACHED", `You've used ${st.used} of ${st.max} drop-in sessions in ${MOL[s.start.getMonth()]}. Next one opens ${nx.getDate()} ${MOL[nx.getMonth()]}.`); }
  if (pass.kind === "credits" && st.left <= 0) return err("NO_VALID_PASS", `No credits left on your ${pass.name} pack. Buy a new pack under Me.`);
  return { ok: true, pass, note: `${pass.name}: ${st.text}.` };
}
/* Every state-changing call takes an idempotency key. The same key always returns the first result and changes nothing. */
function remember(key, r) { if (key) S.idem[key] = { ok: r.ok, status: r.status || null, code: r.code || null, msg: r.msg, bid: r.bid || null }; return r; }
function book(sid, source, key) {
  if (key && S.idem[key]) return S.idem[key];
  const s = S.sessions[sid]; if (!s) return remember(key, err("NOT_FOUND", "That session does not exist."));
  const c = check(s); if (!c.ok) return remember(key, c);
  if (spots(s) > 0) {
    const b = { id: S.seq++, sid, status: "confirmed", pass: c.pass ? c.pass.id : null, source, at: now() };
    S.bookings.push(b); if (c.pass) debit(c.pass, s, b);
    return remember(key, { ok: true, status: "confirmed", bid: b.id, msg: `Booked: ${offOf(s).name}, ${fDay(s.start)} ${fTime(s.start)}. Free cancel until ${fDay(deadline(s))} ${fTime(deadline(s))}.` });
  }
  if (!ORGS[s.org].policy.waitlist) return remember(key, err("SESSION_FULL", "This session is full."));
  const pos = s.waitOthers + 1; S.waitlist.push({ sid, pos });
  return remember(key, { ok: true, status: "waitlisted", msg: `${offOf(s).name} is full. You are #${pos} on the waitlist. Nothing is charged until you get a spot.` });
}
function cancel(bid, key) {
  if (key && S.idem[key]) return S.idem[key];
  const b = S.bookings.find((x) => x.id === bid);
  if (!b || b.status !== "confirmed") return remember(key, err("NOT_FOUND", "That booking is not active any more."));
  const s = S.sessions[b.sid], pass = S.passes.find((p) => p.id === b.pass), late = now() > deadline(s), forfeit = late && ORGS[s.org].policy.lateCancel === "forfeit";
  b.status = late ? "late_cancelled" : "cancelled";
  if (pass) S.ledger.push({ pass: pass.id, delta: forfeit ? 0 : 1, kind: forfeit ? "forfeit_late_cancel" : "refund_cancel", reason: `${forfeit ? "Late cancel" : "Cancelled"}: ${offOf(s).name}, ${fDay(s.start)}`, at: now(), period: ym(s.start), bid: b.id });
  const tail = forfeit ? " This was inside the cancel deadline, so the credit is not returned." : !pass ? "" : pass.kind === "credits" ? " Your credit is back." : ` It no longer counts towards ${MOL[s.start.getMonth()]}.`;
  return remember(key, { ok: true, status: b.status, bid: b.id, msg: `Cancelled: ${offOf(s).name}, ${fDay(s.start)}.${tail}` });
}
function leaveWait(sid) { S.waitlist = S.waitlist.filter((w) => w.sid !== sid); return { ok: true, msg: "You left the waitlist." }; }
/* Somebody else cancels: the queue moves, and the member is promoted through the same checks. */
function freeSpot(sid) {
  const s = S.sessions[sid]; if (s.others <= 0) return "Nobody else is booked.";
  const w = myWait(sid);
  s.left = (s.left || 0) + 1; s.others--;
  if (s.waitOthers > 0) { s.waitOthers--; s.others++; if (w) w.pos = Math.max(1, w.pos - 1); return "A spot opened and went to the next person on the waitlist." + (w ? ` ${S.me.name} moved up to #${w.pos}.` : ""); }
  if (w) { S.waitlist = S.waitlist.filter((x) => x.sid !== sid); const r = book(sid, "waitlist"); return r.ok ? `A spot opened. ${S.me.name} was promoted from the waitlist and booked.` : `A spot opened, but ${S.me.name} could not be promoted: ${r.msg}`; }
  return "A spot opened.";
}

/* ---------- roster: confirmed bookings of that session, plus explicit walk-ins. Nothing else. ---------- */
function rosterNames(s) {
  const off = Math.floor(hash(s.id + "n") * NAMES.length), base = NAMES.slice(off).concat(NAMES.slice(0, off)), left = (s.left || 0) % NAMES.length;
  return { booked: base.slice(left, left + s.others), waiting: base.slice(left + s.others, left + s.others + s.waitOthers) };
}
function rosterRows(s) {
  const rows = rosterNames(s).booked.map((name) => ({ name, kind: "booked" }));
  if (myBooking(s.id)) rows.push({ name: S.me.name, kind: "booked" });
  for (const name of S.walkins[s.id] || []) rows.push({ name, kind: "walkin" });
  return rows;
}
function addWalkin(sid, raw) {
  const name = String(raw || "").trim().replace(/\s+/g, " ");
  if (!name) return err("EMPTY", "Type the walk-in's name first.");
  if (rosterRows(S.sessions[sid]).some((r) => r.name.toLowerCase() === name.toLowerCase())) return err("DUPLICATE", `${name} is already on this roster.`);
  (S.walkins[sid] = S.walkins[sid] || []).push(name); (S.attendance[sid] = S.attendance[sid] || {})[name] = "present";
  return { ok: true, msg: `${name} added as a walk-in and marked present.` };
}
function markAttendance(sid, name, status) {
  (S.attendance[sid] = S.attendance[sid] || {})[name] = status;
  if (name !== S.me.name) return;
  const b = myBooking(sid); if (!b) return;
  b.status = status !== "absent" ? "attended" : endOf(S.sessions[sid]) <= now() ? "no_show" : "confirmed";
}

/* ---------- training analytics (deterministic) ---------- */
function weeklyLoad() {
  const out = [], T = today();
  for (let w = 9; w >= 0; w--) { const a = addDays(T, -7 * w - 6), b = addDays(a, 7); const es = S.entries.filter((e) => e.at >= a && e.at < b); out.push({ start: a, load: es.reduce((n, e) => n + e.dur * e.rpe, 0), count: es.length }); }
  return out;
}
const openPain = () => S.entries.find((e) => e.pain && !e.cleared && e.at >= addDays(today(), -4)) || null;
function stats() {
  const wl = weeklyLoad(), cur = wl[wl.length - 1], avg = wl.slice(-5, -1).reduce((n, w) => n + w.load, 0) / 4;
  return { wl, cur, avg, ratio: avg ? cur.load / avg : 0, hard: S.entries.filter((e) => e.at >= addDays(today(), -7) && e.rpe >= 9).length, pain: openPain() };
}

/* ---------- guardrails: enforced in code, BEFORE any plan draft is shown to anyone ---------- */
/* What the model proposed. It never reaches a screen in this form. */
const RAW_DRAFT = {
  title: "Sharpen block",
  rationale: "RPE on track sessions is falling, so the draft adds one race-pace session a week and a longer long run.",
  items: [
    { day: "Mon", from: "Track session", to: "Track session, 6 × 400 m", intensity: "high", load: 0 },
    { day: "Thu", from: "Track session", to: "5 × 1 km at 10K pace", intensity: "high", load: 1 },
    { day: "Sun", from: "Long run 75 min", to: "Long run 85 min", intensity: "medium", load: 1 },
    { day: "Wed", from: "Rest day", to: "Rest day", intensity: "none", load: 0 },
  ],
};
function guard() {
  const st = stats(), reasons = [];
  if (st.pain) reasons.push({ kind: "pain", text: `Pain flag from ${fDay(st.pain.at)} (${st.pain.painWhere}, level ${st.pain.painLevel}) is still open.` });
  if (st.ratio > LOAD_LIMIT) reasons.push({ kind: "load", text: `The last 7 days are at ${Math.round(st.ratio * 100)}% of the 4-week average. The limit is ${Math.round(LOAD_LIMIT * 100)}%.` });
  return { active: reasons.length > 0, reasons };
}
/* With an open pain flag or load above the limit, a draft may neither keep nor add intensity: every such item is replaced by something easier. */
function guardDraft(raw) {
  const g = guard();
  const items = raw.items.map((it) => {
    if (!g.active || (it.intensity !== "high" && it.load <= 0)) return { ...it, changed: false };
    const to = it.intensity === "high" ? "Easy 30 min @ RPE 3" : it.from.replace(/(\d+) min/, (m, n) => `${Math.round((n * 0.8) / 5) * 5} min`) + " @ RPE 4";
    return { ...it, was: it.to, to, intensity: "low", load: -1, changed: true };
  });
  return { title: raw.title, rationale: g.active ? "Changed before anyone saw it: with these signals a plan may only reduce load." : raw.rationale, items, guard: g.active ? g : null };
}
const currentDraft = () => (S.draftStatus === "approved" && S.draftApproved ? S.draftApproved : guardDraft(RAW_DRAFT));

/* ---------- the rule-based next step ---------- */
function nextStep() {
  const st = stats(), T = today(), over = S.invoices.find((i) => i.status === "open" && i.due < T);
  if (over) return { kind: "pay", title: "Pay your invoice", meta: `${chf(over.amount)} · ${over.what} · due ${fDay(over.due)}`, cta: "Open invoice", a: "go-invoices", reason: "An invoice is past its due date.", factors: [`Invoice ${over.id} was due ${fDay(over.due)}`, "No fees are added"] };
  if (S.planNews) { const d = currentDraft(); return { kind: "plan", title: "Your coach approved your plan", meta: `${d.title} · approved by Coach Sara`, cta: "Review plan", a: "review-plan", reason: "Your coach approved a new plan for your next stage.", factors: d.items.map((i) => `${i.day}: ${i.to}`) }; }
  if (st.pain) return { kind: "recover", title: "Recover today", meta: `You flagged pain (${esc(st.pain.painWhere)}, level ${st.pain.painLevel})`, cta: "Pain is gone, clear the flag", a: "clear-pain", reason: "You flagged pain, so intensity is paused until you or your coach clear it. If it persists or gets worse, see a doctor or physio.", factors: ["Pain flag logged " + fDay(st.pain.at), "No hard sessions are suggested while the flag is open"] };
  if (st.hard >= 2) return { kind: "recover", title: "Recover today", meta: `RPE was 9 or higher ${st.hard} times this week`, cta: "Log an easy day", a: "tab", v: "log", reason: "Two very hard sessions in a week need an easy day before the next one.", factors: [`${st.hard} sessions at RPE 9+ in the last 7 days`, `Your last 7 days are at ${Math.round(st.ratio * 100)}% of your 4-week average`] };
  const y = addDays(T, -1), yb = S.bookings.find((b) => HELD.includes(b.status) && ymd(S.sessions[b.sid].start) === ymd(y));
  if (yb && !S.entries.some((e) => ymd(e.at) === ymd(y))) return { kind: "log", title: "Log yesterday's session", meta: `${offOf(S.sessions[yb.sid]).name}, ${fDay(y)}`, cta: "Log it", a: "logit", v: yb.sid, reason: "You had a session yesterday and have not logged how it felt.", factors: ["Your coach learns from RPE and notes"] };
  for (const it of S.plan.items) {
    if (it.kind !== "club" || it.status !== "planned" || it.date < ymd(T)) continue;
    const s = S.sessions[`pau-${it.off}-${it.date}`]; if (!s || s.start <= now() || myBooking(s.id) || myWait(s.id)) continue;
    const c = check(s), full = spots(s) === 0;
    if (!c.ok) continue; // never suggest a step the rules would refuse
    const o = offOf(s);
    return { kind: "book", title: `Book ${o.name.includes(WDL[s.start.getDay()]) ? "the " + o.name.toLowerCase().replace("saturday", "Saturday") : WDL[s.start.getDay()] + " " + o.name.replace(" session", "").toLowerCase()}, ${fTime(s.start)}`, meta: `${full ? "Full, waitlist open" : spots(s) + " spots left"} · ${c.pass ? o.loc : "Free, no pass needed"}`, cta: full ? "Join waitlist" : "Book", a: "book", v: s.id, reason: "It is the next club session in your plan and you are not booked yet.", factors: [`In your plan: ${S.plan.title}, approved by ${S.plan.by}`, "You usually train " + WDL[s.start.getDay()] + "s", `${spots(s)} of ${s.cap} spots left`] };
  }
  const t = S.plan.items.find((i) => i.date === ymd(T));
  return { kind: "do", title: t ? "Today: " + t.title : "You are all set", meta: "Nothing to book right now", cta: "Log a session", a: "tab", v: "log", reason: "Your upcoming club sessions are booked.", factors: ["All plan sessions for the coming days are booked"] };
}
