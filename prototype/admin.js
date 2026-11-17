"use strict";
/* PATH clickable demo: the club office (N-04). Home (club health), Schedule, Members, Products, Money.
   The rules of the house, in code: PATH drafts and a person approves every message to a member; the office sees
   the club's own data (members, bookings, payments) and never a training log, a goal or a pain flag; each club
   sees only itself. Numbers that are not counted from what happens in the demo are labelled as demo data. */

const adm = () => (S.adm ||= { view: null });
/* The audit log of this club. What one club's office did is never shown in another's. */
const clubAudit = () => S.audit.filter((a) => a.org === S.org);
const signed = (n, unit = "") => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n)}${unit}`;
const demoNote = (text) => `<p class="sub demo">${text} <span class="eyebrow" style="display:inline;margin-left:4px">Demo data</span></p>`;
const backTo = (label) => `<button class="btn sm link ghost" data-a="adm-view" data-v="" aria-label="Back to ${label}">${I(P.back, 16)}${label}</button>`;

/* ---------- Home: how is my club doing? ---------- */
function vAdminHome() {
  const o = ORGS[S.org], c = clubStats(S.org), T = today(), up = sessList(S.org).filter((s) => s.start > now() && !s.cancelled);
  const tile = (id, n, label, delta) => `<div class="card" data-tile="${id}"><div class="num">${n}</div><div class="sub" style="margin-top:6px">${label}</div><div class="sub delta" style="margin-top:2px;color:var(--text)">${delta}</div></div>`;
  const needs = [
    c.todo ? ["members", `${c.todo} ${c.todo === 1 ? "member is" : "members are"} drifting away`, "A message is drafted for each. Nothing is sent until you approve it.", "Open"] : null,
    c.od.length ? ["money", `${c.od.length} overdue ${c.od.length === 1 ? "invoice" : "invoices"}, ${chf(c.odSum)}`, c.od.some((i) => !i.reminded) ? "Reminders are drafted and wait for you." : "Every one has been reminded.", "Open"] : null,
    c.quiet.length ? ["sched", `${c.quiet.length} ${c.quiet.length === 1 ? "session" : "sessions"} under 40% full in the next 7 days`, c.quiet.slice(0, 2).map((s) => `${offOf(s).name}, ${WD[s.start.getDay()]} ${fTime(s.start)}: ${booked(s)} of ${s.cap}`).join(" · "), "Schedule"] : null,
  ].filter(Boolean);
  return `<section class="pad stack-l" id="admin-home"><div><div class="eyebrow">Admin · ${o.kind}</div><h1 class="h1">${esc(o.name)}</h1></div>
    <div class="stack" style="gap:8px"><p id="health" style="font-size:18px;line-height:28px">${esc(clubSentence(S.org))}</p>${demoNote("Drafted by PATH from members, bookings and payments. Last month's figures are invented.")}</div>
    <div class="tiles" id="health-tiles">${tile("active", c.active, "Active members", `${signed(c.activeDelta)} on ${monthName(-1)}`)}${tile("visits", c.visits, `Visits in ${monthName()}`, `${signed(c.visitsPct, "%")} on the same days`)}${tile("fill", Math.round(c.fill * 100) + "%", "Fill rate, next 7 days", `${signed(Math.round((c.fill - c.fillLast) * 100))} points on ${monthName(-1)}`)}${tile("revenue", chf(c.revenue).replace(".00", ""), `Paid in ${monthName()}`, `${monthName(-1)}: ${chf(c.revenueLast).replace(".00", "")}`)}</div>
    <div class="stack" id="admin-needs"><div class="eyebrow">Needs you · ${needs.length}</div>${needs.length ? `<div class="card rows">${needs.map(([tab, title, sub, cta]) => `<button class="row" data-a="tab" data-v="${tab}" style="align-items:flex-start"><span class="mid"><span class="strong">${esc(title)}</span><span class="sub">${esc(sub)}</span></span><span class="end sub">${cta}</span></button>`).join("")}</div>` : `<p class="sub">Nothing is waiting for you.</p>`}</div>
    <div class="stack"><div class="eyebrow">Today</div><div class="card rows"><div class="row"><span class="mid sub">Sessions still to come today</span><span class="strong">${up.filter((s) => ymd(s.start) === ymd(T)).length}</span></div><div class="row"><span class="mid sub">Open invoices</span><span class="strong" id="open-invoices">${c.open.length}${c.od.length ? `, ${c.od.length} overdue` : ""}</span></div></div></div>
    <div class="stack" id="rules"><div class="between" style="align-items:center"><span class="eyebrow">Booking rules</span><button class="btn sm" data-a="adm-view" data-v="rules">Change the rules</button></div><p>${esc(policyText(S.org))}</p><div class="card rows">${sw(S.settings[S.org].waitlistMode === "offer", "wl-mode", S.org, `Offer freed spots with a ${S.settings[S.org].offerHoldMin / 60} h hold`, "On: the next person on the waitlist gets the spot held, then it moves on. Off: they are booked automatically.", false)}</div><p class="sub">Both clubs run on the same engine. Only this data differs.</p></div></section>`;
}

/* ---------- Booking rules ---------- */
function vAdminRules() {
  const p = policyOf(S.org), set = S.settings[S.org], f = adm().form || {}, val = (k, d) => esc(f[k] ?? d);
  return `<section class="pad stack-l" id="admin-rules">${backTo("Home")}<div><div class="eyebrow">Booking rules</div><h1 class="h1">${esc(ORGS[S.org].name)}</h1><p class="sub" style="margin-top:4px">They hold for every booking from now on. Existing bookings keep what they were promised.</p></div>
    <form class="stack" data-f="arules" novalidate>
      <label class="f">Members can book this many days ahead<input id="r-opens" type="number" inputmode="numeric" min="1" max="365" value="${val("opensDays", p.opensDays)}"></label>
      <label class="f">Free cancel until this many hours before<input id="r-cancel" type="number" inputmode="decimal" min="0" max="168" step="0.5" value="${val("cancelHours", p.cancelMin / 60)}"></label>
      <label class="f">A cancel after that<select id="r-late"><option value="none" ${(f.lateCancel ?? p.lateCancel) === "none" ? "selected" : ""}>costs nothing</option><option value="forfeit" ${(f.lateCancel ?? p.lateCancel) === "forfeit" ? "selected" : ""}>keeps the credit</option></select></label>
      <div class="two"><label class="f">Most bookings a day<input id="r-day" type="number" inputmode="numeric" min="0" max="50" placeholder="No limit" value="${val("maxDay", p.maxDay || "")}"></label><label class="f">Most bookings a week<input id="r-week" type="number" inputmode="numeric" min="0" max="50" placeholder="No limit" value="${val("maxWeek", p.maxWeek || "")}"></label></div>
      <label class="f">When a spot frees up, the next person on the waitlist<select id="r-wl"><option value="auto" ${(f.waitlistMode ?? set.waitlistMode) === "auto" ? "selected" : ""}>is booked automatically</option><option value="offer" ${(f.waitlistMode ?? set.waitlistMode) === "offer" ? "selected" : ""}>gets the spot held for them</option></select></label>
      <label class="f">A held spot is kept for this many hours<input id="r-hold" type="number" inputmode="decimal" min="0.5" max="48" step="0.5" value="${val("holdHours", set.offerHoldMin / 60)}"></label>
      ${adm().error ? `<p class="err" role="alert" id="rules-error">${esc(adm().error)}</p>` : ""}
      <button class="btn acc full" type="submit">Save rules</button></form>
    <div class="stack" style="gap:8px"><div class="eyebrow">As members read them</div><p id="rules-text">${esc(policyText(S.org))}</p></div></section>`;
}

/* ---------- Schedule ---------- */
function vAdminSched() {
  const up = sessList(S.org).filter((s) => s.start > now()), o = ORGS[S.org], end = o.season.end;
  return `<section class="pad stack-l" id="admin-sched"><div><h1 class="h1">Schedule</h1><p class="sub" style="margin-top:4px">Tap a session to change it or cancel it. "Free a spot" plays another member cancelling, so you can watch the waitlist move.</p></div>
    <button class="btn acc full" data-a="adm-sheet" data-v="aadd">Add a session</button>
    <div class="card scroll" tabindex="0" role="region" aria-label="Upcoming sessions"><table style="min-width:560px"><thead><tr><th>When</th><th>Session</th><th>Booked</th><th>Waiting</th><th><span class="sr">Action</span></th></tr></thead><tbody>${up.slice(0, 14).map((s) => `<tr data-sid="${s.id}"><td class="mono" style="white-space:nowrap">${fDay(s.start)} ${fTime(s.start)}</td><td><button class="btn sm link" style="padding-left:0;text-align:left" data-a="adm-sheet" data-v="asess|${s.id}"><span><span class="strong" style="display:block">${offOf(s).name}</span><span class="sub">${esc(coachOf(s))}${s.added ? " · added" : ""}</span><span class="sr">, ${fDay(s.start)} ${fTime(s.start)}: change or cancel</span></span></button></td><td class="mono">${s.cancelled ? "Cancelled" : `${booked(s)} / ${s.cap}`}</td><td class="mono">${s.cancelled ? "" : `${waitTotal(s)}${s.held ? ` · ${s.held} held` : ""}`}</td><td>${s.cancelled ? "" : `<button class="btn sm" data-a="free" data-v="${s.id}" aria-label="Free a spot: ${offOf(s).name}, ${fDay(s.start)}">Free a spot</button>`}</td></tr>`).join("")}</tbody></table></div>
    <p class="sub" id="season-note">${o.season.name} runs until ${fDate(end)}. No session is scheduled after that day${o.next ? ` until the ${o.next.name.toLowerCase()} starts on ${fDate(o.next.start)}; it runs until ${fDate(o.next.end)}` : ""}.</p></section>`;
}
/* One session, opened by the admin: change it, cancel it. */
function vAdminSessionSheet() {
  const sh = UI.sheet, s = S.sessions[sh.sid]; if (!s) return "";
  const o = offOf(s), n = booked(s), wait = waitTotal(s), wd = WDL[s.start.getDay()];
  const head = `<div><div class="eyebrow">${fDay(s.start)} · ${fTime(s.start)}</div><h2 class="h1">${o.name}</h2><p class="sub" style="margin-top:4px">${esc(coachOf(s))} · ${n} of ${s.cap} booked${wait ? ` · ${wait} waiting` : ""}</p></div>`;
  if (s.cancelled) return `<div class="sheetbg" data-a="close"><div class="sheet stack" role="dialog" aria-modal="true" aria-label="${o.name}">${head}<p class="note">This session is cancelled. Everyone who was booked has been told and has the session back on their pass.</p><button class="btn ghost full" data-a="close-btn">Close</button></div></div>`;
  if (sh.confirm) return `<div class="sheetbg" data-a="close"><div class="sheet stack" role="dialog" aria-modal="true" aria-label="Cancel ${o.name}">${head}
    <div class="stack" id="cancel-effects" style="gap:6px"><div class="eyebrow">If you cancel it</div><ul class="sub stack" style="gap:4px;padding-left:18px;list-style:disc"><li>${n} booked ${n === 1 ? "member is" : "members are"} told at once, in the app.</li><li>Each of them gets the session back on their pass. Nobody loses a credit.</li>${wait ? `<li>${wait} on the waitlist ${wait === 1 ? "is" : "are"} taken off it.</li>` : ""}<li>It can't be undone. To run it after all, add a new session.</li></ul></div>
    <button class="btn acc full" data-a="adm-cancel-yes" data-v="${s.id}">Cancel the session and tell ${n} ${n === 1 ? "member" : "members"}</button><button class="btn ghost full" data-a="adm-sheet" data-v="asess|${s.id}">Keep it</button></div></div>`;
  return `<div class="sheetbg" data-a="close"><div class="sheet stack" role="dialog" aria-modal="true" aria-label="${o.name}">${head}
    <form class="stack" data-f="asess" data-id="${s.id}" novalidate>
      <div class="two"><label class="f">Starts at<input id="e-time" type="time" value="${fTime(s.start)}"></label><label class="f">Places<input id="e-cap" type="number" inputmode="numeric" min="1" max="500" value="${s.cap}"></label></div>
      <label class="f">Coach<select id="e-coach">${ORGS[s.org].coaches.map(([name]) => `<option ${name === coachOf(s) ? "selected" : ""}>${esc(name)}</option>`).join("")}</select></label>
      <label class="f">Change<select id="e-scope"><option value="one">only this session</option><option value="following">this and every later ${wd}</option></select></label>
      ${sh.error ? `<p class="err" role="alert" id="sess-error">${esc(sh.error)}</p>` : ""}
      <button class="btn acc full" type="submit">Save changes</button></form>
    <button class="btn full" data-a="adm-cancel-ask" data-v="${s.id}">Cancel this session</button><button class="btn ghost full" data-a="close-btn">Close</button></div></div>`;
}
function vAdminAddSheet() {
  const o = ORGS[S.org], sh = UI.sheet, f = sh.form || {}, off = o.offerings.find((x) => x.id === f.off) || o.offerings[0];
  return `<div class="sheetbg" data-a="close"><div class="sheet stack" role="dialog" aria-modal="true" aria-label="Add a session"><div><div class="eyebrow">${esc(o.name)}</div><h2 class="h1">Add a session</h2><p class="sub" style="margin-top:4px">One extra session. Members can book it as soon as you add it.</p></div>
    <form class="stack" data-f="aadd" novalidate>
      <label class="f">What<select id="a-off">${o.offerings.map((x) => `<option value="${x.id}" ${x.id === off.id ? "selected" : ""}>${x.name}</option>`).join("")}</select></label>
      <div class="two"><label class="f">Day<input id="a-date" type="date" min="${ymd(today())}" value="${esc(f.date || ymd(addDays(today(), 1)))}"></label><label class="f">Starts at<input id="a-time" type="time" value="${esc(f.time || `${pad(off.time[0])}:${pad(off.time[1])}`)}"></label></div>
      <label class="f">Places<input id="a-cap" type="number" inputmode="numeric" min="1" max="500" value="${esc(f.cap || off.cap)}"></label>
      ${sh.error ? `<p class="err" role="alert" id="add-error">${esc(sh.error)}</p>` : ""}
      <button class="btn acc full" type="submit">Add to the schedule</button></form><button class="btn ghost full" data-a="close-btn">Close</button></div></div>`;
}

/* ---------- Members ---------- */
function vAdminMembers() {
  const o = ORGS[S.org], pass = passOf(S.org), ms = members(S.org), n = (st) => ms.filter((m) => m.status === st).length, risk = atRisk(S.org), all = adm().allRisk;
  const riskRow = ({ m, why }) => { const sent = sentTo(S.org, m.name, "checkin"); return `<button class="row" data-a="adm-sheet" data-v="amsg|risk|${m.id}" data-risk="${m.id}" style="align-items:flex-start"><span class="mid"><span class="strong">${esc(m.name)}</span><span class="sub">${esc(why.map((w) => w[1]).join(" · "))}</span><span class="sub">${esc(memberPass(m))}</span></span><span class="end sub">${sent ? `Sent ${fDay(sent.at)}` : "Message drafted"}</span></button>`; };
  return `<section class="pad stack-l" id="admin-members"><div><h1 class="h1">Members</h1><p class="sub" style="margin-top:4px" id="member-count">${ms.length + 1} members: ${n("Active") + 1} active, ${n("Trial")} on trial, ${n("Paused")} paused${n("New") ? `, ${n("New")} new` : ""}.</p></div>
    <div class="stack" id="at-risk"><div class="eyebrow">Drifting away · ${risk.length}</div><p class="sub">From bookings and check-ins only. PATH never reads a training log for this. For each one a short message is drafted; nothing is sent until you approve it.</p>${risk.length ? `<div class="card rows">${(all ? risk : risk.slice(0, 5)).map(riskRow).join("")}</div>${risk.length > 5 ? `<button class="btn sm link" data-a="adm-allrisk">${all ? "Show fewer" : `Show all ${risk.length}`}</button>` : ""}` : `<p class="sub">Nobody is drifting away right now.</p>`}${demoNote("How often each member came is invented.")}</div>
    <div class="stack"><div class="between" style="align-items:center"><span class="eyebrow">Everyone</span><button class="btn sm" data-a="adm-view" data-v="import">Import members</button></div>
    <div class="card scroll tall" tabindex="0" role="region" aria-label="Members" id="member-table"><table><thead><tr><th>Name</th><th>Status</th><th>Pass</th></tr></thead><tbody><tr><td class="strong">${esc(S.me.name)}</td><td>Active</td><td>${passLine(pass)}</td></tr>${ms.map((m) => `<tr><td class="strong">${esc(m.name)}</td><td>${m.status}</td><td>${esc(memberPass(m))}</td></tr>`).join("")}</tbody></table></div></div>
    <div class="stack" id="team"><div class="eyebrow">Coaches · ${o.coaches.length}</div><div class="card rows">${o.coaches.map(([name, what]) => `<div class="row"><span class="mid"><span class="strong">${esc(name)}</span><span class="sub">${esc(what)}</span></span></div>`).join("")}</div></div>
    ${pass.kind === "credits" ? `<form class="card stack" data-f="adjust"><p class="h2">Adjust ${esc(S.me.name)}'s credits</p><div class="two"><label class="f">Change (+ or −)<input id="adj-n" type="number" value="1"></label><label class="f">Reason (required)<input id="adj-r" placeholder="Class cancelled late"></label></div><button class="btn full" type="submit">Adjust credits</button></form>` : `<p class="sub">This pass has a monthly limit and no credits to adjust.</p>`}</section>`;
}
/* A message to one member, drafted by PATH, waiting for the admin. Used for a member who is drifting away and for a payment reminder. */
function vAdminMessageSheet() {
  const sh = UI.sheet, risk = sh.kind === "risk", m = risk ? members(S.org).find((x) => x.id === sh.id) : null, inv = risk ? null : S.invoices.find((x) => x.id === sh.id);
  if (!m && !inv) return "";
  const to = risk ? m.name : inv.member, sent = risk ? sentTo(S.org, to, "checkin") : inv.reminded ? (S.outbox || []).filter((x) => x.ref === inv.id).pop() : null;
  const why = risk ? riskOf(m).map((w) => w[1]).join(" · ") : `${inv.id} · ${chf(inv.amount)} · ${esc(inv.what)} · due ${fDay(inv.due)}, ${Math.round((today() - inv.due) / 864e5)} days ago`;
  const text = sh.text ?? (sent ? sent.text : risk ? draftCheckin(S.org, m) : draftReminder(inv));
  return `<div class="sheetbg" data-a="close"><div class="sheet stack" role="dialog" aria-modal="true" aria-label="Message to ${esc(to)}"><div><div class="eyebrow">${risk ? "Drifting away" : "Payment reminder"}</div><h2 class="h1">${esc(to)}</h2><p class="sub" style="margin-top:4px" id="msg-why">${risk ? esc(why) : why}</p></div>
    ${sent ? `<p class="note" id="msg-sent">Sent ${fDay(sent.at)} at ${fTime(sent.at)}, approved by you.</p><p id="msg-text">${esc(sent.text)}</p><button class="btn ghost full" data-a="close-btn">Close</button>`
    : `<form class="stack" data-f="amsg" novalidate><label class="f">Message<textarea id="msg-text" class="inp" rows="7" maxlength="800">${esc(text)}</textarea></label><p class="sub">Drafted by PATH. Change any word. Nothing is sent until you approve it. Demo: no real message leaves PATH.</p>${sh.error ? `<p class="err" role="alert">${esc(sh.error)}</p>` : ""}<button class="btn acc full" type="submit">Approve and send</button></form><button class="btn ghost full" data-a="close-btn">Not now</button>`}</div></div>`;
}
/* Import: paste or choose a file, look at every row, then add. */
function vAdminImport() {
  const a = adm(), rows = a.rows || null, ok = rows ? rows.filter((r) => !r.problems.length) : [];
  return `<section class="pad stack-l" id="admin-import">${backTo("Members")}<div><div class="eyebrow">Import members</div><h1 class="h1">${rows ? `${ok.length} of ${rows.length} can be added` : "Bring your member list"}</h1><p class="sub" style="margin-top:4px">${rows ? "Look through them. Rows with a problem are left out; nothing is added until you say so." : "One member per line: name, email, pass. A first line with those words is read as the header. Nobody is written to."}</p></div>
    ${rows ? `<div class="card rows" id="import-rows">${rows.map((r) => `<div class="row" data-ok="${!r.problems.length}" style="align-items:flex-start"><span class="mid"><span class="strong">${esc(r.name || `Row ${r.row}`)}</span><span class="sub">${esc([r.email, r.pass].filter(Boolean).join(" · ") || "No email, no pass")}</span>${[...r.problems, ...r.notes].map((x) => `<span class="sub" ${r.problems.includes(x) ? 'style="color:var(--text)"' : ""}>${esc(x)}</span>`).join("")}</span><span class="end sub">${r.problems.length ? "Left out" : "Add"}</span></div>`).join("")}</div>
      <div class="stack" style="gap:8px"><button class="btn acc full" data-a="adm-import-do" ${ok.length ? "" : "disabled"}>${ok.length ? `Add ${ok.length} ${ok.length === 1 ? "member" : "members"}` : "Nobody to add"}</button><button class="btn full ghost" data-a="adm-import-reset">Start over</button></div>`
    : `<form class="stack" data-f="aimport"><label class="btn full filebtn" for="mfile">Choose a file</label><input class="sr" type="file" id="mfile" accept=".csv,.txt,text/csv,text/plain" aria-label="Choose a member list"><label class="f">Or paste it here<textarea id="mtext" class="inp" rows="8" placeholder="name,email,pass&#10;Lena Vogt,lena.vogt@example.com,Regular season pass&#10;Tom Iten,tom.iten@example.com,">${esc(a.text || "")}</textarea></label>${a.note ? `<p class="note" id="import-note">${esc(a.note)}</p>` : ""}<button class="btn acc full" type="submit">Read the list</button><p class="sub">In this demo PATH reads .csv and .txt. Spreadsheets come with the real app.</p></form>`}</section>`;
}

/* ---------- Money ---------- */
function vAdminMoney() {
  const T = today(), rank = (i) => (overdue(i) ? 0 : i.status === "open" ? 1 : 2), inv = S.invoices.filter((i) => i.org === S.org).sort((a, b) => rank(a) - rank(b) || a.due - b.due), od = inv.filter(overdue), op = inv.filter((i) => i.status === "open"), todo = od.filter((i) => !i.reminded);
  const row = (i) => `<div class="row" data-inv="${i.id}" style="align-items:flex-start"><span class="mid"><span class="strong">${chf(i.amount)} · ${esc(i.member)}</span><span class="sub">${i.id} · ${esc(i.what)} · due ${fDay(i.due)}${overdue(i) ? ` · overdue by ${Math.round((T - i.due) / 864e5)} days` : ""}</span>${i.reminded && i.status === "open" ? `<span class="sub" data-reminded>Reminder sent ${fDay(i.reminded)}</span>` : ""}${i.status === "paid" ? "" : `<span class="btns" style="margin-top:8px">${overdue(i) ? `<button class="btn sm" data-a="adm-sheet" data-v="amsg|remind|${i.id}" aria-label="${i.reminded ? "See the reminder" : "Remind"}: ${chf(i.amount)}, ${esc(i.member)}">${i.reminded ? "See reminder" : "Remind"}</button>` : ""}<button class="btn sm" data-a="mark-paid" data-v="${i.id}" aria-label="Mark paid: ${chf(i.amount)}, ${esc(i.member)}">Mark paid</button></span>`}</span>${i.status === "paid" ? pill("Paid") : ""}</div>`;
  return `<section class="pad stack-l" id="admin-money"><div><h1 class="h1">Money</h1><p class="sub" style="margin-top:4px" id="money-answer">${op.length} open${od.length ? `, ${od.length} of them overdue (${chf(od.reduce((n, i) => n + i.amount, 0))})` : ""}, ${inv.length - op.length} paid.</p></div>
    ${todo.length ? `<button class="btn acc full" data-a="adm-view" data-v="reminders">Review ${todo.length} drafted ${todo.length === 1 ? "reminder" : "reminders"}</button>` : ""}
    <div class="stack"><div class="eyebrow">Invoices</div>${inv.length ? `<div class="card rows" id="invoice-list">${inv.map(row).join("")}</div>` : `<p class="sub">No invoices at this club.</p>`}${demoNote("The other members' invoices are invented.")}</div>
    <div class="stack"><div class="eyebrow">Audit log</div>${clubAudit().length ? `<div class="card rows" id="audit">${clubAudit().map((a) => `<div class="row"><span class="mid"><span>${esc(a.what)}</span><span class="sub">${fDay(a.at)} ${fTime(a.at)} · Admin</span></span></div>`).join("")}</div>` : `<p class="sub">Overrides, credit changes, messages and manual payments are recorded here.</p>`}</div></section>`;
}
/* All overdue reminders at once: every draft is on the screen, each can be changed or left out, and one tap approves the rest. */
function vAdminReminders() {
  const a = adm(), od = S.invoices.filter((i) => i.org === S.org && overdue(i) && !i.reminded), off = a.skip || {}, n = od.filter((i) => !off[i.id]).length;
  return `<section class="pad stack-l" id="admin-reminders">${backTo("Money")}<div><div class="eyebrow">Payment reminders</div><h1 class="h1">${od.length ? `${od.length} drafted, none sent` : "No reminder is waiting"}</h1><p class="sub" style="margin-top:4px">${od.length ? "PATH drafted one for every overdue invoice. Read them, change any word, switch off the ones you want to keep back." : "Every overdue invoice has been reminded."}</p></div>
    ${od.length ? `<form class="stack" data-f="areminders" novalidate>${od.map((i) => `<div class="card stack" data-remind="${i.id}" style="gap:8px">${sw(!off[i.id], "adm-skip", i.id, `${esc(i.member)} · ${chf(i.amount)}`, `${i.id} · due ${fDay(i.due)}, ${Math.round((today() - i.due) / 864e5)} days ago`, false)}<label class="f"><span class="sr">Reminder to ${esc(i.member)}</span><textarea class="inp" rows="5" maxlength="800" data-rid="${i.id}" ${off[i.id] ? "disabled" : ""}>${esc((a.texts || {})[i.id] ?? draftReminder(i))}</textarea></label></div>`).join("")}
      <p class="sub">Drafted by PATH. Nothing is sent until you approve it. Demo: no real message leaves PATH.</p>
      <button class="btn acc full" type="submit" ${n ? "" : "disabled"}>${n ? `Approve and send ${n} ${n === 1 ? "reminder" : "reminders"}` : "Nothing selected"}</button></form>` : ""}</section>`;
}
function vAdminProducts() { const o = ORGS[S.org]; return `<section class="pad stack-l"><h1 class="h1">Products</h1><div class="card rows">${o.products.map((p) => `<div class="row"><span class="mid"><span class="strong">${esc(p.name)}</span><span class="sub">${esc(p.rule)}</span></span><span class="mono strong">${chf(p.price)}</span></div>`).join("")}</div></section>`; }

function vAdmin() {
  const t = S.tab.admin, v = adm().view;
  if (v === "rules" && t === "dash") return vAdminRules();
  if (v === "import" && t === "members") return vAdminImport();
  if (v === "reminders" && t === "money") return vAdminReminders();
  return { dash: vAdminHome, sched: vAdminSched, members: vAdminMembers, products: vAdminProducts, money: vAdminMoney }[t]();
}

/* ---------- actions ---------- */
const ADMIN_ACT = {
  "adm-view": (v) => { Object.assign(adm(), { view: v || null, error: "", form: null, rows: null, note: "", text: "", skip: {}, texts: {} }); lastKey = ""; },
  "adm-allrisk": () => { adm().allRisk = !adm().allRisk; },
  "adm-sheet": (v) => { const [type, a, b] = v.split("|"); UI.sheet = type === "asess" ? { type, sid: a } : type === "amsg" ? { type, kind: a, id: b } : { type }; },
  "adm-cancel-ask": (v) => { UI.sheet = { type: "asess", sid: v, confirm: true }; },
  "adm-cancel-yes": (v) => { UI.toast = cancelSession(v).msg; UI.sheet = null; },
  "adm-skip": (v) => { const a = adm(); keepReminderTexts(); (a.skip ||= {})[v] = !a.skip[v]; },
  "adm-import-do": () => { const a = adm(), r = importMembers(S.org, a.rows || []); UI.toast = r.msg; if (r.ok) Object.assign(a, { view: null, rows: null, text: "", note: "" }); lastKey = ""; },
  "adm-import-reset": () => { Object.assign(adm(), { rows: null, note: "" }); },
};
/* What the admin typed into the drafts survives a redraw of the list. */
function keepReminderTexts() { const a = adm(); a.texts ||= {}; document.querySelectorAll("#admin-reminders textarea[data-rid]").forEach((t) => { a.texts[t.dataset.rid] = t.value; }); }
const ADMIN_FORMS = ["arules", "asess", "aadd", "amsg", "aimport", "areminders"];
document.addEventListener("submit", (e) => {
  const f = e.target.dataset.f; if (!ADMIN_FORMS.includes(f)) return; e.preventDefault();
  const val = (id) => (document.getElementById(id) || {}).value, a = adm(); UI.toast = "";
  if (f === "arules") {
    a.form = { opensDays: val("r-opens"), cancelHours: val("r-cancel"), lateCancel: val("r-late"), maxDay: val("r-day"), maxWeek: val("r-week"), waitlistMode: val("r-wl"), holdHours: val("r-hold") };
    const r = setRules(S.org, a.form);
    if (r.ok) { UI.toast = r.msg; Object.assign(a, { view: null, form: null, error: "" }); lastKey = ""; } else a.error = r.msg;
  }
  if (f === "asess") {
    const r = editSession(e.target.dataset.id, { time: val("e-time"), cap: val("e-cap"), coach: val("e-coach") }, val("e-scope"));
    if (r.ok) { UI.toast = r.msg; UI.sheet = null; } else UI.sheet = { ...UI.sheet, error: r.msg };
  }
  if (f === "aadd") {
    const form = { off: val("a-off"), date: val("a-date"), time: val("a-time"), cap: val("a-cap") }, r = addSession(S.org, form.off, form.date, form.time, form.cap);
    if (r.ok) { UI.toast = r.msg; UI.sheet = null; } else UI.sheet = { type: "aadd", form, error: r.msg };
  }
  if (f === "amsg") {
    const sh = UI.sheet, text = val("msg-text"), risk = sh.kind === "risk", m = risk ? members(S.org).find((x) => x.id === sh.id) : null, inv = risk ? null : S.invoices.find((x) => x.id === sh.id);
    const r = sendApproved(S.org, risk ? m.name : inv.member, risk ? "checkin" : "reminder", text, risk ? null : inv.id);
    if (r.ok) { UI.toast = r.msg; UI.sheet = null; } else UI.sheet = { ...sh, text, error: r.msg };
  }
  if (f === "aimport") {
    a.text = val("mtext") || ""; const rows = parseMembersCsv(a.text, S.org);
    if (!rows.length) a.note = "PATH found nobody in that. Put one member on each line: name, email, pass."; else { a.rows = rows; a.note = ""; }
    lastKey = "";
  }
  if (f === "areminders") {
    keepReminderTexts(); let n = 0, bad = "";
    for (const i of S.invoices.filter((x) => x.org === S.org && overdue(x) && !x.reminded)) { if ((a.skip || {})[i.id]) continue; const r = sendApproved(S.org, i.member, "reminder", a.texts[i.id] ?? draftReminder(i), i.id); if (r.ok) n++; else bad = `${i.member}: ${r.msg}`; }
    UI.toast = bad ? `${n} sent. ${bad}` : `${n} ${n === 1 ? "reminder" : "reminders"} sent, each as you approved it. Demo: no real message leaves PATH.`;
    if (!bad) Object.assign(a, { view: null, skip: {}, texts: {} }); lastKey = "";
  }
  render();
});
document.addEventListener("change", (e) => {
  if (e.target.id !== "mfile" || !e.target.files[0]) return; const file = e.target.files[0], a = adm(); a.text = (document.getElementById("mtext") || {}).value || "";
  if (!/\.(csv|txt)$/i.test(file.name) && !file.type.startsWith("text/")) { a.note = `"${file.name}" is not a text file. In this demo PATH reads .csv and .txt.`; render(); return; }
  file.text().then((t) => { a.text = t.slice(0, 60000); a.note = `Read "${file.name}". Check it below, then tap Read the list.`; render(); });
});
