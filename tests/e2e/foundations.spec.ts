import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("styleguide", () => {
  test("shows tokens, type, the stage track and a chart sample", async ({ page }) => {
    await page.goto("/styleguide");

    await expect(page.getByRole("heading", { level: 1, name: "Styleguide" })).toBeVisible();
    for (const section of ["[01] Colour", "[02] Type", "[05] Stage track", "[06] Chart"]) {
      await expect(page.getByRole("heading", { level: 2, name: section })).toBeVisible();
    }

    // Tokens: the two accents from the brief are listed.
    await expect(page.getByText("accent-signal", { exact: true })).toBeVisible();
    await expect(page.getByText("accent-electric", { exact: true })).toBeVisible();

    // Stage track: five stages, the second one current.
    const track = page.getByRole("group", { name: "Stages towards your goal" }).first();
    await expect(track.getByRole("listitem")).toHaveCount(5);
    await expect(track.locator('[aria-current="step"]')).toContainText("[02] Build");
    await expect(track.locator('[aria-current="step"]')).toContainText("12 days left");

    // Chart: the SVG line is drawn, and the same data exists as a table.
    await expect(page.locator("[data-chart] svg path.recharts-line-curve")).toBeVisible();
    await expect(page.getByRole("table", { name: "Weekly load" }).getByRole("row")).toHaveCount(13);
  });

  test("uses the design tokens: square corners, mono body, heavy italic display", async ({
    page,
  }) => {
    await page.goto("/styleguide");
    await page.evaluate(() => document.fonts.ready);

    const h1 = page.getByRole("heading", { level: 1 });
    const display = await h1.evaluate((el) => {
      const s = getComputedStyle(el);
      return { family: s.fontFamily, weight: s.fontWeight, style: s.fontStyle };
    });
    expect(display.family).toContain("Archivo");
    expect(display.weight).toBe("900");
    expect(display.style).toBe("italic");

    const body = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(body).toContain("JetBrains Mono");

    const loaded = await page.evaluate(() =>
      [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family),
    );
    expect(loaded.join(" ")).toContain("Archivo");
    expect(loaded.join(" ")).toContain("JetBrains Mono");

    const button = page.getByRole("button", { name: "[+] Book" }).first();
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(await button.evaluate((el) => getComputedStyle(el).borderRadius)).toBe("0px");
  });

  test("fits a phone without sideways page scroll", async ({ page }) => {
    await page.goto("/styleguide");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("has no automatically detectable accessibility violations", async ({ page }) => {
    for (const path of ["/", "/styleguide", "/offline"]) {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations, path).toEqual([]);
    }
  });

  test("ticker can be paused and stops for reduced motion", async ({ page }) => {
    await page.goto("/styleguide");
    const trackEl = page.locator("[data-ticker-track]");
    await expect(trackEl).toHaveCSS("animation-name", "ticker");

    await page.getByRole("button", { name: "[II] Pause" }).click();
    await expect(trackEl).toHaveCSS("animation-play-state", "paused");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(trackEl).toHaveCSS("animation-name", "none");
  });
});

test.describe("PWA", () => {
  test("is installable: manifest, icons and an active service worker", async ({
    page,
    request,
  }) => {
    await page.goto("/");

    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(href).toBeTruthy();
    const response = await request.get(href!);
    expect(response.ok()).toBe(true);
    const manifest = await response.json();

    expect(manifest.name).toBeTruthy();
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");

    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    for (const icon of manifest.icons as Array<{ src: string }>) {
      const res = await request.get(icon.src);
      expect(res.ok(), icon.src).toBe(true);
      expect(res.headers()["content-type"]).toContain("image/png");
    }

    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#000000");

    const state = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return { scope: new URL(registration.scope).pathname, active: !!registration.active };
    });
    expect(state).toEqual({ scope: "/", active: true });
  });

  test("shows the offline page when a page cannot be loaded", async ({ page, context }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) =>
          navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }),
        );
      }
    });

    await context.setOffline(true);
    await page.goto("/a-page-never-visited");
    await expect(page.getByRole("heading", { level: 1, name: "Offline" })).toBeVisible();
    await context.setOffline(false);
  });
});
