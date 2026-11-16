import type { MetadataRoute } from "next";
import { tokenHex } from "@/src/ui/tokens";

export const PWA_ICONS = [
  { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  {
    src: "/icons/icon-maskable-512.png",
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
] as const satisfies MetadataRoute.Manifest["icons"];

/** Web app manifest. Kept pure so installability can be unit-tested. */
export function buildManifest(input: {
  name: string;
  description: string;
  lang: string;
}): MetadataRoute.Manifest {
  return {
    id: "/",
    name: input.name,
    short_name: input.name,
    description: input.description,
    lang: input.lang,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: tokenHex("canvas"),
    theme_color: tokenHex("canvas"),
    icons: [...PWA_ICONS],
  };
}
