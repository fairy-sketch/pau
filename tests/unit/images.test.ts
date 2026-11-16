import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  defaultSportImage,
  heroForSport,
  imageForSport,
  images,
  onboardingImages,
  sportImages,
  textureImages,
} from "@/src/config/images";

const DIR = join("public", "images");
const onDisk = readdirSync(DIR).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f));

/** Width and height from a JPEG's SOF marker. */
function jpegSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  let i = 2;
  while (i < buf.length) {
    const marker = buf[i + 1]!;
    const length = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + length;
  }
  throw new Error(`No size found in ${path}`);
}

describe("photography config", () => {
  it("lists every photo in public/images, and nothing that is not there", () => {
    const configured = Object.values(images)
      .map((i) => i.src.replace("/images/", ""))
      .sort();
    expect(configured).toEqual([...onDisk].sort());
    expect(onDisk).toHaveLength(12);
  });

  it("records the real pixel size of each file", () => {
    for (const img of Object.values(images)) {
      const file = join("public", img.src);
      expect(existsSync(file), file).toBe(true);
      expect(jpegSize(file), img.src).toEqual({ width: img.width, height: img.height });
    }
  });

  it("follows the naming rule: hero-, class- and texture- files only", () => {
    for (const file of onDisk) expect(file).toMatch(/^(hero|class|texture)-[a-z-]+\.jpg$/);
  });

  it("matches class cards to the sport", () => {
    expect(imageForSport("yoga").src).toContain("class-yoga");
    expect(imageForSport("Gym").src).toContain("class-gym");
    expect(imageForSport("swimming").src).toContain("class-swimmer");
    expect(imageForSport("climbing").src).toContain("class-climber");
    expect(imageForSport("tennis").src).toContain("class-tennis");
    expect(imageForSport("football").src).toContain("class-football");
    expect(imageForSport("pilates").src).toContain("pilates");
  });

  it("understands other names for a sport, and falls back for unknown ones", () => {
    expect(imageForSport("HIIT")).toBe(sportImages.gym);
    expect(imageForSport("bouldering")).toBe(sportImages.climbing);
    expect(imageForSport(" Track ")).toBe(sportImages.running);
    expect(imageForSport("underwater rugby")).toBe(defaultSportImage);
  });

  it("lets a club swap a sport's photo without touching code", () => {
    const own = { ...images.textureChalk, src: "/images/club-own.jpg" };
    expect(imageForSport("yoga", { yoga: own })).toBe(own);
    expect(imageForSport("gym", { yoga: own })).toBe(sportImages.gym);
  });

  it("uses hero files for the Path and onboarding, and texture files for textures", () => {
    expect(heroForSport("running").src).toContain("/hero-");
    expect(heroForSport("cycling").src).toContain("hero-cyclist");
    expect(heroForSport(undefined).src).toContain("/hero-");
    for (const img of onboardingImages) expect(img.src).toContain("/hero-");
    for (const img of Object.values(textureImages)) expect(img.src).toContain("/texture-");
  });

  it("keeps photos out of the code: only the config file names image files", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, name.name);
        if (name.isDirectory()) walk(path);
        else if (/\.(ts|tsx|css)$/.test(name.name) && path !== join("src", "config", "images.ts")) {
          if (/\/images\/[\w-]+\.(jpe?g|png|webp)/.test(readFileSync(path, "utf8")))
            offenders.push(path);
        }
      }
    };
    walk("app");
    walk("src");
    expect(offenders).toEqual([]);
  });
});
