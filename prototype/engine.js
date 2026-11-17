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
    season: { name: "Winter season", end: new Date(2027, 2, 31) },
    single: { name: "Single session", price: 25 },
    upgrade: { name: "Regular season pass", price: 100, note: "Regular is CHF 400 for the season. Your drop-in pass (CHF 300) counts towards it, so the difference is CHF 100." },
    policy: { opensDays: 60, cancelMin: 120, lateCancel: "none", waitlist: true },
    offerings: [
      { id: "track", sport: "running", name: "Track session", days: [1, 4], time: [18, 30], dur: 90, cap: 30, loc: "Sportanlage Fronwald", coach: "Coach Sara", intensity: "high" },
      { id: "gym", sport: "gym", name: "Gym session", days: [2, 5], time: [18, 0], dur: 60, cap: 15, loc: "Balboa Underground", coach: "Coach Marco", intensity: "medium" },
      { id: "technique", sport: "running", name: "Technique session", days: [3], time: [18, 30], dur: 60, cap: 20, loc: "Sportanlage Fronwald", coach: "Coach Sara", intensity: "low" },
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
    season: { name: "Winter term", end: new Date(2027, 1, 28) },
    single: { name: "Drop-in", price: 33 },
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
/* The filter chips in Week: every offering belongs to one kind of training. */
const CAT = { track: "Running", technique: "Running", community: "Running", gym: "Strength", strength: "Strength", hiit: "HIIT", mobility: "Mobility", yoga: "Yoga", ride: "Cycling" };
const policyText = (org) => {
  const o = ORGS[org], set = S.settings[org], p = o.policy, out = [`Book up to ${p.opensDays} days ahead.`, `Free cancel until ${p.cancelMin / 60} h before.`];
  out.push(p.lateCancel === "forfeit" ? "Later than that, the credit is not returned." : "No penalty for late cancels.");
  if (p.maxDay) out.push(`Max ${p.maxWeek} bookings a week and ${p.maxDay} a day.`);
  out.push(set.waitlistMode === "offer" ? `Waitlist: a freed spot is held for the next person for ${set.offerHoldMin / 60} h, then offered on.` : "Waitlist: the next person is booked automatically.");
  return out.join(" ");
};
/* Made-up members. Each session's roster is a deterministic slice of this list. */
const NAMES = [];
for (const last of ["Brunner", "Meier", "Rossi", "Frei", "Sutter", "Aziz"]) for (const first of ["Jana", "Luca", "Sofia", "Noah", "Elin", "Tariq", "Mara", "Ben"]) NAMES.push(`${first} ${last}`);

/* ---------- state ---------- */
const STORE_KEY = "path-demo-v4", WEEKS = 4, PER = 12, LOAD_LIMIT = 1.1, CARD_TTL_MIN = 15;
let S;
/* Things that belong to the open screen, not to the demo's data. Never saved. */
const UI = { sheet: null, toast: "", undo: null, lineFrom: null, justDone: null, resetArmed: false };

function ensureSessions() {
  const T = today();
  for (const [oid, o] of Object.entries(ORGS)) for (const off of o.offerings) for (let i = -21; i <= 7 * WEEKS; i++) {
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
    v: 4, role: "athlete", org: "pau", tab: { athlete: "path", coach: "today", admin: "dash" }, banner: true, day: ymd(T), logTab: "log", rosterSid: null,
    me: { name: "Mia Keller", sports: "Running · Strength" },
    goal: { title: "Sub‑40 10K", date: new Date(2027, 4, 9), why: "Because I want to race the Zurich 10K with my club." },
    stages: ["Foundation", "Build", "Sharpen", "Test", "Recover"], stage: 1, stageSessions: 5,
    sessions: {}, bookings: [], waitlist: [], ledger: [], entries: [], pbs: [], chat: [], props: {}, audit: [], alerts: [], attendance: {}, walkins: {}, idem: {}, series: [],
    /* What a club admin can change. PAU books the next person automatically; Studio Demo offers the spot with a 2 h hold. */
    settings: { pau: { waitlistMode: "auto", offerHoldMin: 120 }, studio: { waitlistMode: "offer", offerHoldMin: 120 } },
    filter: { cat: "all", mine: false },
    /* Explore: open sessions from other clubs. `signups` is the member's own list. */
    signups: [], tryPlans: [], exploreBase: ymd(T), explore: { view: "grid", kind: "all", open: null, group: "all", free: false, beginners: false, near: false, pin: null },
    passes: [
      { id: "p-pau", org: "pau", name: "Drop-in season pass", kind: "limit", max: 4, covers: ["track", "gym"], valid: "Valid until 31 Mar 2027" },
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
    draftStatus: "pending_review", draftApproved: null, planNews: false, form: { rpe: 0, pain: false, title: "", dur: "" }, seq: 100,
  };
  ensureSessions();
  // Mia's history: 3 PAU drop-ins this calendar month, and a studio pack with 6 of 10 left. Every one of them is a ledger row.
  const paid = sessList("pau").filter((s) => !offOf(s).free && coveredByMe(s) && ym(s.start) === ym(T));
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
  S.form = newForm();
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
    if (!data || data.v !== 4 || !data.sessions) return false;
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
const spots = (s) => Math.max(0, s.cap - booked(s) - (s.held || 0)); // a spot held for a waitlist offer is not free
const deadline = (s) => new Date(s.start.getTime() - ORGS[s.org].policy.cancelMin * 60000);
const passOf = (org) => S.passes.find((p) => p.org === org && !p.single);
const ticketOf = (org) => S.passes.find((p) => p.org === org && p.single); // single sessions bought one at a time
const opensAt = (s) => addDays(sod(s.start), -ORGS[s.org].policy.opensDays);
const coveredByMe = (s) => { const p = passOf(s.org); return !!offOf(s).free || (!!p && (!p.covers || p.covers.includes(s.off))); };
const heldIn = (org) => S.bookings.filter((b) => HELD.includes(b.status) && S.sessions[b.sid].org === org);
const upcomingBookings = () => S.bookings.filter((b) => b.status === "confirmed").map((b) => ({ b, s: S.sessions[b.sid] })).filter((r) => r.s.start > now()).sort((a, c) => a.s.start - c.s.start);

/* THE pass balance. Path, Me, Coach, the session sheet and the admin list all call this and nothing else.
   It is computed from the ledger: a booking writes -1, a refunded cancel writes +1. */
function passState(pass, when = now()) {
  if (pass.kind === "unlimited") return { left: 1e9, text: "Unlimited group sessions" };
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
function check(s, opts = {}) {
  const o = ORGS[s.org], p = o.policy, off = offOf(s);
  if (s.cancelled) return err("CANCELLED", "The club cancelled this session.");
  if (s.start <= now()) return err("WINDOW_CLOSED", endOf(s) <= now() ? "This session is over. It can't be booked any more." : "This session has already started.");
  if (myBooking(s.id)) return err("ALREADY_BOOKED", "You are already booked for this session.");
  if (myWait(s.id) && !opts.ignoreWait) return err("ALREADY_BOOKED", "You are already on the waitlist for this session.");
  if (now() < opensAt(s)) return err("WINDOW_CLOSED", `Booking opens ${p.opensDays} days before. This one opens on ${fDay(opensAt(s))}.`);
  if (p.maxDay) {
    const sameDay = heldIn(s.org).filter((b) => ymd(S.sessions[b.sid].start) === ymd(s.start)).length;
    if (sameDay >= p.maxDay) return err("LIMIT_REACHED", `You already have ${sameDay} classes on ${fDay(s.start)}. The studio allows ${p.maxDay} a day.`);
    const wk = ymd(monday(s.start)), inWeek = heldIn(s.org).filter((b) => ymd(monday(S.sessions[b.sid].start)) === wk).length;
    if (inWeek >= p.maxWeek) return err("LIMIT_REACHED", `You already have ${inWeek} classes that week. The studio allows ${p.maxWeek} a week.`);
  }
  if (off.free) return { ok: true, pass: null, note: "Free session. No pass needed." };
  // From here on, only the pass can say no. Those refusals are marked `blocked`: they can be solved by buying something.
  const pass = passOf(s.org), ticket = ticketOf(s.org);
  let block = null;
  if (!pass) block = err("NO_VALID_PASS", "You have no pass for this club.");
  else if (pass.covers && !pass.covers.includes(off.id)) block = err("NO_VALID_PASS", `Your ${pass.name} covers ${pass.covers.map((id) => o.offerings.find((x) => x.id === id).name.toLowerCase() + "s").join(" and ")} only.`);
  else {
    const st = passState(pass, s.start);
    if (pass.kind === "limit" && st.left <= 0) { const nx = new Date(s.start.getFullYear(), s.start.getMonth() + 1, 1); block = err("LIMIT_REACHED", `You've used ${st.used} of ${st.max} drop-in sessions in ${MOL[s.start.getMonth()]}. Next one opens ${nx.getDate()} ${MOL[nx.getMonth()]}.`); }
    else if (pass.kind === "credits" && st.left <= 0) block = err("NO_VALID_PASS", `No credits left on your ${pass.name} pack.`);
    else return { ok: true, pass, note: `${pass.name}: ${st.text}.` };
  }
  if (ticket && passState(ticket).left > 0) return { ok: true, pass: ticket, note: `${ticket.name}: ${passState(ticket).text}.` };
  block.blocked = true;
  return block;
}
/* What the member can do right there when the pass says no: buy one session, upgrade, or (if the session is full) join the waitlist. */
function offersFor(s) {
  const w = myWait(s.id), held = !!(w && w.offer), c = check(s, { ignoreWait: held });
  if (c.ok || !c.blocked) return [];
  const o = ORGS[s.org], pass = passOf(s.org), full = spots(s) === 0 && !held, out = [], pack = o.products.find((x) => x.buy);
  if (full && o.policy.waitlist && !w) out.push({ kind: "waitlist", label: "Join waitlist" });
  if (!full && o.single) out.push({ kind: "dropin", label: `Buy 1 drop-in · ${chf(o.single.price)}`, what: `${o.single.name}: ${offOf(s).name}, ${fDay(s.start)}`, amount: o.single.price });
  if (o.upgrade && pass && pass.kind !== "unlimited") out.push({ kind: "upgrade", label: `Upgrade to Regular · ${chf(o.upgrade.price)}`, what: `Upgrade to ${o.upgrade.name}`, amount: o.upgrade.price, note: o.upgrade.note });
  if (!o.upgrade && pack) out.push({ kind: "pack", label: `Buy ${pack.name} · ${chf(pack.price)}`, what: pack.name, amount: pack.price });
  return out;
}
/* A test purchase. No money moves; the pass or the single-session credit is written to the ledger. */
function purchase(kind, org) {
  const o = ORGS[org], pass = passOf(org), pack = o.products.find((x) => x.buy);
  if (kind === "dropin") {
    let t = ticketOf(org); if (!t) { t = { id: `t-${org}`, org, name: o.single.name, kind: "credits", single: true }; S.passes.push(t); }
    S.ledger.push({ pass: t.id, delta: 1, kind: "grant", reason: `Bought 1 ${o.single.name.toLowerCase()}`, at: now() });
  } else if (kind === "upgrade") {
    S.ledger.push({ pass: pass.id, delta: 0, kind: "upgrade", reason: `Upgraded from ${pass.name} to ${o.upgrade.name}`, at: now() });
    pass.name = o.upgrade.name; pass.kind = "unlimited"; delete pass.max; delete pass.covers;
  } else if (kind === "pack") S.ledger.push({ pass: pass.id, delta: pack.buy, kind: "grant", reason: `Bought ${pack.name}`, at: now() });
}
/* Every state-changing call takes an idempotency key. The same key always returns the first result and changes nothing. */
function remember(key, r) { if (key) S.idem[key] = { ok: r.ok, status: r.status || null, code: r.code || null, msg: r.msg, bid: r.bid || null, blocked: !!r.blocked }; return r; }
function book(sid, source, key, opts = {}) {
  if (key && S.idem[key]) return S.idem[key];
  const s = S.sessions[sid]; if (!s) return remember(key, err("NOT_FOUND", "That session does not exist."));
  const c = check(s);
  if (!c.ok) {
    // Out of credits on a full session: the waitlist is still open if the member asks for it, because nothing is charged until a spot comes up.
    if (c.blocked && opts.wait && spots(s) === 0 && ORGS[s.org].policy.waitlist) return remember(key, joinWait(s, true));
    return remember(key, c);
  }
  if (spots(s) > 0) {
    const b = { id: S.seq++, sid, status: "confirmed", pass: c.pass ? c.pass.id : null, source, at: now() };
    S.bookings.push(b); if (c.pass) debit(c.pass, s, b);
    return remember(key, { ok: true, status: "confirmed", bid: b.id, msg: `Booked: ${offOf(s).name}, ${fDay(s.start)} ${fTime(s.start)}. Free cancel until ${fDay(deadline(s))} ${fTime(deadline(s))}.` });
  }
  if (!ORGS[s.org].policy.waitlist) return remember(key, err("SESSION_FULL", "This session is full."));
  return remember(key, joinWait(s, false));
}
/* `behind` stands for the people who join after the member: in a full class, one more does. */
function joinWait(s, blocked) {
  const pos = s.waitOthers + 1; S.waitlist.push({ sid: s.id, pos, behind: 1, at: now() });
  return { ok: true, status: "waitlisted", msg: `${offOf(s).name} is full. You are #${pos} on the waitlist. Nothing is charged until you get a spot.${blocked ? " Your pass is used up, so a spot would be held for you while you decide." : ""}` };
}
const waitTotal = (s) => { const w = myWait(s.id); return s.waitOthers + (w ? 1 + (w.behind || 0) : 0); };
function cancel(bid, key) {
  if (key && S.idem[key]) return S.idem[key];
  const b = S.bookings.find((x) => x.id === bid);
  if (!b || b.status !== "confirmed") return remember(key, err("NOT_FOUND", "That booking is not active any more."));
  if (S.sessions[b.sid].start <= now()) return remember(key, err("WINDOW_CLOSED", "That session has already started, so it can't be cancelled."));
  const s = S.sessions[b.sid], pass = S.passes.find((p) => p.id === b.pass), late = now() > deadline(s), forfeit = late && ORGS[s.org].policy.lateCancel === "forfeit";
  b.status = late ? "late_cancelled" : "cancelled";
  if (pass) S.ledger.push({ pass: pass.id, delta: forfeit ? 0 : 1, kind: forfeit ? "forfeit_late_cancel" : "refund_cancel", reason: `${forfeit ? "Late cancel" : "Cancelled"}: ${offOf(s).name}, ${fDay(s.start)}`, at: now(), period: ym(s.start), bid: b.id });
  const tail = forfeit ? " This was inside the cancel deadline, so the credit is not returned." : !pass ? "" : pass.kind === "credits" ? " Your credit is back." : ` It no longer counts towards ${MOL[s.start.getMonth()]}.`;
  return remember(key, { ok: true, status: b.status, bid: b.id, msg: `Cancelled: ${offOf(s).name}, ${fDay(s.start)}.${tail}` });
}
/* The member leaves the queue (or is taken out of it). Whoever joined behind her stays in it. */
function dropWait(s) {
  const w = myWait(s.id); if (!w) return null;
  S.waitlist = S.waitlist.filter((x) => x !== w); s.waitOthers += w.behind || 0;
  if (w.offer) s.held = 0;
  return w;
}
function leaveWait(sid) {
  const s = S.sessions[sid], w = dropWait(s);
  if (w && w.offer) passSpotOn(s, "The spot");
  return { ok: true, msg: "You left the waitlist." };
}
/* Somebody else cancels: the queue moves. */
function freeSpot(sid) {
  const s = S.sessions[sid]; if (s.others <= 0) return "Nobody else is booked.";
  s.left = (s.left || 0) + 1; s.others--;
  return passSpotOn(s, "A spot opened");
}
/* A free spot goes down the queue: people ahead of the member first, then the member.
   Auto mode books her through the same checks. Offer mode (a club setting) holds the spot for her for a set time. */
function passSpotOn(s, lead) {
  const w = myWait(s.id), set = S.settings[s.org];
  const short = lead === "It" || lead === "The spot"; // "It went to the next person." rather than "A spot opened and went to ..."
  if (s.waitOthers > 0) { s.waitOthers--; s.others++; if (w) w.pos = Math.max(1, w.pos - 1); return `${lead}${short ? "" : " and"} went to the next person on the waitlist.` + (w ? ` ${S.me.name} moved up to #${w.pos}.` : ""); }
  if (!w) return short ? `${lead} is open again for anyone to book.` : `${lead}.`;
  if (set.waitlistMode === "auto") {
    dropWait(s);
    const r = book(s.id, "waitlist");
    if (r.ok) return `${lead}. ${S.me.name} was promoted from the waitlist and booked.`;
    if (!r.blocked) return `${lead}, but ${S.me.name} could not be promoted: ${r.msg}`;
    S.waitlist.push(w); s.waitOthers -= w.behind || 0; // out of credits: hold the spot instead, so she can buy a drop-in or pass it on
  }
  w.pos = 1; w.offer = { expiresAt: new Date(now().getTime() + set.offerHoldMin * 60000) }; s.held = 1;
  S.chat.push({ who: "coach", text: `A spot opened in ${offOf(s).name}, ${fDay(s.start)} ${fTime(s.start)} at ${ORGS[s.org].name}. It is held for you until ${fTime(w.offer.expiresAt)}. After that it goes to the next person.`, opts: { sid: s.id } });
  return `${lead}. It is held for ${S.me.name} until ${fTime(w.offer.expiresAt)}, then it goes to the next person.`;
}
function acceptOffer(sid, key) {
  if (key && S.idem[key]) return S.idem[key];
  const s = S.sessions[sid], w = s && myWait(sid);
  if (!w || !w.offer || now() >= w.offer.expiresAt) return remember(key, err("OFFER_GONE", "That spot is no longer held for you."));
  dropWait(s);
  const r = book(sid, "waitlist_offer");
  if (!r.ok) { S.waitlist.push(w); s.waitOthers -= w.behind || 0; s.held = 1; } // still hers until it runs out
  return remember(key, r);
}
function declineOffer(sid) {
  const s = S.sessions[sid], w = s && myWait(sid); if (!w || !w.offer) return err("OFFER_GONE", "That spot is no longer held for you.");
  dropWait(s);
  return { ok: true, msg: `You passed on the spot. ${passSpotOn(s, "It")}` };
}
/* A held spot that nobody takes in time moves on. */
function sweepOffers() {
  let changed = false;
  for (const w of [...S.waitlist]) {
    const s = S.sessions[w.sid];
    if (!w.offer || (now() < w.offer.expiresAt && s.start > now())) continue;
    const at = fTime(w.offer.expiresAt); dropWait(s);
    S.chat.push({ who: "coach", text: `The spot held for you in ${offOf(s).name}, ${fDay(s.start)}, ran out at ${at}. ${passSpotOn(s, "It")} You are no longer on that waitlist.` });
    changed = true;
  }
  return changed;
}

/* ---------- recurring holds: "book every Thursday 18:30 this season" ---------- */
const seriesOff = (se) => ORGS[se.org].offerings.find((o) => o.id === se.off);
const seriesLabel = (se) => `Every ${WDL[se.weekday]} ${pad(se.hh)}:${pad(se.mm)}`;
const findSeries = (org, off, weekday) => S.series.find((x) => x.org === org && x.off === off && x.weekday === weekday);
const seriesSessions = (se) => sessList(se.org).filter((s) => s.off === se.off && s.start.getDay() === se.weekday && s.start > now() && s.start < addDays(sod(se.until), 1));
function clashWith(s) {
  const r = S.bookings.map((b) => ({ b, o: S.sessions[b.sid] })).find(({ b, o }) => b.status === "confirmed" && o.id !== s.id && o.start < endOf(s) && endOf(o) > s.start);
  return r ? r.o : null;
}
/* One date of a series, through the same booking function as everything else. */
function seriesTry(se, s) {
  if (myBooking(s.id)) return { status: "kept", text: "Already booked" };
  if (myWait(s.id)) return { status: "kept", text: "Already on the waitlist" };
  if (now() < opensAt(s)) return { status: "opens", text: `Books itself when booking opens on ${fDay(opensAt(s))}` };
  const clash = clashWith(s); if (clash) return { status: "skipped", text: `Clashes with ${offOf(clash).name} at ${fTime(clash.start)}` };
  const r = book(s.id, "series", `series-${se.id}:${s.id}`);
  if (!r.ok) return { status: "skipped", text: r.msg };
  if (r.bid) S.bookings.find((b) => b.id === r.bid).series = se.id;
  return r.status === "confirmed" ? { status: "booked", text: "Booked" } : { status: "waitlisted", text: "Full, so you are on the waitlist" };
}
/* Books every date that has opened and has not been handled yet. A skipped date stays skipped, so the report stays true. */
function runSeries() {
  let changed = false;
  for (const se of S.series) {
    if (se.paused) continue;
    for (const s of seriesSessions(se)) {
      const d = se.done[s.id]; if (d && d.status !== "opens") continue;
      const r = seriesTry(se, s); if (!d || d.status !== r.status) changed = true;
      se.done[s.id] = r;
    }
  }
  return changed;
}
function seriesRows(se) {
  return seriesSessions(se).map((s) => {
    const d = se.done[s.id] || { status: "paused", text: "Not booked while paused" };
    const gone = (d.status === "booked" && !myBooking(s.id)) || (d.status === "waitlisted" && !myBooking(s.id) && !myWait(s.id));
    return { sid: s.id, date: s.start, ...(gone ? { status: "cancelled", text: "Cancelled by you" } : d) };
  });
}
function seriesSummary(se) {
  const rows = seriesRows(se), n = (st) => rows.filter((r) => r.status === st).length, parts = [];
  if (n("booked") + n("kept")) parts.push(`${n("booked") + n("kept")} booked`);
  if (n("waitlisted")) parts.push(`${n("waitlisted")} on the waitlist`);
  if (n("skipped")) parts.push(`${n("skipped")} skipped`);
  if (n("opens")) parts.push(`${n("opens")} waiting to open`);
  if (n("cancelled")) parts.push(`${n("cancelled")} cancelled by you`);
  return parts.join(", ") || "No dates in the schedule yet";
}
function createSeries(org, off, weekday, source) {
  const o = ORGS[org].offerings.find((x) => x.id === off);
  if (!o || !o.days.includes(weekday)) return null;
  let se = findSeries(org, off, weekday);
  if (se) se.paused = false;
  else { se = { id: S.seq++, org, off, weekday, hh: o.time[0], mm: o.time[1], until: ORGS[org].season.end, paused: false, source, at: now(), done: {} }; S.series.push(se); }
  runSeries();
  return se;
}
/* What starting a series would do, date by date, worked out on a copy of the state so nothing is booked. */
function previewSeries(org, off, weekday) {
  const keep = S; S = structuredClone(S);
  try { const se = createSeries(org, off, weekday, "preview"); return se ? seriesRows(se) : []; } finally { S = keep; }
}
/* One tap. Pausing books nothing new and keeps what is booked; resuming tries the skipped dates again. */
function pauseSeries(id, paused) {
  const se = S.series.find((x) => x.id === id); if (!se) return err("NOT_FOUND", "That series no longer exists.");
  se.paused = paused === undefined ? !se.paused : !!paused;
  if (!se.paused) { for (const k of Object.keys(se.done)) if (se.done[k].status === "skipped") delete se.done[k]; runSeries(); }
  return { ok: true, msg: se.paused ? `${seriesLabel(se)} is paused. Your existing bookings stay.` : `${seriesLabel(se)} is on again. ${seriesSummary(se)}.` };
}
function endSeries(id) { const se = S.series.find((x) => x.id === id); S.series = S.series.filter((x) => x.id !== id); return { ok: true, msg: se ? `${seriesLabel(se)} ended. Your existing bookings stay.` : "Ended." }; }

/* ---------- roster: confirmed bookings of that session, plus explicit walk-ins. Nothing else. ---------- */
function rosterNames(s) {
  const off = Math.floor(hash(s.id + "n") * NAMES.length), base = NAMES.slice(off).concat(NAMES.slice(0, off)), left = (s.left || 0) % NAMES.length;
  const w = myWait(s.id), ahead = base.slice(left + s.others, left + s.others + s.waitOthers), behind = w ? base.slice(left + s.others + s.waitOthers, left + s.others + s.waitOthers + (w.behind || 0)) : [];
  return { booked: base.slice(left, left + s.others), waiting: ahead, queue: w ? [...ahead, S.me.name, ...behind] : ahead };
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

/* ---------- the log form ---------- */
/* The booked or attended session that ended most recently (within two days) and has no entry yet. */
function toLog() {
  return S.bookings.map((b) => ({ b, s: S.sessions[b.sid] })).filter((r) => HELD.includes(r.b.status) && endOf(r.s) <= now() && endOf(r.s) > addDays(now(), -2) && !S.entries.some((e) => e.sid === r.s.id)).sort((a, c) => c.s.start - a.s.start)[0] || null;
}
/* A fresh form is filled from that session, or from the one asked for. With no session it is empty, and it stays empty: nothing is ever filled in behind the member's back. */
function newForm(sid) {
  const r = sid ? { s: S.sessions[sid] } : toLog();
  return r ? { rpe: 0, pain: false, sid: r.s.id, title: offOf(r.s).name, dur: String(offOf(r.s).dur), pristine: true } : { rpe: 0, pain: false, title: "", dur: "", pristine: true };
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
    { wd: 1, from: "Track session", to: "Track session, 6 × 400 m", intensity: "high", load: 0 },
    { wd: 4, from: "Track session", to: "5 × 1 km at 10K pace", intensity: "high", load: 1 },
    { wd: 0, from: "Long run 75 min", to: "Long run 85 min", intensity: "medium", load: 1 },
    { wd: 3, from: "Rest day", to: "Rest day", intensity: "none", load: 0 },
  ],
};
/* A plan day that may no longer be changed: it is in the past, its session has started, or it was attended or logged.
   Every plan change (a coach-approved draft, the easy week, "make today easy") asks this first. */
function planLocked(it) {
  if (it.date < ymd(today())) return "it is in the past";
  if (it.kind === "club") {
    const s = S.sessions[`pau-${it.off}-${it.date}`];
    if (s && s.start <= now()) return "the session has already started";
    const b = s && myBooking(s.id);
    if (b && b.status === "attended") return "you already attended it";
    if (s && S.entries.some((e) => e.sid === s.id)) return "you already logged it";
  } else if (it.kind === "workout" && S.entries.some((e) => ymd(e.at) === it.date && e.title.split(" ")[0] === it.title.split(" ")[0])) return "you already logged it";
  return "";
}
/* The first date for a weekday that a plan change may still touch: today if nothing has happened yet, otherwise next week. */
function nextChangeable(wd) {
  for (let i = 0; i < 14; i++) {
    const d = addDays(today(), i); if (d.getDay() !== wd) continue;
    const it = S.plan.items.find((x) => x.date === ymd(d));
    if (!it || !planLocked(it)) return d;
  }
  return addDays(today(), 14);
}
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
    const date = nextChangeable(it.wd), dated = { ...it, date, day: fDay(date) };
    if (!g.active || (it.intensity !== "high" && it.load <= 0)) return { ...dated, changed: false };
    const to = it.intensity === "high" ? "Easy 30 min @ RPE 3" : it.from.replace(/(\d+) min/, (m, n) => `${Math.round((n * 0.8) / 5) * 5} min`) + " @ RPE 4";
    return { ...dated, was: it.to, to, intensity: "low", load: -1, changed: true };
  });
  return { title: raw.title, rationale: g.active ? "Changed before anyone saw it: with these signals a plan may only reduce load." : raw.rationale, items, guard: g.active ? g : null };
}
const currentDraft = () => (S.draftStatus === "approved" && S.draftApproved ? S.draftApproved : guardDraft(RAW_DRAFT));
/* The athlete accepts the approved plan. Locked days are checked again here and left exactly as they were. */
function applyDraft(d) {
  let applied = 0, skipped = 0;
  for (const it of d.items) {
    if (it.from === it.to) continue;
    const pi = S.plan.items.find((x) => x.date === ymd(it.date)); if (!pi) continue;
    if (planLocked(pi)) { skipped++; continue; }
    pi.title = it.to; pi.status = "planned"; applied++;
    if (!/^(Track|Gym) session/.test(it.to)) { pi.kind = /rest/i.test(it.to) ? "rest" : "workout"; pi.off = null; }
  }
  S.plan.title = d.title;
  return { applied, skipped };
}

/* ---------- the rule-based next step ---------- */
function nextStep() {
  const st = stats(), T = today(), over = S.invoices.find((i) => i.status === "open" && i.due < T);
  const held = S.waitlist.find((w) => w.offer);
  if (held) { const s = S.sessions[held.sid], can = check(s, { ignoreWait: true }).ok; return { kind: "offer", title: `A spot is held for you: ${offOf(s).name}`, meta: `${fDay(s.start)} ${fTime(s.start)} · ${ORGS[s.org].name} · held until ${fTime(held.offer.expiresAt)}`, cta: can ? "Take the spot" : "See your options", a: can ? "offer-accept" : "sheet", v: s.id, reason: "You were next on the waitlist and a spot opened. It is yours until the hold runs out, then it goes to the next person.", factors: [`Held until ${fDay(held.offer.expiresAt)} ${fTime(held.offer.expiresAt)}`, can ? "Nothing is charged until you take it" : "Your pass is used up, so taking it needs a drop-in or an upgrade"] }; }
  const done = toLog();
  if (done) return { kind: "log", title: "How did it go?", meta: `${offOf(done.s).name}, ${fDay(done.s.start)} ${fTime(done.s.start)}`, cta: "Log it", a: "logit", v: done.s.id, reason: "Your session is over and you have not logged how it felt. It takes one tap.", factors: ["Your coach learns from how hard it felt", "Only the effort is needed; everything else is already filled in"] };
  if (over) return { kind: "pay", title: "Pay your invoice", meta: `${chf(over.amount)} · ${over.what} · due ${fDay(over.due)}`, cta: "Open invoice", a: "go-invoices", reason: "An invoice is past its due date.", factors: [`Invoice ${over.id} was due ${fDay(over.due)}`, "No fees are added"] };
  if (S.planNews) { const d = currentDraft(); return { kind: "plan", title: "Your coach approved your plan", meta: `${d.title} · approved by Coach Sara`, cta: "Review plan", a: "review-plan", reason: "Your coach approved a new plan for your next stage.", factors: d.items.map((i) => `${i.day}: ${i.to}`) }; }
  if (st.pain) return { kind: "recover", title: "Recover today", meta: `You flagged pain (${esc(st.pain.painWhere)}, level ${st.pain.painLevel})`, cta: "Pain is gone, clear the flag", a: "clear-pain", reason: "You flagged pain, so intensity is paused until you or your coach clear it. If it persists or gets worse, see a doctor or physio.", factors: ["Pain flag logged " + fDay(st.pain.at), "No hard sessions are suggested while the flag is open"] };
  if (st.hard >= 2) return { kind: "recover", title: "Recover today", meta: `RPE was 9 or higher ${st.hard} times this week`, cta: "Log an easy day", a: "tab", v: "log", reason: "Two very hard sessions in a week need an easy day before the next one.", factors: [`${st.hard} sessions at RPE 9+ in the last 7 days`, `Your last 7 days are at ${Math.round(st.ratio * 100)}% of your 4-week average`] };
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
