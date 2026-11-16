import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";
import { APP_NAME, DEFAULT_LOCALE } from "@/src/config/app";
import { buildManifest } from "@/src/pwa/manifest";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations({ locale: DEFAULT_LOCALE, namespace: "app" });
  return buildManifest({ name: APP_NAME, description: t("description"), lang: DEFAULT_LOCALE });
}
