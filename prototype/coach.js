"use strict";
/* PATH clickable demo, part 2 of 4: the scripted coach. It stands in for the AI: same rules, same engine,
   and it can only change something through a confirm card that the member has confirmed. */

/* ---------- reading the request: day, session, club ---------- */
const DAY_WORDS = [["sun(?:day)?", 0], ["mon(?:day)?", 1], ["tue(?:s|sday)?", 2], ["wed(?:nesday)?", 3], ["thu(?:r|rs|rsday)?", 4], ["fri(?:day)?", 5], ["sat(?:urday)?", 6]];
const MONTH_WORDS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const nearYear = (m, d) => { const T = today(), x = new Date(T.getFullYear(), m, d); return x < addDays(T, -30) ? new Date(T.getFullYear() + 1, m, d) : x; };
/* A weekday or a date in the request always wins over the default pattern. */
function parseWhen(text) {
  const t = text.toLowerCase(), T = today(), out = { date: null, weekday: null, range: null, label: "" };
  let m;
  if (/\btoday\b|\btonight\b/.test(t)) out.date = T;
  else if (/\btomorrow\b/.test(t)) out.date = addDays(T, 1);
  else if ((m = t.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\.?\\s+(${MONTH_WORDS.join("|")})[a-z]*`)))) out.date = nearYear(MONTH_WORDS.indexOf(m[2]), Number(m[1]));
  else if ((m = t.match(new RegExp(`\\b(${MONTH_WORDS.join("|")})[a-z]*\\s+(\\d{1,2})\\b`)))) out.date = nearYear(MONTH_WORDS.indexOf(m[1]), Number(m[2]));
  else if ((m = t.match(/\b(\d{1,2})\.(\d{1,2})\.?/)) && m[2] >= 1 && m[2] <= 12) out.date = nearYear(Number(m[2]) - 1, Number(m[1]));
  else for (const [re, wd] of DAY_WORDS) if (new RegExp(`\\b${re}s?\\b`).test(t)) { out.weekday = wd; break; }
  if (/\bnext week\b/.test(t)) out.range = [addDays(monday(T), 7), addDays(monday(T), 14)];
  else if (/\bthis week\b|\brest of the week\b/.test(t)) out.range = [T, addDays(monday(T), 7)];
  out.label = out.date ? fDay(out.date) : out.weekday != null ? WDL[out.weekday] : out.range ? (/\bnext week\b/.test(t) ? "next week" : "this week") : "";
  return out;
}
const OFFER_WORDS = [["track", /\btrack\b|\bintervals?\b/], ["gym", /\bgym\b/], ["community", /\bcommunity\b/], ["strength", /\bstrength\b/], ["hiit", /\bhiit\b/], ["mobility", /\bmobility\b/], ["yoga", /\byoga\b/], ["ride", /\bride\b|\bspin(ning)?\b/]];
/* Which club does the member name? "all" for "at all my clubs". Null when she names none: then the coach stays in the club she is in. */
function parseClub(text) {
  const t = text.toLowerCase();
  if (/all (my |the )?clubs|both clubs|everywhere/.test(t)) return "all";
  for (const [id, o] of Object.entries(ORGS)) if (t.includes(o.name.toLowerCase()) || new RegExp(`\\b${id}\\b`).test(t)) return id;
  return null;
}
/* Which session type is named? With a scope, only that club is searched. Without one (used to route a message), the current club comes first. */
function parseOffering(text, scope) {
  const t = text.toLowerCase(), orgs = scope && scope !== "all" ? [scope] : [S.org, ...Object.keys(ORGS).filter((o) => o !== S.org)];
  for (const org of orgs) for (const [off, re] of OFFER_WORDS) if (re.test(t) && ORGS[org].offerings.some((o) => o.id === off)) return { org, off };
  return null;
}
/* A session type that only another club has, while no club was named: the coach says so and does not reach across. */
function elsewhereOnly(text) { if (parseClub(text) || parseOffering(text, S.org)) return null; const f = parseOffering(text); return f && f.org !== S.org ? f : null; }
const onDay = (d, when) => (when.date ? ymd(d) === ymd(when.date) : when.weekday != null ? d.getDay() === when.weekday : when.range ? d >= when.range[0] && d < when.range[1] : true);
const offName = (org, off) => ORGS[org].offerings.find((o) => o.id === off).name;
/* "the Thursday track session", "the Saturday community session" */
const usualName = (org, off, wd) => { const n = offName(org, off); return "the " + (n.startsWith(WDL[wd]) ? WDL[wd] + n.slice(WDL[wd].length).toLowerCase() : `${WDL[wd]} ${n.toLowerCase()}`); };

/* ---------- confirm cards: pending -> confirmed | declined | expired | replaced ---------- */
function say(text, prop) { S.chat.push({ who: "coach", text, prop: prop || null }); }
function sweepProposals() {
  let changed = false;
  for (const p of Object.values(S.props)) if (p.status === "pending" && now() >= p.expiresAt) { p.status = "expired"; p.note = `Expired after ${CARD_TTL_MIN} minutes. Nothing was changed.`; changed = true; }
  return changed;
}
/* Only the newest card is live. Every older card that is still pending is switched off as "Replaced" when a new one is made, whatever it was about. */
function propose(text, p) {
  sweepProposals();
  for (const old of Object.values(S.props)) if (old.status === "pending") { old.status = "replaced"; old.note = "Replaced by a newer card. Nothing was changed."; }
  const id = S.seq++;
  S.props[id] = { id, key: `prop-${id}`, status: "pending", createdAt: now(), expiresAt: new Date(now().getTime() + CARD_TTL_MIN * 60000), results: [], note: "", lines: [], ...p };
  say(text, id);
  return S.props[id];
}
/* Every action is checked again at the moment of the confirm: the world may have changed since the card was made. */
function runAct(a, key) {
  if (a.t === "book") {
    const s = S.sessions[a.sid];
    // The card promised a booking. If the session filled up meanwhile, do not quietly turn it into a waitlist entry.
    if (s && !a.wait && !S.idem[key] && check(s).ok && spots(s) === 0) return remember(key, err("SESSION_FULL", "It filled up since I asked. Ask me to join the waitlist if you want."));
    return book(a.sid, "ai_coach", key, { wait: !!a.wait });
  }
  if (a.t === "cancel") return cancel(a.bid, key);
  if (a.t === "accept") return acceptOffer(a.sid, key);
  if (a.t === "series") {
    if (S.idem[key]) return S.idem[key];
    const se = createSeries(a.org, a.off, a.weekday, "ai_coach"); if (!se) return remember(key, err("NOT_FOUND", "That session no longer runs on that day."));
    const r = remember(key, { ok: true, msg: `${seriesLabel(se)} is on until ${fDay(se.until)} ${se.until.getFullYear()}. Pause it with one tap under Week.` });
    return { ...r, extra: seriesRows(se).map((x) => ({ ok: x.status !== "skipped", msg: `${fDay(x.date)}: ${x.status === "skipped" ? "skipped. " + x.text : x.text}` })) };
  }
  if (a.t === "series-pause") return pauseSeries(a.id, a.paused);
  if (a.t === "signup") return signUp(a.id, key);
  if (a.t === "unsign") { if (S.idem[key]) return S.idem[key]; return remember(key, signedUp(a.id) ? dropSignup(a.id) : err("NOT_FOUND", "Your name is not on that list any more.")); }
  if (a.t === "clearpain" || a.t === "painlevel") {
    if (S.idem[key]) return S.idem[key];
    const e = S.entries.find((x) => x.id === a.id);
    if (!e || !e.pain || e.cleared) return remember(key, err("NOT_FOUND", "That pain flag is not open any more."));
    if (a.t === "clearpain") { e.cleared = true; return remember(key, { ok: true, msg: "Pain flag cleared. Hard sessions can be suggested again." }); }
    e.painLevel = a.level;
    return remember(key, { ok: true, msg: `Pain flag updated: ${e.painWhere}, level ${a.level}.${a.level >= 7 ? " That is a high level: please see a doctor or physio." : ""}` });
  }
  if (a.t === "tryplan") return tryPlan(a.id, key);
  if (a.t === "swap" || a.t === "ease") {
    if (S.idem[key]) return S.idem[key];
    const it = S.plan.items.find((i) => i.date === a.date); if (!it) return remember(key, err("NOT_FOUND", "That plan day no longer exists."));
    const locked = planLocked(it); if (locked) return remember(key, err("PLAN_LOCKED", `${fDay(new Date(a.date + "T12:00"))} can't be changed any more: ${locked}.`));
    if (a.t === "ease") { it.kind = "rest"; it.title = "Rest, or an easy 20 min walk"; it.off = null; it.status = "eased"; return remember(key, { ok: true, msg: `Plan: today is now rest, or an easy 20 min walk.` }); }
    it.kind = "workout"; it.title = "Easy 30 min @ RPE 3"; it.off = null; it.status = "swapped";
    return remember(key, { ok: true, msg: `Plan: ${fDay(new Date(a.date + "T12:00"))} is now an easy 30 min at RPE 3.` });
  }
  return err("UNKNOWN", "Unknown action.");
}
const FAIL = { book: "Couldn't book", cancel: "Couldn't cancel", swap: "Couldn't change the plan", ease: "Couldn't change the plan", accept: "Couldn't take the spot", series: "Couldn't start the series", "series-pause": "Couldn't change the series", signup: "Couldn't put your name down", tryplan: "Couldn't add the plan", unsign: "Couldn't take your name off", clearpain: "Couldn't clear the flag", painlevel: "Couldn't update the flag" };
/* The only way the coach changes anything. A card can be decided once; each action carries the card's idempotency key. */
function confirmProposal(id, yes) {
  sweepProposals();
  const p = S.props[id]; if (!p || p.status !== "pending") return p || null;
  if (!yes) { p.status = "declined"; p.note = "Declined. Nothing was changed."; return p; }
  const chosen = p.acts.map((a, i) => ({ a, i })).filter((r) => r.a.on !== false);
  if (!chosen.length) return p;
  const done = [];
  for (const { a, i } of chosen) {
    const r = runAct(a, `${p.key}:${i}`);
    p.results.push({ ok: !!r.ok, msg: r.ok ? r.msg : `${FAIL[a.t] || "Couldn't do it"}: ${r.msg}` });
    for (const x of r.extra || []) p.results.push(x);
    if (r.ok) done.push(a);
    else if (r.blocked && a.sid) p.offerSid = a.sid; // the pass said no: the card offers the ways out right there
  }
  // A card only reads "Confirmed" if something actually happened. If nothing could be done, it is declined, with the reason.
  if (!done.length) { p.status = "declined"; p.failed = true; p.note = "Nothing was changed."; return p; }
  p.status = "confirmed"; p.partial = done.length < chosen.length;
  if (done.some((a) => a.t === "swap" || a.t === "ease")) S.alerts.push({ id: S.seq++, kind: done.some((a) => a.t === "ease") ? "Athlete made today easy (load reduced)" : "Athlete eased this week's plan (load reduced)", at: now(), status: "open", info: true });
  return p;
}
function toggleAct(id, i) { const p = S.props[id]; if (p && p.status === "pending" && p.acts[i]) p.acts[i].on = p.acts[i].on === false; }

/* ---------- replies ---------- */
const cancelLine = (b, s) => { const forfeit = now() > deadline(s) && ORGS[s.org].policy.lateCancel === "forfeit"; return `${offOf(s).name}, ${fDay(s.start)} ${fTime(s.start)}, ${ORGS[s.org].name}${forfeit ? " (inside the deadline: credit not returned)" : ""}`; };
function memoryFor(org) { return S.memory.filter((m) => m.org === org || m.org == null); }
const memoryLabel = (m) => (m.org ? ORGS[m.org].name : "General");

/* Everything the member has coming up, from one place: club bookings (in scope) and her Explore list. */
function agenda(scope) {
  const rows = upcomingBookings().filter((r) => scope === "all" || r.s.org === scope).map((r) => ({ type: "club", start: r.s.start, b: r.b, s: r.s, label: cancelLine(r.b, r.s), act: { t: "cancel", bid: r.b.id }, intent: `cancel:${r.b.id}` }));
  for (const x of S.signups) { const o = offerById(x.id); if (o && offerStart(o) > now()) rows.push({ type: "explore", start: offerStart(o), o, label: `${o.title}, ${fDay(offerStart(o))} ${fTime(offerStart(o))}, ${o.club} (Explore${x.wait ? ", waitlist" : ""})`, act: { t: "unsign", id: o.id }, intent: `unsign:${o.id}` }); }
  return rows.sort((a, b) => a.start - b.start);
}
const scopeName = (scope) => (scope === "all" ? "all your clubs" : ORGS[scope].name);
function replyCancel(text) {
  const t = text.toLowerCase(), when = parseWhen(text), club = parseClub(text), scope = club || S.org, named = parseOffering(text, scope), exN = namedOffer(text), ex = exN && signedUp(exN.id) && !named ? exN : null;
  const far = elsewhereOnly(text);
  if (far && !ex) {
    const r = upcomingBookings().find((x) => x.s.org === far.org && x.s.off === far.off && onDay(x.s.start, when)), n = offName(far.org, far.off).toLowerCase();
    return say(r ? `Your ${n} on ${fDay(r.s.start)} is at ${ORGS[far.org].name}. Here I only act at ${ORGS[S.org].name}. Say "cancel my ${n} at ${ORGS[far.org].name}" and I will.` : `${offName(far.org, far.off)} is at ${ORGS[far.org].name}, and you have nothing booked there${when.label ? " on " + when.label : ""}.`);
  }
  const all = agenda(scope), others = club ? [] : upcomingBookings().filter((r) => r.s.org !== S.org);
  const also = others.length ? ` You also have ${others.length} at ${[...new Set(others.map((r) => ORGS[r.s.org].name))].join(" and ")}; say "at all my clubs" to include ${others.length === 1 ? "it" : "them"}.` : "";
  const fits = (r) => onDay(r.start, when) && (ex ? r.type === "explore" && r.o.id === ex.id : !named || (r.type === "club" && r.s.org === named.org && r.s.off === named.off));
  if (!all.length) return say(`You have no upcoming bookings at ${scopeName(scope)}.${also}`);
  const batch = /\b(everything|all|every|each)\b/.test(t) || !!when.range;
  if (batch) {
    const rows = all.filter(fits);
    const where = ` at ${scopeName(scope)}${when.label ? `${when.date || when.weekday != null ? " on" : ""} ${when.label}` : ""}`;
    if (!rows.length) return say(`You have no upcoming bookings${where}.${also}`);
    return propose(`You have ${rows.length} upcoming ${rows.length === 1 ? "booking" : "bookings"}${where}. Switch off any you want to keep.${also}`, {
      intent: "cancel-batch", batch: true, title: rows.length === 1 ? "Cancel this booking?" : `Cancel these ${rows.length} bookings?`,
      acts: rows.map((r) => ({ ...r.act, on: true, label: r.label })),
    });
  }
  const r = all.find(fits);
  if (!r) return say(`You have no booking${named ? " for " + offName(named.org, named.off).toLowerCase() : ""}${when.label ? " on " + when.label : ""} at ${scopeName(scope)}. Your next one is ${all[0].label}.${also}`);
  if (r.type === "explore") return propose("Found it on your Explore list.", { intent: r.intent, title: "Take your name off?", lines: [r.label, r.o.price ? "This is a test booking: no money moves either way." : "Nothing was charged."], acts: [r.act] });
  const forfeit = now() > deadline(r.s) && ORGS[r.s.org].policy.lateCancel === "forfeit";
  return propose((when.label || named ? "Found it." : `Here is your next booking at ${scopeName(scope)}.`) + also, {
    intent: r.intent, title: "Cancel this booking?",
    lines: [`${offOf(r.s).name}, ${fDay(r.s.start)} ${fTime(r.s.start)}, ${ORGS[r.s.org].name}`, forfeit ? "Inside the cancel deadline: the credit is not returned." : `Free cancel until ${fDay(deadline(r.s))} ${fTime(deadline(r.s))}.`],
    acts: [r.act],
  });
}

function replyBook(text) {
  const far = elsewhereOnly(text);
  if (far) return say(`${offName(far.org, far.off)} is at ${ORGS[far.org].name}, not at ${ORGS[S.org].name}. Say "book ${offName(far.org, far.off).toLowerCase()} at ${ORGS[far.org].name}", or switch club at the top.`);
  const club = parseClub(text), scope = club && club !== "all" ? club : S.org;
  const when = parseWhen(text), named = parseOffering(text, scope), explicitDay = when.date || when.weekday != null;
  let org = scope, off = named ? named.off : null, wd = when.date ? when.date.getDay() : when.weekday, why = "Found it.";
  if (!off) {
    const pats = S.patterns.filter((p) => p.org === org).sort((a, b) => b.count - a.count);
    if (explicitDay) {
      // The day in the request decides. The usual pattern only fills in WHICH session on that day.
      const p = pats.find((x) => x.weekday === wd);
      if (p) { off = p.off; why = `You've done ${usualName(org, off, wd)} ${p.count} times lately, so I take that as your usual ${WDL[wd]}.`; }
      else why = `You have no usual on ${WDL[wd]}s at ${ORGS[org].name}, so here is the first session that day.`;
    } else {
      const p = pats[0];
      if (!p) return say(`I don't know your usual at ${ORGS[org].name} yet. Tell me the session and the day, for example "book yoga on Thursday".`);
      off = p.off; wd = p.weekday; when.weekday = wd;
      why = `You've done ${usualName(org, off, wd)} ${p.count} times lately, so I take that as your usual.`;
    }
  }
  const pool = sessList(org).filter((x) => x.start > now() && onDay(x.start, when) && (!off || x.off === off));
  const s = pool.find((x) => !myBooking(x.id) && !myWait(x.id));
  if (!s) {
    const have = pool.find((x) => myBooking(x.id) || myWait(x.id));
    if (have) return say(`You are already ${myBooking(have.id) ? "booked for" : "on the waitlist for"} ${offOf(have).name} on ${fDay(have.start)} at ${fTime(have.start)}.`);
    return say(`I could not find ${off ? "a " + offName(org, off).toLowerCase() : "a session"}${when.label ? " on " + when.label : ""} at ${ORGS[org].name}.` + (off ? ` It runs on ${ORGS[org].offerings.find((o) => o.id === off).days.map((d) => WDL[d] + "s").join(", ")}.` : ""));
  }
  const c = check(s), full = spots(s) === 0, asksWait = /waitlist|wait list/.test(text.toLowerCase());
  if (!c.ok && c.blocked && full) {
    // Out of credits and full: the waitlist costs nothing, so the coach can still put her on it.
    return propose(`${offOf(s).name} on ${fDay(s.start)} is full, and ${c.msg.charAt(0).toLowerCase() + c.msg.slice(1)} The waitlist costs nothing. If a spot comes up it is held for you while you decide.`, { intent: `book:${s.id}`, title: "Join the waitlist?", lines: [`${offOf(s).name}, ${fDay(s.start)} ${fTime(s.start)}, ${offOf(s).loc}`, `You would be #${s.waitOthers + 1} on the waitlist.`, "Nothing is charged until you take a spot."], acts: [{ t: "book", sid: s.id, wait: true }] });
  }
  if (!c.ok) {
    const alt = c.blocked ? sessList(s.org).find((x) => offOf(x).free && x.start > now() && !myBooking(x.id) && !myWait(x.id) && check(x).ok) : null;
    const msg = `I can't book ${offOf(s).name} on ${fDay(s.start)}. ${c.msg}`;
    if (!c.blocked) return say(msg);
    // The pass said no. Offer the ways out right here; each one opens the checkout, where the member decides.
    S.chat.push({ who: "coach", text: `${msg}\nYou can sort that out right here.` + (alt ? `\nOr train for free: ${offOf(alt).name}, ${fDay(alt.start)} ${fTime(alt.start)}, has ${spots(alt)} spots. Just ask me to book it.` : ""), opts: { sid: s.id } });
    return null;
  }
  if (asksWait && !full) why = `${offOf(s).name} on ${fDay(s.start)} still has ${spots(s)} ${spots(s) === 1 ? "spot" : "spots"}, so you don't need the waitlist.`;
  return propose(why, { intent: `book:${s.id}`, title: full ? "Join the waitlist?" : "Book this session?", lines: [`${offOf(s).name}, ${fDay(s.start)} ${fTime(s.start)}, ${offOf(s).loc}`, full ? `Full. You would be #${s.waitOthers + 1} on the waitlist.` : c.pass ? { pass: c.pass.id, sid: s.id } : c.note, `Free cancel until ${fDay(deadline(s))} ${fTime(deadline(s))}.`], acts: [{ t: "book", sid: s.id, wait: full }] });
}

/* "Where am I on the waitlist?" */
function replyWaitlist() {
  const rows = S.waitlist.map((w) => ({ w, s: S.sessions[w.sid] })).sort((a, b) => a.s.start - b.s.start);
  if (!rows.length) return say("You are not on any waitlist. If a session is full, ask me to join its waitlist, for example \"join the waitlist for gym on Friday\".");
  const held = rows.find((r) => r.w.offer);
  S.chat.push({ who: "coach", text: rows.map(({ w, s }) => `${offOf(s).name}, ${fDay(s.start)} ${fTime(s.start)}, ${ORGS[s.org].name}: ` + (w.offer ? `a spot is held for you until ${fTime(w.offer.expiresAt)}.` : `you are #${w.pos} of ${waitTotal(s)} waiting.`)).join("\n") + `\nNothing is charged until you get a spot.`, opts: held ? { sid: held.s.id } : null });
  return null;
}
/* "Take my spot": a held spot is taken through a confirm card, like every other change the coach makes. */
function replyOffer() {
  const w = S.waitlist.find((x) => x.offer); if (!w) return say("No spot is being held for you right now.");
  const s = S.sessions[w.sid], c = check(s, { ignoreWait: true });
  if (!c.ok) { S.chat.push({ who: "coach", text: `A spot in ${offOf(s).name}, ${fDay(s.start)}, is held for you until ${fTime(w.offer.expiresAt)}, but ${c.msg.charAt(0).toLowerCase() + c.msg.slice(1)} You can sort that out right here.`, opts: { sid: s.id } }); return null; }
  return propose(`It is held until ${fTime(w.offer.expiresAt)}.`, { intent: `accept:${s.id}`, title: "Take the held spot?", lines: [`${offOf(s).name}, ${fDay(s.start)} ${fTime(s.start)}, ${offOf(s).loc}`, c.pass ? { pass: c.pass.id, sid: s.id } : c.note, `Free cancel until ${fDay(deadline(s))} ${fTime(deadline(s))}.`], acts: [{ t: "accept", sid: s.id }] });
}
/* "Book every Thursday 18:30 this season", and pausing or resuming a series. */
function replySeries(text) {
  const club = parseClub(text), org = club && club !== "all" ? club : S.org;
  const t = text.toLowerCase(), when = parseWhen(text), named = parseOffering(text, org), wd = when.date ? when.date.getDay() : when.weekday;
  if (/pause|stop|resume|restart|continue|switch (it )?(on|off)/.test(t)) {
    const all = S.series.filter((x) => (wd == null || x.weekday === wd) && (!named || (x.org === named.org && x.off === named.off)));
    if (!all.length) return say(S.series.length ? "I could not find that series. You can see all of them under Week, Repeating." : "You have no repeating bookings.");
    const se = all[0], on = /resume|restart|continue|switch (it )?on/.test(t);
    if (on === !se.paused) return say(`${seriesLabel(se)} (${seriesOff(se).name}) is already ${se.paused ? "paused" : "on"}.`);
    return propose("Found it.", { intent: `series-pause:${se.id}`, title: on ? "Resume this series?" : "Pause this series?", lines: [`${seriesLabel(se)}, ${seriesOff(se).name}, ${ORGS[se.org].name}`, on ? "Dates that have opened are booked again from now on." : "Nothing new is booked while it is paused. Your existing bookings stay."], acts: [{ t: "series-pause", id: se.id, paused: !on }] });
  }
  if (wd == null) return say("Which day should repeat? For example: \"book every Thursday 18:30 this season\".");
  const tm = t.match(/\b(\d{1,2})[:.](\d{2})\b/);
  let off = named ? named.off : null;
  if (!off) {
    const cands = ORGS[org].offerings.filter((o) => o.days.includes(wd) && (!tm || (o.time[0] === Number(tm[1]) && o.time[1] === Number(tm[2]))));
    const pat = S.patterns.find((p) => p.org === org && p.weekday === wd && cands.some((o) => o.id === p.off));
    off = pat ? pat.off : cands.length === 1 ? cands[0].id : null;
    if (!off) return say(cands.length ? `Several sessions run on ${WDL[wd]}s at ${ORGS[org].name}: ${cands.map((o) => `${o.name} at ${pad(o.time[0])}:${pad(o.time[1])}`).join(", ")}. Which one should repeat?` : `Nothing runs on ${WDL[wd]}s${tm ? " at " + tm[0] : ""} at ${ORGS[org].name}.`);
  }
  const o = ORGS[org].offerings.find((x) => x.id === off);
  if (!o.days.includes(wd)) return say(`${o.name} does not run on ${WDL[wd]}s. It runs on ${o.days.map((d) => WDL[d] + "s").join(", ")}.`);
  const had = findSeries(org, off, wd);
  if (had && !had.paused) return say(`${seriesLabel(had)} (${o.name}) already repeats: ${seriesSummary(had)}. You can pause it with one tap under Week.`);
  const rows = previewSeries(org, off, wd), until = ORGS[org].season.end, label = `every ${WDL[wd]} ${pad(o.time[0])}:${pad(o.time[1])}`;
  return propose(`Here is what would happen. I book each date through the normal rules as soon as it opens, and I skip and report anything that clashes or goes over your pass.`, {
    intent: `series:${org}:${off}:${wd}`, title: `Book ${label} this season?`,
    lines: [`${o.name}, ${o.loc}, ${ORGS[org].name}`, ...rows.map((r) => `${fDay(r.date)}: ${r.status === "skipped" ? "skip. " + r.text : r.status === "booked" ? "book" : r.text.charAt(0).toLowerCase() + r.text.slice(1)}`), `Then every ${WDL[wd]} until ${fDay(until)} ${until.getFullYear()}, as the dates come into the schedule.`, "You can pause it with one tap under Week."],
    acts: [{ t: "series", org, off, weekday: wd }],
  });
}

const AREA_WORDS = [["Foot or ankle", /foot|feet|ankle|achilles|heel/], ["Calf or shin", /calf|calves|shin/], ["Knee", /knee/], ["Thigh or hamstring", /thigh|hamstring|quad/], ["Hip or groin", /hip|groin|glute/], ["Back", /back|spine/], ["Shoulder or arm", /shoulder|arm|elbow|wrist/]];
function coachReply(q) {
  const t = q.toLowerCase(), st = stats();
  if (/\bpain|hurt|\bsore\b|injur|\bach(e|es|ing)\b/.test(t)) {
    // A flag that is already open is the starting point: say what it says, and offer to update or clear it. Never open a second one.
    const flag = openPain();
    if (flag && !/cancel/.test(t)) {
      const d = ymd(flag.at) === ymd(today()) ? "today" : ymd(flag.at) === ymd(addDays(today(), -1)) ? "yesterday" : fDay(flag.at), what = flag.painWhere === "Not sure" || flag.painWhere === "Other" ? "pain" : flag.painWhere.toLowerCase(), lv = (t.match(/\b(?:level|to|at|is|a)\s+(10|\d)\b/) || [])[1];
      const head = `Your ${what} flag from ${d} is still on, level ${flag.painLevel}.`;
      if (/\b(gone|clear|better now|fine now|healed)\b/.test(t)) return propose(`${head} Good to hear it is better.`, { intent: "clearpain", title: "Clear your pain flag?", lines: [`${flag.painWhere}, level ${flag.painLevel}, logged ${d}`, "Hard sessions can be suggested again once it is cleared."], acts: [{ t: "clearpain", id: flag.id }] });
      if (lv != null && Number(lv) !== flag.painLevel) return propose(head, { intent: "painlevel", title: `Update your pain flag to level ${lv}?`, lines: [`${flag.painWhere}: level ${flag.painLevel} becomes level ${lv}`, "It stays one flag. Hard sessions stay paused while it is on."], acts: [{ t: "painlevel", id: flag.id, level: Number(lv) }] });
      S.chat.push({ who: "coach", text: `${head} ${flag.painLevel >= 7 ? "That is a high level: please see a doctor or physio." : "I can't tell you what it is. If it persists or gets worse, please see a doctor or physio."}\nHard sessions stay paused while it is on. Is it better or worse? You can update it or clear it; I won't open a second flag.`, pain: flag.id });
      return null;
    }
    const alert = S.consent.pau["alerts.pain"], area = (AREA_WORDS.find(([, re]) => re.test(t)) || [])[0];
    if (alert) S.alerts.push({ id: S.seq++, kind: "Pain mentioned in coach chat", at: now(), status: "open" });
    S.form.pain = true; S.form.more = true; S.form.pristine = false; if (area) S.form.painWhere = area;
    const text = "Sorry to hear that. I can't tell you what it is, and I won't guess. If it persists or is severe, please see a doctor or physio.\n" + (alert ? "Coach Sara has been told, because you share pain alerts with PAU." : "Coach Sara has not been told, because you don't share pain alerts with PAU. You can change that under Me.") + `\nTo pause hard sessions, save it as a pain flag in Log. I have switched "Something hurt" on there${area ? ` with "${area}"` : ""}; nothing is saved until you log it.`;
    // Only the athlete decides about cancelling. If she asks for it in the same breath, that is what she gets.
    if (/cancel/.test(t)) { say(text); return replyCancel(q); }
    const it = S.plan.items.find((i) => i.date === ymd(today())), locked = it ? planLocked(it) : "", s = it && it.kind === "club" ? S.sessions[`pau-${it.off}-${it.date}`] : null, b = s && myBooking(s.id);
    if (!it || it.kind === "rest" || /RPE [1-4]\b|easy/i.test(it.title)) return say(`${text}\nToday is already easy${it ? ` (${it.title})` : ""}, so keep it that way.`);
    if (locked) return say(`${text}\nToday's ${it.title.toLowerCase()} can't be changed any more, because ${locked}. Take the rest of the day easy.`);
    return propose(`${text}\nWant me to make today easy?`, {
      intent: "ease-today", title: "Make today easy?",
      lines: [`Today's plan, "${it.title}", becomes rest or an easy 20 min walk.`, b ? `Your booking for ${offOf(s).name} at ${fTime(s.start)} stays as it is. Tell me if you want it cancelled.` : "Nothing is booked or cancelled.", "It only reduces load, so you can accept it yourself; Coach Sara gets a note."],
      acts: [{ t: "ease", date: it.date }],
    });
  }
  if (/easy week|easier|too hard|tired/.test(t)) {
    const T = today(), end = addDays(monday(T), 7), items = S.plan.items.filter((i) => i.date >= ymd(T) && i.date < ymd(end) && i.status === "planned" && (i.off === "track" || /long run/i.test(i.title)) && !planLocked(i));
    if (!items.length) return say("There is nothing hard left in your plan this week, so there is nothing to ease. Rest well.");
    const acts = [];
    for (const it of items) {
      const d = fDay(new Date(it.date + "T12:00"));
      acts.push({ t: "swap", date: it.date, label: `${d}: swap "${it.title}" for an easy 30 min at RPE 3` });
      const b = S.bookings.find((x) => x.status === "confirmed" && x.sid === `pau-${it.off}-${it.date}` && S.sessions[x.sid].start > now());
      if (b) acts.push({ t: "cancel", bid: b.id, label: `${d}: cancel your ${it.title} booking` });
    }
    return propose(`Your last 7 days are at ${Math.round(st.ratio * 100)}% of your 4-week average${st.hard ? ` and you logged ${st.hard} session(s) at RPE 9+` : ""}. Here is an easier week. It only reduces load, so you can accept it yourself; Coach Sara gets a note.`, { intent: "ease-week", title: "Easy week: plan change", lines: acts.map((a) => a.label), acts });
  }
  if (/cancel/.test(t)) return replyCancel(q);
  if (/\bevery\b|\bweekly\b|recurring|repeat|\bseries\b|all season|this season|\beach (mon|tue|wed|thu|fri|sat|sun)/.test(t)) return replySeries(q);
  if (/explore|something (new|else|different)|suggest|recommend|new sport|other clubs?|what else|try out|train like|pro athlete|personal coach|physio|massage|recovery|nutrition|\bevents?\b|\braces?\b|tournament|open day/.test(t) || (namedOffer(q) && !parseOffering(q))) return replyExplore(q);
  if (/held|take (my|the) spot|accept/.test(t)) return replyOffer();
  if (/wait ?list/.test(t) && !/\bjoin\b|add me|put me|sign me/.test(t)) return replyWaitlist();
  if (/remember|know about me|memory/.test(t)) {
    const ms = memoryFor(S.org);
    return say(ms.length ? `Here at ${ORGS[S.org].name} I use:\n${ms.map((m) => `[${memoryLabel(m)}] ${m.text}`).join("\n")}\nWhat I learned at your other clubs stays out of this club's chat. You can delete any of it under Me.` : "I remember nothing about you here. Anything I learn shows up under Me, and you can delete it.");
  }
  if (/\bpass\b|credits?\b|balance|how many (sessions|classes)/.test(t)) { const p = passOf(S.org); return say(p ? `${p.name} at ${ORGS[S.org].name}: ${passState(p).text}.` : `You have no pass at ${ORGS[S.org].name}.`); }
  if (/what'?s on|schedule|which sessions|what sessions/.test(t)) {
    const when = parseWhen(q), club = parseClub(q), org = club && club !== "all" ? club : S.org;
    const list = sessList(org).filter((s) => s.start > now() && onDay(s.start, when)).slice(0, 6).map((s) => `${fDay(s.start)} ${fTime(s.start)}  ${offOf(s).name}  ${myBooking(s.id) ? "(booked)" : spots(s) ? `${spots(s)} spots` : "full"}`);
    const mine = agenda(club || S.org).filter((r) => onDay(r.start, when)).slice(0, 6).map((r) => r.label);
    return say((list.length ? `Next at ${ORGS[org].name}${when.label ? ", " + when.label : ""}:\n${list.join("\n")}` : `Nothing is scheduled at ${ORGS[org].name}${when.label ? " " + when.label : ""}.`) + `\n${mine.length ? `Yours${when.label ? " " + when.label : ""}:\n${mine.join("\n")}` : `Nothing of yours${when.label ? " " + when.label : ""} yet.`}`);
  }
  if (/waitlist|\bbook\b|usual|\bjoin\b|sign me up/.test(t) || parseOffering(q)) return replyBook(q);
  if (/how am i|doing|progress/.test(t)) {
    const pb = [...S.pbs].sort((a, b) => b.at - a.at)[0];
    return say(`Last 7 days: ${st.cur.count} session(s), load ${st.cur.load}. Your 4-week average is ${Math.round(st.avg)}, so you are at ${Math.round(st.ratio * 100)}%.\nLatest personal best: ${pb.metric} ${pb.value} ${pb.unit} on ${fDay(pb.at)}.\nStage: ${S.stages[S.stage]}, ${S.stageSessions} of ${PER} sessions done. ${st.ratio > LOAD_LIMIT ? "That is more than 10% above your average, so keep the next days easy." : "You are on track."}`);
  }
  if (/log/.test(t)) return say("Open the Log tab and tap how it felt. It takes under 30 seconds.");
  say("In this demo I understand: \"book my usual\", \"book my usual Thursday\", \"book every Thursday 18:30 this season\", \"suggest something new for me\", \"join the waitlist for gym on Friday\", \"where am I on the waitlist?\", \"what's on this week?\", \"cancel my next session\", \"cancel everything this week\", \"I need an easy week\", \"how am I doing?\", \"what do you remember?\" and anything about pain.");
}
function ask(text) { S.chat.push({ who: "me", text }); coachReply(text); }
