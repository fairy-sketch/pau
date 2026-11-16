/**
 * The app's photography, in one place.
 *
 * These twelve photos are the ONLY imagery in the app. To swap a photo, change
 * the file in /public/images or the mapping below. A club can later override
 * its own sport photos by passing `overrides` to `imageForSport` (stored as an
 * organisation setting); nothing else in the code needs to change.
 *
 * Rules (docs/decisions.md, "Photography"): at most one photo per screen, shown
 * muted, never with text on a busy area.
 */

export interface AppImage {
  src: string;
  width: number;
  height: number;
  /** CSS object-position that keeps the subject in frame when the photo is cropped. */
  focus: string;
}

const image = (file: string, width: number, height: number, focus = "50% 50%"): AppImage => ({
  src: `/images/${file}`,
  width,
  height,
  focus,
});

export const images = {
  heroTrackRunner: image("hero-track-runner-silhouette.jpg", 2000, 1333, "30% 40%"),
  heroCyclist: image("hero-cyclist-mountain-path.jpg", 1333, 2000, "50% 60%"),
  heroPilatesStudio: image("hero-pilates-studio.jpg", 1333, 2000, "50% 70%"),
  classYoga: image("class-yoga-window.jpg", 2000, 1333, "60% 50%"),
  classGym: image("class-gym-barbell.jpg", 2000, 1333, "55% 55%"),
  classSwimming: image("class-swimmer-underwater.jpg", 2000, 1500, "75% 65%"),
  classClimbing: image("class-climber-indoor.jpg", 2000, 1333, "80% 45%"),
  classTennis: image("class-tennis-courts-empty.jpg", 2000, 1333, "45% 60%"),
  classFootball: image("class-football-pitch-aerial.jpg", 2000, 1125, "50% 50%"),
  textureChalk: image("texture-chalk-hands.jpg", 1333, 2000, "50% 60%"),
  texturePool: image("texture-pool-lane.jpg", 2000, 1500, "50% 50%"),
  textureTrack: image("texture-track-lanes.jpg", 2000, 1333, "50% 50%"),
} as const satisfies Record<string, AppImage>;

/** Sports the app has a photo for. Everything else falls back to `defaultSportImage`. */
export type Sport =
  | "yoga"
  | "gym"
  | "swimming"
  | "climbing"
  | "tennis"
  | "football"
  | "pilates"
  | "running"
  | "cycling";

/** Class and session cards: one photo per sport. */
export const sportImages: Record<Sport, AppImage> = {
  yoga: images.classYoga,
  gym: images.classGym,
  swimming: images.classSwimming,
  climbing: images.classClimbing,
  tennis: images.classTennis,
  football: images.classFootball,
  // There is no class-* photo for these three yet, so they borrow a hero or texture.
  pilates: images.heroPilatesStudio,
  running: images.textureTrack,
  cycling: images.heroCyclist,
};

export const defaultSportImage: AppImage = images.textureChalk;

/** Other words an offering might use for a sport we have a photo for. */
const aliases: Record<string, Sport> = {
  strength: "gym",
  hiit: "gym",
  crossfit: "gym",
  weights: "gym",
  swim: "swimming",
  bouldering: "climbing",
  soccer: "football",
  mobility: "pilates",
  athletics: "running",
  track: "running",
  run: "running",
  ride: "cycling",
  spinning: "cycling",
  bike: "cycling",
};

export function normaliseSport(sport: string): Sport | undefined {
  const key = sport.trim().toLowerCase();
  if (key in sportImages) return key as Sport;
  return aliases[key];
}

/** The photo for a class or session card. `overrides` is a club's own mapping, if it has one. */
export function imageForSport(
  sport: string,
  overrides: Partial<Record<Sport, AppImage>> = {},
): AppImage {
  const known = normaliseSport(sport);
  if (!known) return defaultSportImage;
  return overrides[known] ?? sportImages[known];
}

/** Path hero behind the goal, chosen by the goal's sport. */
export const heroImages: { default: AppImage; bySport: Partial<Record<Sport, AppImage>> } = {
  default: images.heroTrackRunner,
  bySport: {
    running: images.heroTrackRunner,
    cycling: images.heroCyclist,
    pilates: images.heroPilatesStudio,
    yoga: images.heroPilatesStudio,
  },
};

export function heroForSport(sport?: string): AppImage {
  const known = sport ? normaliseSport(sport) : undefined;
  return (known && heroImages.bySport[known]) || heroImages.default;
}

/** Onboarding screens, in order. One per screen. */
export const onboardingImages: AppImage[] = [
  images.heroTrackRunner,
  images.heroCyclist,
  images.heroPilatesStudio,
];

/** Subtle backgrounds and empty states. */
export const textureImages = {
  default: images.textureChalk,
  water: images.texturePool,
  track: images.textureTrack,
} as const;
