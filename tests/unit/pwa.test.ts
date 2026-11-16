import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_NAME } from "@/src/config/app";
import { buildManifest } from "@/src/pwa/manifest";
import { parseServerEnv } from "@/src/server/env";

/** Width and height from a PNG's IHDR chunk. */
function pngSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  expect(buf.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("PWA installability", () => {
  const manifest = buildManifest({ name: APP_NAME, description: "d", lang: "en-CH" });

  it("has the fields browsers require to offer installation", () => {
    expect(manifest.name).toBe(APP_NAME);
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(["standalone", "fullscreen", "minimal-ui"]).toContain(manifest.display);
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/);
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("ships 192 px and 512 px icons plus a maskable one, at their declared sizes", () => {
    const icons = manifest.icons ?? [];
    const sizes = icons.filter((i) => i.purpose === "any").map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect(icons.some((i) => i.purpose === "maskable")).toBe(true);

    for (const icon of icons) {
      const file = join("public", icon.src);
      expect(existsSync(file), file).toBe(true);
      const { width, height } = pngSize(file);
      expect(`${width}x${height}`).toBe(icon.sizes);
    }
  });

  it("ships an Apple touch icon for iOS home screens", () => {
    expect(pngSize(join("public", "icons", "apple-touch-icon.png"))).toEqual({
      width: 180,
      height: 180,
    });
  });

  it("has a service worker source with an offline fallback", () => {
    const sw = readFileSync(join("app", "sw.ts"), "utf8");
    expect(sw).toContain("addEventListeners()");
    expect(sw).toContain('url: "/offline"');
    expect(existsSync(join("app", "offline", "page.tsx"))).toBe(true);
  });
});

describe("server environment", () => {
  it("defaults to the local Supabase database", () => {
    expect(parseServerEnv({}).DATABASE_URL).toContain("127.0.0.1:54322");
  });

  it("rejects invalid values with a readable error", () => {
    expect(() => parseServerEnv({ JOBS_POLL_SECONDS: "soon" })).toThrow(/Invalid environment/);
  });
});
