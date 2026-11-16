/**
 * The app's photography, in one place.
 *
 * The 41 photos in /public/images are the ONLY imagery in the app. To swap a
 * photo, change the file or the mapping below. A club can later override its
 * own sport photos by passing `overrides` to `imageForSport` (stored as an
 * organisation setting); nothing else in the code needs to change.
 *
 * File names say what a photo is for:
 *   hero-*     onboarding and the Path hero behind the goal
 *   class-*    class and session cards, by sport
 *   people-*   community (club feed, club page, onboarding). Not the Coach chat.
 *   moment-*   in-between moments (empty states, onboarding)
 *   texture-*  subtle backgrounds, dividers, empty states, and the fallback
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

  classBasketballAerial: image("class-basketball-aerial.jpg", 2000, 1500, "55% 55%"),
  classBasketballSunset: image("class-basketball-sunset.jpg", 1333, 2000, "60% 30%"),
  classBoxingRing: image("class-boxing-ring.jpg", 2000, 1335, "55% 40%"),
  classBoxingSilhouette: image("class-boxing-silhouette.jpg", 2000, 1333, "35% 45%"),
  classCalisthenics: image("class-calisthenics-sunset.jpg", 2000, 1333, "60% 40%"),
  classClimbing: image("class-climber-indoor.jpg", 2000, 1333, "80% 45%"),
  classCrossfit: image("class-crossfit-ropes.jpg", 1333, 2000, "50% 60%"),
  classDanceStudio: image("class-dance-studio.jpg", 1333, 2000, "50% 75%"),
  classDanceWindow: image("class-dance-window.jpg", 2000, 1333, "60% 55%"),
  classFootball: image("class-football-pitch-aerial.jpg", 2000, 1125, "50% 50%"),
  classGym: image("class-gym-barbell.jpg", 2000, 1333, "55% 55%"),
  classHockeyBacklight: image("class-hockey-backlight.jpg", 2000, 1334, "55% 40%"),
  classHockeyRink: image("class-hockey-rink.jpg", 2000, 1335, "50% 60%"),
  classMartialArts: image("class-martial-arts-pad.jpg", 1333, 2000, "55% 35%"),
  classPadel: image("class-padel-court.jpg", 2000, 1500, "50% 60%"),
  classRowing: image("class-rowing-aerial.jpg", 2000, 1125, "55% 50%"),
  classSkiingAlpine: image("class-skiing-alpine.jpg", 1333, 2000, "60% 70%"),
  classSkiingValley: image("class-skiing-valley.jpg", 1334, 2000, "50% 60%"),
  classSkiingXc: image("class-skiing-xc.jpg", 2000, 1333, "30% 80%"),
  classSwimming: image("class-swimmer-underwater.jpg", 2000, 1500, "75% 65%"),
  classTennis: image("class-tennis-courts-empty.jpg", 2000, 1333, "45% 60%"),
  classTrail: image("class-trail-forest.jpg", 2000, 1333, "50% 45%"),
  classVolleyball: image("class-volleyball-sunset.jpg", 1333, 2000, "40% 30%"),
  classYoga: image("class-yoga-window.jpg", 2000, 1333, "60% 50%"),

  peopleCoachStretch: image("people-coach-stretch.jpg", 2000, 1333, "50% 45%"),
  peopleDanceEnsemble: image("people-dance-ensemble.jpg", 2000, 1333, "50% 65%"),
  peopleHighfivePlank: image("people-highfive-plank.jpg", 2000, 1333, "50% 45%"),
  peopleStretchClass: image("people-stretch-class.jpg", 2000, 1333, "50% 40%"),
  peopleVolleyballBeach: image("people-volleyball-beach.jpg", 2000, 1325, "55% 55%"),

  momentAlpineRidge: image("moment-alpine-ridge.jpg", 1333, 2000, "40% 75%"),
  momentLockerRoom: image("moment-locker-room.jpg", 1333, 2000, "55% 40%"),

  textureChalk: image("texture-chalk-hands.jpg", 1333, 2000, "50% 60%"),
  textureFoamRoller: image("texture-foam-roller.jpg", 1325, 2000, "45% 55%"),
  textureKettlebells: image("texture-kettlebells.jpg", 2000, 1333, "55% 55%"),
  texturePool: image("texture-pool-lane.jpg", 2000, 1500, "50% 50%"),
  textureStartingBlocks: image("texture-starting-blocks.jpg", 2000, 1600, "50% 55%"),
  textureTrack: image("texture-track-lanes.jpg", 2000, 1333, "50% 50%"),
  textureWaterBottle: image("texture-water-bottle.jpg", 1333, 2000, "45% 55%"),
} as const satisfies Record<string, AppImage>;

/** Sports the app has a photo for. Anything else gets `fallbackSportImage`. */
export type Sport =
  | "running"
  | "gym"
  | "yoga"
  | "pilates"
  | "swimming"
  | "climbing"
  | "tennis"
  | "padel"
  | "football"
  | "basketball"
  | "volleyball"
  | "boxing"
  | "rowing"
  | "dance"
  | "crossfit"
  | "calisthenics"
  | "skiing"
  | "martial-arts"
  | "ice-hockey"
  | "trail"
  | "cycling";

/** Class and session cards: THE sport-to-photo mapping. One photo per sport. */
export const sportImages: Record<Sport, AppImage> = {
  // No class-* photo exists for these three yet, so they borrow a hero.
  running: images.heroTrackRunner,
  pilates: images.heroPilatesStudio,
  cycling: images.heroCyclist,

  gym: images.classGym,
  yoga: images.classYoga,
  swimming: images.classSwimming,
  climbing: images.classClimbing,
  tennis: images.classTennis,
  padel: images.classPadel,
  football: images.classFootball,
  basketball: images.classBasketballAerial,
  volleyball: images.classVolleyball,
  boxing: images.classBoxingSilhouette,
  rowing: images.classRowing,
  dance: images.classDanceWindow,
  crossfit: images.classCrossfit,
  calisthenics: images.classCalisthenics,
  skiing: images.classSkiingXc,
  "martial-arts": images.classMartialArts,
  "ice-hockey": images.classHockeyBacklight,
  trail: images.classTrail,
};

/** Second choices for sports that have more than one photo. A club can pick one as an override. */
export const sportImageAlternates: Partial<Record<Sport, AppImage[]>> = {
  basketball: [images.classBasketballSunset],
  boxing: [images.classBoxingRing],
  dance: [images.classDanceStudio],
  skiing: [images.classSkiingAlpine, images.classSkiingValley],
  "ice-hockey": [images.classHockeyRink],
};

/** The fallback texture for sports without a photo. */
export const fallbackSportImage: AppImage = images.textureChalk;

/** Other words an offering might use for a sport we have a photo for. */
const aliases: Record<string, Sport> = {
  run: "running",
  track: "running",
  athletics: "running",
  "track-and-field": "running",
  strength: "gym",
  weights: "gym",
  fitness: "gym",
  mobility: "pilates",
  swim: "swimming",
  bouldering: "climbing",
  soccer: "football",
  "beach-volleyball": "volleyball",
  kickboxing: "boxing",
  ballet: "dance",
  hiit: "crossfit",
  "functional-training": "crossfit",
  "street-workout": "calisthenics",
  ski: "skiing",
  "cross-country-skiing": "skiing",
  judo: "martial-arts",
  karate: "martial-arts",
  mma: "martial-arts",
  hockey: "ice-hockey",
  "trail-running": "trail",
  hiking: "trail",
  ride: "cycling",
  spinning: "cycling",
  bike: "cycling",
};

export function normaliseSport(sport: string): Sport | undefined {
  const key = sport
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
  if (key in sportImages) return key as Sport;
  return aliases[key];
}

/** The photo for a class or session card. `overrides` is a club's own mapping, if it has one. */
export function imageForSport(
  sport: string,
  overrides: Partial<Record<Sport, AppImage>> = {},
): AppImage {
  const known = normaliseSport(sport);
  if (!known) return fallbackSportImage;
  return overrides[known] ?? sportImages[known];
}

/** Path hero behind the goal, chosen by the goal's sport. */
export const heroImages: { default: AppImage; bySport: Partial<Record<Sport, AppImage>> } = {
  default: images.heroTrackRunner,
  bySport: {
    running: images.heroTrackRunner,
    trail: images.heroTrackRunner,
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
  images.peopleHighfivePlank,
  images.heroCyclist,
  images.momentAlpineRidge,
];

/** Community and in-between moments. The Coach chat has no photo (decision R68). */
export const communityImages = {
  /** Club feed and club page. */
  feed: [
    images.peopleCoachStretch,
    images.peopleStretchClass,
    images.peopleHighfivePlank,
    images.peopleVolleyballBeach,
    images.peopleDanceEnsemble,
  ],
  /** Empty states that deserve a picture rather than a texture. */
  emptyState: images.momentLockerRoom,
  restDay: images.momentAlpineRidge,
} as const;

/** Subtle backgrounds, dividers and empty states. */
export const textureImages = {
  default: images.textureFoamRoller,
  divider: images.textureWaterBottle,
  strength: images.textureKettlebells,
  water: images.texturePool,
  track: images.textureTrack,
  start: images.textureStartingBlocks,
  fallback: images.textureChalk,
} as const;
