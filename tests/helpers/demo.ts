/* eslint-disable @typescript-eslint/no-explicit-any -- the demo is plain browser JS; its test hook (window.PATH_DEMO) has no types. */
import path from "node:path";
import { pathToFileURL } from "node:url";

import { expect, type Page } from "@playwright/test";

/**
 * Shared by the clickable-demo tests. The demo is opened from disk, on a phone profile, in Europe/Zurich,
 * at a fixed time: Monday 16 November 2026, 12:00.
 */
export const DEMO = pathToFileURL(path.resolve(process.cwd(), "prototype/index.html")).href;
export const NOW = new Date("2026-11-16T12:00:00+01:00");
export const minutesLater = (n: number) => new Date(NOW.getTime() + n * 60_000);
export const at = (iso: string) => new Date(`${iso}:00+01:00`);

declare global {
  interface Window {
    PATH_DEMO: any;
  }
}

export async function open(page: Page) {
  await page.clock.setFixedTime(NOW);
  await page.goto(DEMO);
  await expect(page.getByRole("navigation", { name: "Sections" })).toBeVisible();
}
export const tab = (page: Page, name: string) =>
  page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name }).click();
export const asRole = (page: Page, role: "athlete" | "coach" | "admin") =>
  page.getByLabel("View as").selectOption(role);
export const atClub = (page: Page, club: "pau" | "studio") =>
  page.getByLabel("Club").selectOption(club);
export async function say(page: Page, text: string) {
  await page.getByLabel("Message your coach").fill(text);
  await page.getByRole("button", { name: "Send message" }).click();
}
export const cards = (page: Page) => page.locator("[data-prop]");
export const lastCard = (page: Page) => cards(page).last();
/** The message that confirms an action (the week label in Week is a live region too, so this is addressed by class). */
export const toast = (page: Page) => page.locator(".toast");
/** A day button in the Week strip, by its full date ("Thu 19 Nov"). */
export const day = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
/** Opens the session sheet for a session id from the day list or the featured card. */
export const openSession = (page: Page, sid: string) =>
  page.locator(`#weekpane [data-a="sheet"][data-v="${sid}"]`).first().click();
/** Saves the log form. (The name is kept from the time this was a hold button.) */
export async function logWithKeyboard(page: Page) {
  await page.getByRole("button", { name: "Save", exact: true }).click();
}
/** The pass balance as each screen prints it. */
export async function passOn(page: Page, tabs: string[]) {
  const out: Record<string, string | null> = {};
  for (const t of tabs) {
    await tab(page, t);
    out[t] = await page.locator('#view [data-pass="p-pau"]').first().getAttribute("data-text");
  }
  return out;
}
