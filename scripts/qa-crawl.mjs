// QA crawler for the PATH demo: every role, tab and club; every button one click deep.
// Usage: node scripts/qa-crawl.mjs [width=390] [click|static] [axe]
// Reports script errors, dead buttons, overflow, cut-off text, small tap targets, missing names, and axe violations.
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const W = Number(process.argv[2] || 390),
  CLICK = process.argv[3] !== "static",
  AXE = process.argv[4] === "axe";
const TABS = {
  athlete: ["path", "week", "explore", "coach", "me", "log"],
  coach: ["today", "week", "athletes", "plans", "review", "alerts"],
  admin: ["dash", "sched", "members", "products", "money"],
};
const b = await chromium.launch();
const c = await b.newContext({
  viewport: { width: W, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
  timezoneId: "Europe/Zurich",
  locale: "en-GB",
});
const p = await c.newPage();
let errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => {
  if (m.type() === "error" && !/styles\.css|ERR_FAILED/.test(m.text()))
    errs.push("console: " + m.text());
}); // axe reads the stylesheet over XHR, which a file:// page refuses: not the app's error
await p.clock.setFixedTime(new Date("2026-11-16T12:00:00+01:00"));
await p.goto(new URL("../prototype/index.html", import.meta.url).href);
await p.waitForTimeout(500);
const SNAP = await p.evaluate(() => localStorage.getItem(window.PATH_DEMO.STORE_KEY));
const restore = (role, tab, org) =>
  p.evaluate(
    ([snap, role, tab, org]) => {
      const d = window.PATH_DEMO;
      localStorage.setItem(d.STORE_KEY, snap);
      d.load();
      const S = d.state;
      S.role = role;
      S.org = org;
      S.tab[role] = tab;
      S.banner = false;
      Object.assign(d.ui, { sheet: null, toast: "", undo: null, resetArmed: false });
      d.render();
      document.getElementById("view").scrollTop = 0;
    },
    [SNAP, role, tab, org],
  );
const audit = () =>
  p.evaluate(() => {
    const out = [],
      vw = document.documentElement.clientWidth, // not innerWidth: a phone widens that to fit a page that is too wide
      desc = (el) =>
        `${el.tagName.toLowerCase()}${el.dataset.a ? "[" + el.dataset.a + "]" : ""}${el.id ? "#" + el.id : ""} "${(el.getAttribute("aria-label") || el.innerText || el.placeholder || "").replace(/\s+/g, " ").trim().slice(0, 40)}"`;
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
    };
    const inScroller = (el) => {
      for (let n = el.parentElement; n; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (
          (s.overflowX === "auto" || s.overflowX === "scroll") &&
          n.scrollWidth > n.clientWidth + 1
        )
          return true;
      }
      return false;
    };
    if (document.documentElement.scrollWidth > vw + 1)
      out.push(["page-overflow", `page is ${document.documentElement.scrollWidth}px wide`]);
    const root = document.querySelector(".sheet") || document.getElementById("app");
    for (const el of root.querySelectorAll("*")) {
      if (!vis(el) || el.closest(".sr")) continue;
      const r = el.getBoundingClientRect(),
        cs = getComputedStyle(el);
      if ((r.right > vw + 1 || r.left < -1) && !inScroller(el) && el.children.length === 0)
        out.push(["off-screen", desc(el)]);
      if (
        el.children.length === 0 &&
        el.innerText &&
        el.scrollWidth > el.clientWidth + 1 &&
        (cs.overflowX === "hidden" || cs.textOverflow === "ellipsis") &&
        cs.display !== "inline"
      )
        out.push(["cut-off", desc(el)]);
      if (
        /^(INPUT|TEXTAREA)$/.test(el.tagName) &&
        el.type !== "file" &&
        el.value &&
        el.scrollWidth > el.clientWidth + 2 &&
        el.tagName === "INPUT"
      )
        out.push(["cut-off-input", desc(el)]);
    }
    for (const el of root.querySelectorAll(
      "button, a[href], input, select, textarea, summary, [role=button], label.btn",
    )) {
      if (!vis(el) || el.closest(".sr") || el.classList.contains("sr")) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 43.5 || r.height < 43.5)
        out.push(["small-target", `${desc(el)} ${Math.round(r.width)}x${Math.round(r.height)}`]);
      const name =
        (el.getAttribute("aria-label") || el.innerText || el.getAttribute("title") || "").trim() ||
        (el.labels && el.labels.length ? "x" : "") ||
        (el.getAttribute("aria-labelledby") ? "x" : "");
      if (!name) out.push(["no-name", desc(el)]);
    }
    for (const img of root.querySelectorAll("img"))
      if (vis(img) && img.getAttribute("alt") == null)
        out.push(["img-no-alt", img.getAttribute("src")]);
    for (const img of root.querySelectorAll("img"))
      if (
        vis(img) &&
        ((img.getAttribute("src") && img.complete && img.naturalWidth === 0) ||
          (window.PATH_DEMO.PHOTOS[img.dataset.photo] || {}).state === "failed")
      )
        out.push(["img-broken", img.dataset.photo || img.getAttribute("src")]); // a photo without src is still on its way: the app fetches photos itself
    return out;
  });
const sig = () =>
  p.evaluate(() => {
    const d = window.PATH_DEMO;
    return (
      document.getElementById("app").innerHTML.length +
      "|" +
      JSON.stringify(d.state).length +
      "|" +
      document.getElementById("app").innerText.length +
      "|" +
      JSON.stringify([
        d.state.role,
        d.state.org,
        d.state.tab,
        d.ui.sheet && d.ui.sheet.type,
        d.ui.toast,
      ])
    );
  });
const found = new Map();
const add = (type, where, what) => {
  const k = type + " | " + what;
  if (!found.has(k)) found.set(k, new Set());
  found.get(k).add(where);
};
let clicks = 0,
  states = 0;
const axed = new Set();
const axe = async (where) => {
  if (!AXE) return;
  const key = await p.evaluate(
    () =>
      (document.querySelector(".sheet")
        ? "sheet:" + (document.querySelector(".sheet").getAttribute("aria-label") || "")
        : "") + document.getElementById("view").innerText.slice(0, 60),
  );
  if (axed.has(where.split(">")[0] + key)) return;
  axed.add(where.split(">")[0] + key);
  const r = await new AxeBuilder({ page: p })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  for (const v of r.violations)
    add(
      "axe:" + v.id,
      where,
      v.nodes
        .slice(0, 2)
        .map((n) => n.target.join(" "))
        .join(" ; ")
        .slice(0, 110),
    );
};
for (const org of ["pau", "studio"])
  for (const role of Object.keys(TABS))
    for (const tab of TABS[role]) {
      const where = `${org}/${role}/${tab}`;
      await restore(role, tab, org);
      await p.waitForTimeout(30);
      states++;
      for (const [t, w] of await audit()) add(t, where, w);
      if (errs.length) {
        for (const e of errs) add("js-error", where, e.slice(0, 120));
        errs = [];
      }
      await axe(where);
      if (!CLICK) continue;
      const n = await p.evaluate(
        () =>
          [...document.querySelectorAll("#app button, #app summary, #app label.btn")].filter(
            (el) => !el.disabled && el.getBoundingClientRect().width > 0,
          ).length,
      );
      for (let i = 0; i < n; i++) {
        await restore(role, tab, org);
        const before = await sig();
        const info = await p.evaluate((i) => {
          const els = [
              ...document.querySelectorAll("#app button, #app summary, #app label.btn"),
            ].filter((el) => !el.disabled && el.getBoundingClientRect().width > 0),
            el = els[i];
          if (!el) return null;
          const d = `${el.dataset.a || el.tagName.toLowerCase()}:${(el.getAttribute("aria-label") || el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 36)}`;
          const pressed =
            el.getAttribute("aria-pressed") === "true" ||
            el.getAttribute("aria-current") === "page" ||
            el.getAttribute("aria-current") === "true";
          if (el.tagName === "LABEL") return { d, skip: true };
          el.scrollIntoView({ block: "center" });
          el.click();
          return { d, pressed };
        }, i);
        if (!info || info.skip) continue;
        clicks++;
        await p.waitForTimeout(25);
        const after = await sig();
        const w2 = `${where}>${info.d}`;
        if (errs.length) {
          for (const e of errs) add("js-error", w2, e.slice(0, 140));
          errs = [];
        }
        if (before === after && !info.pressed) add("no-effect", where, info.d);
        for (const [t, w] of await audit()) add(t, w2, w);
        states++;
        await axe(w2);
      }
    }
const lines = [...found.entries()]
  .map(
    ([k, set]) =>
      `${k}  @ ${[...set].slice(0, 3).join(", ")}${set.size > 3 ? ` (+${set.size - 3})` : ""}`,
  )
  .sort();
console.log(`width ${W}: ${states} states, ${clicks} clicks, ${lines.length} distinct findings`);
console.log(lines.join("\n"));
await b.close();
