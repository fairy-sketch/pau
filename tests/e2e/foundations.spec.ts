import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("styleguide", () => {
  test("shows tokens, type, the stage track and a chart sample", async ({ page }) => {
    await page.goto("/styleguide");

    await expect(page.getByRole("heading", { level: 1, name: "Styleguide" })).toBeVisible();
    for (const section of ["Colour", "Type", "Stage track", "Chart"]) {
      await expect(page.getByRole("heading", { level: 2, name: section })).toBeVisible();
    }

    // Tokens: exactly one accent is listed.
    await expect(page.getByText("accent", { exact: true })).toHaveCount(1);
    await expect(page.getByText("canvas", { exact: true })).toBeVisible();

    // Stage track: five stages, the second one current.
    const track = page.getByRole("list", { name: "Stages towards your goal" }).first();
    await expect(track.getByRole("listitem")).toHaveCount(5);
    await expect(track.locator('[aria-current="step"]')).toContainText("Build");
    await expect(page.getByText("12 days left").first()).toBeVisible();
    // Steps: the current stage is a ring that is partly closed.
    const ring = page.locator("[data-stage-ring]").first();
    const offset = Number(await ring.getAttribute("stroke-dashoffset"));
    const full = Number(await ring.getAttribute("stroke-dasharray"));
    expect(offset).toBeGreaterThan(0);
    expect(offset).toBeLessThan(full);

    // Chart: the SVG line is drawn, and the same data exists as a table.
    await expect(page.locator("[data-chart] svg path.recharts-line-curve")).toBeVisible();
    await expect(page.getByRole("table", { name: "Weekly load" }).getByRole("row")).toHaveCount(13);
  });

  test("uses the design tokens: fonts, soft corners, light canvas, one sage accent", async ({
    page,
  }) => {
    await page.goto("/styleguide");
    await page.evaluate(() => document.fonts.ready);

    const style = (selector: string, prop: string) =>
      page.evaluate(
        ([s, p]) => getComputedStyle(document.querySelector(s!)!).getPropertyValue(p!),
        [selector, prop],
      );

    expect(await style("h1", "font-family")).toContain("Satoshi");
    expect(await style("body", "font-family")).toContain("Switzer");
    expect(await style("body", "background-color")).toBe("rgb(241, 239, 234)");
    expect(await style("body", "color")).toBe("rgb(28, 25, 22)");
    // Sentence case everywhere except the tiny mono labels.
    expect(await style("h1", "text-transform")).toBe("none");
    expect(await style(".type-label", "text-transform")).toBe("uppercase");
    expect(await style(".type-label", "font-family")).toContain("JetBrains Mono");

    const loaded = await page.evaluate(() =>
      [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family),
    );
    for (const family of ["Satoshi", "Switzer", "JetBrains Mono"]) {
      expect(loaded.join(" ")).toContain(family);
    }

    const button = page.getByRole("button", { name: "Book", exact: true }).first();
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    await expect(button).toHaveCSS("border-radius", "12px");
    await expect(button).toHaveCSS("background-color", "rgb(142, 154, 128)");
    await expect(button).toHaveCSS("text-transform", "none");
  });

  test("fits a phone without sideways page scroll, with 24 px screen padding", async ({ page }) => {
    await page.goto("/styleguide");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const padding = await page.evaluate(
      () => getComputedStyle(document.querySelector("main")!).paddingLeft,
    );
    expect(parseFloat(padding)).toBeGreaterThanOrEqual(24);
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

  test("toggles switch on and off, and tabs mark the current one", async ({ page }) => {
    await page.goto("/styleguide");
    const pain = page.getByRole("switch", { name: /Pain flags/ });
    await expect(pain).toHaveAttribute("aria-checked", "false");
    await pain.click();
    await expect(pain).toHaveAttribute("aria-checked", "true");

    const nav = page.getByRole("navigation", { name: "Sections" });
    await expect(nav.getByRole("link")).toHaveCount(5);
    await expect(nav.locator('[aria-current="page"]')).toHaveText("Path");
    await expect(nav.locator("svg[data-icon]")).toHaveCount(5);

    // Our own icon set: all 36 are shown, drawn as lines in the text colour.
    const icons = page.locator("[data-icon-group] svg[data-icon]");
    await expect(icons).toHaveCount(36);
    await expect(icons.first()).toHaveCSS("fill", "none");
    await expect(icons.first()).toHaveCSS("stroke", "rgb(28, 25, 22)");
  });
});

test.describe("photography", () => {
  test("class card: responsive next/image, muted, with all text below the photo", async ({
    page,
  }) => {
    await page.goto("/styleguide");
    const card = page.locator("[data-class-card]").first();
    await card.scrollIntoViewIfNeeded();
    const img = card.locator("img");

    await expect(img).toHaveAttribute(
      "src",
      /\/_next\/image\?url=%2Fimages%2Fclass-yoga-window\.jpg/,
    );
    await expect(img).toHaveAttribute("srcset", /\b\d+w\b/);
    await expect(img).toHaveAttribute("sizes", /100vw/);
    await expect(img).toHaveAttribute("alt", "");
    expect(await img.evaluate((el) => getComputedStyle(el).filter)).toContain("saturate(0.6)");
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
      .toBe(true);

    // The served file is sized for the screen, not the 2000 px original.
    const served = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
    expect(served).toBeLessThan(2000);

    const photo = await img.boundingBox();
    const title = await card.getByText("Yoga flow").boundingBox();
    expect(title!.y).toBeGreaterThanOrEqual(photo!.y + photo!.height);
  });

  test("hero fades into the page and the goal sits below the picture", async ({ page }) => {
    await page.goto("/styleguide");
    const hero = page.locator('[data-hero="hero"]').first();
    await hero.scrollIntoViewIfNeeded();
    const fade = await hero.locator("div").evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(fade).toContain("linear-gradient");
    const box = await hero.boundingBox();
    const goal = await hero.locator("xpath=following-sibling::div").locator("p").boundingBox();
    // The headline starts in the lowest part of the fade, where the photo is already gone.
    expect(goal!.y).toBeGreaterThan(box!.y + box!.height * 0.85);
  });

  test("texture stays faint behind an empty state", async ({ page }) => {
    await page.goto("/styleguide");
    const img = page.locator("[data-texture] img");
    expect(Number(await img.evaluate((el) => getComputedStyle(el).opacity))).toBeLessThanOrEqual(
      0.2,
    );
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
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f1efea");

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
    await expect(page.getByRole("heading", { level: 1, name: "You're offline" })).toBeVisible();
    await context.setOffline(false);
  });
});
