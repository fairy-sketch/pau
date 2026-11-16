import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type AppImage,
  communityImages,
  fallbackSportImage,
  heroForSport,
  heroImages,
  imageForSport,
  images,
  onboardingImages,
  sportImageAlternates,
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
    expect(onDisk).toHaveLength(41);
  });

  it("records the real pixel size of each file", () => {
    for (const img of Object.values(images)) {
      const file = join("public", img.src);
      expect(existsSync(file), file).toBe(true);
      expect(jpegSize(file), img.src).toEqual({ width: img.width, height: img.height });
    }
  });

  it("follows the naming rule: hero-, class-, people-, moment- and texture- files only", () => {
    for (const file of onDisk) {
      expect(file).toMatch(/^(hero|class|people|moment|texture)-[a-z-]+\.jpg$/);
    }
  });

  it("gives every photo a job, so none sits unused", () => {
    const used = new Set<AppImage>([
      ...Object.values(sportImages),
      ...Object.values(sportImageAlternates).flat(),
      fallbackSportImage,
      heroImages.default,
      ...Object.values(heroImages.bySport),
      ...onboardingImages,
      ...communityImages.feed,
      communityImages.emptyState,
      communityImages.restDay,
      ...Object.values(textureImages),
    ]);
    const unused = Object.entries(images)
      .filter(([, img]) => !used.has(img))
      .map(([name]) => name);
    expect(unused).toEqual([]);
  });

  it("matches class cards to the sport, for all twenty sports Ramon listed", () => {
    const expected: Record<string, string> = {
      running: "track-runner",
      gym: "class-gym",
      yoga: "class-yoga",
      pilates: "pilates",
      swimming: "class-swimmer",
      climbing: "class-climber",
      tennis: "class-tennis",
      padel: "class-padel",
      football: "class-football",
      basketball: "class-basketball",
      volleyball: "class-volleyball",
      boxing: "class-boxing",
      rowing: "class-rowing",
      dance: "class-dance",
      CrossFit: "class-crossfit",
      calisthenics: "class-calisthenics",
      skiing: "class-skiing",
      "martial arts": "class-martial-arts",
      "ice hockey": "class-hockey",
      trail: "class-trail",
    };
    for (const [sport, part] of Object.entries(expected)) {
      expect(imageForSport(sport).src, sport).toContain(part);
    }
  });

  it("understands other names for a sport", () => {
    expect(imageForSport("HIIT")).toBe(sportImages.crossfit);
    expect(imageForSport("bouldering")).toBe(sportImages.climbing);
    expect(imageForSport(" Track ")).toBe(sportImages.running);
    expect(imageForSport("Ice_Hockey")).toBe(sportImages["ice-hockey"]);
    expect(imageForSport("trail running")).toBe(sportImages.trail);
  });

  it("falls back to a texture for a sport without a photo", () => {
    expect(imageForSport("underwater rugby")).toBe(fallbackSportImage);
    expect(fallbackSportImage.src).toContain("/texture-");
  });

  it("lets a club swap a sport's photo without touching code", () => {
    const own = sportImageAlternates.skiing![0]!;
    expect(imageForSport("skiing", { skiing: own })).toBe(own);
    expect(imageForSport("gym", { skiing: own })).toBe(sportImages.gym);
  });

  it("keeps each kind of photo in its role", () => {
    expect(heroForSport("running").src).toContain("/hero-");
    expect(heroForSport("cycling").src).toContain("hero-cyclist");
    expect(heroForSport(undefined).src).toContain("/hero-");
    for (const img of communityImages.feed) expect(img.src).toContain("/people-");
    expect(communityImages.emptyState.src).toContain("/moment-");
    for (const img of Object.values(textureImages)) expect(img.src).toContain("/texture-");
    for (const img of onboardingImages) expect(img.src).toMatch(/\/(hero|people|moment)-/);
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
