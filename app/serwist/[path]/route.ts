import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

/** Serves the compiled service worker at /serwist/sw.js (Serwist's Turbopack setup). */

const gitRevision = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim();
const revision = gitRevision || process.env.BUILD_ID || "dev";

export const { generateStaticParams, GET } = createSerwistRoute({
  additionalPrecacheEntries: [{ url: "/offline", revision }],
  swSrc: "app/sw.ts",
  useNativeEsbuild: true,
});
