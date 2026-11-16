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
/* Which session type is named? The current club is checked first, so "gym" at PAU means PAU's gym session. */
function parseOffering(text) {
  const t = text.toLowerCase();
  for (const org of [S.org, ...Object.keys(ORGS).filter((o) => o !== S.org)]) for (const [off, re] of OFFER_WORDS) if (re.test(t) && ORGS[org].offerings.some((o) => o.id === off)) return { org, off };
  return null;
}
const onDay = (d, when) => (when.date ? ymd(d) === ymd(when.date) : when.weekday != null ? d.getDay() === when.weekday : when.range ? d >= when.range[0] && d < when.range[1] : true);
const offName = (org, off) => ORGS[org].offerings.find((o) => o.id === off).name;
/* "the Thursday track session", "the Saturday community session" */
const usualName = (org, off, wd) => { const n = offName(org, off); return "the " + (n.startsWith(WDL[wd]) ? WDL[wd] + n.slice(WDL[wd].length).toLowerCase() : `${WDL[wd]} ${n.toLowerCase()}`); };

/* ---------- confirm cards: pending -> confirmed | declined | expired ---------- */
function say(text, prop) { S.chat.push({ who: "coach", text, prop: prop || null }); }
function sweepProposals() {
  let changed = false;
  for (const p of Object.values(S.props)) if (p.status === "pending" && now() >= p.expiresAt) { p.status = "expired"; p.note = `Expired after ${CARD_TTL_MIN} minutes. Nothing was changed.`; changed = true; }
  return changed;
}
/* Only the newest pending card for the same intent is live: an older one is closed when a new one is made. */
function propose(text, p) {
  sweepProposals();
  for (const old of Object.values(S.props)) if (old.status === "pending" && old.intent === p.intent) { old.status = "expired"; old.note = "Replaced by a newer card. Nothing was changed."; }
  const id = S.seq++;
  S.props[id] = { id, key: `prop-${id}`, status: "pending", createdAt: now(), expiresAt: new Date(now().getTime() + CARD_TTL_MIN * 60000), results: [], note: "", lines: [], ...p };
  say(text, id);
  return S.props[id];
}
function runAct(a, key) {
  if (a.t === "book") return book(a.sid, "ai_coach", key);
  if (a.t === "cancel") return cancel(a.bid, key);
  if (a.t === "swap") {
    if (S.idem[key]) return S.idem[key];
    const it = S.plan.items.find((i) => i.date === a.date); if (!it) return remember(key, err("NOT_FOUND", "That plan day no longer exists."));
    it.kind = "workout"; it.title = "Easy 30 min @ RPE 3"; it.off = null; it.status = "swapped";
    return remember(key, { ok: true, msg: `Plan: ${fDay(new Date(a.date + "T12:00"))} is now an easy 30 min at RPE 3.` });
  }
  return err("UNKNOWN", "Unknown action.");
}
/* The only way the coach changes anything. A card can be decided once; each action carries the card's idempotency key. */
function confirmProposal(id, yes) {
  sweepProposals();
  const p = S.props[id]; if (!p || p.status !== "pending") return p || null;
  if (!yes) { p.status = "declined"; p.note = "Declined. Nothing was changed."; return p; }
  const chosen = p.acts.map((a, i) => ({ a, i })).filter((r) => r.a.on !== false);
  if (!chosen.length) return p;
  p.status = "confirmed";
  for (const { a, i } of chosen) { const r = runAct(a, `${p.key}:${i}`); p.results.push({ ok: !!r.ok, msg: r.msg }); }
  if (chosen.some((r) => r.a.t === "swap")) S.alerts.push({ id: S.seq++, kind: "Athlete eased this week's plan (load reduced)", at: now(), status: "open", info: true });
  return p;
}
function toggleAct(id, i) { const p = S.props[id]; if (p && p.status === "pending" && p.acts[i]) p.acts[i].on = p.acts[i].on === false; }

/* ---------- replies ---------- */
const cancelLine = (b, s) => { const forfeit = now() > deadline(s) && ORGS[s.org].policy.lateCancel === "forfeit"; return `${offOf(s).name}, ${fDay(s.start)} ${fTime(s.start)}, ${ORGS[s.org].name}${forfeit ? " (inside the deadline: credit not returned)" : ""}`; };
function memoryFor(org) { return S.memory.filter((m) => m.org === org || m.org == null); }
const memoryLabel = (m) => (m.org ? ORGS[m.org].name : "General");

function replyCancel(text) {
  const t = text.toLowerCase(), when = parseWhen(text), named = parseOffering(text), all = upcomingBookings();
  if (!all.length) return say("You have no upcoming bookings to cancel.");
  const batch = /\b(everything|all|every|each)\b/.test(t) || !!when.range;
  if (batch) {
    const rows = all.filter((r) => onDay(r.s.start, when) && (!named || (r.s.org === named.org && r.s.off === named.off)));
    const scope = when.label ? ` ${when.date || when.weekday != null ? "on " : ""}${when.label}` : "";
    if (!rows.length) return say(`You have no upcoming bookings${scope}.`);
    return propose(`You have ${rows.length} upcoming ${rows.length === 1 ? "booking" : "bookings"}${scope}. Switch off any you want to keep.`, {
      intent: "cancel-batch", batch: true, title: rows.length === 1 ? "Cancel this booking?" : `Cancel these ${rows.length} bookings?`,
      acts: rows.map((r) => ({ t: "cancel", bid: r.b.id, on: true, label: cancelLine(r.b, r.s) })),
    });
  }
  const r = all.find((x) => onDay(x.s.start, when) && (!named || (x.s.org === named.org && x.s.off === named.off)));
  if (!r) return say(`You have no booking${named ? " for " + offName(named.org, named.off).toLowerCase() : ""}${when.label ? " on " + when.label : ""}. Your next one is ${offOf(all[0].s).name}, ${fDay(all[0].s.start)} ${fTime(all[0].s.start)}.`);
  const forfeit = now() > deadline(r.s) && ORGS[r.s.org].policy.lateCancel === "forfeit";
  return propose(when.label || named ? "Found it." : "Here is your next booking.", {
    intent: `cancel:${r.b.id}`, title: "Cancel this booking?",
    lines: [`${offOf(r.s).name}, ${fDay(r.s.start)} ${fTime(r.s.start)}, ${ORGS[r.s.org].name}`, forfeit ? "Inside the cancel deadline: the credit is not returned." : `Free cancel until ${fDay(deadline(r.s))} ${fTime(deadline(r.s))}.`],
    acts: [{ t: "cancel", bid: r.b.id }],
  });
}

function replyBook(text) {
  const when = parseWhen(text), named = parseOffering(text), explicitDay = when.date || when.weekday != null;
  let org = named ? named.org : S.org, off = named ? named.off : null, wd = when.date ? when.date.getDay() : when.weekday, why = "Found it.";
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
  const c = check(s);
  if (!c.ok) {
    const alt = sessList(s.org).find((x) => offOf(x).free && x.start > now() && !myBooking(x.id) && !myWait(x.id) && check(x).ok);
    const msg = `I can't book ${offOf(s).name} on ${fDay(s.start)}. ${c.msg}`;
    if (!alt) return say(msg);
    return propose(`${msg}\nAn alternative: ${offOf(alt).name}, ${fDay(alt.start)} ${fTime(alt.start)}, is free and has ${spots(alt)} spots.`, { intent: `book:${alt.id}`, title: "Book the alternative?", lines: [`${offOf(alt).name}, ${fDay(alt.start)} ${fTime(alt.start)}, ${offOf(alt).loc}`, "Free session. No pass needed."], acts: [{ t: "book", sid: alt.id }] });
  }
  const full = spots(s) === 0;
  return propose(why, { intent: `book:${s.id}`, title: full ? "Join the waitlist?" : "Book this session?", lines: [`${offOf(s).name}, ${fDay(s.start)} ${fTime(s.start)}, ${offOf(s).loc}`, full ? `Full. You would be #${s.waitOthers + 1} on the waitlist.` : c.pass ? { pass: c.pass.id, sid: s.id } : c.note, `Free cancel until ${fDay(deadline(s))} ${fTime(deadline(s))}.`], acts: [{ t: "book", sid: s.id }] });
}

const AREA_WORDS = [["Foot or ankle", /foot|feet|ankle|achilles|heel/], ["Calf or shin", /calf|calves|shin/], ["Knee", /knee/], ["Thigh or hamstring", /thigh|hamstring|quad/], ["Hip or groin", /hip|groin|glute/], ["Back", /back|spine/], ["Shoulder or arm", /shoulder|arm|elbow|wrist/]];
function coachReply(q) {
  const t = q.toLowerCase(), st = stats();
  if (/pain|hurt|sore|injur|ache/.test(t)) {
    const r = upcomingBookings().find((x) => x.s.org === "pau"), alert = S.consent.pau["alerts.pain"], area = (AREA_WORDS.find(([, re]) => re.test(t)) || [])[0];
    if (alert) S.alerts.push({ id: S.seq++, kind: "Pain mentioned in coach chat", at: now(), status: "open" });
    S.form.pain = true; if (area) S.form.painWhere = area;
    const text = "Sorry to hear that. I can't tell you what it is, and I won't guess. Rest today, and if it persists or is severe, please see a doctor or physio.\n" + (alert ? "Coach Sara has been told, because you share pain alerts with PAU." : "Coach Sara has not been told, because you don't share pain alerts with PAU. You can change that under Me.") + `\nTo pause hard sessions, save it as a pain flag in Log. I have switched "Something hurt" on there${area ? ` with "${area}"` : ""}; nothing is saved until you log it.`;
    return r ? propose(text, { intent: `cancel:${r.b.id}`, title: "Cancel your next session?", lines: [`${offOf(r.s).name}, ${fDay(r.s.start)} ${fTime(r.s.start)}`], acts: [{ t: "cancel", bid: r.b.id }] }) : say(text);
  }
  if (/easy week|easier|too hard|tired/.test(t)) {
    const T = today(), end = addDays(monday(T), 7), items = S.plan.items.filter((i) => i.date >= ymd(T) && i.date < ymd(end) && i.status === "planned" && (i.off === "track" || /long run/i.test(i.title)));
    if (!items.length) return say("There is nothing hard left in your plan this week, so there is nothing to ease. Rest well.");
    const acts = [];
    for (const it of items) {
      const d = fDay(new Date(it.date + "T12:00"));
      acts.push({ t: "swap", date: it.date, label: `${d}: swap "${it.title}" for an easy 30 min at RPE 3` });
      const b = S.bookings.find((x) => x.status === "confirmed" && x.sid === `pau-${it.off}-${it.date}`);
      if (b) acts.push({ t: "cancel", bid: b.id, label: `${d}: cancel your ${it.title} booking` });
    }
    return propose(`Your last 7 days are at ${Math.round(st.ratio * 100)}% of your 4-week average${st.hard ? ` and you logged ${st.hard} session(s) at RPE 9+` : ""}. Here is an easier week. It only reduces load, so you can accept it yourself; Coach Sara gets a note.`, { intent: "ease-week", title: "Easy week: plan change", lines: acts.map((a) => a.label), acts });
  }
  if (/cancel/.test(t)) return replyCancel(q);
  if (/remember|know about me|memory/.test(t)) {
    const ms = memoryFor(S.org);
    return say(ms.length ? `Here at ${ORGS[S.org].name} I use:\n${ms.map((m) => `[${memoryLabel(m)}] ${m.text}`).join("\n")}\nWhat I learned at your other clubs stays out of this club's chat. You can delete any of it under Me.` : "I remember nothing about you here. Anything I learn shows up under Me, and you can delete it.");
  }
  if (/\bpass\b|credits?\b|balance|how many (sessions|classes)/.test(t)) { const p = passOf(S.org); return say(p ? `${p.name} at ${ORGS[S.org].name}: ${passState(p).text}.` : `You have no pass at ${ORGS[S.org].name}.`); }
  if (/what'?s on|schedule|which sessions|what sessions/.test(t)) {
    const when = parseWhen(q), list = sessList(S.org).filter((s) => s.start > now() && onDay(s.start, when)).slice(0, 6).map((s) => `${fDay(s.start)} ${fTime(s.start)}  ${offOf(s).name}  ${myBooking(s.id) ? "(booked)" : spots(s) ? `${spots(s)} spots` : "full"}`);
    return say(list.length ? `Next at ${ORGS[S.org].name}${when.label ? ", " + when.label : ""}:\n${list.join("\n")}` : `Nothing is scheduled at ${ORGS[S.org].name}${when.label ? " " + when.label : ""}.`);
  }
  if (/waitlist|\bbook\b|usual|\bjoin\b|sign me up/.test(t) || parseOffering(q)) return replyBook(q);
  if (/how am i|doing|progress/.test(t)) {
    const pb = [...S.pbs].sort((a, b) => b.at - a.at)[0];
    return say(`Last 7 days: ${st.cur.count} session(s), load ${st.cur.load}. Your 4-week average is ${Math.round(st.avg)}, so you are at ${Math.round(st.ratio * 100)}%.\nLatest personal best: ${pb.metric} ${pb.value} ${pb.unit} on ${fDay(pb.at)}.\nStage: ${S.stages[S.stage]}, ${S.stageSessions} of ${PER} sessions done. ${st.ratio > LOAD_LIMIT ? "That is more than 10% above your average, so keep the next days easy." : "You are on track."}`);
  }
  if (/log/.test(t)) return say("Open the Log tab and tap how it felt. It takes under 30 seconds.");
  say("In this demo I understand: \"book my usual\", \"book my usual Thursday\", \"what's on this week?\", \"cancel my next session\", \"cancel everything this week\", \"I need an easy week\", \"how am I doing?\", \"what do you remember?\" and anything about pain.");
}
function ask(text) { S.chat.push({ who: "me", text }); coachReply(text); }
